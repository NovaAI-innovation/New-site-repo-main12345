/**
 * HTTP Client
 * Consolidated fetch utilities with retry logic, timeout, and error handling
 */

import { CONNECTION_CONFIG, API_BASE_URL, API_ENDPOINTS } from './config.js';

/**
 * Make an API request with timeout, retry logic, and proper error handling
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Response>} - The fetch response
 */
export async function fetchWithRetry(url, options = {}, retries = CONNECTION_CONFIG.RETRY_ATTEMPTS) {
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
export async function checkApiHealth() {
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

/**
 * Make a fetch request with CORS and JWT authentication
 * Handles token refresh on 401 errors
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {Function} getAuthToken - Function to get current auth token
 * @param {Function} setAuthToken - Function to set new auth token
 * @param {Function} refreshToken - Function to refresh token
 * @param {Function} onAuthExpired - Callback when auth expires
 * @returns {Promise<Response>} - The fetch response
 */
export async function fetchWithCORS(url, options = {}, getAuthToken, setAuthToken, refreshToken, onAuthExpired) {
    // Ensure CORS mode is explicitly set
    const fetchOptions = {
        mode: 'cors',
        credentials: 'omit',
        ...options,
    };
    
    // Log request details for debugging (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.debug('Making request:', {
            url,
            method: fetchOptions.method || 'GET',
            mode: fetchOptions.mode,
            credentials: fetchOptions.credentials,
            hasAuth: !!getAuthToken?.()
        });
    }

    // Add JWT token to Authorization header if available
    const token = getAuthToken?.();
    if (token && !fetchOptions.headers) {
        fetchOptions.headers = {};
    }
    if (token && fetchOptions.headers) {
        if (fetchOptions.headers instanceof Headers) {
            fetchOptions.headers.set('Authorization', `Bearer ${token}`);
        } else {
            fetchOptions.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    // Don't override Content-Type if body is FormData (browser sets it automatically)
    if (options.body instanceof FormData) {
        if (fetchOptions.headers) {
            if (fetchOptions.headers instanceof Headers) {
                fetchOptions.headers.delete('Content-Type');
            } else if (typeof fetchOptions.headers === 'object') {
                const headers = new Headers(fetchOptions.headers);
                headers.delete('Content-Type');
                fetchOptions.headers = headers;
            }
        }
    } else if (!fetchOptions.headers || (!(fetchOptions.headers instanceof Headers) && !fetchOptions.headers['Content-Type'])) {
        if (!fetchOptions.headers) {
            fetchOptions.headers = {};
        }
        if (!(fetchOptions.headers instanceof Headers)) {
            fetchOptions.headers['Content-Type'] = 'application/json';
        } else {
            fetchOptions.headers.set('Content-Type', 'application/json');
        }
    }
    
    try {
        const fetchFn = fetchWithRetry;
        const response = await fetchFn(url, fetchOptions);
        
        // Handle 401 Unauthorized - token expired or invalid
        const isAuthEndpoint = url.includes('/cms/login') || url.includes('/cms/refresh');
        
        if (response.status === 401 && !isAuthEndpoint && refreshToken && setAuthToken) {
            console.warn('Authentication failed, attempting token refresh...');
            try {
                const currentToken = getAuthToken?.();
                const newToken = await refreshToken(currentToken);
                
                if (newToken) {
                    setAuthToken(newToken);
                    
                    // Retry original request with new token
                    const retryHeaders = new Headers(fetchOptions.headers);
                    retryHeaders.set('Authorization', `Bearer ${newToken}`);
                    
                    const retryOptions = {
                        ...fetchOptions,
                        headers: retryHeaders,
                        mode: 'cors',
                        credentials: 'omit'
                    };
                    return await fetchFn(url, retryOptions);
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
            }
            
            // Refresh failed, trigger auth expired callback
            if (onAuthExpired) {
                onAuthExpired();
            }
            throw new Error('Authentication expired. Please login again.');
        }
        
        return response;
    } catch (error) {
        const errorDetails = {
            url,
            method: options.method || 'GET',
            error: error.message || error.toString(),
            name: error.name,
            stack: error.stack
        };
        console.error('Fetch error:', errorDetails);
        
        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
            error.message = `Network error connecting to ${url}. ${error.message || 'Please check your connection.'}`;
        }
        
        throw error;
    }
}
