import { Media } from "../models/media.model.js";
import {PDFParse} from "pdf-parse";
import axios from "axios";

export const uploadFile = async (req, res) => {
    try{
        if(!req.file){
            return res.status(400).json({message: "No file uploaded"});
        }

        const file = req.file;
        const fileUrl = file.path || file.secure_url || `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
        const {meetingCode} = req.body;

        if(!meetingCode || typeof meetingCode !== "string" || !meetingCode.trim()){
            return res.status(400).json({message: "meetingCode is required"});
        }

        
        const media = new Media({
            meetingCode: meetingCode.trim(),
            url: fileUrl, // cloudinary url
            name: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            senderUsername: req.user?.username || "Guest",
            uploadedByUserId: req.user?._id || null,
            uploadedAt: new Date(),
        });

        await media.save();

        return res.json({
            id: file.filename,
            url : fileUrl,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: req.user?.username || "Guest",
            uploadedByUserId: req.user._id,
            uploadedAt: media.uploadedAt,
        });
    } catch(err){
        res.status(500).json({message: "Error uploading file", error: err.message});
    }
}

export const summarizePdf = async (req, res) => {
    try {
        const { fileUrl } = req.body;

        if (!fileUrl || typeof fileUrl !== "string") {
            return res.status(400).json({ message: "fileUrl is required" });
        }

        const parser = new PDFParse({url: fileUrl});
        let result;
        try{
            result = await parser.getText();
        }finally{
            await parser.destroy();
        }

        const text = result.text?.trim() || "";
        if (text.length < 50) {
            return res.status(422).json({
                message: "This file has no readable text to summarize (it may be a scanned document)."
            });
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return res.status(500).json({ message: "Summarization is not configured on the server." });
        }

        const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
        const prompt = `
            Summarize the following document in exactly 2-3 bullet points.

            Rules:
            - Capture the document's main purpose and most important information.
            - Include key facts, requirements, decisions, findings, conclusions, dates, numbers, or actions when relevant.
            - Each bullet must be no more than 25 words.
            - Use only information explicitly stated in the document.
            - Do not guess, infer, or invent information.
            - Avoid minor details and repetition.
            - Start every bullet with "- ".
            - Return only the bullet points, with no introduction or conclusion.

            Document:
            ${text.slice(0, 8000)}`;
        const geminiRes = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            {
                method: "POST",
                headers: {
                    "x-goog-api-key": geminiApiKey,
                    "Content-Type": "application/json",
                    "Api-Revision": process.env.GEMINI_API_REVISION || "2026-05-20"
                },
                body: JSON.stringify({
                    model: geminiModel,
                    input: prompt,
                })
            }
        );
        
        if (!geminiRes.ok) {
            const errBody = await geminiRes.text();
            console.error("Gemini API error:", errBody);
            return res.status(502).json({ message: "Gemini is temporarily unavailable. Please try again" });
        }
        
        const geminiData = await geminiRes.json();
        const summary = geminiData?.steps
            ?.find(step => step.type === "model_output")
            ?.content?.find(item => item.type === "text")
            ?.text?.trim();

        if (!summary) {
            return res.status(502).json({ message: "Summarization failed. Empty response from AI." });
        }

        return res.json({ summary });
    } catch (err) {
        console.error("PDF summarize error:", err);
        res.status(500).json({ message: "Error summarizing file", error: err.message });
    }
};
