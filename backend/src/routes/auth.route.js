import express from "express"
import { checkAuth, login, logout, signup, updateProfile, uploadImage, blockUser, getUserProfile, clearChat } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

const router = express.Router()

// Authentication routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/check", protectRoute, checkAuth);

// Profile routes
router.post("/upload-image", protectRoute, upload.single('profilePic'), uploadImage);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/profile/:userId", protectRoute, getUserProfile);

// User interaction routes
router.post("/block/:userId", protectRoute, blockUser);
router.delete("/chat/:userId", protectRoute, clearChat);

export default router;