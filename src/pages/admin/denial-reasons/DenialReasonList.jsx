import React, { useState, useEffect } from 'react';
import Button from '../../../components/common/Button';
import AdminBulkUpload from '../../../components/admin/AdminBulkUpload';
import { toast } from '../../../utils/confirm';
import './DenialReasonList.css';

const DENIAL_BULK_COLUMNS = [
    {
        display: 'denial_code',
        key: 'denial_code',
        aliases: ['Denial Code', 'code', 'denialcode'],
        required: true
    },
    {
        display: 'denial_reasons',
        key: 'denial_reasons',
        aliases: ['Denial Reason', 'Denial Reasons', 'denial_reason', 'reason', 'reason_text', 'description'],
        required: true
    }
];

const DENIAL_BULK_EXAMPLE = {
    denial_code: 'MNEC004',
    denial_reasons: 'Service not covered'
};

/** GET/PUT single resource: {baseURL}/api/denial-reasons/:id */
const DENIAL_REASONS_API = '/api/denial-reasons';
const DENIAL_REASONS_IMPORT_API = `${DENIAL_REASONS_API}/import`;
const denialReasonByIdUrl = (id) => `${DENIAL_REASONS_API}/${encodeURIComponent(String(id))}`;

const DenialReasonList = () => {
    const [reasons, setReasons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /** id is only used for PUT URL — never shown in the form */
    const [formData, setFormData] = useState({
        id: '',
        denial_code: '',
        denial_reason: ''
    });

    const getToken = () => localStorage.getItem('token');
    const headers = () => ({
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const normalizeReason = (item) => {
        const codeId =
            item.denial_code_id ?? item.denialCodeId ?? item.denial_code?.id ?? item.denial_code_id_fk ?? '';
        const rawCode =
            (typeof item.denial_code === 'string' ? item.denial_code.trim() : '') ||
            (typeof item.denialCode === 'string' ? item.denialCode.trim() : '') ||
            (item.denial_code?.denial_code ??
                item.denial_code?.denialCode ??
                item.denial_code_string ??
                item.code ??
                '');
        const resourceId =
            item.id ??
            item.denial_reason_id ??
            item.denialReasonId ??
            (typeof item.denial_reason === 'object' && item.denial_reason !== null
                ? item.denial_reason.id ?? item.denial_reason.denial_reason_id
                : undefined);
        const reasonText =
            typeof item.denial_reasons === 'string'
                ? item.denial_reasons
                : typeof item.denial_reason === 'string'
                  ? item.denial_reason
                  : typeof item.denialReason === 'string'
                    ? item.denialReason
                    : item.reason ?? item.reason_text ?? item.description ?? '';
        return {
            id: resourceId,
            denial_code: rawCode,
            denial_code_display: rawCode || (codeId ? `#${codeId}` : ''),
            denial_reason: reasonText
        };
    };

    const fetchAllReasons = async () => {
        const response = await fetch(DENIAL_REASONS_API, { headers: headers() });
        const textData = await response.text();
        let data;
        try {
            data = JSON.parse(textData);
        } catch (e) {
            throw new Error('API connection failed: received non-JSON response.');
        }
        if (!response.ok) {
            throw new Error(data.message || data.error || `Server error: ${response.status}`);
        }
        const rawList = Array.isArray(data) ? data : data?.data ?? data?.reasons ?? [];
        return rawList.map((row) => normalizeReason(row));
    };

    const loadPage = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const list = await fetchAllReasons();
            setReasons(list);
        } catch (err) {
            console.error('Load denial reasons page:', err);
            setError(err.message);
            setReasons([]);
        } finally {
            setIsLoading(false);
        }
    };

    const silentRefresh = async () => {
        try {
            const list = await fetchAllReasons();
            setReasons(list);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadPage();
    }, []);

    const fetchReasonById = async (id) => {
        try {
            const response = await fetch(denialReasonByIdUrl(id), { headers: headers() });
            if (!response.ok) return null;
            const body = await response.json();
            const entity = body?.data ?? body;
            return normalizeReason(entity);
        } catch (e) {
            return null;
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleAddClick = () => {
        setIsEdit(false);
        setFormData({ id: '', denial_code: '', denial_reason: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = async (item) => {
        setIsEdit(true);
        const normalized = normalizeReason(item);
        const fresh = await fetchReasonById(normalized.id);
        const data = fresh || normalized;
        setFormData({
            id: data.id,
            denial_code: data.denial_code || data.denial_code_display || '',
            denial_reason: data.denial_reason || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const codeStr = formData.denial_code.trim();
            const reasonText = formData.denial_reason.trim();
            if (isEdit) {
                if (!reasonText) {
                    toast.error('Denial reason text is required.');
                    setIsSubmitting(false);
                    return;
                }
            } else if (!codeStr || !reasonText) {
                toast.error('Denial code and reason text are required.');
                setIsSubmitting(false);
                return;
            }
            const payload = { denial_code: codeStr, denial_reasons: reasonText };
            if (isEdit && (formData.id === '' || formData.id == null)) {
                toast.error('Missing record id; refresh the list and try again.');
                setIsSubmitting(false);
                return;
            }
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? denialReasonByIdUrl(formData.id) : DENIAL_REASONS_API;
            const response = await fetch(url, {
                method,
                headers: headers(),
                body: JSON.stringify(payload)
            });
            const respData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(respData.message || respData.error || 'Operation failed');
            }
            await silentRefresh();
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-col gap-md">
            <div className="flex justify-between items-center flex-wrap gap-sm">
                <p className="text-muted" style={{ maxWidth: '42rem', margin: 0 }}>
                    Enter a denial code and the explanation your team should use for that code.
                </p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={() => loadPage()}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <AdminBulkUpload
                        columnDefs={DENIAL_BULK_COLUMNS}
                        exampleRow={DENIAL_BULK_EXAMPLE}
                        helpIntro="Sheet1 col A / B: denial_code, denial_reasons. Header row is optional (auto-skipped when present). One reason per row."
                        helpFooter="Use .xlsx or .xls (CSV import is currently broken on the backend). Multipart field file → /api/denial-reasons/import. Duplicate denial_code rows upsert."
                        postUrl={DENIAL_REASONS_IMPORT_API}
                        getHeaders={headers}
                        multipartImport
                        showAliasesInHelp
                        disabled={isLoading}
                        onComplete={silentRefresh}
                    />
                    <Button className="dr-btn-add" onClick={handleAddClick}>
                        Add Denial Reason
                    </Button>
                </div>
            </div>

            {error && (
                <div
                    style={{
                        padding: '16px',
                        backgroundColor: 'var(--status-error-bg)',
                        color: 'var(--status-error)',
                        borderRadius: 'var(--radius-md)'
                    }}
                >
                    {error}
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="w-full" style={{ textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead
                        style={{
                            backgroundColor: 'var(--bg-hover)',
                            borderBottom: '1px solid var(--border-color)'
                        }}
                    >
                        <tr>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                S.No
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                Denial Code
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                Denial Reason
                            </th>
                            <th
                                className="text-sm font-medium text-muted"
                                style={{ padding: '16px 24px', textAlign: 'right' }}
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan="4"
                                    style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}
                                >
                                    Loading denial reasons...
                                </td>
                            </tr>
                        ) : reasons.length > 0 ? (
                            reasons.map((item, index) => (
                                <tr key={item.id ?? index} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                                    <td style={{ padding: '16px 24px' }} className="text-muted">
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span
                                            style={{
                                                background: 'var(--status-info-bg)',
                                                color: 'var(--primary-color)',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            {item.denial_code_display || '—'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{item.denial_reason}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            className="text-primary text-sm font-medium"
                                            onClick={() => handleEditClick(item)}
                                        >
                                            Edit reason
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan="4"
                                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                                >
                                    {!error && 'No denial reasons found. Add one to get started.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div
                    className="dr-modal-overlay"
                    role="presentation"
                    onClick={(e) => e.target === e.currentTarget && !isSubmitting && setIsModalOpen(false)}
                >
                    <div
                        className="dr-modal-panel card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="dr-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="dr-modal-header">
                            <div>
                                <h3 id="dr-modal-title" className="dr-modal-title">
                                    {isEdit ? 'Edit denial reason' : 'Add denial reason'}
                                </h3>
                                <p className="dr-modal-subtitle">
                                    {isEdit
                                        ? 'Only the reason text can be changed; the denial code is fixed.'
                                        : 'Enter a denial code and the reason text your team should see.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="dr-modal-close"
                                onClick={() => !isSubmitting && setIsModalOpen(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="dr-modal-body">
                            <div className="dr-form-stack">
                                <div className="dr-field">
                                    {isEdit ? (
                                        <>
                                            <span className="dr-field-label">Denial code</span>
                                            <div className="dr-code-readonly" id="dr-denial-code-display">
                                                {formData.denial_code || '—'}
                                            </div>
                                            <p className="dr-field-hint">This code cannot be changed.</p>
                                        </>
                                    ) : (
                                        <>
                                            <label htmlFor="dr-denial-code">
                                                Denial code<span className="dr-required">*</span>
                                            </label>
                                            <input
                                                id="dr-denial-code"
                                                type="text"
                                                name="denial_code"
                                                value={formData.denial_code}
                                                onChange={handleInputChange}
                                                placeholder="e.g. DC021, CO-50"
                                                autoComplete="off"
                                                required
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="dr-field">
                                    <label htmlFor="dr-denial-reason">
                                        Denial reason<span className="dr-required">*</span>
                                    </label>
                                    <textarea
                                        id="dr-denial-reason"
                                        name="denial_reason"
                                        value={formData.denial_reason}
                                        onChange={handleInputChange}
                                        placeholder="Describe the denial reason for this code"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="dr-modal-footer">
                                <button
                                    type="button"
                                    className="btn dr-modal-btn-cancel"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <Button className="dr-modal-btn-save" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add denial reason'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DenialReasonList;
