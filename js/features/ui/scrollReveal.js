/**
 * Scroll Reveal Module
 * Animates elements as they come into view on scroll
 */

/**
 * Initialize scroll reveal animations
 */
export function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal, .reveal-delay, .reveal-delay-2');

    const revealOnScroll = () => {
        const triggerBottom = window.innerHeight * 0.85;
        
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            
            if (elementTop < triggerBottom) {
                element.classList.add('active');
            }
        });
    };

    // Initial check on page load
    revealOnScroll();

    // Check on scroll
    window.addEventListener('scroll', revealOnScroll);
}
