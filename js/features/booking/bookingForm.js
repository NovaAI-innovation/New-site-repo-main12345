/**
 * Booking Form Module
 * Handles booking form submission and validation
 */

import { initEmailJS, sendEmail } from './emailService.js';

/**
 * Format datetime for display
 * @param {string} datetime - ISO datetime string
 * @returns {string} - Formatted datetime string
 */
function formatDateTime(datetime) {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Initialize booking form
 */
export function initBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    
    if (!bookingForm) {
        return;
    }

    // Initialize EmailJS
    initEmailJS();

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Show loading state
        const submitButton = bookingForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;

        try {
            // Collect all form data
            const formData = new FormData(bookingForm);
            const bookingData = {};
            
            formData.forEach((value, key) => {
                bookingData[key] = value;
            });

            // Format the email parameters
            const emailParams = {
                to_email: 'casperigram@gmail.com',
                from_name: bookingData.name,
                from_email: bookingData.email,
                reply_to: bookingData.email,
                subject: `New Booking Request from ${bookingData.name}`,
                
                // Personal Information
                client_name: bookingData.name,
                client_email: bookingData.email,
                client_phone: bookingData.phone,
                client_pronouns: bookingData.pronouns,
                preferred_contact: bookingData.contact_method,
                
                // Booking Details
                desired_city: bookingData.city,
                date_length: bookingData.date_length.replace(/_/g, ' '),
                preferred_datetime: formatDateTime(bookingData.preferred_datetime),
                location_type: bookingData.location_preference.charAt(0).toUpperCase() + bookingData.location_preference.slice(1),
                additional_info: bookingData.additional_info || 'None provided',
                
                // Formatted message body
                message: `
═══════════════════════════════════════
         NEW BOOKING REQUEST
═══════════════════════════════════════

CLIENT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${bookingData.name}
Email: ${bookingData.email}
Phone: ${bookingData.phone}
Pronouns: ${bookingData.pronouns}
Preferred Contact: ${bookingData.contact_method}

BOOKING DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Desired City: ${bookingData.city}
Date Length: ${bookingData.date_length.replace(/_/g, ' ')}
Preferred Date/Time: ${formatDateTime(bookingData.preferred_datetime)}
Location Preference: ${bookingData.location_preference.charAt(0).toUpperCase() + bookingData.location_preference.slice(1)}

ADDITIONAL INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${bookingData.additional_info || 'None provided'}

═══════════════════════════════════════
Submitted: ${new Date().toLocaleString('en-US')}
═══════════════════════════════════════
                `
            };

            // Send email via EmailJS
            const response = await sendEmail(emailParams);

            if (response.status === 200) {
                alert('✅ Thank you for your booking request!\n\nYour information has been received. You will receive a response within 24 hours via your preferred contact method.');
                bookingForm.reset();
            }

        } catch (error) {
            console.error('EmailJS Error:', error);
            
            // User-friendly error messages
            let errorMessage = '❌ Booking Submission Failed\n\n';
            
            if (error.text && error.text.includes('Invalid')) {
                errorMessage += 'EmailJS configuration error. Please contact the site administrator.\n\n';
                errorMessage += 'Alternative: Email your booking to casperigram@gmail.com';
            } else if (!navigator.onLine) {
                errorMessage += 'No internet connection detected.\n\n';
                errorMessage += 'Please check your connection and try again.';
            } else {
                errorMessage += 'Network or service error.\n\n';
                errorMessage += 'Please try again, or email directly to:\ncasperigram@gmail.com';
            }
            
            alert(errorMessage);
        } finally {
            // Restore button state
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    });
}
