import { useDoctorRejectionCacheSlice } from './useDoctorRejectionCacheSlice';

/**
 * GET /api/dashboard/doctor-medical-insurance-rejection-summary
 * → Current Rejection Insurance wise — Medical
 */
export function useDoctorMedicalInsuranceRejectionSummary({
  clinicianId,
  enabled = true,
}) {
  return useDoctorRejectionCacheSlice('insurance', 'insuranceError', clinicianId, enabled);
}
