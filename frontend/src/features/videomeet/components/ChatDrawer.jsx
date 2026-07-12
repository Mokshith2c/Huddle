import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapPin } from "@fortawesome/free-solid-svg-icons";
import InputField from "../../../components/InputField";
import LocationPreviewModal from "./LocationPreviewModal";
import { getLocationDisplay } from "../utils/geocode";

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function ChatDrawer({
    messages,
    message,
    setMessage,
    sendMessage,
    showModal,
    setShowModal,
    username,
    triggerFilePicker,
    fileInputRef,
    handleFileUpload,
    handleDownload,
    sharingLocation,
    handleShareLocation,
    selectedLocation,
    locationPreviewVisible,
    closeLocationPreview,
    coordsCopied,
    copyLocationCoordinates,
    openLocationPreview
}) {
    return (
        <div className="max-h-full h-auto w-90 shrink-0 rounded-xl border border-slate-700/70 bg-slate-900/95 flex flex-col shadow-xl z-30 overflow-hidden">
            <div className="p-3 border-b border-slate-700/70 font-semibold flex justify-between items-center bg-slate-900">
                <div className="text-slate-100">Chat</div>
                <button 
                    className="h-8 w-8 rounded-full text-slate-300 transition hover:bg-slate-800 hover:text-white" 
                    onClick={() => setShowModal(false)}
                >
                    <i className="fa-regular fa-circle-xmark"></i>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-900/40">
                {messages.map((item, index) => {
                    const isOwn = item.sender === username;
                    const isFile = typeof item.data === "object" && item.data.type === "file";
                    const isLocation = typeof item.data === "object" && item.data.type === "location";

                    const isImage = isFile && item.data.url?.match(/\.(jpg|jpeg|png|gif)$/i);
                    const isPDF = isFile && item.data.url?.match(/\.pdf$/i);

                    return (
                        <div
                            key={index}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`
                                    ${!isLocation ? "px-3 py-2 rounded-2xl max-w-50 wrap-break-word" : ""}

                                    ${
                                        isLocation
                                            ? isOwn
                                                ? ""
                                                : "px-3 py-2  rounded-2xl rounded-bl-sm bg-[#212325]"
                                            : isOwn
                                                ? "bg-[#5d5a55] text-white rounded-br-sm"
                                                : "bg-[#212325] text-white rounded-bl-sm"
                                    }
                                `}
                            >
                                {!isOwn && (
                                    <div className="text-[12px] opacity-75 mb-1">
                                        <i className="fa-solid fa-circle-user mr-1"></i>{item.sender}
                                    </div>
                                )}

                                {!isFile && !isLocation && (
                                    <p className="text-sm">{item.data}</p>
                                )}

    
                                {isLocation && (() => {
                                    const locationDisplay = getLocationDisplay(item.data);

                                    return (
                                        <div  
                                            className={`
                                                    w-full max-w-50 overflow-hidden border border-slate-600/50 bg-slate-800/90 shadow-md
                                                    ${isOwn ? "rounded-2xl rounded-br-sm " : "rounded-2xl bg-[#2B2D31]"}
                                                `}
                                        >
                                            <div className="px-3 pt-3">
                                                <div className="flex items-center gap-1 text-sm font-semibold text-white">
                                                    <span aria-hidden="true">
                                                        <FontAwesomeIcon icon={faMapPin} />
                                                    </span>
                                                    <span className="truncate">{locationDisplay.placeName}</span>
                                                </div>
                                                {locationDisplay.cityCountry && (
                                                    <p className="mt-1 truncate text-xs text-slate-300">
                                                        {locationDisplay.cityCountry}
                                                    </p>
                                                )}
                                                <div className="mt-1 font-medium text-xs text-blue-200">
                                                    Shared by <span className="font-medium text-slate-200">{item.sender}</span>
                                                </div>
                                                {locationDisplay.accuracyText && (
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {locationDisplay.accuracyText}
                                                    </div>
                                                )}
                                            </div>

                                            {mapboxToken && (
                                                <button
                                                    type="button"
                                                    onClick={() => openLocationPreview(item.data)}
                                                    className="mt-3 block w-full overflow-hidden bg-slate-900/40 text-left"
                                                >
                                                    <img
                                                        src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+9c27b0(${item.data.lng},${item.data.lat})/${item.data.lng},${item.data.lat},13/560x280@2x?access_token=${mapboxToken}`}
                                                        alt="Location preview"
                                                        className="h-36 w-full object-cover"
                                                    />
                                                </button>
                                            )}

                                            <div className="flex gap-2 p-3">
                                                <button
                                                    onClick={() => openLocationPreview(item.data)}
                                                    className="flex-1 rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
                                                >
                                                    Preview
                                                </button>
                                                <button
                                                    onClick={() => window.open(`https://www.google.com/maps?q=${item.data.lat},${item.data.lng}`, "_blank")}
                                                    className="flex-1 rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
                                                >
                                                    Open
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {isFile && (
                                    <div className="flex flex-col gap-2">
                                        {isImage && (
                                            <img
                                                src={item.data.url}
                                                alt={item.data.name}
                                                className="rounded-lg max-h-36 w-full object-cover"
                                            />
                                        )}

                                        <div className="flex items-center gap-2 text-sm">
                                            <span>
                                                {isImage ? (
                                                    <i className="fa-solid fa-camera"></i>
                                                ) : isPDF ? (
                                                    <i className="fa-solid fa-file-pdf"></i>
                                                ) : (
                                                    <i className="fa-solid fa-folder"></i>
                                                )}
                                                <a
                                                    href={item.data.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline text-blue-200 ml-1 hover:text-blue-100"
                                                >
                                                    {item.data.name}
                                                </a>
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleDownload(item.data.url, item.data.name)}
                                            className={
                                            `flex items-center gap-1 text-[11px] opacity-90  text-white w-fit py-1 px-2 rounded-xl hover:opacity-100 transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95
                                            ${isOwn ? "bg-gray-700 hover:bg-[#323638]" : "bg-gray-500 hover:bg-gray-600"}`
                                            }
                                        >
                                            <i className="fa-solid fa-download"></i>
                                            Download
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-3 border-t border-slate-700/70 flex items-center gap-2 bg-slate-900">
                <InputField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type message..."
                    wrapperClassName="!mb-0 flex-1"
                    inputClassName="h-10 py-0 bg-slate-800 border-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:ring-sky-500/30"
                />
                <div className="flex items-center gap-2">
                    <button
                        onClick={triggerFilePicker}
                        className="size-10 shrink-0 rounded-4xl bg-sky-500 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-sky-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        type="button"
                    >
                        <i className="fa-solid fa-upload"></i>
                    </button>
                    <button
                        onClick={handleShareLocation}
                        disabled={sharingLocation}
                        className="size-10 shrink-0 rounded-4xl bg-purple-500 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-purple-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                    >
                        <i className="fa-solid fa-location-dot"></i>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />
                    <button
                        onClick={sendMessage}
                        className="size-10 shrink-0 rounded-4xl bg-sky-500 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-sky-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        type="button"
                    >
                        <i className="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>

            <LocationPreviewModal
                selectedLocation={selectedLocation}
                locationPreviewVisible={locationPreviewVisible}
                closeLocationPreview={closeLocationPreview}
                coordsCopied={coordsCopied}
                copyLocationCoordinates={copyLocationCoordinates}
                username={username}
            />
        </div>
    );
}
