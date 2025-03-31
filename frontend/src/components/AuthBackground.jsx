import { Box } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const AuthBackground = ({ children }) => {
    return (
        <Box
            minH="100vh"
            bg="gray.50"
            position="relative"
            overflow="hidden"
        >
            <MotionBox
                position="absolute"
                top="-10%"
                left="-10%"
                w="120%"
                h="120%"
                bgGradient="linear(to-r, blue.400, purple.500)"
                filter="blur(100px)"
                opacity={0.3}
                animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
            <Box
                position="relative"
                zIndex={1}
            >
                {children}
            </Box>
        </Box>
    );
};

export default AuthBackground; 