// config.js - API configuration
const API_URL = 'https://pixel-mafia-api.onrender.com'; // Production API
// const API_URL = 'https://tu-api.render.com'; // Cambiar cuando despliegues a producción

const API_ENDPOINTS = {
    auth: {
        login: `${API_URL}/api/auth/login`,
        register: `${API_URL}/api/auth/register`,
        me: `${API_URL}/api/auth/me`
    },
    bots: {
        myBots: `${API_URL}/api/bots/my-bots`,
        create: `${API_URL}/api/bots/create`,
        updateStatus: (id) => `${API_URL}/api/bots/${id}/status`,
        delete: (id) => `${API_URL}/api/bots/${id}`
    },
    payments: {
        create: `${API_URL}/api/payments/create`,
        myPayments: `${API_URL}/api/payments/my-payments`
    }
};

// Helper for API calls
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const response = await fetch(endpoint, { ...defaultOptions, ...options });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API Error');
    }
    
    return response.json();
}

export { API_URL, API_ENDPOINTS, apiCall };
