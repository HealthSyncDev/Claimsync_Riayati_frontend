import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../../utils/apiFetch';
import { usePortal } from '../../../context/PortalContext';
import { RESUBMISSION_COLUMNS } from './resubmissionDummyData';
import { mapRawActivityToResubmissionRow } from './resubmissionActivityMap';
import { computeCommonActivitySummary } from './resubmissionActivitySummary';
import { formatAmount, MIN_COL_WIDTH_PX, RESUBMISSION_DEFAULT_WIDTHS } from './resubmissionShared';
import './crs-report.css';
import './resubmission-report.css';
import './crs-claims-page-chrome.css';

const RESERVED_CLAIM_SEGMENTS = new Set(['insurer', 'payer', 'verification']);

const ResubmissionClaimDetail = () => {
    const { claimId: claimIdParam } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { path: portalPath } = usePortal();
    const claimSnapshot = location.state?.claim;

    const decodedClaimId = claimIdParam ? decodeURIComponent(claimIdParam) : '';

    useEffect(() => {
        if (RESERVED_CLAIM_SEGMENTS.has(decodedClaimId.toLowerCase())) {
            navigate(portalPath('/crs/resubmission'), { replace: true });
        }
    }, [decodedClaimId, navigate, portalPath]);

    const [activityRows, setActivityRows] = useState([]);
    const [rawApiRows, setRawApiRows] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showTotals, setShowTotals] = useState(true);
    const [columnWidths, setColumnWidths] = useState(() => ({ ...RESUBMISSION_DEFAULT_WIDTHS }));
    const resizeDragRef = useRef({ key: null, startX: 0, startWidth: 0 });

    const claimInvoiceLabel = useMemo(() => {
        if (claimSnapshot) {
            return String(claimSnapshot.invoiceNo || claimSnapshot.claimId || claimSnapshot.id || decodedClaimId || '—');
        }
        return decodedClaimId || '—';
    }, [claimSnapshot, decodedClaimId]);

    const fetchActivities = useCallback(async () => {
        const claimId = String(decodedClaimId || '').trim();
        if (!claimId) return;
        setDetailLoading(true);
        try {
            const res = await apiFetch(`/api/activity-report/claim-details?claimId=${encodeURIComponent(claimId)}`);
            let detailsList = [];
            if (Array.isArray(res)) detailsList = res;
            else if (Array.isArray(res?.data)) detailsList = res.data;
            else {
                const single = res?.data || res?.claim || res?.content || res;
                detailsList = single ? [single] : [];
            }
            const rows = detailsList.map((act, i) => mapRawActivityToResubmissionRow(act, i));
            setRawApiRows(detailsList);
            setActivityRows(rows);
        } catch (e) {
            console.error('Claim activities:', e);
            setRawApiRows([]);
            setActivityRows([]);
        } finally {
            setDetailLoading(false);
        }
    }, [decodedClaimId]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    useEffect(() => {
        const onMove = (e) => {
            const { key, startX, startWidth } = resizeDragRef.current;
            if (!key) return;
            const next = Math.max(MIN_COL_WIDTH_PX, Math.round(startWidth + (e.clientX - startX)));
            setColumnWidths((prev) => {
                if (prev[key] === next) return prev;
                return { ...prev, [key]: next };
            });
        };
        const onEnd = () => {
            if (!resizeDragRef.current.key) return;
            resizeDragRef.current = { key: null, startX: 0, startWidth: 0 };
            document.body.style.removeProperty('cursor');
            document.body.style.removeProperty('user-select');
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
        };
    }, []);

    const onColumnResizeStart = (e, colKey) => {
        e.preventDefault();
        e.stopPropagation();
        resizeDragRef.current = {
            key: colKey,
            startX: e.clientX,
            startWidth: columnWidths[colKey] ?? MIN_COL_WIDTH_PX,
        };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const renderActivityCell = (col, row) => {
        const v = row[col.key];
        if (v === '' || v === null || v === undefined) return <span className="resubmission-cell-muted">—</span>;
        if (col.key === 'RejectedIfAny') {
            const hasRejectedValue = Number(v) > 0;
            return (
                <span className={`text-right resubmission-num ${hasRejectedValue ? 'rejected-amount' : ''}`}>
                    {formatAmount(v)}
                </span>
            );
        }
        if (
            ['NetAmount', 'CoPayment', 'Deductible', 'InsLiability', 'NetApproved', 'RejectedIfAny', 'WriteoffAmt', 'ResubLiability'].includes(
                col.key
            )
        ) {
            return <span className="text-right resubmission-num">{formatAmount(v)}</span>;
        }
        if (col.key === 'Status') {
            const s = String(v).toLowerCase();
            let cls = 'neutral';
            if (s.includes('approved')) cls = 'success';
            else if (s.includes('den') || s.includes('reject')) cls = 'error';
            else if (s.includes('partial') || s.includes('submit')) cls = 'warning';
            return <span className={`status-pill ${cls}`}>{v}</span>;
        }
        if (col.key === 'ServiceDescriptionIcdCode') {
            return <span className="service-description-cell">{String(v)}</span>;
        }
        if (col.key === 'RejectReason') {
            return <span className="reject-reason-cell">{String(v)}</span>;
        }
        if (col.key === 'PriorAuthId') {
            return <span className="prior-auth-id-cell">{String(v)}</span>;
        }
        if (col.key === 'ActivityNumber') {
            return <span className="activity-number-cell">{String(v)}</span>;
        }
        return String(v);
    };

    const activityTotals = useMemo(() => {
        const keys = [
            'NetAmount',
            'CoPayment',
            'Deductible',
            'InsLiability',
            'NetApproved',
            'RejectedIfAny',
            'WriteoffAmt',
            'ResubLiability',
        ];
        const o = {};
        keys.forEach((k) => {
            o[k] = activityRows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
        });
        return o;
    }, [activityRows]);

    const activityCommonSummary = useMemo(() => computeCommonActivitySummary(rawApiRows), [rawApiRows]);

    const backToResubmissionList = () => navigate('..', { relative: 'path' });

    const viewClaimDetails = () => {
        const id = String(decodedClaimId || '').trim();
        if (!id) return;
        navigate(portalPath(`/crs/claims/${encodeURIComponent(id)}`));
    };

    if (!decodedClaimId) {
        return (
            <div className="crs-dashboard-container crs-claims-page-chrome">
                <div className="dashboard-content">
                    <div className="resubmission-detail-back-row">
                        <button type="button" className="btn-filter-toggle" onClick={backToResubmissionList}>
                            ← Back to resubmission list
                        </button>
                    </div>
                    <div className="content-card resubmission-detail-full-card">
                        <div className="resubmission-empty-hint">Invalid claim id.</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="crs-dashboard-container crs-claims-page-chrome">
            <div className="dashboard-content">
                <div className="resubmission-detail-toolbar">
                    <button type="button" className="btn-filter-toggle" onClick={backToResubmissionList}>
                        ← Back to list
                    </button>
                    <div className="resubmission-detail-toolbar-right">
                        <button
                            type="button"
                            className={`btn-filter-toggle ${showTotals ? 'active' : ''}`}
                            onClick={() => setShowTotals(!showTotals)}
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>Totals</span>
                        </button>
                    </div>
                </div>

                <div className="content-card resubmission-detail-full-card">
                    <div className="resubmission-claim-id-bar">
                        <span className="resubmission-claim-id-label">Invoice / Claim</span>
                        <span className="resubmission-claim-id-value">{claimInvoiceLabel}</span>
                    </div>
                    <div className="resubmission-claim-actions">
                        <button type="button" className="legacy-btn legacy-btn-light" onClick={viewClaimDetails}>
                            View claim details
                        </button>
                        <button type="button" className="legacy-btn legacy-btn-light" onClick={() => alert('Edit medical data — connect API')}>
                            Edit medical data
                        </button>
                        <button type="button" className="legacy-btn legacy-btn-light" onClick={() => alert('Attach documents — connect API')}>
                            Attach documents
                        </button>
                        <button type="button" className="legacy-btn legacy-btn-primary" onClick={() => alert('Resubmit — connect API')}>
                            Resubmit
                        </button>
                    </div>

                    {!detailLoading && activityCommonSummary.length > 0 && (
                        <div className="resubmission-activity-common-strip" aria-label="Fields shared across activities">
                            <div className="resubmission-activity-common-strip-inner">
                                <header className="resubmission-activity-common-strip-head">
                                    <span className="resubmission-activity-common-strip-accent" aria-hidden="true" />
                                    <div className="resubmission-activity-common-strip-head-text">
                                        <span className="resubmission-activity-common-strip-title">Shared for this claim</span>
                                        <span className="resubmission-activity-common-strip-caption">
                                            Same on every line below
                                        </span>
                                    </div>
                                </header>
                                <div className="resubmission-activity-common-grid">
                                    {activityCommonSummary.map(({ key, label, value }) => (
                                        <div key={key} className="resubmission-activity-common-cell">
                                            <span className="resubmission-activity-common-cell-label">{label}</span>
                                            <span className="resubmission-activity-common-cell-value" title={value}>
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {detailLoading ? (
                        <div className="resubmission-detail-loading">Loading activities…</div>
                    ) : (
                        <div className="table-responsive resubmission-activity-table-wrap--page">
                            <table className="modern-table resubmission-modern-table">
                                <colgroup>
                                    {RESUBMISSION_COLUMNS.map((col) => (
                                        <col key={col.key} style={{ width: columnWidths[col.key] }} />
                                    ))}
                                </colgroup>
                                <thead>
                                    <tr>
                                        {RESUBMISSION_COLUMNS.map((col) => (
                                            <th key={col.key} title={col.label}>
                                                <span className="resubmission-th-label">{col.label}</span>
                                                <span
                                                    className="resubmission-col-resize-handle"
                                                    role="separator"
                                                    aria-orientation="vertical"
                                                    aria-label={`Resize ${col.label}`}
                                                    onPointerDown={(e) => onColumnResizeStart(e, col.key)}
                                                />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={Math.max(RESUBMISSION_COLUMNS.length, 1)} className="empty-state">
                                                No activities returned for this claim.
                                            </td>
                                        </tr>
                                    ) : (
                                        activityRows.map((row, idx) => (
                                            <tr key={`act-${idx}`}>
                                                {RESUBMISSION_COLUMNS.map((col) => (
                                                    <td key={col.key}>{renderActivityCell(col, row)}</td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {activityRows.length > 0 && showTotals && (
                                    <tfoot className="resubmission-activity-tfoot">
                                        <tr>
                                            <td colSpan={3}>
                                                <strong>Total</strong>
                                            </td>
                                            {RESUBMISSION_COLUMNS.slice(3).map((col) => (
                                                <td key={col.key} className={col.key === 'RejectReason' ? '' : 'text-right'}>
                                                    {[
                                                        'NetAmount',
                                                        'CoPayment',
                                                        'Deductible',
                                                        'InsLiability',
                                                        'NetApproved',
                                                        'RejectedIfAny',
                                                        'WriteoffAmt',
                                                        'ResubLiability',
                                                    ].includes(col.key) ? (
                                                        <span className="resubmission-num">{formatAmount(activityTotals[col.key])}</span>
                                                    ) : (
                                                        ''
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResubmissionClaimDetail;
