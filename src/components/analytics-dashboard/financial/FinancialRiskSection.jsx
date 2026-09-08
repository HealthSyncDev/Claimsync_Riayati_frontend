import React, { useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import DashboardCard from '../DashboardCard';
import DashboardInsightStrip from '../DashboardInsightStrip';
import FinancialDataToolbar from './FinancialDataToolbar';
import EmptyState from '../EmptyState';
import { useFinancialRisk } from '../../../hooks/useFinancialRisk';
import { formatDashboardOfficeFilterLabel } from '../../../utils/dashboardOfficeFilterUtils';
import { useDashboardOfficeScope } from '../../../hooks/useDashboardOfficeScope';
import { useDashboardExportHeader } from '../../../hooks/useDashboardExportHeader';
import DashboardPageLoader from '../DashboardPageLoader';
import '../styles.css';
import './FinancialRiskSection.css';
import './FinancialDataToolbar.css';

const formatAmount = (n) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n ?? 0);

const SEARCH_ON_LABELS = {
  SubmissionTransactionDate: 'Submission Transaction Date',
  RemittanceTransactionDate: 'Remittance Transaction Date',
  SettlementDate: 'Settlement Date',
  EncounterStartDate: 'Encounter Start Date',
  EncounterEndDate: 'Encounter End Date',
};

const FinancialRiskSection = ({ loading: parentLoading }) => {
  const { apiOfficeId, officeFilterReady, filters, officeOptions } = useDashboardOfficeScope();
  const year = filters.year ?? '2026';
  const searchOn = filters.searchOn ?? 'SubmissionTransactionDate';

  const { data, loading: apiLoading, error: apiError } = useFinancialRisk(
    apiOfficeId,
    year,
    searchOn,
    officeFilterReady,
  );
  const loading = parentLoading || !officeFilterReady || (apiLoading && !data);

  const writeOffMonth = data?.writeOffMonth;
  const writeOffCategory = data?.writeOffCategory;
  const unprocessed = data?.unprocessed;
  const settlement = data?.settlement;
  const categoryRows = writeOffCategory?.rows ?? [];

  const insights = useMemo(() => {
    const items = [];
    const totalWo = categoryRows.find((r) => r.category === 'Total');
    if (totalWo?.writeoff_amount) {
      items.push(`Total write-off: ${formatAmount(totalWo.writeoff_amount)}.`);
    }
    const lastUnproc = unprocessed?.[unprocessed.length - 1];
    if (lastUnproc?.amount) {
      items.push(`Latest unprocessed balance: ${formatAmount(lastUnproc.amount)}.`);
    }
    return items;
  }, [categoryRows, unprocessed]);

  const writeOffByMonthOption = writeOffMonth?.byMonth?.length
    ? {
        tooltip: { trigger: 'axis' },
        grid: { left: 48, right: 24, top: 16, bottom: 32 },
        xAxis: { type: 'category', data: writeOffMonth.byMonth.map((d) => d.month), axisLine: { lineStyle: { color: '#e2e8f0' } } },
        yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
        series: [{ name: 'Write-Off', type: 'bar', data: writeOffMonth.byMonth.map((d) => d.amount), itemStyle: { color: '#f59e0b' } }],
      }
    : null;

  const unprocessedOption = unprocessed?.length
    ? {
        tooltip: { trigger: 'axis' },
        grid: { left: 48, right: 24, top: 16, bottom: 32 },
        xAxis: { type: 'category', data: unprocessed.map((d) => d.month), axisLine: { lineStyle: { color: '#e2e8f0' } } },
        yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
        series: [{ name: 'Unprocessed', type: 'line', smooth: true, data: unprocessed.map((d) => d.amount), itemStyle: { color: '#6366f1' } }],
      }
    : null;

  const settlementOption = settlement?.length
    ? {
        tooltip: { trigger: 'axis' },
        legend: { data: ['Settled', 'Pending'], bottom: 0 },
        grid: { left: 48, right: 24, top: 24, bottom: 40 },
        xAxis: {
          type: 'category',
          data: settlement.map((d) => d.month),
          axisLine: { lineStyle: { color: '#e2e8f0' } },
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          splitLine: { lineStyle: { color: '#f1f5f9' } },
          axisLabel: {
            formatter: (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v),
            color: '#64748b',
            fontSize: 11,
          },
        },
        series: [
          {
            name: 'Settled',
            type: 'bar',
            stack: 'settlement',
            data: settlement.map((d) => d.settled),
            itemStyle: { color: '#10b981' },
          },
          {
            name: 'Pending',
            type: 'bar',
            stack: 'settlement',
            data: settlement.map((d) => d.pending),
            itemStyle: { color: '#f59e0b' },
          },
        ],
      }
    : null;

  const hasAnyData = Boolean(
    writeOffMonth?.byMonth?.length
    || categoryRows.length
    || unprocessed?.length
    || settlement?.length,
  );

  const runExport = useCallback(async () => {
    const { exportFinancialToExcel } = await import('../../../utils/exportFinancialToExcel');
    await exportFinancialToExcel({
      filterMeta: {
        Year: year,
        Office: formatDashboardOfficeFilterLabel(filters.officeId, officeOptions),
        'Search on': SEARCH_ON_LABELS[searchOn] ?? searchOn,
      },
      writeOffMonth,
      writeOffCategory,
      unprocessed,
      settlement,
      insights,
    });
  }, [
    filters.officeId,
    insights,
    searchOn,
    settlement,
    unprocessed,
    writeOffCategory,
    writeOffMonth,
    year,
  ]);

  useDashboardExportHeader({
    year,
    Toolbar: FinancialDataToolbar,
    canExport: () => officeFilterReady && !loading && hasAnyData,
    runExport,
  });

  if (loading) {
    return (
      <section className="financial-risk-section">
        <DashboardPageLoader label="Loading financial risk…" />
      </section>
    );
  }

  if (!hasAnyData) {
    return (
      <section className="financial-risk-section">
        <EmptyState
          title="No financial risk data available"
          message="Try changing the year or office filters above."
        />
      </section>
    );
  }

  return (
    <section className="financial-risk-section">
      <DashboardInsightStrip items={insights} />

      {apiError && (
        <div className="financial-risk-api-error" role="alert">{apiError}</div>
      )}

      <div className="financial-risk-grid-2">
        <DashboardCard title="Write-Off by Month" subtitle="Monthly write-off amount">
          {writeOffByMonthOption ? (
            <ReactECharts option={writeOffByMonthOption} style={{ height: 260 }} opts={{ renderer: 'canvas' }} />
          ) : (
            <div className="analytics-skeleton analytics-skeleton-chart" style={{ height: 260 }} />
          )}
        </DashboardCard>
        <DashboardCard title="Write-Off by Category" subtitle="Medical, technical, admin">
          {categoryRows.length ? (
            <div className="financial-risk-category-table-wrap">
              <table className="financial-risk-category-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Processed</th>
                    <th>Paid</th>
                    <th>Write-Off</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.map((r) => (
                    <tr key={r.category}>
                      <td style={{ fontWeight: r.category === 'Total' ? 700 : 500 }}>{r.category}</td>
                      <td>{formatAmount(r.processed_amount)}</td>
                      <td>{formatAmount(r.paid_amount)}</td>
                      <td>{formatAmount(r.writeoff_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="analytics-skeleton analytics-skeleton-chart" style={{ height: 260 }} />
          )}
        </DashboardCard>
      </div>

      <div className="financial-risk-grid-2">
        <DashboardCard title="Unprocessed Amount Trend" subtitle="Outstanding by month">
          {unprocessedOption ? (
            <ReactECharts option={unprocessedOption} style={{ height: 260 }} opts={{ renderer: 'canvas' }} />
          ) : (
            <div className="analytics-skeleton analytics-skeleton-chart" style={{ height: 260 }} />
          )}
        </DashboardCard>
        <DashboardCard title="Settlement Tracking" subtitle="Settled vs pending by month">
          {settlementOption ? (
            <ReactECharts option={settlementOption} style={{ height: 260 }} opts={{ renderer: 'canvas' }} />
          ) : (
            <div className="analytics-skeleton analytics-skeleton-chart" style={{ height: 260 }} />
          )}
        </DashboardCard>
      </div>
    </section>
  );
};

export default FinancialRiskSection;
