import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useDashboardPageHeader } from '../context/DashboardPageHeaderContext';

/**
 * Mounts the export toolbar in the dashboard header immediately (useLayoutEffect).
 * On click, waits for live data then runs export — button is never hidden behind loading.
 */
export function useDashboardExportHeader({ year, Toolbar, canExport, runExport }) {
  const { setHeaderTrailing } = useDashboardPageHeader();
  const [exporting, setExporting] = useState(false);
  const canExportRef = useRef(canExport);
  const runExportRef = useRef(runExport);
  canExportRef.current = canExport;
  runExportRef.current = runExport;

  const waitForData = useCallback(async (timeoutMs = 60000) => {
    const start = Date.now();
    while (!canExportRef.current()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timed out waiting for dashboard data');
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 150);
      });
    }
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await waitForData();
      await runExportRef.current();
    } catch (err) {
      console.error('Dashboard export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [waitForData]);

  useLayoutEffect(() => {
    setHeaderTrailing?.(
      <Toolbar
        variant="header"
        year={year}
        onExport={handleExport}
        exporting={exporting}
      />,
    );
    return () => setHeaderTrailing?.(null);
  }, [setHeaderTrailing, year, handleExport, exporting, Toolbar]);

  return { exporting, handleExport };
}
