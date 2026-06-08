import React from "react";

export default function RightSidebar({ vehicles, selectedVehicle, onSelect }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Fleet Overview
        </div>
      </div>

      <button
        className={`show-all-button ${selectedVehicle === "ALL" ? "active" : ""}`}
        onClick={() => onSelect("ALL")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Show All Vehicles
      </button>

      {vehicles.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h20" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <h4>No Fleet Data</h4>
          <p>No vehicles registered in the system.</p>
        </div>
      ) : (
        vehicles.map((v) => (
          <div
            key={v.id}
            className={`fleet-card ${selectedVehicle === v.id ? "active" : ""}`}
            onClick={() => onSelect(v.id)}
          >
            <div className="fleet-card-top">
              <div className="fleet-vehicle-name">{v.name}</div>
              <span className={`fleet-status ${v.status}`}>{v.status}</span>
            </div>

            {v.employees && v.employees.length > 0 && (
              <div className="fleet-riders-count">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {v.employees.length} {v.employees.length === 1 ? "rider" : "riders"}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}