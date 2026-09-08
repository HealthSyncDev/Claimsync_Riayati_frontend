import {
  addReportInfoSheet,
  addStyledDataSheet,
  createDashboardWorkbook,
  downloadWorkbook,
} from './dashboardExcelUtils';

export async function exportFinancialToExcel({
  filterMeta,
  writeOffMonth,
  writeOffCategory,
  unprocessed,
  settlement,
  insights = [],
}) {
  const wb = createDashboardWorkbook('Financial Risk Report');
  const categoryRows = writeOffCategory?.rows ?? [];
  const totalRow = categoryRows.find((r) => (r.category ?? '').toLowerCase() === 'total');

  addReportInfoSheet(wb, {
    title: 'Financial Risk Report',
    filterMeta,
    kpiRows: [
      ['Total Write-Off', totalRow?.writeoff_amount, 'amount'],
      ['Total Processed', totalRow?.processed_amount, 'amount'],
      ['Total Paid', totalRow?.paid_amount, 'amount'],
      ['Latest Unprocessed', unprocessed?.[unprocessed.length - 1]?.amount, 'amount'],
    ],
  });

  if (insights.length) {
    const ws = wb.addWorksheet('Insights');
    ws.getCell(1, 1).value = 'Key insights';
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    insights.forEach((text, i) => {
      ws.getCell(i + 3, 1).value = `• ${text}`;
    });
    ws.getColumn(1).width = 80;
  }

  addStyledDataSheet(wb, 'Write-Off by Month', {
    columns: [
      { key: 'month', label: 'Month', type: 'text', width: 12 },
      { key: 'amount', label: 'Write-Off Amount', type: 'amount', width: 18 },
    ],
    rows: writeOffMonth?.byMonth ?? [],
    hasHeatMap: false,
  });

  addStyledDataSheet(wb, 'Write-Off by Category', {
    columns: [
      { key: 'category', label: 'Category', type: 'text', width: 22 },
      { key: 'processed_amount', label: 'Processed', type: 'amount', width: 16 },
      { key: 'paid_amount', label: 'Paid', type: 'amount', width: 16 },
      { key: 'writeoff_amount', label: 'Write-Off', type: 'amount', width: 16 },
    ],
    rows: categoryRows,
    hasHeatMap: false,
    isTotalRow: (row) => (row.category ?? '').toLowerCase() === 'total',
  });

  addStyledDataSheet(wb, 'Unprocessed Trend', {
    columns: [
      { key: 'month', label: 'Month', type: 'text', width: 12 },
      { key: 'amount', label: 'Unprocessed Amount', type: 'amount', width: 18 },
    ],
    rows: unprocessed ?? [],
    hasHeatMap: false,
  });

  addStyledDataSheet(wb, 'Settlement Tracking', {
    columns: [
      { key: 'month', label: 'Month', type: 'text', width: 12 },
      { key: 'settled', label: 'Settled', type: 'amount', width: 16 },
      { key: 'pending', label: 'Pending', type: 'amount', width: 16 },
    ],
    rows: settlement ?? [],
    hasHeatMap: false,
  });

  await downloadWorkbook(wb, `Financial_Risk_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
