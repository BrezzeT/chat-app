import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useToast } from '@chakra-ui/react';
import { API_BASE_URL } from '../config';

export const useSocket = (currentUser) => {
    const socket = useRef(null);
    const toast = useToast();

    useEffect(() => {
        if (!currentUser?._id) return;

        // Initialize socket connection
        const socketInstance = io(API_BASE_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        // Connection event handlers
        socketInstance.on('connect', () => {
            console.log('Socket connected');
            socketInstance.emit('setup', currentUser._id);
        });

        socketInstance.on('connected', () => {
            console.log('Socket setup completed');
        });

        socketInstance.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socketInstance.on('error', (error) => {
            console.error('Socket error:', error);
            toast({
                title: 'Connection Error',
                description: 'Failed to connect to chat server',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        });

        // Message event handlers
        socketInstance.on('message_received', (newMessage) => {
            console.log('New message received:', newMessage);
        });

        socketInstance.on('typing', ({ userId }) => {
            console.log('User is typing:', userId);
        });

        socketInstance.on('stop_typing', ({ userId }) => {
            console.log('User stopped typing:', userId);
        });

        // Store socket instance
        socket.current = socketInstance;

        // Cleanup on unmount
        return () => {
            if (socket.current) {
                socket.current.disconnect();
                socket.current = null;
            }
        };
    }, [currentUser?._id, toast]);

    // Socket actions
    const sendMessage = (message) => {
        if (socket.current) {
            socket.current.emit('new_message', message);
        }
    };

    const startTyping = (receiverId) => {
        if (socket.current) {
            socket.current.emit('typing', { to: receiverId });
        }
    };

    const stopTyping = (receiverId) => {
        if (socket.current) {
            socket.current.emit('stop_typing', { to: receiverId });
        }
    };

    const markMessageAsRead = (messageId, senderId) => {
        if (socket.current) {
            socket.current.emit('mark_as_read', { messageId, senderId });
        }
    };

    return {
        socket: socket.current,
        sendMessage,
        startTyping,
        stopTyping,
        markMessageAsRead,
        isConnected: socket.current?.connected || false,
    };
};

export default useSocket; 