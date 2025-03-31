import { useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    VStack,
    Switch,
    FormControl,
    FormLabel,
    Select,
    Text,
    Divider,
    useColorMode,
    Button,
    HStack,
    useToast,
} from '@chakra-ui/react';
import { FiMoon, FiSun, FiVolume2, FiVolumeX } from 'react-icons/fi';

const SettingsModal = ({ isOpen, onClose, onSave }) => {
    const { colorMode, toggleColorMode } = useColorMode();
    const toast = useToast();
    
    const [settings, setSettings] = useState({
        notifications: true,
        sound: true,
        theme: colorMode,
        fontSize: 'medium',
        showStatus: true,
        readReceipts: true,
    });

    const handleChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        // Save settings to localStorage
        localStorage.setItem('chatSettings', JSON.stringify(settings));
        
        onSave?.(settings);
        
        toast({
            title: "Settings saved",
            status: "success",
            duration: 2000,
            isClosable: true,
        });
        
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay backdropFilter="blur(10px)" />
            <ModalContent>
                <ModalHeader
                    bgGradient="linear(to-r, blue.400, purple.500)"
                    color="white"
                    borderTopRadius="md"
                >
                    Settings
                </ModalHeader>
                <ModalCloseButton color="white" />
                
                <ModalBody py={6}>
                    <VStack spacing={6} align="stretch">
                        <VStack align="stretch" spacing={4}>
                            <Text fontWeight="bold" color="gray.700">
                                Notifications
                            </Text>
                            <FormControl display="flex" alignItems="center">
                                <FormLabel mb="0" flex="1">
                                    Message Notifications
                                </FormLabel>
                                <Switch
                                    colorScheme="blue"
                                    isChecked={settings.notifications}
                                    onChange={(e) => handleChange('notifications', e.target.checked)}
                                />
                            </FormControl>
                            <FormControl display="flex" alignItems="center">
                                <FormLabel mb="0" flex="1">
                                    Sound
                                </FormLabel>
                                <HStack>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleChange('sound', !settings.sound)}
                                    >
                                        {settings.sound ? <FiVolume2 /> : <FiVolumeX />}
                                    </Button>
                                    <Switch
                                        colorScheme="blue"
                                        isChecked={settings.sound}
                                        onChange={(e) => handleChange('sound', e.target.checked)}
                                    />
                                </HStack>
                            </FormControl>
                        </VStack>

                        <Divider />

                        <VStack align="stretch" spacing={4}>
                            <Text fontWeight="bold" color="gray.700">
                                Appearance
                            </Text>
                            <FormControl display="flex" alignItems="center">
                                <FormLabel mb="0" flex="1">
                                    Theme
                                </FormLabel>
                                <Button
                                    size="sm"
                                    leftIcon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
                                    onClick={() => {
                                        toggleColorMode();
                                        handleChange('theme', colorMode === 'light' ? 'dark' : 'light');
                                    }}
                                >
                                    {colorMode === 'light' ? 'Dark' : 'Light'}
                                </Button>
                            </FormControl>
                            <FormControl>
                                <FormLabel>Font Size</FormLabel>
                                <Select
                                    value={settings.fontSize}
                                    onChange={(e) => handleChange('fontSize', e.target.value)}
                                >
                                    <option value="small">Small</option>
                                    <option value="medium">Medium</option>
                                    <option value="large">Large</option>
                                </Select>
                            </FormControl>
                        </VStack>

                        <Divider />

                        <VStack align="stretch" spacing={4}>
                            <Text fontWeight="bold" color="gray.700">
                                Privacy
                            </Text>
                            <FormControl display="flex" alignItems="center">
                                <FormLabel mb="0" flex="1">
                                    Show Online Status
                                </FormLabel>
                                <Switch
                                    colorScheme="blue"
                                    isChecked={settings.showStatus}
                                    onChange={(e) => handleChange('showStatus', e.target.checked)}
                                />
                            </FormControl>
                            <FormControl display="flex" alignItems="center">
                                <FormLabel mb="0" flex="1">
                                    Read Receipts
                                </FormLabel>
                                <Switch
                                    colorScheme="blue"
                                    isChecked={settings.readReceipts}
                                    onChange={(e) => handleChange('readReceipts', e.target.checked)}
                                />
                            </FormControl>
                        </VStack>

                        <Button
                            colorScheme="blue"
                            onClick={handleSave}
                            size="lg"
                            _hover={{
                                transform: "translateY(-2px)",
                                boxShadow: "lg",
                            }}
                        >
                            Save Changes
                        </Button>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default SettingsModal; 