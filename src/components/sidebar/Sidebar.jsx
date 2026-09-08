import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart3,
    FileText,
    ListChecks,
    Calendar,
    CreditCard,
    RefreshCw,
    Users,
    Building2,
    Tags,
    Briefcase,
    Stethoscope,
    Ban,
    Send,
    Settings as SettingsIcon,
    ChevronDown,
    ChevronsLeft,
    Menu as MenuIcon,
    Sparkles,
    Circle,
    Layers,
    Activity,
    ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const isPathMatch = (path, pathname) => {
    if (!path) return false;
    if (pathname === path) return true;
    return pathname.startsWith(`${path}/`);
};

const hasActiveDescendant = (link, pathname) => {
    if (link?.subItems?.length) {
        return link.subItems.some((item) => hasActiveDescendant(item, pathname));
    }
    return isPathMatch(link?.path, pathname);
};

const getIcon = (label) => {
    const l = (label || '').toLowerCase();

    if (l === 'dhpo' || l === 'dpvo') return Layers;
    if (l === 'riayati') return Activity;
    if (l === 'shafafi') return ShieldCheck;
    if (l.includes('dashboard') || l.includes('overview')) return LayoutDashboard;
    if (l === 'reports' || l.includes('claimsync reports') || (l.includes('report') && l.includes('crs'))) return BarChart3;
    if (l.includes('resubmission')) return RefreshCw;
    if (l.includes('activity') || l.includes('timeline')) return ListChecks;
    if (l.includes('claim summary') && l.includes('month')) return Calendar;
    if (l.includes('claim summary') && l.includes('payer')) return CreditCard;
    if (l.includes('claim details') || l.includes('claim')) return FileText;
    if (l.includes('user') || l.includes('staff') || l.includes('profile')) return Users;
    if (l.includes('clinician')) return Stethoscope;
    if (l.includes('office') || l.includes('branch')) return Building2;
    if (l.includes('category')) return Tags;
    if (l.includes('designation') || l.includes('role')) return Briefcase;
    if (l.includes('department')) return Building2;
    if (l.includes('denial')) return Ban;
    if (l.includes('encounter')) return ListChecks;
    if (l.includes('cpt')) return FileText;
    if (l.includes('payer')) return CreditCard;
    if (l.includes('sender')) return Send;
    if (l.includes('setting') || l.includes('config')) return SettingsIcon;
    if (l.includes('analytics') || l.includes('report')) return BarChart3;
    return Circle;
};

const Sidebar = ({ title, links = [], settingsPath }) => {
    const { user } = useAuth();
    const [openMenus, setOpenMenus] = useState({});
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();

    const getCollapsedWidth = () => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth <= 520) return '56px';
            if (window.innerWidth <= 900) return '64px';
        }
        return '76px';
    };

    const getExpandedWidth = () => {
        if (typeof window !== 'undefined' && window.innerWidth <= 900) return '264px';
        return '296px';
    };

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty(
            '--sidebar-width',
            isCollapsed ? getCollapsedWidth() : getExpandedWidth(),
        );
    }, [isCollapsed]);

    useEffect(() => {
        const onResize = () => {
            document.documentElement.style.setProperty(
                '--sidebar-width',
                isCollapsed ? getCollapsedWidth() : getExpandedWidth(),
            );
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [isCollapsed]);

    useEffect(() => {
        if (isCollapsed) return;

        const next = { ...openMenus };
        let shouldUpdate = false;

        const openActiveGroups = (items) => {
            items.forEach((link) => {
                if (!link.subItems?.length) return;
                const menuKey = link.id || link.label;
                if (hasActiveDescendant(link, location.pathname) && !next[menuKey]) {
                    next[menuKey] = true;
                    shouldUpdate = true;
                }
                openActiveGroups(link.subItems);
            });
        };

        openActiveGroups(links);
        if (shouldUpdate) setOpenMenus(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, links, isCollapsed]);

    const collectActiveMenus = (items, acc = {}) => {
        items.forEach((link) => {
            if (!link.subItems?.length) return;
            const menuKey = link.id || link.label;
            if (hasActiveDescendant(link, location.pathname)) {
                acc[menuKey] = true;
            }
            collectActiveMenus(link.subItems, acc);
        });
        return acc;
    };

    const toggleMenu = (label) =>
        setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));

    const toggleSidebar = () => {
        if (isCollapsed) {
            setIsCollapsed(false);
            setOpenMenus(collectActiveMenus(links));
        } else {
            setIsCollapsed(true);
            setOpenMenus({});
        }
    };

    const collapseOnNav = () => {
        if (!isCollapsed) {
            setIsCollapsed(true);
            setOpenMenus({});
        }
    };

    const displayName =
        user?.userLabel || user?.name || user?.username || (user?.role === 'admin' ? 'Admin User' : 'User');
    const initial = (displayName?.charAt(0) || 'U').toUpperCase();
    const roleLabel = user?.role || 'member';

    const labelClass = (label) =>
        /^[A-Z0-9]{2,}$/.test(label || '') ? 'nav-label nav-label-acronym' : 'nav-label';

    const renderNavItem = (link, depth) => {
        const Icon = getIcon(link.label);
        const iconSize = depth === 0 ? 19 : 16;
        const itemKey = link.id || link.path || `${depth}-${link.label}`;
        const menuKey = link.id || link.label;

        if (link.subItems?.length) {
            const open = !!openMenus[menuKey];
            const groupActive = hasActiveDescendant(link, location.pathname);
            return (
                <div key={itemKey} className={depth > 0 ? 'nav-group' : undefined}>
                    <div
                        className={`nav-item parent${open ? ' is-open' : ''}${groupActive ? ' has-active' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleMenu(menuKey)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleMenu(menuKey);
                            }
                        }}
                        title={isCollapsed ? link.label : ''}
                    >
                        <span className="nav-icon"><Icon size={iconSize} /></span>
                        <span className={labelClass(link.label)}>{link.label}</span>
                        <span className="nav-chevron"><ChevronDown size={15} /></span>
                    </div>
                    <div className={`sub-menu ${open ? 'is-open' : ''}`}>
                        {link.subItems.map((sub) => renderNavItem(sub, depth + 1))}
                    </div>
                </div>
            );
        }

        if (link.disabled) {
            return (
                <div
                    key={itemKey}
                    className="nav-item nav-item-disabled"
                    aria-disabled="true"
                    title={isCollapsed ? link.label : ''}
                >
                    <span className="nav-icon"><Icon size={iconSize} /></span>
                    <span className={labelClass(link.label)}>{link.label}</span>
                </div>
            );
        }

        return (
            <NavLink
                key={itemKey}
                to={link.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={collapseOnNav}
                title={isCollapsed ? link.label : ''}
            >
                <span className="nav-icon"><Icon size={iconSize} /></span>
                <span className={labelClass(link.label)}>{link.label}</span>
            </NavLink>
        );
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : ''}`} aria-label="Primary navigation">
            <div className="sidebar-header">
                {!isCollapsed ? (
                    <>
                        <div className="sidebar-brand">
                            <button
                                type="button"
                                className="sidebar-brand-mark"
                                onClick={toggleSidebar}
                                aria-label="Collapse sidebar"
                            >
                                <Sparkles size={16} strokeWidth={2.4} />
                            </button>
                            <div className="sidebar-brand-text">
                                <span className="sidebar-brand-name">
                                    Claim<span>Sync</span>
                                </span>
                                <span className="sidebar-brand-badge">v1.0.0</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="sidebar-toggle"
                            onClick={toggleSidebar}
                            aria-label="Collapse sidebar"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={toggleSidebar}
                        aria-label="Expand sidebar"
                        style={{ width: 36, height: 36 }}
                    >
                        <MenuIcon size={18} />
                    </button>
                )}
            </div>

            <nav className="sidebar-nav" aria-label="Primary">
                <div className="sidebar-nav-label">{title || 'Navigation'}</div>
                {links.map((link) => renderNavItem(link, 0))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-card" title={isCollapsed ? `${displayName} · ${roleLabel}` : ''}>
                    <div className="user-card-avatar" aria-hidden="true">{initial}</div>
                    <div className="user-card-info">
                        <span className="user-card-name">{displayName}</span>
                        <span className="user-card-role">{roleLabel}</span>
                    </div>
                </div>

                {settingsPath ? (
                    <NavLink
                        to={settingsPath}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? 'Settings' : ''}
                        onClick={collapseOnNav}
                    >
                        <span className="nav-icon"><SettingsIcon size={19} /></span>
                        <span className="nav-label">Settings</span>
                    </NavLink>
                ) : (
                    <div className="nav-item" title={isCollapsed ? 'Settings' : ''}>
                        <span className="nav-icon"><SettingsIcon size={19} /></span>
                        <span className="nav-label">Settings</span>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
