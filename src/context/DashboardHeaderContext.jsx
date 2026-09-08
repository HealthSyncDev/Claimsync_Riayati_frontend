import React, { createContext, useContext, useMemo, useState } from 'react';

const DashboardHeaderContext = createContext(null);

export function DashboardHeaderProvider({ children }) {
  const [headerActions, setHeaderActions] = useState(null);

  const value = useMemo(
    () => ({ headerActions, setHeaderActions }),
    [headerActions],
  );

  return (
    <DashboardHeaderContext.Provider value={value}>
      {children}
    </DashboardHeaderContext.Provider>
  );
}

export function useDashboardHeader() {
  const ctx = useContext(DashboardHeaderContext);
  if (!ctx) {
    return { headerActions: null, setHeaderActions: () => {} };
  }
  return ctx;
}
