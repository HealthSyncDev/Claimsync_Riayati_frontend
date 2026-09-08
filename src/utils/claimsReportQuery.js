/**
 * Shared query helpers for `/api/activity-report/claims` — mirrors CRS claims report (`CRSReport.jsx`).
 */

export function normalizeFilterValue(value) {
    if (value == null) return '';
    const text = String(value).trim();
    if (!text || text.toLowerCase() === 'all') return '';
    return text;
}

const MONTH_NAME_TO_NUM = {
    January: '1',
    February: '2',
    March: '3',
    April: '4',
    May: '5',
    June: '6',
    July: '7',
    August: '8',
    September: '9',
    October: '10',
    November: '11',
    December: '12',
};

/**
 * @param {{ filters: object, officesList: array, permission: string, user: object }} ctx
 * @returns {string[]}
 */
export function resolveClaimsOfficeIds({ filters = {}, officesList = [], permission = 'Office', user = {} }) {
    const allOfficeIds = (officesList || [])
        .map((o) => String(o.officeId ?? o.office_id ?? o.id ?? ''))
        .filter(Boolean);
    const selectedOfficeIds = (filters?.facilityIds || []).map((id) => String(id).trim()).filter(Boolean);
    if (selectedOfficeIds.length > 0) return selectedOfficeIds;
    if (permission === 'All') return allOfficeIds;
    const userOfficeId = String(user?.officeId ?? user?.office_id ?? '').trim();
    return userOfficeId ? [userOfficeId] : allOfficeIds;
}

/**
 * Append filter fields to URLSearchParams (officeIds must be set separately for list URL).
 * Same rules as `buildClaimsReportQuery` in CRSReport.
 */
export function appendClaimsFilterParams(query, filters = {}) {
    const addParam = (key, value) => {
        const normalized = normalizeFilterValue(value);
        if (!normalized) return;
        query.set(key, normalized);
    };

    addParam('searchOn', filters.searchOn);
    const fromDate = normalizeFilterValue(filters.fromDate);
    const toDate = normalizeFilterValue(filters.toDate);
    if (fromDate || toDate) {
        if (fromDate) query.set('fromDate', fromDate);
        if (toDate) query.set('toDate', toDate);
    } else {
        addParam('year', filters.year);
        const monthValue = normalizeFilterValue(filters.month);
        if (monthValue) {
            const monthNumber = MONTH_NAME_TO_NUM[monthValue] || String(parseInt(monthValue, 10) || '');
            if (monthNumber) query.set('month', monthNumber);
        }
    }

    addParam('clinicianId', filters.clinicianId || filters.clinician);
    addParam('patientType', filters.patientType);
    addParam('encounterTypeDescription', filters.encounterTypeDescription);
    addParam('claimNo', filters.claimNo);
    addParam('patientId', filters.patientId);
    addParam('memberId', filters.memberId);
    addParam('claimStatus', filters.claimStatus);
    addParam('paymentStatus', filters.paymentStatus);
}

/**
 * Export / filter-only query: `officeIds` + filter params (no page/size).
 * @returns {{ officeIds: string[], query: URLSearchParams }}
 */
export function buildClaimsReportQuery(filters = {}, { officesList, permission, user } = {}) {
    const officeIds = resolveClaimsOfficeIds({ filters, officesList, permission, user });
    const query = new URLSearchParams();
    if (officeIds.length === 0) return { officeIds: [], query };
    query.set('officeIds', officeIds.join(','));
    appendClaimsFilterParams(query, filters);
    return { officeIds, query };
}

/**
 * Paginated list fetch — same params as CRSReport `fetchClaimDetailsPage`.
 * @returns {{ officeIds: string[], query: URLSearchParams }}
 */
export function buildClaimsListQuery(filters = {}, { officesList, permission, user } = {}, { targetPage = 1, pageSize = 500 } = {}) {
    const officeIds = resolveClaimsOfficeIds({ filters, officesList, permission, user });
    const query = new URLSearchParams();
    if (officeIds.length === 0) return { officeIds: [], query };
    query.set('officeIds', officeIds.join(','));
    query.set('page', String(Math.max(0, (targetPage || 1) - 1)));
    query.set('size', String(pageSize || 500));
    appendClaimsFilterParams(query, filters);
    return { officeIds, query };
}
