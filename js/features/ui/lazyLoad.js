/**
 * Lazy Load Module
 * Lazy loads images using Intersection Observer
 */

/**
 * Initialize lazy loading for images
 */
export function initLazyLoad() {
    const images = document.querySelectorAll('img[src]');

    if (images.length === 0) return;

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px'
    });

    images.forEach(img => imageObserver.observe(img));
}
