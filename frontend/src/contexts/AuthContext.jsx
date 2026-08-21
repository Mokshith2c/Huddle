import * as React from "react";
import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";

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
        config.headers.Authorization = `Bearer ${token}`;
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
                navigateRef.current("/auth");
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
    const [userData, setUserData] = useState(null);
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [toastDuration, setToastDuration] = React.useState(3000);
    const [toastType, setToastType] = React.useState("success");
    const [name, setName] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");

    const navigate = useNavigate();
    navigateRef.current = navigate;

    const showToast = (toastMessage, duration = 3000, type = "success") => {
        setMessage(toastMessage);
        setToastDuration(duration);
        setToastType(type);
        setOpen(true);
    };

    const handleRegister = async (name, username, password) => {
        let request = await client.post("/register", {
            name,
            username,
            password
        });

        if (request.status === httpStatus.CREATED) {
            return request.data.message;
        }
    };

    const handleLogin = async (username, password) => {
        let request = await client.post("/login", {
            username,
            password
        });

        if (request.status === httpStatus.OK) {
            localStorage.setItem("token", request.data.token);
            return request.data.message;
        }
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
                    const message = err.response?.data?.message || "Something went wrong";
                    showToast(message, 4000, "error");
                    console.error("Registration error:", message);
                    return;
                }
    
                try {
                    await handleLogin(username, password);
                    showToast(signupResult, 3000, "success");
                    setError("");
                    setName("");
                    setUsername("");
                    setPassword("");
                    setTimeout(() => navigate("/home"), 500);
                } catch (err) {
                    showToast("Account created. Please log in.", 4000, "success");
                    setError("");
                    setIsSignup(false);
                    setPassword("");
                    console.error("Post-signup login error:", err.response?.data?.message || err.message);
                }
            } else {
                try {
                    const result = await handleLogin(username, password);
                    showToast(result, 3000, "success");
                    setError("");
                    setUsername("");
                    setPassword("");
                    setTimeout(() => navigate("/home"), 500);
                } catch (err) {
                    const message = err.response?.data?.message || "Something went wrong";
                    showToast(message, 4000, "error");
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
            navigate("/");
        }
    }

    const getMediaHistory = async() => {
        const res = await client.get("/media-history");
        return res.data;
    };

    const data = {
        handleRegister,
        handleLogin,
        handleAuth,
        handleLogout,
        isSubmitting,
        userData,
        setUserData,
        error,
        setError,
        message,
        setMessage,
        open,
        setOpen,
        toastDuration,
        toastType,
        setToastType,
        showToast,
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
        getMediaHistory
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};