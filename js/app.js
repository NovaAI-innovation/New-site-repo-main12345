/**
 * Main Application Entry Point
 * Initializes features based on the current page
 */

// Core features (always loaded)
import { initAgeVerification } from './features/age-verification/ageVerification.js';
import { initNavigation } from './features/navigation/navigation.js';

// Page-specific features (loaded conditionally)
import { initGallery } from './features/gallery/galleryApp.js';
import { initCMS } from './features/cms/cmsApp.js';
import { initBookingForm } from './features/booking/bookingForm.js';
import { initCarousel } from './features/carousel/carousel.js';
import { initScrollReveal } from './features/ui/scrollReveal.js';
import { initParallax } from './features/ui/parallax.js';
import { initScrollToTop } from './features/ui/scrollToTop.js';
import { initLazyLoad } from './features/ui/lazyLoad.js';

/**
 * Get the current page identifier from data-page attribute
 * @returns {string} - The page identifier or 'home' as default
 */
function getCurrentPage() {
    const body = document.body;
    return body?.dataset?.page || 'home';
}

/**
 * Initialize page-specific features
 * @param {string} page - The current page identifier
 */
function initPageFeatures(page) {
    switch (page) {
        case 'gallery':
            initGallery();
            break;
        case 'cms':
            initCMS();
            break;
        case 'booking':
            initBookingForm();
            break;
        case 'home':
        case 'services':
        case 'platforms':
        case 'etiquette':
        default:
            // Common UI features for most pages
            initScrollReveal();
            initParallax();
            initScrollToTop();
            initLazyLoad();
            initCarousel();
            break;
    }
}

/**
 * Initialize the application
 */
function init() {
    try {
        // Always initialize these core features
        initAgeVerification();
        initNavigation();

        // Initialize page-specific features
        const currentPage = getCurrentPage();
        initPageFeatures(currentPage);

        console.log(`Application initialized for page: ${currentPage}`);
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
