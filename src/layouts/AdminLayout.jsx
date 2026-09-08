import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';
import Topbar from '../components/topbar/Topbar';
import { FadeIn } from '../components/common/Motion';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    if (loading) return <div>Loading...</div>;

    const adminLinks = [
        { label: 'Dashboard', path: '/admin/dashboard' },
        { label: 'Manage Users', path: '/admin/users' },
        { label: 'Offices / Branch', path: '/admin/office' },
        { label: 'Categories', path: '/admin/categories' },
        { label: 'Designations', path: '/admin/designation' },
        { label: 'Department', path: '/admin/departments' },
        { label: 'Clinician', path: '/admin/clinicians' },
        { label: 'Denial Codes', path: '/admin/denial-codes' },
        { label: 'Denial Reasons', path: '/admin/denial-reasons' },
        { label: 'Encounter Type', path: '/admin/encounter-types' },
        { label: 'CPT Code Mapping', path: '/admin/cpt-code-mapping' },
        { label: 'Payer Management', path: '/admin/payer-ids' },
        { label: 'Senders', path: '/admin/senders' },
    ];

    const location = useLocation();

    const getTitle = () => {
        switch (location.pathname) {
            case '/admin/dashboard': return 'Dashboard Overview';
            case '/admin/users': return 'User Management';
            case '/admin/office': return 'Office Locations';
            case '/admin/categories': return 'Category Management';
            case '/admin/designation': return 'Designation Management';
            case '/admin/departments': return 'Department Management';
            case '/admin/clinicians': return 'Clinician Management';
            case '/admin/denial-codes': return 'Denial Codes Management';
            case '/admin/denial-reasons': return 'Denial Reasons Management';
            case '/admin/encounter-types': return 'Encounter Type Management';
            case '/admin/cpt-code-mapping': return 'CPT Code Mapping';
            case '/admin/payer-ids': return 'Payer Management';
            case '/admin/senders': return 'Sender Management';
            case '/admin/settings': return 'Settings';
            default: return 'Admin Portal';
        }
    };

    return (
        <div className="layout-container">
            <Sidebar title="Hospital Admin" links={adminLinks} settingsPath="/admin/settings" />
            <div className="layout-content flex-col w-full">
                <Topbar title={getTitle()} />
                <main className="main-content">
                    <FadeIn key={location.pathname}>
                        <Outlet />
                    </FadeIn>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
