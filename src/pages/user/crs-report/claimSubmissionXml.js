/**
 * Build eClaimLink Claim.Submission XML for resubmission preview.
 */

import { isActivityExcludedFromSubmissionXml } from './resubmissionActivityMap';

function pick(obj, keys, fallback = '') {
    if (!obj) return fallback;
    for (const k of keys) {
        const x = obj[k];
        if (x !== null && x !== undefined && x !== '') return x;
    }
    return fallback;
}

function asText(v) {
    if (v == null || v === '') return '';
    return String(v).trim();
}

function xmlEscape(value) {
    return asText(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function stripCommas(v) {
    return asText(v).replace(/,/g, '');
}

function normalizeBase64(raw) {
    const source = asText(raw);
    if (!source) return '';
    const payload = source.includes(',') ? source.slice(source.indexOf(',') + 1) : source;
    return payload.replace(/\s/g, '');
}

function formatTransactionDate(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            resolve(normalizeBase64(result));
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function xmlTag(name, value, { omitIfEmpty = true } = {}) {
    const text = value == null ? '' : String(value);
    if (omitIfEmpty && text === '') return '';
    return `<${name}>${xmlEscape(text)}</${name}>`;
}

function buildDiagnosisXml(rows = []) {
    return rows
        .filter((row) => asText(row?.code))
        .map((row) => {
            const type =
                row.principal || String(row.type || '').toLowerCase().includes('principal')
                    ? 'Principal'
                    : row.type || 'Secondary';
            return `<Diagnosis>${xmlTag('Type', type)}${xmlTag('Code', row.code)}</Diagnosis>`;
        })
        .join('');
}

function buildObservationXml(obs = {}) {
    const isFile = Boolean(obs.isFile) || String(obs.type || '').toLowerCase() === 'file';
    const value = isFile ? normalizeBase64(obs.fileData || obs.value) : asText(obs.value);
    if (!asText(obs.code) && !value) return '';
    return `<Observation>${xmlTag('Type', isFile ? 'File' : obs.type || 'Text')}${xmlTag(
        'Code',
        obs.code
    )}${xmlTag('Value', value)}${xmlTag('ValueType', asText(obs.valueType) || (isFile ? 'File' : 'String'))}</Observation>`;
}

function buildActivityXml(act = {}) {
    const observations = Array.isArray(act.observations) ? act.observations : [];
    const obsXml = observations.map((obs) => buildObservationXml(obs)).join('');
    return `<Activity>${xmlTag('ID', act.activityId || act.id)}${xmlTag('Start', act.start)}${xmlTag(
        'Type',
        act.type
    )}${xmlTag('Code', act.code)}${xmlTag('Quantity', act.quantity)}${xmlTag(
        'Net',
        stripCommas(act.net)
    )}${xmlTag('Clinician', act.clinician)}${obsXml}</Activity>`;
}

function buildEncounterXml(encounter = {}, details = {}) {
    const facilityId = encounter.facilityId || details.providerId;
    return `<Encounter>${xmlTag('FacilityID', facilityId)}${xmlTag('Type', encounter.type)}${xmlTag(
        'PatientID',
        encounter.patientId
    )}${xmlTag('Start', encounter.start)}${xmlTag('End', encounter.end)}${xmlTag(
        'StartType',
        encounter.startType
    )}${xmlTag('EndType', encounter.endType)}</Encounter>`;
}

function buildResubmissionXml({ type = '', comment = '', attachmentBase64 = '' } = {}) {
    const attachment = normalizeBase64(attachmentBase64);
    return `<Resubmission>${xmlTag('Type', type)}${xmlTag('Comment', comment)}${xmlTag(
        'Attachment',
        attachment,
        { omitIfEmpty: false }
    )}</Resubmission>`;
}

function diagnosisRowsFromWorkspace(workspace = {}) {
    if (Array.isArray(workspace.diagnoses) && workspace.diagnoses.length > 0) {
        return workspace.diagnoses;
    }
    const rows = [];
    if (workspace.principal?.code) {
        rows.push({
            type: workspace.principal.type || 'Principal',
            code: workspace.principal.code,
            principal: true,
        });
    }
    for (const row of workspace.secondary || []) {
        if (row?.code) rows.push({ ...row, type: row.type || 'Secondary', principal: false });
    }
    return rows;
}

function headerSources(rawPayload = {}, workspace = {}) {
    const envelope = workspace.__raw && typeof workspace.__raw === 'object' ? workspace.__raw : {};
    return [envelope.header, rawPayload.header, rawPayload, envelope].filter(
        (src) => src && typeof src === 'object' && !Array.isArray(src)
    );
}

function pickHeaderValue(sources, keys) {
    for (const src of sources) {
        const value = asText(pick(src, keys));
        if (value) return value;
    }
    return '';
}

function extractHeader(
    rawPayload = {},
    workspace = {},
    { senderId = '', receiverId = '', dispositionFlag = '' } = {}
) {
    const details = workspace.details || {};
    const sources = headerSources(rawPayload, workspace);

    return {
        senderId:
            pickHeaderValue(sources, ['SenderID', 'senderId', 'sender_id']) ||
            asText(senderId) ||
            asText(details.providerId) ||
            pickHeaderValue(sources, ['ProviderID', 'providerId', 'provider_id']),
        receiverId: pickHeaderValue(sources, ['ReceiverID', 'receiverId', 'receiver_id']) || asText(receiverId),
        transactionDate:
            pickHeaderValue(sources, ['TransactionDate', 'transactionDate', 'transaction_date']) ||
            formatTransactionDate(),
        dispositionFlag:
            asText(dispositionFlag) ||
            pickHeaderValue(sources, ['DispositionFlag', 'dispositionFlag', 'disposition_flag']) ||
            'PRODUCTION',
    };
}

function toDhpoHeader(header = {}, recordCount = 1) {
    return {
        SenderID: header.senderId || '',
        ReceiverID: header.receiverId || '',
        TransactionDate: header.transactionDate || '',
        RecordCount: Math.max(0, Number(recordCount) || 0),
        DispositionFlag: header.dispositionFlag || 'PRODUCTION',
    };
}

const CLAIM_SUBMISSION_ROOT_OPEN =
    '<Claim.Submission xmlns:tns="http://www.eclaimlink.ae/DataDictionary/CommonTypes" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.eclaimlink.ae/DataDictionary/CommonTypes/ClaimSubmission.xsd">';

function submissionActivities(workspace = {}, formState = {}, claim = {}) {
    const all = Array.isArray(workspace.activities) ? workspace.activities : [];
    return all.filter(
        (act, actIdx) =>
            !isActivityExcludedFromSubmissionXml(act, formState, claim, actIdx, all.length)
    );
}

function buildClaimInnerXml(workspace = {}, resubmission = {}, { formState = {}, claim = {} } = {}) {
    const details = workspace.details || {};
    const diagnoses = diagnosisRowsFromWorkspace(workspace);
    const activities = submissionActivities(workspace, formState, claim);

    return [
        xmlTag('ID', details.claimInvoiceId),
        xmlTag('IDPayer', details.idPayer),
        xmlTag('MemberID', details.memberId),
        xmlTag('PayerID', details.payerId),
        xmlTag('ProviderID', details.providerId),
        xmlTag('EmiratesIDNumber', details.emiratesIdNumber),
        xmlTag('Gross', stripCommas(details.gross)),
        xmlTag('PatientShare', stripCommas(details.patientShare)),
        xmlTag('Net', stripCommas(details.net)),
        buildEncounterXml(workspace.encounter || {}, details),
        buildDiagnosisXml(diagnoses),
        activities.map((act) => buildActivityXml(act)).join(''),
        buildResubmissionXml(resubmission),
    ].join('');
}

function buildHeaderXml(header = {}, recordCount = 1) {
    return [
        '<Header>',
        xmlTag('SenderID', header.senderId),
        xmlTag('ReceiverID', header.receiverId),
        xmlTag('TransactionDate', header.transactionDate),
        xmlTag('RecordCount', String(recordCount)),
        xmlTag('DispositionFlag', header.dispositionFlag),
        '</Header>',
    ].join('');
}

/**
 * @param {object} params
 * @param {{ workspace?: object, rawPayload?: object, resubmission?: object, formState?: object, claim?: object }[]} params.entries
 * @param {string} [params.senderId]
 * @param {string} [params.receiverId]
 * @param {string} [params.dispositionFlag]
 * @returns {{ xml: string, header: { SenderID: string, ReceiverID: string, TransactionDate: string, RecordCount: number, DispositionFlag: string } }}
 */
export function buildClaimsSubmission({
    entries = [],
    senderId = '',
    receiverId = '',
    dispositionFlag = '',
} = {}) {
    const first = entries[0] || {};
    const header = extractHeader(first.rawPayload, first.workspace, { senderId, receiverId, dispositionFlag });
    const headerXml = buildHeaderXml(header, entries.length);
    const claimsXml = entries
        .map(
            ({ workspace = {}, resubmission = {}, formState = {}, claim = {} }) =>
                `<Claim>${buildClaimInnerXml(workspace, resubmission, { formState, claim })}</Claim>`
        )
        .join('');
    return {
        xml: `${CLAIM_SUBMISSION_ROOT_OPEN}${headerXml}${claimsXml}</Claim.Submission>`,
        header: toDhpoHeader(header, entries.length),
    };
}

/**
 * @param {object} params
 * @param {{ workspace?: object, rawPayload?: object, resubmission?: object, formState?: object, claim?: object }[]} params.entries
 * @param {string} [params.senderId]
 * @param {string} [params.receiverId]
 * @param {string} [params.dispositionFlag]
 */
export function buildClaimsSubmissionXml(params = {}) {
    return buildClaimsSubmission(params).xml;
}

/**
 * @param {object} params
 * @param {object} params.workspace mapped claim workspace from claim-details API
 * @param {object} [params.rawPayload] unmapped API payload for header fields
 * @param {string} [params.senderId] page sender / insurer id
 * @param {string} [params.receiverId] page receiver / TPA id
 * @param {string} [params.dispositionFlag]
 * @param {{ type?: string, comment?: string, attachmentBase64?: string }} [params.resubmission]
 * @param {object} [params.formState]
 * @param {object} [params.claim]
 */
export function buildClaimSubmissionXml({
    workspace = {},
    rawPayload = {},
    senderId = '',
    receiverId = '',
    dispositionFlag = '',
    resubmission = {},
    formState = {},
    claim = {},
} = {}) {
    return buildClaimsSubmissionXml({
        entries: [{ workspace, rawPayload, resubmission, formState, claim }],
        senderId,
        receiverId,
        dispositionFlag,
    });
}

export function buildClaimsSubmissionFilename({ insuranceName = '', monthYear = '', recordCount = 0 } = {}) {
    const sanitize = (value) =>
        asText(value)
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

    const name = sanitize(insuranceName) || 'claims';
    const period = sanitize(monthYear) || 'period';
    const count = Math.max(0, Number(recordCount) || 0);
    return `${name}-${period}-(${count}).xml`;
}

function isInlineTag(line) {
    return /^<[^/!?][^>]*>.*<\/[^>]+>$/.test(line) || line.endsWith('/>');
}

export function prettyPrintXml(xmlString) {
    const source = asText(xmlString).replace(/>\s*</g, '><');
    if (!source) return '';

    const lines = source.replace(/</g, '\n<').split('\n').filter(Boolean);
    let indent = 0;
    return lines
        .map((line) => {
            if (line.startsWith('</')) indent = Math.max(0, indent - 1);
            const formatted = `${'  '.repeat(indent)}${line}`;
            if (!line.startsWith('</') && !line.startsWith('<?') && !line.startsWith('<!') && !isInlineTag(line)) {
                indent += 1;
            }
            return formatted;
        })
        .join('\n');
}

function xmlBlobUrl(xmlString, type) {
    const xml = prettyPrintXml(xmlString);
    if (!xml) return { xml: '', url: '' };
    const blob = new Blob([xml], { type });
    return { xml, url: URL.createObjectURL(blob) };
}

export function openXmlPreview(xmlString, filename = 'claim-submission.xml') {
    const xml = asText(xmlString);
    if (!xml) return false;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.rel = 'noopener';
        link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
}

export function downloadXmlFile(xmlString, filename = 'claim-submission.xml') {
    const { xml, url } = xmlBlobUrl(xmlString, 'application/xml;charset=utf-8');
    if (!xml || !url) return false;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
}
