import React, { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import AdminBulkUpload from '../../../components/admin/AdminBulkUpload';
import { toast } from '../../../utils/confirm';

/** Backend base: GET/POST list & create; PUT /{tableId}; POST /import */
const CPT_API = '/api/cpt-code-categories';

const CPT_BULK_COLUMNS = [
    {
        display: 'cpt_code',
        key: 'cpt_code',
        aliases: ['CPT Code', 'cptcode', 'code', 'activity_code'],
        required: true
    },
    {
        display: 'cpt_category',
        key: 'cpt_category',
        aliases: ['CPT Category', 'cptcategory', 'category', 'activity_category'],
        required: true
    }
];

const CPT_BULK_EXAMPLE = {
    cpt_code: '99213',
    cpt_category: 'Office Visit'
};

const normalizeCpt = (item) => ({
    id: item?.table_id ?? item?.tableId ?? item?.id ?? '',
    cpt_code: String(item?.cpt_code ?? item?.cptCode ?? '').trim(),
    cpt_category: String(item?.cpt_category ?? item?.cptCategory ?? '').trim()
});

const CptCodeMappingList = () => {
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        cpt_code: '',
        cpt_category: ''
    });

    const getToken = () => localStorage.getItem('token');
    const headers = () => ({
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const loadRows = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await fetch(CPT_API, { headers: headers() });
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
            const list = Array.isArray(data) ? data : data?.data ?? data?.rows ?? [];
            setRows(list.map((item) => normalizeCpt(item)));
        } catch (err) {
            console.error('Fetch CPT mapping error:', err);
            setError(err.message);
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRows();
    }, []);

    const handleAddClick = () => {
        setIsEdit(false);
        setFormData({ id: '', cpt_code: '', cpt_category: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = (row) => {
        setIsEdit(true);
        setFormData({
            id: row.id,
            cpt_code: row.cpt_code,
            cpt_category: row.cpt_category
        });
        setIsModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                cpt_code: formData.cpt_code.trim(),
                cpt_category: formData.cpt_category.trim()
            };
            if (!payload.cpt_code || !payload.cpt_category) {
                toast.error('CPT Code and CPT Category are required.');
                setIsSubmitting(false);
                return;
            }
            if (isEdit && !formData.id) {
                toast.error('Missing table id. Refresh and try again.');
                setIsSubmitting(false);
                return;
            }
            const url = isEdit ? `${CPT_API}/${encodeURIComponent(String(formData.id))}` : CPT_API;
            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: headers(),
                body: JSON.stringify(payload)
            });
            const respData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(respData.message || respData.error || 'Operation failed');
            }
            await loadRows();
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
                    Manage CPT code to CPT category mappings used across claims workflows.
                </p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={loadRows}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <AdminBulkUpload
                        columnDefs={CPT_BULK_COLUMNS}
                        exampleRow={CPT_BULK_EXAMPLE}
                        helpIntro="First sheet only. Row 1 = headings: cpt_code (column A), cpt_category (column B). Data from row 2."
                        helpFooter="Upload .xlsx or .xls. Server expects multipart field name file on POST /api/cpt-code-categories/import."
                        postUrl={`${CPT_API}/import`}
                        getHeaders={headers}
                        multipartImport
                        showAliasesInHelp
                        disabled={isLoading}
                        onComplete={loadRows}
                    />
                    <Button className="dr-btn-add" onClick={handleAddClick}>
                        Add CPT Mapping
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
                    <thead style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                        <tr>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                S.No
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                CPT Code
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                CPT Category
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px', textAlign: 'right' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading CPT mappings...
                                </td>
                            </tr>
                        ) : rows.length > 0 ? (
                            rows.map((row, index) => (
                                <tr key={row.id || `${row.cpt_code}-${index}`} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
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
                                            {row.cpt_code || '—'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{row.cpt_category || '—'}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            className="text-primary text-sm font-medium"
                                            onClick={() => handleEditClick(row)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {!error && 'No CPT mappings found. Add one to get started.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}
                    role="presentation"
                    onClick={(e) => e.target === e.currentTarget && !isSubmitting && setIsModalOpen(false)}
                >
                    <div
                        className="card"
                        style={{ width: '420px', maxWidth: '90%', animation: 'slideUp 0.3s ease-out' }}
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{isEdit ? 'Edit CPT Mapping' : 'Add CPT Mapping'}</h3>
                            <button
                                type="button"
                                onClick={() => !isSubmitting && setIsModalOpen(false)}
                                style={{
                                    fontSize: '1.5rem',
                                    color: 'var(--text-muted)',
                                    lineHeight: 1,
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer'
                                }}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-col gap-md">
                            <div className="flex-col gap-sm">
                                <label className="text-sm font-medium text-muted">
                                    CPT Code <span style={{ color: 'var(--status-error)' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="cpt_code"
                                    value={formData.cpt_code}
                                    onChange={handleInputChange}
                                    placeholder="e.g. 99213"
                                    required
                                />
                            </div>

                            <div className="flex-col gap-sm">
                                <label className="text-sm font-medium text-muted">
                                    CPT Category <span style={{ color: 'var(--status-error)' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="cpt_category"
                                    value={formData.cpt_category}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Office Visit"
                                    required
                                />
                            </div>

                            <div className="flex justify-between items-center" style={{ marginTop: '10px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add CPT Mapping'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default CptCodeMappingList;
