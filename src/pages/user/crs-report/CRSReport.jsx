
import React, { useState, useMemo, useEffect, useRef, useCallback, startTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { agingBuckets } from './data/mockData';
import './crs-report.css';
import { getClaimDetailsListColumns, mapClaimDetailReportItem } from './claimDetailsListColumns';

import { useAuth } from '../../../context/AuthContext';
import { useDataSync } from '../../../context/DataSyncContext';
import { usePortal } from '../../../context/PortalContext';
import { stripPortalPrefix } from '../../../config/portals';
import LastSyncIndicator from '../../../components/common/LastSyncIndicator';
import { processInChunks } from '../../../hooks/useSmartDataFetch';
import { apiDownload, apiFetch } from '../../../utils/apiFetch';
import { mapClaimItem, computeKpiFromMapped } from '../../../utils/claimMapper';

const SEARCH_ON_OPTIONS = [
    { label: 'Select', value: '' },
    { label: 'Submission Transaction Date', value: 'SubmissionTransactionDate' },
    { label: 'Remittance Transaction Date', value: 'RemittanceTransactionDate' },
    { label: 'Settlement Date', value: 'SettlementDate' },
    { label: 'Encounter Start Date', value: 'EncounterStartDate' },
    { label: 'Encounter End Date', value: 'EncounterEndDate' },
];

const PATIENT_TYPE_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'OP', value: 'OP' },
    { label: 'IP', value: 'IP' },
];

const CLAIM_STATUS_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Remitted', value: 'Remitted' },
    { label: 'Submitted', value: 'Submitted' },
];

const PAYMENT_STATUS_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Fully Paid', value: 'Fully Paid' },
    { label: 'Partially Paid', value: 'Partially Paid' },
    { label: 'Fully Rejected', value: 'Fully Rejected' },
    { label: 'Pending', value: 'Pending' },
];

const CRS_REPORT_VIEW_STATE_PREFIX = 'crs-report-view-state-v1';
const SCOPE_KEYS = ['claims', 'month', 'payer'];
const CACHE_TTL_MS = 5 * 60 * 1000;
const OFFICES_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CLAIMS_CACHE_ENTRIES = 120;
const MAX_SUMMARY_CACHE_ENTRIES = 40;
const CLAIMS_REQUEST_CACHE = new Map();
const SUMMARY_REQUEST_CACHE = new Map();
/** In-memory list snapshot so claims list ↔ claim detail remount is instant (no skeleton flash). */
const claimsListMemoryCache = {};
/** Deduplicate concurrent identical claim-detail-report fetches. */
const claimsInflightRequests = new Map();
const OFFICES_BASIC_CACHE = {
    offices: [],
    facilityNameMap: {},
    fetchedAt: 0,
};

/** Backend appends a synthetic TOTAL row (`isTotalRow`, `label: "TOTAL"`) — exclude from data + use for footer. */
const isClaimsApiTotalRow = (item) =>
    item &&
    (item.isTotalRow === true || String(item.label || '').toUpperCase() === 'TOTAL');

const claimsTotalsFromApiRow = (row) => {
    if (!row || typeof row !== 'object') return null;
    const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
    return {
        // claim-detail-report TOTAL row field names
        grossAmt: n(row.grossAmt),
        netAmt: n(row.netAmt ?? row.totalNetAmt),
        initialNetAmt: n(row.initialNetAmt),
        claimPatientShareAmt: n(row.claimPatientShareAmt ?? row.totalPatientShare ?? row.patientShare),
        paymentAmt: n(row.paymentAmt ?? row.totalRemittedAmt),
        rejectedAmt: n(row.rejectedAmt ?? row.totalRejectedAmt),
        initialRejectedAmt: n(row.initialRejectedAmt ?? row.totalInitialRejectedAmt),
        writeOffAmt: n(row.writeOffAmt),
        settledAmt: n(row.settledAmt),
        // legacy aliases (summary / older claims API)
        rejectionPercentage: n(row.rejectionPercentage),
        totalNetAmt: n(row.totalNetAmt ?? row.netAmt),
        totalInitialRejectedAmt: n(row.totalInitialRejectedAmt ?? row.initialRejectedAmt),
        totalRejectedAmt: n(row.totalRejectedAmt ?? row.rejectedAmt),
        totalUnprocessedAmt: n(row.totalUnprocessedAmt),
        totalRemittedAmt: n(row.totalRemittedAmt ?? row.paymentAmt),
        totalPatientShare: n(row.totalPatientShare ?? row.claimPatientShareAmt ?? row.patientShare),
    };
};

const readFromCache = (cacheMap, key, ttlMs = CACHE_TTL_MS) => {
    const now = Date.now();
    const cached = cacheMap.get(key);
    if (!cached) return null;
    if (ttlMs > 0 && now - cached.ts > ttlMs) {
        cacheMap.delete(key);
        return null;
    }
    // LRU touch: move key to the end.
    cacheMap.delete(key);
    cacheMap.set(key, cached);
    return cached.value;
};

const writeToCache = (cacheMap, key, value, maxEntries = 100) => {
    if (cacheMap.has(key)) {
        cacheMap.delete(key);
    }
    cacheMap.set(key, { ts: Date.now(), value });
    while (cacheMap.size > maxEntries) {
        const oldestKey = cacheMap.keys().next().value;
        if (!oldestKey) break;
        cacheMap.delete(oldestKey);
    }
};

const crsViewStateKey = (portalId) => `${CRS_REPORT_VIEW_STATE_PREFIX}:${portalId || 'dhpo'}`;

const safeParseCrsViewState = (portalId) => {
    try {
        if (typeof window === 'undefined') return null;
        const raw = window.sessionStorage.getItem(crsViewStateKey(portalId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

/** Full browser refresh should not restore applied filters / auto-fetch. */
const isBrowserReload = () => {
    try {
        if (typeof window === 'undefined' || typeof performance === 'undefined') return false;
        const nav = performance.getEntriesByType?.('navigation')?.[0];
        if (nav && typeof nav.type === 'string') return nav.type === 'reload';
        // Legacy fallback
        return performance.navigation?.type === 1;
    } catch {
        return false;
    }
};

const clearCrsViewStateIfReload = (portalId) => {
    if (!isBrowserReload() || typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem(crsViewStateKey(portalId));
    } catch {
        // ignore
    }
};

const CRSReport = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { refreshSyncStatus } = useDataSync();
    const { id: portalId, path: portalPath } = usePortal();
    const appPath = stripPortalPrefix(location.pathname);
    const claimsSnap = claimsListMemoryCache[portalId] || null;

    // Determine report type based on route
    const getReportTypeFromRoute = () => {
        if (appPath === '/crs/claim-summary-month') {
            return 'claim_summary_month';
        } else if (appPath === '/crs/claim-summary-payer') {
            return 'claim_summary_payer';
        } else if (appPath === '/crs/claims') {
            return 'claim_details';
        }
        return 'claim_summary_month'; // default
    };

    const [currentReportType, setCurrentReportType] = useState(getReportTypeFromRoute());
    const initialFilters = {
        facilityIds: [],
        searchOn: '',
        searchValue: '',
        year: '',
        month: '',
        fromDate: '',
        toDate: '',
        clinicianId: '',
        patientType: '',
        encounterTypeDescription: '',
        claimNo: '',
        patientId: '',
        memberId: '',
        claimStatus: '',
        paymentStatus: '',
    };

    const cloneReportFilters = (f) => ({
        ...f,
        facilityIds: [...(f.facilityIds || [])],
    });

    /** Same `CRSReport` instance serves claims / month / payer routes — scope filter state so they do not leak across pages. */
    const reportFilterScope = useMemo(() => {
        if (appPath === '/crs/claim-summary-month') return 'month';
        if (appPath === '/crs/claim-summary-payer') return 'payer';
        return 'claims';
    }, [appPath]);

    const emptyFilterPair = () => ({
        draft: cloneReportFilters(initialFilters),
        applied: cloneReportFilters(initialFilters),
    });

    const buildDefaultFiltersByScope = () => ({
        claims: emptyFilterPair(),
        month: emptyFilterPair(),
        payer: emptyFilterPair(),
    });
    const hydrateFiltersByScope = (storedValue) => {
        const defaults = buildDefaultFiltersByScope();
        if (!storedValue || typeof storedValue !== 'object') return defaults;
        const hydrated = { ...defaults };
        SCOPE_KEYS.forEach((scope) => {
            const storedScope = storedValue?.[scope];
            if (!storedScope || typeof storedScope !== 'object') return;
            hydrated[scope] = {
                draft: cloneReportFilters({ ...initialFilters, ...(storedScope.draft || {}) }),
                applied: cloneReportFilters({ ...initialFilters, ...(storedScope.applied || {}) }),
            };
        });
        return hydrated;
    };
    const [filtersByScope, setFiltersByScope] = useState(() => {
        clearCrsViewStateIfReload(portalId);
        if (isBrowserReload()) return buildDefaultFiltersByScope();
        const stored = safeParseCrsViewState(portalId);
        return hydrateFiltersByScope(stored?.filtersByScope);
    });
    const draftFilters = filtersByScope[reportFilterScope].draft;
    const appliedFilters = filtersByScope[reportFilterScope].applied;

    const setDraftFilters = useCallback((updater) => {
        setFiltersByScope((prev) => {
            const pair = prev[reportFilterScope];
            const raw = typeof updater === 'function' ? updater(pair.draft) : updater;
            return {
                ...prev,
                [reportFilterScope]: { ...pair, draft: cloneReportFilters(raw) },
            };
        });
    }, [reportFilterScope]);

    const [claimsData, setClaimsData] = useState(() => {
        if (isBrowserReload()) return null;
        const snap = claimsSnap;
        return Array.isArray(snap?.claimsData) ? snap.claimsData : null;
    });
    /** Aggregates from last `/api/activity-report/claim-detail-report` TOTAL row (matches current filters). */
    const [claimsApiTotals, setClaimsApiTotals] = useState(() => (
        isBrowserReload() ? null : (claimsSnap?.claimsApiTotals ?? null)
    ));
    const [isLoading, setIsLoading] = useState(false);
    const [kpiStats, setKpiStats] = useState(() => (
        isBrowserReload() ? null : (claimsSnap?.kpiStats ?? null)
    ));
    const [hasAppliedByScope, setHasAppliedByScope] = useState(() => {
        const defaults = { claims: false, month: false, payer: false };
        if (isBrowserReload()) return defaults;
        const stored = safeParseCrsViewState(portalId);
        const storedValue = stored?.hasAppliedByScope;
        const fromSnap = claimsSnap?.hasAppliedByScope;
        if (fromSnap && typeof fromSnap === 'object') {
            return {
                claims: Boolean(fromSnap.claims),
                month: Boolean(fromSnap.month ?? storedValue?.month),
                payer: Boolean(fromSnap.payer ?? storedValue?.payer),
            };
        }
        if (!storedValue || typeof storedValue !== 'object') return defaults;
        return {
            claims: Boolean(storedValue.claims),
            month: Boolean(storedValue.month),
            payer: Boolean(storedValue.payer),
        };
    });

    // Simple but effective duplicate call prevention
    const isInitialMount = useRef(true);
    const lastSuccessfulFetch = useRef(0);
    const claimsRequestCacheRef = useRef(CLAIMS_REQUEST_CACHE);
    const officesListRef = useRef([]);
    const claimsListLiveRef = useRef({});
    const restoreClaimsFromCacheRef = useRef(
        !isBrowserReload() &&
        Boolean(claimsSnap?.hasAppliedByScope?.claims) &&
        Array.isArray(claimsSnap?.claimsData) &&
        claimsSnap.claimsData.length > 0
    );

    const writeClaimsListSnapshot = useCallback((override = null) => {
        const live = override || claimsListLiveRef.current;
        if (live.currentReportType !== 'claim_details') return;
        if (!Array.isArray(live.claimsData) || live.claimsData.length === 0) return;
        try {
            claimsListMemoryCache[portalId] = {
                claimsData: live.claimsData,
                claimsApiTotals: live.claimsApiTotals,
                kpiStats: live.kpiStats,
                serverPagination: live.serverPagination,
                isServerFilteredClaims: live.isServerFilteredClaims,
                hasAppliedByScope: live.hasAppliedByScope,
                pageByScope: live.pageByScope,
                officesList: live.officesList,
                facilityNameMap: live.facilityNameMap,
            };
        } catch (err) {
            console.warn('Failed to cache claims list state:', err);
        }
    }, [portalId]);
    const persistClaimsListStateRef = useRef(writeClaimsListSnapshot);
    persistClaimsListStateRef.current = writeClaimsListSnapshot;

    const [showFilters, setShowFilters] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);
    const showLoadingState = isLoading || isFiltering;
    const [showTotals, setShowTotals] = useState(true);
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const branchDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
                setShowBranchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Pagination state
    const [pageByScope, setPageByScope] = useState(() => {
        const defaults = { claims: 1, month: 1, payer: 1 };
        if (isBrowserReload()) return defaults;
        const stored = safeParseCrsViewState(portalId);
        const storedValue = stored?.pageByScope;
        const snapPage = claimsSnap?.pageByScope;
        if (snapPage && typeof snapPage === 'object') {
            return {
                claims: Math.max(1, Number(snapPage.claims) || 1),
                month: Math.max(1, Number(snapPage.month ?? storedValue?.month) || 1),
                payer: Math.max(1, Number(snapPage.payer ?? storedValue?.payer) || 1),
            };
        }
        if (!storedValue || typeof storedValue !== 'object') return defaults;
        return {
            claims: Math.max(1, Number(storedValue.claims) || 1),
            month: Math.max(1, Number(storedValue.month) || 1),
            payer: Math.max(1, Number(storedValue.payer) || 1),
        };
    });
    const currentPage = pageByScope[reportFilterScope] || 1;
    const [itemsPerPage] = useState(500);
    const [serverPagination, setServerPagination] = useState(() => {
        if (isBrowserReload()) {
            return { page: 0, size: 500, totalPages: 0, totalElements: 0 };
        }
        const snap = claimsSnap?.serverPagination;
        return {
            page: Number(snap?.page ?? 0),
            size: Number(snap?.size ?? 500),
            totalPages: Number(snap?.totalPages ?? 0),
            totalElements: Number(snap?.totalElements ?? 0),
        };
    });
    const [isServerFilteredClaims, setIsServerFilteredClaims] = useState(
        () => !isBrowserReload() && Boolean(claimsSnap?.isServerFilteredClaims)
    );

    // State for name mappings (facility)
    const [facilityNameMap, setFacilityNameMap] = useState(
        () => (isBrowserReload() ? {} : (claimsSnap?.facilityNameMap || {}))
    );
    const [officesList, setOfficesList] = useState(
        () => (isBrowserReload() ? [] : (claimsSnap?.officesList || []))
    );
    officesListRef.current = officesList;
    claimsListLiveRef.current = {
        claimsData,
        claimsApiTotals,
        kpiStats,
        serverPagination,
        isServerFilteredClaims,
        hasAppliedByScope,
        pageByScope,
        officesList,
        facilityNameMap,
        currentReportType,
    };
    const [exportingFormat, setExportingFormat] = useState('');
    const isExporting = exportingFormat !== '';

    const permission = user?.permission || 'Office';
    const showBranchFilter = currentReportType === 'claim_details' || permission === 'All';
    const fixedYearOptions = useMemo(() => ['2026', '2025', '2024'], []);
    const normalizeFilterValue = useCallback((value) => {
        if (value == null) return '';
        const text = String(value).trim();
        if (!text || text.toLowerCase() === 'all') return '';
        return text;
    }, []);

    const resolveClaimsOfficeIds = useCallback((filters = {}) => {
        const allOfficeIds = (officesList || [])
            .map((o) => String(o.officeId ?? o.office_id ?? o.id ?? ''))
            .filter(Boolean);
        const selectedOfficeIds = (filters?.facilityIds || [])
            .map((id) => String(id).trim())
            .filter(Boolean);
        if (selectedOfficeIds.length > 0) return selectedOfficeIds;
        if (permission === 'All') return allOfficeIds;
        const userOfficeId = String(user?.officeId ?? user?.office_id ?? '').trim();
        return userOfficeId ? [userOfficeId] : allOfficeIds;
    }, [officesList, permission, user]);

    const resolveOfficesBasic = useCallback(async ({ forceRefresh = false } = {}) => {
        const now = Date.now();
        const hasFreshGlobalCache = !forceRefresh
            && Array.isArray(OFFICES_BASIC_CACHE.offices)
            && OFFICES_BASIC_CACHE.offices.length > 0
            && (now - OFFICES_BASIC_CACHE.fetchedAt) < OFFICES_CACHE_TTL_MS;
        if (hasFreshGlobalCache) {
            return {
                offices: OFFICES_BASIC_CACHE.offices,
                nameMap: OFFICES_BASIC_CACHE.facilityNameMap || {},
            };
        }

        const localOffices = Array.isArray(officesListRef.current) ? officesListRef.current : [];
        if (!forceRefresh && localOffices.length > 0) {
            const localNameMap = {};
            localOffices.forEach((o) => {
                const officeKey = String(o.officeId ?? o.office_id ?? o.id ?? '');
                const label = `${o.facilityId || '-'} - ${o.officeName || o.facilityName || o.office_name || 'Unknown Office'}`;
                if (officeKey) localNameMap[officeKey] = label;
            });
            OFFICES_BASIC_CACHE.offices = localOffices;
            OFFICES_BASIC_CACHE.facilityNameMap = localNameMap;
            OFFICES_BASIC_CACHE.fetchedAt = now;
            return { offices: localOffices, nameMap: localNameMap };
        }

        const officesBasicRes = await apiFetch('/api/offices/basic');
        const offices = Array.isArray(officesBasicRes)
            ? officesBasicRes
            : (Array.isArray(officesBasicRes?.data) ? officesBasicRes.data : []);
        const nameMap = {};
        offices.forEach((o) => {
            const officeKey = String(o.officeId ?? o.office_id ?? o.id ?? '');
            const label = `${o.facilityId || '-'} - ${o.officeName || o.facilityName || o.office_name || 'Unknown Office'}`;
            if (officeKey) nameMap[officeKey] = label;
        });
        OFFICES_BASIC_CACHE.offices = offices;
        OFFICES_BASIC_CACHE.facilityNameMap = nameMap;
        OFFICES_BASIC_CACHE.fetchedAt = now;
        return { offices, nameMap };
    }, []);

    const buildClaimsReportQuery = useCallback((filters = {}, { includePagination = false, targetPage = 1 } = {}) => {
        const officeIds = resolveClaimsOfficeIds(filters);
        const query = new URLSearchParams();
        if (officeIds.length === 0) return { officeIds: [], query };

        query.set('officeIds', officeIds.join(','));
        if (includePagination) {
            query.set('page', String(Math.max(0, (targetPage || 1) - 1)));
            query.set('size', String(itemsPerPage || 500));
        }

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
                const monthMap = {
                    January: '1', February: '2', March: '3', April: '4', May: '5', June: '6',
                    July: '7', August: '8', September: '9', October: '10', November: '11', December: '12',
                };
                const monthNumber = monthMap[monthValue] || String(parseInt(monthValue, 10) || '');
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

        return { officeIds, query };
    }, [itemsPerPage, normalizeFilterValue, resolveClaimsOfficeIds]);

    // Compute unique values for filters
    const { uniqueFacilities, uniqueYears, uniqueMonths } = useMemo(() => {
        const data = claimsData || [];
        // For "All" permission: branch options from offices. For "Office": empty (filter hidden)
        const facilities = permission === 'All'
            ? (officesList || [])
                .map((o) => String(o.officeId ?? o.office_id ?? o.id ?? ''))
                .filter(Boolean)
            : [...new Set(data.map(item => String(item.officeId ?? item.facility ?? '')).filter(Boolean).filter(f => f !== 'Unknown Branch'))].sort();
        const claimDetailFacilities = (officesList || [])
            .map((o) => String(o.officeId ?? o.office_id ?? o.id ?? ''))
            .filter(Boolean);

        // Months array
        const months = [
            { value: '01', label: 'January' },
            { value: '02', label: 'February' },
            { value: '03', label: 'March' },
            { value: '04', label: 'April' },
            { value: '05', label: 'May' },
            { value: '06', label: 'June' },
            { value: '07', label: 'July' },
            { value: '08', label: 'August' },
            { value: '09', label: 'September' },
            { value: '10', label: 'October' },
            { value: '11', label: 'November' },
            { value: '12', label: 'December' }
        ];

        return {
            uniqueFacilities: currentReportType === 'claim_details' ? claimDetailFacilities : facilities,
            uniqueYears: fixedYearOptions,
            uniqueMonths: months,
        };
    }, [claimsData, permission, officesList, currentReportType, fixedYearOptions]);

    const fetchClaimDetailsPage = useCallback(async (targetPage = currentPage, filters = appliedFilters, options = {}) => {
        if (!user || currentReportType !== 'claim_details') return;
        const silent = Boolean(options.silent);
        const officeId = user?.officeId || user?.office_id;
        /** Treat "", whitespace, and "all" (any case) as unset — avoids sending payerId=All etc. */
        const norm = (v) => {
            if (v == null) return '';
            const s = String(v).trim();
            if (!s || s.toLowerCase() === 'all') return '';
            return s;
        };
        try {
            const { offices, nameMap } = await resolveOfficesBasic();
            setOfficesList(offices);
            setFacilityNameMap(nameMap);

            const selectedOfficeIds = (filters?.facilityIds || []).map(String).filter((id) => norm(id));
            const allOfficeIds = offices
                .map((o) => String(o.officeId ?? o.office_id ?? o.id ?? ''))
                .filter(Boolean);
            const userOfficeIdStr = officeId != null ? String(officeId) : '';
            const officeIds = selectedOfficeIds.length > 0
                ? selectedOfficeIds
                : (allOfficeIds.length > 0 ? allOfficeIds : [userOfficeIdStr].filter(Boolean));
            if (officeIds.length === 0) throw new Error('No office id found from /api/offices/basic');

            const params = new URLSearchParams({
                page: String(Math.max(0, (targetPage || 1) - 1)),
                size: String(itemsPerPage || 500),
            });
            const searchOn = norm(filters?.searchOn);
            const fromDate = norm(filters?.fromDate);
            const toDate = norm(filters?.toDate);
            const year = norm(filters?.year);
            const monthRaw = filters?.month;
            const clinicianId = norm(filters?.clinicianId);
            const patientType = norm(filters?.patientType);
            const encounterTypeDescription = norm(filters?.encounterTypeDescription);
            const claimNo = norm(filters?.claimNo);
            const patientId = norm(filters?.patientId);
            const memberId = norm(filters?.memberId);
            const claimStatus = norm(filters?.claimStatus);
            const paymentStatus = norm(filters?.paymentStatus);
            // claim-detail-report is always server-paginated/filtered — never re-filter the page client-side.
            const hasServerFilters = true;

            // `/api/activity-report/claim-detail-report` — only non-empty filter values become query params.
            if (searchOn) params.set('searchOn', searchOn);
            if (fromDate || toDate) {
                if (fromDate) params.set('fromDate', fromDate);
                if (toDate) params.set('toDate', toDate);
            } else {
                if (year) params.set('year', year);
                if (norm(monthRaw)) {
                    const monthMap = {
                        January: '1', February: '2', March: '3', April: '4', May: '5', June: '6',
                        July: '7', August: '8', September: '9', October: '10', November: '11', December: '12',
                    };
                    const monthValue = monthMap[monthRaw] || String(parseInt(String(monthRaw), 10) || '');
                    if (monthValue) params.set('month', String(monthValue));
                }
            }
            if (clinicianId) params.set('clinicianId', clinicianId);
            if (patientType) params.set('patientType', patientType);
            if (encounterTypeDescription) params.set('encounterTypeDescription', encounterTypeDescription);
            if (claimNo) params.set('claimNo', claimNo);
            if (patientId) params.set('patientId', patientId);
            if (memberId) params.set('memberId', memberId);
            if (claimStatus) params.set('claimStatus', claimStatus);
            if (paymentStatus) params.set('paymentStatus', paymentStatus);

            const cacheKey = `claim-detail-report|${officeIds.join(',')}|${params.toString()}`;
            const cached = readFromCache(claimsRequestCacheRef.current, cacheKey);
            if (cached) {
                setIsServerFilteredClaims(cached.isServerFilteredClaims);
                setKpiStats(cached.kpiStats);
                setClaimsData(cached.claimsData);
                setClaimsApiTotals(cached.claimsApiTotals ?? null);
                setServerPagination(cached.serverPagination);
                lastSuccessfulFetch.current = Date.now();
                isInitialMount.current = false;
                setIsLoading(false);
                setIsFiltering(false);
                writeClaimsListSnapshot({
                    ...claimsListLiveRef.current,
                    claimsData: cached.claimsData,
                    claimsApiTotals: cached.claimsApiTotals ?? null,
                    kpiStats: cached.kpiStats,
                    serverPagination: cached.serverPagination,
                    isServerFilteredClaims: cached.isServerFilteredClaims,
                    officesList: offices,
                    facilityNameMap: nameMap,
                    currentReportType: 'claim_details',
                });
                return;
            }

            if (!silent) setIsLoading(true);
            setIsServerFilteredClaims(hasServerFilters);

            let claimsDataRes;
            if (claimsInflightRequests.has(cacheKey)) {
                claimsDataRes = await claimsInflightRequests.get(cacheKey);
            } else {
                const req = apiFetch(`/api/activity-report/claim-detail-report?officeIds=${officeIds.join(',')}&${params.toString()}`);
                claimsInflightRequests.set(cacheKey, req);
                try {
                    claimsDataRes = await req;
                } finally {
                    claimsInflightRequests.delete(cacheKey);
                }
            }

            const rawData = Array.isArray(claimsDataRes)
                ? claimsDataRes
                : claimsDataRes?.content ?? claimsDataRes?.data ?? claimsDataRes?.claims ?? [];
            const apiTotalRow = rawData.find(isClaimsApiTotalRow);
            const dataRows = rawData.filter((row) => !isClaimsApiTotalRow(row));
            const totalsPayload = claimsTotalsFromApiRow(apiTotalRow);
            setClaimsApiTotals(totalsPayload);
            const mappedData = await processInChunks(dataRows, mapClaimDetailReportItem);
            const newKpi = computeKpiFromMapped(mappedData);
            const nextPagination = {
                page: Number(claimsDataRes?.page ?? Math.max(0, (targetPage || 1) - 1)),
                size: Number(claimsDataRes?.size ?? itemsPerPage),
                totalPages: Number(claimsDataRes?.totalPages ?? 0),
                totalElements: Number(claimsDataRes?.totalElements ?? dataRows.length ?? 0),
            };
            setKpiStats(newKpi);
            setClaimsData(mappedData);
            setServerPagination(nextPagination);
            writeToCache(claimsRequestCacheRef.current, cacheKey, {
                isServerFilteredClaims: hasServerFilters,
                kpiStats: newKpi,
                claimsData: mappedData,
                claimsApiTotals: totalsPayload,
                serverPagination: nextPagination,
            }, MAX_CLAIMS_CACHE_ENTRIES);
            writeClaimsListSnapshot({
                ...claimsListLiveRef.current,
                claimsData: mappedData,
                claimsApiTotals: totalsPayload,
                kpiStats: newKpi,
                serverPagination: nextPagination,
                isServerFilteredClaims: hasServerFilters,
                officesList: offices,
                facilityNameMap: nameMap,
                currentReportType: 'claim_details',
            });
            lastSuccessfulFetch.current = Date.now();
            refreshSyncStatus();
            isInitialMount.current = false;
        } catch (err) {
            console.error('Fetch claim details report:', err);
            setTimeout(() => {
                setClaimsData([]);
                setClaimsApiTotals(null);
                setIsLoading(false);
            }, 3000);
            return;
        } finally {
            setIsLoading(false);
            setIsFiltering(false);
        }
    }, [user, currentReportType, currentPage, appliedFilters, itemsPerPage, resolveOfficesBasic, refreshSyncStatus, writeClaimsListSnapshot]);

    const handleFilterChange = (key, value) => {
        setDraftFilters(prev => {
            const val =
                value === 'all' || value === 'All' || String(value ?? '').trim().toLowerCase() === 'all'
                    ? ''
                    : value;
            const newFilters = { ...prev, [key]: val };

            // Mutual exclusion for Dates (same as ActivityList): only one group works
            // Group 1: Year/Month | Group 2: FromDate/ToDate
            if (key === 'year' || key === 'month') {
                if (val) {
                    newFilters.fromDate = '';
                    newFilters.toDate = '';
                }
            } else if (key === 'fromDate' || key === 'toDate') {
                if (val) {
                    newFilters.year = '';
                    newFilters.month = '';
                }
            }

            return newFilters;
        });
    };

    const filtersDirty = useMemo(
        () => JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
        [draftFilters, appliedFilters]
    );
    /** Enable Apply only when draft differs from applied (or never applied yet). */
    const canApplyFilters =
        !isFiltering && (filtersDirty || !hasAppliedByScope[reportFilterScope]);

    const applyDraftFilters = () => {
        const hasAppliedCurrentScope = Boolean(hasAppliedByScope[reportFilterScope]);
        if (!filtersDirty && hasAppliedCurrentScope) return;

        restoreClaimsFromCacheRef.current = false;
        setIsFiltering(true);
        setIsLoading(true);
        if (reportFilterScope === 'claims') {
            setClaimsData([]);
            setClaimsApiTotals(null);
        }
        setHasAppliedByScope((prev) => ({ ...prev, [reportFilterScope]: true }));
        setFiltersByScope((prev) => {
            const pair = prev[reportFilterScope];
            return {
                ...prev,
                [reportFilterScope]: {
                    ...pair,
                    applied: cloneReportFilters(pair.draft),
                },
            };
        });
        setPageByScope((prev) => ({ ...prev, [reportFilterScope]: 1 }));
    };

    const clearFilters = () => {
        restoreClaimsFromCacheRef.current = false;
        const cleared = cloneReportFilters(initialFilters);
        setFiltersByScope((prev) => ({
            ...prev,
            [reportFilterScope]: { draft: cleared, applied: cloneReportFilters(initialFilters) },
        }));
        setHasAppliedByScope((prev) => ({ ...prev, [reportFilterScope]: false }));
        setClaimsData([]);
        setClaimsApiTotals(null);
        setKpiStats(null);
        setIsLoading(false);
        setIsFiltering(false);
        setPageByScope((prev) => ({ ...prev, [reportFilterScope]: 1 }));
    };

    const openClaimDetails = useCallback((row) => {
        if (!row) return;

        const rowClaimId = String(row.claimNumber || row.claimId || row.id || '').trim();
        if (!rowClaimId) {
            return;
        }
        persistClaimsListStateRef.current();
        startTransition(() => {
            navigate(portalPath(`/crs/claims/${encodeURIComponent(rowClaimId)}`));
        });
    }, [navigate, portalPath]);

    const toggleBranch = (branchId) => {
        setDraftFilters(prev => ({
            ...prev,
            facilityIds: prev.facilityIds?.includes(branchId)
                ? (prev.facilityIds || []).filter(id => id !== branchId)
                : [...(prev.facilityIds || []), branchId]
        }));
    };
    const selectAllBranches = () => {
        setDraftFilters(prev => ({ ...prev, facilityIds: [] }));
    };

    const appliedFilterBadgeCount = useMemo(() => {
        return Object.keys(appliedFilters).filter((key) => {
            const v = appliedFilters[key];
            if (key === 'facilityIds') return (v?.length || 0) > 0;
            return v && v !== '' && v !== 'all';
        }).length;
    }, [appliedFilters]);

    useEffect(() => {
        setShowFilters(true);
    }, [reportFilterScope]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const payload = { filtersByScope, hasAppliedByScope, pageByScope };
        window.sessionStorage.setItem(crsViewStateKey(portalId), JSON.stringify(payload));
    }, [filtersByScope, hasAppliedByScope, pageByScope, portalId]);

    useEffect(() => {
        if (!user) return;
        const loadBaseLookups = async () => {
            try {
                const { offices, nameMap } = await resolveOfficesBasic();
                setOfficesList(offices);
                setFacilityNameMap(nameMap);
            } catch (err) {
                console.error('Error fetching base office lookups:', err);
            }
        };
        loadBaseLookups();
    }, [user, resolveOfficesBasic]);

    useEffect(() => {
        if (!user) return;
        if (currentReportType === 'claim_details') return;
        if (!hasAppliedByScope[reportFilterScope]) return;
        const officeId = user?.officeId || user?.office_id;
        const perm = user?.permission || 'Office';
        if (Date.now() - lastSuccessfulFetch.current < 2000) return;
        if (!isInitialMount.current && claimsData?.length > 0) {
            setIsLoading(false);
            setIsFiltering(false);
            return;
        }

        const runFetch = async () => {
            try {
                if (perm !== 'All' && !officeId) return;

                const { offices, nameMap } = await resolveOfficesBasic();
                setOfficesList(offices);
                setFacilityNameMap(nameMap);

                const userOfficeIdStr = officeId != null ? String(officeId) : '';
                const allOfficeIds = offices
                    .map((o) => String(o.officeId ?? o.office_id ?? o.id ?? ''))
                    .filter(Boolean);
                const officeIds = perm === 'All'
                    ? allOfficeIds
                    : (userOfficeIdStr ? [userOfficeIdStr] : []);
                if (officeIds.length === 0) {
                    throw new Error('No office id found from /api/offices/basic');
                }

                const summaryCacheKey = `${currentReportType}|${perm}|${officeIds.join(',')}`;
                const cachedSummary = readFromCache(SUMMARY_REQUEST_CACHE, summaryCacheKey);
                if (cachedSummary) {
                    setKpiStats(cachedSummary.kpiStats);
                    setClaimsData(cachedSummary.claimsData);
                    setClaimsApiTotals(cachedSummary.claimsApiTotals ?? null);
                    lastSuccessfulFetch.current = Date.now();
                    isInitialMount.current = false;
                    return;
                }

                setIsLoading(true);
                const claimsDataRes = await apiFetch(
                    `/api/activity-report/claims?officeIds=${officeIds.join(',')}&page=0&size=500`
                );

                const rawData = Array.isArray(claimsDataRes)
                    ? claimsDataRes
                    : claimsDataRes?.content ?? claimsDataRes?.data ?? claimsDataRes?.claims ?? [];

                const apiTotalRow = rawData.find(isClaimsApiTotalRow);
                const dataRows = rawData.filter((row) => !isClaimsApiTotalRow(row));

                if (!dataRows?.length) {
                    throw new Error('No claims data');
                }

                const mappedData = await processInChunks(dataRows, mapClaimItem);
                const newKpi = computeKpiFromMapped(mappedData);
                const totalsPayload = claimsTotalsFromApiRow(apiTotalRow);

                setKpiStats(newKpi);
                setClaimsData(mappedData);
                setClaimsApiTotals(totalsPayload);
                writeToCache(SUMMARY_REQUEST_CACHE, summaryCacheKey, {
                    kpiStats: newKpi,
                    claimsData: mappedData,
                    claimsApiTotals: totalsPayload,
                }, MAX_SUMMARY_CACHE_ENTRIES);
                lastSuccessfulFetch.current = Date.now();
                refreshSyncStatus();
                isInitialMount.current = false;
            } catch (err) {
                console.error('Fetch report data:', err);
                setTimeout(() => {
                    setClaimsData([]);
                    setClaimsApiTotals(null);
                    setIsLoading(false);
                }, 3000);
                return;
            } finally {
                setIsLoading(false);
                setIsFiltering(false);
            }
        };

        runFetch();
    }, [user, user?.officeId, user?.office_id, user?.permission, currentReportType, reportFilterScope, hasAppliedByScope, claimsData?.length, resolveOfficesBasic]);

    // Summary reports filter client-side — keep skeleton visible briefly so filter apply feels responsive.
    useEffect(() => {
        if (currentReportType === 'claim_details') return;
        if (!isFiltering) return;
        if (!claimsData?.length) return;

        const timerId = window.setTimeout(() => {
            setIsLoading(false);
            setIsFiltering(false);
        }, 300);
        return () => window.clearTimeout(timerId);
    }, [appliedFilters, currentReportType, isFiltering, claimsData?.length]);

    useEffect(() => {
        if (!user || currentReportType !== 'claim_details') return;
        if (!hasAppliedByScope.claims) return;
        if (restoreClaimsFromCacheRef.current) {
            // Instant paint from memory snapshot after claim-detail back — no skeleton/refetch.
            isInitialMount.current = false;
            lastSuccessfulFetch.current = Date.now();
            setIsLoading(false);
            setIsFiltering(false);
            return;
        }
        fetchClaimDetailsPage(currentPage, appliedFilters);
    }, [user, currentReportType, currentPage, appliedFilters, fetchClaimDetailsPage, hasAppliedByScope.claims]);

    useEffect(() => () => {
        persistClaimsListStateRef.current();
    }, []);

    // --- Column Configuration based on Report Type ---
    const columns = useMemo(() => {
        const type = currentReportType;
        const commonCols = [
            { id: 'id', label: 'Claim ID' },
            { id: 'patientName', label: 'Patient Name' },
        ];

        const actionCol = {
            id: 'actions',
            label: 'Actions',
            render: (val, row) => (
                <button
                    className="view-activity-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (row) {
                            openClaimDetails(row);
                        }
                    }}
                >
                    View More
                </button>
            )
        };

        let cols = [];

        switch (type) {
            case 'claim_summary_month':
                cols = [
                    // 1. Month - Extract from transaction date
                    { id: 'month', label: 'Month', minWidth: '100px', render: (val, row) => {
                        const date = row.transactionDate || row.settlementDate;
                        if (!date) return '-';
                        const dateObj = typeof date === 'string' && date.includes('/') 
                            ? new Date(date.split('/').reverse().join('-')) 
                            : new Date(date);
                        return isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleDateString('en-US', { month: 'long' });
                    }},
                    // 2. Year - Extract from transaction date
                    { id: 'year', label: 'Year', minWidth: '80px', render: (val, row) => {
                        const date = row.transactionDate || row.settlementDate;
                        if (!date) return '-';
                        const dateObj = typeof date === 'string' && date.includes('/') 
                            ? new Date(date.split('/').reverse().join('-')) 
                            : new Date(date);
                        return isNaN(dateObj.getTime()) ? '-' : dateObj.getFullYear();
                    }},
                    // 3. Count - For individual rows, this would be 1, or could be record count
                    { id: 'count', label: 'Count', minWidth: '80px', render: (val, row) => row.recordCount || 1 },
                    // 4. Claim Amount - Using gross amount as claim amount
                    { id: 'claimAmount', label: 'Claim Amount', minWidth: '120px', align: 'right', render: (val, row) => `AED ${(row.grossAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                    // 5. Branch ID
                    { id: 'facilityId', label: 'Branch ID', minWidth: '120px' },
                    // 6. Branch Name
                    { id: 'facilityName', label: 'Branch Name', minWidth: '150px', render: (val, row) => {
                        const facilityId = row.facilityId || row.facility;
                        const name = (row.remittanceHeader?.officeName || row.officeName || facilityNameMap[facilityId] || val || row.facilityName || '').trim();
                        return name || '-';
                    }},
                    // 7. All remaining details from API response
                    { id: 'claimId', label: 'Claim ID', minWidth: '120px' },
                    { id: 'receiverId', label: 'Receiver ID', minWidth: '120px' },
                    { id: 'receiverName', label: 'Receiver Name', minWidth: '150px', render: (val, row) => {
                        const name = (row.remittanceHeader?.officeName || val || row.receiverName || row.remittanceHeader?.receiverName || '').trim();
                        return name || '-';
                    }},
                    { id: 'payerId', label: 'Payer ID', minWidth: '120px' },
                    { id: 'payerName', label: 'Payer Name', minWidth: '150px', render: (val, row) => {
                        const name = (val || row.payerName || '').trim();
                        return name || '-';
                    }},
                    { id: 'providerId', label: 'Provider ID', minWidth: '120px' },
                    { id: 'senderId', label: 'Sender ID', minWidth: '120px', render: (val, row) => {
                        return val || row.senderId || row.remittanceHeader?.senderId || '-';
                    }},
                    { id: 'transactionId', label: 'Transaction ID', minWidth: '140px', render: (val, row) => {
                        return val || row.transactionId || row.remittanceHeader?.transactionId || '-';
                    }},
                    { id: 'paymentReference', label: 'Payment Reference', minWidth: '140px', render: (val) => <span className="font-mono text-xs">{val || '-'}</span> },
                    { id: 'transactionDate', label: 'Transaction Date', minWidth: '140px', render: (val) => {
                        if (!val) return '-';
                        if (typeof val === 'string' && val.includes('/')) {
                            return val;
                        }
                        return new Date(val).toLocaleDateString();
                    }},
                    { id: 'settlementDate', label: 'Settlement Date', minWidth: '140px', render: (val, row) => {
                        const dateVal = val || row.submissionDate || row.settlementDate;
                        if (!dateVal) return '-';
                        if (typeof dateVal === 'string' && dateVal.includes('/')) {
                            return dateVal;
                        }
                        return new Date(dateVal).toLocaleDateString();
                    }},
                    { id: 'recordCount', label: 'Record Count', minWidth: '100px', render: (val, row) => {
                        return row.recordCount !== undefined && row.recordCount !== null ? row.recordCount : (val || '-');
                    }},
                    { id: 'status', label: 'Status', minWidth: '100px', render: (val) => {
                        if (!val) return '-';
                        const statusClass = val.toLowerCase() === 'paid' ? 'success' : val.toLowerCase() === 'pending' ? 'warning' : 'error';
                        return <span className={`status-pill ${statusClass}`}>{val}</span>;
                    }},
                    // Amount details at the end
                    { id: 'netAmount', label: 'Net Amount', minWidth: '120px', align: 'right', className: 'font-bold text-primary', render: (val) => `AED ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                    { id: 'paymentAmount', label: 'Payment Amount', minWidth: '120px', align: 'right', className: 'text-success', render: (val) => `AED ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                ];
                break;
            case 'claim_summary_payer':
                cols = [
                    // 1. Count - For individual rows, this would be 1, or could be record count
                    { id: 'count', label: 'Count', minWidth: '80px', render: (val, row) => row.recordCount || 1 },
                    // 2. Claim Amount - Using gross amount as claim amount
                    { id: 'claimAmount', label: 'Claim Amount', minWidth: '120px', align: 'right', render: (val, row) => `AED ${(row.grossAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                    // 3. Receiver ID
                    { id: 'receiverId', label: 'Receiver ID', minWidth: '120px' },
                    // 4. Payer ID
                    { id: 'payerId', label: 'Payer ID', minWidth: '120px' },
                    // 5. Branch ID
                    { id: 'facilityId', label: 'Branch ID', minWidth: '120px' },
                    // 6. Receiver Name (may be empty but available in API)
                    { id: 'receiverName', label: 'Receiver Name', minWidth: '150px', render: (val, row) => {
                        const name = (row.remittanceHeader?.officeName || val || row.receiverName || row.remittanceHeader?.receiverName || '').trim();
                        return name || '-';
                    }},
                    // 7. Payer Name (may be empty but available in API)
                    { id: 'payerName', label: 'Payer Name', minWidth: '150px', render: (val, row) => {
                        const name = (val || row.payerName || '').trim();
                        return name || '-';
                    }},
                    // 8. Branch Name
                    { id: 'facilityName', label: 'Branch Name', minWidth: '150px', render: (val, row) => {
                        const facilityId = row.facilityId || row.facility;
                        const name = (row.remittanceHeader?.officeName || row.officeName || facilityNameMap[facilityId] || val || row.facilityName || '').trim();
                        return name || '-';
                    }},
                    // 9. All other available API fields in logical order
                    { id: 'claimId', label: 'Claim ID', minWidth: '120px' },
                    { id: 'providerId', label: 'Provider ID', minWidth: '120px' },
                    { id: 'senderId', label: 'Sender ID', minWidth: '120px', render: (val, row) => {
                        return val || row.senderId || row.remittanceHeader?.senderId || '-';
                    }},
                    { id: 'transactionId', label: 'Transaction ID', minWidth: '140px', render: (val, row) => {
                        return val || row.transactionId || row.remittanceHeader?.transactionId || '-';
                    }},
                    { id: 'paymentReference', label: 'Payment Reference', minWidth: '140px', render: (val) => <span className="font-mono text-xs">{val || '-'}</span> },
                    { id: 'transactionDate', label: 'Transaction Date', minWidth: '140px', render: (val) => {
                        if (!val) return '-';
                        if (typeof val === 'string' && val.includes('/')) {
                            return val;
                        }
                        return new Date(val).toLocaleDateString();
                    }},
                    { id: 'settlementDate', label: 'Settlement Date', minWidth: '140px', render: (val, row) => {
                        const dateVal = val || row.submissionDate || row.settlementDate;
                        if (!dateVal) return '-';
                        if (typeof dateVal === 'string' && dateVal.includes('/')) {
                            return dateVal;
                        }
                        return new Date(dateVal).toLocaleDateString();
                    }},
                    { id: 'recordCount', label: 'Record Count', minWidth: '100px', render: (val, row) => {
                        return row.recordCount !== undefined && row.recordCount !== null ? row.recordCount : (val || '-');
                    }},
                    { id: 'status', label: 'Status', minWidth: '100px', render: (val) => {
                        if (!val) return '-';
                        const statusClass = val.toLowerCase() === 'paid' ? 'success' : val.toLowerCase() === 'pending' ? 'warning' : 'error';
                        return <span className={`status-pill ${statusClass}`}>{val}</span>;
                    }},
                    // Amount fields at the end
                    { id: 'netAmount', label: 'Net Amount', minWidth: '120px', align: 'right', className: 'font-bold text-primary', render: (val) => `AED ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                    { id: 'paymentAmount', label: 'Payment Amount', minWidth: '120px', align: 'right', className: 'text-success', render: (val) => `AED ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                    { id: 'remittedAmount', label: 'Remitted Amount', minWidth: '120px', align: 'right', className: 'text-success', render: (val) => `AED ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                    { id: 'rejectedAmount', label: 'Rejected Amount', minWidth: '120px', align: 'right', className: 'text-error', render: (val) => `AED ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                ];
                break;
            case 'claim_details':
                cols = getClaimDetailsListColumns(facilityNameMap);
                break;
            case 'remittance':
                cols = [
                    { id: 'id', label: 'Claim No' },
                    { id: 'transactionDate', label: 'Transaction Date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
                    { id: 'remittedAmount', label: 'Remitted Amount', render: (val) => <span className="text-green-600 font-medium">AED ${(val || 0).toLocaleString()}</span> },
                    { id: 'amount', label: 'Claim Amount', render: (val) => `AED ${(val || 0).toLocaleString()}` },
                    { id: 'status', label: 'Status', render: (val) => <span className={`status-badge ${(val || '').toLowerCase()}`}>{val}</span> },
                ];
                break;
            case 'aging':
                return [
                    { id: 'bucket', label: 'Aging Bucket' },
                    { id: 'count', label: 'Count' },
                    { id: 'amount', label: 'Amount', render: (val) => `AED ${(val || 0).toLocaleString()}` },
                    { id: 'percent', label: '% of Total', render: (val) => `${val}%` },
                ];
            default:
                cols = commonCols;
        }

        if (type !== 'aging') {
            cols.push(actionCol);
        }
        return cols;
    }, [currentReportType, facilityNameMap, openClaimDetails]);

    // Manage column visibility - Default to visible (undefined = visible)
    const [visibleColumns, setVisibleColumns] = useState({});
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    // No useEffect needed for initialization/reset!

    const toggleColumn = (colId) => {
        setVisibleColumns(prev => {
            const isHidden = prev[colId] === false;
            return { ...prev, [colId]: isHidden ? true : false };
        });
    };

    const activeColumns = useMemo(() => {
        return columns.filter(col => visibleColumns[col.id] !== false);
    }, [columns, visibleColumns]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(val || 0);
    };

    // Helper to parse dates strictly for filtering
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return new Date(`${y}-${m}-${d}`);
        }
        return new Date(dateStr);
    };

    // --- Filtering Logic ---
    const filteredData = useMemo(() => {
        if (currentReportType === 'aging') {
            return agingBuckets;
        }

        const sourceData = claimsData || [];
        if (currentReportType === 'claim_details' && isServerFilteredClaims) {
            return sourceData;
        }

        return sourceData.filter(claim => {
            // --- Date Filtering ---
            let targetDateString = claim.submissionDate; // Default
            if (appliedFilters.searchOn === 'SubmissionTransactionDate') targetDateString = claim.submissionDate;
            else if (appliedFilters.searchOn === 'SettlementDate') targetDateString = claim.settlementDate || claim.submissionDate;
            else if (appliedFilters.searchOn === 'RemittanceTransactionDate') targetDateString = claim.transactionDate;
            else if (appliedFilters.searchOn === 'EncounterStartDate' || appliedFilters.searchOn === 'EncounterEndDate') {
                targetDateString = claim.submissionDate || claim.transactionDate || claim.settlementDate;
            }

            if (targetDateString) {
                const targetDate = new Date(targetDateString);

                // Only one date group works: Year/Month OR From/To Date (same as ActivityList)
                const useYearMonth = (appliedFilters.year || appliedFilters.month) && !appliedFilters.fromDate && !appliedFilters.toDate;
                const useDateRange = appliedFilters.fromDate || appliedFilters.toDate;

                if (useYearMonth) {
                    if (appliedFilters.year && targetDate.getFullYear().toString() !== appliedFilters.year) return false;
                    if (appliedFilters.month) {
                        const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
                        if (monthStr !== appliedFilters.month) return false;
                    }
                } else if (useDateRange) {
                    const dataDateOnly = new Date(targetDate);
                    dataDateOnly.setHours(0, 0, 0, 0);
                    if (appliedFilters.fromDate) {
                        const fromD = parseDate(appliedFilters.fromDate);
                        if (fromD) {
                            fromD.setHours(0, 0, 0, 0);
                            if (dataDateOnly < fromD) return false;
                        }
                    }
                    if (appliedFilters.toDate) {
                        const toD = parseDate(appliedFilters.toDate);
                        if (toD) {
                            toD.setHours(0, 0, 0, 0);
                            if (dataDateOnly > toD) return false;
                        }
                    }
                }
            } else if (appliedFilters.year || appliedFilters.month || appliedFilters.fromDate || appliedFilters.toDate) {
                // Date filter active but claim has no date - exclude
                return false;
            }

            // --- Field Filters ---

            // Branch(es) - empty = all; claim_details uses officeId from /api/offices/basic
            if (showBranchFilter && appliedFilters.facilityIds?.length > 0) {
                const claimFacility = String(claim.officeId ?? claim.facilityId ?? claim.facility ?? '');
                if (claimFacility && !appliedFilters.facilityIds.map(String).includes(String(claimFacility))) return false;
            }

            // Clinician ID (exact) — claim-detail-report uses clinicianCode
            const clinicianIdQuery = String(appliedFilters.clinicianId || '').trim().toLowerCase();
            if (clinicianIdQuery) {
                const claimClinician = String(
                    claim.clinicianId || claim.clinicianCode || claim.clinician || ''
                )
                    .trim()
                    .toLowerCase();
                if (claimClinician !== clinicianIdQuery) return false;
            }

            // Patient type
            if (appliedFilters.patientType) {
                const claimPatientType = String(claim.patientType || '').trim().toUpperCase();
                if (claimPatientType !== String(appliedFilters.patientType).trim().toUpperCase()) return false;
            }

            // Encounter type description (LIKE)
            const encounterDescQuery = String(appliedFilters.encounterTypeDescription || '').trim().toLowerCase();
            if (encounterDescQuery) {
                const claimEncounterDesc = String(
                    claim.encounterTypeDescription || claim.encounterType || claim.encounter || ''
                ).toLowerCase();
                if (!claimEncounterDesc.includes(encounterDescQuery)) return false;
            }

            // Claim No
            const claimNoQuery = String(appliedFilters.claimNo || '').trim().toLowerCase();
            if (
                claimNoQuery &&
                claimNoQuery !== 'all' &&
                !String(claim.claimNumber || claim.claimId || '').toLowerCase().includes(claimNoQuery)
            ) {
                return false;
            }

            // Patient ID
            const patientIdQuery = String(appliedFilters.patientId || '').trim().toLowerCase();
            if (patientIdQuery && !String(claim.patientId || '').toLowerCase().includes(patientIdQuery)) return false;

            // Member ID
            const memberIdQuery = String(appliedFilters.memberId || '').trim().toLowerCase();
            if (memberIdQuery && !String(claim.memberId || '').toLowerCase().includes(memberIdQuery)) return false;

            // Claim status (post-agg)
            if (appliedFilters.claimStatus) {
                const claimStatus = String(claim.claimStatus || claim.status || '').trim().toLowerCase();
                if (claimStatus !== String(appliedFilters.claimStatus).trim().toLowerCase()) return false;
            }

            // Payment status (post-agg)
            if (appliedFilters.paymentStatus) {
                const paymentStatus = String(claim.paymentStatus || '').trim().toLowerCase();
                if (paymentStatus !== String(appliedFilters.paymentStatus).trim().toLowerCase()) return false;
            }

            // Search Value (Generic)
            if (appliedFilters.searchValue && appliedFilters.searchValue.trim()) {
                const sVal = appliedFilters.searchValue.toLowerCase();
                // Check all major fields
                if (!claim.claimId?.toLowerCase().includes(sVal) &&
                    !claim.patientName?.toLowerCase().includes(sVal) &&
                    !claim.payer?.toLowerCase().includes(sVal)) return false;
            }

            return true;
        }).sort((a, b) => {
            const dateA = new Date(a.transactionDate || 0);
            const dateB = new Date(b.transactionDate || 0);
            return dateB - dateA;
        });
    }, [appliedFilters, currentReportType, claimsData, isServerFilteredClaims]);

    const getClaimsEntryCount = useCallback((rows = [], reportType = currentReportType) => {
        if (!Array.isArray(rows) || rows.length === 0) return 0;
        if (reportType === 'claim_summary_month' || reportType === 'claim_summary_payer') {
            return rows.reduce((sum, row) => {
                const value = Number(row?.recordCount);
                return sum + (Number.isFinite(value) ? value : 1);
            }, 0);
        }
        return rows.length;
    }, [currentReportType]);

    /** Toolbar count: claim details can show filtered/total; summary pages show single total entries only. */
    const reportEntryCounts = useMemo(() => {
        if (currentReportType === 'aging') {
            const n = filteredData?.length ?? 0;
            return { loaded: n, shown: n, same: true, singleValue: true };
        }
        if (currentReportType === 'claim_details') {
            const shown = filteredData?.length ?? 0;
            const loaded = serverPagination.totalElements || shown;
            return { loaded, shown, same: shown === loaded, singleValue: false };
        }
        const base = claimsData || [];
        const loaded = getClaimsEntryCount(base, currentReportType);
        const shown = getClaimsEntryCount(filteredData || [], currentReportType);
        return { loaded, shown, same: shown === loaded, singleValue: true };
    }, [claimsData, filteredData, currentReportType, serverPagination.totalElements, getClaimsEntryCount]);

    // Calculate dynamic totals from filtered data
    const summaryTotals = useMemo(() => {
        if (currentReportType === 'aging') {
            return { count: 0, amount: 0 };
        }
        const totals = filteredData.reduce((acc, claim) => {
            acc.netAmount += claim.netAmount || 0;
            acc.grossAmount += claim.grossAmount || 0;
            acc.paymentAmount += claim.paymentAmount || 0;
            acc.amount += claim.amount || 0;
            acc.remittedAmount += claim.remittedAmount || 0;
            acc.rejectedAmount += claim.rejectedAmount || 0;
            return acc;
        }, {
            netAmount: 0,
            grossAmount: 0,
            paymentAmount: 0,
            amount: 0,
            remittedAmount: 0,
            rejectedAmount: 0
        });
        return totals;
    }, [filteredData, currentReportType]);

    const getGroupBy = () => {
        // Disabled grouping for claim_summary_month as per user request for "only date wise ordering"
        if (currentReportType === 'claim_summary_month') return null;
        if (currentReportType === 'claim_summary_payer') return 'payer';
        return null;
    };

    // Enhance data for grouping if needed
    const displayData = useMemo(() => {
        let data;
        if (currentReportType === 'claim_summary_month' && Array.isArray(filteredData)) {
            data = filteredData.map(d => {
                let month = 'Unknown Month';
                if (d.transactionDate) {
                    const date = new Date(d.transactionDate);
                    if (!isNaN(date.getTime())) {
                        month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    }
                }
                return {
                    ...d,
                    month
                };
            });
        } else {
            data = filteredData;
        }
        return data;
    }, [filteredData, currentReportType]);

    // Pagination logic
    const totalPages = currentReportType === 'claim_details'
        ? (serverPagination.totalPages || 0)
        : Math.ceil((displayData?.length || 0) / itemsPerPage);
    const paginatedData = useMemo(() => {
        if (!displayData || displayData.length === 0) return [];
        if (currentReportType === 'claim_details') return displayData;
        const start = (currentPage - 1) * itemsPerPage;
        return displayData.slice(start, start + itemsPerPage);
    }, [displayData, currentPage, itemsPerPage, currentReportType]);

    // Update report type when route changes
    useEffect(() => {
        if (appPath === '/crs/claim-summary-month') {
            setCurrentReportType('claim_summary_month');
        } else if (appPath === '/crs/claim-summary-payer') {
            setCurrentReportType('claim_summary_payer');
        } else if (appPath === '/crs/claims') {
            setCurrentReportType('claim_details');
        } else {
            setCurrentReportType('claim_summary_month'); // default
        }
    }, [appPath]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            if (reportFilterScope === 'claims') {
                restoreClaimsFromCacheRef.current = false;
            }
            setPageByScope((prev) => ({ ...prev, [reportFilterScope]: newPage }));
        }
    };

    const exportToCSV = async () => {
        if (isExporting) return;
        try {
            setExportingFormat('csv');
            const { officeIds, query } = buildClaimsReportQuery(appliedFilters, { includePagination: false });
            if (officeIds.length === 0) {
                alert('No office selected for export');
                return;
            }
            await apiDownload(`/api/activity-report/claims/export/csv?${query.toString()}`, {
                fallbackFileName: `claims_${new Date().toISOString().split('T')[0]}.csv`,
            });
        } catch (err) {
            console.error('Claims CSV export failed:', err);
            alert('Failed to export CSV');
        } finally {
            setExportingFormat('');
        }
    };

    const exportToExcel = async () => {
        if (isExporting) return;
        try {
            setExportingFormat('excel');
            const { officeIds, query } = buildClaimsReportQuery(appliedFilters, { includePagination: false });
            if (officeIds.length === 0) {
                alert('No office selected for export');
                return;
            }
            await apiDownload(`/api/activity-report/claims/export/excel?${query.toString()}`, {
                fallbackFileName: `claims_${new Date().toISOString().split('T')[0]}.xlsx`,
            });
        } catch (err) {
            console.error('Claims Excel export failed:', err);
            alert('Failed to export Excel');
        } finally {
            setExportingFormat('');
        }
    };


    return (
        <div className="crs-dashboard-container">


            {/* Main Content Area */}
            <div className="dashboard-content">
                {/* Filter Toggle Button and Sync Data */}
                <div className="filter-toggle-section">
                        <div className="filter-group-left">
                            <button
                                className={`btn-filter-toggle ${showFilters ? 'active' : ''}`}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M3 6h18M6 12h12m-9 6h6" />
                                </svg>
                                <span>Filters</span>
                                {appliedFilterBadgeCount > 0 && (
                                    <span className="filter-badge">{appliedFilterBadgeCount}</span>
                                )}
                            </button>

                            {/* Totals Toggle Button */}
                            <button
                                className={`btn-filter-toggle ${showTotals ? 'active' : ''}`}
                                onClick={() => setShowTotals(!showTotals)}
                            >
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span>Totals</span>
                            </button>

                            <div className="column-visibility">
                                <button className="btn-filter-toggle" onClick={() => setShowColumnMenu(!showColumnMenu)}>
                                    <span>Columns ▾</span>
                                </button>
                                {showColumnMenu && (
                                    <div className="column-menu">
                                        {columns.map(col => (
                                            <label key={col.id} className="column-item">
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns[col.id] !== false}
                                                    onChange={() => toggleColumn(col.id)}
                                                />
                                                {col.label}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Export Buttons */}
                            <div className="export-buttons">
                                    <button
                                        className="btn-export"
                                        onClick={exportToExcel}
                                        title={isExporting ? 'Downloading...' : 'Export to Excel'}
                                        disabled={isExporting}
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        <span>{exportingFormat === 'excel' ? 'Downloading...' : 'Excel'}</span>
                                    </button>
                                    <button
                                        className="btn-export"
                                        onClick={exportToCSV}
                                        title={isExporting ? 'Downloading...' : 'Export to CSV'}
                                        disabled={isExporting}
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        <span>{exportingFormat === 'csv' ? 'Downloading...' : 'CSV'}</span>
                                    </button>
                                </div>

                            <div
                                className="stats-pill crs-toolbar-entry-count"
                                aria-live="polite"
                                title={showLoadingState ? '' : (reportEntryCounts.singleValue ? 'Total entries after filters' : (reportEntryCounts.same ? 'Rows after filters' : 'Filtered rows / total loaded'))}
                            >
                                <span className="label">Entries</span>
                                <span className="value">
                                    {showLoadingState
                                        ? '—'
                                        : reportEntryCounts.singleValue
                                            ? reportEntryCounts.shown.toLocaleString()
                                            : reportEntryCounts.same
                                            ? reportEntryCounts.loaded.toLocaleString()
                                            : `${reportEntryCounts.shown.toLocaleString()} / ${reportEntryCounts.loaded.toLocaleString()}`}
                                </span>
                            </div>
                        </div>

                        <div className="filter-group-right">
                            <LastSyncIndicator loading={showLoadingState} className="toolbar-last-sync" />
                        </div>
                    </div>





                {/* Filter Panel */}
                {/* Filter Panel */}


                {/* Dynamic Content */}
                <div className="content-viewport">

                    {/* Professional Filter Dropdown Panel (Replaced with new Grid System) */}
                    {showFilters && (
                        <div className="filter-panel-container">
                            <div className="filter-form-grid">
                            {/* Row 1: Branch (multi-select) - only for "All" permission */}
                            {showBranchFilter && (
                            <div className="form-group col-span-12 branch-select-wrap" ref={branchDropdownRef}>
                                <label>Branch</label>
                                <div className="branch-multiselect">
                                    <button
                                        type="button"
                                        className="branch-multiselect-trigger"
                                        onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                                        aria-expanded={showBranchDropdown}
                                        aria-haspopup="listbox"
                                    >
                                        <span className="branch-multiselect-trigger-text">
                                            {!draftFilters.facilityIds?.length
                                                ? 'All Branches'
                                                : draftFilters.facilityIds.map(fid => facilityNameMap[fid] || fid).join(', ')}
                                        </span>
                                        <span className="branch-multiselect-chevron">▾</span>
                                    </button>
                                    {showBranchDropdown && (
                                        <div className="branch-multiselect-dropdown" role="listbox">
                                            <div className="branch-multiselect-dropdown-header">
                                                <span className="branch-multiselect-dropdown-title">Branch</span>
                                                <button
                                                    type="button"
                                                    className="branch-multiselect-clear-btn"
                                                    onClick={() => { selectAllBranches(); }}
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                            <label className="branch-multiselect-option branch-multiselect-all">
                                                <input
                                                    type="checkbox"
                                                    checked={!draftFilters.facilityIds?.length}
                                                    onChange={selectAllBranches}
                                                />
                                                <span>All Branches</span>
                                            </label>
                                            {uniqueFacilities.map(fid => (
                                                <label key={fid} className="branch-multiselect-option">
                                                    <input
                                                        type="checkbox"
                                                        checked={draftFilters.facilityIds?.includes(fid) ?? false}
                                                        onChange={() => toggleBranch(fid)}
                                                    />
                                                    <span>{facilityNameMap[fid] || fid}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            )}

                            {/* Row 2: Search On(4), Year(2), Month(2), Dates(2,2) */}
                            <div className="form-group col-span-4">
                                <label>Search On</label>
                                <select className="form-select" value={draftFilters.searchOn} onChange={(e) => handleFilterChange('searchOn', e.target.value)}>
                                    {SEARCH_ON_OPTIONS.map((option) => (
                                        <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group col-span-2">
                                <label>Year</label>
                                <select className="form-select" value={draftFilters.year} onChange={(e) => handleFilterChange('year', e.target.value)}>
                                    <option value="">Select</option>
                                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="form-group col-span-2">
                                <label>Month</label>
                                <select className="form-select" value={draftFilters.month} onChange={(e) => handleFilterChange('month', e.target.value)}>
                                    <option value="">Select</option>
                                    {uniqueMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group col-span-2">
                                <label>From Date</label>
                                <div className="input-group">
                                    <input type="date" className="form-input" value={draftFilters.fromDate} onChange={(e) => handleFilterChange('fromDate', e.target.value)} placeholder="yyyy-MM-dd" />
                                </div>
                            </div>
                            <div className="form-group col-span-2">
                                <label>To Date</label>
                                <div className="input-group">
                                    <input type="date" className="form-input" value={draftFilters.toDate} onChange={(e) => handleFilterChange('toDate', e.target.value)} placeholder="yyyy-MM-dd" />
                                </div>
                            </div>

                            {/* Row 3: Clinician, Patient Type, Encounter Type, Claim No */}
                            <div className="form-group col-span-3">
                                <label>Clinician ID</label>
                                <input type="text" className="form-input" value={draftFilters.clinicianId} onChange={(e) => handleFilterChange('clinicianId', e.target.value)} placeholder="Exact clinician ID" />
                            </div>
                            <div className="form-group col-span-3">
                                <label>Patient Type</label>
                                <select className="form-select" value={draftFilters.patientType} onChange={(e) => handleFilterChange('patientType', e.target.value)}>
                                    {PATIENT_TYPE_OPTIONS.map((option) => (
                                        <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group col-span-3">
                                <label>Encounter Type</label>
                                <input type="text" className="form-input" value={draftFilters.encounterTypeDescription} onChange={(e) => handleFilterChange('encounterTypeDescription', e.target.value)} placeholder="Partial match..." />
                            </div>
                            <div className="form-group col-span-3">
                                <label>Claim No</label>
                                <input type="text" className="form-input" value={draftFilters.claimNo} onChange={(e) => handleFilterChange('claimNo', e.target.value)} placeholder="all" />
                            </div>

                            {/* Row 4: Patient ID, Member ID, Claim Status, Payment Status */}
                            <div className="form-group col-span-3">
                                <label>Patient ID</label>
                                <input type="text" className="form-input" value={draftFilters.patientId} onChange={(e) => handleFilterChange('patientId', e.target.value)} placeholder="all" />
                            </div>
                            <div className="form-group col-span-3">
                                <label>Member ID</label>
                                <input type="text" className="form-input" value={draftFilters.memberId} onChange={(e) => handleFilterChange('memberId', e.target.value)} placeholder="all" />
                            </div>
                            <div className="form-group col-span-3">
                                <label>Claim Status</label>
                                <select className="form-select" value={draftFilters.claimStatus} onChange={(e) => handleFilterChange('claimStatus', e.target.value)}>
                                    {CLAIM_STATUS_OPTIONS.map((option) => (
                                        <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group col-span-3">
                                <label>Payment Status</label>
                                <select className="form-select" value={draftFilters.paymentStatus} onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}>
                                    {PAYMENT_STATUS_OPTIONS.map((option) => (
                                        <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>

                            </div>
                            {/* Footer inside grid or at bottom */}
                            <div className="filter-panel-footer">
                                <div className="filter-panel-footer-actions">
                                    <button
                                        type="button"
                                        className="btn-apply-filters"
                                        onClick={applyDraftFilters}
                                        disabled={!canApplyFilters || isFiltering}
                                        title={canApplyFilters ? 'Apply filter panel to the table' : 'No filter changes to apply'}
                                    >
                                        {isFiltering ? 'Filtering...' : 'Apply filters'}
                                    </button>
                                    <button type="button" className="clear-all-btn" onClick={clearFilters}>Clear All</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {(
                        <>
                            {/* Data Table Section */}
                            <div className="content-card">
                                <>
                                    {!showLoadingState && !hasAppliedByScope[reportFilterScope] ? (
                                        <div className="crs-apply-filters-prompt" role="status">
                                            <p className="crs-apply-filters-prompt-title">Apply filters to load data</p>
                                            <p className="crs-apply-filters-prompt-hint">
                                                Set your filters above, then click Apply filters.
                                            </p>
                                        </div>
                                    ) : (
                                    <>
                                    <div className="table-responsive">
                                        <table className="modern-table">
                                            <thead>
                                                <tr>
                                                    {activeColumns.map(col => (
                                                        <th
                                                            key={col.id}
                                                            style={{ minWidth: col.minWidth || '100px' }}
                                                            className={col.align === 'right' ? 'text-right' : ''}
                                                        >
                                                            {col.label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {showLoadingState ? (
                                                        [...Array(10)].map((_, rowIndex) => (
                                                            <tr key={`skeleton-${rowIndex}`}>
                                                                {activeColumns.map((col, colIndex) => (
                                                                    <td key={colIndex}>
                                                                        <div className={`skeleton-line ${colIndex === 0 ? 'width-40' : 'width-80'}`}></div>
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))
                                                    ) : filteredData.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={Math.max(activeColumns.length, 1)} className="empty-state">No entries found.</td>
                                                        </tr>
                                                    ) : paginatedData.length > 0 ? (
                                                        <>
                                                            {paginatedData.map((claim, index) => (
                                                                <tr 
                                                                    key={index}
                                                                    onClick={() => currentReportType !== 'aging' && openClaimDetails(claim)}
                                                                    className={currentReportType !== 'aging' ? 'clickable-row' : ''}
                                                                >
                                                                    {activeColumns.map(col => (
                                                                        <td
                                                                            key={col.id}
                                                                            className={col.align === 'right' ? `text-right ${col.className || ''}` : (col.className || '')}
                                                                        >
                                                                            {col.render ? col.render(claim[col.id], claim) : claim[col.id]}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                            
                                                        </>
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={Math.max(activeColumns.length, 1)} className="empty-state">No entries found.</td>
                                                        </tr>
                                                    )}
                                        </tbody>
                                        
                                        {/* Sticky Totals Footer - Inside table */}
                                        {claimsData && filteredData.length > 0 && currentReportType !== 'aging' && showTotals && !showLoadingState && (
                                            <tfoot className="sticky-totals-footer">
                                                <tr className="totals-row-excel">
                                                    {activeColumns.map((col, index) => {
                                                        let content = '';
                                                        const api = claimsApiTotals;
                                                        const fc = (v) => formatCurrency(v ?? 0);
                                                        if (index === 0) {
                                                            content = <strong style={{ color: '#6b7280', fontSize: '0.9rem' }}>TOTALS</strong>;
                                                        } else if (currentReportType === 'claim_details' && api) {
                                                            if (col.id === 'grossAmt' && api.grossAmt != null) {
                                                                content = <strong>{fc(api.grossAmt)}</strong>;
                                                            } else if (col.id === 'netAmt' || col.id === 'totalNetAmt' || col.id === 'netAmount') {
                                                                content = <strong className="text-warning">{fc(api.netAmt ?? api.totalNetAmt)}</strong>;
                                                            } else if (col.id === 'initialNetAmt' && api.initialNetAmt != null) {
                                                                content = <strong>{fc(api.initialNetAmt)}</strong>;
                                                            } else if (col.id === 'claimPatientShareAmt' || col.id === 'patientShare') {
                                                                content = <strong>{fc(api.claimPatientShareAmt ?? api.totalPatientShare)}</strong>;
                                                            } else if (col.id === 'paymentAmt' || col.id === 'totalRemittedAmt' || col.id === 'paymentAmount' || col.id === 'remittedAmount') {
                                                                content = <strong className="text-success">{fc(api.paymentAmt ?? api.totalRemittedAmt)}</strong>;
                                                            } else if (col.id === 'rejectedAmt' || col.id === 'totalRejectedAmt' || col.id === 'rejectedAmount') {
                                                                content = <strong className="text-error">{fc(api.rejectedAmt ?? api.totalRejectedAmt)}</strong>;
                                                            } else if (col.id === 'initialRejectedAmt' || col.id === 'totalInitialRejectedAmt') {
                                                                content = <strong>{fc(api.initialRejectedAmt ?? api.totalInitialRejectedAmt)}</strong>;
                                                            } else if (col.id === 'writeOffAmt' && api.writeOffAmt != null) {
                                                                content = <strong>{fc(api.writeOffAmt)}</strong>;
                                                            } else if (col.id === 'settledAmt' && api.settledAmt != null) {
                                                                content = <strong>{fc(api.settledAmt)}</strong>;
                                                            } else if (col.id === 'rejectionPercentage') {
                                                                content = api.rejectionPercentage != null && !Number.isNaN(api.rejectionPercentage)
                                                                    ? <strong>{`${Number(api.rejectionPercentage).toFixed(3)}%`}</strong>
                                                                    : '';
                                                            } else if (col.id === 'totalUnprocessedAmt') {
                                                                content = <strong>{fc(api.totalUnprocessedAmt)}</strong>;
                                                            }
                                                        } else if (!(currentReportType === 'claim_details' && api)) {
                                                            if (col.id === 'claimAmount') {
                                                                content = <strong>{formatCurrency(summaryTotals.grossAmount)}</strong>;
                                                            } else if (col.id === 'paymentAmount') {
                                                                content = <strong className="text-success">{formatCurrency(summaryTotals.paymentAmount)}</strong>;
                                                            } else if (col.id === 'netAmount') {
                                                                content = <strong className="text-warning">{formatCurrency(summaryTotals.netAmount)}</strong>;
                                                            } else if (col.id === 'remittedAmount' && summaryTotals.remittedAmount > 0) {
                                                                content = <strong className="text-success">{formatCurrency(summaryTotals.remittedAmount)}</strong>;
                                                            } else if (col.id === 'rejectedAmount' && summaryTotals.rejectedAmount > 0) {
                                                                content = <strong className="text-error">{formatCurrency(summaryTotals.rejectedAmount)}</strong>;
                                                            } else if (col.id === 'recordCount' && (currentReportType === 'claim_summary_month' || currentReportType === 'claim_summary_payer')) {
                                                                content = <strong>{filteredData.reduce((sum, item) => sum + (item.recordCount || 1), 0)}</strong>;
                                                            }
                                                        }
                                                        return (
                                                            <td
                                                                key={col.id}
                                                                className={col.align === 'right' ? `text-right ${col.className || ''}` : (col.className || '')}
                                                            >
                                                                {content}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                        {/* Pagination */}
                                        {claimsData && displayData && displayData.length > 0 && totalPages > 1 && !showLoadingState && (
                                            <div className="pagination-bar">
                                                <span className="page-info">
                                                    {currentReportType === 'claim_details'
                                                        ? `Showing ${(serverPagination.page * serverPagination.size) + 1} to ${Math.min((serverPagination.page * serverPagination.size) + (displayData?.length || 0), serverPagination.totalElements || 0)} of ${serverPagination.totalElements || 0}`
                                                        : `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, displayData?.length || 0)} of ${displayData?.length || 0}`
                                                    }
                                                </span>
                                                <div className="pagination-controls">
                                                    <button
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className="btn-page"
                                                    >
                                                        Previous
                                                    </button>
                                                    <div className="page-numbers">
                                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                            let p = i + 1;
                                                            if (totalPages > 5) {
                                                                if (currentPage > 3) p = currentPage - 2 + i;
                                                                if (p > totalPages) p = totalPages - 4 + i;
                                                            }
                                                            return (
                                                                <button
                                                                    key={p}
                                                                    onClick={() => handlePageChange(p)}
                                                                    className={`page-num-btn ${currentPage === p ? 'active' : ''}`}
                                                                >
                                                                    {p}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <button
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        className="btn-page"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                    )}
                                </>
                            </div>
                        </>
                    )}
                </div>
            </div>



            <style>{`
                :root {
                    --glass-bg: rgba(255, 255, 255, 0.95);
                    --glass-border: 1px solid rgba(0, 0, 0, 0.05);
                    --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.03);
                    --primary-gradient: linear-gradient(135deg, #2563eb, #1d4ed8);
                }

                /* Filter Toggle Section */
                .filter-toggle-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .filter-group-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    flex: 1;
                    min-width: 0;
                }

                .filter-group-right {
                    display: flex;
                    align-items: center;
                    flex-shrink: 0;
                }

                .btn-filter-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    color: #334155;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .btn-filter-toggle:hover {
                    background: #f1f5f9;
                    border-color: #2563eb;
                    color: #2563eb;
                }

                .btn-filter-toggle.active {
                    background: #dbeafe;
                    border-color: #2563eb;
                    color: #2563eb;
                }

                .btn-filter-toggle svg {
                    width: 18px;
                    height: 18px;
                }

                .export-buttons {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .column-visibility {
                    position: relative;
                }

                .column-menu {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    z-index: 50;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 8px;
                    box-shadow: 0 10px 30px rgba(2, 6, 23, 0.12);
                    min-width: 240px;
                    width: max-content;
                    max-width: min(420px, 92vw);
                    max-height: min(380px, 55vh);
                    overflow-y: auto;
                }

                .column-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 7px 8px;
                    font-size: 0.86rem;
                    cursor: pointer;
                    color: #334155;
                    border-radius: 6px;
                }

                .column-item:hover {
                    background: #f8fafc;
                }

                .btn-export {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 16px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    color: #334155;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .btn-export:hover {
                    background: #f1f5f9;
                    border-color: #2563eb;
                    color: #2563eb;
                    transform: translateY(-1px);
                }

                .btn-export svg {
                    width: 16px;
                    height: 16px;
                }

                .btn-export:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                    transform: none;
                }

                .filter-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 20px;
                    height: 20px;
                    padding: 0 6px;
                    background: #2563eb;
                    color: white;
                    border-radius: 10px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    margin-left: 4px;
                }

                /* Professional Filter Panel Styles */
                .filter-panel-container {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
                    animation: slideDown 0.3s ease-out;
                    overflow: visible;
                }

                .filter-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .filter-panel-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #0f172a;
                }
                
                .filter-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .filter-panel-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #0f172a;
                }
                
                .clear-all-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: #fee2e2;
                    color: #dc2626;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .clear-all-btn:hover {
                    background: #fecaca;
                    transform: translateY(-1px);
                }
                
                .filter-panel-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    padding: 24px;
                }
                
                @media (max-width: 1400px) {
                    .filter-panel-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                
                @media (max-width: 1024px) {
                    .filter-panel-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                
                @media (max-width: 640px) {
                    .filter-panel-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .filter-group-left {
                        width: 100%;
                    }

                    .filter-toggle-section > .btn-primary {
                        width: 100%;
                        justify-content: center;
                    }

                    .btn-filter-toggle,
                    .btn-export {
                        min-height: 38px;
                        padding: 8px 12px;
                        font-size: 0.84rem;
                    }
                }

                @media (max-width: 560px) {
                    .filter-group-left {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .filter-group-left > button,
                    .filter-group-left > .column-visibility,
                    .filter-group-left > .export-buttons {
                        width: 100%;
                    }

                    .column-visibility > .btn-filter-toggle {
                        width: 100%;
                        justify-content: center;
                    }

                    .export-buttons {
                        grid-column: 1 / -1;
                    }

                    .export-buttons .btn-export {
                        flex: 1 1 0;
                        justify-content: center;
                    }

                    .column-menu {
                        min-width: 0;
                        width: min(92vw, 360px);
                    }
                }
                
                .filter-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                
                .filter-field label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                
                .filter-field select,
                .filter-field input[type="text"],
                .filter-field input[type="date"] {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    color: #1e293b;
                    background: white;
                    transition: all 0.2s;
                }
                
                .filter-field select:focus,
                .filter-field input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                
                .filter-field select:hover,
                .filter-field input:hover {
                    border-color: #cbd5e1;
                }
                
                .input-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                
                .input-with-icon input {
                    padding-right: 36px;
                }
                
                .input-with-icon svg {
                    position: absolute;
                    right: 12px;
                    color: #94a3b8;
                    pointer-events: none;
                }

                .filter-panel-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    background: #f8fafc;
                }

                .filter-panel-footer-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .filter-validation-message {
                    color: #b91c1c;
                    font-size: 0.82rem;
                    font-weight: 600;
                    margin-right: 6px;
                }

                .btn-apply-filters {
                    padding: 10px 18px;
                    border-radius: 8px;
                    border: none;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    background: #2563eb;
                    color: white;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
                }

                .btn-apply-filters:hover:not(:disabled) {
                    filter: brightness(1.05);
                }

                .btn-apply-filters:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .stats-pill .value {
                    color: #2563eb;
                    font-weight: 700;
                }

                .stats-pill {
                    background: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    display: flex;
                    gap: 8px;
                    font-size: 0.9rem;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                }

                .stats-pill .label {
                    color: #64748b;
                }

                .stats-pill.crs-toolbar-entry-count {
                    white-space: nowrap;
                    margin-left: 4px;
                }

                /* Filter Form Grid System - Copied from ActivityList */
                .filter-form-grid {
                    display: grid;
                    grid-template-columns: repeat(12, 1fr);
                    gap: 16px;
                    padding: 20px;
                    background: #f8fafc;
                }
                
                .col-span-12 { grid-column: span 12; }
                .col-span-11 { grid-column: span 11; }
                .col-span-10 { grid-column: span 10; }
                .col-span-9 { grid-column: span 9; }
                .col-span-8 { grid-column: span 8; }
                .col-span-7 { grid-column: span 7; }
                .col-span-6 { grid-column: span 6; }
                .col-span-5 { grid-column: span 5; }
                .col-span-4 { grid-column: span 4; }
                .col-span-3 { grid-column: span 3; }
                .col-span-2 { grid-column: span 2; }
                .col-span-1 { grid-column: span 1; }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .form-group label {
                    font-size: 0.72rem;
                    color: #64748b;
                    font-weight: 600;
                    margin-left: 2px;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                }

                .form-input, .form-select {
                    padding: 0 10px;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    background: white;
                    color: #334155;
                    width: 100%;
                    height: 34px;
                    line-height: 32px;
                    transition: border-color 0.2s;
                }
                
                select.form-select {
                    padding-top: 0;
                    padding-bottom: 0;
                }

                .form-input:focus, .form-select:focus {
                    outline: none;
                    border-color: #2563eb;
                    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.05);
                }

                .branch-multiselect { position: relative; width: 100%; }
                .form-group.branch-select-wrap { overflow: visible; }
                .branch-multiselect-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    padding: 8px 12px;
                    font-size: 0.85rem;
                    color: #334155;
                    background: white;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    cursor: pointer;
                    text-align: left;
                    min-height: 34px;
                }
                .branch-multiselect-trigger:hover { border-color: #94a3b8; }
                .branch-multiselect-trigger-text { flex: 1; text-align: left; overflow: visible; text-overflow: clip; white-space: normal; word-break: break-word; line-height: 1.25; }
                .branch-multiselect-chevron { color: #64748b; font-size: 0.75rem; flex-shrink: 0; }
                .branch-multiselect-dropdown-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 8px 10px;
                    margin-bottom: 4px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .branch-multiselect-dropdown-title { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
                .branch-multiselect-clear-btn {
                    padding: 4px 10px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: #dc2626;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .branch-multiselect-clear-btn:hover { background: #fee2e2; }
                .branch-multiselect-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    margin-top: 4px;
                    max-height: 280px;
                    overflow-y: auto;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
                    z-index: 1000;
                    padding: 8px;
                }
                .branch-multiselect-option {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px;
                    font-size: 0.9rem;
                    cursor: pointer;
                    border-radius: 6px;
                }
                .branch-multiselect-option:hover { background: #f1f5f9; }
                .branch-multiselect-option input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    margin: 0;
                    cursor: pointer;
                    flex-shrink: 0;
                    appearance: none;
                    -webkit-appearance: none;
                    border: 2px solid #94a3b8;
                    border-radius: 4px;
                    background: #fff;
                }
                .branch-multiselect-option input[type="checkbox"]:checked {
                    background: #2563eb url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10'%3E%3Cpath fill='none' stroke='white' stroke-width='2' d='M1 5l3 3 7-7'/%3E%3C/svg%3E") center/10px 8px no-repeat;
                    border-color: #2563eb;
                }
                .branch-multiselect-all {
                    font-weight: 600;
                    border-bottom: 1px solid #e2e8f0;
                    margin-bottom: 6px;
                    padding-bottom: 10px;
                }
                .branch-multiselect-all input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    flex-shrink: 0;
                    appearance: none;
                    -webkit-appearance: none;
                    border: 2px solid #94a3b8;
                    border-radius: 4px;
                    background: #fff;
                }
                .branch-multiselect-all input[type="checkbox"]:checked {
                    background: #2563eb url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10'%3E%3Cpath fill='none' stroke='white' stroke-width='2' d='M1 5l3 3 7-7'/%3E%3C/svg%3E") center/10px 8px no-repeat;
                    border-color: #2563eb;
                }

                .input-group {
                    display: flex;
                    align-items: center;
                    position: relative;
                    width: 100%;
                }
                
                .flex-center-v {
                    display: flex;
                    align-items: center;
                    height: 100%;
                    padding-top: 14px;
                }
                
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    color: #334155;
                    font-weight: 500;
                    cursor: pointer;
                }
                    color: #2563eb;
                    font-weight: 700;
                }

                .filter-actions {
                    display: flex;
                    gap: 12px;
                }

                .btn-filter-apply {
                    padding: 10px 20px;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-filter-apply:hover {
                    background: #1d4ed8;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                }

                .btn-filter-reset {
                    padding: 10px 20px;
                    background: white;
                    color: #334155;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-filter-reset:hover {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                }
                
                .filter-checkbox {
                    display: flex;
                    align-items: center;
                    padding-top: 24px;
                }
                
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    color: #475569;
                    font-weight: 500;
                }
                
                .checkbox-label input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    accent-color: #3b82f6;
                }
                
                .checkbox-label span {
                    user-select: none;
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }


                /* Original Styles */
                .crs-dashboard-container {
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    max-width: 1600px;
                    margin: 0 auto;
                    width: 100%;
                }

                .dashboard-top-section {
                    margin-bottom: -12px;
                }

                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 24px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid var(--border-color);
                }

                .header-titles h1 {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: var(--text-heading);
                    margin: 0 0 4px 0;
                    line-height: 1.2;
                }

                .header-titles p {
                    color: var(--text-muted);
                    font-size: 0.95rem;
                    margin: 0;
                }

                .control-bar {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                }

                .report-selector {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: white;
                    padding: 4px 12px 4px 16px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }

                .label-text {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .modern-select {
                    border: none;
                    background: transparent;
                    font-size: 0.95rem;
                    font-weight: 500;
                    color: var(--text-main);
                    padding: 8px 0;
                    cursor: pointer;
                    outline: none;
                    min-width: 180px;
                }

                .btn-group {
                    display: flex;
                    gap: 12px;
                }

                .btn-primary, .btn-secondary {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 500;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-primary {
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
                }

                .btn-primary:hover {
                    background: var(--primary-hover);
                    transform: translateY(-1px);
                }

                .btn-secondary {
                    background: white;
                    border: 1px solid var(--border-color);
                    color: var(--text-main);
                }

                .btn-secondary:hover {
                    background: var(--bg-hover);
                    border-color: var(--text-muted);
                }

                /* Status Cards */
                .status-overlay {
                    display: flex;
                    justify-content: center;
                    padding: 60px 0;
                }

                .glass-card {
                    background: var(--glass-bg);
                    backdrop-filter: blur(10px);
                    border: var(--glass-border);
                    border-radius: 16px;
                    box-shadow: var(--shadow-soft);
                    padding: 48px;
                    text-align: center;
                    max-width: 480px;
                    width: 100%;
                }

                .spinner-modern {
                    width: 48px;
                    height: 48px;
                    border: 3px solid rgba(37, 99, 235, 0.1);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 0.8s ease-in-out infinite;
                    margin: 0 auto 24px;
                }

                .status-card h3 {
                    font-size: 1.4rem;
                    margin: 0 0 8px 0;
                    color: var(--text-heading);
                }

                .status-text {
                    color: var(--text-body);
                    margin-bottom: 20px;
                }

                .timer-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: var(--bg-hover);
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-family: monospace;
                    font-size: 1rem;
                    color: var(--primary-color);
                    font-weight: 600;
                }

                .sub-hint {
                    margin-top: 24px;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }

                /* Table Section */
                .table-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: var(--shadow-soft);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                }

                .clickable-row {
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .clickable-row:hover {
                    background-color: var(--bg-hover);
                }
                
                .kpi-section {
                    margin-bottom: 24px;
                }
                
                /* Error State */
                .status-card.error .error-icon {
                    width: 48px;
                    height: 48px;
                    background: #fee2e2;
                    color: #ef4444;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    font-weight: bold;
                    margin: 0 auto 24px;
                }

                .view-activity-btn {
                    background: white;
                    border: 1px solid #e2e8f0;
                    color: #475569;
                    text-decoration: none;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 500;
                    padding: 6px 12px;
                    border-radius: 6px;
                    transition: all 0.2s;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                
                .view-activity-btn:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #0f172a;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }



                .view-activity-btn:hover {
                    background: var(--bg-hover);
                }

                /* Filter Styles Redesign */
                .btn-secondary.active {
                    background: #eff6ff;
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
                }

                .filter-badge {
                    background: var(--primary-color);
                    color: white;
                    border-radius: 50px;
                    padding: 2px 7px;
                    font-size: 0.75rem;
                    line-height: 1;
                    font-weight: 600;
                    min-width: 18px;
                    text-align: center;
                }

                .filter-panel {
                    margin-bottom: 24px;
                    padding: 24px 32px;
                    animation: slideDown 0.3s ease-out;
                    background: white;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.04);
                }

                .filter-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--border-color);
                }

                .filter-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-heading);
                }

                .clear-btn {
                    color: #ef4444;
                    font-size: 0.85rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: all 0.2s;
                }

                .clear-btn:hover {
                    background: #fef2f2;
                }

                .filter-row {
                    display: grid;
                    grid-template-columns: minmax(300px, 2fr) 1fr 1fr 1fr;
                    gap: 24px;
                    align-items: start;
                }
                
                @media (max-width: 1200px) {
                    .filter-row {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                .filter-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .filter-item label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .date-input-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                }

                .date-field {
                    flex: 1;
                    position: relative;
                }

                .date-separator {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }

                .modern-input, .modern-select-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    color: var(--text-main);
                    background: white;
                    transition: all 0.2s;
                    height: 42px;
                }
                
                .modern-select-input {
                    appearance: none;
                    cursor: pointer;
                    padding-right: 32px;
                }

                .select-wrapper {
                    position: relative;
                    width: 100%;
                }

                .select-arrow {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .modern-input:hover, .modern-select-input:hover {
                    border-color: #d1d5db;
                }

                .modern-input:focus, .modern-select-input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .btn-text {
                    background: none;
                    border: none;
                    cursor: pointer;
                }

                @keyframes slideDown {
                    from { 
                        opacity: 0; 
                        transform: translateY(-10px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0); 
                    }
                }

                @keyframes spin { to { transform: rotate(360deg); } }

                /* Pagination Styles */
                .pagination-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    background: white;
                }
                .page-info {
                    font-size: 0.85rem;
                    color: #64748b;
                }
                .pagination-controls {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .btn-page {
                    padding: 6px 14px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    color: #334155;
                    transition: all 0.2s;
                }
                .btn-page:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .btn-page:hover:not(:disabled) {
                    background: #f1f5f9;
                }
                .page-numbers {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                }
                .page-num-btn {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-size: 0.9rem;
                    color: #64748b;
                    transition: all 0.2s;
                }
                .page-num-btn.active {
                    background: #2563eb;
                    color: white;
                    font-weight: 600;
                }
                .page-num-btn:hover:not(.active) {
                    background: #f1f5f9;
                }

                /* Table Styles from ActivityList */
                .content-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    max-height: calc(100vh - 180px);
                    display: flex;
                    flex-direction: column;
                }

                .table-responsive { 
                    overflow-x: auto;
                    overflow-y: auto;
                    width: 100%; 
                    max-width: 100%;
                    position: relative;
                    flex: 1;
                }
                .modern-table { 
                    width: 100%; 
                    border-collapse: separate;
                    border-spacing: 0;
                    min-width: max-content;
                }
                .modern-table th {
                    background: #f8fafc;
                    padding: 16px 24px;
                    text-align: left;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: #64748b;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    border-bottom: 2px solid #e2e8f0;
                }
                .modern-table td {
                    padding: 16px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    color: #334155;
                    font-size: 0.9rem;
                    white-space: nowrap;
                }

                .modern-table tr:hover td { 
                    background: #f8fafc; 
                }
                .modern-table tr.totals-row-excel:hover td { 
                    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); 
                }

                .totals-row-excel {
                    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                    border-top: 2px solid #cbd5e1;
                }

                .totals-row-excel td {
                    padding: 16px 24px;
                    color: #374151;
                    font-size: 1rem;
                    font-weight: 700;
                    border-bottom: none;
                    white-space: nowrap;
                }

                .totals-row-excel .text-success {
                    color: #10b981 !important;
                }

                .totals-row-excel .text-warning {
                    color: #fbbf24 !important;
                }

                /* Sticky Totals Footer - Inside table container */
                .sticky-totals-footer {
                    position: sticky;
                    bottom: 0;
                    z-index: 9;
                    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                    border-top: 2px solid #cbd5e1;
                }

                .text-right { text-align: right; }
                .text-success { color: #10b981; }
                .text-warning { color: #fbbf24; }
                .text-primary { color: #3b82f6; }
                .text-error { color: #ef4444; }
                .font-bold { font-weight: 700; }
                .font-mono { font-family: 'SF Mono', 'Roboto Mono', monospace; }
                .text-xs { font-size: 0.75rem; }

                .status-pill {
                    display: inline-flex;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .status-pill.success { background: #dcfce7; color: #15803d; }
                .status-pill.warning { background: #ffedd5; color: #c2410c; }
                .status-pill.error { background: #fee2e2; color: #b91c1c; }

                .clickable-row {
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .clickable-row:hover {
                    background-color: #f8fafc;
                }

                .loading-state { 
                    padding: 60px; 
                    text-align: center; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    gap: 16px; 
                    color: #64748b; 
                }
                .spinner { 
                    width: 32px; 
                    height: 32px; 
                    border: 3px solid #e2e8f0; 
                    border-top-color: #2563eb; 
                    border-radius: 50%; 
                    animation: spin 1s infinite linear; 
                }
                @keyframes spin { 
                    to { transform: rotate(360deg); } 
                }

                .empty-state { 
                    text-align: center; 
                    padding: 40px; 
                    color: #64748b; 
                    font-style: italic;
                    /* Keep message in view on wide horizontally-scrolled tables */
                    position: sticky;
                    left: 0;
                    max-width: 100vw;
                }

                .crs-apply-filters-prompt {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 280px;
                    padding: 48px 24px;
                    text-align: center;
                    background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
                }

                .crs-apply-filters-prompt-title {
                    margin: 0 0 8px;
                    font-size: 1.0625rem;
                    font-weight: 650;
                    color: #334155;
                }

                .crs-apply-filters-prompt-hint {
                    margin: 0;
                    max-width: 36ch;
                    font-size: 0.875rem;
                    line-height: 1.45;
                    color: #94a3b8;
                }

                /* Coming Soon Styles */
                .coming-soon-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 120px 40px;
                    text-align: center;
                    min-height: 400px;
                }

                .coming-soon-icon {
                    font-size: 64px;
                    margin-bottom: 24px;
                    opacity: 0.8;
                }

                .coming-soon-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 12px 0;
                }

                .coming-soon-message {
                    font-size: 1rem;
                    color: #64748b;
                    margin: 0;
                    max-width: 500px;
                }

                /* Skeleton Loader */
                .skeleton-line {
                    height: 12px;
                    background: #e2e8f0;
                    border-radius: 4px;
                    margin-bottom: 0;
                    animation: pulse 1.5s infinite ease-in-out;
                }
                .width-40 { width: 40%; }
                .width-80 { width: 80%; }
                
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                    100% { opacity: 0.6; }
                }
                /* Sticky Totals Bar */
                .sticky-totals-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                    border-top: 3px solid #3b82f6;
                    color: white;
                    padding: 16px 24px;
                    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    animation: slideUp 0.3s ease-out;
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .totals-content {
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    max-width: 1200px;
                    margin: 0 auto;
                    gap: 20px;
                }

                .totals-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    min-width: 150px;
                }

                .totals-label {
                    font-size: 0.75rem;
                    font-weight: 500;
                    color: #cbd5e1;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .totals-value {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: white;
                }

                .totals-value.text-success {
                    color: #10b981 !important;
                }

                .totals-value.text-warning {
                    color: #fbbf24 !important;
                }

                .totals-value.text-error {
                    color: #ef4444 !important;
                }

                /* Responsive design for smaller screens */
                @media (max-width: 768px) {
                    .totals-content {
                        flex-wrap: wrap;
                        gap: 12px;
                    }
                    
                    .totals-item {
                        flex-direction: row;
                        justify-content: space-between;
                        min-width: calc(50% - 6px);
                    }
                    
                    .totals-value {
                        font-size: 1.1rem;
                    }
                }

                @media (max-width: 480px) {
                    .sticky-totals-bar {
                        padding: 12px 16px;
                    }
                    
                    .totals-content {
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .totals-item {
                        flex-direction: row;
                        justify-content: space-between;
                        width: 100%;
                        min-width: auto;
                    }
                    
                    .totals-label {
                        font-size: 0.7rem;
                    }
                    
                    .totals-value {
                        font-size: 1rem;
                    }
                }
            `}</style>

        </div >
    );
};

export default CRSReport;
