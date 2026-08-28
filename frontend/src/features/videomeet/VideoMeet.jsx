import React from "react";
import useVideoMeet from "./hooks/useVideoMeet";
import PreJoinScreen from "./components/PreJoinScreen";
import VideoGrid from "./components/VideoGrid";
import ControlBar from "./components/ControlBar";
import ChatDrawer from "./components/ChatDrawer";
import InvitePanel from "./components/InvitePanel";
import WhiteBoard from "../../components/WhiteBoard";
import MeetingTimer from "../../components/MeetingTimer";

export default function VideoMeet() {
    const meet = useVideoMeet();

    if (meet.askForUsername) {
        return (
            <PreJoinScreen
                roomId={meet.roomId}
                attachLocalVideo={meet.attachLocalVideo}
                video={meet.video}
                setVideo={meet.setVideo}
                audio={meet.audio}
                setAudio={meet.setAudio}
                videoAvailable={meet.videoAvailable}
                audioAvailable={meet.audioAvailable}
                username={meet.username}
                setUsername={meet.setUsername}
                connect={meet.connect}
            />
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_10%,#16263a_0%,#0b1117_45%,#090e14_100%)] text-slate-100 p-5 flex flex-col gap-5">
            <MeetingTimer
                startAt={meet.callStartedAt}
                isActive={!meet.askForUsername}
                className="self-start rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 shadow"
            />
            
            <div className="relative flex flex-1 min-h-0 gap-4 flex-col md:flex-row lg:flex-row">
                <VideoGrid
                    videos={meet.videos}
                    participantVideoState={meet.participantVideoState}
                    getParticipantName={meet.getParticipantName}
                    attachLocalVideo={meet.attachLocalVideo}
                    video={meet.video}
                    screen={meet.screen}
                    username={meet.username}
                />

                {meet.whiteboard && (
                    <div className="absolute inset-0 md:static md:w-125 md:flex-none md:h-[70vh] md:shrink-0 rounded-xl border border-slate-700/70 bg-slate-900/95 shadow-xl box-border flex flex-col z-20">
                        <WhiteBoard 
                            showWB={meet.showWhiteboard} 
                            socket={meet.socket} 
                            width={500} 
                        />
                    </div>
                )}

                {meet.showModal && (
                    <ChatDrawer
                        messages={meet.messages}
                        message={meet.message}
                        setMessage={meet.setMessage}
                        sendMessage={meet.sendMessage}
                        showModal={meet.showModal}
                        setShowModal={meet.setShowModal}
                        username={meet.username}
                        triggerFilePicker={meet.triggerFilePicker}
                        fileInputRef={meet.fileInputRef}
                        handleFileUpload={meet.handleFileUpload}
                        handleDownload={meet.handleDownload}
                        sharingLocation={meet.sharingLocation}
                        handleShareLocation={meet.handleShareLocation}
                        selectedLocation={meet.selectedLocation}
                        locationPreviewVisible={meet.locationPreviewVisible}
                        closeLocationPreview={meet.closeLocationPreview}
                        coordsCopied={meet.coordsCopied}
                        copyLocationCoordinates={meet.copyLocationCoordinates}
                        openLocationPreview={meet.openLocationPreview}
                    />
                )}
            </div>

            <ControlBar
                audio={meet.audio}
                video={meet.video}
                screen={meet.screen}
                screenAvailable={meet.screenAvailable}
                newMessages={meet.newMessages}
                showModal={meet.showModal}
                toggleChat={meet.toggleChat}
                showInvite={meet.showInvite}
                setShowInvite={meet.setShowInvite}
                toggleAudioBtn={meet.toggleAudioBtn}
                toggleVideoBtn={meet.toggleVideoBtn}
                toggleScreenBtn={meet.toggleScreenBtn}
                showWhiteboard={meet.showWhiteboard}
                handleEndCall={meet.handleEndCall}
            />

            <InvitePanel
                showInvite={meet.showInvite}
                setShowInvite={meet.setShowInvite}
                inviteLink={meet.inviteLink}
                copied={meet.copied}
                handleCopyInvite={meet.handleCopyInvite}
                handleShareInvite={meet.handleShareInvite}
                handleWhatsAppInvite={meet.handleWhatsAppInvite}
            />
        </div>
    );
}