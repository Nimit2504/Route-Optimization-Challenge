import { useState } from "react";
import api from "../utils/api";

// ── Icons ──────────────────────────────────────────────────────────────────
const EmployeeIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
    stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
    stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
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

  .login-root {
    min-height: 100vh;
    background: #0a0a0a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 24px;
  }

  .login-card {
    width: 100%;
    max-width: 480px;
    background: #111815;
    border-radius: 20px;
    padding: 44px 44px 40px;
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

  /* ── Role Switcher ── */
  .role-switcher {
    display: flex;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.07);
    padding: 3px;
    border-radius: 12px;
    margin-bottom: 36px;
    position: relative;
    cursor: pointer;
  }

  .role-slider {
    position: absolute;
    top: 3px;
    bottom: 3px;
    width: calc(50% - 3px);
    background: rgba(16,185,129,0.15);
    border: 1px solid rgba(16,185,129,0.25);
    border-radius: 9px;
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
  }

  .role-slider.employee { transform: translateX(0); }
  .role-slider.company  { transform: translateX(calc(100% + 3px)); }

  .role-tab {
    flex: 1;
    text-align: center;
    padding: 10px;
    position: relative;
    z-index: 1;
    font-size: 14px;
    font-weight: 600;
    color: #4b5563;
    transition: color 0.3s ease;
    border-radius: 9px;
    user-select: none;
  }
  .role-tab.active { color: #10b981; }

  /* ── Icon ── */
  .icon-wrap {
    width: 72px;
    height: 72px;
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 22px;
    transition: all 0.3s ease;
  }

  /* ── Header ── */
  .login-title {
    text-align: center;
    font-size: 26px;
    font-weight: 800;
    color: #f9fafb;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
    line-height: 1.2;
  }

  .login-sub {
    text-align: center;
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 32px;
  }

  /* ── Fields ── */
  .field-group { margin-bottom: 18px; }

  .field-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #e5e7eb;
    margin-bottom: 8px;
  }

  .field-input {
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
  .field-input::placeholder { color: #4b5563; }
  .field-input:focus {
    border-color: rgba(16,185,129,0.4);
    box-shadow: 0 0 0 3px rgba(16,185,129,0.08);
  }

  /* ── Error ── */
  .error-msg {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.2);
    color: #f87171;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    margin-bottom: 14px;
    text-align: center;
  }

  /* ── Submit ── */
  .submit-btn {
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
    letter-spacing: -0.1px;
  }
  .submit-btn:hover:not(:disabled) {
    background: #6ee7a0;
    box-shadow: 0 6px 28px rgba(74,222,128,0.32);
    transform: translateY(-1px);
  }
  .submit-btn:active:not(:disabled) { transform: translateY(0); }
  .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  /* ── Divider ── */
  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 24px 0 18px;
  }
  .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
  .divider-text { color: #4b5563; font-size: 13px; white-space: nowrap; }

  /* ── SSO ── */
  .sso-btn {
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
  .sso-btn:hover {
    background: #222927;
    border-color: rgba(255,255,255,0.14);
    transform: translateY(-1px);
  }

  /* ── Footer ── */
  .login-footer {
    text-align: center;
    margin-top: 24px;
    font-size: 13px;
    color: #4b5563;
  }
  .login-footer a {
    color: #10b981;
    text-decoration: none;
    font-weight: 500;
  }
  .login-footer a:hover { text-decoration: underline; }
`;

// ── Component ──────────────────────────────────────────────────────────────
function Login({ onLoginSuccess }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState("employee");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post(`/auth/login/${role}`, { email, password });
      console.log("Login Success:", res.data);
      const token = res.data.token;
      localStorage.setItem("sessionToken", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      onLoginSuccess(res.data.user, role, token);
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/google`;
  };

  const isEmployee = role === "employee";

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">
        <div className="login-card">

          {/* Role Switcher */}
          <div className="role-switcher">
            <div className={`role-slider ${role}`} />
            <div
              className={`role-tab ${isEmployee ? "active" : ""}`}
              onClick={() => { setRole("employee"); setError(""); }}
            >
              Employee
            </div>
            <div
              className={`role-tab ${!isEmployee ? "active" : ""}`}
              onClick={() => { setRole("company"); setError(""); }}
            >
              Company
            </div>
          </div>

          {/* Icon — animates on role switch */}
          <div className="icon-wrap">
            {isEmployee ? <EmployeeIcon /> : <BuildingIcon />}
          </div>

          {/* Header */}
          <h1 className="login-title">
            {isEmployee ? "Employee Access" : "Partner Portal Access"}
          </h1>
          <p className="login-sub">
            {isEmployee
              ? "Monitor your routes, vehicles & schedule"
              : "Corporate & Enterprise login"}
          </p>

          {/* Form */}
          <form onSubmit={handleLogin}>
            {error && <div className="error-msg">{error}</div>}

            <div className="field-group">
              <label className="field-label">
                {isEmployee ? "Email Address" : "Business Email"}
              </label>
              <input
                type="email"
                className="field-input"
                placeholder={isEmployee ? "you@company.com" : "you@company.com"}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Password</label>
              <input
                type="password"
                className="field-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading
                ? "Signing in…"
                : isEmployee ? "Access Dashboard" : "Access Portal"}
            </button>
          </form>

          {/* Google SSO — only for company */}
          {!isEmployee && (
            <>
              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">Enterprise Sign In</span>
                <div className="divider-line" />
              </div>
              <button className="sso-btn" onClick={handleGoogleLogin} type="button">
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          )}

          <p className="login-footer">
            Don't have an account? <a href="/">Visit Homepage</a>
          </p>

        </div>
      </div>
    </>
  );
}

export default Login;