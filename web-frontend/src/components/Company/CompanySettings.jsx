import React, { useState, useEffect } from 'react';
import Navbar from '../Navbar';
import api, { fetchTripsByCompany, fetchFleetEmployees } from '../../utils/api';
import './CompanySettings.css';

const CompanySettings = () => {
    const [companyData, setCompanyData] = useState({
        name: '',
        userEmail: '',
        password: '',
    });
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Fleet & Employee State
    const [fleets, setFleets] = useState([]);
    const [fleetEmployees, setFleetEmployees] = useState({});
    const [showAddModal, setShowAddModal] = useState(null); 
    const [showDeleteModal, setShowDeleteModal] = useState(null); 
    
    const [addForm, setAddForm] = useState({
        employee_id: '',
        pickup_lat: '',
        pickup_lng: '',
        drop_lat: '',
        drop_lng: '',
        earliest_pickup: '',
        latest_drop: '',
        vehicle_preference: '',
        sharing_preference: '',
        priority: '',
        baseline_cost: '',
        baseline_time_min: '',
    });
    
    const [addLoading, setAddLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Toggles
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(true);

    const companyId = localStorage.getItem("userId");

    useEffect(() => {
        const fetchSettings = async () => {
            if (!companyId) return;
            try {
                // Fetch Company Details
                const compRes = await api.get(`/company/dashboard/${companyId}`);
                const data = compRes.data;
                const companyInfo = data.data?.company || data.company || (data.data?.name ? data.data : null);
                console.log("Fetched company info:", companyInfo);
                if (companyInfo) {
                    setCompanyData({
                        name: companyInfo.name || '',
                        userEmail: companyInfo.email || '',
                        password: '', // Never pre-fill password
                    });
                }
                
                // Fetch all fleets
                const trips = await fetchTripsByCompany(companyId);
                console.log("Fetched trips for settings:", trips);
                const fleetMap = {};
                trips.forEach(trip => {
                    if (trip.fleet && trip.fleet._id) fleetMap[trip.fleet._id] = trip.fleet;
                });
                setFleets(Object.values(fleetMap));
                
            } catch (err) {
                console.error("Error fetching settings:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [companyId]);

    // Fetch employees for a fleet when delete modal is opened
    useEffect(() => {
        if (showDeleteModal && !fleetEmployees[showDeleteModal]) {
            setDeleteLoading(true);
            fetchFleetEmployees(showDeleteModal).then((emps) => {
                setFleetEmployees(prev => ({ ...prev, [showDeleteModal]: emps }));
                setDeleteLoading(false);
            });
        }
    }, [showDeleteModal, fleetEmployees]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        if (companyData.password && companyData.password !== companyData.confirmPassword) {
            alert("Passwords do not match!");
            setIsSaving(false);
            return;
        }
        const payload = {
            name: companyData.name,
            password: companyData.password || undefined, // Only send if changed
        };

        api.put(`/company/update/${companyId}`, payload)
            .then((res) => {
                if (res.status === 200) {
                    alert('Profile updated successfully!');
                }
                else {
                    alert('Failed to update profile. Please try again.');
                }
            })
            .catch((err) => {
                console.error("Error updating profile:", err);
                alert('An error occurred while updating the profile. Please try again.');
            });

        setTimeout(() => {
            setIsSaving(false);
        }, 1000);
    };

    const handleAddEmployee = (e) => {
        e.preventDefault();
        setAddLoading(true);
        const payload = {
            companyId,
            fleetId: showAddModal,
            changes: {
                ...addForm,
                request_type: "ADD",
            }
        };
        api.post(`/dynamic`, payload)
            .then((res) => {
                if (res.status === 200) {
                    alert('Employee added successfully!');
                    // Clear the cached employee list for this fleet so the next
                    // time the manage modal opens it re-fetches fresh data.
                    setFleetEmployees(prev => {
                        const updated = { ...prev };
                        delete updated[showAddModal];
                        return updated;
                    });
                    setAddLoading(false);
                    setShowAddModal(null);
                } else {
                    alert('Failed to add employee. Please try again.');
                    setAddLoading(false);
                }
            })
            .catch((err) => {
                console.error("Error adding employee:", err);
                alert('An error occurred while adding the employee. Please try again.');
                setAddLoading(false);
            });
    };

    const handleDeleteEmployee = async (emp) => {
        if (window.confirm(`Are you sure you want to delete ${emp.name || 'this employee'}?`)) {
            setDeleteLoading(true);
            try {
                const res = await api.post(`/dynamic`, {
                    companyId,
                    fleetId: showDeleteModal,
                    changes: {
                        "employee_id" : emp.employeeId,
                        "request_type": "DELETE",
                    }
                });
                if (res.status === 200) {
                    alert('Employee deleted successfully!');
                    // Optimistically remove the employee from the local list
                    // so the modal updates immediately without a re-fetch.
                    setFleetEmployees(prev => ({
                        ...prev,
                        [showDeleteModal]: (prev[showDeleteModal] || []).filter(
                            e => e._id !== emp._id
                        )
                    }));
                } else {
                    alert('Failed to delete employee. Please try again.');
                }
            } catch (err) {
                console.error("Error deleting employee:", err);
                alert('An error occurred while deleting the employee. Please try again.');
            } finally {
                setDeleteLoading(false);
            }
        }
    };

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

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    return (
        <div className="settings-container">
            <Navbar mode="dashboard" userData={displayUser} onLogout={handleLogout} />

            <main className="settings-main">
                <div className="settings-header">
                    <h1>Manage Settings</h1>
                    <p>Manage your company profile, fleets, and system preferences.</p>
                </div>

                {loading ? (
                    <div className="loading-state">Loading your dashboard...</div>
                ) : (
                    <>
                        {/* Add Employee Modal */}
                        {showAddModal && (
                            <div className="modal-overlay">
                                <div className="modal-content modal-large" style={{overflowY:'auto !important'}}>
                                    <button className="modal-close" onClick={() => setShowAddModal(null)}>&times;</button>
                                    <h3>Add Employee to Fleet</h3>
                                    <form onSubmit={handleAddEmployee}>
                                        <div className="form-grid">
                                            {Object.entries(addForm).map(([key]) => (
                                                <div className="form-group" key={key}>
                                                    <label style={{ textTransform: 'capitalize' }}>
                                                        {key.replace(/_/g, ' ')}
                                                    </label>
                                                    <input 
                                                        className="form-input" 
                                                        type={key.includes('lat') || key.includes('lng') || key.includes('cost') ? 'number' : 'text'} 
                                                        value={addForm[key]} 
                                                        onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))} 
                                                        required 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="modal-actions">
                                            <button className="btn-secondary" type="button" onClick={() => setShowAddModal(null)}>Cancel</button>
                                            <button className="btn-primary" type="submit" disabled={addLoading}>
                                                {addLoading ? 'Adding...' : 'Add Employee'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Delete Employee Modal */}
                        {showDeleteModal && (
                            <div className="modal-overlay">
                                <div className="modal-content" style={{overflowY:'auto !important'}}>
                                    <button className="modal-close" onClick={() => setShowDeleteModal(null)}>&times;</button>
                                    <h3>Manage Fleet Employees</h3>
                                    
                                    {deleteLoading ? (
                                        <div className="empty-state">Loading employees...</div>
                                    ) : (
                                        <div className="employee-list">
                                            {(fleetEmployees[showDeleteModal] || []).length === 0 ? (
                                                <div className="empty-state">No employees found in this fleet.</div>
                                            ) : (
                                                fleetEmployees[showDeleteModal].map(emp => (
                                                    <div key={emp._id} className="employee-list-item">
                                                        <span className="employee-name">{emp.name || emp.employeeId || emp.email || 'Unknown Employee'}</span>
                                                        <button 
                                                            onClick={() => handleDeleteEmployee(emp)} 
                                                            className="btn-delete-icon" 
                                                            title="Remove Employee"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Fleet Management Section */}
                        <div className="settings-card full-width-card">
                            <h3>Active Fleets</h3>
                            {fleets.length === 0 ? (
                                <div className="empty-state">No fleets found for this company.</div>
                            ) : (
                                <div className="fleet-list">
                                    {fleets.map(fleet => (
                                        <div key={fleet._id} className="fleet-list-item">
                                            <div className="fleet-info">
                                                <span className="fleet-badge">FLEET</span>
                                                <span className="fleet-id">{fleet.description || fleet.fleetId?.split('-')[1]?.slice(-4) || 'Unknown'}</span>
                                            </div>
                                            <div className="fleet-actions">
                                                <button className="btn-primary btn-sm" onClick={() => setShowAddModal(fleet._id)}>Add Staff</button>
                                                <button className="btn-danger btn-sm" onClick={() => setShowDeleteModal(fleet._id)}>Manage</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottom Grid Sections */}
                        <div className="settings-grid">
                            <div className="settings-card">
                                <h3>Company Profile</h3>
                                <form onSubmit={handleProfileUpdate}>
                                    <div className="form-group">
                                        <label>Company Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={companyData.name}
                                            onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={companyData.userEmail}
                                            disabled
                                            title="Contact admin to change email"
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label>Password</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={companyData.password}
                                            onChange={(e) => setCompanyData({ ...companyData, password: e.target.value })}
                                            placeholder="Enter new password"
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label>Confirm Password</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={companyData.confirmPassword}
                                            onChange={(e) => setCompanyData({ ...companyData, confirmPassword: e.target.value })}
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                    <button type="submit" className="btn-primary" style={{width: '100%', marginTop: '0.5rem'}} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </form>
                            </div>

                            <div className="settings-card">
                                <h3>Preferences & Security</h3>
                                <div className="settings-toggle">
                                    <span className="toggle-label">Email Notifications</span>
                                    <div
                                        className={`toggle-switch ${notifications ? 'active' : ''}`}
                                        onClick={() => setNotifications(!notifications)}
                                    >
                                        <div className="toggle-slider"></div>
                                    </div>
                                </div>
                                <div className="settings-toggle">
                                    <span className="toggle-label">Dark Mode</span>
                                    <div
                                        className={`toggle-switch ${darkMode ? 'active' : ''}`}
                                        onClick={() => setDarkMode(!darkMode)}
                                    >
                                        <div className="toggle-slider"></div>
                                    </div>
                                </div>
                                
                                <div className="security-section">
                                    <h4>Account Security</h4>
                                    <p className="security-desc">We recommend rotating your password every 90 days.</p>
                                    <button className="btn-secondary" onClick={() => alert("Password reset link sent to email.")}>
                                        Send Reset Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default CompanySettings;
