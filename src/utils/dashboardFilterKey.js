/**
 * Stable cache key from applied dashboard filters + resolved office scope.
 * Changes only when applied filters or apiOfficeId change — not on tab navigation.
 */
export function buildDashboardFilterKey({ officeId, year, searchOn, apiOfficeId, portal }) {
  return [
    String(portal ?? 'dhpo'),
    String(officeId ?? 'All'),
    String(year ?? ''),
    String(searchOn ?? ''),
    String(apiOfficeId ?? ''),
  ].join('|');
}
