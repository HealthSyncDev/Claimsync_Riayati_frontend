import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import ClinicianPicker from './ClinicianPicker.jsx';
import './DoctorRejectionClinicianBar.css';

const DoctorRejectionClinicianBar = ({
  doctors,
  appliedId,
  onApply,
  loading = false,
  error = null,
}) => {
  const [draftId, setDraftId] = useState(appliedId);

  useEffect(() => {
    setDraftId(appliedId);
  }, [appliedId]);

  const hasPending = Boolean(draftId && draftId !== appliedId);

  const handleSearch = () => {
    if (draftId) onApply(draftId);
  };

  return (
    <div className="doctor-rejection-clinician-bar">
      <div className="doctor-rejection-clinician-bar__meta">
        <span className="doctor-rejection-clinician-bar__title">Clinician search</span>
        <span className="doctor-rejection-clinician-bar__hint">
          {error
            ? error
            : loading
              ? 'Loading clinicians for the applied dashboard scope…'
              : 'Select a provider, then click Search to load rejection analytics'}
        </span>
      </div>
      <div className="doctor-rejection-clinician-bar__controls">
        <ClinicianPicker
          doctors={doctors}
          selectedId={draftId}
          onSelect={setDraftId}
          variant="page-header"
          hideLabel
          loading={loading}
        />
        <button
          type="button"
          className={`doctor-rejection-clinician-search-btn${hasPending ? ' doctor-rejection-clinician-search-btn--pending' : ''}`}
          onClick={handleSearch}
          disabled={!draftId || loading}
        >
          <Search size={16} aria-hidden />
          Search
        </button>
      </div>
    </div>
  );
};

export default DoctorRejectionClinicianBar;
