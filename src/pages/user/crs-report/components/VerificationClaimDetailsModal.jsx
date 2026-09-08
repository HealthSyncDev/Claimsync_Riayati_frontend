import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    X,
    IdCard,
    Plus,
    Trash2,
    FileText,
    Paperclip,
    Stethoscope,
    MessageSquare,
    Check,
    StickyNote,
    Files,
    Upload,
    ClipboardList,
    Loader2,
    CalendarClock,
    Layers,
    ExternalLink,
    Search,
} from 'lucide-react';

import { fileToBase64 } from '../claimSubmissionXml';

const ICD_LIBRARY = [
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
    { code: 'I10', description: 'Essential (primary) hypertension' },
    { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
    { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
    { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
    { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis' },
    { code: 'M54.5', description: 'Low back pain' },
    { code: 'J45.909', description: 'Unspecified asthma, uncomplicated' },
    { code: 'E66.9', description: 'Obesity, unspecified' },
    { code: 'N18.3', description: 'Chronic kidney disease, stage 3 (moderate)' },
    { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' },
    { code: 'Z79.4', description: 'Long term (current) use of insulin' },
    { code: 'K29.70', description: 'Gastritis, unspecified, without bleeding' },
    { code: 'E78.2', description: 'Mixed hyperlipidemia' },
    { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },
];

const COMMENT_TYPES = [
    'Medical Justification',
    'Clarification',
    'Duplicate Appeal',
    'Missing Document',
    'Coding Correction',
    'Other',
];

const OBS_TYPES = ['File', 'Grouping', 'Result', 'ROM', 'Text', 'Universal Dental'];
const OBS_VALUE_TYPES = ['Boolean', 'Code', 'Date', 'Decimal', 'Duration', 'File', 'Integer', 'String', 'Time'];
const RESUB_TYPES = ['correction', 'internal complaint', 'legacy', 'reconciliation'];
const ENCOUNTER_TYPES = ['Outpatient', 'Inpatient', 'Emergency'];

const TABS = [
    { id: 'details', label: 'Claim details', icon: IdCard },
    { id: 'encounter', label: 'Encounter', icon: CalendarClock },
    { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope },
    { id: 'observations', label: 'Activity / Observation', icon: Layers },
    { id: 'resubmission', label: 'Resubmission data', icon: ClipboardList },
];

let seq = 0;
function uid(prefix) {
    seq += 1;
    return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

function hashStr(s) {
    let h = 0;
    const str = String(s || '');
    for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
}

function formatFileSize(bytes) {
    if (typeof bytes === 'string') return bytes;
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function dash(v) {
    return v == null || String(v).trim() === '' ? '—' : String(v);
}

function formatAmt(v) {
    if (v == null || String(v).trim() === '') return '—';
    const n = Number(String(v).replace(/,/g, ''));
    if (!Number.isFinite(n)) return dash(v);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matchOption(value, options) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const compact = raw.replace(/\s+/g, '').toLowerCase();
    return (
        options.find((opt) => opt.toLowerCase() === raw.toLowerCase()) ||
        options.find((opt) => opt.replace(/\s+/g, '').toLowerCase() === compact) ||
        raw
    );
}

function selectOptions(value, options) {
    const current = matchOption(value, options);
    if (current && !options.includes(current)) return [current, ...options];
    return options;
}

function isFileObs(obs) {
    return String(obs?.type || '').trim().toLowerCase() === 'file';
}

function obsTypeClass(obs) {
    if (isFileObs(obs)) return 'is-file';
    const t = String(obs?.type || '').toLowerCase();
    if (t.includes('file') || t.includes('pdf') || t.includes('image')) return 'is-file';
    if (t.includes('lab') || t.includes('result')) return 'is-lab';
    if (t.includes('note') || t.includes('comment')) return 'is-note';
    return 'is-text';
}

function activityKey(act, idx) {
    return act?.id || act?.activityId || `act-${idx}`;
}

function ActivityObsTable({ act, editing, onPatch, onRemove }) {
    const fileRef = useRef(null);
    const pendingIdx = useRef(null);
    const [busyIdx, setBusyIdx] = useState(null);
    const rows = act.observations || [];

    const onTypeChange = (idx, nextType, obs) => {
        const file = String(nextType).toLowerCase() === 'file';
        if (file) {
            onPatch(idx, { type: 'File', isFile: true, value: '', valueType: 'File' });
            return;
        }
        const nextValueType =
            String(obs?.valueType || '').toLowerCase() === 'file' ? 'String' : obs?.valueType || 'String';
        onPatch(idx, {
            type: nextType,
            isFile: false,
            fileData: '',
            fileName: '',
            fileSize: '',
            valueType: nextValueType,
        });
    };

    const onPickFile = (idx) => {
        pendingIdx.current = idx;
        fileRef.current?.click();
    };

    const onFileChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        const idx = pendingIdx.current;
        pendingIdx.current = null;
        if (!file || idx == null) return;
        setBusyIdx(idx);
        try {
            const base64 = await fileToBase64(file);
            onPatch(idx, {
                type: 'File',
                isFile: true,
                value: base64,
                valueType: 'File',
                fileData: base64,
                fileName: file.name,
                fileSize: formatFileSize(file.size),
            });
        } catch (err) {
            console.error('Observation file encode:', err);
        } finally {
            setBusyIdx(null);
        }
    };

    const openFile = (obs) => {
        const name = obs.fileName || `${act.activityId || 'observation'}.pdf`;
        if (/\.pdf$/i.test(name) || String(obs.valueType || '').toLowerCase().includes('pdf') || !obs.fileName) {
            openBase64Pdf(obs.fileData, name);
            return;
        }
        try {
            const binary = atob(String(obs.fileData || '').replace(/\s/g, ''));
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes]);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            link.rel = 'noopener';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 30_000);
        } catch (err) {
            console.error('Observation file open failed:', err);
        }
    };

    if (rows.length === 0) {
        return <div className="vcd-empty vcd-empty--tight">No observations on this activity.</div>;
    }
    return (
        <>
        <input
            ref={fileRef}
            type="file"
            hidden
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
            onChange={onFileChange}
        />
        <table className="vcd-info-table vcd-info-table--compact">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Code</th>
                    <th>Value</th>
                    <th>Value Type</th>
                    {editing ? <th className="vcd-col-actions"> </th> : null}
                </tr>
            </thead>
            <tbody>
                {rows.map((obs, i) => {
                    const fileObs = isFileObs(obs);
                    const typeValue = matchOption(obs.type, OBS_TYPES) || 'Text';
                    const valueTypeValue =
                        matchOption(obs.valueType, OBS_VALUE_TYPES) || (fileObs ? 'File' : 'String');
                    return (
                    <tr key={obs.id || `${activityKey(act, 0)}-obs-${i}`}>
                        <td>
                            {editing ? (
                                <CellSelect
                                    value={typeValue}
                                    options={selectOptions(typeValue, OBS_TYPES)}
                                    onChange={(v) => onTypeChange(i, v, obs)}
                                />
                            ) : (
                                <span className={`vcd-dx-type ${obsTypeClass(obs)}`}>{dash(obs.type)}</span>
                            )}
                        </td>
                        <td>
                            {editing ? (
                                <CellInput value={obs.code} onChange={(v) => onPatch(i, { code: v })} />
                            ) : (
                                dash(obs.code)
                            )}
                        </td>
                        <td>
                            {fileObs ? (
                                editing ? (
                                    <div className="vcd-obs-file">
                                        {obs.fileName ? (
                                            <span className="vcd-obs-file-name" title={obs.fileName}>
                                                {obs.fileName}
                                                {obs.fileSize ? ` · ${obs.fileSize}` : ''}
                                            </span>
                                        ) : obs.fileData ? (
                                            <span className="vcd-obs-file-name">Attached file</span>
                                        ) : null}
                                        {obs.fileData ? (
                                            <button
                                                type="button"
                                                className="vcd-ghost-btn vcd-pdf-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openFile(obs);
                                                }}
                                            >
                                                <ExternalLink size={13} aria-hidden />
                                                View
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            className="vcd-ghost-btn"
                                            onClick={() => onPickFile(i)}
                                            disabled={busyIdx === i}
                                        >
                                            {busyIdx === i ? (
                                                <Loader2 size={13} className="vcd-state-spin" aria-hidden />
                                            ) : (
                                                <Upload size={13} aria-hidden />
                                            )}
                                            {obs.fileData ? 'Replace' : 'Upload file'}
                                        </button>
                                    </div>
                                ) : (
                                <button
                                    type="button"
                                    className="vcd-ghost-btn vcd-pdf-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openFile(obs);
                                    }}
                                    disabled={!obs.fileData}
                                >
                                    <ExternalLink size={13} aria-hidden />
                                    View PDF
                                </button>
                                )
                            ) : editing ? (
                                <CellInput value={obs.value} onChange={(v) => onPatch(i, { value: v })} />
                            ) : (
                                dash(obs.value)
                            )}
                        </td>
                        <td>
                            {editing ? (
                                <CellSelect
                                    value={valueTypeValue}
                                    options={selectOptions(valueTypeValue, OBS_VALUE_TYPES)}
                                    onChange={(v) => onPatch(i, { valueType: v })}
                                />
                            ) : (
                                dash(obs.valueType)
                            )}
                        </td>
                        {editing ? (
                            <td className="vcd-col-actions">
                                <button
                                    type="button"
                                    className="vcd-icon-btn vcd-icon-btn--sm vcd-icon-btn--danger"
                                    aria-label="Remove observation"
                                    onClick={() => onRemove(i)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </td>
                        ) : null}
                    </tr>
                    );
                })}
            </tbody>
        </table>
        </>
    );
}

function specTitle(value, kind) {
    if (kind === 'clinician' && value && typeof value === 'object') {
        const name = dash(value.name);
        const id = dash(value.id);
        if (name !== '—' && id !== '—') return `${name} · ${id}`;
        return name !== '—' ? name : id;
    }
    return dash(value);
}

function SpecList({ rows }) {
    return (
        <div className="vcd-spec">
            {rows.map(([label, value, kind]) => (
                <div key={label} className="vcd-spec-row">
                    <span className="vcd-spec-label">{label}</span>
                    {kind === 'clinician' && value && typeof value === 'object' ? (
                        <span className="vcd-spec-value is-clinician" title={specTitle(value, kind)}>
                            {value.name ? <span className="vcd-clinician-name">{dash(value.name)}</span> : null}
                            {value.id ? <span className="vcd-clinician-id">{dash(value.id)}</span> : null}
                            {!value.name && !value.id ? '—' : null}
                        </span>
                    ) : (
                        <span className={`vcd-spec-value${kind ? ` is-${kind}` : ''}`} title={specTitle(value, kind)}>
                            {dash(value)}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

export function openBase64Pdf(raw, filename = 'observation.pdf') {
    const source = String(raw || '').trim();
    if (!source) return;
    const payload = source.includes(',') ? source.slice(source.indexOf(',') + 1) : source;
    const clean = payload.replace(/\s/g, '');
    try {
        const binary = atob(clean);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
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
    } catch (err) {
        console.error('PDF decode failed:', err);
    }
}

export function createDummyClaimWorkspace(claim) {
    const h = hashStr(claim?.claimId);
    const principal = ICD_LIBRARY[h % ICD_LIBRARY.length];
    const secondaryA = ICD_LIBRARY[(h + 3) % ICD_LIBRARY.length];
    const secondaryB = ICD_LIBRARY[(h + 7) % ICD_LIBRARY.length];
    const names = ['Fatima Al Maktoum', 'Omar Al Suwaidi', 'Layla Rahman', 'Hassan Al Zaabi'];
    const facilities = ['Al Noor Medical Center', 'City Hospital OP', 'Emirates Specialty Clinic'];
    const clinicians = ['Dr. Layla Hassan', 'Dr. Karim Nasser', 'Dr. Aisha Farouk'];
    const payers = ['Daman', 'Oman Insurance', 'AXA Gulf', 'NAS'];

    return {
        details: {
            patientName: claim?.patientName || names[h % names.length],
            memberId: `MBR-${100000 + (h % 900000)}`,
            emiratesId: `784-19${h % 10}0-${String(1000000 + (h % 8999999)).slice(0, 7)}-${h % 9}`,
            encounterType: ENCOUNTER_TYPES[h % 2],
            encounterStart: '2026-07-14',
            encounterEnd: h % 3 === 0 ? '2026-07-16' : '2026-07-14',
            facility: facilities[h % facilities.length],
            clinician: clinicians[h % clinicians.length],
            payerName: payers[h % payers.length],
            invoiceNo: claim?.claimId || '—',
            priorAuth: `PA-${800000 + (h % 99999)}`,
            transactionDate: claim?.remittanceTransactionDate || claim?.submissionTransactionDate || '2026-08-02',
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
        activities: [],
        principal: { id: 'principal', code: principal.code, description: principal.description },
        secondary: [
            { id: 'sec-1', code: secondaryA.code, description: secondaryA.description },
            { id: 'sec-2', code: secondaryB.code, description: secondaryB.description },
        ].filter((dx, i, arr) => arr.findIndex((x) => x.code === dx.code) === i && dx.code !== principal.code),
        observations: [
            {
                id: 'obs-1',
                type: 'text',
                title: 'Clinical justification',
                body: 'Patient presented with persistent dyslipidemia despite lifestyle measures. Lipid panel (CPT 80061) was medically necessary to titrate statin therapy.',
                createdAt: '12 Aug 2026',
            },
            {
                id: 'obs-2',
                type: 'file',
                title: 'Lipid panel report',
                fileName: 'lipid-panel-2026-07.pdf',
                fileSize: '246 KB',
                createdAt: '11 Aug 2026',
            },
            {
                id: 'obs-3',
                type: 'text',
                title: 'Denial response',
                body: 'Prior authorization PA on file. Service is not a duplicate — previous claim was for a different encounter date.',
                createdAt: '10 Aug 2026',
            },
        ],
        resubmission: {
            type: 'correction',
            commentType: 'Medical Justification',
            comments:
                'Kindly reprocess this rejection. Supporting clinical notes and the original lab report are attached. Diagnosis coding has been reviewed.',
            attachments: [{ id: 'att-1', name: 'resubmission-cover-letter.pdf', size: '86 KB' }],
        },
    };
}

function Field({ label, value, editing, onChange, type = 'text', options }) {
    return (
        <label className="vcd-field">
            <span>{label}</span>
            {editing ? (
                options ? (
                    <select value={value} onChange={(e) => onChange(e.target.value)}>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} />
                )
            ) : (
                <strong title={value || '—'}>{value || '—'}</strong>
            )}
        </label>
    );
}

function CellInput({ value, onChange, type = 'text', placeholder }) {
    return (
        <input
            className="vcd-cell-input"
            type={type}
            value={value || ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}

function CellSelect({ value, options, onChange }) {
    return (
        <select className="vcd-cell-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
            {options.map((opt) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
    );
}

function IcdPicker({ code, description, onChange }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const matches = useMemo(() => {
        const q = String(code || '').trim().toLowerCase();
        if (!q) return ICD_LIBRARY.slice(0, 6);
        return ICD_LIBRARY.filter(
            (row) =>
                row.code.toLowerCase().includes(q) || row.description.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [code]);

    useEffect(() => {
        const onDoc = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    return (
        <div className="vcd-dx-editor" ref={wrapRef}>
            <label className="vcd-field">
                <span>ICD-10 code</span>
                <input
                    value={code}
                    onChange={(e) => onChange({ code: e.target.value, description })}
                    onFocus={() => setOpen(true)}
                    placeholder="e.g. E11.9"
                    autoComplete="off"
                />
            </label>
            <label className="vcd-field vcd-field--grow">
                <span>Description</span>
                <input
                    value={description}
                    onChange={(e) => onChange({ code, description: e.target.value })}
                    placeholder="Diagnosis description"
                />
            </label>
            {open && matches.length > 0 && (
                <ul className="vcd-icd-list" role="listbox">
                    {matches.map((row) => (
                        <li key={row.code}>
                            <button
                                type="button"
                                onClick={() => {
                                    onChange(row);
                                    setOpen(false);
                                }}
                            >
                                <span className="vcd-dx-code">{row.code}</span>
                                <span>{row.description}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function VerificationClaimDetailsModal({
    claim,
    data,
    mode = 'edit',
    onChange,
    onClose,
}) {
    const [tab, setTab] = useState('details');
    const [dxDraft, setDxDraft] = useState(null);
    const [obsDraft, setObsDraft] = useState(null);
    const [actQuery, setActQuery] = useState('');
    const fileObsRef = useRef(null);
    const fileAttRef = useRef(null);
    const titleId = 'vcd-title';
    const readOnly = mode === 'view';
    const displayReadOnly = readOnly;
    const canEdit = !displayReadOnly;
    const visibleTabs = useMemo(
        () => (mode === 'edit' ? TABS.filter((item) => item.id !== 'resubmission') : TABS),
        [mode]
    );
    const isLoading = Boolean(data?.__loading);
    const loadError = data?.__error || '';
    const claimKey = claim?.claimId || claim?.id || '';
    const activities = data?.activities || [];
    const activityCount = activities.length;

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    const filteredActivities = useMemo(() => {
        const q = actQuery.trim().toLowerCase();
        const list = activities.map((act, idx) => ({ act, idx }));
        if (!q) return list;
        return list.filter(({ act }) =>
            [act.activityId, act.code, act.clinician, act.type, act.start, act.priorAuthId].some((v) =>
                String(v || '')
                    .toLowerCase()
                    .includes(q)
            )
        );
    }, [activities, actQuery]);

    useEffect(() => {
        setActQuery('');
    }, [claimKey]);

    useEffect(() => {
        if (mode === 'edit' && tab === 'resubmission') {
            setTab('details');
        }
    }, [mode, tab]);

    if (!data) return null;

    const patch = (partial) => onChange({ ...data, ...partial });
    const patchDetails = (key, value) =>
        patch({ details: { ...data.details, [key]: value } });
    const patchEncounter = (key, value) =>
        patch({ encounter: { ...(data.encounter || {}), [key]: value } });
    const patchResub = (key, value) =>
        patch({ resubmission: { ...data.resubmission, [key]: value } });
    const patchActivity = (idx, partial) =>
        patch({
            activities: activities.map((act, i) => (i === idx ? { ...act, ...partial } : act)),
        });
    const patchActivityObs = (actIdx, obsIdx, partial) => {
        const act = activities[actIdx];
        if (!act) return;
        patchActivity(actIdx, {
            observations: (act.observations || []).map((obs, i) => (i === obsIdx ? { ...obs, ...partial } : obs)),
        });
    };
    const removeActivityObs = (actIdx, obsIdx) => {
        const act = activities[actIdx];
        if (!act) return;
        patchActivity(actIdx, {
            observations: (act.observations || []).filter((_, i) => i !== obsIdx),
        });
    };
    const addActivityObs = (actIdx) => {
        const act = activities[actIdx];
        if (!act) return;
        patchActivity(actIdx, {
            observations: [
                ...(act.observations || []),
                { id: uid('obs'), type: 'Text', code: '', value: '', valueType: 'String', isFile: false, isNew: true },
            ],
        });
    };

    const saveDx = () => {
        if (!dxDraft) return;
        const next = {
            code: String(dxDraft.code || '').trim().toUpperCase(),
            description: String(dxDraft.description || '').trim(),
        };
        if (!next.code) return;
        if (dxDraft.kind === 'principal') {
            patch({ principal: { ...data.principal, ...next } });
        } else if (dxDraft.id) {
            patch({
                secondary: data.secondary.map((row) => (row.id === dxDraft.id ? { ...row, ...next } : row)),
            });
        } else {
            patch({ secondary: [...data.secondary, { id: uid('sec'), ...next }] });
        }
        setDxDraft(null);
    };

    const saveObs = () => {
        if (!obsDraft) return;
        const next = {
            title: String(obsDraft.title || '').trim() || (obsDraft.type === 'file' ? obsDraft.fileName : 'Observation'),
            body: obsDraft.body || '',
            type: obsDraft.type,
            fileName: obsDraft.fileName,
            fileSize: obsDraft.fileSize,
            createdAt: obsDraft.createdAt || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        };
        if (obsDraft.id) {
            patch({
                observations: data.observations.map((row) => (row.id === obsDraft.id ? { ...row, ...next } : row)),
            });
        } else {
            patch({ observations: [{ id: uid('obs'), ...next }, ...data.observations] });
        }
        setObsDraft(null);
    };

    const onPickObsFile = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        setObsDraft((prev) => ({
            id: prev?.id,
            type: 'file',
            title: prev?.title || file.name.replace(/\.[^.]+$/, ''),
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            body: '',
            createdAt: prev?.createdAt || today,
        }));
        setTab('observations');
    };

    const onPickAttachment = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        patchResub('attachments', [
            { id: uid('att'), name: file.name, size: formatFileSize(file.size) },
            ...data.resubmission.attachments,
        ]);
    };

    const diagnosisRows =
        Array.isArray(data.diagnoses) && data.diagnoses.length > 0
            ? data.diagnoses
            : [
                  data.principal?.code
                      ? { id: 'principal', type: data.principal.type || 'Principal', code: data.principal.code, principal: true }
                      : null,
                  ...(data.secondary || []).map((row) => ({
                      ...row,
                      type: row.type || 'Secondary',
                      principal: false,
                  })),
              ].filter(Boolean);
    const setDiagnoses = (rows) => {
        const normalized = rows.map((row, i) => {
            const type = row.type || 'Secondary';
            const principal = Boolean(row.principal) || String(type).toLowerCase().includes('principal');
            return { ...row, id: row.id || `dx-${i + 1}`, type, principal };
        });
        const principalRow = normalized.find((row) => row.principal);
        patch({
            diagnoses: normalized,
            principal: principalRow
                ? { id: 'principal', code: principalRow.code || '', type: principalRow.type || 'Principal' }
                : { id: 'principal', code: '', type: 'Principal' },
            secondary: normalized.filter((row) => !row.principal),
        });
    };
    const patchDiagnosis = (rowId, partial) => {
        setDiagnoses(diagnosisRows.map((row) => ((row.id || row.code) === rowId ? { ...row, ...partial } : row)));
    };
    const dxCount = diagnosisRows.length;
    const obsCount = activityCount;
    const resubRows = Array.isArray(data.resubmissions) ? data.resubmissions : [];
    const attCount = resubRows.length;

    return (
        <div className="vcd-overlay" onClick={onClose} role="presentation">
            <div
                className={`vcd-modal${displayReadOnly ? ' is-readonly' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="vcd-header">
                    <div className="vcd-header-main">
                        <h2 id={titleId} className="vcd-title">
                            {readOnly ? 'View claim details' : 'Edit claim details'}
                        </h2>
                        {claim?.claimCycle != null && (
                            <div className="vcd-header-meta">
                                <span className="vcd-chip vcd-chip--cycle">Cycle {claim.claimCycle}</span>
                            </div>
                        )}
                    </div>
                    <button type="button" className="vcd-icon-btn" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </header>

                <nav className="vcd-tabs" aria-label="Claim sections">
                    {visibleTabs.map((item) => {
                        const Icon = item.icon;
                        const count =
                            item.id === 'diagnosis' ? dxCount : item.id === 'observations' ? obsCount : item.id === 'resubmission' ? attCount : null;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`vcd-tab vcd-tab--${item.id}${tab === item.id ? ' is-active' : ''}`}
                                aria-selected={tab === item.id}
                                onClick={() => setTab(item.id)}
                            >
                                <Icon size={14} strokeWidth={2} aria-hidden />
                                {item.label}
                                {count != null && <span className="vcd-tab-count">{count}</span>}
                            </button>
                        );
                    })}
                </nav>

                <div className="vcd-body">
                    {isLoading ? (
                        <div className="vcd-state" role="status">
                            <Loader2 size={18} className="vcd-state-spin" aria-hidden />
                            Loading claim details…
                        </div>
                    ) : loadError ? (
                        <div className="vcd-state vcd-state--error" role="alert">
                            {loadError}
                        </div>
                    ) : (
                    <>
                    {tab === 'details' && (
                        <section className="vcd-section">
                            <div className="vcd-panel">
                                {canEdit ? (
                            <div className="vcd-grid vcd-grid--3">
                                <Field
                                    label="Claim Invoice ID"
                                    value={data.details?.claimInvoiceId}
                                    editing
                                    onChange={(v) => patchDetails('claimInvoiceId', v)}
                                />
                                <Field
                                    label="Member ID"
                                    value={data.details?.memberId}
                                    editing
                                    onChange={(v) => patchDetails('memberId', v)}
                                />
                                <Field
                                    label="Emirates ID"
                                    value={data.details?.emiratesIdNumber}
                                    editing
                                    onChange={(v) => patchDetails('emiratesIdNumber', v)}
                                />
                                <Field
                                    label="Payer ID"
                                    value={data.details?.payerId}
                                    editing
                                    onChange={(v) => patchDetails('payerId', v)}
                                />
                                <Field
                                    label="ID Payer"
                                    value={data.details?.idPayer}
                                    editing
                                    onChange={(v) => patchDetails('idPayer', v)}
                                />
                                <Field
                                    label="Provider ID"
                                    value={data.details?.providerId}
                                    editing
                                    onChange={(v) => patchDetails('providerId', v)}
                                />
                                <Field
                                    label="Gross"
                                    value={data.details?.gross}
                                    editing
                                    onChange={(v) => patchDetails('gross', v)}
                                />
                                <Field
                                    label="Patient Share"
                                    value={data.details?.patientShare}
                                    editing
                                    onChange={(v) => patchDetails('patientShare', v)}
                                />
                                <Field
                                    label="Net"
                                    value={data.details?.net}
                                    editing
                                    onChange={(v) => patchDetails('net', v)}
                                />
                            </div>
                                ) : (
                                    <div className="vcd-sheet">
                                        <SpecList
                                            rows={[
                                                ['Claim Invoice ID', data.details?.claimInvoiceId, 'id'],
                                                ['Member ID', data.details?.memberId, 'id'],
                                                ['Emirates ID', data.details?.emiratesIdNumber, 'id'],
                                                ['Payer ID', data.details?.payerId],
                                                ['ID Payer', data.details?.idPayer, 'id'],
                                                ['Provider ID', data.details?.providerId, 'id'],
                                                ['Gross', data.details?.gross, 'amt'],
                                                ['Patient Share', data.details?.patientShare, 'amt'],
                                                ['Net', data.details?.net, 'amt'],
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {tab === 'encounter' && (
                        <section className="vcd-section">
                            <div className="vcd-panel">
                                {canEdit ? (
                                    <div className="vcd-grid vcd-grid--3">
                                        <Field
                                            label="Facility ID"
                                            value={data.encounter?.facilityId}
                                            editing
                                            onChange={(v) => patchEncounter('facilityId', v)}
                                        />
                                        <Field
                                            label="Patient ID"
                                            value={data.encounter?.patientId}
                                            editing
                                            onChange={(v) => patchEncounter('patientId', v)}
                                        />
                                        <Field
                                            label="Type"
                                            value={data.encounter?.type}
                                            editing
                                            onChange={(v) =>
                                                patch({
                                                    encounter: {
                                                        ...(data.encounter || {}),
                                                        type: v,
                                                        typeDisplay: v,
                                                    },
                                                })
                                            }
                                        />
                                        <Field
                                            label="Start Type"
                                            value={data.encounter?.startType}
                                            editing
                                            onChange={(v) =>
                                                patch({
                                                    encounter: {
                                                        ...(data.encounter || {}),
                                                        startType: v,
                                                        startTypeDisplay: v,
                                                    },
                                                })
                                            }
                                        />
                                        <Field
                                            label="End Type"
                                            value={data.encounter?.endType}
                                            editing
                                            onChange={(v) =>
                                                patch({
                                                    encounter: {
                                                        ...(data.encounter || {}),
                                                        endType: v,
                                                        endTypeDisplay: v,
                                                    },
                                                })
                                            }
                                        />
                                        <Field
                                            label="Start"
                                            value={data.encounter?.start}
                                            editing
                                            onChange={(v) => patchEncounter('start', v)}
                                        />
                                        <Field
                                            label="End"
                                            value={data.encounter?.end}
                                            editing
                                            onChange={(v) => patchEncounter('end', v)}
                                        />
                                    </div>
                                ) : (
                                <div className="vcd-sheet vcd-sheet--wrap">
                                    <SpecList
                                        rows={[
                                            ['Facility ID', data.encounter?.facilityId, 'id'],
                                            ['Patient ID', data.encounter?.patientId, 'id'],
                                            ['Type', data.encounter?.typeDisplay || data.encounter?.type],
                                            ['Start Type', data.encounter?.startTypeDisplay || data.encounter?.startType],
                                            ['End Type', data.encounter?.endTypeDisplay || data.encounter?.endType],
                                            ['Start', data.encounter?.start],
                                            ['End', data.encounter?.end],
                                        ]}
                                    />
                                </div>
                                )}
                            </div>
                        </section>
                    )}

                    {tab === 'diagnosis' && (
                        <section className="vcd-section">
                            {canEdit && (
                                <div className="vcd-section-head">
                                    <div>
                                        <h3>Diagnoses</h3>
                                    </div>
                                    <button
                                        type="button"
                                        className="vcd-ghost-btn"
                                        onClick={() =>
                                            setDiagnoses([
                                                ...diagnosisRows,
                                                { id: uid('dx'), type: 'Secondary', code: '', principal: false, isNew: true },
                                            ])
                                        }
                                    >
                                        <Plus size={13} aria-hidden />
                                        Add diagnosis
                                    </button>
                                </div>
                            )}
                            {diagnosisRows.length === 0 ? (
                                <div className="vcd-empty">No diagnoses on this claim.</div>
                            ) : (
                                <div className="vcd-panel">
                                <table className="vcd-info-table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Code</th>
                                            {canEdit ? <th className="vcd-col-actions"> </th> : null}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diagnosisRows.map((row) => {
                                            const principal =
                                                row.principal ||
                                                String(row.type || '').toLowerCase().includes('principal');
                                            const rowId = row.id || row.code;
                                            return (
                                            <tr
                                                key={rowId}
                                                className={principal ? 'is-principal' : 'is-secondary'}
                                            >
                                                <td>
                                                    {canEdit ? (
                                                        <CellInput
                                                            value={row.type || (principal ? 'Principal' : 'Secondary')}
                                                            onChange={(v) =>
                                                                patchDiagnosis(rowId, {
                                                                    type: v,
                                                                    principal: String(v)
                                                                        .toLowerCase()
                                                                        .includes('principal'),
                                                                })
                                                            }
                                                        />
                                                    ) : (
                                                    <span
                                                        className={`vcd-dx-type${principal ? ' is-principal' : ''}`}
                                                    >
                                                        {row.type || (principal ? 'Principal' : 'Secondary')}
                                                    </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {canEdit ? (
                                                        <CellInput
                                                            value={row.code}
                                                            onChange={(v) => patchDiagnosis(rowId, { code: v })}
                                                        />
                                                    ) : (
                                                    <span className="vcd-dx-code">{row.code || '—'}</span>
                                                    )}
                                                </td>
                                                {canEdit ? (
                                                    <td className="vcd-col-actions">
                                                        <button
                                                            type="button"
                                                            className="vcd-icon-btn vcd-icon-btn--sm vcd-icon-btn--danger"
                                                            aria-label="Remove diagnosis"
                                                            onClick={() =>
                                                                setDiagnoses(
                                                                    diagnosisRows.filter(
                                                                        (item) => (item.id || item.code) !== rowId
                                                                    )
                                                                )
                                                            }
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                ) : null}
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                </div>
                            )}
                        </section>
                    )}

                    {tab === 'observations' && (
                        <section className="vcd-section">
                            {activityCount === 0 ? (
                                <div className="vcd-empty">No activities on this claim.</div>
                            ) : (
                                <>
                                    {activityCount > 3 && (
                                        <label className="vcd-act-search">
                                            <Search size={15} aria-hidden />
                                            <input
                                                type="search"
                                                value={actQuery}
                                                onChange={(e) => setActQuery(e.target.value)}
                                                placeholder="Search activities…"
                                                aria-label="Search activities"
                                            />
                                        </label>
                                    )}

                                    {filteredActivities.length === 0 ? (
                                        <div className="vcd-empty">No activities match your search.</div>
                                    ) : (
                                        <div className="vcd-act-wrap">
                                            <div className="vcd-act-wrap-bar">
                                                <span className="vcd-act-wrap-count">
                                                    {filteredActivities.length}{' '}
                                                    {filteredActivities.length === 1 ? 'activity' : 'activities'}
                                                </span>
                                            </div>
                                            <ul className="vcd-act-list" aria-label="Activities">
                                                {filteredActivities.map(({ act, idx }) => {
                                                    const key = activityKey(act, idx);
                                                    const obsLen = (act.observations || []).length;
                                                    return (
                                                        <li
                                                            key={key}
                                                            className={`vcd-act-card vcd-act-card--${idx % 4}`}
                                                        >
                                                            <div className="vcd-act-card-head">
                                                                <span className="vcd-act-card-num">{idx + 1}</span>
                                                                <div className="vcd-act-card-head-main">
                                                                    <span className="vcd-act-card-label">Activity ID</span>
                                                                    {canEdit ? (
                                                                        <input
                                                                            className="vcd-cell-input"
                                                                            value={act.activityId || ''}
                                                                            onChange={(e) =>
                                                                                patchActivity(idx, {
                                                                                    activityId: e.target.value,
                                                                                })
                                                                            }
                                                                        />
                                                                    ) : (
                                                                    <span
                                                                        className="vcd-act-card-id"
                                                                        title={dash(act.activityId)}
                                                                    >
                                                                        {dash(act.activityId)}
                                                                    </span>
                                                                    )}
                                                                </div>
                                                                <div className="vcd-act-card-head-side">
                                                                    <div className="vcd-act-card-stat">
                                                                        <span className="vcd-act-card-label">Net</span>
                                                                        {canEdit ? (
                                                                            <input
                                                                                className="vcd-cell-input vcd-cell-input--amt"
                                                                                value={act.net || ''}
                                                                                onChange={(e) =>
                                                                                    patchActivity(idx, {
                                                                                        net: e.target.value,
                                                                                    })
                                                                                }
                                                                            />
                                                                        ) : (
                                                                        <span className="vcd-act-card-net">
                                                                            {formatAmt(act.net)}
                                                                        </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="vcd-act-card-stat">
                                                                        <span className="vcd-act-card-label">Obs</span>
                                                                        <span
                                                                            className={`vcd-act-obs-pill${obsLen ? '' : ' is-zero'}`}
                                                                        >
                                                                            {obsLen}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="vcd-act-card-body">
                                                                {canEdit ? (
                                                                    <div className="vcd-grid vcd-grid--3">
                                                                        <Field
                                                                            label="Code"
                                                                            value={act.code}
                                                                            editing
                                                                            onChange={(v) =>
                                                                                patchActivity(idx, { code: v })
                                                                            }
                                                                        />
                                                                        <Field
                                                                            label="Start"
                                                                            value={act.start}
                                                                            editing
                                                                            onChange={(v) =>
                                                                                patchActivity(idx, { start: v })
                                                                            }
                                                                        />
                                                                        <Field
                                                                            label="Type"
                                                                            value={act.type}
                                                                            editing
                                                                            onChange={(v) =>
                                                                                patchActivity(idx, {
                                                                                    type: v,
                                                                                    typeDisplay: v,
                                                                                })
                                                                            }
                                                                        />
                                                                        <Field
                                                                            label="Clinician name"
                                                                            value={act.clinicianName}
                                                                            editing
                                                                            onChange={(v) =>
                                                                                patchActivity(idx, {
                                                                                    clinicianName: v,
                                                                                })
                                                                            }
                                                                        />
                                                                        <Field
                                                                            label="Clinician ID"
                                                                            value={act.clinician}
                                                                            editing
                                                                            onChange={(v) =>
                                                                                patchActivity(idx, { clinician: v })
                                                                            }
                                                                        />
                                                                        <Field
                                                                            label="Prior auth"
                                                                            value={act.priorAuthId}
                                                                            editing
                                                                            onChange={(v) =>
                                                                                patchActivity(idx, {
                                                                                    priorAuthId: v,
                                                                                })
                                                                            }
                                                                        />
                                                                        <Field
                                                                            label="Quantity"
                                                                            value={act.quantity}
                                                                            editing
                                                                            onChange={(v) =>
                                                                                patchActivity(idx, { quantity: v })
                                                                            }
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                <div className="vcd-sheet">
                                                                    <SpecList
                                                                        rows={[
                                                                            ['Code', act.code],
                                                                            ['Start', act.start],
                                                                            ['Type', act.typeDisplay || act.type],
                                                                            [
                                                                                'Clinician',
                                                                                {
                                                                                    name: act.clinicianName,
                                                                                    id: act.clinician,
                                                                                },
                                                                                'clinician',
                                                                            ],
                                                                            ['Prior auth', act.priorAuthId, 'id'],
                                                                            ['Quantity', act.quantity, 'amt'],
                                                                        ]}
                                                                    />
                                                                </div>
                                                                )}

                                                                <div className="vcd-act-obs-block">
                                                                    <div className="vcd-act-obs-head">
                                                                        <p className="vcd-act-obs-title">Observations</p>
                                                                        {canEdit ? (
                                                                            <button
                                                                                type="button"
                                                                                className="vcd-ghost-btn"
                                                                                onClick={() => addActivityObs(idx)}
                                                                            >
                                                                                <Plus size={13} aria-hidden />
                                                                                Add observation
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                    {(act.observations || []).length === 0 ? (
                                                                        <p className="vcd-act-obs-empty">None</p>
                                                                    ) : (
                                                                        <div className="vcd-panel">
                                                                            <ActivityObsTable
                                                                                act={act}
                                                                                editing={canEdit}
                                                                                onPatch={(obsIdx, partial) =>
                                                                                    patchActivityObs(
                                                                                        idx,
                                                                                        obsIdx,
                                                                                        partial
                                                                                    )
                                                                                }
                                                                                onRemove={(obsIdx) =>
                                                                                    removeActivityObs(idx, obsIdx)
                                                                                }
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    )}

                    {tab === 'resubmission' && (
                        <section className="vcd-section">
                            {displayReadOnly ? (
                                resubRows.length === 0 ? (
                                    <div className="vcd-empty">No resubmission data on this claim.</div>
                                ) : (
                                    <div className="vcd-panel">
                                        <table className="vcd-info-table vcd-info-table--resub">
                                            <thead>
                                                <tr>
                                                    <th>Resubmission Type</th>
                                                    <th>Comment</th>
                                                    <th>Attachment</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {resubRows.map((row, idx) => (
                                                    <tr key={row.id}>
                                                        <td>
                                                            <span className="vcd-dx-type is-resub">
                                                                {dash(row.type)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <p className="vcd-resub-comment">{dash(row.comment)}</p>
                                                        </td>
                                                        <td>
                                                            {row.fileData ? (
                                                                <button
                                                                    type="button"
                                                                    className="vcd-ghost-btn vcd-pdf-btn"
                                                                    onClick={() =>
                                                                        openBase64Pdf(
                                                                            row.fileData,
                                                                            `resubmission-${idx + 1}.pdf`
                                                                        )
                                                                    }
                                                                >
                                                                    <ExternalLink size={13} aria-hidden />
                                                                    View PDF
                                                                </button>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                            <div className="vcd-panel vcd-panel--resub vcd-panel--form">

                            <div className="vcd-grid vcd-grid--resub">
                                <label className="vcd-field">
                                    <span>Resubmission type</span>
                                    <select
                                        value={data.resubmission?.type || ''}
                                        disabled={readOnly}
                                        onChange={(e) => patchResub('type', e.target.value)}
                                    >
                                        {RESUB_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="vcd-field">
                                    <span>Comment type</span>
                                    <select
                                        value={data.resubmission?.commentType || ''}
                                        disabled={readOnly}
                                        onChange={(e) => patchResub('commentType', e.target.value)}
                                    >
                                        {COMMENT_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <label className="vcd-field">
                                <span>Comments</span>
                                <textarea
                                    rows={4}
                                    value={data.resubmission?.comments || ''}
                                    readOnly={readOnly}
                                    onChange={(e) => patchResub('comments', e.target.value)}
                                    placeholder="Resubmission remarks…"
                                />
                            </label>

                            <div className="vcd-section-head vcd-section-head--sub">
                                <div>
                                    <h3>
                                        <MessageSquare size={14} aria-hidden /> Attachments
                                    </h3>
                                    <p>Files stay local until the API is connected.</p>
                                </div>
                                <>
                                <button type="button" className="vcd-ghost-btn" onClick={() => fileAttRef.current?.click()}>
                                    <Paperclip size={13} aria-hidden />
                                    Attach file
                                </button>
                                <input ref={fileAttRef} type="file" hidden onChange={onPickAttachment} />
                                </>
                            </div>

                            {(data.resubmission?.attachments || []).length === 0 ? (
                                <div className="vcd-empty">No attachments on this resubmission.</div>
                            ) : (
                                <ul className="vcd-att-list">
                                    {(data.resubmission?.attachments || []).map((file) => (
                                        <li key={file.id} className="vcd-file-chip">
                                            <FileText size={16} aria-hidden />
                                            <div>
                                                <strong>{file.name}</strong>
                                                <span>
                                                    {file.size} · {fileExt(file.name)}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className="vcd-icon-btn vcd-icon-btn--sm vcd-icon-btn--danger"
                                                aria-label={`Remove ${file.name}`}
                                                onClick={() =>
                                                    patchResub(
                                                        'attachments',
                                                        data.resubmission.attachments.filter((a) => a.id !== file.id)
                                                    )
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            </div>
                            )}
                        </section>
                    )}
                    </>
                    )}
                </div>

                <footer className="vcd-footer">
                    <button type="button" className="vcd-solid-btn" onClick={onClose}>
                        Done
                    </button>
                </footer>
            </div>
        </div>
    );
}
