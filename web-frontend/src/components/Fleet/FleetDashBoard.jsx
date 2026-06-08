import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useLoadScript } from "@react-google-maps/api";

import Navbar from "../Navbar";
import { fetchTrips, fetchFleetEmployees } from "../../utils/api";
import MapView from "./MapView";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";

import "./FleetDashBoard.css";

// Per-status base colors (used as fallback)
const STATUS_COLORS = {
  moving:    "#22c55e",
  idle:      "#facc15",
  stopped:   "#9ca3af",
  scheduled: "#10b981",
};

// Distinct palette for trips on the SAME vehicle so they don't clash
const TRIP_PALETTE = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

export default function FleetDashboard() {
  const { id } = useParams();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: ["places"],
  });

  const [trips, setTrips]               = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("ALL");
  const [selectedTrip, setSelectedTrip] = useState(null); // tripId string or null

  // ============================================
  // NAVBAR USER DATA & LOGOUT LOGIC
  // ============================================
  const userStr = localStorage.getItem("user") || localStorage.getItem("userData");
  let parsedUser = null;

  try {
      if (userStr) {
          parsedUser = JSON.parse(userStr);
          if (parsedUser && parsedUser.user) {
              parsedUser = parsedUser.user;
          }
      }
  } catch (error) {
      console.error("Could not parse user data from localStorage", error);
  }

  const getInitials = (name) => {
    if (!name) return "CU";
    const parts = name.split(' ');
    // If there is more than one word, take the first letter of the first two words (e.g., Velora Test -> VT)
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    // If it's just one word, take the first two letters
    return name.substring(0, 2).toUpperCase();
  };

  const finalUserName = parsedUser?.name || 'Company User';

  const displayUser = {
    name: finalUserName,
    role: parsedUser?.role || 'Company Admin',
    initials: getInitials(finalUserName) // <--- Use the helper here
  };

  const handleLogout = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userData");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("sessionToken"); 
      
      window.location.href = "/";
  };
  // ============================================

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await fetchTrips(id);
        console.log("Fetched trips:", data);
        setTrips(data || []);
      } catch (err) {
        console.error("Error fetching trips:", err);
        setTrips([]);
      }
    };
    load();
  }, [id]);

  // Company HQ location
  const companyLocation = useMemo(() => {
    if (trips.length > 0 && trips[0]?.fleet?.destination?.coordinates) {
      const [lng, lat] = trips[0].fleet.destination.coordinates;
      return { lat, lng };
    }
    return null;
  }, [trips]);

  // Build vehiclesMap: vehicleId → { ...vehicle, trips: [...] }
  // Each trip gets a UNIQUE color within its vehicle using TRIP_PALETTE
  const vehiclesMap = useMemo(() => {
    const map = {};

    trips.forEach((trip) => {
      const vehicleId = trip.vehicle?._id;
      if (!vehicleId) return;

      if (!map[vehicleId]) {
        map[vehicleId] = {
          id:     vehicleId,
          name:   trip.vehicle?.vehicleId || `Vehicle ${vehicleId.slice(-4)}`,
          status: trip.status || "scheduled",
          trips:  [],
        };
      }

      // Index within THIS vehicle's trips → pick palette color
      const tripIndex = map[vehicleId].trips.length;
      const tripColor = TRIP_PALETTE[tripIndex % TRIP_PALETTE.length];

      const employees = (trip.stops || [])
        .filter((s) => s.employee && s.location?.coordinates)
        .map((s) => {
          const [lng, lat] = s.location.coordinates;
          return {
            id:         s.employee._id,
            name:       s.employee.name || s.employee.employeeId || "Unknown",
            employeeId: s.employee.employeeId,
            lat,
            lng,
          };
        });

      map[vehicleId].trips.push({
        tripId:        trip._id,           // ← unique identifier
        status:        trip.status || "scheduled",
        color:         tripColor,           // ← unique per-trip color
        initialLocation: trip.initialLocation || null,
        stops:         trip.stops || [],
        employees,
        startTime:     trip.startTime     || null,
        endTime:       trip.endTime       || null,
        totalDistance: trip.totalDistance ?? null,
      });
    });

    return map;
  }, [trips]);

  const allVehicles = useMemo(() => Object.values(vehiclesMap), [vehiclesMap]);

  // Vehicles visible in left sidebar
  const visibleVehicles = useMemo(
    () =>
      selectedVehicle === "ALL"
        ? allVehicles
        : allVehicles.filter((v) => v.id === selectedVehicle),
    [allVehicles, selectedVehicle]
  );

  // Routes passed to MapView
  // Key rule: always use tripId (NOT vehicleId) as the unique route key
  const routes = useMemo(() => {
    const result = [];

    visibleVehicles.forEach((v) => {
      v.trips.forEach((t) => {
        // If a specific trip is selected, skip all others
        if (selectedTrip !== null && t.tripId !== selectedTrip) return;

        result.push({
          // Use tripId as the unique key — fixes the DirectionsService key collision
          routeKey:    `route-${t.tripId}`,
          vehicle:     v.id,
          tripId:      t.tripId,
          vehicleName: v.name,
          status:      t.status,
          color:       t.color,
          initialLocation: t.initialLocation,
          stops:       t.stops,
          employees:   t.employees,
        });
      });
    });

    return result;
  }, [visibleVehicles, selectedTrip]);

  const handleVehicleSelect = (vehicleId) => {
    setSelectedVehicle(vehicleId);
    setSelectedTrip(null); // clear trip filter when switching vehicle
  };

  const handleTripSelect = (tripId) => {
    // Toggle: clicking the active trip deselects it → show all again
    setSelectedTrip((prev) => (prev === tripId ? null : tripId));
  };

  if (loadError) {
    return (
      <div className="dashboard-root">
        <Navbar mode="dashboard" userData={displayUser} onLogout={handleLogout} />
        <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>
          Error loading Google Maps
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="dashboard-root">
        <Navbar mode="dashboard" userData={displayUser} onLogout={handleLogout} />
        <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
          Loading map…
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      <Navbar mode="dashboard" userData={displayUser} onLogout={handleLogout} />

      <div className="dashboard-container">
        <LeftSidebar
          vehicles={visibleVehicles}
          selectedVehicle={selectedVehicle}
          selectedTrip={selectedTrip}
          onSelectVehicle={handleVehicleSelect}
          onSelectTrip={handleTripSelect}
        />

        <div className="map-wrapper">
          <MapView routes={routes} companyLocation={companyLocation} />
        </div>

        <RightSidebar
          vehicles={allVehicles}
          selectedVehicle={selectedVehicle}
          onSelect={handleVehicleSelect}
        />
      </div>
    </div>
  );
}