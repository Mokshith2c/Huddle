import React from 'react'
import InputField from "../components/InputField.jsx"
import { useRef, useState, useEffect } from "react";
import io from "socket.io-client"
import axios from "axios";
import { MdOutlineScreenShare } from "react-icons/md";
import { MdOutlineStopScreenShare } from "react-icons/md";
import { useNavigate } from 'react-router-dom';
import {useParams } from 'react-router-dom';
import { QRCodeSVG } from "qrcode.react";
import WhiteBoard from '../components/WhiteBoard.jsx';
import MeetingTimer from '../components/MeetingTimer.jsx';
import withAuth from '../utils/withAuth.jsx';
import { AuthContext } from '../contexts/AuthContext.jsx';
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapPin } from '@fortawesome/free-solid-svg-icons';


const backendHost = import.meta.env.VITE_BACKEND_HOST || window.location.hostname;
const backendPort = import.meta.env.VITE_BACKEND_PORT || "5000";
const backendProtocol = import.meta.env.VITE_BACKEND_PROTOCOL || "http";
const server_url = `${backendProtocol}://${backendHost}:${backendPort}`;
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
var connections = {}
var pendingCandidates = {}
// connections = {
//    userA: RTCPeerConnection,
//    userB: RTCPeerConnection
// }

const peerConnectionConfig = {
    'iceServers': [
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
}

const getMapboxContext = (context, type) =>
    context?.find((item) => item.id?.startsWith(`${type}.`))?.text || null;

const parseMapboxGeocode = (features) => {
    if (!features?.length) {
        return { placeName: null, city: null, country: null };
    }

    const primary = features[0];
    const context = primary.context || [];

    const country =
        getMapboxContext(context, "country") ||
        features.find((feature) => feature.place_type?.includes("country"))?.text ||
        null;

    const city =
        getMapboxContext(context, "place") ||
        features.find((feature) => feature.place_type?.includes("place"))?.text ||
        null;

    const neighborhood =
        getMapboxContext(context, "neighborhood") ||
        features.find((feature) => feature.place_type?.includes("neighborhood"))?.text ||
        null;

    const locality =
        getMapboxContext(context, "locality") ||
        features.find((feature) => feature.place_type?.includes("locality"))?.text ||
        null;

    const poi = features.find((feature) => feature.place_type?.includes("poi"))?.text || null;

    const street =
        primary.place_type?.includes("address") ? primary.text : null;

    let placeName = neighborhood || locality || poi || street || primary.text || null;

    if (placeName && city && placeName === city) {
        placeName = neighborhood || locality || street || primary.text || null;
    }

    return { placeName, city, country };
};

const buildLocationPayload = ({ latitude, longitude, accuracy, username, geocodeResult }) => {
    const { placeName, city, country } = geocodeResult || {};
    const roundedAccuracy = Number.isFinite(accuracy) ? Math.round(accuracy) : null;
    const coordinateLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    return {
        type: "location",
        lat: latitude,
        lng: longitude,
        placeName: placeName || null,
        city: city || null,
        country: country || null,
        accuracy: roundedAccuracy,
        label: placeName || coordinateLabel,
        sharedBy: username,
        sharedAt: Date.now()
    };
};

function VideoMeetComponent() {
    const { addToUserHistory } = React.useContext(AuthContext);
    var socketRef = useRef();
    var socketIdRef = useRef();
    var localVideoRef = useRef();
    const fileInputRef = useRef(null);
    const videoRef = useRef([]);
    const isSwitchingStreamRef = useRef(false);
    const showModalRef = useRef(false);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const locationPreviewCloseTimer = useRef(null);
    mapboxgl.accessToken = mapboxToken;


    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(false);
    let [audio, setAudio] = useState(false);
    let [screen, setScreen] = useState(false);
    let [showModal, setShowModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState(false);
    let [whiteboard, setWhiteboard] = useState(false);
    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");
    let [videos, setVideos] = useState([]);
    let [participantNames, setParticipantNames] = useState({});
    let [participantVideoState, setParticipantVideoState] = useState({});
    let [showInvite, setShowInvite] = useState(false);
    let [selectedLocation, setSelectedLocation] = useState(null);
    let [locationPreviewVisible, setLocationPreviewVisible] = useState(false);
    let [sharingLocation, setSharingLocation] = useState(false);
    const [callStartedAt, setCallStartedAt] = useState(null);
    let [copied, setCopied] = useState(false);
    let [coordsCopied, setCoordsCopied] = useState(false);
    let navigate = useNavigate();

    const { url: meetingCode } = useParams();
    const roomId = meetingCode?.trim() || window.location.pathname.replace(/^\/+/, "");
    const inviteLink = meetingCode
    ? window.location.origin + "/" + encodeURIComponent(meetingCode)
    : "";

    const handleCopyInvite = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Copy invite failed", error);
        }
    };

    const handleShareInvite = async () => {
        if (!inviteLink) return;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Join my meeting",
                    text: "Click to join meeting",
                    url: inviteLink,
                });
            } else {
                await handleWhatsAppInvite();
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

    const formatLocationHeading = (label) => {
        const parts = (label || "")
            .split(",")
            .map((part) => part.replace(/\s+\d{5}(-\d{4})?$/, "").trim())
            .filter(Boolean);

        if (!parts.length) {
            return { title: "Shared location", subtitle: "" };
        }

        const title = parts[0];
        const subtitle = parts.length > 1
            ? (parts.length >= 4 ? parts.slice(-3) : parts.slice(1)).join(", ")
            : "";

        return { title, subtitle };
    };

    const getLocationDisplay = (location) => {
        if (!location) {
            return { placeName: "Shared location", cityCountry: "", accuracyText: null };
        }

        const { placeName, city, country, label, lat, lng, accuracy } = location;
        const fallback = formatLocationHeading(label);

        const resolvedPlaceName =
            placeName ||
            fallback.title ||
            (lat != null && lng != null ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : "Shared location");

        const cityCountry = [city, country].filter(Boolean).join(", ") || fallback.subtitle;

        return {
            placeName: resolvedPlaceName,
            cityCountry,
            accuracyText: Number.isFinite(accuracy) && accuracy <= 1500 ? `Accuracy ±${Math.round(accuracy)}m` : null
        };
    };

    const formatSharedTime = (timestamp) => {
        if (!timestamp) return "Just now";

        try {
            return new Intl.DateTimeFormat(undefined, {
                hour: "numeric",
                minute: "2-digit",
                day: "numeric",
                month: "short"
            }).format(new Date(timestamp));
        } catch {
            return "Just now";
        }
    };

    const formatLocationCardTime = (timestamp) => {
        if (!timestamp) return "Just now";

        try {
            const date = new Date(timestamp);
            const datePart = new Intl.DateTimeFormat(undefined, {
                day: "numeric",
                month: "short"
            }).format(date);
            const timePart = new Intl.DateTimeFormat(undefined, {
                hour: "numeric",
                minute: "2-digit"
            }).format(date);

            return `${datePart} • ${timePart}`;
        } catch {
            return "Just now";
        }
    };

    const openLocationPreview = (location) => {
        if (locationPreviewCloseTimer.current) {
            clearTimeout(locationPreviewCloseTimer.current);
            locationPreviewCloseTimer.current = null;
        }

        setSelectedLocation(location);
        setLocationPreviewVisible(false);

        requestAnimationFrame(() => {
            setLocationPreviewVisible(true);
        });
    };

    const closeLocationPreview = () => {
        setLocationPreviewVisible(false);
        setCoordsCopied(false);

        if (locationPreviewCloseTimer.current) {
            clearTimeout(locationPreviewCloseTimer.current);
        }

        locationPreviewCloseTimer.current = setTimeout(() => {
            setSelectedLocation(null);
            locationPreviewCloseTimer.current = null;
        }, 180);
    };

    const copyLocationCoordinates = async () => {
        if (!selectedLocation) return;

        const coordinatesText = `${selectedLocation.lat}, ${selectedLocation.lng}`;

        try {
            await navigator.clipboard.writeText(coordinatesText);
            setCoordsCopied(true);
            setTimeout(() => setCoordsCopied(false), 2000);
        } catch (error) {
            console.error("Copy coordinates failed", error);
        }
    };

    const centerLocationMap = () => {
        if (!mapRef.current || !selectedLocation) return;

        mapRef.current.easeTo({
            center: [selectedLocation.lng, selectedLocation.lat],
            zoom: 14,
            essential: true
        });
    };

    const broadcastVideoState = (isVideoOn) => {
        if (!socketRef.current?.connected) {
            return;
        }

        Object.keys(connections).forEach((id) => {
            if (id === socketIdRef.current) {
                return;
            }

            socketRef.current.emit("signal", id, JSON.stringify({ videoState: !!isVideoOn }));
        });
    };

    const getParticipantName = (socketId) => {
        const name = participantNames[socketId];
        if (typeof name === "string" && name.trim()) {
            return name;
        }
        return socketId;
    };

    const addLocalTracksOnce = (socketId) => {
        const connection = connections[socketId];
        if (!connection || connection._tracksAdded || !window.localStream) {
            return;
        }
        console.log("ADDING TRACKS FOR", socketId);
        window.localStream.getTracks().forEach((track) => {
            connection.addTrack(track, window.localStream);
        });
        connection._tracksAdded = true;
    };

    const setupPeerConnection = (socketId) => {
        if (!connections[socketId]) {
            connections[socketId] = new RTCPeerConnection(peerConnectionConfig);
            connections[socketId]._tracksAdded = false;
            pendingCandidates[socketId] = [];
        }

        const connection = connections[socketId];

        connection.onicecandidate = (event) => {
            if (event.candidate !== null) {
                socketRef.current.emit(
                    "signal",
                    socketId,
                    JSON.stringify({ ice: event.candidate })
                );
            }
        };

        connection.ontrack = (event) => {
            console.log("TRACK RECEIVED", socketId, event);
            setVideos((videos) => {
                const existingIndex = videos.findIndex(
                    (video) => video.socketId === socketId
                );

                const existingStream = existingIndex >= 0 ? videos[existingIndex].stream : null;
                const mergedStream = existingStream || new MediaStream();
                const displayName = getParticipantName(socketId);

                if (event.streams && event.streams[0]) {
                    event.streams[0].getTracks().forEach((track) => {
                        const alreadyAdded = mergedStream.getTracks().some((t) => t.id === track.id);
                        if (!alreadyAdded) {
                            mergedStream.addTrack(track);
                        }
                    });
                } else if (event.track) {
                    const alreadyAdded = mergedStream.getTracks().some((t) => t.id === event.track.id);
                    if (!alreadyAdded) {
                        mergedStream.addTrack(event.track);
                    }
                }

                if (existingIndex >= 0) {
                    const updatedVideos = videos.map((video, index) =>
                        index === existingIndex ? { ...video, stream: mergedStream, username: displayName } : video
                    );
                    videoRef.current = updatedVideos;
                    return updatedVideos;
                }

                const updatedVideos = [
                    ...videos,
                    {
                        socketId,
                        username: displayName,
                        stream: mergedStream,
                        autoPlay: true,
                        playsinline: true
                    }
                ];
                videoRef.current = updatedVideos;
                return updatedVideos;
            });
        };

        return connection;
    };

    const replaceTracksForAllConnections = (stream) => {
        Object.entries(connections).forEach(([remoteSocketId, connection]) => {
            if (!connection) {
                return;
            }

            if (remoteSocketId === socketIdRef.current) {
                return;
            }

            let hasTrackUpdate = false;

            stream.getTracks().forEach((track) => {
                const sender = connection.getSenders().find((s) => s.track?.kind === track.kind);
                if (sender) {
                    sender.replaceTrack(track).catch((e) => console.log(e));
                    hasTrackUpdate = true;
                } else {
                    connection.addTrack(track, stream);
                    hasTrackUpdate = true;
                }
            });

            if (
                hasTrackUpdate &&
                connection.signalingState === "stable" &&
                socketRef.current?.connected
            ) {
                connection
                    .createOffer()
                    .then((description) => connection.setLocalDescription(description))
                    .then(() => {
                        socketRef.current.emit(
                            "signal",
                            remoteSocketId,
                            JSON.stringify({ sdp: connection.localDescription })
                        );
                    })
                    .catch((e) => console.log(e));
            }
        });
    };

    const stopLocalStreamTracks = () => {
        window.localStream?.getTracks?.().forEach((track) => {
            try {
                track.stop();
            } catch (e) {
                console.log(e);
            }
        });

        window.localStream = null;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
    };

    const getPermissions = async () => {
        let isVideoAvailable = false;
        let isAudioAvailable = false;

        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                isVideoAvailable = true;
                videoPermission.getTracks().forEach((track) => track.stop());
            }
        } catch {
            isVideoAvailable = false;
        }

        try {
            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                isAudioAvailable = true;
                audioPermission.getTracks().forEach((track) => track.stop());
            }
        } catch {
            isAudioAvailable = false;
        }

        setVideoAvailable(isVideoAvailable);
        setAudioAvailable(isAudioAvailable);
        setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

        if (isVideoAvailable || isAudioAvailable) {
            try {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({
                    video: video && isVideoAvailable,
                    audio: audio && isAudioAvailable
                });

                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = userMediaStream;
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);

        }
    }, [video, audio]);

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

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [selectedLocation, mapboxToken]);

    useEffect(() => {
        return () => {
            if (locationPreviewCloseTimer.current) {
                clearTimeout(locationPreviewCloseTimer.current);
            }
        };
    }, []);


    let getUserMediaSuccess = (stream) => {
        window.localStream = stream;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }

        replaceTracksForAllConnections(stream);
    };
    const silence = () => {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();

        let dst = oscillator.connect(ctx.createMediaStreamDestination());

        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    }

    const black = ({ width = 640, height = 480 } = {}) => {
        const canvas = Object.assign(document.createElement("canvas"), { width, height });

        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e));
        } else {
            try {
                let tracks = localVideoRef.current?.srcObject?.getTracks?.() || [];
                tracks.forEach(track => track.stop())

                const emptyStream = new MediaStream([black(), silence()]);
                window.localStream = emptyStream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = emptyStream;
                }
                
                replaceTracksForAllConnections(emptyStream);
            } catch (e) {
                console.log(e);
            }
        }
    }
    useEffect(() => {
        getPermissions();
        console.log("Hi");
    }, [])

    useEffect(() => {
        if ((video || screen) && localVideoRef.current && window.localStream) {
            localVideoRef.current.srcObject = window.localStream;
        }
    }, [video, screen]);

    useEffect(() => {
        showModalRef.current = showModal;
    }, [showModal]);

    useEffect(() => {
        return () => {
            Object.values(connections).forEach((connection) => {
                try {
                    connection.close();
                } catch (e) {
                    console.log(e);
                }
            });

            connections = {};
            pendingCandidates = {};

            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }

            stopLocalStreamTracks();
        };
    }, []);

    let gotMessageFromServer = (fromId, message) => {
        const signal = JSON.parse(message);

        if (fromId !== socketIdRef.current) {
            if (typeof signal.videoState === "boolean") {
                setParticipantVideoState((prev) => ({ ...prev, [fromId]: signal.videoState }));
                return;
            }

            const connection = setupPeerConnection(fromId);

            if (signal.sdp) {
                const remoteDescription = new RTCSessionDescription(signal.sdp);
                const isOffer = remoteDescription.type === "offer";

                const remoteDescriptionPromise =
                    isOffer && connection.signalingState !== "stable"
                        ? connection
                            .setLocalDescription({ type: "rollback" })
                            .then(() => connection.setRemoteDescription(remoteDescription))
                        : connection.setRemoteDescription(remoteDescription);

                remoteDescriptionPromise
                    .then(() => {
                        if (isOffer) {
                            addLocalTracksOnce(fromId);
                            connection.createAnswer().then((description) => {
                                connection.setLocalDescription(description).then(() => {
                                    socketRef.current.emit("signal", fromId, JSON.stringify({ "sdp": connection.localDescription }))
                                })
                                    .catch(e => console.log(e));
                            })
                                .catch(e => console.log(e))
                        }

                            const queuedCandidates = pendingCandidates[fromId] || [];
                            queuedCandidates.forEach((candidate) => {
                                connection.addIceCandidate(candidate).catch(e => console.log(e));
                            });
                            pendingCandidates[fromId] = [];
                    })
                    .catch(e => console.log(e))
            }
            if (signal.ice) {
                const candidate = new RTCIceCandidate(signal.ice);
                if (connection.remoteDescription) {
                    connection.addIceCandidate(candidate).catch(e => console.log(e))
                } else {
                    pendingCandidates[fromId] = pendingCandidates[fromId] || [];
                    pendingCandidates[fromId].push(candidate);
                }
            }
        }
    }
    let addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ])
        if (!showModalRef.current && socketIdSender !== socketIdRef.current) {
            setNewMessages((prevMessages) => prevMessages + 1);
        }
    }
    const handleShareLocation = () => {
        if (!socketRef.current || !socketRef.current.connected) {
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: "System", data: "Chat disconnected. Cannot share location." }
            ]);
            return;
        }

        if (!navigator.geolocation) {
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: "System", data: "Geolocation not supported by your browser." }
            ]);
            return;
        }

        if (!mapboxToken) {
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: "System", data: "Mapbox token is missing." }
            ]);
            return;
        }

        setSharingLocation(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                let geocodeResult = { placeName: null, city: null, country: null };

                try {
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=address,poi,neighborhood,locality,place&access_token=${mapboxToken}`
                    );

                    if (response.ok) {
                        const data = await response.json();
                        geocodeResult = parseMapboxGeocode(data.features);
                    } else {
                        console.error("Reverse geocoding failed:", response.status, response.statusText);
                    }
                } catch (error) {
                    console.error("Reverse geocoding failed:", error);
                }

                const locationPayload = buildLocationPayload({
                    latitude,
                    longitude,
                    accuracy,
                    username,
                    geocodeResult
                });

                socketRef.current.emit("chat-message", locationPayload, username);
                setSharingLocation(false);
            },
            (error) => {
                setSharingLocation(false);

                let errorMsg = "Failed to get location.";
                if (error.code === error.PERMISSION_DENIED) {
                    errorMsg = "Location permission denied.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMsg = "Location unavailable.";
                } else if (error.code === error.TIMEOUT) {
                    errorMsg = "Location request timed out.";
                }

                setMessages((prevMessages) => [
                    ...prevMessages,
                    { sender: "System", data: errorMsg }
                ]);
            },
            { enableHighAccuracy: false, timeout: 10000 }
        );
    };
    let connectToSocketServer = () => {
        if (socketRef.current && socketRef.current.connected) return;
        const token = localStorage.getItem("token");
        socketRef.current = io.connect(server_url, {
            auth: {
                token: token
            }
        });
        socketRef.current.on("signal", gotMessageFromServer);
        socketRef.current.on("connect", () => {
            const safeUsername =
                typeof username === "string" && username.trim()
                    ? username.trim()
                    : "Guest";
            socketRef.current.emit("join-call", roomId, safeUsername)
            socketIdRef.current = socketRef.current.id;
            socketRef.current.on("chat-message", addMessage);
            socketRef.current.on("user-left", (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id));
                setParticipantNames((prevNames) => {
                    const updatedNames = { ...prevNames };
                    delete updatedNames[id];
                    return updatedNames;
                });
                setParticipantVideoState((prevVideoState) => {
                    const updatedVideoState = { ...prevVideoState };
                    delete updatedVideoState[id];
                    return updatedVideoState;
                });
                connections[id]?.close();
                delete connections[id];
            })
            socketRef.current.on("user-joined", (id, clients, usersInRoom = {}, roomStartAt) => {
                setParticipantNames((prevNames) => ({ ...prevNames, ...usersInRoom }));
                if (roomStartAt) {
                    setCallStartedAt(roomStartAt);
                }
                setVideos((videos) => videos.map((video) => ({
                    ...video,
                    username: usersInRoom[video.socketId] || video.username
                })));

                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) {
                        return;
                    }

                    setupPeerConnection(socketListId);

                    if (window.localStream !== undefined && window.localStream !== null) {
                        addLocalTracksOnce(socketListId);
                    } else {
                        const blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence()
                        addLocalTracksOnce(socketListId);
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;
                        try {
                            addLocalTracksOnce(id2);
                        } catch (e) {
                            console.log(e);
                        }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit("signal", id2, JSON.stringify({ "sdp": connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e));
                        })
                    }
                }

                broadcastVideoState(video);
            })
        })
    }

    const toggleAudioBtn = () => {
        setAudio((prev) => {
            const newState = !prev;
            const audioTracks = window.localStream?.getAudioTracks?.() || [];

            audioTracks.forEach((track) => {
                track.enabled = newState; // true = unmute, false = mute
            });

            return newState;
        });
    }

    const toggleVideoBtn = () => {
        if (!video) {
            // VIDEO ON
            navigator.mediaDevices.getUserMedia({ video: true, audio: audio })
                .then((stream) => {
                    getUserMediaSuccess(stream);
                    setVideo(true);
                    broadcastVideoState(true);
                })
                .catch((e) => {
                    console.log("Failed to start video:", e);
                });
        } else {
            // VIDEO OFF
            const currentVideoTracks = window.localStream?.getVideoTracks?.() || [];
            const currentAudioTrack = window.localStream?.getAudioTracks?.()[0] || null;
            const outgoingTracks = [];

            if (audio && currentAudioTrack) {
                outgoingTracks.push(currentAudioTrack);
            } else {
                outgoingTracks.push(silence());
            }

            const audioOnlyStream = new MediaStream(outgoingTracks);

            window.localStream = audioOnlyStream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = audioOnlyStream;
            }

            replaceTracksForAllConnections(audioOnlyStream);

            currentVideoTracks.forEach((track) => {
                try {
                    track.stop();
                } catch (e) {
                    console.log(e);
                }
            });

            setVideo(false);
            broadcastVideoState(false);
        }
    };

    const toggleScreenBtn = async () => {
        if (!screen) {
            if (!navigator.mediaDevices?.getDisplayMedia) {
                return;
            }

            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                });
                const displayVideoTrack = displayStream.getVideoTracks()[0] || null;

                if (!displayVideoTrack) {
                    return;
                }

                const currentAudioTracks = window.localStream?.getAudioTracks?.().filter((track) => track.readyState === "live") || [];
                const currentVideoTracks = window.localStream?.getVideoTracks?.() || [];
                const screenStream = new MediaStream([displayVideoTrack, ...currentAudioTracks]);

                isSwitchingStreamRef.current = true;
                try {
                    currentVideoTracks.forEach((track) => track.stop());
                } catch (e) {
                    console.log(e);
                }

                window.localStream = screenStream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }
                replaceTracksForAllConnections(screenStream);
                setScreen(true);
                broadcastVideoState(true);

                displayVideoTrack.onended = () => {
                    setScreen(false);
                    getUserMedia();
                    broadcastVideoState(video);
                };

                setTimeout(() => {
                    isSwitchingStreamRef.current = false;
                }, 0);
            } catch (e) {
                console.log(e);
                isSwitchingStreamRef.current = false;
                setScreen(false);
            }
            return;
        }

        setScreen(false);
        getUserMedia();
        broadcastVideoState(video);
    }
    const showWhiteboard = () => {
        setWhiteboard((prev) => !prev);
    }
    let getMedia = () => {

        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video && videoAvailable, audio: audio && audioAvailable })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e));
        }
        connectToSocketServer();
    }

    let connect = async () => {
        const safeUsername =
            typeof username === "string" && username.trim()
                ? username.trim()
                : "Guest";

        try {
            if (roomId?.trim()) {
                await addToUserHistory(roomId.trim());
            }
        } catch (error) {
            console.error("Failed to add meeting to history", error);
        }

        setUsername(safeUsername);
        setAskForUsername(false);
        getMedia();
    }

    const sendMessage = () => {
        const trimmedMessage = message.trim();
        const socket = socketRef.current;

        if (!trimmedMessage) {
            return;
        }

        if (!socket || !socket.connected) {
            return;
        }

        socket.emit("chat-message", trimmedMessage, username);
        setMessage("");
    }

    const triggerFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handleEndCall = () => {
        stopLocalStreamTracks();

        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        setCallStartedAt(null);
        navigate('/home')
    }


    const handleFileUpload = async (file) => {
        try {
            if (!file) return;

            const socket = socketRef.current;
            if (!socket || !socket.connected) {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { sender: "System", data: "File was not sent because chat is disconnected." }
                ]);
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("meetingCode", roomId);

            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${backendProtocol}://${backendHost}:${backendPort}/api/v1/chat/upload`,
                formData,
                {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                }
            );

            const fileData = res.data;
            const chatPayload = {
                type: "file",
                name: fileData.originalName,
                url: fileData.url
            };
            socket.emit("chat-message", chatPayload, username);
        } catch (error) {
            const uploadMessage =
                error?.response?.data?.message ||
                error?.message ||
                "Unknown upload error";

            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: "System", data: `File upload failed: ${uploadMessage}` }
            ]);
            console.error("File upload failed", error);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    const handleDownload = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();

            const fileURL = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = fileURL;
            link.download = filename;

            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(fileURL);

        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    return (
        <div className="h-screen">
            {
                askForUsername === true ?
                    <div className="h-screen w-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_10%,#16263a_0%,#0b1117_45%,#090e14_100%)] p-4">
                        <div className="w-full max-w-md">
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
                    :
                    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_10%,#16263a_0%,#0b1117_45%,#090e14_100%)] text-slate-100 p-5 flex flex-col gap-5">
                        <MeetingTimer
                            startAt={callStartedAt}
                            isActive={!askForUsername}
                            className="self-start rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 shadow"
                        />
                        <div className="flex flex-1 min-h-0 gap-4 flex-col md:flex-row lg:flex-row">
                            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] auto-rows-fr gap-4 flex-1 min-h-0">
                                {videos.map((video) => {

                                const videoTrack = video.stream?.getVideoTracks()?.[0];
                                const videoStateFromPeer = participantVideoState[video.socketId];
                                const isVideoOn = typeof videoStateFromPeer === "boolean"
                                    ? videoStateFromPeer
                                    : !!videoTrack;

                                return (
                                    <div key={video.socketId} className="relative h-full min-h-0 overflow-hidden rounded-xl border border-slate-700/40 bg-slate-900 shadow-lg">

                    
                                        {!isVideoOn ? (
                                            //AVATAR
                                            <div className="h-full w-full flex items-center justify-center bg-slate-900">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-20 w-20 rounded-full bg-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                                                        {getParticipantName(video.socketId)?.charAt(0).toUpperCase() || "U"}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // VIDEO
                                            <video
                                                key="video-on"
                                                autoPlay
                                                playsInline
                                                className="h-full w-full object-cover"
                                                ref={(ref) => {
                                                    if (!ref) return;

                                                    if (!isVideoOn) {
                                                        ref.srcObject = null;  
                                                        return;
                                                    }

                                                    if (video.stream) {
                                                        if (ref.srcObject !== video.stream) {
                                                            ref.srcObject = video.stream;
                                                        }
                                                    }
                                                }}
                                            />
                                        )}

                                        <span className="absolute right-2.5 bottom-2.5 rounded-md bg-slate-900/70 px-2 py-1 text-xs">
                                            {getParticipantName(video.socketId)}
                                        </span>

                                    </div>
                                );
                            })}
                            </div>
                            {whiteboard && (
                                <div className='w-125 h-[70vh] min-h-0 rounded-xl border border-slate-700/70 bg-slate-900/95 shadow-xl box-border flex flex-col z-10'>
                                    <WhiteBoard showWB={showWhiteboard} socket={socketRef.current} width={500} ></WhiteBoard>
                                </div>
                            )
                            }

                            {showModal && (
                                <div className="max-h-full h-auto w-90 shrink-0 rounded-xl border border-slate-700/70 bg-slate-900/95 flex flex-col shadow-xl z-30 overflow-hidden">
                                    <div className="p-3 border-b border-slate-700/70 font-semibold flex justify-between items-center bg-slate-900">
                                        <div className="text-slate-100">
                                            Chat
                                        </div>
                                        <button className="h-8 w-8 rounded-full text-slate-300 transition hover:bg-slate-800 hover:text-white" onClick={() => setShowModal(false)}>
                                            <i className="fa-regular fa-circle-xmark"></i>
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-900/40">
                                        {messages.map((item, index) => {

                                            const isOwn = item.sender === username;
                                            const isFile = typeof item.data === "object" && item.data.type === "file";
                                            const isLocation = typeof item.data === "object" && item.data.type === "location";

                                            const isImage = isFile && item.data.url.match(/\.(jpg|jpeg|png|gif)$/i);
                                            const isPDF = isFile && item.data.url.match(/\.pdf$/i);

                                            return (
                                                <div
                                                    key={index}
                                                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`
                                                            px-3 py-2 rounded-2xl max-w-55 wrap-break-word
                                                            ${isOwn 
                                                                ? "bg-blue-950 text-white rounded-br-sm" 
                                                                : "bg-slate-700 text-white rounded-bl-sm"}
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
                                                            <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-slate-600/50 bg-slate-800/90 shadow-md">
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
                                                                        <div className="mt-1  text-xs text-slate-400">
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
                                                                        {isImage ?
                                                                         <i className="fa-solid fa-camera"></i>
                                                                         : (isPDF ?
                                                                                <i className="fa-solid fa-file-pdf "></i>
                                                                            :
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
                                                                    className="flex items-center gap-1 text-[11px] opacity-70 bg-blue-900 text-white w-fit py-1 px-2 rounded-xl hover:opacity-100 transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
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
                                        {selectedLocation && (() => {
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
                                                            aria-label="Close location preview"
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
                                                                onClick={centerLocationMap}
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
                                        })()}
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
                                                className="size-10 shrink-0 rounded-4xl bg-sky-500  text-sm font-medium  text-white transition-all duration-200 ease-out hover:bg-sky-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                                type="button"
                                            >
                                                <i className="fa-solid fa-upload"></i>
                                            </button>
                                            <button
                                                onClick={handleShareLocation}
                                                disabled={sharingLocation}
                                                className="size-10 shrink-0 rounded-4xl bg-purple-500  text-sm font-medium  text-white transition-all duration-200 ease-out hover:bg-purple-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                className="size-10 shrink-0 rounded-4xl bg-sky-500  text-sm font-medium  text-white transition-all duration-200 ease-out hover:bg-sky-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                                type="button"
                                            >
                                                <i className="fa-solid fa-paper-plane"></i>
                                            </button>
                                            
                                        </div>
                                    </div>
                                </div>
                            )}


                        </div>


                        <div className="fixed bottom-22.5 h-32.5 w-50 overflow-hidden rounded-xl border-2 border-sky-400/90 bg-slate-900 shadow-xl">
                            {(video || screen) && (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="h-full w-full object-cover"
                                />
                            )}

                            {!(video || screen) && (
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

                        {showInvite && (
                            <div className="absolute bottom-23 right-5 bg-slate-900 p-4 rounded-lg flex flex-col gap-2 ">
                                <div className="flex items-center justify-center gap-7">
                                    <p className='font-bold text-balance'>Meeting Link</p>
                                    <button className="h-8 w-8 ml-2 rounded-full text-slate-300 transition hover:text-white" onClick={() => setShowInvite(!showInvite)}>
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
                        <div className="m-auto flex gap-2.5 rounded-full border border-slate-700/40 bg-slate-900/95 px-3 py-2 shadow-lg">

                            <button
                                onClick={toggleAudioBtn}
                                className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {audio ?
                                    <i className="fa-solid fa-microphone"></i>
                                    :
                                    <i className="fa-solid fa-microphone-slash"></i>
                                }
                            </button>

                            <button
                                onClick={toggleVideoBtn}
                                className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {video ?
                                    <i className="fa-solid fa-video"></i>
                                    :
                                    <i className="fa-solid fa-video-slash"></i>
                                }
                            </button>

                            <button className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={showWhiteboard}>
                                <i className="fa-solid fa-pencil"></i>
                            </button>

                            <div className="relative inline-block">
                                <button className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                    onClick={() => {
                                        setShowModal(prev => !prev)
                                        setNewMessages(0);
                                    }}
                                >
                                    <i className="fa-brands fa-rocketchat"></i>
                                </button>

                                {newMessages > 0 && !showModal && (
                                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold leading-none text-white ring-2 ring-slate-900 shadow">
                                    {newMessages > 99 ? "99+" : newMessages}
                                </span>
                                )}
                            </div>

                            {screenAvailable &&
                                <button className="h-11 w-11 rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95" onClick={toggleScreenBtn}>
                                    {
                                        screen ?
                                            <MdOutlineScreenShare className='size-6 m-auto'></MdOutlineScreenShare>
                                            :
                                            <MdOutlineStopScreenShare className='size-6 m-auto' />
                                    }
                                </button>
                            }
                            <button className="h-11 w-11  rounded-full bg-slate-800 text-lg text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                    onClick={() => setShowInvite(!showInvite)}
                            >
                                <i className="fa-solid fa-user-plus"></i>
                            </button>

                            <button className="h-11 w-11 rounded-full bg-red-500 text-lg text-white transition-all duration-200 ease-out hover:bg-red-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                onClick={handleEndCall}>
                                <i className="fa-solid fa-phone"></i>
                            </button>

                        </div>
                    </div>
            }
        </div >
    )
}

export default withAuth(VideoMeetComponent);