import React from "react";

export default function VideoGrid({
    videos,
    participantVideoState,
    getParticipantName,
    attachLocalVideo,
    video,
    screen,
    username
}) {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] auto-rows-fr gap-4 flex-1 min-h-0">
            {videos.map((vid) => {
                const videoTrack = vid.stream?.getVideoTracks()?.[0];
                const videoStateFromPeer = participantVideoState[vid.socketId];
                const isVideoOn = typeof videoStateFromPeer === "boolean"
                    ? videoStateFromPeer
                    : !!videoTrack;

                return (
                    <div key={vid.socketId} className="relative h-full min-h-0 overflow-hidden rounded-xl border border-slate-700/40 bg-slate-900 shadow-lg">
                        <audio
                            autoPlay
                            ref={(ref) => {
                                if (!ref) return;
                                if (vid.stream && ref.srcObject !== vid.stream) {
                                    ref.srcObject = vid.stream;
                                }
                            }}
                        />

                        {!isVideoOn ? (
                            <div className="h-full w-full flex items-center justify-center bg-slate-900">
                                <div className="flex flex-col items-center">
                                    <div className="h-20 w-20 rounded-full bg-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                                        {getParticipantName(vid.socketId)?.charAt(0).toUpperCase() || "U"}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <video
                                key="video-on"
                                autoPlay
                                playsInline
                                muted   // audio now comes from the <audio> tag above; avoid double playback
                                className="h-full w-full object-cover"
                                ref={(ref) => {
                                    if (!ref) return;
                                    if (vid.stream && ref.srcObject !== vid.stream) {
                                        ref.srcObject = vid.stream;
                                    }
                                }}
                            />
                        )}

                        <span className="absolute right-2.5 bottom-2.5 rounded-md bg-slate-900/70 px-2 py-1 text-xs">
                            {getParticipantName(vid.socketId)}
                        </span>
                    </div>
                );
            })}

            {/* Local Video Thumbnail Overlay */}
            <div className="fixed bottom-22.5 h-32.5 w-50 overflow-hidden rounded-xl border-2 border-sky-400/90 bg-slate-900 shadow-xl">
                {(video || screen) ? (
                    <video
                        ref={attachLocalVideo}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-800">
                        <div className="flex flex-col items-center">
                            <div className="h-16 w-16 rounded-full bg-sky-500 flex items-center justify-center text-xl font-bold text-white">
                                {username?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                        </div>
                    </div>
                )}

                <span className="absolute right-2 bottom-2 rounded-md bg-slate-900/70 px-2 py-1 text-[11px]">
                    You
                </span>
            </div>
        </div>
    );
}
