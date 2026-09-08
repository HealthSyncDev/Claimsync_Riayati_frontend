import React, { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { useResubmissionList } from './ResubmissionListContext';
import { usePortal } from '../../../context/PortalContext';
import ResubmissionFilters from './ResubmissionFilters';
import {
    MONTH_TABS,
    currentMonthValue,
    isFutureMonth,
    monthLabel,
} from './resubmissionMatrix';
import './resubmission-page.css';

const fmtCount = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString();
};

function countField(obj, keys) {
    if (!obj) return 0;
    for (const key of keys) {
        const raw = obj[key];
        if (raw == null || raw === '') continue;
        const n = Number(raw);
        if (Number.isFinite(n)) return Math.max(0, n);
    }
    return 0;
}

function CountText({ count, ariaLabel, kind }) {
    const n = Math.max(0, Number(count) || 0);
    return (
        <span
            className={`resub-matrix-count${kind ? ` resub-matrix-count--${kind}` : ''}`}
            aria-label={ariaLabel}
        >
            {fmtCount(n)}
        </span>
    );
}

function CountChip({ count, variant, to, state, ariaLabel }) {
    const n = Math.max(0, Number(count) || 0);
    const className = `resub-matrix-chip resub-matrix-chip--${variant}${n === 0 ? ' resub-matrix-chip--zero' : ''}`;
    if (!to) {
        return (
            <span className={`${className} resub-matrix-chip--static`} aria-label={ariaLabel}>
                {fmtCount(n)}
            </span>
        );
    }
    return (
        <Link
            to={to}
            state={state}
            className={className}
            aria-label={ariaLabel}
            onClick={(e) => e.stopPropagation()}
        >
            {fmtCount(n)}
        </Link>
    );
}

function verificationPath(portalPath, receiverId) {
    return portalPath(`/crs/resubmission/verification/${encodeURIComponent(receiverId)}`);
}

function pendingPath(portalPath, senderId) {
    return portalPath(`/crs/resubmission/pending/${encodeURIComponent(senderId)}`);
}

function submitPath(portalPath, receiverId) {
    return portalPath(`/crs/resubmission/submit/${encodeURIComponent(receiverId)}`);
}

function resubmittedPath(portalPath, receiverId) {
    return portalPath(`/crs/resubmission/resubmitted/${encodeURIComponent(receiverId)}`);
}

const ResubmissionReport = () => {
    const didBootstrapRef = useRef(false);
    const { path: portalPath } = usePortal();
    const {
        hasApplied,
        draftFilters,
        appliedFilters,
        fixedYearOptions,
        resubmissionReport,
        isLoadingResubmissions,
        hasLoadedResubmissions,
        isFiltering,
        handleFilterChange,
        applyDraftFilters,
        selectResubmissionMonth,
    } = useResubmissionList();

    const showLoadingState = isLoadingResubmissions || isFiltering || (!hasLoadedResubmissions && hasApplied);

    useEffect(() => {
        if (didBootstrapRef.current) return;
        if (hasApplied) {
            didBootstrapRef.current = true;
            return;
        }
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

    const selectedMonth = draftFilters.month || appliedFilters.month || '';
    const selectedYear = draftFilters.year || appliedFilters.year || '';
    const periodText = monthLabel(selectedMonth, selectedYear);

    const { rows, totals } = useMemo(() => {
        const senders = Array.isArray(resubmissionReport?.senders) ? resubmissionReport.senders : [];
        const payerRows = senders.map((sender, index) => {
            const payerId = String(sender?.sender_id ?? sender?.senderId ?? '').trim();
            const name = String(sender?.sender_name ?? sender?.senderName ?? 'Unknown').trim() || 'Unknown';
            return {
                slNo: index + 1,
                key: payerId || `sender-${index}`,
                payerId: payerId || 'Unknown',
                name,
                totalRejected: countField(sender, ['rejected_claims', 'rejectedClaims']),
                pending: countField(sender, ['pending']),
                verification: countField(sender, ['verification', 'verification_claims', 'verificationClaims']),
                submit: countField(sender, ['submit', 'submit_claims', 'submitClaims', 'submission']),
                resubmitted: countField(sender, ['resubmitted']),
                writeOff: countField(sender, [
                    'write_off',
                    'writeOff',
                    'writeoff',
                    'write_off_claims',
                    'writeOffClaims',
                ]),
            };
        });

        return {
            rows: payerRows,
            totals: {
                totalRejected: countField(resubmissionReport, [
                    'total_rejected_claims',
                    'totalRejectedClaims',
                ]),
                pending: countField(resubmissionReport, ['total_pending', 'totalPending']),
                verification: countField(resubmissionReport, [
                    'total_verification',
                    'totalVerification',
                ]),
                submit: countField(resubmissionReport, ['total_submit', 'totalSubmit', 'total_submission']),
                resubmitted: countField(resubmissionReport, [
                    'total_resubmitted',
                    'totalResubmitted',
                ]),
                writeOff: countField(resubmissionReport, [
                    'total_write_off',
                    'totalWriteOff',
                    'total_writeoff',
                ]),
            },
        };
    }, [resubmissionReport]);

    const clearancePct =
        totals.totalRejected > 0 ? Math.round((totals.resubmitted / totals.totalRejected) * 100) : 0;

    const selectMonth = (monthValue) => {
        if (monthValue === selectedMonth) return;
        if (isFutureMonth(monthValue, selectedYear)) return;
        selectResubmissionMonth(monthValue);
    };

    return (
        <div className="resub-hub">
            <header className="resub-page-header">
                <div className="resub-page-header-text">
                    <p className="resub-page-kicker">Claims operations</p>
                    <h1 className="resub-page-title">Resubmission</h1>
                    <p className="resub-page-subtitle">
                        Rejected, pending, and resubmitted claims by payer for {periodText}.
                    </p>
                </div>
            </header>

            <div className="resub-matrix-scope">
                <ResubmissionFilters />
            </div>

            <section className="resub-kpi-grid" aria-label="Period totals">
                <article className="resub-kpi resub-kpi--rejected">
                    <span className="resub-kpi-label">Rejected</span>
                    <strong className="resub-kpi-value">
                        {showLoadingState ? '—' : fmtCount(totals.totalRejected)}
                    </strong>
                    <span className="resub-kpi-hint">Total denied claims</span>
                </article>
                <article className="resub-kpi resub-kpi--pending">
                    <span className="resub-kpi-label">Pending</span>
                    <strong className="resub-kpi-value">
                        {showLoadingState ? '—' : fmtCount(totals.pending)}
                    </strong>
                    <span className="resub-kpi-hint">Still to resubmit</span>
                </article>
                <article className="resub-kpi resub-kpi--done">
                    <span className="resub-kpi-label">Resubmitted</span>
                    <strong className="resub-kpi-value">
                        {showLoadingState ? '—' : fmtCount(totals.resubmitted)}
                    </strong>
                    <span className="resub-kpi-hint">Sent back to payer</span>
                </article>
                <article className="resub-kpi resub-kpi--rate">
                    <span className="resub-kpi-label">Clearance</span>
                    <strong className="resub-kpi-value">{showLoadingState ? '—' : `${clearancePct}%`}</strong>
                    <span className="resub-kpi-hint">Resubmitted of rejected</span>
                </article>
            </section>

            <nav className="resub-month-tabs" aria-label="Select month">
                {MONTH_TABS.map((m) => {
                    const active = selectedMonth === m.value;
                    const disabled = isFutureMonth(m.value, selectedYear);
                    return (
                        <button
                            key={m.value}
                            type="button"
                            className={`resub-month-tab${active ? ' resub-month-tab--active' : ''}${disabled ? ' resub-month-tab--disabled' : ''}`}
                            onClick={() => selectMonth(m.value)}
                            disabled={disabled}
                            aria-current={active ? 'true' : undefined}
                            aria-disabled={disabled || undefined}
                            title={disabled ? 'Future month' : undefined}
                        >
                            <span className="resub-month-tab-full">{m.label}</span>
                            <span className="resub-month-tab-short">{m.short}</span>
                        </button>
                    );
                })}
            </nav>

            <section className="resub-hub-panel resub-matrix-panel" aria-label="Payer resubmission totals">
                {showLoadingState ? (
                    <div className="resub-matrix-loading" aria-busy="true">
                        {[...Array(6)].map((_, i) => (
                            <div key={`sk-${i}`} className="resub-matrix-skeleton-row">
                                <div className="resub-queue-skeleton-line w-30" />
                                <div className="resub-queue-skeleton-line w-70" />
                                <div className="resub-queue-skeleton-line w-50" />
                            </div>
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="resub-queue-empty">
                        <div className="resub-queue-empty-icon" aria-hidden>
                            <Inbox size={24} strokeWidth={1.75} />
                        </div>
                        <h3 className="resub-queue-empty-title">No rejected claims this month</h3>
                        <p className="resub-queue-empty-text">
                            Pick another month or office to see payer-level rejection totals.
                        </p>
                    </div>
                ) : (
                    <div className="resub-matrix-scroll">
                        <table className="resub-matrix-table">
                            <thead>
                                <tr>
                                    <th className="resub-matrix-th resub-matrix-th--sl">#</th>
                                    <th className="resub-matrix-th resub-matrix-th--insurer">Payer</th>
                                    <th className="resub-matrix-th resub-matrix-th--count">Rejected</th>
                                    <th className="resub-matrix-th resub-matrix-th--count">Pending</th>
                                    <th className="resub-matrix-th resub-matrix-th--count">Verification</th>
                                    <th className="resub-matrix-th resub-matrix-th--count">Submit</th>
                                    <th className="resub-matrix-th resub-matrix-th--count">Resubmitted</th>
                                    <th className="resub-matrix-th resub-matrix-th--count">Write Off</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const receiverId = String(row.payerId || '').trim();
                                    const pendingTo =
                                        receiverId && receiverId !== 'Unknown'
                                            ? pendingPath(portalPath, receiverId)
                                            : '';
                                    const verificationTo =
                                        receiverId && receiverId !== 'Unknown'
                                            ? verificationPath(portalPath, receiverId)
                                            : '';
                                    const submitTo =
                                        receiverId && receiverId !== 'Unknown'
                                            ? submitPath(portalPath, receiverId)
                                            : '';
                                    const resubmittedTo =
                                        receiverId && receiverId !== 'Unknown'
                                            ? resubmittedPath(portalPath, receiverId)
                                            : '';
                                    const navState =
                                        pendingTo || verificationTo || submitTo || resubmittedTo
                                            ? { receiverName: row.name }
                                            : undefined;
                                    return (
                                        <tr key={row.key}>
                                            <td className="resub-matrix-td resub-matrix-td--sl">{row.slNo}</td>
                                            <td className="resub-matrix-td resub-matrix-td--insurer">
                                                {verificationTo ? (
                                                    <Link
                                                        to={verificationTo}
                                                        state={navState}
                                                        className="resub-payer-link"
                                                    >
                                                        <span className="resub-matrix-insurer-name">{row.name}</span>
                                                        <span className="resub-payer-id">{row.payerId}</span>
                                                    </Link>
                                                ) : (
                                                    <span className="resub-payer-static">
                                                        <span className="resub-matrix-insurer-name">{row.name}</span>
                                                        <span className="resub-payer-id">{row.payerId}</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="resub-matrix-td resub-matrix-td--count">
                                                <CountText
                                                    count={row.totalRejected}
                                                    ariaLabel={`${row.name}: ${row.totalRejected} rejected claims`}
                                                />
                                            </td>
                                            <td className="resub-matrix-td resub-matrix-td--count">
                                                <CountChip
                                                    count={row.pending}
                                                    variant="pending"
                                                    to={pendingTo}
                                                    state={navState}
                                                    ariaLabel={`${row.name}: ${row.pending} pending claims`}
                                                />
                                            </td>
                                            <td className="resub-matrix-td resub-matrix-td--count">
                                                <CountChip
                                                    count={row.verification}
                                                    variant="verification"
                                                    to={verificationTo}
                                                    state={navState}
                                                    ariaLabel={`${row.name}: ${row.verification} verification claims`}
                                                />
                                            </td>
                                            <td className="resub-matrix-td resub-matrix-td--count">
                                                <CountChip
                                                    count={row.submit}
                                                    variant="submit"
                                                    to={submitTo}
                                                    state={navState}
                                                    ariaLabel={`${row.name}: ${row.submit} submit claims`}
                                                />
                                            </td>
                                            <td className="resub-matrix-td resub-matrix-td--count">
                                                <CountChip
                                                    count={row.resubmitted}
                                                    variant="resubmitted"
                                                    to={resubmittedTo}
                                                    state={navState}
                                                    ariaLabel={`${row.name}: ${row.resubmitted} resubmitted claims`}
                                                />
                                            </td>
                                            <td className="resub-matrix-td resub-matrix-td--count">
                                                <CountText
                                                    count={row.writeOff}
                                                    kind="writeoff"
                                                    ariaLabel={`${row.name}: ${row.writeOff} write off claims`}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="resub-matrix-total">
                                    <td className="resub-matrix-td" colSpan={2}>
                                        Total
                                    </td>
                                    <td className="resub-matrix-td resub-matrix-td--count">
                                        <span className="resub-matrix-count resub-matrix-count--total">
                                            {fmtCount(totals.totalRejected)}
                                        </span>
                                    </td>
                                    <td className="resub-matrix-td resub-matrix-td--count">
                                        <span className="resub-matrix-chip resub-matrix-chip--total">
                                            {fmtCount(totals.pending)}
                                        </span>
                                    </td>
                                    <td className="resub-matrix-td resub-matrix-td--count">
                                        <span className="resub-matrix-chip resub-matrix-chip--total">
                                            {fmtCount(totals.verification)}
                                        </span>
                                    </td>
                                    <td className="resub-matrix-td resub-matrix-td--count">
                                        <span className="resub-matrix-chip resub-matrix-chip--total">
                                            {fmtCount(totals.submit)}
                                        </span>
                                    </td>
                                    <td className="resub-matrix-td resub-matrix-td--count">
                                        <span className="resub-matrix-chip resub-matrix-chip--total">
                                            {fmtCount(totals.resubmitted)}
                                        </span>
                                    </td>
                                    <td className="resub-matrix-td resub-matrix-td--count">
                                        <span className="resub-matrix-count resub-matrix-count--writeoff resub-matrix-count--total">
                                            {fmtCount(totals.writeOff)}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {!showLoadingState && rows.length > 0 && (
                    <footer className="resub-matrix-legend" aria-label="Column meanings">
                        <span>
                            <strong>Pending</strong> — not yet resubmitted
                        </span>
                        <span>
                            <strong>Verification</strong> — under review
                        </span>
                        <span>
                            <strong>Submit</strong> — ready to send
                        </span>
                        <span>
                            <strong>Resubmitted</strong> — sent back to the payer
                        </span>
                        <span>
                            <strong>Write Off</strong> — closed without resubmit
                        </span>
                    </footer>
                )}
            </section>
        </div>
    );
};

export default ResubmissionReport;
