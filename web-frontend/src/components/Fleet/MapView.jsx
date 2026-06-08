import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  InfoWindow,
  TrafficLayer,
} from "@react-google-maps/api";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import MapControls from "./MapControls";

const mapContainerStyle = { width: "100%", height: "100%" };

export default function MapView({ routes, companyLocation }) {
  const mapRef    = useRef(null);
  const hasFitted = useRef(false);

  const [directionsMap, setDirectionsMap] = useState({});
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showTraffic, setShowTraffic]       = useState(false);

  // Calculate the initial center dynamically
  // Priority: Company HQ -> Last Stop of First Route -> Start of First Route -> Default
  const initialCenter = useMemo(() => {
    if (companyLocation) return companyLocation;

    if (routes.length > 0) {
      const firstRoute = routes[0];
      // Try last stop (destination)
      if (firstRoute.stops?.length > 0) {
        const lastStop = firstRoute.stops[firstRoute.stops.length - 1];
        if (lastStop.location?.coordinates) {
          const [lng, lat] = lastStop.location.coordinates;
          return { lat, lng };
        }
      }
      // Try start location
      if (firstRoute.initialLocation?.coordinates) {
        const [lng, lat] = firstRoute.initialLocation.coordinates;
        return { lat, lng };
      }
    }
    
    // Should generally not reach here if data is valid, prevents crash
    return { lat: 0, lng: 0 }; 
  }, [companyLocation, routes]);

  // Clear cached directions whenever the active route set changes
  useEffect(() => {
    setDirectionsMap({});
    hasFitted.current = false;
  }, [routes.map((r) => r.routeKey).join(",")]);

  // Fit map bounds to all stops
  useEffect(() => {
    if (!mapRef.current || routes.length === 0 || hasFitted.current) return;

    const bounds = new window.google.maps.LatLngBounds();
    if (companyLocation) {
      bounds.extend(companyLocation);
    }

    let hasPoints = false;

    routes.forEach((r) => {
      if (r.initialLocation?.coordinates) {
        const [lng, lat] = r.initialLocation.coordinates;
        bounds.extend({ lat, lng });
        hasPoints = true;
      }
      r.stops?.forEach((stop) => {
        if (stop.location?.coordinates) {
          const [lng, lat] = stop.location.coordinates;
          bounds.extend({ lat, lng });
          hasPoints = true;
        }
      });
    });

    if (hasPoints || companyLocation) {
       mapRef.current.fitBounds(bounds, 60);
       hasFitted.current = true;
    }
  }, [routes, companyLocation]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const directionsCallback = useCallback((result, status, routeKey) => {
    if (status === "OK") {
      setDirectionsMap((prev) => {
        if (prev[routeKey]) return prev;
        return { ...prev, [routeKey]: result };
      });
    } else {
      console.warn(`Directions failed for ${routeKey}:`, status);
    }
  }, []);

  return (
    <div className="map-container">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={initialCenter}
        zoom={12}
        onLoad={onMapLoad}
        onClick={() => setSelectedMarker(null)}
        options={{
          disableDefaultUI: true,
          clickableIcons:   false,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        }}
      >
        {showTraffic && <TrafficLayer />}

        {/* ── Employee Stop Markers — plain colored dot only ────── */}
        {routes.flatMap((r) =>
          (r.stops || []).map((stop, idx) => {
            if (!stop.location?.coordinates) return null;
            const [lng, lat] = stop.location.coordinates;

            return (
              <Marker
                key={`${r.routeKey}-stop-${idx}`}
                position={{ lat, lng }}
                icon={{
                  path:         window.google.maps.SymbolPath.CIRCLE,
                  scale:        8,
                  fillColor:    r.color || "#10b981",
                  fillOpacity:  1,
                  strokeWeight: 2,
                  strokeColor:  "#ffffff",
                }}
                onClick={() =>
                  setSelectedMarker({
                    name:       stop.employee?.name || stop.employee?.employeeId || `Stop ${idx + 1}`,
                    lat,
                    lng,
                    vehicle:    r.vehicleName || "Unknown Vehicle",
                    stopNumber: idx + 1,
                    color:      r.color,
                  })
                }
              />
            );
          })
        )}

        {/* ── Info Window ──────────────────────────────────────── */}
        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div style={{ padding: "8px 4px", minWidth: 140 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                {selectedMarker.color && (
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: selectedMarker.color, flexShrink: 0,
                  }} />
                )}
                <strong style={{ fontSize: 14, color: "#0f172a" }}>
                  {selectedMarker.name}
                </strong>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{selectedMarker.vehicle}</div>
              {selectedMarker.stopNumber && (
                <div style={{ fontSize: 11, color: "#10b981", marginTop: 2 }}>
                  Stop #{selectedMarker.stopNumber}
                </div>
              )}
            </div>
          </InfoWindow>
        )}

        {/* ── Directions Service — keyed by tripId ─────────────── */}
        {routes.map((r) => {
          const { routeKey } = r;
          if (directionsMap[routeKey]) return null;
          if (!r.initialLocation?.coordinates) return null;
          if (!r.stops || r.stops.length === 0) return null;

          const waypoints = r.stops
            .filter((s) => s.location?.coordinates)
            .map((s) => {
              const [lng, lat] = s.location.coordinates;
              return { location: { lat, lng }, stopover: true };
            });

          if (waypoints.length === 0) return null;

          const [originLng, originLat] = r.initialLocation.coordinates;

          // If companyLocation is null (hardcoded point removed), use the last stop as destination
          let destination = companyLocation;
          let activeWaypoints = waypoints;

          if (!destination) {
             const lastStop = waypoints[waypoints.length - 1];
             destination = lastStop.location;
             // Remove the last waypoint so it doesn't double up as a waypoint AND destination
             activeWaypoints = waypoints.slice(0, -1);
          }

          return (
            <DirectionsService
              key={routeKey}
              options={{
                origin:            { lat: originLat, lng: originLng },
                destination:       destination,
                waypoints:         activeWaypoints,
                travelMode:        "DRIVING",
                optimizeWaypoints: false,
              }}
              callback={(result, status) => directionsCallback(result, status, routeKey)}
            />
          );
        })}

        {/* ── Directions Renderer — polyline only, no markers ───── */}
        {routes.map((r) => {
          const dir = directionsMap[r.routeKey];
          if (!dir) return null;

          return (
            <DirectionsRenderer
              key={`render-${r.routeKey}`}
              directions={dir}
              options={{
                suppressMarkers:  true,
                preserveViewport: true,
                polylineOptions: {
                  strokeColor:   r.color || "#10b981",
                  strokeWeight:  4,
                  strokeOpacity: 0.85,
                },
              }}
            />
          );
        })}
      </GoogleMap>

      <MapControls
        onZoomIn={() => mapRef.current?.setZoom(mapRef.current.getZoom() + 1)}
        onZoomOut={() => mapRef.current?.setZoom(mapRef.current.getZoom() - 1)}
        onCenter={() => {
          if (!mapRef.current) return;
          const bounds = new window.google.maps.LatLngBounds();
          
          let hasPoints = false;
          
          if (companyLocation?.lat !== undefined) {
             bounds.extend(companyLocation);
             hasPoints = true;
          }

          routes.forEach((r) => {
            if (r.initialLocation?.coordinates) {
               const [lng, lat] = r.initialLocation.coordinates;
               bounds.extend({ lat, lng });
               hasPoints = true;
            }
            r.stops?.forEach((s) => {
              if (s.location?.coordinates) {
                const [lng, lat] = s.location.coordinates;
                bounds.extend({ lat, lng });
                hasPoints = true;
              }
            });
          });

          if (hasPoints) {
            mapRef.current.fitBounds(bounds, 60);
          } else {
             // If no bounds could be calculated, use initial center
             mapRef.current.panTo(initialCenter);
          }
        }}
        onToggleTraffic={() => setShowTraffic((p) => !p)}
        showTraffic={showTraffic}
        routes={routes}
      />
    </div>
  );
}