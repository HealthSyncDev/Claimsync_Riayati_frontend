import React from 'react';
import './styles.css';

const SectionSkeleton = () => (
  <div className="section-skeleton">
    <div className="analytics-skeleton" style={{ height: 32, width: 200, marginBottom: 16 }} />
    <div className="analytics-grid-2" style={{ marginBottom: 24 }}>
      <div className="analytics-skeleton analytics-skeleton-chart" />
      <div className="analytics-skeleton analytics-skeleton-chart" />
    </div>
    <div className="analytics-skeleton analytics-skeleton-chart" style={{ height: 320 }} />
  </div>
);

export default SectionSkeleton;
