import { useCallback, useMemo } from 'react';
import { DENIAL_TOP_REASONS_API_LINKED } from '../config/dashboardApiMode';
import { getDenialAnalysisData } from '../config/dashboardMockProviders';
import { DASHBOARD_QUERY_IDS } from '../config/dashboardQueryRegistry';
import {
  useDashboardCacheActions,
  useDashboardCachedQuery,
} from './useDashboardCachedQuery';

const toNum = (v) => (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : 0);

/** Map GET /api/dashboard/denial-analysis/top-denial-reason-types → table shape */
export function mapTopDenialReasonTypesResponse(raw) {
  const rows = raw?.denial_types ?? [];
  if (!rows.length) return null;

  const grandTotal =
    raw.total_current_rejected_amount != null
      ? toNum(raw.total_current_rejected_amount)
      : rows.reduce((sum, r) => sum + toNum(r.current_rejected_amount), 0);

  const topReasons = rows
    .map((r) => ({
      rank: r.rank,
      reason: r.denial_type ?? '—',
      denialCategory: r.denial_category ?? '—',
      category: r.category ?? '—',
      amount: toNum(r.current_rejected_amount),
      pct: r.percentage != null ? Number(r.percentage) : null,
    }))
    .map((r) => ({
      ...r,
      pct: r.pct ?? (grandTotal > 0 ? (r.amount / grandTotal) * 100 : 0),
    }))
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  return {
    topReasons,
    grandTotal,
    meta: { year: raw.year, searchOn: raw.searchOn, officeId: raw.officeId },
  };
}

export function useTopDenialReasonTypes(officeId, year, searchOn, enabled = true) {
  const useMock = !DENIAL_TOP_REASONS_API_LINKED;
  const y = year ?? '2026';
  const cacheEnabled = !useMock && enabled && !!officeId;
  const { status, data: raw, error } = useDashboardCachedQuery(
    DASHBOARD_QUERY_IDS.denial,
    cacheEnabled,
  );
  const { refetchQuery } = useDashboardCacheActions();

  const loading = cacheEnabled && !raw && (status === 'idle' || status === 'loading');
  const mockSlice = useMemo(() => getDenialAnalysisData(y), [y]);

  const data = useMemo(() => {
    if (useMock) return mockSlice;
    if (!raw) return null;
    return mapTopDenialReasonTypesResponse(raw);
  }, [useMock, mockSlice, raw]);

  const refetch = useCallback(() => {
    if (useMock) return;
    refetchQuery(DASHBOARD_QUERY_IDS.denial);
  }, [refetchQuery, useMock]);

  return {
    data,
    loading: useMock ? false : loading,
    error: useMock ? null : error,
    refetch,
  };
}
