import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, DirectionsService, DirectionsRenderer, Marker, Autocomplete } from '@react-google-maps/api';
import { Search, Settings, Navigation } from 'lucide-react';
// We no longer need 'api' imported here since Dashboard handles it, but you can leave it if used elsewhere.
import { 
  mapContainerStyle, lightMapStyle, getPinIcon, 
  USER_SVG, WAYPOINT_SVG, BUILDING_SVG 
} from './DashboardUtils';

const MapSection = ({ 
  isLoaded, 
  loadError, 
  isEditingLocation, 
  setIsEditingLocation, 
  mapCenter, 
  setMapCenter, 
  activeFleet, 
  currentTrip, 
  employeeId,
  // --- ADDED THESE PROPS ---
  onLocationUpdate,
  isUpdating
}) => {
  const mapWrapperRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [newLocation, setNewLocation] = useState(null);
  // Removed local isUpdatingLocation state; we'll use the isUpdating prop from Dashboard
  
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [directionsError, setDirectionsError] = useState(false);

  // --- Reset directions if the assigned trip changes ---
  useEffect(() => {
    setDirectionsResponse(null);
    setDirectionsError(false);
  }, [currentTrip]);

  // --- Click Outside Listener for Map ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isEditingLocation && mapWrapperRef.current && !mapWrapperRef.current.contains(event.target)) {
        if (!event.target.closest('.pac-container')) {
          setIsEditingLocation(false);
          setNewLocation(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditingLocation, setIsEditingLocation]);

  const handleMapClick = useCallback((e) => {
    if (!isEditingLocation) return;
    setNewLocation({
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    });
  }, [isEditingLocation]);

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setNewLocation({ lat, lng });
        setMapCenter({ lat, lng }); 
      }
    }
  };

  // --- CHANGED THIS FUNCTION ---
  const handleSaveLocation = () => {
    if (!newLocation) return;

    // Send the data up to Dashboard.js with the exact keys the dynamic API expects
    onLocationUpdate({
      lat: newLocation.lat,
      lng: newLocation.lng,
      pickup_lat: newLocation.lat, 
      pickup_lng: newLocation.lng
    });

    // Clear the local pin state. The Dashboard will handle closing the edit mode on success.
    setNewLocation(null);
  };

  const directionsCallback = useCallback((response) => {
    if (response !== null) {
      if (response.status === 'OK') {
        setDirectionsResponse(response);
        setDirectionsError(false);
      } else {
        console.error('Directions request failed due to ' + response.status);
        setDirectionsError(true); 
      }
    }
  }, []);

  const userLat = activeFleet?.preferences?.pickupLocation?.coordinates?.[1];
  const userLng = activeFleet?.preferences?.pickupLocation?.coordinates?.[0];

  const isUserLocation = (location) => {
    console.log('Comparing user location:', { userLat, userLng }, 'with', location);
    if (!userLat || !userLng || !location) return false;
    return location.lat === userLat && location.lng === userLng;
  };
 
  const routePoints = useMemo(() => {
     if (!currentTrip?.stops || currentTrip.stops.length < 2) return null;
     const stops = currentTrip.stops;
     return {
        origin: { lat: stops[0].location.coordinates[1], lng: stops[0].location.coordinates[0] },
        destination: { lat: stops[stops.length - 1].location.coordinates[1], lng: stops[stops.length - 1].location.coordinates[0] },
        waypoints: stops.slice(1, -1).map(stop => ({
            location: { lat: stop.location.coordinates[1], lng: stop.location.coordinates[0] },
            stopover: true
        }))
     };
  }, [currentTrip]);

  return (
    <div className="cc-map-wrapper" style={{ position: 'relative' }} ref={mapWrapperRef}>
      
      {isEditingLocation && (
        <div style={{
          position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
          background: '#1f2937', padding: '16px', borderRadius: '16px', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          color: 'white', border: '1px solid #374151', width: '90%', maxWidth: '420px'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
             <div style={{ flex: 1 }}>
               {isLoaded && (
                 <Autocomplete onLoad={(auto) => autocompleteRef.current = auto} onPlaceChanged={onPlaceChanged}>
                   <div style={{ display: 'flex', alignItems: 'center', background: '#111827', borderRadius: '8px', padding: '0 12px', border: '1px solid #4b5563' }}>
                     <Search size={16} color="#9ca3af" />
                     <input 
                       type="text" 
                       placeholder="Search location..." 
                       disabled={isUpdating} // Disable input while updating
                       style={{ background: 'transparent', border: 'none', color: 'white', padding: '12px 8px', width: '100%', outline: 'none', fontSize: '14px' }} 
                     />
                   </div>
                 </Autocomplete>
               )}
             </div>
           </div>

           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <span style={{ fontSize: '12px', color: '#9ca3af' }}>...or click anywhere on the map</span>
             <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleSaveLocation} 
                    // --- CHANGED THIS LINE TO USE isUpdating prop ---
                    disabled={isUpdating || !newLocation} 
                    style={{
                      background: '#10b981', color: '#000', border: 'none', padding: '6px 24px', 
                      borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
                      opacity: (!newLocation || isUpdating) ? 0.5 : 1
                    }}
                  >
                    {isUpdating ? 'Saving...' : 'OK'}
                  </button>
             </div>
           </div>
        </div>
      )}

      {!isEditingLocation && (
        <div className="cc-map-overlay-top">
          <div className="cc-live-badge">
            <span className="cc-dot"></span> Live Tracking
          </div>
        </div>
      )}
      
      <div className="cc-map-container">
        {loadError && (
           <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>Error loading Google Maps.</div>
        )}
        {!isLoaded ? (
           <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>Loading Map...</div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={12}
            center={mapCenter}
            onClick={isUpdating ? undefined : handleMapClick} // Prevent clicking while saving
            options={{
              styles: lightMapStyle,
              disableDefaultUI: true,
              zoomControl: true,
              draggableCursor: isEditingLocation ? 'crosshair' : 'grab',
            }}
          >
            {isEditingLocation && newLocation && window.google && (
              <Marker 
                position={newLocation} 
                icon={getPinIcon('USER', window.google.maps)}
                zIndex={20}
                animation={window.google.maps.Animation.DROP}
              />
            )}

            {!isEditingLocation && routePoints && !directionsResponse && !directionsError && (
              <DirectionsService
                options={{
                  destination: routePoints.destination,
                  origin: routePoints.origin,
                  waypoints: routePoints.waypoints,
                  travelMode: 'DRIVING'
                }}
                callback={directionsCallback}
              />
            )}

            {!isEditingLocation && directionsResponse && (
              <DirectionsRenderer
                options={{
                  directions: directionsResponse,
                  suppressMarkers: true,
                  polylineOptions: { strokeColor: "#34d399", strokeWeight: 6, strokeOpacity: 1 }
                }}
              />
            )}
            
            {!isEditingLocation && routePoints && window.google && (
                <>
                  <Marker position={routePoints.origin} icon={getPinIcon(isUserLocation(routePoints.origin) ? 'USER' : 'WAYPOINT', window.google.maps)} zIndex={10} />
                  <Marker position={routePoints.destination} icon={getPinIcon('BUILDING', window.google.maps)} zIndex={5} />
                  {routePoints.waypoints.map((wp, idx) => (
                    <Marker key={`wp-${idx}`} position={wp.location} icon={getPinIcon(isUserLocation(wp.location) ? 'USER' : 'WAYPOINT', window.google.maps)} zIndex={2} />
                  ))}
                </>
            )}
          </GoogleMap>
        )}
      </div>

      <div className="cc-map-controls">
         <button><Search size={18} /></button>
         <button><Settings size={18} /></button>
         <button><Navigation size={18} /></button>
      </div>

      {!isEditingLocation && (
        <div className="cc-map-legend" style={{ 
            display: 'flex', gap: '16px', background: '#1f2937', color: 'white', 
            padding: '10px 16px', borderRadius: '12px', alignItems: 'center', 
            fontSize: '13px', fontWeight: '500', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><img src={USER_SVG} alt="Pickup" style={{ width: '22px', height: '22px' }} />Your Pickup</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><img src={WAYPOINT_SVG} alt="Waypoint" style={{ width: '18px', height: '18px' }} />Waypoints</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><img src={BUILDING_SVG} alt="Office" style={{ width: '22px', height: '22px' }} />Office</div>
        </div>
      )}
    </div>
  );
};

export default MapSection;