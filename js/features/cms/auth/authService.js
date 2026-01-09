/**
 * CMS Auth Service Module
 * Handles authentication API calls and token management
 */

import { API_ENDPOINTS, API_BASE_URL } from '../../../core/config.js';
import { getSessionItem, setSessionItem, removeSessionItem } from '../../../core/storage.js';

/**
 * Get stored JWT token from sessionStorage
 * @returns {string|null} - JWT token or null
 */
export function getAuthToken() {
    return getSessionItem('cms_jwt_token');
}

/**
 * Store JWT token in sessionStorage
 * @param {string} token - JWT token to store
 */
export function setAuthToken(token) {
    if (token) {
        setSessionItem('cms_jwt_token', token);
    } else {
        removeSessionItem('cms_jwt_token');
    }
}

/**
 * Remove JWT token from sessionStorage
 */
export function clearAuthToken() {
    removeSessionItem('cms_jwt_token');
}

/**
 * Login with password
 * @param {string} password - Admin password
 * @returns {Promise<Object>} - Login response with token
 * @throws {Error} - If login fails
 */
export async function login(password) {
    if (!password || password.trim() === '') {
        throw new Error('Please enter a password');
    }

    // First, verify API is reachable with a health check
    try {
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => {
            healthController.abort();
        }, 5000);
        
        try {
            const healthCheck = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                signal: healthController.signal
            });
            
            clearTimeout(healthTimeout);
            
            if (!healthCheck.ok) {
                throw new Error(`API health check failed with status ${healthCheck.status}`);
            }
        } catch (fetchError) {
            clearTimeout(healthTimeout);
            
            // Handle abort error specifically
            if (fetchError.name === 'AbortError' || healthController.signal.aborted) {
                throw new Error(`Connection timeout. The API server at ${API_BASE_URL} is not responding. Please check if the server is running.`);
            }
            throw fetchError;
        }
    } catch (healthError) {
        console.error('API health check failed:', healthError);
        
        // If it's already a formatted error message, re-throw it
        if (healthError.message && healthError.message.includes('Connection timeout')) {
            throw healthError;
        }
        
        // Otherwise, provide a generic error message
        const errorMsg = healthError.message || `Cannot connect to API server at ${API_BASE_URL}. Please verify the server is running and accessible.`;
        throw new Error(errorMsg);
    }

    // Call login endpoint to get JWT token
    const response = await fetch(API_ENDPOINTS.CMS_LOGIN, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({ password: password })
    });

    if (!response.ok) {
        // Handle error response
        let errorMessage = 'Invalid password';
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail?.message || errorData.detail?.error || errorData.error || 'Invalid password';
        } catch (jsonError) {
            // Response might not be JSON, use status text
            errorMessage = response.statusText || `Server returned ${response.status}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.access_token) {
        throw new Error('Invalid response from server: missing access_token');
    }

    return {
        access_token: data.access_token,
        expires_in: data.expires_in
    };
}

/**
 * Refresh authentication token
 * @param {string} currentToken - Current JWT token
 * @returns {Promise<string|null>} - New token or null if refresh failed
 */
export async function refreshToken(currentToken) {
    if (!currentToken) {
        return null;
    }

    try {
        const response = await fetch(API_ENDPOINTS.CMS_REFRESH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            mode: 'cors',
            credentials: 'omit',
        });

        if (response.ok) {
            const data = await response.json();
            // Backend may return empty access_token if token is still valid (> 1 hour remaining)
            // In that case, use the existing token
            return data.access_token || currentToken;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }

    return null;
}

/**
 * Logout - clears token
 */
export function logout() {
    clearAuthToken();
}
