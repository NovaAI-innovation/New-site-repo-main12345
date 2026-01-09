/**
 * CMS Auth State Module
 * Manages authentication state
 */

/**
 * Auth state object
 * @type {Object}
 */
const authState = {
    authenticated: false,
    token: null,
    tokenExpiry: null
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if authenticated
 */
export function isAuthenticated() {
    return authState.authenticated;
}

/**
 * Set authenticated state
 * @param {boolean} authenticated - Whether user is authenticated
 */
export function setAuthenticated(authenticated) {
    authState.authenticated = authenticated;
}

/**
 * Get current token
 * @returns {string|null} - Current token or null
 */
export function getToken() {
    return authState.token;
}

/**
 * Set current token
 * @param {string|null} token - JWT token
 */
export function setToken(token) {
    authState.token = token;
}

/**
 * Get token expiry timestamp
 * @returns {number|null} - Token expiry timestamp or null
 */
export function getTokenExpiry() {
    return authState.tokenExpiry;
}

/**
 * Set token expiry timestamp
 * @param {number|null} expiry - Token expiry timestamp
 */
export function setTokenExpiry(expiry) {
    authState.tokenExpiry = expiry;
}

/**
 * Reset auth state to initial values
 */
export function resetAuthState() {
    authState.authenticated = false;
    authState.token = null;
    authState.tokenExpiry = null;
}

/**
 * Get the entire auth state object (for debugging)
 * @returns {Object} - Current auth state object
 */
export function getAuthState() {
    return { ...authState };
}
