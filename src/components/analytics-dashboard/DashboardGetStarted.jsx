import React from 'react';
import './DashboardGetStarted.css';

const FILTER_CHIPS = [
  { key: 'year', label: 'Year' },
  { key: 'office', label: 'Office' },
  { key: 'searchOn', label: 'Search on' },
];

/**
 * Shown before the first Apply on a dashboard page.
 */
const DashboardGetStarted = ({ title = 'Overview' }) => (
  <div className="dashboard-get-started" role="status">
    <div className="dashboard-get-started-panel">
      <div className="dashboard-get-started-visual" aria-hidden>
        <span className="dashboard-get-started-orb" />
        <span className="dashboard-get-started-orb dashboard-get-started-orb--2" />
      </div>

      <div className="dashboard-get-started-content">
        <p className="dashboard-get-started-kicker">Ready when you are</p>
        <h2 className="dashboard-get-started-title">
          Get started with {title}
        </h2>
        <p className="dashboard-get-started-lead">
          Set Year, Office, and Search on above, then click Apply filter. This page loads only after you apply.
        </p>

        <div className="dashboard-get-started-chips" aria-label="Required filters">
          {FILTER_CHIPS.map((chip) => (
            <span key={chip.key} className="dashboard-get-started-chip">
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default DashboardGetStarted;
