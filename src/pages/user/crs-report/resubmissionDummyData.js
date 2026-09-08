/** Dummy rows for Resubmission report — design only (API wiring later). */

const pick = (arr, i) => arr[i % arr.length];

export const RESUBMISSION_COLUMNS = [
    { key: 'Status', label: 'Status' },
    { key: 'ActivityNumber', label: 'Activity number' },
    { key: 'ServiceDescriptionIcdCode', label: 'Service Description (ICD Code)' },
    { key: 'GrossAmount', label: 'Gross Amount' },
    { key: 'NetAmount', label: 'Net Amount' },
    { key: 'CoPayment', label: 'Co Payment' },
    { key: 'Deductible', label: 'Deductible' },
    { key: 'InsLiability', label: 'Ins. Liability' },
    { key: 'NetApproved', label: 'Net Approved' },
    { key: 'RejectedIfAny', label: 'Rejected (if any)' },
    { key: 'RejectReason', label: 'Reject Reason' },
    { key: 'WriteoffAmt', label: 'Writeoff Amt' },
    { key: 'ResubLiability', label: 'Resub Liability' },
    { key: 'PriorAuthId', label: 'Prior auth ID' },
    { key: 'AuthNo', label: 'Auth No' },
    { key: 'AuthDate', label: 'Auth Date' },
];

export function buildDummyResubmissionRows(count = 18) {
    const statuses = ['Submitted', 'Resubmitted', 'Partially Approved', 'Denied', 'Approved'];
    const serviceDescriptions = [
        'Acute upper respiratory infection (J06.9)',
        'Type 2 diabetes mellitus without complication (E11.9)',
        'Essential primary hypertension (I10)',
        'Low back pain (M54.5)',
        'Dyspepsia (K30)',
        'Migraine without aura (G43.0)',
    ];
    const rejectReasons = [
        '',
        '',
        'Missing supporting document',
        'Prior authorization mismatch',
        'Coding conflict with encounter data',
        'Coverage limit exceeded',
    ];

    return Array.from({ length: count }, (_, i) => {
        const status = pick(statuses, i);
        const base = 72 + (i % 7) * 18.35;
        const coPayment = i % 3 === 0 ? 0 : Number((base * 0.1).toFixed(2));
        const deductible = i % 5 === 0 ? Number((base * 0.08).toFixed(2)) : 0;
        const insLiability = Number((base - coPayment - deductible).toFixed(2));
        const rejected = status === 'Denied' ? Number((base * 0.45).toFixed(2)) : status === 'Partially Approved' ? Number((base * 0.12).toFixed(2)) : 0;
        const netApproved = Number((Math.max(insLiability - rejected, 0)).toFixed(2));
        const writeoff = rejected > 0 ? Number((rejected * 0.2).toFixed(2)) : 0;
        const resubLiability = Number((Math.max(rejected - writeoff, 0)).toFixed(2));
        const authDate = new Date(2026, 3, 1 + (i % 26));

        return {
            Status: status,
            ActivityNumber: `${3001338000 + i}`,
            ServiceDescriptionIcdCode: pick(serviceDescriptions, i),
            NetAmount: Number(base.toFixed(2)),
            CoPayment: coPayment,
            Deductible: deductible,
            InsLiability: insLiability,
            NetApproved: netApproved,
            RejectedIfAny: rejected,
            RejectReason: rejected > 0 ? pick(rejectReasons, i + 2) : '',
            WriteoffAmt: writeoff,
            ResubLiability: resubLiability,
            PriorAuthId: i % 5 === 0 ? '' : `JB${String(107000 + i)}`,
            AuthNo: i % 4 === 0 ? '' : `AUTH-${String(4800 + i).padStart(5, '0')}`,
            AuthDate: i % 4 === 0 ? '' : authDate.toISOString().slice(0, 10),
        };
    });
}
