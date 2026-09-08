import { useDoctorRejectionCacheSlice } from './useDoctorRejectionCacheSlice';

/**
 * GET /api/dashboard/doctor-medical-denial-code-summary
 * → Denial Code wise Summary — Medical
 */
export function useDoctorMedicalDenialSummary({
  clinicianId,
  enabled = true,
}) {
  return useDoctorRejectionCacheSlice('denial', 'denialError', clinicianId, enabled);
}
