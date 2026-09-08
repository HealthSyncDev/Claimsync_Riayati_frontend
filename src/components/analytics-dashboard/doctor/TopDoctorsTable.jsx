import React, { useMemo, useState } from 'react';
import DashboardCard from '../DashboardCard';
import DoctorDenialLegend from './DoctorDenialLegend';
import { computeTopDoctorAnomalies, getDenialHighlightClass } from '../../../utils/doctorAnalyticsUtils';
import './TopDoctorsTable.css';

const formatAmount = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const formatPct = (v) => (v != null && !Number.isNaN(Number(v)) ? `${Number(v).toFixed(2)}%` : '—');

const AnomalyBadges = ({ badges }) => {
  if (!badges?.length) return null;
  return (
    <div className="doctor-anomalies">
      {badges.map((b) => (
        <span key={b.id} className={`doctor-anomaly doctor-anomaly--${b.tone}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
};

const TopDoctorsTable = ({
  rows = [],
  loading = false,
  dimmed = false,
  onDoctorClick,
  searchQuery = '',
  onSearchChange,
}) => {
  const [sortBy, setSortBy] = useState('medicalDenials');
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

  const totals = useMemo(() => {
    const claimed = rows.reduce((s, r) => s + (r.claimed ?? 0), 0);
    const medicalDenials = rows.reduce((s, r) => s + (r.medicalDenials ?? 0), 0);
    return {
      claimed,
      medicalDenials,
      medicalDenialPct: claimed > 0 ? (medicalDenials / claimed) * 100 : 0,
    };
  }, [rows]);

  const anomalies = useMemo(() => computeTopDoctorAnomalies(rows), [rows]);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else setSortBy(key);
  };

  if (loading) {
    return (
      <DashboardCard title="Top 30 Doctor-wise Rejections" subtitle="Medical rejections by doctor" className="doctor-table-card">
        <div className="doctor-table-skeleton" />
      </DashboardCard>
    );
  }

  if (!rows.length) {
    return (
      <DashboardCard title="Top 30 Doctor-wise Rejections" subtitle="Medical rejections by doctor" className="doctor-table-card">
        <p className="doctor-table-empty">No doctor rejection data available.</p>
      </DashboardCard>
    );
  }

  const headerActions = (
    <div className="doctor-table-header-actions">
      {onSearchChange && (
        <input
          type="search"
          className="doctor-table-search"
          placeholder="Search doctor or speciality…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search doctors and specialities"
        />
      )}
      <AnomalyBadges badges={anomalies} />
    </div>
  );

  return (
    <DashboardCard
      title="Top 30 Doctor-wise Rejections"
      subtitle="Medical rejections by doctor — sortable by amount or percentage"
      headerActions={headerActions}
      className={`doctor-table-card${dimmed ? ' doctor-section-card--dimmed' : ''}`}
    >
      <DoctorDenialLegend />
      <div className="doctor-table-wrap">
        <table className="doctor-table">
          <thead>
            <tr>
              <th className="doctor-th doctor-th--left doctor-th--sno">#</th>
              <th className="doctor-th doctor-th--left doctor-th--name doctor-th--sortable" onClick={() => handleSort('doctor')}>
                Doctor Name
                {sortBy === 'doctor' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="doctor-th doctor-th--left doctor-th--sortable" onClick={() => handleSort('speciality')}>
                Speciality
                {sortBy === 'speciality' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="doctor-th doctor-th--right doctor-th--nowrap doctor-th--sortable" onClick={() => handleSort('claimed')}>
                Claimed Amount
                {sortBy === 'claimed' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="doctor-th doctor-th--right doctor-th--nowrap doctor-th--sortable" onClick={() => handleSort('medicalDenials')}>
                Medical Denial Amount
                {sortBy === 'medicalDenials' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th className="doctor-th doctor-th--right doctor-th--pct doctor-th--sortable" onClick={() => handleSort('medicalDenialPct')}>
                Medical Denial %
                {sortBy === 'medicalDenialPct' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={row.clinician_id || `${row.doctor}-${i}`}
                className={`doctor-tr ${getDenialHighlightClass(row.medicalDenialPct)}${onDoctorClick ? ' doctor-tr--clickable' : ''}`}
                onClick={onDoctorClick ? () => onDoctorClick(row) : undefined}
              >
                <td className="doctor-td doctor-td--sno">{i + 1}</td>
                <td className="doctor-td doctor-td--left doctor-td--name">{row.doctor}</td>
                <td className="doctor-td doctor-td--left">{row.speciality}</td>
                <td className="doctor-td doctor-td--right">{formatAmount(row.claimed)}</td>
                <td className="doctor-td doctor-td--right">{formatAmount(row.medicalDenials)}</td>
                <td className="doctor-td doctor-td--right doctor-td--pct">{formatPct(row.medicalDenialPct)}</td>
              </tr>
            ))}
            <tr className="doctor-tr doctor-tr--total">
              <td className="doctor-td doctor-td--sno" colSpan={3}>
                Grand Total
              </td>
              <td className="doctor-td doctor-td--right">{formatAmount(totals.claimed)}</td>
              <td className="doctor-td doctor-td--right">{formatAmount(totals.medicalDenials)}</td>
              <td className="doctor-td doctor-td--right">{formatPct(totals.medicalDenialPct)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};

export default TopDoctorsTable;
