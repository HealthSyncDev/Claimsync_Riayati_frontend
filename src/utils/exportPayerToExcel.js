import {
  addReportInfoSheet,
  addStyledDataSheet,
  createDashboardWorkbook,
  downloadWorkbook,
} from './dashboardExcelUtils';

export async function exportPayerToExcel({ filterMeta, kpis, payers, totals }) {
  const wb = createDashboardWorkbook('Payer Performance Report');

  addReportInfoSheet(wb, {
    title: 'Payer Performance Report',
    filterMeta,
    kpiRows: kpis
      ? [
          ['Total Claimed', kpis.claimed, 'amount'],
          ['Total Processed', kpis.processed, 'amount'],
          ['Current Rejection %', kpis.currentRejPct, 'pct'],
        ]
      : [],
  });

  const rows = [...(payers ?? [])];
  if (totals) {
    rows.push({
      insurance: 'Total',
      claimed: totals.claimed,
      processed: totals.processed,
      unprocessed: totals.unprocessed,
      initialRejected: totals.initialRejected,
      initialRejPct: totals.initialRejPct,
      currentRejected: totals.currentRejected,
      currentRejPct: totals.currentRejPct,
      businessContributionPct: totals.businessContributionPct,
    });
  }

  addStyledDataSheet(wb, 'Insurance Summary', {
    columns: [
      { key: 'insurance', label: 'Insurance Company', type: 'text', width: 28 },
      { key: 'claimed', label: 'Claimed Amount', type: 'amount', width: 16 },
      { key: 'processed', label: 'Processed Amount', type: 'amount', width: 16 },
      { key: 'unprocessed', label: 'Unprocessed', type: 'amount', width: 14 },
      { key: 'initialRejected', label: 'Initial Rejected', type: 'amount', width: 14 },
      { key: 'initialRejPct', label: 'Initial Rej %', type: 'pct', isRejection: true, width: 12 },
      { key: 'currentRejected', label: 'Current Rejected', type: 'amount', width: 14 },
      { key: 'currentRejPct', label: 'Current Rej %', type: 'pct', isRejection: true, width: 12 },
      { key: 'businessContributionPct', label: 'Business Contribution %', type: 'pct', width: 14 },
    ],
    rows,
    isTotalRow: (row) => row.insurance === 'Total',
  });

  await downloadWorkbook(wb, `Payer_Performance_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
