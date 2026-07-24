import { Router } from "express";
import {login, register, logout, getUserHistory, addToHistory, getMediaHistory, checkRoom} from '../controllers/user.controller.js'
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validateRequest, signInSchema, signUpSchema } from "../middleware/joi.validation.js";

const router = Router();

router.route("/login").post(validateRequest(signInSchema), login);
router.route("/register").post(validateRequest(signUpSchema), register);
router.route("/logout").post(authMiddleware, logout);
router.route("/add_to_activity").post(authMiddleware, addToHistory);
router.route("/get_all_activity").get(authMiddleware, getUserHistory);
router.get("/media-history", authMiddleware, getMediaHistory);
router.get("/check-room/:code", checkRoom);

export default router;
