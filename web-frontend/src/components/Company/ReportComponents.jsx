// Helper to safely extract ID from string or object
export const safeId = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
        return obj._id || obj.id || obj.$oid || null;
    }
    return String(obj);
};

// Start to extract components
export const ReportCard = ({ type, isSelected, onClick }) => (
    <div 
        className={`report-card ${isSelected ? 'active' : ''}`}
        onClick={() => onClick(type.id)}
    >
        <div className="report-card-icon">
            <type.icon width="24" height="24" />
        </div>
        <div>
            <div className="report-card-title">{type.label}</div>
            <div className="report-card-desc">{type.desc}</div>
        </div>
    </div>
);

export const ReportConfig = ({ columns, allColumns, onToggle, onDownloadPDF, onDownloadCSV, isGenerating }) => (
    <div className="config-section">
        <div className="config-header">
            <div className="config-title">
                Report Configuration
            </div>
            <div className="action-bar report-actions">
                <button 
                    className="btn-download btn-pdf" 
                    onClick={onDownloadPDF}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <>
                             <span className="spinner-loader" style={{marginRight: '8px'}}></span>
                             Generat...
                        </>
                    ) : 'Download PDF'}
                </button>
                <div className="action-separator"></div>
                <button className="btn-download btn-csv" onClick={onDownloadCSV} disabled={isGenerating}>
                    Export CSV
                </button>
            </div>
        </div>

        <div className="column-selector">
            {allColumns.map(col => (
                <div 
                    key={col} 
                    className={`column-checkbox ${columns.has(col) ? 'checked' : ''}`}
                    onClick={() => onToggle(col)}
                >
                    <div className="checkbox-visual">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    {col.replace('_', ' ').toUpperCase()}
                </div>
            ))}
        </div>
    </div>
);

export const ReportTable = ({ data, columns, loading }) => (
    <div className="preview-container">
        <div className="preview-header">
            <span>Preview (First 5 rows)</span>
            <span>{data.length} total rows</span>
        </div>
        {loading ? (
            <div className="empty-preview">Loading data...</div>
        ) : data.length > 0 ? (
            <table className="data-table">
                <thead>
                    <tr>
                        {Array.from(columns).map(col => (
                            <th key={col}>{col.replace('_', ' ').toUpperCase()}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                            {Array.from(columns).map(col => (
                                <td key={col}>{row[col]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        ) : (
            <div className="empty-preview">No data available for this report type.</div>
        )}
    </div>
);
