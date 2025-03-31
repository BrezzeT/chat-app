import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
import Message from "../models/message.model.js"

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body
    try {

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "Все поля обязательны" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Пароль не має 6 символів" });
        }
        const user = await User.findOne({ email })

        if (user) return res.status(400).json({ message: "email не подходит" });

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
        });

        if (newUser) {
            generateToken(newUser._id, res)
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic: newUser.profilePic,
            });
        } else {
            res.status(400).json({ message: "Не правильний юзер" });
        };


    } catch (error) {
        console.log("Ошибка входа", error.message);
        res.status(500).json({ message: "Интернет ошибка" });
    };
};

export const login = async (req, res) => {
    const { email, password } = req.body
    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: "Ошибка" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Ошибка" });
        }
        generateToken(user._id, res)
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic,
        })
    } catch (error) {
        console.log("Ошибка входа", error.message);
        res.status(500).json({ message: "Ошибка соеденения" });
    }
};

export const logout = (req, res) => {


    try {
        res.cookie("jwt", "", { maxAge: 0 })
        res.status(200).json({ message: "Вы успевно вошли" });
    } catch (error) {
        console.log("Ошибка входа", error.message);
        res.status(500).json({ message: "Ошибка соеденения" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { fullName } = req.body;
        const userId = req.user._id;

        if (!fullName || fullName.trim().length === 0) {
            return res.status(400).json({ error: "Full name is required" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { fullName: fullName.trim() },
            { new: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("Error updating profile:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Ошибка checkAuth", error.message);
        res.status(500).json({ message: "Ошибка соебенения" });
    }
}

export const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        // Create the image URL
        const imageUrl = `/uploads/${req.file.filename}`;

        // Update user's profile picture in the database
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profilePic: imageUrl },
            { new: true }
        ).select("-password");

        res.status(200).json({ imageUrl });
    } catch (error) {
        console.error("Error in uploadImage: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get user profile
export const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error in getUserProfile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Block user
export const blockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = req.user;

        // Add user to blocked list
        await User.findByIdAndUpdate(currentUser._id, {
            $addToSet: { blockedUsers: userId }
        });

        // Remove all messages between users
        await Message.deleteMany({
            $or: [
                { senderId: currentUser._id, receiverId: userId },
                { senderId: userId, receiverId: currentUser._id }
            ]
        });

        res.status(200).json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error('Error in blockUser:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Clear chat
export const clearChat = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = req.user;

        // Delete all messages between the two users
        await Message.deleteMany({
            $or: [
                { senderId: currentUser._id, receiverId: userId },
                { senderId: userId, receiverId: currentUser._id }
            ]
        });

        res.status(200).json({ message: 'Chat cleared successfully' });
    } catch (error) {
        console.error('Error in clearChat:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};