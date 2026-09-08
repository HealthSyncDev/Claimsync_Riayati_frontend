import React, { useCallback, useMemo } from 'react';
import InsuranceSummaryTable from './InsuranceSummaryTable';
import PayerRejectionRankingChart from './PayerRejectionRankingChart';
import BusinessContributionChart from './BusinessContributionChart';
import PayerDataToolbar from './PayerDataToolbar';
import KpiCard from '../KpiCard';
import EmptyState from '../EmptyState';
import { Stagger, StaggerItem } from '../../common/Motion';
import { useInsuranceClaimSummary } from '../../../hooks/useInsuranceClaimSummary';
import { formatDashboardOfficeFilterLabel } from '../../../utils/dashboardOfficeFilterUtils';
import { useDashboardOfficeScope } from '../../../hooks/useDashboardOfficeScope';
import { useDashboardExportHeader } from '../../../hooks/useDashboardExportHeader';
import { formatKpiCompact } from '../../../utils/kpiFormatUtils';
import DashboardPageLoader from '../DashboardPageLoader';
import '../KpiCard.css';
import '../styles.css';
import './PayerCharts.css';
import './PayerPerformanceSection.css';
import './PayerDataToolbar.css';

const formatCompact = formatKpiCompact;
const formatPct = (n) => (n != null && !Number.isNaN(n) ? `${Number(n).toFixed(1)}%` : '—');
const truncate = (s, max = 18) => (s && s.length > max ? `${s.slice(0, max - 1)}…` : s ?? '—');

const SEARCH_ON_LABELS = {
  SubmissionTransactionDate: 'Submission Transaction Date',
  RemittanceTransactionDate: 'Remittance Transaction Date',
  SettlementDate: 'Settlement Date',
  EncounterStartDate: 'Encounter Start Date',
  EncounterEndDate: 'Encounter End Date',
};

const PayerPerformanceSection = ({ loading: parentLoading }) => {
  const { apiOfficeId, officeFilterReady, filters, officeOptions } = useDashboardOfficeScope();
  const year = filters.year ?? '2026';
  const searchOn = filters.searchOn ?? 'SubmissionTransactionDate';

  const { data, loading: apiLoading, error: apiError } = useInsuranceClaimSummary(
    apiOfficeId,
    year,
    searchOn,
    officeFilterReady,
  );
  const loading = parentLoading || !officeFilterReady || (apiLoading && !data);

  const kpiCards = useMemo(() => {
    if (!data?.totals) return [];
    const { totals, payers = [] } = data;
    const topContributor = [...payers].sort((a, b) => (b.claimed ?? 0) - (a.claimed ?? 0))[0];
    const highestRisk = [...payers].sort((a, b) => (b.currentRejPct ?? 0) - (a.currentRejPct ?? 0))[0];

    return [
      { key: 'claimed', label: 'Total Claimed', value: formatCompact(totals.claimed), accent: 'info' },
      { key: 'processed', label: 'Total Processed', value: formatCompact(totals.processed), accent: 'success' },
      { key: 'rejPct', label: 'Current Rejection %', value: formatPct(totals.currentRejPct), accent: 'error' },
      {
        key: 'risk',
        label: 'Highest Risk',
        value: highestRisk
          ? `${truncate(highestRisk.insurance)} · ${formatPct(highestRisk.currentRejPct)}`
          : '—',
        accent: 'error',
      },
      {
        key: 'top',
        label: 'Top Contributor',
        value: topContributor ? truncate(topContributor.insurance) : '—',
        accent: 'info',
      },
    ];
  }, [data]);

  const runExport = useCallback(async () => {
    const { exportPayerToExcel } = await import('../../../utils/exportPayerToExcel');
    await exportPayerToExcel({
      filterMeta: {
        Year: filters.year,
        Office: formatDashboardOfficeFilterLabel(filters.officeId, officeOptions),
        'Search on': SEARCH_ON_LABELS[filters.searchOn] ?? filters.searchOn,
      },
      kpis: data.totals,
      payers: data.payers,
      totals: data.totals,
    });
  }, [data, filters.officeId, filters.searchOn, filters.year]);

  useDashboardExportHeader({
    year,
    Toolbar: PayerDataToolbar,
    canExport: () => !loading && Boolean(data?.payers?.length),
    runExport,
  });

  if (loading) {
    return (
      <section className="payer-performance-section">
        <DashboardPageLoader label="Loading payer performance…" />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="payer-performance-section">
        {apiError && (
          <div className="payer-performance-api-error" role="alert">{apiError}</div>
        )}
        <EmptyState
          title="No payer data available"
          message="Try changing the year or office filters above."
        />
      </section>
    );
  }

  return (
    <section className="payer-performance-section">
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

      {apiError && (
        <div className="payer-performance-api-error" role="alert">{apiError}</div>
      )}

      <div className="payer-performance-grid-1">
        <InsuranceSummaryTable data={data} loading={false} />
      </div>

      <div className="payer-performance-grid-2">
        <PayerRejectionRankingChart data={data} loading={false} />
        <BusinessContributionChart data={data} loading={false} />
      </div>
    </section>
  );
};

export default PayerPerformanceSection;
