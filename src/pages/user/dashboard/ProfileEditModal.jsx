import React, { useState, useEffect } from 'react';

const ProfileEditModal = ({ user, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        arabicName: '',
        email: '',
        mobile: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            setFormData({
                arabicName: user.arabicName || '',
                email: user.email || '',
                mobile: user.mobile || ''
            });
        }
    }, [user, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');

            // Construct payload merging original user with updates
            const payload = {
                ...user,
                ...formData
            };

            const userId = user?.userId ?? user?.id;
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                onSave();
                onClose();
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h3>Edit Profile</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}
                    <form onSubmit={handleSubmit} id="profile-form">
                        <div className="form-group">
                            <label>Arabic Name / الاسم العربي</label>
                            <input
                                type="text"
                                name="arabicName"
                                value={formData.arabicName}
                                onChange={handleChange}
                                dir="rtl"
                                placeholder="Enter Arabic Name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@example.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Mobile Number</label>
                            <input
                                type="text"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                placeholder="+1234567890"
                            />
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="btn btn-primary" type="submit" form="profile-form" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }
                .modal-container {
                    background: white;
                    width: 100%;
                    max-width: 500px;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-xl);
                    animation: slideUp 0.3s ease-out;
                }
                .modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-main);
                }
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-muted);
                }
                .modal-body {
                    padding: 24px;
                }
                .form-group {
                    margin-bottom: 16px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    font-size: 0.9rem;
                    color: var(--text-body);
                }
                .form-group input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    font-size: 0.95rem;
                    transition: border-color 0.2s;
                }
                .form-group input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
                }
                .modal-footer {
                    padding: 20px 24px;
                    background: var(--bg-hover);
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
                }
                .error-message {
                    background: var(--status-error-bg);
                    color: var(--status-error);
                    padding: 12px;
                    border-radius: var(--radius-md);
                    margin-bottom: 16px;
                    font-size: 0.9rem;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ProfileEditModal;
