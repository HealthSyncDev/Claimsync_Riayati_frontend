import { useState, useEffect, useCallback } from 'react';
import { DASHBOARD_APIS_LINKED } from '../config/dashboardApiMode';
import {
  getExecutiveSummaryData,
  getPaymentReportsData,
  getExecutiveMetricsData,
  getOverviewTotalRow,
} from '../config/dashboardMockProviders';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  'ngrok-skip-browser-warning': 'true',
});

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const toArray = (raw) =>
  Array.isArray(raw) ? raw : raw?.monthly ?? raw?.data ?? raw?.records ?? raw?.reports ?? raw?.items ?? [];

const toNum = (v) => (v != null ? Number(v) : 0);

/** Extract API "month": "Total" row from raw response — use for KPI cards */
const extractApiTotalRow = (raw) => {
  const rows = toArray(raw);
  const total = rows?.find((r) => r.month === 'Total' || r.months === 'Total' || r.yearMonth === '9999-99');
  if (!total) return null;
  return {
    key: 'total',
    isTotal: true,
    yearMonth: 'Total',
    claimedAmount: toNum(total.claimedAmount ?? total.claimed_amount),
    processedAmount: toNum(total.processedAmount ?? total.processed_amount),
    paidAmount: toNum(total.paidAmount ?? total.paid_amount ?? total.remittedAmount),
    initialRejectedAmount: toNum(total.initialRejectedAmount ?? total.initial_rejected_amount),
    initialRejectedPercentage: total.initialRejectedPercentage ?? total.initial_rejected_percentage,
    currentRejectedAmount: toNum(total.currentRejectedAmount ?? total.current_rejected_amount ?? total.rejectedAmount),
    currentRejectedPercentage: total.currentRejectedPercentage ?? total.current_rejected_percentage,
    unprocessedAmount: toNum(total.unprocessedAmount ?? total.unprocessed_amount),
    processedAmountPercentage: total.processedAmountPercentage ?? total.processed_amount_percentage,
    contribution: total.contribution,
    currentMedicalRejectedAmount: total.currentMedicalRejectedAmount,
    medicalRejectedPercentage: total.medicalRejectedPercentage,
    currentTechnicalRejectedAmount: total.currentTechnicalRejectedAmount,
    technicalRejectedPercentage: total.technicalRejectedPercentage,
    medicalDenialsRR: total.medicalDenialsRR,
    technicalDenialRR: total.technicalDenialRR,
  };
};

const monthLabel = (m) => {
  if (m == null) return '—';
  if (typeof m === 'string' && m.length <= 4) return m;
  if (typeof m === 'string' && m.match(/^\d{4}-\d{2}/)) return MONTHS[parseInt(m.slice(5, 7), 10) - 1] ?? m;
  const n = typeof m === 'number' ? m : parseInt(m, 10);
  return MONTHS[n - 1] ?? MONTHS[n] ?? String(m);
};

const mapToTableFormat = (raw) => {
  const rows = toArray(raw);
  if (!rows?.length) return null;

  const monthlyRows = rows
    .filter((r) => !r.isTotal && r.months !== 'Total' && r.month !== 'Total' && r.yearMonth !== 'Total')
    .map((r) => {
      const claimed = toNum(r.claimed ?? r.claimedAmount ?? r.claimed_amount ?? r.total_claimed);
      const processed = toNum(r.processed ?? r.processedAmount ?? r.processed_amount ?? r.total_processed);
      const paid = toNum(r.paid ?? r.paidAmount ?? r.paid_amount ?? r.total_paid ?? r.remitted ?? r.remittedAmount);
      const initialRej = toNum(r.initialRejected ?? r.initialRejectedAmount ?? r.initial_rejected);
      const currRej = toNum(r.currentRejected ?? r.currentRejectedAmount ?? r.current_rejected ?? r.rejected ?? r.rejectedAmount);
      const unprocessed = toNum(r.unprocessed ?? r.unprocessedAmount ?? r.unprocessed_amount);

      const yearMonth = r.yearMonth ?? (r.month ? `${new Date().getFullYear()}-${String((MONTHS.indexOf(r.month) + 1) || 1).padStart(2, '0')}` : null);

      return {
        key: yearMonth ?? r.month ?? r.months ?? monthLabel(r.month),
        yearMonth: yearMonth ?? monthLabel(r.month ?? r.months),
        claimedAmount: claimed,
        processedAmount: processed,
        paidAmount: paid,
        initialRejectedAmount: initialRej,
        initialRejectedPercentage: r.initialRejectedPercentage ?? (claimed > 0 ? (initialRej / claimed) * 100 : null),
        currentRejectedAmount: currRej,
        currentRejectedPercentage: r.currentRejectedPercentage ?? (processed > 0 ? (currRej / processed) * 100 : null),
        unprocessedAmount: unprocessed,
        processedAmountPercentage: r.processedAmountPercentage ?? (claimed > 0 ? (processed / claimed) * 100 : null),
        contribution: r.contribution ?? null,
        currentMedicalRejectedAmount: r.currentMedicalRejectedAmount ?? null,
        medicalRejectedPercentage: r.medicalRejectedPercentage ?? null,
        currentTechnicalRejectedAmount: r.currentTechnicalRejectedAmount ?? null,
        technicalRejectedPercentage: r.technicalRejectedPercentage ?? null,
        medicalDenialsRR: r.medicalDenialsRR ?? null,
        technicalDenialRR: r.technicalDenialRR ?? null,
      };
    });

  const totals = monthlyRows.reduce(
    (acc, r) => ({
      claimed: acc.claimed + (r.claimedAmount ?? 0),
      processed: acc.processed + (r.processedAmount ?? 0),
      paid: acc.paid + (r.paidAmount ?? 0),
      initialRej: acc.initialRej + (r.initialRejectedAmount ?? 0),
      currRej: acc.currRej + (r.currentRejectedAmount ?? 0),
      unprocessed: acc.unprocessed + (r.unprocessedAmount ?? 0),
      contribution: acc.contribution + (r.contribution ?? 0),
      medicalRej: acc.medicalRej + (r.currentMedicalRejectedAmount ?? 0),
      technicalRej: acc.technicalRej + (r.currentTechnicalRejectedAmount ?? 0),
    }),
    { claimed: 0, processed: 0, paid: 0, initialRej: 0, currRej: 0, unprocessed: 0, contribution: 0, medicalRej: 0, technicalRej: 0 }
  );

  const totalRow = {
    key: 'total',
    isTotal: true,
    yearMonth: 'Total',
    claimedAmount: totals.claimed,
    processedAmount: totals.processed,
    paidAmount: totals.paid,
    initialRejectedAmount: totals.initialRej,
    initialRejectedPercentage: totals.claimed > 0 ? (totals.initialRej / totals.claimed) * 100 : null,
    currentRejectedAmount: totals.currRej,
    currentRejectedPercentage: totals.processed > 0 ? (totals.currRej / totals.processed) * 100 : null,
    unprocessedAmount: totals.unprocessed,
    processedAmountPercentage: totals.claimed > 0 ? (totals.processed / totals.claimed) * 100 : null,
    contribution: totals.contribution > 0 ? totals.contribution : null,
    currentMedicalRejectedAmount: totals.medicalRej > 0 ? totals.medicalRej : null,
    medicalRejectedPercentage: null,
    currentTechnicalRejectedAmount: totals.technicalRej > 0 ? totals.technicalRej : null,
    technicalRejectedPercentage: null,
    medicalDenialsRR: null,
    technicalDenialRR: null,
  };

  const byClaimType = raw?.byClaimType ?? raw?.claimTypeRows;
  let claimTypeRows = [];
  if (byClaimType) {
    const ip = byClaimType.ip ?? byClaimType.IP ?? byClaimType[0];
    const op = byClaimType.op ?? byClaimType.OP ?? byClaimType[1];
    const build = (label, d) => {
      const claimed = toNum(d?.claimed ?? d?.claimedAmount);
      const processed = toNum(d?.processed ?? d?.processedAmount);
      const paid = toNum(d?.paid ?? d?.paidAmount);
      const initialRej = toNum(d?.initialRejected ?? d?.initialRejectedAmount);
      const currRej = toNum(d?.currentRejected ?? d?.currentRejectedAmount);
      const unprocessed = toNum(d?.unprocessed ?? d?.unprocessedAmount);
      return {
        key: label.toLowerCase(),
        yearMonth: label,
        claimedAmount: claimed,
        processedAmount: processed,
        paidAmount: paid,
        initialRejectedAmount: initialRej,
        initialRejectedPercentage: claimed > 0 ? (initialRej / claimed) * 100 : null,
        currentRejectedAmount: currRej,
        currentRejectedPercentage: processed > 0 ? (currRej / processed) * 100 : null,
        unprocessedAmount: unprocessed,
        processedAmountPercentage: claimed > 0 ? (processed / claimed) * 100 : null,
        contribution: null,
        currentMedicalRejectedAmount: null,
        medicalRejectedPercentage: null,
        currentTechnicalRejectedAmount: null,
        technicalRejectedPercentage: null,
        medicalDenialsRR: null,
        technicalDenialRR: null,
      };
    };
    if (ip) claimTypeRows.push(build('IP', ip));
    if (op) claimTypeRows.push(build('OP', op));
    if (claimTypeRows.length) {
      const gt = claimTypeRows.reduce(
        (a, r) => ({
          claimed: a.claimed + r.claimedAmount,
          processed: a.processed + r.processedAmount,
          paid: a.paid + r.paidAmount,
          initialRej: a.initialRej + r.initialRejectedAmount,
          currRej: a.currRej + r.currentRejectedAmount,
          unprocessed: a.unprocessed + r.unprocessedAmount,
        }),
        { claimed: 0, processed: 0, paid: 0, initialRej: 0, currRej: 0, unprocessed: 0 }
      );
      claimTypeRows.push({ key: 'claim-type-total', isTotal: true, ...build('Total', gt) });
    }
  }

  return {
    monthlyRows: [...monthlyRows, totalRow],
    dividerRow: claimTypeRows.length > 0,
    claimTypeRows,
  };
};

const mapPaymentToKPIs = (raw) => {
  if (!raw) return null;
  const r = (k) => raw[k] ?? raw[k.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)] ?? null;
  return {
    totalClaimsCount: toNum(r('totalClaimsCount') ?? r('total_claims_count')),
    totalClaimedAmount: toNum(r('totalClaimedAmount') ?? r('total_claimed_amount')),
    totalRemittedAmount: toNum(r('totalRemittedAmount') ?? r('total_remitted_amount') ?? r('totalPaidAmount') ?? r('total_paid_amount')),
    totalRejectedAmount: toNum(r('totalRejectedAmount') ?? r('total_rejected_amount')),
    overallRejectionPct: toNum(r('overallRejectionPct') ?? r('overall_rejection_pct')),
    totalWriteOffAmount: toNum(r('totalWriteOffAmount') ?? r('total_write_off_amount') ?? 0),
    totalUnprocessedAmount: toNum(r('totalUnprocessedAmount') ?? r('total_unprocessed_amount')),
    recoveryPct: toNum(r('recoveryPct') ?? r('recovery_pct')),
  };
};

/** Map API "month": "Total" row to KPI cards. Uses filtered table Total (year-specific). */
const mapTotalRowToKPIs = (totalRow) => {
  if (!totalRow) return null;
  const claimed = toNum(totalRow.claimedAmount);
  const processed = toNum(totalRow.processedAmount);
  const paid = toNum(totalRow.paidAmount);
  const rejected = toNum(totalRow.currentRejectedAmount);
  const unprocessed = toNum(totalRow.unprocessedAmount);
  return {
    totalClaimedAmount: claimed,
    totalRemittedAmount: paid,
    totalRejectedAmount: rejected,
    overallRejectionPct: totalRow.currentRejectedPercentage ?? (processed > 0 ? (rejected / processed) * 100 : 0),
    totalUnprocessedAmount: unprocessed,
  };
};

/** Filter table by year — client-side, no refetch */
const filterTableByYear = (table, year) => {
  if (!table?.monthlyRows?.length || !year) return table;
  const prefix = `${year}-`;
  const monthlyOnly = table.monthlyRows.filter(
    (r) => !r.isTotal && r.yearMonth && String(r.yearMonth).startsWith(prefix)
  );
  const totals = monthlyOnly.reduce(
    (acc, r) => ({
      claimed: acc.claimed + (r.claimedAmount ?? 0),
      processed: acc.processed + (r.processedAmount ?? 0),
      paid: acc.paid + (r.paidAmount ?? 0),
      initialRej: acc.initialRej + (r.initialRejectedAmount ?? 0),
      currRej: acc.currRej + (r.currentRejectedAmount ?? 0),
      unprocessed: acc.unprocessed + (r.unprocessedAmount ?? 0),
      contribution: acc.contribution + (r.contribution ?? 0),
      medicalRej: acc.medicalRej + (r.currentMedicalRejectedAmount ?? 0),
      technicalRej: acc.technicalRej + (r.currentTechnicalRejectedAmount ?? 0),
    }),
    { claimed: 0, processed: 0, paid: 0, initialRej: 0, currRej: 0, unprocessed: 0, contribution: 0, medicalRej: 0, technicalRej: 0 }
  );

  const currRej = totals.currRej;
  const totalRow = {
    key: 'total',
    isTotal: true,
    yearMonth: 'Total',
    claimedAmount: totals.claimed,
    processedAmount: totals.processed,
    paidAmount: totals.paid,
    initialRejectedAmount: totals.initialRej,
    initialRejectedPercentage: totals.claimed > 0 ? (totals.initialRej / totals.claimed) * 100 : null,
    currentRejectedAmount: totals.currRej,
    currentRejectedPercentage: totals.processed > 0 ? (totals.currRej / totals.processed) * 100 : null,
    unprocessedAmount: totals.unprocessed,
    processedAmountPercentage: totals.claimed > 0 ? (totals.processed / totals.claimed) * 100 : null,
    contribution: totals.contribution > 0 ? totals.contribution : null,
    currentMedicalRejectedAmount: totals.medicalRej > 0 ? totals.medicalRej : null,
    medicalRejectedPercentage: currRej > 0 ? (totals.medicalRej / currRej) * 100 : null,
    currentTechnicalRejectedAmount: totals.technicalRej > 0 ? totals.technicalRej : null,
    technicalRejectedPercentage: currRej > 0 ? (totals.technicalRej / currRej) * 100 : null,
    medicalDenialsRR: totals.processed > 0 ? (totals.medicalRej / totals.processed) * 100 : null,
    technicalDenialRR: totals.processed > 0 ? (totals.technicalRej / totals.processed) * 100 : null,
  };
  return {
    ...table,
    monthlyRows: [...monthlyOnly, totalRow],
  };
};

const buildDashboardQuery = (year, searchOn) => {
  const params = new URLSearchParams();
  if (year) params.set('year', year);
  if (searchOn) params.set('searchOn', searchOn);
  const q = params.toString();
  return q ? `?${q}` : '';
};

/**
 * API URL logic:
 * - officeId set → /api/dashboard/service-month-reports/office/{id} and payment-reports/office/{id}
 * - no officeId → base URLs (all offices)
 * - year + searchOn passed as query params (date field for year scope)
 * "All" permission with no selection passes null officeId → all offices.
 * Year filtering is also applied client-side as a safety net.
 * Backend handles caching.
 */
export function useDashboardApi(officeId, permission, year, searchOn) {
  const useMock = !DASHBOARD_APIS_LINKED;
  const base = '/api/dashboard';
  const useOfficeScope = officeId != null && officeId !== '' && officeId !== 'All';
  const officeSuffix = useOfficeScope ? `/office/${officeId}` : '';
  const query = buildDashboardQuery(year, searchOn);
  const serviceUrl = `${base}/service-month-reports${officeSuffix}${query}`;
  const paymentUrl = `${base}/payment-reports${officeSuffix}${query}`;

  const [serviceMonth, setServiceMonth] = useState(null);
  const [paymentReports, setPaymentReports] = useState(null);
  const [loading, setLoading] = useState(!useMock);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (useMock) return;
    setLoading(true);
    setError(null);
    const headers = getHeaders();

    const fetchService = async () => {
      try {
        const res = await fetch(serviceUrl, { headers });
        const json = res.ok ? await res.json().catch(() => null) : null;
        const data = unwrap(json);
        setServiceMonth(data);
        if (!res.ok) setError('Service month reports failed to load.');
        setLoading(false);
        return data;
      } catch (err) {
        console.error('Dashboard API error (service-month):', err);
        setError('Network issue. Unable to load dashboard data.');
        setServiceMonth(null);
        setLoading(false);
        return null;
      }
    };

    const fetchPayment = async () => {
      try {
        const res = await fetch(paymentUrl, { headers });
        const json = res.ok ? await res.json().catch(() => null) : null;
        const data = unwrap(json);
        setPaymentReports(data);
        if (!res.ok) setError((prev) => prev || 'Payment reports failed to load.');
        return data;
      } catch (err) {
        console.error('Dashboard API error (payment):', err);
        setError((prev) => prev || 'Network issue. Unable to load dashboard data.');
        setPaymentReports(null);
        return null;
      }
    };

    await Promise.all([fetchService(), fetchPayment()]);
  }, [serviceUrl, paymentUrl, useMock]);

  useEffect(() => {
    if (useMock) return;
    fetchData();
  }, [fetchData, useMock]);

  const y = year ?? '2026';
  const mockServiceMonthTable = useMock ? getExecutiveSummaryData(y) : null;
  const mockPaymentTable = useMock ? getPaymentReportsData(y) : null;
  const mockMetrics = useMock ? getExecutiveMetricsData(y) : null;
  const serviceMonthTable = useMock
    ? mockServiceMonthTable
    : filterTableByYear(mapToTableFormat(serviceMonth), y);
  const paymentTable = useMock
    ? mockPaymentTable
    : filterTableByYear(mapToTableFormat(paymentReports), y);

  const apiTotal = useMock ? null : extractApiTotalRow(serviceMonth) ?? extractApiTotalRow(paymentReports);
  const computedTotal = serviceMonthTable?.monthlyRows?.find((r) => r.isTotal)
    ?? paymentTable?.monthlyRows?.find((r) => r.isTotal);
  const totalRow = useMock
    ? (computedTotal ?? { key: 'total', isTotal: true, yearMonth: 'Total', ...getOverviewTotalRow() })
    : (apiTotal ?? computedTotal);
  const totalKpis = mapTotalRowToKPIs(totalRow);
  const paymentKpis = mapPaymentToKPIs(paymentReports);
  const kpis = {
    ...paymentKpis,
    ...(totalKpis || {}),
  };

  const monthlyRows = serviceMonthTable?.monthlyRows?.filter((r) => !r.isTotal && r.yearMonth && String(r.yearMonth).match(/^\d{4}-\d{2}$/)) ?? [];
  const claimTypeRows = serviceMonthTable?.claimTypeRows ?? paymentTable?.claimTypeRows ?? [];

  const monthlyTrend = useMock
    ? mockMetrics?.monthlyTrend ?? null
    : monthlyRows.length
    ? (() => {
        const sorted = [...monthlyRows].sort((a, b) => String(a.yearMonth).localeCompare(b.yearMonth));
        return {
          months: sorted.map((r) => (r.yearMonth && r.yearMonth.match(/^\d{4}-\d{2}$/) ? MONTHS[parseInt(r.yearMonth.slice(5, 7), 10) - 1] ?? r.yearMonth : r.yearMonth ?? '—')),
          revenue: sorted.map((r) => r.claimedAmount ?? 0),
          paid: sorted.map((r) => r.paidAmount ?? 0),
          currRejected: sorted.map((r) => r.currentRejectedAmount ?? 0),
          medical: sorted.map((r) => r.currentMedicalRejectedAmount ?? 0),
          technical: sorted.map((r) => r.currentTechnicalRejectedAmount ?? 0),
        };
      })()
    : null;

  const ip = claimTypeRows.find((r) => r.key === 'ip');
  const op = claimTypeRows.find((r) => r.key === 'op');
  const opVsIp = useMock
    ? mockMetrics?.opVsIp ?? null
    : ip && op
    ? {
        op: { claimedAmount: op.claimedAmount, currRejPct: op.currentRejectedPercentage, processedAmountPct: op.processedAmountPercentage },
        ip: { claimedAmount: ip.claimedAmount, currRejPct: ip.currentRejectedPercentage, processedAmountPct: ip.processedAmountPercentage },
      }
    : null;

  return {
    loading: useMock ? false : loading,
    error: useMock ? null : error,
    refetch: useMock ? () => {} : fetchData,
    serviceMonthTable,
    paymentTable,
    kpis,
    totalRow,
    monthlyTrend,
    opVsIp,
    rawServiceMonth: serviceMonth,
    rawPaymentReports: paymentReports,
  };
}
