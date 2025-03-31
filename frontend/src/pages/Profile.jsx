import { useState, useEffect } from 'react';
import {
    Container,
    VStack,
    Box,
    Avatar,
    Text,
    Button,
    FormControl,
    FormLabel,
    Input,
    useToast,
    IconButton,
    Divider,
    HStack,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiUpload, FiSave, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../config';

const MotionBox = motion(Box);

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState("");
    const [profilePic, setProfilePic] = useState("");
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const data = await apiCall("/api/auth/check");
            setUser(data);
            setFullName(data.fullName);
            setProfilePic(data.profilePic);
        } catch (error) {
            toast({
                title: "Error fetching profile",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Image size should be less than 5MB",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: "Invalid file type",
                description: "Please upload an image file",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        try {
            const formData = new FormData();
            formData.append('profilePic', file);

            const data = await apiCall("/api/auth/upload-image", {
                method: "POST",
                body: formData
            });

            setProfilePic(data.imageUrl);
            toast({
                title: "Image uploaded successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Error uploading image",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!fullName || fullName.trim().length === 0) {
            toast({
                title: 'Error',
                description: 'Full name is required',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);

        try {
            const data = await apiCall('/api/auth/update-profile', {
                method: 'PUT',
                body: JSON.stringify({
                    fullName: fullName.trim(),
                }),
            });

            // Update local user state
            setUser(data);
            
            toast({
                title: 'Success',
                description: 'Profile updated successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            // Create a custom event with the updated user data
            const event = new CustomEvent('profile-updated', { 
                detail: { user: data }
            });
            window.dispatchEvent(event);

            // Navigate back after successful update
            navigate('/');
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Container maxW="container.sm" py={10}>
            <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                bg="white"
                p={8}
                rounded="xl"
                shadow="lg"
            >
                <VStack spacing={6} align="stretch">
                    <HStack justify="space-between" align="center">
                        <IconButton
                            icon={<FiArrowLeft />}
                            variant="ghost"
                            onClick={() => navigate('/')}
                            aria-label="Back"
                            size="lg"
                        />
                        <Text
                            fontSize="2xl"
                            fontWeight="bold"
                            bgGradient="linear(to-r, blue.400, purple.500)"
                            bgClip="text"
                        >
                            Profile Settings
                        </Text>
                        <Box w={10} /> {/* Spacer for alignment */}
                    </HStack>

                    <Box position="relative" alignSelf="center">
                        <Avatar
                            size="2xl"
                            src={profilePic}
                            name={fullName}
                            mb={4}
                        />
                        <IconButton
                            icon={<FiUpload />}
                            position="absolute"
                            bottom={4}
                            right={-2}
                            rounded="full"
                            size="sm"
                            colorScheme="blue"
                            onClick={() => document.getElementById('profile-pic-update').click()}
                        />
                        <Input
                            id="profile-pic-update"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            display="none"
                        />
                    </Box>

                    <Divider />

                    <FormControl>
                        <FormLabel>Full Name</FormLabel>
                        <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                            size="lg"
                            variant="filled"
                            _focus={{
                                borderColor: "blue.400",
                                bg: "white"
                            }}
                        />
                    </FormControl>

                    <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                            value={user.email}
                            isReadOnly
                            size="lg"
                            variant="filled"
                            bg="gray.100"
                        />
                    </FormControl>

                    <HStack justify="flex-end" pt={4}>
                        <Button
                            leftIcon={<FiSave />}
                            colorScheme="blue"
                            size="lg"
                            onClick={handleSubmit}
                            isLoading={loading}
                            _hover={{
                                transform: "translateY(-2px)",
                                boxShadow: "lg",
                            }}
                        >
                            Save Changes
                        </Button>
                    </HStack>
                </VStack>
            </MotionBox>
        </Container>
    );
};

export default Profile; 