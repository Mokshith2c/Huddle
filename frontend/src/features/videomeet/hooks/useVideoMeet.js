import { useRef, useState, useEffect, useContext } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import { silence, black, createEmptyStream } from "../utils/mediaHelpers";
import { buildLocationPayload, parseMapboxGeocode } from "../utils/geocode";

const backendHost = import.meta.env.VITE_BACKEND_HOST || window.location.hostname;
const backendPort = import.meta.env.VITE_BACKEND_PORT || "5000";
const backendProtocol = import.meta.env.VITE_BACKEND_PROTOCOL || "http";
const server_url = `${backendProtocol}://${backendHost}:${backendPort}`;
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

const peerConnectionConfig = {
    'iceServers': [
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
};

export default function useVideoMeet() {
    const { addToUserHistory } = useContext(AuthContext);
    const navigate = useNavigate();
    const { url: meetingCode } = useParams();

    const roomId = meetingCode?.trim() || window.location.pathname.replace(/^\/+/, "");
    const inviteLink = meetingCode
        ? window.location.origin + "/" + encodeURIComponent(meetingCode)
        : "";

    // Refs replacing globals/globals attached to window
    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const fileInputRef = useRef(null);

    const showModalRef = useRef(false);
    const locationPreviewCloseTimer = useRef(null);

    const connectionsRef = useRef({});
    const pendingCandidatesRef = useRef({});
    const screenStreamRef = useRef(null);

    const isConnectingRef = useRef(false);

    const [videoAvailable, setVideoAvailable] = useState(false);
    const [audioAvailable, setAudioAvailable] = useState(false);
    const [video, setVideo] = useState(false);
    const videoRef = useRef(video);
    useEffect(() => {
        videoRef.current = video;
    }, [video]);
    const [audio, setAudio] = useState(false);
    const [screen, setScreen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [whiteboard, setWhiteboard] = useState(false);
    const [messages, setMessages] = useState([]);
    const [reactions, setReactions] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState(() => {
        const token = localStorage.getItem("token");
        if (!token) return "";
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.username || "";
        } catch {
            return "";
        }
    });
    const [videos, setVideos] = useState([]);
    const [participantNames, setParticipantNames] = useState({});
    const [participantVideoState, setParticipantVideoState] = useState({});
    const [showInvite, setShowInvite] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [locationPreviewVisible, setLocationPreviewVisible] = useState(false);
    const [sharingLocation, setSharingLocation] = useState(false);
    const [callStartedAt, setCallStartedAt] = useState(null);
    const [copied, setCopied] = useState(false);
    const [coordsCopied, setCoordsCopied] = useState(false);

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
                handleWhatsAppInvite();
            }
        } catch (error) {
            console.error("Share invite failed", error);
        }
    };

    const handleWhatsAppInvite = () => {
        if (!inviteLink) return;
        const msg = `Join my Huddle meeting: ${inviteLink}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
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

    const broadcastVideoState = (isVideoOn = videoRef.current) => {
        if (!socketRef.current?.connected) return;
        Object.keys(connectionsRef.current).forEach((id) => {
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
        const connection = connectionsRef.current[socketId];
        if (!connection || connection._tracksAdded || !localStreamRef.current) {
            return;
        }
        localStreamRef.current.getTracks().forEach((track) => {
            connection.addTrack(track, localStreamRef.current);
        });
        connection._tracksAdded = true;
    };

    const isPolite = (remoteSocketId) => {
        if (!socketIdRef.current || !remoteSocketId) return true;
        return socketIdRef.current < remoteSocketId;
    };

    const setupPeerConnection = (socketId) => {
        if (!connectionsRef.current[socketId]) {
            connectionsRef.current[socketId] = new RTCPeerConnection(peerConnectionConfig);
            connectionsRef.current[socketId]._tracksAdded = false;
            pendingCandidatesRef.current[socketId] = [];
        }

        const connection = connectionsRef.current[socketId];

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
            setVideos((prevVideos) => {
                const existingIndex = prevVideos.findIndex(
                    (video) => video.socketId === socketId
                );

                const existingStream = existingIndex >= 0 ? prevVideos[existingIndex].stream : null;
                const mergedStream = existingStream || new MediaStream();
                const displayName = getParticipantName(socketId);

                const incomingTracks = event.streams?.[0]?.getTracks() || (event.track ? [event.track] : []);
                incomingTracks.forEach((track) => {
                    const alreadyAdded = mergedStream.getTracks().some((t) => t.id === track.id);
                    if (!alreadyAdded) {
                        mergedStream.addTrack(track);
                    }
                });

                if (existingIndex >= 0) {
                    const updatedVideos = prevVideos.map((video, index) =>
                        index === existingIndex ? { ...video, stream: mergedStream, username: displayName } : video
                    );
                    return updatedVideos;
                }

                const updatedVideos = [
                    ...prevVideos,
                    {
                        socketId,
                        username: displayName,
                        stream: mergedStream,
                        autoPlay: true,
                        playsinline: true
                    }
                ];
                return updatedVideos;
            });
        };

        return connection;
    };

    const replaceTracksForAllConnections = (stream) => {
        Object.entries(connectionsRef.current).forEach(([remoteSocketId, connection]) => {
            if (!connection) return;
            if (remoteSocketId === socketIdRef.current) return;

            let hasTrackUpdate = false;

            stream.getTracks().forEach((track) => {
                const sender = connection.getSenders().find((s) => s.track?.kind === track.kind);
                if (sender) {
                    sender.replaceTrack(track).catch((e) => console.log(e));
                } else {
                    connection.addTrack(track, stream);
                    hasTrackUpdate = true;
                }
            });

            if (hasTrackUpdate) {
                createAndSendOffer(remoteSocketId);
            }
        });
    };

    const applyLocalStream = (stream, { notifyPeers = true } = {}) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        if (notifyPeers) replaceTracksForAllConnections(stream);
    };
    const attachLocalVideo = (node) => {
        localVideoRef.current = node;
        if (node && localStreamRef.current) {
            node.srcObject = localStreamRef.current;
        }
    };

    const createAndSendOffer = (socketId) => {
        const connection = connectionsRef.current[socketId];
        if (!connection || connection.signalingState !== "stable" || !socketRef.current?.connected) return;
        connection._makingOffer = true;
        connection.createOffer()
            .then((description) => connection.setLocalDescription(description))
            .then(() => {
                socketRef.current.emit("signal", socketId, JSON.stringify({ sdp: connection.localDescription }));
            })
            .catch((e) => console.log(e))
            .finally(()=>{
                connection._makingOffer = false;
            })
    };

    const stopLocalStreamTracks = () => {
        localStreamRef.current?.getTracks?.().forEach((track) => {
            try {
                track.stop();
            } catch (e) {
                console.log(e);
            }
        });

        localStreamRef.current = null;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
    };

    const getPermissions = async () => {
        let isVideoAvailable = false;
        let isAudioAvailable = false;
 
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            isVideoAvailable = stream.getVideoTracks().length > 0;
            isAudioAvailable = stream.getAudioTracks().length > 0;
            stream.getTracks().forEach((track) => track.stop());
        } catch {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                isVideoAvailable = true;
                videoStream.getTracks().forEach((track) => track.stop());
            } catch {
                isVideoAvailable = false;
            }
 
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                isAudioAvailable = true;
                audioStream.getTracks().forEach((track) => track.stop());
            } catch {
                isAudioAvailable = false;
            }
        }
 
        setVideoAvailable(isVideoAvailable);
        setAudioAvailable(isAudioAvailable);
        setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    };

    useEffect(() => {
        if(!askForUsername)return;
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [video, audio, askForUsername]);

    useEffect(() => {
        return () => {
            if (locationPreviewCloseTimer.current) {
                clearTimeout(locationPreviewCloseTimer.current);
            }
        };
    }, []);

    const getUserMedia = () => {
        if (video || audio ){
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then((stream) => {
                    if(video) setVideoAvailable(true);
                    if(audio) setAudioAvailable(true);
                    applyLocalStream(stream);
                })
                .catch((e) => {
                    console.log(e);
                    if (video) setVideo(false);
                    if (audio) setAudio(false);
                })
        } else {
            try {
                let tracks = localVideoRef.current?.srcObject?.getTracks?.() || [];
                tracks.forEach(track => track.stop());
                applyLocalStream(createEmptyStream());
            } catch (e) {
                console.log(e);
            }
        }
    };

    useEffect(() => {
        getPermissions();
    }, []);

    useEffect(() => {
        showModalRef.current = showModal;
    }, [showModal]);

    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch (e) {
                    console.log(e);
                }
            });
            screenStreamRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            Object.values(connectionsRef.current).forEach((connection) => {
                try {
                    connection.close();
                } catch (e) {
                    console.log(e);
                }
            });

            connectionsRef.current = {};
            pendingCandidatesRef.current = {};

            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }

            stopLocalStreamTracks();
            stopScreenShare();
        };
    }, []);

    const gotMessageFromServer = async (fromId, messageJson) => {
        const signal = JSON.parse(messageJson);
        if (fromId === socketIdRef.current) return;

        if (typeof signal.videoState === "boolean") {
            setParticipantVideoState((prev) => ({ ...prev, [fromId]: signal.videoState }));
            return;
        }

        const connection = setupPeerConnection(fromId);

        if (signal.sdp) {
            try {
                const remoteDescription = new RTCSessionDescription(signal.sdp);
                const isOffer = remoteDescription.type === "offer";

                if (isOffer && connection.signalingState !== "stable") {
                    await connection.setLocalDescription({ type: "rollback" });
                }
                await connection.setRemoteDescription(remoteDescription);

                if (isOffer) {
                    addLocalTracksOnce(fromId);
                    const answer = await connection.createAnswer();
                    await connection.setLocalDescription(answer);
                    socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: connection.localDescription }));
                }

                const queuedCandidates = pendingCandidatesRef.current[fromId] || [];
                for (const candidate of queuedCandidates) {
                    connection.addIceCandidate(candidate).catch(e => console.log(e));
                }
                pendingCandidatesRef.current[fromId] = [];
            } catch (e) {
                console.log(e);
            }
        }

        if (signal.ice) {
            const candidate = new RTCIceCandidate(signal.ice);
            if (connection.remoteDescription) {
                connection.addIceCandidate(candidate).catch(e => console.log(e));
            } else {
                pendingCandidatesRef.current[fromId] = pendingCandidatesRef.current[fromId] || [];
                pendingCandidatesRef.current[fromId].push(candidate);
            }
        }
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (!showModalRef.current && socketIdSender !== socketIdRef.current) {
            setNewMessages((prevMessages) => prevMessages + 1);
        }
    };

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

    const connectToSocketServer = () => {
        if (socketRef.current || isConnectingRef.current) return;
        isConnectingRef.current = true;
        const token = localStorage.getItem("token");
        const socket = io.connect(server_url, {
            auth: {
                token: token
            }
        });
        socketRef.current = socket;

        socket.on("signal", gotMessageFromServer);
        socket.on("connect_error", (err) => {
            console.error("Socket authentication/connection error:", err.message);
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: "System", data: `Connection error: ${err.message}` }
            ]);
        });

        socket.on("connect", () => {
            const safeUsername =
                typeof username === "string" && username.trim()
                    ? username.trim()
                    : "Guest";
            socket.emit("join-call", roomId, safeUsername);
            socketIdRef.current = socket.id;
        });

        socket.on("chat-message", addMessage);

        socket.on("reaction", (senderId, emoji) => {
            const reactionId = `${senderId}-${Date.now()}-${Math.random()}`;
            const randomLeft = Math.floor(Math.random() * 80) + 10;
            setReactions((prev) => [...prev, { id: reactionId, senderId, emoji, left: randomLeft }]);
            setTimeout(() => {
                setReactions((prev) => prev.filter((r) => r.id !== reactionId));
            }, 2500);
        });

        socket.on("user-left", (id) => {
            setVideos((prevVideos) => prevVideos.filter((v) => v.socketId !== id));
            setParticipantNames((prevNames) => {
                const { [id]: _, ...rest } = prevNames;
                return rest;
            });
            setParticipantVideoState((prevVideoState) => {
                const { [id]: _, ...rest } = prevVideoState;
                return rest;
            });
            connectionsRef.current[id]?.close();
            delete connectionsRef.current[id];
        });

        socket.on("user-joined", (id, clients, usersInRoom = {}, roomStartAt) => {
            setParticipantNames((prevNames) => ({ ...prevNames, ...usersInRoom }));
            if (roomStartAt) {
                setCallStartedAt(roomStartAt);
            }
            setVideos((prevVideos) => prevVideos.map((v) => ({
                ...v,
                username: usersInRoom[v.socketId] || v.username
            })));

            clients.forEach((socketListId) => {
                if (socketListId === socketIdRef.current) {
                    return;
                }

                setupPeerConnection(socketListId);

                if (!localStreamRef.current) {
                    applyLocalStream(createEmptyStream(), { notifyPeers: false });
                }
                addLocalTracksOnce(socketListId);
            });

            if (id === socketIdRef.current) {
                for (let id2 in connectionsRef.current) {
                    if (id2 === socketIdRef.current) continue;
                    try {
                        addLocalTracksOnce(id2);
                        createAndSendOffer(id2);
                    } catch (e) {
                        console.log(e);
                    }
                }
            }

            broadcastVideoState(videoRef.current);
        });
    };

    const toggleAudioBtn = () => {
        const realAudioTrack = localStreamRef.current?.getAudioTracks?.()
        .find((track) => track.readyState === "live" && track.label);
        
        if(audio){
            if(realAudioTrack)realAudioTrack.enabled=false;
            setAudio(false);
            return;
        }
        if (realAudioTrack) {
            realAudioTrack.enabled = true;
            setAudio(true);
            return;
        }
 
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                const newAudioTrack = stream.getAudioTracks()[0];
                const currentVideoTracks = localStreamRef.current?.getVideoTracks?.() || [];
                const combinedStream = new MediaStream([...currentVideoTracks, newAudioTrack]);
 
                const oldAudioTracks = localStreamRef.current?.getAudioTracks?.() || [];
                oldAudioTracks.forEach((track) => {
                    try { track.stop(); } catch (e) { console.log(e); }
                });
 
                applyLocalStream(combinedStream);
                setAudioAvailable(true);
                setAudio(true);
            })
            .catch((e) => {
                console.log("Failed to enable audio:", e);
            });
    };

    const toggleVideoBtn = () => {
        if (!video) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: audio })
                .then((stream) => {
                    applyLocalStream(stream);
                    setVideo(true);
                    setVideoAvailable(true);
                    broadcastVideoState(true);
                })
                .catch((e) => {
                    console.log("Failed to start video:", e);
                });
        } else {
            const currentVideoTracks = localStreamRef.current?.getVideoTracks?.() || [];
            const currentAudioTrack = localStreamRef.current?.getAudioTracks?.()[0] || null;
            const outgoingTracks = [black()];

            if (audio && currentAudioTrack) {
                outgoingTracks.push(currentAudioTrack);
            } else {
                outgoingTracks.push(silence());
            }

            const videoOffStream = new MediaStream(outgoingTracks);

            applyLocalStream(videoOffStream);

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
                    displayStream.getTracks().forEach((t) => t.stop());
                    return;
                }

                // Store the raw display stream so cleanup can stop all its tracks
                screenStreamRef.current = displayStream;

                const currentAudioTracks = localStreamRef.current?.getAudioTracks?.().filter((track) => track.readyState === "live") || [];
                const currentVideoTracks = localStreamRef.current?.getVideoTracks?.() || [];
                const screenStream = new MediaStream([displayVideoTrack, ...currentAudioTracks]);

                try {
                    currentVideoTracks.forEach((track) => track.stop());
                } catch (e) {
                    console.log(e);
                }

                applyLocalStream(screenStream);
                setScreen(true);
                broadcastVideoState(true);

                // When user stops sharing via the browser's native stop button
                displayVideoTrack.onended = () => {
                    stopScreenShare();
                    setScreen(false);
                    getUserMedia();
                    broadcastVideoState(videoRef.current);
                };
            } catch (e) {
                console.log(e);
                setScreen(false);
            }
            return;
        }

        // Manual toggle off: stop display stream tracks before switching back
        stopScreenShare();
        setScreen(false);
        getUserMedia();
        broadcastVideoState(videoRef.current);
    };

    const isNarrowViewport = () =>
        typeof window !== "undefined" && window.innerWidth < 768;

    const showWhiteboard = () => {
        setWhiteboard((prev) => {
            const next = !prev;
            // On narrow screens the whiteboard and chat both go full-width and
            // stack, which can push the video grid and controls off-screen if
            // both are open at once — so only allow one at a time there.
            if (next && isNarrowViewport()) {
                setShowModal(false);
            }
            return next;
        });
    };

    const toggleChat = () => {
        setShowModal((prev) => {
            const next = !prev;
            if (next && isNarrowViewport()) {
                setWhiteboard(false);
            }
            return next;
        });
        setNewMessages(0);
    };

    const sendReaction = (emoji) => {
        socketRef.current?.emit("reaction", emoji);
    };

    const connect = async () => {
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
        connectToSocketServer();
    };

    const sendMessage = () => {
        const trimmedMessage = message.trim();
        const socket = socketRef.current;

        if (!trimmedMessage) return;
        if (!socket || !socket.connected) return;

        socket.emit("chat-message", trimmedMessage, username);
        setMessage("");
    };

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
        navigate('/home');
    };

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

    return {
        // Media controls/states
        video,
        setVideo,
        audio,
        setAudio,
        screen,
        setScreen,
        videoAvailable,
        audioAvailable,
        screenAvailable,
        toggleAudioBtn,
        toggleVideoBtn,
        toggleScreenBtn,

        // Room states/actions
        roomId,
        inviteLink,
        username,
        setUsername,
        askForUsername,
        connect,
        handleEndCall,
        callStartedAt,

        // Connections / Streams
        videos,
        participantVideoState,
        getParticipantName,
        localVideoRef,
        attachLocalVideo,
        
        // Chat & Messaging
        messages,
        reactions,
        message,
        setMessage,
        newMessages,
        setNewMessages,
        sendMessage,
        showModal,
        setShowModal,
        toggleChat,
        sendReaction,

        // File Upload
        fileInputRef,
        triggerFilePicker,
        handleFileUpload,
        handleDownload,

        // Whiteboard
        whiteboard,
        showWhiteboard,
        socket: socketRef.current,

        // Location Sharing & Preview
        selectedLocation,
        locationPreviewVisible,
        sharingLocation,
        coordsCopied,
        handleShareLocation,
        openLocationPreview,
        closeLocationPreview,
        copyLocationCoordinates,

        // Invite states/actions
        showInvite,
        setShowInvite,
        copied,
        handleCopyInvite,
        handleShareInvite,
        handleWhatsAppInvite
    };
}