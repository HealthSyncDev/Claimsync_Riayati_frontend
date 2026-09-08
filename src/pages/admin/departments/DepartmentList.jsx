import React, { useState, useEffect } from 'react';
import Button from '../../../components/common/Button';
import AdminBulkUpload from '../../../components/admin/AdminBulkUpload';
import { toast } from '../../../utils/confirm';

const DEPARTMENT_BULK_COLUMNS = [
    {
        display: 'Department Name',
        key: 'department_name',
        aliases: ['departmentname', 'name', 'department'],
        required: true
    }
];

const DEPARTMENT_BULK_EXAMPLE = {
    'Department Name': 'Cardiology'
};

const DepartmentList = () => {
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        department_id: '',
        department_name: ''
    });

    const getToken = () => localStorage.getItem("token");
    const headers = () => ({
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const normalizeDept = (d) => ({
        department_id: d.department_id ?? d.departmentId,
        department_name: d.department_name ?? d.departmentName ?? ''
    });

    const fetchDepartments = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await fetch('/api/departments', { headers: headers() });
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
            const list = Array.isArray(data) ? data.map(normalizeDept) : [];
            setDepartments(list);
        } catch (err) {
            console.error("Fetch Departments Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDepartmentById = async (id) => {
        try {
            const response = await fetch(`/api/departments/${id}`, { headers: headers() });
            if (!response.ok) return null;
            const data = await response.json();
            return normalizeDept(data);
        } catch (e) {
            return null;
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleAddClick = () => {
        setIsEdit(false);
        setFormData({ department_id: '', department_name: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = async (dept) => {
        setIsEdit(true);
        const normalized = normalizeDept(dept);
        const fresh = await fetchDepartmentById(normalized.department_id);
        setFormData(fresh || normalized);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { department_name: formData.department_name.trim() };
            if (!payload.department_name) {
                toast.error('Department name is required.');
                setIsSubmitting(false);
                return;
            }
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/api/departments/${formData.department_id}` : '/api/departments';
            const response = await fetch(url, {
                method,
                headers: headers(),
                body: JSON.stringify(payload)
            });
            const respData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(respData.message || respData.error || 'Operation failed');
            }
            await fetchDepartments();
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
                <p className="text-muted">Manage hospital departments.</p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={fetchDepartments}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <AdminBulkUpload
                        columnDefs={DEPARTMENT_BULK_COLUMNS}
                        exampleRow={DEPARTMENT_BULK_EXAMPLE}
                        helpIntro="Row 1 = headings on the first sheet. Use the titles below, or the alternate headings under each column. Data starts on row 2—one department per row."
                        helpFooter="Upload .xlsx or .xls. The file is sent in one request to the server; results show inserted/updated/skipped counts and any row errors."
                        postUrl="/api/departments/import"
                        getHeaders={headers}
                        multipartImport
                        showAliasesInHelp
                        disabled={isLoading}
                        onComplete={fetchDepartments}
                    />
                    <Button className="dr-btn-add" onClick={handleAddClick}>Add Department</Button>
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
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Department Name</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading departments...
                                </td>
                            </tr>
                        ) : departments.length > 0 ? (
                            departments.map((dept, index) => (
                                <tr key={dept.department_id} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                                    <td style={{ padding: '16px 24px' }} className="text-muted">{index + 1}</td>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{dept.department_name}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            className="text-primary text-sm font-medium"
                                            onClick={() => handleEditClick(dept)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {!error && "No departments found. Add one to get started."}
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
                            <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Department' : 'Add New Department'}</h3>
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
                                    <label className="text-sm font-medium text-muted">Department ID</label>
                                    <input
                                        type="text"
                                        value={formData.department_id}
                                        readOnly
                                        style={{ backgroundColor: 'var(--bg-hover)', cursor: 'not-allowed' }}
                                    />
                                </div>
                            )}

                            <div className="flex-col gap-sm">
                                <label className="text-sm font-medium text-muted">Department Name <span style={{ color: 'var(--status-error)' }}>*</span></label>
                                <input
                                    type="text"
                                    name="department_name"
                                    value={formData.department_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Dental, Cardiology"
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
                                    {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Department')}
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

export default DepartmentList;
