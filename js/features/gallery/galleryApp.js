/**
 * Gallery App Module
 * Coordinates all gallery modules and handles initialization
 */

import { fetchGalleryImages } from './galleryApi.js';
import { getCachedData, setCachedData } from './galleryCache.js';
import { renderImages, addLoadMoreButton } from './galleryRenderer.js';
import { openLightbox, initLightbox } from './galleryLightbox.js';
import {
    getAllImages,
    setAllImages,
    appendImages,
    getNextCursor,
    setNextCursor,
    getHasMore,
    setHasMore,
    getIsLoading,
    setIsLoading,
    resetState
} from './galleryState.js';

/**
 * Render initial gallery images
 */
async function renderGallery() {
    const galleryGrid = document.getElementById('gallery-grid');

    if (!galleryGrid) {
        console.error('Gallery grid container not found');
        return;
    }

    // Show loading state
    galleryGrid.innerHTML = '<div class="gallery-loading">Loading gallery...</div>';

    try {
        // Fetch first page (with cache)
        const result = await fetchGalleryImages(null, true);

        if (!result || !result.data || !result.data.images) {
            galleryGrid.innerHTML = '<div class="gallery-error">Failed to load gallery.</div>';
            return;
        }

        const data = result.data;
        const fromCache = result.fromCache;
        const cacheAge = result.cacheAge;

        // Update state - handle both cache and API response formats
        setAllImages(data.images);
        setNextCursor(data.pagination ? data.pagination.next_cursor : data.nextCursor);
        setHasMore(data.pagination ? data.pagination.has_more : data.hasMore);

        // Only recache if:
        // 1. Data came from API (not cache), OR
        // 2. Cache is older than 16 minutes (needs refresh)
        const shouldRecache = !fromCache || (cacheAge !== null && cacheAge > 16 * 60 * 1000);
        
        if (shouldRecache) {
            if (fromCache) {
                console.log(`Cache is ${Math.round(cacheAge / 1000 / 60)} minutes old, refreshing cache`);
            } else {
                console.log('Data fetched from API, caching fresh data');
            }
            // Cache the initial data in API response format (only if no recent reorder)
            setCachedData({
                images: getAllImages(),
                pagination: {
                    next_cursor: getNextCursor(),
                    has_more: getHasMore(),
                    total_count: data.pagination ? data.pagination.total_count : getAllImages().length
                }
            });
        } else {
            console.log(`Skipping recache - using fresh cached data (age: ${Math.round(cacheAge / 1000)}s)`);
        }

        if (getAllImages().length === 0) {
            galleryGrid.innerHTML = '<div class="gallery-empty">No images available at this time.</div>';
            return;
        }

        // Render images
        renderImages(getAllImages(), galleryGrid, openLightbox);

        // Add "Load More" button if there are more images
        if (getHasMore()) {
            addLoadMoreButton(galleryGrid, loadMoreImages);
        }

        console.log(`Successfully rendered ${getAllImages().length} images`);

    } catch (error) {
        console.error('Error rendering gallery:', error);
        galleryGrid.innerHTML = '<div class="gallery-error">Failed to load gallery. Please try again later.</div>';
    }
}

/**
 * Load more images (pagination)
 */
async function loadMoreImages() {
    if (getIsLoading() || !getHasMore()) {
        return;
    }

    const button = document.querySelector('.load-more-btn');
    if (!button) return;

    try {
        setIsLoading(true);
        button.textContent = 'Loading...';
        button.disabled = true;

        // Fetch next page (always from API, not cache)
        const result = await fetchGalleryImages(getNextCursor(), false);

        if (!result || !result.data || !result.data.images) {
            throw new Error('Failed to load more images');
        }

        const data = result.data;

        // Append new images to state
        appendImages(data.images);
        setNextCursor(data.pagination.next_cursor);
        setHasMore(data.pagination.has_more);

        // Always update cache when loading more images (new data from API)
        setCachedData({
            images: getAllImages(),
            pagination: {
                next_cursor: getNextCursor(),
                has_more: getHasMore(),
                total_count: data.pagination.total_count
            }
        });

        // Re-render images
        renderImages(getAllImages(), document.getElementById('gallery-grid'), openLightbox);

        // Update or remove button
        if (getHasMore()) {
            addLoadMoreButton(document.getElementById('gallery-grid'), loadMoreImages);
        }

        console.log(`Loaded ${data.images.length} more images (total: ${getAllImages().length})`);

    } catch (error) {
        console.error('Error loading more images:', error);
        if (button) {
            button.textContent = 'Load More';
            button.disabled = false;
        }
        alert('Failed to load more images. Please try again.');
    } finally {
        setIsLoading(false);
    }
}

/**
 * Initialize gallery functionality
 */
export function initGallery() {
    // Initialize lightbox
    initLightbox();

    // Reset state
    resetState();

    // Render gallery
    renderGallery();

    // Make loadMoreImages available globally for debugging
    if (typeof window !== 'undefined') {
        window.loadMoreImages = loadMoreImages;
    }
}
