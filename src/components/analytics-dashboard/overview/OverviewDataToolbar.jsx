import React from 'react';
import './OverviewDataToolbar.css';

const OverviewDataToolbar = ({
  variant = 'inline',
  year,
  asOfDate,
  onExport,
  exporting = false,
}) => {
  const displayDate = asOfDate
    ?? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className={`overview-data-toolbar${variant === 'header' ? ' overview-data-toolbar--header' : ''}`}>
      <div className="overview-data-toolbar-meta">
        <span className="overview-data-toolbar-date">{year} · As of {displayDate}</span>
        <button
          type="button"
          className="overview-data-toolbar-export"
          onClick={onExport}
          disabled={exporting}
        >
          {exporting ? 'Downloading…' : 'Export Report'}
        </button>
      </div>
    </div>
  );
};

export default OverviewDataToolbar;
