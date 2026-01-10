/**
 * Gallery Carousel Module
 * Handles carousel functionality for gallery pages
 * - Slide navigation
 * - Indicators
 * - Keyboard and touch controls
 * - Auto-initialization
 */

(function() {
    'use strict';

    // ===========================
    // Gallery Carousel
    // ===========================

    // Global carousel state
    let carouselState = {
        currentSlideIndex: 0,
        totalSlides: 0,
        initialized: false
    };

    // Initialize gallery carousel (can be called after images are dynamically loaded)
    function initializeGalleryCarousel() {
        const carouselSlides = document.querySelectorAll('.gallery-slide');
        const carouselPrevBtn = document.getElementById('carousel-prev');
        const carouselNextBtn = document.getElementById('carousel-next');
        const carouselIndicatorsContainer = document.getElementById('carousel-indicators');

        if (!carouselIndicatorsContainer) {
            console.warn('Carousel indicators container not found');
            return;
        }

        // Only initialize if gallery elements exist
        if (carouselSlides.length > 0) {
            // Reset state
            carouselState.totalSlides = carouselSlides.length;
            carouselState.currentSlideIndex = 0;
            carouselState.initialized = true;

            // Ensure first slide is active
            carouselSlides.forEach((slide, index) => {
                slide.classList.remove('active');
                if (index === 0) {
                    slide.classList.add('active');
                }
            });

            // Clear existing indicators
            carouselIndicatorsContainer.innerHTML = '';

            // Create carousel indicators
            function createIndicators() {
                for (let i = 0; i < carouselState.totalSlides; i++) {
                    const indicator = document.createElement('div');
                    indicator.classList.add('carousel-indicator');
                    if (i === 0) indicator.classList.add('active');
                    indicator.addEventListener('click', () => goToSlide(i));
                    carouselIndicatorsContainer.appendChild(indicator);
                }
            }

            // Update carousel display
            function updateCarousel() {
                const carouselSlides = document.querySelectorAll('.gallery-slide');
                // Remove active class from all slides
                carouselSlides.forEach(slide => slide.classList.remove('active'));

                // Add active class to current slide
                if (carouselSlides[carouselState.currentSlideIndex]) {
                    carouselSlides[carouselState.currentSlideIndex].classList.add('active');
                }

                // Update indicators
                const indicators = document.querySelectorAll('.carousel-indicator');
                indicators.forEach((indicator, index) => {
                    if (index === carouselState.currentSlideIndex) {
                        indicator.classList.add('active');
                    } else {
                        indicator.classList.remove('active');
                    }
                });
            }

            // Go to specific slide
            function goToSlide(index) {
                if (index >= 0 && index < carouselState.totalSlides) {
                    carouselState.currentSlideIndex = index;
                    updateCarousel();
                }
            }

            // Navigate to previous slide
            function prevSlide() {
                carouselState.currentSlideIndex = (carouselState.currentSlideIndex - 1 + carouselState.totalSlides) % carouselState.totalSlides;
                updateCarousel();
            }

            // Navigate to next slide
            function nextSlide() {
                carouselState.currentSlideIndex = (carouselState.currentSlideIndex + 1) % carouselState.totalSlides;
                updateCarousel();
            }

            // Event listeners for carousel buttons (remove old listeners first)
            if (carouselPrevBtn) {
                carouselPrevBtn.onclick = null; // Clear old handler
                carouselPrevBtn.onclick = prevSlide;
            }

            if (carouselNextBtn) {
                carouselNextBtn.onclick = null; // Clear old handler
                carouselNextBtn.onclick = nextSlide;
            }

            // Keyboard navigation for carousel
            document.addEventListener('keydown', (e) => {
                // Only navigate if we're in the gallery section
                const gallerySection = document.getElementById('gallery');
                if (!gallerySection) return;

                const rect = gallerySection.getBoundingClientRect();
                const isInView = rect.top < window.innerHeight && rect.bottom > 0;

                if (isInView && carouselState.initialized) {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        prevSlide();
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        nextSlide();
                    }
                }
            });

            // Initialize carousel
            createIndicators();
            updateCarousel();

            // Touch/Swipe support for mobile
            let touchStartX = 0;
            let touchEndX = 0;

            const gallerySlides = document.querySelector('.gallery-slides');
            if (gallerySlides) {
                gallerySlides.addEventListener('touchstart', (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                });

                gallerySlides.addEventListener('touchend', (e) => {
                    touchEndX = e.changedTouches[0].screenX;
                    handleSwipe();
                });
            }

            function handleSwipe() {
                const swipeThreshold = 50;
                const diff = touchStartX - touchEndX;

                if (Math.abs(diff) > swipeThreshold && carouselState.initialized) {
                    if (diff > 0) {
                        // Swipe left - next slide
                        nextSlide();
                    } else {
                        // Swipe right - previous slide
                        prevSlide();
                    }
                }
            }
        }
    }

    // Listen for gallery loaded event
    window.addEventListener('galleryLoaded', () => {
        // Only initialize carousel if carousel elements exist
        const hasCarousel = document.querySelector('.gallery-slide') || document.getElementById('carousel-indicators');
        if (hasCarousel) {
            initializeGalleryCarousel();
        }
    });

    // Initialize on page load if slides already exist (fallback for non-API gallery)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const hasCarousel = document.querySelector('.gallery-slide') || document.getElementById('carousel-indicators');
                if (hasCarousel) {
                    initializeGalleryCarousel();
                }
            }, 100);
        });
    } else {
        setTimeout(() => {
            const hasCarousel = document.querySelector('.gallery-slide') || document.getElementById('carousel-indicators');
            if (hasCarousel) {
                initializeGalleryCarousel();
            }
        }, 100);
    }

    // Export for external use if needed
    window.GalleryCarousel = {
        initialize: initializeGalleryCarousel,
        getState: () => ({ ...carouselState })
    };

})();
