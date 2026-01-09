/**
 * Storage Utilities
 * Centralized localStorage and sessionStorage utilities with error handling
 */

/**
 * Get an item from localStorage
 * @param {string} key - The storage key
 * @returns {string|null} - The stored value or null if not found
 */
export function getItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error(`Error reading from localStorage (key: ${key}):`, error);
        return null;
    }
}

/**
 * Set an item in localStorage
 * @param {string} key - The storage key
 * @param {string} value - The value to store
 * @returns {boolean} - True if successful, false otherwise
 */
export function setItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error(`Error writing to localStorage (key: ${key}):`, error);
        return false;
    }
}

/**
 * Remove an item from localStorage
 * @param {string} key - The storage key
 * @returns {boolean} - True if successful, false otherwise
 */
export function removeItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing from localStorage (key: ${key}):`, error);
        return false;
    }
}

/**
 * Get an item from sessionStorage
 * @param {string} key - The storage key
 * @returns {string|null} - The stored value or null if not found
 */
export function getSessionItem(key) {
    try {
        return sessionStorage.getItem(key);
    } catch (error) {
        console.error(`Error reading from sessionStorage (key: ${key}):`, error);
        return null;
    }
}

/**
 * Set an item in sessionStorage
 * @param {string} key - The storage key
 * @param {string} value - The value to store
 * @returns {boolean} - True if successful, false otherwise
 */
export function setSessionItem(key, value) {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error(`Error writing to sessionStorage (key: ${key}):`, error);
        return false;
    }
}

/**
 * Remove an item from sessionStorage
 * @param {string} key - The storage key
 * @returns {boolean} - True if successful, false otherwise
 */
export function removeSessionItem(key) {
    try {
        sessionStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing from sessionStorage (key: ${key}):`, error);
        return false;
    }
}

/**
 * Clear all localStorage and sessionStorage
 * @returns {boolean} - True if successful, false otherwise
 */
export function clear() {
    try {
        localStorage.clear();
        sessionStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
}
