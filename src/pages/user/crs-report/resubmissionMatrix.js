/**
 * Insurer-level resubmission matrix: group claims, mock workflow buckets, drill-down lists.
 * Verification / re-submission / resubmitted counts are mock until status APIs exist.
 */

import { buildDummyResubmissionRows } from './resubmissionDummyData';
import {
    claimHasRejectionAttention,
    getInsuranceName,
    getRejectionInsights,
    z,
} from './resubmissionClaimStatus';

export const BUCKETS = {
    rejected: {
        key: 'rejected',
        label: 'Total rejected',
        shortLabel: 'Rejected',
        description: 'Claims with rejection attention',
    },
    verification: {
        key: 'verification',
        label: 'Verification',
        shortLabel: 'Verification',
        description: 'Local draft — verification in progress',
    },
    resubmission: {
        key: 'resubmission',
        label: 'Re-submission',
        shortLabel: 'Re-submission',
        description: 'Queued to resubmit',
    },
    resubmitted: {
        key: 'resubmitted',
        label: 'Re-submitted',
        shortLabel: 'Re-submitted',
        description: 'Uploaded and approved after resubmit',
    },
};

export const MONTH_TABS = [
    { value: '01', label: 'January', short: 'Jan' },
    { value: '02', label: 'February', short: 'Feb' },
    { value: '03', label: 'March', short: 'Mar' },
    { value: '04', label: 'April', short: 'Apr' },
    { value: '05', label: 'May', short: 'May' },
    { value: '06', label: 'June', short: 'Jun' },
    { value: '07', label: 'July', short: 'Jul' },
    { value: '08', label: 'August', short: 'Aug' },
    { value: '09', label: 'September', short: 'Sep' },
    { value: '10', label: 'October', short: 'Oct' },
    { value: '11', label: 'November', short: 'Nov' },
    { value: '12', label: 'December', short: 'Dec' },
];

/** Stable slug for URLs */
export function insurerKeyFromName(name) {
    return String(name || 'unknown')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'unknown';
}

function hashString(str) {
    let h = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

/**
 * Deterministic mock split of totalRejected into verification / resubmission / resubmitted.
 * Prefer screenshot feel: small verification, often-zero resubmission pending, rest resubmitted.
 */
export function mockBucketCounts(totalRejected, seedKey) {
    const total = Math.max(0, Math.floor(Number(totalRejected) || 0));
    if (total === 0) {
        return { verification: 0, resubmission: 0, resubmitted: 0 };
    }

    const h = hashString(seedKey);
    let verification = total <= 2 ? (h % 3 === 0 ? 1 : 0) : Math.min(total, Math.floor(total * 0.08) + (h % 3 === 0 ? 1 : 0));
    if (verification > total) verification = total;

    let remaining = total - verification;
    let resubmission = 0;
    if (remaining > 0 && h % 5 === 0) {
        resubmission = Math.min(remaining, 1 + (h % 2));
    }
    const resubmitted = Math.max(0, remaining - resubmission);

    return { verification, resubmission, resubmitted };
}

/**
 * Assign claims into mock buckets so list length matches chip counts.
 * Order: verification first, then resubmission, rest → resubmitted.
 * `rejected` returns all claims.
 */
export function assignClaimsToBuckets(claims, seedKey) {
    const list = Array.isArray(claims) ? [...claims] : [];
    const total = list.length;
    const counts = mockBucketCounts(total, seedKey);

    const verification = list.slice(0, counts.verification);
    const resubmission = list.slice(counts.verification, counts.verification + counts.resubmission);
    const resubmitted = list.slice(counts.verification + counts.resubmission);

    return {
        rejected: list,
        verification,
        resubmission,
        resubmitted,
        counts: {
            rejected: total,
            verification: verification.length,
            resubmission: resubmission.length,
            resubmitted: resubmitted.length,
        },
    };
}

const DEMO_INSURERS = [
    { name: 'ADNIC', count: 9 },
    { name: 'ALMADALLAH', count: 4 },
    { name: 'GIG GULF', count: 7 },
    { name: 'HEALTHNET NGI', count: 12 },
    { name: 'MEDNET', count: 28 },
    { name: 'NAS', count: 41 },
    { name: 'NATIONAL LIFE & GENERAL INSURANCE', count: 18 },
    { name: 'NEURON', count: 55 },
    { name: 'NEXTCARE', count: 72 },
    { name: 'OMAN INSURANCE', count: 33 },
    { name: 'SAICO', count: 15 },
    { name: 'DAMAN', count: 36 },
];

const PATIENT_NAMES = ['Al-Mansoori', 'Hassan', 'Priya N.', 'Omar K.', 'Fatima S.', 'James R.', 'Layla A.', 'Karim T.'];

function buildDemoClaim(insurerName, index, shape) {
    const rows = [];
    const baseTemplate = buildDummyResubmissionRows(1)[0];
    for (let j = 0; j < shape.full; j++) {
        rows.push({
            ...baseTemplate,
            Status: 'Denied',
            RejectedIfAny: baseTemplate.InsLiability * 0.95,
            NetApproved: baseTemplate.InsLiability * 0.05,
            RejectReason: 'Medical necessity documentation',
            ActivityNumber: `ACT-F-${index}-${j}`,
        });
    }
    for (let j = 0; j < shape.partial; j++) {
        rows.push({
            ...baseTemplate,
            Status: 'Partially Approved',
            RejectedIfAny: baseTemplate.InsLiability * 0.22,
            NetApproved: baseTemplate.InsLiability * 0.65,
            RejectReason: 'Coding clarification',
            ActivityNumber: `ACT-P-${index}-${j}`,
        });
    }
    const totalRej = rows.reduce((s, r) => s + z(r.RejectedIfAny), 0);
    return {
        claimId: `SAMPLE-${insurerKeyFromName(insurerName)}-${1000 + index}`,
        id: `SAMPLE-${insurerKeyFromName(insurerName)}-${1000 + index}`,
        patientName: PATIENT_NAMES[index % PATIENT_NAMES.length],
        payerName: insurerName,
        receiverName: 'Main facility',
        submissionDate: new Date(2026, index % 12, 8 + (index % 20)).toISOString(),
        amount: rows.reduce((s, r) => s + z(r.NetAmount), 0),
        totalRejectedAmt: totalRej,
        totalRemittedAmt: index % 2 === 0 ? rows.reduce((s, r) => s + z(r.NetApproved), 0) * 0.4 : 0,
        activities: rows,
        __demo: true,
    };
}

/** Full demo claim set (many insurers) when API has no rejection claims. */
let _demoClaimsCache = null;
export function demoRejectionClaims() {
    if (_demoClaimsCache) return _demoClaimsCache;
    const claims = [];
    DEMO_INSURERS.forEach(({ name, count }, insurerIdx) => {
        for (let i = 0; i < count; i++) {
            const shape =
                i % 3 === 0
                    ? { full: 2, partial: 0 }
                    : i % 3 === 1
                      ? { full: 0, partial: 2 }
                      : { full: 1, partial: 1 };
            claims.push(buildDemoClaim(name, insurerIdx * 100 + i, shape));
        }
    });
    _demoClaimsCache = claims;
    return claims;
}

/**
 * Group rejection claims by insurer and build matrix rows + totals.
 * @returns {{ rows: MatrixRow[], totals: Counts, claimsByKey: Record<string, Claim[]> }}
 */
export function buildInsurerMatrix(claims) {
    const byKey = new Map();

    for (const claim of claims || []) {
        if (!claimHasRejectionAttention(claim) && !claim?.__demo) continue;
        const name = getInsuranceName(claim);
        const key = insurerKeyFromName(name);
        if (!byKey.has(key)) {
            byKey.set(key, { key, name, claims: [] });
        }
        byKey.get(key).claims.push(claim);
    }

    // If nothing passed the filter but we got demo claims without rejection attention edge case
    if (byKey.size === 0 && (claims || []).length > 0) {
        for (const claim of claims) {
            const name = getInsuranceName(claim);
            const key = insurerKeyFromName(name);
            if (!byKey.has(key)) {
                byKey.set(key, { key, name, claims: [] });
            }
            byKey.get(key).claims.push(claim);
        }
    }

    const claimsByKey = {};
    const rows = [];

    const sorted = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach((group, idx) => {
        const assigned = assignClaimsToBuckets(group.claims, group.key);
        claimsByKey[group.key] = group.claims;
        rows.push({
            slNo: idx + 1,
            key: group.key,
            name: group.name,
            totalRejected: assigned.counts.rejected,
            verification: assigned.counts.verification,
            resubmission: assigned.counts.resubmission,
            resubmitted: assigned.counts.resubmitted,
        });
    });

    const totals = rows.reduce(
        (acc, row) => {
            acc.totalRejected += row.totalRejected;
            acc.verification += row.verification;
            acc.resubmission += row.resubmission;
            acc.resubmitted += row.resubmitted;
            return acc;
        },
        { totalRejected: 0, verification: 0, resubmission: 0, resubmitted: 0 }
    );

    return { rows, totals, claimsByKey };
}

export function getClaimsForBucket(claims, insurerKey, bucketKey) {
    const list = (claims || []).filter((c) => insurerKeyFromName(getInsuranceName(c)) === insurerKey);
    const assigned = assignClaimsToBuckets(list, insurerKey);
    if (bucketKey === 'rejected') return assigned.rejected;
    if (bucketKey === 'verification') return assigned.verification;
    if (bucketKey === 'resubmission') return assigned.resubmission;
    if (bucketKey === 'resubmitted') return assigned.resubmitted;
    return assigned.rejected;
}

export function getClaimListTeaser(claim) {
    const insights = getRejectionInsights(claim);
    const parts = [];
    if (insights.rejectedCount > 0) {
        parts.push(`${insights.rejectedCount} rejected line${insights.rejectedCount === 1 ? '' : 's'}`);
    } else if (insights.actCount > 0) {
        parts.push(`${insights.actCount} activities`);
    }
    if (insights.reasons[0]) parts.push(insights.reasons[0]);
    else if (insights.services[0]) parts.push(insights.services[0]);
    return parts.join(' · ') || 'Open for verification';
}

export function monthLabel(monthValue, year) {
    const m = MONTH_TABS.find((t) => t.value === monthValue);
    if (!m) return year ? `All months ${year}` : 'All months';
    return year ? `${m.label} ${year}` : m.label;
}

export function currentMonthValue() {
    return String(new Date().getMonth() + 1).padStart(2, '0');
}

export function monthNumberParam(monthValue) {
    const n = Number.parseInt(monthValue, 10);
    return Number.isFinite(n) && n >= 1 && n <= 12 ? String(n) : '';
}

export function isFutureMonth(monthValue, year) {
    const now = new Date();
    const y = Number(year);
    const m = Number.parseInt(monthValue, 10);
    if (!y || !m) return false;
    if (y > now.getFullYear()) return true;
    if (y < now.getFullYear()) return false;
    return m > now.getMonth() + 1;
}
