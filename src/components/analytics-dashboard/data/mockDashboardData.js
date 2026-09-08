
/**
 * Mock analytics data for dashboard. Replace with API calls when backend is ready.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Executive Summary Table data – primary financial snapshot.
 * Used by ExecutiveSummaryTable component.
 * @param {string} [year] - Year for the report (e.g. '2025')
 * @returns {{ monthlyRows: object[], claimTypeRows: object[], dividerRow: boolean }}
 */
const buildMonthlyRow = (d, year) => {
  const m = typeof d.month === 'string' ? MONTHS.indexOf(d.month) + 1 : d.month;
  const yearMonth = `${year}-${String(m).padStart(2, '0')}`;
  const initialRejPct = d.claimed > 0 ? (d.initialRej / d.claimed) * 100 : null;
  const currRejPct = d.processed > 0 ? (d.currRej / d.processed) * 100 : null;
  const processedPct = d.claimed > 0 ? (d.processed / d.claimed) * 100 : null;
  return {
    key: yearMonth,
    yearMonth,
    claimedAmount: d.claimed,
    processedAmount: d.processed,
    paidAmount: d.paid,
    initialRejectedAmount: d.initialRej,
    initialRejectedPercentage: initialRejPct,
    currentRejectedAmount: d.currRej,
    currentRejectedPercentage: currRejPct,
    unprocessedAmount: d.unprocessed,
    processedAmountPercentage: processedPct,
    contribution: 18.62,
    currentMedicalRejectedAmount: d.currRej,
    medicalRejectedPercentage: 100,
    currentTechnicalRejectedAmount: 0,
    technicalRejectedPercentage: 0,
    medicalDenialsRR: currRejPct,
    technicalDenialRR: 0,
  };
};

export const getExecutiveSummaryData = (year = '2025') => {
  const monthlyData = [
    { month: 'Jan', claimed: 4720000, processed: 4450000, paid: 4100000, initialRej: 270000, currRej: 350000, unprocessed: 280000 },
    { month: 'Feb', claimed: 4890000, processed: 4580000, paid: 4220000, initialRej: 310000, currRej: 360000, unprocessed: 310000 },
    { month: 'Mar', claimed: 4850000, processed: 4520000, paid: 4150000, initialRej: 330000, currRej: 370000, unprocessed: 330000 },
    { month: 'Apr', claimed: 5020000, processed: 4680000, paid: 4320000, initialRej: 340000, currRej: 360000, unprocessed: 340000 },
    { month: 'May', claimed: 5120000, processed: 4780000, paid: 4410000, initialRej: 340000, currRej: 370000, unprocessed: 340000 },
    { month: 'Jun', claimed: 4980000, processed: 4620000, paid: 4250000, initialRej: 360000, currRej: 370000, unprocessed: 360000 },
    { month: 'Jul', claimed: 4642916, processed: 4322946, paid: 3995896, initialRej: 320020, currRej: 326970, unprocessed: 320000 },
  ];

  const monthlyRows = monthlyData.map((d) => buildMonthlyRow(d, year));

  const totals = monthlyData.reduce(
    (acc, d) => ({
      claimed: acc.claimed + d.claimed,
      processed: acc.processed + d.processed,
      paid: acc.paid + d.paid,
      initialRej: acc.initialRej + d.initialRej,
      currRej: acc.currRej + d.currRej,
      unprocessed: acc.unprocessed + d.unprocessed,
    }),
    { claimed: 0, processed: 0, paid: 0, initialRej: 0, currRej: 0, unprocessed: 0 }
  );

  monthlyRows.push({
    key: 'total',
    isTotal: true,
    yearMonth: 'Total',
    claimedAmount: totals.claimed,
    processedAmount: totals.processed,
    paidAmount: totals.paid,
    initialRejectedAmount: totals.initialRej,
    initialRejectedPercentage: totals.claimed > 0 ? (totals.initialRej / totals.claimed) * 100 : null,
    currentRejectedAmount: totals.currRej,
    currentRejectedPercentage: totals.processed > 0 ? (totals.currRej / totals.processed) * 100 : null,
    unprocessedAmount: totals.unprocessed,
    processedAmountPercentage: totals.claimed > 0 ? (totals.processed / totals.claimed) * 100 : null,
    contribution: null,
    currentMedicalRejectedAmount: totals.currRej,
    medicalRejectedPercentage: null,
    currentTechnicalRejectedAmount: null,
    technicalRejectedPercentage: null,
    medicalDenialsRR: null,
    technicalDenialRR: null,
  });

  const ipData = { claimed: 15722916, processed: 14150724, paid: 12923754, initialRej: 1572570, currRej: 1226970, unprocessed: 1572192 };
  const opData = { claimed: 18500000, processed: 15665222, paid: 14592192, initialRej: 2834440, currRej: 1180000, unprocessed: 2834778 };
  const grandTotals = {
    claimed: ipData.claimed + opData.claimed,
    processed: ipData.processed + opData.processed,
    paid: ipData.paid + opData.paid,
    initialRej: ipData.initialRej + opData.initialRej,
    currRej: ipData.currRej + opData.currRej,
    unprocessed: ipData.unprocessed + opData.unprocessed,
  };

  const buildClaimTypeRow = (label, d) => ({
    key: label.toLowerCase(),
    yearMonth: label,
    claimedAmount: d.claimed,
    processedAmount: d.processed,
    paidAmount: d.paid,
    initialRejectedAmount: d.initialRej,
    initialRejectedPercentage: d.claimed > 0 ? (d.initialRej / d.claimed) * 100 : null,
    currentRejectedAmount: d.currRej,
    currentRejectedPercentage: d.processed > 0 ? (d.currRej / d.processed) * 100 : null,
    unprocessedAmount: d.unprocessed,
    processedAmountPercentage: d.claimed > 0 ? (d.processed / d.claimed) * 100 : null,
    contribution: null,
    currentMedicalRejectedAmount: null,
    medicalRejectedPercentage: null,
    currentTechnicalRejectedAmount: null,
    technicalRejectedPercentage: null,
    medicalDenialsRR: null,
    technicalDenialRR: null,
  });

  const claimTypeRows = [
    buildClaimTypeRow('IP', ipData),
    buildClaimTypeRow('OP', opData),
    {
      key: 'claim-type-total',
      isTotal: true,
      ...buildClaimTypeRow('Total', grandTotals),
    },
  ];

  return {
    monthlyRows,
    dividerRow: true,
    claimTypeRows,
    totals: grandTotals,
    monthlyTrend: monthlyData,
  };
};

/**
 * Executive Metrics & Trends — aggregated data for the visual section below the table.
 */
export const getExecutiveMetricsData = (year = '2025') => {
  const execData = getExecutiveSummaryData(year);
  const monthly = getMonthlyPerformance();
  const recovery = getRecoveryAnalysis();
  const totalRow = execData.monthlyRows?.find((r) => r.isTotal) ?? execData.monthlyRows?.[execData.monthlyRows.length - 1];
  const claimTypeRows = execData.claimTypeRows?.filter((r) => !r.isTotal && (r.key === 'ip' || r.key === 'op')) || [];
  const ip = claimTypeRows.find((r) => r.key === 'ip');
  const op = claimTypeRows.find((r) => r.key === 'op');

  const months = execData.monthlyTrend?.map((d) => d.month) ?? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const revenue = execData.monthlyTrend?.map((d) => d.claimed) ?? [];
  const paid = execData.monthlyTrend?.map((d) => d.paid) ?? [];
  const currRejected = execData.monthlyTrend?.map((d) => d.currRej) ?? [];
  const medical = (monthly.medical || []).slice(0, months.length).map((v) => (v || 0) * 1e6);
  const technical = (monthly.technical || []).slice(0, months.length).map((v) => (v || 0) * 1e6);

  return {
    kpis: totalRow
      ? {
          totalClaimed: totalRow.claimedAmount,
          totalProcessed: totalRow.processedAmount,
          totalPaid: totalRow.paidAmount,
          totalCurrentRejected: totalRow.currentRejectedAmount,
          overallCurrentRejectionPct: totalRow.currentRejectedPercentage,
          totalUnprocessed: totalRow.unprocessedAmount,
          processedPct: totalRow.processedAmountPercentage,
          recoveryPct:
            recovery.initialRejected > 0
              ? Math.round((recovery.recoveredAmount / recovery.initialRejected) * 100)
              : 15,
        }
      : null,
    monthlyTrend: { months, revenue, paid, currRejected, medical, technical },
    opVsIp: ip && op ? { op, ip } : null,
  };
};

export const getOverviewKPIs = () => ({
  totalClaimsCount: 12453,
  totalClaimedAmount: 34222916,
  totalRemittedAmount: 29815946,
  totalRejectedAmount: 2406970,
  overallRejectionPct: 9,
  totalWriteOffAmount: 512340,
  totalUnprocessedAmount: 892000,
  recoveryPct: 15,
});

/** Mock IP/OP tables for Claim Type Breakdown — instant render while API loads */
export const getMockIpOpTables = (year = '2025', reportType = 'service-month') => {
  const data = reportType === 'payment' ? getPaymentReportsData(year) : getExecutiveSummaryData(year);
  const rows = data?.monthlyRows ?? [];
  const ipShare = 0.46;
  const opShare = 0.54;
  const scale = (r, s) => ({
    ...r,
    claimedAmount: (r.claimedAmount ?? 0) * s,
    processedAmount: (r.processedAmount ?? 0) * s,
    paidAmount: (r.paidAmount ?? 0) * s,
    initialRejectedAmount: (r.initialRejectedAmount ?? 0) * s,
    currentRejectedAmount: (r.currentRejectedAmount ?? 0) * s,
    unprocessedAmount: (r.unprocessedAmount ?? 0) * s,
  });
  return {
    ipTable: { monthlyRows: rows.map((r) => scale(r, ipShare)) },
    opTable: { monthlyRows: rows.map((r) => scale(r, opShare)) },
  };
};

/** Total row shape for KPI cards — fallback when API returns no data */
export const getOverviewTotalRow = () => ({
  claimedAmount: 34222916,
  processedAmount: 33330916,
  paidAmount: 29815946,
  initialRejectedAmount: 2834440,
  initialRejectedPercentage: 8.3,
  currentRejectedAmount: 2406970,
  currentRejectedPercentage: 7.2,
  unprocessedAmount: 892000,
  processedAmountPercentage: 97.4,
  contribution: 205337,
  currentMedicalRejectedAmount: 1560036,
  medicalRejectedPercentage: 65,
  currentTechnicalRejectedAmount: 846934,
  technicalRejectedPercentage: 35,
  medicalDenialsRR: 4.7,
  technicalDenialRR: 2.5,
});

/**
 * Payment Reports — same table structure as service-month (monthly rows + IP/OP).
 * Used when "Payment reports" is selected in ExecutiveSummaryTable.
 */
export const getPaymentReportsData = (year = '2025') => {
  const monthlyData = [
    { month: 'Jan', claimed: 4720000, processed: 4450000, paid: 4100000, initialRej: 270000, currRej: 350000, unprocessed: 280000 },
    { month: 'Feb', claimed: 4890000, processed: 4580000, paid: 4220000, initialRej: 310000, currRej: 360000, unprocessed: 310000 },
    { month: 'Mar', claimed: 4850000, processed: 4520000, paid: 4150000, initialRej: 330000, currRej: 370000, unprocessed: 330000 },
    { month: 'Apr', claimed: 5020000, processed: 4680000, paid: 4320000, initialRej: 340000, currRej: 360000, unprocessed: 340000 },
    { month: 'May', claimed: 5120000, processed: 4780000, paid: 4410000, initialRej: 340000, currRej: 370000, unprocessed: 340000 },
    { month: 'Jun', claimed: 4980000, processed: 4620000, paid: 4250000, initialRej: 360000, currRej: 370000, unprocessed: 360000 },
    { month: 'Jul', claimed: 4642916, processed: 4322946, paid: 3995896, initialRej: 320020, currRej: 326970, unprocessed: 320000 },
  ];

  const monthlyRows = monthlyData.map((d) => buildMonthlyRow(d, year));

  const totals = monthlyData.reduce(
    (acc, d) => ({
      claimed: acc.claimed + d.claimed,
      processed: acc.processed + d.processed,
      paid: acc.paid + d.paid,
      initialRej: acc.initialRej + d.initialRej,
      currRej: acc.currRej + d.currRej,
      unprocessed: acc.unprocessed + d.unprocessed,
    }),
    { claimed: 0, processed: 0, paid: 0, initialRej: 0, currRej: 0, unprocessed: 0 }
  );

  monthlyRows.push({
    key: 'total',
    isTotal: true,
    yearMonth: 'Total',
    claimedAmount: totals.claimed,
    processedAmount: totals.processed,
    paidAmount: totals.paid,
    initialRejectedAmount: totals.initialRej,
    initialRejectedPercentage: totals.claimed > 0 ? (totals.initialRej / totals.claimed) * 100 : null,
    currentRejectedAmount: totals.currRej,
    currentRejectedPercentage: totals.processed > 0 ? (totals.currRej / totals.processed) * 100 : null,
    unprocessedAmount: totals.unprocessed,
    processedAmountPercentage: totals.claimed > 0 ? (totals.processed / totals.claimed) * 100 : null,
    contribution: null,
    currentMedicalRejectedAmount: totals.currRej,
    medicalRejectedPercentage: null,
    currentTechnicalRejectedAmount: null,
    technicalRejectedPercentage: null,
    medicalDenialsRR: null,
    technicalDenialRR: null,
  });

  const ipData = { claimed: 15722916, processed: 14150724, paid: 12923754, initialRej: 1572570, currRej: 1226970, unprocessed: 1572192 };
  const opData = { claimed: 18500000, processed: 15665222, paid: 14592192, initialRej: 2834440, currRej: 1180000, unprocessed: 2834778 };
  const grandTotals = {
    claimed: ipData.claimed + opData.claimed,
    processed: ipData.processed + opData.processed,
    paid: ipData.paid + opData.paid,
    initialRej: ipData.initialRej + opData.initialRej,
    currRej: ipData.currRej + opData.currRej,
    unprocessed: ipData.unprocessed + opData.unprocessed,
  };

  const buildClaimTypeRow = (label, d) => ({
    key: label.toLowerCase(),
    yearMonth: label,
    claimedAmount: d.claimed,
    processedAmount: d.processed,
    paidAmount: d.paid,
    initialRejectedAmount: d.initialRej,
    initialRejectedPercentage: d.claimed > 0 ? (d.initialRej / d.claimed) * 100 : null,
    currentRejectedAmount: d.currRej,
    currentRejectedPercentage: d.processed > 0 ? (d.currRej / d.processed) * 100 : null,
    unprocessedAmount: d.unprocessed,
    processedAmountPercentage: d.claimed > 0 ? (d.processed / d.claimed) * 100 : null,
    contribution: null,
    currentMedicalRejectedAmount: null,
    medicalRejectedPercentage: null,
    currentTechnicalRejectedAmount: null,
    technicalRejectedPercentage: null,
    medicalDenialsRR: null,
    technicalDenialRR: null,
  });

  const claimTypeRows = [
    buildClaimTypeRow('IP', ipData),
    buildClaimTypeRow('OP', opData),
    { key: 'claim-type-total', isTotal: true, ...buildClaimTypeRow('Total', grandTotals) },
  ];

  return {
    monthlyRows,
    dividerRow: true,
    claimTypeRows,
    totals: grandTotals,
  };
};

export const getMonthlyPerformance = () => {
  const revenue = [2.1, 2.4, 2.2, 2.8, 2.6, 2.9, 3.0, 2.7, 2.5, 2.6, 2.8, 3.1];
  const rejected = [0.18, 0.22, 0.20, 0.24, 0.26, 0.21, 0.23, 0.25, 0.22, 0.20, 0.24, 0.28];
  const medical = [0.14, 0.16, 0.15, 0.18, 0.17, 0.15, 0.16, 0.18, 0.16, 0.15, 0.17, 0.19];
  const technical = [0.04, 0.06, 0.05, 0.06, 0.09, 0.06, 0.07, 0.07, 0.06, 0.05, 0.07, 0.09];
  return {
    months: MONTHS,
    revenue,
    rejected,
    medical,
    technical,
  };
};

export const getClaimTypeComparison = () => ({
  op: { revenue: 18500000, rejectionPct: 8, writeOffPct: 1.2 },
  ip: { revenue: 15722916, rejectionPct: 10, writeOffPct: 1.8 },
});

/**
 * Rejection Analytics — month-wise denial matrix and trend data.
 * Used by RejectionAnalyticsSection. Focus on rejection metrics only (no revenue).
 */
export const getRejectionAnalyticsData = (year = '2025') => {
  const overall = {
    initialPct: [8.2, 8.8, 9.1, 8.5, 9.4, 8.9, 9.2, 8.6, 8.4, 9.0, 9.3, 8.7],
    currentPct: [7.9, 8.2, 8.5, 8.0, 8.9, 8.3, 8.6, 8.1, 7.8, 8.4, 8.7, 8.2],
    currentValue: [350, 360, 370, 360, 370, 370, 327, 340, 335, 355, 368, 342],
  };
  const op = {
    initialPct: [7.5, 8.0, 8.2, 7.8, 8.5, 8.1, 8.3, 7.9, 7.6, 8.2, 8.4, 7.8],
    currentPct: [6.9, 7.2, 7.5, 7.1, 7.8, 7.4, 7.6, 7.2, 6.8, 7.5, 7.7, 7.1],
    currentValue: [118, 122, 125, 118, 125, 124, 118, 120, 118, 122, 125, 118],
  };
  const ip = {
    initialPct: [9.2, 9.8, 10.2, 9.6, 10.5, 9.9, 10.4, 9.5, 9.4, 10.0, 10.3, 9.6],
    currentPct: [9.0, 9.4, 9.7, 9.2, 10.1, 9.5, 9.9, 9.1, 8.9, 9.5, 9.8, 9.3],
    currentValue: [123, 127, 132, 125, 132, 131, 123, 126, 124, 128, 132, 125],
  };

  const sumArr = (arr) => arr.reduce((a, b) => a + b, 0);
  const avgArr = (arr) => (arr.length ? sumArr(arr) / arr.length : 0);

  const fyOverall = {
    initialPct: avgArr(overall.initialPct).toFixed(1),
    currentPct: avgArr(overall.currentPct).toFixed(1),
    currentValue: sumArr(overall.currentValue),
  };
  const fyOp = {
    initialPct: avgArr(op.initialPct).toFixed(1),
    currentPct: avgArr(op.currentPct).toFixed(1),
    currentValue: sumArr(op.currentValue),
  };
  const fyIp = {
    initialPct: avgArr(ip.initialPct).toFixed(1),
    currentPct: avgArr(ip.currentPct).toFixed(1),
    currentValue: sumArr(ip.currentValue),
  };

  return {
    months: MONTHS,
    matrix: {
      rows: [
        { label: 'Initial Rejection %', values: overall.initialPct, fy: fyOverall.initialPct, type: 'pct' },
        { label: 'Current Rejection %', values: overall.currentPct, fy: fyOverall.currentPct, type: 'pct' },
        { label: 'Current Rejection Value (000)', values: overall.currentValue, fy: fyOverall.currentValue, type: 'value' },
        { label: 'OP Initial Rejection %', values: op.initialPct, fy: fyOp.initialPct, type: 'pct' },
        { label: 'OP Current Rejection %', values: op.currentPct, fy: fyOp.currentPct, type: 'pct' },
        { label: 'OP Current Rejection Value (000)', values: op.currentValue, fy: fyOp.currentValue, type: 'value' },
        { label: 'IP Initial Rejection %', values: ip.initialPct, fy: fyIp.initialPct, type: 'pct' },
        { label: 'IP Current Rejection %', values: ip.currentPct, fy: fyIp.currentPct, type: 'pct' },
        { label: 'IP Current Rejection Value (000)', values: ip.currentValue, fy: fyIp.currentValue, type: 'value' },
      ],
    },
    trends: {
      overall: { ...overall, months: MONTHS },
      op: { ...op, months: MONTHS },
      ip: { ...ip, months: MONTHS },
    },
    categoryBreakdown: (() => {
      const medical = [182000, 188000, 195000, 189000, 198000, 192000, 185000, 190000, 188000, 193000, 196000, 189000];
      const technical = [168000, 172000, 175000, 171000, 172000, 178000, 142000, 150000, 147000, 162000, 172000, 153000];
      return {
        months: MONTHS,
        medicalRejected: medical,
        technicalRejected: technical,
        grandTotalMedical: sumArr(medical),
        grandTotalTechnical: sumArr(technical),
      };
    })(),
    opVsIp: {
      months: MONTHS,
      opInitial: op.initialPct,
      opCurrent: op.currentPct,
      ipInitial: ip.initialPct,
      ipCurrent: ip.currentPct,
    },
  };
};

export const getRejectionBreakdown = () => ({
  medicalVsTechnical: [
    { name: 'Medical', value: 1560036 },
    { name: 'Technical', value: 846934 },
  ],
  byClaimType: [
    { type: 'OP', rejected: 980000, rate: 8 },
    { type: 'IP', rejected: 1426970, rate: 10 },
  ],
  byMonth: MONTHS.map((m, i) => ({
    month: m,
    rejected: [523, 536, 544, 509, 565, 498, 512, 530, 518, 495, 542, 568][i],
    rate: [8, 9, 10, 11, 15, 9, 10, 11, 9, 8, 11, 12][i],
  })),
});

export const getRecoveryAnalysis = () => ({
  initialRejected: 2830000,
  finalRejected: 2406970,
  recoveredAmount: 423030,
  monthlyRecoveryPct: MONTHS.map((m, i) => ({
    month: m,
    pct: [12, 14, 15, 13, 16, 14, 15, 17, 14, 15, 16, 18][i],
  })),
});

export const getRejectionByPayer = () => [
  { payer: 'NAS Administration', rejectedPct: 18, rejectedAmount: 489975 },
  { payer: 'Oman Insurance', rejectedPct: 15, rejectedAmount: 455026 },
  { payer: 'NextCare', rejectedPct: 6, rejectedAmount: 439618 },
  { payer: 'Mednet Global', rejectedPct: 12, rejectedAmount: 285229 },
  { payer: 'Bupa Arabia', rejectedPct: 9, rejectedAmount: 198500 },
];

/**
 * Doctor Performance — top 30 doctors by medical denials, speciality-wise summary.
 * Doctor-level rejection analysis only (no payer/denial-reason tables).
 */
export const getDoctorPerformanceData = (year = '2025') => {
  const doctorNames = [
    'Prasad Saravana', 'Anis Haddad', 'Dilfuza Usmonova', 'Raza Ahmed', 'Jelena Jevtcakip', 'John Smith',
    'Sarah Mitchell', 'David Chen', 'Emma Wilson', 'Michael Brown', 'Sophie Anderson', 'James Lee',
    'Olivia Davis', 'William Taylor', 'Ava Martinez', 'Liam Johnson', 'Isabella Garcia', 'Noah Williams',
    'Mia Robinson', 'Ethan Clark', 'Charlotte Lewis', 'Mason Walker', 'Amelia Hall', 'Lucas Allen',
    'Harper Young', 'Benjamin King', 'Evelyn Wright', 'Alexander Scott', 'Abigail Green', 'Henry Adams',
  ];
  const specialities = ['General Practice', 'Urology', 'OB/GYN', 'Internal Medicine', 'Pediatric', 'Cardiology', 'Orthopedics', 'Dermatology'];
  const doctors = doctorNames.map((name, i) => {
    const claimed = Math.round(400000 + Math.random() * 2800000);
    const medicalDenials = Math.round(claimed * (0.05 + Math.random() * 0.15));
    return {
      doctor: name,
      speciality: specialities[i % specialities.length],
      claimed,
      medicalDenials,
      medicalDenialPct: claimed > 0 ? (medicalDenials / claimed) * 100 : 0,
    };
  });
  doctors.sort((a, b) => b.medicalDenials - a.medicalDenials);
  const top30 = doctors.slice(0, 30).map((d) => {
    const unprocessed = Math.round(d.claimed * (0.05 + Math.random() * 0.08));
    const currentRejected = Math.round(d.medicalDenials * (1.1 + Math.random() * 0.3));
    const initialRejected = Math.round(currentRejected * (1.1 + Math.random() * 0.15));
    const processed = d.claimed - unprocessed;
    const rrPct = processed > 0 ? (currentRejected / processed) * 100 : 0;
    const medicalRRPct = d.claimed > 0 ? (d.medicalDenials / d.claimed) * 100 : 0;
    return {
      ...d,
      medicalDenialPct: medicalRRPct,
      netAmount: d.claimed,
      unprocessed,
      initialRejected,
      currentRejected,
      rrPct,
      medicalRRPct,
    };
  });

  const bySpeciality = {};
  top30.forEach((d) => {
    if (!bySpeciality[d.speciality]) bySpeciality[d.speciality] = { claimed: 0, medicalDenials: 0 };
    bySpeciality[d.speciality].claimed += d.claimed;
    bySpeciality[d.speciality].medicalDenials += d.medicalDenials;
  });
  const specialitySummary = Object.entries(bySpeciality).map(([speciality, v]) => ({
    speciality,
    medicalDenialsAmount: v.medicalDenials,
    medicalDenialPct: v.claimed > 0 ? (v.medicalDenials / v.claimed) * 100 : 0,
  }));
  specialitySummary.sort((a, b) => b.medicalDenialsAmount - a.medicalDenialsAmount);

  const claimedTotal = top30.reduce((s, d) => s + d.claimed, 0);
  const medicalDenialsTotal = top30.reduce((s, d) => s + d.medicalDenials, 0);
  const unprocessedTotal = top30.reduce((s, d) => s + (d.unprocessed ?? 0), 0);
  const initialRejectedTotal = top30.reduce((s, d) => s + (d.initialRejected ?? 0), 0);
  const currentRejectedTotal = top30.reduce((s, d) => s + (d.currentRejected ?? 0), 0);
  const processedTotal = claimedTotal - unprocessedTotal;

  const medicalDeepDive = top30.map((d, i) => ({
    doctor: d.doctor,
    initialMedicalRejected: Math.round(d.medicalDenials * (1.12 + (i % 5) * 0.02)),
    currentMedicalRejected: d.medicalDenials,
    department: d.speciality,
  }));

  return {
    doctors: top30,
    medicalDeepDive,
    specialitySummary,
    totals: {
      claimed: claimedTotal,
      netAmount: claimedTotal,
      unprocessed: unprocessedTotal,
      initialRejected: initialRejectedTotal,
      currentRejected: currentRejectedTotal,
      medicalDenials: medicalDenialsTotal,
      medicalDenialPct: claimedTotal > 0 ? (medicalDenialsTotal / claimedTotal) * 100 : 0,
      rrPct: processedTotal > 0 ? (currentRejectedTotal / processedTotal) * 100 : 0,
    },
  };
};

export const getTopDoctors = () => [
  { doctor: 'Prasad Saravana', speciality: 'General Practice', claimed: 3105052, rejected: 222178, rejectionPct: 10, writeOffPct: 1.2, recoveryPct: 14, avgResubmission: 1.4 },
  { doctor: 'Anis Haddad', speciality: 'Urology', claimed: 997107, rejected: 123804, rejectionPct: 17, writeOffPct: 2.1, recoveryPct: 11, avgResubmission: 1.8 },
  { doctor: 'Dilfuza Usmonova', speciality: 'General Practice', claimed: 822930, rejected: 98079, rejectionPct: 16, writeOffPct: 1.5, recoveryPct: 12, avgResubmission: 1.6 },
  { doctor: 'Raza Ahmed', speciality: 'General Practice', claimed: 1327671, rejected: 88818, rejectionPct: 9, writeOffPct: 0.9, recoveryPct: 16, avgResubmission: 1.2 },
  { doctor: 'Jelena Jevtcakip', speciality: 'OB/GYN', claimed: 1628028, rejected: 80311, rejectionPct: 7, writeOffPct: 0.8, recoveryPct: 18, avgResubmission: 1.1 },
  { doctor: 'John Smith', speciality: 'Internal Medicine', claimed: 920000, rejected: 92000, rejectionPct: 10, writeOffPct: 1.0, recoveryPct: 15, avgResubmission: 1.3 },
];

export const getSpecialityComparison = () => [
  { speciality: 'General Practice', claimed: 6588740, rejectionPct: 11, writeOffPct: 1.4 },
  { speciality: 'Urology', claimed: 1484940, rejectionPct: 15, writeOffPct: 2.0 },
  { speciality: 'OB/GYN', claimed: 1365910, rejectionPct: 7, writeOffPct: 0.9 },
  { speciality: 'Internal Medicine', claimed: 1242160, rejectionPct: 13, writeOffPct: 1.2 },
  { speciality: 'Pediatric', claimed: 930080, rejectionPct: 9, writeOffPct: 1.0 },
];

/**
 * Denial Analysis — top reasons (amount + %), category breakdown for charts.
 * Used by DenialAnalysisSection (rejection reasons, not trends).
 */
export const getDenialAnalysisData = (year = '2025') => {
  const raw = [
    { reason: 'Medical Necessity', amount: 1560036 },
    { reason: 'Authorization Required', amount: 455026 },
    { reason: 'Missing Clinical Info', amount: 439618 },
    { reason: 'Administrative Error', amount: 285229 },
    { reason: 'Price Discrepancy', amount: 198500 },
    { reason: 'Duplicate Claim', amount: 156240 },
    { reason: 'Invalid Procedure Code', amount: 124380 },
    { reason: 'Pre-authorization Lapsed', amount: 98500 },
    { reason: 'Documentation Incomplete', amount: 87200 },
    { reason: 'Policy Exclusion', amount: 65400 },
  ];
  const grandTotal = raw.reduce((sum, r) => sum + r.amount, 0);
  const topReasons = raw
    .map((r) => ({
      reason: r.reason,
      amount: r.amount,
      pct: grandTotal > 0 ? (r.amount / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  const categoryBreakdown = [
    { name: 'Medical Necessity', value: 52 },
    { name: 'Authorization', value: 15 },
    { name: 'Clinical Info', value: 12 },
    { name: 'Administrative', value: 10 },
    { name: 'Price', value: 7 },
    { name: 'Other', value: 4 },
  ];
  return { topReasons, categoryBreakdown, grandTotal };
};

export const getDenialCategoryBreakdown = () => [
  { name: 'Medical Necessity', value: 65 },
  { name: 'Authorization', value: 12 },
  { name: 'Clinical Info', value: 8 },
  { name: 'Administrative', value: 7 },
  { name: 'Price', value: 5 },
  { name: 'Other', value: 3 },
];

export const getDenialTypeBreakdown = () => [
  { type: 'Medical Necessity', count: 1560, amount: 1560036 },
  { type: 'Authorization', count: 312, amount: 173310 },
  { type: 'Clinical Info', count: 198, amount: 111568 },
  { type: 'Administrative', count: 189, amount: 107295 },
  { type: 'Price', count: 168, amount: 95490 },
];

export const getDenialHeatmapData = () => {
  const categories = ['Medical Necessity', 'Authorization', 'Clinical', 'Admin', 'Price'];
  const months = MONTHS.slice(0, 6);
  const data = [];
  categories.forEach((cat, i) =>
    months.forEach((mon, j) =>
      data.push([j, i, Math.round(Math.random() * 80 + 20)])
    )
  );
  return { data, categories, months };
};

export const getWriteOffAnalysis = () => ({
  byMonth: MONTHS.map((m, i) => ({ month: m, amount: [38, 42, 40, 45, 48, 44, 46, 43, 41, 42, 47, 51][i] * 10000 })),
  byCategory: [
    { name: 'Medical', value: 220000 },
    { name: 'Technical', value: 180000 },
    { name: 'Admin', value: 112340 },
  ],
});

export const getUnprocessedTrend = () =>
  MONTHS.map((m, i) => ({ month: m, amount: [72, 78, 75, 82, 88, 85, 90, 86, 84, 82, 89, 92][i] * 10000 }));

/**
 * Payer Performance — insurance-wise claim summary, rejection ranking, business contribution.
 */
export const getPayerPerformanceData = (year = '2025') => {
  const raw = [
    { insurance: 'NextCare', claimed: 10678618, processed: 10238618, unprocessed: 440000, initialRejected: 892000, currentRejected: 439618 },
    { insurance: 'NAS Administration', claimed: 4590946, processed: 4096454, unprocessed: 494492, initialRejected: 520000, currentRejected: 489975 },
    { insurance: 'Oman Insurance', claimed: 3609735, processed: 3154710, unprocessed: 455025, initialRejected: 380000, currentRejected: 455026 },
    { insurance: 'Mednet Global', claimed: 3587816, processed: 3302587, unprocessed: 285229, initialRejected: 420000, currentRejected: 285229 },
    { insurance: 'Bupa Arabia', claimed: 2845000, processed: 2596500, unprocessed: 248500, initialRejected: 310000, currentRejected: 198500 },
    { insurance: 'Axa Gulf', claimed: 1892000, processed: 1722000, unprocessed: 170000, initialRejected: 205000, currentRejected: 156000 },
    { insurance: 'Takaful Emarat', claimed: 1246000, processed: 1121400, unprocessed: 124600, initialRejected: 180000, currentRejected: 112400 },
    { insurance: 'Al Buhaira', claimed: 985000, processed: 887000, unprocessed: 98000, initialRejected: 125000, currentRejected: 88500 },
    { insurance: 'Metlife', claimed: 756000, processed: 680400, unprocessed: 75600, initialRejected: 95000, currentRejected: 68400 },
    { insurance: 'Trust Insurance', claimed: 542000, processed: 487800, unprocessed: 54200, initialRejected: 68000, currentRejected: 48800 },
  ];
  const totalClaimed = raw.reduce((s, p) => s + p.claimed, 0);
  const totalProcessed = raw.reduce((s, p) => s + p.processed, 0);
  const totalUnprocessed = raw.reduce((s, p) => s + p.unprocessed, 0);
  const totalInitialRejected = raw.reduce((s, p) => s + p.initialRejected, 0);
  const totalCurrentRejected = raw.reduce((s, p) => s + p.currentRejected, 0);

  const payers = raw.map((p) => ({
    ...p,
    initialRejPct: p.claimed > 0 ? (p.initialRejected / p.claimed) * 100 : 0,
    currentRejPct: p.processed > 0 ? (p.currentRejected / p.processed) * 100 : 0,
    businessContributionPct: totalClaimed > 0 ? (p.claimed / totalClaimed) * 100 : 0,
  }));

  const totals = {
    claimed: totalClaimed,
    processed: totalProcessed,
    unprocessed: totalUnprocessed,
    initialRejected: totalInitialRejected,
    currentRejected: totalCurrentRejected,
    initialRejPct: totalClaimed > 0 ? (totalInitialRejected / totalClaimed) * 100 : 0,
    currentRejPct: totalProcessed > 0 ? (totalCurrentRejected / totalProcessed) * 100 : 0,
    businessContributionPct: 100,
  };

  return { payers, totals };
};

export const getPayerSummary = () => [
  { payer: 'NAS Administration', claimed: 4590946, remitted: 3796454, rejected: 489975, rejectionPct: 18 },
  { payer: 'Oman Insurance', claimed: 3609735, remitted: 2938180, rejected: 455026, rejectionPct: 15 },
  { payer: 'NextCare', claimed: 10678618, remitted: 7598438, rejected: 439618, rejectionPct: 6 },
  { payer: 'Mednet Global', claimed: 3587816, remitted: 2453528, rejected: 285229, rejectionPct: 12 },
];

