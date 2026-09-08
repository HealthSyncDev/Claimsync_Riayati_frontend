import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../utils/apiFetch';

const DataSyncContext = createContext(null);

const normalizeSyncStatus = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const syncDate = raw.sync_date ?? raw.syncDate;
    const lastSyncTime = raw.last_sync_time ?? raw.lastSyncTime;
    if (!syncDate && !lastSyncTime) return null;
    return {
        tableId: raw.table_id ?? raw.tableId ?? null,
        syncTime: raw.sync_time ?? raw.syncTime ?? null,
        syncDate: syncDate ? String(syncDate) : null,
        lastSyncTime: lastSyncTime ? String(lastSyncTime) : null,
    };
};

export function DataSyncProvider({ children }) {
    const [syncStatus, setSyncStatus] = useState(null);
    const [isLoadingSync, setIsLoadingSync] = useState(true);

    const refreshSyncStatus = useCallback(async () => {
        setIsLoadingSync(true);
        try {
            const data = await apiFetch('/api/sync/latest');
            setSyncStatus(normalizeSyncStatus(data));
        } catch (err) {
            console.error('Failed to load sync status:', err);
        } finally {
            setIsLoadingSync(false);
        }
    }, []);

    useEffect(() => {
        refreshSyncStatus();
    }, [refreshSyncStatus]);

    return (
        <DataSyncContext.Provider value={{ syncStatus, isLoadingSync, refreshSyncStatus }}>
            {children}
        </DataSyncContext.Provider>
    );
}

export function useDataSync() {
    const ctx = useContext(DataSyncContext);
    if (!ctx) {
        throw new Error('useDataSync must be used within DataSyncProvider');
    }
    return ctx;
}
