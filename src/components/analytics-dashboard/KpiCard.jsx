import React from 'react';
import './KpiCard.css';

const MiniSparkline = ({ values = [], accent = 'neutral' }) => {
  const pts = values.filter((v) => v != null && !Number.isNaN(Number(v))).map(Number);
  if (pts.length < 2) return null;

  const w = 72;
  const h = 28;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const coords = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className={`kpi-sparkline kpi-sparkline--${accent}`} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={coords} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const DeltaChip = ({ delta, deltaLabel, accent }) => {
  if (delta == null || Number.isNaN(delta)) return null;
  const isUp = delta > 0;
  const isDown = delta < 0;
  const cls = isUp ? 'up' : isDown ? 'down' : 'flat';
  const sign = isUp ? '+' : '';
  return (
    <span className={`kpi-delta kpi-delta--${cls} kpi-delta--accent-${accent}`} title={deltaLabel}>
      {sign}
      {typeof delta === 'number' && Math.abs(delta) < 100 && !String(delta).includes('%')
        ? delta.toFixed(1)
        : delta}
      {deltaLabel?.includes('%') ? '%' : ''}
      {deltaLabel && !deltaLabel.includes('%') ? ` ${deltaLabel}` : ''}
    </span>
  );
};

const KpiCard = ({
  label,
  value,
  valueTitle,
  accent = 'neutral',
  size = 'primary',
  sparkline,
  delta,
  deltaLabel,
  className = '',
}) => (
  <div className={`kpi-card kpi-calm kpi-card--${size} kpi-accent--${accent} ${className}`.trim()}>
    <div className="kpi-content">
      <div className="kpi-top-row">
        <span className="kpi-label">{label}</span>
        {sparkline?.length > 1 && <MiniSparkline values={sparkline} accent={accent} />}
      </div>
      <span className="kpi-value" title={valueTitle ?? (typeof value === 'string' ? value : undefined)}>{value}</span>
      <div className="kpi-bottom-row">
        <DeltaChip delta={delta} deltaLabel={deltaLabel} accent={accent} />
      </div>
    </div>
  </div>
);

export default KpiCard;
