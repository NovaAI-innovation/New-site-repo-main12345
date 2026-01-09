/**
 * Gallery Cache Module
 * Handles caching of gallery images in localStorage with versioning and TTL
 */

import { getItem, setItem, removeItem } from '../../core/storage.js';

// Cache configuration
let CACHE_VERSION = 'v2';  // Mutable version that can be incremented
const CACHE_CONFIG = {
    KEY: 'gallery_cache',
    get VERSION() { return CACHE_VERSION; },  // Dynamic version getter
    TTL: 15 * 60 * 1000  // 15 minutes
};

// Track when images were last reordered to prevent stale caching
const REORDER_TIMESTAMP_KEY = 'gallery_last_reorder_timestamp';

/**
 * Increment cache version to invalidate all cached data
 * This is called when images are reordered to force fresh data fetch
 */
export function invalidateGalleryCache() {
    // Store timestamp FIRST - this prevents any subsequent cache operations
    // This timestamp persists to invalidate any cache created before the reorder
    const now = Date.now();
    setItem(REORDER_TIMESTAMP_KEY, now.toString());
    
    // Increment version to invalidate all cached data
    const currentVersion = parseInt(CACHE_VERSION.replace('v', ''));
    CACHE_VERSION = 'v' + (currentVersion + 1);
    
    // Clear existing cache
    removeItem(CACHE_CONFIG.KEY);
    
    console.log('Gallery cache invalidated and version bumped to:', CACHE_VERSION);
    console.log('Cache writes disabled for 60 seconds to prevent stale data');
    console.log('Reorder timestamp set to:', new Date(now).toISOString());
    console.log('Note: Reorder timestamp persists to invalidate old caches on future page loads');
}

/**
 * Get cached gallery data from localStorage
 * Returns object with data and cache metadata, or null if no valid cache
 * @returns {Object|null} - Cached data with metadata or null
 */
export function getCachedData() {
    try {
        const lastReorderTimestamp = getItem(REORDER_TIMESTAMP_KEY);
        
        // If a reorder happened recently (within 60 seconds), always skip cache
        // This ensures backend has time to update
        if (lastReorderTimestamp) {
            const reorderAge = Date.now() - parseInt(lastReorderTimestamp);
            if (reorderAge < 60000) {
                console.log(`Recent reorder detected (${Math.round(reorderAge / 1000)}s ago), skipping cache to get fresh data`);
                console.log('This prevents stale cached order from being used');
                return null;
            }
        }

        const cached = getItem(CACHE_CONFIG.KEY);
        if (!cached) return null;

        const parsed = JSON.parse(cached);

        // Check version
        if (parsed.version !== CACHE_CONFIG.VERSION) {
            console.log('Cache version mismatch, invalidating');
            removeItem(CACHE_CONFIG.KEY);
            return null;
        }

        // CRITICAL: Always check if cache is older than last reorder (even after 60 seconds)
        // This prevents using stale cache that was created before a reorder
        if (lastReorderTimestamp && parsed.timestamp < parseInt(lastReorderTimestamp)) {
            console.log('Cache is older than last reorder, invalidating stale cache');
            console.log(`Cache timestamp: ${new Date(parsed.timestamp).toISOString()}`);
            console.log(`Last reorder: ${new Date(parseInt(lastReorderTimestamp)).toISOString()}`);
            removeItem(CACHE_CONFIG.KEY);
            return null;
        }

        // Check TTL
        const age = Date.now() - parsed.timestamp;
        if (age > CACHE_CONFIG.TTL) {
            console.log('Cache expired, invalidating');
            removeItem(CACHE_CONFIG.KEY);
            return null;
        }

        console.log(`Using cached data (age: ${Math.round(age / 1000)}s)`);
        return {
            data: parsed.data,
            timestamp: parsed.timestamp,
            age: age
        };

    } catch (error) {
        console.error('Error reading cache:', error);
        removeItem(CACHE_CONFIG.KEY);
        return null;
    }
}

/**
 * Save gallery data to localStorage cache
 * This function will NOT cache if a reorder happened in the last 60 seconds
 * to prevent stale order data from being cached
 * @param {Object} data - The gallery data to cache
 */
export function setCachedData(data) {
    try {
        // CRITICAL: Check if a reorder happened recently - if so, don't cache yet
        const lastReorderTimestamp = getItem(REORDER_TIMESTAMP_KEY);
        if (lastReorderTimestamp) {
            const now = Date.now();
            const reorderAge = now - parseInt(lastReorderTimestamp);
            
            // Don't cache if reorder happened in last 60 seconds (allows backend to update)
            if (reorderAge < 60000) {
                const remainingSeconds = Math.round((60000 - reorderAge) / 1000);
                console.warn(`⚠️ CACHE WRITE BLOCKED: Recent reorder detected (${Math.round(reorderAge / 1000)}s ago)`);
                console.warn(`⚠️ Skipping cache write to prevent stale image order data`);
                console.warn(`⚠️ Cache writes will be allowed after ${remainingSeconds} more seconds`);
                console.warn(`⚠️ Reorder timestamp: ${new Date(parseInt(lastReorderTimestamp)).toISOString()}`);
                console.warn(`⚠️ Current time: ${new Date(now).toISOString()}`);
                return; // Exit early - DO NOT CACHE
            }
            // NOTE: We keep the reorder timestamp even after 60 seconds
            // This allows getCachedData() to invalidate old caches that predate the reorder
            // The timestamp is only cleared when a new reorder happens (in invalidateGalleryCache)
        }

        // Safe to cache - no recent reorder detected (or reorder was > 60s ago)
        const cacheObject = {
            data: data,
            timestamp: Date.now(),
            version: CACHE_CONFIG.VERSION
        };
        setItem(CACHE_CONFIG.KEY, JSON.stringify(cacheObject));
        console.log('✅ Saved data to cache');
    } catch (error) {
        console.error('Error saving to cache:', error);
        // Cache failure shouldn't break the app
    }
}

/**
 * Clear gallery cache (useful for CMS updates)
 */
export function clearGalleryCache() {
    removeItem(CACHE_CONFIG.KEY);
    console.log('Gallery cache cleared');
}

// Make invalidateGalleryCache available globally for CMS integration
if (typeof window !== 'undefined') {
    window.invalidateGalleryCache = invalidateGalleryCache;
    window.clearGalleryCache = clearGalleryCache;
}
