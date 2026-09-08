import React, { useCallback, useMemo, useState } from 'react';
import TopDoctorsTable from './TopDoctorsTable';
import SpecialtyDenialTable from './SpecialtyDenialTable';
import SpecialityDenialChart from './SpecialityDenialChart';
import DoctorRejectionSummary from './DoctorRejectionSummary';
import DoctorDataToolbar from './DoctorDataToolbar';
import KpiCard from '../KpiCard';
import EmptyState from '../EmptyState';
import { Stagger, StaggerItem } from '../../common/Motion';
import { formatDashboardOfficeFilterLabel } from '../../../utils/dashboardOfficeFilterUtils';
import { useDashboardOfficeScope } from '../../../hooks/useDashboardOfficeScope';
import { useDoctorPerformanceData } from '../../../hooks/useDoctorPerformanceData';
import { useDashboardExportHeader } from '../../../hooks/useDashboardExportHeader';
import {
  computeDoctorKpis,
  filterBySearch,
} from '../../../utils/doctorAnalyticsUtils';
import { formatKpiCompact } from '../../../utils/kpiFormatUtils';
import DashboardPageLoader from '../DashboardPageLoader';
import '../KpiCard.css';
import '../styles.css';
import './TopDoctorsTable.css';
import './DoctorPerformanceSection.css';

const formatCompact = formatKpiCompact;
const formatPct = (n) => (n != null && !Number.isNaN(n) ? `${Number(n).toFixed(1)}%` : '—');
const truncate = (s, max = 18) => (s && s.length > max ? `${s.slice(0, max - 1)}…` : s ?? '—');

const SEARCH_ON_LABELS = {
  SubmissionTransactionDate: 'Submission Transaction Date',
  RemittanceTransactionDate: 'Remittance Transaction Date',
  SettlementDate: 'Settlement Date',
  EncounterStartDate: 'Encounter Start Date',
  EncounterEndDate: 'Encounter End Date',
};

const DoctorPerformanceSection = ({ loading: propLoading }) => {
  const { filters, apiOfficeId, officeFilterReady, officeOptions } = useDashboardOfficeScope();
  const year = filters.year ?? '2026';
  const searchOn = filters.searchOn ?? 'SubmissionTransactionDate';

  const {
    topDoctors,
    specialtyRows,
    specialtyGrandTotal,
    doctorRrRows,
    loading: dataLoading,
    error,
    refetch,
  } = useDoctorPerformanceData(apiOfficeId, year, searchOn, officeFilterReady);

  const hasData = topDoctors?.length || specialtyRows?.length || doctorRrRows?.length;
  const loading = propLoading || !officeFilterReady || (dataLoading && !hasData);

  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedSpecialty, setHighlightedSpecialty] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const filteredTopDoctors = useMemo(
    () => filterBySearch(topDoctors, searchQuery, ['doctor', 'speciality']),
    [topDoctors, searchQuery],
  );

  const filteredSpecialtyRows = useMemo(
    () => filterBySearch(specialtyRows, searchQuery, ['specialty']),
    [specialtyRows, searchQuery],
  );

  const kpis = useMemo(() => {
    if (!topDoctors.length && !specialtyRows.length) return null;
    return computeDoctorKpis(topDoctors, specialtyRows, specialtyGrandTotal);
  }, [topDoctors, specialtyRows, specialtyGrandTotal]);

  const kpiCards = kpis
    ? [
        {
          key: 'claimed',
          label: 'Claimed Amount',
          value: formatCompact(kpis.totalClaimed),
          accent: 'info',
        },
        {
          key: 'medical',
          label: 'Medical Denials',
          value: formatCompact(kpis.totalMedicalDenials),
          accent: 'error',
          sparkline: kpis.sparklineDenialPct,
        },
        {
          key: 'medPct',
          label: 'Medical Denial %',
          value: formatPct(kpis.medicalDenialPct),
          accent: 'warning',
        },
        {
          key: 'worstDoc',
          label: 'Top Risk Doctor',
          value: kpis.worstDoctorName
            ? `${truncate(kpis.worstDoctorName)} · ${formatPct(kpis.worstDoctorPct)}`
            : '—',
          accent: 'error',
        },
      ]
    : [];

  const runExport = useCallback(async () => {
    const { exportDoctorToExcel } = await import('../../../utils/exportDoctorToExcel');
    await exportDoctorToExcel({
      filterMeta: {
        Year: filters.year,
        Office: formatDashboardOfficeFilterLabel(filters.officeId, officeOptions),
        'Search on': SEARCH_ON_LABELS[filters.searchOn] ?? filters.searchOn,
      },
      kpis,
      topDoctors,
      specialtyRows: filteredSpecialtyRows,
      doctorRrRows,
    });
  }, [doctorRrRows, filteredSpecialtyRows, filters.officeId, filters.searchOn, filters.year, kpis, topDoctors]);

  useDashboardExportHeader({
    year,
    Toolbar: DoctorDataToolbar,
    canExport: () => officeFilterReady && !loading && Boolean(topDoctors?.length || specialtyRows?.length),
    runExport,
  });

  if (loading) {
    return (
      <section className="doctor-performance-section">
        <DashboardPageLoader label="Loading doctor performance…" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="doctor-performance-section">
        <div className="dashboard-api-error">
          <span className="dashboard-api-error-icon">⚠</span>
          <span>{error}</span>
          <button type="button" className="dashboard-api-error-retry" onClick={refetch}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!topDoctors.length && !specialtyRows.length) {
    return (
      <section className="doctor-performance-section">
        <EmptyState
          title="No doctor data available"
          message="Try changing the year or office filters above."
        />
      </section>
    );
  }

  return (
    <section className="doctor-performance-section doctor-performance-section--print">
      <Stagger className="kpi-bento kpi-bento--4">
        {kpiCards.map((card) => (
          <StaggerItem key={card.key}>
            <KpiCard
              label={card.label}
              value={card.value}
              accent={card.accent}
              size="primary"
              sparkline={card.sparkline}
            />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="doctor-section doctor-section--hero">
        <TopDoctorsTable
          rows={filteredTopDoctors}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onDoctorClick={setSelectedDoctor}
        />
      </div>

      <div className="doctor-section doctor-section--specialty">
        <div className="doctor-specialty-grid">
          <SpecialtyDenialTable
            rows={filteredSpecialtyRows}
            totalsOverride={specialtyGrandTotal}
            highlightedSpecialty={highlightedSpecialty}
            onSpecialtyHover={setHighlightedSpecialty}
            onSpecialtySelect={setHighlightedSpecialty}
          />
          <SpecialityDenialChart
            rows={filteredSpecialtyRows}
            highlightedSpecialty={highlightedSpecialty}
          />
        </div>
      </div>

      <DoctorRejectionSummary rows={doctorRrRows} />

      {selectedDoctor && (
        <div className="doctor-drilldown-backdrop" role="presentation" onClick={() => setSelectedDoctor(null)}>
          <div
            className="doctor-drilldown-panel"
            role="dialog"
            aria-labelledby="doctor-drilldown-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="doctor-drilldown-title">{selectedDoctor.doctor}</h3>
            <p className="doctor-drilldown-sub">{selectedDoctor.speciality}</p>
            <dl className="doctor-drilldown-stats">
              <div><dt>Claimed</dt><dd>{formatCompact(selectedDoctor.claimed)}</dd></div>
              <div><dt>Medical denials</dt><dd>{formatCompact(selectedDoctor.medicalDenials)}</dd></div>
              <div><dt>Denial %</dt><dd>{formatPct(selectedDoctor.medicalDenialPct)}</dd></div>
            </dl>
            <p className="doctor-drilldown-note">Full denial breakdown coming soon.</p>
            <button type="button" className="doctor-drilldown-close" onClick={() => setSelectedDoctor(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default DoctorPerformanceSection;
