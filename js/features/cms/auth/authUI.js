/**
 * CMS Auth UI Module
 * Handles authentication UI interactions and state management
 */

import { login, refreshToken, logout, getAuthToken, setAuthToken, clearAuthToken } from './authService.js';
import { setAuthenticated, setToken, setTokenExpiry, resetAuthState, getToken } from './authState.js';
import { showError, hideError, showSuccess } from '../../../core/utils.js';

let elements = null;
let onLoginSuccess = null;
let onLogout = null;

/**
 * Initialize auth UI elements
 * @param {Object} cmsElements - CMS DOM elements object
 */
export function initAuthElements(cmsElements) {
    elements = cmsElements;
}

/**
 * Set callback for successful login
 * @param {Function} callback - Callback function
 */
export function setOnLoginSuccess(callback) {
    onLoginSuccess = callback;
}

/**
 * Set callback for logout
 * @param {Function} callback - Callback function
 */
export function setOnLogout(callback) {
    onLogout = callback;
}

/**
 * Show authentication screen
 */
export function showAuth() {
    if (!elements) return;
    
    if (elements.authSection) elements.authSection.classList.remove('hidden');
    if (elements.cmsDashboard) elements.cmsDashboard.classList.add('hidden');
    
    setAuthenticated(false);
    setToken(null);
    clearAuthToken();
}

/**
 * Show dashboard screen
 */
export function showDashboard() {
    if (!elements) return;
    
    if (elements.authSection) elements.authSection.classList.add('hidden');
    if (elements.cmsDashboard) elements.cmsDashboard.classList.remove('hidden');
}

/**
 * Check authentication status and verify token
 */
export async function checkAuth() {
    const savedToken = getAuthToken();
    if (savedToken) {
        setToken(savedToken);
        await verifyTokenAndLoad();
    } else {
        showAuth();
    }
}

/**
 * Verify token and load dashboard if valid
 */
async function verifyTokenAndLoad() {
    try {
        const currentToken = getAuthToken();
        if (!currentToken) {
            showAuth();
            return;
        }
        
        // Try to refresh token or verify it's still valid
        const newToken = await refreshToken(currentToken);
        
        if (newToken) {
            setAuthToken(newToken);
            setToken(newToken);
            setAuthenticated(true);
            showDashboard();
            
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } else {
            showAuth();
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        showAuth();
    }
}

/**
 * Initialize auth UI event listeners
 */
export function initAuthUI() {
    if (!elements || !elements.authForm) {
        console.warn('Auth elements not found');
        return;
    }

    // Login form handler
    elements.authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = elements.passwordInput?.value.trim();

        if (!password) {
            showError(elements.authError, 'Please enter a password');
            return;
        }

        // Show loading state
        const submitButton = elements.authForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';
        }
        hideError(elements.authError);

        try {
            const result = await login(password);
            
            // Store token
            setAuthToken(result.access_token);
            setToken(result.access_token);
            setAuthenticated(true);
            
            // Calculate token expiry (if provided)
            if (result.expires_in) {
                setTokenExpiry(Date.now() + (result.expires_in * 1000));
            }
            
            showDashboard();
            if (elements.passwordInput) {
                elements.passwordInput.value = '';
            }
            hideError(elements.authError);
            
            // Trigger login success callback
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } catch (error) {
            console.error('Authentication error:', error);
            
            let errorMessage = 'Failed to connect to server';
            
            if (error.name === 'AbortError' || error.message?.includes('timeout')) {
                errorMessage = 'Connection timeout. Please check your internet connection and try again.';
            } else if (error.message?.includes('Failed to fetch') || error.message?.includes('Network error')) {
                errorMessage = `Cannot reach server. Please check:\n` +
                             `1. Your internet connection\n` +
                             `2. The API server is running\n` +
                             `3. CORS is properly configured`;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showError(elements.authError, errorMessage);
        } finally {
            const submitButton = elements.authForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        }
    });

    // Logout button handler
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            logout();
            resetAuthState();
            showAuth();
            
            if (onLogout) {
                onLogout();
            }
        });
    }
}
