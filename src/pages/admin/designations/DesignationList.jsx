import React, { useState, useEffect } from 'react';
import Button from '../../../components/common/Button';
import { toast } from '../../../utils/confirm';

const DesignationList = () => {
    // State for managing list of designations
    const [designations, setDesignations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        designationId: '',
        designationName: ''
    });

    const getToken = () => localStorage.getItem("token");
    const authHeaders = () => ({
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const fetchDesignations = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await fetch('/api/designations', { headers: authHeaders() });

            // Handle non-JSON responses (e.g., HTML errors)
            const textData = await response.text();
            let data;
            try {
                data = JSON.parse(textData);
            } catch (e) {
                console.error("Non-JSON response received:", textData.slice(0, 200));
                throw new Error("API Connection Failed: Received HTML instead of JSON.");
            }

            if (!response.ok) {
                throw new Error(data.message || `Server Error: ${response.status} ${response.statusText}`);
            }

            setDesignations(data);
        } catch (err) {
            console.error("Fetch Designations Error:", err);
            // If we have cache, display validation error quietly or handle as needed
            if (designations.length === 0) {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDesignations();
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
            designationId: '',
            designationName: ''
        });
        setIsModalOpen(true);
    };

    // Open Modal for Editing
    const handleEditClick = (designation) => {
        setIsEdit(true);
        setFormData(designation);
        setIsModalOpen(true);
    };

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/api/designations/${formData.designationId}` : '/api/designations';

            // Prepare payload
            const payload = {
                ...formData,
                designationId: formData.designationId ? Number(formData.designationId) : undefined
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
            await fetchDesignations();
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
                <p className="text-muted">Manage job designations and roles.</p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={fetchDesignations}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <Button className="dr-btn-add" onClick={handleAddClick}>Add Designation</Button>
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
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Designation Name</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading designations...
                                </td>
                            </tr>
                        ) : designations.length > 0 ? (
                            designations.map((designation, index) => (
                                <tr key={designation.designationId} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                                    <td style={{ padding: '16px 24px' }} className="text-muted">{index + 1}</td>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{designation.designationName}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button
                                            className="text-primary text-sm font-medium"
                                            onClick={() => handleEditClick(designation)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {!error && "No designations found. Add one to get started."}
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
                    <div className="card" style={{ width: '400px', maxWidth: '90%', animation: 'slideUp 0.3s ease-out' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Designation' : 'Add New Designation'}</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ fontSize: '1.5rem', color: 'var(--text-muted)', lineHeight: 1 }}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-col gap-md">
                            {isEdit && (
                                <div className="flex-col gap-sm">
                                    <label className="text-sm font-medium text-muted">Designation ID</label>
                                    <input
                                        type="text"
                                        name="designationId"
                                        value={formData.designationId}
                                        readOnly
                                        style={{ backgroundColor: 'var(--bg-hover)', cursor: 'not-allowed' }}
                                    />
                                </div>
                            )}

                            <div className="flex-col gap-sm">
                                <label className="text-sm font-medium text-muted">Designation Name <span style={{ color: 'var(--status-error)' }}>*</span></label>
                                <input
                                    type="text"
                                    name="designationName"
                                    value={formData.designationName}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Senior Surgeon"
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
                                    {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Designation')}
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

export default DesignationList;
