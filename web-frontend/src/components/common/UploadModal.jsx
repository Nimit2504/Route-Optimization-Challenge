import React from 'react';
import { IconClose, IconCreate, IconUpload, IconInfo } from '../icons';

const UploadModal = ({ 
    isOpen, 
    onClose, 
    fileName, 
    onFileUpload, 
    selectedDays = [], 
    onDayToggle,
    isHaversine = false,
    onHaversineToggle,
    onSubmit,
    isLoading 
}) => {
    if (!isOpen) return null;

    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="modal-overlay" onClick={!isLoading ? onClose : undefined}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <IconCreate /> Create New Fleet
                    </div>
                    {!isLoading && (
                        <button className="close-btn" onClick={onClose}>
                            <IconClose />
                        </button>
                    )}
                </div>
                <div className="modal-body">
                    <div className={`upload-area ${isLoading ? 'disabled' : ''}`}>
                        <input
                            type="file"
                            className="file-input"
                            accept=".xlsx, .xls, .csv"
                            onChange={onFileUpload}
                            disabled={isLoading}
                        />
                        <div className="upload-icon">
                            {isLoading ? (
                                <div className="spinner"></div>
                            ) : (
                                <IconUpload />
                            )}
                        </div>
                        <div className="upload-text">
                            {isLoading ? "Uploading..." : (fileName ? fileName : "Upload Fleet CSV")}
                        </div>
                        <div className="upload-subtext">
                            {isLoading ? "Please wait while we process your file" : (fileName ? "Click to change file" : "Drag and drop your CSV file, or click to browse")}
                        </div>
                        {!isLoading && (
                            <div className="upload-subtext" style={{ marginTop: '8px' }}>
                                Supports .csv files up to 10MB
                            </div>
                        )}
                    </div>

                    {fileName && !isLoading && (
                        <div className="days-selection">
                            <h4 style={{ margin: '16px 0 8px', fontSize: '14px', color: '#e4e4e7' }}>Active Operating Days</h4>
                            <div className="days-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {allDays.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => onDayToggle && onDayToggle(day)}
                                        className={`day-toggle ${selectedDays.includes(day) ? 'active' : ''}`}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #3f3f46',
                                            background: selectedDays.includes(day) ? '#10b981' : '#27272a',
                                            color: selectedDays.includes(day) ? '#fff' : '#a1a1aa',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>

                            {/* Haversine Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '14px', color: '#e4e4e7', fontWeight: 500 }}>Use Haversine Distance</span>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#71717a' }}>
                                        Calculate distances using straight-line (as the crow flies) formula
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onHaversineToggle}
                                    aria-pressed={isHaversine}
                                    style={{
                                        position: 'relative',
                                        width: '44px',
                                        height: '24px',
                                        borderRadius: '999px',
                                        border: 'none',
                                        background: isHaversine ? '#10b981' : '#3f3f46',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        transition: 'background 0.2s',
                                        padding: 0
                                    }}
                                >
                                    <span style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: isHaversine ? '23px' : '3px',
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: '#fff',
                                        transition: 'left 0.2s',
                                        display: 'block'
                                    }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {!isLoading && (
                        <div className="info-box" style={{ marginTop: '16px' }}>
                            <IconInfo style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <h4>CSV Format Guide</h4>
                                <p>Your CSV should include columns: Fleet ID, Office Location, Fleet Size</p>
                            </div>
                        </div>
                    )}

                    {fileName && !isLoading && onSubmit && (
                        <button 
                            className="submit-btn"
                            onClick={onSubmit}
                            style={{
                                width: '100%',
                                marginTop: '20px',
                                padding: '10px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Upload & Create Fleet
                        </button>
                    )}
                </div>
            </div>
            <style jsx>{`
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-radius: 50%;
                    border-top-color: #10b981;
                    animation: spin 1s ease-in-out infinite;
                    margin: 0 auto;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .upload-area.disabled {
                    opacity: 0.7;
                    pointer-events: none;
                }

                /* --- Added Responsiveness --- */
                @media (max-width: 768px) {
                    .modal-content {
                        width: 90%;
                        max-width: 500px;
                        margin: auto;
                        box-sizing: border-box;
                    }
                }

                @media (max-width: 480px) {
                    .modal-content {
                        width: 95%;
                        padding: 16px;
                    }
                    .upload-area {
                        padding: 20px 10px;
                    }
                    .days-container {
                        justify-content: space-between;
                    }
                    .day-toggle {
                        flex: 1 1 calc(25% - 8px); /* Makes buttons span 4 in a row, then 3 */
                        text-align: center;
                        padding: 8px 4px !important; /* Overrides inline padding for touch targets */
                        font-size: 12px !important;
                    }
                    .info-box {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                    }
                    .submit-btn {
                        padding: 14px !important; /* Larger touch target for mobile */
                        font-size: 15px;
                    }
                }
            `}</style>
        </div>
    );
};

export default UploadModal;