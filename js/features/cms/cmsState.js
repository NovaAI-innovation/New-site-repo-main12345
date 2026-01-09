/**
 * CMS State Module
 * Centralized state management for CMS
 */

/**
 * CMS state object
 * @type {Object}
 */
const cmsState = {
    images: [],
    filesToUpload: [],
    fileCaptions: {},
    searchQuery: '',
    sortOrder: 'manual',  // Default to manual order to preserve backend ordering
    scrollDirection: 0,   // Auto-scroll direction: -1 (up), 0 (none), 1 (down)
    scrollSpeed: 10       // Auto-scroll speed in pixels per tick
};

/**
 * Get all images
 * @returns {Array} - Array of image objects
 */
export function getImages() {
    return cmsState.images;
}

/**
 * Set images
 * @param {Array} imageArray - Array of image objects
 */
export function setImages(imageArray) {
    cmsState.images = imageArray || [];
}

/**
 * Get files to upload
 * @returns {Array} - Array of File objects
 */
export function getFilesToUpload() {
    return cmsState.filesToUpload;
}

/**
 * Set files to upload
 * @param {Array} files - Array of File objects
 */
export function setFilesToUpload(files) {
    cmsState.filesToUpload = files || [];
}

/**
 * Get file captions
 * @returns {Object} - Map of file index to caption
 */
export function getFileCaptions() {
    return { ...cmsState.fileCaptions };
}

/**
 * Set file captions
 * @param {Object} captions - Map of file index to caption
 */
export function setFileCaptions(captions) {
    cmsState.fileCaptions = captions || {};
}

/**
 * Get search query
 * @returns {string} - Search query string
 */
export function getSearchQuery() {
    return cmsState.searchQuery;
}

/**
 * Set search query
 * @param {string} query - Search query string
 */
export function setSearchQuery(query) {
    cmsState.searchQuery = query || '';
}

/**
 * Get sort order
 * @returns {string} - Sort order
 */
export function getSortOrder() {
    return cmsState.sortOrder;
}

/**
 * Set sort order
 * @param {string} order - Sort order
 */
export function setSortOrder(order) {
    cmsState.sortOrder = order || 'manual';
}

/**
 * Get scroll direction
 * @returns {number} - Scroll direction (-1, 0, 1)
 */
export function getScrollDirection() {
    return cmsState.scrollDirection;
}

/**
 * Set scroll direction
 * @param {number} direction - Scroll direction
 */
export function setScrollDirection(direction) {
    cmsState.scrollDirection = direction;
}

/**
 * Get scroll speed
 * @returns {number} - Scroll speed
 */
export function getScrollSpeed() {
    return cmsState.scrollSpeed;
}

/**
 * Set scroll speed
 * @param {number} speed - Scroll speed
 */
export function setScrollSpeed(speed) {
    cmsState.scrollSpeed = speed;
}

/**
 * Reset CMS state to initial values
 */
export function resetCmsState() {
    cmsState.images = [];
    cmsState.filesToUpload = [];
    cmsState.fileCaptions = {};
    cmsState.searchQuery = '';
    cmsState.sortOrder = 'manual';
    cmsState.scrollDirection = 0;
    cmsState.scrollSpeed = 10;
}

/**
 * Get the entire CMS state object (for debugging)
 * @returns {Object} - Current CMS state object
 */
export function getCmsState() {
    return { ...cmsState };
}
