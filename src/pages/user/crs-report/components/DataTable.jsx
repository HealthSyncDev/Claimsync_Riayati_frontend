
import React, { useState, useMemo, useEffect } from 'react';
import '../crs-report.css';

const DataTable = ({ columns, data, onRowClick, groupBy, loading }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        if (!data) return []; // Guard against null data
        let sortableItems = [...data];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    // Grouping Logic (Simplified)
    const groupedData = useMemo(() => {
        if (!groupBy) return { all: sortedData };
        return sortedData.reduce((groups, item) => {
            const groupKey = item[groupBy] || 'Other';
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
            return groups;
        }, {});
    }, [sortedData, groupBy]);

    // Columns are already filtered by parent
    const activeColumns = columns;

    return (
        <div className="data-table-container">
            <div className="table-toolbar">
                <div className="group-indicator">
                    {!loading && groupBy && <span className="badge">Grouped by: {groupBy}</span>}
                </div>
                {/* Column visibility managed by parent */}
            </div>

            <div className="table-scroll">
                <table className="data-table">
                    <thead>
                        <tr>
                            {activeColumns.map(col => (
                                <th key={col.id} onClick={() => handleSort(col.id)} className={sortConfig.key === col.id ? `sorted-${sortConfig.direction}` : ''}>
                                    {col.label} {sortConfig.key === col.id ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            // Skeleton Rows
                            [...Array(10)].map((_, rowIndex) => (
                                <tr key={`skeleton-${rowIndex}`}>
                                    {activeColumns.map((col, colIndex) => (
                                        <td key={`skg-${rowIndex}-${colIndex}`}>
                                            <div style={{
                                                height: '16px',
                                                background: '#e2e8f0',
                                                borderRadius: '4px',
                                                width: colIndex === 0 ? '40%' : '80%',
                                                animation: 'pulse 1.5s infinite ease-in-out'
                                            }}></div>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            // Use React.Fragment for groups or simple rows
                            Object.keys(groupedData).map(groupName => (
                                <React.Fragment key={groupName}>
                                    {groupBy && (
                                        <tr className="group-header">
                                            <td colSpan={activeColumns.length}>{groupBy === 'month' ? 'Month: ' : ''}{groupName} ({groupedData[groupName].length})</td>
                                        </tr>
                                    )}
                                    {groupedData[groupName].map((row, idx) => (
                                        <tr key={idx} onClick={() => onRowClick && onRowClick(row)} className={onRowClick ? 'clickable-row' : ''}>
                                            {activeColumns.map(col => (
                                                <td key={col.id}>
                                                    {col.render ? col.render(row[col.id], row) : row[col.id]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))
                        )}
                        {!loading && sortedData.length > 0 && (
                            <tr className="totals-row">
                                <td colSpan={activeColumns.length} style={{ textAlign: 'center' }}>End of Report</td>
                            </tr>
                        )}
                        {!loading && sortedData.length === 0 && (
                            <tr>
                                <td colSpan={activeColumns.length} style={{ textAlign: 'center', padding: '24px' }}>
                                    No records found matching current criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;
