import {
  addReportInfoSheet,
  addStyledDataSheet,
  createDashboardWorkbook,
  downloadWorkbook,
} from './dashboardExcelUtils';

export async function exportDoctorToExcel({ filterMeta, kpis, topDoctors, specialtyRows, doctorRrRows }) {
  const wb = createDashboardWorkbook('Doctor Performance Report');

  addReportInfoSheet(wb, {
    title: 'Doctor Performance Report',
    filterMeta,
    kpiRows: kpis
      ? [
          ['Claimed Amount', kpis.totalClaimed, 'amount'],
          ['Medical Denials', kpis.totalMedicalDenials, 'amount'],
          ['Medical Denial %', kpis.medicalDenialPct, 'pct'],
          ['Top Risk Doctor', kpis.worstDoctorName ?? '—', 'text'],
          ['Top Risk Doctor %', kpis.worstDoctorPct, 'pct'],
        ]
      : [],
  });

  addStyledDataSheet(wb, 'Top Doctors', {
    columns: [
      { key: 'rank', label: '#', type: 'number', width: 6 },
      { key: 'doctor', label: 'Doctor', type: 'text', width: 24 },
      { key: 'speciality', label: 'Speciality', type: 'text', width: 20 },
      { key: 'claimed', label: 'Claimed', type: 'amount', width: 14 },
      { key: 'medicalDenials', label: 'Medical Denials', type: 'amount', width: 14 },
      { key: 'medicalDenialPct', label: 'Denial %', type: 'pct', isRejection: true, width: 10 },
    ],
    rows: (topDoctors ?? []).map((r, i) => ({ ...r, rank: i + 1 })),
  });

  addStyledDataSheet(wb, 'Specialty Summary', {
    columns: [
      { key: 'specialty', label: 'Specialty', type: 'text', width: 22 },
      { key: 'claimed_amount', label: 'Claimed', type: 'amount', width: 14 },
      { key: 'denial_amount', label: 'Denial', type: 'amount', width: 14 },
      { key: 'denial_percentage', label: 'Denial %', type: 'pct', isRejection: true, width: 10 },
      { key: 'technical_denial_amount', label: 'Technical', type: 'amount', width: 14 },
      { key: 'medical_denial_amount', label: 'Medical', type: 'amount', width: 14 },
      { key: 'administrative_and_other_denial_amount', label: 'Admin & Other', type: 'amount', width: 14 },
    ],
    rows: specialtyRows ?? [],
  });

  addStyledDataSheet(wb, 'Doctor RR Summary', {
    columns: [
      { key: 'doctor', label: 'Doctor', type: 'text', width: 24 },
      { key: 'netAmount', label: 'Net Amount', type: 'amount', width: 14 },
      { key: 'unprocessed', label: 'Unprocessed', type: 'amount', width: 14 },
      { key: 'initialRejected', label: 'Initial Rejected', type: 'amount', width: 14 },
      { key: 'currentRejected', label: 'Current Rejected', type: 'amount', width: 14 },
      { key: 'rrPct', label: 'RR %', type: 'pct', isRejection: true, width: 10 },
      { key: 'medicalDenials', label: 'Medical Denials', type: 'amount', width: 14 },
      { key: 'medicalRRPct', label: 'Medical RR %', type: 'pct', isRejection: true, width: 12 },
    ],
    rows: doctorRrRows ?? [],
  });

  await downloadWorkbook(wb, `Doctor_Performance_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
