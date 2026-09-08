import React, { useState, useEffect } from 'react';
import Button from '../../../components/common/Button';
import AdminBulkUpload from '../../../components/admin/AdminBulkUpload';
import { toast } from '../../../utils/confirm';

const SENDER_BULK_COLUMNS = [
    {
        display: 'Sender ID',
        key: 'sender_id',
        aliases: ['senderid', 'sender_id', 'id', 'code', 'sender_code'],
        required: true
    },
    {
        display: 'Sender Name',
        key: 'sender_name',
        aliases: ['sendername', 'sender_name', 'name', 'label'],
        required: true
    }
];

const SENDER_BULK_EXAMPLE = {
    'Sender ID': 'TPA002',
    'Sender Name': 'Some Sender'
};

const SenderList = () => {
    const [senders, setSenders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /** sno = serial number used by PUT /api/senders/:sno; sender_id = business key e.g. TPA002 */
    const [formData, setFormData] = useState({
        sno: '',
        sender_id: '',
        sender_name: ''
    });

    const getToken = () => localStorage.getItem('token');
    const headers = () => ({
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const normalizeSender = (item, fallbackSno) => {
        if (!item || typeof item !== 'object') {
            return { sno: '', sender_id: '', sender_name: '' };
        }
        return {
            sno: String(
                item.sno ??
                    item.id ??
                    item.serial_no ??
                    item.sl_no ??
                    item.s_no ??
                    item.sender_id_pk ??
                    item.senderPk ??
                    item.sender_pk ??
                    fallbackSno ??
                    ''
            ).trim(),
            sender_id: String(item.sender_id ?? item.senderId ?? item.senderid ?? '').trim(),
            sender_name: String(item.sender_name ?? item.senderName ?? item.sendername ?? '').trim()
        };
    };

    const fetchSenders = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await fetch('/api/senders', { headers: headers() });
            const textData = await response.text();
            let data;
            try {
                data = JSON.parse(textData);
            } catch {
                throw new Error('API connection failed: received non-JSON response.');
            }
            if (!response.ok) {
                throw new Error(data.message || data.error || `Server error: ${response.status}`);
            }
            const rawList = Array.isArray(data) ? data : data?.data ?? data?.senders ?? [];
            setSenders(rawList.map((row, index) => normalizeSender(row, index + 1)));
        } catch (err) {
            console.error('Fetch senders:', err);
            setError(err.message);
            setSenders([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSenderBySenderId = async (senderId) => {
        const sid = String(senderId ?? '').trim();
        if (!sid) return null;
        try {
            const enc = encodeURIComponent(sid);
            const response = await fetch(`/api/senders/by-senderid/${enc}`, { headers: headers() });
            if (!response.ok) return null;
            const data = await response.json();
            return normalizeSender(data?.data ?? data);
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    useEffect(() => {
        fetchSenders();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddClick = () => {
        setIsEdit(false);
        setFormData({ sno: '', sender_id: '', sender_name: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = async (row) => {
        setIsEdit(true);
        const base = normalizeSender(row);
        const fresh = await fetchSenderBySenderId(base.sender_id);
        const data = fresh && fresh.sender_id ? fresh : base;
        setFormData({
            sno: data.sno || base.sno || '',
            sender_id: data.sender_id || base.sender_id,
            sender_name: data.sender_name || base.sender_name
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const sender_id = formData.sender_id.trim();
            const sender_name = formData.sender_name.trim();
            if (!sender_id || !sender_name) {
                toast.error('Sender ID and Sender Name are required.');
                setIsSubmitting(false);
                return;
            }
            const payload = { sender_id, sender_name };
            const method = isEdit ? 'PUT' : 'POST';
            const targetSno = String(formData.sno || '').trim();
            const url = isEdit ? `/api/senders/${encodeURIComponent(targetSno)}` : '/api/senders';
            if (isEdit && !targetSno) {
                toast.error('Cannot update: missing sender identifier.');
                setIsSubmitting(false);
                return;
            }
            const response = await fetch(url, {
                method,
                headers: headers(),
                body: JSON.stringify(payload)
            });
            const respData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(respData.message || respData.error || 'Operation failed');
            }
            await fetchSenders();
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
                    Manage payers / senders (e.g. TPA codes). Sender ID is the external code; name is the display label.
                </p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={() => fetchSenders()}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <AdminBulkUpload
                        columnDefs={SENDER_BULK_COLUMNS}
                        exampleRow={SENDER_BULK_EXAMPLE}
                        helpTitle="Excel format (do not put heading)"
                        helpIntro="First sheet only. Column A = Sender ID, column B = Sender Name. Put data from row 1—one sender per row. No heading row."
                        helpWarning="Do not put the heading — it will also be added as a sender."
                        helpFooter="Upload .xlsx or .xls. The file is sent in one request to the server; results show inserted/updated/skipped counts and any row errors."
                        postUrl="/api/senders/import"
                        getHeaders={headers}
                        multipartImport
                        disabled={isLoading}
                        onComplete={fetchSenders}
                    />
                    <Button className="dr-btn-add" onClick={handleAddClick}>
                        Add Sender
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
                                Sender ID
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                Sender Name
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
                                    Loading senders...
                                </td>
                            </tr>
                        ) : senders.length > 0 ? (
                            senders.map((row, index) => (
                                <tr key={row.sender_id || row.sno || index} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
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
                                            {row.sender_id || '—'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{row.sender_name || '—'}</td>
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
                                <td
                                    colSpan="4"
                                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                                >
                                    {!error && 'No senders found. Add one to get started.'}
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
                        style={{ width: '440px', maxWidth: '90%', animation: 'slideUp 0.3s ease-out' }}
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{isEdit ? 'Edit sender' : 'Add sender'}</h3>
                            <button
                                type="button"
                                onClick={() => !isSubmitting && setIsModalOpen(false)}
                                style={{ fontSize: '1.5rem', color: 'var(--text-muted)', lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer' }}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-col gap-md">
                            <div className="flex-col gap-sm">
                                <label className="text-sm font-medium text-muted">
                                    Sender ID <span style={{ color: 'var(--status-error)' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="sender_id"
                                    value={formData.sender_id}
                                    onChange={handleInputChange}
                                    placeholder="e.g. TPA002"
                                    required
                                    readOnly={isEdit}
                                    style={isEdit ? { backgroundColor: 'var(--bg-hover)', cursor: 'not-allowed' } : undefined}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="flex-col gap-sm">
                                <label className="text-sm font-medium text-muted">
                                    Sender Name <span style={{ color: 'var(--status-error)' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="sender_name"
                                    value={formData.sender_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Some Sender"
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
                                    {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add sender'}
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

export default SenderList;
