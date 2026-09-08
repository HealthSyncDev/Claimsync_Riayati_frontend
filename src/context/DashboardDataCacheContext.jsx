import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import Toast from '../components/common/Toast';
import { useDashboardFilters } from './DashboardFiltersContext';
import { useDashboardOfficeScope } from '../hooks/useDashboardOfficeScope';
import { prefetchDashboardOffices } from '../hooks/useDashboardOffices';
import { buildDashboardFilterKey } from '../utils/dashboardFilterKey';
import {
  beginRevalidation,
  getCacheEntry,
  getLinkedQueryProgress,
  setCacheEntry,
  setCacheEntryIfChanged,
  subscribeFilterKey,
} from '../utils/dashboardCacheStore';
import {
  DASHBOARD_QUERIES,
  getQueryById,
} from '../config/dashboardQueryRegistry';
import { getDashboardSectionKey } from '../components/analytics-dashboard/dashboardSectionMeta';
import { isDashboardAppPath } from '../config/portals';
import { usePortal } from './PortalContext';

export const DashboardDataCacheContext = createContext(null);

const abortControllersRef = { current: new Map() };
const inFlightRef = { current: new Set() };

const linkedQueryIds = () => DASHBOARD_QUERIES.filter((q) => q.linked).map((q) => q.id);

function abortQuery(queryId) {
  const controller = abortControllersRef.current.get(queryId);
  if (controller) {
    controller.abort();
    abortControllersRef.current.delete(queryId);
  }
}

/** Cancel in-flight dashboard tab fetches (tab switch only — not Apply/batch priority). */
function abortOtherDashboardTabQueries(currentSectionKey, filterKey) {
  DASHBOARD_QUERIES.filter((q) => q.linked && q.sectionKey !== currentSectionKey).forEach((q) => {
    abortQuery(q.id);
    if (filterKey) inFlightRef.current.delete(inFlightKey(filterKey, q.id));
  });
}

function restoreCacheAfterAbort(filterKey, queryId) {
  const current = getCacheEntry(filterKey, queryId);
  if (current.status === 'revalidating' && current.data != null) {
    setCacheEntryIfChanged(filterKey, queryId, {
      status: 'success',
      data: current.data,
      error: current.error,
    });
  } else if (current.status === 'loading') {
    setCacheEntryIfChanged(filterKey, queryId, {
      status: 'idle',
      data: null,
      error: null,
    });
  }
}

function createQuerySignal(queryId) {
  abortQuery(queryId);
  const controller = new AbortController();
  abortControllersRef.current.set(queryId, controller);
  return controller.signal;
}

function inFlightKey(filterKey, queryId) {
  return `${filterKey}::${queryId}`;
}

async function revalidateOneQuery(query, filterKey, scope, signal) {
  beginRevalidation(filterKey, query.id);

  try {
    const previousData = getCacheEntry(filterKey, query.id).data;
    const data = await query.fetchFn(scope, signal, { previousData });
    if (signal.aborted) {
      restoreCacheAfterAbort(filterKey, query.id);
      return;
    }

    if (
      query.id === 'overview.insuranceRejection'
      && data?.error
      && !data?.overviewRaw
      && !data?.patientTypesRaw
    ) {
      setCacheEntry(filterKey, query.id, { status: 'error', data: null, error: data.error });
      return;
    }

    setCacheEntryIfChanged(filterKey, query.id, {
      status: 'success',
      data,
      error: data?.error ?? null,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      restoreCacheAfterAbort(filterKey, query.id);
      return;
    }
    const current = getCacheEntry(filterKey, query.id);
    if (current.data != null) {
      setCacheEntryIfChanged(filterKey, query.id, {
        status: 'success',
        data: current.data,
        error: err?.message || current.error,
      });
    } else {
      setCacheEntry(filterKey, query.id, {
        status: 'error',
        data: null,
        error: err?.message || 'Failed to load data.',
      });
    }
  } finally {
    if (!signal.aborted) {
      abortControllersRef.current.delete(query.id);
    }
  }
}

export function DashboardDataCacheProvider({ children }) {
  const location = useLocation();
  const { id: portalId } = usePortal();
  const { filters, filterApplyId, lastApplySection } = useDashboardFilters();
  const { apiOfficeId, officeFilterReady, canSelectOffice } = useDashboardOfficeScope();
  const [toastVisible, setToastVisible] = useState(false);
  const [reloadOverlay, setReloadOverlay] = useState({
    active: false,
    filterKey: '',
    batchGen: 0,
    finishing: false,
  });
  const [reloadProgressTick, setReloadProgressTick] = useState(0);
  const batchGenRef = useRef(0);
  const completedApplyIdRef = useRef(0);
  const prevSectionRef = useRef('');
  const currentSectionRef = useRef('overview');

  const isDashboardRoute = isDashboardAppPath(location.pathname);

  useEffect(() => {
    if (!canSelectOffice) return undefined;
    prefetchDashboardOffices();
    return undefined;
  }, [canSelectOffice]);

  const filterKey = useMemo(() => {
    if (!officeFilterReady || !apiOfficeId) return '';
    return buildDashboardFilterKey({
      officeId: filters.officeId,
      year: filters.year,
      searchOn: filters.searchOn,
      apiOfficeId,
      portal: portalId,
    });
  }, [filters.officeId, filters.year, filters.searchOn, apiOfficeId, officeFilterReady, portalId]);

  const scope = useMemo(
    () => ({
      apiOfficeId,
      year: filters.year,
      searchOn: filters.searchOn,
    }),
    [apiOfficeId, filters.year, filters.searchOn],
  );

  const currentSectionKey = getDashboardSectionKey(location.pathname);
  currentSectionRef.current = currentSectionKey;

  const revalidateQueryById = useCallback(
    async (queryId, { batchSignal, batchGen, force = false } = {}) => {
      if (!filterKey || !apiOfficeId) return;
      const query = getQueryById(queryId);
      if (!query?.linked) return;

      const dedupeKey = inFlightKey(filterKey, queryId);
      if (inFlightRef.current.has(dedupeKey)) {
        if (!force) return;
        // Clinician change / explicit refetch must restart with fresh scope params.
        abortQuery(queryId);
        inFlightRef.current.delete(dedupeKey);
      }

      inFlightRef.current.add(dedupeKey);
      const signal = batchSignal ?? createQuerySignal(queryId);

      try {
        await revalidateOneQuery(query, filterKey, scope, signal);
      } finally {
        inFlightRef.current.delete(dedupeKey);
        if (batchGen != null && batchGen !== batchGenRef.current) return;
      }
    },
    [filterKey, apiOfficeId, scope],
  );

  /**
   * Apply: fetch ONLY the active page’s query — never batch all dashboard tabs.
   * Also retries once office scope becomes ready if Apply was clicked early.
   */
  useEffect(() => {
    if (!isDashboardRoute) return undefined;
    if (filterApplyId === 0) return undefined;
    if (filterApplyId === completedApplyIdRef.current) return undefined;
    if (!filterKey || !officeFilterReady || !apiOfficeId) return undefined;

    const sectionKey = lastApplySection || currentSectionRef.current || 'overview';
    const query = DASHBOARD_QUERIES.find(
      (q) => q.sectionKey === sectionKey && q.linked,
    );

    completedApplyIdRef.current = filterApplyId;

    if (!query) return undefined;

    const batchGen = ++batchGenRef.current;
    abortOtherDashboardTabQueries(sectionKey, filterKey);
    setToastVisible(true);
    beginRevalidation(filterKey, query.id);
    revalidateQueryById(query.id, { force: true, batchGen });

    return undefined;
  }, [
    isDashboardRoute,
    filterKey,
    filterApplyId,
    lastApplySection,
    officeFilterReady,
    apiOfficeId,
    revalidateQueryById,
  ]);

  /**
   * Tab switch: do not auto-fetch. Each page loads only after its own Apply.
   * Keep section tracking for abort/cleanup of stray in-flight calls.
   */
  useEffect(() => {
    if (!isDashboardRoute) return undefined;

    if (prevSectionRef.current === '') {
      prevSectionRef.current = currentSectionKey;
      return undefined;
    }

    if (prevSectionRef.current === currentSectionKey) return undefined;

    prevSectionRef.current = currentSectionKey;

    if (filterKey) {
      abortOtherDashboardTabQueries(currentSectionKey, filterKey);
    }

    return undefined;
  }, [
    isDashboardRoute,
    location.pathname,
    currentSectionKey,
    filterKey,
  ]);

  const refetchQuery = useCallback(
    (queryId) => revalidateQueryById(queryId, { force: true }),
    [revalidateQueryById],
  );

  const linkedIds = useMemo(() => linkedQueryIds(), []);

  const reloadProgress = useMemo(() => {
    if (!reloadOverlay.active || !reloadOverlay.filterKey) {
      return { settled: 0, total: linkedIds.length, percent: 0, queryStatuses: [] };
    }
    return getLinkedQueryProgress(reloadOverlay.filterKey, linkedIds);
  }, [reloadOverlay.active, reloadOverlay.filterKey, reloadOverlay.finishing, linkedIds, reloadProgressTick]);

  useEffect(() => {
    if (!reloadOverlay.active || !reloadOverlay.filterKey) return undefined;
    return subscribeFilterKey(reloadOverlay.filterKey, () => {
      setReloadProgressTick((tick) => tick + 1);
    });
  }, [reloadOverlay.active, reloadOverlay.filterKey]);

  const value = useMemo(
    () => ({
      filterKey,
      refetchQuery,
      reloadOverlay: {
        ...reloadOverlay,
        progress: reloadOverlay.finishing ? 100 : reloadProgress.percent,
        settled: reloadProgress.settled,
        total: reloadProgress.total,
        queryStatuses: reloadProgress.queryStatuses,
      },
    }),
    [filterKey, refetchQuery, reloadOverlay, reloadProgress],
  );

  return (
    <DashboardDataCacheContext.Provider value={value}>
      {children}
      {toastVisible && (
        <Toast
          message="Filter applied to this page"
          type="success"
          onClose={() => setToastVisible(false)}
        />
      )}
    </DashboardDataCacheContext.Provider>
  );
}

export function useDashboardDataCache() {
  const ctx = useContext(DashboardDataCacheContext);
  if (!ctx) throw new Error('useDashboardDataCache must be used within DashboardDataCacheProvider');
  return ctx;
}

export function useDashboardReloadOverlay() {
  const ctx = useContext(DashboardDataCacheContext);
  return ctx?.reloadOverlay ?? {
    active: false,
    finishing: false,
    progress: 0,
    settled: 0,
    total: 0,
    queryStatuses: [],
  };
}
