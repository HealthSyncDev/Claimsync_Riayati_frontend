/** Format ISO or Date for UI — `DD/MM/YYYY HH:mm` */
export function formatDisplayDateTime(dateInput, { includeTime = true } = {}) {
    if (!dateInput) return '—';
    if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/.test(dateInput)) {
        return includeTime ? dateInput : dateInput.split(' ')[0];
    }
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '—';
    const pad = (n) => n.toString().padStart(2, '0');
    const base = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    if (!includeTime) return base;
    return `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
