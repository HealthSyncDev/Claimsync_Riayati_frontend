/**
 * Shared query builder for clinician-scoped doctor-rejection dashboard APIs.
 * Params: year, searchOn, officeId (comma-sep), clinicianId
 */
export function buildDoctorRejectionClinicianQuery({
  year,
  searchOn,
  officeId,
  clinicianId,
}) {
  const params = new URLSearchParams();
  if (year != null && year !== '') params.set('year', String(year));
  if (searchOn) params.set('searchOn', String(searchOn));
  if (officeId != null && officeId !== '') params.set('officeId', String(officeId));
  if (clinicianId) params.set('clinicianId', String(clinicianId));
  const q = params.toString();
  return q ? `?${q}` : '';
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Map GET /api/dashboard/doctor-rejection-analysis → monthly matrix + totals.
 */
export function mapDoctorRejectionAnalysis(raw) {
  if (!raw || typeof raw !== 'object') {
    return { monthlyRows: [], totals: null, meta: null };
  }

  const months = Array.isArray(raw.months) ? raw.months : [];
  const monthlyRows = [];
  let totals = null;

  months.forEach((row) => {
    const label = String(row?.label ?? '').trim();
    const mapped = {
      month: label || '—',
      monthNum: row?.month != null ? Number(row.month) : null,
      claimed: num(row.claimed_amount),
      paid: num(row.paid_amount),
      processed: num(row.processed_amount),
      processedPct: num(row.processed_percentage),
      initialRejected: num(row.initial_rejected),
      initialRejPct: num(row.initial_rejected_percentage),
      currentRejected: num(row.current_rejected),
      currentRejPct: num(row.current_rejected_percentage),
      unprocessed: num(row.unprocessed),
      medical: num(row.medical_amount),
      medicalPct: num(row.medical_percentage),
      admin: num(row.admin_amount),
      adminPct: num(row.admin_percentage),
      contractual: num(row.contractual_amount),
      contractualPct: num(row.contractual_percentage),
      unknown: num(row.unknown_amount),
      unknownPct: num(row.unknown_percentage),
    };

    if (label.toLowerCase() === 'total') {
      totals = mapped;
      return;
    }
    monthlyRows.push(mapped);
  });

  if (!totals && monthlyRows.length) {
    const sum = (key) => monthlyRows.reduce((acc, row) => acc + row[key], 0);
    const claimed = sum('claimed');
    const processed = sum('processed');
    const currentRejected = sum('currentRejected');
    const initialRejected = sum('initialRejected');
    const medical = sum('medical');
    const admin = sum('admin');
    const contractual = sum('contractual');
    const unknown = sum('unknown');
    totals = {
      month: 'Total',
      monthNum: null,
      claimed,
      paid: sum('paid'),
      processed,
      processedPct: claimed ? (processed / claimed) * 100 : 0,
      initialRejected,
      initialRejPct: claimed ? (initialRejected / claimed) * 100 : 0,
      currentRejected,
      currentRejPct: claimed ? (currentRejected / claimed) * 100 : 0,
      unprocessed: sum('unprocessed'),
      medical,
      medicalPct: currentRejected ? (medical / currentRejected) * 100 : 0,
      admin,
      adminPct: currentRejected ? (admin / currentRejected) * 100 : 0,
      contractual,
      contractualPct: currentRejected ? (contractual / currentRejected) * 100 : 0,
      unknown,
      unknownPct: currentRejected ? (unknown / currentRejected) * 100 : 0,
    };
  }

  return {
    monthlyRows,
    totals,
    meta: {
      year: raw.year,
      searchOn: raw.searchOn,
      officeIds: raw.officeIds,
      clinicianId: raw.clinician_id,
      clinicianName: raw.clinician_name,
    },
  };
}

/**
 * Map GET /api/dashboard/doctor-medical-denial-code-summary → denial rows.
 */
export function mapDoctorMedicalDenialSummary(raw) {
  if (!raw || typeof raw !== 'object') {
    return { rows: [], grandTotal: 0, meta: null };
  }

  const rows = (Array.isArray(raw.rows) ? raw.rows : []).map((row) => ({
    code: String(row?.denial_code ?? '').trim(),
    description: String(row?.denial_code_description ?? '').trim(),
    rejectedAmount: num(row?.rejected_amount),
  })).filter((row) => row.code);

  const grandTotal = raw.grand_total_rejected_amount != null
    ? num(raw.grand_total_rejected_amount)
    : rows.reduce((sum, row) => sum + row.rejectedAmount, 0);

  return {
    rows,
    grandTotal,
    meta: {
      year: raw.year,
      searchOn: raw.searchOn,
      officeIds: raw.officeIds,
      clinicianId: raw.clinician_id,
      category: raw.category,
    },
  };
}

/**
 * Map GET /api/dashboard/doctor-medical-cpt-denial-summary → CPT rows.
 * cpt_description may be omitted on some rows.
 */
export function mapDoctorMedicalCptDenialSummary(raw) {
  if (!raw || typeof raw !== 'object') {
    return { rows: [], grandTotal: 0, meta: null };
  }

  const rows = (Array.isArray(raw.rows) ? raw.rows : []).map((row) => ({
    code: String(row?.cpt_code ?? row?.cptCode ?? '').trim(),
    description: String(row?.cpt_description ?? row?.cptDescription ?? '').trim(),
    rejectedAmount: num(row?.rejected_amount ?? row?.rejectedAmount),
  })).filter((row) => row.code);

  const grandTotal = raw.grand_total_rejected_amount != null
    ? num(raw.grand_total_rejected_amount)
    : rows.reduce((sum, row) => sum + row.rejectedAmount, 0);

  return {
    rows,
    grandTotal,
    meta: {
      year: raw.year,
      searchOn: raw.searchOn,
      officeIds: raw.officeIds,
      clinicianId: raw.clinician_id,
      category: raw.category,
    },
  };
}

/**
 * Map GET /api/dashboard/doctor-medical-insurance-rejection-summary → insurance rows.
 * API uses ReceiverID / Receiver_Name / RejectedAmt.
 */
export function mapDoctorMedicalInsuranceRejectionSummary(raw) {
  if (!raw || typeof raw !== 'object') {
    return { rows: [], grandTotal: 0, meta: null };
  }

  const rows = (Array.isArray(raw.rows) ? raw.rows : []).map((row) => {
    const id = String(row?.ReceiverID ?? row?.receiver_id ?? row?.receiverId ?? '').trim();
    const name = String(row?.Receiver_Name ?? row?.receiver_name ?? row?.receiverName ?? '').trim();
    return {
      id,
      insurance: name || id || '—',
      rejectedAmount: num(row?.RejectedAmt ?? row?.rejected_amount ?? row?.rejectedAmount),
    };
  }).filter((row) => row.id || (row.insurance && row.insurance !== '—'));

  const grandTotal = raw.grand_total_rejected_amount != null
    ? num(raw.grand_total_rejected_amount)
    : rows.reduce((sum, row) => sum + row.rejectedAmount, 0);

  return {
    rows,
    grandTotal,
    meta: {
      year: raw.year,
      searchOn: raw.searchOn,
      officeIds: raw.officeIds,
      clinicianId: raw.clinician_id,
      category: raw.category,
    },
  };
}
