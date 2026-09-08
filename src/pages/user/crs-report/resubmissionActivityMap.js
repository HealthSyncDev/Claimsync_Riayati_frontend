/**
 * Map raw activity / line items from claim-details API into Resubmission column keys.
 */

function num(v, fallback = null) {
    if (v === null || v === undefined || v === '') return fallback;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(n) ? n : fallback;
}

function pick(obj, keys, fallback = '') {
    if (!obj) return fallback;
    for (const k of keys) {
        const x = obj[k];
        if (x !== null && x !== undefined && x !== '') return x;
    }
    return fallback;
}

function pickNum(obj, keys) {
    const v = pick(obj, keys, null);
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

/** @returns {Record<string, unknown>} row keyed by RESUBMISSION_COLUMNS keys */
export function mapRawActivityToResubmissionRow(act = {}, idx = 0) {
    const serviceDesc = pick(act, [
        'serviceDescription',
        'serviceDescriptionIcdCode',
        'activityDescription',
        'description',
        'diagnosis',
        'primaryDiagnosis',
        'cptDescription',
        'procedureDescription',
    ]);
    const cptCode = pick(act, ['cptCode', 'procedureCode', 'code'], '');
    const service =
        serviceDesc && cptCode && !String(serviceDesc).includes(String(cptCode))
            ? `${serviceDesc} (${cptCode})`
            : serviceDesc || cptCode || '—';

    const authDateRaw = pick(act, ['authDate', 'authorizationDate', 'priorAuthDate', 'AuthDate'], '');
    let authDate = authDateRaw;
    if (typeof authDateRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(authDateRaw)) {
        authDate = authDateRaw.slice(0, 10);
    }

    return {
        Status: pick(act, ['claimStatus', 'paymentStatus', 'activityStatus', 'status'], '') || '—',
        ActivityNumber:
            pick(act, ['claimActivityNumber', 'activityNumber', 'activityNo', 'claim_activity_no'], '') || '—',
        ServiceDescriptionIcdCode: service,
        GrossAmount: num(pick(act, ['grossAmount', 'grossAmt', 'billedAmount'], null), 0),
        NetAmount: num(pick(act, ['netAmount', 'netAmt', 'amount', 'chargeAmount'], null), 0),
        CoPayment: num(pick(act, ['patientShare', 'coPayment', 'copayment', 'co_pay'], null), 0),
        Deductible: num(pick(act, ['deductible', 'deductable'], null), 0),
        InsLiability: num(pick(act, ['insLiability', 'insuranceLiability', 'liability'], null), 0),
        // New resubmissions/claims API uses paymentAmount (not netApproved).
        NetApproved: num(
            pick(act, ['paymentAmount', 'netApproved', 'approvedAmount', 'paidAmount'], null),
            0
        ),
        RejectedIfAny: num(pick(act, ['rejectedAmount', 'rejectedAmt', 'deniedAmount', 'initialRejectedAmt'], null), 0),
        RejectReason:
            pick(act, ['denialReason', 'rejectReason', 'denialComment', 'denialCodes', 'lastDenialCode'], '') || '',
        WriteoffAmt: num(pick(act, ['writeOffAmt', 'writeoffAmt', 'write_off_amt'], null), 0),
        ResubLiability: num(pick(act, ['resubLiability', 'resub_liability'], null), 0),
        PriorAuthId: pick(act, ['priorAuthorizationId', 'priorAuthId', 'prior_auth_id'], '') || '',
        AuthNo: pick(act, ['authNo', 'authorizationNo', 'authorizationNumber', 'priorAuthorizationId'], '') || '',
        AuthDate: authDate || '',
        __sourceIndex: idx,
    };
}

function money(v) {
    return Math.round((num(v, 0) || 0) * 100) / 100;
}

/** Flat pending-display activity → verification table row. */
export function mapPendingActivityToResubmissionRow(act = {}, idx = 0, claim = {}) {
    const code = String(act.activity_code ?? act.activityCode ?? '').trim();
    const desc = String(act.cpt_desc ?? act.cptDesc ?? '').trim();
    const service = desc
        ? `${desc.toUpperCase()}\n(${code})`
        : code || '—';

    const gross = money(
        act.gross_amount ??
            act.grossAmount ??
            claim.gross_amount ??
            claim.grossAmount
    );
    const net = money(
        act.net_amount ?? act.netAmount ?? claim.net_amount ?? claim.netAmount
    );
    const patientShare = money(
        act.patient_share ??
            act.patientShare ??
            claim.patient_share ??
            claim.patientShare
    );
    const payment = money(act.payment_amount ?? act.paymentAmount);
    const denial = String(act.denial_code ?? act.denialCode ?? '').trim();
    const denialReason = String(act.denial_reason ?? act.denialReason ?? '').trim();
    const rejectedRaw = act.rejected_amount ?? act.rejectedAmount ?? act.rejected_amt;
    const rejected =
        rejectedRaw != null && rejectedRaw !== ''
            ? money(rejectedRaw)
            : denial
              ? payment <= gross
                  ? Math.max(0, money(gross - payment))
                  : Math.max(0, money(gross - net))
              : Math.max(0, money(net - payment));
    const auth = String(act.prior_authorization_id ?? act.priorAuthorizationId ?? '').trim();

    return {
        Status: String(act.status ?? act.Status ?? act.activityStatus ?? '').trim(),
        ActivityNumber: String(act.activity_id ?? act.activityId ?? '').trim() || '—',
        ActivityCode: code || '—',
        ClinicianId: String(act.clinician_id ?? act.clinicianId ?? '').trim() || '—',
        ServiceDescriptionIcdCode: service,
        GrossAmount: gross,
        NetAmount: net,
        CoPayment: patientShare,
        Deductible: 0,
        InsLiability: net,
        NetApproved: payment,
        RejectedIfAny: rejected,
        DenialCode: denial || '—',
        RejectReason: denialReason,
        WriteoffAmt: 0,
        ResubLiability: 0,
        PriorAuthId: auth,
        AuthNo: auth,
        AuthDate: '',
        __sourceIndex: idx,
    };
}

function pendingPayloadRoot(res) {
    if (!res || typeof res !== 'object') return {};
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
    return res;
}

function claimCycleValue(src) {
    if (!src || typeof src !== 'object') return null;
    const v = src.claim_cycle ?? src.claimCycle;
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

function withRejectedTotals(claim) {
    let rejectedCount = 0;
    let rejectedTotal = 0;
    for (const row of claim.activities) {
        const rej = Number(row.RejectedIfAny) || 0;
        if (rej > 0) {
            rejectedCount += 1;
            rejectedTotal += rej;
        }
    }
    return { ...claim, rejectedCount, rejectedTotal: money(rejectedTotal) };
}

function mapNestedClaimsList(nestedClaims) {
    return (Array.isArray(nestedClaims) ? nestedClaims : []).map((claim) => {
        const claimId = String(claim?.claim_id ?? claim?.claimId ?? '').trim() || '—';
        const activitiesRaw = Array.isArray(claim?.activities) ? claim.activities : [];
        return withRejectedTotals({
            claimId,
            claimCycle: claimCycleValue(claim) ?? claimCycleValue(activitiesRaw[0]),
            remittanceTransactionDate: String(
                claim?.remittance_transaction_date ?? claim?.remittanceTransactionDate ?? ''
            ).trim(),
            remittanceClaimTableId: pickNum(claim, [
                'remittance_claim_table_id',
                'remittanceClaimTableId',
                'remittance_table_id',
                'claim_table_id',
                'claimTableId',
            ]),
            resubmissionClaimId: pickNum(claim, [
                'resubmission_claim_id',
                'resubmissionClaimId',
                'submission_claim_id',
                'submissionClaimId',
                'tableid',
                'tableId',
                'table_id',
            ]),
            resubmissionDataId: pickNum(claim, [
                'resubmission_data_id',
                'resubmissionDataId',
            ]),
            submissionTransactionDate: String(
                claim?.submission_transaction_date ?? claim?.submissionTransactionDate ?? ''
            ).trim(),
            patientName: '',
            activities: activitiesRaw.map((act, i) => mapPendingActivityToResubmissionRow(act, i, claim)),
            resubmissions: mapResubmissions(claim),
        });
    });
}

function buildResubmittedClaimContext(envelope = {}) {
    const nested = envelope.claim && typeof envelope.claim === 'object' ? envelope.claim : {};
    return {
        gross_amount: nested.Gross ?? envelope.gross_amount ?? envelope.grossAmount,
        net_amount: nested.Net ?? envelope.net_amount ?? envelope.netAmount,
        patient_share: nested.PatientShare ?? envelope.patient_share ?? envelope.patientShare,
    };
}

function mapResubmittedActivityRow(act = {}, idx = 0, claimContext = {}) {
    const code = String(act.Code ?? act.activity_code ?? act.activityCode ?? '').trim();
    const gross = money(claimContext.gross_amount);
    const net = money(act.Net ?? act.net_amount ?? act.netAmount ?? claimContext.net_amount);
    const patientShare = money(claimContext.patient_share);
    const auth = String(
        act.PriorAuthorizationID ?? act.prior_authorization_id ?? act.priorAuthorizationId ?? ''
    ).trim();

    return {
        Status: String(act.status ?? act.Status ?? act.activityStatus ?? '').trim(),
        ActivityNumber: String(act.ActivityID ?? act.activity_id ?? act.activityId ?? '').trim() || '—',
        ActivityCode: code || '—',
        ActivityType: String(act.Type ?? act.type ?? act.activity_type ?? act.activityType ?? '').trim() || '—',
        ClinicianId: String(act.Clinician ?? act.clinician_id ?? act.clinicianId ?? '').trim() || '—',
        ServiceDescriptionIcdCode: code || '—',
        GrossAmount: gross,
        NetAmount: net,
        CoPayment: patientShare,
        Deductible: 0,
        InsLiability: net,
        NetApproved: money(act.payment_amount ?? act.paymentAmount),
        RejectedIfAny: 0,
        DenialCode: String(act.denial_code ?? act.denialCode ?? act.DenialCode ?? '').trim() || '—',
        RejectReason: String(act.denial_reason ?? act.denialReason ?? act.DenialReason ?? '').trim(),
        WriteoffAmt: 0,
        ResubLiability: 0,
        PriorAuthId: auth,
        AuthNo: auth,
        AuthDate: '',
        __sourceIndex: idx,
    };
}

function mapResubmittedClaimsList(nestedClaims) {
    return (Array.isArray(nestedClaims) ? nestedClaims : []).map((envelope) => {
        const nestedClaim = envelope?.claim && typeof envelope.claim === 'object' ? envelope.claim : {};
        const claimContext = buildResubmittedClaimContext(envelope);
        const activitiesRaw = Array.isArray(envelope?.activities) ? envelope.activities : [];
        const claimId =
            String(
                envelope?.claim_id ??
                    nestedClaim.ClaimInvoiceID ??
                    nestedClaim.claimInvoiceId ??
                    nestedClaim.claim_id ??
                    ''
            ).trim() || '—';
        const submissionDate = String(
            envelope?.header?.TransactionDate ??
                envelope?.submission_transaction_date ??
                envelope?.submissionTransactionDate ??
                ''
        ).trim();

        return withRejectedTotals({
            claimId,
            claimCycle: claimCycleValue(envelope),
            remittanceTransactionDate: String(
                envelope?.remittance_transaction_date ?? envelope?.remittanceTransactionDate ?? ''
            ).trim(),
            remittanceClaimTableId: pickNum(envelope, [
                'claim_table_id',
                'claimTableId',
                'remittance_claim_table_id',
                'remittanceClaimTableId',
            ]),
            resubmissionClaimId: pickNum(envelope, [
                'submission_claim_id',
                'submissionClaimId',
                'resubmission_claim_id',
                'resubmissionClaimId',
            ]),
            resubmissionDataId: pickNum(envelope, ['resubmission_data_id', 'resubmissionDataId']),
            submissionTransactionDate: submissionDate,
            patientName: String(nestedClaim.PatientID ?? nestedClaim.patientId ?? '').trim(),
            claimNet: money(claimContext.net_amount),
            fileName: String(
                envelope?.header?.file_name ??
                    envelope?.header?.fileName ??
                    envelope?.file_name ??
                    envelope?.fileName ??
                    ''
            ).trim(),
            recordCount: pickNum(envelope?.header, ['RecordCount', 'recordCount']),
            submissionTransactionId:
                pickNum(envelope, ['submission_transaction_id', 'submissionTransactionId']) ??
                pickNum(envelope?.header, ['submission_transaction_id', 'submissionTransactionId']),
            activities: activitiesRaw.map((act, i) => mapResubmittedActivityRow(act, i, claimContext)),
            resubmissions: mapResubmissions(envelope),
            header: envelope?.header,
        });
    });
}

function isNewResubmittedClaimEnvelope(claim) {
    if (!claim || typeof claim !== 'object') return false;
    if (claim.claim != null) return true;
    const activities = Array.isArray(claim.activities) ? claim.activities : [];
    return activities.some(
        (act) => act?.ActivityID != null || act?.Code != null || act?.Clinician != null
    );
}
function mapResubmittedSystemBlock(block) {
    const claims = mapNestedClaimsList(block?.claims);
    const resubmittedClaims = pickNum(block, ['resubmitted_claims', 'resubmittedClaims']);
    const resubmittedActivities = pickNum(block, ['resubmitted_activities', 'resubmittedActivities']);
    return {
        resubmittedClaims: resubmittedClaims ?? claims.length,
        resubmittedActivities: resubmittedActivities ?? 0,
        claims,
    };
}

/**
 * Map resubmitted display API into claim cards.
 * Supports flat list (new) and legacy this_system / other_system buckets.
 */
export function mapResubmittedDisplayResponse(res) {
    const inner = pendingPayloadRoot(res);
    const name = String(inner.sender_name ?? inner.senderName ?? '').trim();

    if (inner.this_system || inner.other_system) {
        const thisBlock = mapResubmittedSystemBlock(inner.this_system || {});
        const otherBlock = mapResubmittedSystemBlock(inner.other_system || {});
        const claims = [...thisBlock.claims, ...otherBlock.claims];
        return {
            name,
            claims,
            resubmittedClaims:
                pickNum(inner, ['resubmitted_claims', 'resubmittedClaims']) ?? claims.length,
        };
    }

    if (Array.isArray(inner.claims)) {
        const useNewMapper =
            inner.claims.length === 0 || inner.claims.some(isNewResubmittedClaimEnvelope);
        const claims = useNewMapper
            ? mapResubmittedClaimsList(inner.claims)
            : mapNestedClaimsList(inner.claims);
        return {
            name,
            claims,
            resubmittedClaims:
                pickNum(inner, ['resubmitted_claims', 'resubmittedClaims']) ?? claims.length,
        };
    }

    const flat = mapPendingDisplayResponse(res);
    return {
        name: flat.name,
        claims: flat.claims,
        resubmittedClaims: flat.claims.length,
    };
}

/**
 * Map resubmission-display list APIs (pending / verification) into claim cards.
 * Current API: { claims: [{ claim_id, claim_cycle, remittance_transaction_date, activities: [...] }] }
 * Legacy API:  { activities: [{ claim_id, ... }] }
 */
export function mapPendingDisplayResponse(res) {
    const inner = pendingPayloadRoot(res);
    const name = String(inner.sender_name ?? inner.senderName ?? '').trim();
    const nestedClaims = Array.isArray(inner.claims) ? inner.claims : [];

    if (nestedClaims.length > 0) {
        return { claims: mapNestedClaimsList(nestedClaims), name };
    }

    const raw = Array.isArray(inner.activities) ? inner.activities : [];
    const groups = new Map();

    for (const act of raw) {
        const claimId = String(act?.claim_id ?? act?.claimId ?? '').trim() || '—';
        let claim = groups.get(claimId);
        if (!claim) {
            claim = {
                claimId,
                claimCycle: claimCycleValue(act),
                remittanceTransactionDate: String(
                    act?.remittance_transaction_date ?? act?.remittanceTransactionDate ?? ''
                ).trim(),
                submissionTransactionDate: '',
                patientName: '',
                activities: [],
            };
            groups.set(claimId, claim);
        }
        claim.activities.push(mapPendingActivityToResubmissionRow(act, claim.activities.length));
    }

    return { claims: [...groups.values()].map(withRejectedTotals), name };
}

function asText(v) {
    if (v == null || v === '') return '';
    return String(v).trim();
}

export function unwrapClaimDetailsEnvelope(res) {
    const empty = { claim_id: '', remittance_transaction_date: '', header: {}, claim: {} };
    if (!res || typeof res !== 'object') return empty;

    const nested = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : res;
    if (Array.isArray(nested)) {
        const first = nested[0] && typeof nested[0] === 'object' ? nested[0] : {};
        return unwrapClaimDetailsEnvelope(first);
    }

    if (nested.claim && typeof nested.claim === 'object' && !Array.isArray(nested.claim)) {
        return {
            claim_id: asText(
                pick(nested, ['claim_id', 'claimId', 'ClaimInvoiceID'], '') || nested.claim.ClaimInvoiceID
            ),
            remittance_transaction_date: asText(
                pick(nested, ['remittance_transaction_date', 'remittanceTransactionDate'], '')
            ),
            remittance_claim_table_id: pickNum(nested, [
                'remittance_claim_table_id',
                'remittanceClaimTableId',
                'remittance_table_id',
            ]),
            resubmission_claim_id: pickNum(nested, [
                'resubmission_claim_id',
                'resubmissionClaimId',
            ]),
            resubmission_data_id: pickNum(nested, [
                'resubmission_data_id',
                'resubmissionDataId',
            ]),
            status: asText(pick(nested, ['status', 'Status'], '')),
            header: nested.header && typeof nested.header === 'object' ? nested.header : {},
            claim: nested.claim,
            activities: Array.isArray(nested.activities) ? nested.activities : [],
            resubmissions: Array.isArray(nested.resubmissions)
                ? nested.resubmissions
                : Array.isArray(nested.Resubmissions)
                  ? nested.Resubmissions
                  : [],
        };
    }

    return {
        claim_id: asText(pick(nested, ['ClaimInvoiceID', 'claim_id', 'claimId'], '')),
        remittance_transaction_date: asText(
            pick(nested, ['remittance_transaction_date', 'remittanceTransactionDate'], '')
        ),
        remittance_claim_table_id: pickNum(nested, [
            'remittance_claim_table_id',
            'remittanceClaimTableId',
            'remittance_table_id',
        ]),
        resubmission_claim_id: pickNum(nested, ['resubmission_claim_id', 'resubmissionClaimId']),
        resubmission_data_id: pickNum(nested, ['resubmission_data_id', 'resubmissionDataId']),
        status: asText(pick(nested, ['status', 'Status'], '')),
        header: nested.header && typeof nested.header === 'object' ? nested.header : {},
        claim: nested,
    };
}

export function unwrapClaimDetailsList(res) {
    if (!res || typeof res !== 'object') return [];
    if (Array.isArray(res)) return res.filter((row) => row && typeof row === 'object');

    const nested = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : res;
    if (Array.isArray(nested)) return nested.filter((row) => row && typeof row === 'object');
    if (Array.isArray(nested.claims)) return nested.claims.filter((row) => row && typeof row === 'object');
    if (Array.isArray(nested.data)) return nested.data.filter((row) => row && typeof row === 'object');
    if (nested.claim && typeof nested.claim === 'object' && !Array.isArray(nested.claim)) return [nested];
    return Object.keys(nested).length > 0 ? [nested] : [];
}

export function unwrapClaimDetailsPayload(res) {
    if (!res || typeof res !== 'object') return {};
    if (Array.isArray(res)) return res[0] && typeof res[0] === 'object' ? res[0] : {};

    const nested = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : res;
    if (Array.isArray(nested)) return nested[0] && typeof nested[0] === 'object' ? nested[0] : {};
    if (Array.isArray(nested.claims) && nested.claims[0]) return nested.claims[0];
    if (nested.claim && typeof nested.claim === 'object' && !Array.isArray(nested.claim)) return nested.claim;
    if (Array.isArray(nested.data) && nested.data[0]) return nested.data[0];
    return nested;
}

function moneyText(v) {
    const n = num(v, null);
    if (n == null) return '';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function mapDiagnoses(src) {
    const list = Array.isArray(src.diagnoses)
        ? src.diagnoses
        : Array.isArray(src.diagnosisList)
          ? src.diagnosisList
          : Array.isArray(src.diagnosis)
            ? src.diagnosis
            : [];

    const diagnoses = (list.length > 0 && typeof list[0] === 'object' ? list : [])
        .map((row, i) => {
            const type = asText(pick(row, ['Type', 'type', 'diagnosisType', 'diagnosis_type'])) || 'Secondary';
            const code = asText(pick(row, ['Code', 'code', 'icdCode', 'icd_code', 'diagnosisCode', 'diagnosis_code']));
            const claimId = pick(row, ['ClaimID', 'claimId', 'claim_id'], null);
            const tableid = pick(row, ['tableid', 'tableId', 'table_id'], null);
            return {
                id: `dx-${i + 1}`,
                type,
                code,
                principal: type.toLowerCase().includes('principal'),
                isNew: false,
                claimId: claimId === '' ? null : claimId,
                tableid: tableid === '' ? null : tableid,
            };
        })
        .filter((row) => row.code);

    const principalRow = diagnoses.find((row) => row.principal) || diagnoses[0] || { id: 'principal', type: 'Principal', code: '' };

    return {
        diagnoses,
        principal: { id: 'principal', code: principalRow.code || '', type: principalRow.type || 'Principal' },
        secondary: diagnoses.filter((row) => !row.principal),
    };
}

function qtyText(v) {
    if (v == null || v === '') return '';
    const n = num(v, null);
    if (n == null) return asText(v);
    return Number.isInteger(n) ? String(n) : String(n);
}

function isFileObservation(row = {}) {
    return Boolean(row.isFile) || asText(pick(row, ['Type', 'type'])).toLowerCase() === 'file';
}

function pickTypeDetails(detailsObj) {
    if (!detailsObj || typeof detailsObj !== 'object') {
        return { description: '', patientType: '' };
    }
    return {
        description: asText(
            pick(detailsObj, ['encounter_type_description', 'encounterTypeDescription', 'description'])
        ),
        patientType: asText(pick(detailsObj, ['patient_type', 'patientType'])),
    };
}

function formatTypeWithDetails(code, detailsObj) {
    const codeText = asText(code);
    const { description, patientType } = pickTypeDetails(detailsObj);
    if (!description && !patientType) return codeText;

    let out = codeText;
    if (description) out += (out ? ' — ' : '') + description;
    if (patientType) out += ` (${patientType})`;
    return out;
}

function pickTypeDetailsField(obj, detailsKeys) {
    if (!obj) return null;
    for (const k of detailsKeys) {
        const x = obj[k];
        if (x && typeof x === 'object' && !Array.isArray(x)) return x;
    }
    return null;
}

function mapClaimActivities(src) {
    const activities = Array.isArray(src.activities) ? src.activities : [];
    return activities.map((act, actIdx) => {
        const obs = Array.isArray(act?.observations) ? act.observations : [];
        return {
            id: asText(pick(act, ['ActivityID', 'activityId', 'activity_id'])) || `act-${actIdx + 1}`,
            activityId: asText(pick(act, ['ActivityID', 'activityId', 'activity_id'])),
            start: asText(pick(act, ['Start', 'start'])),
            type: asText(pick(act, ['Type', 'type'])),
            typeDisplay: formatTypeWithDetails(
                pick(act, ['Type', 'type']),
                pickTypeDetailsField(act, ['Type_details', 'type_details', 'typeDetails'])
            ),
            code: asText(pick(act, ['Code', 'code'])),
            quantity: qtyText(pick(act, ['Quantity', 'quantity'], null)),
            net: moneyText(pick(act, ['Net', 'net', 'netAmount'], null)),
            clinician: asText(pick(act, ['Clinician', 'clinician', 'clinicianId', 'ClinicianID'])),
            clinicianName: asText(pick(act, ['clinician_name', 'clinicianName', 'ClinicianName'])),
            tableid: pick(act, ['tableid', 'tableId', 'table_id'], null) || null,
            claimId: pick(act, ['ClaimID', 'claimId'], null) || null,
            status: asText(pick(act, ['Status', 'status'], '')),
            priorAuthId: asText(
                pick(act, [
                    'PriorAuthorizationID',
                    'priorAuthorizationId',
                    'prior_authorization_id',
                    'AuthorizationID',
                    'authorizationId',
                    'PriorAuthID',
                    'priorAuthId',
                    'AuthID',
                    'authId',
                ])
            ),
            observations: obs.map((row, i) => {
                const file = isFileObservation(row);
                return {
                    id: `${actIdx + 1}-${i + 1}`,
                    type: asText(pick(row, ['Type', 'type'])) || (file ? 'File' : 'Text'),
                    code: asText(pick(row, ['Code', 'code'])),
                    value: file ? '' : asText(pick(row, ['Value', 'value'])),
                    valueType:
                        asText(pick(row, ['ValueType', 'valueType', 'value_type'])) || (file ? 'File' : 'String'),
                    isFile: file,
                    fileData: file ? asText(pick(row, ['Value', 'value', 'File', 'file', 'content', 'Content'])) : '',
                    isNew: false,
                    tableid: pick(row, ['tableid', 'tableId', 'table_id'], null) || null,
                    activityTableId: pick(row, ['ActivityID', 'activityId'], null) || null,
                    __source: row,
                };
            }),
            __source: act,
        };
    });
}

function emptyClaimWorkspace(claim = {}) {
    const claimId = asText(claim.claimId);
    return {
        details: {
            claimInvoiceId: claimId,
            idPayer: '',
            memberId: '',
            payerId: '',
            providerId: '',
            emiratesIdNumber: '',
            gross: '',
            patientShare: '',
            net: '',
        },
        encounter: {
            facilityId: '',
            type: '',
            patientId: '',
            start: '',
            end: '',
            startType: '',
            endType: '',
        },
        principal: { id: 'principal', code: '', type: 'Principal' },
        secondary: [],
        diagnoses: [],
        activities: [],
        observations: [],
        resubmissions: [],
        resubmission: { type: '', commentType: '', comments: '', attachments: [] },
    };
}

function attachmentPayload(row = {}) {
    const raw = pick(
        row,
        [
            'Attachment',
            'attachment',
            'Attachments',
            'attachments',
            'File',
            'file',
            'FileData',
            'fileData',
            'file_data',
            'FileContent',
            'fileContent',
            'Document',
            'document',
            'Content',
            'content',
        ],
        null
    );

    if (raw == null || raw === '') return '';

    if (Array.isArray(raw)) {
        if (raw.length === 0) return '';
        const first = raw[0];
        if (typeof first === 'string') return asText(first);
        if (first && typeof first === 'object') {
            return asText(
                pick(first, [
                    'Attachment',
                    'attachment',
                    'Value',
                    'value',
                    'File',
                    'file',
                    'Content',
                    'content',
                    'Data',
                    'data',
                    'FileContent',
                    'fileContent',
                    'Base64',
                    'base64',
                ])
            );
        }
        return '';
    }

    if (typeof raw === 'object') {
        return asText(
            pick(raw, [
                'Attachment',
                'attachment',
                'Value',
                'value',
                'File',
                'file',
                'Content',
                'content',
                'Data',
                'data',
                'FileContent',
                'fileContent',
                'Base64',
                'base64',
            ])
        );
    }

    return asText(raw);
}

export function mapActivityLineAction(status) {
    const s = asText(status).toLowerCase().replace(/[\s_]+/g, '-');
    if (s === 'write-off' || s === 'writeoff') return 'Write-off';
    if (s === 'resubmit') return 'Resubmit';
    return '';
}

export function lineActionToPutStatus(value) {
    const s = asText(value).toLowerCase().replace(/[\s_]+/g, '-');
    if (s === 'resubmit') return 'resubmit';
    if (s === 'write-off' || s === 'writeoff') return 'write-off';
    return null;
}

/** Same value the verification STATUS dropdown shows / sends. */
export function resolveLineActionValue(row = {}, lineActions = {}, idx) {
    const fromForm = lineActions?.[idx] ?? lineActions?.[String(idx)];
    if (fromForm) return fromForm;
    const mapped = mapActivityLineAction(row.Status);
    if (mapped) return mapped;
    return Number(row.RejectedIfAny) > 0 ? 'Resubmit' : '';
}

function findListActivityIndex(act = {}, list = [], fallbackIdx = -1, workspaceActCount = 0) {
    const ids = [asText(act.activityId), asText(act.id)].filter((id) => id && id !== '—');
    if (ids.length) {
        const byId = list.findIndex((row) => ids.includes(asText(row.ActivityNumber)));
        if (byId >= 0) return byId;
        const byIdAsCode = list.findIndex((row) => ids.includes(asText(row.ActivityCode)));
        if (byIdAsCode >= 0) return byIdAsCode;
    }
    const code = asText(act.code);
    if (code && code !== '—') {
        const matches = [];
        list.forEach((row, i) => {
            if (asText(row.ActivityCode) === code || asText(row.ActivityNumber) === code) matches.push(i);
        });
        if (matches.length === 1) return matches[0];
        if (matches.length > 1 && fallbackIdx >= 0 && matches.includes(fallbackIdx)) return fallbackIdx;
    }
    if (workspaceActCount === list.length && fallbackIdx >= 0 && fallbackIdx < list.length) {
        return fallbackIdx;
    }
    if (list.length === 1 && workspaceActCount === 1) return 0;
    return -1;
}

function attachmentFileName(raw) {
    const source = asText(raw);
    const payload = source.includes(',') ? source.slice(source.indexOf(',') + 1) : source;
    if (payload.startsWith('JVBERi0')) return 'attachment.pdf';
    if (payload.startsWith('iVBOR')) return 'attachment.png';
    if (payload.startsWith('/9j/')) return 'attachment.jpg';
    return source ? 'attachment' : '';
}

export function verificationFormStateFromClaim(claim = {}) {
    const first = Array.isArray(claim.resubmissions) && claim.resubmissions[0] ? claim.resubmissions[0] : {};
    const lineActions = {};
    (claim.activities || []).forEach((row, idx) => {
        const action = resolveLineActionValue(row, {}, idx);
        if (action) lineActions[idx] = action;
    });
    const fileData = asText(first.fileData);
    return {
        resubmissionType: asText(first.type),
        remarks: asText(first.comment),
        attachment: fileData
            ? {
                  name: attachmentFileName(fileData),
                  base64: fileData,
                  fromApi: true,
              }
            : null,
        lineActions,
        isDirty: false,
    };
}

export function mapResubmissions(src) {
    let list = Array.isArray(src.resubmissions)
        ? src.resubmissions
        : Array.isArray(src.Resubmissions)
          ? src.Resubmissions
          : [];

    if (list.length === 0) {
        const single = src.resubmission || src.Resubmission;
        if (single && typeof single === 'object' && !Array.isArray(single)) {
            list = [single];
        }
    }

    return list.map((row, i) => ({
        id: `resub-${i + 1}`,
        type: asText(pick(row, ['Type', 'type', 'ResubmissionType', 'resubmissionType'])),
        comment: asText(pick(row, ['Comment', 'comment', 'Comments', 'comments'])),
        fileData: attachmentPayload(row),
        tableid: pick(row, ['tableid', 'tableId', 'table_id'], null) || null,
        claimId: pick(row, ['ClaimID', 'claimId'], null) || null,
        isNew: false,
    }));
}

/**
 * Map `/api/dashboard/resubmission-display/claim-details` into the claim workspace modal.
 * Claim details tab uses only claim.{ClaimInvoiceID, IDPayer, MemberID, PayerID, ProviderID, EmiratesIDNumber, Gross, PatientShare, Net}.
 */
export function mapClaimDetailsToWorkspace(res, claim = {}) {
    const envelope = unwrapClaimDetailsEnvelope(res);
    const src = envelope.claim && Object.keys(envelope.claim).length > 0 ? envelope.claim : unwrapClaimDetailsPayload(res);
    const fallback = emptyClaimWorkspace(claim);
    const dx = mapDiagnoses(src);
    const activitySource =
        Array.isArray(src.activities) && src.activities.length > 0
            ? src
            : Array.isArray(envelope.activities) && envelope.activities.length > 0
              ? envelope
              : src;
    const resubmissionSource =
        (Array.isArray(src.resubmissions) && src.resubmissions.length > 0) ||
        (Array.isArray(src.Resubmissions) && src.Resubmissions.length > 0)
            ? src
            : envelope;
    const resubmissions = mapResubmissions(resubmissionSource);
    const firstResub = resubmissions[0] || {};

    return {
        details: {
            claimInvoiceId:
                asText(pick(src, ['ClaimInvoiceID', 'claimInvoiceId', 'claim_id', 'claimId'])) ||
                fallback.details.claimInvoiceId,
            idPayer: asText(pick(src, ['IDPayer', 'idPayer', 'id_payer'])),
            memberId: asText(pick(src, ['MemberID', 'memberId', 'member_id'])),
            payerId: asText(pick(src, ['PayerID', 'payerId', 'payer_id'])),
            providerId: asText(pick(src, ['ProviderID', 'providerId', 'provider_id'])),
            emiratesIdNumber: asText(
                pick(src, ['EmiratesIDNumber', 'emiratesIdNumber', 'emirates_id_number', 'emiratesId'])
            ),
            gross: moneyText(pick(src, ['Gross', 'gross', 'grossAmount'], null)),
            patientShare: moneyText(pick(src, ['PatientShare', 'patientShare', 'patient_share'], null)),
            net: moneyText(pick(src, ['Net', 'net', 'netAmount'], null)),
        },
        encounter: {
            facilityId: asText(pick(src, ['FacilityID', 'facilityId'], '')) || asText(pick(src, ['ProviderID', 'providerId', 'provider_id'], '')),
            type: asText(pick(src, ['Type', 'type', 'EncounterType', 'encounterType'])),
            typeDisplay: formatTypeWithDetails(
                pick(src, ['Type', 'type', 'EncounterType', 'encounterType']),
                pickTypeDetailsField(src, ['Type_details', 'type_details', 'typeDetails'])
            ),
            patientId: asText(pick(src, ['PatientID', 'patientId', 'patient_id'])),
            start: asText(pick(src, ['Start', 'start', 'EncounterStart', 'encounterStart'])),
            end: asText(pick(src, ['End', 'end', 'EncounterEnd', 'encounterEnd'])),
            startType: asText(pick(src, ['StartType', 'startType', 'start_type'])),
            startTypeDisplay: formatTypeWithDetails(
                pick(src, ['StartType', 'startType', 'start_type']),
                pickTypeDetailsField(src, ['StartType_details', 'startType_details', 'startTypeDetails'])
            ),
            endType: asText(pick(src, ['EndType', 'endType', 'end_type'])),
            endTypeDisplay: formatTypeWithDetails(
                pick(src, ['EndType', 'endType', 'end_type']),
                pickTypeDetailsField(src, ['EndType_details', 'endType_details', 'endTypeDetails'])
            ),
        },
        principal: dx.principal,
        secondary: dx.secondary,
        diagnoses: dx.diagnoses,
        activities: mapClaimActivities(activitySource),
        observations: [],
        resubmissions,
        resubmission: {
            type: firstResub.type || '',
            commentType: '',
            comments: resubmissions
                .map((row) => row.comment)
                .filter(Boolean)
                .join('\n\n'),
            attachments: [],
        },
        __raw: envelope,
    };
}

export function claimDetailsLoadingWorkspace(claim = {}) {
    return { __loading: true, ...emptyClaimWorkspace(claim) };
}

export function claimDetailsErrorWorkspace(claim = {}, message = 'Failed to load claim details.') {
    return { __error: message, ...emptyClaimWorkspace(claim) };
}

function parseAmount(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const n = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
}

function observationValue(obs = {}) {
    if (isFileObservation(obs)) {
        const raw = asText(obs.fileData || obs.value);
        if (!raw) return '';
        return raw.includes(',') ? raw.slice(raw.indexOf(',') + 1).replace(/\s/g, '') : raw.replace(/\s/g, '');
    }
    return asText(obs.value);
}

function asId(value) {
    if (value == null || value === '') return null;
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isFinite(n) ? n : value;
}

function buildDiagnosisPutRow(row = {}, claimTableId) {
    const type = asText(row.type) || 'Secondary';
    const code = asText(row.code);
    if (!code) return null;
    const tableid = asId(row.tableid);
    const claimId = asId(row.claimId) ?? claimTableId;
    if (tableid == null) return { Type: type, Code: code };
    const next = { tableid };
    if (claimId != null) next.ClaimID = claimId;
    next.Type = type;
    next.Code = code;
    return next;
}

function buildObservationPutRow(obs = {}, activityTableId) {
    const file = isFileObservation(obs);
    const type = file ? 'File' : asText(obs.type) || 'Text';
    const value = observationValue(obs);
    const tableid = asId(obs.tableid);
    const next = {};
    if (tableid != null) {
        next.tableid = tableid;
        const actId = asId(obs.activityTableId) ?? activityTableId;
        if (actId != null) next.ActivityID = actId;
    } else if (!asText(obs.code) && !value) {
        return null;
    }
    next.Type = type;
    next.Code = asText(obs.code);
    next.Value = value;
    next.ValueType = file ? asText(obs.valueType) || 'File' : asText(obs.valueType) || 'String';
    return next;
}

function round3(value) {
    if (value == null || !Number.isFinite(value)) return value;
    return Math.round(value * 1000) / 1000;
}

function buildActivityPutRow(act = {}, claimTableId, status = null) {
    const quantity = parseAmount(act.quantity);
    const net = parseAmount(act.net);
    const tableid = asId(act.tableid);
    const claimId = asId(act.claimId) ?? claimTableId;
    const next = {};
    if (tableid != null) next.tableid = tableid;
    if (claimId != null) next.ClaimID = claimId;
    next.ActivityID = asText(act.activityId);
    next.Start = asText(act.start);
    next.Type = asText(act.type);
    next.Code = asText(act.code);
    next.Quantity = quantity != null ? round3(quantity) : 0;
    next.Net = net != null ? round3(net) : 0;
    next.Clinician = asText(act.clinician);
    next.PriorAuthorizationID = asText(act.priorAuthId);
    next.Status = status;
    next.observations = (act.observations || []).map((obs) => buildObservationPutRow(obs, tableid)).filter(Boolean);
    return next;
}

function resolveActivityPutStatus(act = {}, formState = {}, claim = {}, actIdx = -1, workspaceActCount = 0) {
    const lineActions = formState?.lineActions && typeof formState.lineActions === 'object' ? formState.lineActions : {};
    const list = Array.isArray(claim.activities) ? claim.activities : [];
    const listIdx = findListActivityIndex(act, list, actIdx, workspaceActCount);
    if (listIdx < 0) return lineActionToPutStatus(act.status);
    const selected = resolveLineActionValue(list[listIdx], lineActions, listIdx);
    return lineActionToPutStatus(selected);
}

/** Write-off lines are saved but omitted from Claim.Submission XML. */
export function isActivityExcludedFromSubmissionXml(
    act = {},
    formState = {},
    claim = {},
    actIdx = -1,
    workspaceActCount = 0
) {
    return resolveActivityPutStatus(act, formState, claim, actIdx, workspaceActCount) === 'write-off';
}

function buildResubmissionPutRows(formState = {}, claim = {}, claimTableId) {
    const originals = Array.isArray(claim.resubmissions) ? claim.resubmissions : [];
    const formType = asText(formState.resubmissionType);
    const formComment = formState.remarks != null ? asText(formState.remarks) : '';
    const formAttachment = asText(formState.attachment?.base64);

    const toRow = (src, overlay) => {
        const type = asText(overlay?.Type) || asText(src?.Type || src?.type);
        const comment = overlay?.Comment != null ? asText(overlay.Comment) : asText(src?.Comment || src?.comment);
        const attachment =
            overlay?.attachment != null
                ? asText(overlay.attachment)
                : asText(src?.attachment || src?.Attachment);
        const tableid = asId(pick(src || {}, ['tableid', 'tableId', 'table_id'], null));
        const next = {};
        if (tableid != null) {
            next.tableid = tableid;
            const claimId = asId(pick(src, ['ClaimID', 'claimId'], null)) ?? claimTableId;
            if (claimId != null) next.ClaimID = claimId;
        }
        next.Type = type;
        next.Comment = comment;
        next.attachment = attachment;
        return next;
    };

    if (originals.length === 0) {
        if (!formType && !formComment && !formAttachment) return [];
        return [toRow(null, { Type: formType, Comment: formComment, attachment: formAttachment })];
    }

    return originals.map((src, i) =>
        toRow(
            src,
            i === 0
                ? {
                      Type: formType || src.Type || src.type,
                      Comment: formState.remarks != null ? formComment : src.Comment || src.comment,
                      attachment: formAttachment || src.attachment || src.Attachment,
                  }
                : null
        )
    );
}

/**
 * PUT /claim-details body:
 * { claim_id, remittance_transaction_date, claim }
 */
export function buildClaimDetailsPutPayload(workspace = {}, formState = {}, claim = {}) {
    const raw = workspace.__raw && typeof workspace.__raw === 'object' ? workspace.__raw : {};
    const rawClaim = raw.claim && typeof raw.claim === 'object' ? raw.claim : {};
    const details = workspace.details || {};
    const encounter = workspace.encounter || {};

    const claimTableId =
        pickNum(rawClaim, ['tableid', 'tableId', 'table_id']) ??
        pickNum(claim, ['resubmissionClaimId', 'tableid', 'tableId']);

    const gross = parseAmount(details.gross);
    const patientShare = parseAmount(details.patientShare);
    const net = parseAmount(details.net);

    const nextClaim = {
        tableid: claimTableId,
        ClaimInvoiceID: asText(details.claimInvoiceId) || asText(rawClaim.ClaimInvoiceID) || asText(claim.claimId),
        MemberID: asText(details.memberId),
        PayerID: asText(details.payerId),
        ProviderID: asText(details.providerId),
        EmiratesIDNumber: asText(details.emiratesIdNumber),
        Gross: gross != null ? round3(gross) : 0,
        PatientShare: patientShare != null ? round3(patientShare) : 0,
        Net: net != null ? round3(net) : 0,
        FacilityID: asText(encounter.facilityId) || asText(rawClaim.FacilityID) || asText(details.providerId),
        Type: asText(encounter.type) || asText(rawClaim.Type),
        PatientID: asText(encounter.patientId) || asText(rawClaim.PatientID),
        Start: asText(encounter.start) || asText(rawClaim.Start),
        End: asText(encounter.end) || asText(rawClaim.End),
        StartType: asText(encounter.startType) || asText(rawClaim.StartType),
        EndType: asText(encounter.endType) || asText(rawClaim.EndType),
        diagnoses: (workspace.diagnoses || []).map((row) => buildDiagnosisPutRow(row, claimTableId)).filter(Boolean),
        resubmissions: buildResubmissionPutRows(formState, rawClaim, claimTableId),
        activities: (workspace.activities || []).map((act, actIdx, acts) =>
            buildActivityPutRow(
                act,
                claimTableId,
                resolveActivityPutStatus(act, formState, claim, actIdx, acts.length)
            )
        ),
    };

    return {
        claim_id: asText(details.claimInvoiceId) || asText(raw.claim_id) || asText(claim.claimId),
        remittance_transaction_date:
            asText(raw.remittance_transaction_date) || asText(claim.remittanceTransactionDate),
        claim: nextClaim,
    };
}
