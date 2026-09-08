import React, { memo, useLayoutEffect, useRef } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { usePortal } from '../../../context/PortalContext';
import ActivityList from './ActivityList';

const StableActivityList = memo(function StableActivityList() {
    return <ActivityList />;
});

/**
 * Clean architecture:
 * - ActivityList stays mounted (parked off-screen) so Back is instant
 * - Timeline renders in normal document flow inside main-content (no portal/fixed overlay)
 * - main-content scroll resets to top on open — spinner always visible
 * - Scrollbar only appears when timeline content is taller than the viewport
 */
export default function ActivitiesLayout() {
    const { path: portalPath } = usePortal();
    const isTimeline = Boolean(useMatch(portalPath('/crs/activities/timeline/:claimId')));
    const listAliveRef = useRef(!isTimeline);
    if (!isTimeline) listAliveRef.current = true;

    useLayoutEffect(() => {
        if (!isTimeline) return;
        const main = document.querySelector('.main-content');
        if (main instanceof HTMLElement) {
            main.scrollTop = 0;
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [isTimeline]);

    return (
        <>
            {listAliveRef.current ? (
                <div
                    className={isTimeline ? 'activities-list-parked' : 'activities-list-live'}
                    aria-hidden={isTimeline}
                >
                    <StableActivityList />
                </div>
            ) : null}

            {isTimeline ? (
                <div className="activities-timeline-root">
                    <Outlet />
                </div>
            ) : null}

            <style>{`
                .activities-list-parked {
                    position: fixed;
                    left: -120vw;
                    top: 0;
                    width: 100vw;
                    height: 100vh;
                    overflow: hidden;
                    visibility: hidden;
                    pointer-events: none;
                    z-index: -1;
                }
                .activities-list-live {
                    display: block;
                }
                .activities-timeline-root {
                    display: block;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                }
            `}</style>
        </>
    );
}
