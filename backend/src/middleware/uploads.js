import multer from "multer";
import path from "path";
import {v4 as uuidv4} from "uuid";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        //extname gives extension of the file, originalname gives the original name of the file
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        //cb(error, filename)
        cb(null, filename);
    },
});

const fileFilter = (req, file, cb) => {
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

    if(allowedTypes.includes(file.mimetype)){
        cb(null, true);
    }else{
        cb(new Error("Invalid file type. Only JPEG, PNG, PDF, and Office documents are allowed."), false);
    }  
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {fileSize: 5 * 1024 * 1024},
});

export default upload;