import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

// ── Icons ──────────────────────────────────────────────────────────────────
const BuildingIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
    stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

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

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .cl-root {
    min-height: 100vh;
    background: #0a0a0a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 24px;
  }

  .cl-topbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 32px;
    z-index: 10;
  }

  .cl-back {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #9ca3af;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: color 0.2s;
  }
  .cl-back:hover { color: #f3f4f6; }
  .cl-back:hover svg { transform: translateX(-3px); }
  .cl-back svg { transition: transform 0.2s; }

  .cl-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
  }
  .cl-brand span {
    font-size: 15px;
    font-weight: 800;
    color: #f9fafb;
    letter-spacing: 1.5px;
  }

  .cl-card {
    width: 100%;
    max-width: 480px;
    background: #111815;
    border-radius: 20px;
    padding: 48px 44px 44px;
    border: 1px solid rgba(255,255,255,0.07);
    box-shadow:
      0 0 0 1px rgba(16,185,129,0.04),
      0 32px 80px rgba(0,0,0,0.6),
      0 8px 32px rgba(0,0,0,0.4);
    animation: cardIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(18px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .cl-icon-wrap {
    width: 72px;
    height: 72px;
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 22px;
  }

  .cl-title {
    text-align: center;
    font-size: 26px;
    font-weight: 800;
    color: #f9fafb;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }

  .cl-sub {
    text-align: center;
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 32px;
  }

  .cl-field { margin-bottom: 18px; }

  .cl-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #e5e7eb;
    margin-bottom: 8px;
  }

  .cl-input {
    width: 100%;
    background: #1a2420;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 14px 16px;
    font-size: 15px;
    color: #f9fafb;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cl-input::placeholder { color: #4b5563; }
  .cl-input:focus {
    border-color: rgba(16,185,129,0.4);
    box-shadow: 0 0 0 3px rgba(16,185,129,0.08);
  }

  .cl-forgot {
    display: block;
    text-align: right;
    margin-top: 6px;
    font-size: 12px;
    color: #10b981;
    text-decoration: none;
    opacity: 0.8;
  }
  .cl-forgot:hover { opacity: 1; text-decoration: underline; }

  .cl-error {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.2);
    color: #f87171;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    margin-bottom: 14px;
    text-align: center;
  }

  .cl-submit {
    width: 100%;
    padding: 15px;
    background: #4ade80;
    border: none;
    border-radius: 12px;
    color: #0a0a0a;
    font-size: 15px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    margin-top: 6px;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 20px rgba(74,222,128,0.22);
  }
  .cl-submit:hover:not(:disabled) {
    background: #6ee7a0;
    box-shadow: 0 6px 28px rgba(74,222,128,0.32);
    transform: translateY(-1px);
  }
  .cl-submit:active:not(:disabled) { transform: translateY(0); }
  .cl-submit:disabled { opacity: 0.55; cursor: not-allowed; }

  .cl-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 24px 0 18px;
  }
  .cl-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
  .cl-divider-text { color: #4b5563; font-size: 13px; white-space: nowrap; }

  .cl-google {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 20px;
    background: #1a1f1d;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #e5e7eb;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
  }
  .cl-google:hover {
    background: #222927;
    border-color: rgba(255,255,255,0.14);
    transform: translateY(-1px);
  }

  .cl-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-top: 24px;
    font-size: 13px;
    color: #4b5563;
    text-align: center;
  }
  .cl-footer a {
    color: #10b981;
    text-decoration: none;
    font-weight: 500;
  }
  .cl-footer a:hover { text-decoration: underline; }
`;

// ── Component ──────────────────────────────────────────────────────────────
const CompanyLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/google`;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/auth/login/company`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed. Please check your credentials.");
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", "company");
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userId", data.user._id || data.user.id);
      console.log("Company Login Successful:", data);
      navigate("/company-dashboard");
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="cl-root">

        {/* Top bar */}
        <div className="cl-topbar">
          <Link to="/login" className="cl-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Selection
          </Link>
          <Link to="/" className="cl-brand">
            <VeloraLogo />
          </Link>
        </div>

        {/* Card */}
        <div className="cl-card">

          <div className="cl-icon-wrap">
            <BuildingIcon />
          </div>

          <h2 className="cl-title">Partner Portal Access</h2>
          <p className="cl-sub">Corporate &amp; Enterprise login</p>

          <form onSubmit={handleSubmit}>
            {error && <div className="cl-error">{error}</div>}

            <div className="cl-field">
              <label className="cl-label" htmlFor="email">Business Email</label>
              <input
                className="cl-input"
                type="email"
                id="email"
                name="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="cl-field">
              <label className="cl-label" htmlFor="password">Password</label>
              <input
                className="cl-input"
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <a href="#" className="cl-forgot">Forgot password?</a>
            </div>

            <button type="submit" className="cl-submit" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Access Portal"}
            </button>
          </form>

          <div className="cl-divider">
            <div className="cl-divider-line" />
            <span className="cl-divider-text">Enterprise Sign In</span>
            <div className="cl-divider-line" />
          </div>

          {/* Google only — Apple and Microsoft removed */}
          <button className="cl-google" onClick={handleGoogleLogin} type="button">
            <GoogleIcon />
            Continue with Google
          </button>

        </div>
      </div>
    </>
  );
};

export default CompanyLogin;