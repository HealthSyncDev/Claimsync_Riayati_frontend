export const REJECTION_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MATRIX_GROUPS = [
  { id: 'overall', label: 'Overall' },
  { id: 'op', label: 'OP' },
  { id: 'ip', label: 'IP' },
];

export const METRIC_TOOLTIPS = {
  'Initial Rejection %': 'Percentage of claims rejected at first pass',
  'Current Rejection %': 'Percentage of claims rejected after adjudication',
  'Current Rejection Value (000)': 'Rejected amount in thousands',
};

export const getMetricTooltip = (label) => {
  if (METRIC_TOOLTIPS[label]) return METRIC_TOOLTIPS[label];
  for (const [key, tip] of Object.entries(METRIC_TOOLTIPS)) {
    if (label.includes(key)) return tip;
  }
  return undefined;
};

export const getMonthIndex = (month) => {
  if (!month || month === 'All') return -1;
  return REJECTION_MONTHS.indexOf(month);
};

const avg = (arr) => {
  const valid = (arr ?? []).filter((v) => v != null && !Number.isNaN(Number(v)));
  return valid.length ? valid.reduce((a, b) => a + Number(b), 0) / valid.length : null;
};

const sum = (arr) => (arr ?? []).reduce((a, b) => a + (b ?? 0), 0);

const MATRIX_GROUP_SIZE = 3;

const getMatrixGroupRows = (rows, groupIdx) =>
  rows.slice(groupIdx * MATRIX_GROUP_SIZE, groupIdx * MATRIX_GROUP_SIZE + MATRIX_GROUP_SIZE);

const findCurrentPctRow = (groupRows) =>
  (groupRows ?? []).find((r) => /current rejection %/i.test(r.label) && !/value/i.test(r.label));

const findCurrentValueRow = (groupRows) =>
  (groupRows ?? []).find((r) => /current rejection value/i.test(r.label) || r.type === 'value');

const findWorstMonth = (currPct, months = REJECTION_MONTHS) => {
  let worstIdx = -1;
  let worstPct = null;
  (currPct ?? []).forEach((v, i) => {
    if (v == null || Number.isNaN(Number(v))) return;
    if (worstPct == null || Number(v) > worstPct) {
      worstPct = Number(v);
      worstIdx = i;
    }
  });
  return {
    month: worstIdx >= 0 ? (months[worstIdx] ?? REJECTION_MONTHS[worstIdx]) : null,
    pct: worstPct,
  };
};

/** KPIs derived from the same matrix rows shown in DenialMatrixTable. */
export const computeRejectionKpis = (data) => {
  const rows = data?.matrix?.rows;
  const months = data?.months ?? REJECTION_MONTHS;

  if (rows?.length) {
    const overallGroup = getMatrixGroupRows(rows, 0);
    const opGroup = getMatrixGroupRows(rows, 1);
    const ipGroup = getMatrixGroupRows(rows, 2);

    const overallCurrentRow = findCurrentPctRow(overallGroup);
    const opCurrentRow = findCurrentPctRow(opGroup);
    const ipCurrentRow = findCurrentPctRow(ipGroup);
    const overallValueRow = findCurrentValueRow(overallGroup);

    const currPct = overallCurrentRow?.values ?? [];
    const currVal = overallValueRow?.values ?? [];

    const fyPct = overallCurrentRow?.fy != null && overallCurrentRow.fy !== ''
      ? Number(overallCurrentRow.fy)
      : avg(currPct);
    const fyValue = overallValueRow?.fy != null && overallValueRow.fy !== ''
      ? Number(overallValueRow.fy)
      : sum(currVal);

    const worst = findWorstMonth(currPct, months);
    const worstOp = findWorstMonth(opCurrentRow?.values ?? [], months);
    const worstIp = findWorstMonth(ipCurrentRow?.values ?? [], months);

    return {
      fyPct,
      fyValue,
      worstMonth: worst.month,
      worstPct: worst.pct,
      worstOpMonth: worstOp.month,
      worstOpPct: worstOp.pct,
      worstIpMonth: worstIp.month,
      worstIpPct: worstIp.pct,
      sparklinePct: currPct,
      sparklineValue: currVal,
    };
  }

  const overall = data?.trends?.overall;
  const op = data?.trends?.op;
  const ip = data?.trends?.ip;
  if (!overall) return null;

  const currPct = overall.currentPct ?? [];
  const currVal = overall.currentValue ?? [];

  return {
    fyPct: avg(currPct),
    fyValue: sum(currVal),
    worstMonth: findWorstMonth(currPct, months).month,
    worstPct: findWorstMonth(currPct, months).pct,
    worstOpMonth: findWorstMonth(op?.currentPct, months).month,
    worstOpPct: findWorstMonth(op?.currentPct, months).pct,
    worstIpMonth: findWorstMonth(ip?.currentPct, months).month,
    worstIpPct: findWorstMonth(ip?.currentPct, months).pct,
    sparklinePct: currPct,
    sparklineValue: currVal,
  };
};

export const getVisibleMatrixGroups = (claimType) => {
  if (claimType === 'OP') return MATRIX_GROUPS.filter((g) => g.id === 'op');
  if (claimType === 'IP') return MATRIX_GROUPS.filter((g) => g.id === 'ip');
  return MATRIX_GROUPS;
};

export const getMatrixRowsForGroups = (rows, groups) => {
  if (!rows?.length) return [];
  const groupSize = 3;
  return groups.flatMap((group) => {
    const groupIdx = MATRIX_GROUPS.findIndex((g) => g.id === group.id);
    const slice = rows.slice(groupIdx * groupSize, groupIdx * groupSize + groupSize);
    return slice.map((row) => ({ ...row, groupId: group.id, groupLabel: group.label }));
  });
};

export const computeAnomalies = (data) => {
  const badges = [];
  const curr = data?.trends?.overall?.currentPct ?? [];
  const months = data?.months ?? REJECTION_MONTHS;

  let peakIdx = -1;
  let peakVal = null;
  curr.forEach((v, i) => {
    if (v == null || Number.isNaN(Number(v))) return;
    if (peakVal == null || Number(v) > peakVal) {
      peakVal = Number(v);
      peakIdx = i;
    }
  });
  const avgPct = avg(curr);
  if (peakIdx >= 0 && avgPct != null) {
    const diff = peakVal - avgPct;
    if (diff >= 0.3) {
      badges.push({
        id: 'peak',
        label: `Peak: ${months[peakIdx]} ${peakVal.toFixed(1)}%`,
        tone: 'warn',
      });
    }
  }

  const opAvg = avg(data?.trends?.op?.currentPct);
  const ipAvg = avg(data?.trends?.ip?.currentPct);
  if (opAvg != null && ipAvg != null) {
    const gap = ipAvg - opAvg;
    if (Math.abs(gap) >= 0.5) {
      badges.push({
        id: 'op-ip',
        label: gap > 0 ? `IP +${gap.toFixed(1)} pp above OP` : `OP +${Math.abs(gap).toFixed(1)} pp above IP`,
        tone: gap > 0 ? 'error' : 'success',
      });
    }
  }

  return badges.slice(0, 2);
};

export const getCompactMonthIndices = (monthCount = 12, count = 3) => {
  const start = Math.max(0, monthCount - count);
  return Array.from({ length: count }, (_, i) => start + i);
};
