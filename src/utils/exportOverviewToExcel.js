import ExcelJS from 'exceljs';
import { downloadWorkbook } from './dashboardExcelUtils';

const COLORS = {
  headerBg: 'FF0f172a',
  headerText: 'FFFFFFFF',
  totalRowBg: 'FFF1F5F9',
  totalRowText: 'FF1E293B',
  border: 'FFE2E8F0',
  heatGreen: 'FFD1FAE5',
  heatYellow: 'FFFEF3C7',
  heatOrange: 'FFFED7AA',
  heatRed: 'FFFEE2E2',
};

const getRejectionFill = (pct) => {
  if (pct == null || pct === '' || Number.isNaN(pct)) return null;
  const n = Number(pct);
  if (n <= 5) return COLORS.heatGreen;
  if (n <= 15) return COLORS.heatYellow;
  if (n <= 25) return COLORS.heatOrange;
  return COLORS.heatRed;
};

const yearMonthToMonthName = (v, monthNames) => {
  if (v == null || v === '') return '—';
  if (typeof v !== 'string') return String(v);
  if (v === 'Total' || v === 'IP' || v === 'OP') return v;
  const m = v.match(/^\d{4}-(\d{2})$/);
  if (m) {
    const idx = parseInt(m[1], 10) - 1;
    return monthNames[idx] ?? v;
  }
  return v;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FINANCIAL_COLUMNS = [
  { key: 'yearMonth', label: 'Months', type: 'text' },
  { key: 'claimedAmount', label: 'Claimed Amount', type: 'amount' },
  { key: 'paidAmount', label: 'Paid Amount', type: 'amount' },
  { key: 'processedAmount', label: 'Processed Amount', type: 'amount' },
  { key: 'processedAmountPercentage', label: 'Processed %', type: 'pct' },
  { key: 'initialRejectedAmount', label: 'Initial Rejected', type: 'amount' },
  { key: 'initialRejectedPercentage', label: 'Initial Rej %', type: 'pct', isRejection: true },
  { key: 'currentRejectedAmount', label: 'Current Rejected', type: 'amount' },
  { key: 'currentRejectedPercentage', label: 'Curr. Rej %', type: 'pct', isRejection: true },
  { key: 'unprocessedAmount', label: 'Unprocessed', type: 'amount' },
];

/** Returns { value, numFmt } — numbers as numbers, text as text */
const getCellValue = (col, row, monthNames) => {
  const val = row[col.key];
  if (col.key === 'yearMonth') return { value: yearMonthToMonthName(val, monthNames) ?? '—' };
  if (col.type === 'amount') {
    const n = val != null && val !== '' ? Number(val) : null;
    return { value: Number.isNaN(n) ? null : n, numFmt: n != null ? '#,##0.00' : undefined };
  }
  if (col.type === 'pct') {
    const n = val != null && val !== '' ? Number(val) : null;
    // Excel % format: store as decimal (0.085 = 8.5%)
    return { value: Number.isNaN(n) ? null : n / 100, numFmt: n != null ? '0.0%' : undefined };
  }
  return { value: val ?? '—' };
};

const sanitizeSheetName = (name) =>
  String(name).replace(/[:\\/?*[\]]/g, '').slice(0, 31);

/** Add styled table to worksheet */
function addStyledTable(ws, rows, columns, { hasHeatMap = true } = {}) {
  const monthNames = MONTH_NAMES;

  // Header row
  columns.forEach((col, c) => {
    const cell = ws.getCell(1, c + 1);
    cell.value = col.label;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.border } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      bottom: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    };
  });
  ws.getRow(1).height = 24;

  // Data rows — store numbers as numbers with numFmt for display
  rows.forEach((row, r) => {
    const rowNum = r + 2;
    const isTotal = row.isTotal === true;
    columns.forEach((col, c) => {
      const cell = ws.getCell(rowNum, c + 1);
      const { value, numFmt } = getCellValue(col, row, monthNames);
      cell.value = value;
      if (numFmt) cell.numFmt = numFmt;
      cell.alignment = {
        horizontal: col.key === 'yearMonth' ? 'left' : 'right',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };

      if (isTotal) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalRowBg } };
        cell.font = { bold: true, color: { argb: COLORS.totalRowText } };
      } else if (hasHeatMap && col.isRejection) {
        const pct = row[col.key];
        const fill = getRejectionFill(pct);
        if (fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
          const n = Number(pct);
          if (n > 15) cell.font = { color: { argb: 'FFB91C1C' } };
        }
      }
    });
  });

  // Column widths (months narrow, amounts wider)
  const widthMap = {
    yearMonth: 10,
    claimedAmount: 16,
    processedAmount: 16,
    paidAmount: 16,
    initialRejectedAmount: 14,
    initialRejectedPercentage: 12,
    currentRejectedAmount: 14,
    currentRejectedPercentage: 12,
    unprocessedAmount: 14,
    processedAmountPercentage: 12,
    contribution: 12,
    currentMedicalRejectedAmount: 14,
    medicalRejectedPercentage: 12,
    currentTechnicalRejectedAmount: 14,
    technicalRejectedPercentage: 12,
    medicalDenialsRR: 12,
    technicalDenialRR: 12,
  };
  columns.forEach((col, c) => {
    ws.getColumn(c + 1).width = widthMap[col.key] ?? 14;
  });
}

/** Add report metadata + KPI summary sheet */
function addReportInfoSheet(wb, { filterMeta, kpiSummary } = {}) {
  const ws = wb.addWorksheet(sanitizeSheetName('Report Info'));
  let row = 1;

  ws.getCell(row, 1).value = 'Overview Report';
  ws.getCell(row, 1).font = { bold: true, size: 14 };
  row += 2;

  if (filterMeta) {
    ws.getCell(row, 1).value = 'Applied filters';
    ws.getCell(row, 1).font = { bold: true };
    row += 1;
    Object.entries(filterMeta).forEach(([key, value]) => {
      ws.getCell(row, 1).value = key;
      ws.getCell(row, 2).value = value ?? '—';
      row += 1;
    });
    row += 1;
  }

  if (kpiSummary) {
    ws.getCell(row, 1).value = 'KPI summary';
    ws.getCell(row, 1).font = { bold: true };
    row += 1;
    const kpiRows = [
      ['Claimed Amount', kpiSummary.claimedAmount],
      ['Paid Amount', kpiSummary.paidAmount],
      ['Current Rejected', kpiSummary.currentRejectedAmount],
      ['Curr. Rej %', kpiSummary.currentRejectedPercentage != null ? kpiSummary.currentRejectedPercentage / 100 : null],
      ['Unprocessed', kpiSummary.unprocessedAmount],
    ];
    kpiRows.forEach(([label, value]) => {
      ws.getCell(row, 1).value = label;
      const cell = ws.getCell(row, 2);
      if (label.includes('%')) {
        cell.value = value;
        if (value != null) cell.numFmt = '0.0%';
      } else {
        cell.value = value;
        if (value != null) cell.numFmt = '#,##0.00';
      }
      row += 1;
    });
  }

  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 28;
}

const addInsuranceRejectionSheet = (wb, title, data, columns = FINANCIAL_COLUMNS) => {
  if (!data?.monthlyRows?.length && !data?.claimTypeRows?.length) return;
  const allRows = [
    ...(data.monthlyRows ?? []),
    ...(data.claimTypeRows ?? []),
  ];
  const ws = wb.addWorksheet(sanitizeSheetName(title), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  addStyledTable(ws, allRows, columns, { hasHeatMap: true });
};

const addIpOpSheet = (wb, title, table) => {
  if (!table?.monthlyRows?.length) return;
  const ws = wb.addWorksheet(sanitizeSheetName(title), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  addStyledTable(ws, table.monthlyRows, FINANCIAL_COLUMNS, { hasHeatMap: true });
};

const addMonthlyTrendSheet = (wb, monthlyTrend) => {
  if (!monthlyTrend?.months?.length) return;
  const ws = wb.addWorksheet(sanitizeSheetName('Monthly Trend'));
  const headers = ['Month', 'Claimed', 'Paid', 'Current Rejected', 'Medical', 'Technical'];
  headers.forEach((h, i) => { ws.getCell(1, i + 1).value = h; });
  monthlyTrend.months.forEach((m, i) => {
    ws.getCell(i + 2, 1).value = m;
    ws.getCell(i + 2, 2).value = monthlyTrend.revenue?.[i] ?? null;
    ws.getCell(i + 2, 3).value = monthlyTrend.paid?.[i] ?? null;
    ws.getCell(i + 2, 4).value = monthlyTrend.currRejected?.[i] ?? null;
    ws.getCell(i + 2, 5).value = monthlyTrend.medical?.[i] ?? null;
    ws.getCell(i + 2, 6).value = monthlyTrend.technical?.[i] ?? null;
  });
  [2, 3, 4, 5, 6].forEach((c) => { ws.getColumn(c).numFmt = '#,##0.00'; });
};

const addOpVsIpSheet = (wb, opVsIp) => {
  if (!opVsIp) return;
  const ws = wb.addWorksheet(sanitizeSheetName('OP vs IP'));
  ws.getCell(1, 1).value = 'Type';
  ws.getCell(1, 2).value = 'Claimed';
  ws.getCell(1, 3).value = 'Rejection %';
  const rows = [
    ['OP', opVsIp?.op?.claimedAmount ?? 0, (opVsIp?.op?.currRejPct ?? opVsIp?.op?.currentRejectedPercentage ?? 0) / 100],
    ['IP', opVsIp?.ip?.claimedAmount ?? 0, (opVsIp?.ip?.currRejPct ?? opVsIp?.ip?.currentRejectedPercentage ?? 0) / 100],
  ];
  rows.forEach((row, i) => {
    ws.getCell(i + 2, 1).value = row[0];
    ws.getCell(i + 2, 2).value = row[1];
    ws.getCell(i + 2, 3).value = row[2];
  });
  ws.getColumn(2).numFmt = '#,##0.00';
  ws.getColumn(3).numFmt = '0.0%';
};

/** Export full overview page to Excel: KPIs, rejection tables, IP/OP breakdowns, trend data. */
export async function exportOverviewToExcel({
  filterMeta,
  kpiSummary,
  serviceMonthData,
  paymentMonthData,
  ipOpService,
  ipOpPayment,
  monthlyTrend,
  opVsIp,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ClaimSync';
  wb.created = new Date();
  wb.title = 'Overview Report';

  addReportInfoSheet(wb, { filterMeta, kpiSummary });

  addIpOpSheet(wb, 'IP Inpatient', ipOpService?.ipTable);
  addIpOpSheet(wb, 'OP Outpatient', ipOpService?.opTable);

  addInsuranceRejectionSheet(wb, 'Insurance Rejection Data', serviceMonthData);

  addMonthlyTrendSheet(wb, monthlyTrend);
  addOpVsIpSheet(wb, opVsIp);

  if (wb.worksheets.length === 0) return;

  await downloadWorkbook(wb, `Overview_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
