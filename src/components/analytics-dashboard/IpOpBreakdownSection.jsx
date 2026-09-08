import React from 'react';
import RejectionPctLegend from './RejectionPctLegend';
import { getRejectionPctBand } from '../../utils/rejectionPctHeat';
import './IpOpBreakdownSection.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const yearMonthToMonthName = (v) => {
  if (v == null || v === '') return '—';
  if (typeof v !== 'string') return String(v);
  if (v === 'Total' || v === 'IP' || v === 'OP') return v;
  const m = v.match(/^\d{4}-(\d{2})$/);
  if (m) {
    const idx = parseInt(m[1], 10) - 1;
    return MONTH_NAMES[idx] ?? v;
  }
  return v;
};

const COLUMNS = [
  { key: 'yearMonth', label: 'Months', align: 'left', type: 'text', sticky: true, presets: ['financial', 'rejection', 'full'] },
  { key: 'claimedAmount', label: 'Claimed Amount', align: 'right', type: 'amount', presets: ['financial', 'full'] },
  { key: 'paidAmount', label: 'Paid Amount', align: 'right', type: 'amount', presets: ['financial', 'full'] },
  { key: 'processedAmount', label: 'Processed Amount', align: 'right', type: 'amount', presets: ['financial', 'full'] },
  { key: 'processedAmountPercentage', label: 'Processed %', align: 'right', type: 'pct', presets: ['financial', 'full'] },
  { key: 'initialRejectedAmount', label: 'Initial Rejected', align: 'right', type: 'amount', presets: ['financial', 'rejection', 'full'] },
  { key: 'initialRejectedPercentage', label: 'Initial Rej %', align: 'right', type: 'pct', isRejection: true, presets: ['financial', 'rejection', 'full'] },
  { key: 'currentRejectedAmount', label: 'Current Rejected', align: 'right', type: 'amount', presets: ['financial', 'rejection', 'full'] },
  { key: 'currentRejectedPercentage', label: 'Curr. Rej %', align: 'right', type: 'pct', isRejection: true, presets: ['financial', 'rejection', 'full'] },
  { key: 'unprocessedAmount', label: 'Unprocessed', align: 'right', type: 'amount', presets: ['financial', 'full'] },
];

const formatAmount = (n) => {
  if (n == null || n === '' || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatPct = (n) => {
  if (n == null || n === '' || Number.isNaN(n)) return '—';
  return `${Number(n).toFixed(1)}%`;
};

const pctHeatClass = (col, val) => {
  if (col.type !== 'pct' || !col.isRejection) return '';
  const band = getRejectionPctBand(val);
  if (band === 'critical') return 'ipop-td--heat-high';
  if (band === 'warn') return 'ipop-td--heat-mid';
  if (band === 'good') return 'ipop-td--heat-low';
  return '';
};

const IpOpBreakdownSection = ({
  ipTable,
  opTable,
  columnPreset = 'financial',
  loading = false,
  error,
  refetch,
}) => {
  const visibleColumns = COLUMNS.filter((col) => col.presets?.includes(columnPreset));

  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.key === 'yearMonth') return yearMonthToMonthName(val) ?? '—';
    if (col.type === 'amount') return formatAmount(val);
    if (col.type === 'pct') return formatPct(val);
    return val ?? '—';
  };

  return (
    <div className="ipop-breakdown-section">
      <header className="ipop-breakdown-header ipop-breakdown-header--compact">
        <h2 className="ipop-breakdown-title">Claim Type Breakdown (IP / OP)</h2>
      </header>

      <RejectionPctLegend />

      {error && (
        <div className="ipop-breakdown-error">
          <span className="ipop-breakdown-error-icon">⚠</span>
          <span>{error}</span>
          {refetch && (
            <button type="button" className="ipop-breakdown-error-retry" onClick={refetch}>
              Retry
            </button>
          )}
        </div>
      )}

      <div className="ipop-single-table-wrap">
        {loading ? (
          <div className="ipop-table-skeleton" />
        ) : (
          <div className="ipop-table-scroll-wrap">
            <div className="ipop-table-scroll-fade ipop-table-scroll-fade--right" aria-hidden />
            <div className="ipop-table-wrap">
              <table className="ipop-unified-table">
                <thead>
                  <tr>
                    {visibleColumns.map((col) => (
                      <th
                        key={col.key}
                        className={`ipop-th ipop-th--${col.align} ${col.sticky ? 'ipop-th--sticky' : ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const ipRows = ipTable?.monthlyRows ?? [];
                    const opRows = opTable?.monthlyRows ?? [];
                    const hasData = ipRows.length > 0 || opRows.length > 0;
                    const colSpan = visibleColumns.length;

                    if (!hasData) {
                      return (
                        <tr>
                          <td colSpan={colSpan} className="ipop-td ipop-td--empty">
                            No data available
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <>
                        {ipRows.length > 0 && (
                          <>
                            <tr className="ipop-tr ipop-tr--section-header ipop-tr--ip">
                              <td colSpan={colSpan} className="ipop-td ipop-td--section-label">
                                <span className="ipop-section-badge ipop-section-badge--ip">IP — Inpatient</span>
                              </td>
                            </tr>
                            {ipRows.map((row, i) => (
                              <tr
                                key={`ip-${row.key ?? i}`}
                                className={`ipop-tr ipop-tr--ip ${row.isTotal ? 'ipop-tr--total' : ''}`}
                              >
                                {visibleColumns.map((col) => (
                                  <td
                                    key={col.key}
                                    className={`ipop-td ipop-td--${col.align} ipop-td--${col.type} ${col.sticky ? 'ipop-td--sticky' : ''} ${pctHeatClass(col, row[col.key])}`}
                                    data-is-rejection={col.isRejection ? 'true' : undefined}
                                  >
                                    {renderCell(col, row)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </>
                        )}

                        {ipRows.length > 0 && opRows.length > 0 && (
                          <tr className="ipop-tr ipop-tr--spacer">
                            <td colSpan={colSpan} />
                          </tr>
                        )}

                        {opRows.length > 0 && (
                          <>
                            <tr className="ipop-tr ipop-tr--section-header ipop-tr--op">
                              <td colSpan={colSpan} className="ipop-td ipop-td--section-label">
                                <span className="ipop-section-badge ipop-section-badge--op">OP — Outpatient</span>
                              </td>
                            </tr>
                            {opRows.map((row, i) => (
                              <tr
                                key={`op-${row.key ?? i}`}
                                className={`ipop-tr ipop-tr--op ${row.isTotal ? 'ipop-tr--total' : ''}`}
                              >
                                {visibleColumns.map((col) => (
                                  <td
                                    key={col.key}
                                    className={`ipop-td ipop-td--${col.align} ipop-td--${col.type} ${col.sticky ? 'ipop-td--sticky' : ''} ${pctHeatClass(col, row[col.key])}`}
                                    data-is-rejection={col.isRejection ? 'true' : undefined}
                                  >
                                    {renderCell(col, row)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IpOpBreakdownSection;
