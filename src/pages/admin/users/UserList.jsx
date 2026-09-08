import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import { confirmAction, toast } from '../../../utils/confirm';

const UserList = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            // Handle potential HTML response
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                // Check if it's the auth page or similar
                if (text.includes("Login") || text.includes("<!DOCTYPE html>")) {
                    throw new Error("Session expired or invalid. Please login again.");
                }
                throw new Error("Server returned an invalid response.");
            }

            if (!response.ok) {
                const text = await response.text();
                let errData;
                try {
                    errData = text ? JSON.parse(text) : {};
                } catch (e) {
                    errData = { message: `Server Error: ${response.status}` };
                }
                throw new Error(errData.message || `Server Error: ${response.status}`);
            }

            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : [];
            } catch (e) {
                console.warn("Invalid JSON response from server", e);
                data = [];
            }

            const userArray = Array.isArray(data) ? data : (data.users || []);
            setUsers(userArray);
        } catch (err) {
            console.error("Fetch Users Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirmAction({
            title: 'Delete this user?',
            description: 'This action cannot be undone.',
            confirmLabel: 'Delete',
        });
        if (!ok) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (response.ok) {
                setUsers(users.filter(user => user.userId !== id));
                toast.success('User deleted');
            } else {
                toast.error('Failed to delete user');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error deleting user');
        }
    };

    const filteredUsers = users.filter(user =>
        (user.userLabel?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.roleName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const activeUsers = users.filter(u => u.activeUser).length;

    return (
        <div className="page-shell">
            <div className="page-header">
                <div className="page-header-text">
                    <h1 className="page-title">User directory</h1>
                    <p className="page-subtitle">Manage system access, roles and employee records.</p>
                </div>
                <div className="page-actions">
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={fetchUsers}
                        disabled={loading}
                        loading={loading}
                    >
                        Refresh
                    </Button>
                    <Button onClick={() => navigate('/admin/users/add')}>
                        Add new user
                    </Button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    <div className="flex-col">
                        <strong>Error Loading Users</strong>
                        <span className="text-sm">{error}</span>
                    </div>
                    <button onClick={fetchUsers} className="retry-btn">Retry</button>
                </div>
            )}

            {/* Content Grid */}
            <div className="dashboard-grid">
                {/* Search & Stats */}
                <div className="card toolbar-card">
                    <div className="search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Find user by name, role, or ID..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="stats-pills">
                        <div className="pill">Total: <strong>{users.length}</strong></div>
                        <div className="pill success">Active: <strong>{activeUsers}</strong></div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="card table-card">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading user data...</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>S.No</th>
                                        <th>User Details</th>
                                        <th>Role & Department</th>
                                        <th>Contact Info</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map((user, index) => (
                                            <UserRow
                                                key={user.userId}
                                                index={index}
                                                user={user}
                                                onView={() => navigate(`/admin/users/view/${user.userId}`, { state: { user } })}
                                                onEdit={() => navigate(`/admin/users/edit/${user.userId}`, { state: { user } })}
                                                onDelete={() => handleDelete(user.userId)}
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="empty-state">
                                                No users found matching "{searchTerm}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .error-banner {
                    background: var(--status-error-bg);
                    color: var(--status-error);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    border: 1px solid rgba(220, 38, 38, 0.2);
                }
                .retry-btn {
                    padding: 4px 12px;
                    border-radius: 4px;
                    border: 1px solid currentColor;
                    background: transparent;
                    color: inherit;
                    cursor: pointer;
                    margin-left: auto;
                    font-size: 0.85rem;
                }
                .retry-btn:hover { background: rgba(0,0,0,0.05); }

                .dashboard-grid {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }

                .toolbar-card {
                    padding: var(--spacing-md);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: var(--spacing-md);
                }

                .search-wrapper {
                    position: relative;
                    flex: 1;
                    min-width: 280px;
                    max-width: 500px;
                }
                .search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    font-size: 1rem;
                }
                .search-input {
                    width: 100%;
                    padding: 10px 12px 10px 38px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    background: var(--bg-hover);
                    color: var(--text-main);
                    font-size: 0.95rem;
                    transition: all 0.2s;
                }
                .search-input:focus {
                    background: var(--bg-card);
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px var(--primary-light);
                    outline: none;
                }

                .stats-pills {
                    display: flex;
                    gap: var(--spacing-sm);
                }
                .pill {
                    padding: 6px 14px;
                    background: var(--bg-hover);
                    border-radius: 20px;
                    font-size: 0.85rem;
                    color: var(--text-body);
                }
                .pill.success {
                    background: var(--status-success-bg);
                    color: var(--status-success);
                }

                .table-card {
                    padding: 0;
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                }
                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 900px;
                }
                .modern-table th {
                    background: var(--bg-hover);
                    padding: 16px 24px;
                    text-align: left;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .modern-table td {
                    padding: 16px 24px;
                    border-bottom: 1px solid var(--bg-hover);
                    vertical-align: middle;
                }
                .modern-table tr:hover td {
                    background: rgba(0,0,0,0.01);
                }
                .modern-table tr:last-child td {
                    border-bottom: none;
                }

                .user-avatar-cell {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1.1rem;
                    text-transform: uppercase;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .loading-state {
                    padding: 4rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                    color: var(--text-muted);
                }
                .spinner {
                    width: 30px;
                    height: 30px;
                    border: 3px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .empty-state {
                    padding: 3rem;
                    text-align: center;
                    color: var(--text-muted);
                    font-style: italic;
                }

                .action-btn-icon {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 4px;
                    transition: background 0.2s;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .action-btn-icon.view { color: var(--text-body); }
                .action-btn-icon.view:hover { background: var(--bg-hover); }
                .action-btn-icon.edit { color: var(--primary-color); }
                .action-btn-icon.edit:hover { background: var(--primary-light); }
                .action-btn-icon.delete { color: var(--status-error); }
                .action-btn-icon.delete:hover { background: var(--status-error-bg); }
            `}</style>
        </div>
    );
};

const UserRow = ({ user, index, onView, onEdit, onDelete }) => {
    const isActive = user.activeUser;
    return (
        <tr>
            <td className="text-muted font-medium">{index + 1}</td>
            <td>
                <div className="flex items-center gap-md">
                    <div className="user-avatar-cell">
                        {user.userLabel ? user.userLabel.charAt(0) : 'U'}
                    </div>
                    <div className="flex-col">
                        <span className="text-main font-bold" style={{ fontSize: '0.95rem' }}>{user.userLabel}</span>
                        <span className="text-xs text-muted">@{user.username}</span>
                    </div>
                </div>
            </td>
            <td>
                <div className="flex-col gap-xs">
                    <span className="text-sm font-medium text-body">{user.roleName || 'N/A'}</span>
                    {user.officeName && (
                        <span className="text-xs text-muted flex items-center gap-xs">
                            🏢 {user.officeName}
                        </span>
                    )}
                </div>
            </td>
            <td>
                <div className="flex-col gap-xs">
                    {user.email && <a href={`mailto:${user.email}`} className="text-xs text-body hover:underline">{user.email}</a>}
                    {user.mobile && <span className="text-xs text-muted">📞 {user.mobile}</span>}
                </div>
            </td>
            <td>
                <div className="flex-col gap-xs">
                    <span style={{
                        backgroundColor: isActive ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
                        color: isActive ? 'var(--status-success)' : 'var(--status-error)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        width: 'fit-content'
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? 'var(--status-success)' : 'var(--status-error)'
                        }}></span>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                    {!isActive && user.deactiveDate && (
                        <span className="text-xs text-muted" title={user.deactiveDate}>
                            Since: {new Date(user.deactiveDate).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </td>
            <td style={{ textAlign: 'right' }}>
                <div className="flex gap-sm justify-end">
                    <button onClick={onView} className="action-btn-icon view" title="View Details">
                        View
                    </button>
                    <button onClick={onEdit} className="action-btn-icon edit" title="Edit User">
                        Edit
                    </button>
                    <button onClick={onDelete} className="action-btn-icon delete" title="Delete User">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default UserList;
