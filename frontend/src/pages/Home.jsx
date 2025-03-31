import { useEffect, useState, useCallback, useContext, useMemo } from 'react';
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

    // Memoize current chat ID
    const currentChatId = useMemo(() => {
        if (!currentUser?._id || !selectedUser?._id) return null;
        return [currentUser._id, selectedUser._id].sort().join('-');
    }, [currentUser?._id, selectedUser?._id]);

    const checkAuth = useCallback(async () => {
        try {
            const data = await apiCall('/api/auth/check');
            
            setCurrentUser(prevUser => {
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
            console.error('Auth check error:', error);
            if (!error.message.includes('Network error')) {
                toast({
                    title: 'Authentication Error',
                    description: error.message,
                    status: 'error',
                    duration: 3000,
                    isClosable: true
                });
                navigate('/login');
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [navigate, toast]);

    // Optimized user fetch
    const fetchUsers = useCallback(async () => {
        if (!currentUser?._id) return;

        try {
            const data = await apiCall('/api/messages/users');
            
            setUsers(prevUsers => {
                const prevSorted = _.sortBy(prevUsers, ['fullName']);
                const newSorted = _.sortBy(data, ['fullName']);
                
                if (JSON.stringify(prevSorted) === JSON.stringify(newSorted)) {
                    return prevUsers;
                }
                return data;
            });
        } catch (error) {
            console.error('Fetch users error:', error);
            if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
                navigate('/login');
            } else if (!error.message.includes('Network error')) {
                toast({
                    title: 'Error',
                    description: error.message,
                    status: 'error',
                    duration: 3000,
                    isClosable: true
                });
            }
        }
    }, [currentUser?._id, navigate, toast]);

    // Optimized message fetch
    const fetchMessages = useCallback(async () => {
        if (!selectedUser?._id || !currentUser?._id) return;

        try {
            const data = await apiCall(`/api/messages/${selectedUser._id}`);
            
            setMessages(prevMessages => {
                const prevSorted = _.sortBy(prevMessages, ['createdAt']);
                const newSorted = _.sortBy(data, ['createdAt']);
                
                if (JSON.stringify(prevSorted) === JSON.stringify(newSorted)) {
                    return prevMessages;
                }
                return data;
            });
        } catch (error) {
            console.error('Fetch messages error:', error);
            if (!error.message.includes('Network error')) {
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

    // Handle socket events
    useEffect(() => {
        if (!socket || !currentChatId) return;

        const handleNewMessage = (data) => {
            if (data.message?.sender?._id === selectedUser?._id) {
                fetchMessages();
            } else {
                fetchUsers(); // Update user list to show new message count
            }
        };

        const handleUserOnline = ({ userId }) => {
            setUserStatuses(prev => ({ ...prev, [userId]: true }));
        };

        const handleUserOffline = ({ userId }) => {
            setUserStatuses(prev => ({ ...prev, [userId]: false }));
        };

        socket.on('message_received', handleNewMessage);
        socket.on('user_online', handleUserOnline);
        socket.on('user_offline', handleUserOffline);
        
        // Join chat room
        socket.emit('join_chat', currentChatId);

        return () => {
            socket.off('message_received', handleNewMessage);
            socket.off('user_online', handleUserOnline);
            socket.off('user_offline', handleUserOffline);
            socket.emit('leave_chat', currentChatId);
        };
    }, [socket, currentChatId, selectedUser?._id, fetchMessages, fetchUsers]);

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

    // Update messages when user is selected
    useEffect(() => {
        if (selectedUser?._id && currentUser?._id) {
            fetchMessages();
        } else {
            setMessages([]);
        }
    }, [selectedUser?._id, currentUser?._id, fetchMessages]);

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