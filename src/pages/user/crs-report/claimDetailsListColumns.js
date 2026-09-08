/**
 * Column definitions for `/api/claim-report`.
 * Keep CLAIM_DETAILS_LIST_COLUMN_IDS in sync with the `id` fields below.
 */

const formatAmt = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    const n = Number(val);
    if (Number.isNaN(n)) return String(val);
    return `AED ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const text = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    return String(val);
};

const AMT = { align: 'right', render: (val) => formatAmt(val) };

/** Exact field order from claim-detail-report response rows. */
export const CLAIM_DETAILS_LIST_COLUMN_IDS = [
    'facilityGroupId',
    'healthAuthority',
    'facilityId',
    'facilityName',
    'claimNumber',
    'receiverId',
    'receiverName',
    'payerId',
    'payerName',
    'patientId',
    'encounterStartDate',
    'encounterEndDate',
    'encounterType',
    'startType',
    'endType',
    'memberId',
    'emiratesIdNumber',
    'idPayer',
    'submissionDate',
    'orderingClinician',
    'orderingClinicianName',
    'clinicianCode',
    'clinicianName',
    'netAmt',
    'initialNetAmt',
    'paymentAmt',
    'rejectedAmt',
    'initialRejectedAmt',
    'writeOffAmt',
    'remittanceStatus',
    'claimStatus',
    'paymentReference',
    'resubmissionType',
    'lastRemittanceDate',
    'lastSubmissionDate',
    'lastSubmissionFile',
    'lastSubmissionTransactionId',
    'allSubmissionFiles',
    'submissionAllTransactionIds',
    'lastRemittanceFile',
    'lastRemittanceTransactionId',
    'allRemittanceFiles',
    'remittanceAllTransactionIds',
    'remittanceComment',
    'resubmissionComment',
    'resubmissionCount',
    'settledAmt',
    'receiptStatus',
    'initialDateSettlement',
    'paymentStatus',
    'patientType',
    'encounterTypeDescription',
    'officeId',
];

const COLUMN_META = {
    facilityGroupId: { label: 'Facility', minWidth: '200px' },
    healthAuthority: { label: 'Health Authority' },
    facilityId: { label: 'Facility ID' },
    facilityName: { label: 'Facility Name', minWidth: '220px' },
    claimNumber: { label: 'Claim Number', minWidth: '160px' },
    receiverId: { label: 'Receiver ID' },
    receiverName: { label: 'Receiver Name', minWidth: '180px' },
    payerId: { label: 'Payer ID' },
    payerName: { label: 'Payer Name', minWidth: '160px' },
    patientId: { label: 'Patient ID' },
    encounterStartDate: { label: 'Encounter Start Date', minWidth: '140px' },
    encounterEndDate: { label: 'Encounter End Date', minWidth: '140px' },
    encounterType: { label: 'Encounter Type' },
    startType: { label: 'Start Type' },
    endType: { label: 'End Type' },
    memberId: { label: 'Member ID', minWidth: '160px' },
    emiratesIdNumber: { label: 'Emirates ID', minWidth: '160px' },
    idPayer: { label: 'ID Payer' },
    submissionDate: { label: 'Submission Date', minWidth: '140px' },
    orderingClinician: { label: 'Ordering Clinician' },
    orderingClinicianName: { label: 'Ordering Clinician Name', minWidth: '160px' },
    clinicianCode: { label: 'Clinician Code', minWidth: '140px' },
    clinicianName: { label: 'Clinician Name', minWidth: '140px' },
    netAmt: { label: 'Net Amt', ...AMT },
    initialNetAmt: { label: 'Initial Net Amt', ...AMT },
    paymentAmt: { label: 'Payment Amt', ...AMT },
    rejectedAmt: { label: 'Rejected Amt', ...AMT },
    initialRejectedAmt: { label: 'Initial Rejected Amt', ...AMT },
    writeOffAmt: { label: 'Write Off Amt', ...AMT },
    remittanceStatus: { label: 'Remittance Status' },
    claimStatus: { label: 'Claim Status' },
    paymentReference: { label: 'Payment Reference' },
    resubmissionType: { label: 'Resubmission Type' },
    lastRemittanceDate: { label: 'Last Remittance Date', minWidth: '140px' },
    lastSubmissionDate: { label: 'Last Submission Date', minWidth: '140px' },
    lastSubmissionFile: { label: 'Last Submission File' },
    lastSubmissionTransactionId: { label: 'Last Submission Transaction ID', minWidth: '180px' },
    allSubmissionFiles: { label: 'All Submission Files' },
    submissionAllTransactionIds: { label: 'Submission All Transaction IDs', minWidth: '180px' },
    lastRemittanceFile: { label: 'Last Remittance File' },
    lastRemittanceTransactionId: { label: 'Last Remittance Transaction ID', minWidth: '180px' },
    allRemittanceFiles: { label: 'All Remittance Files' },
    remittanceAllTransactionIds: { label: 'Remittance All Transaction IDs', minWidth: '180px' },
    remittanceComment: { label: 'Remittance Comment', minWidth: '220px' },
    resubmissionComment: { label: 'Resubmission Comment', minWidth: '180px' },
    resubmissionCount: { label: 'Resubmission Count' },
    settledAmt: { label: 'Settled Amt', ...AMT },
    receiptStatus: { label: 'Receipt Status' },
    initialDateSettlement: { label: 'Initial Date Settlement', minWidth: '140px' },
    paymentStatus: { label: 'Payment Status' },
    patientType: { label: 'Patient Type' },
    encounterTypeDescription: { label: 'Encounter Type Description', minWidth: '180px' },
    officeId: { label: 'Office ID' },
};

export function getClaimDetailsListColumns(facilityNameMap = {}) {
    return CLAIM_DETAILS_LIST_COLUMN_IDS.map((id) => {
        const meta = COLUMN_META[id] || { label: id };
        const col = {
            id,
            label: meta.label,
            minWidth: meta.minWidth || '120px',
            render: meta.render || ((val) => text(val)),
        };
        if (meta.align) col.align = meta.align;
        if (meta.className) col.className = meta.className;

        // First column: office/facility group id → resolve name from /api/offices/active
        if (id === 'facilityGroupId') {
            col.render = (val, row) => {
                const officeKey = String(row?.officeId ?? val ?? '').trim();
                const fromMap = officeKey ? facilityNameMap[officeKey] : '';
                // Prefer office display name; strip leading "FACILITYID - " if map uses that format
                let name = (fromMap || row?.facilityName || '').trim();
                if (fromMap && fromMap.includes(' - ')) {
                    const parts = fromMap.split(' - ');
                    if (parts.length > 1) name = parts.slice(1).join(' - ').trim() || name;
                }
                return name || text(val);
            };
        }
        return col;
    });
}

/** Light normalize for list/nav — keeps every API field intact. */
export function mapClaimDetailReportItem(item) {
    if (!item || typeof item !== 'object') return item;
    const claimNumber = item.claimNumber || item.claimId || item.id || '';
    const netAmt = Number(item.netAmt) || 0;
    const paymentAmt = Number(item.paymentAmt) || 0;
    const rejectedAmt = Number(item.rejectedAmt) || 0;
    const paymentStatus = String(item.paymentStatus || '').toLowerCase();
    return {
        ...item,
        id: claimNumber,
        claimId: claimNumber,
        claimNumber,
        amount: netAmt,
        remittedAmount: paymentAmt,
        rejectedAmount: rejectedAmt,
        _pending: paymentStatus.includes('pending') ? netAmt : 0,
    };
}
