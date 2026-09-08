
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import '../crs-report.css';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/.test(dateString)) return dateString;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getMonthIndex = (monthName) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames.indexOf(monthName);
};

const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    if (dateStr.length >= 10 && dateStr.includes('/')) {
        const parts = dateStr.split(' ');
        const [d, m, y] = parts[0].split('/').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
};

const defaultFilters = {
    facility: '',
    searchOn: 'Activity Start',
    year: '',
    month: '',
    fromDate: '',
    toDate: '',
    receiverId: '',
    payerId: '',
    payer: 'Insurance',
    clinician: '',
    encounter: 'OP & IP',
    claimNo: '',
    denial: '',
    cpt: ''
};

const CLAIM_DETAILS_ORDER = [
    { id: 'facilityGroupId', label: 'Facility group ID', aliases: ['facilityGroupId'] },
    { id: 'healthAuthority', label: 'Health authority', aliases: ['healthAuthority'] },
    { id: 'facilityId', label: 'Facility ID', aliases: ['facilityId'] },
    { id: 'facilityName', label: 'Facility name', aliases: ['facilityName'] },
    { id: 'invoiceNo', label: 'Invoice no.', aliases: ['invoiceNo', 'invoiceNumber'] },
    { id: 'patientId', label: 'Patient ID', aliases: ['patientId'] },
    { id: 'transactionDate', label: 'Transaction date', aliases: ['transactionDate'] },
    { id: 'activityStartDate', label: 'Activity start date', aliases: ['activityStartDate', 'activityStart'] },
    { id: 'encounterType', label: 'Encounter type', aliases: ['encounterType'] },
    { id: 'encounterStartDate', label: 'Encounter start date', aliases: ['encounterStartDate', 'encounterStart'] },
    { id: 'encounterEndDate', label: 'Encounter end date', aliases: ['encounterEndDate', 'encounterEnd'] },
    { id: 'claimActivityNumber', label: 'Claim activity no.', aliases: ['claimActivityNumber', 'activityId'] },
    { id: 'cptCode', label: 'CPT code', aliases: ['cptCode', 'activityCode'] },
    { id: 'cptCategory', label: 'CPT category', aliases: ['cptCategory'] },
    { id: 'cptType', label: 'CPT type', aliases: ['cptType'] },
    { id: 'quantity', label: 'Quantity', aliases: ['quantity'] },
    { id: 'orderingClinician', label: 'Ordering clinician', aliases: ['orderingClinician'] },
    { id: 'orderingClinicianName', label: 'Ordering clinician name', aliases: ['orderingClinicianName'] },
    { id: 'clinician', label: 'Clinician', aliases: ['clinician', 'clinicianId'] },
    { id: 'clinicianName', label: 'Clinician name', aliases: ['clinicianName', 'clinician_name'] },
    { id: 'receiverId', label: 'Receiver ID', aliases: ['receiverId'] },
    { id: 'receiverName', label: 'Receiver name', aliases: ['receiverName'] },
    { id: 'payerId', label: 'Payer ID', aliases: ['payerId'] },
    { id: 'payerName', label: 'Payer name', aliases: ['payerName'] },
    { id: 'memberId', label: 'Member ID', aliases: ['memberId'] },
    { id: 'emiratesIdNumber', label: 'Emirates ID', aliases: ['emiratesIdNumber'] },
    { id: 'idPayer', label: 'ID payer', aliases: ['idPayer'] },
    { id: 'paymentReference', label: 'Payment reference', aliases: ['paymentReference'] },
    { id: 'priorAuthorizationId', label: 'Prior authorization ID', aliases: ['priorAuthorizationId'] },
    { id: 'netAmt', label: 'Net amount', aliases: ['netAmt', 'netAmount', 'net'] },
    { id: 'initialNetAmt', label: 'Initial net amount', aliases: ['initialNetAmt'] },
    { id: 'diagnosis', label: 'Diagnosis', aliases: ['diagnosis'] },
    { id: 'primaryDiagnosis', label: 'Primary diagnosis', aliases: ['primaryDiagnosis'] },
    { id: 'lastResubmissionDate', label: 'Last resubmission date', aliases: ['lastResubmissionDate'] },
    { id: 'firstRemittanceDate', label: 'First remittance date', aliases: ['firstRemittanceDate'] },
    { id: 'lastRemittanceDate', label: 'Last remittance date', aliases: ['lastRemittanceDate'] },
    { id: 'initialRejectedAmt', label: 'InitialRejectedAmt', aliases: ['initialRejectedAmt'] },
    { id: 'rejectedAmt', label: 'RejectedAmt', aliases: ['rejectedAmt'] },
    { id: 'rejectionPercentage', label: 'Rejection %', aliases: ['rejectionPercentage'] },
    { id: 'unprocessedAmt', label: 'Unprocessed amount', aliases: ['unprocessedAmt'] },
    { id: 'writeOffAmt', label: 'Write-off amount', aliases: ['writeOffAmt'] },
    { id: 'writeOffStatus', label: 'Write-off status', aliases: ['writeOffStatus'] },
    { id: 'writeOffComment', label: 'Write-off comment', aliases: ['writeOffComment'] },
    { id: 'lastDenialCode', label: 'Last denial code', aliases: ['lastDenialCode'] },
    { id: 'denialComment', label: 'Denial comment', aliases: ['denialComment'] },
    { id: 'denialCategory', label: 'Denial category', aliases: ['denialCategory'] },
    { id: 'denialType', label: 'Denial type', aliases: ['denialType'] },
    { id: 'initialDenialCode', label: 'Initial denial code', aliases: ['initialDenialCode'] },
    { id: 'initialDenialComment', label: 'Initial denial comment', aliases: ['initialDenialComment'] },
    { id: 'initialDenialCategory', label: 'Initial denial category', aliases: ['initialDenialCategory'] },
    { id: 'initialDenialType', label: 'Initial denial type', aliases: ['initialDenialType'] },
    { id: 'resubmissionCount', label: 'Resubmission count', aliases: ['resubmissionCount'] },
    { id: 'remittanceCount', label: 'Remittance count', aliases: ['remittanceCount'] },
    { id: 'remittanceComment', label: 'Remittance comment', aliases: ['remittanceComment'] },
    { id: 'resubmissionComment', label: 'Resubmission comment', aliases: ['resubmissionComment'] },
    { id: 'claimYear', label: 'Claim year', aliases: ['claimYear'] },
    { id: 'claimMonth', label: 'Claim month', aliases: ['claimMonth'] },
    { id: 'allSubmissionFiles', label: 'All submission files', aliases: ['allSubmissionFiles'] },
    { id: 'submissionAllTransactionIds', label: 'Submission transaction IDs', aliases: ['submissionAllTransactionIds'] },
    { id: 'lastSubmissionFile', label: 'Last submission file', aliases: ['lastSubmissionFile'] },
    { id: 'lastSubmissionTransactionId', label: 'Last submission transaction ID', aliases: ['lastSubmissionTransactionId'] },
    { id: 'lastRemittanceFile', label: 'Last remittance file', aliases: ['lastRemittanceFile'] },
    { id: 'lastRemittanceTransactionId', label: 'Last remittance transaction ID', aliases: ['lastRemittanceTransactionId'] },
    { id: 'settledAmt', label: 'Settled amount', aliases: ['settledAmt'] },
    { id: 'receiptStatus', label: 'Receipt status', aliases: ['receiptStatus'] },
    { id: 'initialDateSettlement', label: 'Initial settlement date', aliases: ['initialDateSettlement'] },
    { id: 'claimStatus', label: 'Claim status', aliases: ['claimStatus'] },
    { id: 'paymentStatus', label: 'Payment status', aliases: ['paymentStatus'] },
    { id: 'month', label: 'Month', aliases: ['month', 'claimMonth'] },
    { id: 'type', label: 'Type', aliases: ['type', 'encounterType'] },
];

const isAmountField = (field) => /(amount|amt|share|gross|net|paid|payment)/i.test(String(field || ''));

const formatCellValue = (value, field) => {
    if (value == null || value === '') return '-';
    if (isAmountField(field)) {
        const num = Number(value);
        if (Number.isFinite(num)) {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(num);
        }
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (_) {
            return String(value);
        }
    }
    return String(value);
};

const ClaimDetailDrawer = ({ claim, onClose, isLoading = false, isPage = false }) => {
    const [facilityNameMap, setFacilityNameMap] = useState({});
    const [filters, setFilters] = useState(defaultFilters);
    const [debouncedFilters, setDebouncedFilters] = useState(defaultFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [showTotals, setShowTotals] = useState(true);
    const [visibleColumns, setVisibleColumns] = useState({});
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(500);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedFilters(filters), 300);
        return () => clearTimeout(timer);
    }, [filters]);

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(val ?? 0);

    const normalizedActivities = useMemo(() => {
        const candidates = [
            claim?.activities,
            claim?.activityDetails,
            claim?.claimActivities,
            claim?.activityTimeline,
            claim?.data?.activities,
            claim?.data?.activityDetails,
        ];
        const list = candidates.find(Array.isArray) || [];
        return list.map((act) => ({ ...claim, ...act }));
    }, [claim]);

    useEffect(() => {
        if (!claim) return;
        const facilityId = claim.facilityId || claim.providerId;
        const fromClaim = (claim.remittanceHeader?.officeName || claim.officeName || '').trim();
        if (facilityId) {
            setFacilityNameMap(prev => ({ ...prev, [facilityId]: fromClaim }));
        }
    }, [claim]);

    const handleFilterChange = useCallback((field, value, immediate = false) => {
        setFilters(prev => {
            const newFilters = { ...prev, [field]: value };
            if (field === 'year' || field === 'month') {
                if (value) { newFilters.fromDate = ''; newFilters.toDate = ''; }
            } else if (field === 'fromDate' || field === 'toDate') {
                if (value) { newFilters.year = ''; newFilters.month = ''; }
            }
            return newFilters;
        });
        if (immediate) {
            setDebouncedFilters(prev => {
                const newFilters = { ...prev, [field]: value };
                if (field === 'year' || field === 'month') { if (value) { newFilters.fromDate = ''; newFilters.toDate = ''; } }
                else if (field === 'fromDate' || field === 'toDate') { if (value) { newFilters.year = ''; newFilters.month = ''; } }
                return newFilters;
            });
        }
    }, []);

    const activeFilterCount = useMemo(() =>
        Object.keys(debouncedFilters).reduce((count, key) =>
            (debouncedFilters[key] !== defaultFilters[key] && debouncedFilters[key] !== '') ? count + 1 : count, 0), [debouncedFilters]);

    const filteredActivities = useMemo(() => {
        return normalizedActivities.filter(act => {
            let targetDateString = act.activityStart || act.activityStartDate;
            if (debouncedFilters.searchOn === 'Settlement Date') targetDateString = act.settlementDate;
            else if (debouncedFilters.searchOn === 'Transaction Date') targetDateString = act.transactionDate || act.remittanceTransactionDate;

            if (targetDateString) {
                const targetDate = parseDate(targetDateString);
                if (targetDate && !isNaN(targetDate.getTime())) {
                    if (debouncedFilters.year && !debouncedFilters.fromDate && !debouncedFilters.toDate) {
                        if (targetDate.getFullYear().toString() !== debouncedFilters.year) return false;
                    }
                    if (debouncedFilters.month && !debouncedFilters.fromDate && !debouncedFilters.toDate) {
                        if (targetDate.getMonth() !== getMonthIndex(debouncedFilters.month)) return false;
                    }
                    const dataDateOnly = new Date(targetDate);
                    dataDateOnly.setHours(0, 0, 0, 0);
                    if (debouncedFilters.fromDate) {
                        const fromD = parseDate(debouncedFilters.fromDate);
                        if (fromD) { fromD.setHours(0, 0, 0, 0); if (dataDateOnly < fromD) return false; }
                    }
                    if (debouncedFilters.toDate) {
                        const toD = parseDate(debouncedFilters.toDate);
                        if (toD) { toD.setHours(0, 0, 0, 0); if (dataDateOnly > toD) return false; }
                    }
                }
            } else if (debouncedFilters.year || debouncedFilters.month || debouncedFilters.fromDate || debouncedFilters.toDate) return false;

            if (debouncedFilters.facility) {
                const facId = act.facilityId || act.providerId;
                if (facId !== debouncedFilters.facility) return false;
            }
            if (debouncedFilters.receiverId) {
                const recId = act.receiverId;
                if (recId !== debouncedFilters.receiverId) return false;
            }
            if (debouncedFilters.payerId && act.payerId !== debouncedFilters.payerId) return false;
            if (debouncedFilters.encounter && debouncedFilters.encounter !== 'OP & IP') {
                const claimId = act.claimId || '';
                const isIP = claimId.startsWith('DLHI');
                const isOP = claimId.startsWith('DLHO');
                if (debouncedFilters.encounter === 'In Patient' && !isIP) return false;
                if (debouncedFilters.encounter === 'Out Patient' && !isOP) return false;
            }
            if (debouncedFilters.clinician && !act.clinicianId?.toLowerCase().includes(debouncedFilters.clinician.toLowerCase())) return false;
            if (debouncedFilters.claimNo && !act.claimId?.toLowerCase().includes(debouncedFilters.claimNo.toLowerCase())) return false;
            if (debouncedFilters.denial && !act.denialCode?.toLowerCase().includes(debouncedFilters.denial.toLowerCase())) return false;
            if (debouncedFilters.cpt && !(act.activityCode || act.cptCode || '').toLowerCase().includes(debouncedFilters.cpt.toLowerCase())) return false;
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                if (!(((act.activityCode || act.cptCode) && String(act.activityCode || act.cptCode).toLowerCase().includes(searchLower)) ||
                    (act.clinicianId && act.clinicianId.toLowerCase().includes(searchLower)) ||
                    (act.claimId && act.claimId.toLowerCase().includes(searchLower)))) return false;
            }
            return true;
        });
    }, [normalizedActivities, searchTerm, debouncedFilters]);

    const resetFilters = useCallback(() => {
        setFilters(defaultFilters);
        setDebouncedFilters(defaultFilters);
        setSearchTerm('');
    }, []);

    const summaryTotals = useMemo(() => filteredActivities.reduce((acc, act) => {
        acc.paymentAmount += act.paymentAmount || 0;
        acc.netAmount += act.netAmount || 0;
        return acc;
    }, { paymentAmount: 0, netAmount: 0 }), [filteredActivities]);

    const totalPages = Math.ceil((filteredActivities?.length || 0) / itemsPerPage);
    const paginatedData = useMemo(() => {
        if (!filteredActivities?.length) return [];
        const start = (currentPage - 1) * itemsPerPage;
        return filteredActivities.slice(start, start + itemsPerPage);
    }, [filteredActivities, currentPage, itemsPerPage]);

    useEffect(() => { setCurrentPage(1); }, [debouncedFilters, searchTerm]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    };

    const columns = useMemo(() => {
        const rows = normalizedActivities || [];
        const keySet = new Set();
        rows.forEach((row) => {
            Object.keys(row || {}).forEach((k) => keySet.add(k));
        });
        const orderedIds = CLAIM_DETAILS_ORDER.map((c) => c.id);
        const remaining = [...keySet].filter((k) => !orderedIds.includes(k) && k !== 'activities');
        const finalOrder = [
            ...CLAIM_DETAILS_ORDER,
            ...remaining.map((k) => ({ id: k, label: k, aliases: [k] })),
        ];

        return finalOrder.map((col) => ({
            id: col.id,
            label: col.label,
            minWidth: isAmountField(col.id) ? '130px' : '150px',
            align: isAmountField(col.id) ? 'right' : undefined,
            render: (row) => {
                const sourceKey = (col.aliases || []).find((alias) => row?.[alias] !== undefined && row?.[alias] !== null && row?.[alias] !== '');
                const value = sourceKey ? row[sourceKey] : null;
                if (col.id === 'facilityName') {
                    const id = row.facilityId || row.providerId;
                    const resolved = (value || facilityNameMap[id] || '').trim();
                    return resolved || '-';
                }
                if (col.id.toLowerCase().includes('date')) return formatDate(value);
                return formatCellValue(value, col.id);
            },
        }));
    }, [normalizedActivities, facilityNameMap]);

    const activeColumns = useMemo(() => columns.filter(col => visibleColumns[col.id] !== false), [columns, visibleColumns]);
    const toggleColumn = (colId) => setVisibleColumns(prev => ({ ...prev, [colId]: prev[colId] === false }));

    const uniqueFacilities = useMemo(() => {
        const ids = normalizedActivities.map(a => a.facilityId || a.providerId).filter(Boolean);
        return [...new Set(ids)].sort();
    }, [normalizedActivities]);
    const uniqueReceivers = useMemo(() => {
        const ids = normalizedActivities.map(a => a.receiverId).filter(Boolean);
        return [...new Set(ids)].sort();
    }, [normalizedActivities]);
    const uniquePayers = useMemo(() => {
        const ids = normalizedActivities.map(a => a.payerId).filter(Boolean);
        return [...new Set(ids)].sort();
    }, [normalizedActivities]);

    // Amount/numeric column IDs - export as plain numbers (no AED)
    const AMOUNT_IDS = new Set(columns.filter((c) => isAmountField(c.id)).map((c) => c.id));

    const reactNodeToPlainText = (node) => {
        if (node == null || node === false) return '';
        if (typeof node === 'string' || typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(reactNodeToPlainText).filter(Boolean).join(' ');
        if (React.isValidElement(node)) return reactNodeToPlainText(node.props?.children);
        if (typeof node === 'object' && node.props != null) return reactNodeToPlainText(node.props.children);
        return '';
    };

    const getExportValue = (col, row, forExcel = false) => {
        if (AMOUNT_IDS.has(col.id)) {
            const num = parseFloat(row[col.id]) || 0;
            return forExcel ? num : num.toFixed(2);
        }
        if (col.id === 'quantity') {
            const val = parseFloat(row.quantity) || 0;
            return forExcel ? val : String(val);
        }
        const rendered = col.render ? col.render(row) : row[col.id];
        if (React.isValidElement(rendered)) {
            const text = reactNodeToPlainText(rendered).replace(/<[^>]*>/g, '').trim();
            return text || '-';
        }
        if (typeof rendered === 'number' && !Number.isNaN(rendered)) {
            return forExcel ? rendered : String(rendered);
        }
        if (typeof rendered === 'string') {
            const t = rendered.replace(/<[^>]*>/g, '').trim();
            return t || '-';
        }
        return rendered != null && String(rendered).trim() !== '' ? String(rendered) : '-';
    };

    const buildDrawerTotalsRow = (rows, cols, forExcel) => {
        const totals = {};
        cols.forEach((col, idx) => {
            if (AMOUNT_IDS.has(col.id)) {
                const sum = rows.reduce((acc, row) => acc + (parseFloat(row[col.id]) || 0), 0);
                totals[col.label] = forExcel ? sum : sum.toFixed(2);
            } else if (col.id === 'quantity') {
                const sum = rows.reduce((acc, row) => acc + (parseFloat(row.quantity) || 0), 0);
                totals[col.label] = forExcel ? sum : String(sum);
            } else {
                totals[col.label] = idx === 0 ? 'TOTAL:' : '';
            }
        });
        return totals;
    };

    const exportToCSV = () => {
        if (!filteredActivities.length) { alert('No data to export'); return; }
        const exportData = filteredActivities.map(row => {
            const rowData = {};
            activeColumns.forEach(col => {
                rowData[col.label] = getExportValue(col, row, false);
            });
            return rowData;
        });
        exportData.push(buildDrawerTotalsRow(filteredActivities, activeColumns, false));
        const headers = activeColumns.map(c => c.label);
        const csvRows = [headers.join(','), ...exportData.map(row => headers.map(h => {
            const raw = row[h];
            const v = raw === null || raw === undefined ? '' : String(raw);
            if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`;
            return v;
        }).join(','))];
        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `claim_${claim?.claimId || claim?.invoiceNo || claim?.id || 'unknown'}_activities_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const exportToExcel = () => {
        if (!filteredActivities.length) { alert('No data to export'); return; }
        const exportData = filteredActivities.map(row => {
            const rowData = {};
            activeColumns.forEach(col => {
                rowData[col.label] = getExportValue(col, row, true);
            });
            return rowData;
        });
        exportData.push(buildDrawerTotalsRow(filteredActivities, activeColumns, true));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Activities');
        XLSX.writeFile(wb, `claim_${claim?.claimId || claim?.invoiceNo || claim?.id || 'unknown'}_activities_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <>
        <div className={`claim-modal-overlay ${isPage ? 'is-page' : ''}`} onClick={isPage ? undefined : onClose}>
            <div className={`claim-modal ${isPage ? 'is-page' : ''}`} onClick={(e) => !isPage && e.stopPropagation()}>

                {!isPage && (
                <header className="claim-modal-header">
                    <div className="claim-modal-title-wrap">
                        <h1 className="claim-modal-title">Claim #{claim?.claimId || claim?.invoiceNo || claim?.id || '-'}</h1>
                        <p className="claim-modal-meta">Activity timeline</p>
                    </div>
                    <button type="button" onClick={onClose} className="claim-modal-close" aria-label="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </header>
                )}

                <div className="claim-modal-body">
                    <div className="claim-modal-card">
                        <div className="claim-modal-card-head">
                            {isPage ? (
                                <>
                                    <div className="claim-modal-card-head-main">
                                        <h1 className="claim-modal-title">Claim #{claim?.claimId || claim?.invoiceNo || claim?.id || '-'}</h1>
                                        <p className="claim-modal-meta">Activity timeline · {filteredActivities.length} {filteredActivities.length === 1 ? 'record' : 'records'}</p>
                                    </div>
                                    <button type="button" onClick={onClose} className="claim-modal-close" aria-label="Back to claims">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h2 className="claim-modal-card-title">Activities</h2>
                                    <span className="claim-modal-count">{filteredActivities.length} {filteredActivities.length === 1 ? 'record' : 'records'}</span>
                                </>
                            )}
                        </div>

                        <div className="claim-modal-toolbar">
                            <div className="claim-toolbar-group">
                                <button type="button" className={`claim-toolbar-btn ${showFilters ? 'is-active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7" /></svg>
                                    Filters {activeFilterCount > 0 && <span className="claim-toolbar-badge">{activeFilterCount}</span>}
                                </button>
                                <button type="button" className={`claim-toolbar-btn ${showTotals ? 'is-active' : ''}`} onClick={() => setShowTotals(!showTotals)}>Totals</button>
                                <div className="claim-toolbar-dropdown">
                                    <button type="button" className="claim-toolbar-btn" onClick={() => setShowColumnMenu(!showColumnMenu)}>Columns ▾</button>
                                    {showColumnMenu && (
                                        <div className="claim-column-menu">
                                            {columns.map(col => (
                                                <label key={col.id} className="claim-column-item">
                                                    <input type="checkbox" checked={visibleColumns[col.id] !== false} onChange={() => toggleColumn(col.id)} />
                                                    <span>{col.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="claim-toolbar-group">
                                <button type="button" className="claim-toolbar-btn claim-toolbar-btn-export" onClick={exportToExcel} title="Export to Excel">Excel</button>
                                <button type="button" className="claim-toolbar-btn claim-toolbar-btn-export" onClick={exportToCSV} title="Export to CSV">CSV</button>
                            </div>
                        </div>

                            {showFilters && (
                                <div className="claim-filter-panel">
                                    <div className="claim-filter-grid">
                                        <div className="claim-filter-field col-span-12">
                                            <label>Branch</label>
                                            <select value={filters.facility} onChange={(e) => handleFilterChange('facility', e.target.value, true)} className="claim-select">
                                                <option value="">All Branches</option>
                                                {uniqueFacilities.map(fid => {
                                                    const label = facilityNameMap[fid] || (fid === (claim?.facilityId || claim?.providerId) ? (claim?.remittanceHeader?.officeName || claim?.officeName) : null) || fid;
                                                    return <option key={fid} value={fid}>{label}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="claim-filter-field col-span-4">
                                            <label>Search on</label>
                                            <select className="claim-select" value={filters.searchOn} onChange={(e) => handleFilterChange('searchOn', e.target.value, true)}>
                                                <option>Activity Start</option>
                                                <option>Settlement Date</option>
                                                <option>Transaction Date</option>
                                            </select>
                                        </div>
                                        <div className="claim-filter-field col-span-2">
                                            <label>Year</label>
                                            <select className="claim-select" value={filters.year} onChange={(e) => handleFilterChange('year', e.target.value, true)}>
                                                <option value="">Select</option>
                                                <option>2026</option>
                                                <option>2025</option>
                                                <option>2024</option>
                                            </select>
                                        </div>
                                        <div className="claim-filter-field col-span-2">
                                            <label>Month</label>
                                            <select className="claim-select" value={filters.month} onChange={(e) => handleFilterChange('month', e.target.value, true)}>
                                                <option value="">Select</option>
                                                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="claim-filter-field col-span-2">
                                            <label>From</label>
                                            <input type="date" value={filters.fromDate} onChange={(e) => handleFilterChange('fromDate', e.target.value, true)} className="claim-input" />
                                        </div>
                                        <div className="claim-filter-field col-span-2">
                                            <label>To</label>
                                            <input type="date" value={filters.toDate} onChange={(e) => handleFilterChange('toDate', e.target.value, true)} className="claim-input" />
                                        </div>
                                        <div className="claim-filter-field col-span-3">
                                            <label>Receiver</label>
                                            <select className="claim-select" value={filters.receiverId} onChange={(e) => handleFilterChange('receiverId', e.target.value, true)}>
                                                <option value="">All Receivers</option>
                                                {uniqueReceivers.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div className="claim-filter-field col-span-3">
                                            <label>Payer</label>
                                            <select className="claim-select" value={filters.payerId} onChange={(e) => handleFilterChange('payerId', e.target.value, true)}>
                                                <option value="">All Payers</option>
                                                {uniquePayers.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div className="claim-filter-field col-span-3">
                                            <label>Encounter</label>
                                            <select className="claim-select" value={filters.encounter} onChange={(e) => handleFilterChange('encounter', e.target.value, true)}>
                                                <option>OP & IP</option>
                                                <option>Out Patient</option>
                                                <option>In Patient</option>
                                            </select>
                                        </div>
                                        <div className="claim-filter-field col-span-3">
                                            <label>Clinician</label>
                                            <input type="text" value={filters.clinician} onChange={(e) => handleFilterChange('clinician', e.target.value)} className="claim-input" placeholder="Search…" />
                                        </div>
                                        <div className="claim-filter-field col-span-3">
                                            <label>Claim no.</label>
                                            <input type="text" value={filters.claimNo} onChange={(e) => handleFilterChange('claimNo', e.target.value)} className="claim-input" placeholder="Search…" />
                                        </div>
                                        <div className="claim-filter-field col-span-3">
                                            <label>Denial</label>
                                            <input type="text" value={filters.denial} onChange={(e) => handleFilterChange('denial', e.target.value)} className="claim-input" placeholder="Search…" />
                                        </div>
                                        <div className="claim-filter-field col-span-3">
                                            <label>CPT</label>
                                            <input type="text" value={filters.cpt} onChange={(e) => handleFilterChange('cpt', e.target.value)} className="claim-input" placeholder="Search…" />
                                        </div>
                                    </div>
                                    <div className="claim-filter-footer">
                                        <span className="claim-filter-total">{filteredActivities.length} activities</span>
                                        <button type="button" className="claim-filter-clear" onClick={resetFilters}>Clear filters</button>
                                    </div>
                                </div>
                            )}

                            {filteredActivities.length > 0 ? (
                                <>
                                    <div className="claim-table-wrap">
                                        <table className="claim-table">
                                            <thead>
                                                <tr>
                                                    {activeColumns.map(col => (
                                                        <th key={col.id} style={{ minWidth: col.minWidth }} className={col.align === 'right' ? 'text-right' : ''}>{col.label}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedData.map((row, index) => (
                                                    <tr key={row.activityId ?? index}>
                                                        {activeColumns.map(col => (
                                                            <td key={col.id} className={col.align === 'right' ? `text-right ${col.className || ''}` : (col.className || '')}>
                                                                {col.render ? col.render(row) : row[col.id]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                            {showTotals && (
                                                <tfoot className="claim-table-foot">
                                                    <tr>
                                                        {activeColumns.map((col, index) => {
                                                            let content = '';
                                                            if (index === 0) content = <strong>Total</strong>;
                                                            else if (col.id === 'paymentAmount') content = <strong className="claim-cell-success">{formatCurrency(summaryTotals.paymentAmount)}</strong>;
                                                            else if (col.id === 'netAmount') content = <strong className="claim-cell-highlight">{formatCurrency(summaryTotals.netAmount)}</strong>;
                                                            return <td key={col.id} className={col.align === 'right' ? `claim-cell-right ${col.className || ''}` : (col.className || '')}>{content}</td>;
                                                        })}
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="claim-pagination">
                                            <span className="claim-pagination-info">
                                                {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredActivities.length)} of {filteredActivities.length}
                                            </span>
                                            <div className="claim-pagination-btns">
                                                <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="claim-page-btn">Previous</button>
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let p = i + 1;
                                                    if (totalPages > 5) { if (currentPage > 3) p = currentPage - 2 + i; if (p > totalPages) p = totalPages - 4 + i; }
                                                    return (
                                                        <button key={p} type="button" onClick={() => handlePageChange(p)} className={`claim-page-num ${currentPage === p ? 'is-current' : ''}`}>{p}</button>
                                                    );
                                                })}
                                                <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="claim-page-btn">Next</button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="claim-empty">
                                    {isLoading
                                        ? 'Loading claim activities...'
                                        : `No activities for this claim.${activeFilterCount > 0 ? ' Try clearing filters.' : ''}`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .claim-modal-overlay {
                    --cd-ink: #0f172a;
                    --cd-muted: #64748b;
                    --cd-line: #e2e8f0;
                    --cd-soft: #f8fafc;
                    --cd-surface: #ffffff;
                    --cd-accent: #2563eb;
                    --cd-accent-soft: #eff6ff;
                    --cd-success: #059669;
                    --cd-danger: #dc2626;
                    --cd-radius: 14px;
                    --cd-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06);
                    position: fixed; inset: 0;
                    background: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 3000;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    overflow: hidden;
                    animation: claimFadeIn 0.22s ease-out;
                    font-family: var(--font-family-sans, 'Segoe UI', system-ui, sans-serif);
                    color: var(--cd-ink);
                }
                .claim-modal-overlay.is-page {
                    position: relative;
                    inset: auto;
                    background: transparent;
                    backdrop-filter: none;
                    -webkit-backdrop-filter: none;
                    z-index: auto;
                    animation: claimPageIn 0.28s ease-out;
                    min-height: 0;
                    height: auto;
                    padding: 0;
                    overflow: visible;
                    display: block;
                }
                .claim-modal {
                    background: var(--cd-surface);
                    display: flex;
                    flex-direction: column;
                    flex: 1 1 0;
                    min-height: 0;
                    max-height: 100vh;
                    overflow: hidden;
                    width: 100%;
                    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.28);
                }
                .claim-modal.is-page {
                    flex: none;
                    max-height: none;
                    min-height: 0;
                    height: auto;
                    border: none;
                    border-radius: 0;
                    box-shadow: none;
                    background: transparent;
                    overflow: visible;
                    display: block;
                }
                .claim-modal-header {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 18px 24px;
                    border-bottom: 1px solid var(--cd-line);
                    background:
                        linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
                    position: sticky;
                    top: 0;
                    z-index: 5;
                }
                .claim-modal.is-page .claim-modal-header {
                    position: relative;
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--cd-line);
                    background:
                        linear-gradient(90deg, rgba(37, 99, 235, 0.06), transparent 42%),
                        linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                }
                .claim-modal-title-wrap { min-width: 0; }
                .claim-modal-title {
                    margin: 0;
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: var(--cd-ink);
                    letter-spacing: -0.025em;
                    line-height: 1.25;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .claim-modal.is-page .claim-modal-title {
                    font-size: 1.35rem;
                    font-variant-numeric: tabular-nums;
                }
                .claim-modal-meta {
                    margin: 5px 0 0 0;
                    font-size: 0.8125rem;
                    color: var(--cd-muted);
                    font-weight: 500;
                    letter-spacing: 0.01em;
                }
                .claim-modal-close {
                    width: 40px; height: 40px;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid transparent;
                    border-radius: 11px;
                    background: #f1f5f9;
                    color: var(--cd-muted);
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
                }
                .claim-modal-close:hover {
                    background: #fee2e2;
                    border-color: #fecaca;
                    color: var(--cd-danger);
                    transform: translateY(-1px);
                }
                .claim-modal.is-page .claim-modal-close {
                    width: auto;
                    min-width: 40px;
                    padding: 0 12px;
                    gap: 0;
                }
                .claim-modal-body {
                    flex: 1 1 0;
                    min-height: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 20px 24px 24px;
                    background: linear-gradient(180deg, #f1f5f9 0%, #f8fafc 100%);
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 transparent;
                }
                .claim-modal.is-page .claim-modal-body {
                    flex: none;
                    min-height: 0;
                    overflow: visible;
                    padding: 0;
                    background: transparent;
                }
                .claim-modal-card {
                    background: var(--cd-surface);
                    border-radius: 12px;
                    border: 1px solid var(--cd-line);
                    padding: 22px 24px 24px;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
                }
                .claim-modal.is-page .claim-modal-card {
                    border-radius: 12px;
                    padding: 18px 20px 16px;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 22px rgba(15, 23, 42, 0.05);
                }
                .claim-modal-card-head {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 16px;
                    padding-bottom: 14px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .claim-modal-card-head-main { min-width: 0; }
                .claim-modal-card-title {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--cd-ink);
                    letter-spacing: -0.01em;
                }
                .claim-modal.is-page .claim-modal-card-head .claim-modal-title {
                    font-size: 1.2rem;
                    margin: 0;
                }
                .claim-modal.is-page .claim-modal-card-head .claim-modal-meta {
                    margin-top: 4px;
                }
                .claim-modal-count {
                    font-size: 0.75rem;
                    color: #334155;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-weight: 600;
                    letter-spacing: 0.01em;
                    white-space: nowrap;
                }
                .claim-modal-toolbar {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 18px;
                }
                .claim-toolbar-group { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
                .claim-toolbar-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    padding: 8px 13px;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #334155;
                    background: #fff;
                    border: 1px solid var(--cd-line);
                    border-radius: 9px;
                    cursor: pointer;
                    transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s;
                }
                .claim-toolbar-btn:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: var(--cd-ink);
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
                }
                .claim-toolbar-btn.is-active {
                    background: var(--cd-accent-soft);
                    border-color: #93c5fd;
                    color: var(--cd-accent);
                    box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
                }
                .claim-toolbar-badge {
                    background: #ef4444;
                    color: #fff;
                    font-size: 0.68rem;
                    font-weight: 700;
                    padding: 1px 6px;
                    border-radius: 999px;
                    min-width: 18px;
                    text-align: center;
                    line-height: 1.35;
                }
                .claim-toolbar-btn-export {
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                }
                .claim-toolbar-btn-sync { background: var(--cd-accent); border-color: var(--cd-accent); color: #fff; }
                .claim-toolbar-btn-sync:hover:not(:disabled) { background: #1d4ed8; border-color: #1d4ed8; }
                .claim-toolbar-btn-sync:disabled { opacity: 0.6; cursor: not-allowed; }
                .claim-toolbar-btn-sync svg.spin { animation: claimSpin 0.8s linear infinite; }
                .claim-toolbar-dropdown { position: relative; }
                .claim-column-menu {
                    position: absolute;
                    top: 100%; left: 0;
                    z-index: 50;
                    margin-top: 8px;
                    min-width: 220px;
                    max-height: 300px;
                    overflow-y: auto;
                    background: #fff;
                    border: 1px solid var(--cd-line);
                    border-radius: 12px;
                    padding: 8px;
                    box-shadow: 0 18px 40px -16px rgba(15, 23, 42, 0.28);
                    animation: claimFadeIn 0.15s ease-out;
                }
                .claim-column-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 10px;
                    font-size: 0.8125rem;
                    color: #334155;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: background 0.12s;
                }
                .claim-column-item:hover { background: #f1f5f9; }
                .claim-filter-panel {
                    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
                    border: 1px solid var(--cd-line);
                    border-radius: 12px;
                    margin-bottom: 18px;
                    overflow: hidden;
                    animation: claimFadeIn 0.18s ease-out;
                }
                .claim-filter-grid {
                    display: grid;
                    grid-template-columns: repeat(12, 1fr);
                    gap: 14px 16px;
                    padding: 18px 20px;
                }
                .claim-filter-field { display: flex; flex-direction: column; gap: 6px; }
                .claim-filter-field label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: var(--cd-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .claim-select, .claim-input {
                    padding: 9px 12px;
                    font-size: 0.875rem;
                    border: 1px solid #cbd5e1;
                    border-radius: 9px;
                    background: #fff;
                    width: 100%;
                    color: var(--cd-ink);
                    transition: border-color 0.15s, box-shadow 0.15s;
                }
                .claim-select:hover, .claim-input:hover { border-color: #94a3b8; }
                .claim-select:focus, .claim-input:focus {
                    outline: none;
                    border-color: #60a5fa;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
                }
                .claim-filter-field.col-span-12 { grid-column: span 12; }
                .claim-filter-field.col-span-4 { grid-column: span 4; }
                .claim-filter-field.col-span-3 { grid-column: span 3; }
                .claim-filter-field.col-span-2 { grid-column: span 2; }
                .claim-filter-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 12px 20px;
                    border-top: 1px solid var(--cd-line);
                    background: rgba(255, 255, 255, 0.85);
                }
                .claim-filter-total { font-size: 0.8125rem; color: var(--cd-muted); font-weight: 500; }
                .claim-filter-clear {
                    padding: 7px 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--cd-danger);
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .claim-filter-clear:hover { background: #fee2e2; }
                .claim-table-wrap {
                    overflow-x: auto;
                    width: 100%;
                    border: 1px solid var(--cd-line);
                    border-radius: 12px;
                    background: #fff;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
                }
                .claim-modal.is-page .claim-table-wrap {
                    max-height: none;
                    overflow-x: auto;
                    overflow-y: visible;
                }
                .claim-modal.is-page .claim-empty {
                    padding: 36px 20px;
                }
                .claim-modal.is-page .claim-pagination {
                    margin-top: 12px;
                    padding-top: 12px;
                }
                .claim-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    min-width: max-content;
                    font-size: 0.8125rem;
                }
                .claim-table th {
                    text-align: left;
                    padding: 11px 14px;
                    font-weight: 700;
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: #64748b;
                    background: #f8fafc;
                    border-bottom: 1px solid var(--cd-line);
                    white-space: nowrap;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }
                .claim-table td {
                    padding: 11px 14px;
                    color: #334155;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .claim-table tbody tr { transition: background 0.12s; }
                .claim-table tbody tr:nth-child(even) td { background: #fcfdff; }
                .claim-table tbody tr:hover td { background: #f1f5f9; }
                .claim-table .claim-cell-right,
                .claim-table .text-right { text-align: right; font-variant-numeric: tabular-nums; }
                .claim-table .font-bold { font-weight: 600; }
                .claim-table .text-primary { color: var(--cd-accent); }
                .claim-table .text-success { color: var(--cd-success); }
                .claim-table-foot { background: #f8fafc; }
                .claim-table-foot td {
                    padding: 13px 14px;
                    border-bottom: none;
                    border-top: 1px solid var(--cd-line);
                    font-weight: 700;
                    color: #1e293b;
                    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
                }
                .claim-cell-success { color: var(--cd-success) !important; }
                .claim-cell-highlight { color: var(--cd-accent) !important; }
                .code-badge {
                    display: inline-block;
                    padding: 3px 8px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #0f172a;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 7px;
                    font-variant-numeric: tabular-nums;
                }
                .denial-pill {
                    display: inline-block;
                    padding: 2px 8px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #b91c1c;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 999px;
                }
                .font-mono { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
                .text-xs { font-size: 0.75rem; }
                .claim-loading, .claim-empty {
                    text-align: center;
                    padding: 56px 24px;
                    color: var(--cd-muted);
                    font-size: 0.9rem;
                    font-weight: 500;
                    background:
                        radial-gradient(circle at 50% 30%, rgba(37, 99, 235, 0.05), transparent 55%);
                    border: 1px dashed #cbd5e1;
                    border-radius: 12px;
                }
                .claim-pagination {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 16px;
                    padding-top: 14px;
                    border-top: 1px solid #f1f5f9;
                }
                .claim-pagination-info { font-size: 0.8125rem; color: var(--cd-muted); font-weight: 500; }
                .claim-pagination-btns { display: flex; align-items: center; gap: 6px; }
                .claim-page-btn, .claim-page-num {
                    padding: 7px 12px;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #334155;
                    background: #fff;
                    border: 1px solid var(--cd-line);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
                }
                .claim-page-btn:hover:not(:disabled), .claim-page-num:hover:not(.is-current) {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
                }
                .claim-page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                .claim-page-num.is-current {
                    background: var(--cd-accent);
                    border-color: var(--cd-accent);
                    color: #fff;
                    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
                }
                @media (max-width: 900px) {
                    .claim-filter-field.col-span-4,
                    .claim-filter-field.col-span-3,
                    .claim-filter-field.col-span-2 { grid-column: span 6; }
                    .claim-modal.is-page .claim-modal-header,
                    .claim-modal.is-page .claim-modal-body { padding-left: 16px; padding-right: 16px; }
                }
                @media (max-width: 640px) {
                    .claim-filter-field.col-span-4,
                    .claim-filter-field.col-span-3,
                    .claim-filter-field.col-span-2,
                    .claim-filter-field.col-span-12 { grid-column: span 12; }
                    .claim-modal-title { white-space: normal; }
                }
                @keyframes claimFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes claimPageIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes claimSpin { to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
};

export default ClaimDetailDrawer;
