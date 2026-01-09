/**
 * Optimized Gallery Lightbox Module
 * 
 * Features:
 * - Image preloading and caching
 * - Loading states and error handling
 * - Touch/swipe support for mobile
 * - Smooth transitions
 * - Image counter
 * - Memory-efficient event handling
 * - Keyboard navigation
 * - Accessibility improvements
 */

(function() {
    'use strict';

    // ===========================
    // Configuration
    // ===========================
    const CONFIG = {
        // Number of adjacent images to preload
        PRELOAD_COUNT: 2,
        
        // Transition duration (ms)
        TRANSITION_DURATION: 300,
        
        // Swipe threshold (px)
        SWIPE_THRESHOLD: 50,
        
        // Enable debug logging
        DEBUG: false,
        
        // Image loading timeout (ms)
        LOAD_TIMEOUT: 30000
    };

    // ===========================
    // State Management
    // ===========================
    const state = {
        isOpen: false,
        currentIndex: -1,
        images: [],
        preloadedImages: new Map(), // Cache for preloaded images
        isLoading: false,
        touchStartX: 0,
        touchStartY: 0,
        touchEndX: 0,
        touchEndY: 0,
        transitionTimeout: null
    };

    // ===========================
    // DOM Elements Cache
    // ===========================
    let elements = {
        lightbox: null,
        image: null,
        caption: null,
        closeBtn: null,
        prevBtn: null,
        nextBtn: null,
        counter: null,
        loadingSpinner: null,
        errorMessage: null
    };

    // ===========================
    // Utility Functions
    // ===========================
    const utils = {
        log: function(...args) {
            if (CONFIG.DEBUG) {
                console.log('[Lightbox]', ...args);
            }
        },
        
        generateCloudinaryUrl: function(imageUrl, transformation) {
            if (typeof generateCloudinaryUrl === 'function') {
                return generateCloudinaryUrl(imageUrl, transformation);
            }
            // Fallback if function not available
            return imageUrl;
        },
        
        createElement: function(tag, className, content) {
            const el = document.createElement(tag);
            if (className) el.className = className;
            if (content) el.textContent = content;
            return el;
        }
    };

    // ===========================
    // Image Preloading
    // ===========================
    const preloader = {
        /**
         * Preload an image and cache it
         */
        preloadImage: function(imageUrl, index) {
            // Check if already preloaded
            if (state.preloadedImages.has(index)) {
                return Promise.resolve(state.preloadedImages.get(index));
            }

            return new Promise((resolve, reject) => {
                const img = new Image();
                const fullSizeUrl = utils.generateCloudinaryUrl(imageUrl, 'full');
                
                const timeout = setTimeout(() => {
                    img.onload = null;
                    img.onerror = null;
                    reject(new Error('Image load timeout'));
                }, CONFIG.LOAD_TIMEOUT);

                img.onload = () => {
                    clearTimeout(timeout);
                    state.preloadedImages.set(index, {
                        url: fullSizeUrl,
                        element: img,
                        loaded: true
                    });
                    utils.log(`Preloaded image ${index + 1}`);
                    resolve(img);
                };

                img.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Failed to load image'));
                };

                img.src = fullSizeUrl;
            });
        },

        /**
         * Preload adjacent images
         */
        preloadAdjacent: function(currentIndex) {
            const images = state.images;
            if (!images || images.length === 0) return;

            const preloadPromises = [];
            
            // Preload previous images
            for (let i = 1; i <= CONFIG.PRELOAD_COUNT; i++) {
                const prevIndex = (currentIndex - i + images.length) % images.length;
                if (prevIndex !== currentIndex && !state.preloadedImages.has(prevIndex)) {
                    preloadPromises.push(
                        this.preloadImage(images[prevIndex].cloudinary_url, prevIndex)
                            .catch(err => utils.log('Preload failed for', prevIndex, err))
                    );
                }
            }

            // Preload next images
            for (let i = 1; i <= CONFIG.PRELOAD_COUNT; i++) {
                const nextIndex = (currentIndex + i) % images.length;
                if (nextIndex !== currentIndex && !state.preloadedImages.has(nextIndex)) {
                    preloadPromises.push(
                        this.preloadImage(images[nextIndex].cloudinary_url, nextIndex)
                            .catch(err => utils.log('Preload failed for', nextIndex, err))
                    );
                }
            }

            return Promise.allSettled(preloadPromises);
        },

        /**
         * Clear old preloaded images (keep only recent ones)
         */
        cleanup: function() {
            const maxCacheSize = CONFIG.PRELOAD_COUNT * 4;
            if (state.preloadedImages.size > maxCacheSize) {
                // Remove oldest entries
                const entries = Array.from(state.preloadedImages.entries());
                const toRemove = entries.slice(0, entries.length - maxCacheSize);
                toRemove.forEach(([index]) => {
                    state.preloadedImages.delete(index);
                });
                utils.log('Cleaned up preload cache');
            }
        }
    };

    // ===========================
    // UI Management
    // ===========================
    const ui = {
        /**
         * Initialize UI elements
         */
        init: function() {
            elements.lightbox = document.getElementById('lightbox');
            elements.image = document.getElementById('lightbox-image');
            elements.caption = document.getElementById('lightbox-caption');
            elements.closeBtn = document.getElementById('lightbox-close');
            elements.prevBtn = document.getElementById('lightbox-prev');
            elements.nextBtn = document.getElementById('lightbox-next');

            if (!elements.lightbox || !elements.image) {
                utils.log('Lightbox elements not found');
                return false;
            }

            // Create counter element if it doesn't exist
            if (!elements.counter) {
                elements.counter = utils.createElement('div', 'lightbox-counter');
                elements.lightbox.appendChild(elements.counter);
            }

            // Create loading spinner if it doesn't exist
            if (!elements.loadingSpinner) {
                elements.loadingSpinner = utils.createElement('div', 'lightbox-loading');
                elements.loadingSpinner.innerHTML = '<div class="spinner"></div>';
                elements.lightbox.appendChild(elements.loadingSpinner);
            }

            // Create error message if it doesn't exist
            if (!elements.errorMessage) {
                elements.errorMessage = utils.createElement('div', 'lightbox-error');
                elements.errorMessage.textContent = 'Failed to load image';
                elements.lightbox.appendChild(elements.errorMessage);
            }

            return true;
        },

        /**
         * Show loading state
         */
        showLoading: function() {
            if (elements.loadingSpinner) {
                elements.loadingSpinner.style.display = 'flex';
            }
            if (elements.errorMessage) {
                elements.errorMessage.style.display = 'none';
            }
            if (elements.image) {
                elements.image.style.opacity = '0';
            }
        },

        /**
         * Hide loading state
         */
        hideLoading: function() {
            if (elements.loadingSpinner) {
                elements.loadingSpinner.style.display = 'none';
            }
            if (elements.image) {
                elements.image.style.opacity = '1';
            }
        },

        /**
         * Show error state
         */
        showError: function(message) {
            if (elements.loadingSpinner) {
                elements.loadingSpinner.style.display = 'none';
            }
            if (elements.errorMessage) {
                elements.errorMessage.textContent = message || 'Failed to load image';
                elements.errorMessage.style.display = 'block';
            }
        },

        /**
         * Update image counter
         */
        updateCounter: function() {
            if (elements.counter && state.images.length > 0) {
                elements.counter.textContent = `${state.currentIndex + 1} / ${state.images.length}`;
            }
        },

        /**
         * Update navigation button states
         */
        updateNavigation: function() {
            if (state.images.length <= 1) {
                if (elements.prevBtn) elements.prevBtn.style.display = 'none';
                if (elements.nextBtn) elements.nextBtn.style.display = 'none';
            } else {
                if (elements.prevBtn) elements.prevBtn.style.display = 'flex';
                if (elements.nextBtn) elements.nextBtn.style.display = 'flex';
            }
        }
    };

    // ===========================
    // Image Loading
    // ===========================
    const imageLoader = {
        /**
         * Load and display an image
         */
        loadImage: function(index) {
            if (state.isLoading) return Promise.resolve();
            
            const images = state.images;
            if (!images || index < 0 || index >= images.length) {
                return Promise.reject(new Error('Invalid image index'));
            }

            state.isLoading = true;
            ui.showLoading();

            const imageData = images[index];
            const imageUrl = imageData.cloudinary_url;

            return new Promise((resolve, reject) => {
                // Check if image is already preloaded
                if (state.preloadedImages.has(index)) {
                    const cached = state.preloadedImages.get(index);
                    this.displayImage(cached.url, imageData, index);
                    state.isLoading = false;
                    resolve();
                    return;
                }

                // Load image
                const fullSizeUrl = utils.generateCloudinaryUrl(imageUrl, 'full');
                const img = new Image();

                const timeout = setTimeout(() => {
                    img.onload = null;
                    img.onerror = null;
                    state.isLoading = false;
                    ui.showError('Image load timeout');
                    reject(new Error('Image load timeout'));
                }, CONFIG.LOAD_TIMEOUT);

                img.onload = () => {
                    clearTimeout(timeout);
                    state.preloadedImages.set(index, {
                        url: fullSizeUrl,
                        element: img,
                        loaded: true
                    });
                    this.displayImage(fullSizeUrl, imageData, index);
                    state.isLoading = false;
                    resolve();
                };

                img.onerror = () => {
                    clearTimeout(timeout);
                    state.isLoading = false;
                    ui.showError('Failed to load image');
                    reject(new Error('Failed to load image'));
                };

                img.src = fullSizeUrl;
            });
        },

        /**
         * Display loaded image with smooth transition
         */
        displayImage: function(imageUrl, imageData, index) {
            if (!elements.image) return;

            // Update image source
            elements.image.src = imageUrl;
            elements.image.alt = imageData.caption || `Gallery image ${index + 1}`;

            // Update caption
            if (elements.caption) {
                if (imageData.caption) {
                    elements.caption.textContent = imageData.caption;
                    elements.caption.style.display = 'block';
                } else {
                    elements.caption.style.display = 'none';
                }
            }

            // Smooth fade-in transition
            elements.image.style.transition = `opacity ${CONFIG.TRANSITION_DURATION}ms ease-in-out`;
            setTimeout(() => {
                ui.hideLoading();
            }, 50);
        }
    };

    // ===========================
    // Navigation
    // ===========================
    const navigation = {
        /**
         * Navigate to previous image
         */
        previous: function() {
            if (state.isLoading || state.images.length === 0) return;
            
            const prevIndex = (state.currentIndex - 1 + state.images.length) % state.images.length;
            this.goTo(prevIndex);
        },

        /**
         * Navigate to next image
         */
        next: function() {
            if (state.isLoading || state.images.length === 0) return;
            
            const nextIndex = (state.currentIndex + 1) % state.images.length;
            this.goTo(nextIndex);
        },

        /**
         * Navigate to specific index
         */
        goTo: function(index) {
            if (state.isLoading || !state.images || index < 0 || index >= state.images.length) {
                return;
            }

            // Clear any pending transitions
            if (state.transitionTimeout) {
                clearTimeout(state.transitionTimeout);
            }

            state.currentIndex = index;
            ui.updateCounter();
            ui.updateNavigation();

            // Load image
            imageLoader.loadImage(index)
                .then(() => {
                    // Preload adjacent images in background
                    preloader.preloadAdjacent(index);
                    preloader.cleanup();
                })
                .catch(err => {
                    utils.log('Navigation error:', err);
                });
        }
    };

    // ===========================
    // Touch/Swipe Support
    // ===========================
    const touchHandler = {
        /**
         * Handle touch start
         */
        onTouchStart: function(e) {
            if (!state.isOpen) return;
            
            state.touchStartX = e.changedTouches[0].screenX;
            state.touchStartY = e.changedTouches[0].screenY;
        },

        /**
         * Handle touch end (swipe detection)
         */
        onTouchEnd: function(e) {
            if (!state.isOpen || state.isLoading) return;

            state.touchEndX = e.changedTouches[0].screenX;
            state.touchEndY = e.changedTouches[0].screenY;

            const deltaX = state.touchStartX - state.touchEndX;
            const deltaY = state.touchStartY - state.touchEndY;

            // Check if horizontal swipe is greater than vertical (to avoid conflicts with scrolling)
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > CONFIG.SWIPE_THRESHOLD) {
                if (deltaX > 0) {
                    // Swipe left - next image
                    navigation.next();
                } else {
                    // Swipe right - previous image
                    navigation.previous();
                }
            }
        }
    };

    // ===========================
    // Event Handlers
    // ===========================
    const eventHandlers = {
        /**
         * Setup all event listeners
         */
        setup: function() {
            // Close button
            if (elements.closeBtn) {
                elements.closeBtn.addEventListener('click', lightbox.close);
            }

            // Navigation buttons
            if (elements.prevBtn) {
                elements.prevBtn.addEventListener('click', navigation.previous.bind(navigation));
            }

            if (elements.nextBtn) {
                elements.nextBtn.addEventListener('click', navigation.next.bind(navigation));
            }

            // Close on background click
            if (elements.lightbox) {
                elements.lightbox.addEventListener('click', (e) => {
                    if (e.target === elements.lightbox) {
                        lightbox.close();
                    }
                });
            }

            // Keyboard navigation
            document.addEventListener('keydown', this.handleKeyboard.bind(this));

            // Touch events
            if (elements.lightbox) {
                elements.lightbox.addEventListener('touchstart', touchHandler.onTouchStart.bind(touchHandler), { passive: true });
                elements.lightbox.addEventListener('touchend', touchHandler.onTouchEnd.bind(touchHandler), { passive: true });
            }

            // Prevent image drag
            if (elements.image) {
                elements.image.addEventListener('dragstart', (e) => e.preventDefault());
            }
        },

        /**
         * Handle keyboard events
         */
        handleKeyboard: function(e) {
            if (!state.isOpen) return;

            switch (e.key) {
                case 'Escape':
                    lightbox.close();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    navigation.previous();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    navigation.next();
                    break;
            }
        },

        /**
         * Cleanup event listeners (for memory management)
         */
        cleanup: function() {
            // Event listeners are automatically cleaned up when elements are removed
            // But we can add cleanup logic here if needed
        }
    };

    // ===========================
    // Public Lightbox API
    // ===========================
    const lightbox = {
        /**
         * Initialize lightbox
         */
        init: function() {
            if (!ui.init()) {
                return false;
            }

            eventHandlers.setup();
            utils.log('Lightbox initialized');
            return true;
        },

        /**
         * Open lightbox with image
         */
        open: function(imageUrl, imageIndex, imagesArray) {
            if (!imagesArray || imagesArray.length === 0) {
                utils.log('No images provided');
                return;
            }

            // Update state
            state.images = imagesArray;
            state.currentIndex = imageIndex;
            state.isOpen = true;

            // Show lightbox
            if (elements.lightbox) {
                elements.lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            }

            // Update UI
            ui.updateCounter();
            ui.updateNavigation();

            // Load image
            imageLoader.loadImage(imageIndex)
                .then(() => {
                    // Preload adjacent images
                    preloader.preloadAdjacent(imageIndex);
                })
                .catch(err => {
                    utils.log('Error opening lightbox:', err);
                });

            // Focus management for accessibility
            if (elements.closeBtn) {
                elements.closeBtn.focus();
            }
        },

        /**
         * Close lightbox
         */
        close: function() {
            if (!state.isOpen) return;

            state.isOpen = false;
            state.isLoading = false;

            // Hide lightbox
            if (elements.lightbox) {
                elements.lightbox.classList.remove('active');
            }

            document.body.style.overflow = '';

            // Clear transition timeout
            if (state.transitionTimeout) {
                clearTimeout(state.transitionTimeout);
                state.transitionTimeout = null;
            }

            utils.log('Lightbox closed');
        },

        /**
         * Get current state
         */
        getState: function() {
            return {
                isOpen: state.isOpen,
                currentIndex: state.currentIndex,
                totalImages: state.images.length
            };
        }
    };

    // ===========================
    // Global API (for backward compatibility)
    // ===========================
    window.openLightbox = function(imageUrl, imageIndex) {
        // Get images from galleryState if available
        if (typeof galleryState !== 'undefined' && galleryState.allImages && galleryState.allImages.length > 0) {
            // Validate index
            if (imageIndex < 0 || imageIndex >= galleryState.allImages.length) {
                utils.log('Invalid image index:', imageIndex);
                return;
            }
            lightbox.open(imageUrl, imageIndex, galleryState.allImages);
        } else {
            utils.log('galleryState not available or empty');
            // Fallback: try to use the provided imageUrl directly
            if (imageUrl && elements.lightbox) {
                // Basic fallback implementation
                if (elements.image) {
                    const fullSizeUrl = utils.generateCloudinaryUrl(imageUrl, 'full');
                    elements.image.src = fullSizeUrl;
                    elements.lightbox.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    state.isOpen = true;
                    state.currentIndex = imageIndex;
                }
            }
        }
    };

    // ===========================
    // Auto-initialize
    // ===========================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            lightbox.init();
        });
    } else {
        lightbox.init();
    }

    // ===========================
    // Export to global scope
    // ===========================
    window.Lightbox = lightbox;

})();
