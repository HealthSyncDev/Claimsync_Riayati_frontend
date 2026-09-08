import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronDown, Search, Stethoscope, X } from 'lucide-react';
import './ClinicianPicker.css';

const RECENT_KEY = 'doctor-rejection-recent-clinicians';
const ROW_HEIGHT = 56;

const loadRecentIds = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const saveRecentId = (id) => {
  const next = [id, ...loadRecentIds().filter((item) => item !== id)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
};

export default function ClinicianPicker({
  doctors,
  selectedId,
  onSelect,
  variant = 'default',
  pickerOpen: pickerOpenProp,
  onPickerOpenChange,
  hideLabel = false,
  loading = false,
}) {
  const isHeader = variant === 'header' || variant === 'page-header';
  const isPageHeader = variant === 'page-header';
  const [openInternal, setOpenInternal] = useState(false);
  const open = pickerOpenProp ?? openInternal;
  const setOpen = onPickerOpenChange ?? setOpenInternal;
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState(loadRecentIds);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedDoctor = useMemo(
    () => (selectedId ? doctors.find((doctor) => doctor.id === selectedId) : null),
    [doctors, selectedId],
  );

  const specialties = useMemo(() => {
    const set = new Set(
      doctors
        .map((doctor) => doctor.specialty)
        .filter((s) => s && s !== '—'),
    );
    return ['All', ...Array.from(set).sort()];
  }, [doctors]);

  const recentDoctors = useMemo(() => {
    const map = new Map(doctors.map((doctor) => [doctor.id, doctor]));
    return recentIds.map((id) => map.get(id)).filter(Boolean);
  }, [doctors, recentIds]);

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((doctor) => {
      if (specialty !== 'All' && doctor.specialty !== specialty) return false;
      if (!q) return true;
      const specialtyText = (doctor.specialty || '').toLowerCase();
      return (
        doctor.name.toLowerCase().includes(q)
        || doctor.id.toLowerCase().includes(q)
        || (specialtyText && specialtyText !== '—' && specialtyText.includes(q))
      );
    });
  }, [doctors, query, specialty]);

  const virtualizer = useVirtualizer({
    count: filteredDoctors.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const selectDoctor = useCallback((doctor) => {
    if (!doctor) return;
    onSelect(doctor.id);
    setRecentIds(saveRecentId(doctor.id));
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, [onSelect, setOpen]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, setOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, specialty]);

  useEffect(() => {
    if (!open || !filteredDoctors.length) return;
    virtualizer.scrollToIndex(activeIndex, { align: 'auto' });
  }, [activeIndex, filteredDoctors.length, open, virtualizer]);

  const onInputKeyDown = (event) => {
    if (!filteredDoctors.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((idx) => Math.min(idx + 1, filteredDoctors.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((idx) => Math.max(idx - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      selectDoctor(filteredDoctors[activeIndex]);
    }
  };

  return (
    <div className={`clinician-picker${isHeader ? ' clinician-picker--header' : ''}${isPageHeader ? ' clinician-picker--page-header' : ''}`} ref={rootRef}>
      <div className="clinician-picker-toolbar">
        <div className="clinician-picker-main">
          {!hideLabel && <span className="filter-label">Clinician</span>}
          <button
            type="button"
            className={`clinician-picker-trigger${open ? ' is-open' : ''}`}
            onClick={() => !loading && setOpen(!open)}
            disabled={loading}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-busy={loading}
            aria-label={
              loading
                ? 'Loading clinicians'
                : selectedDoctor
                  ? `Selected clinician: ${selectedDoctor.name}`
                  : `Select clinician. ${doctors.length.toLocaleString()} available.`
            }
          >
            {!isHeader || isPageHeader ? (
              <span className="clinician-picker-trigger-icon" aria-hidden>
                <Stethoscope size={isPageHeader ? 15 : 16} />
              </span>
            ) : null}
            <span className="clinician-picker-trigger-text">
              {selectedDoctor ? (
                <>
                  <strong title={selectedDoctor.specialty && selectedDoctor.specialty !== '—' ? `${selectedDoctor.specialty} · ${selectedDoctor.id}` : selectedDoctor.id}>{selectedDoctor.name}</strong>
                  {(!isHeader || isPageHeader) && selectedDoctor.specialty && selectedDoctor.specialty !== '—' && (
                    <small>{selectedDoctor.specialty}</small>
                  )}
                </>
              ) : (
                <strong className="clinician-picker-placeholder">
                  {loading
                    ? 'Loading clinicians…'
                    : isPageHeader
                      ? 'Search by name, ID, or specialty…'
                      : 'Select clinician…'}
                </strong>
              )}
            </span>
            <ChevronDown size={isHeader ? 16 : 18} className="clinician-picker-chevron" aria-hidden />
          </button>
        </div>
      </div>

      {open && (
        <div className="clinician-picker-panel" role="dialog" aria-label="Select clinician">
          <div className="clinician-picker-search-row">
            <Search size={18} aria-hidden />
            <input
              ref={inputRef}
              className="clinician-picker-search"
              value={query}
              placeholder="Search name, ID, or specialty…"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              aria-autocomplete="list"
              aria-controls="clinician-picker-list"
            />
            {query && (
              <button
                type="button"
                className="clinician-picker-clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {specialties.length > 1 && (
            <div className="clinician-picker-chips">
              {specialties.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`clinician-picker-chip${specialty === item ? ' is-active' : ''}`}
                  onClick={() => setSpecialty(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {!query && recentDoctors.length > 0 && (
            <div className="clinician-picker-recent">
              <div className="clinician-picker-recent-title">Recent</div>
              <div className="clinician-picker-recent-list">
                {recentDoctors.map((doctor) => (
                  <button
                    key={`recent-${doctor.id}`}
                    type="button"
                    className={`clinician-picker-recent-item${doctor.id === selectedId ? ' is-active' : ''}`}
                    onClick={() => selectDoctor(doctor)}
                  >
                    <span>{doctor.name}</span>
                    {doctor.specialty && doctor.specialty !== '—' && <small>{doctor.specialty}</small>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="clinician-picker-result-meta">
            {filteredDoctors.length.toLocaleString()} match{filteredDoctors.length === 1 ? '' : 'es'}
            {specialty !== 'All' ? ` in ${specialty}` : ''}
          </div>

          <div
            id="clinician-picker-list"
            className="clinician-picker-list scrollbar-pro"
            ref={listRef}
            role="listbox"
            aria-label="Clinician results"
          >
            {filteredDoctors.length === 0 ? (
              <div className="clinician-picker-empty">
                {loading ? 'Loading clinicians…' : 'No clinicians match this search.'}
              </div>
            ) : (
              <div
                className="clinician-picker-virtual"
                style={{ height: `${virtualizer.getTotalSize()}px` }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const doctor = filteredDoctors[virtualRow.index];
                  const isActive = virtualRow.index === activeIndex;
                  const isSelected = doctor.id === selectedId;
                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`clinician-picker-item${isActive ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      onMouseEnter={() => setActiveIndex(virtualRow.index)}
                      onClick={() => selectDoctor(doctor)}
                    >
                      <span className="clinician-picker-item-main">
                        <strong>{doctor.name}</strong>
                        <small>
                          {doctor.specialty && doctor.specialty !== '—'
                            ? `${doctor.specialty} · ${doctor.id}`
                            : doctor.id}
                        </small>
                      </span>
                      {isSelected && <Check size={15} aria-hidden />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
