import React from 'react';

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container fade-in-up">
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close-btn" onClick={onCancel}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="modal-message">{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button
                        className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(2px);
                }
                .modal-container {
                    background: white;
                    border-radius: var(--radius-md);
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                }
                .modal-header {
                    padding: var(--spacing-md);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--bg-hover);
                }
                .modal-title {
                    font-size: var(--font-size-base);
                    font-weight: var(--font-weight-semibold);
                    margin: 0;
                    color: var(--text-main);
                }
                .modal-close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    line-height: 1;
                    cursor: pointer;
                    color: var(--text-muted);
                }
                .modal-body {
                    padding: var(--spacing-lg);
                    color: var(--text-body);
                    font-size: var(--font-size-sm);
                }
                .modal-message {
                    margin: 0;
                    line-height: 1.5;
                }
                .modal-footer {
                    padding: var(--spacing-md);
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--spacing-sm);
                    background: var(--bg-card);
                }
                
                .btn-danger {
                    background-color: var(--status-error);
                    color: white;
                    border: none;
                }
                .btn-danger:hover {
                    background-color: #d32f2f; /* Darker red */
                }
                
                .fade-in-up {
                    animation: fadeInUp 0.3s ease-out;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ConfirmationModal;
