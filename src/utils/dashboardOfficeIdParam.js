/**
 * Resolve officeId for dashboard API query params.
 * - Single office → "1"
 * - Multiple offices → "1,2,3" (comma-separated)
 * - All offices (filter = All) → all known office ids joined
 */
export function resolveDashboardOfficeIdParam({
  filterOfficeId,
  canSelectOffice,
  userOfficeId,
  allOfficeIds,
}) {
  if (!canSelectOffice) {
    return userOfficeId != null && userOfficeId !== '' ? String(userOfficeId) : null;
  }

  const filterId = filterOfficeId ?? 'All';
  if (filterId !== 'All') {
    return String(filterId)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .join(',');
  }

  if (!allOfficeIds?.length) return null;
  return allOfficeIds.map(String).join(',');
}

export function isDashboardOfficeFilterReady({
  canSelectOffice,
  userOfficeId,
  filterOfficeId,
  allOfficeIds,
}) {
  if (!canSelectOffice) return userOfficeId != null && userOfficeId !== '';
  if (filterOfficeId && filterOfficeId !== 'All') return true;
  return (allOfficeIds?.length ?? 0) > 0;
}
