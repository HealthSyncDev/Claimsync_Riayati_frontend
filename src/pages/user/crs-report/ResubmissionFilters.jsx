import React, { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import OfficeMultiSelect from '../../../components/analytics-dashboard/OfficeMultiSelect';
import LastSyncIndicator from '../../../components/common/LastSyncIndicator';
import { useResubmissionList } from './ResubmissionListContext';
import '../../../components/analytics-dashboard/GlobalFilters.css';
import './resubmission-filters.css';

function facilityIdsToOfficeId(facilityIds) {
    const id = String(facilityIds?.[0] || '').trim();
    return id;
}

function officesMatch(a, b) {
    const left = [...(a || [])].map(String).sort().join(',');
    const right = [...(b || [])].map(String).sort().join(',');
    return left === right;
}

const FilterSelect = ({ id, label, value, options, onChange, pending, size = 'md' }) => (
    <div
        className={`resub-scope-field filter-group filter-group--compact resub-scope-field--${size}${pending ? ' resub-scope-field--pending' : ''}`}
        data-filter={id}
    >
        <label className="filter-label" htmlFor={id}>
            <span className="resub-scope-label">{label}</span>
            {pending && <span className="resub-scope-pending-dot" title="Unsaved change" aria-hidden />}
        </label>
        <select id={id} className="filter-select" value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((opt) => {
                const val = typeof opt === 'object' ? opt.value : opt;
                const text = typeof opt === 'object' ? opt.label : opt;
                return (
                    <option key={val} value={val}>
                        {text}
                    </option>
                );
            })}
        </select>
    </div>
);

const ResubmissionFilters = () => {
    const { user } = useAuth();
    const {
        draftFilters,
        appliedFilters,
        fixedYearOptions,
        officesList,
        facilityNameMap,
        showBranchFilter,
        handleFilterChange,
        handleOfficeFilterChange,
        applyDraftFilters,
        clearFilters,
        hasPendingFilters,
        canApplyFilters,
        isLoadingClaims,
        isLoadingResubmissions,
        isFiltering,
    } = useResubmissionList();

    const showLoadingState = isLoadingClaims || isLoadingResubmissions || isFiltering;
    const userOfficeId = String(user?.officeId ?? user?.office_id ?? '').trim();

    const officeOptions = useMemo(
        () =>
            (officesList || [])
                .map((office) => {
                    const id = String(office.officeId ?? office.office_id ?? office.id ?? '');
                    const facilityId = office.facilityId ?? office.facility_id ?? null;
                    const name =
                        office.officeName ??
                        office.name ??
                        office.facilityName ??
                        office.office_name ??
                        'Unnamed Office';
                    const label =
                        facilityNameMap[id] || (facilityId ? `${name} (${facilityId})` : name);
                    return { id, label, facilityId };
                })
                .filter((office) => office.id),
        [officesList, facilityNameMap]
    );

    const pending = useMemo(
        () => ({
            year: draftFilters.year !== appliedFilters.year,
            office: !officesMatch(draftFilters.facilityIds, appliedFilters.facilityIds),
        }),
        [draftFilters, appliedFilters]
    );

    const officeField = showBranchFilter ? (
        <div
            className={`resub-scope-office-slot${pending.office ? ' resub-scope-field--pending' : ''}`}
            data-filter="resub-filter-office"
        >
            <OfficeMultiSelect
                id="resub-filter-office"
                label={
                    <>
                        <span className="resub-scope-label">Office</span>
                        {pending.office && (
                            <span className="resub-scope-pending-dot" title="Unsaved change" aria-hidden />
                        )}
                    </>
                }
                value={facilityIdsToOfficeId(draftFilters.facilityIds)}
                officeOptions={officeOptions}
                onChange={handleOfficeFilterChange}
                compact
                wide
                single
            />
        </div>
    ) : (
        <div className="resub-scope-field filter-group filter-group--compact filter-group--readonly resub-scope-field--office">
            <span className="filter-label">Office</span>
            <div className="filter-readonly-value">
                {facilityNameMap[userOfficeId] ??
                    officeOptions.find((o) => o.id === userOfficeId)?.label ??
                    'Assigned office'}
            </div>
        </div>
    );

    return (
        <div className="resub-scope-bar">
            <div className="resub-scope-fields">
                <FilterSelect
                    id="resub-filter-year"
                    label="Year"
                    value={draftFilters.year || fixedYearOptions[0] || ''}
                    options={fixedYearOptions}
                    onChange={(v) => handleFilterChange('year', v)}
                    pending={pending.year}
                    size="sm"
                />
                {officeField}
            </div>
            <div className="resub-scope-actions">
                {hasPendingFilters ? (
                    <button
                        type="button"
                        className="resub-scope-apply resub-scope-apply--active"
                        onClick={applyDraftFilters}
                        disabled={!canApplyFilters}
                    >
                        Apply
                    </button>
                ) : null}
                <LastSyncIndicator loading={showLoadingState} className="toolbar-last-sync resub-scope-sync" />
                <button type="button" className="resub-scope-reset" onClick={clearFilters} title="Reset filters">
                    <RotateCcw size={14} aria-hidden />
                    <span>Reset</span>
                </button>
            </div>
        </div>
    );
};

export default ResubmissionFilters;
