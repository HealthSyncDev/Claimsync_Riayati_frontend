import React, { useState, useMemo, useEffect } from 'react';
import DashboardCard from '../DashboardCard';
import { apiFetch } from '../../../utils/apiFetch';
import { DASHBOARD_APIS_LINKED } from '../../../config/dashboardApiMode';
import { getMockSpecialtyDenialRows } from '../../../config/dashboardMockProviders';
import './SpecialitySummaryTable.css';

const formatAmount = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0);
const formatCompact = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return String(Math.round(v));
};
const formatPct = (v) => (v != null && !Number.isNaN(Number(v)) ? `${Number(v).toFixed(1)}%` : '—');

const CACHE_KEY = 'specialty-denial-summary';
const CACHE_TTL_MS = 15 * 60 * 1000;
const STALE_TTL_MS = 24 * 60 * 60 * 1000;

const getCached = (allowStale = false) => {
  try {
    const s = sessionStorage.getItem(CACHE_KEY);
    if (!s) return null;
    const { data, ts } = JSON.parse(s);
    const age = Date.now() - ts;
    if (age > CACHE_TTL_MS && !allowStale) return null;
    if (age > STALE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
};
const setCached = (data) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
};

/** API may send administrative_denial_amount + other_denial_amount instead of combined field */
export function normalizeSpecialtyRow(r) {
  const admin = Number(r.administrative_denial_amount ?? 0);
  const other = Number(r.other_denial_amount ?? 0);
  const claimed = Number(r.claimed_amount ?? 0);
  const combinedAmt =
    r.administrative_and_other_denial_amount != null
      ? Number(r.administrative_and_other_denial_amount)
      : admin + other;
  const combinedPct =
    r.administrative_and_other_denial_percentage != null
      ? Number(r.administrative_and_other_denial_percentage)
      : claimed > 0
        ? (combinedAmt / claimed) * 100
        : 0;
  return {
    ...r,
    administrative_and_other_denial_amount: combinedAmt,
    administrative_and_other_denial_percentage: combinedPct,
  };
}

const SpecialitySummaryTable = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('denial_amount');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let cancelled = false;

    if (!DASHBOARD_APIS_LINKED) {
      const mapped = getMockSpecialtyDenialRows().map(normalizeSpecialtyRow);
      setRows(mapped);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const cached = getCached(true);
    if (cached !== null) {
      setRows(cached);
      setLoading(false);
    }
    apiFetch('/api/denial-summary/specialty')
      .then((raw) => {
        if (cancelled) return;
        if (raw == null) {
          if (cached === null) setRows([]);
          return;
        }
        let arr = Array.isArray(raw) ? raw : raw?.data ?? raw?.records ?? raw?.items ?? raw?.results ?? [];
        if (!Array.isArray(arr) && raw && typeof raw === 'object') arr = [raw];
        const mapped = arr.map(normalizeSpecialtyRow);
        setRows(mapped);
        setCached(mapped);
      })
      .catch(() => {
        if (!cancelled && cached === null) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const sortedRows = useMemo(() => {
    if (!rows?.length) return [];
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      const cmp = typeof va === 'string' ? String(va).localeCompare(String(vb)) : va - vb;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [rows, sortBy, sortDir]);

  const totals = useMemo(() => {
    const claimed = rows.reduce((s, r) => s + (r.claimed_amount ?? 0), 0);
    const denial_amount = rows.reduce((s, r) => s + (r.denial_amount ?? 0), 0);
    const technical = rows.reduce((s, r) => s + (r.technical_denial_amount ?? 0), 0);
    const medical = rows.reduce((s, r) => s + (r.medical_denial_amount ?? 0), 0);
    const adminAndOther = rows.reduce((s, r) => s + (r.administrative_and_other_denial_amount ?? 0), 0);
    return {
      claimed_amount: claimed,
      denial_amount,
      denial_percentage: claimed > 0 ? (denial_amount / claimed) * 100 : 0,
      technical_denial_amount: technical,
      technical_denial_percentage: claimed > 0 ? (technical / claimed) * 100 : 0,
      medical_denial_amount: medical,
      medical_denial_percentage: claimed > 0 ? (medical / claimed) * 100 : 0,
      administrative_and_other_denial_amount: adminAndOther,
      administrative_and_other_denial_percentage: claimed > 0 ? (adminAndOther / claimed) * 100 : 0,
    };
  }, [rows]);

  const formatAmtPct = (amt, pct) => {
    const a = formatCompact(amt);
    const p = pct != null && !Number.isNaN(Number(pct)) ? Number(pct).toFixed(1) : '0';
    return `${a} (${p}%)`;
  };

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else setSortBy(key);
  };

  if (loading) {
    return (
      <DashboardCard title="Speciality-wise Denial Summary" subtitle="Denials by specialty" className="speciality-table-card">
        <div className="speciality-table-skeleton" />
      </DashboardCard>
    );
  }

  if (!rows?.length) return null;

  return (
    <DashboardCard title="Speciality-wise Denial Summary" subtitle="Denials by specialty" className="speciality-table-card">
      <div className="speciality-table-wrap">
        <table className="speciality-table speciality-table--compact">
          <thead>
            <tr>
              <th className="speciality-th speciality-th--left speciality-th--sortable" onClick={() => handleSort('specialty')}>
                Specialty
                {sortBy === 'specialty' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="speciality-th speciality-th--right speciality-th--sortable" onClick={() => handleSort('claimed_amount')}>
                Claimed
                {sortBy === 'claimed_amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="speciality-th speciality-th--right speciality-th--sortable" onClick={() => handleSort('denial_amount')}>
                Denial
                {sortBy === 'denial_amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="speciality-th speciality-th--right speciality-th--sortable" onClick={() => handleSort('denial_percentage')}>
                %
                {sortBy === 'denial_percentage' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="speciality-th speciality-th--right speciality-th--sortable" onClick={() => handleSort('technical_denial_amount')}>
                Tech
                {sortBy === 'technical_denial_amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="speciality-th speciality-th--right speciality-th--sortable" onClick={() => handleSort('medical_denial_amount')}>
                Med
                {sortBy === 'medical_denial_amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="speciality-th speciality-th--right speciality-th--sortable" onClick={() => handleSort('administrative_and_other_denial_amount')}>
                Admin & Other
                {sortBy === 'administrative_and_other_denial_amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.specialty} className="speciality-tr">
                <td className="speciality-td speciality-td--left">{row.specialty}</td>
                <td className="speciality-td speciality-td--right">{formatCompact(row.claimed_amount)}</td>
                <td className="speciality-td speciality-td--right">{formatCompact(row.denial_amount)}</td>
                <td className="speciality-td speciality-td--right">{formatPct(row.denial_percentage)}</td>
                <td className="speciality-td speciality-td--right">{formatAmtPct(row.technical_denial_amount, row.technical_denial_percentage)}</td>
                <td className="speciality-td speciality-td--right">{formatAmtPct(row.medical_denial_amount, row.medical_denial_percentage)}</td>
                <td className="speciality-td speciality-td--right">{formatAmtPct(row.administrative_and_other_denial_amount, row.administrative_and_other_denial_percentage)}</td>
              </tr>
            ))}
            <tr className="speciality-tr speciality-tr--total">
              <td className="speciality-td speciality-td--left">Grand Total</td>
              <td className="speciality-td speciality-td--right">{formatCompact(totals.claimed_amount)}</td>
              <td className="speciality-td speciality-td--right">{formatCompact(totals.denial_amount)}</td>
              <td className="speciality-td speciality-td--right">{formatPct(totals.denial_percentage)}</td>
              <td className="speciality-td speciality-td--right">{formatAmtPct(totals.technical_denial_amount, totals.technical_denial_percentage)}</td>
              <td className="speciality-td speciality-td--right">{formatAmtPct(totals.medical_denial_amount, totals.medical_denial_percentage)}</td>
              <td className="speciality-td speciality-td--right">{formatAmtPct(totals.administrative_and_other_denial_amount, totals.administrative_and_other_denial_percentage)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};

export default SpecialitySummaryTable;
