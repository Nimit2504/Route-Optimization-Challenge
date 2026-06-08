import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building2, Hash, ArrowLeft, Car, Bell, LogOut } from 'lucide-react';
import api from '../../utils/api'; 
import "./EmployeeProfile.css";
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
const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- EDITING STATES ---
  const [editingField, setEditingField] = useState(null); // 'name', 'email', or 'password'
  const [editValue, setEditValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole"); 
    localStorage.removeItem("sessionToken");
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get(`/employee/profile/${id}`);
        
        if (response.data.success) {
          setProfile(response.data.employee);
        } else {
          setError(response.data.message || "Failed to load profile data.");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("An error occurred while fetching your profile.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id]);

  // --- EDIT HANDLERS ---
  const handleEditClick = (field, currentValue) => {
    setEditingField(field);
    // If it's the password, don't populate the old masked dots, start blank
    setEditValue(field === 'password' ? "" : currentValue);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleSubmitUpdate = async (field) => {
    if (!editValue.trim()) {
      alert("Value cannot be empty!");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await api.post(`/employee/update/${id}`, {
        [field]: editValue 
      });

      if (response.data.success) {
        alert("Changed successfully!");
        window.location.reload(); 
      } else {
        alert("Failed to change credentials");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to change credentials");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div className="ep-center">Loading profile...</div>;
  if (error) return <div className="ep-center">{error}</div>;
  if (!profile) return <div className="ep-center">Profile not found.</div>;

  return (
    <div className="ep-page-wrapper">
      
      {/* Top Navbar */}
      <nav className="ep-navbar">
        <div className="ep-brand">
          <VeloraLogo/>
        </div>
        <div className="ep-nav-links">
        </div>
        <div className="ep-nav-actions">
          <button onClick={handleLogout} className="ep-logout-btn" title="Logout">
            <LogOut size={24} />
          </button>
          <div className="ep-avatar-small">
            <img src={`https://ui-avatars.com/api/?name=${profile.name}&background=10b981&color=fff`} alt="Profile" />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="ep-main-content">
        <div className="ep-container">
          
          <button onClick={() => navigate(-1)} className="ep-back-button">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div className="ep-card">
            <div className="ep-header">
              <div className="ep-avatar">
                <img 
                  src={`https://ui-avatars.com/api/?name=${profile.name}&background=10b981&color=fff&size=96`} 
                  alt="Profile" 
                />
              </div>
              <h2 className="ep-name">{profile.name}</h2>
              
            </div>

            <div className="ep-info-section">
              
              {/* Name with Edit functionality */}
              <div className="ep-info-row">
                <User size={24} color="#9ca3af" />
                <div className="ep-info-text-wrapper">
                  <div className="ep-info-text-header">
                    <div className="ep-info-text">
                      <span className="ep-label">Full Name</span>
                      <span className="ep-value">{profile.name}</span>
                    </div>
                    {editingField !== 'name' && (
                      <button className="ep-action-btn-small" onClick={() => handleEditClick('name', profile.name)}>Change</button>
                    )}
                  </div>
                  
                  {editingField === 'name' && (
                    <div className="ep-edit-container">
                      <input 
                        type="text" 
                        className="ep-edit-input" 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)} 
                        disabled={isUpdating}
                        placeholder="Enter new name"
                      />
                      <div className="ep-edit-actions">
                        <button className="ep-submit-btn" onClick={() => handleSubmitUpdate('name')} disabled={isUpdating}>
                          {isUpdating ? "Saving..." : "Submit"}
                        </button>
                        <button className="ep-cancel-btn" onClick={handleCancelEdit} disabled={isUpdating}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Employee ID */}
              <div className="ep-info-row">
                <Hash size={24} color="#9ca3af" />
                <div className="ep-info-text-wrapper">
                  <div className="ep-info-text">
                    <span className="ep-label">Employee ID</span>
                    <span className="ep-value">{profile.employeeId || 'Not Assigned'}</span>
                  </div>
                </div>
              </div>

              {/* Company */}
              <div className="ep-info-row">
                <Building2 size={24} color="#9ca3af" />
                <div className="ep-info-text-wrapper">
                  <div className="ep-info-text">
                    <span className="ep-label">Company</span>
                    <span className="ep-value">{profile.company?.name || 'Not Assigned'}</span>
                  </div>
                </div>
              </div>

              {/* Email with Edit functionality */}
              <div className="ep-info-row">
                <Mail size={24} color="#9ca3af" />
                <div className="ep-info-text-wrapper">
                  <div className="ep-info-text-header">
                    <div className="ep-info-text">
                      <span className="ep-label">Email Address</span>
                      <span className="ep-value">{profile.email}</span>
                    </div>
                    {editingField !== 'email' && (
                      <button className="ep-action-btn-small" onClick={() => handleEditClick('email', profile.email)}>Change</button>
                    )}
                  </div>

                  {editingField === 'email' && (
                    <div className="ep-edit-container">
                      <input 
                        type="email" 
                        className="ep-edit-input" 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)} 
                        disabled={isUpdating}
                        placeholder="Enter new email"
                      />
                      <div className="ep-edit-actions">
                        <button className="ep-submit-btn" onClick={() => handleSubmitUpdate('email')} disabled={isUpdating}>
                          {isUpdating ? "Saving..." : "Submit"}
                        </button>
                        <button className="ep-cancel-btn" onClick={handleCancelEdit} disabled={isUpdating}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Password with Edit functionality */}
              <div className="ep-info-row">
                <Lock size={24} color="#9ca3af" />
                <div className="ep-info-text-wrapper">
                  <div className="ep-info-text-header">
                    <div className="ep-info-text">
                      <span className="ep-label">Password</span>
                      <span className="ep-value">••••••••••••</span>
                    </div>
                    {editingField !== 'password' && (
                      <button className="ep-action-btn-small" onClick={() => handleEditClick('password', '')}>Change</button>
                    )}
                  </div>

                  {editingField === 'password' && (
                    <div className="ep-edit-container">
                      <input 
                        type="password" /* Masks the input */
                        className="ep-edit-input" 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)} 
                        disabled={isUpdating}
                        placeholder="Enter new password"
                      />
                      <div className="ep-edit-actions">
                        <button className="ep-submit-btn" onClick={() => handleSubmitUpdate('password')} disabled={isUpdating}>
                          {isUpdating ? "Saving..." : "Submit"}
                        </button>
                        <button className="ep-cancel-btn" onClick={handleCancelEdit} disabled={isUpdating}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;