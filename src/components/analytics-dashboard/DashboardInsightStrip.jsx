import React from 'react';
import { Sparkles } from 'lucide-react';
import './DashboardInsightStrip.css';

const DashboardInsightStrip = ({ items = [], variant = 'strip' }) => {
  const visible = items.filter(Boolean);
  if (!visible.length) return null;

  if (variant === 'panel') {
    return (
      <div className="dashboard-insights dashboard-insights--panel" role="note" aria-label="Key insights">
        <div className="dashboard-insights-header">
          <Sparkles size={14} aria-hidden />
          <span>Insights</span>
        </div>
        <div className="dashboard-insights-grid">
          {visible.map((item, i) => (
            <div key={i} className="dashboard-insight-card">
              <p className="dashboard-insight-card-text">{item}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-insights" role="note" aria-label="Key insights">
      <div className="dashboard-insights-header">
        <Sparkles size={14} aria-hidden />
        <span>Insights</span>
      </div>
      <div className="dashboard-insights-grid">
        {visible.map((item, i) => (
          <div key={i} className="dashboard-insight-card">
            <p className="dashboard-insight-card-text">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardInsightStrip;
