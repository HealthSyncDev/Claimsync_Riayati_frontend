import { RESUBMISSION_COLUMNS } from './resubmissionDummyData';

export const MIN_COL_WIDTH_PX = 52;

export const formatAmount = (n) =>
    typeof n === 'number' && !Number.isNaN(n)
        ? n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '—';

export const RESUBMISSION_DEFAULT_WIDTHS = Object.fromEntries(
    RESUBMISSION_COLUMNS.map((c) => {
        const defaults = {
            Status: 100,
            ActivityNumber: 120,
            ServiceDescriptionIcdCode: 260,
            NetAmount: 92,
            CoPayment: 92,
            Deductible: 92,
            InsLiability: 92,
            NetApproved: 92,
            RejectedIfAny: 104,
            RejectReason: 200,
            WriteoffAmt: 92,
            ResubLiability: 100,
            PriorAuthId: 104,
            AuthNo: 108,
            AuthDate: 104,
        };
        return [c.key, defaults[c.key] ?? 96];
    })
);
