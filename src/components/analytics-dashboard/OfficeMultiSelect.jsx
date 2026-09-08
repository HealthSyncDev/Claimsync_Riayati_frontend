import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  formatDashboardOfficeFilterLabel,
  isDashboardOfficeFilterAll,
  parseDashboardOfficeFilterIds,
} from '../../utils/dashboardOfficeFilterUtils';

const getOfficeDisplayName = (office) => {
  const { label, facilityId } = office;
  if (facilityId && label?.endsWith(`(${facilityId})`)) {
    return label.slice(0, -(String(facilityId).length + 3)).trim();
  }
  return label;
};

const OfficeMultiSelect = ({
  id,
  label,
  value,
  officeOptions,
  onChange,
  compact,
  wide,
  single = false,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const isAll = !single && isDashboardOfficeFilterAll(value);
  const selectedIds = parseDashboardOfficeFilterIds(value);
  const selectedCount = isAll ? officeOptions.length : selectedIds.length;
  const selectedId = selectedIds[0] || '';

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const selectAllOffices = () => onChange('All');

  const toggleOffice = (officeId) => {
    if (single) {
      onChange(officeId);
      setOpen(false);
      return;
    }
    if (selectedIds.includes(officeId)) {
      const next = selectedIds.filter((oid) => oid !== officeId);
      onChange(next.length ? next.join(',') : 'All');
      return;
    }
    onChange([...selectedIds, officeId].join(','));
  };

  const selectedOffice = officeOptions.find((office) => office.id === selectedId);
  const triggerText = single
    ? (selectedOffice ? getOfficeDisplayName(selectedOffice) : 'Select office')
    : formatDashboardOfficeFilterLabel(value, officeOptions);

  return (
    <div
      ref={wrapRef}
      className={`filter-group filter-group--office${compact ? ' filter-group--compact' : ''}${wide ? ' filter-group--wide' : ''}${open ? ' filter-group--office-open' : ''}`}
    >
      <span className="filter-label" id={`${id}-label`}>{label}</span>
      <div className="dashboard-office-multiselect">
        <button
          type="button"
          id={id}
          className={`dashboard-office-trigger${open ? ' dashboard-office-trigger--open' : ''}`}
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={`${id}-label`}
        >
          <span className="dashboard-office-trigger-text">{triggerText}</span>
          <ChevronDown size={14} className="dashboard-office-chevron" aria-hidden />
        </button>
        {open && (
          <div
            className={`dashboard-office-dropdown${single ? ' dashboard-office-dropdown--single' : ''}`}
            role="listbox"
            aria-multiselectable={!single}
          >
            <div className="dashboard-office-dropdown-header">
              <div className="dashboard-office-dropdown-heading">
                <span className="dashboard-office-dropdown-title">
                  {single ? 'Select office' : 'Select offices'}
                </span>
                {!single && (
                  <span className="dashboard-office-dropdown-count">
                    {isAll ? 'All' : `${selectedCount} selected`}
                  </span>
                )}
              </div>
              {!single && !isAll && (
                <button type="button" className="dashboard-office-clear-btn" onClick={selectAllOffices}>
                  Reset
                </button>
              )}
            </div>
            <div className="dashboard-office-dropdown-list">
              {!single && (
                <label className="dashboard-office-option dashboard-office-all">
                  <input type="checkbox" checked={isAll} onChange={selectAllOffices} />
                  <span className="dashboard-office-option-text">
                    <span className="dashboard-office-option-name">All Offices</span>
                    <span className="dashboard-office-option-meta">Include every branch</span>
                  </span>
                </label>
              )}
              {officeOptions.map((office) => {
                const isSelected = selectedIds.includes(office.id);
                const optionClass = `dashboard-office-option${single ? ' dashboard-office-option--single' : ''}${
                  isSelected ? ' dashboard-office-option--selected' : ''
                }`;
                const optionBody = (
                  <span className="dashboard-office-option-text">
                    <span className="dashboard-office-option-name">{getOfficeDisplayName(office)}</span>
                    {office.facilityId && (
                      <span className="dashboard-office-option-meta">{office.facilityId}</span>
                    )}
                  </span>
                );
                if (single) {
                  return (
                    <button
                      key={office.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={optionClass}
                      onClick={() => toggleOffice(office.id)}
                    >
                      {optionBody}
                    </button>
                  );
                }
                return (
                  <label key={office.id} className={optionClass}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOffice(office.id)}
                    />
                    {optionBody}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficeMultiSelect;
