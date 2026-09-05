import { useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import InputField from "./InputField";
import * as React from "react";
import { toast } from 'robot-toast';
import { shock, error as errorRobot } from 'robot-toast/robots';
import Loader from "../components/Loader"

const SignUpForm = () => {
  const { handleAuth, name, username, password, setName, setUsername, setPassword, isSubmitting } = React.useContext(AuthContext);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length === 0) errors.name = "Name is required";
    else if (trimmedName.length < 2) errors.name = "Name must be at least 2 characters";
    
    if (!username || username.trim().length === 0) errors.username = "Username is required";
    else if (username.length < 3) errors.username = "Username must be at least 3 characters";
    
    if (!password) errors.password = "Password is required";
    else if (password.length < 4) errors.password = "Password must be at least 4 characters";
    
    return errors;
  };

  const handleFNameChange = (e) => {
    setName(e.target.value);
  }
  const handleNameChange = (e) => {
    setUsername(e.target.value);
  }
  const handlePassChange = (e) => {
    setPassword(e.target.value);
  }

  const handleSignUp = () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstError = Object.values(errors)[0] || "Something went wrong";
      toast({
        message: firstError,
        position: "bottom-left",
        type: "info",
        theme: "dark",
        robotVariant: errorRobot,
        style: { color: "white", backgroundColor: "oklch(21% 0.034 264.665)", },
        autoClose: 3000,
        draggable: true,
        pauseOnHover: true
      });
      return;
    }
    setValidationErrors({});
    handleAuth();
  }

  return (
    <div className="w-full flex flex-col justify-center items-center px-6 md:px-12 py-10">
      <span className="text-xs uppercase tracking-[0.28em] text-sky-300/80 mb-3">
        huddle
      </span>

      <h2 className="text-2xl font-semibold text-white mb-2">
        Sign Up
      </h2>

      <p className="text-sm text-gray-400 mb-7">
        Create your account
      </p>

      <InputField  placeholder="Full Name" onChange={handleFNameChange} value={name}/>
      <InputField placeholder="Username" type="text" onChange={handleNameChange} value={username}/>
      <InputField placeholder="Password" type="password" onChange={handlePassChange} value={password}/>
      <button
        type="button"
        onClick={handleSignUp}
        disabled={isSubmitting}
        className="w-full py-3 rounded-lg bg-linear-to-r from-sky-600 to-cyan-500 text-white font-medium text-sm hover:from-sky-500 hover:to-cyan-400 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(14,165,233,0.28)] active:translate-y-0 transition-all duration-200 
        disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader type="ring" size={18} speed={2} color={"white"} />}
        {isSubmitting ? "Signing up..." : "Sign Up"}
      </button> 
    </div>
  );
};

export default SignUpForm;