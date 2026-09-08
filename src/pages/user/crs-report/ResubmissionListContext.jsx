import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useDataSync } from '../../../context/DataSyncContext';
import { usePortal } from '../../../context/PortalContext';
import { stripPortalPrefix } from '../../../config/portals';
import { apiDownload, apiFetch } from '../../../utils/apiFetch';
import {
    buildClaimsListQuery,
    buildClaimsReportQuery,
} from '../../../utils/claimsReportQuery';
import { mapClaimItem } from '../../../utils/claimMapper';
import { processInChunks } from '../../../hooks/useSmartDataFetch';
import { currentMonthValue, monthNumberParam } from './resubmissionMatrix';

export const DEFAULT_RESUBMISSION_OFFICE_ID = '1';

export const SEARCH_ON_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Submission Transaction Date', value: 'SubmissionTransactionDate' },
    { label: 'Remittance Transaction Date', value: 'RemittanceTransactionDate' },
    { label: 'Settlement Date', value: 'SettlementDate' },
    { label: 'Encounter Start Date', value: 'EncounterStartDate' },
    { label: 'Encounter End Date', value: 'EncounterEndDate' },
];

export const initialFilters = {
    facilityIds: [],
    searchOn: '',
    searchValue: '',
    year: '',
    month: '',
    fromDate: '',
    toDate: '',
    receiverId: '',
    payerId: '',
    payer: '',
    encounter: 'OP & IP',
    claimNo: '',
    clinician: '',
    denial: '',
    cpt: '',
};

export const cloneFilters = (f) => ({
    ...f,
    facilityIds: [...(f.facilityIds || [])],
});

export const isClaimsApiTotalRow = (item) =>
    item && (item.isTotalRow === true || String(item.label || '').toUpperCase() === 'TOTAL');

/** Must stay aligned with claimDetailsListColumns.js CLAIM_DETAILS_LIST_COLUMN_IDS */
import { CLAIM_DETAILS_LIST_COLUMN_IDS as CLAIM_LIST_COLUMN_IDS } from './claimDetailsListColumns';

export { CLAIM_LIST_COLUMN_IDS };

const ResubmissionListContext = createContext(null);

export function useResubmissionList() {
    const ctx = useContext(ResubmissionListContext);
    if (!ctx) {
        throw new Error('useResubmissionList must be used within ResubmissionListProvider (under /crs/resubmission routes)');
    }
    return ctx;
}

/** Holds list filters + claims cache while navigating list ↔ claim detail (nested routes). */
export function ResubmissionListProvider({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { path: portalPath } = usePortal();
    const { user } = useAuth();
    const { refreshSyncStatus } = useDataSync();
    const permission = user?.permission || 'Office';

    const [draftFilters, setDraftFilters] = useState(() => cloneFilters(initialFilters));
    const [appliedFilters, setAppliedFilters] = useState(() => cloneFilters(initialFilters));
    const [hasApplied, setHasApplied] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);

    const [officesList, setOfficesList] = useState([]);
    const [facilityNameMap, setFacilityNameMap] = useState({});

    const [claimsData, setClaimsData] = useState([]);
    const [isLoadingClaims, setIsLoadingClaims] = useState(false);
    const [resubmissionReport, setResubmissionReport] = useState(null);
    const [isLoadingResubmissions, setIsLoadingResubmissions] = useState(false);
    const [hasLoadedResubmissions, setHasLoadedResubmissions] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 500;
    const [serverPagination, setServerPagination] = useState({
        page: 0,
        size: 500,
        totalPages: 0,
        totalElements: 0,
    });

    const [showFilters, setShowFilters] = useState(true);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const columnMenuRef = useRef(null);
    const [visibleClaimColumns, setVisibleClaimColumns] = useState(() => {
        const o = {};
        CLAIM_LIST_COLUMN_IDS.forEach((id) => {
            o[id] = true;
        });
        return o;
    });
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const branchDropdownRef = useRef(null);
    const [exportingFormat, setExportingFormat] = useState('');
    const resubmissionsQueryKeyRef = useRef('');
    const hasLoadedResubmissionsRef = useRef(false);

    const fixedYearOptions = useMemo(() => ['2026', '2025', '2024'], []);
    const uniqueMonths = useMemo(
        () => [
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
            { value: '12', label: 'December' },
        ],
        []
    );

    const showBranchFilter = permission === 'All';
    const normalizedResubPath = stripPortalPrefix(location.pathname).replace(/\/+$/, '');
    const isResubmissionReportRoute = normalizedResubPath === '/crs/resubmission';
    // /claims list API is only consumed by insurer/payer queue pages — not matrix or verification.
    const isClaimsListRoute = /^\/crs\/resubmission\/(payer|insurer)\//.test(normalizedResubPath);

    const uniqueFacilities = useMemo(() => {
        if (permission === 'All') {
            return (officesList || [])
                .map((o) => String(o.officeId ?? o.office_id ?? o.id ?? ''))
                .filter(Boolean);
        }
        return [...new Set(claimsData.map((item) => String(item.officeId ?? item.facility ?? '')).filter(Boolean))].sort();
    }, [permission, officesList, claimsData]);

    const officeCtx = useMemo(
        () => ({ officesList, permission, user }),
        [officesList, permission, user]
    );

    const canApplyFilters = !isFiltering;

    const hasPendingFilters = useMemo(() => {
        const compareFacilityIds = (a, b) => {
            const left = [...(a || [])].map(String).sort().join(',');
            const right = [...(b || [])].map(String).sort().join(',');
            return left !== right;
        };
        return (
            draftFilters.year !== appliedFilters.year ||
            compareFacilityIds(draftFilters.facilityIds, appliedFilters.facilityIds)
        );
    }, [draftFilters, appliedFilters]);

    const handleOfficeFilterChange = useCallback((officeId) => {
        const id = String(officeId || '')
            .split(',')
            .map((part) => part.trim())
            .find(Boolean);
        if (!id || id === 'All') return;
        setDraftFilters((prev) => ({
            ...prev,
            facilityIds: [id],
        }));
    }, []);

    const appliedFilterBadgeCount = useMemo(() => {
        return Object.keys(appliedFilters).filter((key) => {
            const v = appliedFilters[key];
            if (key === 'facilityIds') return (v?.length || 0) > 0;
            if (key === 'encounter') return v && v !== 'OP & IP';
            return v && v !== '' && v !== 'all';
        }).length;
    }, [appliedFilters]);

    const reportEntryCount = useMemo(() => {
        if (!hasApplied) return 0;
        return serverPagination.totalElements || claimsData.length || 0;
    }, [hasApplied, serverPagination.totalElements, claimsData.length]);

    const loadOffices = useCallback(async () => {
        const officesBasicRes = await apiFetch('/api/offices/basic');
        const offices = Array.isArray(officesBasicRes)
            ? officesBasicRes
            : Array.isArray(officesBasicRes?.data)
              ? officesBasicRes.data
              : [];
        const nameMap = {};
        offices.forEach((o) => {
            const officeKey = String(o.officeId ?? o.office_id ?? o.id ?? '');
            const label = `${o.facilityId || '-'} - ${o.officeName || o.facilityName || o.office_name || 'Unknown Office'}`;
            if (officeKey) nameMap[officeKey] = label;
        });
        setOfficesList(offices);
        setFacilityNameMap(nameMap);
        return { offices, nameMap };
    }, []);

    const defaultOfficeId = useMemo(() => {
        if (permission === 'All') return DEFAULT_RESUBMISSION_OFFICE_ID;
        return String(user?.officeId ?? user?.office_id ?? '').trim() || DEFAULT_RESUBMISSION_OFFICE_ID;
    }, [permission, user]);

    useEffect(() => {
        if (!defaultOfficeId) return;
        const ensureOneOffice = (prev) => {
            const current = (prev.facilityIds || []).map((id) => String(id).trim()).filter(Boolean);
            const nextId = current[0] || defaultOfficeId;
            if (current.length === 1 && current[0] === nextId) return prev;
            return { ...prev, facilityIds: [nextId] };
        };
        setDraftFilters(ensureOneOffice);
        setAppliedFilters(ensureOneOffice);
    }, [defaultOfficeId]);

    useEffect(() => {
        if (!user) return;
        loadOffices().catch((err) => console.error(err));
    }, [user, loadOffices]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
                setShowBranchDropdown(false);
            }
            if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) {
                setShowColumnMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchClaimsPage = useCallback(
        async (targetPage = 1, filters = appliedFilters) => {
            if (!user) return;
            setIsLoadingClaims(true);
            try {
                const { officeIds, query } = buildClaimsListQuery(filters, officeCtx, {
                    targetPage,
                    pageSize: itemsPerPage,
                });
                if (officeIds.length === 0) {
                    setClaimsData([]);
                    setServerPagination({ page: 0, size: itemsPerPage, totalPages: 0, totalElements: 0 });
                    return;
                }
                const url = `/api/activity-report/claims?${query.toString()}`;
                const claimsDataRes = await apiFetch(url);
                const rawData = Array.isArray(claimsDataRes)
                    ? claimsDataRes
                    : claimsDataRes?.content ?? claimsDataRes?.data ?? claimsDataRes?.claims ?? [];
                const dataRows = rawData.filter((row) => !isClaimsApiTotalRow(row));
                const mappedData = await processInChunks(dataRows, mapClaimItem);
                setClaimsData(mappedData);
                setServerPagination({
                    page: Number(claimsDataRes?.page ?? Math.max(0, targetPage - 1)),
                    size: Number(claimsDataRes?.size ?? itemsPerPage),
                    totalPages: Number(claimsDataRes?.totalPages ?? 0),
                    totalElements: Number(claimsDataRes?.totalElements ?? dataRows.length ?? 0),
                });
                refreshSyncStatus();
            } catch (err) {
                console.error('Resubmission claims fetch:', err);
                setClaimsData([]);
            } finally {
                setIsLoadingClaims(false);
                setIsFiltering(false);
            }
        },
        [user, officeCtx, appliedFilters, itemsPerPage, refreshSyncStatus]
    );

    useEffect(() => {
        if (!user || !hasApplied || !isClaimsListRoute) return;
        fetchClaimsPage(currentPage, appliedFilters);
    }, [
        user,
        hasApplied,
        currentPage,
        appliedFilters,
        fetchClaimsPage,
        isClaimsListRoute,
    ]);

    const resolveDisplayOfficeId = useCallback(
        (filters) => {
            const selected = (filters?.facilityIds || []).map((id) => String(id).trim()).filter(Boolean);
            if (selected.length > 0) return selected[0];
            if (permission === 'All') return DEFAULT_RESUBMISSION_OFFICE_ID;
            return String(user?.officeId ?? user?.office_id ?? '').trim() || DEFAULT_RESUBMISSION_OFFICE_ID;
        },
        [permission, user]
    );

    const unwrapResubmissionDisplay = (raw) => {
        if (!raw || typeof raw !== 'object') return null;
        if (Array.isArray(raw.senders) || raw.total_rejected_claims != null) return raw;
        const inner = raw.data ?? raw.result ?? raw.payload;
        if (inner && typeof inner === 'object' && (Array.isArray(inner.senders) || inner.total_rejected_claims != null)) {
            return inner;
        }
        return null;
    };

    useEffect(() => {
        if (!user || !hasApplied || !isResubmissionReportRoute) return;

        const year = String(appliedFilters.year || '').trim();
        const month = monthNumberParam(appliedFilters.month);
        const officeId = resolveDisplayOfficeId(appliedFilters) || DEFAULT_RESUBMISSION_OFFICE_ID;

        if (!year || !month) {
            resubmissionsQueryKeyRef.current = '';
            setResubmissionReport(null);
            setHasLoadedResubmissions(true);
            hasLoadedResubmissionsRef.current = true;
            setIsLoadingResubmissions(false);
            setIsFiltering(false);
            return;
        }

        const queryKey = `${year}|${month}|${officeId}`;
        // Keep cached matrix when navigating verification → back with same filters.
        if (hasLoadedResubmissionsRef.current && resubmissionsQueryKeyRef.current === queryKey) {
            setIsFiltering(false);
            return;
        }

        const controller = new AbortController();
        const query = new URLSearchParams({ year, month, officeId });

        const fetchResubmissionDisplay = async () => {
            setIsLoadingResubmissions(true);
            setHasLoadedResubmissions(false);
            hasLoadedResubmissionsRef.current = false;
            try {
                const response = await apiFetch(
                    `/api/dashboard/resubmission-display?${query.toString()}`,
                    { signal: controller.signal }
                );
                if (!controller.signal.aborted) {
                    setResubmissionReport(unwrapResubmissionDisplay(response));
                    resubmissionsQueryKeyRef.current = queryKey;
                }
            } catch (error) {
                if (error?.name !== 'AbortError') {
                    console.error('Resubmission display fetch:', error);
                    setResubmissionReport(null);
                    resubmissionsQueryKeyRef.current = '';
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingResubmissions(false);
                    setIsFiltering(false);
                    setHasLoadedResubmissions(true);
                    hasLoadedResubmissionsRef.current = true;
                }
            }
        };

        fetchResubmissionDisplay();
        return () => controller.abort();
    }, [
        user,
        hasApplied,
        appliedFilters,
        permission,
        isResubmissionReportRoute,
        resolveDisplayOfficeId,
    ]);

    const handleFilterChange = useCallback((key, value) => {
        const val =
            value === 'all' || value === 'All' || String(value ?? '').trim().toLowerCase() === 'all'
                ? ''
                : value;
        setDraftFilters((prev) => {
            const newFilters = { ...prev, [key]: val };
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
        if (key === 'year' && hasApplied) {
            setAppliedFilters((prev) => ({ ...prev, year: val, fromDate: '', toDate: '' }));
        }
    }, [hasApplied]);

    const applyDraftFilters = useCallback(() => {
        setIsFiltering(true);
        if (isClaimsListRoute) setIsLoadingClaims(true);
        setClaimsData([]);
        // Force refetch even if year/office are unchanged (e.g. Apply click).
        resubmissionsQueryKeyRef.current = '';
        setHasLoadedResubmissions(false);
        hasLoadedResubmissionsRef.current = false;
        setHasApplied(true);
        const officeId = String(
            draftFilters.facilityIds?.[0] || defaultOfficeId || DEFAULT_RESUBMISSION_OFFICE_ID
        ).trim();
        setAppliedFilters({
            ...cloneFilters(draftFilters),
            facilityIds: [officeId],
        });
        setCurrentPage(1);
    }, [draftFilters, isClaimsListRoute, defaultOfficeId]);

    const selectResubmissionMonth = useCallback((monthValue) => {
        const next = String(monthValue || '');
        setDraftFilters((prev) =>
            prev.month === next ? prev : { ...prev, month: next, fromDate: '', toDate: '' }
        );
        setAppliedFilters((prev) => {
            if (!hasApplied || prev.month === next) return prev;
            return { ...prev, month: next, fromDate: '', toDate: '' };
        });
    }, [hasApplied]);

    const clearFilters = useCallback(() => {
        setIsFiltering(true);
        if (isResubmissionReportRoute) setIsLoadingResubmissions(true);
        else if (isClaimsListRoute) setIsLoadingClaims(true);
        const currentYear = String(new Date().getFullYear());
        const defaultYear = fixedYearOptions.includes(currentYear) ? currentYear : fixedYearOptions[0] || '';
        const cleared = cloneFilters(
            isResubmissionReportRoute
                ? {
                      ...initialFilters,
                      year: defaultYear,
                      month: currentMonthValue(),
                      searchOn: 'RemittanceTransactionDate',
                      facilityIds: [defaultOfficeId],
                  }
                : {
                      ...initialFilters,
                      facilityIds: [defaultOfficeId],
                  }
        );
        resubmissionsQueryKeyRef.current = '';
        setHasLoadedResubmissions(false);
        hasLoadedResubmissionsRef.current = false;
        setDraftFilters(cleared);
        setAppliedFilters(cloneFilters(cleared));
        setCurrentPage(1);
        setHasApplied(true);
        setClaimsData([]);
    }, [fixedYearOptions, isResubmissionReportRoute, isClaimsListRoute, defaultOfficeId]);

    const toggleBranch = useCallback((branchId) => {
        const id = String(branchId || '').trim();
        if (!id) return;
        setDraftFilters((prev) => ({ ...prev, facilityIds: [id] }));
    }, []);

    const selectAllBranches = useCallback(() => {
        if (!defaultOfficeId) return;
        setDraftFilters((prev) => ({ ...prev, facilityIds: [defaultOfficeId] }));
    }, [defaultOfficeId]);

    const totalPages = Math.max(1, serverPagination.totalPages || 1);

    const handlePageChange = useCallback(
        (p) => {
            if (p >= 1 && p <= totalPages) setCurrentPage(p);
        },
        [totalPages]
    );

    const toggleClaimListColumn = useCallback((id) => {
        setVisibleClaimColumns((prev) => {
            const next = { ...prev, [id]: !prev[id] };
            const visibleCount = CLAIM_LIST_COLUMN_IDS.filter((c) => next[c] !== false).length;
            if (visibleCount === 0) return prev;
            return next;
        });
    }, []);

    const openClaimResubmissionDetail = useCallback(
        (claim) => {
            const id = String(claim?.claimId || claim?.id || '').trim();
            if (!id) return;
            navigate(portalPath(`/crs/resubmission/${encodeURIComponent(id)}`), { state: { claim } });
        },
        [navigate, portalPath]
    );

    const exportToCSV = useCallback(async () => {
        if (exportingFormat) return;
        try {
            setExportingFormat('csv');
            const { officeIds, query } = buildClaimsReportQuery(appliedFilters, officeCtx);
            if (officeIds.length === 0) {
                alert('No office selected for export');
                return;
            }
            await apiDownload(`/api/activity-report/claims/export/csv?${query.toString()}`, {
                fallbackFileName: `claims_${new Date().toISOString().split('T')[0]}.csv`,
            });
        } catch (err) {
            console.error(err);
            alert('Failed to export CSV');
        } finally {
            setExportingFormat('');
        }
    }, [exportingFormat, appliedFilters, officeCtx]);

    const exportToExcel = useCallback(async () => {
        if (exportingFormat) return;
        try {
            setExportingFormat('excel');
            const { officeIds, query } = buildClaimsReportQuery(appliedFilters, officeCtx);
            if (officeIds.length === 0) {
                alert('No office selected for export');
                return;
            }
            await apiDownload(`/api/activity-report/claims/export/excel?${query.toString()}`, {
                fallbackFileName: `claims_${new Date().toISOString().split('T')[0]}.xlsx`,
            });
        } catch (err) {
            console.error(err);
            alert('Failed to export Excel');
        } finally {
            setExportingFormat('');
        }
    }, [exportingFormat, appliedFilters, officeCtx]);

    const value = {
        permission,
        draftFilters,
        appliedFilters,
        hasApplied,
        isFiltering,
        officesList,
        facilityNameMap,
        claimsData,
        isLoadingClaims,
        resubmissionReport,
        isLoadingResubmissions,
        hasLoadedResubmissions,
        currentPage,
        serverPagination,
        showFilters,
        setShowFilters,
        showColumnMenu,
        setShowColumnMenu,
        columnMenuRef,
        visibleClaimColumns,
        setVisibleClaimColumns,
        showBranchDropdown,
        setShowBranchDropdown,
        branchDropdownRef,
        exportingFormat,
        fixedYearOptions,
        uniqueMonths,
        showBranchFilter,
        uniqueFacilities,
        officeCtx,
        canApplyFilters,
        hasPendingFilters,
        handleOfficeFilterChange,
        appliedFilterBadgeCount,
        reportEntryCount,
        handleFilterChange,
        applyDraftFilters,
        selectResubmissionMonth,
        clearFilters,
        toggleBranch,
        selectAllBranches,
        totalPages,
        handlePageChange,
        toggleClaimListColumn,
        openClaimResubmissionDetail,
        exportToCSV,
        exportToExcel,
        isExporting: exportingFormat !== '',
        resolveDisplayOfficeId,
    };

    return <ResubmissionListContext.Provider value={value}>{children}</ResubmissionListContext.Provider>;
}
