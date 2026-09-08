export const DASHBOARD_SECTION_META = {
  overview: {
    title: 'Overview',
    subtitle: 'Executive financial snapshot, IP/OP breakdown, and performance trends',
  },
  rejection: {
    title: 'Rejection Analytics',
    subtitle: 'Month-wise denial matrix and OP/IP rejection trends',
  },
  doctor: {
    title: 'Doctor Performance',
    subtitle: 'Medical rejection by doctor and speciality',
  },
  'doctor-rejection': {
    title: 'Doctor-wise Rejection Analysis',
    subtitle: 'Clinician-level monthly rejection matrix with denial, insurance, and CPT breakdown',
  },
  payer: {
    title: 'Payer Performance',
    subtitle: 'Insurance company analytics, risk ranking, and business contribution',
  },
  denial: {
    title: 'Denial Analysis',
    subtitle: 'Top rejection reasons and category breakdown',
  },
  financial: {
    title: 'Financial Risk',
    subtitle: 'Write-off, unprocessed amounts, and settlement tracking',
  },
};

export function getDashboardSectionKey(pathname) {
  const match = pathname.match(/\/dashboard\/([^/]+)/);
  return match?.[1] ?? 'overview';
}
