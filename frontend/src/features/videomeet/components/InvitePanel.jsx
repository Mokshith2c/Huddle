import React from "react";
import { QRCodeSVG } from "qrcode.react";

export default function InvitePanel({
    showInvite,
    setShowInvite,
    inviteLink,
    copied,
    handleCopyInvite,
    handleShareInvite,
    handleWhatsAppInvite
}) {
    if (!showInvite) return null;

    return (
        <div className="absolute bottom-23 right-5 bg-slate-900 p-4 rounded-lg flex flex-col gap-2 z-20">
            <div className="flex items-center justify-center gap-7">
                <p className="font-bold text-balance">Meeting Link</p>
                <button 
                    className="h-8 w-8 ml-2 rounded-full text-slate-300 transition hover:text-white" 
                    onClick={() => setShowInvite(false)}
                >
                    <i className="fa-regular fa-circle-xmark"></i>
                </button>
            </div>
            <div className="w-fit">
                <input
                    value={inviteLink}
                    readOnly
                    className="px-2 py-1 text-sm bg-slate-800 text-white rounded w-39"
                />
            </div>

            <div className="flex gap-8 items-center justify-center text-white">
                <button onClick={handleCopyInvite} title="Copy link">
                    {copied ? (
                        <i className="fa-solid fa-circle-check text-emerald-400"></i>
                    ) : (
                        <i className="fa-solid fa-copy"></i>
                    )}
                </button>
                
                <button onClick={handleShareInvite} title="Share via native device sharing">
                    <i className="fa-solid fa-share-nodes"></i>
                </button>

                <button onClick={handleWhatsAppInvite} title="Share on WhatsApp">
                    <i className="fa-brands fa-whatsapp"></i>
                </button>
            </div>

            <div className="bg-white p-2 rounded w-39 flex items-center justify-center">
                <QRCodeSVG value={inviteLink} size={140} />
            </div>
        </div>
    );
}
