import {
  getExecutiveSummaryData,
  getPaymentReportsData,
  getExecutiveMetricsData,
  getOverviewTotalRow,
  getMockIpOpTables,
  getRejectionAnalyticsData,
  getPayerPerformanceData,
  getDenialAnalysisData,
  getWriteOffAnalysis,
  getUnprocessedTrend,
  getDoctorPerformanceData,
} from '../components/analytics-dashboard/data/mockDashboardData';

export function getMockWriteOffCategory() {
  const categories = [
    { category: 'Medical', processed_amount: 5200000, paid_amount: 4380000, writeoff_amount: 220000 },
    { category: 'Technical', processed_amount: 4100000, paid_amount: 3520000, writeoff_amount: 180000 },
    { category: 'Admin', processed_amount: 2800000, paid_amount: 2487660, writeoff_amount: 112340 },
  ];
  const totals = categories.reduce(
    (acc, r) => ({
      processed_amount: acc.processed_amount + r.processed_amount,
      paid_amount: acc.paid_amount + r.paid_amount,
      writeoff_amount: acc.writeoff_amount + r.writeoff_amount,
    }),
    { processed_amount: 0, paid_amount: 0, writeoff_amount: 0 },
  );
  const rows = [...categories, { category: 'Total', ...totals }];
  return {
    rows,
    byCategory: categories.map((r) => ({
      name: r.category,
      value: r.writeoff_amount,
      processed_amount: r.processed_amount,
      paid_amount: r.paid_amount,
      writeoff_amount: r.writeoff_amount,
    })),
  };
}

export function getMockPayerPerformance() {
  const data = getPayerPerformanceData();
  return {
    ...data,
    payers: data.payers.map((p, i) => ({
      ...p,
      sender_id: `INS${String(i + 1).padStart(3, '0')}`,
    })),
  };
}

export function getMockSpecialtyDenialRows() {
  return [
    {
      specialty: 'General Practice',
      claimed_amount: 6588740,
      denial_amount: 724761,
      denial_percentage: 11,
      technical_denial_amount: 217428,
      technical_denial_percentage: 3.3,
      medical_denial_amount: 434857,
      medical_denial_percentage: 6.6,
      administrative_denial_amount: 48238,
      other_denial_amount: 24238,
    },
    {
      specialty: 'Urology',
      claimed_amount: 1484940,
      denial_amount: 222741,
      denial_percentage: 15,
      technical_denial_amount: 89096,
      technical_denial_percentage: 6,
      medical_denial_amount: 111371,
      medical_denial_percentage: 7.5,
      administrative_denial_amount: 14849,
      other_denial_amount: 7425,
    },
    {
      specialty: 'OB/GYN',
      claimed_amount: 1365910,
      denial_amount: 95614,
      denial_percentage: 7,
      technical_denial_amount: 27318,
      technical_denial_percentage: 2,
      medical_denial_amount: 54636,
      medical_denial_percentage: 4,
      administrative_denial_amount: 9561,
      other_denial_amount: 4099,
    },
    {
      specialty: 'Internal Medicine',
      claimed_amount: 1242160,
      denial_amount: 161481,
      denial_percentage: 13,
      technical_denial_amount: 62108,
      technical_denial_percentage: 5,
      medical_denial_amount: 86951,
      medical_denial_percentage: 7,
      administrative_denial_amount: 7453,
      other_denial_amount: 4969,
    },
    {
      specialty: 'Pediatric',
      claimed_amount: 930080,
      denial_amount: 83707,
      denial_percentage: 9,
      technical_denial_amount: 27902,
      technical_denial_percentage: 3,
      medical_denial_amount: 46504,
      medical_denial_percentage: 5,
      administrative_denial_amount: 5580,
      other_denial_amount: 3721,
    },
    {
      specialty: 'Cardiology',
      claimed_amount: 1120000,
      denial_amount: 134400,
      denial_percentage: 12,
      technical_denial_amount: 44800,
      technical_denial_percentage: 4,
      medical_denial_amount: 67200,
      medical_denial_percentage: 6,
      administrative_denial_amount: 13440,
      other_denial_amount: 8960,
    },
  ];
}

export function getMockClinicianSummaryRows() {
  return getDoctorPerformanceData().doctors.map((d, i) => ({
    clinician_id: String(i + 1),
    doctor_name_as_per_heartbeat: d.doctor,
    department_name: d.speciality,
    claimed_amount: d.claimed,
    denial_amount: d.medicalDenials,
    denial_percentage: d.medicalDenialPct,
  }));
}

export function getMockClinicianDenialRrRows() {
  return getDoctorPerformanceData().doctors.map((d, i) => ({
    clinician_id: String(i + 1),
    clinician_name: d.doctor,
    net_amount: d.netAmount ?? d.claimed,
    unprocessed_amount: d.unprocessed,
    initial_rejected: d.initialRejected,
    current_rejected: d.currentRejected,
    rr_percentage: d.rrPct,
    medical_denials: d.medicalDenials,
    medical_rr_percentage: d.medicalRRPct,
  }));
}

export {
  getExecutiveSummaryData,
  getPaymentReportsData,
  getExecutiveMetricsData,
  getOverviewTotalRow,
  getMockIpOpTables,
  getRejectionAnalyticsData,
  getDenialAnalysisData,
  getWriteOffAnalysis,
  getUnprocessedTrend,
};
