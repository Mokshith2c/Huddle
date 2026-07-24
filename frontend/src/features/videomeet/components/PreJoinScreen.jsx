import React from "react";
import InputField from "../../../components/InputField";

export default function PreJoinScreen({
    roomId,
    localVideoRef,
    video,
    setVideo,
    audio,
    setAudio,
    videoAvailable,
    audioAvailable,
    username,
    setUsername,
    connect
}) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_10%,#16263a_0%,#0b1117_45%,#090e14_100%)] p-4">
            <div className="w-full max-w-md">
                {roomId && (
                    <div className="mb-4 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-950/60 px-3 py-1 text-xs font-medium text-sky-300 backdrop-blur-sm">
                            <i className="fa-solid fa-video text-sky-400"></i>
                            Meeting Code: <strong className="font-mono text-white">{roomId}</strong>
                        </span>
                    </div>
                )}
                <div className="relative mb-8 overflow-hidden rounded-2xl border-2 border-sky-400/50 bg-slate-900 shadow-2xl">
                    <video 
                        ref={localVideoRef} 
                        autoPlay 
                        muted 
                        playsInline
                        className="h-80 w-full object-cover block bg-slate-950"
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                        <div className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${video ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                            <i className={`fa-solid ${video ? 'fa-video' : 'fa-video-slash'}`}></i>
                            {video ? 'Video On' : 'Video Off'}
                        </div>
                        <div className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${audio ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                            <i className={`fa-solid ${audio ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
                            {audio ? 'Audio On' : 'Audio Off'}
                        </div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 space-y-1">
                        {!videoAvailable && <p className="text-xs text-red-300">⚠️ Camera not available</p>}
                        {!audioAvailable && <p className="text-xs text-red-300">⚠️ Microphone not available</p>}
                    </div>
                </div>

                <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-slate-300">Your Name</label>
                    <InputField
                        placeholder="Enter your username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        inputClassName="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-sky-400 focus:ring-sky-500/30"
                    />
                </div>

                <div className="mb-4 flex gap-3">
                    <button
                        onClick={() => setVideo(!video)}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-medium transition-all duration-200 ${video ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500/20 hover:bg-red-500/30 text-red-300'}`}
                    >
                        <i className={`fa-solid ${video ? 'fa-video' : 'fa-video-slash'}`}></i>
                        {video ? 'Video On' : 'Video Off'}
                    </button>
                    <button
                        onClick={() => setAudio(!audio)}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-medium transition-all duration-200 ${audio ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500/20 hover:bg-red-500/30 text-red-300'}`}
                    >
                        <i className={`fa-solid ${audio ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
                        {audio ? 'Audio On' : 'Audio Off'}
                    </button>
                </div>

                <button 
                    onClick={connect}
                    disabled={!username.trim()}
                    className="w-full rounded-lg bg-linear-to-r from-sky-500 to-cyan-500 py-3 font-semibold text-white transition-all duration-200 hover:from-sky-400 hover:to-cyan-400 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                    <i className="fa-solid fa-phone mr-2"></i>
                    Join Meeting
                </button>

                <p className="mt-4 text-center text-xs text-slate-400">
                    Make sure your camera and microphone are working before joining
                </p>
            </div>
        </div>
    );
}
