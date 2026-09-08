import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { DASHBOARD_APIS_LINKED } from '../config/dashboardApiMode';
import { getMockPayerPerformance } from '../config/dashboardMockProviders';

const CACHE_TTL_MS = 5 * 60 * 1000;
/** @type {Map<string, { data: object, time: number }>} */
const cacheByUrl = new Map();

const unwrap = (res) => {
  if (res == null) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.senders)) return res.senders;
  if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) return [res.data];
  if (typeof res === 'object' && (res.sender_id != null || res.sender_name != null || res.claimed_amount != null)) {
    return [res];
  }
  return [];
};

const mapApiToInternal = (raw) => {
  if (!Array.isArray(raw)) return { payers: [], totals: {} };
  const rows = raw.map((r) => ({
    sender_id: r.sender_id,
    insurance: r.sender_name ?? r.sender_id ?? '—',
    claimed: Number(r.claimed_amount) || 0,
    processed: Number(r.processed_amount) || 0,
    unprocessed: Number(r.unprocessed_amount) || 0,
    initialRejected: Number(r.initial_rejected) || 0,
    initialRejPct: r.initial_rejected_percentage != null ? Number(r.initial_rejected_percentage) : null,
    currentRejected: Number(r.current_rejected) || 0,
    currentRejPct: r.current_rejected_percentage != null ? Number(r.current_rejected_percentage) : null,
    businessContributionPct: r.contribution != null ? Number(r.contribution) : null,
  }));

  const totals = rows.reduce(
    (acc, p) => ({
      claimed: acc.claimed + (p.claimed ?? 0),
      processed: acc.processed + (p.processed ?? 0),
      unprocessed: acc.unprocessed + (p.unprocessed ?? 0),
      initialRejected: acc.initialRejected + (p.initialRejected ?? 0),
      currentRejected: acc.currentRejected + (p.currentRejected ?? 0),
    }),
    { claimed: 0, processed: 0, unprocessed: 0, initialRejected: 0, currentRejected: 0 }
  );
  totals.initialRejPct = totals.claimed > 0 ? (totals.initialRejected / totals.claimed) * 100 : 0;
  totals.currentRejPct = totals.processed > 0 ? (totals.currentRejected / totals.processed) * 100 : 0;
  totals.businessContributionPct = 100;

  return { payers: rows, totals };
};

/**
 * Build performance URL:
 * - /api/senders/performance
 * - /api/senders/performance/office/{id}
 * - /api/senders/performance/{senderId}  (e.g. INS010)
 * - /api/senders/performance/{senderId}/office/{id}
 */
export function buildSendersPerformanceUrl(officeId, senderId) {
  const base = '/api/senders/performance';
  const hasOffice = officeId != null && officeId !== '' && officeId !== 'All';
  const hasSender = senderId != null && senderId !== '' && senderId !== 'All';
  const encSender = hasSender ? encodeURIComponent(String(senderId).trim()) : '';
  if (hasSender && hasOffice) return `${base}/${encSender}/office/${officeId}`;
  if (hasSender) return `${base}/${encSender}`;
  if (hasOffice) return `${base}/office/${officeId}`;
  return base;
}

/** Normalize API JSON to { payers, totals } */
export function normalizeSendersPerformanceData(res) {
  const raw = unwrap(res);
  return mapApiToInternal(raw);
}

/**
 * @param {string|null|undefined} officeId — when set, uses .../office/{id}
 * @param {string|null|undefined} senderId — sender code (e.g. INS010); when set, uses .../{senderId}/...
 */
export function useSendersPerformance(officeId, senderId) {
  const useMock = !DASHBOARD_APIS_LINKED;
  const url = useMemo(() => buildSendersPerformanceUrl(officeId, senderId), [officeId, senderId]);

  const [data, setData] = useState(useMock ? getMockPayerPerformance() : null);
  const [loading, setLoading] = useState(!useMock);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (useMock) {
      setData(getMockPayerPerformance());
      setLoading(false);
      setError(null);
      return getMockPayerPerformance();
    }
    const now = Date.now();
    const cached = cacheByUrl.get(url);
    if (cached && now - cached.time < CACHE_TTL_MS) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return cached.data;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(url);
      if (res == null) {
        setError('Failed to load payer data');
        setData(null);
        return null;
      }
      const mapped = normalizeSendersPerformanceData(res);
      cacheByUrl.set(url, { data: mapped, time: Date.now() });
      setData(mapped);
      return mapped;
    } catch (err) {
      console.error('Senders performance fetch error:', err);
      setError(err?.message || 'Failed to load payer data');
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [url, useMock]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
