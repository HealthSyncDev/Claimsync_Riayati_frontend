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
import { useDashboardFilters } from './DashboardFiltersContext';
import { useDashboardOfficeScope } from '../hooks/useDashboardOfficeScope';
import { useDashboardDoctors } from '../hooks/useDashboardDoctors';
import { useDashboardCacheActions } from '../hooks/useDashboardCachedQuery';
import { DASHBOARD_QUERY_IDS } from '../config/dashboardQueryRegistry';
import {
  getDoctorRejectionClinicianId,
  setDoctorRejectionClinicianId,
} from '../utils/doctorRejectionSelectionStore';

const DoctorRejectionContext = createContext(null);

export function DoctorRejectionProvider({ children }) {
  const location = useLocation();
  const { filterApplyId } = useDashboardFilters();
  const { apiOfficeId, officeFilterReady, filters } = useDashboardOfficeScope();
  const { refetchQuery } = useDashboardCacheActions();
  const [selectedDoctorId, setSelectedDoctorIdState] = useState(
    () => getDoctorRejectionClinicianId(),
  );
  const prevFilterApplyId = useRef(filterApplyId);

  const isDoctorRejectionRoute = location.pathname.includes('/dashboard/doctor-rejection');

  // Keep reading warm cache even off-route so selection + data survive tab switches.
  const doctorsEnabled = officeFilterReady;

  const {
    doctors,
    loading: doctorsLoading,
    error: doctorsError,
  } = useDashboardDoctors(
    apiOfficeId,
    filters.year,
    filters.searchOn,
    doctorsEnabled,
  );

  const setSelectedDoctorId = useCallback((nextId) => {
    const normalized = nextId != null && nextId !== '' ? String(nextId) : null;
    setSelectedDoctorIdState(normalized);
    setDoctorRejectionClinicianId(normalized);
    if (normalized) {
      refetchQuery(DASHBOARD_QUERY_IDS.doctorRejection);
    }
  }, [refetchQuery]);

  useEffect(() => {
    if (prevFilterApplyId.current !== filterApplyId) {
      prevFilterApplyId.current = filterApplyId;
      setSelectedDoctorIdState(null);
      setDoctorRejectionClinicianId(null);
    }
  }, [filterApplyId]);

  // Drop selection only when the warm clinician list no longer includes them
  useEffect(() => {
    if (!selectedDoctorId || doctorsLoading) return;
    if (!doctors.length) return;
    if (!doctors.some((d) => d.id === selectedDoctorId)) {
      setSelectedDoctorIdState(null);
      setDoctorRejectionClinicianId(null);
    }
  }, [doctors, doctorsLoading, selectedDoctorId]);

  const value = useMemo(
    () => ({
      doctors,
      doctorsLoading,
      doctorsError,
      selectedDoctorId,
      setSelectedDoctorId,
      isDoctorRejectionRoute,
    }),
    [doctors, doctorsLoading, doctorsError, selectedDoctorId, setSelectedDoctorId, isDoctorRejectionRoute],
  );

  return (
    <DoctorRejectionContext.Provider value={value}>
      {children}
    </DoctorRejectionContext.Provider>
  );
}

export function useDoctorRejection() {
  const ctx = useContext(DoctorRejectionContext);
  if (!ctx) {
    throw new Error('useDoctorRejection must be used within DoctorRejectionProvider');
  }
  return ctx;
}
