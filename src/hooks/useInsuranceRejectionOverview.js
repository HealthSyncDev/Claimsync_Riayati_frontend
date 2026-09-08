import { useCallback, useMemo } from 'react';
import { OVERVIEW_INSURANCE_REJECTION_API_LINKED } from '../config/dashboardApiMode';
import { getExecutiveSummaryData, getMockIpOpTables } from '../config/dashboardMockProviders';
import { DASHBOARD_QUERY_IDS } from '../config/dashboardQueryRegistry';
import {
  useDashboardCacheActions,
  useDashboardCachedQuery,
} from './useDashboardCachedQuery';

const toNum = (v) => (v != null ? Number(v) : 0);

/** Map API month row → table row shape used by ExecutiveSummaryTable / IpOpBreakdownSection */
export const mapInsuranceRejectionMonthRow = (row) => {
  const label = row.label ?? row.month;
  const isTotal = label === 'Total' || row.isTotal;
  return {
    key: isTotal ? 'total' : (row.month ?? label),
    isTotal,
    yearMonth: isTotal ? 'Total' : String(label),
    claimedAmount: toNum(row.claimed_amount ?? row.claimedAmount),
    processedAmount: toNum(row.processed_amount ?? row.processedAmount),
    paidAmount: toNum(row.paid_amount ?? row.paidAmount),
    initialRejectedAmount: toNum(row.initial_rejected ?? row.initialRejectedAmount ?? row.initial_rejected_amount),
    initialRejectedPercentage: row.initial_rejected_percentage ?? row.initialRejectedPercentage,
    currentRejectedAmount: toNum(row.current_rejected ?? row.currentRejectedAmount ?? row.current_rejected_amount),
    currentRejectedPercentage: row.current_rejected_percentage ?? row.currentRejectedPercentage,
    unprocessedAmount: toNum(row.unprocessed ?? row.unprocessedAmount ?? row.unprocessed_amount),
    processedAmountPercentage: row.processed_percentage ?? row.processedAmountPercentage ?? row.processed_amount_percentage,
  };
};

const mapMonthsToTable = (months) => {
  const rows = (months ?? []).map(mapInsuranceRejectionMonthRow);
  if (!rows.length) return null;
  return { monthlyRows: rows, dividerRow: false, claimTypeRows: [] };
};

const mapPatientTypesToIpOp = (patientTypes) => {
  const ip = patientTypes?.find((p) => p.label === 'IP');
  const op = patientTypes?.find((p) => p.label === 'OP');
  return {
    ipTable: ip?.months?.length ? mapMonthsToTable(ip.months) : null,
    opTable: op?.months?.length ? mapMonthsToTable(op.months) : null,
  };
};

const buildMonthlyTrend = (months) => {
  const monthlyOnly = (months ?? []).filter((m) => m.label !== 'Total' && m.month !== 'Total');
  if (!monthlyOnly.length) return null;
  return {
    months: monthlyOnly.map((m) => m.label ?? String(m.month)),
    revenue: monthlyOnly.map((m) => toNum(m.claimed_amount)),
    paid: monthlyOnly.map((m) => toNum(m.paid_amount)),
    currRejected: monthlyOnly.map((m) => toNum(m.current_rejected)),
  };
};

const buildOpVsIp = (patientTypes) => {
  const ip = patientTypes?.find((p) => p.label === 'IP');
  const op = patientTypes?.find((p) => p.label === 'OP');
  if (!ip || !op) return null;
  return {
    ip: {
      claimedAmount: toNum(ip.claimed_amount),
      currRejPct: ip.current_rejected_percentage,
      processedAmountPct: ip.processed_percentage,
    },
    op: {
      claimedAmount: toNum(op.claimed_amount),
      currRejPct: op.current_rejected_percentage,
      processedAmountPct: op.processed_percentage,
    },
  };
};

const mapTotalRowForKpi = (totalRow) => {
  if (!totalRow) return null;
  return {
    key: 'total',
    isTotal: true,
    yearMonth: 'Total',
    claimedAmount: totalRow.claimedAmount,
    paidAmount: totalRow.paidAmount,
    currentRejectedPercentage: totalRow.currentRejectedPercentage,
    currentRejectedAmount: totalRow.currentRejectedAmount,
    unprocessedAmount: totalRow.unprocessedAmount,
    processedAmount: totalRow.processedAmount,
    initialRejectedAmount: totalRow.initialRejectedAmount,
    initialRejectedPercentage: totalRow.initialRejectedPercentage,
    processedAmountPercentage: totalRow.processedAmountPercentage,
  };
};

/**
 * Overview insurance rejection tables (cache-backed when API linked).
 */
export function useInsuranceRejectionOverview(officeId, year, searchOn, enabled = true) {
  const useMock = !OVERVIEW_INSURANCE_REJECTION_API_LINKED;
  const y = year ?? '2026';
  const cacheEnabled = !useMock && enabled && !!officeId;
  const { status, data, error: cacheError } = useDashboardCachedQuery(
    DASHBOARD_QUERY_IDS.overview,
    cacheEnabled,
  );
  const { refetchQuery } = useDashboardCacheActions();

  const overviewRaw = data?.overviewRaw ?? null;
  const patientTypesRaw = data?.patientTypesRaw ?? null;
  const hasData = Boolean(overviewRaw?.months?.length || patientTypesRaw?.patient_types?.length);
  const loading = cacheEnabled && !hasData && (status === 'idle' || status === 'loading');
  const error = cacheError ?? data?.error ?? null;

  const mockOverviewTable = useMock ? getExecutiveSummaryData(y) : null;
  const mockIpOp = useMock ? getMockIpOpTables(y, 'service-month') : null;

  const overviewTable = useMemo(() => {
    if (useMock) return mockOverviewTable;
    return mapMonthsToTable(overviewRaw?.months);
  }, [useMock, mockOverviewTable, overviewRaw]);

  const { ipTable, opTable } = useMemo(() => {
    if (useMock) return { ipTable: mockIpOp?.ipTable ?? null, opTable: mockIpOp?.opTable ?? null };
    return mapPatientTypesToIpOp(patientTypesRaw?.patient_types);
  }, [useMock, mockIpOp, patientTypesRaw]);

  const totalRow = useMemo(() => {
    if (useMock) {
      return mockOverviewTable?.monthlyRows?.find((r) => r.isTotal) ?? null;
    }
    const total = overviewRaw?.months?.find((m) => m.label === 'Total');
    return total ? mapTotalRowForKpi(mapInsuranceRejectionMonthRow(total)) : overviewTable?.monthlyRows?.find((r) => r.isTotal) ?? null;
  }, [useMock, mockOverviewTable, overviewRaw, overviewTable]);

  const monthlyTrend = useMemo(() => {
    if (useMock) return null;
    return buildMonthlyTrend(overviewRaw?.months);
  }, [useMock, overviewRaw]);

  const opVsIp = useMemo(() => {
    if (useMock) return null;
    return buildOpVsIp(overviewRaw?.patient_types);
  }, [useMock, overviewRaw]);

  const refetch = useCallback(() => {
    if (useMock) return;
    refetchQuery(DASHBOARD_QUERY_IDS.overview);
  }, [refetchQuery, useMock]);

  return {
    loading: useMock ? false : loading,
    error: useMock ? null : error,
    refetch,
    overviewTable,
    ipTable,
    opTable,
    totalRow,
    monthlyTrend,
    opVsIp,
  };
}
