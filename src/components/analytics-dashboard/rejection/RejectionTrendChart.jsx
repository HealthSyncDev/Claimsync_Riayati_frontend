import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import DashboardCard from '../DashboardCard';
import { REJECTION_MONTHS } from '../../../utils/rejectionAnalyticsUtils';
import './RejectionTrendChart.css';

const CHART_THEME = {
  grid: { left: 60, right: 60, top: 48, bottom: 64 },
  gridCompact: { left: 52, right: 52, top: 40, bottom: 52 },
  axisLine: { lineStyle: { color: '#e2e8f0' } },
  splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
  axisLabel: { color: '#64748b', fontSize: 11 },
};

/** Sanitize for ECharts: null/''/NaN → gap; 0 is valid. */
const isNoData = (v) => v == null || v === '' || Number.isNaN(Number(v));
const toChartPct = (arr) => arr?.map((v) => (isNoData(v) ? null : Number(v))) ?? [];
const toChartBar = (arr) => arr?.map((v) => (isNoData(v) ? null : Number(v))) ?? [];

const RejectionTrendChart = ({
  title,
  data,
  loading = false,
  compact = false,
  highlightMonthIndex = -1,
}) => {
  const option = useMemo(() => {
    if (!data) return null;

    const barData = toChartBar(data.currentValue);
    const initialPctData = toChartPct(data.initialPct);
    const currentPctData = toChartPct(data.currentPct);

    const pctVals = [...initialPctData, ...currentPctData].filter((v) => v != null && !Number.isNaN(v));
    const pctMax = pctVals.length ? Math.max(...pctVals) : 10;
    const pctMin = pctVals.length ? Math.min(...pctVals) : 0;
    const pctAxisMax = Math.max(10, Math.ceil(pctMax * 1.15));
    const hasNegativePct = pctMin < 0;
    const highlightLabel = highlightMonthIndex >= 0 ? REJECTION_MONTHS[highlightMonthIndex] : null;

    return {
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: { color: '#94a3b8' },
        lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
      },
      backgroundColor: 'rgba(15, 23, 42, 0.97)',
      borderColor: 'rgba(148, 163, 184, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#f8fafc', fontSize: 12 },
      padding: [12, 16],
      formatter: (params) => {
        const month = params[0]?.axisValue || '';
        const bar = params.find((p) => p.seriesName?.includes('Value'));
        const initial = params.find((p) => p.seriesName?.includes('Initial'));
        const current = params.find((p) => p.seriesName?.includes('Current %'));
        const fmt = (v) => (v != null && !Number.isNaN(v) ? Number(v).toFixed(2) : '—');
        const lines = [];
        if (bar?.value != null && !Number.isNaN(bar.value)) lines.push(`<strong style="color:#cbd5e1">Value:</strong> ${Number(bar.value).toLocaleString()}k`);
        if (initial?.value != null && !Number.isNaN(initial.value)) lines.push(`<strong style="color:#fbbf24">Initial %:</strong> ${fmt(initial.value)}%`);
        if (current?.value != null && !Number.isNaN(current.value)) lines.push(`<strong style="color:#f87171">Current %:</strong> ${fmt(current.value)}%`);
        return `<div style="font-weight:600;margin-bottom:6px">${month}</div>${lines.length ? lines.join('<br/>') : 'No data'}`;
      },
    },
    legend: {
      data: ['Current Rejection Value (000)', 'Initial Rejection %', 'Current Rejection %'],
      bottom: 8,
      itemGap: 24,
      itemWidth: 18,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: '#64748b' },
    },
    grid: compact ? CHART_THEME.gridCompact : CHART_THEME.grid,
    xAxis: {
      type: 'category',
      data: data.months,
      boundaryGap: true,
      ...CHART_THEME.axisLine,
      axisLabel: {
        ...CHART_THEME.axisLabel,
        formatter: (value) => (highlightLabel && value === highlightLabel ? `{hl|${value}}` : value),
        rich: {
          hl: { color: '#4f46e5', fontWeight: 700 },
        },
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Amount (000)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        position: 'left',
        axisLine: { show: false },
        splitLine: CHART_THEME.splitLine,
        axisLabel: { ...CHART_THEME.axisLabel, formatter: (v) => v },
      },
      {
        type: 'value',
        name: 'Rejection %',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        position: 'right',
        min: hasNegativePct ? Math.floor(pctMin * 1.2) : 0,
        max: pctAxisMax,
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { ...CHART_THEME.axisLabel, formatter: (v) => `${v}%` },
      },
    ],
    series: [
      {
        name: 'Current Rejection Value (000)',
        type: 'bar',
        yAxisIndex: 0,
        data: barData,
        barMaxWidth: 32,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#0d9488' },
              { offset: 0.4, color: '#14b8a6' },
              { offset: 1, color: '#5eead4' },
            ],
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(15, 23, 42, 0.25)',
          },
        },
        markLine: highlightMonthIndex >= 0 ? {
          silent: true,
          symbol: 'none',
          lineStyle: { color: 'rgba(99, 102, 241, 0.45)', type: 'dashed', width: 1 },
          data: [{ xAxis: highlightMonthIndex }],
        } : undefined,
      },
      {
        name: 'Initial Rejection %',
        type: 'line',
        yAxisIndex: 1,
        smooth: false,
        connectNulls: true,
        symbol: 'circle',
        symbolSize: 8,
        data: initialPctData,
        itemStyle: {
          color: '#f59e0b',
          borderColor: '#fff',
          borderWidth: 2,
        },
        lineStyle: { width: 3, color: '#f59e0b' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.4)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
            ],
          },
        },
        emphasis: {
          scale: 1.4,
          itemStyle: { borderWidth: 3 },
          lineStyle: { width: 4 },
        },
      },
      {
        name: 'Current Rejection %',
        type: 'line',
        yAxisIndex: 1,
        smooth: false,
        connectNulls: true,
        symbol: 'circle',
        symbolSize: 8,
        data: currentPctData,
        itemStyle: {
          color: '#ef4444',
          borderColor: '#fff',
          borderWidth: 2,
        },
        lineStyle: { width: 3, color: '#ef4444' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239, 68, 68, 0.4)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.05)' },
            ],
          },
        },
        emphasis: {
          scale: 1.4,
          itemStyle: { borderWidth: 3 },
          lineStyle: { width: 4 },
        },
      },
    ],
    };
  }, [data, compact, highlightMonthIndex]);

  if (!data) return null;

  const chartHeight = compact ? 260 : 380;

  if (loading) {
    return (
      <DashboardCard title={title} subtitle="Bar: Value (000) | Lines: Initial % vs Current %">
        <div className="rejection-chart-skeleton" />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title} subtitle="Bar: Value (000) | Lines: Initial % vs Current %" className={`rejection-trend-card${compact ? ' rejection-trend-card--compact' : ''}`}>
      <ReactECharts option={option} style={{ height: chartHeight }} opts={{ renderer: 'canvas' }} />
    </DashboardCard>
  );
};

export default RejectionTrendChart;
