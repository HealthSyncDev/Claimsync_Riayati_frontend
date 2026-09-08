import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { stripPortalPrefix } from '../config/portals';

export const useCRSReportData = () => {
    const location = useLocation();
    const { user } = useAuth();

    const [claimsData, setClaimsData] = useState(null);
    const [kpiStats, setKpiStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const getReportTypeFromRoute = useCallback(() => {
        const appPath = stripPortalPrefix(location.pathname);
        if (appPath === '/crs/claim-summary-month') {
            return 'claim_summary_month';
        } else if (appPath === '/crs/claim-summary-payer') {
            return 'claim_summary_payer';
        } else if (appPath === '/crs/claims') {
            return 'claim_details';
        }
        return 'claim_summary_month';
    }, [location.pathname]);

    const fetchReportData = useCallback(async () => {
        const officeId = user?.officeId || user?.office_id;
        if (!officeId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const reportType = getReportTypeFromRoute();

            const [claimsResponse, kpiResponse] = await Promise.all([
                apiFetch(`/api/claims?officeId=${officeId}&reportType=${reportType}`),
                apiFetch(`/api/claims/kpi?officeId=${officeId}`)
            ]);

            if (claimsResponse || kpiResponse) {
                const claims = claimsResponse?.data || claimsResponse || [];
                const kpi = kpiResponse?.data || kpiResponse || {};

                setClaimsData(claims);
                setKpiStats(kpi);
            }
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.officeId, user?.office_id, getReportTypeFromRoute]);

    useEffect(() => {
        if (user?.officeId || user?.office_id) {
            fetchReportData();
        }
    }, [fetchReportData]);

    return {
        claimsData,
        kpiStats,
        isLoading,
        reportType: getReportTypeFromRoute(),
        refetch: fetchReportData
    };
};