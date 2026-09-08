/**
 * Reads every *.xml under ./xml (repo root), parses Claim.Submission files,
 * and writes public/activities-from-xml.json for ActivityList static mode.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const XML_DIR = path.join(ROOT, 'xml');
const OUT = path.join(ROOT, 'public', 'activities-from-xml.json');

const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    isArray: (name) => ['Claim', 'Activity', 'Diagnosis'].includes(name),
});

function ensureArray(x) {
    if (x == null) return [];
    return Array.isArray(x) ? x : [x];
}

function num(v) {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
}

function getSubmissionRoot(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed['Claim.Submission']) return parsed['Claim.Submission'];
    const k = Object.keys(parsed).find((key) => key.includes('Claim') && key.includes('Submission'));
    return k ? parsed[k] : parsed;
}

function principalDiagnosis(claim) {
    const diags = ensureArray(claim?.Diagnosis);
    const principal = diags.find((d) => d?.Type === 'Principal' || String(d?.Type || '').toLowerCase() === 'principal');
    return principal?.Code || '';
}

function extractFromFile(xmlString, sourceFile) {
    const out = [];
    let parsed;
    try {
        parsed = parser.parse(xmlString);
    } catch {
        return out;
    }
    const root = getSubmissionRoot(parsed);
    if (!root) return out;

    const header = root.Header || {};
    const transactionDate = header.TransactionDate || '';
    const receiverId = header.ReceiverID || header.ReceiverId || '';
    const senderId = header.SenderID || header.SenderId || '';
    const dispositionFlag = header.DispositionFlag || '';
    const recordCount = header.RecordCount;

    const claims = ensureArray(root.Claim);
    for (const claim of claims) {
        if (!claim || typeof claim !== 'object') continue;
        const claimId = claim.ID || claim.Id || claim.id;
        if (!claimId) continue;

        const encounter = claim.Encounter || {};
        const facilityId = encounter.FacilityID || encounter.FacilityId || '';
        const patientId = encounter.PatientID || encounter.PatientId || '';
        const encounterStart = encounter.Start || '';
        const encounterEnd = encounter.End || '';
        const encounterType = encounter.Type || '';

        const primaryDx = principalDiagnosis(claim);
        const grossClaim = num(claim.Gross);
        const netClaim = num(claim.Net);

        const claimShell = {
            id: String(claimId),
            claimId: String(claimId),
            facilityId: facilityId || undefined,
            providerId: claim.ProviderID || claim.ProviderId || undefined,
            payerId: claim.PayerID || claim.PayerId || undefined,
            idPayer: claim.IDPayer || claim.IdPayer || undefined,
            receiverId: receiverId || undefined,
            patientId: patientId || undefined,
            memberId: claim.MemberID || claim.MemberId || undefined,
            emiratesIdNumber: claim.EmiratesIDNumber || claim.EmiratesIdNumber || undefined,
            primaryDiagnosis: primaryDx || undefined,
            grossAmount: grossClaim,
            netAmount: netClaim,
            remittanceHeader: {
                transactionDate,
                receiverId: receiverId || undefined,
                senderId: senderId || undefined,
                dispositionFlag: dispositionFlag || undefined,
                recordCount: recordCount != null ? recordCount : undefined,
            },
            _xmlSourceFile: sourceFile,
        };

        const activities = ensureArray(claim.Activity);
        for (const act of activities) {
            if (!act || typeof act !== 'object') continue;
            const activityId = act.ID ?? act.Id;
            if (activityId == null) continue;

            const net = num(act.Net);
            const qty = num(act.Quantity);

            out.push({
                activityId: String(activityId),
                activityStart: act.Start || encounterStart || '',
                activityCode: act.Code != null ? String(act.Code) : '',
                activityType: act.Type != null ? String(act.Type) : '',
                quantity: qty !== undefined ? qty : act.Quantity,
                clinicianId: act.Clinician || act.ClinicianID || '',
                grossAmount: net,
                netAmount: net,
                paymentAmount: 0,
                denialCode: act.DenialCode || act.Denial || '',
                priorAuthorizationId: act.PriorAuthorizationID || act.PriorAuthorizationId || '',
                memberId: claim.MemberID || claim.MemberId,
                emiratesIdNumber: claim.EmiratesIDNumber || claim.EmiratesIdNumber,
                encounterType: encounterType || undefined,
                encounterStartDate: encounterStart || undefined,
                encounterEndDate: encounterEnd || undefined,
                primaryDiagnosis: primaryDx || undefined,
                claim: { ...claimShell },
            });
        }
    }
    return out;
}

function main() {
    if (!fs.existsSync(XML_DIR)) {
        console.error('Missing folder:', XML_DIR);
        process.exit(1);
    }
    const files = fs
        .readdirSync(XML_DIR)
        .filter((f) => f.toLowerCase().endsWith('.xml'))
        .map((f) => path.join(XML_DIR, f))
        .sort();

    const all = [];
    let skipped = 0;
    for (const filePath of files) {
        const st = fs.statSync(filePath);
        if (st.size === 0) {
            skipped++;
            continue;
        }
        const xml = fs.readFileSync(filePath, 'utf8');
        if (!xml.trim()) {
            skipped++;
            continue;
        }
        const base = path.basename(filePath);
        const rows = extractFromFile(xml, base);
        all.push(...rows);
        console.log(base, '→', rows.length, 'activities');
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(all), 'utf8');
    console.log('\nWrote', OUT);
    console.log('Total activities:', all.length, '| zero-byte xml skipped:', skipped);
}

main();
