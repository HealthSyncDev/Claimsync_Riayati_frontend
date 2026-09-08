import { useCallback, useMemo } from 'react';
import { DOCTOR_REJECTION_API_LINKED } from '../config/dashboardApiMode';
import { DASHBOARD_QUERY_IDS } from '../config/dashboardQueryRegistry';
import { mapDashboardDoctorsResponse } from '../components/analytics-dashboard/doctor-rejection/doctorRejectionDoctors';
import {
  useDashboardCacheActions,
  useDashboardCachedQuery,
} from './useDashboardCachedQuery';

/**
 * Build GET /api/dashboard/doctors?year=&searchOn=&officeId=
 * officeId may be comma-separated (e.g. "1,2").
 */
export function buildDashboardDoctorsUrl(year, searchOn, officeId) {
  const params = new URLSearchParams();
  if (year != null && year !== '') params.set('year', String(year));
  if (searchOn) params.set('searchOn', String(searchOn));
  if (officeId != null && officeId !== '') params.set('officeId', String(officeId));
  const q = params.toString();
  return q ? `/api/dashboard/doctors?${q}` : '/api/dashboard/doctors';
}

/**
 * Clinician list for doctor-rejection picker.
 * Reads from dashboard cache (prefetched + SWR with other tabs).
 */
export function useDashboardDoctors(officeId, year, searchOn, enabled = true) {
  const useMock = !DOCTOR_REJECTION_API_LINKED;
  const cacheEnabled = !useMock && enabled && !!officeId;
  const { status, data, error } = useDashboardCachedQuery(
    DASHBOARD_QUERY_IDS.doctorRejection,
    cacheEnabled,
  );
  const { refetchQuery } = useDashboardCacheActions();

  const doctors = useMemo(() => {
    if (useMock || !data) return [];
    if (Array.isArray(data.doctors)) return data.doctors;
    return mapDashboardDoctorsResponse(data);
  }, [useMock, data]);

  const loading = cacheEnabled && !data && (status === 'idle' || status === 'loading');

  const refetch = useCallback(() => {
    if (useMock) return;
    refetchQuery(DASHBOARD_QUERY_IDS.doctorRejection);
  }, [refetchQuery, useMock]);

  return {
    doctors,
    loading: useMock ? false : loading,
    error: useMock ? null : error,
    refetch,
  };
}
