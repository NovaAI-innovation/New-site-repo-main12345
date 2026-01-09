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
 */
function getApiBaseUrl() {
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
const API_BASE_URL = getApiBaseUrl();

// Log the configuration for debugging
console.log('API Configuration:', {
    baseUrl: API_BASE_URL,
    hostname: window.location.hostname,
    protocol: window.location.protocol
});

// API Endpoints
const API_ENDPOINTS = {
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

// Connection Configuration
const CONNECTION_CONFIG = {
    TIMEOUT: 30000,  // 30 seconds timeout for API requests
    RETRY_ATTEMPTS: 3,  // Number of retry attempts for failed requests
    RETRY_DELAY: 1000,  // Delay between retries (ms)
    HEALTH_CHECK_INTERVAL: 60000,  // Health check every 60 seconds
};

/**
 * Make an API request with timeout, retry logic, and proper error handling
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Response>} - The fetch response
 */
async function fetchWithRetry(url, options = {}, retries = CONNECTION_CONFIG.RETRY_ATTEMPTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_CONFIG.TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        // Check if response is ok, but don't retry on HTTP errors (4xx, 5xx)
        // Only retry on network errors
        if (!response.ok && retries > 0) {
            // Don't retry on client errors (4xx) - these are not network issues
            if (response.status >= 400 && response.status < 500) {
                clearTimeout(timeoutId);
                return response;
            }
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        // Determine if this is a network error that should be retried
        const isNetworkError = 
            error.name === 'AbortError' ||  // Timeout
            error.name === 'TypeError' ||   // Network error (Failed to fetch)
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('NetworkError') ||
            error.message?.includes('Network request failed');

        // Retry on network errors or timeouts (not on HTTP errors)
        if (retries > 0 && isNetworkError) {
            const remaining = retries - 1;
            console.warn(
                `Request failed (${error.name || 'Network Error'}), retrying... ` +
                `(${remaining} attempt${remaining !== 1 ? 's' : ''} remaining)`,
                { url, error: error.message }
            );
            await new Promise(resolve => setTimeout(resolve, CONNECTION_CONFIG.RETRY_DELAY));
            return fetchWithRetry(url, options, remaining);
        }

        // Don't retry - either no retries left or not a network error
        // Enhance error message for better debugging
        if (isNetworkError) {
            error.message = `Network error: Unable to reach ${url}. ${error.message || 'Please check your internet connection and try again.'}`;
        }
        
        throw error;
    }
}

/**
 * Check API health by calling the health endpoint
 * @returns {Promise<boolean>} - True if API is healthy
 */
async function checkApiHealth() {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        }, 1); // Only 1 retry for health checks

        return response.ok;
    } catch (error) {
        console.error('API health check failed:', error);
        return false;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL, API_ENDPOINTS, CONNECTION_CONFIG, fetchWithRetry, checkApiHealth };
}





