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
    baseURL: `${backendProtocol}://${backendHost}:${backendPort}/api/v1/users`
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

client.interceptors.response.use(
    (response) => response,
    (error) => {
        if(error.response?.status === 401){
            localStorage.removeItem("token");
            window.location.href = "/auth";
        }
        return Promise.reject(error);
    }
);

export const AuthProvider = ({ children }) => {

    const [isSignup, setIsSignup] = React.useState(false);
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

    const showToast = (toastMessage, duration = 3000, type = "success") => {
        setMessage(toastMessage);
        setToastDuration(duration);
        setToastType(type);
        setOpen(true);
    };

    const handleRegister = async (name, username, password) => {
        try {

            let request = await client.post("/register", {
                name,
                username,
                password
            });

            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }

        } catch (err) {
            throw err;
        }
    };

    const handleLogin = async (username, password) => {
        console.log(username);
        try {

            let request = await client.post("/login", {
                username,
                password
            });

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                return request.data.message;
            }

        } catch (err) {
            throw err;
        }
    };


    const handleAuth = async () => {
        try {
            if(isSignup){
                const signupResult = await handleRegister(name, username, password);
                await handleLogin(username, password);
                console.log(signupResult);
                showToast(signupResult, 3000, "success");
                setError("");
                setName("");
                setUsername("");
                setPassword("");
                setTimeout(() => navigate("/home"), 500);
            } else {
                const result = await handleLogin(username, password);
                console.log(result);
                showToast(result, 3000, "success");
                setError("");
                setUsername("");
                setPassword("");
                setTimeout(() => navigate("/home"), 500);
            }
        } catch (err) {
            let message = err.response?.data?.message || "Something went wrong";
            showToast(message, 4000, "error");
            console.error("Auth error:", message);
        }
    };

    const getHistoryOfUser = async() => {
        try{
            let request = await client.get("/get_all_activity");
            return request.data;
        } catch (err){
            throw err;
        }
    }

    const addToUserHistory = async(meetingCode) => {
        try{
            let request = await client.post("/add_to_activity", {
                meeting_code: meetingCode,
                date: Date.now()
            });
            return request;
        } catch (e){
            throw e;
        }
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