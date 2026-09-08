import React from 'react';
import './DashboardPageLoader.css';

/**
 * Simple buffering spinner for a dashboard tab while its API is in flight.
 * Replaces the old global "Dashboard loading" modal — each page shows this
 * until its own query succeeds, then paints data immediately.
 */
const DashboardPageLoader = ({ label = 'Loading…' }) => (
  <div className="dashboard-page-loader" role="status" aria-live="polite" aria-busy="true">
    <div className="dashboard-page-loader-spinner" aria-hidden />
    <p className="dashboard-page-loader-label">{label}</p>
  </div>
);

export default DashboardPageLoader;
