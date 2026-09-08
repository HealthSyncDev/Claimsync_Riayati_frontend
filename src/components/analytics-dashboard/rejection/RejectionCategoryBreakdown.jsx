import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChevronDown, PieChart } from 'lucide-react';
import DashboardCard from '../DashboardCard';
import { REJECTION_MONTHS } from '../../../utils/rejectionAnalyticsUtils';
import '../styles.css';
import './RejectionCategoryBreakdown.css';

const formatValue = (v) => (v != null && !Number.isNaN(v) ? Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—');

const RejectionCategoryBreakdown = ({ data, loading = false, highlightMonthIndex = -1 }) => {
  const [expanded, setExpanded] = useState(false);
  const cb = data?.categoryBreakdown;

  const filtered = useMemo(() => {
    if (!cb?.months?.length) return null;
    if (highlightMonthIndex < 0) return cb;

    const m = REJECTION_MONTHS[highlightMonthIndex];
    const i = cb.months.indexOf(m);
    if (i < 0) return cb;

    const med = cb.medicalRejected[i] ?? 0;
    const tech = cb.technicalRejected[i] ?? 0;
    return {
      months: [m],
      medicalRejected: [med],
      technicalRejected: [tech],
      grandTotalMedical: med,
      grandTotalTechnical: tech,
    };
  }, [cb, highlightMonthIndex]);

  if (loading) {
    return (
      <section className="rejection-category-section">
        <div className="rejection-category-trigger rejection-category-trigger--loading" aria-hidden>
          <div className="rejection-category-skeleton-title" />
        </div>
      </section>
    );
  }

  if (!filtered?.months?.length) return null;

  const { months, medicalRejected, technicalRejected, grandTotalMedical, grandTotalTechnical } = filtered;
  const monthlyTotals = months.map((_, i) => (medicalRejected[i] ?? 0) + (technicalRejected[i] ?? 0));
  const grandTotal = (grandTotalMedical ?? 0) + (grandTotalTechnical ?? 0);

  return (
    <section className={`rejection-category-section${expanded ? ' rejection-category-section--expanded' : ''}`}>
      <button
        type="button"
        className={`rejection-category-trigger${expanded ? ' rejection-category-trigger--open' : ''}`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="rejection-category-trigger-main">
          <span className="rejection-category-trigger-icon" aria-hidden>
            <PieChart size={20} strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="rejection-category-trigger-title">Rejection Category Breakdown</h3>
            <p className="rejection-category-trigger-sub">Medical vs technical rejection amounts by month</p>
          </div>
        </div>
        <span className="rejection-category-trigger-action">
          {expanded ? 'Hide' : 'View'}
          <ChevronDown size={18} aria-hidden />
        </span>
      </button>

      {expanded && (
        <div className="rejection-category-body">
          <div className="rejection-category-breakdown-content">
            <DashboardCard title="Month-wise Category Table" subtitle="Jan – Dec + Grand Total" className="rejection-category-table-card">
              <div className="rejection-category-wrap">
                <table className="rejection-category-table">
                  <thead>
                    <tr>
                      <th className="rejection-category-th rejection-category-th--label">Month</th>
                      <th className="rejection-category-th rejection-category-th--num" title="Medical Rejected Amount">Medical</th>
                      <th className="rejection-category-th rejection-category-th--num" title="Technical Rejected Amount">Technical</th>
                      <th className="rejection-category-th rejection-category-th--num rejection-category-th--total">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m, i) => (
                      <tr key={m} className="rejection-category-tr">
                        <td className="rejection-category-td rejection-category-td--label">{m}</td>
                        <td className="rejection-category-td rejection-category-td--num">{formatValue(medicalRejected[i])}</td>
                        <td className="rejection-category-td rejection-category-td--num">{formatValue(technicalRejected[i])}</td>
                        <td className="rejection-category-td rejection-category-td--num rejection-category-td--total">
                          {formatValue(monthlyTotals[i])}
                        </td>
                      </tr>
                    ))}
                    {highlightMonthIndex < 0 && (
                      <tr className="rejection-category-tr rejection-category-tr--grand">
                        <td className="rejection-category-td rejection-category-td--label">Grand Total</td>
                        <td className="rejection-category-td rejection-category-td--num">{formatValue(grandTotalMedical)}</td>
                        <td className="rejection-category-td rejection-category-td--num">{formatValue(grandTotalTechnical)}</td>
                        <td className="rejection-category-td rejection-category-td--num rejection-category-td--total">
                          {formatValue(grandTotal)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardCard>

            <DashboardCard title="Stacked Column Chart" subtitle="Medical vs Technical by month" className="rejection-category-chart-card">
              <ReactECharts
                option={{
                  tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    formatter: (params) => {
                      const p = params[0];
                      const i = p.dataIndex;
                      const med = medicalRejected[i] ?? 0;
                      const tech = technicalRejected[i] ?? 0;
                      return `${months[i]}<br/>Medical: ${formatValue(med)}<br/>Technical: ${formatValue(tech)}<br/>Total: ${formatValue(med + tech)}`;
                    },
                  },
                  legend: {
                    data: ['Medical Rejected', 'Technical Rejected'],
                    bottom: 4,
                    itemGap: 20,
                    textStyle: { fontSize: 11, color: '#64748b' },
                  },
                  grid: { left: 52, right: 40, top: 28, bottom: 48 },
                  xAxis: {
                    type: 'category',
                    data: months,
                    axisLine: { lineStyle: { color: '#e2e8f0' } },
                    axisLabel: { color: '#64748b', fontSize: 11 },
                  },
                  yAxis: {
                    type: 'value',
                    axisLine: { show: false },
                    splitLine: { lineStyle: { color: '#f1f5f9' } },
                    axisLabel: {
                      formatter: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v),
                      color: '#64748b',
                      fontSize: 11,
                    },
                  },
                  series: [
                    {
                      name: 'Medical Rejected',
                      type: 'bar',
                      stack: 'total',
                      data: medicalRejected,
                      itemStyle: { color: '#ef4444' },
                      barMaxWidth: 36,
                    },
                    {
                      name: 'Technical Rejected',
                      type: 'bar',
                      stack: 'total',
                      data: technicalRejected,
                      itemStyle: { color: '#f59e0b' },
                      barMaxWidth: 36,
                    },
                  ],
                }}
                style={{ height: 300, width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </DashboardCard>
          </div>
        </div>
      )}
    </section>
  );
};

export default RejectionCategoryBreakdown;
