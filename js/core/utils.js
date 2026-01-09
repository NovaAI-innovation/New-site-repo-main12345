/**
 * Utility Functions
 * General-purpose utility functions used across the application
 */

/**
 * Format file size in bytes to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date string to readable format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date (e.g., "Jan 27, 2025")
 */
export function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Show an error message in a UI element
 * @param {HTMLElement} element - The element to display the error in
 * @param {string} message - The error message to display
 */
export function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.className = 'cms-message error';
    element.style.display = 'block';
}

/**
 * Show a success message in a UI element
 * @param {HTMLElement} element - The element to display the success message in
 * @param {string} message - The success message to display
 */
export function showSuccess(element, message) {
    if (!element) return;
    element.textContent = message;
    element.className = 'cms-message success';
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

/**
 * Hide an error message element
 * @param {HTMLElement} element - The element to hide
 */
export function hideError(element) {
    if (!element) return;
    element.style.display = 'none';
}
