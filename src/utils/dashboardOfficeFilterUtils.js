/** Parse dashboard office filter value → selected office id strings (empty = all). */
export function parseDashboardOfficeFilterIds(officeId) {
  if (!officeId || officeId === 'All') return [];
  return String(officeId)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isDashboardOfficeFilterAll(officeId) {
  return !officeId || officeId === 'All';
}

/** Human-readable label for chips / exports. */
export function formatDashboardOfficeFilterLabel(officeId, officeOptions = []) {
  if (isDashboardOfficeFilterAll(officeId)) return 'All Offices';

  const ids = parseDashboardOfficeFilterIds(officeId);
  if (!ids.length) return 'All Offices';

  const labels = ids.map(
    (id) => officeOptions.find((o) => o.id === String(id))?.label ?? id,
  );
  return labels.join(', ');
}
