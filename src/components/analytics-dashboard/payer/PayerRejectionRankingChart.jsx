import React from 'react';
import ReactECharts from 'echarts-for-react';
import DashboardCard from '../DashboardCard';
import './PayerCharts.css';

/**
 * Bar chart: Current Rejection % by Payer (Top 10)
 */
const PayerRejectionRankingChart = ({ data, loading = false }) => {
  if (!data?.payers?.length) return null;

  const topN = [...data.payers]
    .sort((a, b) => (b.currentRejPct ?? 0) - (a.currentRejPct ?? 0))
    .slice(0, 10);
  const names = topN.map((p) => p.insurance);
  const values = topN.map((p) => p.currentRejPct ?? 0);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0];
        const idx = p.dataIndex;
        const r = topN[idx];
        return `${r.insurance}<br/>Current Rejection: ${(r.currentRejPct ?? 0).toFixed(1)}%<br/>Amount: ${(r.currentRejected ?? 0).toLocaleString()}`;
      },
    },
    grid: { left: 8, right: 40, top: 24, bottom: 80 },
    xAxis: {
      type: 'category',
      data: names.map((n) => (n.length > 18 ? n.slice(0, 16) + '…' : n)),
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
      name: '%',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: {
        formatter: (v) => `${v}%`,
        color: '#64748b',
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'Current Rejection %',
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: {
            color: i < 5 ? '#f59e0b' : '#22c55e', // top 5 orange, ranks 6-10 green
          },
        })),
        barMaxWidth: 28,
      },
    ],
  };

  if (loading) {
    return (
      <DashboardCard title="Payer Rejection % Ranking" subtitle="Top 10 by rejection rate">
        <div className="payer-chart-skeleton" />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title="Payer Rejection % Ranking" subtitle="Current Rejection % by payer (Top 10)" className="payer-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} opts={{ renderer: 'canvas' }} />
    </DashboardCard>
  );
};

export default PayerRejectionRankingChart;
