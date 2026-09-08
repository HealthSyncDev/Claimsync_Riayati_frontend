import React from 'react';
import '../overview/OverviewDataToolbar.css';
import './FinancialDataToolbar.css';

const FinancialDataToolbar = ({
  variant = 'inline',
  year,
  asOfDate,
  onExport,
  exporting = false,
}) => {
  const displayDate = asOfDate
    ?? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className={`overview-data-toolbar financial-data-toolbar${variant === 'header' ? ' overview-data-toolbar--header' : ''}`}>
      {variant !== 'header' && (
        <div className="overview-data-toolbar-controls financial-data-toolbar-controls">
          <span className="overview-data-toolbar-context">Write-off, unprocessed, and settlement metrics</span>
        </div>
      )}
      <div className="overview-data-toolbar-meta">
        <span className="overview-data-toolbar-date">{year} · As of {displayDate}</span>
        {onExport && (
          <button
            type="button"
            className="overview-data-toolbar-export"
            onClick={onExport}
            disabled={exporting}
          >
            {exporting ? 'Downloading…' : 'Export Report'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FinancialDataToolbar;
