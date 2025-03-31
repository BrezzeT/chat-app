export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://chat-app-back-t7qh.onrender.com';
export const IS_MOBILE = window.Capacitor?.isNativePlatform() || false;

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
    try {
        const token = localStorage.getItem('token');
        console.log('Making API call to:', `${API_BASE_URL}${endpoint}`);
        console.log('Is Mobile:', IS_MOBILE);
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            credentials: IS_MOBILE ? 'omit' : 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(IS_MOBILE && token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });
        
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('Unexpected response type:', contentType);
            throw new Error('Invalid response format from server');
        }
        
        // Save token from login/signup response
        if (IS_MOBILE && (endpoint === '/api/auth/login' || endpoint === '/api/auth/signup') && response.ok) {
            if (data.token) {
                console.log('Saving token to localStorage');
                localStorage.setItem('token', data.token);
            } else {
                console.warn('No token received from server');
            }
        }
        
        if (!response.ok) {
            console.error('API Error:', data.error || 'Unknown error');
            throw new Error(data.error || 'Something went wrong');
        }
        
        return data;
    } catch (error) {
        console.error('API Call Error:', error);
        if (error.message === 'Failed to fetch') {
            throw new Error('Network error - please check your connection');
        }
        throw error;
    }
}; 