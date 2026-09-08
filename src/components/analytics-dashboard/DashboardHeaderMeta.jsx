import React from 'react';
import { useDashboardHeaderMetaContext } from '../../context/DashboardHeaderMetaContext';
import './DashboardHeaderMeta.css';

const DashboardHeaderMeta = () => {
  const { meta } = useDashboardHeaderMetaContext();
  if (!meta?.year) return null;

  const displayDate = meta.asOfDate
    ?? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="dashboard-nav-header-actions">
      <span className="dashboard-header-meta-date">
        {meta.year} · As of {displayDate}
      </span>
      {meta.onExport && (
        <button
          type="button"
          className="dashboard-header-export-btn"
          onClick={meta.onExport}
          disabled={meta.exportDisabled || meta.exporting}
        >
          {meta.exporting ? 'Exporting…' : 'Export Report'}
        </button>
      )}
    </div>
  );
};

export default DashboardHeaderMeta;
