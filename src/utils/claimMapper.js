/**
 * Map a single raw claim item to frontend model.
 * Used in chunked processing to avoid blocking main thread.
 */
export function mapClaimItem(item) {
    const claimIdentifier = item.claimId || item.claim_id || item.invoiceNo || item.invoiceno || item.id;
    let isoDate = null;
    if (item.settlementDate) {
        const parts = item.settlementDate.split(' ');
        if (parts[0]?.includes('/')) {
            const dateParts = parts[0].split('/');
            if (dateParts.length === 3) {
                const d = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1] || '00:00'}`);
                if (!isNaN(d.getTime())) isoDate = d.toISOString();
            }
        } else {
            const d = new Date(item.settlementDate);
            if (!isNaN(d.getTime())) isoDate = d.toISOString();
        }
    }

    let isoTransactionDate = null;
    if (item.remittanceHeader?.transactionDate) {
        const parts = item.remittanceHeader.transactionDate.split(' ');
        if (parts[0]?.includes('/')) {
            const dateParts = parts[0].split('/');
            if (dateParts.length === 3) {
                const d = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1] || '00:00'}`);
                if (!isNaN(d.getTime())) isoTransactionDate = d.toISOString();
            }
        } else {
            const d = new Date(item.remittanceHeader.transactionDate);
            if (!isNaN(d.getTime())) isoTransactionDate = d.toISOString();
        }
    }

    const parseAmount = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        return Number(String(value).replace(/[^0-9.-]+/g, '')) || 0;
    };

    const getVal = (obj, keys) => {
        if (!obj) return 0;
        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) return parseAmount(obj[key]);
        }
        return 0;
    };

    const activities = Array.isArray(item.activities) ? item.activities :
        (Array.isArray(item.claimLineItems) ? item.claimLineItems : []);
    const hasActivities = activities.length > 0;

    let derivedAmt = 0, derivedRem = 0, derivedRej = 0;
    if (hasActivities) {
        activities.forEach(act => {
            derivedAmt += getVal(act, ['netAmount', 'grossAmount', 'billedAmount', 'chargeAmount', 'amount']);
            derivedRem += getVal(act, ['paidAmount', 'paymentAmount', 'remittedAmount']);
            derivedRej += getVal(act, ['rejectedAmount', 'deniedAmount']);
        });
    }

    const amt = hasActivities ? derivedAmt : getVal(item, [
        'amount', 'totalAmount', 'chargeAmount', 'billedAmount', 'claimAmount',
        'grossAmount', 'netAmount', 'totalClaimAmount', 'totalNetAmt',
        'total_amount', 'claim_amount', 'charge_amount', 'billed_amount',
        'gross_amount', 'net_amount', 'total_claim_amount'
    ]);

    const rem = hasActivities ? derivedRem : (getVal(item, [
        'remittedAmount', 'paidAmount', 'paymentAmount', 'checkAmount', 'remittanceAmount', 'totalRemittedAmt',
        'remitted_amount', 'paid_amount', 'payment_amount', 'check_amount', 'remittance_amount'
    ]) || getVal(item.remittanceHeader || {}, [
        'totalPaidAmount', 'paymentAmount', 'paidAmount',
        'total_paid_amount', 'payment_amount', 'paid_amount'
    ]));

    const rej = hasActivities ? derivedRej : getVal(item, [
        'rejectedAmount', 'deniedAmount', 'nonCoveredAmount', 'totalRejectedAmt',
        'rejected_amount', 'denied_amount', 'non_covered_amount'
    ]);

    const status = item.remittanceHeader?.dispositionFlag ||
        item.paymentStatus || item.claimStatus || item.claim_status || item.status || 'Unknown';
    const statusUpper = String(status).toUpperCase();
    const isPending = statusUpper.includes('PENDING') || statusUpper === 'PRODUCTION';

    const payerVal = item.payerId || item.payer || item.payerName || 'Unknown Payer';
    const facilityVal = item.facilityId || item.facility || item.facilityName || 'Unknown Branch';
    const clinicianVal = item.clinicianId || item.clinician || item.clinicianName || item.providerId || 'Unknown Clinician';
    const receiverIdVal = item.receiverId || item.remittanceHeader?.receiverId || null;
    const transactionDateVal = isoTransactionDate || item.remittanceHeader?.transactionDate || null;

    return {
        ...item,
        id: claimIdentifier || item.slNo,
        claimId: claimIdentifier || '',
        patientName: item.patientName || 'Unknown',
        submissionDate: item.submissionTransactionDate || isoDate || item.settlementDate || new Date().toISOString(),
        settlementDate: item.settlementDate || isoDate || item.submissionTransactionDate || new Date().toISOString(),
        amount: amt,
        remittedAmount: rem,
        rejectedAmount: rej,
        status,
        _pending: isPending ? amt : 0,
        netAmount: getVal(item, ['netAmount', 'net_amount', 'totalNetAmt']),
        grossAmount: getVal(item, ['grossAmount', 'gross_amount', 'totalNetAmt']),
        paymentAmount: getVal(item, ['paymentAmount', 'payment_amount', 'totalRemittedAmt']),
        payerId: item.payerId || '',
        providerId: item.providerId || '',
        paymentReference: item.paymentReference || '',
        facilityId: item.facilityId || item.facility || '',
        officeName: item.officeName || item.facilityName || item.remittanceHeader?.officeName || '',
        receiverName: item.remittanceHeader?.officeName || item.receiverName || item.remittanceHeader?.receiverName || '',
        payerName: (item.payerName || item.payer || '').trim() || '',
        senderId: item.senderId || item.remittanceHeader?.senderId || '',
        transactionId: item.transactionId || item.remittanceHeader?.transactionId || '',
        recordCount: item.remittanceCount ?? (item.remittanceHeader?.recordCount !== undefined && item.remittanceHeader?.recordCount !== null
            ? item.remittanceHeader.recordCount
            : (item.recordCount !== undefined && item.recordCount !== null ? item.recordCount : null)),
        payer: payerVal,
        facility: facilityVal,
        clinician: clinicianVal,
        receiverId: receiverIdVal,
        transactionDate: item.remittanceTransactionDate || item.remittanceHeader?.transactionDate || transactionDateVal || '',
    };
}

/** Compute KPI totals from mapped claims */
export function computeKpiFromMapped(mappedData) {
    let totalAmt = 0, remitted = 0, rejected = 0, pending = 0;
    for (let i = 0; i < mappedData.length; i++) {
        const item = mappedData[i];
        totalAmt += item.amount || 0;
        remitted += item.remittedAmount || 0;
        rejected += item.rejectedAmount || 0;
        pending += item._pending || 0;
    }
    const recovery = totalAmt > 0 ? ((remitted / totalAmt) * 100).toFixed(1) : 0;
    return {
        totalClaims: mappedData.length,
        totalClaimAmount: totalAmt,
        remittedAmount: remitted,
        pendingAmount: pending,
        rejectedAmount: rejected,
        recoveryRate: recovery
    };
}
