import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { DASHBOARD_APIS_LINKED } from '../../../config/dashboardApiMode';
import ProfileEditModal from './ProfileEditModal';
import DashboardShell from '../../../components/analytics-dashboard/DashboardShell';
import SectionSkeleton from '../../../components/analytics-dashboard/SectionSkeleton';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import '../../../components/analytics-dashboard/styles.css';

const UserDashboard = () => {
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const getUserId = () => user?.userId || user?.id;

  useEffect(() => {
    if (!DASHBOARD_APIS_LINKED) return undefined;

    const controller = new AbortController();
    const { signal } = controller;
    const fetchProfile = async () => {
      const userId = getUserId();
      if (!userId) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
          signal,
        });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
          if (data.officeId && (!user.officeId || user.officeId !== data.officeId)) {
            updateUser({ officeId: data.officeId, ...data });
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      }
    };
    fetchProfile();
    return () => controller.abort();
  }, [user?.userId, user?.id, updateUser, user?.officeId]);

  const displayUser = DASHBOARD_APIS_LINKED ? (profileData || user) : user;

  return (
    <div className="dashboard-container fade-in">
      <main className="dashboard-content">
        <DashboardShell>
          <ErrorBoundary>
            <Suspense key={location.pathname} fallback={<SectionSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </DashboardShell>
      </main>

      <ProfileEditModal
        user={displayUser}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={() => {}}
      />
    </div>
  );
};

export default UserDashboard;
