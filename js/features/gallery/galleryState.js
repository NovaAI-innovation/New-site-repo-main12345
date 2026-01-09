/**
 * Gallery State Module
 * Manages gallery state (images, pagination, loading state)
 */

/**
 * Gallery state object
 * @type {Object}
 */
const galleryState = {
    allImages: [],
    nextCursor: null,
    hasMore: true,
    isLoading: false
};

/**
 * Get all images from state
 * @returns {Array} - Array of image objects
 */
export function getAllImages() {
    return galleryState.allImages;
}

/**
 * Set all images in state
 * @param {Array} images - Array of image objects
 */
export function setAllImages(images) {
    galleryState.allImages = images || [];
}

/**
 * Append images to state
 * @param {Array} images - Array of image objects to append
 */
export function appendImages(images) {
    galleryState.allImages = [...galleryState.allImages, ...(images || [])];
}

/**
 * Get next cursor for pagination
 * @returns {string|null} - Next cursor value or null
 */
export function getNextCursor() {
    return galleryState.nextCursor;
}

/**
 * Set next cursor for pagination
 * @param {string|null} cursor - Next cursor value
 */
export function setNextCursor(cursor) {
    galleryState.nextCursor = cursor;
}

/**
 * Check if there are more images to load
 * @returns {boolean} - True if there are more images
 */
export function getHasMore() {
    return galleryState.hasMore;
}

/**
 * Set whether there are more images to load
 * @param {boolean} hasMore - Whether there are more images
 */
export function setHasMore(hasMore) {
    galleryState.hasMore = hasMore;
}

/**
 * Check if gallery is currently loading
 * @returns {boolean} - True if loading
 */
export function getIsLoading() {
    return galleryState.isLoading;
}

/**
 * Set loading state
 * @param {boolean} isLoading - Whether gallery is loading
 */
export function setIsLoading(isLoading) {
    galleryState.isLoading = isLoading;
}

/**
 * Reset gallery state to initial values
 */
export function resetState() {
    galleryState.allImages = [];
    galleryState.nextCursor = null;
    galleryState.hasMore = true;
    galleryState.isLoading = false;
}

/**
 * Get the entire state object (for debugging)
 * @returns {Object} - Current state object
 */
export function getState() {
    return { ...galleryState };
}
