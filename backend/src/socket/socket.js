import { Server } from 'socket.io';

const userSockets = new Map();

export const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: ['http://localhost:5173', 'https://chat-app-front-brezze.onrender.com'],
            credentials: true,
            methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
        upgrade: true
    });

    io.on('connection', (socket) => {
        console.log('New client connected');

        socket.on('setup', (userId) => {
            if (userId) {
                socket.userId = userId;
                userSockets.set(userId, socket.id);
                socket.emit('connected');
                console.log(`User ${userId} setup completed`);
            }
        });

        socket.on('join_chat', (chatId) => {
            if (chatId) {
                socket.join(chatId);
                console.log(`User ${socket.userId} joined chat: ${chatId}`);
            }
        });

        socket.on('typing', ({ to }) => {
            if (to) {
                const socketId = userSockets.get(to);
                if (socketId) {
                    io.to(socketId).emit('typing', { userId: socket.userId });
                }
            }
        });

        socket.on('stop_typing', ({ to }) => {
            if (to) {
                const socketId = userSockets.get(to);
                if (socketId) {
                    io.to(socketId).emit('stop_typing', { userId: socket.userId });
                }
            }
        });

        socket.on('new_message', ({ to, message }) => {
            if (to && message) {
                const socketId = userSockets.get(to);
                if (socketId) {
                    io.to(socketId).emit('message_received', message);
                }
                console.log(`Message sent to ${to}: ${message.message}`);
            }
        });

        socket.on('mark_as_read', ({ messageId, senderId }) => {
            if (messageId && senderId) {
                const socketId = userSockets.get(senderId);
                if (socketId) {
                    io.to(socketId).emit('message_read', { messageId });
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
            if (socket.userId) {
                userSockets.delete(socket.userId);
                io.emit('user_offline', { userId: socket.userId });
            }
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    return io;
};