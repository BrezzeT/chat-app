import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSidebar, sendMessage, getMessages } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.post("/send/:receiverId", protectRoute, sendMessage);
router.get("/:otherUserId", protectRoute, getMessages);

export default router;