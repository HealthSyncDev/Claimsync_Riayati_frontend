import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ExtractionContext = createContext();

export const useExtraction = () => {
    const context = useContext(ExtractionContext);
    if (!context) {
        throw new Error('useExtraction must be used within an ExtractionProvider');
    }
    return context;
};

export const ExtractionProvider = ({ children }) => {
    // Initialize state from localStorage if available
    const [isExtracting, setIsExtracting] = useState(() => {
        return localStorage.getItem('extraction_isExtracting') === 'true';
    });

    const [startTime, setStartTime] = useState(() => {
        const stored = localStorage.getItem('extraction_startTime');
        return stored ? parseInt(stored, 10) : null;
    });

    const [extractionMessage, setExtractionMessage] = useState(() => {
        return localStorage.getItem('extraction_message') || '';
    });

    const [extractionStatus, setExtractionStatus] = useState(() => {
        // 'idle', 'extracting', 'completed', 'failed'
        return localStorage.getItem('extraction_status') || 'idle';
    });

    const [currentOfficeId, setCurrentOfficeId] = useState(() => {
        return localStorage.getItem('extraction_officeId') || null;
    });

    // Update localStorage whenever state changes
    useEffect(() => {
        localStorage.setItem('extraction_isExtracting', isExtracting);
        if (startTime) localStorage.setItem('extraction_startTime', startTime);
        else localStorage.removeItem('extraction_startTime');
        localStorage.setItem('extraction_message', extractionMessage);
        localStorage.setItem('extraction_status', extractionStatus);
        if (currentOfficeId) localStorage.setItem('extraction_officeId', currentOfficeId);
        else localStorage.removeItem('extraction_officeId');
    }, [isExtracting, startTime, extractionMessage, extractionStatus, currentOfficeId]);

    const startExtraction = useCallback((officeId) => {
        // officeId can be null/undefined for "All" permission users
        const isAllPermission = officeId == null || officeId === '';

        setIsExtracting(true);
        setExtractionStatus('extracting');
        setCurrentOfficeId(isAllPermission ? 'all' : officeId);

        const now = Date.now();
        setStartTime(now);
        setExtractionMessage("Data sync started.");

        // Extraction API flow is intentionally disabled.
        // Each page now owns its own sync APIs.
        setExtractionStatus('completed');
        setIsExtracting(false);
    }, []);

    const resetExtraction = () => {
        setIsExtracting(false);
        setStartTime(null);
        setExtractionMessage('');
        setExtractionStatus('idle');
        setCurrentOfficeId(null);

        // Clear storage
        localStorage.removeItem('extraction_isExtracting');
        localStorage.removeItem('extraction_startTime');
        localStorage.removeItem('extraction_message');
        localStorage.removeItem('extraction_status');
        localStorage.removeItem('extraction_officeId');
    };

    const value = {
        isExtracting,
        startTime,
        extractionMessage,
        extractionStatus,
        startExtraction,
        resetExtraction,
        currentOfficeId
    };

    return (
        <ExtractionContext.Provider value={value}>
            {children}
        </ExtractionContext.Provider>
    );
};
