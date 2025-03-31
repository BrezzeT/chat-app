export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://chat-app-back-t7qh.onrender.com';
export const IS_MOBILE = window.Capacitor?.isNativePlatform() || false;

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            credentials: IS_MOBILE ? 'omit' : 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(IS_MOBILE && token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });
        
        const data = await response.json();
        
        // Save token from login/signup response
        if (IS_MOBILE && (endpoint === '/api/auth/login' || endpoint === '/api/auth/signup') && response.ok) {
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
        }
        
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        
        return data;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}; 