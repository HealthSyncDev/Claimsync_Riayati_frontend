import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';
import { CLAIM_PORTALS, portalHref } from './config/portals';
import { PortalProvider } from './context/PortalContext';

import Login from './pages/auth/Login';
import ActivateLicense from './pages/auth/ActivateLicense';
import AdminDashboard from './pages/admin/dashboard/AdminDashboard';
import UserList from './pages/admin/users/UserList';
import AddUser from './pages/admin/users/AddUser';

import CRSReport from './pages/user/crs-report/CRSReport';
import ResubmissionReport from './pages/user/crs-report/ResubmissionReport';
import ResubmissionLayout from './pages/user/crs-report/ResubmissionLayout';
import ResubmissionClaimDetail from './pages/user/crs-report/ResubmissionClaimDetail';
import ResubmissionVerificationPage from './pages/user/crs-report/ResubmissionVerificationPage';
import ResubmissionInsurerClaims from './pages/user/crs-report/ResubmissionInsurerClaims';
import UserDashboard from './pages/user/dashboard/UserDashboard';
import ActivitiesLayout from './pages/user/activities/ActivitiesLayout';
import ActivityTimelinePage from './pages/user/activities/ActivityTimelinePage';
import ClaimDetailsPage from './pages/user/claim-details/ClaimDetailsPage';

const LazyOverview = lazy(() => import('./components/analytics-dashboard/overview'));
const LazyRejection = lazy(() => import('./components/analytics-dashboard/rejection'));
const LazyDoctor = lazy(() => import('./components/analytics-dashboard/doctor'));
const LazyDoctorRejection = lazy(() => import('./components/analytics-dashboard/doctor-rejection'));
const LazyPayer = lazy(() => import('./components/analytics-dashboard/payer'));
const LazyDenial = lazy(() => import('./components/analytics-dashboard/denial'));
const LazyFinancial = lazy(() => import('./components/analytics-dashboard/financial'));
import OfficeList from './pages/admin/offices/OfficeList';
import CategoryList from './pages/admin/categories/CategoryList';
import DesignationList from './pages/admin/designations/DesignationList';
import DepartmentList from './pages/admin/departments/DepartmentList';
import ClinicianList from './pages/admin/clinicians/ClinicianList';
import DenialCodeList from './pages/admin/denial-codes/DenialCodeList';
import DenialReasonList from './pages/admin/denial-reasons/DenialReasonList';
import EncounterTypeList from './pages/admin/encounter-types/EncounterTypeList';
import PayerIdList from './pages/admin/payer-ids/PayerIdList';
import SenderList from './pages/admin/senders/SenderList';
import CptCodeMappingList from './pages/admin/cpt-code-mapping/CptCodeMappingList';
import Settings from './pages/settings/Settings';

function claimPortalRoutes(portal) {
  const p = (path) => portalHref(portal, path);
  return (
    <React.Fragment key={portal.id}>
      {portal.prefix ? (
        <Route path={portal.prefix} element={<Navigate to={p('/dashboard')} replace />} />
      ) : null}
      <Route path={p('/dashboard')} element={<UserDashboard />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<LazyOverview />} />
        <Route path="rejection" element={<LazyRejection />} />
        <Route path="doctor" element={<LazyDoctor />} />
        <Route path="doctor-rejection" element={<LazyDoctorRejection />} />
        <Route path="payer" element={<LazyPayer />} />
        <Route path="denial" element={<LazyDenial />} />
        <Route path="financial" element={<LazyFinancial />} />
      </Route>
      <Route path={p('/crs/claims')} element={<CRSReport />} />
      <Route path={p('/crs/claims/:claimId')} element={<ClaimDetailsPage />} />
      <Route path={p('/crs/activities')} element={<ActivitiesLayout />}>
        <Route path="timeline/:claimId" element={<ActivityTimelinePage />} />
      </Route>
      <Route path={p('/crs/claim-summary-month')} element={<CRSReport />} />
      <Route path={p('/crs/claim-summary-payer')} element={<CRSReport />} />
      <Route path={p('/crs/resubmission')} element={<ResubmissionLayout />}>
        <Route index element={<ResubmissionReport />} />
        <Route path="payer/:insurerKey" element={<ResubmissionInsurerClaims />} />
        <Route path="insurer/:insurerKey" element={<ResubmissionInsurerClaims />} />
        <Route path="verification" element={<Navigate to={p('/crs/resubmission')} replace />} />
        <Route path="verification/:claimId" element={<ResubmissionVerificationPage bucket="verification" />} />
        <Route path="submit" element={<Navigate to={p('/crs/resubmission')} replace />} />
        <Route path="submit/:claimId" element={<ResubmissionVerificationPage bucket="submit" />} />
        <Route path="resubmitted" element={<Navigate to={p('/crs/resubmission')} replace />} />
        <Route path="resubmitted/:claimId" element={<ResubmissionVerificationPage bucket="resubmitted" />} />
        <Route path="pending" element={<Navigate to={p('/crs/resubmission')} replace />} />
        <Route path="pending/:claimId" element={<ResubmissionVerificationPage bucket="pending" />} />
        <Route path=":claimId" element={<ResubmissionClaimDetail />} />
      </Route>
    </React.Fragment>
  );
}

function App() {
  return (
    <BrowserRouter>
      <PortalProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'var(--font-family-sans)',
              fontSize: '0.8125rem',
            },
          }}
        />
        <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public / Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Login role="admin" />} />
          <Route path="/activate-license" element={<ActivateLicense />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/add" element={<AddUser />} />
          <Route path="users/edit/:id" element={<AddUser />} />
          <Route path="users/view/:id" element={<AddUser />} />
          <Route path="office" element={<OfficeList />} />
          <Route path="categories" element={<CategoryList />} />
          <Route path="designation" element={<DesignationList />} />
          <Route path="departments" element={<DepartmentList />} />
          <Route path="clinicians" element={<ClinicianList />} />
          <Route path="denial-codes" element={<DenialCodeList />} />
          <Route path="denial-reasons" element={<DenialReasonList />} />
          <Route path="encounter-types" element={<EncounterTypeList />} />
          <Route path="cpt-code-mapping" element={<CptCodeMappingList />} />
          <Route path="payer-ids" element={<PayerIdList />} />
          <Route path="senders" element={<SenderList />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* User Routes — DHPO keeps /dashboard and /crs/*; Riayati and Shafafi use prefixed copies */}
        <Route element={<UserLayout />}>
          {CLAIM_PORTALS.map((portal) => claimPortalRoutes(portal))}
          <Route path="/settings" element={<Settings />} />

          {/* Redirects for old routes (optional but good for safety) */}
          <Route path="/crs-reports" element={<Navigate to="/crs/claims" replace />} />
          <Route path="/activities" element={<Navigate to="/crs/activities" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </PortalProvider>
      </BrowserRouter>
  );
}

export default App;
