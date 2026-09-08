import React from 'react';
import TopbarUserMenu from './TopbarUserMenu';
import './Topbar.css';

const Topbar = ({ title, subtitle, variant }) => (
  <header className={`topbar${variant ? ` topbar--${variant}` : ''}`}>
    <div className="topbar-left">
      <div className="topbar-title-block">
        {variant === 'workspace' && (
          <span className="topbar-eyebrow">Reports</span>
        )}
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
      </div>
    </div>

    <div className="topbar-right">
      <TopbarUserMenu />
    </div>
  </header>
);

export default Topbar;
