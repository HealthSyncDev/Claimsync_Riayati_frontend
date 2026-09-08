import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DashboardExportContext = createContext(null);

export function DashboardExportProvider({ children }) {
  const [handler, setHandler] = useState(null);
  const [exportLabel, setExportLabel] = useState('Export');

  const registerExport = useCallback((fn, label = 'Export') => {
    setHandler(() => fn);
    setExportLabel(label);
    return () => {
      setHandler(null);
      setExportLabel('Export');
    };
  }, []);

  const value = useMemo(
    () => ({ handler, exportLabel, registerExport }),
    [handler, exportLabel, registerExport],
  );

  return (
    <DashboardExportContext.Provider value={value}>
      {children}
    </DashboardExportContext.Provider>
  );
}

export function useDashboardExport() {
  const ctx = useContext(DashboardExportContext);
  if (!ctx) throw new Error('useDashboardExport must be used within DashboardExportProvider');
  return ctx;
}
