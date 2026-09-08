/**
 * Toggle live dashboard API wiring.
 * Set to true when you want dashboard pages to fetch from the backend again.
 */
export const DASHBOARD_APIS_LINKED = false;

/** Overview insurance rejection tables use dedicated endpoints. */
export const OVERVIEW_INSURANCE_REJECTION_API_LINKED = true;

/** Rejection analytics month-wise denial matrix table. */
export const REJECTION_MATRIX_API_LINKED = true;

/** Doctor performance tables (top rejections, specialty summary, RR summary). */
export const DOCTOR_PERFORMANCE_API_LINKED = true;

/** Doctor rejection analysis clinician list (picker bootstrap). */
export const DOCTOR_REJECTION_API_LINKED = true;

/** Payer performance insurance-wise claim summary table. */
export const PAYER_INSURANCE_CLAIM_SUMMARY_API_LINKED = true;

/** Denial analysis top denial reason types table. */
export const DENIAL_TOP_REASONS_API_LINKED = true;

/** Financial risk write-off, unprocessed, settlement dashboard. */
export const FINANCIAL_RISK_API_LINKED = true;

export const MOCK_DASHBOARD_OFFICES = [
  { officeId: '1', officeName: 'Main Hospital', facilityId: 'FAC001' },
  { officeId: '2', officeName: 'Branch Clinic', facilityId: 'FAC002' },
  { officeId: '3', officeName: 'Outpatient Center', facilityId: 'FAC003' },
];
