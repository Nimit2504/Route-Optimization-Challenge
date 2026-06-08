import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import './CompanyDashboard.css';
import Navbar from '../Navbar';
import StatCard from '../common/StatCard';
import UploadModal from '../common/UploadModal';
import FleetRow from '../dashboard/FleetRow';
import api from "../../utils/api";
import { 
    IconBuilding, 
    IconUsers, 
    IconMapPin, 
    IconCreate,
    IconCalendar,
    IconCar
} from '../icons';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell
} from 'recharts';

// ============================================
// CONSTANTS & DEFAULTS
// ============================================
const DEFAULT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_STATS = {
    totalFleets: 0,
    totalVehicles: 0,
    totalEmployees: 0
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// API call to create fleet
const createFleetAPI = async (file, companyId, days) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', companyId);
    formData.append('days', JSON.stringify(days));

    const response = await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

// ============================================
// MAIN COMPONENT
// ============================================

const CompanyDashboard = () => {  // Removed props destructuring as we use localStorage now
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Upload State
    const [fileName, setFileName] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedWeekDays, setSelectedWeekDays] = useState(DEFAULT_WEEKDAYS);
    const [isUploading, setIsUploading] = useState(false);
    const [isHaversine, setIsHaversine] = useState(false);

    const [fleets, setFleets] = useState([]);
    const [stats, setStats] = useState(DEFAULT_STATS);
    const [loading, setLoading] = useState(true);
    const [unassignedEmployees, setUnassignedEmployees] = useState([]);
    const [showUnassignedModal, setShowUnassignedModal] = useState(false);

    // Retrieve user data directly from localStorage
    const companyId = localStorage.getItem("userId");
    

    useEffect(() => {
        console.log("Dashboard loaded for companyId:", companyId);
        if (!companyId) {
            // Safety check: if no ID, force logout
            handleLogout();
        } else {
            fetchDashboardData();
        }
    }, [companyId]);

    const handleLogout = () => {
        // Clear all auth items
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
        localStorage.removeItem("userRole");
        localStorage.removeItem("sessionToken"); // Just in case
        
        // Redirect to landing
        navigate("/");
    };

    // Calculate Chart Data
    const chartData = useMemo(() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const counts = days.map(day => ({ day, count: 0 }));

        if (fleets && fleets.length > 0) {
            fleets.forEach(fleet => {
                const schedule = fleet.weekdays || fleet.schedule || [];
                if (Array.isArray(schedule)) {
                    schedule.forEach(d => {
                        const dayIndex = days.findIndex(day => day.startsWith(d.substring(0, 3)));
                        if (dayIndex !== -1) {
                            counts[dayIndex].count += 1;
                        }
                    });
                }
            });
        }
        return counts;
    }, [fleets]);

    const vehiclesPerFleetData = useMemo(() => {
        return fleets.map(f => ({
            name: f.name || `FLEET-${(f._id || f.id || "").slice(-4)}`,
            vehicles: f.vehicleCount || 0
        })).sort((a, b) => b.vehicles - a.vehicles).slice(0, 10); // Top 10 fleets
    }, [fleets]);

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

    // 2. Define the missing getInitials function BEFORE you use it
    const getInitials = (name) => {
        if (!name) return "CU";
        const parts = name.split(' ');
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // 3. Build the displayUser object
    const finalUserName = parsedUser?.name || companyName || 'Company User';
    
    const displayUser = {
        name: finalUserName,
        role: parsedUser?.role || 'Company Admin',
        initials: getInitials(finalUserName) 
    };

    const toggleModal = () => {
        if (!isModalOpen) {
            // About to open: reset state
            setFileName("");
            setSelectedFile(null);
            // Default to Mon-Fri for new fleets, but allow selecting Sat/Sun
            setSelectedWeekDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
            setIsUploading(false);
            setIsHaversine(false);
        }
        setIsModalOpen(!isModalOpen);
    };

    const fetchDashboardData = async () => {
        if (!companyId) return; // Prevent fetch if ID missing
        
        try {
            setLoading(true);
            console.log("Fetching data for Company ID:", companyId);
            
            // Parallel data fetching for efficiency
            const [dashboardRes, fleetsRes, employeesRes] = await Promise.all([
                api.get(`/company/dashboard/${companyId}`),
                api.get(`/company/fleets/${companyId}`),
                api.get(`/company/employees/${companyId}`).catch(err => ({ data: [] })) // Handle error gracefully
            ]);

            console.log("Dashboard Response:", dashboardRes.data);
            console.log("Fleets Response:", fleetsRes.data);
            
            // Calculate real employee count from the list
            let realEmployeeCount = 0;
            if (employeesRes.data) {
                if (Array.isArray(employeesRes.data)) {
                    realEmployeeCount = employeesRes.data.length;
                } else if (employeesRes.data.employees && Array.isArray(employeesRes.data.employees)) {
                    realEmployeeCount = employeesRes.data.employees.length;
                } else if (employeesRes.data.count) {
                    realEmployeeCount = employeesRes.data.count;
                }
            }

            // 1. Dashboard Stats & Recent Fleets
            if (dashboardRes.data) {
                const data = dashboardRes.data;
                console.log("Dashboard API Response:", data);

                // Use the 'stats' object directly if it exists, otherwise use root
                const statsData = data.data?.stats || data.stats || {};
                
                setStats({
                    totalFleets: statsData.totalFleets || 0,
                    totalVehicles: statsData.totalVehicles || 0,
                    totalEmployees: realEmployeeCount // Use the real count fetched from employees endpoint
                });

                // Set fleets from 'recentFleets' if available
                if (data.recentFleets && Array.isArray(data.recentFleets)) {
                    setFleets(data.recentFleets);
                }
            }

            // 2. All Fleets (if separate endpoint returns different data)
            if (fleetsRes.data) {
                 const fData = fleetsRes.data;
                 const fullFleets = Array.isArray(fData) ? fData : (fData.fleets || fData.recentFleets || []);
                 
                 // Always call setFleets — even with an empty array — so deleting the
                 // last fleet clears the stale state instead of leaving it on screen.
                 const enrichedFleets = await Promise.all(fullFleets.map(async (fleet) => {
                     if (fleet.vehicleCount !== undefined) return fleet;
                     try {
                         const vRes = await api.get(`/fleet/${fleet._id || fleet.id}/vehicles`);
                         const count = Array.isArray(vRes.data) ? vRes.data.length : (vRes.data.count || 0);
                         return { ...fleet, vehicleCount: count };
                     } catch (e) {
                         console.warn(`Failed to fetch vehicles for fleet ${fleet._id}`, e);
                         return { ...fleet, vehicleCount: 0 };
                     }
                 }));
                 setFleets(enrichedFleets);
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            // Fallback to dummy data only on error if needed, or show error state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch handled in main effect above
    }, [companyId]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setSelectedFile(file);
    };

    const handleDayToggle = (day) => {
        if (selectedWeekDays.includes(day)) {
            setSelectedWeekDays(selectedWeekDays.filter(d => d !== day));
        } else {
            setSelectedWeekDays([...selectedWeekDays, day]);
        }
    };

    const handleFleetSubmit = async () => {
        if (!selectedFile) return;

        try {
            setIsUploading(true);
            const days = selectedWeekDays;
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('companyId', companyId);
            formData.append('days', JSON.stringify(days));
            formData.append('isHaversine', isHaversine ? 'true' : 'false');

            const response = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const result = response.data;

            console.log('Server Response:', result);

            // Check for unassigned employees - show immediately
            if (result.optimizerResult?.unassigned && result.optimizerResult.unassigned.length > 0) {
                console.warn("Optimization incomplete: Unassigned employees found", result.optimizerResult.unassigned);
                setUnassignedEmployees(result.optimizerResult.unassigned);
                setShowUnassignedModal(true);
                // Close upload modal immediately if we showed a warning to avoid overlay stack issues
                setIsModalOpen(false);
            }

            // Refresh data and cleanup
            setTimeout(() => {
                if (!result.optimizerResult?.unassigned?.length) {
                    setIsModalOpen(false); // Only close if not already closed by warning logic
                }
                setFileName("");
                setSelectedFile(null);
                setSelectedWeekDays(DEFAULT_WEEKDAYS);
                setIsHaversine(false);
                setIsUploading(false);
                fetchDashboardData();
            }, 800);

        } catch (error) {
            console.error("Error processing file:", error);
            alert("Failed to upload fleet data");
            setIsUploading(false);
        }
    };

    return (
        <div className="company-dashboard-container">
            <Navbar mode="dashboard" userData={displayUser} onLogout={handleLogout} />

            <div className="main-content">
                {/* Header Section */}
                <header className="page-header">
                    <div className="header-title">
                        <h1>Fleet Management</h1>
                        <p>Manage your corporate fleets and transportation schedules</p>
                    </div>
                    <button className="btn-primary" onClick={toggleModal}>
                        <IconCreate /> Create New Fleet
                    </button>
                </header>

                {/* Stats Grid */}
                <div className="metric-cards-grid">
                    <div className="metric-card mc-teal">
                        <div className="metric-card-top">
                            <span className="metric-card-label">Total Fleets</span>
                            <div className="metric-card-icon"><IconBuilding /></div>
                        </div>
                        <div className="metric-card-value">{stats.totalFleets}</div>
                    </div>
                    <div className="metric-card mc-blue">
                        <div className="metric-card-top">
                            <span className="metric-card-label">Total Vehicles</span>
                            <div className="metric-card-icon"><IconCar /></div>
                        </div>
                        <div className="metric-card-value">{stats.totalVehicles}</div>
                    </div>
                    <div className="metric-card mc-purple">
                        <div className="metric-card-top">
                            <span className="metric-card-label">No. of Employees</span>
                            <div className="metric-card-icon"><IconUsers /></div>
                        </div>
                        <div className="metric-card-value">{stats.totalEmployees}</div>
                    </div>
                    {/* Add more cards as needed */}
                </div>



                

                {/* Chart Section */}
                <div className="chart-section">
                    {/* Weekly Activity Chart */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <IconCalendar width="20" height="20" style={{color: '#a1a1aa'}}/>
                            <h3 className="chart-title">Weekly Fleet Activity</h3>
                        </div>
                        
                        <div style={{ height: 250, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="day" 
                                        stroke="#52525b" 
                                        tick={{fill: '#a1a1aa', fontSize: 12}}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis 
                                        stroke="#52525b" 
                                        tick={{fill: '#a1a1aa', fontSize: 12}}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                        width={30}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#18181b', 
                                            border: '1px solid #27272a', 
                                            borderRadius: '6px', 
                                            color: '#fff',
                                            fontSize: '12px',
                                            padding: '4px 8px'
                                        }}
                                        itemStyle={{ color: '#fff', padding: 0 }}
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    />
                                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill="#10b981" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Fleet Size Comparison Chart */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <IconUsers width="20" height="20" style={{color: '#a1a1aa'}}/>
                            <h3 className="chart-title">Vehicles per Fleet</h3>
                        </div>
                        
                        <div style={{ height: 250, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    layout="vertical" 
                                    data={vehiclesPerFleetData} 
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={100}
                                        stroke="#52525b" 
                                        tick={{fill: '#a1a1aa', fontSize: 11}}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#18181b', 
                                            border: '1px solid #27272a', 
                                            borderRadius: '6px', 
                                            color: '#fff',
                                            fontSize: '12px',
                                            padding: '4px 8px'
                                        }}
                                        itemStyle={{ color: '#fff', padding: 0 }}
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                        formatter={(val) => [`${val} vehicles`]}
                                    />
                                    <Bar dataKey="vehicles" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Table Section Header */}
                <div className="table-header-row">
                     <div className="section-title">
                        <IconBuilding width="20" height="20" /> Active Fleets
                     </div>
                     <div className="fleets-count">
                        {fleets.length} fleets configured
                     </div>
                </div>

                {/* Table Section */}
                <div className="fleets-table-container">
                    {loading ? (
                        <div style={{padding: '24px', color: '#a1a1aa'}}>Loading fleets...</div>
                    ) : (
                        <table className="fleets-table">
                            <thead>
                                <tr>
                                    <th>Fleet ID</th>
                                    <th>Schedule</th>
                                    <th>Office Location</th>
                                    <th>Fleet Size</th>
                                    <th>Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fleets.length > 0 ? (
                                    fleets.map((fleet, index) => (
                                        <FleetRow 
                                            key={index} 
                                            fleet={fleet} 
                                            weekDays={DEFAULT_WEEKDAYS}
                                            fetchDashboardData = {fetchDashboardData} 
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>
                                            No fleets found. Create one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showUnassignedModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content" style={{ 
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        maxWidth: '600px',
                        width: '90%',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                        <div className="modal-header" style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '16px',
                            borderBottom: '1px solid #e2e8f0',
                            paddingBottom: '16px'
                        }}>
                            <h2 style={{ 
                                color: '#ef4444', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                margin: 0,
                                fontSize: '1.25rem',
                                fontWeight: 600
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>⚠️</span> Unassigned Employees
                            </h2>
                            <button 
                                onClick={() => setShowUnassignedModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: '#64748b'
                                }}
                            >×</button>
                        </div>
                        
                        <div className="modal-body">
                            <p style={{ marginBottom: '16px', color: '#64748b', lineHeight: 1.5 }}>
                                The optimisation was successful, but the following employees could not be assigned to any vehicle due to strict constraints (capacity, time windows, or route deviations).
                            </p>
                            
                            <div style={{ 
                                background: '#fef2f2', 
                                border: '1px solid #fca5a5', 
                                borderRadius: '6px', 
                                padding: '12px',
                                marginBottom: '16px',
                                color: '#991b1b',
                                fontSize: '0.9rem',
                                fontWeight: 500
                            }}>
                                Please consider loosening your constraints or adding more vehicles.
                            </div>
                            
                            <div className="unassigned-list" style={{ 
                                background: '#f8fafc', 
                                borderRadius: '8px', 
                                maxHeight: '300px', 
                                overflowY: 'auto',
                                border: '1px solid #e2e8f0'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                                        <tr>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontSize: '0.875rem', fontWeight: 600 }}>Employee ID / Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unassignedEmployees.map((emp, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px', fontSize: '0.875rem', color: '#334155' }}>
                                                    {typeof emp === 'object' ? (emp.name || emp.id || JSON.stringify(emp)) : emp}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div className="modal-footer" style={{ 
                            marginTop: '24px', 
                            display: 'flex', 
                            justifyContent: 'flex-end' 
                        }}>
                            <button 
                                className="btn-primary" 
                                onClick={() => setShowUnassignedModal(false)}
                                style={{ 
                                    background: '#0f172a',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Acknowledge & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <UploadModal 
                isOpen={isModalOpen} 
                onClose={toggleModal} 
                fileName={fileName} 
                onFileUpload={handleFileSelect} 
                selectedDays={selectedWeekDays}
                onDayToggle={handleDayToggle}
                isHaversine={isHaversine}
                onHaversineToggle={() => setIsHaversine(prev => !prev)}
                onSubmit={handleFleetSubmit}
                isLoading={isUploading}
            />
        </div>
    );
};

export default CompanyDashboard;
