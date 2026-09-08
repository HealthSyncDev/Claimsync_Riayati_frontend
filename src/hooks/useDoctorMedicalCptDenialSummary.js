import { useDoctorRejectionCacheSlice } from './useDoctorRejectionCacheSlice';

/**
 * GET /api/dashboard/doctor-medical-cpt-denial-summary
 * → CPT wise Rejections — Medical
 */
export function useDoctorMedicalCptDenialSummary({
  clinicianId,
  enabled = true,
}) {
  return useDoctorRejectionCacheSlice('cpt', 'cptError', clinicianId, enabled);
}
