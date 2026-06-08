import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import {
  IconLogo,
  IconDashboard,
  IconAnalytics,
  IconReports,
  IconSettings,
  IconBell,
  IconChevronDown
} from './icons';


const VeloraLogo = () => (
  <div 
    className="velora-logo-icon" 
    style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginTop: '14px' 
    }}
  >
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }} 
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



const IconLogout = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
);


const Navbar = ({ mode = "public", userData, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  /* ── DASHBOARD NAVBAR ── */
  const [showLogout, setShowLogout] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowLogout(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  if (mode === "dashboard") {
    return (
      <nav className="navbar company-navbar">
        <div className="nav-left">
          <Link to="/company-dashboard" className="logo-section">
          <VeloraLogo/>
          </Link>
          <div className="nav-links">
            <Link
              to="/company-dashboard"
              className={`nav-link ${location.pathname === '/company-dashboard' ? 'active' : ''}`}
            >
              <IconDashboard />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/company-analytics"
              className={`nav-link ${location.pathname === '/company-analytics' ? 'active' : ''}`}
            >
              <IconAnalytics />
              <span>Analytics</span>
            </Link>
            <Link to="/company-reports" className={`nav-link ${location.pathname === '/company-reports' ? 'active' : ''}`}>
              <IconReports />
              <span>Reports</span>
            </Link>
            <Link to="/company-manage" className={`nav-link ${location.pathname === '/company-manage' ? 'active' : ''}`}>
              <IconSettings />
              <span>Manage</span>
            </Link>
          </div>
        </div>
        <div className="nav-right">
            <div className="user-profile-container" style={{ position: 'relative' }} ref={dropdownRef}>
                <div 
                    className="user-profile" 
                    onClick={() => setShowLogout(!showLogout)} 
                    title="Profile"
                    style={{ cursor: 'pointer', padding: '0', background: 'transparent', border: 'none' }}
                >
                    <div className="avatar">{userData?.initials || 'U'}</div>
                </div>
                {showLogout && (
                    <div className="logout-popup" style={{
                        position: 'absolute',
                        top: '120%',
                        right: '0',
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '0.75rem',
                        padding: '0.75rem',
                        zIndex: 1000,
                        minWidth: '200px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            paddingBottom: '0.75rem',
                            marginBottom: '0.75rem',
                            borderBottom: '1px solid #27272a',
                            paddingLeft: '0.5rem',
                            paddingRight: '0.5rem'
                        }}>
                             <p style={{color: '#fff', fontSize: '0.875rem', fontWeight: '500', marginBottom: '2px'}}>{userData?.name || 'Company User'}</p>
                             <p style={{color: '#9ca3af', fontSize: '0.75rem'}}>{userData?.role || 'Administrator'}</p>
                        </div>
                        <button 
                            onClick={onLogout}
                            style={{
                                width: '100%',
                                padding: '0.625rem 0.75rem',
                                color: '#ef4444',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            <IconLogout />
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        </div>
      </nav>
    );
  }

  /* ── PUBLIC NAVBAR (no nav links) ── */
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <VeloraLogo />
          </div>
          <span className="logo-text">VELORA</span>
        </Link>

        <Link to="/login" className="cta-button">
          Get Started
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;