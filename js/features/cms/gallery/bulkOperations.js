/**
 * CMS Bulk Operations Module
 * Handles bulk selection and deletion of images
 */

import { API_ENDPOINTS } from '../../../core/config.js';
import { fetchWithCORS } from '../../../core/http.js';
import { getAuthToken } from '../auth/authService.js';
import { refreshToken, setAuthToken } from '../auth/authService.js';
import { showAuth } from '../auth/authUI.js';
import { showError, showSuccess } from '../../../core/utils.js';

let elements = null;
let selectedImages = new Set();
let allImages = [];
let onSelectionChange = null;
let onBulkDeleteComplete = null;

/**
 * Initialize bulk operations
 * @param {Object} cmsElements - CMS DOM elements object
 * @param {Function} selectionChangeCallback - Callback when selection changes
 * @param {Function} deleteCompleteCallback - Callback when bulk delete completes
 */
export function initBulkOperations(cmsElements, selectionChangeCallback, deleteCompleteCallback) {
    elements = cmsElements;
    onSelectionChange = selectionChangeCallback;
    onBulkDeleteComplete = deleteCompleteCallback;

    if (!elements) return;

    // Select all button
    if (elements.selectAllBtn) {
        elements.selectAllBtn.addEventListener('click', () => {
            selectAll();
        });
    }

    // Deselect all button
    if (elements.deselectAllBtn) {
        elements.deselectAllBtn.addEventListener('click', () => {
            deselectAll();
        });
    }

    // Delete selected button
    if (elements.deleteSelectedBtn) {
        elements.deleteSelectedBtn.addEventListener('click', async () => {
            await deleteSelected();
        });
    }
}

/**
 * Set all images (for select all functionality)
 * @param {Array} images - Array of image objects
 */
export function setAllImages(images) {
    allImages = images || [];
}

/**
 * Toggle image selection
 * @param {number} imageId - Image ID to toggle
 */
export function toggleImageSelection(imageId) {
    if (selectedImages.has(imageId)) {
        selectedImages.delete(imageId);
    } else {
        selectedImages.add(imageId);
    }
    updateSelectionUI();
}

/**
 * Select all images
 */
export function selectAll() {
    allImages.forEach(img => selectedImages.add(img.id));
    updateSelectionUI();
}

/**
 * Deselect all images
 */
export function deselectAll() {
    selectedImages.clear();
    updateSelectionUI();
}

/**
 * Get selected images
 * @returns {Set} - Set of selected image IDs
 */
export function getSelectedImages() {
    return new Set(selectedImages);
}

/**
 * Clear selection
 */
export function clearSelection() {
    selectedImages.clear();
    updateSelectionUI();
}

/**
 * Update selection UI
 */
function updateSelectionUI() {
    if (!elements) return;

    const count = selectedImages.size;
    
    if (elements.selectedCount) {
        elements.selectedCount.textContent = count;
    }
    if (elements.bulkCount) {
        elements.bulkCount.textContent = count;
    }

    if (elements.bulkToolbar) {
        if (count > 0) {
            elements.bulkToolbar.style.display = 'flex';
        } else {
            elements.bulkToolbar.style.display = 'none';
        }
    }

    if (elements.deleteSelectedBtn) {
        elements.deleteSelectedBtn.disabled = count === 0;
    }

    // Update card selection visuals
    document.querySelectorAll('.cms-image-card').forEach(card => {
        const imageId = parseInt(card.dataset.imageId);
        const checkbox = card.querySelector('.image-card-checkbox');

        if (selectedImages.has(imageId)) {
            card.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        } else {
            card.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        }
    });

    if (onSelectionChange) {
        onSelectionChange(selectedImages);
    }
}

/**
 * Delete selected images
 * @returns {Promise<boolean>} - True if successful
 */
export async function deleteSelected() {
    const count = selectedImages.size;
    if (count === 0) {
        return false;
    }

    if (!confirm(`Delete ${count} selected image(s)?`)) {
        return false;
    }

    try {
        const response = await fetchWithCORS(
            API_ENDPOINTS.CMS_BULK_DELETE,
            {
                method: 'DELETE',
                body: JSON.stringify({
                    image_ids: Array.from(selectedImages)
                })
            },
            getAuthToken,
            setAuthToken,
            refreshToken,
            showAuth
        );

        if (response.ok) {
            // Clear gallery cache so deleted images disappear immediately
            if (typeof window.clearGalleryCache === 'function') {
                window.clearGalleryCache();
                console.log('Gallery cache cleared after bulk delete');
            }

            if (elements.galleryMessage) {
                showSuccess(elements.galleryMessage, `Deleted ${count} image(s)`);
            }
            
            selectedImages.clear();
            updateSelectionUI();

            if (onBulkDeleteComplete) {
                onBulkDeleteComplete();
            }
            
            return true;
        } else {
            throw new Error('Bulk delete failed');
        }
    } catch (error) {
        console.error('Bulk delete error:', error);
        if (elements.galleryMessage) {
            showError(elements.galleryMessage, 'Failed to delete images');
        }
        return false;
    }
}
