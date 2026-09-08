import React from 'react';
import './EmptyState.css';

const EmptyState = ({ title = 'No data available', message, action }) => (
  <div className="dashboard-empty-state" role="status">
    <div className="dashboard-empty-icon" aria-hidden>—</div>
    <h3 className="dashboard-empty-title">{title}</h3>
    {message && <p className="dashboard-empty-message">{message}</p>}
    {action}
  </div>
);

export default EmptyState;
