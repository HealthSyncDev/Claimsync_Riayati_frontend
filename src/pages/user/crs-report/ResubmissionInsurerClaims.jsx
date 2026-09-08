import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ChevronRight, Inbox } from 'lucide-react';
import { useResubmissionList } from './ResubmissionListContext';
import { usePortal } from '../../../context/PortalContext';
import {
    claimHasRejectionAttention,
    deriveClaimRejectionLabel,
    getInsuranceName,
} from './resubmissionClaimStatus';
import {
    BUCKETS,
    buildInsurerMatrix,
    demoRejectionClaims,
    getClaimListTeaser,
    getClaimsForBucket,
} from './resubmissionMatrix';
import './resubmission-page.css';

const ResubmissionInsurerClaims = () => {
    const navigate = useNavigate();
    const { path: portalPath } = usePortal();
    const { insurerKey: insurerKeyParam } = useParams();
    const [searchParams] = useSearchParams();
    const insurerKey = decodeURIComponent(insurerKeyParam || '');
    const bucketParam = searchParams.get('bucket') || 'rejected';
    const bucket = BUCKETS[bucketParam] ? bucketParam : 'rejected';
    const bucketMeta = BUCKETS[bucket];

    const didBootstrapRef = useRef(false);
    const {
        draftFilters,
        fixedYearOptions,
        claimsData,
        isLoadingClaims,
        isFiltering,
        handleFilterChange,
        applyDraftFilters,
    } = useResubmissionList();

    const showLoadingState = isLoadingClaims || isFiltering;

    useEffect(() => {
        if (didBootstrapRef.current) return;
        const currentYear = String(new Date().getFullYear());
        const defaultYear = fixedYearOptions.includes(currentYear) ? currentYear : fixedYearOptions[0] || '';
        if (!defaultYear) return;
        if (!draftFilters.year) {
            handleFilterChange('searchOn', 'SubmissionTransactionDate');
            handleFilterChange('year', defaultYear);
            return;
        }
        handleFilterChange('searchOn', 'SubmissionTransactionDate');
        applyDraftFilters();
        didBootstrapRef.current = true;
    }, [draftFilters.year, fixedYearOptions, handleFilterChange, applyDraftFilters]);

    const apiRejectionClaims = useMemo(
        () => (claimsData || []).filter((row) => claimHasRejectionAttention(row)),
        [claimsData]
    );

    const useDemo = !showLoadingState && apiRejectionClaims.length === 0;
    const displayClaims = useMemo(
        () => (useDemo ? demoRejectionClaims() : apiRejectionClaims),
        [useDemo, apiRejectionClaims]
    );

    const { claimsByKey, rows } = useMemo(() => buildInsurerMatrix(displayClaims), [displayClaims]);

    const insurerRow = rows.find((r) => r.key === insurerKey);
    const insurerName =
        insurerRow?.name ||
        (claimsByKey[insurerKey]?.[0] ? getInsuranceName(claimsByKey[insurerKey][0]) : insurerKey);

    const bucketClaims = useMemo(
        () => getClaimsForBucket(displayClaims, insurerKey, bucket),
        [displayClaims, insurerKey, bucket]
    );

    const openClaim = (row) => {
        const id = String(row.claimId || row.id || '').trim();
        if (!id) return;
        // Existing verification page: activities, write-off, attachments, resubmit actions
        navigate(portalPath(`/crs/resubmission/verification/${encodeURIComponent(id)}`), { state: { claim: row } });
    };

    const goBack = () => navigate(portalPath('/crs/resubmission'));

    return (
        <div className="resub-drill">
            <nav className="resub-drill-crumb" aria-label="Breadcrumb">
                <button type="button" onClick={goBack}>
                    Resubmission
                </button>
                <span className="resub-drill-crumb-sep" aria-hidden>
                    /
                </span>
                <span>{insurerName}</span>
                <span className="resub-drill-crumb-sep" aria-hidden>
                    /
                </span>
                <span>{bucketMeta.label}</span>
            </nav>

            <header className="resub-drill-header">
                <div>
                    <h1 className="resub-drill-title">{insurerName}</h1>
                    <p className="resub-drill-sub">
                        {bucketMeta.label} ·{' '}
                        {showLoadingState
                            ? '…'
                            : `${bucketClaims.length} claim${bucketClaims.length === 1 ? '' : 's'}`}
                        <span aria-hidden> · </span>
                        {bucketMeta.description}
                    </p>
                </div>
                <button type="button" className="resub-drill-back" onClick={goBack}>
                    <ArrowLeft size={14} aria-hidden />
                    Back to matrix
                </button>
            </header>

            {useDemo && (
                <div className="resub-hub-notice" role="status">
                    <AlertCircle size={14} aria-hidden />
                    <span>Preview mode — sample claims until live data is available.</span>
                </div>
            )}

            <section className="resub-hub-panel" aria-label="Claim list">
                {showLoadingState ? (
                    <div className="resub-matrix-loading" aria-busy="true">
                        {[...Array(5)].map((_, i) => (
                            <div key={`sk-${i}`} className="resub-matrix-skeleton-row">
                                <div className="resub-queue-skeleton-line w-30" />
                                <div className="resub-queue-skeleton-line w-70" />
                                <div className="resub-queue-skeleton-line w-50" />
                            </div>
                        ))}
                    </div>
                ) : bucketClaims.length === 0 ? (
                    <div className="resub-queue-empty">
                        <div className="resub-queue-empty-icon" aria-hidden>
                            <Inbox size={24} strokeWidth={1.75} />
                        </div>
                        <h3 className="resub-queue-empty-title">No claims in this bucket</h3>
                        <p className="resub-queue-empty-text">
                            Try another count column for this insurer, or go back to the matrix.
                        </p>
                        <button type="button" className="resub-drill-back" onClick={goBack}>
                            <ArrowLeft size={14} aria-hidden />
                            Back to matrix
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="resub-drill-list-head" aria-hidden>
                            <span>Claim ID</span>
                            <span>Patient</span>
                            <span>Quick read</span>
                            <span>Status</span>
                            <span />
                        </div>
                        <ul className="resub-drill-list">
                            {bucketClaims.map((row) => {
                                const id = String(row.claimId || row.id || '');
                                const { key, label } = deriveClaimRejectionLabel(row);
                                const patient = row.patientName || row.receiverName || 'Patient';
                                return (
                                    <li key={id}>
                                        <button
                                            type="button"
                                            className="resub-drill-row"
                                            onClick={() => openClaim(row)}
                                        >
                                            <span className="resub-drill-claim-id">{id}</span>
                                            <span className="resub-drill-patient">{patient}</span>
                                            <p className="resub-drill-teaser" title={getClaimListTeaser(row)}>
                                                {getClaimListTeaser(row)}
                                            </p>
                                            <span className={`resub-drill-status resub-drill-status--${key}`}>
                                                {label}
                                            </span>
                                            <span className="resub-drill-chevron" aria-hidden>
                                                <ChevronRight size={16} />
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </section>
        </div>
    );
};

export default ResubmissionInsurerClaims;
