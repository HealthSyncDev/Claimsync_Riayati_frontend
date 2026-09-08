import React from 'react';
import ReactECharts from 'echarts-for-react';
import DashboardCard from '../DashboardCard';
import './PayerCharts.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

/**
 * Bar chart: Business Contribution % by payer
 */
const BusinessContributionChart = ({ data, loading = false }) => {
  if (!data?.payers?.length) return null;

  const sorted = [...data.payers].sort((a, b) => (b.businessContributionPct ?? 0) - (a.businessContributionPct ?? 0));
  const names = sorted.map((p) => p.insurance);
  const values = sorted.map((p) => p.businessContributionPct ?? 0);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0];
        const idx = p.dataIndex;
        const r = sorted[idx];
        const fmt = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
        return `${r.insurance}<br/>Business Contribution: ${(r.businessContributionPct ?? 0).toFixed(1)}%<br/>Claimed: ${fmt(r.claimed)}`;
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
        name: 'Business Contribution %',
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: COLORS[i % COLORS.length] },
        })),
        barMaxWidth: 28,
      },
    ],
  };

  if (loading) {
    return (
      <DashboardCard title="Business Contribution" subtitle="% of total claimed by payer">
        <div className="payer-chart-skeleton" />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title="Business Contribution" subtitle="% of total claimed by payer" className="payer-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} opts={{ renderer: 'canvas' }} />
    </DashboardCard>
  );
};

export default BusinessContributionChart;
