
import React, { useState } from 'react';
import { filterOptions } from '../data/mockData';
import '../crs-report.css';

const FilterPanel = ({ onApplyFilters }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [filters, setFilters] = useState({
        facility: '',
        dateType: 'Activity Start',
        fromDate: '',
        toDate: '',
        year: '2026',
        month: '',
        payer: '',
        clinician: '',
        orderingClinician: '',
        encounterType: '',
        claimStatus: '',
        insuranceType: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApply = () => {
        onApplyFilters(filters);
    };

    const handleReset = () => {
        setFilters({
            facility: '',
            dateType: 'Activity Start',
            fromDate: '',
            toDate: '',
            year: '2026',
            month: '',
            payer: '',
            clinician: '',
            orderingClinician: '',
            encounterType: '',
            claimStatus: '',
            insuranceType: ''
        });
        onApplyFilters({}); // Reset app state
    };

    return (
        <div className={`filter-panel ${isOpen ? 'open' : 'closed'}`}>
            <div className="filter-header" onClick={() => setIsOpen(!isOpen)}>
                <div className="filter-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span>Filters</span>
                </div>
                <button className="toggle-btn">
                    {isOpen ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    )}
                </button>
            </div>

            <div className="filter-scroll-area">
                <div className="filter-content">
                    <div className="form-group">
                        <label>Branch</label>
                        <div className="select-wrapper">
                            <select name="facility" value={filters.facility} onChange={handleChange}>
                                <option value="">All Branches</option>
                                {filterOptions.facilities.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Date Type</label>
                        <div className="select-wrapper">
                            <select name="dateType" value={filters.dateType} onChange={handleChange}>
                                {filterOptions.dateTypes.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>From</label>
                            <input type="date" name="fromDate" value={filters.fromDate} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>To</label>
                            <input type="date" name="toDate" value={filters.toDate} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Year</label>
                            <div className="select-wrapper">
                                <select name="year" value={filters.year} onChange={handleChange}>
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Month</label>
                            <div className="select-wrapper">
                                <select name="month" value={filters.month} onChange={handleChange}>
                                    <option value="">All</option>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="separator"></div>

                    <div className="form-group">
                        <label>Payer</label>
                        <div className="select-wrapper">
                            <select name="payer" value={filters.payer} onChange={handleChange}>
                                <option value="">All Payers</option>
                                {filterOptions.payers.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Clinician</label>
                        <div className="select-wrapper">
                            <select name="clinician" value={filters.clinician} onChange={handleChange}>
                                <option value="">All Clinicians</option>
                                {filterOptions.clinicians.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Encounter Type</label>
                        <div className="select-wrapper">
                            <select name="encounterType" value={filters.encounterType} onChange={handleChange}>
                                <option value="">All Types</option>
                                {filterOptions.encounterTypes.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Claim Status</label>
                        <div className="select-wrapper">
                            <select name="claimStatus" value={filters.claimStatus} onChange={handleChange}>
                                <option value="">All Statuses</option>
                                {filterOptions.claimStatus.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="filter-footer">
                    <button className="btn-reset" onClick={handleReset}>Reset</button>
                    <button className="apply-btn" onClick={handleApply}>Apply Filters</button>
                </div>
            )}
        </div>
    );
};

export default FilterPanel;
