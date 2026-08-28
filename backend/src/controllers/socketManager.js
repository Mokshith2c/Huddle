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
//       ],
//       socketId: 'si-P6zL8WT8Sqy3bAAAD'
//     },
//     {
//       color: "red",
//       size: 4,
//       points: [
//         { x: 50, y: 60 },
//         { x: 55, y: 65 }
//       ],
//       socketId: 'Fi-P6zL8WT8Sqy3bAAAD'
//     }
//   ]
// }

let redoState = {}
// Ex:
// redoState = {
//   "/room1": [
//     {
//       stroke: {
//         color: "blue",
//         size: 3,
//         points: [...],
//         socketId: "..."
//       },
//       index: 1
//     }
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
        socket.on('join-call', async (path, username) => {
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
            const roomId = socket.data.roomPath;
            if(!roomId || !roomUsers[roomId]?.[toId])return;
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
            if (history.length === 0) return;
            if (!redoState[roomId]) redoState[roomId] = []

            let strokeIndex = -1;
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].socketId === socket.id) {
                    strokeIndex = i;
                    break;
                }
            }

            if (strokeIndex !== -1) {
                console.log(history);
                //splice returns array, so [0] gives obj
                const removedStroke = history.splice(strokeIndex, 1)[0];
                console.log(removedStroke);
                redoState[roomId].push({stroke: removedStroke, index: strokeIndex});
                console.log(redoState);
                if (redoState[roomId].length > 1000) {
                    redoState[roomId].shift();
                }
                io.to(roomId).emit("whiteboard-update", history);
            }
        })
        socket.on("whiteboard-redo", () => {
            const roomId = socket.data.roomPath;
            if (!roomId) return;
            if (!whiteboardState[roomId])return;
            const history = whiteboardState[roomId];

            if (!redoState[roomId]) redoState[roomId] = [];
            const redoStack = redoState[roomId];

            if (redoStack.length === 0) return;

            let redoIndex = -1;
            for (let i = redoStack.length - 1; i >= 0; i--) {
                if (redoStack[i].stroke.socketId === socket.id) {
                    redoIndex = i;
                    break;
                }
            }

            if (redoIndex !== -1) {
        const { stroke, index } = redoStack.splice(redoIndex, 1)[0];

        // Put the stroke back at its original position
        history.splice(
            Math.min(index, history.length),
            0,
            stroke
        );

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


        socket.on("chat-message", (data, sender) => {
            const matchingRoom = socket.data.roomPath;
            const found = Boolean(matchingRoom);
            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, 'data': data, 'socket-id-sender': socket.id });

                // Send msg to everyone in the room
                io.to(matchingRoom).emit('chat-message', data, sender, socket.id);
            }

        })


        // Runs automatically when user: closes browser, loses internet, leaves meeting
        socket.on('disconnect', async () => {
            const key = socket.data.roomPath;

            if (key) {
                io.to(key).emit('user-left', socket.id);
                if(roomUsers[key]){
                    delete roomUsers[key][socket.id];
                    //if no one left in room
                    if(Object.keys(roomUsers[key]).length === 0){
                        delete roomUsers[key];
                        delete roomStartTimes[key];
                        delete whiteboardState[key];
                        delete redoState[key];
                        delete messages[key];
                    }
                }
            }
        })
    })
    return io;
}
