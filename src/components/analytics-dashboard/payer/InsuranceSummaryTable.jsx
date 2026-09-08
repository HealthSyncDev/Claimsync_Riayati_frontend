import React, { useState, useMemo } from 'react';
import DashboardCard from '../DashboardCard';
import './InsuranceSummaryTable.css';

const formatAmount = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${Number(v).toFixed(1)}%` : '—');

const COLS = [
  { key: 'insurance', label: 'Insurance', align: 'left', sortable: true },
  { key: 'claimed', label: 'Claimed', align: 'right', sortable: true, format: 'amount' },
  { key: 'processed', label: 'Processed', align: 'right', sortable: true, format: 'amount' },
  { key: 'unprocessed', label: 'Unprocessed', align: 'right', sortable: true, format: 'amount' },
  { key: 'initialRejected', label: 'Init. Rejected', align: 'right', sortable: true, format: 'amount' },
  { key: 'initialRejPct', label: 'Init. Rej %', align: 'right', sortable: true, format: 'pct', highlight: true },
  { key: 'currentRejected', label: 'Curr. Rejected', align: 'right', sortable: true, format: 'amount' },
  { key: 'currentRejPct', label: 'Curr. Rej %', align: 'right', sortable: true, format: 'pct', highlight: true },
  { key: 'businessContributionPct', label: 'Contrib. %', align: 'right', sortable: true, format: 'pct' },
];

const InsuranceSummaryTable = ({ data, loading = false }) => {
  const [sortBy, setSortBy] = useState('claimed');
  const [sortDir, setSortDir] = useState('desc');

  const sortedRows = useMemo(() => {
    if (!data?.payers?.length) return [];
    const arr = [...data.payers];
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
    if (col !== 'initialRejPct' && col !== 'currentRejPct') return '';
    const v = Number(val);
    if (Number.isNaN(v)) return '';
    if (v >= 15) return 'payer-pct--high';
    if (v >= 10) return 'payer-pct--med';
    return 'payer-pct--low';
  };

  if (loading) {
    return (
      <DashboardCard title="Insurance-wise Claim Summary" subtitle="Claim volumes and rejection metrics" className="payer-summary-table-card">
        <div className="payer-summary-skeleton" />
      </DashboardCard>
    );
  }

  if (!data?.payers?.length) return null;

  const totals = data.totals || {};

  return (
    <DashboardCard title="Insurance-wise Claim Summary" subtitle="Claimed, Processed, Rejected and Business Contribution by payer" className="payer-summary-table-card">
      <div className="payer-summary-wrap">
        <table className="payer-summary-table payer-summary-table--compact">
          <thead>
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  className={`payer-summary-th payer-summary-th--${col.align} ${col.sortable ? 'payer-summary-th--sortable' : ''}`}
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
              <tr key={row.sender_id ?? row.insurance} className="payer-summary-tr">
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    className={`payer-summary-td payer-summary-td--${col.align} ${col.key === 'insurance' ? 'payer-summary-td--name' : ''} ${getPctHighlight(col.key, row[col.key])}`}
                    title={col.key === 'insurance' ? row[col.key] : undefined}
                  >
                    {formatCell(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="payer-summary-tr payer-summary-tr--total">
              {COLS.map((col) => (
                <td
                  key={col.key}
                  className={`payer-summary-td payer-summary-td--${col.align}`}
                >
                  {col.key === 'insurance' ? 'Total' : formatCell(totals[col.key], col.format)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};

export default InsuranceSummaryTable;
