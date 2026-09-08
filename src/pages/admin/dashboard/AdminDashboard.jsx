import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Building2,
    Tags,
    BadgeCheck,
    UserPlus,
    ArrowRight,
    Plus,
    Activity,
    ShieldCheck,
} from 'lucide-react';
import Button from '../../../components/common/Button';
import { FadeIn, Stagger, StaggerItem } from '../../../components/common/Motion';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: 0, offices: 0, designations: 0, categories: 0 });
    const [loading, setLoading] = useState(true);
    const [recentUsers, setRecentUsers] = useState([]);
    const [syncRecordId, setSyncRecordId] = useState(1);
    const [dailyRefreshTime, setDailyRefreshTime] = useState('03:00AM');
    const [pickerHour, setPickerHour] = useState('03');
    const [pickerMinute, setPickerMinute] = useState('00');
    const [pickerPeriod, setPickerPeriod] = useState('AM');
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [updateModalMessage, setUpdateModalMessage] = useState('');
    const [systemGeneratedTime, setSystemGeneratedTime] = useState(() => new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    }));

    const safeJson = async (response) => {
        if (!response.ok) return [];
        try {
            return await response.json();
        } catch {
            return [];
        }
    };

    const to12HourState = useCallback((timeValue) => {
        const match = String(timeValue).trim().match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
        if (!match) {
            return { hour: '03', minute: '00', period: 'AM' };
        }
        return {
            hour: String(Number(match[1])).padStart(2, '0'),
            minute: match[2],
            period: match[3].toUpperCase(),
        };
    }, []);

    const toSyncTimeString = useCallback((hour12, minute, period) => {
        const h = Number(hour12);
        const m = Number(minute);
        if (!Number.isInteger(h) || h < 1 || h > 12 || !Number.isInteger(m) || m < 0 || m > 59) {
            return dailyRefreshTime;
        }
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${period}`;
    }, [dailyRefreshTime]);

    const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    const displayTime = (() => {
        const t = to12HourState(dailyRefreshTime);
        return `${t.hour}:${t.minute} ${t.period}`;
    })();

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
        };
    }, []);

    const ensureSyncTime = useCallback(async () => {
        const headers = getAuthHeaders();
        try {
            const latestRes = await fetch('/api/sync/latest', { headers });
            if (latestRes.ok) {
                const latestData = await latestRes.json();
                if (latestData?.sync_time) {
                    setDailyRefreshTime(latestData.sync_time);
                    setSyncRecordId(latestData.table_id || 1);
                    return;
                }
            }
        } catch (error) {
            console.error('Failed to fetch latest sync time:', error);
        }

        try {
            const defaultSyncTime = '03:00AM';
            const createRes = await fetch('/api/sync', {
                method: 'POST',
                headers,
                body: JSON.stringify({ sync_time: defaultSyncTime }),
            });
            if (!createRes.ok) return;
            const createdData = await createRes.json();
            setDailyRefreshTime(createdData?.sync_time || defaultSyncTime);
            setSyncRecordId(createdData?.table_id || 1);
        } catch (error) {
            console.error('Failed to create default sync time:', error);
        }
    }, [getAuthHeaders]);

    const updateSyncTime = useCallback(async (nextSyncTime) => {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`/api/sync/${syncRecordId || 1}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ sync_time: nextSyncTime }),
            });
            if (!res.ok) return false;
            const updatedData = await res.json();
            if (updatedData?.sync_time) {
                setDailyRefreshTime(updatedData.sync_time);
            } else {
                setDailyRefreshTime(nextSyncTime);
            }
            return true;
        } catch (error) {
            console.error('Failed to update sync time:', error);
            return false;
        }
    }, [getAuthHeaders, syncRecordId]);

    const fetchAllData = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        try {
            const headers = getAuthHeaders();

            const [usersRes, officesRes, designationsRes, categoriesRes] = await Promise.all([
                fetch('/api/users', { headers }),
                fetch('/api/offices', { headers }),
                fetch('/api/designations', { headers }),
                fetch('/api/categories', { headers }),
            ]);

            const usersData = await safeJson(usersRes);
            const officesData = await safeJson(officesRes);
            const designationsData = await safeJson(designationsRes);
            const categoriesData = await safeJson(categoriesRes);

            const users = Array.isArray(usersData) ? usersData : (usersData.users || []);
            const offices = Array.isArray(officesData) ? officesData : [];
            const designations = Array.isArray(designationsData) ? designationsData : [];
            const categories = Array.isArray(categoriesData) ? categoriesData : [];

            setStats({
                users: users.length,
                offices: offices.length,
                designations: designations.length,
                categories: categories.length,
            });

            setRecentUsers(users.slice(-5).reverse());
            setLastUpdatedAt(new Date());
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        ensureSyncTime();
    }, [ensureSyncTime]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setSystemGeneratedTime(new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            }));
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    useEffect(() => {
        const parsed = to12HourState(dailyRefreshTime);
        setPickerHour(parsed.hour);
        setPickerMinute(parsed.minute);
        setPickerPeriod(parsed.period);
    }, [dailyRefreshTime, to12HourState]);

    useEffect(() => {
        if (!updateModalMessage) return undefined;
        const timeoutId = window.setTimeout(() => {
            setUpdateModalMessage('');
        }, 2200);
        return () => window.clearTimeout(timeoutId);
    }, [updateModalMessage]);

    const metrics = [
        {
            title: 'Total Users',
            value: loading ? '…' : stats.users,
            Icon: Users,
            tone: 'brand',
            trend: 'System users',
        },
        {
            title: 'Offices / Branches',
            value: loading ? '…' : stats.offices,
            Icon: Building2,
            tone: 'amber',
            trend: 'Active locations',
        },
        {
            title: 'Designations',
            value: loading ? '…' : stats.designations,
            Icon: BadgeCheck,
            tone: 'emerald',
            trend: 'Job roles',
        },
        {
            title: 'Categories',
            value: loading ? '…' : stats.categories,
            Icon: Tags,
            tone: 'violet',
            trend: 'Staff groups',
        },
    ];

    return (
        <div className="admin-dash">
            <FadeIn>
                <section className="ad-hero">
                    <div className="ad-hero-bg" aria-hidden="true" />
                    <div className="ad-hero-grid" aria-hidden="true" />

                    <div className="ad-hero-copy">
                        <span className="ad-hero-chip">
                            <span className="ad-hero-chip-dot" />
                            Admin console
                        </span>
                        <h2 className="ad-hero-title">Welcome back, Admin</h2>
                        <p className="ad-hero-sub">
                            {loading
                                ? 'Loading workspace snapshot…'
                                : <>You have <strong>{stats.users} active users</strong> across <strong>{stats.offices} offices</strong>. Manage your hospital&rsquo;s workforce and resources from one place.</>}
                        </p>
                        <div className="ad-hero-cta">
                            <Button onClick={() => navigate('/admin/users/add')} leadingIcon={<UserPlus size={14} />} size="md">
                                Add new user
                            </Button>
                            <Button
                                variant="secondary"
                                size="md"
                                onClick={() => navigate('/admin/users')}
                                trailingIcon={<ArrowRight size={14} />}
                            >
                                Manage users
                            </Button>
                        </div>
                    </div>

                    <div className="ad-hero-art">
                        <div className="ad-refresh-row">
                            <div className="ad-refresh-head">
                                <div className="ad-refresh-title-wrap">
                                    <span className="ad-refresh-kicker">Data schedule</span>
                                    <span className="ad-refresh-title">Daily auto fetch</span>
                                </div>
                            </div>
                            <div className="ad-refresh-controls">
                                <div className="ad-refresh-time-wrap">
                                    <span className="ad-refresh-time-label">Run at</span>
                                    <div className="ad-custom-time-picker">
                                        <select className="ad-time-select" value={pickerHour} onChange={(e) => setPickerHour(e.target.value)} aria-label="Hour">
                                            {hourOptions.map((hour) => (<option key={hour} value={hour}>{hour}</option>))}
                                        </select>
                                        <span className="ad-time-sep">:</span>
                                        <select className="ad-time-select" value={pickerMinute} onChange={(e) => setPickerMinute(e.target.value)} aria-label="Minute">
                                            {minuteOptions.map((minute) => (<option key={minute} value={minute}>{minute}</option>))}
                                        </select>
                                        <select className="ad-time-select ad-time-select--period" value={pickerPeriod} onChange={(e) => setPickerPeriod(e.target.value)} aria-label="AM or PM">
                                            <option value="AM">AM</option>
                                            <option value="PM">PM</option>
                                        </select>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={async () => {
                                                const nextSyncTime = toSyncTimeString(pickerHour, pickerMinute, pickerPeriod);
                                                const ok = await updateSyncTime(nextSyncTime);
                                                setUpdateModalMessage(ok ? 'Sync time updated successfully.' : 'Failed to update sync time.');
                                            }}
                                        >
                                            Update
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="ad-refresh-meta-list">
                                <span className="ad-refresh-meta ad-refresh-meta--primary">
                                    Sync time: {displayTime}
                                </span>
                                <span className="ad-refresh-meta">System time: {systemGeneratedTime}</span>
                                <span className="ad-refresh-meta">{lastUpdatedAt ? `Last updated ${lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}` : 'Not updated yet'}</span>
                            </div>
                        </div>
                    </div>
                </section>
            </FadeIn>

            <Stagger className="ad-metrics">
                {metrics.map((m) => (
                    <StaggerItem key={m.title}>
                        <MetricCard {...m} />
                    </StaggerItem>
                ))}
            </Stagger>

            <div className="ad-split">
                <FadeIn className="ad-recent card card-flat">
                    <div className="ad-recent-head">
                        <div>
                            <h3 className="ad-card-title">Recent registrations</h3>
                            <p className="ad-card-sub">The latest users added to the system.</p>
                        </div>
                        <button
                            type="button"
                            className="ad-link"
                            onClick={() => navigate('/admin/users')}
                        >
                            View all
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="ad-table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Office</th>
                                    <th style={{ textAlign: 'right' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading data…</td></tr>
                                ) : recentUsers.length > 0 ? (
                                    recentUsers.map((u) => (
                                        <tr key={u.userId}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div className="avatar avatar-sm">
                                                        {u.userLabel ? u.userLabel.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)' }}>
                                                            {u.userLabel}
                                                        </span>
                                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                            @{u.username}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{u.roleName || '—'}</td>
                                            <td>{u.officeName || 'HO'}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className={`chip ${u.activeUser ? 'chip--success' : 'chip--error'}`}>
                                                    <span className="chip-dot" />
                                                    {u.activeUser ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent users found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </FadeIn>

                <div className="ad-side">
                    <FadeIn delay={0.05}>
                        <section className="ad-status card card-flat">
                            <div className="ad-status-head">
                                <span className="ad-status-ic">
                                    <ShieldCheck size={16} />
                                </span>
                                <div>
                                    <div className="ad-status-title">System status</div>
                                    <div className="ad-status-sub">Realtime health of core services</div>
                                </div>
                            </div>

                            <div className="ad-status-ok">
                                <span className="ad-status-dot" />
                                <span>All systems operational</span>
                            </div>

                            <ul className="ad-status-list">
                                <li>
                                    <span>API</span>
                                    <span className="chip chip--success"><span className="chip-dot" />Healthy</span>
                                </li>
                                <li>
                                    <span>Extraction pipeline</span>
                                    <span className="chip chip--success"><span className="chip-dot" />Healthy</span>
                                </li>
                                <li>
                                    <span>Database</span>
                                    <span className="chip chip--success"><span className="chip-dot" />Healthy</span>
                                </li>
                            </ul>
                        </section>
                    </FadeIn>

                    <FadeIn delay={0.1}>
                        <section className="ad-quick card card-flat">
                            <div className="ad-card-title-row">
                                <Activity size={15} className="ad-card-ic" />
                                <h3 className="ad-card-title">Quick actions</h3>
                            </div>
                            <div className="ad-quick-grid">
                                <button className="ad-quick-btn" onClick={() => navigate('/admin/office')}>
                                    <Plus size={14} /><span>Add office</span>
                                </button>
                                <button className="ad-quick-btn" onClick={() => navigate('/admin/categories')}>
                                    <Plus size={14} /><span>Category</span>
                                </button>
                                <button className="ad-quick-btn" onClick={() => navigate('/admin/designation')}>
                                    <Plus size={14} /><span>Designation</span>
                                </button>
                                <button className="ad-quick-btn" onClick={() => navigate('/admin/departments')}>
                                    <Plus size={14} /><span>Department</span>
                                </button>
                            </div>
                        </section>
                    </FadeIn>
                </div>
            </div>

            {updateModalMessage ? (
                <div className="ad-update-modal" role="status" aria-live="polite">
                    {updateModalMessage}
                </div>
            ) : null}

            <style>{`
                .admin-dash {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                }

                /* Hero */
                .ad-hero {
                    position: relative;
                    isolation: isolate;
                    overflow: visible;
                    border-radius: var(--radius-xl);
                    background: linear-gradient(135deg, #0b1324 0%, #141f41 55%, #1e2a63 100%);
                    color: #e2e8f0;
                    padding: 32px 36px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                    min-height: 220px;
                    box-shadow: 0 16px 40px -20px rgba(11, 19, 36, 0.5);
                }

                .ad-hero-bg {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(600px 300px at 10% 100%, rgba(96, 165, 250, 0.25) 0%, transparent 60%),
                        radial-gradient(500px 260px at 100% 0%, rgba(124, 58, 237, 0.22) 0%, transparent 60%);
                    z-index: -1;
                    pointer-events: none;
                }

                .ad-hero-grid {
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
                    background-size: 36px 36px;
                    mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, transparent 78%);
                    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, transparent 78%);
                    z-index: -1;
                    pointer-events: none;
                }

                .ad-hero-copy {
                    max-width: 540px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .ad-hero-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    width: fit-content;
                    padding: 4px 10px;
                    border-radius: 999px;
                    background: rgba(148, 163, 184, 0.1);
                    border: 1px solid rgba(148, 163, 184, 0.18);
                    color: #cbd5e1;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                }

                .ad-hero-chip-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 999px;
                    background: #10b981;
                    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.16);
                }

                .ad-hero-title {
                    color: #ffffff;
                    font-size: clamp(1.5rem, 1.2rem + 0.9vw, 1.9rem);
                    font-weight: 700;
                    letter-spacing: -0.02em;
                    line-height: 1.15;
                    margin: 0;
                }

                .ad-hero-sub {
                    color: rgba(203, 213, 225, 0.85);
                    font-size: 0.95rem;
                    line-height: 1.55;
                    margin: 0;
                    max-width: 52ch;
                }

                .ad-hero-sub strong { color: #fff; font-weight: 600; }

                .ad-hero-cta {
                    display: inline-flex;
                    gap: 10px;
                    margin-top: 6px;
                    flex-wrap: wrap;
                }

                .ad-refresh-row {
                    margin-top: 10px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 12px;
                    color: rgba(203, 213, 225, 0.9);
                    background:
                        linear-gradient(120deg, rgba(30, 41, 59, 0.58) 0%, rgba(15, 23, 42, 0.68) 100%),
                        radial-gradient(350px 200px at 0% 0%, rgba(59, 130, 246, 0.16) 0%, transparent 65%);
                    border: 1px solid rgba(148, 163, 184, 0.24);
                    border-radius: 16px;
                    padding: 14px;
                    backdrop-filter: blur(10px);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 10px 22px -14px rgba(0, 0, 0, 0.6);
                    width: 100%;
                    position: relative;
                    overflow: visible;
                }

                .ad-refresh-head {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                }

                .ad-refresh-title-wrap {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .ad-refresh-kicker {
                    font-size: 0.68rem;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: rgba(203, 213, 225, 0.68);
                    font-weight: 600;
                }

                .ad-refresh-title {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #e2e8f0;
                }

                .ad-refresh-controls {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                    width: 100%;
                    justify-content: flex-start;
                }

                .ad-refresh-time-wrap {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 8px;
                    border-radius: 10px;
                    background: rgba(15, 23, 42, 0.35);
                    width: 100%;
                    flex-wrap: nowrap;
                    justify-content: flex-start;
                }

                .ad-refresh-time-label {
                    font-size: 0.78rem;
                    color: rgba(203, 213, 225, 0.75);
                    font-weight: 600;
                }

                .ad-custom-time-picker {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    flex-wrap: nowrap;
                    width: auto;
                    min-width: 0;
                    max-width: 100%;
                    overflow: hidden;
                }

                .ad-time-select {
                    height: 34px;
                    border: 1px solid rgba(148, 163, 184, 0.28);
                    background: rgba(15, 23, 42, 0.68);
                    color: #e2e8f0;
                    border-radius: 10px;
                    padding: 0 10px;
                    display: inline-flex;
                    align-items: center;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
                    font-variant-numeric: tabular-nums;
                    min-width: 64px;
                    width: 64px;
                    max-width: 64px;
                    outline: none;
                    flex: 0 0 auto;
                }

                .ad-time-select:hover {
                    border-color: rgba(125, 211, 252, 0.72);
                    background: rgba(15, 23, 42, 0.86);
                }

                .ad-time-select:focus {
                    border-color: rgba(125, 211, 252, 0.9);
                    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.24);
                    background: rgba(15, 23, 42, 0.82);
                }

                .ad-time-select--period {
                    min-width: 74px;
                    width: 74px;
                    max-width: 74px;
                }

                .ad-time-sep {
                    font-size: 0.95rem;
                    color: rgba(226, 232, 240, 0.85);
                    font-weight: 700;
                    flex: 0 0 auto;
                }

                .ad-custom-time-picker .btn {
                    flex: 0 0 auto;
                    white-space: nowrap;
                }

                .ad-refresh-meta {
                    font-size: 0.72rem;
                    color: rgba(226, 232, 240, 0.82);
                    padding: 5px 9px;
                    border-radius: 999px;
                    background: rgba(148, 163, 184, 0.15);
                    border: 1px solid rgba(148, 163, 184, 0.24);
                    letter-spacing: 0.01em;
                }

                .ad-refresh-meta--primary {
                    color: #dbeafe;
                    background: rgba(59, 130, 246, 0.24);
                    border-color: rgba(125, 211, 252, 0.55);
                }

                .ad-refresh-meta-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    width: 100%;
                }

                .ad-refresh-controls .btn {
                    border: 1px solid rgba(148, 163, 184, 0.35);
                    background: rgba(15, 23, 42, 0.5);
                    color: #e2e8f0;
                }

                .ad-refresh-controls .btn:hover {
                    border-color: rgba(125, 211, 252, 0.65);
                    background: rgba(15, 23, 42, 0.8);
                }

                .ad-hero-art {
                    width: min(440px, 44vw);
                    flex-shrink: 0;
                    opacity: 0.95;
                    filter: drop-shadow(0 20px 30px rgba(0,0,0,0.25));
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 14px;
                }

                .ad-hero-art .ad-refresh-row {
                    margin-top: 0;
                }

                @media (max-width: 900px) {
                    .ad-hero-art { display: none; }
                    .ad-hero { padding: 24px; }
                }

                /* Metrics grid */
                .ad-metrics {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: var(--space-4);
                }

                /* Split layout */
                .ad-split {
                    display: grid;
                    grid-template-columns: 1.7fr 1fr;
                    gap: var(--space-6);
                }

                @media (max-width: 1024px) {
                    .ad-split { grid-template-columns: 1fr; }
                }

                .ad-side {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                }

                .ad-card-title {
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 0;
                    color: var(--text-main);
                }

                .ad-card-sub {
                    font-size: 0.8125rem;
                    color: var(--text-muted);
                    margin: 2px 0 0;
                }

                .ad-card-title-row {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 14px;
                }

                .ad-card-ic { color: var(--brand-600); }

                .ad-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    color: var(--brand-600);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 4px 6px;
                    border-radius: 6px;
                }

                .ad-link:hover {
                    background: var(--brand-50);
                }

                /* Recent users card */
                .ad-recent-head {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .ad-table-wrap {
                    overflow-x: auto;
                    margin: 0 -16px -16px;
                }

                .ad-table-wrap .data-table { min-width: 520px; }
                .ad-table-wrap .data-table thead th:first-child { padding-left: 24px; }
                .ad-table-wrap .data-table tbody td:first-child { padding-left: 24px; }
                .ad-table-wrap .data-table thead th:last-child { padding-right: 24px; }
                .ad-table-wrap .data-table tbody td:last-child { padding-right: 24px; }

                /* System Status card */
                .ad-status-head {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    margin-bottom: 16px;
                }

                .ad-status-ic {
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    background: var(--status-success-bg);
                    color: var(--status-success-fg);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .ad-status-title {
                    font-size: 0.9375rem;
                    font-weight: 600;
                    color: var(--text-main);
                }
                .ad-status-sub {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-top: 2px;
                }

                .ad-status-ok {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    border-radius: 10px;
                    background: var(--status-success-bg);
                    color: var(--status-success-fg);
                    font-size: 0.8125rem;
                    font-weight: 600;
                    margin-bottom: 14px;
                    width: 100%;
                }

                .ad-status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 999px;
                    background: var(--status-success);
                    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.18);
                    animation: ad-pulse 2.2s ease-in-out infinite;
                }

                @keyframes ad-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    50%      { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                }

                .ad-status-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .ad-status-list li {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: var(--surface-sunken);
                    border-radius: var(--radius-sm);
                    font-size: 0.8125rem;
                    color: var(--text-body);
                    font-weight: 500;
                }

                /* Quick actions */
                .ad-quick-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }

                .ad-quick-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    height: 38px;
                    padding: 0 12px;
                    border-radius: var(--radius-md);
                    background: var(--surface-sunken);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-body);
                    font-size: 0.8125rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition:
                        background-color var(--dur-2) var(--ease-out),
                        color var(--dur-2) var(--ease-out),
                        border-color var(--dur-2) var(--ease-out);
                }

                .ad-quick-btn:hover {
                    background: var(--surface-card);
                    border-color: var(--border-strong);
                    color: var(--text-main);
                }

                .ad-quick-btn svg {
                    color: var(--brand-600);
                }

                .ad-update-modal {
                    position: fixed;
                    top: 18px;
                    right: 18px;
                    z-index: 3000;
                    padding: 10px 14px;
                    border-radius: 10px;
                    border: 1px solid rgba(125, 211, 252, 0.45);
                    background: rgba(15, 23, 42, 0.95);
                    color: #e2e8f0;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    box-shadow: 0 12px 28px -16px rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(8px);
                }
            `}</style>
        </div>
    );
};

const MetricCard = ({ title, value, Icon, tone = 'brand', trend }) => {
    const toneMap = {
        brand:   { color: 'var(--brand-600)',         bg: 'var(--brand-50)',         bar: 'var(--brand-500)' },
        amber:   { color: '#b45309',                  bg: '#fffbeb',                 bar: '#f59e0b' },
        emerald: { color: 'var(--status-success-fg)', bg: 'var(--status-success-bg)',bar: 'var(--status-success)' },
        violet:  { color: '#6d28d9',                  bg: '#ede9fe',                 bar: '#7c3aed' },
    };
    const t = toneMap[tone] || toneMap.brand;

    return (
        <div className="metric-card">
            <div className="metric-bar" style={{ background: t.bar }} />
            <div className="metric-head">
                <h3 className="metric-title">{title}</h3>
                <div className="metric-ic" style={{ color: t.color, background: t.bg }}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="metric-value stat-number">{value}</div>
            <div className="metric-trend">{trend}</div>

            <style>{`
                .metric-card {
                    position: relative;
                    background: var(--surface-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-lg);
                    padding: 20px 22px 18px;
                    overflow: hidden;
                    transition:
                        transform var(--dur-2) var(--ease-out),
                        box-shadow var(--dur-2) var(--ease-out),
                        border-color var(--dur-2) var(--ease-out);
                }
                .metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                    border-color: var(--border-strong);
                }
                .metric-bar {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    border-radius: 3px 0 0 3px;
                }
                .metric-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .metric-title {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-muted);
                    font-weight: 600;
                    margin: 0;
                }
                .metric-ic {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .metric-value {
                    font-size: 2.25rem;
                    font-weight: 700;
                    color: var(--text-main);
                    line-height: 1.1;
                    margin-top: 14px;
                    letter-spacing: -0.02em;
                }
                .metric-trend {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-top: 4px;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
