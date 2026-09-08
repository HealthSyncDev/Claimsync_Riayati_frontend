import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuickActionsGrid = () => {
    const navigate = useNavigate();

    const quickActions = [
        {
            id: 'view-reports',
            title: 'View Reports',
            description: 'Access detailed claim reports',
            icon: '📊',
            color: '#3b82f6',
            path: '/crs/reports',
            badge: 'New'
        },
        {
            id: 'submit-claim',
            title: 'Submit New Claim',
            description: 'Create and submit claims',
            icon: '📝',
            color: '#10b981',
            path: '/claims/new',
            badge: null
        },
        {
            id: 'review-denials',
            title: 'Review Denials',
            description: 'Check rejected claims',
            icon: '❌',
            color: '#ef4444',
            path: '/denials/review',
            badge: '23'
        },
        {
            id: 'analytics',
            title: 'Analytics Dashboard',
            description: 'View performance metrics',
            icon: '📈',
            color: '#8b5cf6',
            path: '/analytics',
            badge: null
        },
        {
            id: 'patient-search',
            title: 'Patient Search',
            description: 'Find patient records',
            icon: '🔍',
            color: '#06b6d4',
            path: '/patients/search',
            badge: null
        },
        {
            id: 'help-support',
            title: 'Help & Support',
            description: 'Get assistance',
            icon: '💬',
            color: '#f59e0b',
            path: '/help',
            badge: null
        }
    ];

    const handleActionClick = (action) => {
        if (action.path) {
            navigate(action.path);
        } else {
            // Handle actions that don't have routes yet
            console.log(`Action clicked: ${action.id}`);
        }
    };

    return (
        <div className="quick-actions-grid">
            <div className="actions-container">
                {quickActions.map((action) => (
                    <div 
                        key={action.id}
                        className="action-card"
                        onClick={() => handleActionClick(action)}
                        style={{ '--action-color': action.color }}
                    >
                        {action.badge && (
                            <div className="action-badge">
                                {action.badge}
                            </div>
                        )}
                        
                        <div className="action-icon-wrapper">
                            <span className="action-icon">{action.icon}</span>
                        </div>
                        
                        <div className="action-content">
                            <h4 className="action-title">{action.title}</h4>
                            <p className="action-description">{action.description}</p>
                        </div>
                        
                        <div className="action-arrow">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m9 18 6-6-6-6"/>
                            </svg>
                        </div>
                    </div>
                ))}
            </div>


            <style>{`
                .quick-actions-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .actions-container {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    width: 100%;
                }

                .action-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    gap: 8px;
                    padding: 16px 12px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                    height: 100px;
                    width: 100%;
                    box-sizing: border-box;
                }

                .action-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: var(--action-color);
                    transform: scaleX(0);
                    transition: transform 0.2s ease;
                }

                .action-card:hover {
                    background: var(--bg-hover);
                    border-color: var(--action-color);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .action-card:hover::before {
                    transform: scaleX(1);
                }

                .action-card:hover .action-icon-wrapper {
                    background: var(--action-color);
                    color: white;
                    transform: scale(1.1);
                }

                .action-card:hover .action-arrow {
                    color: var(--action-color);
                    transform: translateY(-2px);
                }

                .action-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: var(--status-error);
                    color: white;
                    font-size: 0.65rem;
                    font-weight: 600;
                    padding: 2px 6px;
                    border-radius: 10px;
                    z-index: 3;
                    min-width: 18px;
                    text-align: center;
                    line-height: 1.2;
                }

                .action-badge:has-text("New") {
                    background: var(--status-success);
                }

                .action-badge:has-text("New") {
                    background: var(--status-success);
                }

                .action-icon-wrapper {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-md);
                    background: rgba(59, 130, 246, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: all 0.2s ease;
                    margin-bottom: 2px;
                }

                .action-icon {
                    font-size: 1.25rem;
                    transition: transform 0.2s ease;
                }

                .action-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    align-items: center;
                    text-align: center;
                    width: 100%;
                }

                .action-title {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-main);
                    margin: 0;
                    line-height: 1.2;
                    text-align: center;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .action-description {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    margin: 0;
                    line-height: 1.2;
                    text-align: center;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .action-arrow {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    color: var(--text-muted);
                    transition: all 0.2s ease;
                    opacity: 0.5;
                    z-index: 2;
                }


                /* Specific action colors */
                .action-card:nth-child(1) .action-icon-wrapper {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                }

                .action-card:nth-child(2) .action-icon-wrapper {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }

                .action-card:nth-child(3) .action-icon-wrapper {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }

                .action-card:nth-child(4) .action-icon-wrapper {
                    background: rgba(139, 92, 246, 0.1);
                    color: #8b5cf6;
                }

                .action-card:nth-child(5) .action-icon-wrapper {
                    background: rgba(6, 182, 212, 0.1);
                    color: #06b6d4;
                }

                .action-card:nth-child(6) .action-icon-wrapper {
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                }

                /* Active state */
                .action-card:active {
                    transform: translateY(0);
                    box-shadow: var(--shadow-sm);
                }

                /* Focus state for accessibility */
                .action-card:focus {
                    outline: 2px solid var(--primary-color);
                    outline-offset: 2px;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .actions-container {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 12px;
                    }
                    
                    .action-card {
                        height: 100px;
                        padding: 16px 12px;
                        gap: 8px;
                    }
                    
                    .action-icon-wrapper {
                        width: 44px;
                        height: 44px;
                        margin-bottom: 2px;
                    }
                    
                    .action-icon {
                        font-size: 1.5rem;
                    }
                    
                    .action-title {
                        font-size: 0.8rem;
                    }
                    
                    .action-description {
                        font-size: 0.65rem;
                        -webkit-line-clamp: 1;
                    }
                }

                @media (max-width: 480px) {
                    .actions-container {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    
                    .action-card {
                        height: 90px;
                        padding: 16px;
                        flex-direction: row;
                        text-align: left;
                        gap: 16px;
                        justify-content: flex-start;
                    }
                    
                    .action-content {
                        align-items: flex-start;
                        text-align: left;
                        flex: 1;
                    }
                    
                    .action-icon-wrapper {
                        width: 48px;
                        height: 48px;
                        margin-bottom: 0;
                        flex-shrink: 0;
                    }
                    
                    .action-icon {
                        font-size: 1.5rem;
                    }
                    
                    .action-title {
                        font-size: 0.875rem;
                        text-align: left;
                    }
                    
                    .action-description {
                        font-size: 0.7rem;
                        text-align: left;
                        -webkit-line-clamp: 2;
                    }
                    
                    .action-arrow {
                        position: relative;
                        top: auto;
                        right: auto;
                        margin-left: auto;
                    }
                }

                /* Animation for new badges */
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }

                .action-badge {
                    animation: pulse 2s infinite;
                }

                /* Hover effect for the entire grid */
                .actions-container:hover .action-card:not(:hover) {
                    opacity: 0.8;
                    transform: scale(0.98);
                }

                .actions-container:hover .action-card:hover {
                    opacity: 1;
                    transform: translateY(-4px) scale(1.02);
                }
            `}</style>
        </div>
    );
};

export default QuickActionsGrid;