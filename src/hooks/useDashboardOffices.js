import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  DASHBOARD_APIS_LINKED,
  MOCK_DASHBOARD_OFFICES,
  OVERVIEW_INSURANCE_REJECTION_API_LINKED,
} from '../config/dashboardApiMode';

const formatOfficeLabel = (office) => {
  const name =
    office.officeName ?? office.name ?? office.office_label ?? office.facilityName ?? 'Unnamed Office';
  const facilityId = office.facilityId ?? office.facility_id;
  if (facilityId != null && String(facilityId).trim() !== '') {
    return `${name} (${facilityId})`;
  }
  return name;
};

const mapOffice = (office) => ({
  id: String(office.officeId ?? office.id ?? office.office_id ?? ''),
  label: formatOfficeLabel(office),
  facilityId: office.facilityId ?? office.facility_id ?? null,
});

const unwrapOffices = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.offices)) return raw.offices;
  return [];
};

const shouldFetchOffices = DASHBOARD_APIS_LINKED || OVERVIEW_INSURANCE_REJECTION_API_LINKED;

let officesCache = shouldFetchOffices ? [] : MOCK_DASHBOARD_OFFICES;
let officesLoadedCache = !shouldFetchOffices;
let officesFetchPromise = null;
const officesListeners = new Set();

let officesSnapshot = { offices: officesCache, officesLoaded: officesLoadedCache };

function syncOfficesSnapshot() {
  officesSnapshot = { offices: officesCache, officesLoaded: officesLoadedCache };
}

function notifyOfficesListeners() {
  syncOfficesSnapshot();
  officesListeners.forEach((cb) => cb());
}

function subscribeOffices(cb) {
  officesListeners.add(cb);
  return () => officesListeners.delete(cb);
}

function getOfficesSnapshot() {
  return officesSnapshot;
}

async function fetchOfficesOnce() {
  if (officesFetchPromise) return officesFetchPromise;

  officesFetchPromise = (async () => {
    const token = localStorage.getItem('token');
    const headers = {
      Authorization: token ? `Bearer ${token}` : '',
      'ngrok-skip-browser-warning': 'true',
    };

    try {
      const res = await fetch('/api/offices', { headers });
      const data = res.ok ? await res.json() : null;
      const list = unwrapOffices(data);
      if (list.length) officesCache = list;
    } catch (err) {
      console.error('Failed to load offices for dashboard filter:', err);
    } finally {
      officesLoadedCache = true;
      notifyOfficesListeners();
    }
  })();

  return officesFetchPromise;
}

/** Warm office list before dashboard filters need it (deduped singleton). */
export function prefetchDashboardOffices() {
  if (!shouldFetchOffices || officesLoadedCache) return officesFetchPromise;
  return fetchOfficesOnce();
}

/**
 * Office dropdown options for dashboard filters.
 * Live list from GET /api/offices — fetched once per session (module singleton).
 */
export function useDashboardOffices(canSelectOffice) {
  const snapshot = useSyncExternalStore(
    subscribeOffices,
    getOfficesSnapshot,
    getOfficesSnapshot,
  );

  useEffect(() => {
    if (!canSelectOffice || !shouldFetchOffices) return undefined;
    prefetchDashboardOffices();
    return undefined;
  }, [canSelectOffice]);

  const officeOptions = useMemo(
    () => snapshot.offices.map(mapOffice).filter((office) => office.id),
    [snapshot.offices],
  );

  return {
    offices: snapshot.offices,
    officeOptions,
    officesLoaded: snapshot.officesLoaded,
  };
}
