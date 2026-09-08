import { useState, useEffect, useCallback } from 'react';
import { DASHBOARD_APIS_LINKED } from '../config/dashboardApiMode';
import { getMockIpOpTables } from '../config/dashboardMockProviders';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  'ngrok-skip-browser-warning': 'true',
});

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const toArray = (raw) =>
  Array.isArray(raw) ? raw : raw?.monthly ?? raw?.data ?? raw?.records ?? raw?.reports ?? raw?.items ?? [];

const toNum = (v) => (v != null ? Number(v) : 0);

const mapRow = (r) => {
  const claimed = toNum(r.claimed ?? r.claimedAmount ?? r.claimed_amount);
  const processed = toNum(r.processed ?? r.processedAmount ?? r.processed_amount);
  const paid = toNum(r.paid ?? r.paidAmount ?? r.paid_amount);
  const initialRej = toNum(r.initialRejected ?? r.initialRejectedAmount ?? r.initial_rejected);
  const currRej = toNum(r.currentRejected ?? r.currentRejectedAmount ?? r.current_rejected ?? r.rejected);
  const unprocessed = toNum(r.unprocessed ?? r.unprocessedAmount ?? r.unprocessed_amount);
  const yearMonth = r.yearMonth ?? r.month ?? r.months;
  const monthLabel = (m) => {
    if (m == null) return '—';
    if (typeof m === 'string' && m.match(/^\d{4}-\d{2}/)) return MONTHS[parseInt(m.slice(5, 7), 10) - 1] ?? m;
    return String(m);
  };
  return {
    key: yearMonth ?? r.month ?? r.months,
    yearMonth: yearMonth ?? monthLabel(r.month ?? r.months),
    claimedAmount: claimed,
    processedAmount: processed,
    paidAmount: paid,
    initialRejectedAmount: initialRej,
    initialRejectedPercentage: r.initialRejectedPercentage ?? r.initial_rejected_percentage ?? (claimed > 0 ? (initialRej / claimed) * 100 : null),
    currentRejectedAmount: currRej,
    currentRejectedPercentage: r.currentRejectedPercentage ?? r.current_rejected_percentage ?? (processed > 0 ? (currRej / processed) * 100 : null),
    unprocessedAmount: unprocessed,
    processedAmountPercentage: r.processedAmountPercentage ?? r.processed_amount_percentage ?? (claimed > 0 ? (processed / claimed) * 100 : null),
  };
};

const mapToTableFormat = (raw) => {
  const rows = toArray(raw);
  if (!rows?.length) return null;

  const monthlyRows = rows
    .filter((r) => {
      const m = r.month ?? r.months ?? r.yearMonth;
      return !r.isTotal && m !== 'Total' && m !== '9999-99';
    })
    .map(mapRow);

  const totals = monthlyRows.reduce(
    (acc, r) => ({
      claimed: acc.claimed + (r.claimedAmount ?? 0),
      processed: acc.processed + (r.processedAmount ?? 0),
      paid: acc.paid + (r.paidAmount ?? 0),
      initialRej: acc.initialRej + (r.initialRejectedAmount ?? 0),
      currRej: acc.currRej + (r.currentRejectedAmount ?? 0),
      unprocessed: acc.unprocessed + (r.unprocessedAmount ?? 0),
    }),
    { claimed: 0, processed: 0, paid: 0, initialRej: 0, currRej: 0, unprocessed: 0 }
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
  };

  return {
    monthlyRows: [...monthlyRows, totalRow],
  };
};

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
    }),
    { claimed: 0, processed: 0, paid: 0, initialRej: 0, currRej: 0, unprocessed: 0 }
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
  };
  return {
    ...table,
    monthlyRows: [...monthlyOnly, totalRow],
  };
};

/** Map UI reportType to API path segment between /ip-op/ and /ip|op/ */
const resolveIpOpReportPath = (reportType) => {
  const rt = reportType ?? 'service-month';
  if (rt === 'payment' || rt === 'payment-reports') return 'payment-reports';
  return 'service-month-reports';
};

const buildDashboardQuery = (year, searchOn) => {
  const params = new URLSearchParams();
  if (year) params.set('year', year);
  if (searchOn) params.set('searchOn', searchOn);
  const q = params.toString();
  return q ? `?${q}` : '';
};

/**
 * Fetches IP and OP dashboard data.
 *
 * With officeId (e.g. 1), requests are:
 * - GET {baseURL}/api/dashboard/ip-op/service-month-reports/ip/office/1
 * - GET {baseURL}/api/dashboard/ip-op/service-month-reports/op/office/1
 * - GET {baseURL}/api/dashboard/ip-op/payment-reports/ip/office/1   (reportType payment)
 * - GET {baseURL}/api/dashboard/ip-op/payment-reports/op/office/1   (reportType payment)
 *
 * year + searchOn are passed as query params.
 * With no officeId: same paths without `/office/{id}` (all offices).
 */
export function useIpOpApi(officeId, permission, year, reportType, searchOn) {
  const useMock = !DASHBOARD_APIS_LINKED;
  const base = '/api/dashboard/ip-op';
  const useOfficeScope = officeId != null && officeId !== '' && officeId !== 'All';
  const officeSuffix = useOfficeScope ? `/office/${officeId}` : '';
  const reportPath = resolveIpOpReportPath(reportType);
  const query = buildDashboardQuery(year, searchOn);
  const ipUrl = `${base}/${reportPath}/ip${officeSuffix}${query}`;
  const opUrl = `${base}/${reportPath}/op${officeSuffix}${query}`;

  const [ipData, setIpData] = useState(null);
  const [opData, setOpData] = useState(null);
  const [loading, setLoading] = useState(!useMock);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (useMock) return;
    setLoading(true);
    setError(null);
    const headers = getHeaders();

    try {
      const [ipRes, opRes] = await Promise.all([
        fetch(ipUrl, { headers }),
        fetch(opUrl, { headers }),
      ]);

      const ipJson = ipRes.ok ? await ipRes.json().catch(() => null) : null;
      const opJson = opRes.ok ? await opRes.json().catch(() => null) : null;

      if (!ipRes.ok || !opRes.ok) {
        setError(!ipRes.ok && !opRes.ok
          ? 'Network issue. Unable to load IP/OP data.'
          : !ipRes.ok ? 'IP data failed to load.' : 'OP data failed to load.');
      }

      const ipRaw = unwrap(ipJson);
      const opRaw = unwrap(opJson);
      setIpData(ipRaw);
      setOpData(opRaw);
    } catch (err) {
      console.error('IP/OP API error:', err);
      setError('Network issue. Unable to load IP/OP data.');
      setIpData(null);
      setOpData(null);
    } finally {
      setLoading(false);
    }
  }, [ipUrl, opUrl, useMock]);

  useEffect(() => {
    if (useMock) return;
    fetchData();
  }, [fetchData, useMock]);

  const y = year ?? '2026';
  const mockTables = useMock ? getMockIpOpTables(y, reportType) : null;
  const ipTable = useMock
    ? filterTableByYear(mockTables.ipTable, y)
    : filterTableByYear(mapToTableFormat(ipData), y);
  const opTable = useMock
    ? filterTableByYear(mockTables.opTable, y)
    : filterTableByYear(mapToTableFormat(opData), y);

  return {
    loading: useMock ? false : loading,
    error: useMock ? null : error,
    refetch: useMock ? () => {} : fetchData,
    ipTable,
    opTable,
  };
}
