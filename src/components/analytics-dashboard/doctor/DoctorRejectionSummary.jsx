import React, { useMemo, useState } from 'react';
import { ChevronDown, Stethoscope } from 'lucide-react';
import DashboardCard from '../DashboardCard';
import DoctorDenialLegend from './DoctorDenialLegend';
import { buildRrTotals } from '../../../utils/doctorAnalyticsUtils';
import '../styles.css';
import './DoctorRejectionSummary.css';
import './TopDoctorsTable.css';

const formatAmount = (n) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
const formatPct = (v) => (v != null && !Number.isNaN(Number(v)) ? `${Number(v).toFixed(1)}%` : '—');
const formatCount = (n) => (n != null && !Number.isNaN(Number(n)) ? String(Math.round(Number(n))) : '—');

const COLS = [
  { key: 'doctor', label: 'Doctor Name', align: 'left', sortable: true },
  { key: 'netAmount', label: 'Net Amount', align: 'right', sortable: true, format: 'amount' },
  { key: 'unprocessed', label: 'Unprocessed Amount', align: 'right', sortable: true, format: 'amount' },
  { key: 'initialRejected', label: 'Initial Rejected Amount', align: 'right', sortable: true, format: 'amount' },
  { key: 'currentRejected', label: 'Current Rejected Amount', align: 'right', sortable: true, format: 'amount' },
  { key: 'rrPct', label: 'RR %', align: 'right', sortable: true, format: 'pct', highlight: true },
  { key: 'medicalDenials', label: 'Medical Denials', align: 'right', sortable: true, format: 'count' },
  { key: 'medicalRRPct', label: 'Medical RR %', align: 'right', sortable: true, format: 'pct', highlight: true },
];

const getPctHighlight = (col, val) => {
  if (col !== 'rrPct' && col !== 'medicalRRPct') return '';
  if (val == null) return '';
  const v = Number(val);
  if (Number.isNaN(v)) return '';
  if (v >= 15) return 'doc-rr--high';
  if (v >= 10) return 'doc-rr--med';
  return 'doc-rr--low';
};

const DoctorRejectionSummary = ({ rows = [], loading = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('currentRejected');
  const [sortDir, setSortDir] = useState('desc');

  const sortedRows = useMemo(() => {
    if (!rows?.length) return [];
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      const cmp = typeof va === 'string' ? String(va).localeCompare(String(vb)) : (Number(va) || 0) - (Number(vb) || 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [rows, sortBy, sortDir]);

  const totals = useMemo(() => buildRrTotals(rows), [rows]);

  const handleSort = (key) => {
    if (!COLS.find((c) => c.key === key)?.sortable) return;
    if (sortBy === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else setSortBy(key);
  };

  const formatCell = (val, format) => {
    if (format === 'amount') return formatAmount(val);
    if (format === 'pct') return formatPct(val);
    if (format === 'count') return formatCount(val);
    return val ?? '—';
  };

  if (loading) {
    return (
      <section className="doctor-rr-section">
        <div className="doctor-rr-trigger doctor-rr-trigger--loading" aria-hidden>
          <div className="doctor-rr-skeleton-title" />
        </div>
      </section>
    );
  }

  if (!rows.length) return null;

  return (
    <section className={`doctor-rr-section${expanded ? ' doctor-rr-section--expanded' : ''}`}>
      <button
        type="button"
        className={`doctor-rr-trigger${expanded ? ' doctor-rr-trigger--open' : ''}`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="doctor-rr-trigger-main">
          <span className="doctor-rr-trigger-icon" aria-hidden>
            <Stethoscope size={20} strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="doctor-rr-trigger-title">Doctor Rejection &amp; RR Summary</h3>
            <p className="doctor-rr-trigger-sub">Full doctor-wise net amount, rejections, RR%, and medical denials</p>
          </div>
        </div>
        <span className="doctor-rr-trigger-action">
          {rows.length} doctors
          <span>{expanded ? 'Hide' : 'View'}</span>
          <ChevronDown size={18} aria-hidden />
        </span>
      </button>

      {expanded && (
        <div className="doctor-rr-body">
          <DashboardCard
            title="Doctor-wise Rejection & RR Summary"
            subtitle="Net amount, unprocessed, rejections, RR%, medical denials"
            className="doctor-rejection-table-card"
          >
            <DoctorDenialLegend />
            <div className="doctor-rejection-wrap">
              <table className="doctor-rejection-table">
                <thead>
                  <tr>
                    {COLS.map((col) => (
                      <th
                        key={col.key}
                        className={`doctor-rejection-th doctor-rejection-th--${col.align} ${col.sortable ? 'doctor-rejection-th--sortable' : ''}`}
                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      >
                        {col.label}
                        {col.sortable && sortBy === col.key && (
                          <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={row.clinicianId || row.doctor} className="doctor-rejection-tr">
                      {COLS.map((col) => {
                        const val = row[col.key];
                        return (
                          <td
                            key={col.key}
                            className={`doctor-rejection-td doctor-rejection-td--${col.align} ${getPctHighlight(col.key, val)}`}
                          >
                            {formatCell(val, col.format)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="doctor-rejection-tr doctor-rejection-tr--total">
                    {COLS.map((col) => (
                      <td key={col.key} className={`doctor-rejection-td doctor-rejection-td--${col.align}`}>
                        {col.key === 'doctor' ? 'Grand Total' : formatCell(totals[col.key], col.format)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </div>
      )}
    </section>
  );
};

export default DoctorRejectionSummary;
