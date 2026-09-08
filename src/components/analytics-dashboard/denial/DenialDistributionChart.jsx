import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import DashboardCard from '../DashboardCard';
import './DenialCharts.css';

const CHART_HEIGHT = 260;

const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#6366f1', '#94a3b8', '#14b8a6', '#8b5cf6'];

const formatPct = (n) => `${Number(n ?? 0).toFixed(1)}%`;

const buildSlices = (breakdown, maxSlices = 6) => {
  const sorted = [...breakdown]
    .map((d) => ({ name: d.name, value: Number(d.value) || 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  if (rest.length) {
    const otherValue = rest.reduce((s, d) => s + d.value, 0);
    if (otherValue > 0) top.push({ name: 'Other', value: otherValue });
  }

  return top.map((d, i) => ({
    name: d.name,
    value: Number(d.value.toFixed(1)),
    displayPct: formatPct(d.value),
    itemStyle: { color: COLORS[i % COLORS.length] },
  }));
};

/**
 * Donut chart for % distribution of denial categories.
 */
const DenialDistributionChart = ({ data, loading = false }) => {
  const chartData = useMemo(
    () => (data?.categoryBreakdown?.length ? buildSlices(data.categoryBreakdown) : []),
    [data],
  );

  const pctByName = useMemo(
    () => Object.fromEntries(chartData.map((d) => [d.name, d.displayPct])),
    [chartData],
  );

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: (params) => `${params.name}<br/><strong>${formatPct(params.value)}</strong> of rejections`,
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '78%'],
        center: ['50%', '50%'],
        data: chartData,
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 6,
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(15, 23, 42, 0.12)' },
        },
      },
    ],
  }), [chartData]);

  if (loading) {
    return (
      <DashboardCard title="Denial Distribution" subtitle="% by category">
        <div className="denial-chart-skeleton" />
      </DashboardCard>
    );
  }

  if (!chartData.length) return null;

  return (
    <DashboardCard title="Denial Distribution" subtitle="% of rejections by category" className="denial-chart-card denial-distribution-card">
      <div className="denial-distribution-chart">
        <div className="denial-distribution-pie">
          <ReactECharts option={option} style={{ height: CHART_HEIGHT }} opts={{ renderer: 'canvas' }} />
        </div>
        <ul className="denial-distribution-legend" aria-label="Denial category breakdown">
          {chartData.map((item) => (
            <li key={item.name} className="denial-distribution-legend-item">
              <span
                className="denial-distribution-legend-swatch"
                style={{ backgroundColor: item.itemStyle.color }}
                aria-hidden
              />
              <span className="denial-distribution-legend-label">{item.name}</span>
              <span className="denial-distribution-legend-pct">{pctByName[item.name]}</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardCard>
  );
};

export default DenialDistributionChart;
