import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js"
import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { Media } from "../models/media.model.js";
import { roomUsers } from "./socketManager.js";

dotenv.config();

const generateToken = (user) => {
    return jwt.sign(
        { username: user.username, _id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid password"
            });
        }
        let token = generateToken(user);

        return res.status(httpStatus.OK).json({
            token: token,
            message: "Login Successful"
        });
    } catch (e) {
        return res.status(500).json({ message: `Error: ${e.message}` });
    }
}
const register = async (req, res) => {
    const { name, username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({ message: "User already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();
        const token = generateToken(newUser);
        res.status(httpStatus.CREATED).json({
            token: token,
            message: "User Registered Successfully"
        });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Error: ${e.message}` });
    }
}

const logout = async (req, res) => {
    res.status(httpStatus.OK).json({ message: "Logged out successfully" });
}

const getUserHistory = async (req, res) => {
    try {
        const username = req.user.username;
        const meetings = await Meeting.find({ username: username })
            .sort({ date: -1 })
            .lean();
        res.json(meetings);
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Error ${e.message}` });
    }
}

const addToHistory = async (req, res) => {
    const { meeting_code, date } = req.body;

    try {
        const username = req.user.username;
        const normalizedMeetingCode = typeof meeting_code === "string" ? meeting_code.trim() : "";
        if (!normalizedMeetingCode) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "meeting_code is required" });
        }

        const parsedDate = date ? new Date(date) : new Date();
        const meetingDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        await Meeting.create({
            username: username,
            meetingCode: normalizedMeetingCode,
            date: meetingDate
        });
        res.status(httpStatus.CREATED).json({ message: "Meeting Added to history" })
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Error: ${e.message}` });
    }
};

const getMediaHistory = async (req, res) => {
    try {
        const username = req.user.username;
        const meetings = await Meeting.find({ username: username });
        const meetingCodesFromHistory = meetings.map((m) => m.meetingCode);
        const meetingCodesFromUploads = await Media.distinct("meetingCode", {
            senderUsername: username
        });
        const meetingCodes = [...new Set([...meetingCodesFromHistory, ...meetingCodesFromUploads])]
            .filter((code) => typeof code === "string" && code.trim().length > 0);

        const media = await Media.find({
            meetingCode: { $in: meetingCodes }
        }).sort({ uploadedAt: -1 });

        const groupedMedia = {}
        media.forEach(item => {
            if (!groupedMedia[item.meetingCode]) {
                groupedMedia[item.meetingCode] = [];
            }
            groupedMedia[item.meetingCode].push(item);
        })
        res.status(httpStatus.OK).json(groupedMedia);
    }
    catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Error: ${e.message}`
        });
    }
}

const updateMeetingTags = async (req, res) => {
    console.log(req);
    console.log("req", req.body);
    const { id } = req.params;
    const { tags } = req.body;
 
    try {
        const username = req.user.username;
        const meeting = await Meeting.findOne({ _id: id, username: username });
 
        if (!meeting) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "History entry not found" });
        }
 
        meeting.tags = tags;
        await meeting.save();
 
        res.status(httpStatus.OK).json({ message: "Tags updated", tags: meeting.tags });
    } catch (e) {
        if (e.name === "CastError") {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid history entry id" });
        }
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Error: ${e.message}` });
    }
};

const checkRoom = (req, res) => {
    const code = req.params.code;
    if (!code || typeof code !== "string" || !code.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Meeting code is required" });
    }
    res.set("Cache-Control", "no-store");
    const roomKey = code.trim();
    const usersInRoom = roomUsers[roomKey];
    const isActive = Boolean(usersInRoom && Object.keys(usersInRoom).length > 0);
    return res.status(httpStatus.OK).json({ active: isActive, exists: isActive });
};

export { login, register, logout, getUserHistory, addToHistory, getMediaHistory, updateMeetingTags, checkRoom };