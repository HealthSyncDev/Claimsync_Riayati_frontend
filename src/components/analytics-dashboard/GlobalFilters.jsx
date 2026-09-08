import React from 'react';
import { useDashboardFilters } from '../../context/DashboardFiltersContext';
import { useDashboardOfficeScope } from '../../hooks/useDashboardOfficeScope';
import OfficeMultiSelect from './OfficeMultiSelect';
import './GlobalFilters.css';

const OPTIONS = {
  years: ['2026', '2025', '2024'],
  searchOn: [
    { value: 'SubmissionTransactionDate', label: 'Submission Transaction Date' },
    { value: 'RemittanceTransactionDate', label: 'Remittance Transaction Date' },
    { value: 'SettlementDate', label: 'Settlement Date' },
    { value: 'EncounterStartDate', label: 'Encounter Start Date' },
    { value: 'EncounterEndDate', label: 'Encounter End Date' },
  ],
};

const FilterSelect = ({ id, label, value, options, onChange, compact, wide }) => (
  <div className={`filter-group ${compact ? 'filter-group--compact' : ''}${wide ? ' filter-group--wide' : ''}`}>
    <label className="filter-label" htmlFor={id}>{label}</label>
    <select id={id} className="filter-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt) => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const text = typeof opt === 'object' ? opt.label : opt;
        return (
          <option key={val} value={val}>{text}</option>
        );
      })}
    </select>
  </div>
);

/** Shared dashboard scope: Year · Office · Search on (all /dashboard/* pages). */
const GlobalFilters = ({ variant = 'bar', afterFields = null }) => {
  const {
    filters,
    draftFilters,
    setFilters,
    setDraftHeaderFilter,
    applyFilters,
    hasPendingFilters,
    hasAppliedFilters,
  } = useDashboardFilters();
  const { canSelectOffice, userOfficeId, officeOptions } = useDashboardOfficeScope();
  const useDraft = variant === 'header' || variant === 'nav-inline';
  const activeFilters = useDraft ? draftFilters : filters;
  const updateFilters = useDraft
    ? setDraftHeaderFilter
    : (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const isCompact = variant === 'row' || variant === 'header' || variant === 'nav-inline';
  const canApply = hasPendingFilters || !hasAppliedFilters;

  const officeField = canSelectOffice ? (
    <OfficeMultiSelect
      id={`dash-filter-office-${variant}`}
      label="Office"
      value={activeFilters.officeId ?? 'All'}
      officeOptions={officeOptions}
      onChange={(v) => updateFilters('officeId', v)}
      compact={isCompact}
      wide={variant === 'nav-inline'}
    />
  ) : (
    <div className="filter-group filter-group--compact filter-group--readonly">
      <span className="filter-label">Office</span>
      <div className="filter-readonly-value">
        {officeOptions.find((o) => o.id === String(userOfficeId))?.label ?? 'Assigned office'}
      </div>
    </div>
  );

  const fields = (
    <>
      <FilterSelect
        id={`dash-filter-year-${variant}`}
        label="Year"
        value={activeFilters.year}
        options={OPTIONS.years}
        onChange={(v) => updateFilters('year', v)}
        compact={isCompact}
      />
      {officeField}
      <FilterSelect
        id={`dash-filter-search-on-${variant}`}
        label="Search on"
        value={activeFilters.searchOn}
        options={OPTIONS.searchOn}
        onChange={(v) => updateFilters('searchOn', v)}
        compact={isCompact}
        wide={isCompact}
      />
    </>
  );

  const applyButton = useDraft ? (
    <button
      type="button"
      id="dashboard-apply-filter-btn"
      className={`dashboard-apply-btn${canApply ? ' dashboard-apply-btn--pending' : ''}`}
      onClick={applyFilters}
      disabled={!canApply}
      title={
        !hasAppliedFilters
          ? 'Apply filters to load this page'
          : hasPendingFilters
            ? 'Apply filters to reload this page'
            : undefined
      }
    >
      Apply filter
    </button>
  ) : null;

  if (variant === 'nav-inline') {
    return (
      <div className={`dashboard-filters-nav-inline${afterFields ? ' dashboard-filters-nav-inline--with-clinician' : ''}`}>
        {fields}
        {afterFields}
        {applyButton}
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className="dashboard-filters-header">
        <div className="dashboard-filters-header-fields">{fields}</div>
        <div className="dashboard-filters-header-actions">
          {applyButton}
        </div>
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className="overview-filter-row">
        {fields}
      </div>
    );
  }

  if (variant === 'panel') {
    return (
      <div className="dashboard-filters-panel">
        <h3 className="dashboard-filters-panel-title">Filters</h3>
        <div className="dashboard-filters-panel-grid">{fields}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-global-filters dashboard-global-filters--bar">
      <div className="filters-grid filters-grid--bar">{fields}</div>
    </div>
  );
};

export default GlobalFilters;
