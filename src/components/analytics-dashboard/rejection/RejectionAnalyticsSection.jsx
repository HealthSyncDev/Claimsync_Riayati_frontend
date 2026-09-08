import React, { useCallback, useMemo, useState } from 'react';
import DenialMatrixTable from './DenialMatrixTable';
import RejectionTrendChart from './RejectionTrendChart';
import RejectionCategoryBreakdown from './RejectionCategoryBreakdown';
import RejectionDataToolbar from './RejectionDataToolbar';
import KpiCard from '../KpiCard';
import EmptyState from '../EmptyState';
import { Stagger, StaggerItem } from '../../common/Motion';
import { getRejectionAnalyticsData } from '../data/mockDashboardData';
import { REJECTION_MATRIX_API_LINKED } from '../../../config/dashboardApiMode';
import { useMonthWiseDenialMatrix } from '../../../hooks/useMonthWiseDenialMatrix';
import { formatDashboardOfficeFilterLabel } from '../../../utils/dashboardOfficeFilterUtils';
import { useDashboardOfficeScope } from '../../../hooks/useDashboardOfficeScope';
import { useDashboardExportHeader } from '../../../hooks/useDashboardExportHeader';
import {
  computeRejectionKpis,
  computeAnomalies,
} from '../../../utils/rejectionAnalyticsUtils';
import { formatKpiThousands } from '../../../utils/kpiFormatUtils';
import DashboardPageLoader from '../DashboardPageLoader';
import '../KpiCard.css';
import '../styles.css';
import '../overview/OverviewSection.css';
import './RejectionAnalyticsSection.css';
import './RejectionDataToolbar.css';

const formatPct = (n) => (n != null && !Number.isNaN(n) ? `${Number(n).toFixed(1)}%` : '—');

const SEARCH_ON_LABELS = {
  SubmissionTransactionDate: 'Submission Transaction Date',
  RemittanceTransactionDate: 'Remittance Transaction Date',
  SettlementDate: 'Settlement Date',
  EncounterStartDate: 'Encounter Start Date',
  EncounterEndDate: 'Encounter End Date',
};

const RejectionAnalyticsSection = ({ loading: propLoading }) => {
  const { apiOfficeId, officeFilterReady, filters, officeOptions } = useDashboardOfficeScope();
  const year = filters.year ?? '2026';
  const searchOn = filters.searchOn;

  const {
    data: matrixData,
    loading: matrixLoading,
    error: matrixError,
    refetch,
  } = useMonthWiseDenialMatrix(apiOfficeId, year, searchOn, officeFilterReady);

  const mockData = useMemo(() => getRejectionAnalyticsData(year), [year]);
  const data = REJECTION_MATRIX_API_LINKED ? matrixData : mockData;

  const pageLoading = REJECTION_MATRIX_API_LINKED
    ? propLoading || !officeFilterReady || (matrixLoading && !matrixData)
    : propLoading;

  const [compactMatrix, setCompactMatrix] = useState(false);

  const kpis = useMemo(
    () => (data && !pageLoading ? computeRejectionKpis(data) : null),
    [data, pageLoading],
  );
  const anomalies = useMemo(
    () => (data && !pageLoading ? computeAnomalies(data) : []),
    [data, pageLoading],
  );

  const runExport = useCallback(async () => {
    const { exportRejectionToExcel } = await import('../../../utils/exportRejectionToExcel');
    await exportRejectionToExcel({
      filterMeta: {
        Year: filters.year,
        Office: formatDashboardOfficeFilterLabel(filters.officeId, officeOptions),
        'Search on': SEARCH_ON_LABELS[searchOn] ?? searchOn,
      },
      data,
      kpis,
    });
  }, [data, filters.officeId, filters.year, kpis, searchOn]);

  useDashboardExportHeader({
    year,
    Toolbar: RejectionDataToolbar,
    canExport: () => !pageLoading && Boolean(data),
    runExport,
  });

  const kpiCards = kpis
    ? [
        { key: 'fyPct', label: 'FY Rejection %', value: formatPct(kpis.fyPct), accent: 'error', sparkline: kpis.sparklinePct },
        { key: 'fyValue', label: 'Rejected Value (000)', value: formatKpiThousands(kpis.fyValue), accent: 'info', sparkline: kpis.sparklineValue },
        {
          key: 'worstOp',
          label: 'Worst OP Month',
          value: kpis.worstOpMonth ? `${kpis.worstOpMonth} · ${formatPct(kpis.worstOpPct)}` : '—',
          valueTitle: 'Highest OP Current Rejection %',
          accent: 'warning',
        },
        {
          key: 'worstIp',
          label: 'Worst IP Month',
          value: kpis.worstIpMonth ? `${kpis.worstIpMonth} · ${formatPct(kpis.worstIpPct)}` : '—',
          valueTitle: 'Highest IP Current Rejection %',
          accent: 'error',
        },
      ]
    : [];

  if (pageLoading) {
    return (
      <section className="rejection-analytics-section">
        <DashboardPageLoader label="Loading rejection analytics…" />
      </section>
    );
  }

  if (REJECTION_MATRIX_API_LINKED && matrixError) {
    return (
      <section className="rejection-analytics-section">
        <div className="dashboard-api-error" role="alert">
          <span className="dashboard-api-error-icon">⚠</span>
          <span>{matrixError}</span>
          <button type="button" className="dashboard-api-error-retry" onClick={refetch}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rejection-analytics-section">
        <EmptyState
          title="No rejection data available"
          message="Try changing the year, office, or search on filters above."
        />
      </section>
    );
  }

  return (
    <section className="rejection-analytics-section rejection-analytics-section--print">
      <Stagger className="kpi-bento kpi-bento--4">
        {kpiCards.map((card) => (
          <StaggerItem key={card.key}>
            <KpiCard
              label={card.label}
              value={card.value}
              valueTitle={card.valueTitle}
              accent={card.accent}
              size="primary"
              sparkline={card.sparkline}
              delta={card.delta}
              deltaLabel={card.deltaLabel}
            />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="rejection-analytics-grid-1">
        <DenialMatrixTable
          data={data}
          claimType="All"
          compact={compactMatrix}
          onToggleCompact={() => setCompactMatrix((v) => !v)}
          anomalies={anomalies}
        />
      </div>

      <div className="rejection-charts-layout">
        <RejectionTrendChart
          title="Overall Rejection Trend"
          data={data.trends?.overall}
        />
        <div className="rejection-charts-split">
          <RejectionTrendChart
            title="OP Rejection Trend"
            data={data.trends?.op}
            compact
          />
          <RejectionTrendChart
            title="IP Rejection Trend"
            data={data.trends?.ip}
            compact
          />
        </div>
      </div>

      <RejectionCategoryBreakdown data={data} />
    </section>
  );
};

export default RejectionAnalyticsSection;
