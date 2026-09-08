/**
 * Shared rejection % heat bands + legend labels.
 *
 * - tight: portfolio / matrix rates (Denial Matrix, Overview, Doctor Performance)
 * - full:  clinician / category % across 0–100 (Doctor Rejection Analysis)
 */

/** @typedef {'good' | 'warn' | 'critical'} RejectionPctBand */
/** @typedef {'tight' | 'full'} RejectionPctScale */

export const REJECTION_PCT_SCALES = {
  tight: {
    id: 'tight',
    warn: 8,
    critical: 10,
    labels: { good: '<8%', warn: '8–10%', critical: '>10%' },
  },
  full: {
    id: 'full',
    warn: 25,
    critical: 50,
    labels: { good: '<25%', warn: '25–50%', critical: '>50%' },
  },
};

/** Default / portfolio scale (Denial Matrix etc.) */
export const REJECTION_PCT_WARN = REJECTION_PCT_SCALES.tight.warn;
export const REJECTION_PCT_CRITICAL = REJECTION_PCT_SCALES.tight.critical;

/**
 * @param {unknown} value
 * @param {RejectionPctScale} [scale='tight']
 * @returns {RejectionPctBand | null}
 */
export function getRejectionPctBand(value, scale = 'tight') {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  const cfg = REJECTION_PCT_SCALES[scale] ?? REJECTION_PCT_SCALES.tight;
  if (n < cfg.warn) return 'good';
  if (n <= cfg.critical) return 'warn';
  return 'critical';
}
