/**
 * CMS Gallery Manager Module
 * Handles CRUD operations for gallery images
 */

import { API_ENDPOINTS } from '../../../core/config.js';
import { fetchWithCORS } from '../../../core/http.js';
import { getAuthToken } from '../auth/authService.js';
import { refreshToken, setAuthToken } from '../auth/authService.js';
import { showAuth } from '../auth/authUI.js';
import { showError, showSuccess } from '../../../core/utils.js';

let elements = null;
let onImagesLoaded = null;
let currentEditingImageId = null;

/**
 * Initialize gallery manager
 * @param {Object} cmsElements - CMS DOM elements object
 * @param {Function} imagesLoadedCallback - Callback when images are loaded
 */
export function initGalleryManager(cmsElements, imagesLoadedCallback) {
    elements = cmsElements;
    onImagesLoaded = imagesLoadedCallback;
}

/**
 * Load gallery images from API
 * @returns {Promise<Array>} - Array of image objects
 */
export async function loadGalleryImages() {
    if (!elements || !elements.galleryGrid) {
        console.error('Gallery elements not found');
        return [];
    }

    elements.galleryGrid.innerHTML = '<div class="gallery-loading"><div class="loading-spinner"></div><p>Loading gallery images...</p></div>';

    try {
        const response = await fetchWithCORS(
            API_ENDPOINTS.CMS_GALLERY_IMAGES,
            { method: 'GET' },
            getAuthToken,
            setAuthToken,
            refreshToken,
            showAuth
        );

        if (response.ok) {
            const images = await response.json();
            
            if (onImagesLoaded) {
                onImagesLoaded(images);
            }
            
            return images;
        } else {
            throw new Error('Failed to load images');
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        if (elements.galleryGrid) {
            elements.galleryGrid.innerHTML = '<div class="gallery-loading"><p style="color: #ff6b6b;">Failed to load images</p></div>';
        }
        throw error;
    }
}

/**
 * Delete a single image
 * @param {number} imageId - Image ID to delete
 * @returns {Promise<boolean>} - True if successful
 */
export async function deleteImage(imageId) {
    if (!confirm('Delete this image?')) {
        return false;
    }

    try {
        const response = await fetchWithCORS(
            API_ENDPOINTS.CMS_GALLERY_IMAGE(imageId),
            { method: 'DELETE' },
            getAuthToken,
            setAuthToken,
            refreshToken,
            showAuth
        );

        if (response.ok) {
            // Clear gallery cache so deleted images disappear immediately
            if (typeof window.clearGalleryCache === 'function') {
                window.clearGalleryCache();
                console.log('Gallery cache cleared after delete');
            }

            if (elements.galleryMessage) {
                showSuccess(elements.galleryMessage, 'Image deleted');
            }
            return true;
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('Delete error:', error);
        if (elements.galleryMessage) {
            showError(elements.galleryMessage, 'Failed to delete image');
        }
        return false;
    }
}

/**
 * Open caption editor modal
 * @param {number} imageId - Image ID
 * @param {string} currentCaption - Current caption text
 * @param {string} imageUrl - Image URL for preview
 */
export function openCaptionEditor(imageId, currentCaption, imageUrl) {
    const modal = document.getElementById('caption-edit-modal');
    const previewImg = document.getElementById('caption-edit-preview-img');
    const captionInput = document.getElementById('caption-edit-input');

    if (modal && previewImg && captionInput) {
        currentEditingImageId = imageId;
        previewImg.src = imageUrl;
        captionInput.value = currentCaption || '';
        modal.classList.remove('hidden');
        captionInput.focus();
    }
}

/**
 * Close caption editor modal
 */
export function closeCaptionEditor() {
    const modal = document.getElementById('caption-edit-modal');
    const captionInput = document.getElementById('caption-edit-input');

    if (modal) {
        modal.classList.add('hidden');
        currentEditingImageId = null;
        if (captionInput) {
            captionInput.value = '';
        }
    }
}

/**
 * Save caption update
 * @returns {Promise<boolean>} - True if successful
 */
export async function saveCaptionUpdate() {
    const captionInput = document.getElementById('caption-edit-input');

    if (!currentEditingImageId || !captionInput) {
        return false;
    }

    const newCaption = captionInput.value.trim();

    try {
        const response = await fetchWithCORS(
            API_ENDPOINTS.CMS_GALLERY_IMAGE(currentEditingImageId),
            {
                method: 'PUT',
                body: JSON.stringify({
                    caption: newCaption || null
                })
            },
            getAuthToken,
            setAuthToken,
            refreshToken,
            showAuth
        );

        if (response.ok) {
            // Clear gallery cache so caption updates appear immediately
            if (typeof window.clearGalleryCache === 'function') {
                window.clearGalleryCache();
                console.log('Gallery cache cleared after caption update');
            }

            if (elements.galleryMessage) {
                showSuccess(elements.galleryMessage, 'Caption updated successfully');
            }
            closeCaptionEditor();
            return true;
        } else {
            const error = await response.json();
            if (elements.galleryMessage) {
                showError(elements.galleryMessage, error.detail?.error || 'Failed to update caption');
            }
            return false;
        }
    } catch (error) {
        console.error('Caption update error:', error);
        if (elements.galleryMessage) {
            showError(elements.galleryMessage, 'Error updating caption');
        }
        return false;
    }
}

/**
 * Get current editing image ID
 * @returns {number|null} - Current editing image ID or null
 */
export function getCurrentEditingImageId() {
    return currentEditingImageId;
}
