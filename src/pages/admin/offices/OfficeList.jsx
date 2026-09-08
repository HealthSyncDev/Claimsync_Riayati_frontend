import React, { useState, useEffect } from 'react';
import Button from '../../../components/common/Button';
import { toast } from '../../../utils/confirm';

const OfficeList = () => {
    // State for managing list of offices
    const [offices, setOffices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        officeId: '',
        officeName: '',
        officeCode: '',
        prefix: '',
        address1: '',
        address2: '',
        address3: '',
        officeTele: '',
        officeMobile: '',
        pincode: '',
        trn: '',
        facilityId: '',
        dhpId: '',
        dhpPassword: ''
    });

    const getToken = () => localStorage.getItem("token");
    const authHeaders = () => ({
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const fetchOffices = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await fetch('/api/offices', { headers: authHeaders() });
            const textData = await response.text();

            let data;
            try {
                data = JSON.parse(textData);
            } catch (e) {
                console.error("Non-JSON response received:", textData.slice(0, 200));
                // Only throw if we don't have cached data to fall back on visibly? 
                // Actually, if fresh fetch fails, we should probably warn even if we have cache.
                throw new Error("API Connection Failed: Received HTML instead of JSON.");
            }

            if (!response.ok) {
                throw new Error(data.message || `Server Error: ${response.status} ${response.statusText}`);
            }

            setOffices(data);
        } catch (err) {
            console.error("Fetch Offices Error:", err);
            // If we have cache, maybe we don't want to clear the screen with an error?
            // For now, let's show the error but if we have 'offices', user can still see them.
            if (offices.length === 0) {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOffices();
    }, []);

    // Handle Input Change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Open Modal for Adding
    const handleAddClick = () => {
        setIsEdit(false);
        setFormData({
            officeId: '',
            officeName: '',
            officeCode: '',
            prefix: '',
            address1: '',
            address2: '',
            address3: '',
            officeTele: '',
            officeMobile: '',
            pincode: '',
            trn: '',
            facilityId: '',
            dhpId: '',
            dhpPassword: ''
        });
        setIsModalOpen(true);
    };

    // Open Modal for Editing
    const handleEditClick = (office) => {
        setIsEdit(true);
        setFormData({
            officeId: '',
            officeName: '',
            officeCode: '',
            prefix: '',
            address1: '',
            address2: '',
            address3: '',
            officeTele: '',
            officeMobile: '',
            pincode: '',
            trn: '',
            facilityId: '',
            dhpId: '',
            dhpPassword: '',
            ...office // Overwrite with actual values from API
        });
        setIsModalOpen(true);
    };

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/api/offices/${formData.officeId}` : '/api/offices';

            // Prepare payload
            const payload = {
                ...formData,
                officeId: formData.officeId ? Number(formData.officeId) : undefined
            };

            const response = await fetch(url, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Operation failed');
            }

            // Refresh list
            await fetchOffices();
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
                <p className="text-muted">Manage hospital office locations and branches.</p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={fetchOffices}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <Button className="dr-btn-add" onClick={handleAddClick}>Add New Office</Button>
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
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Office Name</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Code</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading offices...
                                </td>
                            </tr>
                        ) : offices.length > 0 ? (
                            offices.map((office, index) => (
                                <tr key={office.officeId} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                                    <td style={{ padding: '16px 24px' }} className="text-muted">{index + 1}</td>
                                    <td style={{ padding: '16px 24px' }}>{office.officeName}</td>
                                    <td style={{ padding: '16px 24px' }}><span style={{ background: 'var(--status-info-bg)', color: 'var(--primary-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{office.officeCode}</span></td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button
                                            className="text-primary text-sm font-medium"
                                            onClick={() => handleEditClick(office)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {!error && "No offices found. Add one to get started."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Implementation */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card" style={{ width: '800px', maxWidth: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Office Details' : 'Add New Office'}</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ fontSize: '1.5rem', color: 'var(--text-muted)', lineHeight: 1 }}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-col gap-md">
                            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }} className="flex-col gap-md">
                                {isEdit && (
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Office ID</label>
                                        <input
                                            type="text"
                                            name="officeId"
                                            value={formData.officeId}
                                            readOnly
                                            style={{ backgroundColor: 'var(--bg-hover)', cursor: 'not-allowed' }}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Office Name <span style={{ color: 'var(--status-error)' }}>*</span></label>
                                        <input
                                            type="text"
                                            name="officeName"
                                            value={formData.officeName}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Main Office"
                                            required
                                        />
                                    </div>
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Office Code <span style={{ color: 'var(--status-error)' }}>*</span></label>
                                        <input
                                            type="text"
                                            name="officeCode"
                                            value={formData.officeCode}
                                            onChange={handleInputChange}
                                            placeholder="e.g. MO002"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Prefix</label>
                                        <input
                                            type="text"
                                            name="prefix"
                                            value={formData.prefix}
                                            onChange={handleInputChange}
                                            placeholder="e.g. MO"
                                        />
                                    </div>
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Pincode</label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            value={formData.pincode}
                                            onChange={handleInputChange}
                                            placeholder="e.g. 12345"
                                        />
                                    </div>
                                </div>

                                <div className="flex-col gap-sm">
                                    <label className="text-sm font-medium text-muted">Address Line 1</label>
                                    <input
                                        type="text"
                                        name="address1"
                                        value={formData.address1}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 123 Business Street"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Address Line 2</label>
                                        <input
                                            type="text"
                                            name="address2"
                                            value={formData.address2}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Building A"
                                        />
                                    </div>
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Address Line 3</label>
                                        <input
                                            type="text"
                                            name="address3"
                                            value={formData.address3}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Floor 5"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Telephone</label>
                                        <input
                                            type="text"
                                            name="officeTele"
                                            value={formData.officeTele}
                                            onChange={handleInputChange}
                                            placeholder="e.g. +971-4-1234567"
                                        />
                                    </div>
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Mobile</label>
                                        <input
                                            type="text"
                                            name="officeMobile"
                                            value={formData.officeMobile}
                                            onChange={handleInputChange}
                                            placeholder="e.g. +971-50-1234567"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">TRN</label>
                                        <input
                                            type="text"
                                            name="trn"
                                            value={formData.trn}
                                            onChange={handleInputChange}
                                            placeholder="e.g. TRN123456709"
                                        />
                                    </div>
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">Facility ID</label>
                                        <input
                                            type="text"
                                            name="facilityId"
                                            value={formData.facilityId}
                                            onChange={handleInputChange}
                                            placeholder="e.g. FAC01"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">DHP ID</label>
                                        <input
                                            type="text"
                                            name="dhpId"
                                            value={formData.dhpId}
                                            onChange={handleInputChange}
                                            placeholder="e.g. DHP01"
                                        />
                                    </div>
                                    <div className="flex-col gap-sm">
                                        <label className="text-sm font-medium text-muted">DHP Password</label>
                                        <input
                                            type="password"
                                            name="dhpPassword"
                                            value={formData.dhpPassword}
                                            onChange={handleInputChange}
                                            placeholder="********"
                                        />
                                    </div>
                                </div>
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
                                    {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Office')}
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

export default OfficeList;
