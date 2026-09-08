import { useCallback, useMemo } from 'react';
import { DOCTOR_PERFORMANCE_API_LINKED } from '../config/dashboardApiMode';
import {
  getMockClinicianDenialRrRows,
  getMockClinicianSummaryRows,
  getMockSpecialtyDenialRows,
} from '../config/dashboardMockProviders';
import { DASHBOARD_QUERY_IDS } from '../config/dashboardQueryRegistry';
import {
  useDashboardCacheActions,
  useDashboardCachedQuery,
} from './useDashboardCachedQuery';
import { mapApiRrRow, mapClinicianToTopDoctor, normalizeSpecialtyRow } from '../utils/doctorAnalyticsUtils';

export function useDoctorPerformanceData(officeId, year, searchOn, enabled = true) {
  const useMock = !DOCTOR_PERFORMANCE_API_LINKED;
  const cacheEnabled = !useMock && enabled && !!officeId;
  const { status, data, error } = useDashboardCachedQuery(
    DASHBOARD_QUERY_IDS.doctor,
    cacheEnabled,
  );
  const { refetchQuery } = useDashboardCacheActions();

  const hasData = Boolean(
    data?.topDoctors?.length
    || data?.specialtyRows?.length
    || data?.doctorRrRows?.length,
  );
  const loading = cacheEnabled && !hasData && (status === 'idle' || status === 'loading');

  const mockData = useMemo(() => {
    const top = getMockClinicianSummaryRows()
      .map(mapClinicianToTopDoctor)
      .sort((a, b) => (b.medicalDenials ?? 0) - (a.medicalDenials ?? 0))
      .slice(0, 30);
    return {
      topDoctors: top,
      specialtyRows: getMockSpecialtyDenialRows().map(normalizeSpecialtyRow),
      specialtyGrandTotal: null,
      doctorRrRows: getMockClinicianDenialRrRows().map(mapApiRrRow),
    };
  }, []);

  const refetch = useCallback(() => {
    if (useMock) return;
    refetchQuery(DASHBOARD_QUERY_IDS.doctor);
  }, [refetchQuery, useMock]);

  const liveData = {
    topDoctors: data?.topDoctors ?? [],
    specialtyRows: data?.specialtyRows ?? [],
    specialtyGrandTotal: data?.specialtyGrandTotal ?? null,
    doctorRrRows: data?.doctorRrRows ?? [],
  };

  return {
    ...(useMock ? mockData : liveData),
    loading: useMock ? false : loading,
    error: useMock ? null : error,
    refetch,
  };
}
