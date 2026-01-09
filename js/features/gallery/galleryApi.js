/**
 * Gallery API Module
 * Handles API calls for fetching gallery images
 */

import { API_ENDPOINTS } from '../../core/config.js';
import { fetchWithRetry } from '../../core/http.js';
import { getCachedData, setCachedData } from './galleryCache.js';

/**
 * Fetch gallery images from the API with pagination
 * Returns object with { data, fromCache, cacheAge } where:
 * - data: the gallery data
 * - fromCache: boolean indicating if data came from cache
 * - cacheAge: age of cache in milliseconds (if fromCache is true), or null
 * @param {string|null} cursor - Pagination cursor
 * @param {boolean} useCache - Whether to use cache for initial load
 * @returns {Promise<Object>} - Gallery data with metadata
 */
export async function fetchGalleryImages(cursor = null, useCache = true) {
    try {
        // Try cache on initial load (no cursor)
        if (!cursor && useCache) {
            const cached = getCachedData();
            if (cached) {
                return {
                    data: cached.data,
                    fromCache: true,
                    cacheAge: cached.age
                };
            }
        }

        // Build API URL with pagination params
        const url = new URL(API_ENDPOINTS.GALLERY_IMAGES);
        url.searchParams.set('limit', '12');
        if (cursor) {
            url.searchParams.set('cursor', cursor);
        }

        console.log('Fetching gallery images from:', url.toString());

        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! status: ${response.status}`, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Raw API response:', data);

        // Validate response structure
        if (!data || typeof data !== 'object') {
            console.error('Invalid API response: data is not an object', data);
            throw new Error('Invalid API response format');
        }

        if (!data.images || !Array.isArray(data.images)) {
            console.error('Invalid API response: missing or invalid images array', data);
            throw new Error('API response missing images array');
        }

        if (!data.pagination || typeof data.pagination !== 'object') {
            console.error('Invalid API response: missing or invalid pagination', data);
            throw new Error('API response missing pagination metadata');
        }

        console.log(`Fetched ${data.images.length} images (has_more: ${data.pagination.has_more})`);

        return {
            data: data,
            fromCache: false,
            cacheAge: null
        };

    } catch (error) {
        console.error('Error fetching gallery images:', error);
        console.error('API endpoint:', API_ENDPOINTS?.GALLERY_IMAGES || 'Not defined');
        throw error;
    }
}
