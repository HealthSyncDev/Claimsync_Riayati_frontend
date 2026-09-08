import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChevronDown, LineChart, Stethoscope } from 'lucide-react';
import KpiCard from '../KpiCard';
import DoctorRejectionClinicianBar from './DoctorRejectionClinicianBar';
import { useDoctorRejection } from '../../../context/DoctorRejectionContext';
import { useDashboardPageHeader } from '../../../context/DashboardPageHeaderContext';
import { useDashboardOfficeScope } from '../../../hooks/useDashboardOfficeScope';
import { useDoctorRejectionAnalysis } from '../../../hooks/useDoctorRejectionAnalysis';
import { useDoctorMedicalDenialSummary } from '../../../hooks/useDoctorMedicalDenialSummary';
import { useDoctorMedicalCptDenialSummary } from '../../../hooks/useDoctorMedicalCptDenialSummary';
import { useDoctorMedicalInsuranceRejectionSummary } from '../../../hooks/useDoctorMedicalInsuranceRejectionSummary';
import { formatKpiExact } from '../../../utils/kpiFormatUtils';
import { getRejectionPctBand } from '../../../utils/rejectionPctHeat';
import RejectionPctLegend from '../RejectionPctLegend';
import '../KpiCard.css';
import '../styles.css';
import './DoctorRejectionAnalysisSection.css';

const EXACT_AMOUNT = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pctClass = (value) => getRejectionPctBand(value, 'full') ?? 'good';

const ExpandableTextCell = ({
  className,
  text,
  detailKey,
  expanded,
  onToggle,
}) => {
  const textRef = useRef(null);
  const [truncated, setTruncated] = useState(false);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, text]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <td className={className}>
      <div ref={textRef} className="doctor-rejection-cell-truncate">{text}</div>
      {truncated ? (
        <button
          type="button"
          className={`doctor-rejection-detail-toggle${expanded ? ' is-open' : ''}`}
          onClick={() => onToggle(detailKey)}
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Hide' : 'View'}</span>
          <ChevronDown size={14} aria-hidden />
        </button>
      ) : null}
    </td>
  );
};

const DetailExpandRow = ({ open, text, colSpan }) => (
  <tr className={`doctor-rejection-detail-expand-row${open ? ' is-open' : ''}`} aria-hidden={!open}>
    <td className="col-rank" />
    <td colSpan={colSpan}>
      <div className="doctor-rejection-detail-expand-panel">
        <div className="doctor-rejection-detail-expand-panel__inner">
          <p>{text}</p>
        </div>
      </div>
    </td>
  </tr>
);

const DoctorRejectionAnalysisSection = () => {
  const {
    doctors: doctorOptions,
    doctorsLoading,
    doctorsError,
    selectedDoctorId,
    setSelectedDoctorId,
  } = useDoctorRejection();
  const { apiOfficeId, officeFilterReady } = useDashboardOfficeScope();
  const { setHeaderTrailing } = useDashboardPageHeader();
  const [chartExpanded, setChartExpanded] = useState(false);
  const [expandedDetailKey, setExpandedDetailKey] = useState(null);

  useLayoutEffect(() => {
    setHeaderTrailing?.(
      <DoctorRejectionClinicianBar
        doctors={doctorOptions}
        appliedId={selectedDoctorId}
        onApply={setSelectedDoctorId}
        loading={doctorsLoading}
        error={doctorsError}
      />,
    );
    return () => setHeaderTrailing?.(null);
  }, [
    setHeaderTrailing,
    doctorOptions,
    selectedDoctorId,
    setSelectedDoctorId,
    doctorsLoading,
    doctorsError,
  ]);

  const selectedDoctor = useMemo(
    () => (selectedDoctorId
      ? doctorOptions.find((doctor) => doctor.id === selectedDoctorId) ?? {
        id: selectedDoctorId,
        name: selectedDoctorId,
        specialty: '—',
      }
      : null),
    [selectedDoctorId, doctorOptions],
  );

  const analysisEnabled = Boolean(
    selectedDoctorId && officeFilterReady && apiOfficeId,
  );

  const {
    data: analysisData,
    loading: analysisLoading,
    error: analysisError,
  } = useDoctorRejectionAnalysis({
    clinicianId: selectedDoctorId,
    enabled: analysisEnabled,
  });

  const {
    data: denialData,
    loading: denialLoading,
    error: denialError,
  } = useDoctorMedicalDenialSummary({
    clinicianId: selectedDoctorId,
    enabled: analysisEnabled,
  });

  const {
    data: cptData,
    loading: cptLoading,
    error: cptError,
  } = useDoctorMedicalCptDenialSummary({
    clinicianId: selectedDoctorId,
    enabled: analysisEnabled,
  });

  const {
    data: insuranceData,
    loading: insuranceLoading,
    error: insuranceError,
  } = useDoctorMedicalInsuranceRejectionSummary({
    clinicianId: selectedDoctorId,
    enabled: analysisEnabled,
  });

  const monthlyRows = analysisData?.monthlyRows ?? [];
  const totals = analysisData?.totals ?? null;
  const denialRows = denialData?.rows ?? [];
  const denialTotal = denialData?.grandTotal ?? 0;
  const cptRows = cptData?.rows ?? [];
  const cptTotal = cptData?.grandTotal ?? 0;
  const insuranceRows = insuranceData?.rows ?? [];
  const insuranceTotal = insuranceData?.grandTotal ?? 0;

  const hasMatrix = Boolean(selectedDoctorId && totals);
  const pageLoading = Boolean(selectedDoctorId && analysisLoading);

  const kpiCards = totals ? [
    { key: 'claimed', label: 'Claimed Amount', value: formatKpiExact(totals.claimed), accent: 'info' },
    { key: 'paid', label: 'Paid Amount', value: formatKpiExact(totals.paid), accent: 'success' },
    { key: 'currentRejected', label: 'Current Rejected', value: formatKpiExact(totals.currentRejected ?? 0), accent: 'error' },
    { key: 'initial', label: 'Initial Rejection %', value: `${totals.initialRejPct.toFixed(2)}%`, accent: 'warning' },
    { key: 'current', label: 'Current Rejection %', value: `${totals.currentRejPct.toFixed(2)}%`, accent: 'error' },
    { key: 'unprocessed', label: 'Unprocessed Amount', value: formatKpiExact(totals.unprocessed), accent: 'warning' },
  ] : [];

  const chartOption = useMemo(() => {
    if (!monthlyRows.length) return null;
    const months = monthlyRows.map((row) => row.month);
    return {
      animationDuration: 600,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params) => {
          const title = params?.[0]?.axisValue ?? '';
          const lines = params.map((item) => {
            const raw = item.value;
            const text = item.seriesName.includes('%')
              ? `${Number(raw).toFixed(2)}%`
              : EXACT_AMOUNT.format(raw);
            return `${item.marker}${item.seriesName}: <b>${text}</b>`;
          });
          return `<div style="margin-bottom:4px;font-weight:600">${title}</div>${lines.join('<br/>')}`;
        },
      },
      legend: {
        data: ['Claimed', 'Paid', 'Current Rejected', 'Init %', 'Curr %'],
        bottom: 0,
        textStyle: { color: '#64748b', fontSize: 11 },
      },
      grid: { left: 52, right: 48, top: 28, bottom: 48 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Amount',
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            formatter: (v) => EXACT_AMOUNT.format(v),
          },
          splitLine: { lineStyle: { color: '#f1f5f9' } },
        },
        {
          type: 'value',
          name: '%',
          axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Claimed',
          type: 'bar',
          barMaxWidth: 18,
          itemStyle: { color: '#93c5fd', borderRadius: [3, 3, 0, 0] },
          data: monthlyRows.map((row) => row.claimed),
        },
        {
          name: 'Paid',
          type: 'bar',
          barMaxWidth: 18,
          itemStyle: { color: '#86efac', borderRadius: [3, 3, 0, 0] },
          data: monthlyRows.map((row) => row.paid),
        },
        {
          name: 'Current Rejected',
          type: 'bar',
          barMaxWidth: 18,
          itemStyle: { color: '#fca5a5', borderRadius: [3, 3, 0, 0] },
          data: monthlyRows.map((row) => row.currentRejected),
        },
        {
          name: 'Init %',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2.5, color: '#f59e0b' },
          itemStyle: { color: '#f59e0b' },
          data: monthlyRows.map((row) => Number(row.initialRejPct.toFixed(2))),
        },
        {
          name: 'Curr %',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2.5, color: '#ef4444' },
          itemStyle: { color: '#ef4444' },
          data: monthlyRows.map((row) => Number(row.currentRejPct.toFixed(2))),
        },
      ],
    };
  }, [monthlyRows]);

  const toggleDetail = (key) => {
    setExpandedDetailKey((prev) => (prev === key ? null : key));
  };

  return (
    <section className="doctor-rejection-analysis-section doctor-rejection-analysis-section--print">
      {!selectedDoctorId ? (
        <div className="doctor-rejection-select-prompt">
          <div className="doctor-rejection-empty" role="status">
            <div className="doctor-rejection-empty-icon" aria-hidden>
              <Stethoscope size={26} strokeWidth={1.75} />
            </div>
            <h3 className="doctor-rejection-empty-title">Select a clinician to begin</h3>
            <p className="doctor-rejection-empty-message">
              Choose a clinician and click Search to load rejection analysis for the applied dashboard scope.
            </p>
          </div>
        </div>
      ) : pageLoading && !hasMatrix ? (
        <div className="doctor-rejection-select-prompt">
          <div className="doctor-rejection-empty" role="status">
            <h3 className="doctor-rejection-empty-title">Loading clinician analysis…</h3>
            <p className="doctor-rejection-empty-message">
              Fetching monthly rejection matrix and medical denial codes.
            </p>
          </div>
        </div>
      ) : analysisError && !hasMatrix ? (
        <div className="doctor-rejection-select-prompt">
          <div className="doctor-rejection-empty" role="alert">
            <h3 className="doctor-rejection-empty-title">Unable to load analysis</h3>
            <p className="doctor-rejection-empty-message">{analysisError}</p>
          </div>
        </div>
      ) : !hasMatrix ? (
        <div className="doctor-rejection-select-prompt">
          <div className="doctor-rejection-empty" role="status">
            <h3 className="doctor-rejection-empty-title">No rejection data</h3>
            <p className="doctor-rejection-empty-message">
              No monthly rejection matrix for {selectedDoctor?.name || selectedDoctorId} in the applied scope.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="kpi-bento kpi-bento--6">
            {kpiCards.map((card) => (
              <KpiCard key={card.key} label={card.label} value={card.value} accent={card.accent} size="primary" />
            ))}
          </div>

          <div className="analytics-card doctor-rejection-matrix-card">
            <div className="card-header">
              <div className="card-header-text">
                <h3>Monthly Financial & Rejection Matrix</h3>
                <span className="card-subtitle">Exact monthly values for selected clinician</span>
              </div>
            </div>

            <RejectionPctLegend scale="full" />

            <div className="doctor-rejection-main-table">
              <table className="analytics-table doctor-rejection-grouped-table">
                <colgroup>
                  <col className="col-month" />
                  <col className="col-amount" />
                  <col className="col-amount" />
                  <col className="col-amount" />
                  <col className="col-pct" />
                  <col className="col-amount" />
                  <col className="col-pct" />
                  <col className="col-amount" />
                  <col className="col-pct" />
                  <col className="col-amount" />
                  <col className="col-amount" />
                  <col className="col-pct" />
                  <col className="col-amount" />
                  <col className="col-pct" />
                  <col className="col-amount" />
                  <col className="col-pct" />
                  <col className="col-amount" />
                  <col className="col-pct" />
                </colgroup>
                <thead>
                  <tr className="doctor-rejection-group-row">
                    <th rowSpan={2} className="doctor-rejection-month-head">Month</th>
                    <th colSpan={4} className="group-financial">Financial</th>
                    <th colSpan={5} className="group-rejection">Rejection</th>
                    <th colSpan={8} className="group-category">Category Split</th>
                  </tr>
                  <tr className="doctor-rejection-col-row">
                    <th className="group-financial">Claimed</th>
                    <th className="group-financial">Paid</th>
                    <th className="group-financial">Processed</th>
                    <th className="group-financial group-end">Proc %</th>
                    <th className="group-rejection">Init Rej</th>
                    <th className="group-rejection">Init %</th>
                    <th className="group-rejection">Curr Rej</th>
                    <th className="group-rejection">Curr %</th>
                    <th className="group-rejection group-end">Unproc</th>
                    <th className="group-category">Medical</th>
                    <th className="group-category">Med %</th>
                    <th className="group-category">Admin</th>
                    <th className="group-category">Adm %</th>
                    <th className="group-category">Contr.</th>
                    <th className="group-category">Cont %</th>
                    <th className="group-category">Unknown</th>
                    <th className="group-category">Unkn %</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((row) => (
                    <tr key={row.month}>
                      <td className="doctor-rejection-sticky-col">{row.month}</td>
                      <td className="num group-financial">{EXACT_AMOUNT.format(row.claimed)}</td>
                      <td className="num group-financial">{EXACT_AMOUNT.format(row.paid)}</td>
                      <td className="num group-financial">{EXACT_AMOUNT.format(row.processed)}</td>
                      <td className="num group-financial group-end">{row.processedPct.toFixed(2)}%</td>
                      <td className="num group-rejection">{EXACT_AMOUNT.format(row.initialRejected)}</td>
                      <td className={`num group-rejection doctor-rejection-pct-${pctClass(row.initialRejPct)}`}>{row.initialRejPct.toFixed(2)}%</td>
                      <td className="num group-rejection">{EXACT_AMOUNT.format(row.currentRejected)}</td>
                      <td className={`num group-rejection doctor-rejection-pct-${pctClass(row.currentRejPct)}`}>{row.currentRejPct.toFixed(2)}%</td>
                      <td className="num group-rejection group-end">{EXACT_AMOUNT.format(row.unprocessed)}</td>
                      <td className="num group-category">{EXACT_AMOUNT.format(row.medical)}</td>
                      <td className="num group-category">{row.medicalPct.toFixed(2)}%</td>
                      <td className="num group-category">{EXACT_AMOUNT.format(row.admin)}</td>
                      <td className="num group-category">{row.adminPct.toFixed(2)}%</td>
                      <td className="num group-category">{EXACT_AMOUNT.format(row.contractual)}</td>
                      <td className="num group-category">{row.contractualPct.toFixed(2)}%</td>
                      <td className="num group-category">{EXACT_AMOUNT.format(row.unknown ?? 0)}</td>
                      <td className="num group-category">{(row.unknownPct ?? 0).toFixed(2)}%</td>
                    </tr>
                  ))}
                  <tr className="doctor-rejection-total-row">
                    <td className="doctor-rejection-sticky-col">Total</td>
                    <td className="num group-financial">{EXACT_AMOUNT.format(totals.claimed)}</td>
                    <td className="num group-financial">{EXACT_AMOUNT.format(totals.paid)}</td>
                    <td className="num group-financial">{EXACT_AMOUNT.format(totals.processed)}</td>
                    <td className="num group-financial group-end">{totals.processedPct.toFixed(2)}%</td>
                    <td className="num group-rejection">{EXACT_AMOUNT.format(totals.initialRejected)}</td>
                    <td className={`num group-rejection doctor-rejection-pct-${pctClass(totals.initialRejPct)}`}>{totals.initialRejPct.toFixed(2)}%</td>
                    <td className="num group-rejection">{EXACT_AMOUNT.format(totals.currentRejected)}</td>
                    <td className={`num group-rejection doctor-rejection-pct-${pctClass(totals.currentRejPct)}`}>{totals.currentRejPct.toFixed(2)}%</td>
                    <td className="num group-rejection group-end">{EXACT_AMOUNT.format(totals.unprocessed)}</td>
                    <td className="num group-category">{EXACT_AMOUNT.format(totals.medical)}</td>
                    <td className="num group-category">{totals.medicalPct.toFixed(2)}%</td>
                    <td className="num group-category">{EXACT_AMOUNT.format(totals.admin)}</td>
                    <td className="num group-category">{totals.adminPct.toFixed(2)}%</td>
                    <td className="num group-category">{EXACT_AMOUNT.format(totals.contractual)}</td>
                    <td className="num group-category">{totals.contractualPct.toFixed(2)}%</td>
                    <td className="num group-category">{EXACT_AMOUNT.format(totals.unknown ?? 0)}</td>
                    <td className="num group-category">{(totals.unknownPct ?? 0).toFixed(2)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <section className={`doctor-rejection-chart-section${chartExpanded ? ' doctor-rejection-chart-section--expanded' : ''}`}>
            <button
              type="button"
              className={`doctor-rejection-chart-trigger${chartExpanded ? ' doctor-rejection-chart-trigger--open' : ''}`}
              onClick={() => setChartExpanded((v) => !v)}
              aria-expanded={chartExpanded}
            >
              <div className="doctor-rejection-chart-trigger-main">
                <span className="doctor-rejection-chart-trigger-icon" aria-hidden>
                  <LineChart size={20} strokeWidth={2.25} />
                </span>
                <div>
                  <h3 className="doctor-rejection-chart-trigger-title">Monthly Rejection Trend</h3>
                  <p className="doctor-rejection-chart-trigger-sub">Claimed, paid, current rejected with init/curr %</p>
                </div>
              </div>
              <span className="doctor-rejection-chart-trigger-action">
                {chartExpanded ? 'Hide' : 'View'}
                <ChevronDown size={18} aria-hidden />
              </span>
            </button>

            {chartExpanded && chartOption && (
              <div className="doctor-rejection-chart-body">
                <div className="doctor-rejection-trend-chart">
                  <ReactECharts option={chartOption} style={{ height: 300, width: '100%' }} opts={{ renderer: 'canvas' }} />
                </div>
              </div>
            )}
          </section>

          <div className="doctor-rejection-split-grid">
            <div className="analytics-card doctor-rejection-detail-card">
              <div className="card-header">
                <div className="card-header-text">
                  <h3>Denial Code wise Summary — Medical</h3>
                  <span className="card-subtitle">Medical denial codes ranked by rejected amount</span>
                </div>
                <div className="doctor-rejection-detail-chip doctor-rejection-detail-chip--denial">
                  {denialLoading ? '…' : `${denialRows.length} codes`}
                </div>
              </div>
              <div className="doctor-rejection-detail-scroll scrollbar-pro">
                {denialError ? (
                  <div className="doctor-rejection-empty" role="alert" style={{ padding: 24 }}>
                    <p className="doctor-rejection-empty-message">{denialError}</p>
                  </div>
                ) : (
                  <table className="doctor-rejection-detail-table doctor-rejection-detail-table--denial">
                    <thead>
                      <tr>
                        <th className="col-rank">#</th>
                        <th className="col-code">Denial Code</th>
                        <th className="col-desc">Description</th>
                        <th className="col-amt">Rejected Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {denialRows.map((row, index) => {
                        const detailKey = `denial:${row.code}`;
                        const expanded = expandedDetailKey === detailKey;
                        return (
                          <React.Fragment key={row.code}>
                            <tr className={expanded ? 'doctor-rejection-detail-row--open' : ''}>
                              <td className="col-rank">{index + 1}</td>
                              <td className="col-code">{row.code}</td>
                              <ExpandableTextCell
                                className="col-desc"
                                text={row.description}
                                detailKey={detailKey}
                                expanded={expanded}
                                onToggle={toggleDetail}
                              />
                              <td className="col-amt num">{EXACT_AMOUNT.format(row.rejectedAmount)}</td>
                            </tr>
                            {expanded ? (
                              <DetailExpandRow open text={row.description} colSpan={3} />
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                      <tr className="doctor-rejection-total-row">
                        <td className="col-rank" />
                        <td className="col-code">Grand Total</td>
                        <td className="col-desc">Medical denial summary</td>
                        <td className="col-amt num">{EXACT_AMOUNT.format(denialTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="analytics-card doctor-rejection-detail-card">
              <div className="card-header">
                <div className="card-header-text">
                  <h3>CPT wise Rejections — Medical</h3>
                  <span className="card-subtitle">Procedure-level rejection drivers for selected clinician</span>
                </div>
                <div className="doctor-rejection-detail-chip doctor-rejection-detail-chip--cpt">
                  {cptLoading ? '…' : `Top ${cptRows.length} CPTs`}
                </div>
              </div>
              <div className="doctor-rejection-detail-scroll scrollbar-pro">
                {cptError ? (
                  <div className="doctor-rejection-empty" role="alert" style={{ padding: 24 }}>
                    <p className="doctor-rejection-empty-message">{cptError}</p>
                  </div>
                ) : (
                  <table className="doctor-rejection-detail-table doctor-rejection-detail-table--cpt">
                    <thead>
                      <tr>
                        <th className="col-rank">#</th>
                        <th className="col-code">CPT Code</th>
                        <th className="col-desc">CPT Description</th>
                        <th className="col-amt">Rejected Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cptRows.map((row, index) => {
                        const detailKey = `cpt:${row.code}`;
                        const expanded = expandedDetailKey === detailKey;
                        const desc = row.description || '—';
                        return (
                          <React.Fragment key={row.code}>
                            <tr className={expanded ? 'doctor-rejection-detail-row--open' : ''}>
                              <td className="col-rank">{index + 1}</td>
                              <td className="col-code">{row.code}</td>
                              {row.description ? (
                                <ExpandableTextCell
                                  className="col-desc"
                                  text={row.description}
                                  detailKey={detailKey}
                                  expanded={expanded}
                                  onToggle={toggleDetail}
                                />
                              ) : (
                                <td className="col-desc">{desc}</td>
                              )}
                              <td className="col-amt num">{EXACT_AMOUNT.format(row.rejectedAmount)}</td>
                            </tr>
                            {row.description && expanded ? (
                              <DetailExpandRow open text={row.description} colSpan={3} />
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                      <tr className="doctor-rejection-total-row">
                        <td className="col-rank" />
                        <td className="col-code">Grand Total</td>
                        <td className="col-desc">Top CPT rejection total</td>
                        <td className="col-amt num">{EXACT_AMOUNT.format(cptTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="analytics-card doctor-rejection-detail-card">
            <div className="card-header">
              <div className="card-header-text">
                <h3>Current Rejection Insurance wise — Medical</h3>
                <span className="card-subtitle">Payer concentration of current medical rejections</span>
              </div>
              <div className="doctor-rejection-detail-chip doctor-rejection-detail-chip--insurance">
                {insuranceLoading ? '…' : `${insuranceRows.length} payers`}
              </div>
            </div>
            <div className="doctor-rejection-detail-scroll scrollbar-pro">
              {insuranceError ? (
                <div className="doctor-rejection-empty" role="alert" style={{ padding: 24 }}>
                  <p className="doctor-rejection-empty-message">{insuranceError}</p>
                </div>
              ) : (
                <table className="doctor-rejection-detail-table doctor-rejection-detail-table--insurance">
                  <thead>
                    <tr>
                      <th className="col-rank">#</th>
                      <th className="col-name">Insurance</th>
                      <th className="col-amt">Rejected Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insuranceRows.map((row, index) => (
                      <tr key={row.id || row.insurance}>
                        <td className="col-rank">{index + 1}</td>
                        <td className="col-name">{row.insurance}</td>
                        <td className="col-amt num">{EXACT_AMOUNT.format(row.rejectedAmount)}</td>
                      </tr>
                    ))}
                    <tr className="doctor-rejection-total-row">
                      <td className="col-rank" />
                      <td className="col-name">Grand Total</td>
                      <td className="col-amt num">{EXACT_AMOUNT.format(insuranceTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default DoctorRejectionAnalysisSection;
