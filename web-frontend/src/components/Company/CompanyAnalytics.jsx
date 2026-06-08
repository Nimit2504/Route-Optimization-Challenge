import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '../Navbar';
import StatCard from '../common/StatCard';
import api from '../../utils/api';
import { 
    IconBuilding, 
    IconUsers, 
    IconCar,
    IconClock,
    IconCurrency,
    IconChevronDown, 
    IconChevronUp,
    IconGasPump,
    IconSpeedometer,
    IconRoad,
    IconSeat,
    IconCalendar
} from '../icons';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell 
} from 'recharts';
import './CompanyAnalytics.css';

const CompanyAnalytics = () => {
    // Component State
    const [expandedRows, setExpandedRows] = useState({});
    const [fleets, setFleets] = useState([]);
    const [vehicleStats, setVehicleStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        totalSavings: 0,
        totalCost: 0,
        totalBaseCost: 0,
        costSavedPct: 0,
        totalTimeSavedMin: 0,
        totalTimeTakenMin: 0,
        timeSavedPct: 0,
        totalFleets: 0
    });

    // Helper to format currency
    const fmtMoney = (val) => `Rs. ${Number(val).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;

    // Helper to format minutes → "Xh Ym"
    const fmtTime = (mins) => {
        const m = Math.round(Number(mins) || 0);
        if (m < 60) return `${m} min`;
        return `${Math.floor(m / 60)}h ${m % 60}m`;
    };

    // Navbar props
    const userRole = localStorage.getItem("userRole");
    const companyId = localStorage.getItem("userId");
    
    // User data management
    const [companyName, setCompanyName] = useState("Company");

    useEffect(() => {
        if (companyId) {
            api.get(`/company/dashboard/${companyId}`)
                .then(res => {
                    const data = res.data.data || res.data;
                    if (data && data.company && data.company.name) {
                        setCompanyName(data.company.name);
                    }
                })
                .catch(err => console.error("Failed to fetch company name:", err));
        }
    }, [companyId]);

    // 1. Fetch and parse user data from localStorage
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

    // 2. Define the helper function for initials
    const getInitials = (name) => {
        if (!name) return "CU";
        const parts = name.split(' ');
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // 3. Set the final variables
    const finalUserName = parsedUser?.name || companyName || 'Company User';

    // 4. Build the object for the Navbar
    const displayUser = {
        name: finalUserName,
        role: parsedUser?.role || 'Company Admin',
        initials: getInitials(finalUserName) 
    };

    const handleLogout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
    }, []);

    const toggleRow = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const fetchAnalyticsData = useCallback(async () => {
        try {
            setLoading(true);
            const companyId = localStorage.getItem("userId");
            if (!companyId) return;

            // 1. Fetch Fleets first
            const fleetsRes = await api.get(`/fleet`, { params: { company: companyId } });
            const rawFleets = Array.isArray(fleetsRes.data) ? fleetsRes.data : (fleetsRes.data.fleets || []);

            // 2. Fetch Trips for each fleet individually to ensure we get all data
            const fleetsWithTrips = await Promise.all(rawFleets.map(async (fleet) => {
                try {
                    const tripsRes = await api.get(`/trip`, { params: { fleet: fleet._id } });
                    const trips = tripsRes.data.trips || (Array.isArray(tripsRes.data) ? tripsRes.data : []) || [];
                    
                    return {
                        ...fleet,
                        fetchedTrips: trips
                    };
                } catch (err) {
                    console.error(`Failed to fetch trips for fleet ${fleet._id}`, err);
                    return { ...fleet, fetchedTrips: [] };
                }
            }));
            
            console.log("Analytics Data Fetched:", fleetsWithTrips);

            // Fetch Vehicle Stats
            try {
                const vehicleRes = await api.get('/vehicle', { params: { company: companyId } });
                const vehicleData = vehicleRes.data.metrics || vehicleRes.data.data?.metrics || vehicleRes.data;
                if (vehicleData && vehicleData.metrics) {
                     setVehicleStats(vehicleData.metrics);
                } else if (vehicleData.totalVehicles !== undefined) {
                     // Assume the response structure is flattened or metrics is at top level
                     setVehicleStats(vehicleData);
                } else if (vehicleRes.data.metrics) {
                    setVehicleStats(vehicleRes.data.metrics);
                }
            } catch (err) {
                console.error("Failed to fetch vehicle stats:", err);
            }

            // Process Data
            const processedFleets = fleetsWithTrips.map(fleet => {
                const fleetTrips = fleet.fetchedTrips;
                const metrics = fleet.metrics || {};

                // New Logic: Use Fleet Metrics for Totals
                const totalOptimizedCost = Number(metrics.optimized_cost) || 0;
                const totalBaseCost = Number(metrics.base_cost) || 0;
                const fleetCostSaved = Math.max(0, totalBaseCost - totalOptimizedCost);

                const totalOptimizedTime = Number(metrics.optimized_time_min) || 0;
                const totalBaseTime = Number(metrics.base_time_min) || 0;
                const fleetTimeSaved = Math.max(0, totalBaseTime - totalOptimizedTime);

                // Calculate total distances from trips to apportion costs
                const totalTripDistance = fleetTrips.reduce((acc, t) => acc + (Number(t.totalDistance) || 0), 0);
                const totalTripOldDistance = fleetTrips.reduce((acc, t) => acc + (Number(t.oldDistance) || Number(t.totalDistance) || 0), 0); // Fallback if oldDistance missing

                const uniqueVehicles = new Set(fleetTrips.map(t => t.vehicle?.vehicleId || t.vehicle?._id).filter(Boolean));
                const uniqueEmployees = new Set();
                fleetTrips.forEach(t => {
                   t.stops?.forEach(s => {
                       if (s.employee) uniqueEmployees.add(s.employee);
                   });
                });
                
                // Calculate per-km cost rate from fleet totals to predict trip costs
                // Prevent division by zero
                const costPerKm = totalTripDistance > 0 ? (totalOptimizedCost / totalTripDistance) : 0;
                const baseCostPerKm = totalTripOldDistance > 0 ? (totalBaseCost / totalTripOldDistance) : 0;

                return {
                    id: fleet._id,
                    name: fleet.name || `Fleet ${fleet.fleetId ? fleet.fleetId.substring(fleet.fleetId.length - 4) : (fleet._id ? fleet._id.substring(fleet._id.length - 4) : 'Unknown')}`,
                    totalDistance: `${totalTripDistance.toFixed(1)} km`,
                    totalCost: totalOptimizedCost,
                    baseCost: totalBaseCost,
                    costSaved: fleetCostSaved,
                    costSavedPct: Number(metrics.cost_savings_pct) || (totalBaseCost > 0 ? (fleetCostSaved / totalBaseCost) * 100 : 0),
                    timeSaved: fleetTimeSaved,
                    timeSavedPct: Number(metrics.time_savings_pct) || (totalBaseTime > 0 ? (fleetTimeSaved / totalBaseTime) * 100 : 0),
                    baseTimeMin: totalBaseTime,
                    optimizedTimeMin: totalOptimizedTime,
                    employees: fleet.employees?.length || uniqueEmployees.size || 0,
                    vehicles: fleet.vehicles?.length || uniqueVehicles.size || 0,
                    // Map trips to specific view model
                    trips: fleetTrips.map(t => {
                        const tDist = Number(t.totalDistance) || 0;
                        const tOldDist = Number(t.oldDistance) || tDist; // Fallback to current distance if no old
                        
                        // Predict trip cost based on proportion
                        const predictedCost = tDist * costPerKm;
                        const predictedBaseCost = tOldDist * baseCostPerKm;
                        const predictedSavings = Math.max(0, predictedBaseCost - predictedCost);

                        return {
                            id: t._id,
                            route: `Trip ${t._id.substring(t._id.length - 4)}`,
                            distance: `${tDist.toFixed(1)} km`,
                            vehicles: 1, 
                            employees: t.stops?.filter(s => s.stopType === 'pickup').length || 0,
                            cost: `Rs. ${predictedCost.toFixed(2)}`,
                            saved: `Rs. ${predictedSavings.toFixed(2)}`
                        };
                    })
                };
            });

            setFleets(processedFleets);

            // Calculate Company-wide Summaries - aggregating from processed results
            const globalTotalCost = processedFleets.reduce((acc, f) => acc + f.totalCost, 0);
            const globalBaseCost = processedFleets.reduce((acc, f) => acc + f.baseCost, 0);
            const globalSavings = processedFleets.reduce((acc, f) => acc + f.costSaved, 0);
            const globalCostSavedPct = globalBaseCost > 0 ? (globalSavings / globalBaseCost) * 100 : 0;

            const globalTimeSavedMin = processedFleets.reduce((acc, f) => acc + f.timeSaved, 0);
            const globalTimeTakenMin = processedFleets.reduce((acc, f) => acc + f.optimizedTimeMin, 0);
            const globalBaseTimeMin = processedFleets.reduce((acc, f) => acc + f.baseTimeMin, 0);
            const globalTimeSavedPct = globalBaseTimeMin > 0 ? (globalTimeSavedMin / globalBaseTimeMin) * 100 : 0;

            setSummary({
                totalSavings: globalSavings,
                totalCost: globalTotalCost,
                totalBaseCost: globalBaseCost,
                costSavedPct: globalCostSavedPct,
                totalTimeSavedMin: globalTimeSavedMin,
                totalTimeTakenMin: globalTimeTakenMin,
                timeSavedPct: globalTimeSavedPct,
                totalFleets: processedFleets.length
            });

        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalyticsData();
    }, [fetchAnalyticsData]);

    const costData = useMemo(() => {
        return fleets.map(f => ({
            name: f.name,
            Cost: f.totalCost,
            Savings: f.costSaved
        }));
    }, [fleets]);

    const distanceData = useMemo(() => {
        return fleets.map(f => ({
            name: f.name,
            value: parseFloat(f.totalDistance)
        })).filter(d => d.value > 0);
    }, [fleets]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="company-dashboard-container analytics-page">
            <Navbar mode="dashboard" userData={displayUser} onLogout={handleLogout} />

            <div className="main-content">
                <header className="page-header">
                    <div className="header-title">
                        <h1>Analytics Overview</h1>
                        <p>Track fleet efficiency and cost savings</p>
                    </div>
                </header>

                {/* Cost Overview */}
                <div className="metric-section">
                    <div className="metric-section-header">
                        <div className="metric-section-dot" style={{ background: '#10b981' }} />
                        <span className="metric-section-title">Cost Overview</span>
                        <div className="metric-section-line" />
                    </div>
                    <div className="metric-cards-grid">
                        <div className="metric-card mc-green">
                            <div className="metric-card-top">
                                <span className="metric-card-label">Total Cost Saved</span>
                                <div className="metric-card-icon"><IconCurrency /></div>
                            </div>
                            <div className="metric-card-value">{fmtMoney(summary.totalSavings)}</div>
                        </div>
                        <div className="metric-card mc-blue">
                            <div className="metric-card-top">
                                <span className="metric-card-label">Total Optimized Cost</span>
                                <div className="metric-card-icon"><IconCurrency /></div>
                            </div>
                            <div className="metric-card-value">{fmtMoney(summary.totalCost)}</div>
                        </div>
                        <div className="metric-card mc-purple">
                            <div className="metric-card-top">
                                <span className="metric-card-label">Total Baseline Cost</span>
                                <div className="metric-card-icon"><IconCurrency /></div>
                            </div>
                            <div className="metric-card-value">{fmtMoney(summary.totalBaseCost)}</div>
                        </div>
                        <div className="metric-card mc-amber">
                            <div className="metric-card-top">
                                <span className="metric-card-label">Cost Saved</span>
                                <div className="metric-card-icon"><IconCurrency /></div>
                            </div>
                            <div className="metric-card-value">{summary.costSavedPct.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                {/* Time Overview */}
                <div className="metric-section">
                    <div className="metric-section-header">
                        <div className="metric-section-dot" style={{ background: '#3b82f6' }} />
                        <span className="metric-section-title">Time Overview</span>
                        <div className="metric-section-line" />
                    </div>
                    <div className="metric-cards-grid">
                        <div className="metric-card mc-green">
                            <div className="metric-card-top">
                                <span className="metric-card-label">Total Time Saved</span>
                                <div className="metric-card-icon"><IconClock /></div>
                            </div>
                            <div className="metric-card-value">{fmtTime(summary.totalTimeSavedMin)}</div>
                        </div>
                        <div className="metric-card mc-blue">
                            <div className="metric-card-top">
                                <span className="metric-card-label">Total Time Taken</span>
                                <div className="metric-card-icon"><IconClock /></div>
                            </div>
                            <div className="metric-card-value">{fmtTime(summary.totalTimeTakenMin)}</div>
                        </div>
                        <div className="metric-card mc-amber">
                            <div className="metric-card-top">
                                <span className="metric-card-label">Time Saved</span>
                                <div className="metric-card-icon"><IconClock /></div>
                            </div>
                            <div className="metric-card-value">{summary.timeSavedPct.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="analytics-charts-grid">
                    <div className="chart-card">
                        <h3>Cost Efficiency per Fleet</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={costData} margin={{top: 20, right: 30, left: 0, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false}/>
                                    <XAxis dataKey="name" stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `Rs. ${val}`} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', fontSize: '12px', padding: '4px 8px'}}
                                        itemStyle={{padding: 0}}
                                        formatter={(val) => `Rs. ${val}`}
                                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    />
                                    <Legend wrapperStyle={{paddingTop: '20px', fontSize: '12px'}} />
                                    <Bar dataKey="Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="Savings" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-card">
                        <h3>Distance Per Fleet (km)</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart 
                                    layout="vertical"
                                    data={distanceData} 
                                    margin={{top: 20, right: 30, left: 10, bottom: 5}}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false}/>
                                    <XAxis type="number" stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} width={80} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', fontSize: '12px', padding: '4px 8px'}}
                                        formatter={(val) => `${val.toFixed(1)} km`}
                                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    />
                                    <Bar dataKey="value" name="Distance" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                        {distanceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Vehicle Analytics Section */}
                {vehicleStats && (
                    <div style={{ marginBottom: '3rem' }}>
                        <div className="analytics-header">
                            <h1>Vehicle Overview</h1>
                            <p>Fleet composition and efficiency metrics</p>
                        </div>

                        <div className="analytics-charts-grid" style={{ gridTemplateColumns: '1fr', gap: '2rem' }}>
                            <div className="vehicle-content-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}> 
                                {/* 1. Stats Grid */}
                                <div className="vehicle-stats-grid">
                                    <StatCard 
                                        icon={IconCar} 
                                        label="Total Vehicles" 
                                        value={vehicleStats.totalVehicles} 
                                        type="fleets" 
                                    />
                                    <StatCard 
                                        icon={IconSeat} 
                                        label="Avg Seats" 
                                        value={Math.round(vehicleStats.averageSeatingCapacity || 0)} 
                                        type="time" 
                                    />
                                    <StatCard 
                                        icon={IconRoad} 
                                        label="Avg Cost/Km" 
                                        value={`Rs. ${Number(vehicleStats.averageCostPerKm || 0).toFixed(1)}`} 
                                        type="savings" 
                                    />
                                    <StatCard 
                                        icon={IconSpeedometer} 
                                        label="Avg Speed" 
                                        value={`${Number(vehicleStats.averageSpeed || 0).toFixed(1)} km/h`} 
                                        type="time" 
                                    />
                                </div>

                                {/* 2. Fuel Type Distribution Chart (Replaces Vehicle Types) */}
                                {vehicleStats.fuelTypeDistribution && (
                                <div className="chart-card" style={{ flex: '1 1 400px', minHeight: '350px' }}>
                                    <h3>Fuel Type Distribution</h3>
                                    <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                            <BarChart 
                                                layout="vertical"
                                                data={Object.entries(vehicleStats.fuelTypeDistribution || {}).map(([name, value]) => ({ name, value }))} 
                                                margin={{top: 20, right: 30, left: 0, bottom: 5}}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false}/>
                                                <XAxis type="number" stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} />
                                                <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} width={100} />
                                                <Tooltip 
                                                    contentStyle={{backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', fontSize: '12px'}}
                                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                                />
                                                <Bar dataKey="value" name="Vehicles" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                                     {Object.entries(vehicleStats.fuelTypeDistribution || {}).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Fleet Data Table */}
                <div className="fleets-table-container">
                    <div className="table-header-row">
                         <div className="section-title">
                            <IconBuilding width="20" height="20" /> Fleet Performance
                         </div>
                         <button className="export-btn" onClick={fetchAnalyticsData}>
                            Refresh Data
                         </button>
                    </div>
                    
                    {loading ? (
                        <div style={{padding: '2rem', textAlign: 'center', color: '#9ca3af'}}>Loading analytics data...</div>
                    ) : (
                    <table className="fleets-table analytics-table">
                        <thead>
                            <tr>
                                <th style={{width: '40px'}}></th>
                                <th>Fleet Name</th>
                                <th>Employees</th>
                                <th>Vehicles</th>
                                <th>Total Cost</th>
                                <th>Cost Saved</th>
                                <th>Cost Saved %</th>
                                <th>Time Saved %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fleets.map((fleet) => (
                                <React.Fragment key={fleet.id}>
                                    {/* Parent Fleet Row */}
                                    <tr className={`fleet-row ${expandedRows[fleet.id] ? 'expanded' : ''}`} onClick={() => toggleRow(fleet.id)}>
                                        <td className="expand-cell">
                                            {expandedRows[fleet.id] ? <IconChevronUp size={16}/> : <IconChevronDown size={16}/>}
                                        </td>
                                        <td className="font-medium">{fleet.name}</td>
                                        <td>{fleet.employees}</td>
                                        <td>{fleet.vehicles}</td>
                                        <td>{fmtMoney(fleet.totalCost)}</td>
                                        <td className="text-green-500 font-bold">{fmtMoney(fleet.costSaved)}</td>
                                        <td className="text-green-500">{fleet.costSavedPct.toFixed(1)}%</td>
                                        <td className="text-green-500">{fleet.timeSavedPct.toFixed(1)}%</td>
                                    </tr>
                                    
                                    {/* Expandable Child Row (Trips) */}
                                    {expandedRows[fleet.id] && (
                                        <tr className="details-row">
                                            <td colSpan="8" className="expanded-row-content">
                                                <div className="trips-detail-container">
                                                    <h4>Trip Details for {fleet.name}</h4>
                                                    {fleet.trips.length > 0 ? (
                                                    <table className="trips-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Trip Route</th>
                                                                <th>Distance</th>
                                                                <th>Vehicles</th>
                                                                <th>Employees</th>
                                                                <th>Cost</th>
                                                                <th>Saved</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {fleet.trips.map(trip => (
                                                                <tr key={trip.id}>
                                                                    <td>{trip.route}</td>
                                                                    <td>{trip.distance}</td>
                                                                    <td>{trip.vehicles}</td>
                                                                    <td>{trip.employees}</td>
                                                                    <td>{trip.cost}</td>
                                                                    <td className="text-green-500">{trip.saved}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    ) : (
                                                        <p style={{color: '#9ca3af', fontStyle: 'italic', padding: '1rem'}}>
                                                            No trips recorded for this fleet.
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {fleets.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{textAlign: 'center', padding: '2rem', color: '#9ca3af'}}>
                                        No fleet data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyAnalytics;
