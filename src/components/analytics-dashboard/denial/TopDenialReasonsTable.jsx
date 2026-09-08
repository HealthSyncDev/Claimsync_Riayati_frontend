import React, { useState, useMemo } from 'react';
import DashboardCard from '../DashboardCard';
import './TopDenialReasonsTable.css';

const formatAmount = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${Number(v).toFixed(1)}%` : '—');

const TopDenialReasonsTable = ({ data, loading = false }) => {
  const [sortBy, setSortBy] = useState('amount'); // 'amount' | 'pct'
  const [sortDir, setSortDir] = useState('desc');

  const sortedRows = useMemo(() => {
    if (!data?.topReasons?.length) return [];
    const arr = [...data.topReasons];
    arr.sort((a, b) => {
      const va = sortBy === 'amount' ? a.amount : a.pct;
      const vb = sortBy === 'amount' ? b.amount : b.pct;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return arr;
  }, [data?.topReasons, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else setSortBy(col);
  };

  if (loading) {
    return (
      <DashboardCard title="Top Denial Reasons" subtitle="Current Rejected Amount by reason" className="denial-reasons-table-card">
        <div className="denial-reasons-skeleton" />
      </DashboardCard>
    );
  }

  if (!data?.topReasons?.length) return null;

  const grandTotal = data.grandTotal ?? sortedRows.reduce((s, r) => s + r.amount, 0);
  const maxPctIdx = sortedRows.reduce((best, r, i) => (r.pct > (sortedRows[best]?.pct ?? 0) ? i : best), 0);

  return (
    <DashboardCard
      title="Top Denial Reasons"
      subtitle="Current Rejected Amount and % of total"
      className="denial-reasons-table-card"
    >
      <div className="denial-reasons-wrap">
        <table className="denial-reasons-table">
          <thead>
            <tr>
              <th className="denial-reasons-th denial-reasons-th--label">Denial Reason</th>
              <th className="denial-reasons-th denial-reasons-th--label">Denial Category</th>
              <th className="denial-reasons-th denial-reasons-th--label">Category</th>
              <th
                className="denial-reasons-th denial-reasons-th--num denial-reasons-th--sortable"
                onClick={() => handleSort('amount')}
              >
                Current Rejected Amount
                {sortBy === 'amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
              <th
                className="denial-reasons-th denial-reasons-th--num denial-reasons-th--sortable"
                onClick={() => handleSort('pct')}
              >
                %
                {sortBy === 'pct' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={row.reason}
                className={`denial-reasons-tr ${i === maxPctIdx ? 'denial-reasons-tr--highlight' : ''}`}
              >
                <td className="denial-reasons-td denial-reasons-td--label">{row.reason}</td>
                <td className="denial-reasons-td denial-reasons-td--label">{row.denialCategory ?? '—'}</td>
                <td className="denial-reasons-td denial-reasons-td--label">{row.category ?? '—'}</td>
                <td className="denial-reasons-td denial-reasons-td--num">{formatAmount(row.amount)}</td>
                <td className="denial-reasons-td denial-reasons-td--num">{formatPct(row.pct)}</td>
              </tr>
            ))}
            <tr className="denial-reasons-tr denial-reasons-tr--total">
              <td className="denial-reasons-td denial-reasons-td--label" colSpan={3}>Grand Total</td>
              <td className="denial-reasons-td denial-reasons-td--num">{formatAmount(grandTotal)}</td>
              <td className="denial-reasons-td denial-reasons-td--num">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};

export default TopDenialReasonsTable;
