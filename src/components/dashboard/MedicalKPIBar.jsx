import React from 'react';

const icons = {
    denials: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
    ),
    percentage: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="5" x2="5" y2="19"></line>
            <circle cx="6.5" cy="6.5" r="2.5"></circle>
            <circle cx="17.5" cy="17.5" r="2.5"></circle>
        </svg>
    ),
    money: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
    ),
    rejected: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
    ),
    recovery: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
    ),
    pending: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    )
};

const MedicalKPIBar = ({ data, loading }) => {
    if (loading || !data) {
        return (
            <div className="medical-kpi-bar">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="medical-kpi-card skeleton-card">
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
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'AED',
            maximumFractionDigits: 0 
        }).format(val);
    };

    const formatNumber = (val) => {
        return new Intl.NumberFormat('en-US').format(val);
    };

    const kpis = [
        { 
            label: 'Total Denials', 
            value: formatNumber(data.totalDenials), 
            color: 'red', 
            icon: icons.denials,
            trend: '+2.3%',
            trendType: 'negative'
        },
        { 
            label: 'Denial Rate', 
            value: `${data.denialRate}%`, 
            color: 'orange', 
            icon: icons.percentage,
            trend: '+0.5%',
            trendType: 'negative'
        },
        { 
            label: 'Total Claim Amount', 
            value: formatCurrency(data.totalAmount), 
            color: 'blue', 
            icon: icons.money,
            trend: '+12.4%',
            trendType: 'positive'
        },
        { 
            label: 'Rejected Amount', 
            value: formatCurrency(data.rejectedAmount), 
            color: 'red', 
            icon: icons.rejected,
            trend: '+8.2%',
            trendType: 'negative'
        },
        { 
            label: 'Recovery Rate', 
            value: `${data.recoveryRate}%`, 
            color: 'green', 
            icon: icons.recovery,
            trend: '+3.1%',
            trendType: 'positive'
        },
        { 
            label: 'Pending Reviews', 
            value: formatNumber(data.pendingReviews), 
            color: 'yellow', 
            icon: icons.pending,
            trend: '-5.2%',
            trendType: 'positive'
        }
    ];

    return (
        <div className="medical-kpi-bar">
            {kpis.map((kpi, index) => (
                <div key={index} className={`medical-kpi-card ${kpi.color}`}>
                    <div className="kpi-icon-wrapper">
                        {kpi.icon}
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-header">
                            <span className="kpi-label">{kpi.label}</span>
                            <span className={`kpi-trend ${kpi.trendType}`}>
                                {kpi.trend}
                            </span>
                        </div>
                        <span className="kpi-value">{kpi.value}</span>
                    </div>
                </div>
            ))}

            <style>{`
                .medical-kpi-bar {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-xl);
                    width: 100%;
                }

                .medical-kpi-card {
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: var(--shadow-sm);
                    border: 1px solid var(--border-color);
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                    height: 100px;
                    min-width: 0;
                }

                .medical-kpi-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: var(--accent-color);
                    transition: height 0.2s ease;
                }

                .medical-kpi-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                }

                .medical-kpi-card:hover::before {
                    height: 4px;
                }

                .medical-kpi-card.red {
                    --accent-color: var(--status-error);
                }

                .medical-kpi-card.red .kpi-icon-wrapper {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--status-error);
                }

                .medical-kpi-card.orange {
                    --accent-color: var(--status-warning);
                }

                .medical-kpi-card.orange .kpi-icon-wrapper {
                    background: rgba(245, 158, 11, 0.1);
                    color: var(--status-warning);
                }

                .medical-kpi-card.blue {
                    --accent-color: var(--primary-color);
                }

                .medical-kpi-card.blue .kpi-icon-wrapper {
                    background: rgba(59, 130, 246, 0.1);
                    color: var(--primary-color);
                }

                .medical-kpi-card.green {
                    --accent-color: var(--status-success);
                }

                .medical-kpi-card.green .kpi-icon-wrapper {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--status-success);
                }

                .medical-kpi-card.yellow {
                    --accent-color: #eab308;
                }

                .medical-kpi-card.yellow .kpi-icon-wrapper {
                    background: rgba(234, 179, 8, 0.1);
                    color: #eab308;
                }

                .kpi-icon-wrapper {
                    width: 32px;
                    height: 32px;
                    border-radius: var(--radius-sm);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    align-self: flex-start;
                    font-size: 1rem;
                }

                .kpi-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    flex: 1;
                    align-items: flex-start;
                    justify-content: flex-end;
                }

                .kpi-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 4px;
                }

                .kpi-label {
                    font-size: 0.7rem;
                    font-weight: 500;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    line-height: 1.2;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .kpi-trend {
                    font-size: 0.6rem;
                    font-weight: 600;
                    padding: 1px 4px;
                    border-radius: 8px;
                    text-transform: uppercase;
                    line-height: 1;
                    min-width: 32px;
                    text-align: center;
                }

                .kpi-trend.positive {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--status-success);
                }

                .kpi-trend.negative {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--status-error);
                }

                .kpi-value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--text-main);
                    line-height: 1.1;
                    margin: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                /* Skeleton Loading */
                .skeleton-card {
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: var(--shadow-sm);
                    border: 1px solid var(--border-color);
                    height: 100px;
                    min-width: 0;
                }

                .skeleton-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: var(--radius-sm);
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    align-self: flex-start;
                }

                .skeleton-line {
                    height: 8px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    border-radius: 3px;
                    margin: 2px 0;
                }

                .skeleton-line.width-60 {
                    width: 60%;
                }

                .skeleton-line.width-40 {
                    width: 40%;
                }

                @keyframes loading {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }

                /* Responsive Design */
                @media (max-width: 1200px) {
                    .medical-kpi-bar {
                        grid-template-columns: repeat(3, 1fr);
                        gap: var(--spacing-sm);
                    }
                }

                @media (max-width: 768px) {
                    .medical-kpi-bar {
                        grid-template-columns: repeat(2, 1fr);
                        gap: var(--spacing-sm);
                    }
                    
                    .medical-kpi-card {
                        height: 90px;
                        padding: 12px;
                    }
                    
                    .kpi-icon-wrapper {
                        width: 28px;
                        height: 28px;
                        font-size: 0.875rem;
                    }
                    
                    .kpi-value {
                        font-size: 1rem;
                    }
                    
                    .kpi-label {
                        font-size: 0.65rem;
                    }
                    
                    .kpi-trend {
                        font-size: 0.55rem;
                        padding: 1px 3px;
                        min-width: 28px;
                    }
                }

                @media (max-width: 480px) {
                    .medical-kpi-bar {
                        grid-template-columns: 1fr;
                        gap: var(--spacing-sm);
                    }
                    
                    .medical-kpi-card {
                        height: 80px;
                        padding: 12px 16px;
                        flex-direction: row;
                        align-items: center;
                        gap: 12px;
                    }
                    
                    .kpi-content {
                        justify-content: center;
                        gap: 2px;
                    }
                    
                    .kpi-header {
                        margin-bottom: 2px;
                    }
                    
                    .kpi-icon-wrapper {
                        width: 36px;
                        height: 36px;
                        font-size: 1rem;
                    }
                    
                    .kpi-value {
                        font-size: 1.1rem;
                    }
                    
                    .kpi-label {
                        font-size: 0.7rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default MedicalKPIBar;