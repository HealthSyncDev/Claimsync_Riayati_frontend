import ExcelJS from 'exceljs';

export const COLORS = {
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

export const sanitizeSheetName = (name) =>
  String(name).replace(/[:\\/?*[\]]/g, '').slice(0, 31);

export const getRejectionFill = (pct) => {
  if (pct == null || pct === '' || Number.isNaN(pct)) return null;
  const n = Number(pct);
  if (n <= 5) return COLORS.heatGreen;
  if (n <= 15) return COLORS.heatYellow;
  if (n <= 25) return COLORS.heatOrange;
  return COLORS.heatRed;
};

const applyBorder = (cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  };
};

const getTypedValue = (type, val) => {
  if (type === 'amount') {
    const n = val != null && val !== '' ? Number(val) : null;
    return { value: Number.isNaN(n) ? null : n, numFmt: n != null ? '#,##0.00' : undefined };
  }
  if (type === 'pct') {
    const n = val != null && val !== '' ? Number(val) : null;
    return { value: Number.isNaN(n) ? null : n / 100, numFmt: n != null ? '0.0%' : undefined };
  }
  if (type === 'number') {
    const n = val != null && val !== '' ? Number(val) : null;
    return { value: Number.isNaN(n) ? null : n, numFmt: n != null ? '#,##0' : undefined };
  }
  return { value: val ?? '—' };
};

/**
 * @param {ExcelJS.Workbook} wb
 * @param {{ title: string, filterMeta?: Record<string, string>, kpiRows?: Array<[string, unknown]> }} opts
 */
export function addReportInfoSheet(wb, { title, filterMeta, kpiRows = [] }) {
  const ws = wb.addWorksheet(sanitizeSheetName('Report Info'));
  let row = 1;

  ws.getCell(row, 1).value = title;
  ws.getCell(row, 1).font = { bold: true, size: 14, color: { argb: COLORS.totalRowText } };
  row += 2;

  if (filterMeta && Object.keys(filterMeta).length) {
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

  if (kpiRows.length) {
    ws.getCell(row, 1).value = 'KPI summary';
    ws.getCell(row, 1).font = { bold: true };
    row += 1;
    kpiRows.forEach(([label, value, type]) => {
      ws.getCell(row, 1).value = label;
      const cell = ws.getCell(row, 2);
      const typed = getTypedValue(type ?? (String(label).includes('%') ? 'pct' : 'amount'), value);
      cell.value = typed.value;
      if (typed.numFmt) cell.numFmt = typed.numFmt;
      row += 1;
    });
  }

  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 30;
}

/**
 * @param {ExcelJS.Workbook} wb
 * @param {string} sheetName
 * @param {{ columns: Array<{key?: string, label: string, type?: string, width?: number, isRejection?: boolean}>, rows: Array<Record<string, unknown>|unknown[]>, hasHeatMap?: boolean, isTotalRow?: (row: unknown) => boolean }} opts
 */
export function addStyledDataSheet(wb, sheetName, { columns, rows, hasHeatMap = true, isTotalRow }) {
  if (!rows?.length) return null;

  const ws = wb.addWorksheet(sanitizeSheetName(sheetName), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  columns.forEach((col, c) => {
    const cell = ws.getCell(1, c + 1);
    cell.value = col.label;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorder(cell);
  });
  ws.getRow(1).height = 24;

  rows.forEach((row, r) => {
    const rowNum = r + 2;
    const isTotal = isTotalRow ? isTotalRow(row) : false;

    columns.forEach((col, c) => {
      const cell = ws.getCell(rowNum, c + 1);
      const raw = Array.isArray(row) ? row[c] : row[col.key];
      const { value, numFmt } = getTypedValue(col.type ?? 'text', raw);
      cell.value = value;
      if (numFmt) cell.numFmt = numFmt;
      cell.alignment = {
        horizontal: col.type === 'text' || !col.type ? 'left' : 'right',
        vertical: 'middle',
      };
      applyBorder(cell);

      if (isTotal) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalRowBg } };
        cell.font = { bold: true, color: { argb: COLORS.totalRowText } };
      } else if (hasHeatMap && col.isRejection && raw != null) {
        const fill = getRejectionFill(raw);
        if (fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
          if (Number(raw) > 15) cell.font = { color: { argb: 'FFB91C1C' } };
        }
      }
    });
  });

  columns.forEach((col, c) => {
    ws.getColumn(c + 1).width = col.width ?? (col.type === 'text' ? 18 : 14);
  });

  return ws;
}

export async function downloadWorkbook(wb, filename) {
  if (!wb.worksheets.length) return;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function createDashboardWorkbook(title) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ClaimSync';
  wb.created = new Date();
  wb.title = title;
  return wb;
}
