import React, { useMemo } from 'react';
import DashboardCard from '../DashboardCard';
import RejectionPctLegend from '../RejectionPctLegend';
import {
  REJECTION_MONTHS,
  getMetricTooltip,
  getVisibleMatrixGroups,
  getMatrixRowsForGroups,
  getCompactMonthIndices,
} from '../../../utils/rejectionAnalyticsUtils';
import { getRejectionPctBand } from '../../../utils/rejectionPctHeat';
import './DenialMatrixTable.css';

const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${Number(v).toFixed(1)}%` : '—');
const formatValue = (v) => (v != null && !Number.isNaN(v) ? Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—');

const getPctCellClass = (v) => {
  const band = getRejectionPctBand(v);
  return band ? `denial-matrix-cell--${band}` : '';
};

const AnomalyBadges = ({ anomalies = [] }) => {
  if (!anomalies.length) return null;
  return (
    <div className="denial-matrix-anomalies">
      {anomalies.map((a) => (
        <span key={a.id} className={`denial-matrix-anomaly denial-matrix-anomaly--${a.tone}`}>
          {a.label}
        </span>
      ))}
    </div>
  );
};

const DenialMatrixTable = ({
  data,
  loading = false,
  activeSegment = null,
  highlightMonthIndex = -1,
  claimType = 'All',
  compact = false,
  onToggleCompact,
  anomalies = [],
}) => {
  const tableModel = useMemo(() => {
    if (!data?.matrix?.rows?.length) return null;

    const months = data.months ?? REJECTION_MONTHS;
    const groups = getVisibleMatrixGroups(claimType);
    const groupedRows = getMatrixRowsForGroups(data.matrix.rows, groups);

    const monthIndices = compact
      ? getCompactMonthIndices(months.length, 3)
      : months.map((_, i) => i);

    const visibleMonths = monthIndices.map((i) => months[i]);
    const cols = [...visibleMonths, 'FY Total'];

    return { months, groupedRows, monthIndices, cols, groups };
  }, [data, claimType, compact]);

  if (loading) {
    return (
      <DashboardCard title="Month-wise Denial Matrix" subtitle="Jan – Dec + FY Total" className="denial-matrix-card">
        <div className="denial-matrix-skeleton" />
      </DashboardCard>
    );
  }

  if (!tableModel) return null;

  const { groupedRows, monthIndices, cols } = tableModel;

  const headerActions = (
    <div className="denial-matrix-header-actions">
      <AnomalyBadges anomalies={anomalies} />
      {onToggleCompact && (
        <button type="button" className="denial-matrix-compact-toggle" onClick={onToggleCompact}>
          {compact ? 'Show all months' : 'Compact view'}
        </button>
      )}
    </div>
  );

  let lastGroup = null;

  return (
    <DashboardCard
      title="Month-wise Denial Matrix"
      subtitle="Jan – Dec + FY Total"
      headerActions={headerActions}
      className="denial-matrix-card"
    >
      <RejectionPctLegend />
      <div className="denial-matrix-wrap">
        <table className="denial-matrix-table">
          <thead>
            <tr>
              <th className="denial-matrix-th denial-matrix-th--label denial-matrix-th--sticky">Metric</th>
              {cols.map((c) => (
                <th
                  key={c}
                  className={[
                    'denial-matrix-th',
                    'denial-matrix-th--num',
                    c === 'FY Total' ? 'denial-matrix-th--fy' : '',
                    highlightMonthIndex >= 0 && c === REJECTION_MONTHS[highlightMonthIndex] ? 'denial-matrix-th--highlight' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((row, i) => {
              const showGroupHeader = row.groupLabel !== lastGroup;
              lastGroup = row.groupLabel;
              const dimmed = activeSegment && claimType === 'All' && row.groupId !== activeSegment;

              return (
                <React.Fragment key={`${row.groupId}-${row.label}-${i}`}>
                  {showGroupHeader && (
                    <tr className={`denial-matrix-tr denial-matrix-tr--group${dimmed ? ' denial-matrix-tr--dimmed' : ''}`}>
                      <td colSpan={cols.length + 1} className="denial-matrix-td denial-matrix-td--group">
                        {row.groupLabel}
                      </td>
                    </tr>
                  )}
                  <tr className={`denial-matrix-tr${dimmed ? ' denial-matrix-tr--dimmed' : ''}`}>
                    <td
                      className="denial-matrix-td denial-matrix-td--label denial-matrix-td--sticky"
                      title={getMetricTooltip(row.label)}
                    >
                      {row.label}
                    </td>
                    {monthIndices.map((mi) => {
                      const v = row.values[mi];
                      const highlighted = highlightMonthIndex === mi;
                      return (
                        <td
                          key={mi}
                          className={[
                            'denial-matrix-td',
                            'denial-matrix-td--num',
                            row.type === 'pct' ? getPctCellClass(v) : '',
                            highlighted ? 'denial-matrix-td--highlight' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          {row.type === 'pct' ? formatPct(v) : formatValue(v)}
                        </td>
                      );
                    })}
                    <td
                      className={[
                        'denial-matrix-td',
                        'denial-matrix-td--num',
                        'denial-matrix-td--fy',
                        row.type === 'pct' ? getPctCellClass(row.fy) : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {row.type === 'pct' ? formatPct(row.fy) : formatValue(row.fy)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};

export default DenialMatrixTable;
