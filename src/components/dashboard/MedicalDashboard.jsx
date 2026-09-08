import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MedicalKPIBar from './MedicalKPIBar';
import TrendChart from './TrendChart';
import SpecialtyChart from './SpecialtyChart';
import TopDoctorsWidget from './TopDoctorsWidget';
import PayerRejectionWidget from './PayerRejectionWidget';
import DenialReasonsWidget from './DenialReasonsWidget';
import ProfileEditModal from '../../pages/user/dashboard/ProfileEditModal';

const MedicalDashboard = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [loading, setLoading] = useState(true);

    // Mock data based on the images you provided
    const [dashboardData, setDashboardData] = useState({
        kpis: {
            totalDenials: 1361853,
            denialRate: 9,
            totalAmount: 34222916,
            rejectedAmount: 2406970,
            recoveryRate: 15,
            pendingReviews: 523
        },
        specialtyData: [
            { specialty: 'GENERAL PRACTICE', amount: 658874, rate: 11 },
            { specialty: 'UROLOGY', amount: 148494, rate: 15 },
            { specialty: 'OBSTETRICS AND GYNECOLOGY', amount: 136591, rate: 7 },
            { specialty: 'INTERNAL MEDICINE', amount: 124216, rate: 13 },
            { specialty: 'PEDIATRIC', amount: 93008, rate: 9 },
            { specialty: 'ORTHOPEDIC SURGERY', amount: 41421, rate: 4 },
            { specialty: 'ENT', amount: 40464, rate: 10 },
            { specialty: 'CARDIOLOGY', amount: 33270, rate: 6 }
        ],
        topDoctors: [
            { name: 'PRASAD SARAVANA', specialty: 'GENERAL PRACTICE', amount: 3105052, denials: 222178, rate: 10 },
            { name: 'ANIS HADDAD', specialty: 'UROLOGY', amount: 997107, denials: 123804, rate: 17 },
            { name: 'DILFUZA USMONOVA', specialty: 'GENERAL PRACTICE', amount: 822930, denials: 98079, rate: 16 },
            { name: 'RAZA AHMED', specialty: 'GENERAL PRACTICE', amount: 1327671, denials: 88818, rate: 9 },
            { name: 'JELENA JEVTCAKIP', specialty: 'OBSTETRICS AND GYNECOLOGY', amount: 1628028, denials: 80311, rate: 7 }
        ],
        payerData: [
            { payer: 'NAS ADMINISTRATION SERVICES LIMITED', claimed: 4590946, processed: 2796454, rejected: 489975, rate: 18 },
            { payer: 'OMAN INSURANCE COMPANY', claimed: 3609735, processed: 2938180, rejected: 455026, rate: 15 },
            { payer: 'NEXTCARE CLAIMS MANAGEMENT LLC', claimed: 10678618, processed: 7598438, rejected: 439618, rate: 6 },
            { payer: 'MEDNET GLOBAL HEALTHCARE SOLUTIONS L.L.C.', claimed: 3587816, processed: 2453528, rejected: 285229, rate: 12 }
        ],
        denialReasons: [
            { reason: 'Medical Necessity', amount: 1560036, percentage: 65 },
            { reason: 'Clinical Information', amount: 111568, percentage: 5 },
            { reason: 'Authorization', amount: 173310, percentage: 7 },
            { reason: 'Price', amount: 95490, percentage: 4 },
            { reason: 'Administrative Information', amount: 107295, percentage: 4 }
        ],
        trendData: [
            { month: 'Jan', rejections: 523, rate: 8 },
            { month: 'Feb', rejections: 536, rate: 9 },
            { month: 'Mar', rejections: 544, rate: 10 },
            { month: 'Apr', rejections: 509, rate: 11 },
            { month: 'May', rejections: 565, rate: 15 }
        ]
    });

    useEffect(() => {
        // Simulate data loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [refreshKey]);

    const displayUser = profileData || user;

    return (
        <div className="medical-dashboard">
            {/* Header Section with User Profile */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="welcome-section">
                        <h1 className="dashboard-title">Medical Claims Dashboard</h1>
                        <p className="dashboard-subtitle">
                            Welcome back, {displayUser?.userLabel?.split(' ')[0] || 'Doctor'}! 
                            Here's your claims overview for YTD May-2025
                        </p>
                    </div>
                    <div className="user-profile-compact">
                        <div className="profile-avatar-small">
                            {displayUser?.userLabel ? displayUser.userLabel.charAt(0) : 'U'}
                        </div>
                        <div className="profile-info">
                            <span className="profile-name">{displayUser?.userLabel || 'User'}</span>
                            <span className="profile-role">{displayUser?.designationName || 'Staff'}</span>
                        </div>
                        <button 
                            className="btn-profile-edit"
                            onClick={() => setShowEditModal(true)}
                        >
                            Edit
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Overview */}
            <div className="dashboard-section">
                <MedicalKPIBar data={dashboardData.kpis} loading={loading} />
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-content-grid">
                {/* Left Column */}
                <div className="dashboard-main">
                    {/* Trends Section */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>Rejection Trend Analysis</h3>
                            <span className="card-subtitle">Monthly rejection rates and volumes</span>
                        </div>
                        <TrendChart data={dashboardData.trendData} loading={loading} />
                    </div>

                    {/* Specialty Breakdown */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>Top Specialties by Denials</h3>
                            <span className="card-subtitle">Denial amounts and rates by medical specialty</span>
                        </div>
                        <SpecialtyChart data={dashboardData.specialtyData} loading={loading} />
                    </div>

                    {/* Denial Reasons */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>Denial Reasons Analysis</h3>
                            <span className="card-subtitle">Primary reasons for claim rejections</span>
                        </div>
                        <DenialReasonsWidget data={dashboardData.denialReasons} loading={loading} />
                    </div>
                </div>

                {/* Right Column */}
                <div className="dashboard-sidebar">

                    {/* Top Doctors */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>Top Doctors by Denials</h3>
                            <span className="card-subtitle">Highest denial amounts</span>
                        </div>
                        <TopDoctorsWidget data={dashboardData.topDoctors} loading={loading} />
                    </div>

                    {/* Payer Rejections */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>Payer Rejection Rates</h3>
                            <span className="card-subtitle">Insurance company performance</span>
                        </div>
                        <PayerRejectionWidget data={dashboardData.payerData} loading={loading} />
                    </div>
                </div>
            </div>

            <ProfileEditModal
                user={displayUser}
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSave={() => setRefreshKey(prev => prev + 1)}
            />

            <style>{`
                .medical-dashboard {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xl);
                    padding-bottom: 40px;
                    min-height: 100vh;
                }

                /* Header Section */
                .dashboard-header {
                    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%);
                    border-radius: var(--radius-lg);
                    padding: 32px;
                    color: white;
                    box-shadow: var(--shadow-lg);
                    position: relative;
                    overflow: hidden;
                }

                .dashboard-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 200px;
                    height: 200px;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    border-radius: 50%;
                    transform: translate(50%, -50%);
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: relative;
                    z-index: 1;
                }

                .dashboard-title {
                    font-size: 2rem;
                    font-weight: 700;
                    margin: 0 0 8px 0;
                    color: white;
                }

                .dashboard-subtitle {
                    font-size: 1.1rem;
                    color: rgba(255, 255, 255, 0.9);
                    margin: 0;
                }

                .user-profile-compact {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    background: rgba(255, 255, 255, 0.15);
                    padding: 16px 20px;
                    border-radius: var(--radius-lg);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .profile-avatar-small {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                .profile-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .profile-name {
                    font-weight: 600;
                    font-size: 1rem;
                    color: white;
                }

                .profile-role {
                    font-size: 0.875rem;
                    color: rgba(255, 255, 255, 0.8);
                }

                .btn-profile-edit {
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 8px 16px;
                    border-radius: var(--radius-md);
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-profile-edit:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-1px);
                }

                /* Dashboard Sections */
                .dashboard-section {
                    margin: 0;
                }

                .dashboard-content-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: var(--spacing-xl);
                }

                .dashboard-main {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-lg);
                }

                .dashboard-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-lg);
                }

                .dashboard-card {
                    background: var(--bg-card);
                    border-radius: var(--radius-lg);
                    padding: 24px;
                    box-shadow: var(--shadow-sm);
                    border: 1px solid var(--border-color);
                    transition: box-shadow 0.2s;
                }


                .dashboard-card:hover {
                    box-shadow: var(--shadow-md);
                }

                .card-header {
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--border-color);
                }


                .card-header h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--text-main);
                    margin: 0 0 4px 0;
                }

                .card-subtitle {
                    font-size: 0.875rem;
                    color: var(--text-muted);
                }

                /* Responsive Design */
                @media (max-width: 1200px) {
                    .dashboard-content-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .dashboard-sidebar {
                        order: -1;
                    }
                }

                @media (max-width: 768px) {
                    .header-content {
                        flex-direction: column;
                        gap: 20px;
                        text-align: center;
                    }
                    
                    .dashboard-title {
                        font-size: 1.5rem;
                    }
                    
                    .dashboard-subtitle {
                        font-size: 1rem;
                    }
                    
                    .user-profile-compact {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default MedicalDashboard;