import React, { useEffect, useMemo, useState, startTransition } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../../utils/apiFetch';
import { usePortal } from '../../../context/PortalContext';
import './claim-details.css';

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
    <span className={`ctl-status-chip ${active ? 'is-active' : 'is-inactive'}`}>
        {active ? 'Active' : 'Inactive'}
    </span>
);

const EventTypePill = ({ value }) => {
    const type = String(value || '').toLowerCase();
    const cls = type.includes('remittance') ? 'ctl-event-pill remittance' : 'ctl-event-pill submission';
    return <span className={cls}>{displayOrDash(value)}</span>;
};

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

const ClaimDetailsPage = () => {
    const { claimId } = useParams();
    const navigate = useNavigate();
    const { path: portalPath } = usePortal();
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCycleIndex, setSelectedCycleIndex] = useState(0);

    useEffect(() => {
        const loadTimeline = async () => {
            if (!claimId) {
                setError('Missing claim id');
                setLoading(false);
                return;
            }
            setLoading(true);
            setError('');
            setSelectedCycleIndex(0);
            try {
                const res = await apiFetch(`/api/claims/timeline/${encodeURIComponent(claimId)}`);
                const rows = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
                setTimeline(rows);
                if (!rows.length) {
                    setError('');
                }
            } catch (err) {
                console.error('Failed to load claim timeline:', err);
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
            navigate(portalPath('/crs/claims'));
        });
    };

    if (loading) {
        return (
            <div className="claim-timeline-page claim-timeline-page--loading">
                <button type="button" className="ctl-back-btn" onClick={goBack}>
                    ← Back
                </button>
                <div className="ctl-spinner-wrap" role="status" aria-label="Loading claim timeline">
                    <div className="ctl-spinner" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="claim-timeline-page">
                <button type="button" className="ctl-back-btn" onClick={goBack}>
                    ← Back
                </button>
                <div className="ctl-state ctl-state--error">{error}</div>
            </div>
        );
    }

    return (
        <div className="claim-timeline-page">
            <header className="ctl-masthead">
                <div className="ctl-masthead-nav">
                    <button type="button" className="ctl-back-btn" onClick={goBack}>
                        ← Back
                    </button>
                    <div className="ctl-masthead-identity">
                        <div className="ctl-masthead-claim">{String(claimId || '').toUpperCase()}</div>
                        <div className="ctl-masthead-counts" aria-label="Cycle summary">
                            <span>{eventCounts.submissions} submissions</span>
                            <span aria-hidden="true">/</span>
                            <span>{eventCounts.remittances} remittances</span>
                            <span aria-hidden="true">/</span>
                            <span>{timeline.length} cycles</span>
                        </div>
                    </div>
                </div>

                <dl className="ctl-masthead-meta">
                    {headerFields.map((field) => (
                        <div key={field.key}>
                            <dt>{field.label}</dt>
                            <dd className={field.value ? undefined : 'is-blank'}>{field.value || '\u00A0'}</dd>
                        </div>
                    ))}
                </dl>
            </header>

            {timeline.length === 0 ? (
                <div className="ctl-state">No timeline records found.</div>
            ) : (
                <div className="ctl-workspace">
                    <div className="ctl-table-card ctl-cycles-card">
                        <div className="ctl-table-title">Cycles</div>
                        <div className="ctl-table-wrap ctl-cycles-wrap">
                            <table className="ctl-detail-table">
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
                                                <td>{cycle.denialCode ? <span className="ctl-denial-chip">{cycle.denialCode}</span> : '-'}</td>
                                                <td>{displayOrDash(cycle.comments)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="ctl-table-card ctl-activities-card">
                        <div className="ctl-table-title-row">
                            <div className="ctl-table-title">
                                Activities
                                {selectedCycle?.cycleType ? (
                                    <span className="ctl-table-subtitle"> · {selectedCycle.cycleType}</span>
                                ) : null}
                            </div>
                            <span className="ctl-activity-count">{activities.length}</span>
                        </div>
                        <div className="ctl-table-wrap ctl-activities-wrap">
                            <table className="ctl-detail-table">
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
                                                <td>{act.denialCode ? <span className="ctl-denial-chip">{act.denialCode}</span> : '-'}</td>
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
        </div>
    );
};

export default ClaimDetailsPage;
