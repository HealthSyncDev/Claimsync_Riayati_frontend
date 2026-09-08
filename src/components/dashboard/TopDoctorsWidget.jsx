import React, { useState } from 'react';

const TopDoctorsWidget = ({ data, loading }) => {
    const [showAll, setShowAll] = useState(false);

    if (loading || !data) {
        return (
            <div className="top-doctors-widget">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="skeleton-doctor-row">
                        <div className="skeleton-avatar"></div>
                        <div className="skeleton-info">
                            <div className="skeleton-line width-70"></div>
                            <div className="skeleton-line width-50"></div>
                        </div>
                        <div className="skeleton-line width-30"></div>
                    </div>
                ))}
            </div>
        );
    }

    const displayData = showAll ? data : data.slice(0, 5);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'AED',
            maximumFractionDigits: 0 
        }).format(val);
    };

    const getRateColor = (rate) => {
        if (rate >= 15) return '#ef4444'; // Red for high rates
        if (rate >= 10) return '#f59e0b'; // Orange for medium rates
        if (rate >= 5) return '#eab308';  // Yellow for low-medium rates
        return '#10b981'; // Green for low rates
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2);
    };

    return (
        <div className="top-doctors-widget">
            <div className="doctors-list">
                {displayData.map((doctor, index) => (
                    <div key={index} className="doctor-row">
                        <div className="doctor-rank">
                            {index + 1}
                        </div>
                        
                        <div className="doctor-avatar">
                            {getInitials(doctor.name)}
                        </div>
                        
                        <div className="doctor-info">
                            <div className="doctor-name" title={doctor.name}>
                                {doctor.name}
                            </div>
                            <div className="doctor-specialty">
                                {doctor.specialty}
                            </div>
                        </div>
                        
                        <div className="doctor-metrics">
                            <div className="metric-row">
                                <span className="metric-label">Denials:</span>
                                <span className="metric-value">
                                    {formatCurrency(doctor.denials)}
                                </span>
                            </div>
                            <div className="metric-row">
                                <span className="metric-label">Rate:</span>
                                <span 
                                    className="rate-badge"
                                    style={{ 
                                        backgroundColor: getRateColor(doctor.rate),
                                        color: 'white'
                                    }}
                                >
                                    {doctor.rate}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {data.length > 5 && (
                <div className="widget-footer">
                    <button 
                        className="show-more-btn"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? 'Show Less' : `Show All ${data.length} Doctors`}
                    </button>
                </div>
            )}

            <div className="widget-summary">
                <div className="summary-stat">
                    <div className="stat-icon">👨‍⚕️</div>
                    <div className="stat-content">
                        <span className="stat-value">{data.length}</span>
                        <span className="stat-label">Total Doctors</span>
                    </div>
                </div>
                <div className="summary-stat">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <span className="stat-value">
                            {Math.round(data.reduce((acc, d) => acc + d.rate, 0) / data.length)}%
                        </span>
                        <span className="stat-label">Avg. Rate</span>
                    </div>
                </div>
            </div>

            <style>{`
                .top-doctors-widget {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .doctors-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .doctor-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    transition: all 0.2s;
                }

                .doctor-row:hover {
                    background: var(--bg-hover);
                    border-color: var(--primary-color);
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-sm);
                }

                .doctor-rank {
                    width: 24px;
                    height: 24px;
                    background: var(--primary-color);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 600;
                    flex-shrink: 0;
                }

                .doctor-avatar {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #3b82f6, #6366f1);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.875rem;
                    font-weight: 600;
                    flex-shrink: 0;
                    border: 2px solid white;
                    box-shadow: var(--shadow-sm);
                }

                .doctor-info {
                    flex: 1;
                    min-width: 0;
                }

                .doctor-name {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                    line-height: 1.3;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    margin-bottom: 2px;
                }

                .doctor-specialty {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .doctor-metrics {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    align-items: flex-end;
                }

                .metric-row {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .metric-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .metric-value {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .rate-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-align: center;
                    min-width: 35px;
                }

                .widget-footer {
                    display: flex;
                    justify-content: center;
                    padding-top: 8px;
                    border-top: 1px solid var(--border-color);
                }

                .show-more-btn {
                    background: none;
                    border: 1px solid var(--primary-color);
                    color: var(--primary-color);
                    padding: 8px 16px;
                    border-radius: var(--radius-md);
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .show-more-btn:hover {
                    background: var(--primary-color);
                    color: white;
                    transform: translateY(-1px);
                }

                .widget-summary {
                    display: flex;
                    gap: 12px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                }

                .summary-stat {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px;
                    background: var(--bg-hover);
                    border-radius: var(--radius-md);
                    flex: 1;
                }

                .stat-icon {
                    font-size: 1.25rem;
                }

                .stat-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .stat-value {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-main);
                    line-height: 1;
                }

                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                /* Skeleton Loading */
                .skeleton-doctor-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                }

                .skeleton-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    flex-shrink: 0;
                }

                .skeleton-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .skeleton-line {
                    height: 12px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    border-radius: 4px;
                }

                .skeleton-line.width-70 { width: 70%; }
                .skeleton-line.width-50 { width: 50%; }
                .skeleton-line.width-30 { width: 30%; }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .doctor-row {
                        flex-wrap: wrap;
                        gap: 8px;
                    }
                    
                    .doctor-info {
                        order: 1;
                        flex: 1 1 100%;
                    }
                    
                    .doctor-metrics {
                        order: 2;
                        flex: 1 1 100%;
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .widget-summary {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
};

export default TopDoctorsWidget;