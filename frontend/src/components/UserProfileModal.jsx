import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    VStack,
    Avatar,
    Text,
    Box,
    Badge,
    useColorModeValue,
} from '@chakra-ui/react';

const UserProfileModal = ({ isOpen, onClose, user, isOnline }) => {
    const bgColor = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.600', 'gray.300');

    if (!user) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent bg={bgColor}>
                <ModalHeader>User Profile</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} pb={6}>
                        <Box position="relative">
                            <Avatar
                                size="2xl"
                                name={user.fullName}
                                src={user.profilePic}
                            />
                            {isOnline && (
                                <Badge
                                    position="absolute"
                                    bottom="3"
                                    right="3"
                                    borderRadius="full"
                                    bg="green.500"
                                    boxSize="4"
                                    border="3px solid white"
                                />
                            )}
                        </Box>
                        <VStack spacing={2}>
                            <Text fontSize="2xl" fontWeight="bold">
                                {user.fullName}
                            </Text>
                            <Text fontSize="md" color={textColor}>
                                {user.email}
                            </Text>
                            <Badge colorScheme={isOnline ? 'green' : 'gray'}>
                                {isOnline ? 'Online' : 'Offline'}
                            </Badge>
                        </VStack>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default UserProfileModal; 