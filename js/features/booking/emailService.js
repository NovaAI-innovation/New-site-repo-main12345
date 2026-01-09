/**
 * Email Service Module
 * Handles EmailJS integration and configuration
 */

/**
 * EmailJS configuration
 */
export const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'tB3W_IO_tAM6wSXw-',
    SERVICE_ID: 'service_42we7vj',
    TEMPLATE_ID: 'template_kgkgtf8'
};

/**
 * Initialize EmailJS
 */
export function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
    } else {
        console.warn('EmailJS library not loaded');
    }
}

/**
 * Send email via EmailJS
 * @param {Object} emailParams - Email parameters
 * @returns {Promise<Object>} - EmailJS response
 */
export async function sendEmail(emailParams) {
    if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS library not loaded');
    }

    return await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        emailParams
    );
}
