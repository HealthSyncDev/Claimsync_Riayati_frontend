import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProfileEditModal from '../user/dashboard/ProfileEditModal';
import Button from '../../components/common/Button';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const [showEditModal, setShowEditModal] = useState(false);

    if (!user) {
        return (
            <div className="settings-page">
                <p className="text-body">Please log in to view your profile.</p>
            </div>
        );
    }

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.userName || user.name || user.email || '—';
    const userEmail = user.email || '—';
    const roleLabel = (user.roleName || user.role || '—').replace(/\b\w/g, (c) => c.toUpperCase());
    const initials = (displayName && displayName !== '—'
        ? displayName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('')
        : 'U');
    const canEditProfile = user.role !== 'admin' && (user.userId || user.id); // profile update API may not apply to admin
    const fields = [
        { label: 'Full Name', value: displayName },
        { label: 'Arabic Name', value: user.arabicName || '—' },
        { label: 'Email', value: userEmail },
        { label: 'Mobile', value: user.mobile || user.phone || '—' },
        { label: 'Role', value: roleLabel },
        { label: 'Office / Branch', value: user.officeName || (user.officeId ? `Office #${user.officeId}` : '—') },
        { label: 'Designation', value: user.designationName || (user.designationId ? `#${user.designationId}` : '—') },
        { label: 'Department', value: user.departmentName || (user.departmentId ? `#${user.departmentId}` : '—') },
        { label: 'User ID', value: user.userId || user.id || '—' },
    ];

    const handleProfileSave = async () => {
        const uid = user.userId || user.id;
        if (uid) {
            try {
                const res = await fetch(`/api/users/${uid}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    updateUser({ ...data, role: data.roleName?.toLowerCase() || data.role });
                }
            } catch (e) {
                console.error('Failed to refresh profile', e);
            }
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-shell">
                <div className="settings-hero">
                    <div className="settings-hero-left">
                        <h1 className="settings-title">Settings</h1>
                        <p className="settings-subtitle">
                            Manage your account profile and workspace preferences.
                        </p>
                    </div>
                    {canEditProfile && (
                        <Button variant="primary" onClick={() => setShowEditModal(true)}>
                            Edit Profile
                        </Button>
                    )}
                </div>

                <div className="settings-grid">
                    <section className="settings-card profile-card">
                        <div className="profile-head">
                            <div className="profile-avatar">{initials}</div>
                            <div className="profile-meta">
                                <h2>{displayName}</h2>
                                <p>{userEmail}</p>
                                <span className="role-pill">{roleLabel}</span>
                            </div>
                        </div>
                        <div className="profile-stats">
                            <div className="stat-box">
                                <span className="stat-label">Office</span>
                                <span className="stat-value">{user.officeName || 'Not assigned'}</span>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">Department</span>
                                <span className="stat-value">{user.departmentName || 'Not assigned'}</span>
                            </div>
                        </div>
                    </section>

                    <section className="settings-card details-card">
                        <div className="card-head">
                            <h3>Profile Details</h3>
                            <p>Logged in as {userEmail}</p>
                        </div>
                        <div className="detail-grid">
                            {fields.map(({ label, value }) => (
                                <div key={label} className="detail-item">
                                    <span className="detail-label">{label}</span>
                                    <p className="detail-value">{value}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="settings-card section-card">
                        <div className="card-head">
                            <h3>Account</h3>
                            <p>Identity and organization access</p>
                        </div>
                        <div className="setting-row">
                            <div>
                                <h4>Account Type</h4>
                                <span>{roleLabel}</span>
                            </div>
                            <span className="chip">Managed</span>
                        </div>
                        <div className="setting-row">
                            <div>
                                <h4>User Identifier</h4>
                                <span>{user.userId || user.id || '—'}</span>
                            </div>
                        </div>
                    </section>

                    <section className="settings-card section-card">
                        <div className="card-head">
                            <h3>Security</h3>
                            <p>Session and authentication status</p>
                        </div>
                        <div className="setting-row">
                            <div>
                                <h4>Session State</h4>
                                <span>Active</span>
                            </div>
                            <span className="chip chip-success">Secure</span>
                        </div>
                        <div className="setting-row">
                            <div>
                                <h4>Authentication</h4>
                                <span>Token based</span>
                            </div>
                        </div>
                    </section>

                    <section className="settings-card section-card">
                        <div className="card-head">
                            <h3>Preferences</h3>
                            <p>Interface and productivity defaults</p>
                        </div>
                        <div className="setting-row">
                            <div>
                                <h4>Language</h4>
                                <span>English</span>
                            </div>
                        </div>
                        <div className="setting-row">
                            <div>
                                <h4>Timezone</h4>
                                <span>Local browser timezone</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <ProfileEditModal
                user={user}
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSave={handleProfileSave}
            />
            <style>{`
                .settings-shell {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .settings-hero {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .settings-title {
                    margin: 0;
                    font-size: 1.5rem;
                    color: var(--text-main);
                    letter-spacing: -0.01em;
                }

                .settings-subtitle {
                    margin: 6px 0 0 0;
                    color: var(--text-muted);
                    font-size: 0.92rem;
                }

                .settings-grid {
                    display: grid;
                    grid-template-columns: repeat(12, minmax(0, 1fr));
                    gap: 16px;
                }

                .settings-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    box-shadow: var(--shadow-card);
                    padding: 18px;
                }

                .profile-card {
                    grid-column: span 4;
                }

                .details-card {
                    grid-column: span 8;
                }

                .section-card {
                    grid-column: span 4;
                }

                .profile-head {
                    display: flex;
                    gap: 14px;
                    align-items: center;
                    margin-bottom: 14px;
                }

                .profile-avatar {
                    width: 52px;
                    height: 52px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    color: #fff;
                    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                    box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
                }

                .profile-meta h2 {
                    margin: 0;
                    font-size: 1.02rem;
                    color: var(--text-main);
                }

                .profile-meta p {
                    margin: 3px 0 8px 0;
                    font-size: 0.82rem;
                    color: var(--text-muted);
                }

                .role-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: #1d4ed8;
                    background: #dbeafe;
                }

                .profile-stats {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 10px;
                }

                .stat-box {
                    border: 1px solid var(--border-subtle);
                    border-radius: 10px;
                    padding: 10px 12px;
                    background: #f8fbff;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .stat-label {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .stat-value {
                    font-size: 0.9rem;
                    color: var(--text-main);
                    font-weight: 600;
                }

                .card-head {
                    margin-bottom: 14px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--border-subtle);
                }

                .card-head h3 {
                    margin: 0;
                    font-size: 1rem;
                    color: var(--text-main);
                }

                .card-head p {
                    margin: 4px 0 0 0;
                    font-size: 0.82rem;
                    color: var(--text-muted);
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 12px;
                }

                .detail-item {
                    border: 1px solid var(--border-subtle);
                    border-radius: 10px;
                    padding: 10px 12px;
                    background: #ffffff;
                }

                .detail-label {
                    display: block;
                    color: var(--text-muted);
                    font-size: 0.72rem;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    margin-bottom: 4px;
                }

                .detail-value {
                    margin: 0;
                    color: var(--text-main);
                    font-size: 0.9rem;
                    font-weight: 600;
                    word-break: break-word;
                }

                .setting-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    border: 1px solid var(--border-subtle);
                    border-radius: 10px;
                    padding: 12px;
                    margin-bottom: 10px;
                    background: #ffffff;
                }

                .setting-row:last-child {
                    margin-bottom: 0;
                }

                .setting-row h4 {
                    margin: 0;
                    font-size: 0.88rem;
                    color: var(--text-main);
                }

                .setting-row span {
                    display: block;
                    margin-top: 2px;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }

                .chip {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px 10px;
                    border-radius: 999px;
                    border: 1px solid var(--border-color);
                    background: #f8fafc;
                    color: var(--text-body);
                    font-size: 0.72rem;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .chip-success {
                    color: #047857;
                    border-color: #a7f3d0;
                    background: #ecfdf5;
                }

                @media (max-width: 1080px) {
                    .profile-card {
                        grid-column: span 12;
                    }

                    .details-card {
                        grid-column: span 12;
                    }

                    .section-card {
                        grid-column: span 6;
                    }
                }

                @media (max-width: 768px) {
                    .settings-hero {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .section-card {
                        grid-column: span 12;
                    }
                }
            `}</style>
        </div>
    );
};

export default Settings;
