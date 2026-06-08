import { Navigate, Outlet } from "react-router-dom";

// Helper to get user info
const getUser = () => {
    try {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const role = localStorage.getItem("userRole") || user?.role;
        const userId = localStorage.getItem("userId") || user?._id || user?.id;
        
        return { token, role, userId };
    } catch (e) {
        return { token: null, role: null, userId: null };
    }
};

/**
 * Protects routes that require authentication
 * @param {Array} allowedRoles - Optional array of roles allowed to access this route
 */
export const ProtectedRoute = ({ allowedRoles }) => {
    const { token, role } = getUser();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        // If user has a token but wrong role, redirect to their appropriate dashboard
        if (role === 'company') return <Navigate to="/company-dashboard" replace />;
        if (role === 'employee') {
            const { userId } = getUser();
            return <Navigate to={`/employee/${userId}`} replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

/**
 * Redirects authenticated users away from public pages (like login)
 */
export const PublicRoute = () => {
    const { token, role, userId } = getUser();

    if (token) {
        if (role === 'company') {
            return <Navigate to="/company-dashboard" replace />;
        }
        if (role === 'employee' && userId) {
            return <Navigate to={`/employee/${userId}`} replace />;
        }
        // Default fallback if role is missing but token exists (e.g., partial login state)
        // Or if role is something else.
        // Maybe clear token?
        // For now, redirect to company dashboard as a safe default or '/' which might loop.
        // Let's assume company dashboard is safer if they are logged in.
        // But if they are employee without ID, they are stuck.
        // Let's redirect to company-dashboard if role is company, else stay?
        // No, let's redirect to '/' if no match, BUT '/' is wrapped in PublicRoute too! Infinite loop risk.
        // So, only redirect if role is known.
    }

    return <Outlet />;
};
