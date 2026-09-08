const AED_COMPACT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'AED',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const AED_EXACT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'AED',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Compact AED for KPI card display (e.g. AED 1.2M, AED 450K). */
export const formatKpiCompact = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1e6) return `AED ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `AED ${(v / 1e3).toFixed(0)}K`;
  return AED_COMPACT.format(v);
};

/** Full precise AED for KPI tooltips. */
export const formatKpiExact = (n) => AED_EXACT.format(n ?? 0);

/** Thousands (000) column — value already in thousands. */
export const formatKpiThousands = (n) =>
  (n != null && !Number.isNaN(n) ? `AED ${Number(n).toLocaleString()}K` : '—');
