import { useCallback } from 'react';
import { DOCTOR_REJECTION_API_LINKED } from '../config/dashboardApiMode';
import { DASHBOARD_QUERY_IDS } from '../config/dashboardQueryRegistry';
import {
  useDashboardCacheActions,
  useDashboardCachedQuery,
} from './useDashboardCachedQuery';

/**
 * Shared reader for doctor-rejection cache slices (analysis / denial / cpt / insurance).
 * Fetched by the dashboard cache orchestrator (prefetch, silent SWR, abort on tab switch).
 */
export function useDoctorRejectionCacheSlice(sliceKey, errorKey, clinicianId, enabled = true) {
  const useMock = !DOCTOR_REJECTION_API_LINKED;
  const cacheEnabled = !useMock && enabled && !!clinicianId;
  const { status, data, error: cacheError } = useDashboardCachedQuery(
    DASHBOARD_QUERY_IDS.doctorRejection,
    cacheEnabled,
  );
  const { refetchQuery } = useDashboardCacheActions();

  const matched = Boolean(
    clinicianId
    && data?.clinicianId
    && String(data.clinicianId) === String(clinicianId),
  );
  const slice = matched ? (data?.[sliceKey] ?? null) : null;
  const sliceError = matched ? (data?.[errorKey] ?? null) : null;

  // Keep stale matched data visible during silent revalidation (same as other tabs).
  const loading = Boolean(
    cacheEnabled
    && !slice
    && !sliceError
    && (status === 'idle' || status === 'loading' || status === 'revalidating' || !matched),
  );

  const refetch = useCallback(() => {
    if (useMock) return;
    refetchQuery(DASHBOARD_QUERY_IDS.doctorRejection);
  }, [refetchQuery, useMock]);

  return {
    data: slice,
    loading: useMock ? false : loading,
    error: useMock ? null : (sliceError || (matched ? cacheError : null)),
    refetch,
  };
}
