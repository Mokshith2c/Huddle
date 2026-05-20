import multer from "multer";
import cloudinary from "./cloudinary.js";
import CloudinaryStorage from "multer-storage-cloudinary";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", 
      "image/png", 
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type. Only JPEG, PNG, PDF, and Office documents are allowed."));
    }

    return cb(null, {
      folder: "uploads", 
      resource_type: "auto", 
      public_id: Date.now() + "-" + file.originalname,
    });
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;