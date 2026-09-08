import { useCallback, useMemo } from 'react';
import { REJECTION_MATRIX_API_LINKED } from '../config/dashboardApiMode';
import { getRejectionAnalyticsData } from '../config/dashboardMockProviders';
import { DASHBOARD_QUERY_IDS } from '../config/dashboardQueryRegistry';
import {
  useDashboardCacheActions,
  useDashboardCachedQuery,
} from './useDashboardCachedQuery';
import { REJECTION_MONTHS } from '../utils/rejectionAnalyticsUtils';

const normalizeMonth = (m) => {
  const key = String(m).slice(0, 3).toLowerCase();
  const found = REJECTION_MONTHS.find((month) => month.toLowerCase() === key);
  return found ?? String(m);
};

const normalizeLabel = (metric) =>
  String(metric ?? '')
    .replace("('000)", '(000)')
    .replace("'000", '000');

const rowType = (metric) => {
  const m = String(metric ?? '').toLowerCase();
  return m.includes('value') ? 'value' : 'pct';
};

const sectionToTrend = (section) => {
  if (!section?.rows?.length) return null;
  const initialRow = section.rows.find((r) => /initial/i.test(r.metric));
  const currentPctRow = section.rows.find((r) => /current rejection %/i.test(r.metric));
  const valueRow = section.rows.find((r) => /value/i.test(r.metric));
  return {
    initialPct: initialRow?.values ?? [],
    currentPct: currentPctRow?.values ?? [],
    currentValue: valueRow?.values ?? [],
  };
};

/** Map GET /api/dashboard/month-wise-denial-matrix → DenialMatrixTable shape */
export const mapMonthWiseDenialMatrixResponse = (raw) => {
  if (!raw?.sections?.length) return null;

  const months = (raw.months ?? REJECTION_MONTHS).map(normalizeMonth);
  const sectionOrder = ['OVERALL', 'OP', 'IP'];
  const orderedSections = [...raw.sections].sort(
    (a, b) => sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section),
  );

  const rows = orderedSections.flatMap((section) =>
    (section.rows ?? []).map((row) => ({
      label: normalizeLabel(row.metric),
      values: row.values ?? [],
      fy: row.fy_total ?? row.fyTotal ?? null,
      type: rowType(row.metric),
    })),
  );

  const overallSection = orderedSections.find((s) => s.section === 'OVERALL');
  const opSection = orderedSections.find((s) => s.section === 'OP');
  const ipSection = orderedSections.find((s) => s.section === 'IP');

  const trends = {
    overall: sectionToTrend(overallSection),
    op: sectionToTrend(opSection),
    ip: sectionToTrend(ipSection),
  };

  Object.values(trends).forEach((t) => {
    if (t) t.months = months;
  });

  return { months, matrix: { rows }, trends };
};

export function useMonthWiseDenialMatrix(officeId, year, searchOn, enabled = true) {
  const useMock = !REJECTION_MATRIX_API_LINKED;
  const y = year ?? '2026';
  const cacheEnabled = !useMock && enabled && !!officeId;
  const { status, data: raw, error } = useDashboardCachedQuery(
    DASHBOARD_QUERY_IDS.rejection,
    cacheEnabled,
  );
  const { refetchQuery } = useDashboardCacheActions();

  const loading = cacheEnabled && !raw && (status === 'idle' || status === 'loading');

  const mockSlice = useMemo(() => {
    const mock = getRejectionAnalyticsData(y);
    return {
      months: mock.months,
      matrix: mock.matrix,
      trends: mock.trends,
    };
  }, [y]);

  const data = useMemo(() => {
    if (useMock) return mockSlice;
    if (!raw) return null;
    return mapMonthWiseDenialMatrixResponse(raw);
  }, [useMock, mockSlice, raw]);

  const refetch = useCallback(() => {
    if (useMock) return;
    refetchQuery(DASHBOARD_QUERY_IDS.rejection);
  }, [refetchQuery, useMock]);

  return {
    data,
    loading: useMock ? false : loading,
    error: useMock ? null : error,
    refetch,
  };
}
