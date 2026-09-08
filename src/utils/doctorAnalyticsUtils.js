import { REJECTION_PCT_CRITICAL, getRejectionPctBand } from './rejectionPctHeat';

/** Badge threshold — matches shared rejection % critical band (&gt;10%). */
export const HIGH_DENIAL_THRESHOLD = REJECTION_PCT_CRITICAL;

export const DENIAL_TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'medical', label: 'Medical' },
  { value: 'technical', label: 'Technical' },
  { value: 'admin_other', label: 'Admin & other' },
];

const displayLabel = (v) => {
  if (v == null || v === '' || String(v).toLowerCase() === 'null') return '—';
  return String(v);
};

export const normalizeSpecialtyRow = (r) => {
  const admin = Number(r.administrative_denial_amount ?? 0);
  const other = Number(r.other_denial_amount ?? 0);
  const claimed = Number(r.claimed_amount ?? 0);
  const combinedAmt =
    r.administrative_and_other_denial_amount != null
      ? Number(r.administrative_and_other_denial_amount)
      : admin + other;
  const adminPct = Number(r.administrative_denial_percentage ?? NaN);
  const combinedPct =
    r.administrative_and_other_denial_percentage != null &&
    r.administrative_and_other_denial_percentage !== '' &&
    !Number.isNaN(Number(r.administrative_and_other_denial_percentage))
      ? Number(r.administrative_and_other_denial_percentage)
      : !Number.isNaN(adminPct)
        ? adminPct
        : claimed > 0
          ? (combinedAmt / claimed) * 100
          : 0;
  return {
    specialty: displayLabel(r.specialty),
    claimed_amount: claimed,
    denial_amount: Number(r.denial_amount ?? 0),
    denial_percentage: Number(r.denial_percentage ?? 0),
    technical_denial_amount: Number(r.technical_denial_amount ?? 0),
    technical_denial_percentage: Number(r.technical_denial_percentage ?? 0),
    medical_denial_amount: Number(r.medical_denial_amount ?? 0),
    medical_denial_percentage: Number(r.medical_denial_percentage ?? 0),
    administrative_and_other_denial_amount: combinedAmt,
    administrative_and_other_denial_percentage: combinedPct,
  };
};

export const mapClinicianToTopDoctor = (r) => ({
  clinician_id: r.clinician_id,
  doctor: r.doctor_name_as_per_heartbeat || r.clinician_name || '—',
  speciality: displayLabel(r.department_name || r.specialty),
  claimed: Number(r.claimed_amount ?? 0),
  medicalDenials: Number(r.medical_denial_amount ?? r.denial_amount ?? 0),
  medicalDenialPct: Number(r.medical_denial_percentage ?? r.denial_percentage ?? 0),
});

export const mapApiRrRow = (r) => {
  const netAmount = Number(r.net_amount ?? 0);
  const medicalDenials = Number(r.medical_denials ?? 0);
  const name = r.clinician_name != null && String(r.clinician_name).trim() !== '' ? String(r.clinician_name).trim() : null;
  const id = r.clinician_id != null ? String(r.clinician_id) : '';
  const doctor = name || id || '—';
  const medicalRRPctRaw = r.medical_rr_percentage ?? r.medical_rr_pct;
  const medicalRRPct =
    medicalRRPctRaw != null && medicalRRPctRaw !== '' && !Number.isNaN(Number(medicalRRPctRaw))
      ? Number(medicalRRPctRaw)
      : null;
  return {
    doctor,
    clinicianId: id,
    netAmount,
    unprocessed: Number(r.unprocessed_amount ?? 0),
    initialRejected: Number(r.initial_rejected_amount ?? r.initial_rejected ?? 0),
    currentRejected: Number(r.current_rejected_amount ?? r.current_rejected ?? 0),
    rrPct: Number(r.rr_percentage ?? 0),
    medicalDenials,
    medicalRRPct,
  };
};

const TYPE_PREDICATES = {
  all: () => true,
  medical: (r) => r.medical_denial_amount > 0,
  technical: (r) => r.technical_denial_amount > 0,
  admin_other: (r) => (r.administrative_and_other_denial_amount ?? 0) > 0,
};

export const filterSpecialtyByDenialType = (rows, denialType) => {
  const pred = TYPE_PREDICATES[denialType] ?? TYPE_PREDICATES.all;
  return rows.filter(pred);
};

export const filterBySearch = (rows, query, keys) => {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
  );
};

export const specialtyToChartPoint = (r) => ({
  speciality: r.specialty,
  medicalDenialPct: r.medical_denial_percentage ?? 0,
  medicalDenialsAmount: r.medical_denial_amount ?? 0,
});

export const computeDoctorKpis = (topDoctors = [], specialtyRows = [], specialtyGrandTotal = null) => {
  const totals =
    specialtyGrandTotal
    ?? (specialtyRows.length ? buildSpecialtyTotals(specialtyRows) : null);

  const totalClaimed =
    totals?.claimed_amount
    ?? topDoctors.reduce((s, d) => s + (d.claimed ?? 0), 0);
  const totalMedicalDenials =
    totals?.medical_denial_amount
    ?? topDoctors.reduce((s, d) => s + (d.medicalDenials ?? 0), 0);
  const medicalDenialPct =
    totals?.medical_denial_percentage
    ?? (totalClaimed > 0 ? (totalMedicalDenials / totalClaimed) * 100 : null);
  const totalDenialAmount = totals?.denial_amount ?? null;
  const totalDenialPct = totals?.denial_percentage ?? null;

  const sorted = [...topDoctors].sort((a, b) => (b.medicalDenialPct ?? 0) - (a.medicalDenialPct ?? 0));
  const worstDoctor = sorted[0];
  const aboveThreshold = topDoctors.filter((d) => getRejectionPctBand(d.medicalDenialPct) === 'critical').length;

  const specSorted = [...specialtyRows].sort(
    (a, b) => (b.medical_denial_percentage ?? 0) - (a.medical_denial_percentage ?? 0),
  );
  const worstSpecialty = specSorted[0];

  return {
    totalClaimed,
    totalMedicalDenials,
    medicalDenialPct,
    avgDenialPct: medicalDenialPct,
    totalDenialAmount,
    totalDenialPct,
    worstDoctorName: worstDoctor?.doctor ?? null,
    worstDoctorPct: worstDoctor?.medicalDenialPct ?? null,
    worstSpecialtyName: worstSpecialty?.specialty ?? null,
    worstSpecialtyPct: worstSpecialty?.medical_denial_percentage ?? null,
    aboveThresholdCount: aboveThreshold,
    sparklineDenialPct: topDoctors.slice(0, 12).map((d) => d.medicalDenialPct ?? 0),
  };
};

export const computeTopDoctorAnomalies = (topDoctors) => {
  const badges = [];
  const above = topDoctors.filter((d) => getRejectionPctBand(d.medicalDenialPct) === 'critical');
  if (above.length) {
    badges.push({
      id: 'above-threshold',
      label: `${above.length} doctor${above.length > 1 ? 's' : ''} above ${HIGH_DENIAL_THRESHOLD}%`,
      tone: 'warn',
    });
  }
  const worst = [...topDoctors].sort((a, b) => (b.medicalDenialPct ?? 0) - (a.medicalDenialPct ?? 0))[0];
  if (worst?.doctor && worst.medicalDenialPct != null) {
    const name = worst.doctor.length > 22 ? `${worst.doctor.slice(0, 20)}…` : worst.doctor;
    badges.push({
      id: 'highest',
      label: `Highest: ${name} ${Number(worst.medicalDenialPct).toFixed(1)}%`,
      tone: 'error',
    });
  }
  return badges.slice(0, 2);
};

export const getDenialHighlightClass = (pct) => {
  const band = getRejectionPctBand(pct);
  if (band === 'critical') return 'doctor-denial--high';
  if (band === 'warn') return 'doctor-denial--med';
  return '';
};

export const buildRrTotals = (doctors) => {
  const netAmount = doctors.reduce((s, d) => s + (d.netAmount ?? 0), 0);
  const unprocessed = doctors.reduce((s, d) => s + (d.unprocessed ?? 0), 0);
  const initialRejected = doctors.reduce((s, d) => s + (d.initialRejected ?? 0), 0);
  const currentRejected = doctors.reduce((s, d) => s + (d.currentRejected ?? 0), 0);
  const medicalDenials = doctors.reduce((s, d) => s + (d.medicalDenials ?? 0), 0);
  const processed = netAmount - unprocessed;
  const rrPct = processed > 0 ? (currentRejected / processed) * 100 : 0;
  const withMr = doctors.filter((d) => d.medicalRRPct != null && !Number.isNaN(d.medicalRRPct));
  let medicalRRPct = null;
  if (withMr.length) {
    const w = withMr.reduce((s, d) => s + (d.netAmount ?? 0), 0);
    if (w > 0) {
      medicalRRPct = withMr.reduce((s, d) => s + (d.medicalRRPct ?? 0) * (d.netAmount ?? 0), 0) / w;
    }
  }
  return {
    netAmount,
    unprocessed,
    initialRejected,
    currentRejected,
    rrPct,
    medicalDenials,
    medicalRRPct,
  };
};

export const buildSpecialtyTotals = (rows) => {
  const claimed = rows.reduce((s, r) => s + r.claimed_amount, 0);
  const denial_amount = rows.reduce((s, r) => s + r.denial_amount, 0);
  const technical_denial_amount = rows.reduce((s, r) => s + r.technical_denial_amount, 0);
  const medical_denial_amount = rows.reduce((s, r) => s + r.medical_denial_amount, 0);
  const administrative_and_other_denial_amount = rows.reduce(
    (s, r) => s + (r.administrative_and_other_denial_amount ?? 0),
    0,
  );
  const pct = (part) => (claimed > 0 ? (part / claimed) * 100 : 0);
  return {
    claimed_amount: claimed,
    denial_amount,
    denial_percentage: pct(denial_amount),
    technical_denial_amount,
    technical_denial_percentage: pct(technical_denial_amount),
    medical_denial_amount,
    medical_denial_percentage: pct(medical_denial_amount),
    administrative_and_other_denial_amount,
    administrative_and_other_denial_percentage: pct(administrative_and_other_denial_amount),
  };
};
