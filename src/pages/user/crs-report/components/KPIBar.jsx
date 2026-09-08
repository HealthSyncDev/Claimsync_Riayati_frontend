
import React from 'react';
import '../crs-report.css';

const icons = {
    claims: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
    ),
    money: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
    ),
    check: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    ),
    clock: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
    alert: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
    ),
    percent: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="5" x2="5" y2="19"></line>
            <circle cx="6.5" cy="6.5" r="2.5"></circle>
            <circle cx="17.5" cy="17.5" r="2.5"></circle>
        </svg>
    )
};

const KPIBar = ({ data, stats, loading }) => {
    // Support both prop names
    const displayData = data || stats;

    if (loading || !displayData) {
        return (
            <div className="kpi-bar">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="kpi-card skeleton-card">
                        <div className="skeleton-icon"></div>
                        <div className="kpi-content">
                            <div className="skeleton-line width-60"></div>
                            <div className="skeleton-line width-40"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    const kpis = [
        { label: 'Total Claims', value: displayData.totalClaims, color: 'blue', icon: icons.claims },
        { label: 'Total Amount', value: formatCurrency(displayData.totalClaimAmount), color: 'indigo', icon: icons.money },
        { label: 'Remitted', value: formatCurrency(displayData.remittedAmount), color: 'green', icon: icons.check },
        { label: 'Pending', value: formatCurrency(displayData.pendingAmount), color: 'orange', icon: icons.clock },
        { label: 'Rejected', value: formatCurrency(displayData.rejectedAmount), color: 'red', icon: icons.alert },
        { label: 'Recovery Rate', value: `${displayData.recoveryRate}%`, color: 'teal', icon: icons.percent },
    ];

    return (
        <div className="kpi-bar fade-in-up">
            {kpis.map((kpi, index) => (
                <div key={index} className={`kpi-card ${kpi.color}`}>
                    <div className="kpi-icon-wrapper">
                        {kpi.icon}
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">{kpi.label}</span>
                        <span className="kpi-value">{kpi.value}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KPIBar;
