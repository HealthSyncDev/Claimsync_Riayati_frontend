import React from 'react';
import ReactECharts from 'echarts-for-react';
import DashboardCard from '../DashboardCard';
import './DenialCharts.css';

const CHART_HEIGHT = 260;

/**
 * Bar chart: X = Denial Reasons, Y = Amount. Top 8 only (fits side-by-side row).
 */
const DenialCategoryBarChart = ({ data, loading = false }) => {
  if (loading) {
    return (
      <DashboardCard title="Denial Category Breakdown" subtitle="Top reasons by amount">
        <div className="denial-chart-skeleton" />
      </DashboardCard>
    );
  }

  if (!data?.topReasons?.length) return null;

  const topN = data.topReasons.slice(0, 8);
  const names = topN.map((r) => r.reason);
  const amounts = topN.map((r) => r.amount);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0];
        const idx = p.dataIndex;
        const r = topN[idx];
        const fmt = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
        return `${r.reason}<br/>${fmt(r.amount)} (${r.pct?.toFixed(1)}%)`;
      },
    },
    grid: { left: 8, right: 16, top: 16, bottom: 64 },
    xAxis: {
      type: 'category',
      data: names.map((n) => (n.length > 22 ? n.slice(0, 20) + '…' : n)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        rotate: 35,
        interval: 0,
      },
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
        name: 'Current Rejected Amount',
        type: 'bar',
        data: amounts,
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
        barMaxWidth: 22,
      },
    ],
  };

  return (
    <DashboardCard title="Denial Category Breakdown" subtitle="Top 8 denial reasons by amount" className="denial-chart-card">
      <ReactECharts option={option} style={{ height: CHART_HEIGHT }} opts={{ renderer: 'canvas' }} />
    </DashboardCard>
  );
};

export default DenialCategoryBarChart;
