import React, { useCallback, useMemo } from 'react';
import TopDenialReasonsTable from './TopDenialReasonsTable';
import DenialCategoryBarChart from './DenialCategoryBarChart';
import DenialDistributionChart from './DenialDistributionChart';
import DenialDataToolbar from './DenialDataToolbar';
import DashboardInsightStrip from '../DashboardInsightStrip';
import KpiCard from '../KpiCard';
import EmptyState from '../EmptyState';
import { Stagger, StaggerItem } from '../../common/Motion';
import { useTopDenialReasonTypes } from '../../../hooks/useTopDenialReasonTypes';
import { formatDashboardOfficeFilterLabel } from '../../../utils/dashboardOfficeFilterUtils';
import { useDashboardOfficeScope } from '../../../hooks/useDashboardOfficeScope';
import { useDashboardExportHeader } from '../../../hooks/useDashboardExportHeader';
import { formatKpiCompact } from '../../../utils/kpiFormatUtils';
import DashboardPageLoader from '../DashboardPageLoader';
import '../KpiCard.css';
import '../styles.css';
import './DenialCharts.css';
import './DenialAnalysisSection.css';
import './DenialDataToolbar.css';

const formatCompact = formatKpiCompact;
const formatPct = (n) => (n != null && !Number.isNaN(n) ? `${Number(n).toFixed(1)}%` : '—');
const truncate = (s, max = 22) => (s && s.length > max ? `${s.slice(0, max - 1)}…` : s ?? '—');

const SEARCH_ON_LABELS = {
  SubmissionTransactionDate: 'Submission Transaction Date',
  RemittanceTransactionDate: 'Remittance Transaction Date',
  SettlementDate: 'Settlement Date',
  EncounterStartDate: 'Encounter Start Date',
  EncounterEndDate: 'Encounter End Date',
};

const DenialAnalysisSection = ({ loading: parentLoading }) => {
  const { apiOfficeId, officeFilterReady, filters, officeOptions } = useDashboardOfficeScope();
  const year = filters.year ?? '2026';
  const searchOn = filters.searchOn ?? 'SubmissionTransactionDate';

  const { data: tableData, loading: tableLoading, error: tableError } = useTopDenialReasonTypes(
    apiOfficeId,
    year,
    searchOn,
    officeFilterReady,
  );
  const loading = parentLoading || !officeFilterReady || (tableLoading && !tableData);

  const distributionData = useMemo(
    () => (tableData?.topReasons?.length
      ? { categoryBreakdown: tableData.topReasons.map((r) => ({ name: r.reason, value: r.pct })) }
      : null),
    [tableData],
  );

  const insights = useMemo(() => {
    const reasons = tableData?.topReasons ?? [];
    if (!reasons.length) return [];
    const top = reasons[0];
    const top3Pct = reasons.slice(0, 3).reduce((s, r) => s + (r.pct ?? 0), 0);
    return [
      top ? `Top reason: ${top.reason} (${Number(top.pct ?? 0).toFixed(1)}% of rejected amount).` : null,
      `Top 3 reasons account for ${top3Pct.toFixed(0)}% of denials.`,
    ].filter(Boolean);
  }, [tableData]);

  const kpiCards = useMemo(() => {
    const reasons = tableData?.topReasons ?? [];
    if (!reasons.length) return [];
    const grandTotal = tableData?.grandTotal ?? reasons.reduce((s, r) => s + (r.amount ?? 0), 0);
    const top = reasons[0];
    const top3Pct = reasons.slice(0, 3).reduce((s, r) => s + (r.pct ?? 0), 0);
    const avgPerReason = reasons.length ? grandTotal / reasons.length : 0;

    return [
      { key: 'total', label: 'Total Rejected', value: formatCompact(grandTotal), accent: 'error' },
      {
        key: 'top',
        label: 'Top Reason',
        value: top ? `${truncate(top.reason)} · ${formatPct(top.pct)}` : '—',
        accent: 'warning',
      },
      { key: 'top3', label: 'Top 3 Share', value: formatPct(top3Pct), accent: 'warning' },
      { key: 'count', label: 'Reason Count', value: String(reasons.length), accent: 'info' },
      { key: 'avg', label: 'Avg per Reason', value: formatCompact(avgPerReason), accent: 'neutral' },
    ];
  }, [tableData]);

  const exportKpis = useMemo(() => {
    const reasons = tableData?.topReasons ?? [];
    if (!reasons.length) return null;
    const grandTotal = tableData?.grandTotal ?? reasons.reduce((s, r) => s + (r.amount ?? 0), 0);
    const top = reasons[0];
    const top3Pct = reasons.slice(0, 3).reduce((s, r) => s + (r.pct ?? 0), 0);
    return {
      grandTotal,
      topReason: top?.reason,
      topReasonPct: top?.pct,
      top3Pct,
      reasonCount: reasons.length,
      avgPerReason: reasons.length ? grandTotal / reasons.length : 0,
    };
  }, [tableData]);

  const hasAnyData = Boolean(tableData?.topReasons?.length);

  const runExport = useCallback(async () => {
    const { exportDenialToExcel } = await import('../../../utils/exportDenialToExcel');
    await exportDenialToExcel({
      filterMeta: {
        Year: filters.year,
        Office: formatDashboardOfficeFilterLabel(filters.officeId, officeOptions),
        'Search on': SEARCH_ON_LABELS[searchOn] ?? searchOn,
      },
      kpis: exportKpis,
      currentRejected: tableData,
    });
  }, [exportKpis, filters.officeId, filters.year, searchOn, tableData]);

  useDashboardExportHeader({
    year,
    Toolbar: DenialDataToolbar,
    canExport: () => !loading && hasAnyData,
    runExport,
  });

  if (loading) {
    return (
      <section className="denial-analysis-section">
        <DashboardPageLoader label="Loading denial analysis…" />
      </section>
    );
  }

  if (!hasAnyData) {
    return (
      <section className="denial-analysis-section">
        <EmptyState
          title="No denial data available"
          message="Try changing the year or office filters above."
        />
      </section>
    );
  }

  return (
    <section className="denial-analysis-section">
      <Stagger className="kpi-bento">
        {kpiCards.map((card) => (
          <StaggerItem key={card.key}>
            <KpiCard
              label={card.label}
              value={card.value}
              accent={card.accent}
              size="primary"
            />
          </StaggerItem>
        ))}
      </Stagger>

      <DashboardInsightStrip items={insights} />

      {tableError && (
        <div className="denial-analysis-api-error" role="alert">{tableError}</div>
      )}

      <div className="denial-analysis-grid-1">
        <TopDenialReasonsTable data={tableData} loading={tableLoading} />
      </div>

      <div className="denial-analysis-grid-2">
        <DenialCategoryBarChart data={tableData} loading={tableLoading} />
        <DenialDistributionChart data={distributionData} loading={tableLoading} />
      </div>
    </section>
  );
};

export default DenialAnalysisSection;
