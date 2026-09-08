/** `2026-05-14` → `14/05/2026` */
export function formatSyncDate(syncDate) {
    if (!syncDate) return '';
    const text = String(syncDate).trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return text;
}

export function formatSyncDisplay(syncStatus) {
    if (!syncStatus) return { date: '', time: '', combined: '' };
    const date = formatSyncDate(syncStatus.syncDate);
    const time = syncStatus.lastSyncTime || '';
    const combined = [date, time].filter(Boolean).join(' · ');
    return { date, time, combined };
}
