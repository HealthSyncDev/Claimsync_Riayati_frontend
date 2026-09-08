import React, { useState, useMemo, useEffect } from 'react';
import DashboardCard from '../DashboardCard';
import { apiFetch } from '../../../utils/apiFetch';
import { DASHBOARD_APIS_LINKED } from '../../../config/dashboardApiMode';
import { getMockSpecialtyDenialRows } from '../../../config/dashboardMockProviders';
import './TopDoctorsTable.css';
import './DenialSummaryTable.css';

const formatAmount = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const formatPct = (v) => (v != null && !Number.isNaN(Number(v)) ? `${Number(v).toFixed(2)}%` : '—');

const CACHE_KEY = 'denial-summary-by-type-specialty-v2';
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

const parseArray = (raw) => {
  if (raw == null) return null;
  let arr = Array.isArray(raw)
    ? raw
    : raw?.data ?? raw?.records ?? raw?.clinicians ?? raw?.items ?? raw?.results ?? [];
  if (!Array.isArray(arr) && raw && typeof raw === 'object') arr = [raw];
  return Array.isArray(arr) ? arr : [];
};

const normalizeRow = (r) => {
  const claimed_amount = Number(r.claimed_amount ?? 0);
  const administrative_denial_amount = Number(r.administrative_denial_amount ?? 0);
  const other_denial_amount = Number(r.other_denial_amount ?? 0);
  const combinedFromApi = r.administrative_and_other_denial_amount;
  const administrative_and_other_denial_amount =
    combinedFromApi != null && combinedFromApi !== ''
      ? Number(combinedFromApi)
      : administrative_denial_amount + other_denial_amount;
  const combinedPctApi = r.administrative_and_other_denial_percentage;
  const administrative_and_other_denial_percentage =
    combinedPctApi != null && combinedPctApi !== '' && !Number.isNaN(Number(combinedPctApi))
      ? Number(combinedPctApi)
      : claimed_amount > 0
        ? (administrative_and_other_denial_amount / claimed_amount) * 100
        : 0;
  return {
    specialty: r.specialty ?? '—',
    claimed_amount,
    denial_amount: Number(r.denial_amount ?? 0),
    denial_percentage: Number(r.denial_percentage ?? 0),
    technical_denial_amount: Number(r.technical_denial_amount ?? 0),
    technical_denial_percentage: Number(r.technical_denial_percentage ?? 0),
    medical_denial_amount: Number(r.medical_denial_amount ?? 0),
    medical_denial_percentage: Number(r.medical_denial_percentage ?? 0),
    administrative_and_other_denial_amount,
    administrative_and_other_denial_percentage,
  };
};

/** Filter: show specialties with any amount in the selected denial category */
const TYPE_FILTER = {
  '': () => true,
  technical: (r) => r.technical_denial_amount > 0,
  medical: (r) => r.medical_denial_amount > 0,
  admin_other: (r) => (r.administrative_and_other_denial_amount ?? 0) > 0,
};

const DENIAL_TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'technical', label: 'Technical' },
  { value: 'medical', label: 'Medical' },
  { value: 'admin_other', label: 'Admin and other' },
];

const cellAmtPct = (amt, pct) => (
  <span className="denial-type-cell">
    <span className="denial-type-cell__amt">{formatAmount(amt)}</span>
    <span className="denial-type-cell__pct">{formatPct(pct)}</span>
  </span>
);

const DenialSummaryTable = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [denialTypeFilter, setDenialTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('denial_amount');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let cancelled = false;

    if (!DASHBOARD_APIS_LINKED) {
      const mapped = getMockSpecialtyDenialRows().map(normalizeRow);
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
        const arr = parseArray(raw);
        const mapped = arr.map(normalizeRow);
        setRows(mapped);
        setCached(mapped);
      })
      .catch(() => {
        if (!cancelled && cached === null) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const pred = TYPE_FILTER[denialTypeFilter] ?? TYPE_FILTER[''];
    let arr = rows.filter(pred);
    const q = searchQuery.trim().toLowerCase();
    if (q) arr = arr.filter((r) => String(r.specialty ?? '').toLowerCase().includes(q));
    return arr;
  }, [rows, denialTypeFilter, searchQuery]);

  const sortedRows = useMemo(() => {
    if (!filteredRows?.length) return [];
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      const cmp = typeof va === 'string' ? String(va).localeCompare(String(vb)) : va - vb;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [filteredRows, sortBy, sortDir]);

  const totals = useMemo(() => {
    const claimed = filteredRows.reduce((s, r) => s + r.claimed_amount, 0);
    const denial_amount = filteredRows.reduce((s, r) => s + r.denial_amount, 0);
    const technical_denial_amount = filteredRows.reduce((s, r) => s + r.technical_denial_amount, 0);
    const medical_denial_amount = filteredRows.reduce((s, r) => s + r.medical_denial_amount, 0);
    const administrative_and_other_denial_amount = filteredRows.reduce(
      (s, r) => s + (r.administrative_and_other_denial_amount ?? 0),
      0
    );
    const pct = (part) => (claimed > 0 ? (part / claimed) * 100 : 0);
    return {
      claimed_amount: claimed,
      denial_amount,
      denial_percentage: pct(denial_amount),
      technical_denial_amount,
      technical_denial_percentage: pct(technical_denial_amount),
      medical_denial_amount,
      medical_denial_percentage: pct(medical_denial_amount),
      administrative_and_other_denial_amount,
      administrative_and_other_denial_percentage: pct(administrative_and_other_denial_amount),
    };
  }, [filteredRows]);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else setSortBy(key);
  };

  const headerActions = (
    <div className="doctor-table-header-actions">
      <input
        type="search"
        className="doctor-table-search"
        placeholder="Search specialty…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search specialties"
      />
      <select
        className="denial-type-select"
        value={denialTypeFilter}
        onChange={(e) => setDenialTypeFilter(e.target.value)}
        aria-label="Filter by denial type"
      >
        {DENIAL_TYPE_OPTIONS.map((o) => (
          <option key={o.value || 'all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  if (loading) {
    return (
      <DashboardCard
        title="Denial Summary by Type"
        subtitle="By specialty — technical, medical, admin and other"
        headerActions={headerActions}
        className="doctor-table-card denial-summary-type-card"
      >
        <div className="doctor-table-skeleton" />
      </DashboardCard>
    );
  }

  if (!rows?.length) {
    return (
      <DashboardCard
        title="Denial Summary by Type"
        subtitle="By specialty — technical, medical, admin and other"
        headerActions={headerActions}
        className="doctor-table-card denial-summary-type-card"
      >
        <p className="doctor-table-empty">No denial summary data available.</p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Denial Summary by Type"
      subtitle="By specialty — technical, medical, admin and other"
      headerActions={headerActions}
      className="doctor-table-card denial-summary-type-card"
    >
      <div className="doctor-table-wrap denial-summary-type-wrap">
        <table className="doctor-table doctor-table--denial-by-type">
          <thead>
            <tr>
              <th className="doctor-th doctor-th--sno">#</th>
              <th className="doctor-th doctor-th--left doctor-th--sortable" onClick={() => handleSort('specialty')}>
                Specialty
                {sortBy === 'specialty' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="doctor-th doctor-th--right doctor-th--nowrap doctor-th--sortable" onClick={() => handleSort('claimed_amount')}>
                Claimed
                {sortBy === 'claimed_amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="doctor-th doctor-th--right doctor-th--nowrap doctor-th--sortable" onClick={() => handleSort('denial_amount')}>
                Denial
                {sortBy === 'denial_amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="doctor-th doctor-th--right doctor-th--pct doctor-th--sortable" onClick={() => handleSort('denial_percentage')}>
                Denial %
                {sortBy === 'denial_percentage' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="doctor-th doctor-th--right doctor-th--sortable" onClick={() => handleSort('technical_denial_amount')}>
                Technical
                {sortBy === 'technical_denial_amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="doctor-th doctor-th--right doctor-th--sortable" onClick={() => handleSort('medical_denial_amount')}>
                Medical
                {sortBy === 'medical_denial_amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th
                className="doctor-th doctor-th--right doctor-th--sortable"
                onClick={() => handleSort('administrative_and_other_denial_amount')}
              >
                Admin and other
                {sortBy === 'administrative_and_other_denial_amount' && (
                  <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr key={row.specialty || i} className="doctor-tr">
                <td className="doctor-td doctor-td--sno">{i + 1}</td>
                <td className="doctor-td doctor-td--left">{row.specialty}</td>
                <td className="doctor-td doctor-td--right">{formatAmount(row.claimed_amount)}</td>
                <td className="doctor-td doctor-td--right">{formatAmount(row.denial_amount)}</td>
                <td className="doctor-td doctor-td--right doctor-td--pct">{formatPct(row.denial_percentage)}</td>
                <td className="doctor-td doctor-td--right">{cellAmtPct(row.technical_denial_amount, row.technical_denial_percentage)}</td>
                <td className="doctor-td doctor-td--right">{cellAmtPct(row.medical_denial_amount, row.medical_denial_percentage)}</td>
                <td className="doctor-td doctor-td--right">
                  {cellAmtPct(row.administrative_and_other_denial_amount, row.administrative_and_other_denial_percentage)}
                </td>
              </tr>
            ))}
            <tr className="doctor-tr doctor-tr--total">
              <td className="doctor-td doctor-td--sno" />
              <td className="doctor-td doctor-td--left">Grand Total</td>
              <td className="doctor-td doctor-td--right">{formatAmount(totals.claimed_amount)}</td>
              <td className="doctor-td doctor-td--right">{formatAmount(totals.denial_amount)}</td>
              <td className="doctor-td doctor-td--right doctor-td--pct">{formatPct(totals.denial_percentage)}</td>
              <td className="doctor-td doctor-td--right">{cellAmtPct(totals.technical_denial_amount, totals.technical_denial_percentage)}</td>
              <td className="doctor-td doctor-td--right">{cellAmtPct(totals.medical_denial_amount, totals.medical_denial_percentage)}</td>
              <td className="doctor-td doctor-td--right">
                {cellAmtPct(totals.administrative_and_other_denial_amount, totals.administrative_and_other_denial_percentage)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};

export default DenialSummaryTable;
