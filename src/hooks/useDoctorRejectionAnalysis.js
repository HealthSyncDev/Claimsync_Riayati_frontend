import { useDoctorRejectionCacheSlice } from './useDoctorRejectionCacheSlice';

/**
 * GET /api/dashboard/doctor-rejection-analysis
 * → Monthly Financial & Rejection Matrix
 */
export function useDoctorRejectionAnalysis({
  clinicianId,
  enabled = true,
}) {
  return useDoctorRejectionCacheSlice('analysis', 'analysisError', clinicianId, enabled);
}
