import React, { useState } from 'react';

const PayerRejectionWidget = ({ data, loading }) => {
    const [selectedPayer, setSelectedPayer] = useState(null);

    if (loading || !data) {
        return (
            <div className="payer-rejection-widget">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton-payer-row">
                        <div className="skeleton-info">
                            <div className="skeleton-line width-80"></div>
                            <div className="skeleton-line width-60"></div>
                        </div>
                        <div className="skeleton-line width-25"></div>
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

    const getRateColor = (rate) => {
        if (rate >= 15) return '#ef4444'; // Red for high rates
        if (rate >= 10) return '#f59e0b'; // Orange for medium rates
        if (rate >= 5) return '#eab308';  // Yellow for low-medium rates
        return '#10b981'; // Green for low rates
    };

    const getPayerInitials = (payer) => {
        return payer.split(' ').map(word => word.charAt(0)).join('').substring(0, 3);
    };

    const getProcessingRate = (payer) => {
        return Math.round((payer.processed / payer.claimed) * 100);
    };

    return (
        <div className="payer-rejection-widget">
            <div className="payers-list">
                {data.map((payer, index) => (
                    <div 
                        key={index} 
                        className={`payer-row ${selectedPayer === index ? 'selected' : ''}`}
                        onClick={() => setSelectedPayer(selectedPayer === index ? null : index)}
                    >
                        <div className="payer-header">
                            <div className="payer-avatar">
                                {getPayerInitials(payer.payer)}
                            </div>
                            <div className="payer-info">
                                <div className="payer-name" title={payer.payer}>
                                    {payer.payer.length > 25 ? 
                                        payer.payer.substring(0, 25) + '...' : 
                                        payer.payer
                                    }
                                </div>
                                <div className="payer-stats">
                                    <span className="stat-item">
                                        Processing: {getProcessingRate(payer)}%
                                    </span>
                                </div>
                            </div>
                            <div className="rejection-rate">
                                <div 
                                    className="rate-circle"
                                    style={{ 
                                        backgroundColor: getRateColor(payer.rate),
                                        color: 'white'
                                    }}
                                >
                                    {payer.rate}%
                                </div>
                            </div>
                        </div>

                        {selectedPayer === index && (
                            <div className="payer-details">
                                <div className="details-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Claimed Amount</span>
                                        <span className="detail-value">
                                            {formatCurrency(payer.claimed)}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Processed Amount</span>
                                        <span className="detail-value success">
                                            {formatCurrency(payer.processed)}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Rejected Amount</span>
                                        <span className="detail-value error">
                                            {formatCurrency(payer.rejected)}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Success Rate</span>
                                        <span className="detail-value">
                                            {100 - payer.rate}%
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="progress-bar-container">
                                    <div className="progress-labels">
                                        <span>Processed</span>
                                        <span>Rejected</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-processed"
                                            style={{ 
                                                width: `${getProcessingRate(payer)}%`,
                                                backgroundColor: '#10b981'
                                            }}
                                        ></div>
                                        <div 
                                            className="progress-rejected"
                                            style={{ 
                                                width: `${payer.rate}%`,
                                                backgroundColor: getRateColor(payer.rate)
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="widget-insights">
                <div className="insight-card best">
                    <div className="insight-icon">🏆</div>
                    <div className="insight-content">
                        <span className="insight-label">Best Performer</span>
                        <span className="insight-value">
                            {[...data].sort((a, b) => a.rate - b.rate)[0]?.payer.split(' ')[0]} ({[...data].sort((a, b) => a.rate - b.rate)[0]?.rate}%)
                        </span>
                    </div>
                </div>
                <div className="insight-card worst">
                    <div className="insight-icon">⚠️</div>
                    <div className="insight-content">
                        <span className="insight-label">Needs Attention</span>
                        <span className="insight-value">
                            {[...data].sort((a, b) => b.rate - a.rate)[0]?.payer.split(' ')[0]} ({[...data].sort((a, b) => b.rate - a.rate)[0]?.rate}%)
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                .payer-rejection-widget {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .payers-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .payer-row {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    transition: all 0.2s;
                    cursor: pointer;
                    overflow: hidden;
                }

                .payer-row:hover {
                    border-color: var(--primary-color);
                    box-shadow: var(--shadow-sm);
                }

                .payer-row.selected {
                    border-color: var(--primary-color);
                    box-shadow: var(--shadow-md);
                }

                .payer-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                }

                .payer-avatar {
                    width: 36px;
                    height: 36px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 600;
                    flex-shrink: 0;
                }

                .payer-info {
                    flex: 1;
                    min-width: 0;
                }

                .payer-name {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                    line-height: 1.3;
                    margin-bottom: 4px;
                }

                .payer-stats {
                    display: flex;
                    gap: 12px;
                }

                .stat-item {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .rejection-rate {
                    flex-shrink: 0;
                }

                .rate-circle {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.875rem;
                    font-weight: 700;
                    box-shadow: var(--shadow-sm);
                }

                .payer-details {
                    padding: 16px;
                    background: var(--bg-hover);
                    border-top: 1px solid var(--border-color);
                    animation: slideDown 0.2s ease-out;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .details-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .detail-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .detail-value {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .detail-value.success {
                    color: var(--status-success);
                }

                .detail-value.error {
                    color: var(--status-error);
                }

                .progress-bar-container {
                    margin-top: 16px;
                }

                .progress-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-bottom: 8px;
                }

                .progress-bar {
                    height: 8px;
                    background: var(--bg-card);
                    border-radius: 4px;
                    overflow: hidden;
                    display: flex;
                    border: 1px solid var(--border-color);
                }

                .progress-processed,
                .progress-rejected {
                    height: 100%;
                    transition: width 0.8s ease;
                }

                .widget-insights {
                    display: flex;
                    gap: 12px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                }

                .insight-card {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px;
                    border-radius: var(--radius-md);
                    flex: 1;
                }

                .insight-card.best {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }

                .insight-card.worst {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }

                .insight-icon {
                    font-size: 1.25rem;
                }

                .insight-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .insight-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .insight-value {
                    font-size: 0.875rem;
                    color: var(--text-main);
                    font-weight: 600;
                }

                /* Skeleton Loading */
                .skeleton-payer-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
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

                .skeleton-line.width-80 { width: 80%; }
                .skeleton-line.width-60 { width: 60%; }
                .skeleton-line.width-25 { width: 25%; }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .details-grid {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }
                    
                    .widget-insights {
                        flex-direction: column;
                    }
                    
                    .payer-name {
                        font-size: 0.8rem;
                    }
                    
                    .rate-circle {
                        width: 40px;
                        height: 40px;
                        font-size: 0.75rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default PayerRejectionWidget;