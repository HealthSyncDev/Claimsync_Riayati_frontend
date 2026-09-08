import React, { useState } from 'react';

const SpecialtyChart = ({ data, loading }) => {
    const [sortBy, setSortBy] = useState('amount'); // 'amount' or 'rate'

    if (loading || !data) {
        return (
            <div className="specialty-chart-container">
                <div className="chart-skeleton">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="skeleton-specialty-row">
                            <div className="skeleton-line width-40"></div>
                            <div className="skeleton-bar" style={{ width: `${Math.random() * 60 + 20}%` }}></div>
                            <div className="skeleton-line width-20"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const sortedData = [...data].sort((a, b) => {
        if (sortBy === 'amount') {
            return b.amount - a.amount;
        }
        return b.rate - a.rate;
    });

    const maxAmount = Math.max(...data.map(d => d.amount));
    const maxRate = Math.max(...data.map(d => d.rate));

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

    return (
        <div className="specialty-chart-container">
            <div className="chart-controls">
                <div className="sort-buttons">
                    <button 
                        className={`sort-btn ${sortBy === 'amount' ? 'active' : ''}`}
                        onClick={() => setSortBy('amount')}
                    >
                        Sort by Amount
                    </button>
                    <button 
                        className={`sort-btn ${sortBy === 'rate' ? 'active' : ''}`}
                        onClick={() => setSortBy('rate')}
                    >
                        Sort by Rate
                    </button>
                </div>
            </div>

            <div className="specialty-chart">
                <div className="chart-header">
                    <div className="header-specialty">Specialty</div>
                    <div className="header-amount">Denial Amount</div>
                    <div className="header-rate">Rate %</div>
                </div>

                <div className="chart-body">
                    {sortedData.map((specialty, index) => (
                        <div key={index} className="specialty-row">
                            <div className="specialty-info">
                                <div className="specialty-name" title={specialty.specialty}>
                                    {specialty.specialty}
                                </div>
                                <div className="specialty-rank">#{index + 1}</div>
                            </div>

                            <div className="amount-section">
                                <div className="amount-bar-container">
                                    <div 
                                        className="amount-bar"
                                        style={{ 
                                            width: `${(specialty.amount / maxAmount) * 100}%`,
                                            backgroundColor: '#3b82f6'
                                        }}
                                    ></div>
                                </div>
                                <div className="amount-value">
                                    {formatCurrency(specialty.amount)}
                                </div>
                            </div>

                            <div className="rate-section">
                                <div 
                                    className="rate-badge"
                                    style={{ 
                                        backgroundColor: getRateColor(specialty.rate),
                                        color: 'white'
                                    }}
                                >
                                    {specialty.rate}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="chart-summary">
                <div className="summary-card">
                    <div className="summary-icon">🏥</div>
                    <div className="summary-content">
                        <span className="summary-label">Highest Denial Amount</span>
                        <span className="summary-value">
                            {sortedData[0]?.specialty.split(' ').slice(0, 2).join(' ')} - {formatCurrency(sortedData[0]?.amount)}
                        </span>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-icon">⚠️</div>
                    <div className="summary-content">
                        <span className="summary-label">Highest Denial Rate</span>
                        <span className="summary-value">
                            {[...data].sort((a, b) => b.rate - a.rate)[0]?.specialty.split(' ').slice(0, 2).join(' ')} - {[...data].sort((a, b) => b.rate - a.rate)[0]?.rate}%
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                .specialty-chart-container {
                    padding: 20px;
                }

                .chart-controls {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 24px;
                }

                .sort-buttons {
                    display: flex;
                    background: var(--bg-hover);
                    border-radius: var(--radius-md);
                    padding: 4px;
                    gap: 4px;
                }

                .sort-btn {
                    padding: 8px 16px;
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    font-size: 0.875rem;
                    font-weight: 500;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .sort-btn.active {
                    background: var(--primary-color);
                    color: white;
                    box-shadow: var(--shadow-sm);
                }

                .sort-btn:hover:not(.active) {
                    background: rgba(59, 130, 246, 0.1);
                    color: var(--primary-color);
                }

                .specialty-chart {
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                }

                .chart-header {
                    display: grid;
                    grid-template-columns: 2fr 2fr 1fr;
                    gap: 16px;
                    padding: 16px 20px;
                    background: var(--bg-hover);
                    border-bottom: 1px solid var(--border-color);
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .chart-body {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .specialty-row {
                    display: grid;
                    grid-template-columns: 2fr 2fr 1fr;
                    gap: 16px;
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border-color);
                    transition: background 0.2s;
                    align-items: center;
                }

                .specialty-row:hover {
                    background: var(--bg-hover);
                }

                .specialty-row:last-child {
                    border-bottom: none;
                }

                .specialty-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .specialty-name {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--text-main);
                    line-height: 1.4;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .specialty-rank {
                    background: var(--primary-color);
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 4px 8px;
                    border-radius: 12px;
                    min-width: 24px;
                    text-align: center;
                    flex-shrink: 0;
                }

                .amount-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .amount-bar-container {
                    flex: 1;
                    height: 8px;
                    background: var(--bg-hover);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .amount-bar {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.8s ease;
                }

                .amount-value {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                    min-width: 100px;
                    text-align: right;
                }

                .rate-section {
                    display: flex;
                    justify-content: center;
                }

                .rate-badge {
                    padding: 6px 12px;
                    border-radius: 16px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    text-align: center;
                    min-width: 50px;
                }

                .chart-summary {
                    display: flex;
                    gap: 16px;
                    margin-top: 24px;
                }

                .summary-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    flex: 1;
                }

                .summary-icon {
                    font-size: 1.5rem;
                }

                .summary-content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .summary-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .summary-value {
                    font-size: 0.875rem;
                    color: var(--text-main);
                    font-weight: 600;
                }

                /* Skeleton Loading */
                .chart-skeleton {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 20px;
                }

                .skeleton-specialty-row {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .skeleton-line {
                    height: 16px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    border-radius: 4px;
                }

                .skeleton-line.width-40 { width: 40%; }
                .skeleton-line.width-20 { width: 20%; }

                .skeleton-bar {
                    height: 8px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    border-radius: 4px;
                    flex: 1;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .chart-header,
                    .specialty-row {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    
                    .specialty-info {
                        justify-content: space-between;
                    }
                    
                    .amount-section {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 8px;
                    }
                    
                    .amount-value {
                        text-align: left;
                        min-width: auto;
                    }
                    
                    .chart-summary {
                        flex-direction: column;
                    }
                    
                    .sort-buttons {
                        width: 100%;
                    }
                    
                    .sort-btn {
                        flex: 1;
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default SpecialtyChart;