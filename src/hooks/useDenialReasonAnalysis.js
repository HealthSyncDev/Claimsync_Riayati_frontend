import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { DASHBOARD_APIS_LINKED } from '../config/dashboardApiMode';
import { getDenialAnalysisData } from '../config/dashboardMockProviders';

const CACHE_TTL_MS = 5 * 60 * 1000;

const unwrap = (res) => (Array.isArray(res) ? res : res?.data ?? res?.reasons ?? []);

const toNum = (v) => (v != null ? Number(v) : 0);

/** Map API row to { reason, amount, pct } */
const mapToTopReasons = (raw) => {
  const rows = unwrap(raw);
  if (!rows.length) return { topReasons: [], grandTotal: 0 };
  const grandTotal = rows.reduce((s, r) => s + toNum(r.amount ?? r.current_rejected_amount ?? r.rejected_amount ?? r.value), 0);
  const topReasons = rows
    .map((r) => {
      const amount = toNum(r.amount ?? r.current_rejected_amount ?? r.rejected_amount ?? r.value);
      const reason = r.reason ?? r.denial_reason ?? r.reason_name ?? r.name ?? '—';
      return {
        reason,
        amount,
        pct: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
      };
    })
    .filter((r) => r.amount > 0 || r.reason)
    .sort((a, b) => b.amount - a.amount);
  return { topReasons, grandTotal };
};

const cacheCurrentRejected = new Map();
const cacheRejected = new Map();

/**
 * Fetches /api/denial-reason-analysis/current-rejected for Top Denial Reasons table.
 * Returns { data: { topReasons, grandTotal }, loading, error, refetch }
 */
export function useDenialCurrentRejected(officeId) {
  const useMock = !DASHBOARD_APIS_LINKED;
  const endpoint = useMemo(() => {
    const hasOffice = officeId != null && officeId !== '' && officeId !== 'All';
    return hasOffice
      ? `/api/denial-reason-analysis/current-rejected/office/${officeId}`
      : '/api/denial-reason-analysis/current-rejected';
  }, [officeId]);
  const [data, setData] = useState(useMock ? getDenialAnalysisData() : null);
  const [loading, setLoading] = useState(!useMock);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (useMock) {
      const mapped = getDenialAnalysisData();
      setData(mapped);
      setLoading(false);
      setError(null);
      return mapped;
    }

    const now = Date.now();
    const cached = cacheCurrentRejected.get(endpoint);
    if (cached && now - cached.time < CACHE_TTL_MS) {
      setData(cached.data);
      setLoading(false);
      return cached.data;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(endpoint);
      const mapped = mapToTopReasons(res);
      cacheCurrentRejected.set(endpoint, { data: mapped, time: Date.now() });
      setData(mapped);
      return mapped;
    } catch (err) {
      console.error('Denial current-rejected fetch error:', err);
      setError(err?.message || 'Failed to load denial reasons');
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, useMock]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Fetches /api/denial-reason-analysis/rejected for Denial Category Breakdown chart.
 * Returns { data: { topReasons, grandTotal }, loading, error, refetch }
 */
export function useDenialRejected(officeId) {
  const useMock = !DASHBOARD_APIS_LINKED;
  const endpoint = useMemo(() => {
    const hasOffice = officeId != null && officeId !== '' && officeId !== 'All';
    return hasOffice
      ? `/api/denial-reason-analysis/rejected/office/${officeId}`
      : '/api/denial-reason-analysis/rejected';
  }, [officeId]);
  const [data, setData] = useState(useMock ? getDenialAnalysisData() : null);
  const [loading, setLoading] = useState(!useMock);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (useMock) {
      const mapped = getDenialAnalysisData();
      setData(mapped);
      setLoading(false);
      setError(null);
      return mapped;
    }

    const now = Date.now();
    const cached = cacheRejected.get(endpoint);
    if (cached && now - cached.time < CACHE_TTL_MS) {
      setData(cached.data);
      setLoading(false);
      return cached.data;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(endpoint);
      const mapped = mapToTopReasons(res);
      cacheRejected.set(endpoint, { data: mapped, time: Date.now() });
      setData(mapped);
      return mapped;
    } catch (err) {
      console.error('Denial rejected fetch error:', err);
      setError(err?.message || 'Failed to load denial breakdown');
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, useMock]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
