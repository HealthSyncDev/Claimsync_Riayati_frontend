import React, { useState, useEffect } from 'react';
import Button from '../../../components/common/Button';
import AdminBulkUpload from '../../../components/admin/AdminBulkUpload';
import { toast } from '../../../utils/confirm';

const PAYER_BULK_COLUMNS = [
    {
        display: 'Payer ID No',
        key: 'payeridno',
        aliases: ['payer_id_no', 'payer_id', 'payerid', 'payer code'],
        required: true
    },
    {
        display: 'Payer Name',
        key: 'payername',
        aliases: ['payer_name', 'name', 'insurance_name'],
        required: true
    }
];

const PAYER_BULK_EXAMPLE = {
    'Payer ID No': 'PAY001',
    'Payer Name': 'Insurance Company ABC'
};

const PayerIdList = () => {
    const [payers, setPayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        id: '',
        sno: '',
        payeridno: '',
        payername: ''
    });

    const getToken = () => localStorage.getItem("token");
    const headers = () => ({
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const normalize = (item, fallbackSno) => ({
        id: item.id ?? item.payer_id,
        sno: item.sno ?? item.serial_no ?? item.sl_no ?? item.s_no ?? fallbackSno ?? '',
        payeridno: item.payeridno ?? item.payerIdNo ?? '',
        payername: item.payername ?? item.payerName ?? ''
    });

    const fetchAll = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await fetch('/api/payer-ids', { headers: headers() });
            const textData = await response.text();
            let data;
            try {
                data = JSON.parse(textData);
            } catch (e) {
                throw new Error("API connection failed: received non-JSON response.");
            }
            if (!response.ok) {
                throw new Error(data.message || data.error || `Server error: ${response.status}`);
            }
            const list = Array.isArray(data) ? data.map((row, index) => normalize(row, index + 1)) : [];
            setPayers(list);
        } catch (err) {
            console.error("Fetch Payer IDs Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchById = async (id) => {
        try {
            const response = await fetch(`/api/payer-ids/${id}`, { headers: headers() });
            if (!response.ok) return null;
            const data = await response.json();
            return normalize(data);
        } catch (e) {
            return null;
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleAddClick = () => {
        setIsEdit(false);
        setFormData({ id: '', sno: '', payeridno: '', payername: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = async (item) => {
        setIsEdit(true);
        const normalized = normalize(item);
        const targetSno = normalized.sno || '';
        const fresh = targetSno ? await fetchById(targetSno) : null;
        setFormData({ ...(fresh || normalized), sno: targetSno });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                payeridno: formData.payeridno.trim(),
                payername: formData.payername.trim()
            };
            if (!payload.payeridno || !payload.payername) {
                toast.error('Payer ID No and Payer Name are required.');
                setIsSubmitting(false);
                return;
            }
            if (isEdit && (formData.sno === '' || formData.sno == null)) {
                toast.error('Missing S.No for update. Refresh the list and try again.');
                setIsSubmitting(false);
                return;
            }
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/api/payer-ids/${formData.sno}` : '/api/payer-ids';
            const response = await fetch(url, {
                method,
                headers: headers(),
                body: JSON.stringify(payload)
            });
            const respData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(respData.message || respData.error || 'Operation failed');
            }
            await fetchAll();
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
                <p className="text-muted">Manage payer IDs and insurance company names (e.g. PAY001, Insurance Company ABC).</p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={fetchAll}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <AdminBulkUpload
                        columnDefs={PAYER_BULK_COLUMNS}
                        exampleRow={PAYER_BULK_EXAMPLE}
                        helpIntro="Upload Sheet1 with first two columns in this order: payeridno, payername. Header row is optional and auto-skipped."
                        helpFooter="Endpoint: /api/payer-ids/import (multipart/form-data, form key: file). Upsert rule: if payeridno exists -> update payername, else insert new row. Allowed files: .xlsx, .xls."
                        postUrl="/api/payer-ids/import"
                        getHeaders={headers}
                        multipartImport
                        showAliasesInHelp
                        disabled={isLoading}
                        onComplete={fetchAll}
                    />
                    <Button className="dr-btn-add" onClick={handleAddClick}>Add Payer</Button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '16px', backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', borderRadius: 'var(--radius-md)' }}>
                    {error}
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="w-full" style={{ textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                        <tr>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>S.No</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Payer ID No</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Payer Name</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading payers...
                                </td>
                            </tr>
                        ) : payers.length > 0 ? (
                            payers.map((item, index) => (
                                <tr key={item.id ?? item.sno ?? index} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                                    <td style={{ padding: '16px 24px' }} className="text-muted">{item.sno || index + 1}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ background: 'var(--status-info-bg)', color: 'var(--primary-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            {item.payeridno}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{item.payername}</td>
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
                                <td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {!error && "No payers found. Add one to get started."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90%', animation: 'slideUp 0.3s ease-out' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Payer' : 'Add Payer'}</h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                style={{ fontSize: '1.5rem', color: 'var(--text-muted)', lineHeight: 1 }}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-col gap-md">
                            <div className="flex-col gap-sm">
                                <label className="text-sm font-medium text-muted">Payer ID No <span style={{ color: 'var(--status-error)' }}>*</span></label>
                                <input
                                    type="text"
                                    name="payeridno"
                                    value={formData.payeridno}
                                    onChange={handleInputChange}
                                    placeholder="e.g. PAY001"
                                    required
                                />
                            </div>

                            <div className="flex-col gap-sm">
                                <label className="text-sm font-medium text-muted">Payer Name <span style={{ color: 'var(--status-error)' }}>*</span></label>
                                <input
                                    type="text"
                                    name="payername"
                                    value={formData.payername}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Insurance Company ABC"
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
                                    {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Payer')}
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

export default PayerIdList;
