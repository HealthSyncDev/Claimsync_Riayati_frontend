import {
  COLORS,
  addReportInfoSheet,
  addStyledDataSheet,
  createDashboardWorkbook,
  downloadWorkbook,
  sanitizeSheetName,
} from './dashboardExcelUtils';

const applyBorder = (cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  };
};

const addMatrixSheet = (wb, data) => {
  const months = data?.months ?? [];
  const matrixRows = data?.matrix?.rows ?? [];
  if (!matrixRows.length || !months.length) return;

  const ws = wb.addWorksheet(sanitizeSheetName('Denial Matrix'), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headers = ['Metric', ...months, 'FY Total'];
  headers.forEach((label, c) => {
    const cell = ws.getCell(1, c + 1);
    cell.value = label;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorder(cell);
  });
  ws.getColumn(1).width = 28;
  months.forEach((_, i) => { ws.getColumn(i + 2).width = 12; });
  ws.getColumn(months.length + 2).width = 12;

  matrixRows.forEach((row, r) => {
    const rowNum = r + 2;
    const isPct = row.type === 'pct';
    const values = [...(row.values ?? []), row.fy];

    ws.getCell(rowNum, 1).value = row.label;
    ws.getCell(rowNum, 1).alignment = { horizontal: 'left' };
    applyBorder(ws.getCell(rowNum, 1));

    values.forEach((val, c) => {
      const cell = ws.getCell(rowNum, c + 2);
      if (val != null && val !== '') {
        const n = Number(val);
        if (isPct) {
          cell.value = n / 100;
          cell.numFmt = '0.0%';
        } else {
          cell.value = n;
          cell.numFmt = '#,##0';
        }
      }
      cell.alignment = { horizontal: 'right' };
      applyBorder(cell);
    });
  });
};

const addTrendSheet = (wb, trends) => {
  const months = trends?.overall?.months ?? [];
  if (!months.length) return;

  addStyledDataSheet(wb, 'Rejection Trend', {
    columns: [
      { key: 'month', label: 'Month', type: 'text', width: 12 },
      { key: 'initialPct', label: 'Initial %', type: 'pct', isRejection: true, width: 12 },
      { key: 'currentPct', label: 'Current %', type: 'pct', isRejection: true, width: 12 },
      { key: 'currentValue', label: 'Value (000)', type: 'number', width: 14 },
    ],
    rows: months.map((m, i) => ({
      month: m,
      initialPct: trends?.overall?.initialPct?.[i],
      currentPct: trends?.overall?.currentPct?.[i],
      currentValue: trends?.overall?.currentValue?.[i],
    })),
  });

  ['op', 'ip'].forEach((key) => {
    const t = trends?.[key];
    if (!t?.months?.length) return;
    addStyledDataSheet(wb, `${key.toUpperCase()} Trend`, {
      columns: [
        { key: 'month', label: 'Month', type: 'text', width: 12 },
        { key: 'initialPct', label: 'Initial %', type: 'pct', isRejection: true, width: 12 },
        { key: 'currentPct', label: 'Current %', type: 'pct', isRejection: true, width: 12 },
      ],
      rows: t.months.map((m, i) => ({
        month: m,
        initialPct: t.initialPct?.[i],
        currentPct: t.currentPct?.[i],
      })),
    });
  });
};

const addCategorySheet = (wb, cb) => {
  if (!cb?.months?.length) return;

  const rows = cb.months.map((m, i) => ({
    month: m,
    medical: cb.medicalRejected?.[i] ?? 0,
    technical: cb.technicalRejected?.[i] ?? 0,
    total: (cb.medicalRejected?.[i] ?? 0) + (cb.technicalRejected?.[i] ?? 0),
  }));

  rows.push({
    month: 'Grand Total',
    medical: cb.grandTotalMedical ?? 0,
    technical: cb.grandTotalTechnical ?? 0,
    total: (cb.grandTotalMedical ?? 0) + (cb.grandTotalTechnical ?? 0),
  });

  addStyledDataSheet(wb, 'Category Breakdown', {
    columns: [
      { key: 'month', label: 'Month', type: 'text', width: 12 },
      { key: 'medical', label: 'Medical', type: 'amount', width: 14 },
      { key: 'technical', label: 'Technical', type: 'amount', width: 14 },
      { key: 'total', label: 'Total', type: 'amount', width: 14 },
    ],
    rows,
    isTotalRow: (row) => row.month === 'Grand Total',
  });
};

export async function exportRejectionToExcel({ filterMeta, data, kpis }) {
  const wb = createDashboardWorkbook('Rejection Analytics Report');

  addReportInfoSheet(wb, {
    title: 'Rejection Analytics Report',
    filterMeta,
    kpiRows: kpis
      ? [
          ['FY Current Rejection %', kpis.fyPct, 'pct'],
          ['FY Rejected Value (000)', kpis.fyValue, 'number'],
          ['Worst Month', kpis.worstMonth, 'text'],
          ['Worst OP Month', kpis.worstOpMonth, 'text'],
          ['Worst IP Month', kpis.worstIpMonth, 'text'],
        ]
      : [],
  });

  if (data) {
    addMatrixSheet(wb, data);
    addTrendSheet(wb, data.trends);
    addCategorySheet(wb, data.categoryBreakdown);
  }

  await downloadWorkbook(wb, `Rejection_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
