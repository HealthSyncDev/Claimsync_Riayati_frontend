/** Shared rejection labels for resubmission list + verification (claim / activity lines). */

export const z = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const actRej = (act) =>
    z(act?.rejectedAmount ?? act?.rejectedAmt ?? act?.deniedAmount ?? act?.RejectedIfAny ?? act?.initialRejectedAmt);

const actIns = (act) =>
    z(act?.insLiability ?? act?.insuranceLiability ?? act?.InsLiability ?? act?.netAmount ?? act?.NetAmount);

const actNetApr = (act) =>
    z(act?.netApproved ?? act?.approvedAmount ?? act?.paidAmount ?? act?.paymentAmount ?? act?.NetApproved);

/** Claim appears on resubmission hub when it has line-level rejections or header-level rejection / pending resub work. */
export function claimHasRejectionAttention(row) {
    const acts = row?.activities || row?.claimLineItems;
    if (Array.isArray(acts) && acts.length > 0) {
        return acts.some((a) => actRej(a) > 0);
    }
    return z(row?.totalRejectedAmt ?? row?.rejectedAmount ?? row?.totalInitialRejectedAmt) > 0;
}

/**
 * @returns {{ key: 'full' | 'partial' | 'mixed' | 'none', label: string }}
 */
export function deriveClaimRejectionLabel(row) {
    const acts = row?.activities || row?.claimLineItems || [];
    if (acts.length > 0) {
        let withRej = 0;
        let fullLines = 0;
        let partialLines = 0;
        for (const act of acts) {
            const rej = actRej(act);
            if (rej <= 0) continue;
            withRej++;
            const ins = actIns(act);
            const netApr = actNetApr(act);
            const isFull = ins > 0 ? rej >= ins * 0.82 && netApr <= ins * 0.18 : netApr <= z(act?.NetAmount) * 0.12;
            if (isFull) fullLines++;
            else partialLines++;
        }
        if (withRej === 0) return { key: 'none', label: 'No rejections' };
        if (fullLines > 0 && partialLines > 0) return { key: 'mixed', label: 'Mixed rejections' };
        if (partialLines > 0) return { key: 'partial', label: 'Partially rejected' };
        return { key: 'full', label: 'Fully rejected' };
    }

    const totalRej = z(row?.totalRejectedAmt ?? row?.rejectedAmount ?? row?.totalInitialRejectedAmt);
    const rem = z(row?.totalRemittedAmt ?? row?.remittedAmount ?? row?.paymentAmount);
    const amt = z(row?.amount ?? row?.netAmount);
    if (totalRej <= 0) return { key: 'none', label: '—' };
    if (rem <= 0.02 && amt > 0 && totalRej >= amt * 0.85) return { key: 'full', label: 'Fully rejected' };
    return { key: 'partial', label: 'Partially rejected' };
}

export function activityLineRejectionKind(row) {
    const rej = z(row?.RejectedIfAny);
    const ins = z(row?.InsLiability);
    const netApr = z(row?.NetApproved);
    if (rej <= 0) return 'clean';
    if (ins > 0 && rej >= ins * 0.82 && netApr <= ins * 0.18) return 'full';
    if (rej > 0 && netApr > 0) return 'partial';
    return rej > 0 ? 'full' : 'clean';
}

export function countActivityLines(row) {
    const acts = row?.activities || row?.claimLineItems;
    if (Array.isArray(acts) && acts.length > 0) return acts.length;
    const n = z(row?.recordCount ?? row?.remittanceCount);
    return n > 0 ? n : 0;
}

export function getInsuranceName(row) {
    const name = String(
        row?.payerName || row?.payer || row?.senderName || row?.insuranceName || ''
    ).trim();
    return name || 'Unknown insurance';
}

/** Summary lines for list row — activity counts, amounts, top reasons/services. */
export function getRejectionInsights(row) {
    const acts = row?.activities || row?.claimLineItems || [];
    const rejectedActs = acts.filter((act) => actRej(act) > 0);
    const actCount = countActivityLines(row);
    const rej = z(row?.totalRejectedAmt ?? row?.rejectedAmount ?? row?.totalInitialRejectedAmt);
    const pending = z(row?.totalUnprocessedAmt);

    const reasons = [
        ...new Set(
            rejectedActs
                .map((act) =>
                    String(act?.RejectReason || act?.rejectReason || act?.denialReason || '').trim()
                )
                .filter(Boolean)
        ),
    ].slice(0, 2);

    const services = [
        ...new Set(
            rejectedActs
                .map((act) =>
                    String(
                        act?.ServiceDescriptionIcdCode ||
                            act?.serviceDescription ||
                            act?.description ||
                            ''
                    ).trim()
                )
                .filter(Boolean)
        ),
    ].slice(0, 2);

    return {
        actCount,
        rejectedCount: rejectedActs.length,
        rej,
        pending,
        reasons,
        services,
    };
}
