import * as React from "react";
import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate , useLocation} from "react-router-dom";
import {toast} from "robot-toast";
import {shock, success, error as errorRobot, wave, validation2} from "robot-toast/robots";

const backendHost = import.meta.env.VITE_BACKEND_HOST || window.location.hostname;
const backendPort = import.meta.env.VITE_BACKEND_PORT || "5000";
const backendProtocol = import.meta.env.VITE_BACKEND_PROTOCOL || "http";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${backendProtocol}://${backendHost}:${backendPort}/api/v1/users`,
    timeout: 30000
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if(token){
        config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
});

const navigateRef = { current: null };

client.interceptors.response.use(
    (response) => response,
    (error) => {
        if(error.response?.status === 401){
            localStorage.removeItem("token");
            if (navigateRef.current) {
                navigateRef.current("/auth", {state: {from: window.location.pathname}});
            } else {
                window.location.href = "/auth";
            }
        }
        return Promise.reject(error);
    }
);

export const AuthProvider = ({ children }) => {

    const [isSignup, setIsSignup] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [name, setName] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");

    const navigate = useNavigate();
    const location = useLocation();
    navigateRef.current = navigate;

    const redirectAfterAuth = () => {
        const from = location.state?.from;
        navigate(from || "/home", {replace: true});
    }

    const handleRegister = async (name, username, password) => {
        let request = await client.post("/register", {
            name: name.trim(),
            username: username.trim(),
            password
        });

        return request.data.message;
    };

    const handleLogin = async (username, password) => {
        const response = await client.post("/login", {
            username: username.trim(),
            password
        });

        localStorage.setItem("token", response.data.token);
        return response.data.message;
    };


    const handleAuth = async () => {
        if(isSubmitting)return;
        setIsSubmitting(true)
        try{
            if (isSignup) {
                let signupResult;
                try {
                    signupResult = await handleRegister(name, username, password);
                } catch (err) {
                    const message = err.response?.data?.message || (err.request ? "Unable to connect to the server." : "Something went wrong.");
                    toast({
                    message,
                    position: "bottom-left",
                    type: "info",
                    theme: "dark",
                    robotVariant: errorRobot,
                    style: { color: "white", backgroundColor: "oklch(21% 0.034 264.665)", },
                    autoClose: 3000,
                    draggable: true,
                    pauseOnHover: true
                    });
                    console.error("Registration error:", message);
                    return;
                }
    
                try {
                    await handleLogin(username, password);
                    toast({
                    message: signupResult || "You're all set! Welcome to Huddle.",
                    position: "bottom-left",
                    type: "success",
                    theme: "dark",
                    robotVariant: shock,
                    style: { color: "white", backgroundColor: "oklch(21% 0.034 264.665)", },
                    autoClose: 3000,
                    draggable: true,
                    pauseOnHover: true
                    });
                    setName("");
                    setUsername("");
                    setPassword("");
                    redirectAfterAuth();
                } catch (err) {
                    toast({
                    message: "Account created. Please log in.",
                    position: "bottom-left",
                    type: "success",
                    theme: "dark",
                    robotVariant: shock,
                    style: { color: "white", backgroundColor: "oklch(21% 0.034 264.665)", },
                    autoClose: 4000,
                    draggable: true,
                    pauseOnHover: true
                    });
                    setIsSignup(false);
                    setPassword("");
                    console.error("Post-signup login error:", err.response?.data?.message || err.message);
                }
            } else {
                try {
                    const result = await handleLogin(username, password);
                    toast({
                    message: result || "👋Welcome back! Ready to connect",
                    position: "bottom-left",
                    type: "success",
                    theme: "dark",
                    robotVariant: success,
                    style: { color: "white", backgroundColor: "oklch(21% 0.034 264.665)", },
                    autoClose: 4000,
                    draggable: true,
                    pauseOnHover: true
                    });
                    setUsername("");
                    setPassword("");
                    redirectAfterAuth();
                } catch (err) {
                    const message = err.response?.data?.message ||  (err.request ? "Unable to connect to the server." : "Something went wrong.");
                    console.log(err)
                    console.log(err.response);
                        toast({
                            message,
                            position: "bottom-left",
                            type: "info",
                            theme: "dark",
                            robotVariant:  err.response?.status === 401 ?  errorRobot : validation2,
                            style: { color: "white", backgroundColor: "oklch(21% 0.034 264.665)", },
                            autoClose: 4000,
                            draggable: true,
                            pauseOnHover: true
                        });
                    
                    
                    console.error("Login error:", message);
                }
            }
        }finally{
            setIsSubmitting(false);
        }
    };

    const getHistoryOfUser = async() => {
        let request = await client.get("/get_all_activity");
        return request.data;
    }

    const addToUserHistory = async(meetingCode) => {
        let request = await client.post("/add_to_activity", {
            meeting_code: meetingCode,
            date: Date.now()
        });
        return request;
    }

    const handleLogout = async() => {
        try {
            await client.post("/logout");
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            localStorage.removeItem("token");
            navigate("/", {replace: true});
        }
    }

    const getMediaHistory = async() => {
        const res = await client.get("/media-history");
        return res.data;
    };

    const updateMeetingTags = async(meetingId, tags) => {
        const res = await client.patch(`/history/${meetingId}/tags`, {tags})
        return res.data;
    }

    const data = {
        handleRegister,
        handleLogin,
        handleAuth,
        handleLogout,
        isSubmitting,
        error,
        isSignup,
        setIsSignup,
        name,
        setName,
        username,
        setUsername,
        password,
        setPassword,
        addToUserHistory,
        getHistoryOfUser,
        getMediaHistory,
        updateMeetingTags
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};