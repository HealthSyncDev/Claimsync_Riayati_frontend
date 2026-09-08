import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChevronDown, LineChart } from 'lucide-react';
import DashboardCard from '../DashboardCard';
import './ExecutiveMetricsSection.css';

const CHART_PREVIEWS = [
  { label: 'Revenue & paid', color: '#4f46e5' },
  { label: 'OP vs IP', color: '#059669' },
];

const ExecutiveMetricsSection = ({ year = '2025', loading = false, monthlyTrend: apiMonthlyTrend, opVsIp: apiOpVsIp }) => {
  const [expanded, setExpanded] = useState(false);
  const monthlyTrend = apiMonthlyTrend ?? { months: [], revenue: [], paid: [], currRejected: [] };
  const opVsIp = apiOpVsIp ?? null;

  if (!loading && !monthlyTrend.months?.length && !opVsIp) return null;

  const lineChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['Claimed', 'Paid', 'Current Rejected'], bottom: 0 },
    grid: { left: 48, right: 24, top: 24, bottom: 40 },
    xAxis: {
      type: 'category',
      data: monthlyTrend.months,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { formatter: (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v) },
    },
    series: [
      { name: 'Claimed', type: 'line', smooth: true, data: monthlyTrend.revenue, itemStyle: { color: '#3b82f6' } },
      { name: 'Paid', type: 'line', smooth: true, data: monthlyTrend.paid, itemStyle: { color: '#10b981' } },
      { name: 'Current Rejected', type: 'line', smooth: true, data: monthlyTrend.currRejected, itemStyle: { color: '#ef4444' } },
    ],
  };

  const opClaimed = opVsIp?.op?.claimedAmount ?? 0;
  const ipClaimed = opVsIp?.ip?.claimedAmount ?? 0;
  const opCurrRej = opVsIp?.op?.currRejPct ?? opVsIp?.op?.currentRejectedPercentage ?? 0;
  const ipCurrRej = opVsIp?.ip?.currRejPct ?? opVsIp?.ip?.currentRejectedPercentage ?? 0;
  const opProcessedPct = opVsIp?.op?.processedAmountPct ?? opVsIp?.op?.processedAmountPercentage ?? 0;
  const ipProcessedPct = opVsIp?.ip?.processedAmountPct ?? opVsIp?.ip?.processedAmountPercentage ?? 0;

  const opVsIpClaimedOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 24, top: 16, bottom: 32 },
    xAxis: { type: 'category', data: ['OP', 'IP'], axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [
      { type: 'bar', data: [opClaimed, ipClaimed], itemStyle: { color: '#3b82f6' } },
    ],
  };

  const opVsIpRejectionOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 24, top: 16, bottom: 32 },
    xAxis: { type: 'category', data: ['OP', 'IP'], axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [
      { type: 'bar', data: [opCurrRej, ipCurrRej], itemStyle: { color: '#ef4444' } },
    ],
  };

  const opVsIpProcessedOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 24, top: 16, bottom: 32 },
    xAxis: { type: 'category', data: ['OP', 'IP'], axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [
      { type: 'bar', data: [opProcessedPct, ipProcessedPct], itemStyle: { color: '#10b981' } },
    ],
  };

  if (loading) {
    return (
      <section className="exec-metrics-section">
        <div className="exec-metrics-trigger exec-metrics-trigger--loading" aria-hidden>
          <div className="exec-metrics-trigger-main">
            <div className="exec-metrics-skeleton exec-metrics-skeleton-trigger-icon" />
            <div className="exec-metrics-trigger-copy">
              <div className="exec-metrics-skeleton exec-metrics-skeleton-trigger-title" />
              <div className="exec-metrics-skeleton exec-metrics-skeleton-trigger-sub" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`exec-metrics-section${expanded ? ' exec-metrics-section--expanded' : ''}`}>
      <button
        type="button"
        className={`exec-metrics-trigger${expanded ? ' exec-metrics-trigger--open' : ''}`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="exec-metrics-trigger-main">
          <span className="exec-metrics-trigger-icon" aria-hidden>
            <LineChart size={20} strokeWidth={2.25} />
          </span>
          <div className="exec-metrics-trigger-copy">
            <h3 className="exec-metrics-section-title">Trends &amp; charts</h3>
            <p className="exec-metrics-trigger-sub">
              Monthly revenue trends and OP vs IP comparisons
            </p>
            {!expanded && (
              <div className="exec-metrics-preview-chips" aria-hidden>
                {CHART_PREVIEWS.map((chip) => (
                  <span key={chip.label} className="exec-metrics-preview-chip">
                    <span className="exec-metrics-preview-dot" style={{ background: chip.color }} />
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <span className="exec-metrics-trigger-action">
          <span className="exec-metrics-trigger-count">4 charts</span>
          <span className="exec-metrics-trigger-label">{expanded ? 'Hide' : 'View'}</span>
          <ChevronDown size={18} aria-hidden />
        </span>
      </button>

      {expanded && (
        <div className="exec-metrics-body">
          <div className="exec-metrics-trend-chart">
            <DashboardCard title="Revenue vs Paid vs Current Rejected" subtitle="Monthly trend">
              <ReactECharts option={lineChartOption} style={{ height: 300 }} opts={{ renderer: 'canvas' }} />
            </DashboardCard>
          </div>

          <div className="exec-metrics-opip-grid">
            <DashboardCard title="OP vs IP Claimed" subtitle="Claimed amount">
              <ReactECharts option={opVsIpClaimedOption} style={{ height: 220 }} opts={{ renderer: 'canvas' }} />
            </DashboardCard>
            <DashboardCard title="OP vs IP Rejection %" subtitle="Current rejection rate">
              <ReactECharts option={opVsIpRejectionOption} style={{ height: 220 }} opts={{ renderer: 'canvas' }} />
            </DashboardCard>
            <DashboardCard title="OP vs IP Processed %" subtitle="Processed % of claimed">
              <ReactECharts option={opVsIpProcessedOption} style={{ height: 220 }} opts={{ renderer: 'canvas' }} />
            </DashboardCard>
          </div>
        </div>
      )}
    </section>
  );
};

export default ExecutiveMetricsSection;
