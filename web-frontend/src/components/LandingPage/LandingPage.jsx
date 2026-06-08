import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import "./LandingPage.css";

const Icons = {
  VeloraLogo: () => (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 4L12 20L20 4"
        stroke="#10b981"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  CarBadge: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10b981"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" stroke="#34d399" />
      <circle cx="17" cy="17" r="2" stroke="#34d399" />
    </svg>
  ),
  Clock: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10b981"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" stroke="#34d399" />
    </svg>
  ),
  MapPin: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10b981"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" stroke="#34d399" />
    </svg>
  ),
  Users: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10b981"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" stroke="#34d399" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeOpacity="0.6" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeOpacity="0.6" />
    </svg>
  ),
  Sparkles: () => (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10b981"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" strokeOpacity="0.4" />
      <path d="M22 5h-4" strokeOpacity="0.4" />
      <path d="M4 17v2" strokeOpacity="0.4" />
      <path d="M5 18H3" strokeOpacity="0.4" />
    </svg>
  ),
  ArrowRight: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  ),
};

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Navbar logo={<Icons.VeloraLogo />} />

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          
          <h1>
            Smarter commutes,
            <br />
            <span className="highlight green-text">lower costs.</span>
          </h1>
          <p>
            Optimize your employee transportation with intelligent carpool
            routing. Reduce travel time, cut fleet costs, and give your team a
            better daily commute.
          </p>
          <Link to="/login" className="cta-button-large green-gradient">
            Start Optimizing Today
            <Icons.ArrowRight />
          </Link>

          {/* Dashboard Preview */}
          <div className="dashboard-preview">
            <div className="dashboard-header">
              <div className="window-dot dot-red"></div>
              <div className="window-dot dot-yellow"></div>
              <div className="window-dot dot-green"></div>
              <span className="dashboard-title">FleetX Dashboard</span>
            </div>
            <div className="dashboard-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Active</div>
                  <div className="stat-value green-text">12</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">En Route</div>
                  <div className="stat-value green-text">17</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Idle</div>
                  <div className="stat-value green-text">22</div>
                </div>
              </div>
              <div className="map-placeholder">
                <div className="map-dot green-glow"></div>
                <div className="map-dot green-glow"></div>
                <div className="map-dot green-glow"></div>
                <div className="map-dot green-glow"></div>
                <span className="map-label">Live Fleet Map</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-tag green-text">FEATURES</div>
            <h2 className="section-title"></h2>
            <p className="section-description">
              Built for modern enterprises that demand reliability, security,
              and seamless experiences.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon green-bg">
                <Icons.Clock />
              </div>
              <h3>Real-time Tracking</h3>
              <p>Track every carpool in real-time</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon green-bg">
                <Icons.MapPin />
              </div>
              <h3>Smart Routing</h3>
              <p>AI-optimized routes reduce commute time</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon green-bg">
                <Icons.Users />
              </div>
              <h3>Carpool Optimization</h3>
              <p>Group employees for efficient pickups</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <div className="section-tag green-text">HOW IT WORKS</div>
            <h2 className="section-title">Three simple steps</h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number-bg">01</div>
              <h3>Upload Fleet Data</h3>
              <p>Import your vehicles and employee locations</p>
            </div>
            <div className="step-card">
              <div className="step-number-bg">02</div>
              <h3>Optimize Routes</h3>
              <p>Our AI groups employees into efficient carpools</p>
            </div>
            <div className="step-card">
              <div className="step-number-bg">03</div>
              <h3>Save &amp; Commute</h3>
              <p>Reduce costs while employees enjoy shorter rides</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      

      <Footer />
    </div>
  );
};

export default LandingPage;