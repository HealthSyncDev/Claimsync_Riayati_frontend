import React, { useCallback, useMemo } from 'react';
import ExecutiveSummaryTable from '../ExecutiveSummaryTable';
import IpOpBreakdownSection from '../IpOpBreakdownSection';
import ExecutiveMetricsSection from './ExecutiveMetricsSection';
import OverviewDataToolbar from './OverviewDataToolbar';
import KpiCard from '../KpiCard';
import { Stagger, StaggerItem } from '../../common/Motion';
import { formatDashboardOfficeFilterLabel } from '../../../utils/dashboardOfficeFilterUtils';
import { useDashboardOfficeScope } from '../../../hooks/useDashboardOfficeScope';
import { useInsuranceRejectionOverview } from '../../../hooks/useInsuranceRejectionOverview';
import { getMockIpOpTables } from '../../../config/dashboardMockProviders';
import { OVERVIEW_INSURANCE_REJECTION_API_LINKED } from '../../../config/dashboardApiMode';
import { useDashboardExportHeader } from '../../../hooks/useDashboardExportHeader';
import { formatKpiCompact, formatKpiExact } from '../../../utils/kpiFormatUtils';
import DashboardPageLoader from '../DashboardPageLoader';
import '../styles.css';
import '../KpiCard.css';
import './OverviewSection.css';

const formatPct = (n) => (n != null && !Number.isNaN(n) ? `${Number(n).toFixed(1)}%` : '—');

const KPI_CARDS = [
  { key: 'claimedAmount', label: 'Claimed Amount', type: 'amount', accent: 'info', trendKey: 'revenue' },
  { key: 'paidAmount', label: 'Paid Amount', type: 'amount', accent: 'success', trendKey: 'paid' },
  { key: 'currentRejectedAmount', label: 'Current Rejected', type: 'amount', accent: 'error', trendKey: 'currRejected' },
  { key: 'unprocessedAmount', label: 'Unprocessed', type: 'amount', accent: 'warning', trendKey: 'unprocessed' },
];

const SEARCH_ON_LABELS = {
  SubmissionTransactionDate: 'Submission Transaction Date',
  RemittanceTransactionDate: 'Remittance Transaction Date',
  SettlementDate: 'Settlement Date',
  EncounterStartDate: 'Encounter Start Date',
  EncounterEndDate: 'Encounter End Date',
};

const pctDelta = (arr) => {
  if (!arr?.length || arr.length < 2) return null;
  const a = arr[arr.length - 2];
  const b = arr[arr.length - 1];
  if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) return null;
  return b - a;
};

const amountDeltaPct = (arr) => {
  if (!arr?.length || arr.length < 2) return null;
  const a = arr[arr.length - 2];
  const b = arr[arr.length - 1];
  if (!a || !b) return null;
  return ((b - a) / a) * 100;
};

const renderKpiCards = (cards, totalRow, trendMaps, size) =>
  cards.map((card) => {
    const trend = trendMaps[card.trendKey] ?? [];
    const deltaInfo = card.type === 'pct'
      ? (() => { const d = pctDelta(trend); return d != null ? { delta: d, deltaLabel: 'pp vs prior mo.' } : null; })()
      : (() => { const d = amountDeltaPct(trend); return d != null ? { delta: d, deltaLabel: '% vs prior mo.' } : null; })();
    const rawVal = totalRow?.[card.key];
    const value = card.type === 'pct' ? formatPct(rawVal) : card.type === 'amount' ? formatKpiCompact(rawVal) : (rawVal ?? '—');
    const valueTitle = card.type === 'amount' && rawVal != null ? formatKpiExact(rawVal) : undefined;

    return (
      <StaggerItem key={card.key}>
        <KpiCard
          label={card.label}
          value={value}
          valueTitle={valueTitle}
          accent={card.accent}
          size={size}
          sparkline={trend}
          delta={deltaInfo?.delta}
          deltaLabel={deltaInfo?.deltaLabel}
        />
      </StaggerItem>
    );
  });

const OverviewSection = ({ loading: propLoading }) => {
  const { apiOfficeId, officeFilterReady, filters, officeOptions } = useDashboardOfficeScope();
  const { year, searchOn } = filters;

  const {
    loading: overviewLoading,
    error: overviewError,
    overviewTable,
    ipTable,
    opTable,
    totalRow,
    monthlyTrend,
    opVsIp,
    refetch,
  } = useInsuranceRejectionOverview(apiOfficeId, year, searchOn, officeFilterReady);

  const loading = propLoading || !officeFilterReady || (overviewLoading && !overviewTable);

  const monthlyRows = overviewTable?.monthlyRows?.filter((r) => !r.isTotal) ?? [];
  const unprocessedTrend = monthlyRows.map((r) => r.unprocessedAmount ?? 0);

  const trendMaps = useMemo(
    () => ({
      revenue: monthlyTrend?.revenue ?? monthlyRows.map((r) => r.claimedAmount ?? 0),
      paid: monthlyTrend?.paid ?? monthlyRows.map((r) => r.paidAmount ?? 0),
      currRejected: monthlyTrend?.currRejected ?? monthlyRows.map((r) => r.currentRejectedAmount ?? 0),
      unprocessed: unprocessedTrend,
    }),
    [monthlyTrend, monthlyRows, unprocessedTrend],
  );

  const runExport = useCallback(async () => {
    const ipOpService = OVERVIEW_INSURANCE_REJECTION_API_LINKED
      ? { ipTable, opTable }
      : getMockIpOpTables(year, 'service-month');

    const { exportOverviewToExcel } = await import('../../../utils/exportOverviewToExcel');
    await exportOverviewToExcel({
      filterMeta: {
        Year: year,
        Office: formatDashboardOfficeFilterLabel(filters.officeId, officeOptions),
        'Search on': SEARCH_ON_LABELS[searchOn] ?? searchOn,
      },
      kpiSummary: totalRow,
      serviceMonthData: overviewTable,
      paymentMonthData: null,
      ipOpService,
      ipOpPayment: null,
      monthlyTrend,
      opVsIp,
    });
  }, [
    filters.officeId,
    ipTable,
    monthlyTrend,
    opTable,
    opVsIp,
    overviewTable,
    searchOn,
    totalRow,
    year,
  ]);

  useDashboardExportHeader({
    year,
    Toolbar: OverviewDataToolbar,
    canExport: () => officeFilterReady && !loading && Boolean(overviewTable),
    runExport,
  });

  if (loading) {
    return (
      <section className="section overview-section">
        <DashboardPageLoader label="Loading overview…" />
      </section>
    );
  }

  return (
    <section className="section overview-section">
      {overviewError && (
        <div className="dashboard-api-error">
          <span className="dashboard-api-error-icon">⚠</span>
          <span>{overviewError}</span>
          {refetch && (
            <button type="button" className="dashboard-api-error-retry" onClick={refetch}>
              Retry
            </button>
          )}
        </div>
      )}

      <Stagger className="kpi-bento kpi-bento--4">
        {renderKpiCards(KPI_CARDS, totalRow, trendMaps, 'primary')}
      </Stagger>

      <ExecutiveSummaryTable
        data={overviewTable}
        columnPreset="financial"
        compactHeader
        loading={overviewLoading}
      />

      <IpOpBreakdownSection
        ipTable={ipTable}
        opTable={opTable}
        columnPreset="financial"
        loading={overviewLoading}
        error={overviewError}
        refetch={refetch}
      />

      <ExecutiveMetricsSection
        year={year}
        loading={overviewLoading}
        monthlyTrend={monthlyTrend}
        opVsIp={opVsIp}
      />
    </section>
  );
};

export default OverviewSection;
