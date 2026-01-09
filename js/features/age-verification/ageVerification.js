/**
 * Age Verification Module
 * Handles age verification modal display and user consent
 */

import { getItem, setItem } from '../../core/storage.js';

/**
 * Initialize age verification
 * Checks if user has already verified age and sets up event handlers
 */
export function initAgeVerification() {
    const ageModal = document.getElementById('age-modal');
    const ageConfirm = document.getElementById('age-confirm');
    const ageDecline = document.getElementById('age-decline');

    if (!ageModal || !ageConfirm || !ageDecline) {
        console.warn('Age verification elements not found');
        return;
    }

    // Check if user has already verified age
    const hasVerifiedAge = getItem('ageVerified');

    if (hasVerifiedAge === 'true') {
        ageModal.classList.add('hidden');
    } else {
        ageModal.classList.remove('hidden');
    }

    // Handle age confirmation
    ageConfirm.addEventListener('click', () => {
        setItem('ageVerified', 'true');
        ageModal.classList.add('hidden');
    });

    // Handle age decline
    ageDecline.addEventListener('click', () => {
        window.location.href = 'https://www.google.com';
    });
}
