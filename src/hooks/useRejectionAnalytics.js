import { useMemo } from 'react';
import { DASHBOARD_APIS_LINKED } from '../config/dashboardApiMode';
import { getRejectionAnalyticsData } from '../config/dashboardMockProviders';
import { useDashboardApi } from './useDashboardApi';
import { useIpOpApi } from './useIpOpApi';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Builds month-wise arrays from table monthly rows (filtered by year).
 * Returns { initialPct, currentPct, currentValue } with 12 elements each (Jan–Dec).
 * currentValue is in thousands (000) for display.
 */
const buildMetricArrays = (monthlyRows, year) => {
  const initialPct = new Array(12).fill(null);
  const currentPct = new Array(12).fill(null);
  const currentValue = new Array(12).fill(null);

  if (!monthlyRows?.length || !year) return { initialPct, currentPct, currentValue };

  const prefix = `${year}-`;
  monthlyRows.forEach((r) => {
    if (r.isTotal) return;
    const ym = r.yearMonth ?? r.month ?? r.months;
    if (!ym) return;
    let idx = -1;
    if (typeof ym === 'string' && ym.match(/^\d{4}-\d{2}$/)) {
      if (!ym.startsWith(prefix)) return;
      const m = parseInt(ym.slice(5, 7), 10);
      idx = m - 1;
    } else {
      const mi = MONTHS.indexOf(String(ym).slice(0, 3));
      if (mi >= 0) idx = mi;
    }
    if (idx >= 0 && idx < 12) {
      const toNull = (v) => (v == null || v === '' ? null : v);
      initialPct[idx] = toNull(r.initialRejectedPercentage ?? null);
      currentPct[idx] = toNull(r.currentRejectedPercentage ?? null);
      const amt = r.currentRejectedAmount ?? 0;
      currentValue[idx] = amt != null && amt !== '' && !Number.isNaN(Number(amt)) ? Number(amt) / 1000 : null;
    }
  });

  return { initialPct, currentPct, currentValue };
};

const sumArr = (arr) => arr.reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
const avgArr = (arr) => {
  const valid = arr.filter((v) => v != null && !Number.isNaN(v));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
};

/**
 * Builds the Denial Matrix data structure from Overall, IP, and OP sources.
 */
const buildMatrixData = (overallRows, ipRows, opRows, year) => {
  const overall = buildMetricArrays(overallRows, year);
  const ip = buildMetricArrays(ipRows, year);
  const op = buildMetricArrays(opRows, year);

  const fy = (arr, type) => (type === 'pct' ? avgArr(arr) : sumArr(arr));

  return {
    months: MONTHS,
    matrix: {
      rows: [
        { label: 'Initial Rejection %', values: overall.initialPct, fy: fy(overall.initialPct, 'pct'), type: 'pct' },
        { label: 'Current Rejection %', values: overall.currentPct, fy: fy(overall.currentPct, 'pct'), type: 'pct' },
        { label: 'Current Rejection Value (000)', values: overall.currentValue, fy: fy(overall.currentValue, 'value'), type: 'value' },
        { label: 'OP Initial Rejection %', values: op.initialPct, fy: fy(op.initialPct, 'pct'), type: 'pct' },
        { label: 'OP Current Rejection %', values: op.currentPct, fy: fy(op.currentPct, 'pct'), type: 'pct' },
        { label: 'OP Current Rejection Value (000)', values: op.currentValue, fy: fy(op.currentValue, 'value'), type: 'value' },
        { label: 'IP Initial Rejection %', values: ip.initialPct, fy: fy(ip.initialPct, 'pct'), type: 'pct' },
        { label: 'IP Current Rejection %', values: ip.currentPct, fy: fy(ip.currentPct, 'pct'), type: 'pct' },
        { label: 'IP Current Rejection Value (000)', values: ip.currentValue, fy: fy(ip.currentValue, 'value'), type: 'value' },
      ],
    },
    trends: {
      overall: { ...overall, months: MONTHS },
      op: { ...op, months: MONTHS },
      ip: { ...ip, months: MONTHS },
    },
  };
};

/**
 * Rejection analytics:
 * - Overall: /api/dashboard/payment-reports (and /office/{id} when scoped)
 * - IP: /api/dashboard/ip-op/payment-reports/ip (and /office/{id} when scoped)
 * - OP: /api/dashboard/ip-op/payment-reports/op (and /office/{id} when scoped)
 */
export function useRejectionAnalytics(year, officeId, permission = 'Office') {
  const useMock = !DASHBOARD_APIS_LINKED;
  const { paymentTable, loading: dashboardLoading } = useDashboardApi(officeId, permission, year);
  const { ipTable, opTable, loading: ipOpLoading } = useIpOpApi(officeId, permission, year, 'payment');

  const loading = useMock ? false : dashboardLoading || ipOpLoading;

  const data = useMemo(() => {
    if (useMock) return getRejectionAnalyticsData(year ?? '2026');

    const overallRows = paymentTable?.monthlyRows?.filter((r) => !r.isTotal) ?? [];
    const ipRows = ipTable?.monthlyRows ?? [];
    const opRows = opTable?.monthlyRows ?? [];

    const hasAny = overallRows.length > 0 || ipRows.length > 0 || opRows.length > 0;
    if (!hasAny) return null;

    return buildMatrixData(overallRows, ipRows, opRows, year ?? '2026');
  }, [paymentTable, ipTable, opTable, year, useMock]);

  return { data, loading, error: null };
}
