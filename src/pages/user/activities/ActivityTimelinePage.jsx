import React, { useEffect, useMemo, useState, startTransition } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../../utils/apiFetch';
import { usePortal } from '../../../context/PortalContext';

const isActiveStatus = (v) => Number(v) === 1;

const pickAmount = (...vals) => {
    for (const v of vals) {
        if (v != null && v !== '') {
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
    }
    return null;
};

const fmtAmount = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '-';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
};

const fmtQty = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '-';
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const displayOrDash = (v) => (v == null || v === '' ? '-' : String(v));

const ActiveChip = ({ active }) => (
    <span className={`status-chip ${active ? 'is-active' : 'is-inactive'}`}>
        {active ? 'Active' : 'Inactive'}
    </span>
);

const EventTypePill = ({ value }) => {
    const type = String(value || '').toLowerCase();
    const cls = type.includes('remittance') ? 'event-pill remittance' : 'event-pill submission';
    return <span className={cls}>{displayOrDash(value)}</span>;
};

/** Fixed claim-header template from timeline API identity fields. Always render; blank if missing. */
const CLAIM_HEADER_TEMPLATE = [
    { key: 'facilityId', label: 'Facility' },
    { key: 'memberId', label: 'Member ID' },
    { key: 'emiratesIdNumber', label: 'Emirates ID' },
    { key: 'patientId', label: 'Patient ID' },
    { key: 'receiverId', label: 'Receiver' },
    { key: 'senderId', label: 'Sender' },
    { key: 'payerId', label: 'Payer' },
    { key: 'idPayer', label: 'ID Payer' },
    { key: 'providerId', label: 'Provider' },
    { key: 'clinician', label: 'Clinician' },
];

const hasHeaderVal = (v) => v != null && String(v).trim() !== '';

const coalesceCycleField = (timeline, selectedCycle, key) => {
    if (hasHeaderVal(selectedCycle?.[key])) return String(selectedCycle[key]).trim();
    for (const cycle of timeline) {
        if (hasHeaderVal(cycle?.[key])) return String(cycle[key]).trim();
    }
    return '';
};

const ActivityTimelinePage = () => {
    const { claimId } = useParams();
    const navigate = useNavigate();
    const { path: portalPath } = usePortal();
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCycleIndex, setSelectedCycleIndex] = useState(0);

    useEffect(() => {
        const loadTimeline = async () => {
            if (!claimId) return;
            setLoading(true);
            setError('');
            setSelectedCycleIndex(0);
            try {
                const res = await apiFetch(`/api/claims/timeline/${encodeURIComponent(claimId)}`);
                const rows = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
                setTimeline(rows);
            } catch (err) {
                console.error('Error loading claim timeline:', err);
                setError('Failed to load claim timeline.');
                setTimeline([]);
            } finally {
                setLoading(false);
            }
        };
        loadTimeline();
        const main = document.querySelector('.main-content');
        if (main instanceof HTMLElement) main.scrollTop = 0;
    }, [claimId]);

    const selectedCycle = timeline[selectedCycleIndex] || null;

    // Always show the full header template; fill from any cycle (prefer selected), else blank.
    const headerFields = useMemo(() => {
        const clinicianId = coalesceCycleField(timeline, selectedCycle, 'clinicianId');
        const clinicianName = coalesceCycleField(timeline, selectedCycle, 'clinicianName');
        const clinician = [clinicianId, clinicianName].filter(Boolean).join(' — ');

        return CLAIM_HEADER_TEMPLATE.map((field) => {
            if (field.key === 'clinician') {
                return { ...field, value: clinician };
            }
            return {
                ...field,
                value: coalesceCycleField(timeline, selectedCycle, field.key),
            };
        });
    }, [timeline, selectedCycle]);

    const eventCounts = useMemo(() => timeline.reduce((acc, row) => {
        const type = String(row?.eventType || '').toLowerCase();
        if (type.includes('submission')) acc.submissions += 1;
        if (type.includes('remittance')) acc.remittances += 1;
        return acc;
    }, { submissions: 0, remittances: 0 }), [timeline]);

    const activities = Array.isArray(selectedCycle?.activities) ? selectedCycle.activities : [];
    const isRemittanceCycle = String(selectedCycle?.eventType || '').toLowerCase().includes('remittance');

    const activityTotals = useMemo(() => activities.reduce((acc, a) => {
        const qty = Number(a?.quantity);
        const net = Number(a?.netAmount);
        const paid = Number(a?.paymentAmount);
        if (Number.isFinite(qty)) acc.quantity += qty;
        if (Number.isFinite(net)) acc.netAmount += net;
        if (Number.isFinite(paid)) acc.paymentAmount += paid;
        return acc;
    }, { quantity: 0, netAmount: 0, paymentAmount: 0 }), [activities]);

    const goBack = () => {
        startTransition(() => {
            navigate(portalPath('/crs/activities'));
        });
    };

    if (loading) {
        return (
            <div className="timeline-page timeline-page-loading">
                <button type="button" className="timeline-back-btn" onClick={goBack}>
                    ← Back
                </button>
                <div className="timeline-spinner-wrap" role="status" aria-label="Loading timeline">
                    <div className="timeline-spinner" />
                </div>
                <style>{`
                    .timeline-page-loading {
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                        min-height: calc(100vh - 120px);
                        padding: 12px 24px 36px;
                        box-sizing: border-box;
                    }
                    .timeline-back-btn {
                        align-self: flex-start;
                        border: 1px solid #dbe2ea;
                        background: #ffffff;
                        color: #334155;
                        border-radius: 6px;
                        padding: 6px 11px;
                        cursor: pointer;
                        font-size: 0.8rem;
                        font-weight: 600;
                        line-height: 1;
                    }
                    .timeline-back-btn:hover {
                        border-color: #94a3b8;
                        color: #0f172a;
                    }
                    .timeline-spinner-wrap {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 280px;
                    }
                    .timeline-spinner {
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        border: 3px solid #e2e8f0;
                        border-top-color: #2563eb;
                        animation: timeline-spin 0.7s linear infinite;
                    }
                    @keyframes timeline-spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div className="timeline-page">
                <button type="button" className="timeline-back-btn" onClick={goBack}>
                    ← Back
                </button>
                <div className="timeline-state error">{error}</div>
                <style>{`
                    .timeline-page {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                        padding: 12px 20px 36px;
                    }
                    .timeline-back-btn {
                        align-self: flex-start;
                        border: 1px solid #dbe2ea;
                        background: #ffffff;
                        color: #334155;
                        border-radius: 6px;
                        padding: 6px 11px;
                        cursor: pointer;
                        font-size: 0.8rem;
                        font-weight: 600;
                    }
                    .timeline-state.error {
                        background: #fef2f2;
                        border: 1px solid #fecaca;
                        border-radius: 10px;
                        padding: 28px;
                        text-align: center;
                        color: #b91c1c;
                        font-weight: 500;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="timeline-page">
            <header className="claim-masthead">
                <div className="masthead-nav">
                    <button type="button" className="timeline-back-btn" onClick={goBack}>
                        ← Back
                    </button>
                    <div className="masthead-identity">
                        <div className="masthead-claim">{String(claimId || '').toUpperCase()}</div>
                        <div className="masthead-counts" aria-label="Cycle summary">
                            <span>{eventCounts.submissions} submissions</span>
                            <span aria-hidden="true">/</span>
                            <span>{eventCounts.remittances} remittances</span>
                            <span aria-hidden="true">/</span>
                            <span>{timeline.length} cycles</span>
                        </div>
                    </div>
                </div>

                <dl className="masthead-meta">
                    {headerFields.map((field) => (
                        <div key={field.key}>
                            <dt>{field.label}</dt>
                            <dd className={field.value ? undefined : 'is-blank'}>{field.value || '\u00A0'}</dd>
                        </div>
                    ))}
                </dl>
            </header>

            {timeline.length === 0 ? (
                <div className="timeline-state">No timeline records found.</div>
            ) : (
                <div className="workspace">
                    <div className="table-card cycles-card">
                        <div className="table-title">Cycles</div>
                        <div className="table-wrap cycles-wrap">
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>Sr.</th>
                                        <th>Active</th>
                                        <th>Transaction Type</th>
                                        <th>Event Type</th>
                                        <th>Transaction Date</th>
                                        <th className="text-right">Gross</th>
                                        <th className="text-right">Patient Share</th>
                                        <th className="text-right">Net</th>
                                        <th className="text-right">Payment Amt</th>
                                        <th>Payment Ref</th>
                                        <th>Settlement Date</th>
                                        <th>Denial</th>
                                        <th>Comments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeline.map((cycle, idx) => {
                                        const active = isActiveStatus(cycle.activeStatus);
                                        const selected = idx === selectedCycleIndex;
                                        return (
                                            <tr
                                                key={`${cycle.claimTableId || idx}-${cycle.seqNo || idx}-${idx}`}
                                                className={[
                                                    selected ? 'is-selected' : '',
                                                    !active ? 'is-inactive-row' : '',
                                                ].filter(Boolean).join(' ')}
                                                onClick={() => setSelectedCycleIndex(idx)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedCycleIndex(idx);
                                                    }
                                                }}
                                                tabIndex={0}
                                                role="button"
                                                aria-pressed={selected}
                                            >
                                                <td>{idx + 1}</td>
                                                <td><ActiveChip active={active} /></td>
                                                <td className="strong-cell">{displayOrDash(cycle.cycleType)}</td>
                                                <td><EventTypePill value={cycle.eventType} /></td>
                                                <td>{displayOrDash(cycle.eventDate)}</td>
                                                <td className="text-right">{fmtAmount(pickAmount(cycle.grossAmt, cycle.gross))}</td>
                                                <td className="text-right">{fmtAmount(pickAmount(cycle.patientShareAmt, cycle.patientShare))}</td>
                                                <td className="text-right">{fmtAmount(pickAmount(cycle.netAmt, cycle.net))}</td>
                                                <td className="text-right">{fmtAmount(cycle.paymentAmount)}</td>
                                                <td>{displayOrDash(cycle.paymentReference)}</td>
                                                <td>{displayOrDash(cycle.settlementDate)}</td>
                                                <td>{cycle.denialCode ? <span className="denial-chip">{cycle.denialCode}</span> : '-'}</td>
                                                <td>{displayOrDash(cycle.comments)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="table-card activities-card">
                        <div className="table-title-row">
                            <div className="table-title">
                                Activities
                                {selectedCycle?.cycleType ? (
                                    <span className="table-subtitle"> · {selectedCycle.cycleType}</span>
                                ) : null}
                            </div>
                            <span className="activity-count">{activities.length}</span>
                        </div>
                        <div className="table-wrap activities-wrap">
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>Sr.</th>
                                        <th>Active</th>
                                        <th>Claim Activity Number</th>
                                        <th>Start Date</th>
                                        <th>CPT Type</th>
                                        <th>CPT Code</th>
                                        <th className="text-right">Qty</th>
                                        <th className="text-right">Net</th>
                                        {isRemittanceCycle ? <th className="text-right">Payment</th> : null}
                                        <th>Denial</th>
                                        <th>Prior Auth</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activities.length === 0 ? (
                                        <tr>
                                            <td colSpan={isRemittanceCycle ? 11 : 10} className="empty-cell">No activities for this cycle.</td>
                                        </tr>
                                    ) : activities.map((act, idx) => {
                                        const active = isActiveStatus(act.activeStatus);
                                        const cptLabel = act.cptDescription
                                            ? `${act.cptCode || act.activityCode || '-'} — ${act.cptDescription}`
                                            : (act.cptCode || act.activityCode || '-');
                                        return (
                                            <tr
                                                key={act.id || `${act.activityId}-${idx}`}
                                                className={!active ? 'is-inactive-row' : ''}
                                            >
                                                <td>{idx + 1}</td>
                                                <td><ActiveChip active={active} /></td>
                                                <td>{displayOrDash(act.activityId)}</td>
                                                <td>{displayOrDash(act.activityStart)}</td>
                                                <td>{displayOrDash(act.activityType)}</td>
                                                <td className="cpt-cell">{cptLabel}</td>
                                                <td className="text-right">{fmtQty(act.quantity)}</td>
                                                <td className="text-right">{fmtAmount(act.netAmount)}</td>
                                                {isRemittanceCycle ? (
                                                    <td className="text-right">{fmtAmount(act.paymentAmount)}</td>
                                                ) : null}
                                                <td>{act.denialCode ? <span className="denial-chip">{act.denialCode}</span> : '-'}</td>
                                                <td>{displayOrDash(act.priorAuthorizationId)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {activities.length > 0 ? (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={6} className="footer-label">Totals</td>
                                            <td className="text-right">{fmtQty(activityTotals.quantity)}</td>
                                            <td className="text-right">{fmtAmount(activityTotals.netAmount)}</td>
                                            {isRemittanceCycle ? (
                                                <td className="text-right">{fmtAmount(activityTotals.paymentAmount)}</td>
                                            ) : null}
                                            <td colSpan={2} />
                                        </tr>
                                    </tfoot>
                                ) : null}
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .timeline-page {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    padding: 12px 24px 36px;
                    background: transparent;
                    box-sizing: border-box;
                    max-width: 100%;
                    min-height: 100%;
                }
                .claim-masthead {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                }
                .masthead-nav {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 12px 16px;
                    border-bottom: 1px solid #eef2f7;
                }
                .timeline-back-btn {
                    border: 1px solid #dbe2ea;
                    background: #ffffff;
                    color: #334155;
                    border-radius: 6px;
                    padding: 6px 11px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                    line-height: 1;
                    transition: border-color 0.15s ease, color 0.15s ease;
                }
                .timeline-back-btn:hover {
                    border-color: #94a3b8;
                    color: #0f172a;
                }
                .masthead-identity {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    min-width: 0;
                }
                .masthead-claim {
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: -0.02em;
                    line-height: 1.2;
                }
                .masthead-counts {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #64748b;
                    font-size: 0.78rem;
                    font-weight: 500;
                }
                .masthead-counts span[aria-hidden="true"] {
                    color: #cbd5e1;
                }
                .masthead-meta {
                    display: grid;
                    grid-template-columns: repeat(5, minmax(0, 1fr));
                    gap: 0;
                    margin: 0;
                    padding: 0;
                }
                .masthead-meta > div {
                    padding: 12px 16px;
                    border-right: 1px solid #eef2f7;
                    border-top: 1px solid #eef2f7;
                    min-width: 0;
                }
                .masthead-meta > div:nth-child(5n) {
                    border-right: none;
                }
                .masthead-meta dt {
                    margin: 0 0 4px;
                    font-size: 0.68rem;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: #94a3b8;
                }
                .masthead-meta dd {
                    margin: 0;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #0f172a;
                    word-break: break-word;
                    line-height: 1.35;
                    min-height: 1.35em;
                }
                .masthead-meta dd.is-blank {
                    color: transparent;
                }

                .timeline-state {
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    padding: 40px;
                    text-align: center;
                    color: #64748b;
                    font-weight: 500;
                }
                .timeline-state.error { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }

                .workspace {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }
                .table-card {
                    background: #ffffff;
                    border: 1px solid #e8eef5;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
                }
                .table-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    border-bottom: 1px solid #f1f5f9;
                    background: #ffffff;
                    padding-right: 16px;
                }
                .table-title {
                    padding: 14px 18px;
                    color: #334155;
                    font-weight: 700;
                    font-size: 0.95rem;
                }
                .table-title-row .table-title {
                    border-bottom: none;
                    padding-right: 0;
                }
                .table-card > .table-title {
                    border-bottom: 1px solid #f1f5f9;
                    background: #ffffff;
                }
                .table-subtitle {
                    color: #64748b;
                    font-weight: 500;
                    font-size: 0.88rem;
                }
                .activity-count {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                    border-radius: 999px;
                    padding: 4px 10px;
                    font-size: 0.78rem;
                    font-weight: 700;
                    min-width: 28px;
                    text-align: center;
                }
                .table-wrap {
                    overflow-x: auto;
                    overflow-y: visible;
                }
                .cycles-wrap,
                .activities-wrap {
                    max-height: none;
                    min-height: 0;
                }

                .detail-table {
                    border-collapse: separate;
                    border-spacing: 0;
                    width: max-content;
                    min-width: 100%;
                    font-size: 0.84rem;
                }
                .detail-table th {
                    background: #f8fafc;
                    color: #64748b;
                    font-weight: 700;
                    border-bottom: 1px solid #e2e8f0;
                    border-right: 1px solid #f1f5f9;
                    text-align: left;
                    white-space: nowrap;
                    padding: 12px 14px;
                    font-size: 0.72rem;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .detail-table td {
                    border-bottom: 1px solid #f1f5f9;
                    border-right: 1px solid #f8fafc;
                    color: #1e293b;
                    padding: 12px 14px;
                    vertical-align: middle;
                    max-width: 320px;
                    word-break: break-word;
                    line-height: 1.45;
                    background: #ffffff;
                }
                .detail-table tbody tr:nth-child(even) td { background: #fcfdff; }
                .detail-table tbody tr:hover td { background: #f8fafc; }
                .detail-table tbody tr.is-selected td { background: #eff6ff !important; }
                .detail-table tbody tr.is-selected:hover td { background: #dbeafe !important; }
                .detail-table tbody tr.is-inactive-row td { background: #fef2f2 !important; }
                .detail-table tbody tr.is-inactive-row.is-selected td { background: #fee2e2 !important; }
                .detail-table tbody tr[role="button"] { cursor: pointer; }
                .detail-table tbody tr[role="button"]:focus-visible td {
                    outline: 2px solid #2563eb;
                    outline-offset: -2px;
                }
                .detail-table tfoot td {
                    background: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                    font-weight: 700;
                    color: #0f172a;
                    padding: 12px 14px;
                }
                .footer-label { text-align: right; color: #64748b; }

                .text-right { text-align: right; font-variant-numeric: tabular-nums; }
                .strong-cell { font-weight: 700; color: #0f172a; }
                .cpt-cell { max-width: 360px; }
                .empty-cell { text-align: center; color: #94a3b8; padding: 32px !important; font-style: italic; }

                .status-chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 3px 9px;
                    border-radius: 999px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    text-transform: uppercase;
                    border: 1px solid transparent;
                    white-space: nowrap;
                }
                .status-chip.is-active {
                    background: #ecfdf5;
                    color: #047857;
                    border-color: #a7f3d0;
                }
                .status-chip.is-inactive {
                    background: #fef2f2;
                    color: #b91c1c;
                    border-color: #fecaca;
                }
                .event-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 3px 9px;
                    border-radius: 999px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    border: 1px solid transparent;
                    white-space: nowrap;
                }
                .event-pill.submission { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
                .event-pill.remittance { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
                .denial-chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 3px 8px;
                    border-radius: 8px;
                    background: #fff7ed;
                    color: #c2410c;
                    border: 1px solid #fed7aa;
                    font-size: 0.72rem;
                    font-weight: 700;
                    white-space: nowrap;
                }

                @media (max-width: 1100px) {
                    .masthead-meta {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .masthead-meta > div:nth-child(4n) {
                        border-right: 1px solid #eef2f7;
                    }
                    .masthead-meta > div:nth-child(2n) {
                        border-right: none;
                    }
                }
                @media (max-width: 640px) {
                    .masthead-nav {
                        align-items: flex-start;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .masthead-meta {
                        grid-template-columns: 1fr;
                    }
                    .masthead-meta > div,
                    .masthead-meta > div:nth-child(2n),
                    .masthead-meta > div:nth-child(4n) {
                        border-right: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default ActivityTimelinePage;
