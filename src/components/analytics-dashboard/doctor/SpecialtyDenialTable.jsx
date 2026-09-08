import React, { useMemo, useState } from 'react';
import DashboardCard from '../DashboardCard';
import { buildSpecialtyTotals } from '../../../utils/doctorAnalyticsUtils';
import './TopDoctorsTable.css';
import './DenialSummaryTable.css';

const formatAmount = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const formatPct = (v) => (v != null && !Number.isNaN(Number(v)) ? `${Number(v).toFixed(2)}%` : '—');

const cellAmtPct = (amt, pct) => (
  <span className="denial-type-cell">
    <span className="denial-type-cell__amt">{formatAmount(amt)}</span>
    <span className="denial-type-cell__pct">{formatPct(pct)}</span>
  </span>
);

const SpecialtyDenialTable = ({
  rows = [],
  totalsOverride = null,
  loading = false,
  dimmed = false,
  highlightedSpecialty = null,
  onSpecialtyHover,
  onSpecialtySelect,
}) => {
  const [sortBy, setSortBy] = useState('denial_amount');
  const [sortDir, setSortDir] = useState('desc');

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

  const totals = useMemo(
    () => totalsOverride ?? buildSpecialtyTotals(rows),
    [rows, totalsOverride],
  );

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else setSortBy(key);
  };

  if (loading) {
    return (
      <DashboardCard
        title="Speciality-wise Denial Summary"
        subtitle="Denials by specialty — technical, medical, admin and other"
        className="doctor-table-card specialty-denial-table-card"
      >
        <div className="doctor-table-skeleton" />
      </DashboardCard>
    );
  }

  if (!rows.length) {
    return (
      <DashboardCard
        title="Speciality-wise Denial Summary"
        subtitle="Denials by specialty — technical, medical, admin and other"
        className="doctor-table-card specialty-denial-table-card"
      >
        <p className="doctor-table-empty">No specialty denial data available.</p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Speciality-wise Denial Summary"
      subtitle="Denials by specialty — technical, medical, admin and other"
      className={`doctor-table-card specialty-denial-table-card${dimmed ? ' doctor-section-card--dimmed' : ''}`}
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
                Admin &amp; other
                {sortBy === 'administrative_and_other_denial_amount' && (
                  <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={row.specialty || i}
                className={`doctor-tr${highlightedSpecialty === row.specialty ? ' doctor-tr--highlight' : ''}`}
                onMouseEnter={() => onSpecialtyHover?.(row.specialty)}
                onMouseLeave={() => onSpecialtyHover?.(null)}
                onClick={() => onSpecialtySelect?.(row.specialty)}
              >
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

export default SpecialtyDenialTable;
