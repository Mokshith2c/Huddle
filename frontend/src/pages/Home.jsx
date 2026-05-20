import React, { useContext } from 'react'
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import InputField from '../components/InputField'
import { useState } from "react";
import { Link } from 'react-router-dom';
import { QRCodeSVG } from "qrcode.react";
import "./Home.css";
import { AuthContext } from '../contexts/AuthContext';
function Home() {

	const navigate = useNavigate();
	const [modal, setShowModal] = useState(false);
	const [mode, setMode] = useState(-1);
	const [copied , setCopied] = useState(false);
	const [meetingCode, setMeetingCode] = useState("");
	const { addToUserHistory, showToast } = useContext(AuthContext);
	const normalizedCode = meetingCode.trim();
	const inviteLink = normalizedCode ? `${window.location.origin}/${encodeURIComponent(normalizedCode)}` : "";
	const handleCreate = () => {
		setMode(1);
		setShowModal(true);
	}
	const handleJoin = () => {
		setMode(0);
		setShowModal(true);
	}

	const handleInput = (e) => {
		setMeetingCode(e.target.value);
	}
	const handleLogout = () => {
		localStorage.removeItem("token");
		navigate("/");
	};

	const handleCopyInvite = async () => {
		if (!inviteLink) return;
		try {
			await navigator.clipboard.writeText(inviteLink);
			showToast("Invite link copied");
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Copy invite failed", error);
			showToast("Unable to copy link", 3000, "error");
		}
	};

	const handleShareInvite = async () => {
		if (!inviteLink) return;
		try {
			if (navigator.share) {
				await navigator.share({
					title: "Join my meeting",
					text: "Click to join my Huddle meeting",
					url: inviteLink,
				});
			} else {
				handleWhatsAppInvite();
			}
		} catch (error) {
			console.error("Share invite failed", error);
		}
	};

	const handleWhatsAppInvite = () => {
		if (!inviteLink) return;
		const message = `Join my Huddle meeting: ${inviteLink}`;
		const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
		window.open(whatsappUrl, "_blank", "noopener,noreferrer");
	};

	const generateMeetingCode = (len = 8) => {
		const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let out = '';
		for (let i = 0; i < len; i++) {
			out += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return out;
	};
	return (
		<div className="relative min-h-screen overflow-hidden bg-[linear-gradient(145deg,#020617_0%,#0b1220_56%,#0f172a_100%)] flex flex-col">
			<div className=" absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(34,211,238,0.12),transparent_38%)] opacity-70"></div>
			<div className=" absolute inset-0 bg-linear-to-b from-cyan-400/5 to-transparent"></div>

			<nav className="relative z-10 flex justify-between items-center pt-8 pl-5 pr-5 flex-wrap gap-4">
				<div>
					<Link to="/" className=' px-5 text-3xl font-bold tracking-wide text-white drop-shadow-md'>
						Huddle
					</Link>
				</div>
				<div className="flex gap-4 md:gap-8 items-center text-white/90 flex-wrap md:flex-nowrap">
					<button className="transition-colors hover:text-cyan-200 text-sm md:text-base"
						onClick={() => navigate('/history')}>
						<i className="fa-solid fa-clock-rotate-left"></i>
						&nbsp;History
					</button>
					<button className="logout-btn text-sm" onClick={handleLogout}>
						Logout
					</button>
				</div>
			</nav>

			<div className='flex-1 flex flex-col lg:flex-row mt-20 lg:mt-0 justify-center lg:justify-around items-center gap-8 lg:gap-0 px-4'>

				<section className="relative z-10 px-6 md:px-8 pt-10 md:pt-20 pb-10 md:pb-16 w-full lg:w-auto">
					<div className="max-w-xl rounded-2xl border border-slate-400/20 bg-slate-900/60 p-6 text-white shadow-[0_10px_32px_rgba(2,6,23,0.35)] backdrop-blur-xs">
						<img
							src="/home-sm-top.svg"
							alt=""
							className="md:hidden absolute -top-28 left-1/3 z-2 size-34 drop-shadow-2xl"
						/>
						<img
							src="/loginper.svg"
							alt=""
							className="hidden md:block absolute -top-27 -left-17 z-2 size-40 drop-shadow-2xl"
						/>
						<img
							src="/loginper3.svg"
							alt=""
							className="hidden md:block absolute -top-27 left-9/12 z-2 size-30 drop-shadow-2xl"
						/>
						<p className="text-cyan-200 text-sm tracking-[0.2em] uppercase">Your workspace</p>

						<h1 className="mt-3 text-2xl md:text-3xl font-semibold leading-tight">Connect Instantly<i className="fa-solid fa-bolt"></i>, Anywhere</h1>
						<p className="mt-4 text-white/70 text-sm md:text-base">
							Real-time video meetings with chat, screen sharing
						</p>
						<div className='flex flex-col sm:flex-row justify-center gap-3 md:gap-5 mt-5'>
							<button className='createmeet-btn' onClick={handleCreate}>
								<i className="fa-solid fa-plus"></i> Create Meeting
							</button>
							<button className='joinmeet-btn z-10' onClick={handleJoin}>
								<i className="fa-solid fa-user-plus"></i> Join Meeting
							</button>
						</div>
					</div>
				</section>


				<img
					src="/home.svg"
					alt="app preview"
					className="w-75 mt-10 md:w-100 lg:w-120 drop-shadow-2xl self-center"
				/>
			</div>





			{modal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg px-4">
					<div className="relative w-full max-w-125  bg-slate-900/90 rounded-2xl border border-slate-500/20 shadow-xl p-6 md:p-8 flex flex-col items-center gap-6">
						{(inviteLink)?
							(mode === 0 ? 
								<img
									src="/homeskull.svg"
									alt=""
									className="absolute -top-35  left-1/2 -translate-x-1/2 w-35"
								/>
								:
								null
							)
							:
							<img
								src="/homeskull.svg"
								alt=""
								className="absolute -top-35  left-1/2 -translate-x-1/2 w-35"
							/>

						}

						<button
							className=" text-white/70 hover:text-red-400"
							
						>
							
						</button>
						<button className="absolute top-5 right-4 h-8 w-8 rounded-full text-slate-300 transition hover:text-white" onClick={() => {
								setShowModal(false);
								setMode(-1);
							}}>
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>

						<h3 className="text-xl md:text-2xl font-semibold text-cyan-200 mt-4">
							Enter Meeting Code
						</h3>

						<div className="w-full">
							<InputField
								onChange={handleInput}
								value={meetingCode}
							/>
						</div>
						{(mode === 1 && inviteLink )&& (

							<div className=" bg-slate-900 p-4 rounded-lg flex flex-col items-center gap-2 ">
								<p className="text-sm text-white/70">
									Share the invite link with others to join the meeting.
								</p>
								<div className="w-fit">
									<input
										value={inviteLink}
										readOnly
										className="px-2 py-1 text-sm bg-slate-800 text-white rounded w-39"
									/>
								</div>

								<div className="flex justify-between gap-8 text-white">
									<button onClick={handleCopyInvite}>
										{
											copied ?
											<i className="fa-solid fa-circle-check"></i>
												:
											<i className="fa-solid fa-copy"></i>
										}
									</button>
									
									<button onClick={handleShareInvite}>
										<i className="fa-solid fa-share-nodes"></i>
									</button>

									<button onClick={handleWhatsAppInvite} title="Share on WhatsApp">
										<i className="fa-brands fa-whatsapp"></i>
									</button>
								</div>

								<div className="bg-white p-2 rounded w-39">
								<QRCodeSVG value={inviteLink} size={140}/>
								</div>

							</div>
						)}
						<button
							className="joinmeet-btn w-1/2"
							onClick={async () => {
								let code = meetingCode.trim();
								if (mode === 1 && code.length === 0) {
									code = generateMeetingCode();
								}
								if (code.length > 0) {
									try {
										await addToUserHistory(code);
									} catch (err) {
										console.error("Failed to add meeting to history", err);
									}
									setShowModal(false);
									setMode(-1);
									navigate(`/${code}`);
								} else {
									if (typeof showToast === 'function') showToast('Enter meeting code', 3000, 'error');
								}
							}}
						>
							{mode === 0 ? "Join Meeting" : "Create Meeting"}
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

export default withAuth(Home);