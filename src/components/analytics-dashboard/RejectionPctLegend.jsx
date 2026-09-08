import React from 'react';
import { REJECTION_PCT_SCALES } from '../../utils/rejectionPctHeat';
import './RejectionPctLegend.css';

/**
 * Shared rejection % color legend.
 * @param {{ scale?: 'tight' | 'full', className?: string, 'aria-label'?: string }} props
 */
const RejectionPctLegend = ({
  scale = 'tight',
  className = '',
  'aria-label': ariaLabel = 'Rejection percentage color scale',
}) => {
  const labels = (REJECTION_PCT_SCALES[scale] ?? REJECTION_PCT_SCALES.tight).labels;
  return (
    <div className={`rejection-pct-legend${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      <span className="rejection-pct-legend-item rejection-pct-legend-item--good">{labels.good}</span>
      <span className="rejection-pct-legend-item rejection-pct-legend-item--warn">{labels.warn}</span>
      <span className="rejection-pct-legend-item rejection-pct-legend-item--critical">{labels.critical}</span>
    </div>
  );
};

export default RejectionPctLegend;
