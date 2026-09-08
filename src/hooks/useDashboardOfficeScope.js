import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDashboardFilters } from '../context/DashboardFiltersContext';
import { useDashboardOffices } from './useDashboardOffices';
import {
  isDashboardOfficeFilterReady,
  resolveDashboardOfficeIdParam,
} from '../utils/dashboardOfficeIdParam';

/**
 * Dashboard office filter: only users with permission "All" see the office dropdown.
 * "Office" (and anything else) is scoped to the user's assigned office only.
 */
export function normalizeDashboardPermission(raw) {
  if (raw == null || raw === '') return 'Office';
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (lower === 'all' || lower === 'all office' || lower === 'all offices') return 'All';
  return s;
}

export function useDashboardOfficeScope() {
  const { user } = useAuth();
  const { filters, setFilters } = useDashboardFilters();
  const permission = normalizeDashboardPermission(user?.permission);
  const userOfficeId = user?.officeId ?? user?.office_id;
  const canSelectOffice = permission === 'All';
  const { officeOptions, officesLoaded } = useDashboardOffices(canSelectOffice);

  const allOfficeIds = useMemo(
    () => officeOptions.map((o) => o.id).filter(Boolean),
    [officeOptions],
  );

  const apiOfficeId = useMemo(
    () =>
      resolveDashboardOfficeIdParam({
        filterOfficeId: filters.officeId,
        canSelectOffice,
        userOfficeId,
        allOfficeIds,
      }),
    [filters.officeId, canSelectOffice, userOfficeId, allOfficeIds],
  );

  const officeFilterReady = useMemo(
    () =>
      isDashboardOfficeFilterReady({
        canSelectOffice,
        userOfficeId,
        filterOfficeId: filters.officeId,
        allOfficeIds,
      }),
    [canSelectOffice, userOfficeId, filters.officeId, allOfficeIds],
  );

  /** Single office id or null (legacy path-scoped APIs). */
  const selectedOfficeId = useMemo(
    () =>
      canSelectOffice
        ? filters.officeId && filters.officeId !== 'All'
          ? filters.officeId
          : null
        : userOfficeId,
    [canSelectOffice, filters.officeId, userOfficeId],
  );

  return {
    permission,
    userOfficeId,
    canSelectOffice,
    selectedOfficeId,
    apiOfficeId,
    officeFilterReady,
    officesLoaded,
    officeOptions,
    filters,
    setFilters,
  };
}
