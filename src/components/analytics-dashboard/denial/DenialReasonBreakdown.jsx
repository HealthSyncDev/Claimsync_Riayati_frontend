import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import DashboardCard from '../DashboardCard';
import { getDenialAnalysisData } from '../data/mockDashboardData';
import { useDashboardFilters } from '../../../context/DashboardFiltersContext';
import '../styles.css';
import './DenialReasonBreakdown.css';

const formatAmount = (n) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${Number(v).toFixed(1)}%` : '—');

const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#6366f1', '#94a3b8', '#22c55e', '#ec4899', '#14b8a6', '#f97316'];

const DenialReasonBreakdown = ({ loading }) => {
  const { filters } = useDashboardFilters();
  const data = getDenialAnalysisData(filters.year);

  const [sortBy, setSortBy] = useState('amount');
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
      <div className="denial-reason-breakdown">
        <h3 className="denial-reason-breakdown-title">Denial Reason Breakdown</h3>
        <p className="denial-reason-breakdown-subtitle">Root cause analysis</p>
        <div className="denial-reason-breakdown-grid">
          <div className="denial-reason-skeleton" style={{ height: 280 }} />
          <div className="denial-reason-skeleton" style={{ height: 300 }} />
          <div className="denial-reason-skeleton" style={{ height: 300 }} />
        </div>
      </div>
    );
  }

  if (!data?.topReasons?.length) return null;

  const grandTotal = data.grandTotal ?? data.topReasons.reduce((s, r) => s + r.amount, 0);
  const top10 = sortedRows.slice(0, 10);

  const barOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0];
        const idx = p.dataIndex;
        const r = top10[idx];
        return `${r.reason}<br/>Rejected: ${formatAmount(r.amount)} (${(r.pct ?? 0).toFixed(1)}%)`;
      },
    },
    grid: { left: 8, right: 40, top: 24, bottom: 90 },
    xAxis: {
      type: 'category',
      data: top10.map((r) => (r.reason.length > 20 ? r.reason.slice(0, 18) + '…' : r.reason)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 10, rotate: 35, interval: 0 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: {
        formatter: (v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v),
        color: '#64748b',
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'Rejected Amount',
        type: 'bar',
        data: top10.map((r) => r.amount),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#93c5fd' },
            ],
          },
        },
        barMaxWidth: 28,
      },
    ],
  };

  const donutOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: { orient: 'horizontal', bottom: 12, itemGap: 16, textStyle: { fontSize: 11, color: '#64748b' } },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '45%'],
        data: data.topReasons.map((r, i) => ({
          name: r.reason,
          value: r.pct,
          itemStyle: { color: COLORS[i % COLORS.length] },
        })),
        label: { fontSize: 11, formatter: '{b}: {c}%' },
        labelLine: { length: 12, length2: 8 },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.15)' } },
      },
    ],
  };

  return (
    <div className="denial-reason-breakdown">
      <h3 className="denial-reason-breakdown-title">Denial Reason Breakdown</h3>
      <p className="denial-reason-breakdown-subtitle">Root cause analysis — which reasons drive the most rejections?</p>

      <div className="denial-reason-breakdown-grid">
        <DashboardCard title="Reason Table" subtitle="Denial Reason, Rejected Amount, %" className="denial-reason-table-card">
          <div className="denial-reason-wrap">
            <table className="denial-reason-table">
              <thead>
                <tr>
                  <th className="denial-reason-th denial-reason-th--label">Denial Reason</th>
                  <th
                    className="denial-reason-th denial-reason-th--num denial-reason-th--sortable"
                    onClick={() => handleSort('amount')}
                  >
                    Rejected Amount
                    {sortBy === 'amount' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </th>
                  <th
                    className="denial-reason-th denial-reason-th--num denial-reason-th--sortable"
                    onClick={() => handleSort('pct')}
                  >
                    %
                    {sortBy === 'pct' && <span className="sort-icon">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.reason} className="denial-reason-tr">
                    <td className="denial-reason-td denial-reason-td--label">{row.reason}</td>
                    <td className="denial-reason-td denial-reason-td--num">{formatAmount(row.amount)}</td>
                    <td className="denial-reason-td denial-reason-td--num">{formatPct(row.pct)}</td>
                  </tr>
                ))}
                <tr className="denial-reason-tr denial-reason-tr--total">
                  <td className="denial-reason-td denial-reason-td--label">Grand Total</td>
                  <td className="denial-reason-td denial-reason-td--num">{formatAmount(grandTotal)}</td>
                  <td className="denial-reason-td denial-reason-td--num">100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DashboardCard>

        <DashboardCard title="Top 10 Bar Chart" subtitle="By rejected amount" className="denial-reason-chart-card">
          <ReactECharts option={barOption} style={{ height: 340 }} opts={{ renderer: 'canvas' }} />
        </DashboardCard>

        <DashboardCard title="% Distribution Donut Chart" subtitle="Share of total by reason" className="denial-reason-chart-card">
          <ReactECharts option={donutOption} style={{ height: 340 }} opts={{ renderer: 'canvas' }} />
        </DashboardCard>
      </div>
    </div>
  );
};

export default DenialReasonBreakdown;
