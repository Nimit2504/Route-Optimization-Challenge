import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LandingPage from "./components/LandingPage/LandingPage.jsx";
import EmployeeLogin from "./components/Employee/EmployeeLogin.jsx";
import CompanyLogin from "./components/Company/CompanyLogin.jsx";
import LoginSelection from "./components/LoginSelection/LoginSelection.jsx";
import EmployeeLanding from "./components/Employee/EmployeeLanding.jsx"
import CompanyDashboard from "./components/Company/CompanyDashboard.jsx";
import CompanyAnalytics from "./components/Company/CompanyAnalytics.jsx";
import CompanyReports from "./components/Company/CompanyReports.jsx";
import CompanySettings from "./components/Company/CompanySettings.jsx";
import AuthSuccess from "./components/AuthSuccess.jsx";
import TestDynamicUpdate from "./components/TestDynamicUpdate.jsx";
import { ProtectedRoute, PublicRoute } from "./components/common/RouteGuards.jsx";

import "./App.css";
import FleetDashboard from "./components/Fleet/FleetDashBoard.jsx";
import EmployeeProfile from "./components/Employee/EmployeeProfile.jsx";

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Public Routes (Accessible only if NOT logged in) */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/employee-login" element={<EmployeeLogin />} />
            <Route path="/login" element={<LoginSelection />} />
            <Route path="/company-login" element={<CompanyLogin />} />
          </Route>

          {/* Company Routes - Protected for Company Role Only */}
          <Route element={<ProtectedRoute allowedRoles={['company']} />}>
             <Route path="/company-dashboard" element={<CompanyDashboard />} />
             <Route path="/company-analytics" element={<CompanyAnalytics />} />
             <Route path="/company-reports" element={<CompanyReports />} />
             <Route path="/company-manage" element={<CompanySettings />} />
             <Route path="/fleet/:id" element={<FleetDashboard/>} />
          </Route>

          {/* Employee Routes - Protected for Employee Role Only */}
          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
             <Route path="/employee/:id" element={<EmployeeLanding />} />
             <Route path="/employee/profile/:id" element={<EmployeeProfile />} />
          </Route>

          {/* Auth Success Callback (Always accessible to handle redirects) */}
          <Route path="/auth/success" element={<AuthSuccess />} />
          
          {/* Test Route for Dynamic Update */}
          <Route path="/test-dynamic" element={<TestDynamicUpdate />} />

          <Route path="*" element={<h2>404 - Page Not Found</h2>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
