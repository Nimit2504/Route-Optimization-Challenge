import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { useJsApiLoader } from '@react-google-maps/api';
import './EmployeeLanding.css'; 
import api from '../../utils/api'; 
import { Bell, MapPin, Car, Building2, Briefcase, LogOut, Edit2 } from 'lucide-react';
import { formatExcelTime, calculateTimeLeft, daysOfWeek } from './DashboardUtils';
import EditableTimeWidget from './EditableTimeWidget'; 
import MapSection from './MapSection'; 

const libraries = ['places'];
const VeloraLogo = () => (
  <div className="velora-logo-icon">
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 4.5L12 21L20 4.5"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const Dashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate(); 
  const token = localStorage.getItem("token");
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries, 
  });

  const [activeFleet, setActiveFleet] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false); // Added loading state for API calls
  const [timeLeft, setTimeLeft] = useState(""); 
  const [locationName, setLocationName] = useState("Scanning Location...");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  
  // Edit Location States
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 12.9716, lng: 77.5946 }); 

  const initialCheckDone = useRef(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole"); 
    localStorage.removeItem("sessionToken");
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId && id !== storedId) navigate(`/employee/${storedId}`, { replace: true });
    if (!token) navigate("/login");
  }, [id, navigate, token]);

  useEffect(() => {
    if (!loading && !initialCheckDone.current) {
      initialCheckDone.current = true; 
      const now = new Date();
      if (selectedDay === now.getDay() && activeFleet?.preferences?.timeWindow?.startTime) {
        const timeStr = formatExcelTime(activeFleet.preferences.timeWindow.startTime);
        if (timeStr !== "--:--") {
          const [pickupHr, pickupMin] = timeStr.split(':').map(Number);
          const pickupTimeObj = new Date();
          pickupTimeObj.setHours(pickupHr, pickupMin, 0, 0);
          if (now > pickupTimeObj) {
            setSelectedDay((now.getDay() + 1) % 7);
          }
        }
      }
    }
  }, [loading, activeFleet, selectedDay]);

  // Fetch Employee Profile
  useEffect(() => {
    if (!id || !token) return;
    api.get(`/employee/profile/${id}`).then(res => {
      if (res.data?.success) setEmployeeData(res.data.employee);
    });
  }, [id, token]);

  // Fetch Fleets based on selected Day
  const fetchFleets = useCallback(() => {
    if (!id || !token) return;
    setLoading(true);
    const dayKey = daysOfWeek.find(d => d.value === selectedDay)?.key;
    api.get(`/employee/fleets/${id}/filter?days=${dayKey}`).then(res => {
      if (res.data?.success && res.data.assignments?.length > 0) setActiveFleet(res.data.assignments[0]);
      else setActiveFleet(null);
    }).finally(() => setLoading(false));
  }, [selectedDay, id, token]);

  useEffect(() => {
    fetchFleets();
  }, [fetchFleets]);

  // Fetch Current Trip Data to draw the route
  useEffect(() => {
    if (activeFleet?.fleet?._id && id && token) {
      api.get(`/trip?fleet=${activeFleet.fleet._id}&employee=${id}`)
        .then(response => {
            if (response.data?.success && response.data.trips.length > 0) {
                setCurrentTrip(response.data.trips[0]);
            } else {
                setCurrentTrip(null);
            }
        })
        .catch(err => console.error("Trip Fetch Error:", err));
    } else {
      setCurrentTrip(null);
    }
  }, [activeFleet, id, token]);

  // Timer Interval
  useEffect(() => {
    const timer = setInterval(() => {
      const timeStr = formatExcelTime(activeFleet?.preferences?.timeWindow?.startTime);
      if (timeStr !== "--:--") setTimeLeft(calculateTimeLeft(timeStr, selectedDay));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeFleet, selectedDay]);

  // Reverse Geocoding
  useEffect(() => {
    const lat = activeFleet?.preferences?.pickupLocation?.coordinates?.[1];
    const lng = activeFleet?.preferences?.pickupLocation?.coordinates?.[0];
    if (lat && lng) {
      if (!isEditingLocation) setMapCenter({ lat, lng });
      if (window.google) {
        new window.google.maps.Geocoder().geocode({ location: { lat, lng } }).then(res => {
          if (res.results[0]) setLocationName(res.results[0].formatted_address.split(',').slice(0, 2).join(',').trim());
        });
      }
    } else {
      setLocationName("No pickup assigned");
    }
  }, [activeFleet, isEditingLocation]);

  // --- ADDED: Dynamic Update Handler ---
  const handleDynamicUpdate = async (updateType, data) => {
    console.log("3. Dashboard received update! Type:", updateType, "Data:", data);

    if (!activeFleet || !employeeData) {
      console.error("4. Stopped: Missing data!");
      return;
    }

    setIsUpdating(true);

    const changes = {
      request_type: "UPDATE",
      employee_id: employeeData.employeeId 
    };

    if (updateType === "time") {
      changes.earliest_pickup = data; 
    } else if (updateType === "location") {
      changes.pickup_lat = data.lat;
      changes.pickup_lng = data.lng;
    }
    
    // Construct the payload manually
    const payload = {
      companyId: employeeData.company?._id || employeeData.company,
      fleetId: activeFleet.fleet._id,
      changes: changes
    };

    console.log("5. Reached Fetch call! Payload:", payload);

    try {
      // Using native fetch instead of api.post
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/dynamic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Manually include the token since we aren't using the axios interceptor
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      // Fetch doesn't throw on 404/500, we must check response.ok
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Dynamic update processed successfully:", result);
        if (updateType === "location") {
           setIsEditingLocation(false);
        }
        fetchFleets(); 
      }
    } catch (error) {
      console.error("Failed to process dynamic update:", error);
      alert(`Update failed: ${error.message}`);
    } finally {
      setIsUpdating(false); 
    }
  };

  return (
    <div className="cc-dashboard">
      {/* FULL SCREEN CAR LOADER */}
    {isUpdating && (
      <div className="loading-overlay">
        <div className="car-track">
          <div className="moving-car">
            <Car size={40} color="#10b981" fill="#10b981" />
          </div>
        </div>
        <div className="loading-text">Optimizing your ride...</div>
      </div>
    )}
      <nav className="cc-navbar">
        <div className="cc-brand">
          <VeloraLogo/>
          <span className="cc-brand-text">Velora</span>
        </div>
        <div className="cc-nav-links"><button className="cc-nav-item active">Dashboard</button></div>
        <div className="cc-nav-actions">
        <button onClick={handleLogout} className="ep-logout-btn" title="Logout">
            <LogOut size={24} />
          </button>
          <div className="cc-avatar-small" onClick={() => navigate(`/employee/profile/${id}`)} style={{ cursor: 'pointer' }}>
            <img src={`https://ui-avatars.com/api/?name=${employeeData?.name || 'User'}&background=10b981&color=fff`} alt="Profile" />
          </div>
        </div>
      </nav>

      <div className="cc-content">
        <div className="cc-top-row">
          <div className="cc-card cc-profile-card">
            <div className="cc-profile-left">
              <div className="cc-profile-img"><img src={`https://ui-avatars.com/api/?name=${employeeData?.name}&background=f43f5e&color=fff&size=64`} alt="User" /></div>
              <div className="cc-profile-text">
                <h3>{employeeData?.name || "Loading..."}</h3>
                <span className="cc-subtitle">{employeeData?.email || "..."}</span>
              </div>
            </div>
            <div className="cc-location-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} className="text-green" />
              <span>{isEditingLocation ? 'Select Location...' : locationName}</span>
              {!isEditingLocation && activeFleet && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditingLocation(true); }} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                  disabled={isUpdating}
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="cc-card cc-ride-card">
            <div className="cc-ride-header">
              <div className="cc-icon-circle"><Car size={24} /></div>
              <div className="cc-ride-info"><span className="cc-label">NEXT RIDE</span><div className="cc-ride-timer">{loading ? "..." : (activeFleet ? (timeLeft || "Ready") : "No Ride")}</div></div>
            </div>
          </div>
        </div>

        {/* MODULAR MAP COMPONENT */}
        <MapSection 
           isLoaded={isLoaded} 
           loadError={loadError} 
           isEditingLocation={isEditingLocation} 
           setIsEditingLocation={setIsEditingLocation}
           mapCenter={mapCenter}
           setMapCenter={setMapCenter}
           activeFleet={activeFleet}
           currentTrip={currentTrip}
           employeeId={id}
           onLocationUpdate={(newLocation) => handleDynamicUpdate("location", newLocation)} 
           isUpdating={isUpdating}
        />

        <div className="cc-widgets-row">
          <div className="cc-widget">
            <div className="cc-widget-header"><Briefcase size={18} className="text-green" /><span>Company</span></div>
            <div className="cc-widget-content"><span className="cc-value-bold">{employeeData?.company?.name || "..."}</span></div>
          </div>
          <div className="cc-widget">
            <div className="cc-widget-header"><Car size={18} className="text-yellow" /><span>Fleet ID</span></div>
            <div className="cc-widget-flex">
               <span className="cc-value-bold">{activeFleet?.fleet?.fleetId ? String(activeFleet.fleet.fleetId).slice(-4) : "None"}</span>
               {activeFleet && <span className="cc-status-badge">Active</span>}
            </div>
          </div>
          <div className="cc-widget wide">
            <div className="cc-widget-header"><Building2 size={18} className="text-green" /><span>Office Days</span></div>
            <div className="cc-days-row">
              {daysOfWeek.map(day => (
                <button key={day.value} onClick={() => setSelectedDay(day.value)} className={`cc-day-pill ${selectedDay === day.value ? 'active' : ''}`}>{day.label}</button>
              ))}
            </div>
          </div>

          {/* MODULAR TIME WIDGET */}
          <EditableTimeWidget 
             activeFleet={activeFleet} 
             employeeId={id} 
             onTimeUpdate={(newTime) => handleDynamicUpdate("time", newTime)}
             isUpdating={isUpdating}
          />

        </div>
      </div>
    </div>
  );
};

export default Dashboard;