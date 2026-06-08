import React, { useEffect, useState } from "react";

// ── Reverse Geocode Cache ───────────────────────────────────────────────────
const geocodeCache = {};

async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache[key]) return geocodeCache[key];

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_API_KEY}`
    );
    const data = await res.json();

    if (data.status === "OK" && data.results.length > 0) {
      const components = data.results[0].address_components;

      const sublocality = components.find((c) =>
        c.types.includes("sublocality") || c.types.includes("sublocality_level_1")
      )?.long_name;

      const locality = components.find((c) =>
        c.types.includes("locality")
      )?.long_name;

      const neighborhood = components.find((c) =>
        c.types.includes("neighborhood")
      )?.long_name;

      const label =
        neighborhood ||
        sublocality ||
        locality ||
        data.results[0].formatted_address.split(",").slice(0, 2).join(",").trim();

      geocodeCache[key] = label;
      return label;
    }
  } catch (_) {}

  const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  geocodeCache[key] = fallback;
  return fallback;
}

// ── Rider Row ──────────────────────────────────────────────────────────────
function RiderRow({ employee, index }) {
  const [locationLabel, setLocationLabel] = useState("Locating...");

  useEffect(() => {
    let cancelled = false;
    reverseGeocode(employee.lat, employee.lng).then((label) => {
      if (!cancelled) setLocationLabel(label);
    });
    console.log(employee);
    return () => { cancelled = true; };
  }, [employee.lat, employee.lng]);

  return (
    <div className="rider-row">
      <div className="rider-avatar">{getInitials(employee.name)}</div>
      <div className="rider-info">
        <div className="rider-name">
          {employee.name && employee.name !== "Unknown Employee"
            ? employee.name
            : employee.employeeId || `Rider ${index + 1}`}
        </div>
        <div className="rider-location">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              width: 10,
              height: 10,
              marginRight: 3,
              flexShrink: 0,
              display: "inline-block",
              verticalAlign: "middle",
            }}
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          {locationLabel}
        </div>
      </div>
    </div>
  );
}

// ── Trip Card ──────────────────────────────────────────────────────────────
function TripCard({ trip, tripIndex, isSelected, onSelect, vehicleColor }) {
  const color = trip.color || vehicleColor || "#10b981";

  return (
    <div
      className={`trip-card ${isSelected ? "active" : ""}`}
      style={{ borderLeftColor: color }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(trip.tripId);
      }}
    >
      {/* Trip Header */}
      <div className="trip-card-header">
        <div className="trip-label">
          <div className="trip-dot" style={{ background: color }} />
          <span className="trip-name">Trip {tripIndex + 1}</span>
          {trip.startTime && (
            <span className="trip-time">{trip.startTime}</span>
          )}
        </div>

        <div className="trip-meta-right">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{
              width: 13,
              height: 13,
              color: "#6b7280",
              transform: isSelected ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              flexShrink: 0,
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Trip Stats */}
      {(trip.totalDistance != null || trip.employees.length > 0) && (
        <div className="trip-stats">
          {trip.employees.length > 0 && (
            <span className="trip-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              {trip.employees.length} rider{trip.employees.length !== 1 ? "s" : ""}
            </span>
          )}
          {trip.totalDistance != null && (
            <span className="trip-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
              {Number(trip.totalDistance).toFixed(1)} km
            </span>
          )}
        </div>
      )}

      {/* Expanded Employee List */}
      {isSelected && (
        <div style={{ marginTop: 10 }}>
          {trip.employees.length > 0 ? (
            <div className="riders-list">
              {trip.employees.map((e, idx) => (
                <RiderRow key={e.id || idx} employee={e} index={idx} />
              ))}
            </div>
          ) : (
            <div className="no-riders">No employees on this trip</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Left Sidebar ───────────────────────────────────────────────────────────
export default function LeftSidebar({
  vehicles,
  selectedVehicle,
  selectedTrip,
  onSelectVehicle,
  onSelectTrip,
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Active Vehicles & Riders
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
          <h4>No Active Vehicles</h4>
          <p>No vehicles with active routes found.</p>
        </div>
      ) : (
        vehicles.map((v) => (
          <div
            key={v.id}
            className={`vehicle-item ${selectedVehicle === v.id ? "active" : ""}`}
          >
            {/* Vehicle Header */}
            <div
              className="vehicle-top"
              style={{ cursor: "pointer" }}
              onClick={() =>
                onSelectVehicle(selectedVehicle === v.id ? "ALL" : v.id)
              }
            >
              <div className="vehicle-icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <div className="vehicle-details">
                <div className="vehicle-name">{v.name}</div>
                <span className={`vehicle-status ${v.status}`}>{v.status}</span>
              </div>
              <div className="vehicle-trip-count">
                {v.trips.length} trip{v.trips.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* All trips for this vehicle */}
            <div className="trips-list">
              {v.trips.map((t, idx) => (
                <TripCard
                  key={t.tripId}
                  trip={t}
                  tripIndex={idx}
                  isSelected={selectedTrip === t.tripId}
                  onSelect={onSelectTrip}
                  vehicleColor={v.color}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const getInitials = (name) => {
  if (!name) return "CU";
  const parts = name.split(' ');
  // If there is more than one word, take the first letter of the first two words (e.g., Velora Test -> VT)
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  // If it's just one word, take the first two letters
  return name.substring(0, 2).toUpperCase();
};