import * as XLSX from 'xlsx';

/** Normalize Excel column heading for matching */
export function normExcelHeader(h) {
    return String(h ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

/**
 * @typedef {{ display: string, key: string, aliases?: string[], required?: boolean }} BulkColumnDef
 * @param {ArrayBuffer} arrayBuffer
 * @param {BulkColumnDef[]} columnDefs
 * @returns {{ rows: Record<string, string>[], error?: string }}
 */
export function parseExcelToRows(arrayBuffer, columnDefs) {
    try {
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return { rows: [], error: 'The workbook has no sheets.' };
        }
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
        if (!rawRows.length) {
            return { rows: [], error: 'The sheet is empty.' };
        }

        const headerCells = rawRows[0].map((cell) => normExcelHeader(cell));
        const indices = columnDefs.map((def) => {
            const aliases = new Set(
                [normExcelHeader(def.display), ...(def.aliases || []).map(normExcelHeader)].filter(Boolean)
            );
            return headerCells.findIndex((h) => aliases.has(h));
        });

        const missing = [];
        columnDefs.forEach((def, i) => {
            if (def.required && indices[i] < 0) {
                missing.push(def.display);
            }
        });
        if (missing.length) {
            return {
                rows: [],
                error: `Missing column(s): ${missing.join(', ')}. Row 1 must use the documented headings.`
            };
        }

        const rows = [];
        for (let r = 1; r < rawRows.length; r++) {
            const line = rawRows[r];
            const obj = {};
            let any = false;
            columnDefs.forEach((def, i) => {
                const j = indices[i];
                const val = j >= 0 ? String(line[j] ?? '').trim() : '';
                obj[def.key] = val;
                if (val) any = true;
            });
            if (!any) continue;
            rows.push(obj);
        }

        if (!rows.length) {
            return { rows: [], error: 'No data rows found below the header row.' };
        }
        return { rows };
    } catch (e) {
        return { rows: [], error: e instanceof Error ? e.message : 'Could not read the Excel file.' };
    }
}

/**
 * @param {File} file
 * @param {BulkColumnDef[]} columnDefs
 */
export function parseBulkExcelFile(file, columnDefs) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const buf = ev.target?.result;
            if (!buf || !(buf instanceof ArrayBuffer)) {
                reject(new Error('Could not read the file.'));
                return;
            }
            const { rows, error } = parseExcelToRows(buf, columnDefs);
            if (error) reject(new Error(error));
            else resolve(rows);
        };
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.readAsArrayBuffer(file);
    });
}
