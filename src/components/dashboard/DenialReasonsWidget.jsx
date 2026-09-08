import React, { useState } from 'react';

const DenialReasonsWidget = ({ data, loading }) => {
    const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'list'

    if (loading || !data) {
        return (
            <div className="denial-reasons-widget">
                <div className="skeleton-container">
                    <div className="skeleton-chart">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="skeleton-reason-row">
                                <div className="skeleton-line width-40"></div>
                                <div className="skeleton-bar" style={{ width: `${Math.random() * 60 + 20}%` }}></div>
                                <div className="skeleton-line width-20"></div>
                            </div>
                        ))}
                    </div>
                </div>
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

    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    const maxAmount = Math.max(...data.map(d => d.amount));

    const getReasonColor = (index) => {
        const colors = [
            '#ef4444', // Red for Medical Necessity (highest)
            '#f59e0b', // Orange for Authorization
            '#eab308', // Yellow for Clinical Information
            '#3b82f6', // Blue for Price
            '#6366f1', // Indigo for Administrative
            '#10b981', // Green for others
        ];
        return colors[index] || colors[colors.length - 1];
    };

    const getReasonIcon = (reason) => {
        const icons = {
            'Medical Necessity': '🏥',
            'Clinical Information': '📋',
            'Authorization': '📝',
            'Price': '💰',
            'Administrative Information': '📊',
            'Timely filing': '⏰',
            'Non-coverage': '❌',
            'Eligibility': '👤',
            'Duplicate': '📄',
            'Copay': '💳'
        };
        return icons[reason] || '📌';
    };

    return (
        <div className="denial-reasons-widget">
            <div className="widget-controls">
                <div className="view-toggle">
                    <button 
                        className={`toggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
                        onClick={() => setViewMode('chart')}
                    >
                        📊 Chart View
                    </button>
                    <button 
                        className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        📋 List View
                    </button>
                </div>
            </div>

            {viewMode === 'chart' ? (
                <div className="chart-view">
                    <div className="reasons-chart">
                        {data.map((reason, index) => (
                            <div key={index} className="reason-row">
                                <div className="reason-info">
                                    <div className="reason-icon">
                                        {getReasonIcon(reason.reason)}
                                    </div>
                                    <div className="reason-details">
                                        <div className="reason-name">{reason.reason}</div>
                                        <div className="reason-stats">
                                            {formatCurrency(reason.amount)} • {reason.percentage}%
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="reason-visualization">
                                    <div className="progress-container">
                                        <div 
                                            className="progress-bar"
                                            style={{ 
                                                width: `${(reason.amount / maxAmount) * 100}%`,
                                                backgroundColor: getReasonColor(index)
                                            }}
                                        >
                                            <span className="progress-label">{reason.percentage}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="chart-summary">
                        <div className="summary-total">
                            <div className="total-icon">💰</div>
                            <div className="total-content">
                                <span className="total-label">Total Denied Amount</span>
                                <span className="total-value">{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="list-view">
                    <div className="reasons-list">
                        {data.map((reason, index) => (
                            <div key={index} className="reason-card">
                                <div className="card-header">
                                    <div className="reason-badge" style={{ backgroundColor: getReasonColor(index) }}>
                                        {getReasonIcon(reason.reason)}
                                    </div>
                                    <div className="reason-title">
                                        <h4>{reason.reason}</h4>
                                        <span className="reason-rank">#{index + 1} Most Common</span>
                                    </div>
                                    <div className="reason-percentage">
                                        <span className="percentage-value">{reason.percentage}%</span>
                                        <span className="percentage-label">of total</span>
                                    </div>
                                </div>
                                
                                <div className="card-body">
                                    <div className="metric-grid">
                                        <div className="metric-item">
                                            <span className="metric-label">Denied Amount</span>
                                            <span className="metric-value">{formatCurrency(reason.amount)}</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Impact Level</span>
                                            <span className={`impact-badge ${reason.percentage >= 50 ? 'high' : reason.percentage >= 20 ? 'medium' : 'low'}`}>
                                                {reason.percentage >= 50 ? 'High' : reason.percentage >= 20 ? 'Medium' : 'Low'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="widget-insights">
                <div className="insight-highlight">
                    <div className="highlight-icon">⚠️</div>
                    <div className="highlight-content">
                        <div className="highlight-title">Key Insight</div>
                        <div className="highlight-text">
                            <strong>{data[0]?.reason}</strong> accounts for <strong>{data[0]?.percentage}%</strong> of all denials.
                            Focus on improving documentation and medical necessity justification.
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .denial-reasons-widget {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .widget-controls {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 8px;
                }

                .view-toggle {
                    display: flex;
                    background: var(--bg-hover);
                    border-radius: var(--radius-md);
                    padding: 4px;
                    gap: 4px;
                }

                .toggle-btn {
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

                .toggle-btn.active {
                    background: var(--primary-color);
                    color: white;
                    box-shadow: var(--shadow-sm);
                }

                .toggle-btn:hover:not(.active) {
                    background: rgba(59, 130, 246, 0.1);
                    color: var(--primary-color);
                }

                /* Chart View */
                .chart-view {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .reasons-chart {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .reason-row {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    transition: all 0.2s;
                }

                .reason-row:hover {
                    background: var(--bg-hover);
                    border-color: var(--primary-color);
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-sm);
                }

                .reason-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 200px;
                }

                .reason-icon {
                    font-size: 1.5rem;
                    width: 40px;
                    text-align: center;
                }

                .reason-details {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .reason-name {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                    line-height: 1.3;
                }

                .reason-stats {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .reason-visualization {
                    flex: 1;
                }

                .progress-container {
                    position: relative;
                    height: 32px;
                    background: var(--bg-hover);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                }

                .progress-bar {
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding-right: 12px;
                    border-radius: var(--radius-md);
                    transition: width 0.8s ease;
                    position: relative;
                }

                .progress-label {
                    color: white;
                    font-size: 0.875rem;
                    font-weight: 600;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                }

                .chart-summary {
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                }

                .summary-total {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: linear-gradient(135deg, #1e40af, #3b82f6);
                    border-radius: var(--radius-md);
                    color: white;
                }

                .total-icon {
                    font-size: 1.5rem;
                }

                .total-content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .total-label {
                    font-size: 0.875rem;
                    opacity: 0.9;
                }

                .total-value {
                    font-size: 1.25rem;
                    font-weight: 700;
                }

                /* List View */
                .list-view {
                    display: flex;
                    flex-direction: column;
                }

                .reasons-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .reason-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    transition: all 0.2s;
                }

                .reason-card:hover {
                    border-color: var(--primary-color);
                    box-shadow: var(--shadow-md);
                }

                .card-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: var(--bg-hover);
                    border-bottom: 1px solid var(--border-color);
                }

                .reason-badge {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    color: white;
                    flex-shrink: 0;
                }

                .reason-title {
                    flex: 1;
                }

                .reason-title h4 {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-main);
                    margin: 0 0 4px 0;
                }

                .reason-rank {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .reason-percentage {
                    text-align: right;
                }

                .percentage-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--primary-color);
                    display: block;
                    line-height: 1;
                }

                .percentage-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .card-body {
                    padding: 16px;
                }

                .metric-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }

                .metric-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .metric-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .metric-value {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .impact-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    text-align: center;
                }

                .impact-badge.high {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--status-error);
                }

                .impact-badge.medium {
                    background: rgba(245, 158, 11, 0.1);
                    color: var(--status-warning);
                }

                .impact-badge.low {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--status-success);
                }

                /* Widget Insights */
                .widget-insights {
                    margin-top: 8px;
                }

                .insight-highlight {
                    display: flex;
                    gap: 12px;
                    padding: 16px;
                    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 179, 8, 0.1));
                    border: 1px solid rgba(245, 158, 11, 0.2);
                    border-radius: var(--radius-md);
                }

                .highlight-icon {
                    font-size: 1.5rem;
                    flex-shrink: 0;
                }

                .highlight-content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .highlight-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .highlight-text {
                    font-size: 0.875rem;
                    color: var(--text-body);
                    line-height: 1.4;
                }

                /* Skeleton Loading */
                .skeleton-container {
                    padding: 20px;
                }

                .skeleton-chart {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .skeleton-reason-row {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
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
                    height: 32px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    border-radius: var(--radius-md);
                    flex: 1;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .reason-row {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                    }
                    
                    .reason-info {
                        min-width: auto;
                    }
                    
                    .card-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                    }
                    
                    .reason-percentage {
                        text-align: left;
                    }
                    
                    .metric-grid {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    
                    .view-toggle {
                        width: 100%;
                    }
                    
                    .toggle-btn {
                        flex: 1;
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default DenialReasonsWidget;