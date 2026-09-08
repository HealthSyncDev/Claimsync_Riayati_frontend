import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { parseBulkExcelFile } from '../../utils/adminExcelBulk';
import './AdminBulkUpload.css';

const BULK_TOAST_DISMISS_MS = 5000;

/**
 * @typedef {{ display: string, key: string, aliases?: string[], required?: boolean }} BulkColumnDef
 *
 * @param {object} props
 * @param {BulkColumnDef[]} props.columnDefs
 * @param {Record<string, string>} props.exampleRow keyed by column `display` labels
 * @param {string} [props.helpFooter]
 * @param {string} [props.helpIntro] overrides default intro under the title
 * @param {string} [props.helpWarning] highlighted warning under the intro
 * @param {string} props.postUrl
 * @param {(row: Record<string, string>) => object | null | undefined} [props.buildPayload] required unless multipartImport
 * @param {() => Record<string, string>} props.getHeaders
 * @param {boolean} [props.multipartImport] POST whole file as multipart field `file` (no client row loop)
 * @param {string} [props.multipartFieldName] default `file`
 * @param {boolean} [props.showAliasesInHelp] show accepted header aliases under each column name
 * @param {boolean} [props.disabled]
 * @param {() => void | Promise<void>} [props.onComplete] refresh list
 * @param {string} [props.uploadLabel]
 * @param {string} [props.helpTitle]
 */
export default function AdminBulkUpload({
    columnDefs,
    exampleRow,
    helpFooter,
    helpIntro,
    helpWarning,
    postUrl,
    buildPayload,
    getHeaders,
    multipartImport = false,
    multipartFieldName = 'file',
    showAliasesInHelp = false,
    disabled = false,
    onComplete,
    uploadLabel = 'Bulk upload (Excel)',
    helpTitle = 'Excel format (first row = headings)'
}) {
    const inputRef = useRef(null);
    const dismissToastRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (!message) return undefined;
        if (dismissToastRef.current) {
            clearTimeout(dismissToastRef.current);
        }
        dismissToastRef.current = window.setTimeout(() => {
            dismissToastRef.current = null;
            setMessage(null);
        }, BULK_TOAST_DISMISS_MS);
        return () => {
            if (dismissToastRef.current) {
                clearTimeout(dismissToastRef.current);
                dismissToastRef.current = null;
            }
        };
    }, [message]);

    const defaultHelpIntro =
        'Use these exact column titles in row 1 (scroll sideways if needed):';

    const handleChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setMessage(null);
        setUploading(true);

        if (multipartImport) {
            try {
                const rawHeaders = getHeaders();
                const headers = { ...rawHeaders };
                delete headers['Content-Type'];
                delete headers['content-type'];
                const body = new FormData();
                body.append(multipartFieldName, file);
                const response = await fetch(postUrl, { method: 'POST', headers, body });
                const respData = await response.json().catch(() => ({}));
                if (!response.ok) {
                    setUploading(false);
                    setMessage({
                        type: 'error',
                        text: respData.message || respData.error || `Upload failed (${response.status})`
                    });
                    return;
                }
                const inserted = Number(respData.inserted) || 0;
                const updated = Number(respData.updated) || 0;
                const skipped = Number(respData.skipped) || 0;
                const errors = Array.isArray(respData.errors) ? respData.errors : [];
                const summary = [
                    inserted ? `${inserted} inserted` : null,
                    updated ? `${updated} updated` : null,
                    skipped ? `${skipped} skipped` : null
                ]
                    .filter(Boolean)
                    .join(', ');
                const errSlice = errors.slice(0, 8);
                const errMore =
                    errors.length > errSlice.length ? ` …+${errors.length - errSlice.length} more` : '';
                const errPart = errSlice.length ? ` ${errSlice.join(' ')}${errMore}` : '';
                setUploading(false);
                if (typeof onComplete === 'function') {
                    await onComplete();
                }
                setMessage({
                    type: errors.length > 0 ? 'error' : 'ok',
                    text: (summary || 'No rows processed') + (errPart || '')
                });
            } catch (err) {
                setUploading(false);
                setMessage({ type: 'error', text: err.message || 'Network error' });
            }
            return;
        }

        if (typeof buildPayload !== 'function') {
            setUploading(false);
            setMessage({ type: 'error', text: 'Bulk upload is not configured (missing buildPayload).' });
            return;
        }

        let rows;
        try {
            rows = await parseBulkExcelFile(file, columnDefs);
        } catch (err) {
            setUploading(false);
            setMessage({ type: 'error', text: err.message });
            return;
        }

        let ok = 0;
        const failures = [];
        for (let i = 0; i < rows.length; i++) {
            const excelRowNum = i + 2;
            const row = rows[i];
            let payload;
            try {
                payload = buildPayload(row);
            } catch (err) {
                failures.push(`Row ${excelRowNum}: ${err.message || 'Invalid row'}`);
                continue;
            }
            if (payload == null) {
                failures.push(`Row ${excelRowNum}: skipped (missing required values).`);
                continue;
            }
            try {
                const response = await fetch(postUrl, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                const respData = await response.json().catch(() => ({}));
                if (!response.ok) {
                    failures.push(
                        `Row ${excelRowNum}: ${respData.message || respData.error || `HTTP ${response.status}`}`
                    );
                    continue;
                }
                ok++;
            } catch (err) {
                failures.push(`Row ${excelRowNum}: ${err.message || 'Network error'}`);
            }
        }

        setUploading(false);
        if (typeof onComplete === 'function') {
            await onComplete();
        }

        if (failures.length) {
            const head = failures.slice(0, 5).join(' ');
            const more = failures.length > 5 ? ` …and ${failures.length - 5} more.` : '';
            setMessage({
                type: 'error',
                text: `Imported ${ok} of ${rows.length} rows. ${head}${more}`
            });
        } else {
            setMessage({ type: 'ok', text: `Successfully uploaded ${ok} row${ok === 1 ? '' : 's'}.` });
        }
    };

    const toast =
        message &&
        createPortal(
            <div
                className={`dr-bulk-toast ${message.type === 'ok' ? 'dr-bulk-toast--ok' : 'dr-bulk-toast--err'}`}
                role={message.type === 'ok' ? 'status' : 'alert'}
                aria-live="polite"
            >
                {message.text}
            </div>,
            document.body
        );

    return (
        <div className="dr-admin-bulk-stack">
            {toast}
            <div className="dr-bulk-upload-row">
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    style={{ display: 'none' }}
                    onChange={handleChange}
                />
                <button
                    type="button"
                    className="btn dr-btn-bulk"
                    disabled={disabled || uploading}
                    onClick={() => inputRef.current?.click()}
                >
                    {uploading ? 'Uploading…' : uploadLabel}
                </button>
                <span className="dr-help-wrap">
                    <button type="button" className="dr-help-trigger" tabIndex={0} aria-label="Excel format help">
                        ?
                    </button>
                    <div className="dr-help-popover" role="tooltip">
                        <strong>{helpTitle}</strong>
                        <p className="dr-help-intro">{helpIntro ?? defaultHelpIntro}</p>
                        {helpWarning ? (
                            <p className="dr-help-warning" role="note">
                                {helpWarning}
                            </p>
                        ) : null}
                        <div className="dr-help-table-scroll">
                            <table className="dr-help-table">
                                <thead>
                                    <tr>
                                        {columnDefs.map((c) => (
                                            <th key={c.key}>
                                                <span className="dr-help-th-title">{c.display}</span>
                                                {showAliasesInHelp && c.aliases?.length ? (
                                                    <span className="dr-help-th-aliases">
                                                        Also: {c.aliases.join(', ')}
                                                    </span>
                                                ) : null}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        {columnDefs.map((c) => (
                                            <td key={c.key}>{exampleRow[c.display] ?? '—'}</td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {helpFooter && <p className="dr-help-footer">{helpFooter}</p>}
                    </div>
                </span>
            </div>
        </div>
    );
}
