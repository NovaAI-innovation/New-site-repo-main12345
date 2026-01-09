/**
 * CMS Drag Reorder Module
 * Handles drag and drop reordering of gallery images
 */

import { API_ENDPOINTS } from '../../../core/config.js';
import { fetchWithCORS } from '../../../core/http.js';
import { getAuthToken } from '../auth/authService.js';
import { refreshToken, setAuthToken } from '../auth/authService.js';
import { showAuth } from '../auth/authUI.js';
import { showError, showSuccess } from '../../../core/utils.js';

const AUTO_SCROLL_ZONE = 100; // Pixels from edge to trigger scroll
const AUTO_SCROLL_SPEED = 15; // Pixels per scroll tick

let elements = null;
let draggedElement = null;
let dragOverElement = null;
let autoScrollInterval = null;
let scrollDirection = 0;
let scrollSpeed = AUTO_SCROLL_SPEED;
let onReorderComplete = null;

/**
 * Initialize drag reorder
 * @param {Object} cmsElements - CMS DOM elements object
 * @param {Function} reorderCompleteCallback - Callback when reorder completes
 */
export function initDragReorder(cmsElements, reorderCompleteCallback) {
    elements = cmsElements;
    onReorderComplete = reorderCompleteCallback;

    if (!elements || !elements.galleryGrid) return;

    // Enhanced drag enter for grid container
    elements.galleryGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const draggingElement = document.querySelector('.cms-image-card.dragging');
        if (!draggingElement) return;

        // Update auto-scroll based on cursor position
        updateAutoScroll(e.clientY);

        // Find the closest element to cursor position
        const afterElement = getClosestElement(elements.galleryGrid, e.clientX, e.clientY);

        if (afterElement && afterElement !== draggingElement) {
            const rect = afterElement.getBoundingClientRect();
            const shouldInsertBefore = isBeforeElement(e.clientX, e.clientY, rect);

            if (shouldInsertBefore) {
                elements.galleryGrid.insertBefore(draggingElement, afterElement);
            } else {
                elements.galleryGrid.insertBefore(draggingElement, afterElement.nextSibling);
            }
        }
    });

    // Monitor drag events globally for auto-scrolling
    document.addEventListener('dragover', (e) => {
        // Only handle if dragging a gallery image
        if (document.querySelector('.cms-image-card.dragging')) {
            updateAutoScroll(e.clientY);
        }
    });
}

/**
 * Attach drag handlers to an image card
 * @param {HTMLElement} card - Image card element
 */
export function attachDragHandlers(card) {
    if (!card) return;

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
}

/**
 * Handle drag start
 * @param {DragEvent} e - Drag event
 */
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    
    // Start auto-scroll monitoring
    startAutoScroll();
}

/**
 * Handle drag end
 * @param {DragEvent} e - Drag event
 */
function handleDragEnd(e) {
    this.classList.remove('dragging');
    this.style.opacity = '1';

    // Stop auto-scrolling
    stopAutoScroll();

    // Remove all drop indicators
    document.querySelectorAll('.cms-image-card').forEach(card => {
        card.classList.remove('drag-over-before', 'drag-over-after');
    });

    draggedElement = null;
    dragOverElement = null;

    // Save the new order to the backend
    saveImageOrder();
}

/**
 * Handle drag over
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const draggingElement = document.querySelector('.cms-image-card.dragging');
    if (!draggingElement || this === draggingElement) return false;

    // Remove previous indicators
    document.querySelectorAll('.cms-image-card').forEach(card => {
        card.classList.remove('drag-over-before', 'drag-over-after');
    });

    // Get the bounding box of the current element
    const rect = this.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;

    // Determine if we should insert before or after based on cursor position
    const shouldInsertBefore = isBeforeElement(e.clientX, e.clientY, rect);

    if (shouldInsertBefore) {
        this.classList.add('drag-over-before');
        if (elements.galleryGrid) {
            elements.galleryGrid.insertBefore(draggingElement, this);
        }
    } else {
        this.classList.add('drag-over-after');
        if (elements.galleryGrid) {
            elements.galleryGrid.insertBefore(draggingElement, this.nextSibling);
        }
    }

    dragOverElement = this;
    return false;
}

/**
 * Handle drop
 * @param {DragEvent} e - Drag event
 */
function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    // Remove all drop indicators
    document.querySelectorAll('.cms-image-card').forEach(card => {
        card.classList.remove('drag-over-before', 'drag-over-after');
    });

    return false;
}

/**
 * Determine if cursor is before element
 * @param {number} mouseX - Mouse X position
 * @param {number} mouseY - Mouse Y position
 * @param {DOMRect} rect - Element bounding rect
 * @returns {boolean} - True if before element
 */
function isBeforeElement(mouseX, mouseY, rect) {
    // Calculate the center point of the element
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Get the grid's computed style to determine layout direction
    if (!elements.galleryGrid) return false;
    const gridStyle = window.getComputedStyle(elements.galleryGrid);
    const isRTL = gridStyle.direction === 'rtl';

    // For grid layouts, we need to consider both X and Y positions
    // First, check if we're on the same row (within vertical tolerance)
    const verticalTolerance = rect.height * 0.3;
    const onSameRow = Math.abs(mouseY - centerY) < verticalTolerance;

    if (onSameRow) {
        // If on same row, use horizontal position
        return isRTL ? mouseX > centerX : mouseX < centerX;
    } else {
        // If on different rows, use vertical position
        return mouseY < centerY;
    }
}

/**
 * Get closest element to cursor position
 * @param {HTMLElement} container - Container element
 * @param {number} x - Cursor X position
 * @param {number} y - Cursor Y position
 * @returns {HTMLElement|null} - Closest element or null
 */
function getClosestElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.cms-image-card:not(.dragging)')];

    let closest = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    draggableElements.forEach(child => {
        const box = child.getBoundingClientRect();
        const centerX = box.left + box.width / 2;
        const centerY = box.top + box.height / 2;

        // Calculate Euclidean distance from cursor to element center
        const distance = Math.sqrt(
            Math.pow(x - centerX, 2) +
            Math.pow(y - centerY, 2)
        );

        if (distance < closestDistance) {
            closestDistance = distance;
            closest = child;
        }
    });

    return closest;
}

/**
 * Start auto-scroll monitoring during drag
 */
function startAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
    }
    
    // Initialize scroll direction
    scrollDirection = 0;
    
    // Start checking scroll conditions
    autoScrollInterval = setInterval(() => {
        if (scrollDirection !== 0) {
            performScroll(scrollDirection);
        }
    }, 16); // ~60fps
}

/**
 * Stop auto-scrolling
 */
function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    scrollDirection = 0;
}

/**
 * Update auto-scroll direction based on cursor position
 * @param {number} clientY - Cursor Y position
 */
function updateAutoScroll(clientY) {
    if (!draggedElement) {
        scrollDirection = 0;
        return;
    }

    const viewportHeight = window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollBottom = scrollTop + viewportHeight;
    
    // Calculate distance from top and bottom edges
    const distanceFromTop = clientY;
    const distanceFromBottom = viewportHeight - clientY;
    
    // Determine scroll direction and speed based on proximity to edges
    let newScrollDirection = 0;
    let newScrollSpeed = AUTO_SCROLL_SPEED;
    
    if (distanceFromTop < AUTO_SCROLL_ZONE) {
        // Near top edge - scroll up
        const proximity = 1 - (distanceFromTop / AUTO_SCROLL_ZONE);
        newScrollDirection = -1;
        newScrollSpeed = AUTO_SCROLL_SPEED * (0.5 + proximity * 1.5); // Speed up closer to edge
    } else if (distanceFromBottom < AUTO_SCROLL_ZONE) {
        // Near bottom edge - scroll down
        const proximity = 1 - (distanceFromBottom / AUTO_SCROLL_ZONE);
        newScrollDirection = 1;
        newScrollSpeed = AUTO_SCROLL_SPEED * (0.5 + proximity * 1.5); // Speed up closer to edge
    }
    
    scrollDirection = newScrollDirection;
    scrollSpeed = newScrollSpeed;
}

/**
 * Perform the actual scrolling
 * @param {number} direction - Scroll direction (-1 up, 1 down)
 */
function performScroll(direction) {
    if (!draggedElement) return;
    
    const scrollAmount = scrollSpeed * direction;
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    
    // Only scroll if we're not at the limits
    if ((direction < 0 && currentScroll > 0) || (direction > 0 && currentScroll < maxScroll)) {
        // Use scrollBy for smooth continuous scrolling (handles boundaries automatically)
        window.scrollBy(0, scrollAmount);
        
        // Also try scrolling the gallery container if it has its own scroll
        const galleryContainer = elements.galleryGrid?.closest('.cms-gallery-grid') || 
                                 elements.galleryGrid?.parentElement;
        if (galleryContainer && galleryContainer.scrollHeight > galleryContainer.clientHeight) {
            const containerScroll = galleryContainer.scrollTop;
            const containerMaxScroll = galleryContainer.scrollHeight - galleryContainer.clientHeight;
            
            if ((direction < 0 && containerScroll > 0) || 
                (direction > 0 && containerScroll < containerMaxScroll)) {
                galleryContainer.scrollTop += scrollAmount;
            }
        }
    }
}

/**
 * Save the current visual order of images to the backend
 */
async function saveImageOrder() {
    if (!elements || !elements.galleryGrid) return;

    try {
        // Get all image cards in their current DOM order
        const cards = Array.from(elements.galleryGrid.querySelectorAll('.cms-image-card'));

        // Extract image IDs in display order
        const orderedIds = cards.map(card => parseInt(card.dataset.imageId));

        // Validate we have IDs to save
        if (orderedIds.length === 0) {
            console.warn('No images to reorder');
            return;
        }

        console.log('Saving new image order:', orderedIds);

        // Call reorder API endpoint
        const response = await fetchWithCORS(
            API_ENDPOINTS.CMS_REORDER_IMAGES,
            {
                method: 'PUT',
                body: JSON.stringify({
                    image_ids: orderedIds
                })
            },
            getAuthToken,
            setAuthToken,
            refreshToken,
            showAuth
        );

        if (response.ok) {
            const result = await response.json();
            console.log('Image order saved successfully:', result);

            // IMPORTANT: Invalidate cache FIRST (sets timestamp BEFORE clearing)
            if (typeof window.invalidateGalleryCache === 'function') {
                window.invalidateGalleryCache();
                console.log('Gallery cache version invalidated after reordering');
            }
            
            // Also clear existing cache
            if (typeof window.clearGalleryCache === 'function') {
                window.clearGalleryCache();
                console.log('Gallery cache cleared after reordering');
            }

            if (elements.galleryMessage) {
                showSuccess(elements.galleryMessage, 'Image order saved');
            }

            if (onReorderComplete) {
                onReorderComplete();
            }
        } else {
            const errorText = await response.text();
            console.error('Failed to save image order. Status:', response.status);

            let errorMessage = 'Failed to save image order';
            try {
                const error = JSON.parse(errorText);
                errorMessage = error.detail?.error || error.detail || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }

            if (elements.galleryMessage) {
                showError(elements.galleryMessage, errorMessage);
            }

            if (onReorderComplete) {
                onReorderComplete();
            }
        }
    } catch (error) {
        console.error('Error saving image order:', error);
        if (elements.galleryMessage) {
            showError(elements.galleryMessage, 'Error saving image order: ' + error.message);
        }
        
        if (onReorderComplete) {
            onReorderComplete();
        }
    }
}
