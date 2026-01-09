/**
 * Gallery Lightbox Module
 * Handles opening, closing, and navigation of images in lightbox
 */

import { generateCloudinaryUrl } from './galleryRenderer.js';
import { getAllImages } from './galleryState.js';

let lightboxInitialized = false;

/**
 * Open lightbox with image
 * @param {string} imageUrl - The image URL to display
 * @param {number} imageIndex - The index of the image in the gallery
 */
export function openLightbox(imageUrl, imageIndex) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCaption = document.getElementById('lightbox-caption');

    if (!lightbox || !lightboxImage) {
        console.warn('Lightbox elements not found');
        return;
    }

    // Use full-size transformation for lightbox
    const fullSizeUrl = generateCloudinaryUrl(imageUrl, 'full');
    const allImages = getAllImages();

    lightboxImage.src = fullSizeUrl;
    lightboxImage.alt = allImages[imageIndex]?.caption || `Gallery image ${imageIndex + 1}`;

    // Show caption if available
    if (lightboxCaption) {
        if (allImages[imageIndex]?.caption) {
            lightboxCaption.textContent = allImages[imageIndex].caption;
            lightboxCaption.style.display = 'block';
        } else {
            lightboxCaption.style.display = 'none';
        }
    }

    lightbox.classList.add('active');
    lightbox.dataset.currentIndex = imageIndex;

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
}

/**
 * Close lightbox
 */
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Navigate to previous image
 */
function showPreviousImage() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const currentIndex = parseInt(lightbox.dataset.currentIndex || '0');
    const allImages = getAllImages();

    if (allImages.length > 0) {
        const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
        openLightbox(allImages[prevIndex].cloudinary_url, prevIndex);
    }
}

/**
 * Navigate to next image
 */
function showNextImage() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const currentIndex = parseInt(lightbox.dataset.currentIndex || '0');
    const allImages = getAllImages();

    if (allImages.length > 0) {
        const nextIndex = (currentIndex + 1) % allImages.length;
        openLightbox(allImages[nextIndex].cloudinary_url, nextIndex);
    }
}

/**
 * Initialize lightbox functionality
 */
export function initLightbox() {
    if (lightboxInitialized) return;

    const lightbox = document.getElementById('lightbox');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    if (!lightbox) {
        console.warn('Lightbox elements not found');
        return;
    }

    // Close button
    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    // Previous button
    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', showPreviousImage);
    }

    // Next button
    if (lightboxNext) {
        lightboxNext.addEventListener('click', showNextImage);
    }

    // Close on background click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                showPreviousImage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                showNextImage();
            }
        }
    });

    lightboxInitialized = true;
}

// Make openLightbox available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.openLightbox = openLightbox;
}
