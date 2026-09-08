import { useCallback, useMemo } from 'react';
import { FINANCIAL_RISK_API_LINKED } from '../config/dashboardApiMode';
import {
  getMockWriteOffCategory,
  getWriteOffAnalysis,
  getUnprocessedTrend,
} from '../config/dashboardMockProviders';
import { DASHBOARD_QUERY_IDS } from '../config/dashboardQueryRegistry';
import {
  useDashboardCacheActions,
  useDashboardCachedQuery,
} from './useDashboardCachedQuery';

const toNum = (v) => (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : 0);

const sortByYearMonth = (rows) =>
  [...rows].sort((a, b) => (a.yearMonth || '').localeCompare(b.yearMonth || ''));

/** Map GET /api/dashboard/financial-risk → dashboard shape */
export function mapFinancialRiskResponse(raw) {
  if (!raw) return null;

  const writeOffByMonth = sortByYearMonth(raw.writeoff_by_month ?? []).map((r) => ({
    month: r.month ?? '—',
    yearMonth: r.yearMonth,
    amount: toNum(r.amount ?? r.writeoff_amount),
  }));

  const categoryRows = (raw.writeoff_by_category ?? []).map((r) => ({
    category: r.category ?? '—',
    processed_amount: toNum(r.processed_amount),
    paid_amount: toNum(r.paid_amount),
    writeoff_amount: toNum(r.writeoff_amount),
  }));

  const byCategory = categoryRows
    .filter((r) => (r.category ?? '').toLowerCase() !== 'total')
    .map((r) => ({
      name: r.category,
      value: r.writeoff_amount,
      processed_amount: r.processed_amount,
      paid_amount: r.paid_amount,
      writeoff_amount: r.writeoff_amount,
    }));

  const unprocessed = sortByYearMonth(raw.unprocessed_trend ?? []).map((r) => ({
    month: r.month ?? '—',
    yearMonth: r.yearMonth,
    amount: toNum(r.amount ?? r.unprocessed_amount),
  }));

  const settlement = sortByYearMonth(raw.settlement_tracking ?? []).map((r) => ({
    month: r.month ?? '—',
    yearMonth: r.yearMonth,
    settled: toNum(r.settled),
    pending: toNum(r.pending),
  }));

  return {
    writeOffMonth: { byMonth: writeOffByMonth },
    writeOffCategory: { rows: categoryRows, byCategory },
    unprocessed,
    settlement,
    meta: {
      year: raw.year,
      searchOn: raw.search_on ?? raw.searchOn,
      officeId: raw.office_id ?? raw.officeId,
    },
  };
}

function getMockFinancialRisk() {
  const unprocessed = getUnprocessedTrend().map((r, i) => ({
    ...r,
    yearMonth: `2026-${String(i + 1).padStart(2, '0')}`,
  }));

  return {
    writeOffMonth: {
      byMonth: getWriteOffAnalysis().byMonth.map((r, i) => ({
        ...r,
        yearMonth: `2026-${String(i + 1).padStart(2, '0')}`,
      })),
    },
    writeOffCategory: getMockWriteOffCategory(),
    unprocessed,
    settlement: unprocessed.map((r, i) => ({
      month: r.month,
      yearMonth: r.yearMonth,
      settled: 2500000 - i * 120000,
      pending: r.amount,
    })),
    meta: { year: 2026, searchOn: 'SubmissionTransactionDate', officeId: 1 },
  };
}

export function useFinancialRisk(officeId, year, searchOn, enabled = true) {
  const useMock = !FINANCIAL_RISK_API_LINKED;
  const cacheEnabled = !useMock && enabled && !!officeId;
  const { status, data: raw, error } = useDashboardCachedQuery(
    DASHBOARD_QUERY_IDS.financial,
    cacheEnabled,
  );
  const { refetchQuery } = useDashboardCacheActions();

  const mockSlice = useMemo(() => getMockFinancialRisk(), []);

  const data = useMemo(() => {
    if (useMock) return mockSlice;
    if (!raw) return null;
    return mapFinancialRiskResponse(raw);
  }, [useMock, mockSlice, raw]);

  const hasData = Boolean(data?.writeOffMonth?.byMonth?.length
    || data?.writeOffCategory?.rows?.length
    || data?.unprocessed?.length
    || data?.settlement?.length);

  const loading = cacheEnabled && !hasData && (status === 'idle' || status === 'loading');

  const refetch = useCallback(() => {
    if (useMock) return;
    refetchQuery(DASHBOARD_QUERY_IDS.financial);
  }, [refetchQuery, useMock]);

  return {
    data,
    loading: useMock ? false : loading,
    error: useMock ? null : error,
    refetch,
  };
}
