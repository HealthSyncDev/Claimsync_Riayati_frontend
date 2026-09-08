import React from 'react';
import './ClaimTypeBreakdownTable.css';

const HEADERS = [
  { key: 'yearMonth', label: 'Months', align: 'left', width: '8%' },
  { key: 'claimedAmount', label: 'Claimed', align: 'right', type: 'amount', width: '10%' },
  { key: 'processedAmount', label: 'Processed', align: 'right', type: 'amount', width: '10%' },
  { key: 'paidAmount', label: 'Paid', align: 'right', type: 'amount', width: '10%' },
  { key: 'initialRejectedAmount', label: 'Initial Rejected', align: 'right', type: 'amount', width: '11%' },
  { key: 'initialRejectedPercentage', label: 'Initial Rej. %', align: 'right', type: 'pct', width: '10%' },
  { key: 'currentRejectedAmount', label: 'Current Rejected', align: 'right', type: 'amount', width: '11%' },
  { key: 'currentRejectedPercentage', label: 'Current Rej. %', align: 'right', type: 'pct', width: '10%' },
  { key: 'unprocessedAmount', label: 'Unprocessed', align: 'right', type: 'amount', width: '10%' },
  { key: 'processedAmountPercentage', label: 'Processed %', align: 'right', type: 'pct', width: '10%' },
];

const formatAmount = (n) => {
  if (n == null || n === '' || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatPct = (n) => {
  if (n == null || n === '' || Number.isNaN(n)) return '—';
  return `${Number(n).toFixed(0)}%`;
};

const ClaimTypeBreakdownTable = ({ claimTypeRows = [], loading = false, className = '' }) => {
  if (loading) {
    return (
      <div className={`claim-type-table-card ${className}`}>
        <div className="claim-type-table-skeleton" />
      </div>
    );
  }

  if (!claimTypeRows?.length) return null;

  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.type === 'amount') return formatAmount(val);
    if (col.type === 'pct') return formatPct(val);
    return val ?? '—';
  };

  return (
    <div className={`claim-type-table-card ${className}`}>
      <div className="claim-type-table-wrap">
        <table className="claim-type-table">
          <thead>
            <tr>
              {HEADERS.map((col) => (
                <th key={col.key} className={`claim-type-th claim-type-th--${col.align}`} style={{ width: col.width }} title={col.label}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {claimTypeRows.map((row, i) => (
              <tr
                key={row.key ?? i}
                className={`claim-type-tr ${row.isTotal ? 'claim-type-tr--total' : 'claim-type-tr--data'}`}
              >
                {HEADERS.map((col) => (
                  <td
                    key={col.key}
                    className={`claim-type-td claim-type-td--${col.align} ${col.type === 'pct' ? 'claim-type-td--pct' : ''}`}
                  >
                    {renderCell(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClaimTypeBreakdownTable;
