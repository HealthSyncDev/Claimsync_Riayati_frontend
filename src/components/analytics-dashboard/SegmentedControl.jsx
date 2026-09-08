import React from 'react';
import './SegmentedControl.css';

const SegmentedControl = ({ options, value, onChange, ariaLabel, className = '' }) => (
  <div className={`dash-segmented ${className}`.trim()} role="group" aria-label={ariaLabel}>
    {options.map((opt) => {
      const id = opt.value ?? opt.id;
      return (
        <button
          key={id}
          type="button"
          className={`dash-segmented-btn${id === value ? ' dash-segmented-btn--active' : ''}`}
          onClick={() => onChange(id)}
          aria-pressed={id === value}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

export default SegmentedControl;
