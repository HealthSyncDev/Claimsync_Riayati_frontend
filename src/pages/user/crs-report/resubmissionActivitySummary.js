/**
 * Fields to show in the claim-activity summary strip when every row shares the same value.
 * Order = display order (invoice / patient / encounter context first).
 */
const SUMMARY_FIELD_DEFS = [
    ['patientId', 'Patient ID'],
    ['memberId', 'Member ID'],
    ['emiratesIdNumber', 'Emirates ID'],
    ['facilityName', 'Facility'],
    ['receiverName', 'Receiver'],
    ['payerId', 'Payer ID'],
    ['receiverId', 'Receiver ID'],
    ['encounterStartDate', 'Encounter start'],
    ['encounterEndDate', 'Encounter end'],
    ['diagnosis', 'Diagnosis'],
    ['primaryDiagnosis', 'Primary DX'],
    ['lastDenialCode', 'Denial code'],
    ['clinicianName', 'Clinician'],
];

function norm(v) {
    if (v === null || v === undefined) return '';
    return String(v).trim();
}

function formatSummaryValue(key, v) {
    const s = norm(v);
    if (!s) return '';
    if ((key === 'diagnosis' || key === 'remittanceComment') && s.length > 96) {
        return `${s.slice(0, 93)}…`;
    }
    return s;
}

/** @param {Record<string, unknown>[]} apiRows raw objects from claim-details API */
export function computeCommonActivitySummary(apiRows) {
    if (!Array.isArray(apiRows) || apiRows.length === 0) return [];

    const out = [];
    for (const [key, label] of SUMMARY_FIELD_DEFS) {
        const v0 = apiRows[0][key];
        const s0 = norm(v0);
        if (!s0) continue;

        const allMatch = apiRows.every((row) => norm(row[key]) === s0);
        if (!allMatch) continue;

        out.push({ key, label, value: formatSummaryValue(key, v0) });
    }
    return out;
}
