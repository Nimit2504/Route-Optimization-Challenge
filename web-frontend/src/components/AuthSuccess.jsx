import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const AuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get("token");
        const role = searchParams.get("role"); // 'company' or 'employee'
        const id = searchParams.get("id");
        const name = searchParams.get("name");

        if (token) {
            // Standardize on 'token' key matching api.js
            localStorage.setItem("token", token);
            localStorage.setItem("userRole", role);
            
            if (id) localStorage.setItem("userId", id);
            
            // Construct a minimal user object if needed for display
            const user = { id, role, name: name || 'User' };
            localStorage.setItem("user", JSON.stringify(user));

            // Redirect based on role
            if (role === 'company') {
                navigate("/company-dashboard");
            } else if (role === 'employee') {
                navigate(`/employee/${id}`); // Or wherever employee goes
            } else {
                navigate("/");
            }
        } else {
            // Handle error or cancel
            console.error("No token found in callback parameters");
            navigate("/login");
        }
    }, [searchParams, navigate]);

    return (
        <div className="loading-screen" style={{
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh', 
            background: '#050505', 
            color: '#10b981'
        }}>
            <h2>Authenticating...</h2>
        </div>
    );
};

export default AuthSuccess;