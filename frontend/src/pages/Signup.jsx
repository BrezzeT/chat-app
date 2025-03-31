import { useState } from 'react';
import {
    Button,
    Container,
    FormControl,
    FormLabel,
    Input,
    VStack,
    Text,
    useToast,
    Box,
    InputGroup,
    InputRightElement,
    IconButton,
    Avatar,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiEye, FiEyeOff, FiUpload } from 'react-icons/fi';
import AuthBackground from '../components/AuthBackground';

const MotionBox = motion(Box);

const Signup = () => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [profilePic, setProfilePic] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePic(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters long",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, password, profilePic })
            });
            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }
            toast({
                title: "Account created successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            navigate("/login");
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthBackground>
            <Container maxW="container.sm" centerContent py={20}>
                <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    bg="white"
                    p={8}
                    rounded="xl"
                    shadow="2xl"
                    w="full"
                    maxW="400px"
                >
                    <VStack spacing={6}>
                        <MotionBox
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.3 }}
                        >
                            <Text
                                fontSize="3xl"
                                fontWeight="bold"
                                bgGradient="linear(to-r, blue.400, purple.500)"
                                bgClip="text"
                            >
                                Create Account
                            </Text>
                        </MotionBox>

                        <Box position="relative">
                            <Avatar
                                size="xl"
                                src={profilePic || undefined}
                                mb={4}
                            />
                            <IconButton
                                icon={<FiUpload />}
                                position="absolute"
                                bottom={2}
                                right={-2}
                                rounded="full"
                                size="sm"
                                onClick={() => document.getElementById('profile-pic').click()}
                            />
                            <Input
                                id="profile-pic"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                display="none"
                            />
                        </Box>

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
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                size="lg"
                                variant="filled"
                                _focus={{
                                    borderColor: "blue.400",
                                    bg: "white"
                                }}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Password</FormLabel>
                            <InputGroup size="lg">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    variant="filled"
                                    _focus={{
                                        borderColor: "blue.400",
                                        bg: "white"
                                    }}
                                />
                                <InputRightElement>
                                    <IconButton
                                        variant="ghost"
                                        icon={showPassword ? <FiEyeOff /> : <FiEye />}
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    />
                                </InputRightElement>
                            </InputGroup>
                        </FormControl>

                        <Button
                            colorScheme="blue"
                            size="lg"
                            width="100%"
                            onClick={handleSubmit}
                            isLoading={loading}
                            _hover={{
                                transform: "translateY(-2px)",
                                boxShadow: "lg",
                            }}
                        >
                            Sign Up
                        </Button>

                        <Text>
                            Already have an account?{" "}
                            <Button
                                variant="link"
                                colorScheme="blue"
                                onClick={() => navigate("/login")}
                                _hover={{
                                    textDecoration: "none",
                                    transform: "translateY(-1px)"
                                }}
                            >
                                Login
                            </Button>
                        </Text>
                    </VStack>
                </MotionBox>
            </Container>
        </AuthBackground>
    );
};

export default Signup; 