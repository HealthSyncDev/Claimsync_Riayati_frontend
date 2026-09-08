import React, { useState } from 'react';
import { getRejectionPctBand } from '../../utils/rejectionPctHeat';
import './ExecutiveSummaryTable.css';

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
  { key: 'contribution', label: 'Contribution %', align: 'right', type: 'pct', presets: ['full'] },
  { key: 'currentMedicalRejectedAmount', label: 'Medical Rejected', align: 'right', type: 'amount', presets: ['rejection', 'full'] },
  { key: 'medicalRejectedPercentage', label: 'Medical Rej %', align: 'right', type: 'pct', isRejection: true, presets: ['rejection', 'full'] },
  { key: 'currentTechnicalRejectedAmount', label: 'Technical Rejected', align: 'right', type: 'amount', presets: ['rejection', 'full'] },
  { key: 'technicalRejectedPercentage', label: 'Technical Rej %', align: 'right', type: 'pct', isRejection: true, presets: ['rejection', 'full'] },
  { key: 'medicalDenialsRR', label: 'Medical RR %', align: 'right', type: 'pct', isRejection: true, presets: ['rejection', 'full'] },
  { key: 'technicalDenialRR', label: 'Technical RR %', align: 'right', type: 'pct', isRejection: true, presets: ['rejection', 'full'] },
];

const formatAmount = (n) => {
  if (n == null || n === '' || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatPct = (n) => {
  if (n == null || n === '' || Number.isNaN(n)) return '—';
  return `${Number(n).toFixed(1)}%`;
};

const ExecutiveSummaryTable = ({
  data,
  paymentData,
  reportType: controlledReportType,
  onReportTypeChange,
  columnPreset = 'financial',
  year = '2026',
  loading = false,
  className = '',
  compactHeader = false,
}) => {
  const [internalReportType, setInternalReportType] = useState('service-month');
  const reportType = controlledReportType ?? internalReportType;

  if (loading) {
    return (
      <div className={`exec-summary-card ${className}`}>
        <div className="exec-summary-header exec-summary-header--compact">
          <div className="exec-summary-skeleton-title" />
        </div>
        <div className="exec-summary-skeleton-table" />
      </div>
    );
  }

  const isServiceMonth = reportType === 'service-month';
  const hasServiceData = data?.monthlyRows?.length || data?.claimTypeRows?.length;
  const hasPaymentTableData = paymentData?.monthlyRows?.length || paymentData?.claimTypeRows?.length;
  const hasPaymentKpis = paymentData && !paymentData.monthlyRows && Object.keys(paymentData).length > 0;

  const tableData = isServiceMonth ? data : (hasPaymentTableData ? paymentData : null);

  if (!hasServiceData && !hasPaymentTableData && !hasPaymentKpis) return null;

  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.key === 'yearMonth') return yearMonthToMonthName(val) ?? '—';
    if (col.type === 'amount') return formatAmount(val);
    if (col.type === 'pct') return formatPct(val);
    return val ?? '—';
  };

  const kpisToSummaryRow = (k) => {
    const claimed = k.totalClaimedAmount ?? 0;
    const paid = k.totalRemittedAmount ?? 0;
    const rejected = k.totalRejectedAmount ?? 0;
    const unprocessed = k.totalUnprocessedAmount ?? 0;
    const processed = claimed - unprocessed;
    return {
      key: 'total',
      isTotal: true,
      yearMonth: 'Total',
      claimedAmount: claimed,
      processedAmount: processed,
      paidAmount: paid,
      initialRejectedAmount: null,
      initialRejectedPercentage: null,
      currentRejectedAmount: rejected,
      currentRejectedPercentage: processed > 0 ? (rejected / processed) * 100 : null,
      unprocessedAmount: unprocessed,
      processedAmountPercentage: claimed > 0 ? (processed / claimed) * 100 : null,
      contribution: null,
      currentMedicalRejectedAmount: null,
      medicalRejectedPercentage: null,
      currentTechnicalRejectedAmount: null,
      technicalRejectedPercentage: null,
      medicalDenialsRR: null,
      technicalDenialRR: null,
    };
  };

  const displayData = tableData ?? (hasPaymentKpis ? { monthlyRows: [kpisToSummaryRow(paymentData)], dividerRow: false, claimTypeRows: [] } : null);

  const visibleColumns = COLUMNS.filter((col) => col.presets?.includes(columnPreset));

  const pctHeatClass = (col, val) => {
    if (col.type !== 'pct' || !col.isRejection) return '';
    const band = getRejectionPctBand(val);
    if (band === 'critical') return 'exec-summary-td--heat-high';
    if (band === 'warn') return 'exec-summary-td--heat-mid';
    if (band === 'good') return 'exec-summary-td--heat-low';
    return '';
  };

  return (
    <div className={`exec-summary-card ${className}`}>
      <header className={`exec-summary-header${compactHeader ? ' exec-summary-header--compact' : ''}`}>
        <h2 className="exec-summary-title">Insurance Rejection Data</h2>
      </header>

      <div className="exec-summary-scroll-wrap">
        <div className="exec-summary-scroll-fade exec-summary-scroll-fade--right" aria-hidden />
        <div className="exec-summary-table-wrap">
          <table className="exec-summary-table">
            <thead>
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`exec-summary-th exec-summary-th--${col.align} ${col.sticky ? 'exec-summary-th--sticky' : ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData?.monthlyRows?.length ? displayData.monthlyRows.map((row, i) => (
                <tr
                  key={row.key ?? i}
                  className={
                    row.isTotal
                      ? 'exec-summary-tr exec-summary-tr--total'
                      : 'exec-summary-tr'
                  }
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`exec-summary-td exec-summary-td--${col.align} exec-summary-td--${col.type} ${col.sticky ? 'exec-summary-td--sticky' : ''} ${pctHeatClass(col, row[col.key])}`}
                      data-is-rejection={col.isRejection ? 'true' : undefined}
                    >
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="exec-summary-td exec-summary-td--left" style={{ padding: 24, color: 'var(--exec-text-muted)' }}>
                    No data available
                  </td>
                </tr>
              )}

              {displayData?.dividerRow && displayData?.monthlyRows?.length > 0 && (
                <tr className="exec-summary-tr exec-summary-tr--spacer">
                  <td colSpan={visibleColumns.length} />
                </tr>
              )}

              {displayData?.claimTypeRows?.length > 0 &&
              displayData.claimTypeRows.map((row, i) => (
                <tr
                  key={row.key ?? i}
                  className={`exec-summary-tr exec-summary-tr--section ${row.isTotal ? 'exec-summary-tr--section-total' : ''}`}
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`exec-summary-td exec-summary-td--${col.align} exec-summary-td--${col.type} ${col.sticky ? 'exec-summary-td--sticky' : ''} ${pctHeatClass(col, row[col.key])}`}
                      data-is-rejection={col.isRejection ? 'true' : undefined}
                    >
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummaryTable;
export { formatAmount, formatPct };
