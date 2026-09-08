import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingDown,
  Stethoscope,
  UserRoundSearch,
  Building2,
  Ban,
  Wallet,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import './styles.css';

const SECTIONS = [
  { path: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  { path: 'rejection', label: 'Rejection Analytics', shortLabel: 'Rejection', icon: TrendingDown },
  { path: 'doctor', label: 'Doctor Performance', shortLabel: 'Doctor', icon: Stethoscope },
  { path: 'doctor-rejection', label: 'Doctor Rejection Analysis', shortLabel: 'Dr Rej', icon: UserRoundSearch },
  { path: 'payer', label: 'Payer Performance', shortLabel: 'Payer', icon: Building2 },
  { path: 'denial', label: 'Denial Analysis', shortLabel: 'Denial', icon: Ban },
  { path: 'financial', label: 'Financial Risk', shortLabel: 'Financial', icon: Wallet },
];

const DashboardNav = ({ className = '', embedded = false }) => {
  const { path: portalPath } = usePortal();
  return (
  <nav
    className={`dashboard-nav${embedded ? ' dashboard-nav--embedded' : ''} ${className}`.trim()}
    aria-label="Analytics sections"
  >
    <div className="dashboard-nav-inner">
      <ul className="dashboard-nav-list">
        {SECTIONS.map(({ path, label, shortLabel, icon: Icon }) => (
          <li key={path}>
            <NavLink
              to={portalPath(`/dashboard/${path}`)}
              className={({ isActive }) =>
                `dashboard-nav-link${embedded ? ' dashboard-nav-link--header' : ''} ${isActive ? 'active' : ''}`
              }
              end={path === 'overview'}
              title={label}
            >
              <Icon className="dashboard-nav-icon" size={embedded ? 13 : 16} aria-hidden />
              {embedded ? (
                <>
                  <span className="dashboard-nav-text dashboard-nav-text--full">{label}</span>
                  <span className="dashboard-nav-text dashboard-nav-text--short">{shortLabel}</span>
                </>
              ) : (
                <>
                  <span className="dashboard-nav-text dashboard-nav-text--full">{label}</span>
                  <span className="dashboard-nav-text dashboard-nav-text--short">{shortLabel}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  </nav>
  );
};

export default DashboardNav;
