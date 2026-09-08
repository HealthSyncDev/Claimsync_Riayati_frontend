import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import LastSyncIndicator from '../common/LastSyncIndicator';
import { DASHBOARD_SECTION_META, getDashboardSectionKey } from './dashboardSectionMeta';
import { DashboardPageHeaderContext } from '../../context/DashboardPageHeaderContext';
import { useDashboardFilters } from '../../context/DashboardFiltersContext';
import DashboardGetStarted from './DashboardGetStarted';
import './DashboardShell.css';

const DashboardShell = ({ children }) => {
  const location = useLocation();
  const sectionKey = getDashboardSectionKey(location.pathname);
  const meta = DASHBOARD_SECTION_META[sectionKey] ?? DASHBOARD_SECTION_META.overview;
  const [headerTrailing, setHeaderTrailing] = useState(null);
  const isDoctorRejection = sectionKey === 'doctor-rejection';
  const { hasAppliedFilters } = useDashboardFilters();

  return (
    <DashboardPageHeaderContext.Provider value={{ setHeaderTrailing }}>
      <div className="dashboard-shell">
        <header className={`dashboard-shell-header${isDoctorRejection ? ' dashboard-shell-header--doctor-rejection' : ''}`}>
          {isDoctorRejection ? (
            <div className="dashboard-section-toolbar dashboard-section-toolbar--doctor-rejection">
              <div className="dr-header-hero">
                <div className="dr-header-copy">
                  <h1 className="dashboard-shell-title">{meta.title}</h1>
                  <p className="dashboard-shell-subtitle">{meta.subtitle}</p>
                </div>
                <LastSyncIndicator className="dr-header-sync dashboard-shell-sync" />
              </div>
              {headerTrailing && (
                <div className="dr-header-action">{headerTrailing}</div>
              )}
            </div>
          ) : (
            <div className="dashboard-shell-header-main">
              <div className="dashboard-shell-title-block">
                <div className="dashboard-shell-title-row">
                  <h1 className="dashboard-shell-title">{meta.title}</h1>
                  <LastSyncIndicator className="dashboard-shell-sync" />
                </div>
                <p className="dashboard-shell-subtitle">{meta.subtitle}</p>
              </div>
              {headerTrailing && (
                <div className="dashboard-shell-header-aside">{headerTrailing}</div>
              )}
            </div>
          )}
        </header>

        <div className="dashboard-shell-body">
          {hasAppliedFilters ? (
            children
          ) : (
            <DashboardGetStarted title={meta.title} />
          )}
        </div>
      </div>
    </DashboardPageHeaderContext.Provider>
  );
};

export { useDashboardPageHeader } from '../../context/DashboardPageHeaderContext';
export default DashboardShell;
