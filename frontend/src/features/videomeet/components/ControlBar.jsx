import React from "react";
import { MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";

export default function ControlBar({
    audio,
    video,
    screen,
    screenAvailable,
    newMessages,
    showModal,
    setShowModal,
    setNewMessages,
    showInvite,
    setShowInvite,
    toggleAudioBtn,
    toggleVideoBtn,
    toggleScreenBtn,
    showWhiteboard,
    handleEndCall
}) {
    return (
        <div className="m-auto flex gap-2.5 rounded-full border border-slate-700/40 bg-slate-900/95 px-3 py-2 shadow-lg z-20">
            <button
                onClick={toggleAudioBtn}
                className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {audio ? (
                    <i className="fa-solid fa-microphone"></i>
                ) : (
                    <i className="fa-solid fa-microphone-slash"></i>
                )}
            </button>

            <button
                onClick={toggleVideoBtn}
                className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {video ? (
                    <i className="fa-solid fa-video"></i>
                ) : (
                    <i className="fa-solid fa-video-slash"></i>
                )}
            </button>

            <button 
                onClick={showWhiteboard}
                className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <i className="fa-solid fa-pencil"></i>
            </button>

            <div className="relative inline-block">
                <button 
                    onClick={() => {
                        setShowModal((prev) => !prev);
                        setNewMessages(0);
                    }}
                    className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                    <i className="fa-brands fa-rocketchat"></i>
                </button>

                {newMessages > 0 && !showModal && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold leading-none text-white ring-2 ring-slate-900 shadow">
                        {newMessages > 99 ? "99+" : newMessages}
                    </span>
                )}
            </div>

            {screenAvailable && (
                <button 
                    onClick={toggleScreenBtn}
                    className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95" 
                >
                    {screen ? (
                        <MdOutlineStopScreenShare className="size-6 m-auto" />
                    ) : (
                        <MdOutlineScreenShare className="size-6 m-auto" />
                    )}
                </button>
            )}

            <button 
                onClick={() => setShowInvite(!showInvite)}
                className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
                <i className="fa-solid fa-user-plus"></i>
            </button>

            <button 
                onClick={handleEndCall}
                className="h-11 w-11 rounded-full bg-red-500 text-lg text-white transition-all duration-200 ease-out hover:bg-red-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
                <i className="fa-solid fa-phone"></i>
            </button>
        </div>
    );
}
