import User from "../models/user.model.js";
import Message from "../models/message.model.js";

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        // Найти всех пользователей, кроме текущего
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const { receiverId } = req.params;
        const senderId = req.user._id;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            message
        });

        await newMessage.save();

        // Populate sender and receiver data
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', '-password')
            .populate('receiverId', '-password');

        // Transform message for response
        const messageResponse = {
            ...populatedMessage.toJSON(),
            _id: populatedMessage._id.toString(),
            sender: populatedMessage.senderId,
            receiver: populatedMessage.receiverId,
            createdAt: populatedMessage.createdAt.toISOString()
        };

        res.status(201).json(messageResponse);
    } catch (error) {
        console.error("Error in sendMessage: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const userId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId }
            ]
        })
        .populate('senderId', '-password')
        .populate('receiverId', '-password')
        .sort({ createdAt: 1 });

        // Transform messages for response
        const transformedMessages = messages.map(message => ({
            ...message.toJSON(),
            _id: message._id.toString(),
            sender: message.senderId,
            receiver: message.receiverId,
            createdAt: message.createdAt.toISOString()
        }));

        res.status(200).json(transformedMessages);
    } catch (error) {
        console.error("Error in getMessages: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
