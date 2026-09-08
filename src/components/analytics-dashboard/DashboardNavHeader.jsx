import React from 'react';
import DashboardNav from './DashboardNav';
import GlobalFilters from './GlobalFilters';
import TopbarUserMenu from '../topbar/TopbarUserMenu';
import '../topbar/Topbar.css';
import './DashboardNavHeader.css';
import './DashboardShell.css';

/** Section tabs (row 1) + shared filters (row 2). */
const DashboardNavHeader = () => (
  <div className="dashboard-nav-header">
    <div className="dashboard-nav-header-tabs">
      <div className="dashboard-nav-header-tabs-main">
        <DashboardNav embedded />
      </div>
      <TopbarUserMenu className="dashboard-nav-header-user" />
    </div>

    <div className="dashboard-nav-header-filters">
      <span className="dashboard-nav-header-filters-hint">Shared across all sections</span>
      <GlobalFilters variant="nav-inline" />
    </div>
  </div>
);

export default DashboardNavHeader;
