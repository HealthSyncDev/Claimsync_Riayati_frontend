import React, { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import AdminBulkUpload from '../../../components/admin/AdminBulkUpload';
import { toast } from '../../../utils/confirm';
import './DenialCodeList.css';

const DENIAL_CODES_API = '/api/denial-codes';
const denialCodeByIdUrl = (id) => `${DENIAL_CODES_API}/${encodeURIComponent(String(id))}`;
const DENIAL_CODES_IMPORT_API = `${DENIAL_CODES_API}/import`;

const DENIAL_CODES_BULK_COLUMNS = [
    {
        display: 'Denial Code',
        key: 'denial_code',
        aliases: ['code', 'denialcode'],
        required: true
    },
    {
        display: 'Denial Type',
        key: 'denial_type',
        aliases: ['type', 'denialtype'],
        required: true
    },
    {
        display: 'Denial Category',
        key: 'denial_category',
        aliases: ['denialcategory'],
        required: true
    },
    {
        display: 'Category',
        key: 'category',
        aliases: ['cat'],
        required: false
    }
];

const DENIAL_CODES_BULK_EXAMPLE = {
    'Denial Code': 'DC001',
    'Denial Type': 'Technical',
    'Denial Category': 'Medical',
    Category: 'Authorization'
};

const DenialCodeList = () => {
    const [denialCodes, setDenialCodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        denial_id: '',
        denial_code: '',
        denial_type: '',
        denial_category: '',
        category: ''
    });

    const getToken = () => localStorage.getItem('token');
    const headers = () => ({
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const normalizeDenialCode = (item = {}) => ({
        denial_id: item.denial_id ?? item.id ?? item.denialId ?? item.denial_code_id ?? '',
        denial_code: item.denial_code ?? item.denialCode ?? '',
        denial_type: item.denial_type ?? item.denialType ?? '',
        denial_category: item.denial_category ?? item.denialCategory ?? '',
        category: item.category ?? item.Category ?? ''
    });

    const fetchAllDenialCodes = async () => {
        const response = await fetch(DENIAL_CODES_API, { headers: headers() });
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

        const rawList = Array.isArray(data) ? data : data?.data ?? data?.denial_codes ?? [];
        return rawList.map((row) => normalizeDenialCode(row));
    };

    const loadPage = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const list = await fetchAllDenialCodes();
            setDenialCodes(list);
        } catch (err) {
            console.error('Load denial codes page:', err);
            setError(err.message);
            setDenialCodes([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPage();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddClick = () => {
        setIsEdit(false);
        setFormData({
            denial_id: '',
            denial_code: '',
            denial_type: '',
            denial_category: '',
            category: ''
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (item) => {
        setIsEdit(true);
        setFormData(normalizeDenialCode(item));
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                denial_code: formData.denial_code.trim(),
                denial_type: formData.denial_type.trim(),
                denial_category: formData.denial_category.trim(),
                category: formData.category.trim() || null
            };

            if (!payload.denial_code || !payload.denial_type || !payload.denial_category) {
                toast.error('Denial code, type, and denial category are required.');
                setIsSubmitting(false);
                return;
            }

            if (isEdit && (formData.denial_id === '' || formData.denial_id == null)) {
                toast.error('Missing record id. Refresh and try again.');
                setIsSubmitting(false);
                return;
            }

            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? denialCodeByIdUrl(formData.denial_id) : DENIAL_CODES_API;

            const response = await fetch(url, {
                method,
                headers: headers(),
                body: JSON.stringify(payload)
            });

            const respData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(respData.message || respData.error || 'Operation failed');
            }

            await loadPage();
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
                    Configure denial code mappings with type, denial category, and category for admin workflows.
                </p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={loadPage}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <AdminBulkUpload
                        columnDefs={DENIAL_CODES_BULK_COLUMNS}
                        exampleRow={DENIAL_CODES_BULK_EXAMPLE}
                        helpIntro="Upload Sheet1 with columns in this order: denial_code, denial_type, denial_category, category. Header row is optional and auto-skipped."
                        helpFooter="Supports .xlsx and .xls. Import upserts by denial_code: updates denial_type, denial_category, and category; new codes are inserted."
                        postUrl={DENIAL_CODES_IMPORT_API}
                        getHeaders={headers}
                        multipartImport
                        showAliasesInHelp
                        disabled={isLoading}
                        onComplete={loadPage}
                    />
                    <Button className="dr-btn-add" onClick={handleAddClick}>
                        Add Denial Code
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
                                Denial Type
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                Denial Category
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                Category
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
                                    colSpan="6"
                                    style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}
                                >
                                    Loading denial codes...
                                </td>
                            </tr>
                        ) : denialCodes.length > 0 ? (
                            denialCodes.map((item, index) => (
                                <tr
                                    key={item.denial_id ?? `${item.denial_code}-${index}`}
                                    style={{ borderBottom: '1px solid var(--bg-hover)' }}
                                >
                                    <td style={{ padding: '16px 24px' }} className="text-muted">
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>
                                        {item.denial_code || '—'}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>{item.denial_type || '—'}</td>
                                    <td style={{ padding: '16px 24px' }}>{item.denial_category || '—'}</td>
                                    <td style={{ padding: '16px 24px' }}>{item.category || '—'}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            className="text-primary text-sm font-medium"
                                            onClick={() => handleEditClick(item)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan="6"
                                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                                >
                                    {!error && 'No denial codes found. Add one to get started.'}
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
                        aria-labelledby="dc-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="dr-modal-header">
                            <div>
                                <h3 id="dc-modal-title" className="dr-modal-title">
                                    {isEdit ? 'Edit denial code' : 'Add denial code'}
                                </h3>
                                <p className="dr-modal-subtitle">
                                    Set the denial code with type, denial category, and category used in operations.
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
                                    <label htmlFor="dc-denial-code">
                                        Denial code<span className="dr-required">*</span>
                                    </label>
                                    <input
                                        id="dc-denial-code"
                                        type="text"
                                        name="denial_code"
                                        value={formData.denial_code}
                                        onChange={handleInputChange}
                                        placeholder="e.g. DC001"
                                        autoComplete="off"
                                        required
                                    />
                                </div>

                                <div className="dr-field">
                                    <label htmlFor="dc-denial-type">
                                        Denial type<span className="dr-required">*</span>
                                    </label>
                                    <input
                                        id="dc-denial-type"
                                        type="text"
                                        name="denial_type"
                                        value={formData.denial_type}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Technical"
                                        autoComplete="off"
                                        required
                                    />
                                </div>

                                <div className="dr-field">
                                    <label htmlFor="dc-denial-category">
                                        Denial category<span className="dr-required">*</span>
                                    </label>
                                    <input
                                        id="dc-denial-category"
                                        type="text"
                                        name="denial_category"
                                        value={formData.denial_category}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Medical"
                                        autoComplete="off"
                                        required
                                    />
                                </div>

                                <div className="dr-field">
                                    <label htmlFor="dc-category">Category</label>
                                    <input
                                        id="dc-category"
                                        type="text"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Authorization"
                                        autoComplete="off"
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
                                    {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add denial code'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DenialCodeList;
