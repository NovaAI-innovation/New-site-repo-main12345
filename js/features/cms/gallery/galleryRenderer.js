/**
 * CMS Gallery Renderer Module
 * Handles rendering of CMS gallery grid with filtering and sorting
 */

import { formatFileSize } from '../../../core/utils.js';
import { openCaptionEditor, deleteImage } from './galleryManager.js';

let elements = null;
let images = [];
let searchQuery = '';
let sortOrder = 'manual';
let onImageCardCreated = null;

/**
 * Initialize gallery renderer
 * @param {Object} cmsElements - CMS DOM elements object
 * @param {Function} cardCreatedCallback - Callback when image card is created (for drag handlers)
 */
export function initGalleryRenderer(cmsElements, cardCreatedCallback) {
    elements = cmsElements;
    onImageCardCreated = cardCreatedCallback;
}

/**
 * Set images to render
 * @param {Array} imageArray - Array of image objects
 */
export function setImages(imageArray) {
    images = imageArray || [];
}

/**
 * Get current images
 * @returns {Array} - Array of image objects
 */
export function getImages() {
    return images;
}

/**
 * Set search query
 * @param {string} query - Search query string
 */
export function setSearchQuery(query) {
    searchQuery = query || '';
}

/**
 * Set sort order
 * @param {string} order - Sort order ('manual', 'newest', 'oldest', 'name-az', 'name-za')
 */
export function setSortOrder(order) {
    sortOrder = order || 'manual';
}

/**
 * Update statistics display
 * @param {Array} imageArray - Array of image objects
 */
export function updateStatistics(imageArray) {
    if (!elements) return;

    const imagesToCount = imageArray || images;
    
    if (elements.totalImages) {
        elements.totalImages.textContent = imagesToCount.length;
    }

    // Calculate total storage (if available)
    if (elements.totalStorage) {
        const totalBytes = imagesToCount.reduce((sum, img) => sum + (img.file_size || 0), 0);
        elements.totalStorage.textContent = formatFileSize(totalBytes);
    }
}

/**
 * Render gallery grid with filtering and sorting
 * @param {Set} selectedImages - Set of selected image IDs
 */
export function renderGallery(selectedImages = new Set()) {
    if (!elements || !elements.galleryGrid) return;

    let filteredImages = [...images];

    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredImages = filteredImages.filter(img =>
            (img.caption && img.caption.toLowerCase().includes(query)) ||
            (img.cloudinary_url && img.cloudinary_url.toLowerCase().includes(query))
        );
    }

    // Apply sort (only if not 'manual' - manual preserves backend order)
    if (sortOrder !== 'manual') {
        filteredImages.sort((a, b) => {
            switch (sortOrder) {
                case 'newest':
                    return new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0);
                case 'oldest':
                    return new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0);
                case 'name-az':
                    return (a.caption || '').localeCompare(b.caption || '');
                case 'name-za':
                    return (b.caption || '').localeCompare(a.caption || '');
                default:
                    return 0;
            }
        });
    }

    if (elements.galleryCountBadge) {
        elements.galleryCountBadge.textContent = filteredImages.length;
    }

    if (filteredImages.length === 0) {
        if (elements.galleryGrid) {
            elements.galleryGrid.style.display = 'none';
        }
        if (elements.emptyState) {
            elements.emptyState.style.display = 'block';
        }
        return;
    }

    if (elements.galleryGrid) {
        elements.galleryGrid.style.display = 'grid';
    }
    if (elements.emptyState) {
        elements.emptyState.style.display = 'none';
    }
    if (elements.galleryGrid) {
        elements.galleryGrid.innerHTML = '';
    }

    filteredImages.forEach((image, index) => {
        const card = createImageCard(image, index, selectedImages);
        if (elements.galleryGrid) {
            elements.galleryGrid.appendChild(card);
        }
        
        // Notify that card was created (for drag handlers)
        if (onImageCardCreated) {
            onImageCardCreated(card, image);
        }
    });
}

/**
 * Create an image card element
 * @param {Object} image - Image data object
 * @param {number} index - Image index
 * @param {Set} selectedImages - Set of selected image IDs
 * @returns {HTMLElement} - Image card element
 */
function createImageCard(image, index, selectedImages = new Set()) {
    const card = document.createElement('div');
    card.className = 'card cms-image-card';
    card.dataset.imageId = image.id;
    card.draggable = true;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'image-card-checkbox';
    checkbox.checked = selectedImages.has(image.id);
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        // Selection will be handled by bulkOperations module
    });

    // Drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'image-card-drag-handle';
    dragHandle.innerHTML = '⋮⋮';

    // Preview
    const preview = document.createElement('div');
    preview.className = 'image-card-preview';
    const img = document.createElement('img');
    img.src = image.cloudinary_url;
    img.alt = image.caption || 'Gallery image';
    img.loading = 'lazy';
    preview.appendChild(img);

    // Info section
    const info = document.createElement('div');
    info.className = 'image-card-info';

    const name = document.createElement('div');
    name.className = 'image-card-name';
    name.textContent = image.caption || 'Untitled';

    const actions = document.createElement('div');
    actions.className = 'image-card-actions';

    const editCaptionBtn = document.createElement('button');
    editCaptionBtn.className = 'btn btn-secondary btn-small';
    editCaptionBtn.innerHTML = '<span>✏️</span> Edit Caption';
    editCaptionBtn.onclick = (e) => {
        e.stopPropagation();
        openCaptionEditor(image.id, image.caption, image.cloudinary_url);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-small';
    deleteBtn.innerHTML = '<span>🗑️</span> Delete';
    deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        const success = await deleteImage(image.id);
        if (success) {
            // Reload will be handled by parent
        }
    };

    actions.appendChild(editCaptionBtn);
    actions.appendChild(deleteBtn);
    info.appendChild(name);
    info.appendChild(actions);

    card.appendChild(checkbox);
    card.appendChild(dragHandle);
    card.appendChild(preview);
    card.appendChild(info);

    return card;
}
