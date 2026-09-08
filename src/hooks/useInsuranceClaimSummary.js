import { useCallback, useMemo } from 'react';
import { PAYER_INSURANCE_CLAIM_SUMMARY_API_LINKED } from '../config/dashboardApiMode';
import { getMockPayerPerformance } from '../config/dashboardMockProviders';
import { DASHBOARD_QUERY_IDS } from '../config/dashboardQueryRegistry';
import {
  useDashboardCacheActions,
  useDashboardCachedQuery,
} from './useDashboardCachedQuery';

const toNum = (v) => (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : 0);

/** Map GET /api/dashboard/payer-performance/insurance-claim-summary → table shape */
export function mapInsuranceClaimSummaryResponse(raw) {
  if (!raw?.payers?.length) return null;

  const totalClaimed =
    raw.grandTotal?.claimed_amount != null
      ? toNum(raw.grandTotal.claimed_amount)
      : raw.payers.reduce((sum, r) => sum + toNum(r.claimed_amount), 0);

  const payers = raw.payers.map((r) => {
    const claimed = toNum(r.claimed_amount);
    return {
      sender_id: r.receiver_id,
      insurance: r.receiver_name ?? r.receiver_id ?? '—',
      claimed,
      processed: toNum(r.processed_amount),
      unprocessed: toNum(r.unprocessed_amount),
      initialRejected: toNum(r.initial_rejected_amount),
      initialRejPct:
        r.initial_rejected_percentage != null ? Number(r.initial_rejected_percentage) : null,
      currentRejected: toNum(r.current_rejected_amount),
      currentRejPct:
        r.current_rejected_percentage != null ? Number(r.current_rejected_percentage) : null,
      businessContributionPct: totalClaimed > 0 ? (claimed / totalClaimed) * 100 : null,
    };
  });

  const gt = raw.grandTotal ?? {};
  const totals = {
    claimed: toNum(gt.claimed_amount),
    processed: toNum(gt.processed_amount),
    unprocessed: toNum(gt.unprocessed_amount),
    initialRejected: toNum(gt.initial_rejected_amount),
    initialRejPct:
      gt.initial_rejected_percentage != null ? Number(gt.initial_rejected_percentage) : null,
    currentRejected: toNum(gt.current_rejected_amount),
    currentRejPct:
      gt.current_rejected_percentage != null ? Number(gt.current_rejected_percentage) : null,
    businessContributionPct: 100,
  };

  return {
    payers,
    totals,
    meta: { year: raw.year, searchOn: raw.searchOn, officeId: raw.officeId },
  };
}

export function useInsuranceClaimSummary(officeId, year, searchOn, enabled = true) {
  const useMock = !PAYER_INSURANCE_CLAIM_SUMMARY_API_LINKED;
  const cacheEnabled = !useMock && enabled && !!officeId;
  const { status, data: raw, error } = useDashboardCachedQuery(
    DASHBOARD_QUERY_IDS.payer,
    cacheEnabled,
  );
  const { refetchQuery } = useDashboardCacheActions();

  const loading = cacheEnabled && !raw && (status === 'idle' || status === 'loading');
  const mockSlice = useMemo(() => getMockPayerPerformance(), []);

  const data = useMemo(() => {
    if (useMock) return mockSlice;
    if (!raw) return null;
    return mapInsuranceClaimSummaryResponse(raw);
  }, [useMock, mockSlice, raw]);

  const refetch = useCallback(() => {
    if (useMock) return;
    refetchQuery(DASHBOARD_QUERY_IDS.payer);
  }, [refetchQuery, useMock]);

  return {
    data,
    loading: useMock ? false : loading,
    error: useMock ? null : error,
    refetch,
  };
}
