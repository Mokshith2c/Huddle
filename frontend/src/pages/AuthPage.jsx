import * as React from "react";
import SignInForm from "../components/SignInForm";
import SignUpForm from "../components/SignUpForm";
import { AuthContext } from "../contexts/AuthContext";
const AuthPage = () => {
	const {isSignup, setIsSignup } = React.useContext(AuthContext);
	
	React.useEffect(() => {
		setIsSignup(false);
	}, []);


	return (
		<div className="relative min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_10%,#16263a_0%,#0b1117_45%,#090e14_100%)] px-4 py-8">
			<div className="pointer-events-none absolute h-64 w-64 rounded-full bg-sky-600/10 blur-3xl top-10 left-8" />
			<div className="pointer-events-none absolute h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl bottom-10 right-10" />
			<img src="auth-right.svg" className="hidden lg:block absolute w-55 right-10 z--1" alt="" />
			<img src="auth-left.svg" className="hidden lg:block absolute w-70 left-10 z--1" alt="" />

			<div className="relative w-full md:mt-20 max-w-md md:max-w-3xl bg-[#111827]/95 border border-[#263142] rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
			<img src="auth-top.svg" className="hidden md:block absolute w-55 -top-45  -translate-x-1/2 left-1/2 z-50" alt="" />
				<div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />
				<div className="relative flex flex-col md:flex-row md:h-[420px]">
					<div className="w-full md:w-1/2 h-auto md:h-full">
						{!isSignup && <SignInForm />}
						{isSignup && <SignUpForm />}
					</div>
					<div className="w-full md:w-1/2 rounded-2xl h-auto md:h-full flex flex-col justify-center items-center text-center px-6 md:px-10 py-8 md:py-12 bg-linear-to-b from-[#0f1723] to-[#101b29] border-t md:border-t-0 md:border-l border-[#263142]">
						<span className="text-xs uppercase tracking-[0.2em] text-sky-300/80 mb-4">
							huddle
						</span>
						<p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 mb-4">
							Secure meetings
						</p>
						<h2 className="text-2xl md:text-3xl font-semibold text-white mb-3 leading-tight">
							{isSignup ? "Already with us?" : "Need an account?"}
						</h2>
						<p className="text-sm text-gray-400 mb-8 leading-relaxed max-w-xs">
							{isSignup
								? "Sign in and continue where your team left off."
								: "Join huddle to host meetings with ease."}
						</p>
						<button
							onClick={() => setIsSignup(prev => !prev)}
							className="border border-sky-400/40 text-sky-100 font-medium px-8 py-2.5 rounded-lg text-sm hover:bg-sky-500/10 transition-colors duration-200"
						>
							{isSignup ? "Sign In" : "Sign Up"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthPage;