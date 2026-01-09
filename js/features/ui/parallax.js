/**
 * Parallax Effect Module
 * Creates parallax scrolling effect on hero section
 */

/**
 * Initialize parallax effect
 */
export function initParallax() {
    const hero = document.querySelector('.hero');

    if (!hero) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5;
        
        if (scrolled < window.innerHeight) {
            hero.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
        } else {
            // Reset transform when past hero to prevent layout issues
            hero.style.transform = 'translateY(0)';
        }
    });
}
