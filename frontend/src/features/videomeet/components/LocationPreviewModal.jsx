import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapPin } from "@fortawesome/free-solid-svg-icons";
import { getLocationDisplay, formatSharedTime, formatLocationCardTime } from "../utils/geocode";

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = mapboxToken;

export default function LocationPreviewModal({
    selectedLocation,
    locationPreviewVisible,
    closeLocationPreview,
    coordsCopied,
    copyLocationCoordinates,
    username
}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);

    useEffect(() => {
        if (!selectedLocation || !mapContainerRef.current || !mapboxToken) return;

        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [selectedLocation.lng, selectedLocation.lat],
            zoom: 13
        });

        const markerElement = document.createElement("div");
        markerElement.className = "relative flex h-11 w-11 items-center justify-center";
        markerElement.innerHTML = `
            <span class="absolute h-12 w-12 rounded-full bg-violet-500/20 animate-ping" style="animation-duration:2.8s"></span>
            <span class="absolute h-10 w-10 rounded-full bg-violet-400/25 blur-sm"></span>
            <span class="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-linear-to-br from-violet-400 to-fuchsia-500 text-white shadow-lg shadow-violet-500/40">
                <i class="fa-solid fa-location-dot text-sm"></i>
            </span>
        `;

        new mapboxgl.Marker({ element: markerElement, anchor: "bottom" })
            .setLngLat([selectedLocation.lng, selectedLocation.lat])
            .addTo(mapRef.current);

        mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        const centerLocationMap = () => {
            if (!mapRef.current || !selectedLocation) return;
            mapRef.current.easeTo({
                center: [selectedLocation.lng, selectedLocation.lat],
                zoom: 14,
                essential: true
            });
        };

        // Attach center function to window temporarily or handle locally
        window._centerLocationMap = centerLocationMap;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            delete window._centerLocationMap;
        };
    }, [selectedLocation]);

    if (!selectedLocation) return null;

    const locationDisplay = getLocationDisplay(selectedLocation);

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-3 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4 ${locationPreviewVisible ? "opacity-100" : "opacity-0"}`}>
            <div className={`relative flex w-full max-w-4xl max-h-[94vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-200 sm:rounded-3xl ${locationPreviewVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"}`}>
                <div className="flex items-start justify-between gap-4 border-b border-white/5 px-4 py-4 sm:px-6">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-lg font-semibold leading-tight text-white sm:text-xl">
                            <span aria-hidden="true">
                                <FontAwesomeIcon icon={faMapPin} />
                            </span>
                            <span className="truncate">{locationDisplay.placeName}</span>
                        </div>
                        {locationDisplay.cityCountry && (
                            <p className="mt-1 truncate text-sm text-slate-400">
                                {locationDisplay.cityCountry}
                            </p>
                        )}
                        <p className="mt-2 text-xs text-slate-400">
                            Shared by <span className="font-medium text-slate-200">{selectedLocation.sharedBy || username}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            {formatSharedTime(selectedLocation.sharedAt)}
                        </p>
                    </div>
                    <button
                        onClick={closeLocationPreview}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="overflow-y-auto px-4 py-4 sm:px-6">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-1.5 shadow-inner">
                        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(18rem,calc(100%-1.5rem))] rounded-xl border border-white/10 bg-slate-900/80 p-3.5 shadow-lg backdrop-blur-md sm:left-4 sm:top-4 sm:max-w-xs sm:p-4">
                            <p className="text-xs text-slate-400">
                                Shared by <span className="font-medium text-slate-200">{selectedLocation.sharedBy || username}</span>
                            </p>
                            <p className="mt-1.5 text-xs text-slate-400">
                                {formatLocationCardTime(selectedLocation.sharedAt)}
                            </p>
                            {locationDisplay.accuracyText && (
                                <p className="mt-1 text-xs text-slate-400">
                                    {locationDisplay.accuracyText}
                                </p>
                            )}
                        </div>

                        <div
                            ref={mapContainerRef}
                            className="h-[48vh] min-h-[220px] w-full overflow-hidden rounded-xl sm:h-[56vh]"
                        />
                    </div>

                    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
                        <button
                            onClick={() => window.open(`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`, "_blank")}
                            className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:bg-violet-500 hover:shadow-violet-500/35 active:scale-[0.98] sm:py-3.5"
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square"></i>
                            Open in Google Maps
                        </button>
                        <button
                            onClick={copyLocationCoordinates}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.98] sm:w-auto sm:px-5 sm:py-3.5 ${coordsCopied ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"}`}
                        >
                            <i className={coordsCopied ? "fa-solid fa-check" : "fa-regular fa-copy"}></i>
                            {coordsCopied ? "Copied" : "Copy Coordinates"}
                        </button>
                        <button
                            onClick={() => window._centerLocationMap?.()}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.98] sm:w-auto sm:px-5 sm:py-3.5"
                        >
                            <i className="fa-solid fa-crosshairs"></i>
                            Center Map
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
