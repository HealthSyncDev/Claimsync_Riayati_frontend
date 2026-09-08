import React, { useMemo } from 'react';
import { useDashboardFilters } from '../../context/DashboardFiltersContext';
import { useDashboardOfficeScope } from '../../hooks/useDashboardOfficeScope';
import { useDashboardOffices } from '../../hooks/useDashboardOffices';
import { formatDashboardOfficeFilterLabel } from '../../utils/dashboardOfficeFilterUtils';
import './DashboardScopeSummary.css';

const SEARCH_ON_LABELS = {
  SubmissionTransactionDate: 'Submission Transaction Date',
  RemittanceTransactionDate: 'Remittance Transaction Date',
  SettlementDate: 'Settlement Date',
  EncounterStartDate: 'Encounter Start Date',
  EncounterEndDate: 'Encounter End Date',
};

const DashboardScopeSummary = ({ compact = false }) => {
  const { filters, hasPendingFilters } = useDashboardFilters();
  const { canSelectOffice } = useDashboardOfficeScope();
  const { officeOptions } = useDashboardOffices(canSelectOffice);

  const scopeParts = useMemo(() => {
    const parts = [filters.year];

    if (canSelectOffice) {
      parts.push(formatDashboardOfficeFilterLabel(filters.officeId, officeOptions));
    }

    parts.push(SEARCH_ON_LABELS[filters.searchOn] ?? filters.searchOn);

    return parts;
  }, [filters, canSelectOffice, officeOptions]);

  return (
    <div className={`dashboard-scope-summary${compact ? ' dashboard-scope-summary--compact' : ''}`} aria-live="polite">
      <p className="dashboard-scope-summary-line">
        <span className="dashboard-scope-summary-label">Applied scope:</span>
        {' '}
        <span className="dashboard-scope-summary-value">{scopeParts.join(' · ')}</span>
        {compact ? (
          <span className="dashboard-scope-summary-hint">
            {' '}— edit filters above, then <strong>Apply</strong>.
          </span>
        ) : (
          <span className="dashboard-scope-summary-hint">
            {' '}— change in dashboard filters above, then <strong>Apply</strong>.
          </span>
        )}
      </p>
      {hasPendingFilters && (
        <p className="dashboard-scope-summary-pending" role="status">
          Unapplied filter changes — click Apply above.
        </p>
      )}
    </div>
  );
};

export default DashboardScopeSummary;