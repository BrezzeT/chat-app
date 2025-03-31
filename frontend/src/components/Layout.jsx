import { useState } from 'react';
import {
    Box,
    Flex,
    IconButton,
    useBreakpointValue,
    Drawer,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    useDisclosure,
} from '@chakra-ui/react';
import { FiMenu } from 'react-icons/fi';

const Layout = ({ sidebar, content }) => {
    const isMobile = useBreakpointValue({ base: true, md: false });
    const { isOpen, onOpen, onClose } = useDisclosure();

    if (isMobile) {
        return (
            <Box h="100vh" bg="gray.50">
                <Flex h="100%" direction="column">
                    <Box p={2} bg="white" shadow="sm">
                        <IconButton
                            icon={<FiMenu />}
                            onClick={onOpen}
                            variant="ghost"
                            aria-label="Open menu"
                        />
                    </Box>

                    <Box flex="1" overflow="hidden">
                        {content}
                    </Box>

                    <Drawer
                        isOpen={isOpen}
                        placement="left"
                        onClose={onClose}
                    >
                        <DrawerOverlay />
                        <DrawerContent maxW="80%">
                            <DrawerCloseButton />
                            {sidebar}
                        </DrawerContent>
                    </Drawer>
                </Flex>
            </Box>
        );
    }

    return (
        <Flex h="100vh" bg="gray.50">
            <Box w="300px" bg="white" shadow="lg">
                {sidebar}
            </Box>
            <Box flex="1" overflow="hidden">
                {content}
            </Box>
        </Flex>
    );
};

export default Layout; 