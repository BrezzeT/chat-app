import {
    Box,
    VStack,
    Input,
    Button,
    Text,
    HStack,
    Avatar,
    IconButton,
    useToast,
    Spinner,
    useColorModeValue,
} from '@chakra-ui/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { FiSend } from 'react-icons/fi';
import { format } from 'date-fns';
import _ from 'lodash';
import { API_BASE_URL } from '../config';

const MessageContainer = ({
    selectedUser,
    currentUser,
    socket,
    onTyping,
    messages: initialMessages,
    onMessageSent
}) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const toast = useToast();
    const typingTimeoutRef = useRef(null);
    const messageQueueRef = useRef([]);

    // Update messages when initialMessages changes
    useEffect(() => {
        if (!Array.isArray(initialMessages)) return;
        
        setMessages(prevMessages => {
            const processedMessages = initialMessages.map(msg => ({
                ...msg,
                sender: msg.sender || msg.senderId,
                receiver: msg.receiver || msg.receiverId,
                _id: msg._id || `temp-${Date.now()}-${Math.random()}`,
                createdAt: msg.createdAt || new Date().toISOString()
            }));

            // Compare with previous messages to avoid unnecessary updates
            const prevMessagesStr = JSON.stringify(prevMessages);
            const newMessagesStr = JSON.stringify(processedMessages);
            if (prevMessagesStr === newMessagesStr) {
                return prevMessages;
            }

            // Merge with queued messages and remove duplicates
            const allMessages = [...processedMessages, ...messageQueueRef.current];
            return _.uniqBy(allMessages, msg => 
                msg._id === 'temp' ? msg.message + msg.createdAt : msg._id
            ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
    }, [initialMessages]);

    // Debounced scroll to bottom
    const scrollToBottom = useCallback(
        _.debounce(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100),
        []
    );

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Debounced typing handler
    const handleTyping = useCallback(
        _.debounce(() => {
            if (socket && selectedUser?._id && onTyping) {
                onTyping();
            }
        }, 300),
        [socket, selectedUser?._id, onTyping]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            handleTyping.cancel();
            scrollToBottom.cancel();
        };
    }, [handleTyping, scrollToBottom]);

    // Handle incoming socket messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message) => {
            if (!message?.sender?._id) return;

            setMessages(prev => {
                // Check if message already exists
                const exists = prev.some(msg => 
                    msg._id === message._id || 
                    (msg.sender._id === message.sender._id && 
                     msg.message === message.message && 
                     Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
                );

                if (exists) return prev;

                // Add new message and sort by date
                const newMessages = [...prev, {
                    ...message,
                    _id: message._id || `temp-${Date.now()}-${Math.random()}`,
                    createdAt: message.createdAt || new Date().toISOString()
                }].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                return newMessages;
            });
        };

        socket.on('message_received', handleNewMessage);
        return () => socket.off('message_received', handleNewMessage);
    }, [socket]);

    const handleSendMessage = useCallback(async () => {
        if (!message.trim() || !selectedUser?._id || !currentUser?._id) return;

        const messageText = message.trim();
        setMessage(''); // Clear input immediately for better UX

        // Create temporary message
        const tempMessage = {
            _id: `temp-${Date.now()}-${Math.random()}`,
            message: messageText,
            sender: currentUser,
            receiver: selectedUser,
            createdAt: new Date().toISOString(),
            isTemp: true
        };

        // Add to queue and update UI immediately
        messageQueueRef.current.push(tempMessage);
        setMessages(prev => [...prev, tempMessage].sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
        ));

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/messages/send/${selectedUser._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ message: messageText }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send message');
            }

            const data = await res.json();

            // Remove temporary message and add real one
            messageQueueRef.current = messageQueueRef.current.filter(
                msg => msg._id !== tempMessage._id
            );

            const newMessage = {
                ...data,
                sender: data.sender || currentUser,
                receiver: data.receiver || selectedUser,
                createdAt: data.createdAt || tempMessage.createdAt
            };

            setMessages(prev => {
                // Remove temp message and add real one
                const filtered = prev.filter(msg => msg._id !== tempMessage._id);
                return [...filtered, newMessage].sort((a, b) => 
                    new Date(a.createdAt) - new Date(b.createdAt)
                );
            });

            // Emit socket event
            if (socket && selectedUser?._id) {
                socket.emit('new_message', {
                    to: selectedUser._id,
                    message: newMessage,
                });
            }

            if (onMessageSent) {
                onMessageSent(newMessage);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            
            // Show error toast
            toast({
                title: 'Error sending message',
                description: error.message || 'Please try again',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });

            // Remove temporary message on error
            messageQueueRef.current = messageQueueRef.current.filter(
                msg => msg._id !== tempMessage._id
            );
            
            setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
            
            // Restore message in input
            setMessage(messageText);
        } finally {
            setLoading(false);
        }
    }, [message, selectedUser?._id, currentUser?._id, socket, toast, onMessageSent]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!selectedUser || !currentUser) {
        return (
            <Box
                h="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
            >
                <Text color="gray.500">
                    {!selectedUser ? "Select a user to start chatting" : "Please log in to continue"}
                </Text>
            </Box>
        );
    }

    return (
        <VStack h="100%" spacing={0}>
            {/* Messages Area */}
            <VStack
                flex="1"
                w="100%"
                spacing={4}
                overflowY="auto"
                p={{ base: 2, md: 4 }}
                bg={useColorModeValue('gray.50', 'gray.900')}
                css={{
                    '&::-webkit-scrollbar': {
                        width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                        width: '6px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: useColorModeValue('gray.300', 'gray.600'),
                        borderRadius: '24px',
                    },
                }}
            >
                {messages.map((msg, index) => {
                    if (!msg?.sender?._id || !currentUser?._id) return null;
                    
                    const isSender = msg.sender._id === currentUser._id;
                    const messageDate = msg.createdAt ? new Date(msg.createdAt) : new Date();
                    const showSenderInfo = !isSender && (!messages[index - 1] || messages[index - 1].sender._id !== msg.sender._id);
                    const isFirstMessage = index === 0;
                    
                    return (
                        <Box
                            key={msg._id || index}
                            alignSelf={isSender ? 'flex-end' : 'flex-start'}
                            maxW={{ base: "80%", md: "70%" }}
                            w="fit-content"
                            mt={isFirstMessage ? 0 : undefined}
                        >
                            {showSenderInfo && (
                                <HStack spacing={2} mb={1}>
                                    <Avatar
                                        size="xs"
                                        name={msg.sender.fullName}
                                        src={msg.sender.profilePic}
                                    />
                                    <Text fontSize="sm" color="gray.600">
                                        {msg.sender.fullName}
                                    </Text>
                                </HStack>
                            )}
                            <Box
                                bg={isSender ? 'blue.500' : 'white'}
                                color={isSender ? 'white' : 'black'}
                                px={4}
                                py={2}
                                borderRadius="lg"
                                boxShadow="sm"
                                ml={!isSender && !showSenderInfo ? '28px' : '0'}
                            >
                                <Text fontSize={{ base: "sm", md: "md" }}>{msg.message}</Text>
                            </Box>
                            <Text
                                fontSize="xs"
                                color="gray.500"
                                textAlign={isSender ? 'right' : 'left'}
                                mt={1}
                                ml={!isSender && !showSenderInfo ? '28px' : '0'}
                            >
                                {format(messageDate, 'HH:mm')}
                            </Text>
                        </Box>
                    );
                })}

                <div ref={messagesEndRef} />
            </VStack>

            {/* Input Area */}
            <Box
                w="100%"
                p={{ base: 2, md: 4 }}
                bg={useColorModeValue('white', 'gray.800')}
                borderTopWidth="1px"
                borderColor={useColorModeValue('gray.200', 'gray.700')}
            >
                {selectedUser ? (
                    <form onSubmit={handleSendMessage}>
                        <HStack spacing={2}>
                            <Input
                                value={message}
                                onChange={(e) => {
                                    setMessage(e.target.value);
                                    if (onTyping) {
                                        handleTyping();
                                    }
                                }}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a message..."
                                size={{ base: "sm", md: "md" }}
                                py={{ base: 5, md: 6 }}
                                bg={useColorModeValue('gray.50', 'gray.700')}
                                borderRadius="full"
                                _focus={{
                                    borderColor: 'blue.500',
                                    boxShadow: 'none',
                                }}
                            />
                            <IconButton
                                type="submit"
                                icon={<FiSend />}
                                colorScheme="blue"
                                isRound
                                size={{ base: "sm", md: "md" }}
                                isDisabled={!message.trim()}
                                aria-label="Send message"
                            />
                        </HStack>
                    </form>
                ) : (
                    <Text color="gray.500" textAlign="center">
                        Select a user to start chatting
                    </Text>
                )}
            </Box>
        </VStack>
    );
};

export default MessageContainer; 