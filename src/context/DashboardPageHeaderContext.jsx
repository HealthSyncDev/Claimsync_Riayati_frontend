import { createContext, useContext } from 'react';

export const DashboardPageHeaderContext = createContext(null);

export const useDashboardPageHeader = () => useContext(DashboardPageHeaderContext);
