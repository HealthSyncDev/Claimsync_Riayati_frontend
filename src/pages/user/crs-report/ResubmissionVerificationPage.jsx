import React, { useMemo, useState, useEffect, useCallback, useRef, memo, startTransition } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ChevronDown, Paperclip, Pencil, CheckCircle2, X, Loader2, ClipboardList, CircleDollarSign, IdCard, Eye, Repeat, ArrowRightCircle, Save, FileText, FileCode, Send, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../../utils/apiFetch';
import { usePortal } from '../../../context/PortalContext';
import { RESUBMISSION_COLUMNS } from './resubmissionDummyData';
import { mapPendingDisplayResponse, mapResubmittedDisplayResponse, mapClaimDetailsToWorkspace, claimDetailsLoadingWorkspace, claimDetailsErrorWorkspace, unwrapClaimDetailsEnvelope, unwrapClaimDetailsList, unwrapClaimDetailsPayload, buildClaimDetailsPutPayload, resolveLineActionValue, verificationFormStateFromClaim } from './resubmissionActivityMap';
import { buildClaimSubmissionXml, buildClaimsSubmission, buildClaimsSubmissionFilename, fileToBase64, openXmlPreview, downloadXmlFile } from './claimSubmissionXml';
import { formatAmount } from './resubmissionShared';
import { activityLineRejectionKind } from './resubmissionClaimStatus';
import { DEFAULT_RESUBMISSION_OFFICE_ID, useResubmissionList } from './ResubmissionListContext';
import { currentMonthValue, monthLabel, monthNumberParam } from './resubmissionMatrix';
import VerificationClaimDetailsModal, { createDummyClaimWorkspace, openBase64Pdf } from './components/VerificationClaimDetailsModal';
import './resubmission-report.css';
import './resubmission-verification.css';

/** Verification table column order + API-aligned labels. */
const VERIFICATION_COLUMN_KEYS = [
    'Status',
    'ActivityNumber',
    'ActivityCode',
    'GrossAmount',
    'NetAmount',
    'CoPayment',
    'NetApproved',
    'RejectedIfAny',
    'DenialCode',
    'RejectReason',
    'AuthNo',
];

/** Pending display API activity fields, current UI order kept, extras dropped, missing added. */
const PENDING_COLUMN_KEYS = [
    'ActivityNumber',
    'ActivityCode',
    'GrossAmount',
    'NetAmount',
    'CoPayment',
    'NetApproved',
    'RejectedIfAny',
    'DenialCode',
    'RejectReason',
    'AuthNo',
];

/** Resubmitted list columns. */
const RESUBMITTED_COLUMN_KEYS = [
    'ActivityNumber',
    'ActivityCode',
    'ActivityType',
    'ClinicianId',
    'GrossAmount',
    'NetAmount',
    'CoPayment',
    'AuthNo',
];

const VERIFICATION_COLUMN_LABELS = {
    ActivityNumber: 'Activity Number',
    ActivityCode: 'Activity Code',
    ActivityType: 'Type',
    ClinicianId: 'Clinician ID',
    ServiceDescriptionIcdCode: 'Service Description (CPT)',
    GrossAmount: 'Gross Amount',
    NetAmount: 'Net Amount',
    CoPayment: 'Patient Share',
    NetApproved: 'Payment Amount',
    RejectedIfAny: 'Rejected Amount',
    DenialCode: 'Denial Code',
    RejectReason: 'Denial Reason',
    AuthNo: 'Prior Auth ID',
};

const PENDING_COLUMN_LABELS = {
    ...VERIFICATION_COLUMN_LABELS,
    RejectedIfAny: 'Rejected Amount',
};

const RESUBMITTED_COLUMN_LABELS = {
    ...PENDING_COLUMN_LABELS,
    ActivityType: 'Type',
    ClinicianId: 'Clinician',
};

function columnsForBucket(isPending, isResubmitted = false) {
    const keys = isResubmitted
        ? RESUBMITTED_COLUMN_KEYS
        : isPending
          ? PENDING_COLUMN_KEYS
          : VERIFICATION_COLUMN_KEYS;
    const labels = isResubmitted
        ? RESUBMITTED_COLUMN_LABELS
        : isPending
          ? PENDING_COLUMN_LABELS
          : VERIFICATION_COLUMN_LABELS;
    return keys.map((key) => {
        const base = RESUBMISSION_COLUMNS.find((c) => c.key === key);
        return { key, label: labels[key] || base?.label || key };
    });
}

const NUMERIC_COLUMN_KEYS = new Set([
    'GrossAmount',
    'NetAmount',
    'CoPayment',
    'InsLiability',
    'NetApproved',
    'RejectedIfAny',
    'WriteoffAmt',
    'ResubLiability',
]);

const TEXT_COLUMN_KEYS = new Set([
    'Status',
    'ActivityNumber',
    'ActivityCode',
    'ActivityType',
    'ClinicianId',
    'ServiceDescriptionIcdCode',
    'DenialCode',
    'RejectReason',
    'AuthNo',
    'PriorAuthId',
]);

function rejectedActivitiesLabel(count) {
    return `${count} rejected activit${count === 1 ? 'y' : 'ies'}`;
}

const RESUBMISSION_BUCKETS = {
    pending: {
        key: 'pending',
        isPending: true,
        displayEndpoint: 'pending',
        crumb: 'Pending',
        eyebrow: 'Pending resubmission',
        pageTitle: 'Pending Claims',
        listTitle: 'Claims To Resubmit',
        emptyLabel: 'pending',
    },
    verification: {
        key: 'verification',
        isPending: false,
        displayEndpoint: 'verification',
        crumb: 'Verification',
        eyebrow: 'Line verification',
        pageTitle: 'Verification Claims',
        listTitle: 'Claims To Verify',
        emptyLabel: 'verification',
    },
    submit: {
        key: 'submit',
        isPending: false,
        displayEndpoint: 'submit',
        crumb: 'Submit',
        eyebrow: 'Ready to submit',
        pageTitle: 'Submit Claims',
        listTitle: 'Claims To Submit',
        emptyLabel: 'submit',
    },
    resubmitted: {
        key: 'resubmitted',
        isPending: false,
        displayEndpoint: 'resubmitted',
        crumb: 'Resubmitted',
        eyebrow: 'Sent to payer',
        pageTitle: 'Resubmitted Claims',
        listTitle: 'Resubmitted Claims',
        emptyLabel: 'resubmitted',
    },
};

function claimKey(claimId, claimIndex) {
    return `${claimId}-${claimIndex}`;
}

function keysHaveDirtyClaims(keys, claims, claimFormState) {
    return [...keys].some((key) => {
        const claimIndex = claims.findIndex((row, idx) => claimKey(row.claimId, idx) === key);
        if (claimIndex < 0) return false;
        return Boolean(claimFormState[claims[claimIndex].claimId]?.isDirty);
    });
}

function claimDetailsWorkspaceKey(claimId, claimIndex, mode) {
    return `${claimKey(claimId, claimIndex)}::${mode}`;
}

function workspaceNeedsTableIdRefresh(workspace = {}) {
    const diagnoses = Array.isArray(workspace.diagnoses) ? workspace.diagnoses : [];
    if (diagnoses.some((row) => row?.isNew && row.tableid == null)) return true;
    const activities = Array.isArray(workspace.activities) ? workspace.activities : [];
    for (const act of activities) {
        if (act?.isNew && act.tableid == null) return true;
        const observations = Array.isArray(act?.observations) ? act.observations : [];
        if (observations.some((obs) => obs?.isNew && obs.tableid == null)) return true;
    }
    const resubmissions = Array.isArray(workspace.resubmissions) ? workspace.resubmissions : [];
    return resubmissions.some((row) => row?.isNew && row.tableid == null);
}

function resolveClaimDetailsApiPath(pageBucket, mode) {
    if (pageBucket === 'submit') {
        return '/api/dashboard/resubmission-display/submit/claim-details';
    }
    if (pageBucket === 'verification' && mode === 'edit') {
        return '/api/dashboard/resubmission-display/verification/claim-details';
    }
    if (pageBucket === 'resubmitted') {
        return '/api/dashboard/resubmission-display/resubmitted/claim-details';
    }
    return '/api/dashboard/resubmission-display/claim-details';
}

function claimStatusMovePayload(claim, status) {
    return {
        ClaimID: String(claim?.claimId || '').trim(),
        RemittanceDate: String(claim?.remittanceTransactionDate || '').trim(),
        Status: status,
    };
}

function buildClaimStatusMoveBody(claimsToMove, status) {
    const claims = claimsToMove
        .map((claim) => claimStatusMovePayload(claim, status))
        .filter((row) => row.ClaimID && row.RemittanceDate);

    if (claims.length === 0) return null;
    return { claims };
}

function resubmissionDataId(claim) {
    const n = Number(claim?.resubmissionDataId ?? claim?.resubmission_data_id);
    return Number.isFinite(n) ? n : null;
}

function dhpoErrorMessage(payload, fallback) {
    if (!payload || typeof payload !== 'object') return fallback;
    return (
        String(
            payload.errorMessage || payload.message || payload.error || payload.detail || ''
        ).trim() || fallback
    );
}

function isDhpoSubmitSuccess(payload) {
    if (!payload || typeof payload !== 'object') return false;
    return String(payload.UploadTransactionResult ?? '').trim() === '0';
}

function normalizeDhpoErrorReport(report) {
    if (!report || typeof report !== 'string') return '';
    return report.replace(/\\r\\n/g, '\n').replace(/\r\n/g, '\n').trim();
}

function parseDhpoCsvLine(line, columnCount) {
    const parts = [];
    let rest = line;
    for (let i = 0; i < columnCount - 1; i += 1) {
        const idx = rest.indexOf(',');
        if (idx === -1) {
            parts.push(rest);
            return parts;
        }
        parts.push(rest.slice(0, idx));
        rest = rest.slice(idx + 1);
    }
    parts.push(rest);
    return parts;
}

function dhpoErrorReportEntries(report) {
    const text = normalizeDhpoErrorReport(report);
    if (!text) return [];

    const lines = text.split('\n').filter(Boolean);
    if (lines.length <= 1) return [text];

    const headers = parseDhpoCsvLine(lines[0], 7);
    const errorTextIndex = headers.findIndex((header) => header.trim() === 'ErrorText');

    return lines.slice(1).map((line) => {
        const values = parseDhpoCsvLine(line, headers.length);
        if (errorTextIndex >= 0 && values[errorTextIndex]) {
            return values[errorTextIndex].trim();
        }
        return values[values.length - 1]?.trim() || line.trim();
    }).filter(Boolean);
}

function DhpoResultDetailRow({ label, value, stacked = false }) {
    if (value == null || value === '') return null;
    return (
        <div className={`resub-dhpo-result-row${stacked ? ' resub-dhpo-result-row--stacked' : ''}`}>
            <span className="resub-dhpo-result-label">{label}</span>
            <span className="resub-dhpo-result-value">{value}</span>
        </div>
    );
}

function buildResubmissionStatusBody(claimsToMove, status) {
    const ids = claimsToMove.map(resubmissionDataId).filter((id) => id != null);
    if (ids.length === 0) return null;
    if (ids.length === 1) {
        return { resubmission_data_id: ids[0], status };
    }
    return { resubmission_data_ids: ids, status };
}

const RESUB_TYPES = ['', 'correction', 'internal complaint', 'legacy', 'reconciliation'];

const VerificationClaimCard = memo(function VerificationClaimCard({
    claim,
    claimIndex,
    isOpen,
    formState,
    columns,
    isPending,
    isVerification,
    isSubmit,
    isResubmitted,
    isSelected,
    onToggle,
    onToggleSelect,
    onClaimFormChange,
    onLeaveCorrection,
    onOpenClaimDetails,
    onMoveToVerification,
    onMoveBackToVerification,
    onConfirmToSubmit,
    onSaveAsDraft,
    onPreviewXml,
    onDownloadSubmissionFile,
    moveInProgress,
    confirmInProgress,
    saveDraftInProgress,
    previewXmlInProgress,
    downloadingSubmissionKey,
}) {
    const key = claimKey(claim.claimId, claimIndex);
    const panelId = `claim-panel-${key}`;
    const fileAttRef = useRef(null);
    const isEditing = Boolean(formState?.isEditing);
    const rejectedCount = claim.rejectedCount || 0;
    const rejectedTotal = claim.rejectedTotal || 0;

    const onPickAttachment = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (formState?.attachment?.name) return;
        try {
            const base64 = await fileToBase64(file);
            onClaimFormChange(claim.claimId, {
                attachment: {
                    name: file.name,
                    size: file.size,
                    file,
                    base64,
                },
            });
        } catch (err) {
            console.error('Attachment encode:', err);
            toast.error('Failed to read attachment file');
        }
    };

    const onRemoveAttachment = () => {
        onClaimFormChange(claim.claimId, { attachment: null });
    };

    const hasAttachment = Boolean(formState?.attachment?.base64 || formState?.attachment?.name);

    const openAttachment = () => {
        const raw = formState?.attachment?.base64;
        if (!raw) return;
        openBase64Pdf(raw, formState?.attachment?.name || 'attachment.pdf');
    };

    return (
        <article
            className={`verification-claim-card${isOpen ? ' is-open' : ''}${
                (isPending || isVerification) && isSelected ? ' is-selected' : ''
            }`}
        >
            <div className="verification-claim-header-wrap">
                {(isPending || isVerification) && (
                    <label
                        className="verification-claim-select"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            className="verification-claim-checkbox"
                            checked={Boolean(isSelected)}
                            onChange={() => onToggleSelect(key)}
                            disabled={moveInProgress || confirmInProgress}
                            aria-label={`Select claim ${claim.claimId}`}
                        />
                    </label>
                )}
                <button
                    type="button"
                    className="verification-claim-header"
                    onClick={() => onToggle(key)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                >
                <div className="verification-claim-id-wrap">
                    <span className="verification-claim-id">{claim.claimId}</span>
                    <span className="verification-claim-sub">
                        {isResubmitted ? (
                            claim.patientName ? `Patient ID: ${claim.patientName}` : '—'
                        ) : (
                            claim.patientName ||
                            claim.remittanceTransactionDate ||
                            claim.submissionTransactionDate ||
                            '—'
                        )}
                    </span>
                </div>
                <div className="verification-claim-meta">
                    {!isResubmitted && claim.claimCycle != null && (
                        <span className="resub-verify-claim-cycle" title={`Claim cycle ${claim.claimCycle}`}>
                            <Repeat size={12} strokeWidth={2.4} aria-hidden />
                            Cycle {claim.claimCycle}
                        </span>
                    )}
                    {!isResubmitted && rejectedTotal > 0 && (
                        <span className="resub-verify-claim-amt resub-verify-claim-amt--rej">
                            {formatAmount(rejectedTotal)} rej
                        </span>
                    )}
                    {!isResubmitted && (
                        <span className="resub-verify-claim-lines">{rejectedActivitiesLabel(rejectedCount)}</span>
                    )}
                    {isResubmitted && claim.claimNet != null && (
                        <span className="resub-verify-claim-net">
                            Net Amount: {formatAmount(claim.claimNet)}
                        </span>
                    )}
                    {isResubmitted &&
                        (claim.header?.TransactionDate || claim.submissionTransactionDate) && (
                            <span className="resub-verify-claim-txn-date">
                                Transaction Date:{' '}
                                {claim.header?.TransactionDate || claim.submissionTransactionDate}
                            </span>
                        )}
                </div>
                <span className="verification-claim-chevron" aria-hidden>
                    <ChevronDown size={18} strokeWidth={2.25} />
                </span>
            </button>
            </div>

            {isOpen && (
                <div id={panelId} className="verification-claim-body" role="region">
                    <div className="verification-claim-body-inner">
                        <div className="resub-v2-table-wrap verification-lines-wrap">
                            <div className="resub-verify-table-scroll" data-scroll-hint="Scroll for more columns">
                                <table
                                    className={`resub-v2-table verification-lines-table${
                                        isPending || isResubmitted ? ' verification-lines-table--pending' : ''
                                    }`}
                                >
                                    <thead>
                                        <tr>
                                            {columns.map((col) => (
                                                <th
                                                    key={col.key}
                                                    data-col={col.key}
                                                    className={TEXT_COLUMN_KEYS.has(col.key) ? 'left' : undefined}
                                                >
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {claim.activities.map((row, idx) => {
                                            const lineKind = activityLineRejectionKind(row);
                                            return (
                                                <tr
                                                    key={`${claim.claimId}-${idx}`}
                                                    className={`resub-verify-line resub-verify-line--${lineKind}`}
                                                >
                                                    {columns.map((col) => {
                                                        const cellClass = TEXT_COLUMN_KEYS.has(col.key) ? 'left' : undefined;
                                                        if (col.key === 'Status') {
                                                            const lineActions = formState?.lineActions || {};
                                                            const lineActionValue = resolveLineActionValue(
                                                                row,
                                                                lineActions,
                                                                idx
                                                            );
                                                            return (
                                                                <td key={col.key} data-col={col.key} className={cellClass}>
                                                                    {lineActionValue ? (
                                                                        <select
                                                                            className={`verification-status-select resub-verify-action-select resub-verify-action-select--${
                                                                                lineActionValue === 'Write-off'
                                                                                    ? 'writeoff'
                                                                                    : 'resubmit'
                                                                            }`}
                                                                            value={lineActionValue}
                                                                            onChange={(e) =>
                                                                                onClaimFormChange(claim.claimId, {
                                                                                    lineActions: {
                                                                                        ...lineActions,
                                                                                        [idx]: e.target.value,
                                                                                    },
                                                                                })
                                                                            }
                                                                        >
                                                                            <option value="Resubmit">Resubmit</option>
                                                                            <option value="Write-off">Write-off</option>
                                                                        </select>
                                                                    ) : (
                                                                        <span className="resubmission-cell-muted" />
                                                                    )}
                                                                </td>
                                                            );
                                                        }
                                                        if (col.key === 'ServiceDescriptionIcdCode') {
                                                            const service = row[col.key];
                                                            return (
                                                                <td
                                                                    key={col.key}
                                                                    data-col={col.key}
                                                                    className="left resub-verify-service"
                                                                >
                                                                    {service || '—'}
                                                                </td>
                                                            );
                                                        }
                                                        if (col.key === 'RejectReason') {
                                                            const reason = row[col.key];
                                                            return (
                                                                <td key={col.key} data-col={col.key} className={cellClass}>
                                                                    {reason ? (
                                                                        <span className="resub-verify-reason" title={reason}>
                                                                            {reason}
                                                                        </span>
                                                                    ) : (
                                                                        '—'
                                                                    )}
                                                                </td>
                                                            );
                                                        }
                                                        if (NUMERIC_COLUMN_KEYS.has(col.key)) {
                                                            return (
                                                                <td key={col.key} data-col={col.key}>
                                                                    {formatAmount(Number(row[col.key]) || 0)}
                                                                </td>
                                                            );
                                                        }
                                                        return (
                                                            <td key={col.key} data-col={col.key} className={cellClass}>
                                                                {row[col.key] || '—'}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {isVerification && (
                            <div className="verification-resub-panel">
                                <table className="verification-resub-table">
                                    <thead>
                                        <tr>
                                            <th>Resubmission Type</th>
                                            <th>Comment</th>
                                            <th>Attachment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <select
                                                    className="verification-resub-input verification-resub-select"
                                                    value={formState?.resubmissionType || ''}
                                                    onChange={(e) => {
                                                        const nextType = e.target.value;
                                                        const current = formState?.resubmissionType || '';
                                                        if (current === 'correction' && nextType !== 'correction') {
                                                            onLeaveCorrection?.(claim, claimIndex, nextType);
                                                            return;
                                                        }
                                                        onClaimFormChange(claim.claimId, {
                                                            resubmissionType: nextType,
                                                        });
                                                    }}
                                                >
                                                    <option value="">-- Select --</option>
                                                    {RESUB_TYPES.filter(Boolean).map((type) => (
                                                        <option key={type} value={type}>
                                                            {type}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="verification-resub-input verification-resub-text"
                                                    value={formState?.remarks || ''}
                                                    placeholder="Enter resubmission comment…"
                                                    onChange={(e) =>
                                                        onClaimFormChange(claim.claimId, {
                                                            remarks: e.target.value,
                                                        })
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <div className="verification-resub-attach">
                                                    {!hasAttachment ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="legacy-btn legacy-btn-light verification-resub-pdf-btn"
                                                                onClick={() => fileAttRef.current?.click()}
                                                            >
                                                                <Paperclip size={13} aria-hidden />
                                                                Attach file
                                                            </button>
                                                            <span className="verification-resub-file verification-resub-file--empty">
                                                                No file attached
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <div className="verification-resub-file-chip">
                                                            <FileText size={14} aria-hidden />
                                                            <button
                                                                type="button"
                                                                className="verification-resub-file verification-resub-file--link"
                                                                title={`Open ${formState.attachment.name || 'attachment'}`}
                                                                onClick={openAttachment}
                                                            >
                                                                {formState.attachment.name || 'attachment.pdf'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="verification-resub-file-remove"
                                                                onClick={onRemoveAttachment}
                                                                aria-label={`Remove ${formState.attachment.name}`}
                                                            >
                                                                <X size={14} aria-hidden />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <input
                                                        ref={fileAttRef}
                                                        type="file"
                                                        hidden
                                                        onChange={onPickAttachment}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {isEditing && !isPending && !isVerification && !isResubmitted && (
                            <div className="resub-verify-form-panel">
                                <div className="resub-verify-form-head">
                                    <Pencil size={14} aria-hidden />
                                    <span>Resubmission details</span>
                                </div>
                                <div className="verification-form-row">
                                    <label>
                                        <span>Re-Submission Type</span>
                                        <select
                                            value={formState?.resubmissionType || ''}
                                            onChange={(e) =>
                                                onClaimFormChange(claim.claimId, {
                                                    resubmissionType: e.target.value,
                                                })
                                            }
                                        >
                                            {RESUB_TYPES.map((type) => (
                                                <option key={type || 'blank'} value={type}>
                                                    {type || '--Select--'}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="remarks">
                                        <span>Re-Submission Remarks *</span>
                                        <input
                                            type="text"
                                            value={formState?.remarks || ''}
                                            onChange={(e) =>
                                                onClaimFormChange(claim.claimId, { remarks: e.target.value })
                                            }
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        {isPending ? (
                            <div className="verification-action-row resub-verify-action-bar resub-verify-action-bar--pending">
                                <button
                                    type="button"
                                    className="legacy-btn legacy-btn-light verification-details-btn"
                                    onClick={() => onOpenClaimDetails(claim, claimIndex, 'view')}
                                >
                                    <Eye size={14} aria-hidden />
                                    View Claim Details
                                </button>
                                <button
                                    type="button"
                                    className="legacy-btn verification-move-btn"
                                    onClick={() => onMoveToVerification([key])}
                                    disabled={moveInProgress}
                                >
                                    <ArrowRightCircle size={14} aria-hidden />
                                    Move to Verification
                                </button>
                            </div>
                        ) : isVerification ? (
                            <div className="verification-action-row resub-verify-action-bar">
                                <div className="verification-action-group">
                                    <button
                                        type="button"
                                        className="legacy-btn legacy-btn-light verification-details-btn"
                                        onClick={() => onOpenClaimDetails(claim, claimIndex, 'view')}
                                    >
                                        <Eye size={14} aria-hidden />
                                        View Claim Details
                                    </button>
                                    {formState?.resubmissionType === 'correction' && (
                                        <button
                                            type="button"
                                            className="legacy-btn legacy-btn-light verification-details-btn"
                                            onClick={() => onOpenClaimDetails(claim, claimIndex, 'edit')}
                                        >
                                            <IdCard size={14} aria-hidden />
                                            Edit Claim Details
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="legacy-btn legacy-btn-light verification-details-btn verification-preview-xml-btn"
                                        onClick={() => onPreviewXml(claim, claimIndex)}
                                        disabled={previewXmlInProgress}
                                    >
                                        {previewXmlInProgress ? (
                                            <Loader2 size={14} className="resub-verify-loading-icon" aria-hidden />
                                        ) : (
                                            <FileCode size={14} aria-hidden />
                                        )}
                                        Preview XML
                                    </button>
                                </div>
                                <div className="verification-action-group verification-action-group--primary">
                                    <button
                                        type="button"
                                        className="legacy-btn legacy-btn-light verification-save-draft-btn"
                                        onClick={() => onSaveAsDraft([key])}
                                        disabled={saveDraftInProgress || confirmInProgress || moveInProgress}
                                    >
                                        <Save size={14} aria-hidden />
                                        Save as draft
                                    </button>
                                    <button
                                        type="button"
                                        className="legacy-btn verification-confirm-submit-btn"
                                        onClick={() => onConfirmToSubmit([key])}
                                        disabled={confirmInProgress || saveDraftInProgress || moveInProgress}
                                    >
                                        <CheckCircle2 size={14} aria-hidden />
                                        Confirm to Submit
                                    </button>
                                </div>
                            </div>
                        ) : isSubmit ? (
                            <div className="verification-action-row resub-verify-action-bar">
                                <div className="verification-action-group">
                                    <button
                                        type="button"
                                        className="legacy-btn legacy-btn-light verification-details-btn"
                                        onClick={() => onOpenClaimDetails(claim, claimIndex, 'view')}
                                    >
                                        <Eye size={14} aria-hidden />
                                        View Claim Details
                                    </button>
                                </div>
                                <div className="verification-action-group verification-action-group--primary">
                                    <button
                                        type="button"
                                        className="legacy-btn legacy-btn-light verification-move-btn"
                                        onClick={() => onMoveBackToVerification([key])}
                                        disabled={moveInProgress}
                                    >
                                        <ArrowLeft size={14} aria-hidden />
                                        Move claim back to verification
                                    </button>
                                </div>
                            </div>
                        ) : isResubmitted ? (
                            <div className="verification-action-row resub-verify-action-bar resub-verify-action-bar--resubmitted">
                                <div className="verification-action-group">
                                    <button
                                        type="button"
                                        className="legacy-btn legacy-btn-light verification-details-btn"
                                        onClick={() => onOpenClaimDetails(claim, claimIndex, 'view')}
                                    >
                                        <Eye size={14} aria-hidden />
                                        View Claim Details
                                    </button>
                                </div>
                                <div className="resub-verify-submission-info">
                                    <div className="resub-verify-submission-info-item resub-verify-submission-info-item--file">
                                        <span className="resub-verify-submission-info-label">File Name</span>
                                        <div className="resub-verify-submission-info-value resub-verify-submission-info-value--file">
                                            <span className="resub-verify-submission-file-name">
                                                {claim.fileName ||
                                                    claim.header?.file_name ||
                                                    claim.header?.fileName ||
                                                    '—'}
                                            </span>
                                            {(
                                                claim.submissionTransactionId ??
                                                claim.header?.submission_transaction_id ??
                                                claim.header?.submissionTransactionId
                                            ) != null && (
                                                <button
                                                    type="button"
                                                    className="resub-verify-submission-download-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDownloadSubmissionFile?.(claim, claimIndex);
                                                    }}
                                                    disabled={downloadingSubmissionKey === key}
                                                    aria-label="Load submission transaction details"
                                                    title="Load submission transaction details"
                                                >
                                                    {downloadingSubmissionKey === key ? (
                                                        <Loader2 size={14} className="resub-verify-loading-icon" aria-hidden />
                                                    ) : (
                                                        <Download size={14} aria-hidden />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="resub-verify-submission-info-item resub-verify-submission-info-item--count">
                                        <span className="resub-verify-submission-info-label">Record Count</span>
                                        <span className="resub-verify-submission-info-value">
                                            {claim.recordCount ??
                                                claim.header?.RecordCount ??
                                                claim.header?.recordCount ??
                                                '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="verification-action-row resub-verify-action-bar">
                                <div className="verification-action-group">
                                    <button
                                        type="button"
                                        className="legacy-btn legacy-btn-light verification-details-btn"
                                        onClick={() => onOpenClaimDetails(claim, claimIndex, 'view')}
                                    >
                                        <Eye size={14} aria-hidden />
                                        View Claim Details
                                    </button>
                                    <button
                                        type="button"
                                        className="legacy-btn legacy-btn-light verification-details-btn"
                                        onClick={() => onOpenClaimDetails(claim, claimIndex, 'edit')}
                                    >
                                        <IdCard size={14} aria-hidden />
                                        Edit Claim Details
                                    </button>
                                    <button type="button" className="legacy-btn legacy-btn-light">
                                        <Paperclip size={14} aria-hidden />
                                        Attach Documents
                                    </button>
                                </div>
                                <div className="verification-action-group verification-action-group--primary">
                                    <button
                                        type="button"
                                        className="legacy-btn legacy-btn-primary"
                                        onClick={() => onClaimFormChange(claim.claimId, { isEditing: true })}
                                    >
                                        <Pencil size={14} aria-hidden />
                                        {isEditing ? 'Save Resubmission Data' : 'Edit Resubmission Data'}
                                    </button>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            className="legacy-btn legacy-btn-light verification-cancel-btn"
                                            onClick={() => onClaimFormChange(claim.claimId, { isEditing: false })}
                                        >
                                            <X size={14} aria-hidden />
                                            Cancel Edit
                                        </button>
                                    )}
                                    <button type="button" className="legacy-btn verification-verify-btn">
                                        <CheckCircle2 size={14} aria-hidden />
                                        Verify Resubmission Data
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
});

export default function ResubmissionVerificationPage({ bucket = 'verification' }) {
    const bucketConfig = RESUBMISSION_BUCKETS[bucket] || RESUBMISSION_BUCKETS.verification;
    const isPending = bucketConfig.isPending;
    const isVerification = bucket === 'verification';
    const isSubmit = bucket === 'submit';
    const isResubmitted = bucket === 'resubmitted';
    const tableColumns = useMemo(
        () => columnsForBucket(isPending, isResubmitted),
        [isPending, isResubmitted]
    );
    const navigate = useNavigate();
    const location = useLocation();
    const { path: portalPath } = usePortal();
    const { claimId: receiverIdParam } = useParams();
    const receiverNameFromNav = location.state?.receiverName || '';
    const didBootstrapRef = useRef(false);

    const {
        appliedFilters,
        hasApplied,
        draftFilters,
        fixedYearOptions,
        handleFilterChange,
        applyDraftFilters,
        resolveDisplayOfficeId,
    } = useResubmissionList();

    const receiverId = receiverIdParam ? decodeURIComponent(receiverIdParam) : '';

    const [claims, setClaims] = useState([]);
    const [receiverName, setReceiverName] = useState(receiverNameFromNav);
    const [detailLoading, setDetailLoading] = useState(true);
    const [hasLoadedClaims, setHasLoadedClaims] = useState(false);
    const [claimFormState, setClaimFormState] = useState({});
    const [expandedIds, setExpandedIds] = useState(() => new Set());
    const [workspaceByClaim, setWorkspaceByClaim] = useState({});
    const [detailsSession, setDetailsSession] = useState(null);
    const detailsReqRef = useRef(0);
    const workspaceByClaimRef = useRef(workspaceByClaim);
    workspaceByClaimRef.current = workspaceByClaim;
    const [selectedClaimKeys, setSelectedClaimKeys] = useState(() => new Set());
    const [cycleFilter, setCycleFilter] = useState('all');
    const [movingClaims, setMovingClaims] = useState(false);
    const [movingClaimCount, setMovingClaimCount] = useState(0);
    const [movingDestination, setMovingDestination] = useState('verification');
    const [confirmingSubmit, setConfirmingSubmit] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const savingDraftRef = useRef(false);
    const [previewingXmlKey, setPreviewingXmlKey] = useState(null);
    const [xmlDispositionFlag, setXmlDispositionFlag] = useState('TEST');
    const [xmlJob, setXmlJob] = useState(null);
    const [dhpoSubmitResult, setDhpoSubmitResult] = useState(null);
    const [downloadingSubmissionKey, setDownloadingSubmissionKey] = useState(null);
    const [leaveCorrection, setLeaveCorrection] = useState(null);
    const [resettingCorrection, setResettingCorrection] = useState(false);
    const [submitConfirm, setSubmitConfirm] = useState(null);
    const selectAllRef = useRef(null);

    // Hard reload / deep-link: matrix bootstrap never ran, so apply default filters here.
    useEffect(() => {
        if (hasApplied || didBootstrapRef.current) return;
        const currentYear = String(new Date().getFullYear());
        const defaultYear = fixedYearOptions.includes(currentYear) ? currentYear : fixedYearOptions[0] || '';
        if (!defaultYear) return;

        if (!draftFilters.year) {
            handleFilterChange('searchOn', 'RemittanceTransactionDate');
            handleFilterChange('year', defaultYear);
            handleFilterChange('month', currentMonthValue());
            return;
        }
        if (!draftFilters.month) {
            handleFilterChange('month', currentMonthValue());
            return;
        }
        if (!draftFilters.searchOn) {
            handleFilterChange('searchOn', 'RemittanceTransactionDate');
            return;
        }
        applyDraftFilters();
        didBootstrapRef.current = true;
    }, [
        hasApplied,
        draftFilters.year,
        draftFilters.month,
        draftFilters.searchOn,
        fixedYearOptions,
        handleFilterChange,
        applyDraftFilters,
    ]);

    const applyClaimsView = useCallback((claimList, payerName) => {
        setClaims(claimList);
        setClaimFormState(
            Object.fromEntries(
                claimList.map((claim) => [claim.claimId, verificationFormStateFromClaim(claim)])
            )
        );
        setSelectedClaimKeys(new Set());
        setCycleFilter('all');
        setExpandedIds(
            claimList.length > 0 ? new Set([`${claimList[0].claimId}-0`]) : new Set()
        );
        const name = String(payerName || '').trim();
        if (name) setReceiverName(name);
    }, []);

    const fetchClaims = useCallback(async () => {
        const id = String(receiverId || '').trim();
        if (!id) return;

        // Month tabs update draft only (no Apply); prefer draft so this page matches matrix month.
        const monthNumber = monthNumberParam(draftFilters?.month || appliedFilters?.month);
        const year = String(appliedFilters?.year || '').trim();

        if (!year || !monthNumber) {
            setDetailLoading(true);
            setHasLoadedClaims(false);
            return;
        }

        const officeId =
            String(resolveDisplayOfficeId(appliedFilters) || '').trim() ||
            DEFAULT_RESUBMISSION_OFFICE_ID;

        setDetailLoading(true);
        setHasLoadedClaims(false);

        const displayEndpoint = bucketConfig.displayEndpoint;
        if (!displayEndpoint) {
            setClaims([]);
            setClaimFormState({});
            setSelectedClaimKeys(new Set());
            setCycleFilter('all');
            setExpandedIds(new Set());
            if (receiverNameFromNav) setReceiverName(receiverNameFromNav);
            setDetailLoading(false);
            setHasLoadedClaims(true);
            return;
        }

        const query = new URLSearchParams({
            year,
            month: monthNumber,
            officeId,
            senderId: id,
        });
        const url = `/api/dashboard/resubmission-display/${displayEndpoint}?${query.toString()}`;

        try {
            const res = await apiFetch(url);
            const mapped =
                bucket === 'resubmitted'
                    ? mapResubmittedDisplayResponse(res)
                    : mapPendingDisplayResponse(res);
            applyClaimsView(mapped.claims, mapped.name || receiverNameFromNav);
        } catch (e) {
            console.error(`${bucketConfig.crumb} claims:`, e);
            setClaims([]);
            setClaimFormState({});
            setExpandedIds(new Set());
        } finally {
            setDetailLoading(false);
            setHasLoadedClaims(true);
        }
    }, [
        receiverId,
        appliedFilters,
        draftFilters?.month,
        receiverNameFromNav,
        bucket,
        bucketConfig.displayEndpoint,
        bucketConfig.crumb,
        resolveDisplayOfficeId,
        applyClaimsView,
    ]);
    const toggleClaim = useCallback((key) => {
        startTransition(() => {
            setExpandedIds((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
            });
        });
    }, []);

    const expandAll = useCallback(() => {
        startTransition(() => {
            setExpandedIds(new Set(claims.map((c, i) => claimKey(c.claimId, i))));
        });
    }, [claims]);

    const collapseAll = useCallback(() => {
        startTransition(() => {
            setExpandedIds(new Set());
        });
    }, []);

    const onClaimFormChange = useCallback((claimId, patch) => {
        setClaimFormState((prev) => {
            const current = prev[claimId] || {};
            const next = { ...current, ...patch };
            if (!Object.prototype.hasOwnProperty.call(patch, 'isDirty')) {
                next.isDirty = true;
            }
            return { ...prev, [claimId]: next };
        });
    }, []);

    const requestLeaveCorrection = useCallback((claim, claimIndex, nextType) => {
        setLeaveCorrection({ claim, claimIndex, nextType });
    }, []);

    const cancelLeaveCorrection = useCallback(() => {
        if (resettingCorrection) return;
        setLeaveCorrection(null);
    }, [resettingCorrection]);

    const confirmLeaveCorrection = useCallback(async () => {
        if (!leaveCorrection || resettingCorrection) return;
        const { claim, claimIndex, nextType } = leaveCorrection;
        const claimId = String(claim.claimId || '').trim();
        const remittance = String(claim.remittanceTransactionDate || '').trim();
        if (!claimId || !remittance) {
            toast.error('Missing claim ID or remittance date');
            return;
        }

        setResettingCorrection(true);
        try {
            const query = new URLSearchParams();
            query.set('claimId', claimId);
            query.set('remittanceTransactionDate', remittance);
            const token = localStorage.getItem('token');
            const response = await fetch(
                `/api/dashboard/resubmission-display/verification/reset?${query.toString()}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: token ? `Bearer ${token}` : '',
                        'ngrok-skip-browser-warning': 'true',
                    },
                }
            );
            if (!response.ok) {
                toast.error('Failed to restore original claim data');
                return;
            }

            const editKey = claimDetailsWorkspaceKey(claimId, claimIndex, 'edit');
            const viewKey = claimDetailsWorkspaceKey(claimId, claimIndex, 'view');
            setWorkspaceByClaim((prev) => {
                const next = { ...prev };
                delete next[editKey];
                delete next[viewKey];
                workspaceByClaimRef.current = next;
                return next;
            });
            setDetailsSession((prev) => {
                if (!prev) return prev;
                if (prev.workspaceKey === editKey || prev.workspaceKey === viewKey) return null;
                return prev;
            });
            onClaimFormChange(claimId, { resubmissionType: nextType });
            setLeaveCorrection(null);
            toast.success('Claim restored to original data');
        } catch (e) {
            console.error('Reset correction:', e);
            toast.error('Failed to restore original claim data');
        } finally {
            setResettingCorrection(false);
        }
    }, [leaveCorrection, resettingCorrection, onClaimFormChange]);

    const toggleClaimSelection = useCallback((key) => {
        setSelectedClaimKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const cycleOptions = useMemo(() => {
        const cycles = new Set();
        for (const claim of claims) {
            if (claim.claimCycle != null) cycles.add(claim.claimCycle);
        }
        return [...cycles].sort((a, b) => a - b);
    }, [claims]);

    const displayedClaims = useMemo(() => {
        if (cycleFilter === 'all') {
            return claims.map((claim, claimIndex) => ({ claim, claimIndex }));
        }
        const cycleNum = Number(cycleFilter);
        return claims
            .map((claim, claimIndex) => ({ claim, claimIndex }))
            .filter(({ claim }) => claim.claimCycle === cycleNum);
    }, [claims, cycleFilter]);

    const displayedClaimKeys = useMemo(
        () => displayedClaims.map(({ claim, claimIndex }) => claimKey(claim.claimId, claimIndex)),
        [displayedClaims]
    );

    const allDisplayedSelected =
        displayedClaimKeys.length > 0 &&
        displayedClaimKeys.every((key) => selectedClaimKeys.has(key));

    const someDisplayedSelected =
        displayedClaimKeys.some((key) => selectedClaimKeys.has(key)) && !allDisplayedSelected;

    const toggleSelectAllDisplayed = useCallback(() => {
        setSelectedClaimKeys((prev) => {
            const next = new Set(prev);
            if (allDisplayedSelected) {
                displayedClaimKeys.forEach((key) => next.delete(key));
            } else {
                displayedClaimKeys.forEach((key) => next.add(key));
            }
            return next;
        });
    }, [allDisplayedSelected, displayedClaimKeys]);

    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someDisplayedSelected;
        }
    }, [someDisplayedSelected, allDisplayedSelected]);

    const moveClaimsByStatus = useCallback(
        async (keys, status) => {
            const keyList = [...keys];
            if (keyList.length === 0) return;

            const claimsToMove = keyList
                .map((key) => claims.find((claim, claimIndex) => claimKey(claim.claimId, claimIndex) === key))
                .filter(Boolean);

            const body = buildClaimStatusMoveBody(claimsToMove, status);
            if (!body) {
                toast.error('Missing claim ID or remittance date');
                return;
            }

            setMovingDestination('verification');
            setMovingClaimCount(claimsToMove.length);
            setMovingClaims(true);
            try {
                const res = await apiFetch('/api/resubmission/verification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (res === null) {
                    toast.error('Failed to move claims to verification');
                    return;
                }

                setClaims((prev) =>
                    prev.filter((claim, claimIndex) => !keyList.includes(claimKey(claim.claimId, claimIndex)))
                );
                setSelectedClaimKeys((prev) => {
                    const next = new Set(prev);
                    keyList.forEach((key) => next.delete(key));
                    return next;
                });
                setExpandedIds((prev) => {
                    const next = new Set(prev);
                    keyList.forEach((key) => next.delete(key));
                    return next;
                });

                toast.success(
                    `${claimsToMove.length} claim${claimsToMove.length === 1 ? '' : 's'} moved to verification`
                );
            } catch (e) {
                console.error('Move to verification:', e);
                toast.error('Failed to move claims to verification');
            } finally {
                setMovingClaims(false);
                setMovingClaimCount(0);
            }
        },
        [claims]
    );

    const removeMovedClaims = useCallback((keyList) => {
        setClaims((prev) =>
            prev.filter((claim, claimIndex) => !keyList.includes(claimKey(claim.claimId, claimIndex)))
        );
        setSelectedClaimKeys((prev) => {
            const next = new Set(prev);
            keyList.forEach((key) => next.delete(key));
            return next;
        });
        setExpandedIds((prev) => {
            const next = new Set(prev);
            keyList.forEach((key) => next.delete(key));
            return next;
        });
    }, []);

    const moveClaimsByResubmissionStatus = useCallback(
        async (keys, status, destination, { confirmSubmit = false } = {}) => {
            const keyList = [...keys];
            if (keyList.length === 0) return;

            const claimsToMove = keyList
                .map((key) => claims.find((claim, claimIndex) => claimKey(claim.claimId, claimIndex) === key))
                .filter(Boolean);

            const body = buildResubmissionStatusBody(claimsToMove, status);
            if (!body) {
                toast.error('Missing resubmission data ID');
                return;
            }

            setMovingDestination(destination);
            setMovingClaimCount(claimsToMove.length);
            setMovingClaims(true);
            if (confirmSubmit) setConfirmingSubmit(true);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/resubmission/status', {
                    method: 'PUT',
                    headers: {
                        Authorization: token ? `Bearer ${token}` : '',
                        'ngrok-skip-browser-warning': 'true',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    toast.error(`Failed to move claims to ${destination}`);
                    return;
                }

                removeMovedClaims(keyList);
                toast.success(
                    `${claimsToMove.length} claim${claimsToMove.length === 1 ? '' : 's'} moved to ${destination}`
                );
            } catch (e) {
                console.error(`Move to ${destination}:`, e);
                toast.error(`Failed to move claims to ${destination}`);
            } finally {
                setMovingClaims(false);
                if (confirmSubmit) setConfirmingSubmit(false);
                setMovingClaimCount(0);
            }
        },
        [claims, removeMovedClaims]
    );

    const moveClaimsToSubmit = useCallback(
        (keys) => moveClaimsByResubmissionStatus(keys, 'SUBMIT', 'submit', { confirmSubmit: true }),
        [moveClaimsByResubmissionStatus]
    );

    const moveClaimsBackToVerification = useCallback(
        (keys) => moveClaimsByResubmissionStatus(keys, 'VERIFICATION', 'verification'),
        [moveClaimsByResubmissionStatus]
    );

    const moveClaimsToVerification = useCallback(
        (keys) => moveClaimsByStatus(keys, 'VERIFICATION'),
        [moveClaimsByStatus]
    );

    const moveSelectedToVerification = useCallback(() => {
        moveClaimsByStatus(selectedClaimKeys, 'VERIFICATION');
    }, [moveClaimsByStatus, selectedClaimKeys]);

    const confirmClaimsToSubmit = useCallback(
        (keys) => {
            const keyList = [...keys];
            if (keyList.length === 0) return;
            if (keysHaveDirtyClaims(keyList, claims, claimFormState)) {
                setSubmitConfirm({ keys: keyList });
                return;
            }
            moveClaimsToSubmit(keyList);
        },
        [claims, claimFormState, moveClaimsToSubmit]
    );

    const moveSelectedToSubmit = useCallback(() => {
        confirmClaimsToSubmit(selectedClaimKeys);
    }, [confirmClaimsToSubmit, selectedClaimKeys]);

    const saveClaimsAsDraft = useCallback(async (keys) => {
        const keyList = [...keys];
        if (keyList.length === 0) return [];
        if (savingDraftRef.current) return [];

        savingDraftRef.current = true;
        setSavingDraft(true);
        const savedKeys = [];
        const savedClaimIds = [];
        try {
            for (const key of keyList) {
                const claimIndex = claims.findIndex((row, idx) => claimKey(row.claimId, idx) === key);
                if (claimIndex < 0) continue;
                const claim = claims[claimIndex];
                const workspaceKey = claimDetailsWorkspaceKey(claim.claimId, claimIndex, 'edit');
                let workspace = workspaceByClaimRef.current[workspaceKey];

                if (!workspace?.__raw || workspace.__loading || workspace.__error) {
                    const query = new URLSearchParams();
                    query.set('claimId', String(claim.claimId || '').trim());
                    const remittance = String(claim.remittanceTransactionDate || '').trim();
                    if (remittance) query.set('remittanceTransactionDate', remittance);
                    const res = await apiFetch(
                        `/api/dashboard/resubmission-display/verification/claim-details?${query.toString()}`
                    );
                    if (!res) {
                        toast.error(`Failed to load claim ${claim.claimId} for draft save`);
                        continue;
                    }
                    workspace = mapClaimDetailsToWorkspace(res, claim);
                    setWorkspaceByClaim((prev) => ({ ...prev, [workspaceKey]: workspace }));
                    workspaceByClaimRef.current = { ...workspaceByClaimRef.current, [workspaceKey]: workspace };
                }

                const formState = claimFormState[claim.claimId] || {};
                const payload = buildClaimDetailsPutPayload(workspace, formState, claim);
                const query = new URLSearchParams();
                query.set('claimId', String(claim.claimId || '').trim());
                const remittance = String(claim.remittanceTransactionDate || '').trim();
                if (remittance) query.set('remittanceTransactionDate', remittance);

                const token = localStorage.getItem('token');
                const response = await fetch(
                    `/api/dashboard/resubmission-display/verification/claim-details?${query.toString()}`,
                    {
                        method: 'PUT',
                        headers: {
                            Authorization: token ? `Bearer ${token}` : '',
                            'ngrok-skip-browser-warning': 'true',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    }
                );
                if (!response.ok) {
                    toast.error(`Failed to save draft for ${claim.claimId}`);
                    continue;
                }

                let savedWorkspace = null;
                try {
                    const text = await response.text();
                    const parsed = text ? JSON.parse(text) : null;
                    if (parsed && typeof parsed === 'object') {
                        savedWorkspace = mapClaimDetailsToWorkspace(parsed, claim);
                    }
                } catch {
                    savedWorkspace = null;
                }
                if (!savedWorkspace?.__raw && workspaceNeedsTableIdRefresh(workspace)) {
                    const refresh = await apiFetch(
                        `/api/dashboard/resubmission-display/verification/claim-details?${query.toString()}`
                    );
                    if (refresh) savedWorkspace = mapClaimDetailsToWorkspace(refresh, claim);
                }
                if (savedWorkspace?.__raw) {
                    setWorkspaceByClaim((prev) => ({ ...prev, [workspaceKey]: savedWorkspace }));
                    workspaceByClaimRef.current = {
                        ...workspaceByClaimRef.current,
                        [workspaceKey]: savedWorkspace,
                    };
                }
                savedKeys.push(key);
                savedClaimIds.push(claim.claimId);
            }

            if (savedClaimIds.length > 0) {
                setClaimFormState((prev) => {
                    const next = { ...prev };
                    savedClaimIds.forEach((claimId) => {
                        next[claimId] = { ...(next[claimId] || {}), isDirty: false };
                    });
                    return next;
                });
            }

            if (savedKeys.length > 0) {
                toast.success(`${savedKeys.length} claim${savedKeys.length === 1 ? '' : 's'} saved as draft`);
            }
            return savedKeys;
        } catch (e) {
            console.error('Save as draft:', e);
            toast.error('Failed to save as draft');
            return savedKeys;
        } finally {
            savingDraftRef.current = false;
            setSavingDraft(false);
        }
    }, [claims, claimFormState]);

    const cancelSubmitConfirm = useCallback(() => {
        if (savingDraft || confirmingSubmit) return;
        setSubmitConfirm(null);
    }, [savingDraft, confirmingSubmit]);

    const confirmUnsavedSubmit = useCallback(async () => {
        if (!submitConfirm?.keys?.length || savingDraftRef.current) return;
        const keys = submitConfirm.keys;
        const savedKeys = await saveClaimsAsDraft(keys);
        setSubmitConfirm(null);
        if (savedKeys.length > 0) {
            moveClaimsToSubmit(savedKeys);
        }
    }, [submitConfirm, saveClaimsAsDraft, moveClaimsToSubmit]);

    const previewClaimXml = useCallback(
        async (claim, claimIndex) => {
            const key = claimKey(claim.claimId, claimIndex);
            setPreviewingXmlKey(key);
            try {
                const workspaceKey = claimDetailsWorkspaceKey(claim.claimId, claimIndex, 'edit');
                const cached = workspaceByClaimRef.current[workspaceKey];
                let workspace = cached && !cached.__error && !cached.__loading ? cached : null;
                if (!workspace) {
                    const query = new URLSearchParams();
                    query.set('claimId', String(claim.claimId || '').trim());
                    const remittance = String(claim.remittanceTransactionDate || '').trim();
                    if (remittance) query.set('remittanceTransactionDate', remittance);

                    const res = await apiFetch(
                        `/api/dashboard/resubmission-display/verification/claim-details?${query.toString()}`
                    );
                    if (!res) {
                        toast.error('Failed to load claim details for XML preview');
                        return;
                    }
                    workspace = mapClaimDetailsToWorkspace(res, claim);
                }
                const formState = claimFormState[claim.claimId] || {};
                const xml = buildClaimSubmissionXml({
                    workspace,
                    rawPayload: workspace.__raw || unwrapClaimDetailsPayload(workspace.__raw),
                    receiverId,
                    formState,
                    claim,
                    resubmission: {
                        type: formState.resubmissionType || '',
                        comment: formState.remarks || '',
                        attachmentBase64: formState.attachment?.base64 || '',
                    },
                });

                if (!openXmlPreview(xml, `${claim.claimId || 'claim'}-submission.xml`)) {
                    toast.error('Could not open XML preview');
                }
            } catch (e) {
                console.error('Preview XML:', e);
                toast.error('Failed to generate XML preview');
            } finally {
                setPreviewingXmlKey(null);
            }
        },
        [claimFormState, receiverId]
    );

    const generateSubmitXml = useCallback(async (mode = 'preview') => {
        const payloadClaims = claims
            .map((claim) => ({
                claimId: String(claim.claimId || '').trim(),
                remittanceTransactionDate: String(claim.remittanceTransactionDate || '').trim(),
            }))
            .filter((row) => row.claimId && row.remittanceTransactionDate);

        if (payloadClaims.length === 0) {
            toast.error('No claims available to generate XML');
            return;
        }

        setXmlJob(mode);
        try {
            const res = await apiFetch('/api/dashboard/resubmission-display/submit/claim-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claims: payloadClaims }),
            });
            const rows = unwrapClaimDetailsList(res);
            if (rows.length === 0) {
                toast.error('Failed to load claim details for XML');
                return;
            }

            const findListClaim = (row) => {
                const envelope = unwrapClaimDetailsEnvelope(row);
                const id = String(envelope.claim_id || '').trim();
                const date = String(envelope.remittance_transaction_date || '').trim();
                return (
                    claims.find(
                        (claim) =>
                            String(claim.claimId || '').trim() === id &&
                            (!date || String(claim.remittanceTransactionDate || '').trim() === date)
                    ) ||
                    claims.find((claim) => String(claim.claimId || '').trim() === id) ||
                    {}
                );
            };

            const entries = rows.map((row) => {
                const listClaim = findListClaim(row);
                const workspace = mapClaimDetailsToWorkspace(row, listClaim);
                const envelope = unwrapClaimDetailsEnvelope(row);
                const formState = claimFormState[listClaim.claimId] || claimFormState[workspace.details?.claimInvoiceId] || {};
                const firstResub = Array.isArray(workspace.resubmissions) ? workspace.resubmissions[0] || {} : {};
                return {
                    workspace,
                    rawPayload: workspace.__raw || envelope,
                    formState,
                    claim: listClaim,
                    resubmissionDataId:
                        resubmissionDataId(listClaim) ??
                        resubmissionDataId(envelope) ??
                        resubmissionDataId(row),
                    resubmission: {
                        type: formState.resubmissionType || firstResub.type || '',
                        comment: formState.remarks || firstResub.comment || '',
                        attachmentBase64: formState.attachment?.base64 || firstResub.fileData || '',
                    },
                };
            });

            const { xml, header } = buildClaimsSubmission({
                entries,
                receiverId,
                dispositionFlag: xmlDispositionFlag,
            });
            const filename = buildClaimsSubmissionFilename({
                insuranceName: receiverName || receiverNameFromNav || '',
                monthYear: monthLabel(
                    draftFilters?.month || appliedFilters?.month || '',
                    appliedFilters?.year || draftFilters?.year || ''
                ),
                recordCount: entries.length,
            });
            if (mode === 'submit') {
                const data = entries.map((entry) => ({
                    resubmission_data_id: resubmissionDataId(entry),
                }));
                if (data.some((row) => row.resubmission_data_id == null)) {
                    toast.error('Missing resubmission data ID');
                    return;
                }

                const request = {
                    data,
                    header: {
                        SenderID: header.SenderID,
                        ReceiverID: header.ReceiverID || receiverId,
                        TransactionDate: header.TransactionDate,
                        RecordCount: data.length,
                        DispositionFlag: xmlDispositionFlag || header.DispositionFlag || 'TEST',
                    },
                    status: 'RESUBMITTED',
                };
                const body = new FormData();
                body.append('file', new File([xml], filename, { type: 'application/xml' }));
                body.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));

                const token = localStorage.getItem('token');
                const response = await fetch('/api/resubmission/dhpo', {
                    method: 'POST',
                    headers: {
                        Authorization: token ? `Bearer ${token}` : '',
                        'ngrok-skip-browser-warning': 'true',
                    },
                    body,
                });
                const payload = await response.json().catch(() => null);
                if (payload) {
                    setDhpoSubmitResult(payload);
                    if (response.ok && isDhpoSubmitSuccess(payload)) {
                        await fetchClaims();
                    }
                    return;
                }
                toast.error('Failed to submit XML to DHPO');
                return;
            }
            if (!openXmlPreview(xml, filename)) {
                toast.error('Could not open XML preview');
            }
        } catch (e) {
            console.error('Generate submit XML:', e);
            toast.error(mode === 'submit' ? 'Failed to generate and submit XML' : 'Failed to preview XML');
        } finally {
            setXmlJob(null);
        }
    }, [
        claims,
        claimFormState,
        receiverId,
        xmlDispositionFlag,
        receiverName,
        receiverNameFromNav,
        draftFilters?.month,
        draftFilters?.year,
        appliedFilters?.month,
        appliedFilters?.year,
        fetchClaims,
    ]);

    const downloadSubmissionFile = useCallback(async (claim, claimIndex) => {
        const submissionTransactionId =
            claim.submissionTransactionId ??
            claim.header?.submission_transaction_id ??
            claim.header?.submissionTransactionId;
        if (submissionTransactionId == null) {
            toast.error('Missing submission transaction ID');
            return;
        }

        const workspaceKey = claimKey(claim.claimId, claimIndex);
        setDownloadingSubmissionKey(workspaceKey);
        try {
            const res = await apiFetch(
                `/api/submission-transactions/details?submissionTransactionId=${encodeURIComponent(submissionTransactionId)}`
            );
            if (!res) {
                toast.error('Failed to load submission transaction details');
                return;
            }

            const rows = unwrapClaimDetailsList(res);
            if (rows.length === 0) {
                toast.error('No claims found in submission transaction');
                return;
            }

            const entries = rows.map((row) => {
                const envelope = unwrapClaimDetailsEnvelope(row);
                const listClaim =
                    claims.find(
                        (c) =>
                            String(c.claimId || '').trim() === String(envelope.claim_id || '').trim()
                    ) || claim;
                const workspace = mapClaimDetailsToWorkspace(row, listClaim);
                const firstResub = Array.isArray(workspace.resubmissions)
                    ? workspace.resubmissions[0] || {}
                    : {};
                return {
                    workspace,
                    rawPayload: workspace.__raw || envelope,
                    claim: listClaim,
                    resubmission: {
                        type: firstResub.type || '',
                        comment: firstResub.comment || '',
                        attachmentBase64: firstResub.fileData || '',
                    },
                };
            });

            const dispositionFlag =
                String(
                    claim.header?.DispositionFlag ||
                        claim.header?.dispositionFlag ||
                        entries[0]?.rawPayload?.header?.DispositionFlag ||
                        ''
                ).trim() || undefined;

            const { xml } = buildClaimsSubmission({
                entries,
                receiverId,
                dispositionFlag,
            });

            const filename =
                claim.fileName ||
                claim.header?.file_name ||
                claim.header?.fileName ||
                res?.file_name ||
                res?.fileName ||
                res?.header?.file_name ||
                res?.header?.fileName ||
                buildClaimsSubmissionFilename({
                    insuranceName: receiverName || receiverNameFromNav || '',
                    monthYear: monthLabel(
                        draftFilters?.month || appliedFilters?.month || '',
                        appliedFilters?.year || draftFilters?.year || ''
                    ),
                    recordCount: entries.length,
                });

            if (!openXmlPreview(xml, filename)) {
                toast.error('Could not open XML preview');
            }
            if (!downloadXmlFile(xml, filename)) {
                toast.error('Could not download XML file');
            }
        } catch (e) {
            console.error('Submission transaction XML:', e);
            toast.error('Failed to generate submission XML');
        } finally {
            setDownloadingSubmissionKey(null);
        }
    }, [
        claims,
        receiverId,
        receiverName,
        receiverNameFromNav,
        draftFilters?.month,
        draftFilters?.year,
        appliedFilters?.month,
        appliedFilters?.year,
    ]);

    const openClaimDetails = useCallback(
        async (claim, claimIndex, mode = 'edit') => {
            const workspaceKey = claimDetailsWorkspaceKey(claim.claimId, claimIndex, mode);
            setDetailsSession({ workspaceKey, mode, claimIndex });

            if (mode === 'edit') {
                const existing = workspaceByClaimRef.current[workspaceKey];
                if (existing && !existing.__loading && !existing.__error && existing.__raw) {
                    return;
                }
            }

            const isVerificationBucket = bucket === 'verification';
            const shouldFetchDetails = mode === 'view' || isVerificationBucket;

            if (!shouldFetchDetails) {
                setWorkspaceByClaim((prev) => ({
                    ...prev,
                    [workspaceKey]: createDummyClaimWorkspace(claim),
                }));
                return;
            }

            const reqId = ++detailsReqRef.current;
            setWorkspaceByClaim((prev) => ({
                ...prev,
                [workspaceKey]: claimDetailsLoadingWorkspace(claim),
            }));

            const query = new URLSearchParams();
            if (bucket === 'resubmitted') {
                const submissionClaimId =
                    claim.resubmissionClaimId ??
                    claim.submission_claim_id ??
                    claim.submissionClaimId;
                if (submissionClaimId == null) {
                    setWorkspaceByClaim((prev) => ({
                        ...prev,
                        [workspaceKey]: claimDetailsErrorWorkspace(
                            claim,
                            'Missing submission claim ID for this resubmitted claim.'
                        ),
                    }));
                    return;
                }
                query.set('submissionClaimId', String(submissionClaimId));
            } else {
                query.set('claimId', String(claim.claimId || '').trim());
                const remittance = String(claim.remittanceTransactionDate || '').trim();
                if (remittance) query.set('remittanceTransactionDate', remittance);
            }

            const detailsPath = resolveClaimDetailsApiPath(bucket, mode);

            try {
                const res = await apiFetch(`${detailsPath}?${query.toString()}`);
                if (detailsReqRef.current !== reqId) return;
                if (!res) {
                    setWorkspaceByClaim((prev) => ({
                        ...prev,
                        [workspaceKey]: claimDetailsErrorWorkspace(claim, 'Failed to load claim details.'),
                    }));
                    return;
                }
                setWorkspaceByClaim((prev) => ({
                    ...prev,
                    [workspaceKey]: mapClaimDetailsToWorkspace(res, claim),
                }));
            } catch (e) {
                console.error('Claim details:', e);
                if (detailsReqRef.current !== reqId) return;
                setWorkspaceByClaim((prev) => ({
                    ...prev,
                    [workspaceKey]: claimDetailsErrorWorkspace(claim, 'Failed to load claim details.'),
                }));
            }
        },
        [bucket]
    );

    const detailsClaim = useMemo(() => {
        if (!detailsSession) return null;
        return claims[detailsSession.claimIndex] || null;
    }, [detailsSession, claims]);

    useEffect(() => {
        if (!receiverId) {
            navigate(portalPath('/crs/resubmission'), { replace: true });
            return;
        }
        if (!hasApplied) return;
        fetchClaims();
    }, [receiverId, hasApplied, fetchClaims, navigate, portalPath]);

    const period = useMemo(
        () =>
            monthLabel(
                draftFilters?.month || appliedFilters?.month || '',
                appliedFilters?.year || draftFilters?.year || ''
            ),
        [draftFilters?.month, draftFilters?.year, appliedFilters?.month, appliedFilters?.year]
    );

    const payerLabel = receiverName || receiverNameFromNav || '';

    const totalRejected = useMemo(
        () =>
            displayedClaims.reduce(
                (sum, { claim }) =>
                    sum +
                    (claim.activities || []).reduce(
                        (lineSum, row) => lineSum + (Number(row.RejectedIfAny) || 0),
                        0
                    ),
                0
            ),
        [displayedClaims]
    );
    const totalApproved = useMemo(
        () =>
            displayedClaims.reduce(
                (sum, { claim }) =>
                    sum +
                    (claim.activities || []).reduce(
                        (lineSum, row) => lineSum + (Number(row.NetApproved) || 0),
                        0
                    ),
                0
            ),
        [displayedClaims]
    );
    const totalNet = useMemo(
        () =>
            displayedClaims.reduce((sum, { claim }) => sum + (Number(claim.claimNet) || 0), 0),
        [displayedClaims]
    );

    const selectedCount = selectedClaimKeys.size;

    const submitConfirmClaims = useMemo(() => {
        if (!submitConfirm?.keys?.length) return [];
        return submitConfirm.keys
            .map((key) => claims.find((claim, claimIndex) => claimKey(claim.claimId, claimIndex) === key))
            .filter(Boolean);
    }, [submitConfirm, claims]);

    if (!receiverId) return null;

    const showLoading = detailLoading || !hasLoadedClaims;

    return (
        <div className={`resub-v2-page resub-verify-page${showLoading ? ' is-loading' : ''}`}>
            <div className="resub-verify-top">
                <nav className="resub-verify-nav" aria-label="Verification navigation">
                    <button
                        type="button"
                        className="resub-verify-back"
                        onClick={() => navigate(portalPath('/crs/resubmission'))}
                    >
                        <ArrowLeft size={15} aria-hidden />
                        Back to Matrix
                    </button>
                    <div className="resub-verify-crumb" aria-hidden>
                        <span>Resubmission</span>
                        <ChevronRight size={13} />
                        <span className="resub-verify-crumb-current">{bucketConfig.crumb}</span>
                    </div>
                </nav>

                <header className="resub-verify-hero" aria-busy={showLoading || undefined}>
                    <div className="resub-verify-hero-glow" aria-hidden />
                    <div className="resub-verify-hero-main">
                        <span className="resub-verify-eyebrow">{bucketConfig.eyebrow}</span>
                        <h1 className="resub-verify-hero-title">{bucketConfig.pageTitle}</h1>
                        <div className="resub-verify-meta">
                            {receiverId && (
                                <span className="resub-verify-meta-chip resub-verify-meta-chip--claim">
                                    {receiverId}
                                </span>
                            )}
                            {payerLabel && <span className="resub-verify-meta-chip">{payerLabel}</span>}
                            {period && <span className="resub-verify-meta-chip">{period}</span>}
                        </div>
                    </div>
                    {!isResubmitted && (
                    <div className="resub-verify-hero-stats">
                        <div className="resub-verify-stat resub-verify-stat--danger">
                            <span className="resub-verify-stat-icon" aria-hidden>
                                <CircleDollarSign size={14} />
                            </span>
                            <span className="resub-verify-stat-label">Rejected</span>
                            <span className="resub-verify-stat-value">
                                {showLoading ? (
                                    <span className="resub-verify-skel resub-verify-skel--stat" />
                                ) : (
                                    formatAmount(totalRejected)
                                )}
                            </span>
                        </div>
                        <div className="resub-verify-stat resub-verify-stat--success">
                            <span className="resub-verify-stat-icon" aria-hidden>
                                <CheckCircle2 size={14} />
                            </span>
                            <span className="resub-verify-stat-label">Payment</span>
                            <span className="resub-verify-stat-value">
                                {showLoading ? (
                                    <span className="resub-verify-skel resub-verify-skel--stat" />
                                ) : (
                                    formatAmount(totalApproved)
                                )}
                            </span>
                        </div>
                    </div>
                    )}
                    {isResubmitted && (
                        <div className="resub-verify-hero-stats">
                            <div className="resub-verify-stat resub-verify-stat--net">
                                <span className="resub-verify-stat-icon" aria-hidden>
                                    <CircleDollarSign size={14} />
                                </span>
                                <span className="resub-verify-stat-label">Net Amount</span>
                                <span className="resub-verify-stat-value">
                                    {showLoading ? (
                                        <span className="resub-verify-skel resub-verify-skel--stat" />
                                    ) : (
                                        formatAmount(totalNet)
                                    )}
                                </span>
                            </div>
                        </div>
                    )}
                </header>
            </div>

            {isSubmit && (
                <div className="resub-verify-xml-bar">
                    <div className="resub-verify-xml-bar-copy">
                        <span className="resub-verify-xml-bar-title">Generate XML</span>
                        <span className="resub-verify-xml-bar-hint">
                            Generates XML for all claims
                            {!showLoading ? ` (${claims.length.toLocaleString()})` : ''}
                        </span>
                    </div>
                    <div className="resub-verify-xml-bar-controls">
                        <label className="resub-verify-cycle-filter">
                            <span className="resub-verify-cycle-filter-label">Disposition</span>
                            <select
                                className="resub-verify-cycle-filter-select"
                                value={xmlDispositionFlag}
                                onChange={(e) => setXmlDispositionFlag(e.target.value)}
                                disabled={Boolean(xmlJob) || showLoading}
                                aria-label="XML disposition flag"
                            >
                                <option value="TEST">TEST</option>
                                <option value="PRODUCTION">PRODUCTION</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            className="legacy-btn legacy-btn-light verification-details-btn verification-preview-xml-btn"
                            onClick={() => generateSubmitXml('preview')}
                            disabled={Boolean(xmlJob) || showLoading || claims.length === 0}
                        >
                            {xmlJob === 'preview' ? (
                                <Loader2 size={14} className="resub-verify-loading-icon" aria-hidden />
                            ) : (
                                <FileCode size={14} aria-hidden />
                            )}
                            {xmlJob === 'preview' ? 'Previewing…' : 'Preview'}
                        </button>
                        <button
                            type="button"
                            className="legacy-btn verification-confirm-submit-btn"
                            onClick={() => generateSubmitXml('submit')}
                            disabled={Boolean(xmlJob) || showLoading || claims.length === 0}
                        >
                            {xmlJob === 'submit' ? (
                                <Loader2 size={14} className="resub-verify-loading-icon" aria-hidden />
                            ) : (
                                <Send size={14} aria-hidden />
                            )}
                            {xmlJob === 'submit' ? 'Submitting…' : 'Generate and Submit'}
                        </button>
                    </div>
                </div>
            )}

            <section className="resub-v2-table-card verification-stack-card">
                <div className="resub-v2-table-head">
                    <div className="resub-verify-panel-title">
                        <span className="resub-verify-panel-icon" aria-hidden>
                            <ClipboardList size={18} />
                        </span>
                        <div>
                            <h3>{bucketConfig.listTitle}</h3>
                            <p>
                                {showLoading
                                    ? 'Loading claims…'
                                    : `${displayedClaims.length.toLocaleString()} claim${
                                          displayedClaims.length === 1 ? '' : 's'
                                      }${
                                          !isResubmitted && cycleFilter !== 'all'
                                              ? ` · Cycle ${cycleFilter}`
                                              : ''
                                      } · expand a claim to review lines`}
                            </p>
                        </div>
                    </div>
                    <div className="resub-verify-accordion-tools">
                        {!isResubmitted && !showLoading && cycleOptions.length > 0 && (
                            <label className="resub-verify-cycle-filter">
                                <span className="resub-verify-cycle-filter-label">Cycle</span>
                                <select
                                    className="resub-verify-cycle-filter-select"
                                    value={cycleFilter}
                                    onChange={(e) => setCycleFilter(e.target.value)}
                                    aria-label="Filter by claim cycle"
                                >
                                    <option value="all">All cycles</option>
                                    {cycleOptions.map((cycle) => (
                                        <option key={cycle} value={String(cycle)}>
                                            Cycle {cycle}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        {!showLoading && displayedClaims.length > 1 && (
                            <>
                                <button type="button" className="resub-verify-accordion-tool" onClick={expandAll}>
                                    Expand all
                                </button>
                                <button type="button" className="resub-verify-accordion-tool" onClick={collapseAll}>
                                    Collapse all
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {isPending && !showLoading && selectedCount > 0 && (
                    <div className="resub-verify-selection-bar">
                        <span className="resub-verify-selection-copy">
                            {selectedCount} claim{selectedCount === 1 ? '' : 's'} selected
                        </span>
                        <button
                            type="button"
                            className="legacy-btn verification-move-btn"
                            onClick={moveSelectedToVerification}
                            disabled={movingClaims}
                        >
                            <ArrowRightCircle size={14} aria-hidden />
                            Move selected claims to verification
                        </button>
                    </div>
                )}

                {isVerification && !showLoading && selectedCount > 0 && (
                    <div className="resub-verify-selection-bar">
                        <span className="resub-verify-selection-copy">
                            {selectedCount} claim{selectedCount === 1 ? '' : 's'} selected
                        </span>
                        <button
                            type="button"
                            className="legacy-btn verification-confirm-submit-btn"
                            onClick={moveSelectedToSubmit}
                            disabled={movingClaims || confirmingSubmit || savingDraft}
                        >
                            <ArrowRightCircle size={14} aria-hidden />
                            Move selected to submit
                        </button>
                    </div>
                )}

                {showLoading ? (
                    <div className="verification-claims-stack" role="status" aria-live="polite" aria-busy="true">
                        <div className="resub-verify-loading-banner">
                            <Loader2 size={16} className="resub-verify-loading-icon" aria-hidden />
                            Loading claims…
                        </div>
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={`skel-claim-${i}`} className="verification-claim-card verification-claim-card--skel">
                                <div className="verification-claim-header verification-claim-header--skel">
                                    <span className="resub-verify-skel resub-verify-skel--chevron" />
                                    <span className="resub-verify-skel resub-verify-skel--id" />
                                    <span className="resub-verify-skel resub-verify-skel--sub" />
                                    <span className="resub-verify-skel resub-verify-skel--pill" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : displayedClaims.length === 0 ? (
                    <div className="resub-verify-loading" role="status">
                        No {bucketConfig.emptyLabel} claims found for this insurer in the current filter scope.
                    </div>
                ) : (
                <>
                    {isPending || isVerification ? (
                        <div className="resub-verify-select-all-bar">
                            <label className="resub-verify-select-all">
                                <input
                                    ref={selectAllRef}
                                    type="checkbox"
                                    className="verification-claim-checkbox"
                                    checked={allDisplayedSelected}
                                    onChange={toggleSelectAllDisplayed}
                                    disabled={movingClaims || confirmingSubmit}
                                    aria-label="Select all filtered claims"
                                />
                                <span>Select all</span>
                            </label>
                        </div>
                    ) : null}
                <div className="verification-claims-stack">
                    {displayedClaims.map(({ claim, claimIndex }) => {
                        const key = claimKey(claim.claimId, claimIndex);
                        return (
                            <VerificationClaimCard
                                key={key}
                                claim={claim}
                                claimIndex={claimIndex}
                                isOpen={expandedIds.has(key)}
                                formState={claimFormState[claim.claimId]}
                                columns={tableColumns}
                                isPending={isPending}
                                isVerification={isVerification}
                                isSubmit={isSubmit}
                                isResubmitted={isResubmitted}
                                isSelected={selectedClaimKeys.has(key)}
                                onToggle={toggleClaim}
                                onToggleSelect={toggleClaimSelection}
                                onClaimFormChange={onClaimFormChange}
                                onLeaveCorrection={requestLeaveCorrection}
                                onOpenClaimDetails={openClaimDetails}
                                onMoveToVerification={moveClaimsToVerification}
                                onMoveBackToVerification={moveClaimsBackToVerification}
                                onConfirmToSubmit={confirmClaimsToSubmit}
                                onSaveAsDraft={saveClaimsAsDraft}
                                onPreviewXml={previewClaimXml}
                                onDownloadSubmissionFile={downloadSubmissionFile}
                                downloadingSubmissionKey={downloadingSubmissionKey}
                                moveInProgress={movingClaims}
                                confirmInProgress={confirmingSubmit}
                                saveDraftInProgress={savingDraft}
                                previewXmlInProgress={previewingXmlKey === key}
                            />
                        );
                    })}
                </div>
                </>
                )}
            </section>

            {detailsSession && detailsClaim && workspaceByClaim[detailsSession.workspaceKey] && (
                <VerificationClaimDetailsModal
                    claim={detailsClaim}
                    data={workspaceByClaim[detailsSession.workspaceKey]}
                    mode={detailsSession.mode}
                    onChange={(next) => {
                        setWorkspaceByClaim((prev) => ({
                            ...prev,
                            [detailsSession.workspaceKey]: next,
                        }));
                        if (detailsSession.mode === 'edit') {
                            onClaimFormChange(detailsClaim.claimId, {});
                        }
                    }}
                    onClose={() => setDetailsSession(null)}
                />
            )}

            {submitConfirm && (
                <div
                    className="resub-move-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="resub-submit-unsaved-title"
                    aria-describedby="resub-submit-unsaved-text"
                >
                    <div className="resub-move-modal resub-reset-modal">
                        <div className="resub-reset-modal-icon" aria-hidden>
                            <AlertTriangle size={26} />
                        </div>
                        <h2 id="resub-submit-unsaved-title" className="resub-move-modal-title">
                            Save as draft and submit?
                        </h2>
                        <p id="resub-submit-unsaved-text" className="resub-move-modal-text">
                            {submitConfirmClaims.length === 1 ? (
                                <>
                                    Unsaved changes for <strong>{submitConfirmClaims[0].claimId}</strong> — save as
                                    draft and submit?
                                </>
                            ) : (
                                <>
                                    Unsaved changes on {submitConfirmClaims.length || submitConfirm.keys.length}{' '}
                                    selected claim
                                    {(submitConfirmClaims.length || submitConfirm.keys.length) === 1 ? '' : 's'} — save
                                    as draft and submit?
                                </>
                            )}
                        </p>
                        <div className="resub-reset-modal-actions">
                            <button
                                type="button"
                                className="legacy-btn legacy-btn-light"
                                onClick={cancelSubmitConfirm}
                                disabled={savingDraft || confirmingSubmit}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="legacy-btn verification-confirm-submit-btn"
                                onClick={confirmUnsavedSubmit}
                                disabled={savingDraft || confirmingSubmit}
                            >
                                {savingDraft ? (
                                    <Loader2 size={14} className="resub-verify-loading-icon" aria-hidden />
                                ) : (
                                    <CheckCircle2 size={14} aria-hidden />
                                )}
                                {savingDraft ? 'Saving…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {leaveCorrection && (
                <div
                    className="resub-move-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="resub-reset-title"
                    aria-describedby="resub-reset-text"
                >
                    <div className="resub-move-modal resub-reset-modal">
                        <div className="resub-reset-modal-icon" aria-hidden>
                            <AlertTriangle size={26} />
                        </div>
                        <h2 id="resub-reset-title" className="resub-move-modal-title">
                            Restore original claim data?
                        </h2>
                        <p id="resub-reset-text" className="resub-move-modal-text">
                            Switching away from correction will undo edited or corrected data for{' '}
                            <strong>{leaveCorrection.claim.claimId}</strong> and restore the original claim
                            details from before editing.
                        </p>
                        <div className="resub-reset-modal-actions">
                            <button
                                type="button"
                                className="legacy-btn legacy-btn-light"
                                onClick={cancelLeaveCorrection}
                                disabled={resettingCorrection}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="legacy-btn verification-confirm-submit-btn"
                                onClick={confirmLeaveCorrection}
                                disabled={resettingCorrection}
                            >
                                {resettingCorrection ? (
                                    <Loader2 size={14} className="resub-verify-loading-icon" aria-hidden />
                                ) : null}
                                {resettingCorrection ? 'Restoring…' : 'Restore original data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {movingClaims && (
                <div
                    className="resub-move-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="resub-move-loading-title"
                    aria-busy="true"
                >
                    <div className="resub-move-modal">
                        <div className="resub-move-modal-spinner" aria-hidden>
                            <Loader2 size={32} className="resub-move-modal-spin" />
                        </div>
                        <h2 id="resub-move-loading-title" className="resub-move-modal-title">
                            Moving to {movingDestination}
                        </h2>
                        <p className="resub-move-modal-text">
                            {movingClaimCount} claim{movingClaimCount === 1 ? '' : 's'} — please wait while we
                            update status…
                        </p>
                    </div>
                </div>
            )}

            {dhpoSubmitResult && (() => {
                const dhpoSuccess = isDhpoSubmitSuccess(dhpoSubmitResult);
                const header = dhpoSubmitResult.header && typeof dhpoSubmitResult.header === 'object'
                    ? dhpoSubmitResult.header
                    : null;
                const errorEntries = dhpoErrorReportEntries(dhpoSubmitResult.errorReport);

                return (
                <div
                    className="resub-move-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="resub-dhpo-result-title"
                    aria-describedby="resub-dhpo-result-body"
                    onClick={(e) => e.target === e.currentTarget && setDhpoSubmitResult(null)}
                >
                    <div className="resub-move-modal resub-dhpo-result-modal">
                        <div
                            className={`resub-dhpo-result-icon${
                                dhpoSuccess ? '' : ' resub-dhpo-result-icon--error'
                            }`}
                            aria-hidden
                        >
                            {dhpoSuccess ? (
                                <CheckCircle2 size={26} />
                            ) : (
                                <AlertTriangle size={26} />
                            )}
                        </div>
                        <h2 id="resub-dhpo-result-title" className="resub-move-modal-title">
                            {dhpoSuccess ? 'Submission successful' : 'Submission failed'}
                        </h2>
                        <p className="resub-move-modal-text resub-dhpo-result-message">
                            {dhpoErrorMessage(
                                dhpoSubmitResult,
                                dhpoSuccess ? 'Operation is successful' : 'DHPO submission failed'
                            )}
                        </p>
                        <div id="resub-dhpo-result-body" className="resub-dhpo-result-body">
                            <DhpoResultDetailRow
                                label="File"
                                value={dhpoSubmitResult.file_name}
                                stacked
                            />
                            {header && (
                                <>
                                    <DhpoResultDetailRow label="Sender ID" value={header.SenderID} />
                                    <DhpoResultDetailRow label="Receiver ID" value={header.ReceiverID} />
                                    <DhpoResultDetailRow
                                        label="Transaction date"
                                        value={header.TransactionDate}
                                    />
                                    <DhpoResultDetailRow
                                        label="Record count"
                                        value={
                                            header.RecordCount != null ? String(header.RecordCount) : ''
                                        }
                                    />
                                    <DhpoResultDetailRow
                                        label="Disposition"
                                        value={header.DispositionFlag}
                                    />
                                </>
                            )}
                        </div>
                        {!dhpoSuccess && errorEntries.length > 0 && (
                            <div className="resub-dhpo-error-report">
                                <span className="resub-dhpo-error-report-label">Error report</span>
                                <ul className="resub-dhpo-error-report-list">
                                    {errorEntries.map((entry, index) => (
                                        <li key={`${index}-${entry.slice(0, 24)}`}>{entry}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="resub-reset-modal-actions">
                            <button
                                type="button"
                                className={`legacy-btn ${
                                    dhpoSuccess
                                        ? 'verification-confirm-submit-btn'
                                        : 'legacy-btn-light resub-dhpo-result-dismiss-btn'
                                }`}
                                onClick={() => setDhpoSubmitResult(null)}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
