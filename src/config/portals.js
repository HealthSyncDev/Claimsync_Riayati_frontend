export const CLAIM_PORTALS = [
    { id: 'dhpo', label: 'DHPO', prefix: '', disabled: true },
    { id: 'riayati', label: 'Riayati', prefix: '/riayati' },
    { id: 'shafafi', label: 'Shafafi', prefix: '/shafafi', disabled: true },
];

export function getPortalFromPathname(pathname = '') {
    return (
        CLAIM_PORTALS.find(
            (portal) =>
                portal.prefix &&
                (pathname === portal.prefix || pathname.startsWith(`${portal.prefix}/`)),
        ) || CLAIM_PORTALS[0]
    );
}

export function stripPortalPrefix(pathname = '') {
    const portal = getPortalFromPathname(pathname);
    if (!portal.prefix) return pathname || '/';
    if (pathname === portal.prefix) return '/';
    return pathname.slice(portal.prefix.length) || '/';
}

export function portalHref(portal, path = '/') {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return portal?.prefix ? `${portal.prefix}${normalized}` : normalized;
}

export function isDashboardAppPath(pathname = '') {
    const app = stripPortalPrefix(pathname);
    return app === '/dashboard' || app.startsWith('/dashboard/');
}
