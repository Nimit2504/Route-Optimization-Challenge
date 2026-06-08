import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconMapPin, IconVehicleSmall } from '../icons';
import api from '../../utils/api';

const FleetRow = ({ fleet, weekDays, fetchDashboardData }) => {
    const navigate = useNavigate();
    const [vehicleCount, setVehicleCount] = useState(null);
    const idToUse = fleet._id || fleet.id;
    
    useEffect(() => {
        const fetchVehicles = async () => {
            if (!idToUse) return;

            try {
                // Determine if we need to prefix with /company or just /fleet based on API structure
                // User said: GET /fleet/:id/vehicles
                const res = await api.get(`/fleet/${idToUse}/vehicles`);
                // Handle if response is array or object with count
                const count = Array.isArray(res.data) ? res.data.length : (res.data.count || res.data.length || 0);
                setVehicleCount(count);
            } catch (error) {
                console.error("Failed to fetch vehicles for fleet", idToUse, error);
                setVehicleCount(0);
            }
        };

        fetchVehicles();
    }, [idToUse]);
    
    // Safety check for schedule, prevent error if undefined
    const scheduleArray = fleet.weekdays || fleet.schedule || [];
    const schedule = Array.isArray(scheduleArray) ? scheduleArray : [];
    
    let location = "N/A";
    if (fleet.destination && fleet.destination.coordinates) {
        const [long, lat] = fleet.destination.coordinates;
        location = `${lat.toFixed(4)}, ${long.toFixed(4)}`;
    } else if (fleet.location) {
        location = fleet.location;
    }

    // Format fleet ID as requested: FLEET-(last 4 digits)
    const displayId = `FLEET-${(idToUse || "UNKNOWN").slice(-4).toUpperCase()}`;

    const handleRowClick = () => {
        if (idToUse) {
            navigate(`/fleet/${idToUse}`);
        }
    };

    return (
        <tr className="fleet-row" onClick={handleRowClick} style={{ cursor: 'pointer' }}>
            <td className="fleet-id-cell">
                <span className="fleet-id-text">{displayId}</span>
                {fleet.name && <span className="fleet-name-sub"> {fleet.name}</span>}
            </td>
            <td>
                <div className="schedule-pills">
                    {(weekDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((day, idx) => (
                        <div
                            key={idx}
                            className={`day-pill ${schedule.includes(day) ? 'active' : ''}`}
                            title={day}
                        >
                            {day[0]}
                        </div>
                    ))}
                </div>
            </td>
            <td>
               <div className="location-cell">
                    <IconMapPin width="16" height="16" />
                    <span>{location}</span>
                </div>
            </td>
            <td >
                <div className="size-pill">
                    <IconVehicleSmall />
                    <span>
                        {vehicleCount !== null ? vehicleCount : "..."} vehicles
                    </span>
                </div>
            </td>
            <td style={{textAlign: 'right'}}>
                {/* Add a button to delete fleets */}
                <button className="delete-button  btn-danger btn-sm" onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Are you sure you want to delete this fleet? This action cannot be undone.")) {
                        api.delete(`/fleet/${idToUse}`)
                            .then(() => {
                                alert("Fleet deleted successfully.");
                                fetchDashboardData();
                            })
                            .catch((err) => {
                                console.error("Error deleting fleet:", err);
                                alert("Failed to delete fleet. Please try again.");
                            });
                             
                    }
                }}>
                    Delete
                </button> 
            </td>
        </tr>
    );
};

export default FleetRow;
