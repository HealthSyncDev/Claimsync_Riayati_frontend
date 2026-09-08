import React from 'react';

const TrendChart = ({ data, loading }) => {
    if (loading || !data) {
        return (
            <div className="trend-chart-container">
                <div className="chart-skeleton">
                    <div className="skeleton-bars">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="skeleton-bar" style={{ height: `${Math.random() * 100 + 50}px` }}></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const maxRejections = Math.max(...data.map(d => d.rejections));
    const maxRate = Math.max(...data.map(d => d.rate));
    const minRate = Math.min(...data.map(d => d.rate));
    
    // Create better Y-axis scales
    const barScale = [600, 400, 200, 0];
    const rateScale = [20, 15, 10, 5, 0];

    return (
        <div className="trend-chart-container">
            <div className="chart-legend">
                <div className="legend-item">
                    <div className="legend-color bar-legend"></div>
                    <span>Rejection Count (000)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color line-legend"></div>
                    <span>Rejection Rate %</span>
                </div>
            </div>

            <div className="chart-area">
                <div className="chart-y-axis">
                    <div className="y-axis-label">Count (000)</div>
                    <div className="y-axis-ticks">
                        {barScale.map((value, index) => (
                            <span key={index} className="y-tick">{value}</span>
                        ))}
                    </div>
                </div>

                <div className="chart-content">
                    <div className="chart-grid">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="grid-line"></div>
                        ))}
                    </div>

                    <div className="chart-bars">
                        {data.map((item, index) => (
                            <div key={index} className="chart-month-group">
                                <div className="bar-container">
                                    <div 
                                        className="rejection-bar"
                                        style={{ 
                                            height: `${(item.rejections / 600) * 200}px`,
                                            background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                                        }}
                                        title={`${item.rejections} rejections`}
                                    >
                                        <span className="bar-value">{item.rejections}</span>
                                    </div>
                                </div>
                                <div className="month-label">{item.month}</div>
                            </div>
                        ))}
                    </div>

                    <div className="rate-line-container">
                        <svg className="rate-line-svg" viewBox="0 0 400 200">
                            <defs>
                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#ef4444" />
                                    <stop offset="100%" stopColor="#dc2626" />
                                </linearGradient>
                                <filter id="dropShadow">
                                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.1"/>
                                </filter>
                            </defs>
                            <polyline
                                points={data.map((item, index) => 
                                    `${(index * 80) + 40},${200 - (item.rate / 20) * 180}`
                                ).join(' ')}
                                fill="none"
                                stroke="url(#lineGradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                filter="url(#dropShadow)"
                            />
                            {data.map((item, index) => (
                                <g key={index}>
                                    <circle
                                        cx={(index * 80) + 40}
                                        cy={200 - (item.rate / 20) * 180}
                                        r="5"
                                        fill="#ef4444"
                                        stroke="white"
                                        strokeWidth="2"
                                        filter="url(#dropShadow)"
                                    />
                                    <text
                                        x={(index * 80) + 40}
                                        y={200 - (item.rate / 20) * 180 - 12}
                                        textAnchor="middle"
                                        className="rate-label"
                                        fill="#ef4444"
                                        fontSize="11"
                                        fontWeight="700"
                                    >
                                        {item.rate}%
                                    </text>
                                </g>
                            ))}
                        </svg>
                    </div>
                </div>

                <div className="chart-y-axis-right">
                    <div className="y-axis-label">Rate %</div>
                    <div className="y-axis-ticks">
                        {rateScale.map((value, index) => (
                            <span key={index} className="y-tick">{value}%</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="chart-insights">
                <div className="insight-card trend">
                    <div className="insight-icon">📈</div>
                    <div className="insight-content">
                        <span className="insight-label">TREND</span>
                        <span className="insight-value">Increasing rejection rate</span>
                    </div>
                </div>
                <div className="insight-card peak">
                    <div className="insight-icon">📊</div>
                    <div className="insight-content">
                        <span className="insight-label">PEAK MONTH</span>
                        <span className="insight-value">May 2025 (15%)</span>
                    </div>
                </div>
            </div>

            <style>{`
                .trend-chart-container {
                    padding: 16px;
                    background: var(--bg-card);
                }

                .chart-legend {
                    display: flex;
                    gap: 32px;
                    margin-bottom: 24px;
                    justify-content: center;
                    padding: 12px;
                    background: var(--bg-hover);
                    border-radius: var(--radius-md);
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--text-main);
                }

                .legend-color {
                    width: 18px;
                    height: 18px;
                    border-radius: 4px;
                    box-shadow: var(--shadow-sm);
                }

                .bar-legend {
                    background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
                }

                .line-legend {
                    background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
                }

                .chart-area {
                    display: flex;
                    align-items: stretch;
                    height: 280px;
                    margin: 24px 0;
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    padding: 16px 8px;
                    border: 1px solid var(--border-color);
                }

                .chart-y-axis,
                .chart-y-axis-right {
                    display: flex;
                    flex-direction: column;
                    width: 60px;
                    align-items: center;
                }

                .chart-y-axis-right {
                    align-items: center;
                }

                .y-axis-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 600;
                    margin-bottom: 12px;
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .y-axis-ticks {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    height: 220px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .y-tick {
                    position: relative;
                }

                .chart-content {
                    flex: 1;
                    position: relative;
                    height: 220px;
                    margin-top: 24px;
                }

                .chart-grid {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 220px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .grid-line {
                    height: 1px;
                    background: var(--border-color);
                    opacity: 0.3;
                }

                .chart-bars {
                    display: flex;
                    justify-content: space-around;
                    align-items: end;
                    height: 220px;
                    position: relative;
                    z-index: 2;
                }

                .chart-month-group {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }

                .bar-container {
                    display: flex;
                    align-items: end;
                    height: 220px;
                }

                .rejection-bar {
                    width: 48px;
                    border-radius: 6px 6px 0 0;
                    transition: all 0.3s ease;
                    position: relative;
                    display: flex;
                    align-items: start;
                    justify-content: center;
                    padding-top: 8px;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
                }

                .rejection-bar:hover {
                    opacity: 0.9;
                    transform: scale(1.05);
                    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
                }

                .bar-value {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: white;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
                    background: rgba(0,0,0,0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .month-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                    margin-top: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .rate-line-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 220px;
                    z-index: 3;
                    pointer-events: none;
                }

                .rate-line-svg {
                    width: 100%;
                    height: 100%;
                }

                .rate-label {
                    pointer-events: none;
                }

                .chart-insights {
                    display: flex;
                    gap: 16px;
                    margin-top: 24px;
                }

                .insight-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    border-radius: var(--radius-md);
                    flex: 1;
                    border: 1px solid var(--border-color);
                    transition: all 0.2s ease;
                }

                .insight-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .insight-card.trend {
                    background: rgba(16, 185, 129, 0.08);
                    border-color: rgba(16, 185, 129, 0.3);
                }

                .insight-card.peak {
                    background: rgba(59, 130, 246, 0.08);
                    border-color: rgba(59, 130, 246, 0.3);
                }

                .insight-icon {
                    font-size: 1.5rem;
                    opacity: 0.8;
                }

                .insight-content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .insight-label {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .insight-value {
                    font-size: 0.875rem;
                    color: var(--text-main);
                    font-weight: 600;
                    line-height: 1.2;
                }

                /* Skeleton Loading */
                .chart-skeleton {
                    height: 250px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .skeleton-bars {
                    display: flex;
                    align-items: end;
                    gap: 20px;
                    height: 200px;
                }

                .skeleton-bar {
                    width: 40px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    border-radius: 4px 4px 0 0;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .chart-legend {
                        flex-direction: column;
                        gap: 12px;
                        align-items: center;
                    }
                    
                    .chart-area {
                        height: 200px;
                    }
                    
                    .chart-content {
                        height: 160px;
                    }
                    
                    .chart-bars {
                        height: 160px;
                    }
                    
                    .bar-container {
                        height: 160px;
                    }
                    
                    .rejection-bar {
                        width: 30px;
                    }
                    
                    .chart-insights {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
};

export default TrendChart;