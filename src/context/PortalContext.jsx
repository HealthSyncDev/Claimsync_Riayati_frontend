import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    CLAIM_PORTALS,
    getPortalFromPathname,
    portalHref,
    stripPortalPrefix,
} from '../config/portals';

const PortalContext = createContext(null);

export function PortalProvider({ children }) {
    const { pathname } = useLocation();
    const portal = useMemo(() => getPortalFromPathname(pathname), [pathname]);
    const appPath = useMemo(() => stripPortalPrefix(pathname), [pathname]);
    const path = useCallback((nextPath) => portalHref(portal, nextPath), [portal]);

    const value = useMemo(
        () => ({
            ...portal,
            appPath,
            path,
            portals: CLAIM_PORTALS,
        }),
        [portal, appPath, path],
    );

    return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
    const ctx = useContext(PortalContext);
    if (ctx) return ctx;

    return {
        ...CLAIM_PORTALS[0],
        appPath: '/',
        path: (nextPath) => portalHref(CLAIM_PORTALS[0], nextPath),
        portals: CLAIM_PORTALS,
    };
}
