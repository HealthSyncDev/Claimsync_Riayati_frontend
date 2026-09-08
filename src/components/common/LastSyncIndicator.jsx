import React from 'react';
import { useDataSync } from '../../context/DataSyncContext';
import { formatSyncDisplay } from '../../utils/formatSyncDisplay';
import './LastSyncIndicator.css';

const LastSyncIndicator = ({ loading = false, className = '' }) => {
    const { syncStatus, isLoadingSync } = useDataSync();
    const { date, time, combined } = formatSyncDisplay(syncStatus);
    const isLoading = (loading || isLoadingSync) && !combined;

    return (
        <div
            className={`last-sync-indicator ${className}`.trim()}
            title={combined ? `Last sync: ${combined}` : 'Sync status not available'}
            aria-live="polite"
        >
            <span className="last-sync-label">Last sync</span>
            {isLoading ? (
                <span className="last-sync-value">Loading…</span>
            ) : combined ? (
                <span className="last-sync-value">
                    {date && <span className="last-sync-date">{date}</span>}
                    {time && <span className="last-sync-time">{time}</span>}
                </span>
            ) : (
                <span className="last-sync-value">—</span>
            )}
        </div>
    );
};

export default LastSyncIndicator;
