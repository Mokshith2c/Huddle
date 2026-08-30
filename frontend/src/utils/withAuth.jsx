import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function withAuth(WrappedComponent) {

    const AuthComponent = (props) => {
        const navigate = useNavigate();
        const location = useLocation();

        useEffect(() => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/auth", {state: {from: location.pathname}});
                return;
            }

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp * 1000 < Date.now()) {
                    localStorage.removeItem("token");
                    navigate("/auth", {state: {from: location.pathname}});
                }
            } catch (e) {
                console.error("Token validation error:", e);
                navigate("/auth", {state: {from: location.pathname}});
            }
        }, [navigate, location.pathname]);

        return <WrappedComponent {...props} />;
    };

    return AuthComponent;
}

export default withAuth;