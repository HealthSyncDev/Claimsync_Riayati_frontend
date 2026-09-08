import React from 'react';

const DashboardCard = ({ title, subtitle, headerActions, children, className = '' }) => (
  <div className={`analytics-card ${className}`}>
    {(title || subtitle || headerActions) && (
      <div className="card-header">
        <div className="card-header-text">
          {title && <h3>{title}</h3>}
          {subtitle && <span className="card-subtitle">{subtitle}</span>}
        </div>
        {headerActions && <div className="card-header-actions">{headerActions}</div>}
      </div>
    )}
    {children}
  </div>
);

export default DashboardCard;
