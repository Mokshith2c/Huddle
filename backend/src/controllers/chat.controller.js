import { Media } from "../models/media.model.js";

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
            senderUsername: req.user.username,
            uploadedByUserId: req.user._id,
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