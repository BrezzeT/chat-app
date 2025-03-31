import {
    Box,
    VStack,
    Text,
    Avatar,
    Button,
    Divider,
    useToast,
    HStack,
    IconButton,
    Badge,
    useColorModeValue,
    Tooltip,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    useDisclosure,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiUser, FiSettings, FiMoreVertical } from 'react-icons/fi';
import { format } from 'date-fns';
import UserProfileModal from './UserProfileModal';
import { useState } from 'react';
import { apiCall } from '../config';

const Sidebar = ({
    users,
    selectedUser,
    setSelectedUser,
    currentUser,
    userStatuses,
    onSettingsClick,
    searchBar,
    onChatCleared
}) => {
    const toast = useToast();
    const navigate = useNavigate();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedProfile, setSelectedProfile] = useState(null);

    const bgColor = useColorModeValue('white', 'gray.800');
    const hoverBg = useColorModeValue('gray.50', 'gray.700');
    const selectedBg = useColorModeValue('blue.50', 'blue.900');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const mutedColor = useColorModeValue('gray.500', 'gray.400');

    const handleLogout = async () => {
        try {
            await apiCall("/api/auth/logout", {
                method: "POST"
            });
            navigate("/login");
        } catch (error) {
            toast({
                title: "Error logging out",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleViewProfile = async (userId) => {
        try {
            const data = await apiCall(`/api/auth/profile/${userId}`);
            setSelectedProfile(data);
            onOpen();
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    };

    const handleClearChat = async (userId) => {
        try {
            await apiCall(`/api/auth/chat/${userId}`, {
                method: 'DELETE'
            });

            toast({
                title: 'Chat Cleared',
                description: 'All messages have been deleted',
                status: 'success',
                duration: 3000,
                isClosable: true
            });

            // Update the UI immediately
            if (selectedUser?._id === userId) {
                setSelectedUser(prev => ({ ...prev, lastMessage: null }));
            }
            
            // Notify parent component to refresh messages
            if (onChatCleared) {
                onChatCleared(userId);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    };

    const handleBlockUser = async (userId) => {
        try {
            await apiCall(`/api/auth/block/${userId}`, {
                method: 'POST'
            });

            toast({
                title: 'User Blocked',
                description: 'You will no longer receive messages from this user',
                status: 'info',
                duration: 3000,
                isClosable: true
            });

            // If this was the selected user, clear selection
            if (selectedUser?._id === userId) {
                setSelectedUser(null);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    };

    const sortedUsers = [...users].sort((a, b) => {
        // Online users first
        const aOnline = userStatuses[a._id]?.isOnline;
        const bOnline = userStatuses[b._id]?.isOnline;
        if (aOnline !== bOnline) return bOnline ? 1 : -1;

        // Then by last message time if available
        const aLastMessage = a.lastMessage?.createdAt;
        const bLastMessage = b.lastMessage?.createdAt;
        if (aLastMessage && bLastMessage) {
            return new Date(bLastMessage) - new Date(aLastMessage);
        }

        // Finally by name
        return a.fullName.localeCompare(b.fullName);
    });

    return (
        <Box
            w="100%"
            h="100%"
            p={4}
            display="flex"
            flexDirection="column"
        >
            <VStack spacing={4} align="stretch">
                {/* User Profile Section */}
                <HStack justify="space-between" align="center">
                    <HStack spacing={3}>
                        <Box position="relative">
                            <Avatar
                                size="sm"
                                name={currentUser?.fullName}
                                src={currentUser?.profilePic}
                            />
                            <Badge
                                position="absolute"
                                bottom="0"
                                right="0"
                                borderRadius="full"
                                bg="green.500"
                                boxSize="2"
                                border="2px solid white"
                            />
                        </Box>
                        <VStack spacing={0} align="start">
                            <Text fontWeight="bold">{currentUser?.fullName}</Text>
                            <Text fontSize="xs" color="green.500">Online</Text>
                        </VStack>
                    </HStack>
                    <HStack>
                        <IconButton
                            icon={<FiUser />}
                            variant="ghost"
                            colorScheme="blue"
                            onClick={() => navigate('/profile')}
                            aria-label="Profile"
                        />
                        <IconButton
                            icon={<FiSettings />}
                            variant="ghost"
                            colorScheme="blue"
                            onClick={onSettingsClick}
                            aria-label="Settings"
                        />
                        <IconButton
                            icon={<FiLogOut />}
                            variant="ghost"
                            colorScheme="red"
                            onClick={handleLogout}
                            aria-label="Logout"
                        />
                    </HStack>
                </HStack>

                {/* Search Bar */}
                <Box>{searchBar}</Box>

                <Divider />

                {/* Users List */}
                <VStack spacing={2} align="stretch" flex="1" overflowY="auto">
                    <Text fontSize="lg" fontWeight="bold" color="gray.600">
                        Messages
                    </Text>

                    {sortedUsers.map(user => {
                        if (user._id === currentUser?._id) return null;

                        const isSelected = selectedUser?._id === user._id;
                        const status = userStatuses[user._id];
                        const isOnline = status?.isOnline;
                        const isTyping = status?.isTyping;

                        return (
                            <Box
                                key={user._id}
                                p={3}
                                cursor="pointer"
                                bg={isSelected ? selectedBg : 'transparent'}
                                _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                                onClick={() => setSelectedUser(user)}
                                borderBottomWidth="1px"
                                borderColor={borderColor}
                                transition="all 0.2s"
                            >
                                <HStack spacing={3} justify="space-between">
                                    <HStack spacing={3} flex={1} minW={0}>
                                        <Box position="relative">
                                            <Avatar
                                                size="md"
                                                name={user.fullName}
                                                src={user.profilePic}
                                            />
                                            {isOnline && (
                                                <Badge
                                                    position="absolute"
                                                    bottom="0"
                                                    right="0"
                                                    borderRadius="full"
                                                    bg="green.500"
                                                    boxSize="3"
                                                    border="2px solid white"
                                                />
                                            )}
                                        </Box>
                                        <VStack
                                            align="start"
                                            spacing={0}
                                            flex={1}
                                            minW={0}
                                        >
                                            <HStack spacing={2}>
                                                <Text fontWeight="medium" isTruncated>
                                                    {user.fullName}
                                                </Text>
                                                <Text fontSize="xs" color={isOnline ? "green.500" : "gray.500"}>
                                                    {isOnline ? "online" : "offline"}
                                                </Text>
                                            </HStack>
                                            <Text
                                                fontSize="sm"
                                                color={mutedColor}
                                                isTruncated
                                            >
                                                {isTyping ? (
                                                    <Text as="span" color="blue.500">
                                                        typing...
                                                    </Text>
                                                ) : user.lastMessage ? (
                                                    <>
                                                        <Text as="span" color={mutedColor}>
                                                            {user.lastMessage.message}
                                                        </Text>
                                                        {" · "}
                                                        <Text as="span" fontSize="xs">
                                                            {format(
                                                                new Date(user.lastMessage.createdAt),
                                                                'HH:mm'
                                                            )}
                                                        </Text>
                                                    </>
                                                ) : (
                                                    <Text as="span" color={mutedColor}>
                                                        No messages yet
                                                    </Text>
                                                )}
                                            </Text>
                                        </VStack>
                                    </HStack>

                                    <Menu>
                                        <MenuButton
                                            as={IconButton}
                                            icon={<FiMoreVertical />}
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <MenuList>
                                            <MenuItem onClick={() => handleViewProfile(user._id)}>
                                                View Profile
                                            </MenuItem>
                                            <MenuItem onClick={() => handleClearChat(user._id)}>
                                                Clear Chat
                                            </MenuItem>
                                            <MenuItem 
                                                color="red.500"
                                                onClick={() => handleBlockUser(user._id)}
                                            >
                                                Block User
                                            </MenuItem>
                                        </MenuList>
                                    </Menu>
                                </HStack>
                            </Box>
                        );
                    })}
                </VStack>
            </VStack>

            {/* Add UserProfileModal */}
            <UserProfileModal
                isOpen={isOpen}
                onClose={onClose}
                user={selectedProfile}
                isOnline={userStatuses[selectedProfile?._id]?.isOnline}
            />
        </Box>
    );
};

export default Sidebar; 