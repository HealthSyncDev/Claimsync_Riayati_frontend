import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';
import Topbar from '../components/topbar/Topbar';
import '../components/analytics-dashboard/styles.css';
import '../components/analytics-dashboard/DashboardNavHeader.css';
import DashboardNavHeader from '../components/analytics-dashboard/DashboardNavHeader';
import { DashboardFiltersProvider } from '../context/DashboardFiltersContext';
import { DoctorRejectionProvider } from '../context/DoctorRejectionContext';
import { DashboardDataCacheProvider } from '../context/DashboardDataCacheContext';
import { FadeIn } from '../components/common/Motion';
import { useAuth } from '../context/AuthContext';
import { DataSyncProvider } from '../context/DataSyncContext';
import { CLAIM_PORTALS, getPortalFromPathname, isDashboardAppPath, portalHref, stripPortalPrefix } from '../config/portals';
import { usePortal } from '../context/PortalContext';

function portalNavGroup(portal) {
    const p = (path) => portalHref(portal, path);
    return {
        label: portal.label,
        id: portal.id,
        disabled: !!portal.disabled,
        subItems: portal.disabled
            ? undefined
            : [
                { label: 'My Dashboard', path: p('/dashboard') },
                {
                    label: 'Reports',
                    id: `${portal.id}-reports`,
                    subItems: [
                        { label: 'Claim Details', path: p('/crs/claims') },
                        { label: 'Claim Details With Activity', path: p('/crs/activities') },
                        { label: 'Claim summary - Month wise', path: p('/crs/claim-summary-month'), disabled: true },
                        { label: 'Claim summary - Payer ID', path: p('/crs/claim-summary-payer'), disabled: true },
                    ],
                },
                { label: 'Resubmission', path: p('/crs/resubmission') },
            ],
    };
}

/** Stable FadeIn key for nested CRS routes so list ↔ detail does not remount the outlet (preserves context state). */
function outletFadeKey(pathname) {
    const app = stripPortalPrefix(pathname);
    const prefix = getPortalFromPathname(pathname).prefix;
    const grouped = (group) => `${prefix}${group}`;

    if (app === '/crs/resubmission' || /^\/crs\/resubmission\/.+/.test(app)) {
        return grouped('/crs/resubmission');
    }
    // Keep list↔timeline under one FadeIn key (same pattern as resubmission).
    if (app === '/crs/activities' || app.startsWith('/crs/activities/timeline/')) {
        return grouped('/crs/activities');
    }
    // Keep claims list ↔ claim detail under one FadeIn key.
    if (app === '/crs/claims' || /^\/crs\/claims\/.+/.test(app)) {
        return grouped('/crs/claims');
    }
    if (app === '/dashboard' || app.startsWith('/dashboard/')) {
        return grouped('/dashboard');
    }
    return pathname;
}

const UserLayout = () => {
    const { user, loading } = useAuth();
    const { id: portalId } = usePortal();
    const navigate = useNavigate();
    const location = useLocation();
    const appPath = stripPortalPrefix(location.pathname);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'user')) {
            // If user is admin trying to access user dashboard, maybe redirect to admin? 
            // Or just login. For now, strict check.
            if (user?.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/login');
            }
        }
    }, [user, loading, navigate]);

    if (loading) return <div>Loading...</div>;

    const userLinks = CLAIM_PORTALS.map(portalNavGroup);

    const getTitle = () => {
        if (appPath.startsWith('/crs/claims/')) return 'Claim Details';
        if (appPath.startsWith('/crs/activities/timeline/')) return 'Claim Submission & Remittance Details';
        if (appPath.startsWith('/dashboard')) return 'Dashboard';
        if (appPath.startsWith('/crs/resubmission/verification')) return 'Resubmission — Verification';
        if (appPath.startsWith('/crs/resubmission/submit')) return 'Resubmission — Submit';
        if (appPath.startsWith('/crs/resubmission/resubmitted')) return 'Resubmission — Resubmitted';
        if (appPath.startsWith('/crs/resubmission/pending')) return 'Resubmission — Pending';
        if (
            appPath.startsWith('/crs/resubmission/payer/') ||
            appPath.startsWith('/crs/resubmission/insurer/')
        ) {
            return 'Resubmission — Insurer claims';
        }
        if (appPath.startsWith('/crs/resubmission/') && appPath !== '/crs/resubmission') {
            return 'Resubmission — Claim';
        }

        switch (appPath) {
            case '/dashboard': return 'My Dashboard';
            case '/settings': return 'Settings';
            case '/crs/claims': return 'Claim Details';
            case '/crs/activities': return 'Claim Details with activity';
            case '/crs/claim-summary-month': return 'Claim summary - Month wise';
            case '/crs/claim-summary-payer': return 'Claim summary - Payer ID';
            case '/crs/resubmission': return 'Resubmission';
            default: return 'User Portal';
        }
    };

    const isDashboard = isDashboardAppPath(location.pathname);
    const isResubmissionList = appPath === '/crs/resubmission';
    const isResubmissionVerification = appPath.startsWith('/crs/resubmission/verification');
    const isResubmissionSubmit = appPath.startsWith('/crs/resubmission/submit');
    const isResubmissionResubmitted = appPath.startsWith('/crs/resubmission/resubmitted');
    const isResubmissionPending = appPath.startsWith('/crs/resubmission/pending');
    const isResubmissionPayer =
        appPath.startsWith('/crs/resubmission/payer/') ||
        appPath.startsWith('/crs/resubmission/insurer/');
    const isResubmissionHub =
        isResubmissionList ||
        isResubmissionVerification ||
        isResubmissionSubmit ||
        isResubmissionResubmitted ||
        isResubmissionPending ||
        isResubmissionPayer;

    const headerStack = isDashboard ? (
        <div className="app-header-stack app-header-stack--dashboard">
            <DashboardNavHeader />
        </div>
    ) : (
        <div className="app-header-stack">
            <Topbar title={isResubmissionHub ? '' : getTitle()} />
        </div>
    );

    const mainContent = (
        <main
            className={`main-content${isDashboard ? ' main-content--dashboard' : ''}${isResubmissionHub ? ' main-content--resub' : ''}`}
        >
            <FadeIn key={outletFadeKey(location.pathname)}>
                <Outlet />
            </FadeIn>
        </main>
    );

    return (
        <DataSyncProvider>
            <DashboardFiltersProvider key={portalId}>
                <DashboardDataCacheProvider>
                <DoctorRejectionProvider>
                    <div className="layout-container">
                        <Sidebar title="Hospital User" links={userLinks} settingsPath="/settings" />
                        <div className="layout-content flex-col w-full">
                            {headerStack}
                            {mainContent}
                        </div>
                    </div>
                </DoctorRejectionProvider>
                </DashboardDataCacheProvider>
            </DashboardFiltersProvider>
        </DataSyncProvider>
    );
};

export default UserLayout;
