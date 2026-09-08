import { useContext, useSyncExternalStore } from 'react';
import { DashboardDataCacheContext } from '../context/DashboardDataCacheContext';
import { getCacheEntry, subscribe, EMPTY_CACHE_ENTRY } from '../utils/dashboardCacheStore';

export function useDashboardFilterKey() {
  const ctx = useContext(DashboardDataCacheContext);
  if (!ctx) throw new Error('useDashboardFilterKey must be used within DashboardDataCacheProvider');
  return ctx.filterKey;
}

/**
 * Sync read from module-level cache. No mount fetch — prefetch orchestrator fills entries.
 * @param {string} queryId
 * @param {boolean} [enabled=true]
 */
export function useDashboardCachedQuery(queryId, enabled = true) {
  const { filterKey } = useContext(DashboardDataCacheContext) ?? { filterKey: '' };

  const entry = useSyncExternalStore(
    (cb) => (enabled && filterKey ? subscribe(filterKey, queryId, cb) : () => {}),
    () => (enabled && filterKey ? getCacheEntry(filterKey, queryId) : EMPTY_CACHE_ENTRY),
    () => (enabled && filterKey ? getCacheEntry(filterKey, queryId) : EMPTY_CACHE_ENTRY),
  );

  if (!enabled || !filterKey) {
    return EMPTY_CACHE_ENTRY;
  }
  return entry;
}

export function useDashboardCacheActions() {
  const ctx = useContext(DashboardDataCacheContext);
  if (!ctx) throw new Error('useDashboardCacheActions must be used within DashboardDataCacheProvider');
  return { refetchQuery: ctx.refetchQuery };
}
