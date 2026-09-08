import {
  OVERVIEW_INSURANCE_REJECTION_API_LINKED,
  REJECTION_MATRIX_API_LINKED,
  DOCTOR_PERFORMANCE_API_LINKED,
  DOCTOR_REJECTION_API_LINKED,
  PAYER_INSURANCE_CLAIM_SUMMARY_API_LINKED,
  DENIAL_TOP_REASONS_API_LINKED,
  FINANCIAL_RISK_API_LINKED,
} from './dashboardApiMode';
import { apiFetch } from '../utils/apiFetch';
import {
  mapApiRrRow,
  mapClinicianToTopDoctor,
  normalizeSpecialtyRow,
} from '../utils/doctorAnalyticsUtils';
import {
  buildDoctorRejectionClinicianQuery,
  mapDoctorMedicalCptDenialSummary,
  mapDoctorMedicalDenialSummary,
  mapDoctorMedicalInsuranceRejectionSummary,
  mapDoctorRejectionAnalysis,
} from '../utils/doctorRejectionApi';
import { getDoctorRejectionClinicianId } from '../utils/doctorRejectionSelectionStore';
import { mapDashboardDoctorsResponse } from '../components/analytics-dashboard/doctor-rejection/doctorRejectionDoctors';

export const DASHBOARD_QUERY_IDS = {
  overview: 'overview.insuranceRejection',
  rejection: 'rejection.monthWiseMatrix',
  doctor: 'doctor.performance',
  doctorRejection: 'doctorRejection.doctors',
  payer: 'payer.insuranceClaimSummary',
  denial: 'denial.topReasonTypes',
  financial: 'financial.risk',
};

export const DASHBOARD_PREFETCH_ORDER = [
  'overview',
  'rejection',
  'doctor',
  'doctor-rejection',
  'payer',
  'denial',
  'financial',
];

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  'ngrok-skip-browser-warning': 'true',
});

const dashboardFetch = async (url, { signal, headers = getHeaders() } = {}) => {
  const res = await fetch(url, { headers, signal });
  if (!res.ok) return { ok: false, data: null };
  const data = await res.json().catch(() => null);
  return { ok: true, data };
};

const buildQuery = (year, searchOn, officeId) => {
  const params = new URLSearchParams();
  if (year) params.set('year', year);
  if (searchOn) params.set('searchOn', searchOn);
  if (officeId != null && officeId !== '') params.set('officeId', String(officeId));
  const q = params.toString();
  return q ? `?${q}` : '';
};

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

/** @typedef {{ apiOfficeId: string, year: string, searchOn: string }} DashboardFetchScope */

export async function fetchOverviewInsuranceRejection(scope, signal) {
  const y = scope.year ?? '2026';
  const query = buildQuery(y, scope.searchOn, scope.apiOfficeId);
  const headers = getHeaders();
  const [overviewRes, patientTypesRes] = await Promise.all([
    dashboardFetch(`/api/dashboard/insurance-rejection-overview${query}`, { signal, headers }),
    dashboardFetch(`/api/dashboard/insurance-rejection-overview/patient-types${query}`, { signal, headers }),
  ]);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  let error = null;
  if (!overviewRes.ok && !patientTypesRes.ok) {
    error = 'Unable to load insurance rejection data.';
  } else if (!overviewRes.ok) {
    error = 'Insurance rejection overview failed to load.';
  } else if (!patientTypesRes.ok) {
    error = 'Claim type breakdown failed to load.';
  }

  return {
    overviewRaw: overviewRes.ok || patientTypesRes.ok ? unwrap(overviewRes.data) : null,
    patientTypesRaw: overviewRes.ok || patientTypesRes.ok ? unwrap(patientTypesRes.data) : null,
    error,
  };
}

export async function fetchMonthWiseDenialMatrix(scope, signal) {
  const y = scope.year ?? '2026';
  const query = buildQuery(y, scope.searchOn, scope.apiOfficeId);
  const { ok, data: json } = await dashboardFetch(
    `/api/dashboard/month-wise-denial-matrix${query}`,
    { signal },
  );

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  if (!ok) {
    throw new Error('Month-wise denial matrix failed to load.');
  }
  if (!json?.sections?.length) {
    throw new Error('No denial matrix data available for the selected filters.');
  }
  return json;
}

export async function fetchDoctorPerformance(scope, signal) {
  const query = buildQuery(scope.year, scope.searchOn, scope.apiOfficeId);

  // Sequential — these are heavy aggregations; parallel triples DB contention.
  const topRaw = await apiFetch(`/api/dashboard/top-doctor-rejections${query}`, { signal });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const specialtyRaw = await apiFetch(`/api/dashboard/specialty-denial-summary${query}`, { signal });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const rrRaw = await apiFetch(`/api/dashboard/doctor-rejection-rr-summary${query}`, { signal });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  if (!topRaw && !specialtyRaw && !rrRaw) {
    throw new Error('Failed to load doctor performance data');
  }

  return {
    topDoctors: (topRaw?.doctors ?? []).map(mapClinicianToTopDoctor),
    specialtyRows: (specialtyRaw?.specialties ?? []).map(normalizeSpecialtyRow),
    specialtyGrandTotal: specialtyRaw?.grandTotal
      ? normalizeSpecialtyRow(specialtyRaw.grandTotal)
      : null,
    doctorRrRows: (rrRaw?.doctors ?? []).map(mapApiRrRow),
  };
}

export async function fetchDoctorRejection(scope, signal, { previousData } = {}) {
  const y = scope.year ?? '2026';
  const so = scope.searchOn ?? 'SubmissionTransactionDate';
  const officeId = scope.apiOfficeId;
  const query = buildQuery(y, so, officeId);
  const clinicianId = getDoctorRejectionClinicianId();

  // Reuse picker list when already warm for this filter scope (Search / clinician change).
  // Only hit /doctors on cold load or filter change (empty previous bucket).
  let doctors = Array.isArray(previousData?.doctors) ? previousData.doctors : null;

  if (!doctors?.length) {
    const { ok, data: doctorsRaw } = await dashboardFetch(
      `/api/dashboard/doctors${query}`,
      { signal },
    );

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    if (!ok || !doctorsRaw) {
      throw new Error('Clinician list failed to load.');
    }

    doctors = mapDashboardDoctorsResponse(doctorsRaw);
  }

  const base = {
    doctors,
    clinicianId: clinicianId || null,
    analysis: null,
    analysisError: null,
    denial: null,
    denialError: null,
    cpt: null,
    cptError: null,
    insurance: null,
    insuranceError: null,
  };

  if (!clinicianId || officeId == null || officeId === '') {
    return base;
  }

  const clinicianQuery = buildDoctorRejectionClinicianQuery({
    year: y,
    searchOn: so,
    officeId,
    clinicianId,
  });

  const fetchOne = async (path) => {
    const res = await apiFetch(`${path}${clinicianQuery}`, { signal });
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return res;
  };

  const [analysisRaw, denialRaw, cptRaw, insuranceRaw] = await Promise.all([
    fetchOne('/api/dashboard/doctor-rejection-analysis'),
    fetchOne('/api/dashboard/doctor-medical-denial-code-summary'),
    fetchOne('/api/dashboard/doctor-medical-cpt-denial-summary'),
    fetchOne('/api/dashboard/doctor-medical-insurance-rejection-summary'),
  ]);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  return {
    ...base,
    analysis: analysisRaw != null ? mapDoctorRejectionAnalysis(analysisRaw) : null,
    analysisError: analysisRaw == null ? 'Failed to load monthly rejection matrix.' : null,
    denial: denialRaw != null ? mapDoctorMedicalDenialSummary(denialRaw) : null,
    denialError: denialRaw == null ? 'Failed to load medical denial code summary.' : null,
    cpt: cptRaw != null ? mapDoctorMedicalCptDenialSummary(cptRaw) : null,
    cptError: cptRaw == null ? 'Failed to load CPT denial summary.' : null,
    insurance: insuranceRaw != null
      ? mapDoctorMedicalInsuranceRejectionSummary(insuranceRaw)
      : null,
    insuranceError: insuranceRaw == null
      ? 'Failed to load insurance rejection summary.'
      : null,
  };
}

export async function fetchInsuranceClaimSummary(scope, signal) {
  const y = scope.year ?? '2026';
  const so = scope.searchOn ?? 'SubmissionTransactionDate';
  const query = buildQuery(y, so, scope.apiOfficeId);
  const { ok, data: json } = await dashboardFetch(
    `/api/dashboard/payer-performance/insurance-claim-summary${query}`,
    { signal },
  );

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  if (!ok) {
    throw new Error('Insurance claim summary failed to load.');
  }
  if (!json?.payers?.length) {
    throw new Error('No insurance claim summary data for the selected filters.');
  }
  return json;
}

export async function fetchTopDenialReasonTypes(scope, signal) {
  const y = scope.year ?? '2026';
  const so = scope.searchOn ?? 'SubmissionTransactionDate';
  const query = buildQuery(y, so, scope.apiOfficeId);
  const { ok, data: json } = await dashboardFetch(
    `/api/dashboard/denial-analysis/top-denial-reason-types${query}`,
    { signal },
  );

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  if (!ok) {
    throw new Error('Top denial reasons failed to load.');
  }
  if (!json?.denial_types?.length) {
    throw new Error('No top denial reason data for the selected filters.');
  }
  return json;
}

export async function fetchFinancialRisk(scope, signal) {
  const y = scope.year ?? '2026';
  const so = scope.searchOn ?? 'SubmissionTransactionDate';
  const query = buildQuery(y, so, scope.apiOfficeId);
  const { ok, data: json } = await dashboardFetch(
    `/api/dashboard/financial-risk${query}`,
    { signal },
  );

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  if (!ok) {
    throw new Error('Financial risk data failed to load.');
  }
  if (!json) {
    throw new Error('No financial risk data for the selected filters.');
  }
  return json;
}

export const DASHBOARD_QUERIES = [
  {
    id: DASHBOARD_QUERY_IDS.overview,
    sectionKey: 'overview',
    linked: OVERVIEW_INSURANCE_REJECTION_API_LINKED,
    fetchFn: fetchOverviewInsuranceRejection,
  },
  {
    id: DASHBOARD_QUERY_IDS.rejection,
    sectionKey: 'rejection',
    linked: REJECTION_MATRIX_API_LINKED,
    fetchFn: fetchMonthWiseDenialMatrix,
  },
  {
    id: DASHBOARD_QUERY_IDS.doctor,
    sectionKey: 'doctor',
    linked: DOCTOR_PERFORMANCE_API_LINKED,
    fetchFn: fetchDoctorPerformance,
  },
  {
    id: DASHBOARD_QUERY_IDS.doctorRejection,
    sectionKey: 'doctor-rejection',
    linked: DOCTOR_REJECTION_API_LINKED,
    fetchFn: fetchDoctorRejection,
  },
  {
    id: DASHBOARD_QUERY_IDS.payer,
    sectionKey: 'payer',
    linked: PAYER_INSURANCE_CLAIM_SUMMARY_API_LINKED,
    fetchFn: fetchInsuranceClaimSummary,
  },
  {
    id: DASHBOARD_QUERY_IDS.denial,
    sectionKey: 'denial',
    linked: DENIAL_TOP_REASONS_API_LINKED,
    fetchFn: fetchTopDenialReasonTypes,
  },
  {
    id: DASHBOARD_QUERY_IDS.financial,
    sectionKey: 'financial',
    linked: FINANCIAL_RISK_API_LINKED,
    fetchFn: fetchFinancialRisk,
  },
];

export function buildPrefetchQueue({ prioritySectionKey }) {
  const linkedQueries = DASHBOARD_QUERIES.filter((q) => q.linked);
  const bySection = new Map(linkedQueries.map((q) => [q.sectionKey, q]));

  const priority =
    prioritySectionKey && bySection.has(prioritySectionKey)
      ? bySection.get(prioritySectionKey)
      : bySection.get('overview') ?? linkedQueries[0];

  const rest = DASHBOARD_PREFETCH_ORDER.map((key) => bySection.get(key)).filter(
    (q) => q && q.id !== priority?.id,
  );

  return [priority, ...rest].filter(Boolean);
}

export function getQueryById(queryId) {
  return DASHBOARD_QUERIES.find((q) => q.id === queryId);
}
