import { Link } from "react-router-dom";
import "./Footer.css";

/* Navbar-style logo: green rounded square + white V */
const VeloraLogoIcon = () => (
  <div className="footer-logo-icon">
    <svg
      width="20"
      height="20"
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

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="logo">
            <VeloraLogoIcon />
            <span>VELORA</span>
          </div>
          <ul className="footer-links">
            <li>
              Privacy
            </li>
            <li>
              Terms
            </li>
            <li>
              Contact
            </li>
          </ul>
          <div className="copyright">© 2026 VELORA. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;