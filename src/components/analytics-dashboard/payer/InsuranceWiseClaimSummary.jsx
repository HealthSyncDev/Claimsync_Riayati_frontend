import React, { useState, useMemo } from 'react';
import DashboardCard from '../DashboardCard';
import PayerRejectionRankingChart from './PayerRejectionRankingChart';
import BusinessContributionChart from './BusinessContributionChart';
import { getPayerPerformanceData } from '../data/mockDashboardData';
import { useDashboardFilters } from '../../../context/DashboardFiltersContext';
import '../styles.css';
import './InsuranceWiseClaimSummary.css';

const formatAmount = (n) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${Number(v).toFixed(1)}%` : '—');

const COLS = [
  { key: 'insurance', label: 'Insurance Company', align: 'left', sortable: true },
  { key: 'claimed', label: 'Net Amount (Claimed)', align: 'right', sortable: true, format: 'amount' },
  { key: 'unprocessed', label: 'Unprocessed Amount', align: 'right', sortable: true, format: 'amount' },
  { key: 'initialRejected', label: 'Initial Rejected Amount', align: 'right', sortable: true, format: 'amount' },
  { key: 'currentRejected', label: 'Current Rejected Amount', align: 'right', sortable: true, format: 'amount' },
  { key: 'rrPct', label: 'RR%', align: 'right', sortable: true, format: 'pct', highlight: true },
  { key: 'businessContributionPct', label: 'Business Contribution %', align: 'right', sortable: true, format: 'pct' },
];

const InsuranceWiseClaimSummary = ({ loading }) => {
  const { filters } = useDashboardFilters();
  const data = getPayerPerformanceData(filters.year);

  const [sortBy, setSortBy] = useState('claimed');
  const [sortDir, setSortDir] = useState('desc');

  const sortedRows = useMemo(() => {
    if (!data?.payers?.length) return [];
    const arr = [...data.payers].map((p) => ({ ...p, rrPct: p.currentRejPct }));
    arr.sort((a, b) => {
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      const cmp = typeof va === 'string' ? String(va).localeCompare(String(vb)) : va - vb;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [data?.payers, sortBy, sortDir]);

  const handleSort = (key) => {
    if (!COLS.find((c) => c.key === key)?.sortable) return;
    if (sortBy === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else setSortBy(key);
  };

  const formatCell = (val, format) => {
    if (format === 'amount') return formatAmount(val);
    if (format === 'pct') return formatPct(val);
    return val ?? '—';
  };

  const getPctHighlight = (col, val) => {
    if (col !== 'rrPct') return '';
    const v = Number(val);
    if (Number.isNaN(v)) return '';
    if (v >= 15) return 'ins-rr--high';
    if (v >= 10) return 'ins-rr--med';
    return 'ins-rr--low';
  };

  if (loading) {
    return (
      <div className="insurance-wise-claim-summary">
        <h3 className="insurance-wise-claim-summary-title">Insurance-wise Claim Submission & Rejections</h3>
        <p className="insurance-wise-claim-summary-subtitle">Payer-level performance evaluation</p>
        <div className="insurance-wise-claim-summary-grid">
          <div className="insurance-wise-skeleton" style={{ height: 300 }} />
          <div className="insurance-wise-skeleton" style={{ height: 320 }} />
          <div className="insurance-wise-skeleton" style={{ height: 320 }} />
        </div>
      </div>
    );
  }

  if (!data?.payers?.length) return null;

  const totals = data.totals || {};
  const totalsWithRr = { ...totals, rrPct: totals.currentRejPct };

  return (
    <div className="insurance-wise-claim-summary">
      <h3 className="insurance-wise-claim-summary-title">Insurance-wise Claim Submission & Rejections</h3>
      <p className="insurance-wise-claim-summary-subtitle">Payer-level performance — submission and rejection metrics</p>

      <div className="insurance-wise-claim-summary-grid">
        <DashboardCard title="Summary Table" subtitle="Net Claimed, Unprocessed, Rejections, RR%, Business Contribution" className="insurance-wise-table-card">
          <div className="insurance-wise-wrap">
            <table className="insurance-wise-table">
              <thead>
                <tr>
                  {COLS.map((col) => (
                    <th
                      key={col.key}
                      className={`insurance-wise-th insurance-wise-th--${col.align} ${col.sortable ? 'insurance-wise-th--sortable' : ''}`}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    >
                      {col.label}
                      {col.sortable && sortBy === col.key && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.insurance} className="insurance-wise-tr">
                    {COLS.map((col) => (
                      <td
                        key={col.key}
                        className={`insurance-wise-td insurance-wise-td--${col.align} ${getPctHighlight(col.key, row[col.key] ?? row.currentRejPct)}`}
                      >
                        {formatCell(col.key === 'rrPct' ? row.currentRejPct : row[col.key], col.format)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="insurance-wise-tr insurance-wise-tr--total">
                  {COLS.map((col) => (
                    <td key={col.key} className={`insurance-wise-td insurance-wise-td--${col.align}`}>
                      {col.key === 'insurance' ? 'Grand Total' : formatCell(totalsWithRr[col.key], col.format)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </DashboardCard>

        <PayerRejectionRankingChart data={data} loading={false} />
        <BusinessContributionChart data={data} loading={false} />
      </div>
    </div>
  );
};

export default InsuranceWiseClaimSummary;
