import { Outlet } from 'react-router-dom';
import { ResubmissionListProvider } from './ResubmissionListContext';

/**
 * Nested /crs/resubmission/* layout: provider stays mounted when switching
 * list index ↔ :claimId so filters and claims data survive the transition.
 */
export default function ResubmissionLayout() {
    return (
        <ResubmissionListProvider>
            <Outlet />
        </ResubmissionListProvider>
    );
}
