/**
 * API Configuration
 * Centralized configuration for API endpoints
 * Automatically detects development vs production environment
 */

/**
 * Determine the API base URL based on environment
 * - Local development: Uses localhost:8000
 * - Production: Uses your deployed API URL
 *
 * To override for testing, set: localStorage.setItem('API_BASE_URL', 'your-url')
 * @returns {string} The API base URL
 */
export function getApiBaseUrl() {
    // Check for manual override in localStorage (useful for testing)
    if (typeof localStorage !== 'undefined') {
        const override = localStorage.getItem('API_BASE_URL');
        if (override) {
            console.log('Using API_BASE_URL override from localStorage:', override);
            return override;
        }
    }

    // Auto-detect environment
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Local development environments (HTTP server on localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    // File protocol (opening HTML directly) or Production
    // Both use the cloud-hosted API
    return 'https://backend1234-pearl.vercel.app';
}

// Initialize API Base URL
export const API_BASE_URL = getApiBaseUrl();

// Log the configuration for debugging
console.log('API Configuration:', {
    baseUrl: API_BASE_URL,
    hostname: window.location.hostname,
    protocol: window.location.protocol
});

/**
 * API Endpoints configuration
 * @type {Object}
 */
export const API_ENDPOINTS = {
    // Public gallery endpoints
    GALLERY_IMAGES: `${API_BASE_URL}/api/gallery-images`,

    // CMS authentication endpoints
    CMS_LOGIN: `${API_BASE_URL}/api/cms/login`,
    CMS_REFRESH: `${API_BASE_URL}/api/cms/refresh`,

    // CMS endpoints (require JWT authentication)
    CMS_GALLERY_IMAGES: `${API_BASE_URL}/api/cms/gallery-images`,
    CMS_GALLERY_IMAGE: (id) => `${API_BASE_URL}/api/cms/gallery-images/${id}`,
    CMS_BULK_DELETE: `${API_BASE_URL}/api/cms/gallery-images/bulk`,
    CMS_REORDER_IMAGES: `${API_BASE_URL}/api/cms/gallery-images/reorder`,
};

/**
 * Connection configuration for API requests
 * @type {Object}
 */
export const CONNECTION_CONFIG = {
    TIMEOUT: 30000,  // 30 seconds timeout for API requests
    RETRY_ATTEMPTS: 3,  // Number of retry attempts for failed requests
    RETRY_DELAY: 1000,  // Delay between retries (ms)
    HEALTH_CHECK_INTERVAL: 60000,  // Health check every 60 seconds
};
