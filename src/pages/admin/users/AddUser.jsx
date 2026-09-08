import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Button from '../../../components/common/Button';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import Toast from '../../../components/common/Toast';
import { toast } from '../../../utils/confirm';

const SYSTEM_ROLES = {
    ADMINISTRATOR: 'Administrator',
    CLINICIAN: 'Clinician',
};

/** Map API / legacy roleId → systemRole string */
const resolveSystemRole = (user = {}) => {
    if (user.systemRole === SYSTEM_ROLES.ADMINISTRATOR || user.systemRole === SYSTEM_ROLES.CLINICIAN) {
        return user.systemRole;
    }
    if (Number(user.roleId) === 1 || /admin/i.test(user.roleName || '')) {
        return SYSTEM_ROLES.ADMINISTRATOR;
    }
    return SYSTEM_ROLES.CLINICIAN;
};

const UserForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    // Determine mode based on URL
    const isEdit = !!id && location.pathname.includes('/edit');
    const isViewMode = !!id && location.pathname.includes('/view');
    const isAdd = !id;

    const [loading, setLoading] = useState(false);
    // initialLoading moved below to use preloadedUser
    const [error, setError] = useState(null);

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        isDanger: false,
        onConfirm: null
    });

    // Toast State
    const [toast, setToast] = useState(null);

    // Resources
    const [offices, setOffices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [designations, setDesignations] = useState([]);

    // Check for preloaded user data from navigation state
    const preloadedUser = location.state?.user;

    const [formData, setFormData] = useState(() => {
        if (preloadedUser) {
            const systemRole = resolveSystemRole(preloadedUser);
            return {
                userLabel: preloadedUser.userLabel || '',
                username: preloadedUser.username || '',
                password: '',
                email: preloadedUser.email || '',
                mobile: preloadedUser.mobile || '',
                // IDs might be missing in list view object, default to existing or empty
                roleId: preloadedUser.roleId ?? 2,
                systemRole,
                clinicianno:
                    systemRole === SYSTEM_ROLES.CLINICIAN
                        ? (preloadedUser.clinicianno || preloadedUser.clinicianNo || '')
                        : '',
                officeId: preloadedUser.officeId || '',
                designationId: preloadedUser.designationId || '',
                categoryId: preloadedUser.categoryId || '',
                employeeId: preloadedUser.employeeId || '',
                userCode: preloadedUser.userCode || '',
                userType: preloadedUser.userType || 'EMPLOYEE',
                licence: preloadedUser.licence || '',
                arabicName: preloadedUser.arabicName || '',
                sign: preloadedUser.sign || '',
                stamp: preloadedUser.stamp || '',
                permission: preloadedUser.permission || 'Office',
                activeUser: preloadedUser.activeUser !== undefined ? preloadedUser.activeUser : true
            };
        }
        return {
            userLabel: '',
            username: '',
            password: '',
            email: '',
            mobile: '',
            roleId: 2,
            systemRole: SYSTEM_ROLES.CLINICIAN,
            clinicianno: '',
            officeId: '',
            designationId: '',
            categoryId: '',
            employeeId: '',
            userCode: '',
            userType: 'EMPLOYEE',
            licence: '',
            arabicName: '',
            sign: '',
            stamp: '',
            permission: 'Office',
            activeUser: true
        };
    });

    // If we have preloaded data, don't show the initial loading spinner
    const [initialLoading, setInitialLoading] = useState(!preloadedUser);

    useEffect(() => {
        const loadData = async () => {
            // Only show spinner if we have absolutely no data to show
            if (!preloadedUser) setInitialLoading(true);

            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No authentication token found');

                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                };

                // Fetch Resources (Offices, Categories, Designations)
                // We always fetch these to populate dropdowns
                const [officesRes, categoriesRes, designationsRes] = await Promise.all([
                    fetch('/api/offices', { headers }),
                    fetch('/api/categories', { headers }),
                    fetch('/api/designations', { headers })
                ]);

                if (officesRes.ok) {
                    const data = await officesRes.json();
                    setOffices(Array.isArray(data) ? data : []);
                }
                if (categoriesRes.ok) {
                    const data = await categoriesRes.json();
                    setCategories(Array.isArray(data) ? data : []);
                }
                if (designationsRes.ok) {
                    const data = await designationsRes.json();
                    setDesignations(Array.isArray(data) ? data : []);
                }

                // If Editing or Viewing, fetch FRESH User Data to ensure we have all fields
                if (id) {
                    const userRes = await fetch(`/api/users/${id}`, { headers });
                    if (!userRes.ok) throw new Error('Failed to load user data');
                    const userData = await userRes.json();
                    const systemRole = resolveSystemRole(userData);

                    setFormData(prev => ({
                        ...prev, // Keep existing if partial
                        userLabel: userData.userLabel || '',
                        username: userData.username || '',
                        // Password is never sent back
                        email: userData.email || '',
                        mobile: userData.mobile || '',
                        roleId: userData.roleId ?? 2,
                        systemRole,
                        // Stale clinicianno from API is discarded when role is not Clinician
                        clinicianno:
                            systemRole === SYSTEM_ROLES.CLINICIAN
                                ? (userData.clinicianno || userData.clinicianNo || '')
                                : '',
                        officeId: userData.officeId || '',
                        designationId: userData.designationId || '',
                        categoryId: userData.categoryId || '',
                        employeeId: userData.employeeId || '',
                        userCode: userData.userCode || '',
                        userType: userData.userType || 'EMPLOYEE',
                        licence: userData.licence || '',
                        arabicName: userData.arabicName || '',
                        sign: userData.sign || '',
                        stamp: userData.stamp || '',
                        permission: userData.permission || 'Office',
                        activeUser: userData.activeUser !== undefined ? userData.activeUser : true
                    }));
                }

            } catch (err) {
                console.error("Load Data Error:", err);
                // Only show error text if we have no data at all
                if (!preloadedUser) setError(err.message);
            } finally {
                setInitialLoading(false);
            }
        };

        loadData();
    }, [id, isAdd]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const next = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };
            // Clear clinician number when leaving Clinician role
            if (name === 'systemRole' && value !== SYSTEM_ROLES.CLINICIAN) {
                next.clinicianno = '';
            }
            return next;
        });
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    [field]: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const executeStatusChange = async (newStatus) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const action = newStatus ? 'activate' : 'deactivate';

            const response = await fetch(`/api/users/${id}/${action}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (!response.ok) throw new Error(`Failed to ${action} user`);

            setFormData(prev => ({ ...prev, activeUser: newStatus }));
            setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Something went wrong');
            setModalConfig(prev => ({ ...prev, isOpen: false }));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = () => {
        if (!id) return;
        const newStatus = !formData.activeUser;
        const confirmTitle = newStatus ? "Activate User" : "Deactivate User";
        const confirmMsg = newStatus
            ? "Are you sure you want to activate this user account?"
            : "Are you sure you want to deactivate this user? They will no longer be able to login to the system.";

        setModalConfig({
            isOpen: true,
            title: confirmTitle,
            message: confirmMsg,
            isDanger: !newStatus,
            onConfirm: () => executeStatusChange(newStatus)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const url = isEdit ? `/api/users/${id}` : '/api/users';
            // Trying specific update endpoint as standard ID paths failed
            const method = isEdit ? 'PUT' : 'POST';

            const systemRole = String(formData.systemRole || '').trim();
            const isAdministrator = systemRole === SYSTEM_ROLES.ADMINISTRATOR;
            const isClinician = systemRole === SYSTEM_ROLES.CLINICIAN;
            const clinicianValue = (formData.clinicianno ?? '').trim();

            // Admin update MUST clear clinician id in DB → send JSON null (never "")
            const cliniciannoPayload = isAdministrator || !isClinician
                ? null
                : (clinicianValue || null);

            // roleId unchanged; systemRole + clinicianno are the new columns
            const payload = {
                employeeId: formData.employeeId,
                username: formData.username,
                userCode: formData.userCode,
                userLabel: formData.userLabel,
                userType: formData.userType,
                officeId: Number(formData.officeId),
                designationId: Number(formData.designationId),
                categoryId: Number(formData.categoryId),
                licence: formData.licence,
                sign: formData.sign,
                stamp: formData.stamp,
                arabicName: formData.arabicName,
                email: formData.email,
                mobile: formData.mobile,
                permission: formData.permission,
                systemRole,
                clinicianno: cliniciannoPayload,
                roleId: Number(formData.roleId),
            };

            // Password optional (autogenerated for new users / omit when empty on update)
            if (formData.password) payload.password = formData.password;
            if (formData.activeUser !== undefined) payload.activeUser = formData.activeUser;

            // Final guard: Administrator update always includes "clinicianno":null
            if (isAdministrator) {
                payload.clinicianno = null;
            }

            const body = JSON.stringify(payload);

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body
            });

            if (!response.ok) {
                const text = await response.text();
                let errData;
                try {
                    errData = text ? JSON.parse(text) : {};
                } catch (e) {
                    throw new Error(text || `Server Error: ${response.status}`);
                }

                if (errData.errors && Array.isArray(errData.errors)) {
                    const errorMessages = errData.errors
                        .map(err => `${err.field}: ${err.defaultMessage}`)
                        .join('\n');
                    throw new Error(errorMessages || 'Validation failed');
                }

                throw new Error(errData.message || 'Operation failed');
            }

            // Success
            // Success
            setToast({
                message: isEdit ? 'User updated successfully!' : 'New user created successfully!',
                type: 'success'
            });

            // Navigate after short delay to let user see the toast
            setTimeout(() => {
                navigate('/admin/users');
            }, 1500);
        } catch (err) {
            console.error("Save User Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="flex-col gap-lg fade-in">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-md">
                <div className="flex items-center gap-md">
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="btn btn-secondary back-nav-btn"
                    >
                        <span>←</span> Back
                    </button>
                    <div className="separator"></div>
                    <div>
                        <h1 className="text-xl font-bold text-main" style={{ margin: 0, lineHeight: 1.2 }}>
                            {isViewMode ? 'User Details' : isEdit ? 'Edit User' : 'Create User'}
                        </h1>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <span className="icon">⚠️</span> {error}
                </div>
            )}

            <div className="card">
                <form onSubmit={handleSubmit} className="form-layout">
                    <fieldset disabled={isViewMode} className="form-contents">
                        {/* Section 1: Identity */}
                        <div className="form-section">
                            <div className="section-header">
                                <h3 className="section-title">Identity</h3>
                                <p className="section-desc">Basic identification details for the user.</p>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Employee ID <span className="req">*</span></label>
                                    <input
                                        name="employeeId"
                                        value={formData.employeeId}
                                        onChange={handleChange}
                                        placeholder="e.g. EMP001"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>User Code <span className="req">*</span></label>
                                    <input
                                        name="userCode"
                                        value={formData.userCode}
                                        onChange={handleChange}
                                        placeholder="e.g. USR001"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Full Name <span className="req">*</span></label>
                                    <input
                                        name="userLabel"
                                        value={formData.userLabel}
                                        onChange={handleChange}
                                        placeholder="Dr. John Doe"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Arabic Name</label>
                                    <input
                                        name="arabicName"
                                        value={formData.arabicName}
                                        onChange={handleChange}
                                        dir="rtl"
                                        placeholder="Type in Arabic..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Account & Role */}
                        <div className="form-section">
                            <div className="section-header">
                                <h3 className="section-title">Account & Security</h3>
                                <p className="section-desc">Login credentials and system access roles.</p>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Username <span className="req">*</span></label>
                                    <input
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="johndoe"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>User Type <span className="req">*</span></label>
                                    <div className="select-wrapper">
                                        <select
                                            name="userType"
                                            value={formData.userType}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="EMPLOYEE">Employee</option>
                                            <option value="CONSULTANT">Consultant</option>
                                            <option value="EXTERNAL">External</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email Address <span className="req">*</span></label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="user@hospital.com"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>System Role <span className="req">*</span></label>
                                    <div className="select-wrapper">
                                        <select
                                            name="systemRole"
                                            value={formData.systemRole}
                                            onChange={handleChange}
                                            required
                                            disabled={isViewMode}
                                        >
                                            <option value={SYSTEM_ROLES.ADMINISTRATOR}>Administrator</option>
                                            <option value={SYSTEM_ROLES.CLINICIAN}>Clinician</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Permission</label>
                                    <div className="select-wrapper">
                                        <select
                                            name="permission"
                                            value={formData.permission || 'Office'}
                                            onChange={handleChange}
                                            disabled={isViewMode}
                                        >
                                            <option value="Office">Office</option>
                                            <option value="All">All Office</option>
                                        </select>
                                    </div>
                                </div>
                                {formData.systemRole === SYSTEM_ROLES.CLINICIAN && (
                                    <div className="form-group form-group--reveal" key="clinicianno">
                                        <label htmlFor="clinicianno">
                                            Clinician Number <span className="req">*</span>
                                        </label>
                                        <input
                                            id="clinicianno"
                                            name="clinicianno"
                                            value={formData.clinicianno}
                                            onChange={handleChange}
                                            placeholder="e.g. CLN001"
                                            required
                                            disabled={isViewMode}
                                            autoComplete="off"
                                        />
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Section 3: Professional Info */}
                        <div className="form-section">
                            <div className="section-header">
                                <h3 className="section-title">Professional Info</h3>
                                <p className="section-desc">Department, designation, and categorization.</p>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Office / Branch <span className="req">*</span></label>
                                    <div className="select-wrapper">
                                        <select
                                            name="officeId"
                                            value={formData.officeId}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select Office...</option>
                                            {offices.map(o => (
                                                <option key={o.officeId} value={o.officeId}>{o.officeName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Designation <span className="req">*</span></label>
                                    <div className="select-wrapper">
                                        <select
                                            name="designationId"
                                            value={formData.designationId}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select Designation...</option>
                                            {designations.map(d => (
                                                <option key={d.designationId} value={d.designationId}>{d.designationName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Category <span className="req">*</span></label>
                                    <div className="select-wrapper">
                                        <select
                                            name="categoryId"
                                            value={formData.categoryId}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select Category...</option>
                                            {categories.map(c => (
                                                <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Mobile Number</label>
                                    <input
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Documents & Status */}
                        <div className="form-section">
                            <div className="section-header">
                                <h3 className="section-title">Documents & Status</h3>
                                <p className="section-desc">Upload signatures, stamps, and set account status.</p>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Professional Licence</label>
                                    <input
                                        name="licence"
                                        value={formData.licence}
                                        onChange={handleChange}
                                        placeholder="Licence No."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="mb-sm">Account Status</label>
                                    {isAdd ? (
                                        <div className="status-readonly-card">
                                            <span className="status-indicator active">● Active</span>
                                            <span className="text-muted text-xs">New accounts are active by default.</span>
                                        </div>
                                    ) : (
                                        <div className="status-action-card">
                                            <div className={`status-indicator ${formData.activeUser ? 'active' : 'inactive'}`}>
                                                {formData.activeUser ? '● Active' : '● Inactive'}
                                            </div>
                                            {!isViewMode && (
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${formData.activeUser ? 'btn-danger-outline' : 'btn-success-outline'}`}
                                                    onClick={handleToggleStatus}
                                                    disabled={loading}
                                                >
                                                    {formData.activeUser ? 'Deactivate Account' : 'Activate Account'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Digital Signature</label>
                                    {!isViewMode && (
                                        <div className="file-input-wrapper">
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'sign')} />
                                        </div>
                                    )}
                                    {formData.sign && formData.sign.length > 100 ? (
                                        <div className="file-preview-badge success">✓ Signature Uploaded</div>
                                    ) : (
                                        isViewMode && <div className="text-muted text-sm">No signature available</div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Official Stamp</label>
                                    {!isViewMode && (
                                        <div className="file-input-wrapper">
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'stamp')} />
                                        </div>
                                    )}
                                    {formData.stamp && formData.stamp.length > 100 ? (
                                        <div className="file-preview-badge success">✓ Stamp Uploaded</div>
                                    ) : (
                                        isViewMode && <div className="text-muted text-sm">No stamp available</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* Footer Actions */}
                    <div className="form-actions">
                        {isViewMode ? (
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/users')}>
                                ← Back to List
                            </button>
                        ) : (
                            <>
                                <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/users')}>
                                    Cancel
                                </button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create User')}
                                </Button>
                            </>
                        )}
                    </div>
                </form>
            </div>

            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                isDanger={modalConfig.isDanger}
                onConfirm={modalConfig.onConfirm}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                confirmText={modalConfig.isDanger ? 'Deactivate' : 'Activate'}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <style>{`
                .status-action-card, .status-readonly-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--spacing-sm) var(--spacing-md);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    background: var(--bg-card);
                }
                .status-readonly-card {
                    justify-content: flex-start;
                    gap: var(--spacing-md);
                    background: var(--bg-hover);
                }
                .status-indicator {
                    font-weight: 600;
                    font-size: var(--font-size-sm);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .status-indicator.active { color: var(--status-success); }
                .status-indicator.inactive { color: var(--status-error); }

                .btn-success-outline {
                    border: 1px solid var(--status-success);
                    color: var(--status-success);
                    background: transparent;
                    font-size: var(--font-size-xs);
                    padding: 4px 10px;
                }
                .btn-success-outline:hover {
                    background: var(--status-success-bg);
                }
                .btn-danger-outline {
                    border: 1px solid var(--status-error);
                    color: var(--status-error);
                    background: transparent;
                    font-size: var(--font-size-xs);
                    padding: 4px 10px;
                }
                .btn-danger-outline:hover {
                    background: var(--status-error-bg);
                }

                .back-nav-btn {
                    padding: var(--spacing-sm) var(--spacing-md);
                    font-size: var(--font-size-sm);
                    color: var(--text-muted);
                    border-color: var(--border-color);
                    display: flex;
                    gap: var(--spacing-xs);
                }
                .back-nav-btn:hover {
                    color: var(--primary-color);
                    border-color: var(--primary-color);
                }
                
                .separator {
                    width: 1px;
                    height: 24px;
                    background-color: var(--border-color);
                    margin: 0 var(--spacing-sm);
                }

                .form-layout {
                    padding: 0;
                }
                
                .form-contents {
                    border: none; margin: 0; padding: 0;
                }

                .form-section {
                    padding: var(--spacing-xl);
                    border-bottom: 1px solid var(--border-color);
                    display: grid;
                    grid-template-columns: 250px 1fr; /* Sidebar description layout */
                    gap: var(--spacing-xl);
                }
                .form-section:last-child {
                    border-bottom: none;
                }
                
                @media (max-width: 900px) {
                    .form-section { grid-template-columns: 1fr; gap: var(--spacing-lg); padding: var(--spacing-lg); }
                }

                .section-header {
                    padding-right: var(--spacing-lg);
                }
                .section-title {
                    font-size: var(--font-size-base);
                    font-weight: var(--font-weight-semibold);
                    color: var(--text-main);
                    margin-bottom: var(--spacing-xs);
                }
                .section-desc {
                    font-size: var(--font-size-sm);
                    color: var(--text-muted);
                    line-height: 1.4;
                    margin: 0;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--spacing-lg);
                }
                @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xs);
                }
                .form-group label {
                    font-size: var(--font-size-sm);
                    font-weight: var(--font-weight-medium);
                    color: var(--text-body);
                }
                .req { color: var(--status-error); margin-left: 2px; }

                .form-group input, 
                .form-group select {
                    padding: 10px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    font-size: var(--font-size-sm);
                    color: var(--text-main);
                    background-color: var(--bg-input);
                    transition: border-color 0.2s, box-shadow 0.2s;
                    width: 100%;
                }
                .form-group input:focus, 
                .form-group select:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px var(--status-info-bg);
                    background-color: var(--bg-card);
                }
                .form-group input:disabled, 
                .form-group select:disabled {
                    background-color: var(--bg-hover);
                    cursor: not-allowed;
                    opacity: 0.7;
                }

                .form-group--reveal {
                    animation: fieldReveal 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes fieldReveal {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .checkbox-card {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--spacing-md);
                    padding: var(--spacing-md);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    background: var(--bg-input);
                    transition: all 0.2s;
                }
                .checkbox-card:hover {
                    border-color: var(--primary-color);
                    background: var(--bg-card);
                }
                .checkbox-card input {
                    margin-top: 4px;
                    accent-color: var(--primary-color);
                }
                .checkbox-content { display: flex; flex-direction: column; }
                .checkbox-title { font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); color: var(--text-main); }
                .checkbox-desc { font-size: var(--font-size-xs); color: var(--text-muted); }

                .file-input-wrapper input {
                    padding: var(--spacing-sm);
                    background: white;
                }

                .file-preview-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 12px;
                    border-radius: var(--radius-full);
                    font-size: var(--font-size-xs);
                    font-weight: var(--font-weight-medium);
                    margin-top: var(--spacing-xs);
                }
                .file-preview-badge.success {
                    background-color: var(--status-success-bg);
                    color: var(--status-success);
                }

                .form-actions {
                    padding: var(--spacing-xl);
                    background-color: var(--bg-hover);
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--spacing-md);
                    border-bottom-left-radius: var(--radius-lg);
                    border-bottom-right-radius: var(--radius-lg);
                }

                .error-banner {
                    padding: var(--spacing-md);
                    background-color: var(--status-error-bg);
                    color: var(--status-error);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--spacing-md);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    font-size: var(--font-size-sm);
                }
                .mb-sm { margin-bottom: var(--spacing-sm); }
            `}</style>
        </div>
    );
};

export default UserForm;
