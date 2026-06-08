import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

// Safe ID extraction utility
const extractId = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (val.$oid) return val.$oid;
    if (val._id) return val._id;
    if (val.id) return val.id;
    return String(val);
};

export const useReportData = (companyId) => {
    const [data, setData] = useState({
        fleet_summary: [],
        analytics: [],
        vehicles: [],
        employees: []
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (type) => {
        if (!companyId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            let result = [];
            
            if (type === 'fleet_summary') {
                // Fetch Fleets first
                const fleetsRes = await api.get(`/company/fleets/${companyId}`);
                const fleets = Array.isArray(fleetsRes.data) ? fleetsRes.data : (fleetsRes.data.fleets || []);

                result = await Promise.all(fleets.map(async f => {
                    const fId = extractId(f);
                    
                    // Vehicle Count Logic
                    let vCount = Array.isArray(f.vehicles) ? f.vehicles.length : 0;
                    // Always try to fetch accurate count if initial check is suspicious or explicitly requested
                    if (fId) {
                        try {
                            const vRes = await api.get(`/fleet/${fId}/vehicles`);
                            const fetchedCount = Array.isArray(vRes.data) ? vRes.data.length : (vRes.data.count || (vRes.data.vehicles?.length) || 0);
                            // Use the fetched count if it's available, otherwise fallback to existing
                             vCount = fetchedCount || vCount;
                        } catch (e) { /* ignore */ }
                    }

                    // Employee Count Logic - Explicit fetch per fleet using /fleet/:id/employees
                    let eCount = 0;
                    if (fId) {
                        try {
                            const eRes = await api.get(`/fleet/${fId}/employees`);
                            // Backend usually returns array of employees or object { employees: [...] }
                            if (Array.isArray(eRes.data)) {
                                eCount = eRes.data.length;
                            } else if (eRes.data && Array.isArray(eRes.data.employees)) {
                                eCount = eRes.data.employees.length;
                            } else if (typeof eRes.data.count === 'number') {
                                eCount = eRes.data.count;
                            }
                        } catch (e) { 
                            console.warn(`Failed to fetch employees for fleet ${fId}`, e);
                        }
                    }

                    const metrics = f.metrics || {};
                    const optimized = Number(metrics.optimized_cost) || 0;
                    const base = Number(metrics.base_cost) || 0;
                    
                    return {
                        name: f.name || `Fleet ${String(fId || '').slice(-4).toUpperCase()}`, 
                        vehicles: vCount,
                        employees: eCount,
                        total_cost: `Rs. ${optimized.toLocaleString()}`,
                        cost_saved: `Rs. ${Math.max(0, base - optimized).toLocaleString()}`,
                        time_saved: `${(Math.max(0, (Number(metrics.base_time_min) || 0) - (Number(metrics.optimized_time_min) || 0)) / 60).toFixed(1)} hrs`
                    };
                }));

            } else if (type === 'analytics') {
                // Trip Logs
                 /* ... existing analytics logic adapted ... */
                 // Fetch trips - API route usually /trip/ but filtered by company is tricky without direct endpoint
                 // Assuming trips are linked to fleets, we iterate fleets then trips? Or use trip search?
                 // The README says GET /trip/?fleet=<id>
                 
                 // Fetch fleets first
                 const fRes = await api.get(`/company/fleets/${companyId}`);
                 const fleets = Array.isArray(fRes.data) ? fRes.data : (fRes.data.fleets || []);
                 
                 // Parallel fetch trips for all fleets
                 const tripsArrays = await Promise.all(fleets.map(async f => {
                     try {
                         const fId = extractId(f);
                         if (!fId) return [];
                         const tRes = await api.get(`/trip?fleet=${fId}`);
                         return Array.isArray(tRes.data) ? tRes.data : (tRes.data.trips || []);
                     } catch { return []; }
                 }));
                 
                 const allTrips = tripsArrays.flat();
                 
                 result = allTrips.map(t => ({
                    trip_id: extractId(t).slice(-6).toUpperCase(),
                    optimised_dist: `${(Number(t.totalDistance) || 0).toFixed(1)} km`,
                    non_optimised_dist: `${(Number(t.oldDistance) || 0).toFixed(1)} km`,
                    duration: `${Math.round(Number(t.totalDuration) || 0)} min`,
                    working_days: (t.days || []).join(', ')
                 }));

            } else if (type === 'vehicles') {
                const res = await api.get(`/company/vehicles/${companyId}`);
                const vehicles = Array.isArray(res.data) ? res.data : (res.data.vehicles || []);
                result = vehicles.map(v => ({
                    // Removed extractId(v) to avoid long ObjectIDs
                    vehicle_id: (v.vehicleId || v.vehicleNumber || v.plateNumber || 'N/A').toUpperCase(),
                    fleet: v.fleet ? `FLEET-${extractId(v.fleet).slice(-4)}` : 'Unassigned',
                    type: v.vehicleType || 'Standard',
                    capacity: v.seatingCapacity || 0,
                    cost_per_km: `Rs. ${v.costPerKm || 0}`
                }));

            } else if (type === 'employees') {
                const res = await api.get(`/company/employees/${companyId}`);
                const emps = Array.isArray(res.data) ? res.data : (res.data.employees || []);
                
                // Simple mapping (count removed for performance as per request)
                result = emps.map(e => ({
                    employee_id: (e.employeeId || extractId(e) || 'N/A').slice(-6).toUpperCase(),
                    name: e.name || 'Unknown',
                    email: e.email || 'No Email'
                }));
            }

            setData(prev => ({ ...prev, [type]: result }));
            return result;
        } catch (err) {
            console.error("Report fetch failed:", err);
            setError(err);
            return [];
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    return { data, loading, error, fetchData };
};
