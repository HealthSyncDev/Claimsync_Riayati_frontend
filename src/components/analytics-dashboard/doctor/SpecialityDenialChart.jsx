import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import DashboardCard from '../DashboardCard';
import { specialtyToChartPoint } from '../../../utils/doctorAnalyticsUtils';
import './DoctorCharts.css';

const SpecialityDenialChart = ({
  rows = [],
  loading = false,
  dimmed = false,
  highlightedSpecialty = null,
}) => {
  const chartRows = useMemo(
    () => [...rows].map(specialtyToChartPoint).sort((a, b) => (b.medicalDenialPct ?? 0) - (a.medicalDenialPct ?? 0)),
    [rows],
  );

  const option = useMemo(() => {
    if (!chartRows.length) return null;
    const names = chartRows.map((s) => s.speciality);
    const values = chartRows.map((s) => s.medicalDenialPct ?? 0);
    const highlightIdx = highlightedSpecialty ? names.indexOf(highlightedSpecialty) : -1;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params[0];
          const idx = p.dataIndex;
          const r = chartRows[idx];
          const fmt = (n) =>
            new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n ?? 0);
          return `${r.speciality}<br/>Medical Denial %: ${(r.medicalDenialPct ?? 0).toFixed(1)}%<br/>Amount: ${fmt(r.medicalDenialsAmount)}`;
        },
      },
      grid: { left: 44, right: 16, top: 16, bottom: 56 },
      xAxis: {
        type: 'category',
        data: names.map((n) => (n.length > 16 ? `${n.slice(0, 14)}…` : n)),
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
          name: 'Medical Denial %',
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: {
              color:
                i === highlightIdx
                  ? '#4f46e5'
                  : v >= 15
                    ? '#ef4444'
                    : v >= 10
                      ? '#f59e0b'
                      : '#22c55e',
              opacity: highlightIdx >= 0 && i !== highlightIdx ? 0.35 : 1,
            },
          })),
          barMaxWidth: 28,
        },
      ],
    };
  }, [chartRows, highlightedSpecialty]);

  if (loading) {
    return (
      <DashboardCard title="Speciality vs Medical Denial %" subtitle="Which specialities are problematic?" className="doctor-chart-card">
        <div className="doctor-chart-skeleton" />
      </DashboardCard>
    );
  }

  if (!chartRows.length || !option) {
    return (
      <DashboardCard title="Speciality vs Medical Denial %" subtitle="Which specialities are problematic?" className="doctor-chart-card doctor-chart-card--compact">
        <div className="doctor-chart-empty">No speciality denial data for this chart.</div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Speciality vs Medical Denial %"
      subtitle="Which specialities are problematic?"
      className={`doctor-chart-card doctor-chart-card--compact${dimmed ? ' doctor-section-card--dimmed' : ''}`}
    >
      <div className="speciality-chart-inner">
        <ReactECharts option={option} style={{ width: '100%', height: 280 }} opts={{ renderer: 'canvas' }} />
      </div>
    </DashboardCard>
  );
};

export default SpecialityDenialChart;
