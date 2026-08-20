import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

let messages = {}
// Ex: 
// messages = {
//  "/room1":[
//    {sender:"John", data:"Hello", socket-id-sender:"abc123"},
//    {sender:"Mike", data:"Hi", socket-id-sender:"xyz456"}
//  ]
// }
let timeOnline = {}
// Ex:
// timeOnline = {
//  "socket123": Date,
//  "socket456": Date
// }
export let roomUsers = {}
// Ex:
// roomUsers = {
//  "/room1": {
//      "socket1": "John",
//      "socket2": "Mike"
//  }
// }

let whiteboardState = {}
// whiteboardState = {
//   "/room1": [
//     {
//       color: "black",
//       size: 2,
//       points: [
//         { x: 10, y: 20 },
//         { x: 15, y: 25 },
//         { x: 20, y: 30 }
//       ]
//     },
//     {
//       color: "red",
//       size: 4,
//       points: [
//         { x: 50, y: 60 },
//         { x: 55, y: 65 }
//       ]
//     }
//   ]

let redoState = {}
// Ex:
// redoState = {
//   "/room1": [
//     {
//       color: "blue",
//       size: 3,
//       points: [
//         { x: 100, y: 120 },
//         { x: 110, y: 130 }
//       ]
//     },
//     ...
//   ]
// }

let roomStartTimes = {}
// Ex:
// roomStartTimes = {
//   "/room1": 1710840000000
// }
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_TEST_URL,
    "https://huddlemeet.tech",
    "https://www.huddlemeet.tech"
].filter(Boolean);

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            return next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on('connection', (socket) => {
        console.log("Something Connected");
        socket.on('join-call', async (path, username) => {
            console.log(socket.data);
            if (roomUsers[path] === undefined) {
                roomUsers[path] = {}
            }
            if (roomStartTimes[path] === undefined) {
                roomStartTimes[path] = Date.now();
            }

            const safeUsername =
                typeof username === "string" && username.trim()
                    ? username.trim()
                    : "Guest";

            socket.join(path);
            socket.data.roomPath = path;
            roomUsers[path][socket.id] = safeUsername;
            timeOnline[socket.id] = new Date();

            const clientsInRoom = await io.in(path).fetchSockets();
            const clientIds = clientsInRoom.map((clientSocket) => clientSocket.id);
            io.to(path).emit("user-joined", socket.id, clientIds, roomUsers[path], roomStartTimes[path]);

            //Send old messages to new user
            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; a++) {
                    io.to(socket.id).emit('chat-message',
                        messages[path][a]['data'],
                        messages[path][a]['sender'],
                        messages[path][a]['socket-id-sender'])
                }
            }

            io.to(socket.id).emit("whiteboard-update", whiteboardState[path] || []);
        })


        //for WebRTC signaling,as WebRTC cannot directly start connection.
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("whiteboard-draw", (stroke) => {
            const roomId = socket.data.roomPath;
            if (!roomId) return;

            stroke.socketId = socket.id;

            if (!whiteboardState[roomId]) {
                whiteboardState[roomId] = [];
            }
            if (!redoState[roomId]) {
                redoState[roomId] = [];
            }

            whiteboardState[roomId].push(stroke);
            redoState[roomId] = [];

            if (whiteboardState[roomId].length > 1000) {
                whiteboardState[roomId].shift();
            }
            io.to(roomId).emit("whiteboard-update", whiteboardState[roomId]);
        })

        socket.on("whiteboard-undo", () => {
            const roomId = socket.data.roomPath;
            if (!roomId) return;
            if (!whiteboardState[roomId]) return;
            const history = whiteboardState[roomId];
            if (!history || history.length === 0) return;
            if (!redoState[roomId]) redoState[roomId] = []

            let strokeIndex = -1;
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].socketId === socket.id) {
                    strokeIndex = i;
                    break;
                }
            }

            if (strokeIndex !== -1) {
                const removedStroke = history.splice(strokeIndex, 1)[0];
                redoState[roomId].push(removedStroke);
                if (redoState[roomId].length > 1000) {
                    redoState[roomId].shift();
                }
                io.to(roomId).emit("whiteboard-update", history);
            }
        })
        socket.on("whiteboard-redo", () => {
            const roomId = socket.data.roomPath;
            if (!roomId) return;
            if (!whiteboardState[roomId]) {
                whiteboardState[roomId] = [];
            }
            const history = whiteboardState[roomId];

            if (!redoState[roomId]) redoState[roomId] = [];
            const redoStack = redoState[roomId];

            if (!redoStack || redoStack.length === 0) return;

            let strokeIndex = -1;
            for (let i = redoStack.length - 1; i >= 0; i--) {
                if (redoStack[i].socketId === socket.id) {
                    strokeIndex = i;
                    break;
                }
            }

            if (strokeIndex !== -1) {
                const stroke = redoStack.splice(strokeIndex, 1)[0];
                history.push(stroke);
                io.to(roomId).emit("whiteboard-update", history);
            }
        });
        socket.on("whiteboard-clear", () => {
            const roomId = socket.data.roomPath;
            if (!roomId) return;
            whiteboardState[roomId] = [];
            redoState[roomId] = [];
            io.to(roomId).emit("whiteboard-update", []);
        })

        // Allows clients that mount late to request the latest whiteboard state.
        socket.on("whiteboard-sync", () => {
            const roomId = socket.data.roomPath;
            if (!roomId) return;

            io.to(socket.id).emit("whiteboard-update", whiteboardState[roomId] || []);
        })


        //Triggered when someone sends chat.
        socket.on("chat-message", (data, sender) => {
            const matchingRoom = socket.data.roomPath;
            const found = Boolean(matchingRoom);

            // let matchingRoom = ''
            // let found = false

            // for(const [room, users] of Object.entries(connections)){
            //     if(users.includes(socket.id)){
            //         matchingRoom = room
            //         found = true
            //         break
            //     }
            // }

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                // Store the message in memory
                messages[matchingRoom].push({ 'sender': sender, 'data': data, 'socket-id-sender': socket.id });
                console.log("message", matchingRoom, ":", sender, data);

                // Send the message to everyone in the room
                io.to(matchingRoom).emit('chat-message', data, sender, socket.id);
            }

        })


        // Runs automatically when user: closes browser, loses internet, leaves meeting
        socket.on('disconnect', async () => {
            var diffTime = Math.abs((timeOnline[socket.id] || new Date()) - new Date());
            const key = socket.data.roomPath;

            if (key) {
                io.to(key).emit('user-left', socket.id);
                delete roomUsers[key]?.[socket.id];

                const clientsInRoom = await io.in(key).fetchSockets();
                if (clientsInRoom.length === 0) {
                    delete roomUsers[key]
                    delete roomStartTimes[key]
                    delete whiteboardState[key]
                    delete messages[key]
                    delete redoState[key]
                }
            }
        })
    })
    return io;
}
