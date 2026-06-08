import { Link } from "react-router-dom";
import "./LoginSelection.css";

/* ── Velora V-logo: green rounded square + white V stroke ── */
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

/* ── Card icon: person silhouette ── */
const IconEmployee = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/* ── Card icon: building / company ── */
const IconCompany = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
    <rect x="12" y="13" width="3" height="3" rx="0.5" />
    <rect x="12" y="17" width="3" height="2" rx="0.5" />
  </svg>
);

const LoginSelection = () => {
  return (
    <div className="login-selection-page">
      <div className="login-container">

        {/* Logo centred at top */}
        <div className="logo-section">
          <Link to="/" className="logo">
            <VeloraLogo />
            <span>VELORA</span>
          </Link>
        </div>

        <h1>Choose your login type</h1>
        <p className="subtitle">Select how you'd like to access the platform</p>

        <div className="login-options">
          <Link to="/employee-login" className="login-card">
            <div className="card-icon">
              <IconEmployee />
            </div>
            <h2>Employee Login</h2>
            <p>Access your rides and bookings</p>
          </Link>

          <Link to="/company-login" className="login-card">
            <div className="card-icon">
              <IconCompany />
            </div>
            <h2>Company Login</h2>
            <p>Manage your corporate fleet</p>
          </Link>
        </div>

        <div className="back-link">
          <Link to="/">← Back to Home</Link>
        </div>

      </div>
    </div>
  );
};

export default LoginSelection;