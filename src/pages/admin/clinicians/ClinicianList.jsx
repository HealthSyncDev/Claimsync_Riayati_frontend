import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/common/Button';
import AdminBulkUpload from '../../../components/admin/AdminBulkUpload';
import { toast } from '../../../utils/confirm';

const CLINICIAN_BULK_COLUMNS = [
    { display: 'Clinician No', key: 'clinicianno', aliases: ['clinician_no', 'id'], required: true },
    { display: 'Clinician Name', key: 'clinician_name', aliases: ['clinicianname', 'name'], required: true },
    {
        display: 'Doctor Name (Heartbeat)',
        key: 'doctor_name_as_per_heartbeat',
        aliases: ['doctor_name', 'heartbeat'],
        required: false
    },
    { display: 'Department ID', key: 'department_id', aliases: ['departmentid'], required: true }
];

const CLINICIAN_BULK_EXAMPLE = {
    'Clinician No': 'CLN001',
    'Clinician Name': 'Dr. Example',
    'Doctor Name (Heartbeat)': '',
    'Department ID': '1'
};

const ClinicianList = () => {
    const [clinicians, setClinicians] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isView, setIsView] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Add: search/select from list → ID locked; user-typed ID stays editable
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [selectedFromList, setSelectedFromList] = useState(false); // true only when picked existing from dropdown → ID read-only

    const [formData, setFormData] = useState({
        id: '',
        clinicianno: '',
        clinician_name: '',
        doctor_name_as_per_heartbeat: '',
        department_id: ''
    });

    const getToken = () => localStorage.getItem("token");
    const headers = () => ({
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const normalizeClinician = (c) => ({
        id: c.id ?? c.clinician_id ?? c.clinicianId,
        clinicianno: c.clinicianno ?? c.clinicianNo ?? c.clinicianId ?? '',
        clinician_name: c.clinician_name ?? c.clinicianName ?? '',
        doctor_name_as_per_heartbeat: c.doctor_name_as_per_heartbeat ?? c.doctorNameAsPerHeartbeat ?? '',
        department_id: c.department_id != null && c.department_id !== '' ? c.department_id : ''
    });

    const fetchClinicians = async () => {
        setError(null);
        try {
            const response = await fetch('/api/clinicians', { headers: headers() });
            const textData = await response.text();
            let data;
            try {
                data = JSON.parse(textData);
            } catch (e) {
                throw new Error("API connection failed: received non-JSON response.");
            }
            if (!response.ok) throw new Error(data.message || data.error || `Server error: ${response.status}`);
            const list = Array.isArray(data) ? data.map(normalizeClinician) : [];
            setClinicians(list);
        } catch (err) {
            console.error("Fetch Clinicians Error:", err);
            setError(err.message);
        }
    };

    const fetchClinicianById = async (id) => {
        try {
            const response = await fetch(`/api/clinicians/${id}`, { headers: headers() });
            if (!response.ok) return null;
            const data = await response.json();
            return normalizeClinician(data);
        } catch (e) {
            return null;
        }
    };

    const fetchClinicianByClinicianno = async (clinicianno) => {
        try {
            const encoded = encodeURIComponent(clinicianno);
            const response = await fetch(`/api/clinicians/by-clinicianno/${encoded}`, { headers: headers() });
            if (!response.ok) return null;
            const data = await response.json();
            return normalizeClinician(data);
        } catch (e) {
            return null;
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await fetch('/api/departments', { headers: headers() });
            if (!response.ok) return;
            const data = await response.json();
            const list = Array.isArray(data) ? data.map(d => ({ department_id: d.department_id ?? d.departmentId, department_name: d.department_name ?? d.departmentName })) : [];
            setDepartments(list);
        } catch (e) {
            console.error("Fetch Departments Error:", e);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        Promise.all([fetchClinicians(), fetchDepartments()]).finally(() => setIsLoading(false));
    }, []);

    const filteredSearchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return clinicians.filter(
            c =>
                String(c.clinicianno || '').toLowerCase().includes(q) ||
                String(c.clinician_name || '').toLowerCase().includes(q)
        );
    }, [clinicians, searchQuery]);

    useEffect(() => {
        setSearchResults(filteredSearchResults);
    }, [filteredSearchResults]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleAddClick = () => {
        setIsEdit(false);
        setIsView(false);
        setFormData({ id: '', clinicianno: '', clinician_name: '', doctor_name_as_per_heartbeat: '', department_id: '' });
        setSelectedFromList(false);
        setSearchQuery('');
        setShowSearchDropdown(false);
        setIsModalOpen(true);
    };

    const handleSelectClinician = (c) => {
        setSelectedFromList(true);
        const deptId = c.department_id != null && c.department_id !== '' ? c.department_id : '';
        setFormData(prev => ({
            ...prev,
            id: c.id,
            clinicianno: c.clinicianno,
            clinician_name: c.clinician_name || prev.clinician_name,
            doctor_name_as_per_heartbeat: c.doctor_name_as_per_heartbeat ?? prev.doctor_name_as_per_heartbeat,
            department_id: deptId
        }));
        setSearchQuery(String(c.clinicianno));
        setShowSearchDropdown(false);
    };

    const handleUseNewId = () => {
        const no = searchQuery.trim();
        if (!no) return;
        setFormData(prev => ({ ...prev, clinicianno: no }));
        setShowSearchDropdown(false);
    };

    const handleEditClick = async (clinician) => {
        setIsEdit(true);
        setIsView(false);
        const fresh = await fetchClinicianById(clinician.id);
        const data = fresh || normalizeClinician(clinician);
        const deptId = data.department_id != null && data.department_id !== '' ? Number(data.department_id) : '';
        setFormData({
            id: data.id,
            clinicianno: data.clinicianno,
            clinician_name: data.clinician_name || '',
            doctor_name_as_per_heartbeat: data.doctor_name_as_per_heartbeat || '',
            department_id: deptId
        });
        setSearchQuery('');
        setIsModalOpen(true);
    };

    const handleViewClick = async (clinician) => {
        setIsView(true);
        setIsEdit(false);
        const fresh = await fetchClinicianById(clinician.id);
        const data = fresh || normalizeClinician(clinician);
        const deptId = data.department_id != null && data.department_id !== '' ? Number(data.department_id) : '';
        setFormData({
            id: data.id,
            clinicianno: data.clinicianno,
            clinician_name: data.clinician_name || '',
            doctor_name_as_per_heartbeat: data.doctor_name_as_per_heartbeat || '',
            department_id: deptId
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const rawDeptId = formData.department_id;
            const departmentIdNum =
                rawDeptId !== '' && rawDeptId != null && String(rawDeptId) !== 'undefined' && !isNaN(Number(rawDeptId))
                    ? Number(rawDeptId)
                    : null;
            const payload = {
                clinicianno: formData.clinicianno.trim(),
                clinician_name: formData.clinician_name.trim(),
                doctor_name_as_per_heartbeat: (formData.doctor_name_as_per_heartbeat || '').trim(),
                ...(departmentIdNum != null && { department_id: departmentIdNum })
            };
            if (!payload.clinicianno || !payload.clinician_name) {
                toast.error('Clinician No and Clinician Name are required.');
                setIsSubmitting(false);
                return;
            }
            if (payload.department_id == null) {
                toast.error('Please select a department.');
                setIsSubmitting(false);
                return;
            }
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/api/clinicians/${formData.id}` : '/api/clinicians';
            const response = await fetch(url, {
                method,
                headers: headers(),
                body: JSON.stringify(payload)
            });
            const respData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(respData.message || respData.error || 'Operation failed');
            }
            await fetchClinicians();
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDepartmentName = (departmentId) => {
        if (departmentId == null || departmentId === '') return '–';
        const d = departments.find(dep => Number(dep.department_id) === Number(departmentId));
        return d ? d.department_name : departmentId;
    };

    return (
        <div className="flex-col gap-md">
            <div className="flex justify-between items-center flex-wrap gap-sm">
                <p className="text-muted">Manage clinicians. Search by clinician ID to add or update; name and department are editable.</p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={() => { setIsLoading(true); Promise.all([fetchClinicians(), fetchDepartments()]).finally(() => setIsLoading(false)); }}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <AdminBulkUpload
                        columnDefs={CLINICIAN_BULK_COLUMNS}
                        exampleRow={CLINICIAN_BULK_EXAMPLE}
                        helpIntro="Row 1 = headings on the first sheet. Use the titles below, or the alternate headings under each column. Data starts on row 2—one clinician per row."
                        helpFooter="Department ID must be the numeric id from Department Management (same as when adding a clinician manually). Upload sends one Excel file to the server (.xlsx or .xls); results show inserted/updated counts and any row errors."
                        postUrl="/api/clinicians/import"
                        getHeaders={headers}
                        multipartImport
                        showAliasesInHelp
                        disabled={isLoading}
                        onComplete={fetchClinicians}
                    />
                    <Button className="dr-btn-add" onClick={handleAddClick}>Add Clinician</Button>
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
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Clinician No</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Clinician Name</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Doctor Name (Heartbeat)</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>Department</th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Loading clinicians...
                                </td>
                            </tr>
                        ) : clinicians.length > 0 ? (
                            clinicians.map((c, index) => (
                                <tr key={c.id ?? c.clinicianno} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                                    <td style={{ padding: '16px 24px' }} className="text-muted">{index + 1}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ background: 'var(--status-info-bg)', color: 'var(--primary-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            {c.clinicianno}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{c.clinician_name || '–'}</td>
                                    <td style={{ padding: '16px 24px' }}>{c.doctor_name_as_per_heartbeat || '–'}</td>
                                    <td style={{ padding: '16px 24px' }}>{getDepartmentName(c.department_id)}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button type="button" className="text-primary text-sm font-medium" onClick={() => handleViewClick(c)} style={{ marginRight: '12px' }}>
                                            View
                                        </button>
                                        <button type="button" className="text-primary text-sm font-medium" onClick={() => handleEditClick(c)}>
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {!error && "No clinicians found. Add one to get started."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="clinician-modal-overlay">
                    <div className="clinician-modal card">
                        <div className="clinician-modal-header">
                            <h3 className="clinician-modal-title">
                                {isView ? 'View Clinician' : isEdit ? 'Edit Clinician' : 'Add Clinician'}
                            </h3>
                            <button
                                type="button"
                                className="clinician-modal-close"
                                onClick={() => setIsModalOpen(false)}
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="clinician-form flex-col">
                            {/* Clinician No: read-only when selected from list or Edit/View; user-typed stays editable */}
                            <div className="form-field flex-col gap-sm">
                                <label className="form-label text-sm font-medium text-muted">Clinician No</label>
                                {isEdit || isView || selectedFromList ? (
                                    <input
                                        type="text"
                                        value={formData.clinicianno}
                                        readOnly
                                        className="form-input form-input-readonly"
                                    />
                                ) : (
                                    <div className="form-search-wrap">
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.clinicianno || searchQuery}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setSearchQuery(v);
                                                setFormData(prev => ({ ...prev, clinicianno: v }));
                                                setShowSearchDropdown(true);
                                            }}
                                            onFocus={() => setShowSearchDropdown(true)}
                                            placeholder="Search by clinician no or name, or type new"
                                        />
                                        {showSearchDropdown && (
                                            <div className="form-search-dropdown">
                                                {searchResults.slice(0, 10).map(c => (
                                                    <div
                                                        key={c.id ?? c.clinicianno}
                                                        role="option"
                                                        className="form-search-option"
                                                        onClick={() => handleSelectClinician(c)}
                                                    >
                                                        <span className="form-search-option-id">{c.clinicianno}</span>
                                                        {c.clinician_name && <span className="form-search-option-name"> – {c.clinician_name}</span>}
                                                    </div>
                                                ))}
                                                {searchQuery.trim() && searchResults.length === 0 && (
                                                    <div className="form-search-option form-search-option-action">
                                                        <button
                                                            type="button"
                                                            className="form-search-use-new"
                                                            onClick={handleUseNewId}
                                                        >
                                                            Use &quot;{searchQuery.trim()}&quot; as new Clinician No
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-field flex-col gap-sm">
                                <label className="form-label text-sm font-medium text-muted">Clinician Name <span className="form-required">*</span></label>
                                <input
                                    type="text"
                                    name="clinician_name"
                                    className={`form-input ${isView ? 'form-input-readonly' : ''}`}
                                    value={formData.clinician_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Dr. John Smith"
                                    required
                                    readOnly={isView}
                                />
                            </div>

                            <div className="form-field flex-col gap-sm">
                                <label className="form-label text-sm font-medium text-muted">Doctor Name (as per Heartbeat)</label>
                                <input
                                    type="text"
                                    name="doctor_name_as_per_heartbeat"
                                    className={`form-input ${isView ? 'form-input-readonly' : ''}`}
                                    value={formData.doctor_name_as_per_heartbeat}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Name as in Heartbeat system"
                                    readOnly={isView}
                                />
                            </div>

                            <div className="form-field flex-col gap-sm">
                                <label className="form-label text-sm font-medium text-muted">Department <span className="form-required">*</span></label>
                                <div className="form-select-wrap">
                                    <select
                                        name="department_id"
                                        value={formData.department_id ?? ''}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isView}
                                        className={`form-select ${isView ? 'form-input-readonly' : ''}`}
                                    >
                                        <option value="">Select department</option>
                                        {departments
                                            .filter(d => d.department_id != null && d.department_id !== '')
                                            .map(d => (
                                                <option key={d.department_id} value={Number(d.department_id)}>{d.department_name}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {!isView && (
                                <div className="clinician-form-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setIsModalOpen(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <Button type="submit" disabled={isSubmitting || (!isEdit && !formData.clinicianno)}>
                                        {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Clinician')}
                                    </Button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .clinician-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(15, 23, 42, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }

                .clinician-modal {
                    width: 440px;
                    max-width: 90vw;
                    animation: slideUp 0.3s ease-out;
                    padding: var(--spacing-lg);
                }

                .clinician-modal:hover {
                    transform: none;
                }

                .clinician-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-lg);
                }

                .clinician-modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-main);
                }

                .clinician-modal-close {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-sm);
                    color: var(--text-muted);
                    font-size: 1.5rem;
                    line-height: 1;
                    transition: background 0.2s, color 0.2s;
                }

                .clinician-modal-close:hover {
                    background: var(--bg-hover);
                    color: var(--text-main);
                }

                .clinician-form {
                    gap: var(--spacing-md);
                }

                .form-field {
                    gap: 6px;
                }

                .form-label {
                    display: block;
                }

                .form-required {
                    color: var(--status-error);
                }

                .form-input,
                .form-select {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border-color);
                    background-color: var(--bg-card);
                    color: var(--text-main);
                    font-size: var(--font-size-sm);
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .form-input:focus,
                .form-select:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px var(--status-info-bg);
                }

                .form-input-readonly,
                .form-select.form-input-readonly {
                    background-color: var(--bg-hover);
                    cursor: not-allowed;
                }

                .form-select-wrap {
                    position: relative;
                    width: 100%;
                }

                .form-select-wrap .form-select {
                    padding-right: 40px;
                    cursor: pointer;
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                }

                .form-search-wrap {
                    position: relative;
                    width: 100%;
                }

                .form-search-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    margin-top: 6px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    max-height: 220px;
                    overflow-y: auto;
                    z-index: 10;
                    box-shadow: var(--shadow-lg);
                }

                .form-search-option {
                    padding: 12px 16px;
                    cursor: pointer;
                    border-bottom: 1px solid var(--bg-hover);
                    font-size: var(--font-size-sm);
                    transition: background 0.15s;
                }

                .form-search-option:last-child {
                    border-bottom: none;
                }

                .form-search-option:hover {
                    background: var(--bg-hover);
                }

                .form-search-option-id {
                    font-weight: 600;
                    color: var(--text-main);
                }

                .form-search-option-name {
                    color: var(--text-muted);
                }

                .form-search-option-action {
                    border-bottom: none;
                }

                .form-search-use-new {
                    background: none;
                    border: none;
                    color: var(--primary-color);
                    font-weight: 500;
                    font-size: inherit;
                    cursor: pointer;
                    padding: 0;
                }

                .form-search-use-new:hover {
                    text-decoration: underline;
                }

                .clinician-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-md);
                    padding-top: var(--spacing-md);
                    border-top: 1px solid var(--border-color);
                }
            `}</style>
        </div>
    );
};

export default ClinicianList;
