const cache = new Map();
const listeners = new Map();
const filterKeyListeners = new Map();

export const EMPTY_CACHE_ENTRY = Object.freeze({
  status: 'idle',
  data: null,
  error: null,
  updatedAt: 0,
});

function listenerKey(filterKey, queryId) {
  return `${filterKey}::${queryId}`;
}

function notify(filterKey, queryId) {
  const key = listenerKey(filterKey, queryId);
  const subs = listeners.get(key);
  if (!subs) return;
  subs.forEach((cb) => cb());

  const fkSubs = filterKeyListeners.get(filterKey);
  if (fkSubs) fkSubs.forEach((cb) => cb());
}

function isDataEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  try {
    const left = JSON.stringify(a);
    if (left.length > 100_000) return false;
    return left === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function getCacheEntry(filterKey, queryId) {
  if (!filterKey) return EMPTY_CACHE_ENTRY;
  const bucket = cache.get(filterKey);
  if (!bucket) return EMPTY_CACHE_ENTRY;
  return bucket.get(queryId) ?? EMPTY_CACHE_ENTRY;
}

export function setCacheEntry(filterKey, queryId, entry) {
  if (!filterKey) return;
  let bucket = cache.get(filterKey);
  if (!bucket) {
    bucket = new Map();
    cache.set(filterKey, bucket);
  }
  bucket.set(queryId, { ...entry, updatedAt: Date.now() });
  notify(filterKey, queryId);
}

export function setCacheEntryIfChanged(filterKey, queryId, nextEntry) {
  if (!filterKey) return false;
  const current = getCacheEntry(filterKey, queryId);
  const dataUnchanged = isDataEqual(current.data, nextEntry.data);
  const statusUnchanged = current.status === nextEntry.status;
  const errorUnchanged = current.error === nextEntry.error;

  if (dataUnchanged && statusUnchanged && errorUnchanged) {
    if (current.status === 'revalidating' && nextEntry.status === 'success') {
      setCacheEntry(filterKey, queryId, { ...current, status: 'success' });
      return true;
    }
    return false;
  }

  setCacheEntry(filterKey, queryId, nextEntry);
  return true;
}

/** SWR: keep stale data visible while revalidating. */
export function beginRevalidation(filterKey, queryId) {
  if (!filterKey) return;
  const current = getCacheEntry(filterKey, queryId);
  if (current.data != null) {
    if (current.status === 'revalidating') return;
    setCacheEntry(filterKey, queryId, {
      status: 'revalidating',
      data: current.data,
      error: current.error,
    });
  } else {
    if (current.status === 'loading') return;
    setCacheEntry(filterKey, queryId, {
      status: 'loading',
      data: null,
      error: null,
    });
  }
}

export function subscribe(filterKey, queryId, callback) {
  const key = listenerKey(filterKey, queryId);
  let subs = listeners.get(key);
  if (!subs) {
    subs = new Set();
    listeners.set(key, subs);
  }
  subs.add(callback);
  return () => {
    subs.delete(callback);
    if (subs.size === 0) listeners.delete(key);
  };
}

/** Fires when any query entry changes for the given filterKey (batch progress). */
export function subscribeFilterKey(filterKey, callback) {
  if (!filterKey) return () => {};
  let subs = filterKeyListeners.get(filterKey);
  if (!subs) {
    subs = new Set();
    filterKeyListeners.set(filterKey, subs);
  }
  subs.add(callback);
  return () => {
    subs.delete(callback);
    if (subs.size === 0) filterKeyListeners.delete(filterKey);
  };
}

export function getLinkedQueryProgress(filterKey, linkedQueryIds) {
  if (!filterKey || !linkedQueryIds?.length) {
    return { settled: 0, total: 0, percent: 0, active: 0, queryStatuses: [] };
  }

  const total = linkedQueryIds.length;
  const slotWeight = 100 / total;
  const queryStatuses = linkedQueryIds.map((queryId) => {
    const entry = getCacheEntry(filterKey, queryId);
    const settled = entry.status === 'success' || entry.status === 'error';
    const active = entry.status === 'loading' || entry.status === 'revalidating';
    return { queryId, status: entry.status, settled, active };
  });

  const settled = queryStatuses.filter((q) => q.settled).length;
  const active = queryStatuses.filter((q) => q.active).length;
  const inFlightPartial = active * slotWeight * 0.5;
  const percent = Math.min(99, Math.round(settled * slotWeight + inFlightPartial));

  return { settled, total, active, percent, queryStatuses };
}

export function hasCachedDataForFilterKey(filterKey) {
  if (!filterKey) return false;
  const bucket = cache.get(filterKey);
  if (!bucket) return false;
  for (const entry of bucket.values()) {
    if (entry.status === 'success' && entry.data != null) return true;
  }
  return false;
}

/** True when every linked query has finished at least once (success or error). */
export function areAllLinkedQueriesSettled(filterKey, linkedQueryIds) {
  if (!filterKey || !linkedQueryIds?.length) return false;
  const bucket = cache.get(filterKey);
  if (!bucket) return false;
  return linkedQueryIds.every((queryId) => {
    const entry = bucket.get(queryId);
    return entry?.status === 'success' || entry?.status === 'error';
  });
}

export function clearCacheStore() {
  cache.clear();
}
