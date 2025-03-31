import {
    InputGroup,
    InputLeftElement,
    Input,
    VStack,
    Box,
    Text,
    Avatar,
    HStack,
    Highlight,
    useColorModeValue,
    Divider,
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import { useState, useCallback, useRef, useEffect } from 'react';
import _ from 'lodash';

const SearchBar = ({ users, messages, onSearch, onUserSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);
    
    const bgColor = useColorModeValue('white', 'gray.800');
    const hoverBg = useColorModeValue('gray.50', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    // Optimized search function with debounce
    const performSearch = useCallback(
        _.debounce((term) => {
            if (!term.trim()) {
                setSearchResults([]);
                onSearch([]);
                setIsSearching(false);
                return;
            }

            const searchTermLower = term.toLowerCase();
            
            // Search in users
            const userResults = users.filter(user => {
                const fullName = user.fullName.toLowerCase();
                const email = user.email.toLowerCase();
                return fullName.includes(searchTermLower) || email.includes(searchTermLower);
            }).map(user => ({
                type: 'user',
                item: user,
                matchType: 'name',
                priority: user.fullName.toLowerCase().startsWith(searchTermLower) ? 1 : 2
            }));

            // Search in messages
            const messageResults = messages.reduce((acc, msg) => {
                if (msg.message.toLowerCase().includes(searchTermLower)) {
                    // Check if we already have this user in results
                    const existingUser = acc.find(r => 
                        r.type === 'message' && r.item.sender._id === msg.sender._id
                    );

                    if (!existingUser) {
                        acc.push({
                            type: 'message',
                            item: msg,
                            matchType: 'message',
                            priority: 3,
                            messagePreview: msg.message
                        });
                    }
                }
                return acc;
            }, []);

            // Combine and sort results
            const combinedResults = [...userResults, ...messageResults]
                .sort((a, b) => a.priority - b.priority);

            setSearchResults(combinedResults);
            onSearch(combinedResults.map(r => r.type === 'user' ? r.item : r.item.sender));
            setIsSearching(false);
        }, 300),
        [users, messages, onSearch]
    );

    useEffect(() => {
        return () => {
            performSearch.cancel();
        };
    }, [performSearch]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setIsSearching(true);
        performSearch(value);
    };

    const handleResultClick = (result) => {
        if (onUserSelect) {
            onUserSelect(result.type === 'user' ? result.item : result.item.sender);
        }
        setSearchTerm('');
        setSearchResults([]);
    };

    const highlightText = (text, term) => {
        if (!term.trim()) return text;
        return (
            <Highlight
                query={term}
                styles={{ bg: 'yellow.200', px: '1', py: '0' }}
            >
                {text}
            </Highlight>
        );
    };

    return (
        <Box position="relative" width="100%">
            <InputGroup>
                <InputLeftElement pointerEvents="none">
                    <FiSearch color="gray.500" />
                </InputLeftElement>
                <Input
                    ref={searchRef}
                    placeholder="Search users and messages..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    bg={bgColor}
                    borderColor={borderColor}
                    _focus={{
                        borderColor: 'blue.500',
                        boxShadow: 'none'
                    }}
                />
            </InputGroup>

            {/* Search Results Dropdown */}
            {searchTerm && (
                <VStack
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    mt={2}
                    bg={bgColor}
                    borderRadius="md"
                    boxShadow="lg"
                    border="1px"
                    borderColor={borderColor}
                    maxH="300px"
                    overflowY="auto"
                    spacing={0}
                    zIndex={1000}
                >
                    {isSearching ? (
                        <Box p={4}>
                            <Text color="gray.500">Searching...</Text>
                        </Box>
                    ) : searchResults.length === 0 ? (
                        <Box p={4}>
                            <Text color="gray.500">No results found</Text>
                        </Box>
                    ) : (
                        <>
                            {searchResults.map((result, index) => (
                                <Box key={index} width="100%">
                                    <Box
                                        px={4}
                                        py={2}
                                        cursor="pointer"
                                        onClick={() => handleResultClick(result)}
                                        _hover={{ bg: hoverBg }}
                                        transition="background 0.2s"
                                        width="100%"
                                    >
                                        <HStack spacing={3}>
                                            <Avatar
                                                size="sm"
                                                name={result.type === 'user' ? result.item.fullName : result.item.sender.fullName}
                                                src={result.type === 'user' ? result.item.profilePic : result.item.sender.profilePic}
                                            />
                                            <VStack align="start" spacing={0}>
                                                <Text fontWeight="medium">
                                                    {highlightText(
                                                        result.type === 'user' ? result.item.fullName : result.item.sender.fullName,
                                                        searchTerm
                                                    )}
                                                </Text>
                                                {result.type === 'message' && (
                                                    <Text fontSize="sm" color="gray.500" noOfLines={1}>
                                                        {highlightText(result.messagePreview, searchTerm)}
                                                    </Text>
                                                )}
                                            </VStack>
                                        </HStack>
                                    </Box>
                                    {index < searchResults.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </>
                    )}
                </VStack>
            )}
        </Box>
    );
};

export default SearchBar; 