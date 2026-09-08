import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const bgColors = {
        success: 'var(--status-success-bg)',
        error: 'var(--status-error-bg)',
        info: 'var(--status-info-bg)'
    };

    const textColors = {
        success: 'var(--status-success)',
        error: 'var(--status-error)',
        info: 'var(--status-info)'
    };

    const icons = {
        success: '✓',
        error: '⚠',
        info: 'ℹ'
    };

    return createPortal(
        <div className="toast-container slide-in">
            <div className="toast-icon">{icons[type]}</div>
            <div className="toast-message">{message}</div>
            <button className="toast-close" onClick={onClose}>&times;</button>

            <style>{`
                .toast-container {
                    position: fixed;
                    top: 24px;
                    right: 24px;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    border-radius: var(--radius-md);
                    background-color: white;
                    color: var(--text-main);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    border-left: 4px solid ${textColors[type]};
                    min-width: 320px;
                    max-width: 450px;
                    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    pointer-events: auto;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                .toast-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background-color: ${bgColors[type]};
                    color: ${textColors[type]};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    flex-shrink: 0;
                    font-size: 14px;
                }

                .toast-message {
                    font-size: 0.95rem;
                    font-weight: 500;
                    flex: 1;
                    line-height: 1.4;
                }

                .toast-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0 4px;
                    line-height: 1;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: center;
                }
                .toast-close:hover {
                    color: var(--text-main);
                    opacity: 1;
                }
            `}</style>
        </div>,
        document.body
    );
};

export default Toast;
