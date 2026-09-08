import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useDashboardFilters, defaultDashboardFilters } from '../../context/DashboardFiltersContext';
import { useDashboardOfficeScope } from '../../hooks/useDashboardOfficeScope';
import { useDashboardOffices } from '../../hooks/useDashboardOffices';
import { formatDashboardOfficeFilterLabel } from '../../utils/dashboardOfficeFilterUtils';
import './ActiveFilterChips.css';

const SEARCH_ON_LABELS = {
  SubmissionTransactionDate: 'Submission Transaction Date',
  RemittanceTransactionDate: 'Remittance Transaction Date',
  SettlementDate: 'Settlement Date',
  EncounterStartDate: 'Encounter Start Date',
  EncounterEndDate: 'Encounter End Date',
};

const ActiveFilterChips = () => {
  const { filters, clearFilter } = useDashboardFilters();
  const { canSelectOffice } = useDashboardOfficeScope();
  const { officeOptions } = useDashboardOffices(canSelectOffice);

  const chips = useMemo(() => {
    const items = [{ key: 'year', value: filters.year, display: filters.year }];

    if (canSelectOffice) {
      items.push({
        key: 'officeId',
        value: filters.officeId,
        display: formatDashboardOfficeFilterLabel(filters.officeId, officeOptions),
      });
    }

    items.push({
      key: 'searchOn',
      value: filters.searchOn,
      display: SEARCH_ON_LABELS[filters.searchOn] ?? filters.searchOn,
    });

    return items;
  }, [filters, canSelectOffice, officeOptions]);

  const isDefault = (key, value) => defaultDashboardFilters[key] === value;

  return (
    <div className="active-filter-chips" aria-label="Applied filters">
      {chips.map((chip) => (
        <span key={chip.key} className="active-filter-chip">
          <span className="active-filter-chip-text">{chip.display}</span>
          {!isDefault(chip.key, chip.value) && (
            <button
              type="button"
              className="active-filter-chip-clear"
              onClick={() => clearFilter(chip.key)}
              aria-label={`Clear ${chip.key} filter`}
            >
              <X size={12} aria-hidden />
            </button>
          )}
        </span>
      ))}
    </div>
  );
};

export default ActiveFilterChips;
