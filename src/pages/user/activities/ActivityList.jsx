import React, { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useDataSync } from '../../../context/DataSyncContext';
import { usePortal } from '../../../context/PortalContext';
import LastSyncIndicator from '../../../components/common/LastSyncIndicator';
import { apiDownload, apiFetch } from '../../../utils/apiFetch';

const toItemsArray = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.content)) return raw.content;
    if (Array.isArray(raw?.activities)) return raw.activities;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
};

const isActivityApiTotalRow = (item) =>
    item &&
    (item.isTotalRow === true || String(item.label || '').toUpperCase() === 'TOTAL');

const activityTotalsFromApiRow = (row) => {
    if (!row || typeof row !== 'object') return null;
    const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
    return {
        netAmt: n(row.netAmt),
        initialRejectedAmt: n(row.initialRejectedAmt),
        unprocessedAmt: n(row.unprocessedAmt),
        writeOffAmt: n(row.writeOffAmt),
        remittedAmt: n(row.remittedAmt),
        lastRemittedAmount: n(row.lastRemittedAmount),
        rejectedAmt: n(row.rejectedAmt),
        settledAmt: n(row.settledAmt),
        rejectionPercentage: n(row.rejectionPercentage),
    };
};

const SEARCH_ON_OPTIONS = [
    { label: 'Select', value: '' },
    { label: 'Submission Transaction Date', value: 'SubmissionTransactionDate' },
    { label: 'Remittance Transaction Date', value: 'RemittanceTransactionDate' },
    { label: 'Settlement Date', value: 'SettlementDate' },
    { label: 'Encounter Start Date', value: 'EncounterStartDate' },
    { label: 'Encounter End Date', value: 'EncounterEndDate' },
];

const MONTH_TO_NUMBER = {
    January: 1,
    February: 2,
    March: 3,
    April: 4,
    May: 5,
    June: 6,
    July: 7,
    August: 8,
    September: 9,
    October: 10,
    November: 11,
    December: 12,
};

const activityListMemoryCache = {};

const ActivityList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id: portalId, path: portalPath } = usePortal();
    const cachedActivityState = activityListMemoryCache[portalId];
    const [activities, setActivities] = useState(() => cachedActivityState?.activities || []);
    const [activityApiTotals, setActivityApiTotals] = useState(() => cachedActivityState?.activityApiTotals ?? null);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(false);
    const fetchAbortRef = useRef(null);
    const fetchRequestIdRef = useRef(0);
    const fetchModeRef = useRef('full');
    const { refreshSyncStatus } = useDataSync();
    const [error, setError] = useState(null);
    const [serverPagination, setServerPagination] = useState(() => ({
        totalElements: Number(cachedActivityState?.serverPagination?.totalElements ?? 0),
        totalPages: Number(cachedActivityState?.serverPagination?.totalPages ?? 0),
        page: Number(cachedActivityState?.serverPagination?.page ?? 0),
        size: Number(cachedActivityState?.serverPagination?.size ?? 500),
    }));

    // Pagination state
    const [currentPage, setCurrentPage] = useState(() =>
        Number(cachedActivityState?.currentPage) > 0 ? Number(cachedActivityState.currentPage) : 1
    );
    const [itemsPerPage] = useState(500);
    const [searchTerm, setSearchTerm] = useState(() => cachedActivityState?.searchTerm || '');
    const [officesList, setOfficesList] = useState([]);
    const [exportingFormat, setExportingFormat] = useState('');
    const isExporting = exportingFormat !== '';
    const normalizeFilterValue = useCallback((value) => {
        if (value == null) return '';
        const text = String(value).trim();
        if (!text || text.toLowerCase() === 'all') return '';
        return text;
    }, []);

    const resolveActivityOfficeIds = useCallback((filters = {}) => {
        const permissionType = user?.permission || 'Office';
        const allOfficeIds = (officesList || [])
            .filter((o) => o?.officeId != null)
            .map((o) => String(o.officeId));

        if ((filters.facilityIds?.length || 0) > 0) {
            return filters.facilityIds.map((id) => String(id));
        }

        if (permissionType !== 'All') {
            const userOfficeId = user?.officeId || user?.office_id;
            if (userOfficeId) return [String(userOfficeId)];
            return allOfficeIds;
        }

        return allOfficeIds;
    }, [officesList, user]);

    const buildActivityReportQuery = useCallback((filters = {}, { includePagination = false, targetPage = 1 } = {}) => {
        const officeIds = resolveActivityOfficeIds(filters);
        const query = new URLSearchParams();
        if (officeIds.length === 0) return { officeIds: [], query };

        query.set('officeIds', officeIds.join(','));
        if (includePagination) {
            query.set('page', String(Math.max((targetPage || 1) - 1, 0)));
            query.set('size', String(itemsPerPage));
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
                const monthNumber = MONTH_TO_NUMBER[monthValue] || parseInt(monthValue, 10);
                if (monthNumber) query.set('month', String(monthNumber));
            }
        }

        addParam('payerId', filters.payerId);
        addParam('receiverId', filters.receiverId);
        addParam('payer', filters.payer);
        addParam('encounterType', filters.encounter === 'OP & IP' ? '' : filters.encounter);
        addParam('clinician', filters.clinician);
        addParam('claimNo', filters.claimNo);
        addParam('denial', filters.denial);
        addParam('cpt', filters.cpt);

        return { officeIds, query };
    }, [itemsPerPage, normalizeFilterValue, resolveActivityOfficeIds]);

    useEffect(() => {
        if (!user) return;
        const loadBaseLookups = async () => {
            try {
                const officesData = await apiFetch('/api/offices/basic');

                const offices = Array.isArray(officesData) ? officesData : officesData?.data;
                if (offices?.length > 0) {
                    setOfficesList(offices);
                }
            } catch (err) {
                console.error('Error fetching lookups:', err);
            }
        };
        loadBaseLookups();
    }, [user]);

    const fetchActivityReportPage = useCallback(async (targetPage = currentPage, filters, options = {}) => {
        const { mode = 'full' } = options;
        const isPageChange = mode === 'page';
        const effectiveFilters = filters || {};
        const { officeIds, query } = buildActivityReportQuery(effectiveFilters, {
            includePagination: true,
            targetPage,
        });

        if (officeIds.length === 0) {
            console.warn('[ActivityList] Skipping fetch: no officeIds resolved. user.officeId/permission:', user?.officeId, user?.permission, 'officesList:', officesList?.length);
            setActivities([]);
            setActivityApiTotals(null);
            setServerPagination((prev) => ({ ...prev, totalElements: 0, totalPages: 0, page: 0, size: itemsPerPage }));
            setError('Cannot load activity report: no office assigned to your account. Please contact admin.');
            setLoading(false);
            setPageLoading(false);
            return;
        }

        if (fetchAbortRef.current) {
            fetchAbortRef.current.abort();
        }
        const controller = new AbortController();
        fetchAbortRef.current = controller;
        const requestId = ++fetchRequestIdRef.current;

        if (isPageChange) {
            setPageLoading(true);
        } else {
            setLoading(true);
            setPageLoading(false);
        }
        setError(null);

        try {
            const data = await apiFetch(`/api/activity-report?${query.toString()}`, {
                signal: controller.signal,
            });
            if (requestId !== fetchRequestIdRef.current) return;

            const items = toItemsArray(data);
            const totalRow = items.find(isActivityApiTotalRow);
            const dataItems = items.filter((row) => !isActivityApiTotalRow(row));
            setActivityApiTotals(activityTotalsFromApiRow(totalRow));
            setActivities(dataItems);

            const totalElements = Number(data?.totalElements ?? items.length ?? 0);
            const totalPages = Number(data?.totalPages ?? (totalElements > 0 ? Math.ceil(totalElements / itemsPerPage) : 0));
            const page = Number(data?.page ?? Math.max(targetPage - 1, 0));
            const size = Number(data?.size ?? itemsPerPage);

            setServerPagination({ totalElements, totalPages, page, size });
            if (!isPageChange) {
                refreshSyncStatus();
            }
        } catch (err) {
            if (err?.name === 'AbortError') return;
            if (requestId !== fetchRequestIdRef.current) return;
            console.error('Error fetching activity report:', err);
            setError('Error loading activity report');
            if (!isPageChange) {
                setActivities([]);
                setActivityApiTotals(null);
                setServerPagination((prev) => ({ ...prev, totalElements: 0, totalPages: 0 }));
            }
        } finally {
            if (requestId !== fetchRequestIdRef.current) return;
            setLoading(false);
            setPageLoading(false);
            if (fetchAbortRef.current === controller) {
                fetchAbortRef.current = null;
            }
        }
    }, [buildActivityReportQuery, itemsPerPage, refreshSyncStatus]);

    const permission = user?.permission || 'Office';
    const userOfficeIdResolved = user?.officeId || user?.office_id;
    const showBranchFilter = permission === 'All' || !userOfficeIdResolved;

    // --- Derived Dropdown Options ---
    const uniqueFacilities = useMemo(
        () => (officesList || [])
            .filter((o) => o?.officeId != null)
            .map((o) => ({
                officeId: String(o.officeId),
                facilityId: o.facilityId || '',
                officeName: o.officeName || '',
            })),
        [officesList]
    );

    /** API sends insurance payer as `insurancePayerId` (activity or nested claim / remittance header). */
    const insurancePayerIdOf = (a) =>
        a?.insurancePayerId ??
        a?.claim?.insurancePayerId ??
        a?.claim?.remittanceHeader?.insurancePayerId;

    const uniqueReceivers = useMemo(() => {
        const receiverIds = activities
            .map((a) => insurancePayerIdOf(a) ?? a.claim?.receiverId ?? a.claim?.remittanceHeader?.receiverId)
            .filter((x) => x != null && String(x).trim() !== '');
        const uniqueSet = new Set(receiverIds);
        return Array.from(uniqueSet).sort();
    }, [activities]);

    const uniquePayers = useMemo(() => {
        const payerIds = activities
            .map((a) =>
                insurancePayerIdOf(a) ??
                a.claim?.payerId ??
                a.IDpayer ??
                a.IDPayer ??
                a.idPayer ??
                a.PayerID ??
                a.senderid ??
                a.senderId
            )
            .filter(Boolean);
        const uniqueSet = new Set(payerIds);
        return Array.from(uniqueSet).sort();
    }, [activities]);

    const defaultActivityFilters = {
        facilityIds: [],
        facility: '',
        searchOn: '',
        year: '',
        month: '',
        fromDate: '',
        toDate: '',
        receiverId: '',
        payerId: '',
        payer: '',
        clinician: '',
        encounter: 'OP & IP',
        claimNo: '',
        denial: '',
        cpt: ''
    };

    const cloneActivityFilters = (f) => ({
        ...f,
        facilityIds: [...(f.facilityIds || [])],
    });

    const [draftFilters, setDraftFilters] = useState(() =>
        cloneActivityFilters(cachedActivityState?.draftFilters || defaultActivityFilters)
    );
    const [appliedFilters, setAppliedFilters] = useState(() =>
        cloneActivityFilters(cachedActivityState?.appliedFilters || defaultActivityFilters)
    );

    const [showFilters, setShowFilters] = useState(() =>
        typeof cachedActivityState?.showFilters === 'boolean' ? cachedActivityState.showFilters : true
    );
    const [hasAppliedFilters, setHasAppliedFilters] = useState(() =>
        Boolean(cachedActivityState?.hasAppliedFilters)
    );
    const [showTotals, setShowTotals] = useState(() =>
        typeof cachedActivityState?.showTotals === 'boolean' ? cachedActivityState.showTotals : true
    );
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const branchDropdownRef = useRef(null);
    const persistActivityListStateRef = useRef(() => {});

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
                setShowBranchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Count active **applied** filters (what the table uses)
    const activeFilterCount = useMemo(() => {
        return Object.keys(defaultActivityFilters).reduce((count, key) => {
            if (key === 'facility') return count;
            if (key === 'facilityIds') {
                if ((appliedFilters.facilityIds?.length || 0) > 0) return count + 1;
                return count;
            }
            if (appliedFilters[key] !== defaultActivityFilters[key] && appliedFilters[key] !== '') {
                return count + 1;
            }
            return count;
        }, 0);
    }, [appliedFilters]);

    const filtersDirty = useMemo(
        () => JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
        [draftFilters, appliedFilters]
    );
    const canApplyFilters = filtersDirty || !hasAppliedFilters;

    const applyDraftFilters = useCallback(() => {
        const nextFilters = cloneActivityFilters(draftFilters);
        fetchModeRef.current = 'full';
        setActivities([]);
        setActivityApiTotals(null);
        setLoading(true);
        setPageLoading(false);
        setHasAppliedFilters(true);
        setAppliedFilters(nextFilters);
        setCurrentPage(1);
        restoreFromCacheRef.current = false;
        // Fetch is handled by the pagination/filter useEffect when appliedFilters/currentPage change.
    }, [draftFilters]);

    const handleFilterChange = useCallback((field, value) => {
        setDraftFilters(prev => {
            const newFilters = { ...prev, [field]: value };

            if (field === 'year' || field === 'month') {
                if (value) {
                    newFilters.fromDate = '';
                    newFilters.toDate = '';
                }
            } else if (field === 'fromDate' || field === 'toDate') {
                if (value) {
                    newFilters.year = '';
                    newFilters.month = '';
                }
            }

            return newFilters;
        });
    }, []);

    // Helper to parse dates strictly for filtering
    const parseDate = (dateStr) => {
        if (!dateStr) return null;

        let d, m, y;

        // Handle YYYY-MM-DD (Date Picker Input)
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        }

        // Handle DD/MM/YYYY (Filter Text or API Data)
        if (dateStr.length >= 10 && dateStr.includes('/')) {
            const parts = dateStr.split(' '); // Handle "DD/MM/YYYY HH:MM"
            [d, m, y] = parts[0].split('/').map(Number);
            return new Date(y, m - 1, d);
        }

        return new Date(dateStr);
    };

    // Filter Logic with loading state
    const filteredActivities = useMemo(() => {
        const result = activities.filter((act) => {
            if (isActivityApiTotalRow(act)) return false;
            // --- Payer (Insurance only) ---
            if (appliedFilters.payer === 'Insurance') {
                // If we strictly only support Insurance, we verify it's not self-pay? 
                // Requirement: "payer : only have drop down 'Insurance'"
                // Just keeping the filter as is. 
            }

            // --- Encounter ---
            // "OP and Ip , IP, OP,(the condition is "claimId" if the claim id starts with : DLHI it is IP, if DLHO is outpatient. OP."
            if (appliedFilters.encounter && appliedFilters.encounter !== 'OP & IP') {
                const claimId = act.claim?.claimId || '';
                const isIP = claimId.startsWith('DLHI');
                const isOP = claimId.startsWith('DLHO');

                if (appliedFilters.encounter === 'In Patient' && !isIP) return false;
                if (appliedFilters.encounter === 'Out Patient' && !isOP) return false;
            }

            // --- Clinician (id + names + department) ---
            if (appliedFilters.clinician) {
                const q = appliedFilters.clinician.toLowerCase();
                const idMatch = act.clinicianId?.toLowerCase().includes(q);
                const nameMatch = [act.clinician_name, act.clinicianName, act.doctor_name_as_per_heartbeat, act.department_name]
                    .some((x) => x != null && String(x).toLowerCase().includes(q));
                if (!idMatch && !nameMatch) return false;
            }

            // --- Global Search Term (Fallback/Extra) ---
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                if (!(
                    (act.activityCode && act.activityCode.toLowerCase().includes(searchLower)) ||
                    (act.activityId && String(act.activityId).toLowerCase().includes(searchLower)) ||
                    (act.clinicianId && act.clinicianId.toLowerCase().includes(searchLower)) ||
                    (act.clinician_name && act.clinician_name.toLowerCase().includes(searchLower)) ||
                    (act.doctor_name_as_per_heartbeat && act.doctor_name_as_per_heartbeat.toLowerCase().includes(searchLower)) ||
                    (act.department_name && act.department_name.toLowerCase().includes(searchLower)) ||
                    (act.denialCode && act.denialCode.toLowerCase().includes(searchLower)) ||
                    (act.claim?.claimId && act.claim.claimId.toLowerCase().includes(searchLower)) ||
                    (act.PayerID && String(act.PayerID).toLowerCase().includes(searchLower)) ||
                    (act.IDPayer && String(act.IDPayer).toLowerCase().includes(searchLower)) ||
                    (act.IDpayer && String(act.IDpayer).toLowerCase().includes(searchLower)) ||
                    (act.senderid && String(act.senderid).toLowerCase().includes(searchLower)) ||
                    (act.sendername && String(act.sendername).toLowerCase().includes(searchLower)) ||
                    (act.insurancePayerId && String(act.insurancePayerId).toLowerCase().includes(searchLower)) ||
                    (act.claim?.insurancePayerId && String(act.claim.insurancePayerId).toLowerCase().includes(searchLower))
                )) {
                    return false;
                }
            }

            return true;
        });

        return result;
    }, [activities, searchTerm, appliedFilters]);

    const toggleBranch = useCallback((branchId) => {
        setDraftFilters(prev => ({
            ...prev,
            facilityIds: prev.facilityIds?.includes(branchId)
                ? (prev.facilityIds || []).filter(id => id !== branchId)
                : [...(prev.facilityIds || []), branchId]
        }));
    }, []);
    const selectAllBranches = useCallback(() => {
        setDraftFilters(prev => ({ ...prev, facilityIds: [] }));
    }, []);

    const resetFilters = useCallback(() => {
        const cleared = cloneActivityFilters(defaultActivityFilters);
        setDraftFilters(cleared);
        setAppliedFilters(cleared);
        setSearchTerm('');
        setHasAppliedFilters(false);
        setActivities([]);
        setActivityApiTotals(null);
        setCurrentPage(1);
    }, []);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(val || 0);
    };

    const formatDate = (dateString, { includeTime = true } = {}) => {
        if (!dateString) return '-';
        if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/.test(dateString)) {
            return includeTime ? dateString : dateString.split(' ')[0];
        }
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        const pad = (n) => n.toString().padStart(2, '0');
        const base = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        if (!includeTime) return base;
        return `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    /** Parse API-style `dd/MM/yyyy` (optional time) for month/year derivations — `Date('dd/MM/yyyy')` is unreliable in browsers. */
    const parseDisplayDate = (dateString) => {
        if (!dateString || dateString === '-') return null;
        if (typeof dateString === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateString.trim())) {
            const datePart = dateString.trim().split(/\s+/)[0];
            const [d, m, y] = datePart.split('/').map((x) => parseInt(x, 10));
            if (y && m && d) return new Date(y, m - 1, d);
        }
        const parsed = new Date(dateString);
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    const resolveTimelineClaimId = useCallback((row) => {
        const candidates = [
            row?.claim?.claimId,
            row?.claimId,
            row?.invoiceNo,
            row?.InvoiceNo,
        ];
        for (const item of candidates) {
            if (item == null) continue;
            const value = String(item).trim();
            if (value && value !== '-') return value;
        }
        return '';
    }, []);

    const openTimelineModal = useCallback((row) => {
        const claimId = resolveTimelineClaimId(row);
        if (!claimId) {
            alert('Claim ID not available for this activity.');
            return;
        }
        persistActivityListStateRef.current();
        startTransition(() => {
            navigate(portalPath(`/crs/activities/timeline/${encodeURIComponent(claimId)}`));
        });
    }, [navigate, portalPath, resolveTimelineClaimId]);

    // Columns off by default: same defs drive table + CSV/XLSX (`activeColumns`). Empty `visibleColumns` used to mean
    // "show everything", so Excel had ~70 headers (often mostly "-"/0) while the viewport only showed the left slice.
    // Excel also truncates header text in narrow columns (e.g. RemittedAmt → "RemittedA").
    const ACTIVITY_COLUMNS_HIDDEN_BY_DEFAULT = new Set([]);

    // Helper: return first non-empty value from paths, else "-"
    const val = (row, ...paths) => {
        for (const p of paths) {
            let v;
            if (typeof p === 'function') v = p(row);
            else if (typeof p === 'string' && (p.includes('.') || p.includes('?'))) {
                const keys = p.replace(/\?\./g, '.').split('.');
                v = keys.reduce((o, k) => (o != null ? o[k] : undefined), row);
            } else v = row?.[p];
            if (v !== undefined && v !== null && String(v).trim() !== '') return v;
        }
        return '-';
    };

    const cellPlain = (row, colId) => {
        const v = row?.[colId];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
        return '-';
    };

    // Column Configuration - Full schema with fallback to "-"
    const columns = useMemo(() => [
        { id: 'facilityGroupId', label: 'Facility group ID', minWidth: '120px', render: (row) => val(row, 'facilityGroupId', 'FacilityGroupId', 'claim?.facilityGroupId', 'claim?.FacilityGroupId', 'claim?.facility_group_id') },
        { id: 'healthAuthority', label: 'Health authority', minWidth: '120px', render: (row) => val(row, 'healthAuthority', 'HealthAuthority', 'claim?.healthAuthority', 'claim?.HealthAuthority', 'claim?.health_authority') },
        { id: 'facilityId', label: 'Facility ID', minWidth: '120px', render: (row) => val(row, 'facilityId', 'FacilityID', 'claim?.facilityId', 'claim?.providerId', 'providerId') },
        { id: 'facilityName', label: 'Facility name', minWidth: '150px', render: (row) => val(row, 'facilityName', 'Facility_Name', 'facility_name') },
        { id: 'invoiceNo', label: 'Invoice no.', minWidth: '120px', render: (row) => val(row, 'invoiceNo', 'InvoiceNo') },
        { id: 'patientId', label: 'Patient ID', minWidth: '120px', render: (row) => val(row, 'patientId', 'PatientID', 'PatientId') },
        { id: 'transactionDate', label: 'Transaction date', minWidth: '140px', render: (row) => formatDate(val(row, 'transactionDate', 'TransactionDate')) },
        { id: 'activityStartDate', label: 'Activity start date', minWidth: '152px', render: (row) => formatDate(val(row, 'activityStartDate', 'ActivityStartDate')) },
        { id: 'encounterType', label: 'Encounter type', minWidth: '120px', render: (row) => val(row, 'encounterType', 'EncounterType') },
        { id: 'encounterStartDate', label: 'Encounter start date', minWidth: '158px', render: (row) => formatDate(val(row, 'encounterStartDate', 'EncounterStartDate'), { includeTime: false }) },
        { id: 'encounterEndDate', label: 'Encounter end date', minWidth: '150px', render: (row) => formatDate(val(row, 'encounterEndDate', 'EncounterEndDate')) },
        { id: 'claimActivityNumber', label: 'Claim activity no.', minWidth: '150px', render: (row) => val(row, 'claimActivityNumber', 'ClaimActivityNumber') },
        { id: 'cptCode', label: 'CPT code', minWidth: '100px', render: (row) => <span className="code-badge">{val(row, 'cptCode', 'CPTCode')}</span> },
        { id: 'cptCategory', label: 'CPT category', minWidth: '110px', render: (row) => val(row, 'cptCategory', 'CPTCategory') },
        { id: 'cptType', label: 'CPT type', minWidth: '100px', render: (row) => val(row, 'cptType', 'CPTType') },
        { id: 'quantity', label: 'Quantity', minWidth: '80px', render: (row) => val(row, 'quantity', 'Quantity') },
        { id: 'orderingClinician', label: 'Ordering clinician', minWidth: '130px', render: (row) => val(row, 'orderingClinician', 'OrderingClinician') },
        { id: 'orderingClinicianName', label: 'Ordering clinician name', minWidth: '168px', render: (row) => val(row, 'orderingClinicianName', 'OrderingClinician_Name', 'ordering_clinician_name') },
        { id: 'clinicianId', label: 'Clinician', minWidth: '120px', render: (row) => val(row, 'clinician', 'Clinician', 'clinicianId') },
        { id: 'clinicianName', label: 'Clinician name', minWidth: '150px', render: (row) => val(row, 'clinicianName', 'Clinician_Name', 'clinician_name') },
        { id: 'receiverId', label: 'Receiver ID', minWidth: '120px', render: (row) => val(row, 'receiverId', 'ReceiverID') },
        { id: 'receiverName', label: 'Receiver name', minWidth: '150px', render: (row) => val(row, 'receiverName', 'Receiver_Name', 'receiver_name') },
        { id: 'payerId', label: 'Payer ID', minWidth: '120px', render: (row) => val(row, 'payerId', 'PayerID') },
        { id: 'payerName', label: 'Payer name', minWidth: '150px', render: (row) => val(row, 'payer', 'payerName', 'Payer_Name', 'payer_name') },
        { id: 'memberId', label: 'Member ID', minWidth: '120px', render: (row) => val(row, 'memberId', 'MemberID', 'MemberId') },
        { id: 'emiratesIdNumber', label: 'Emirates ID', minWidth: '130px', render: (row) => val(row, 'emiratesIdNumber', 'EmiratesIDNumber', 'EmiratesIdNumber') },
        { id: 'idPayer', label: 'ID payer', minWidth: '100px', render: (row) => val(row, 'idPayer', 'IDPayer', 'IDpayer') },
        { id: 'paymentReference', label: 'Payment reference', minWidth: '150px', render: (row) => <span className="font-mono text-xs">{val(row, 'paymentReference', 'PaymentReference')}</span> },
        { id: 'priorAuthorizationId', label: 'Prior authorization ID', minWidth: '168px', render: (row) => val(row, 'priorAuthorizationId', 'PriorAuthorizationID', 'PriorAuthorizationId') },
        { id: 'netAmt', label: 'Net amount', minWidth: '110px', align: 'right', className: 'font-bold text-primary', render: (row) => {
            const n = val(row, 'netAmt', 'NetAmt', 'netAmount');
            return n === '-' ? '-' : formatCurrency(parseFloat(n));
        }},
        { id: 'initialNetAmt', label: 'Initial net amount', minWidth: '148px', align: 'right', render: (row) => {
            const n = val(row, 'initialNetAmt', 'InitialNetAmt');
            return n === '-' ? '-' : formatCurrency(parseFloat(n));
        }},
        { id: 'diagnosis', label: 'Diagnosis', minWidth: '120px', render: (row) => val(row, 'diagnosis', 'Diagnosis') },
        { id: 'primaryDiagnosis', label: 'Primary diagnosis', minWidth: '140px', render: (row) => val(row, 'primaryDiagnosis', 'PrimaryDiagnosis') },
        { id: 'lastResubmissionDate', label: 'Last resubmission date', minWidth: '168px', render: (row) => formatDate(val(row, 'lastResubmissionDate', 'LastResubmissionDate')) },
        { id: 'firstRemittanceDate', label: 'First remittance date', minWidth: '168px', render: (row) => formatDate(val(row, 'firstRemittanceDate', 'FirstRemittanceDate')) },
        { id: 'remittedAmt', label: 'Remitted amount', minWidth: '128px', align: 'right', render: (row) => {
            const n = val(row, 'remittedAmt', 'RemittedAmt', 'paymentAmount');
            return n === '-' ? '-' : formatCurrency(parseFloat(n));
        }},
        { id: 'lastRemittanceDate', label: 'Last remittance date', minWidth: '160px', render: (row) => formatDate(val(row, 'lastRemittanceDate', 'LastRemittanceDate')) },
        { id: 'lastRemittedAmount', label: 'Last remitted amount', minWidth: '160px', align: 'right', render: (row) => {
            const n = val(row, 'lastRemittedAmount', 'LastRemittedAmount');
            return n === '-' ? '-' : formatCurrency(parseFloat(n));
        }},
        { id: 'initialRejectedAmt', label: 'InitialRejectedAmt', minWidth: '140px', align: 'right', render: (row) => {
            const n = val(row, 'initialRejectedAmt', 'InitialRejectedAmt');
            return n === '-' ? '-' : formatCurrency(parseFloat(n));
        }},
        { id: 'rejectedAmt', label: 'RejectedAmt', minWidth: '120px', align: 'right', render: (row) => {
            const n = val(row, 'rejectedAmt', 'RejectedAmt');
            return n === '-' ? '-' : formatCurrency(parseFloat(n));
        }},
        { id: 'rejectionPercentage', label: 'Rejection %', minWidth: '120px', align: 'right', render: (row) => val(row, 'rejectionPercentage', 'RejectionPercentage') },
        { id: 'unprocessedAmt', label: 'Unprocessed amount', minWidth: '158px', align: 'right', render: (row) => {
            const n = val(row, 'unprocessedAmt', 'UnprocessedAmt');
            return n === '-' ? '-' : formatCurrency(parseFloat(n));
        }},
        { id: 'writeOffAmt', label: 'Write-off amount', minWidth: '138px', align: 'right', render: (row) => {
            const n = val(row, 'writeOffAmt', 'WriteOffAmt');
            return n === '-' ? '-' : formatCurrency(parseFloat(n));
        }},
        { id: 'writeOffStatus', label: 'Write-off status', minWidth: '128px', render: (row) => val(row, 'writeOffStatus', 'WriteOffStatus') },
        { id: 'writeOffComment', label: 'Write-off comment', minWidth: '148px', render: (row) => val(row, 'writeOffComment', 'WriteOffComment') },
        { id: 'lastDenialCode', label: 'Last denial code', minWidth: '132px', render: (row) => val(row, 'lastDenialCode', 'LastDenailCode') },
        { id: 'denialComment', label: 'Denial comment', minWidth: '130px', render: (row) => val(row, 'denialComment', 'DenialComment') },
        { id: 'denialCategory', label: 'Denial category', minWidth: '130px', render: (row) => val(row, 'denialCategory', 'DenialCategory') },
        { id: 'denialType', label: 'Denial type', minWidth: '100px', render: (row) => val(row, 'denialType', 'DenialType') },
        { id: 'initialDenialCode', label: 'Initial denial code', minWidth: '148px', render: (row) => val(row, 'initialDenialCode', 'InitialDenialCode') },
        { id: 'initialDenialComment', label: 'Initial denial comment', minWidth: '168px', render: (row) => val(row, 'initialDenialComment', 'InitialDenialComment') },
        { id: 'initialDenialCategory', label: 'Initial denial category', minWidth: '168px', render: (row) => val(row, 'initialDenialCategory', 'InitialDenialCategory') },
        { id: 'initialDenialType', label: 'Initial denial type', minWidth: '148px', render: (row) => val(row, 'initialDenialType', 'InitialDenialType') },
        { id: 'resubmissionCount', label: 'Resubmission count', minWidth: '150px', render: (row) => val(row, 'resubmissionCount', 'ResubmissionCount') },
        { id: 'remittanceCount', label: 'Remittance count', minWidth: '148px', render: (row) => val(row, 'remittanceCount', 'RemittanceCount') },
        { id: 'remittanceComment', label: 'Remittance comment', minWidth: '158px', render: (row) => val(row, 'remittanceComment', 'RemittanceComment') },
        { id: 'resubmissionComment', label: 'Resubmission comment', minWidth: '168px', render: (row) => val(row, 'resubmissionComment', 'ResubmissionComment') },
        { id: 'claimYear', label: 'Claim year', minWidth: '100px', render: (row) => val(row, 'claimYear', 'ClaimYear') },
        { id: 'claimMonth', label: 'Claim month', minWidth: '110px', render: (row) => val(row, 'claimMonth', 'ClaimMonth') },
        { id: 'allSubmissionFiles', label: 'All submission files', minWidth: '158px', render: (row) => val(row, 'allSubmissionFiles', 'AllSubmissionFiles') },
        { id: 'submissionAllTransactionIds', label: 'Submission transaction IDs', minWidth: '188px', render: (row) => val(row, 'submissionAllTransactionIds', 'SubmissionAllTransactionIds') },
        { id: 'lastSubmissionFile', label: 'Last submission file', minWidth: '160px', render: (row) => val(row, 'lastSubmissionFile', 'LastSubmissionFile') },
        { id: 'lastSubmissionTransactionId', label: 'Last submission transaction ID', minWidth: '220px', render: (row) => val(row, 'lastSubmissionTransactionId', 'LastSubmissionTransactionId') },
        { id: 'lastRemittanceFile', label: 'Last remittance file', minWidth: '158px', render: (row) => val(row, 'lastRemittanceFile', 'LastRemittanceFile') },
        { id: 'lastRemittanceTransactionId', label: 'Last remittance transaction ID', minWidth: '218px', render: (row) => val(row, 'lastRemittanceTransactionId', 'LastRemittanceTransactionId') },
        { id: 'settledAmt', label: 'Settled amount', minWidth: '128px', align: 'right', render: (row) => {
            const n = val(row, 'settledAmt', 'SettledAmt');
            return n === '-' ? '-' : formatCurrency(parseFloat(n));
        }},
        { id: 'receiptStatus', label: 'Receipt status', minWidth: '128px', render: (row) => val(row, 'receiptStatus', 'ReceiptStatus') },
        { id: 'initialDateSettlement', label: 'Initial settlement date', minWidth: '168px', render: (row) => formatDate(val(row, 'initialDateSettlement', 'InitialDateSettlement')) },
        { id: 'claimStatus', label: 'Claim status', minWidth: '120px', render: (row) => val(row, 'claimStatus', 'ClaimStatus') },
        { id: 'paymentStatus', label: 'Payment status', minWidth: '128px', render: (row) => val(row, 'paymentStatus', 'PaymentStatus') },
        { id: 'month', label: 'Month', minWidth: '100px', render: (row) => {
            return val(row, 'month', 'Month');
        }},
        { id: 'type', label: 'Type', minWidth: '100px', render: (row) => val(row, 'type', 'Type') },
    ], []);

    /** null = use ACTIVITY_COLUMNS_HIDDEN_BY_DEFAULT; object = explicit on/off per id */
    const [visibleColumns, setVisibleColumns] = useState(() =>
        cachedActivityState?.visibleColumns === null || typeof cachedActivityState?.visibleColumns === 'object'
            ? cachedActivityState.visibleColumns
            : null
    );
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    // When remounting from timeline (or any sibling route), keep cached rows and
    // ignore dep churn (offices load / fetch callback identity) until the user
    // explicitly re-applies filters or changes page.
    const restoreFromCacheRef = useRef(
        Boolean(cachedActivityState?.hasAppliedFilters) &&
        Array.isArray(cachedActivityState?.activities) &&
        cachedActivityState.activities.length > 0
    );

    const persistActivityListState = useCallback(() => {
        try {
            const snapshot = {
                draftFilters,
                appliedFilters,
                hasAppliedFilters,
                currentPage,
                searchTerm,
                showFilters,
                showTotals,
                visibleColumns,
                activities,
                activityApiTotals,
                serverPagination,
            };
            activityListMemoryCache[portalId] = snapshot;
        } catch (err) {
            console.warn('Failed to cache activity list state:', err);
        }
    }, [
        draftFilters,
        appliedFilters,
        hasAppliedFilters,
        currentPage,
        searchTerm,
        showFilters,
        showTotals,
        visibleColumns,
        activities,
        activityApiTotals,
        serverPagination,
        portalId,
    ]);

    useEffect(() => {
        persistActivityListStateRef.current = persistActivityListState;
    }, [persistActivityListState]);

    useEffect(() => () => {
        persistActivityListStateRef.current();
    }, []);

    const effectiveColumnVisibility = useMemo(() => {
        if (!columns.length) return {};
        if (visibleColumns != null) return visibleColumns;
        return Object.fromEntries(
            columns.map((c) => [c.id, !ACTIVITY_COLUMNS_HIDDEN_BY_DEFAULT.has(c.id)])
        );
    }, [columns, visibleColumns]);

    const toggleColumn = (colId) => {
        setVisibleColumns((prev) => {
            const base =
                prev ??
                Object.fromEntries(
                    columns.map((c) => [c.id, !ACTIVITY_COLUMNS_HIDDEN_BY_DEFAULT.has(c.id)])
                );
            const isHidden = base[colId] === false;
            return { ...base, [colId]: isHidden ? true : false };
        });
    };

    const activeColumns = useMemo(() => {
        return columns.filter((col) => effectiveColumnVisibility[col.id] !== false);
    }, [columns, effectiveColumnVisibility]);

    // Client-side fallback when API does not include a TOTAL row
    const summaryTotals = useMemo(() => {
        const totals = filteredActivities.reduce((acc, act) => {
            const r = act.remittedAmt;
            acc.paymentAmount += (r !== undefined && r !== null && String(r).trim() !== '')
                ? (parseFloat(r) || 0)
                : (parseFloat(act.paymentAmount) || 0);
            const net = act.netAmt ?? act.netAmount;
            acc.netAmount += parseFloat(net) || 0;
            return acc;
        }, {
            paymentAmount: 0,
            netAmount: 0
        });
        return totals;
    }, [filteredActivities]);

    // Pagination logic (server-side)
    const totalPages = serverPagination.totalPages || 0;
    const paginatedData = useMemo(() => filteredActivities || [], [filteredActivities]);

    // Reset to page 1 when local search changes (skip mount so cache restore survives)
    const searchTermInitRef = useRef(true);
    useEffect(() => {
        if (searchTermInitRef.current) {
            searchTermInitRef.current = false;
            return;
        }
        fetchModeRef.current = 'full';
        restoreFromCacheRef.current = false;
        setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage && !pageLoading) {
            fetchModeRef.current = 'page';
            restoreFromCacheRef.current = false;
            setCurrentPage(newPage);
        }
    };

    // Initial and pagination fetches
    useEffect(() => {
        if (!user) return;
        if (!hasAppliedFilters) {
            setLoading(false);
            return;
        }
        const officeId = user?.officeId || user?.office_id;
        const hasSelectedFacilities = (appliedFilters?.facilityIds?.length || 0) > 0;
        if (!officeId && !hasSelectedFacilities && uniqueFacilities.length === 0) return;
        if (restoreFromCacheRef.current) {
            // Keep showing cached rows after timeline back; do not flip loading/skeleton.
            return;
        }
        const mode = fetchModeRef.current;
        fetchModeRef.current = 'full';
        fetchActivityReportPage(currentPage, appliedFilters, { mode });
    }, [user, user?.officeId, user?.office_id, user?.permission, uniqueFacilities.length, currentPage, appliedFilters, fetchActivityReportPage, hasAppliedFilters]);

    const exportToCSV = async () => {
        if (isExporting) return;
        try {
            setExportingFormat('csv');
            const { officeIds, query } = buildActivityReportQuery(appliedFilters, { includePagination: false });
            if (officeIds.length === 0) {
                alert('No office selected for export');
                return;
            }
            await apiDownload(`/api/activity-report/export/csv?${query.toString()}`, {
                fallbackFileName: `activities_${new Date().toISOString().split('T')[0]}.csv`,
            });
        } catch (err) {
            console.error('Activity CSV export failed:', err);
            alert('Failed to export CSV');
        } finally {
            setExportingFormat('');
        }
    };

    const exportToExcel = async () => {
        if (isExporting) return;
        try {
            setExportingFormat('excel');
            const { officeIds, query } = buildActivityReportQuery(appliedFilters, { includePagination: false });
            if (officeIds.length === 0) {
                alert('No office selected for export');
                return;
            }
            await apiDownload(`/api/activity-report/export/excel?${query.toString()}`, {
                fallbackFileName: `activities_${new Date().toISOString().split('T')[0]}.xlsx`,
            });
        } catch (err) {
            console.error('Activity Excel export failed:', err);
            alert('Failed to export Excel');
        } finally {
            setExportingFormat('');
        }
    };

    return (
        <div className="crs-dashboard-container">
            {/* Main Content Area */}
            <div className="dashboard-content">
                {/* Filter toolbar */}
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
                            {activeFilterCount > 0 && (
                                <span className="filter-count-badge">{activeFilterCount}</span>
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
                                    <button
                                        type="button"
                                        className="column-reset-defaults"
                                        onClick={() => { setVisibleColumns(null); setShowColumnMenu(false); }}
                                    >
                                        Reset to default columns
                                    </button>
                                    {columns.map(col => (
                                        <label key={col.id} className="column-item">
                                            <input
                                                type="checkbox"
                                                checked={effectiveColumnVisibility[col.id] !== false}
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
                            className="stats-pill activities-toolbar-count"
                            aria-live="polite"
                            title={loading ? '' : (filteredActivities.length === activities.length ? 'Rows on this page / total rows' : 'Filtered rows on this page / total rows')}
                        >
                            <span className="label">Entries</span>
                            <span className="value">
                                {loading ? '—' : (
                                    filteredActivities.length === activities.length
                                        ? `${activities.length.toLocaleString()} / ${(serverPagination.totalElements || activities.length).toLocaleString()}`
                                        : `${filteredActivities.length.toLocaleString()} / ${(serverPagination.totalElements || activities.length).toLocaleString()}`
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="filter-group-right">
                        <LastSyncIndicator loading={loading} className="toolbar-last-sync" />
                    </div>
                </div>

                {/* Dynamic Content */}
                <div className="content-viewport">
                    {/* Professional Filter Dropdown Panel (Replaced with new Grid System) */}
                    {showFilters && (
                        <div className="filter-panel-container">
                            <div className="filter-form-grid">
                        {/* Row 1: Branch (multi-select) - only for "All" permission */}
                        {showBranchFilter && (
                        <div className="form-group col-span-12 activities-branch-wrap" ref={branchDropdownRef}>
                            <label>Branch ({uniqueFacilities.length} options)</label>
                            <div className="activities-branch-multiselect">
                                <button
                                    type="button"
                                    className="activities-branch-trigger"
                                    onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                                    aria-expanded={showBranchDropdown}
                                >
                                    <span className="activities-branch-trigger-text">
                                        {!draftFilters.facilityIds?.length
                                            ? 'All Branches'
                                            : draftFilters.facilityIds
                                                .map((oid) => {
                                                    const office = uniqueFacilities.find((o) => o.officeId === String(oid));
                                                    if (!office) return String(oid);
                                                    return `${office.facilityId || '-'} - ${office.officeName || 'Unknown Office'}`;
                                                })
                                                .join(', ')}
                                    </span>
                                    <span className="activities-branch-chevron">▾</span>
                                </button>
                                {showBranchDropdown && (
                                    <div className="activities-branch-dropdown">
                                        <div className="activities-branch-dropdown-header">
                                            <span className="activities-branch-dropdown-title">Branch</span>
                                            <button type="button" className="activities-branch-clear-btn" onClick={selectAllBranches}>Clear</button>
                                        </div>
                                        <label className="activities-branch-option activities-branch-all">
                                            <input type="checkbox" checked={!draftFilters.facilityIds?.length} onChange={selectAllBranches} />
                                            <span>All Branches</span>
                                        </label>
                                        {uniqueFacilities.map((office) => (
                                            <label key={office.officeId} className="activities-branch-option">
                                                <input
                                                    type="checkbox"
                                                    checked={draftFilters.facilityIds?.includes(office.officeId) ?? false}
                                                    onChange={() => toggleBranch(office.officeId)}
                                                />
                                                <span>{`${office.facilityId || '-'} - ${office.officeName || 'Unknown Office'}`}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        {/* Row 2: Search On & Dates */}
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
                                <option>2026</option>
                                <option>2025</option>
                                <option>2024</option>
                            </select>
                        </div>
                        <div className="form-group col-span-2">
                            <label>Month</label>
                            <select className="form-select" value={draftFilters.month} onChange={(e) => handleFilterChange('month', e.target.value)}>
                                <option value="">Select</option>
                                <option>January</option>
                                <option>February</option>
                                <option>March</option>
                                <option>April</option>
                                <option>May</option>
                                <option>June</option>
                                <option>July</option>
                                <option>August</option>
                                <option>September</option>
                                <option>October</option>
                                <option>November</option>
                                <option>December</option>
                            </select>
                        </div>
                        <div className="form-group col-span-2">
                            <label>From Date</label>
                            <div className="input-group">
                                <input
                                    type="date"
                                    value={draftFilters.fromDate}
                                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>
                        <div className="form-group col-span-2">
                            <label>To Date</label>
                            <div className="input-group">
                                <input
                                    type="date"
                                    value={draftFilters.toDate}
                                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        {/* Row 3: Receiver/Payer/Encounter */}
                        <div className="form-group col-span-3">
                            <label>Receiver ID ({uniqueReceivers.length} options)</label>
                            <select
                                className="form-select enhanced-dropdown"
                                value={draftFilters.receiverId}
                                onChange={(e) => handleFilterChange('receiverId', e.target.value)}
                                style={{
                                    padding: '10px 12px',
                                    fontSize: '14px',
                                    border: '2px solid #cbd5e1',
                                    borderRadius: '6px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    minHeight: '42px'
                                }}
                            >
                                <option value="">All Receivers</option>
                                {uniqueReceivers.map(r => (
                                    <option key={r} value={r} style={{ padding: '8px' }}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group col-span-3">
                            <label>Payer ID ({uniquePayers.length} options)</label>
                            <select
                                className="form-select enhanced-dropdown"
                                value={draftFilters.payerId}
                                onChange={(e) => handleFilterChange('payerId', e.target.value)}
                                style={{
                                    padding: '10px 12px',
                                    fontSize: '14px',
                                    border: '2px solid #cbd5e1',
                                    borderRadius: '6px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    minHeight: '42px'
                                }}
                            >
                                <option value="">All Payers</option>
                                {uniquePayers.map(p => (
                                    <option key={p} value={p} style={{ padding: '8px' }}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group col-span-3">
                            <label>Payer</label>
                            <select className="form-select" value={draftFilters.payer} onChange={(e) => handleFilterChange('payer', e.target.value)}>
                                <option value="">Select payer</option>
                                <option value="Insurance">Insurance</option>
                            </select>
                        </div>
                        <div className="form-group col-span-3">
                            <label>Encounter</label>
                            <select className="form-select" value={draftFilters.encounter} onChange={(e) => handleFilterChange('encounter', e.target.value)}>
                                <option>OP & IP</option>
                                <option>Out Patient</option>
                                <option>In Patient</option>
                            </select>
                        </div>

                        {/* Row 4: Clinician/Claim/Denial/CPT */}
                        <div className="form-group col-span-3">
                            <label>Clinician</label>
                            <input
                                type="text"
                                value={draftFilters.clinician}
                                onChange={(e) => handleFilterChange('clinician', e.target.value)}
                                className="form-input"
                                placeholder="Type to search..."
                            />
                        </div>
                        <div className="form-group col-span-3">
                            <label>Claim No.</label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    value={draftFilters.claimNo}
                                    onChange={(e) => handleFilterChange('claimNo', e.target.value)}
                                    className="form-input"
                                    placeholder="Type to search..."
                                />
                            </div>
                        </div>
                        <div className="form-group col-span-3">
                            <label>Denial</label>
                            <input
                                type="text"
                                value={draftFilters.denial}
                                onChange={(e) => handleFilterChange('denial', e.target.value)}
                                className="form-input"
                                placeholder="Type to search..."
                            />
                        </div>
                        <div className="form-group col-span-3">
                            <label>CPT</label>
                            <input
                                type="text"
                                value={draftFilters.cpt}
                                onChange={(e) => handleFilterChange('cpt', e.target.value)}
                                className="form-input"
                                placeholder="Type to search..."
                            />
                        </div>
                            </div>
                            {/* Footer inside grid or at bottom */}
                            <div className="filter-panel-footer">
                                <div className="filter-panel-footer-actions">
                                    <button
                                        type="button"
                                        className="btn-apply-filters"
                                        onClick={applyDraftFilters}
                                        disabled={!canApplyFilters}
                                        title={canApplyFilters ? 'Apply filter panel to the table' : 'No filter changes to apply'}
                                    >
                                        Apply filters
                                    </button>
                                    <button type="button" className="clear-all-btn" onClick={resetFilters}>Clear All</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Table Section */}
                    <div className="content-card">
                <>
                    <div className={`table-responsive${pageLoading ? ' is-page-loading' : ''}`}>
                        {pageLoading && <div className="table-page-loading-bar" aria-hidden="true" />}
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th className="timeline-action-header" style={{ minWidth: '52px' }} aria-label="Timeline action"></th>
                                    {activeColumns.map(col => (
                                        <th
                                            key={col.id}
                                            style={{ minWidth: col.minWidth }}
                                            className={col.align === 'right' ? 'text-right' : ''}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                        [...Array(10)].map((_, rowIndex) => (
                                            <tr key={`skeleton-${rowIndex}`}>
                                                <td><div className="skeleton-line width-40"></div></td>
                                                {activeColumns.map((col, colIndex) => (
                                                    <td key={colIndex}>
                                                        <div className={`skeleton-line ${colIndex === 0 ? 'width-40' : 'width-80'}`}></div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : !activities?.length ? (
                                        <tr>
                                            <td colSpan={Math.max(activeColumns.length + 1, 1)} className="empty-state">
                                                No activities loaded. Apply filters to load data, or confirm your office has claim activity in the API.
                                            </td>
                                        </tr>
                                    ) : paginatedData.length > 0 ? (
                                        <>
                                            {paginatedData.map((act, index) => (
                                                <tr key={index}>
                                                    <td className="timeline-action-cell">
                                                        <button
                                                            type="button"
                                                            className="timeline-open-btn"
                                                            onClick={() => openTimelineModal(act)}
                                                            title="View activity timeline"
                                                            aria-label="View activity timeline"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="12" r="9" />
                                                                <path d="M12 7v5l3 3" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                    {activeColumns.map(col => (
                                                        <td
                                                            key={col.id}
                                                            className={col.align === 'right' ? `text-right ${col.className || ''}` : (col.className || '')}
                                                        >
                                                            {col.render ? col.render(act) : cellPlain(act, col.id)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            
                                        </>
                                    ) : (
                                        <tr>
                                            <td colSpan={activeColumns.length + 1} className="empty-state">No data found for filter.</td>
                                        </tr>
                                    )}
                            </tbody>
                            
                            {/* Sticky Totals Footer - Inside table */}
                            {!loading && !pageLoading && filteredActivities.length > 0 && showTotals && (
                                <tfoot className="sticky-totals-footer">
                                    <tr className="totals-row-excel">
                                        <td></td>
                                        {activeColumns.map((col, index) => {
                                            let content = '';
                                            const api = activityApiTotals;
                                            const fc = (v) => formatCurrency(v ?? 0);
                                            if (index === 0) {
                                                content = <strong style={{ color: '#6b7280', fontSize: '0.9rem' }}>TOTALS</strong>;
                                            } else if (api) {
                                                if (col.id === 'netAmt') {
                                                    content = <strong className="text-warning">{fc(api.netAmt)}</strong>;
                                                } else if (col.id === 'initialRejectedAmt') {
                                                    content = <strong>{fc(api.initialRejectedAmt)}</strong>;
                                                } else if (col.id === 'rejectedAmt') {
                                                    content = <strong className="text-error">{fc(api.rejectedAmt)}</strong>;
                                                } else if (col.id === 'rejectionPercentage') {
                                                    content = api.rejectionPercentage != null && !Number.isNaN(api.rejectionPercentage)
                                                        ? <strong>{`${Number(api.rejectionPercentage).toFixed(3)}%`}</strong>
                                                        : '';
                                                } else if (col.id === 'remittedAmt') {
                                                    content = <strong className="text-success">{fc(api.remittedAmt)}</strong>;
                                                } else if (col.id === 'lastRemittedAmount') {
                                                    content = <strong>{fc(api.lastRemittedAmount)}</strong>;
                                                } else if (col.id === 'unprocessedAmt') {
                                                    content = <strong>{fc(api.unprocessedAmt)}</strong>;
                                                } else if (col.id === 'writeOffAmt') {
                                                    content = <strong>{fc(api.writeOffAmt)}</strong>;
                                                } else if (col.id === 'settledAmt') {
                                                    content = <strong>{fc(api.settledAmt)}</strong>;
                                                }
                                            } else if (!api) {
                                                if (col.id === 'remittedAmt' || col.id === 'paymentAmount') {
                                                    content = <strong className="text-success">{formatCurrency(summaryTotals.paymentAmount)}</strong>;
                                                } else if (col.id === 'netAmt' || col.id === 'netAmount') {
                                                    content = <strong className="text-warning">{formatCurrency(summaryTotals.netAmount)}</strong>;
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
                        { !loading && filteredActivities && filteredActivities.length > 0 && totalPages > 1 && (
                            <div className={`pagination-bar${pageLoading ? ' is-page-loading' : ''}`}>
                                <span className="page-info">
                                    {pageLoading ? 'Loading page…' : (
                                        <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, serverPagination.totalElements || 0)} of {serverPagination.totalElements || 0}</>
                                    )}
                                </span>
                                <div className="pagination-controls">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1 || pageLoading}
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
                                                    disabled={pageLoading}
                                                    className={`page-num-btn ${currentPage === p ? 'active' : ''}`}
                                                >
                                                    {p}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages || pageLoading}
                                        className="btn-page"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                </div>
                </div>
            </div>
            <style>{`
                .crs-dashboard-container {
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    max-width: 1600px;
                    margin: 0 auto;
                    width: 100%;
                }

                .dashboard-content {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }

                .content-viewport {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }


                /* Filter Toggle Section */
                .filter-toggle-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .filter-group-right {
                    display: flex;
                    align-items: center;
                }

                .filter-group-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    flex: 1;
                    min-width: 0;
                }

                .activities-toolbar-count {
                    margin-left: 4px;
                }

                .btn-filter-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    color: var(--text-body);
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: var(--shadow-sm);
                }

                .btn-filter-toggle:hover {
                    background: var(--bg-hover);
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }

                .btn-filter-toggle.active {
                    background: var(--status-info-bg);
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }

                .btn-filter-toggle svg {
                    width: 18px;
                    height: 18px;
                }

                .filter-count-badge {
                    background: #ef4444;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 600;
                    margin-left: 4px;
                    animation: bounce-in 0.3s ease-out;
                }

                @keyframes bounce-in {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }

                .filtering-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #3b82f6;
                    font-size: 0.85rem;
                }

                .mini-spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid #e2e8f0;
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                .form-input::placeholder, .form-select::placeholder {
                    color: #94a3b8;
                    font-style: italic;
                }

                .form-input:focus::placeholder {
                    opacity: 0.7;
                }

                /* Sticky Totals Footer - Inside table container */
                .sticky-totals-footer {
                    position: sticky;
                    bottom: 0;
                    z-index: 9;
                    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                    border-top: 2px solid #cbd5e1;
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

                .column-reset-defaults {
                    width: 100%;
                    margin-bottom: 8px;
                    padding: 8px 10px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #2563eb;
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .column-reset-defaults:hover {
                    background: #dbeafe;
                    border-color: #93c5fd;
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

                .toolbar-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-sm);
                }

                /* Filter Panel Styles */
                .filter-panel-container {
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
                    animation: slideDown 0.3s ease-out;
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

                /* Compact Summary Panel */
                .summary-panel-compact {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 10px;
                    padding: 12px 16px;
                    margin-bottom: 16px;
                    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .summary-grid-compact {
                    display: flex;
                    gap: 12px;
                    flex: 1;
                }

                .summary-card-compact {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 8px;
                    padding: 10px 14px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    min-width: 0;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                }

                .summary-card-compact:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
                }

                .summary-card-compact.patient { border-left: 3px solid #f59e0b; }
                .summary-card-compact.payment { border-left: 3px solid #10b981; }
                .summary-card-compact.net { border-left: 3px solid #8b5cf6; }

                .summary-icon-compact {
                    font-size: 1.5rem;
                    line-height: 1;
                    flex-shrink: 0;
                }

                .summary-content-compact {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    min-width: 0;
                }

                .summary-label-compact {
                    font-size: 0.7rem;
                    color: #64748b;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    white-space: nowrap;
                }

                .summary-value-compact {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1e293b;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .summary-count-compact {
                    background: rgba(255, 255, 255, 0.25);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    white-space: nowrap;
                    backdrop-filter: blur(10px);
                }

                @media (max-width: 1200px) {
                    .summary-grid-compact {
                        flex-wrap: wrap;
                    }
                    .summary-card-compact {
                        flex: 1 1 calc(50% - 6px);
                    }
                }
                
                
                .filter-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .filter-panel-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-main);
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
                
                .filter-field {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .filter-field label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                
                .filter-input {
                    padding: 10px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    font-size: 0.9rem;
                    background-color: white;
                    color: var(--text-body);
                    transition: all 0.2s;
                }
                
                .filter-input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
                
                .filter-panel-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    border-top: 1px solid var(--border-color);
                    background: var(--bg-hover);
                }

                .filter-panel-footer-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    width: 100%;
                }

                .filter-validation-message {
                    color: #b91c1c;
                    font-size: 0.82rem;
                    font-weight: 600;
                    margin-right: auto;
                }

                .btn-apply-filters {
                    padding: 10px 18px;
                    border-radius: 8px;
                    border: none;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    background: var(--primary-color, #2563eb);
                    color: white;
                    box-shadow: var(--shadow-sm);
                }

                .btn-apply-filters:hover:not(:disabled) {
                    filter: brightness(1.05);
                }

                .btn-apply-filters:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .content-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .filter-form-grid {
                    display: grid;
                    grid-template-columns: repeat(12, 1fr);
                    gap: 16px;
                    padding: 20px;
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                
                /* Column Spans */
                .col-span-12 { grid-column: span 12; }
                .col-span-6 { grid-column: span 6; }
                .col-span-5 { grid-column: span 5; }
                .col-span-4 { grid-column: span 4; }
                .col-span-3 { grid-column: span 3; }
                .col-span-2 { grid-column: span 2; }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .form-input, .form-select {
                    padding: 0 10px;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    background: white;
                    color: var(--text-body);
                    width: 100%;
                    height: 36px; 
                    line-height: normal;
                    transition: border-color 0.2s;
                }
                
                select.form-select {
                    padding-top: 0;
                    padding-bottom: 0;
                }

                .form-input:focus, .form-select:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.05);
                }

                .form-group.activities-branch-wrap { overflow: visible; }
                .activities-branch-multiselect { position: relative; width: 100%; }
                .activities-branch-trigger {
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
                    min-height: 36px;
                }
                .activities-branch-trigger:hover { border-color: #94a3b8; }
                .activities-branch-trigger-text { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .activities-branch-chevron { color: #64748b; font-size: 0.75rem; flex-shrink: 0; }
                .activities-branch-dropdown {
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
                .activities-branch-dropdown-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 8px 10px;
                    margin-bottom: 4px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .activities-branch-dropdown-title { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
                .activities-branch-clear-btn {
                    padding: 4px 10px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: #dc2626;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .activities-branch-clear-btn:hover { background: #fee2e2; }
                .activities-branch-option {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px;
                    font-size: 0.9rem;
                    cursor: pointer;
                    border-radius: 6px;
                }
                .activities-branch-option:hover { background: #f1f5f9; }
                .activities-branch-option input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    margin: 0;
                    flex-shrink: 0;
                    appearance: none;
                    -webkit-appearance: none;
                    border: 2px solid #94a3b8;
                    border-radius: 4px;
                    background: #fff;
                }
                .activities-branch-option input[type="checkbox"]:checked {
                    background: #2563eb url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10'%3E%3Cpath fill='none' stroke='white' stroke-width='2' d='M1 5l3 3 7-7'/%3E%3C/svg%3E") center/10px 8px no-repeat;
                    border-color: #2563eb;
                }
                .activities-branch-all {
                    font-weight: 600;
                    border-bottom: 1px solid #e2e8f0;
                    margin-bottom: 6px;
                    padding-bottom: 10px;
                }
                .activities-branch-all input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    flex-shrink: 0;
                    appearance: none;
                    -webkit-appearance: none;
                    border: 2px solid #94a3b8;
                    border-radius: 4px;
                    background: #fff;
                }
                .activities-branch-all input[type="checkbox"]:checked {
                    background: #2563eb url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10'%3E%3Cpath fill='none' stroke='white' stroke-width='2' d='M1 5l3 3 7-7'/%3E%3C/svg%3E") center/10px 8px no-repeat;
                    border-color: #2563eb;
                }

                .input-group {
                    display: flex;
                    align-items: center;
                    position: relative;
                    width: 100%;
                }
                
                .form-group label {
                    font-size: 0.75rem;
                    color: #64748b; /* Explicit color */
                    font-weight: 600;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                    display: block;
                }


                .input-group .form-input {
                    padding-right: 28px;
                }
                
                .input-icon-right-static {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    font-size: 0.9rem;
                    pointer-events: none;
                }

                .input-group .icon-btn {
                    position: absolute;
                    right: 4px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    padding: 2px;
                    border-radius: 4px;
                }
                
                .input-group .icon-btn:hover {
                    color: var(--primary-color);
                }
                
                .text-success-dark { color: #166534; }
                .text-success-dark:hover { color: #15803d; }

                .flex-center-v {
                    justify-content: flex-start;
                    padding-top: 14px; /* Align with inputs */
                }
                
                .checkbox-label {
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    white-space: nowrap;
                    color: var(--text-body);
                    font-weight: 600;
                }

                .input-like-display {
                    position: relative;
                    width: 100%;
                }
                
                .input-icon-right {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    pointer-events: none;
                    color: #94a3b8;
                }
                
                /* Text Overflow for Select */
                .text-ellipsis {
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    overflow: hidden;
                    padding-right: 24px;
                }
                
                /* Responsive Grid */
                @media (max-width: 1200px) {
                    .col-span-3, .col-span-4, .col-span-5 { grid-column: span 6; }
                    .col-span-2 { grid-column: span 6; }
                }

                @media (max-width: 768px) {
                    .filter-toggle-section {
                        align-items: stretch;
                    }

                    .filter-group-left,
                    .filter-group-right {
                        width: 100%;
                    }

                    .filter-group-right {
                        justify-content: flex-start;
                    }

                    .btn-filter-toggle,
                    .btn-export {
                        min-height: 38px;
                        padding: 8px 12px;
                        font-size: 0.84rem;
                    }

                    .filter-form-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                    .col-span-12, .col-span-6, .col-span-5, .col-span-4, .col-span-3, .col-span-2 {
                        grid-column: span 1;
                    }
                    .flex-center-v { justify-content: flex-start; }
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
                        left: 0;
                        right: auto;
                        min-width: 0;
                        width: min(92vw, 360px);
                    }
                }


                
                .ml-auto { margin-left: auto; }
                
                .filter-select {
                    padding: 10px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    font-size: 0.95rem;
                    background-color: white;
                    min-width: 160px;
                    cursor: pointer;
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
                    white-space: nowrap;
                }
                .stats-pill .label {
                    color: #64748b;
                }
                .stats-pill .value {
                    color: #2563eb;
                    font-weight: 700;
                }

                /* Reuse search styles from dashboard/list */
                .search-wrapper { position: relative; max-width: 400px; }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); opacity: 0.5; }
                .search-input {
                    padding: 10px 12px 10px 36px;
                    width: 100%;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    font-size: 0.95rem;
                }

                /* Content Card */
                .content-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                    max-height: calc(100vh - 180px);
                    display: flex;
                    flex-direction: column;
                }

                /* Table scrolls inside the card; pagination sits below (flex-shrink: 0) */
                .table-responsive { 
                    overflow-x: auto;
                    overflow-y: auto;
                    width: 100%; 
                    max-width: 100%;
                    flex: 1;
                    min-height: 0;
                    position: relative;
                }
                .table-responsive.is-page-loading .modern-table tbody {
                    opacity: 0.55;
                    pointer-events: none;
                }
                .table-page-loading-bar {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    z-index: 20;
                    background: linear-gradient(90deg, transparent, #3b82f6 40%, #60a5fa 60%, transparent);
                    background-size: 200% 100%;
                    animation: table-page-loading-slide 0.9s ease-in-out infinite;
                }
                @keyframes table-page-loading-slide {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .pagination-bar.is-page-loading {
                    opacity: 0.85;
                }
                /* max-content: table only as wide as columns need — no fake 100% stretch + empty gutters */
                .modern-table { 
                    width: max-content;
                    border-collapse: separate;
                    border-spacing: 0;
                }
                .modern-table th {
                    background: #f8fafc;
                    padding: 12px 16px;
                    text-align: left;
                    font-size: 0.9rem;
                    text-transform: none;
                    color: var(--text-muted);
                    font-weight: 600;
                    letter-spacing: 0.02em;
                    line-height: 1.25;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    border-bottom: 2px solid #e2e8f0;
                    white-space: nowrap;
                    max-width: none;
                    vertical-align: bottom;
                }
                .timeline-action-header {
                    position: sticky;
                    left: 0;
                    z-index: 12;
                    background: #f8fafc;
                }
                .modern-table th.text-right {
                    white-space: nowrap;
                }
                .modern-table td {
                    padding: 14px 18px;
                    border-bottom: 1px solid var(--border-color);
                    color: var(--text-body);
                    font-size: 0.8125rem;
                    white-space: normal;
                    word-break: break-word;
                    overflow-wrap: anywhere;
                    vertical-align: top;
                    /* Widest cell in a column sets column width — cap text cols or one long WriteOffComment forces massive scroll */
                    max-width: 20rem;
                }
                .timeline-action-cell {
                    position: sticky;
                    left: 0;
                    z-index: 8;
                    background: #fff;
                    max-width: none !important;
                    padding: 10px 8px !important;
                    text-align: center;
                }
                .timeline-open-btn {
                    width: 30px;
                    height: 30px;
                    border: 1px solid #dbeafe;
                    background: #eff6ff;
                    color: #2563eb;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .timeline-open-btn:hover {
                    background: #2563eb;
                    color: #fff;
                    border-color: #2563eb;
                }
                .modern-table td.text-right {
                    white-space: nowrap;
                    max-width: none;
                }
                .modern-table td .code-badge {
                    white-space: nowrap;
                    font-size: 0.78rem;
                }
                .modern-table td .font-mono.text-xs,
                .modern-table td .text-xs {
                    font-size: 0.7rem;
                }

                /* Excel-Style Totals Row in tfoot */
                .modern-table tfoot {
                    position: sticky;
                    bottom: 0;
                    z-index: 9;
                }

                .totals-row-excel {
                    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                    border-top: 2px solid #cbd5e1;
                }

                .totals-row-excel td {
                    padding: 14px 18px;
                    color: #374151;
                    font-size: 0.875rem;
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
                .text-error { color: var(--status-error); }
                .text-success { color: var(--status-success); }
                .modern-table tr:hover td { background: var(--bg-hover); }
                .modern-table tr.totals-row-excel:hover td { background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); }
                .text-right { text-align: right; }
                .font-mono { font-family: 'SF Mono', 'Roboto Mono', monospace; }
                
                .code-badge {
                    background: var(--bg-hover);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    color: var(--text-main);
                }

                .status-pill {
                    display: inline-flex;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .status-pill.success { background: var(--status-success-bg); color: var(--status-success); }
                .status-pill.error { background: var(--status-error-bg); color: var(--status-error); }

                .loading-state { padding: 60px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--text-muted); }
                .spinner { width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s infinite linear; }
                @keyframes spin { to { transform: rotate(360deg); } }

                .error-state { padding: 40px; text-align: center; color: var(--status-error); }
                .error-icon { font-size: 2rem; display: block; margin-bottom: 12px; }
                .empty-state { text-align: center; padding: 40px; color: var(--text-muted); font-style: italic; }
                
                .mt-3 { margin-top: 16px; }

                .date-range-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .filter-label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }

                .filter-input {
                    padding: 8px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    font-size: 0.9rem;
                    color: var(--text-body);
                }

                .btn-reset {
                    padding: 8px 16px;
                    background: transparent;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-left: auto;
                }

                .btn-reset:hover {
                    border-color: var(--text-muted);
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

                /* Utility Classes */
                .text-xs { font-size: 0.75rem; }
                .flex-col { display: flex; flex-direction: column; }

                /* Pagination Styles */
                .pagination-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    background: white;
                    flex-shrink: 0;
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
                    color: #334155;
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

                .timeline-modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 3100;
                    background: rgba(2, 6, 23, 0.45);
                    backdrop-filter: blur(2px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                }
                .timeline-modal {
                    width: min(1260px, 98vw);
                    max-height: 92vh;
                    overflow: hidden;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    background: #fff;
                    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.28);
                    display: flex;
                    flex-direction: column;
                }
                .timeline-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 18px 22px;
                    border-bottom: 1px solid #e2e8f0;
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                }
                .timeline-modal-title {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #0f172a;
                }
                .timeline-modal-subtitle {
                    margin: 4px 0 0;
                    font-size: 0.85rem;
                    color: #64748b;
                }
                .timeline-modal-close {
                    width: 34px;
                    height: 34px;
                    border: 1px solid #e2e8f0;
                    background: #fff;
                    border-radius: 8px;
                    color: #475569;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .timeline-modal-close:hover {
                    background: #fee2e2;
                    color: #dc2626;
                    border-color: #fecaca;
                }
                .timeline-modal-loading,
                .timeline-modal-error {
                    padding: 40px 24px;
                    text-align: center;
                    color: #475569;
                }
                .timeline-modal-error { color: #b91c1c; }
                .timeline-modal-content {
                    overflow: auto;
                    padding: 18px 22px 22px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    background: #f8fafc;
                }
                .timeline-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 12px;
                }
                .timeline-meta-item {
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    background: #fff;
                    padding: 10px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .timeline-meta-item label {
                    font-size: 0.72rem;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: #64748b;
                    font-weight: 600;
                }
                .timeline-meta-item span {
                    color: #0f172a;
                    font-size: 0.88rem;
                    font-weight: 600;
                }
                .timeline-amount-cards {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 12px;
                }
                .timeline-amount-card {
                    border: 1px solid #dbeafe;
                    border-radius: 10px;
                    background: #eff6ff;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .timeline-amount-card label {
                    font-size: 0.75rem;
                    color: #1d4ed8;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                }
                .timeline-amount-card strong {
                    font-size: 1.05rem;
                    color: #0f172a;
                }
                .timeline-table-wrap {
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    background: #fff;
                    overflow: auto;
                }
                .timeline-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 1100px;
                    font-size: 0.82rem;
                }
                .timeline-table th {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    background: #f8fafc;
                    color: #475569;
                    font-weight: 700;
                    padding: 10px 12px;
                    border-bottom: 1px solid #e2e8f0;
                    text-align: left;
                    white-space: nowrap;
                }
                .timeline-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #1e293b;
                    vertical-align: top;
                }
                .timeline-table tr:hover td {
                    background: #f8fafc;
                }
                .timeline-empty {
                    text-align: center;
                    color: #64748b;
                    padding: 28px !important;
                }

                @media (max-width: 980px) {
                    .timeline-meta-grid,
                    .timeline-amount-cards {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
            `}</style>
        </div>
    );
};

export default React.memo(ActivityList);
