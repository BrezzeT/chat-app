import User from "../models/user.model.js";
import Message from "../models/message.model.js";

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        // Найти всех пользователей, кроме текущего
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
            .select("-password")
            .lean();

        // Получить последние сообщения для каждого пользователя
        const usersWithLastMessage = await Promise.all(
            filteredUsers.map(async (user) => {
                const lastMessage = await Message.findOne({
                    $or: [
                        { senderId: loggedInUserId, receiverId: user._id },
                        { senderId: user._id, receiverId: loggedInUserId }
                    ]
                })
                .sort({ createdAt: -1 })
                .lean();

                return {
                    ...user,
                    lastMessage
                };
            })
        );

        res.status(200).json(usersWithLastMessage);
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

        if (!message || !receiverId) {
            return res.status(400).json({ error: "Message and receiver are required" });
        }

        // Проверяем существование получателя
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ error: "Receiver not found" });
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
            .populate('receiverId', '-password')
            .lean();

        // Transform message for response
        const messageResponse = {
            ...populatedMessage,
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

        if (!otherUserId) {
            return res.status(400).json({ error: "Other user ID is required" });
        }

        // Проверяем существование другого пользователя
        const otherUser = await User.findById(otherUserId);
        if (!otherUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId }
            ]
        })
        .populate('senderId', '-password')
        .populate('receiverId', '-password')
        .sort({ createdAt: 1 })
        .lean();

        // Transform messages for response
        const transformedMessages = messages.map(message => ({
            ...message,
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
