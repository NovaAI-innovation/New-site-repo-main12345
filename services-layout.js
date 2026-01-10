/**
 * Services Layout Module
 * Handles services grid layout optimization
 * - Last row card stretching
 * - Responsive grid adjustments
 * - Window resize handling
 */

(function() {
    'use strict';

    // ===========================
    // Services Grid Last Row Stretching
    // ===========================

    function stretchLastRowCards() {
        const servicesGrids = document.querySelectorAll('.services-grid');

        servicesGrids.forEach(grid => {
            // Include all service cards except service-card-info (which spans full width)
            const cards = Array.from(grid.querySelectorAll('.service-card:not(.service-card-info)'));

            if (cards.length === 0) return;

            // Count columns by grouping items by their top position (same row)
            const firstRowTop = cards[0]?.getBoundingClientRect().top;
            let columnCount = 0;

            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                // Items in the same row will have very similar top values (within 5px tolerance)
                if (Math.abs(rect.top - firstRowTop) < 5) {
                    columnCount++;
                }
            });

            const totalCards = cards.length;

            // Handle special case: if we have exactly 2 cards, assume 3-column grid and stretch them
            // This covers cases like Remote Services section
            if (totalCards === 2) {
                const first = cards[0];
                const second = cards[1];

                if (first && second) {
                    // Clear any previous styles
                    first.style.gridColumn = '';
                    second.style.gridColumn = '';

                    // First card spans 1 column, second card spans 2 columns
                    first.style.gridColumn = 'span 1';
                    second.style.gridColumn = 'span 2';
                }
                return; // Exit early for 2-card grids
            }

            // For grids with more than 2 cards, check if we have 3 columns
            if (columnCount === 3) {
                const remainingCards = totalCards % columnCount;

                // Clear any previous inline stretching styles from last row items
                if (remainingCards > 0) {
                    for (let i = totalCards - remainingCards; i < totalCards; i++) {
                        if (cards[i]) {
                            cards[i].style.gridColumn = '';
                        }
                    }
                }

                // If last row has 2 cards, stretch them to fill 3 columns
                if (remainingCards === 2) {
                    const secondToLast = cards[totalCards - 2];
                    const last = cards[totalCards - 1];

                    if (secondToLast && last) {
                        // First card spans 1 column, second card spans 2 columns
                        secondToLast.style.gridColumn = 'span 1';
                        last.style.gridColumn = 'span 2';
                    }
                }
                // If last row has 1 card, stretch it to full width
                else if (remainingCards === 1) {
                    const last = cards[totalCards - 1];
                    if (last) {
                        last.style.gridColumn = 'span 3';
                    }
                }
            }
        });
    }

    // Run on page load and resize
    function initStretchLastRow() {
        // Wait for layout to settle
        setTimeout(stretchLastRowCards, 100);
        // Also run after a longer delay to catch any dynamic content
        setTimeout(stretchLastRowCards, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStretchLastRow);
    } else {
        initStretchLastRow();
    }

    // Recalculate on window resize (with debounce)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(stretchLastRowCards, 250);
    });

    // Also recalculate when images load (in case they affect layout)
    window.addEventListener('load', () => {
        setTimeout(stretchLastRowCards, 100);
    });

    // Export for external use if needed
    window.ServicesLayout = {
        refresh: stretchLastRowCards
    };

})();
