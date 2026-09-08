import {
  addReportInfoSheet,
  addStyledDataSheet,
  createDashboardWorkbook,
  downloadWorkbook,
} from './dashboardExcelUtils';

export async function exportDenialToExcel({ filterMeta, kpis, currentRejected }) {
  const wb = createDashboardWorkbook('Denial Analysis Report');

  addReportInfoSheet(wb, {
    title: 'Denial Analysis Report',
    filterMeta,
    kpiRows: kpis
      ? [
          ['Total Rejected', kpis.grandTotal, 'amount'],
          ['Top Reason', kpis.topReason, 'text'],
          ['Top Reason %', kpis.topReasonPct, 'pct'],
          ['Top 3 Share', kpis.top3Pct, 'pct'],
          ['Reason Count', kpis.reasonCount, 'number'],
          ['Avg per Reason', kpis.avgPerReason, 'amount'],
        ]
      : [],
  });

  const reasons = currentRejected?.topReasons ?? [];

  if (reasons.length) {
    addStyledDataSheet(wb, 'Denial Reasons', {
      columns: [
        { key: 'reason', label: 'Denial Reason', type: 'text', width: 40 },
        { key: 'denialCategory', label: 'Denial Category', type: 'text', width: 16 },
        { key: 'category', label: 'Category', type: 'text', width: 14 },
        { key: 'amount', label: 'Amount', type: 'amount', width: 16 },
        { key: 'pct', label: '% of Total', type: 'pct', width: 12 },
      ],
      rows: reasons,
      hasHeatMap: false,
    });
  }

  await downloadWorkbook(wb, `Denial_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
