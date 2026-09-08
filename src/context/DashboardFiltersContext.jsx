import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getDashboardSectionKey } from '../components/analytics-dashboard/dashboardSectionMeta';
import { isDashboardAppPath } from '../config/portals';

export const defaultDashboardFilters = {
  officeId: 'All',
  year: '2026',
  month: 'All',
  claimType: 'All',
  /** Date field used with year (overview): SubmissionTransactionDate, EncounterStartDate, etc. */
  searchOn: 'EncounterStartDate',
  doctor: 'All',
  speciality: 'All',
  payer: 'All',
  denialCategory: 'All',
  denialType: 'All',
  claimStatus: 'All',
  paymentStatus: 'All',
  writeOffStatus: 'All',
  /** Payer performance: sender code, e.g. INS010; All = list all senders for current office scope */
  payerSenderId: 'All',
};

const HEADER_FILTER_KEYS = ['officeId', 'year', 'searchOn'];

const DashboardFiltersContext = createContext(null);

export function DashboardFiltersProvider({ children }) {
  const location = useLocation();
  const [filters, setFilters] = useState(defaultDashboardFilters);
  const [draftFilters, setDraftFilters] = useState(defaultDashboardFilters);
  const [filterApplyId, setFilterApplyId] = useState(0);
  /** Sections that have been Applied for the current filter values. */
  const [appliedSections, setAppliedSections] = useState({});
  /** Section that triggered the latest Apply (drives which page API runs). */
  const [lastApplySection, setLastApplySection] = useState(null);
  const appliedFiltersRef = useRef(filters);
  appliedFiltersRef.current = filters;

  const currentSectionKey = useMemo(
    () => (isDashboardAppPath(location.pathname)
      ? getDashboardSectionKey(location.pathname)
      : 'overview'),
    [location.pathname],
  );

  /** True when the active dashboard tab has been applied at least once for current filters. */
  const hasAppliedFilters = Boolean(appliedSections[currentSectionKey]);

  const applyFilters = useCallback(() => {
    const sectionKey = getDashboardSectionKey(location.pathname);
    const filtersChanged = HEADER_FILTER_KEYS.some(
      (key) => draftFilters[key] !== appliedFiltersRef.current[key],
    );

    setFilters({ ...draftFilters });
    setLastApplySection(sectionKey);
    setAppliedSections((prev) => (
      filtersChanged ? { [sectionKey]: true } : { ...prev, [sectionKey]: true }
    ));
    setFilterApplyId((id) => id + 1);
  }, [draftFilters, location.pathname]);

  const resetDraftFilters = useCallback(() => {
    setDraftFilters({ ...appliedFiltersRef.current });
  }, []);

  /** Discard unapplied header edits when switching dashboard tabs. */
  useEffect(() => {
    if (!isDashboardAppPath(location.pathname)) return;
    resetDraftFilters();
  }, [location.pathname, resetDraftFilters]);

  const clearFilter = useCallback((key) => {
    const val = defaultDashboardFilters[key];
    setFilters((prev) => ({ ...prev, [key]: val }));
    setDraftFilters((prev) => ({ ...prev, [key]: val }));
  }, []);

  const setDraftHeaderFilter = useCallback((key, value) => {
    if (!HEADER_FILTER_KEYS.includes(key)) return;
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hasPendingFilters = useMemo(
    () => HEADER_FILTER_KEYS.some((key) => draftFilters[key] !== filters[key]),
    [draftFilters, filters],
  );

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      draftFilters,
      setDraftFilters,
      setDraftHeaderFilter,
      applyFilters,
      resetDraftFilters,
      hasPendingFilters,
      hasAppliedFilters,
      appliedSections,
      lastApplySection,
      currentSectionKey,
      clearFilter,
      filterApplyId,
    }),
    [
      filters,
      draftFilters,
      setDraftHeaderFilter,
      applyFilters,
      resetDraftFilters,
      hasPendingFilters,
      hasAppliedFilters,
      appliedSections,
      lastApplySection,
      currentSectionKey,
      clearFilter,
      filterApplyId,
    ],
  );

  return (
    <DashboardFiltersContext.Provider value={value}>
      {children}
    </DashboardFiltersContext.Provider>
  );
}

export function useDashboardFilters() {
  const ctx = useContext(DashboardFiltersContext);
  if (!ctx) throw new Error('useDashboardFilters must be used within DashboardFiltersProvider');
  return ctx;
}
