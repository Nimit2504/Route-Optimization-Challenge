import React from "react";

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onCenter,
  onToggleTraffic,
  showTraffic,
  routes,
}) {
  const statusCount = routes.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { moving: 0, idle: 0, stopped: 0, scheduled: 0 }
  );

  return (
    <>
      {/* Live Tracking Badge */}
      <div className="map-badge">
        <div className="pulse-dot" />
        Live Tracking
      </div>

      {/* Map Controls */}
      <div className="map-controls">
        <div className="map-controls-title">Controls</div>

        <button className="map-control-btn" onClick={onZoomIn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          Zoom In
        </button>

        <button className="map-control-btn" onClick={onZoomOut}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          Zoom Out
        </button>

        <button className="map-control-btn" onClick={onCenter}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="1" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="7.05" y2="7.05" />
            <line x1="16.95" y1="16.95" x2="19.78" y2="19.78" />
          </svg>
          Center Map
        </button>

        <button
          className={`map-control-btn ${showTraffic ? "active" : ""}`}
          onClick={onToggleTraffic}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="7" y="3" width="10" height="18" rx="2" />
            <circle cx="12" cy="8" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="16" r="1.5" fill="currentColor" />
          </svg>
          {showTraffic ? "Hide Traffic" : "Show Traffic"}
        </button>
      </div>

      {/* Map Legend */}
      <div className="map-legend">
        <div className="legend-item moving">
          <span className="legend-dot" /> Moving ({statusCount.moving})
        </div>
        <div className="legend-item idle">
          <span className="legend-dot" /> Idle ({statusCount.idle})
        </div>
        <div className="legend-item stopped">
          <span className="legend-dot" /> Stopped ({statusCount.stopped})
        </div>
        {statusCount.scheduled > 0 && (
          <div className="legend-item scheduled">
            <span className="legend-dot" /> Scheduled ({statusCount.scheduled})
          </div>
        )}
      </div>
    </>
  );
}