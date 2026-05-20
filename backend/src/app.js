import express from "express";
import { createServer } from "node:http";
import { connectToSocket } from "./controllers/socketManager.js";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat.routes.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);
app.set("port", (process.env.PORT || 8080));
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_TEST_URL,
  "https://huddlemeet.tech",
  "https://www.huddlemeet.tech"
].filter(Boolean);
// app.use(cors({
//     origin: [process.env.FRONTEND_URL, process.env.FRONTEND_TEST_URL],
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true
// }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }))

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use("/api/v1/chat", chatRoutes);
app.use("/uploads", express.static("uploads"));

app.use("/api/v1/users", userRoutes);

app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/home", (req, res) => {
  return res.json({ "hello": "World" })
});

const start = async () => {
  const connectionDb = await mongoose.connect(process.env.MONGODB_URI)
  console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`)
  server.listen(app.get("port"), () => {
    console.log("Listening on port 8080");
  })
  console.log("ENV FRONTEND_URL:", process.env.FRONTEND_URL);
}

start();