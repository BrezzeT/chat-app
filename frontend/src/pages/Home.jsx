import { useEffect, useState, useCallback, useContext } from 'react';
import { 
    Box, 
    Container, 
    useToast, 
    VStack, 
    useColorModeValue,
    IconButton,
    useBreakpointValue,
    Slide,
    useDisclosure as useDrawer,
    Text,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMenu } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import MessageContainer from '../components/MessageContainer';
import useSocket from '../hooks/useSocket';
import SearchBar from '../components/SearchBar';
import SettingsModal from '../components/SettingsModal';
import { useDisclosure } from '@chakra-ui/react';
import _ from 'lodash';
import { apiCall } from '../config';

const Home = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [userStatuses, setUserStatuses] = useState({});
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Mobile drawer control
    const { isOpen: isSidebarOpen, onOpen: onSidebarOpen, onClose: onSidebarClose } = useDrawer({ defaultIsOpen: true });
    const isMobile = useBreakpointValue({ base: true, md: false });

    // Initialize socket connection
    const socketConnection = useSocket(currentUser);
    const { socket, sendMessage, startTyping, stopTyping } = socketConnection;

    const checkAuth = useCallback(async () => {
        try {
            const data = await apiCall('/api/auth/check');
            
            // Update current user data
            setCurrentUser(prevUser => {
                // Only update if data is different
                if (!prevUser || 
                    prevUser.fullName !== data.fullName || 
                    prevUser.profilePic !== data.profilePic ||
                    prevUser.email !== data.email) {
                    return data;
                }
                return prevUser;
            });
            
            return true;
        } catch (error) {
            toast({
                title: 'Authentication Error',
                description: error.message,
                status: 'error',
                duration: 3000,
                isClosable: true
            });
            navigate('/login');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [navigate, toast]);

    // Check authentication and get current user
    useEffect(() => {
        const initialCheck = async () => {
            await checkAuth();
            setIsLoading(false);
        };
        initialCheck();
        
        // Set up interval to check auth status and refresh user data
        const interval = setInterval(async () => {
            // Only refresh if the tab is visible and user is active
            if (document.visibilityState === 'visible') {
                await checkAuth();
            }
        }, 300000); // Check every 5 minutes
        
        return () => clearInterval(interval);
    }, [checkAuth]);

    // Add function to handle profile updates
    const handleProfileUpdate = useCallback((event) => {
        // If event has user data, use it directly
        if (event.detail?.user) {
            setCurrentUser(event.detail.user);
        } else {
            // Otherwise, fetch fresh data
            checkAuth();
        }
    }, [checkAuth]);

    // Add event listener for profile updates
    useEffect(() => {
        window.addEventListener('profile-updated', handleProfileUpdate);
        return () => window.removeEventListener('profile-updated', handleProfileUpdate);
    }, [handleProfileUpdate]);

    // Fetch users with optimized interval
    const fetchUsers = useCallback(async () => {
        if (!currentUser?._id) return;

        try {
            const data = await apiCall('/api/messages/users');
            
            setUsers(prevUsers => {
                // Only update if there are actual changes
                if (JSON.stringify(prevUsers) !== JSON.stringify(data)) {
                    return data;
                }
                return prevUsers;
            });
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                // Network error - might be server down
                toast({
                    title: 'Connection Error',
                    description: 'Unable to connect to server. Please check your internet connection.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true
                });
            } else {
                toast({
                    title: 'Error',
                    description: error.message,
                    status: 'error',
                    duration: 3000,
                    isClosable: true
                });
            }

            // If authentication error, redirect to login
            if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
                navigate('/login');
            }
        }
    }, [currentUser?._id, navigate, toast]);

    useEffect(() => {
        if (currentUser) {
            fetchUsers();
            // Refresh user list less frequently
            const interval = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    fetchUsers();
                }
            }, 60000); // Every minute
            return () => clearInterval(interval);
        }
    }, [currentUser, fetchUsers]);

    // Fetch messages only when user is selected
    const fetchMessages = useCallback(async () => {
        if (!selectedUser?._id || !currentUser?._id) return;

        try {
            const data = await apiCall(`/api/messages/${selectedUser._id}`);
            
            setMessages(prevMessages => {
                // Only update if there are actual changes
                if (JSON.stringify(prevMessages) !== JSON.stringify(data)) {
                    return data;
                }
                return prevMessages;
            });
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                toast({
                    title: 'Connection Error',
                    description: 'Unable to load messages. Please check your connection.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true
                });
            } else {
                toast({
                    title: 'Error',
                    description: error.message,
                    status: 'error',
                    duration: 3000,
                    isClosable: true
                });
            }
        }
    }, [selectedUser?._id, currentUser?._id, toast]);

    // Update messages when user is selected
    useEffect(() => {
        if (selectedUser?._id && currentUser?._id) {
            fetchMessages();
        } else {
            setMessages([]);
        }
    }, [selectedUser?._id, currentUser?._id, fetchMessages]);

    // Socket connection and event handlers
    useEffect(() => {
        if (!socket || !currentUser?._id) return;

        // Set up socket event handlers
        const handleConnect = () => {
            console.log('Socket connected');
            // Refresh data on reconnection
            fetchUsers();
            if (selectedUser?._id) {
                fetchMessages();
            }
        };

        const handleDisconnect = () => {
            console.log('Socket disconnected');
        };

        const handleError = (error) => {
            console.error('Socket error:', error);
        };

        // Set up socket event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('error', handleError);

        // Clean up event listeners
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('error', handleError);
        };
    }, [socket, currentUser?._id, selectedUser?._id, fetchUsers, fetchMessages]);

    // Handle real-time message updates through socket
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data) => {
            const { message } = data;
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
                return [...prev, message].sort((a, b) => 
                    new Date(a.createdAt) - new Date(b.createdAt)
                );
            });
        };

        socket.on('message_received', handleNewMessage);
        
        return () => {
            socket.off('message_received', handleNewMessage);
        };
    }, [socket]);

    // Handle search results
    const handleSearch = useCallback((results) => {
        setSearchResults(results);
    }, []);

    // Handle user selection from search
    const handleUserSelect = useCallback((user) => {
        setSelectedUser(user);
        setSearchResults([]);
    }, []);

    const handleMessageSent = (newMessage) => {
        if (!newMessage?.sender?._id) return;
        
        // Add message only if it's not already in the list
        setMessages(prev => {
            const messageExists = prev.some(msg => 
                msg._id === newMessage._id || 
                (msg.sender._id === newMessage.sender._id && 
                 msg.createdAt === newMessage.createdAt && 
                 msg.message === newMessage.message)
            );
            
            if (messageExists) return prev;
            
            return [...prev, {
                ...newMessage,
                _id: newMessage._id || Date.now().toString(),
                createdAt: newMessage.createdAt || new Date().toISOString()
            }];
        });
    };

    const handleSettingsSave = (settings) => {
        // Handle settings save
        toast({
            title: 'Settings Saved',
            status: 'success',
            duration: 2000,
            isClosable: true
        });
        onClose();
    };

    // Handle chat cleared
    const handleChatCleared = useCallback((userId) => {
        if (selectedUser?._id === userId) {
            setMessages([]);
        }
    }, [selectedUser?._id]);

    // Handle mobile back button
    const handleBack = () => {
        setSelectedUser(null);
        onSidebarOpen();
    };

    // Handle chat selection on mobile
    const handleSelectUser = (user) => {
        setSelectedUser(user);
        if (isMobile) {
            onSidebarClose();
        }
    };

    if (isLoading) {
        return (
            <Container maxW="container.xl" p={0} h="100vh">
                <Box
                    h="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    Loading...
                </Box>
            </Container>
        );
    }

    return (
        <Container maxW="container.xl" p={0} h="100vh">
            <Box
                display="flex"
                h="100%"
                position="relative"
                overflow="hidden"
            >
                {/* Sidebar */}
                <Slide
                    direction="left"
                    in={!isMobile || (isMobile && isSidebarOpen)}
                    style={{
                        position: isMobile ? 'absolute' : 'relative',
                        width: isMobile ? '100%' : '300px',
                        height: '100%',
                        zIndex: 2,
                    }}
                >
                    <Box 
                        w={isMobile ? "100%" : "300px"}
                        h="100%" 
                        borderRadius={{ base: 0, md: "lg" }}
                        overflow="hidden"
                        bg={useColorModeValue('white', 'gray.800')}
                        boxShadow="sm"
                        borderWidth={{ base: 0, md: "1px" }}
                        borderColor={useColorModeValue('gray.200', 'gray.700')}
                    >
                        <VStack h="100%" spacing={0}>
                            <Box p={4} w="100%" borderBottomWidth="1px" borderColor="inherit">
                                <SearchBar
                                    users={users}
                                    messages={messages}
                                    onSearch={handleSearch}
                                    onUserSelect={handleUserSelect}
                                />
                            </Box>
                            <Box flex="1" w="100%" overflowY="auto">
                                <Sidebar
                                    users={searchResults.length > 0 ? searchResults : users}
                                    selectedUser={selectedUser}
                                    setSelectedUser={handleSelectUser}
                                    currentUser={currentUser}
                                    userStatuses={userStatuses}
                                    onSettingsClick={onOpen}
                                    onChatCleared={handleChatCleared}
                                />
                            </Box>
                        </VStack>
                    </Box>
                </Slide>

                {/* Chat Container */}
                <Box 
                    flex="1" 
                    h="100%"
                    display="flex"
                    flexDirection="column"
                    position={isMobile ? 'absolute' : 'relative'}
                    left={0}
                    right={0}
                    zIndex={1}
                    bg={useColorModeValue('white', 'gray.800')}
                    borderRadius={{ base: 0, md: "lg" }}
                    overflow="hidden"
                    boxShadow="sm"
                    borderWidth={{ base: 0, md: "1px" }}
                    borderColor={useColorModeValue('gray.200', 'gray.700')}
                >
                    {isMobile && (
                        <Box 
                            p={4} 
                            borderBottomWidth="1px" 
                            borderColor="inherit"
                            display="flex"
                            alignItems="center"
                            bg={useColorModeValue('white', 'gray.800')}
                        >
                            {selectedUser ? (
                                <IconButton
                                    icon={<FiArrowLeft />}
                                    variant="ghost"
                                    onClick={handleBack}
                                    mr={2}
                                    aria-label="Back"
                                />
                            ) : (
                                <IconButton
                                    icon={<FiMenu />}
                                    variant="ghost"
                                    onClick={onSidebarOpen}
                                    mr={2}
                                    aria-label="Menu"
                                />
                            )}
                            {selectedUser && (
                                <Box>
                                    <Text fontWeight="bold">{selectedUser.fullName}</Text>
                                    <Text fontSize="sm" color={userStatuses[selectedUser._id]?.isOnline ? "green.500" : "gray.500"}>
                                        {userStatuses[selectedUser._id]?.isOnline ? "online" : "offline"}
                                    </Text>
                                </Box>
                            )}
                        </Box>
                    )}
                    
                    <Box flex="1" overflow="hidden">
                        <MessageContainer
                            selectedUser={selectedUser}
                            currentUser={currentUser}
                            socket={socket}
                            messages={messages}
                            onMessageSent={handleMessageSent}
                            onTyping={(isTyping) => {
                                if (selectedUser?._id) {
                                    if (isTyping) {
                                        startTyping(selectedUser._id);
                                    } else {
                                        stopTyping(selectedUser._id);
                                    }
                                }
                            }}
                        />
                    </Box>
                </Box>
            </Box>

            <SettingsModal
                isOpen={isOpen}
                onClose={onClose}
                onSave={handleSettingsSave}
                currentUser={currentUser}
            />
        </Container>
    );
};

export default Home; 