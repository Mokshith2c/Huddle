import jwt from "jsonwebtoken"
import dotenv from "dotenv";
import httpStatus from "http-status"

dotenv.config();

export const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if(!token){
        return res.status(httpStatus.UNAUTHORIZED).json({
            message: "No token provided"
        });
    }

    try{
        const decodedRes = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedRes;
        next();
    }catch(err){
        if(err.name === "TokenExpiredError"){
            return res.status(httpStatus.UNAUTHORIZED).json({message: "Token expired"});
        }
        return res.status(401).json({message: "Invalid token"});
    }
}