/**
 * Booking Form Module
 * Handles booking form submission and EmailJS integration
 * - Form validation
 * - EmailJS integration
 * - Datetime input optimization
 * - Success/error handling
 */

(function() {
    'use strict';

    // ===========================
    // EmailJS Configuration
    // ===========================

    // Initialize EmailJS with your public key
    // IMPORTANT: Replace 'YOUR_PUBLIC_KEY' with your actual EmailJS public key
    // Get it from: https://dashboard.emailjs.com/admin/account
    const EMAILJS_PUBLIC_KEY = 'tB3W_IO_tAM6wSXw-';
    const EMAILJS_SERVICE_ID = 'service_42we7vj';
    const EMAILJS_TEMPLATE_ID = 'template_kgkgtf8';

    // Initialize EmailJS
    if (typeof emailjs !== 'undefined') {
        (function() {
            emailjs.init(EMAILJS_PUBLIC_KEY);
        })();
    }

    // ===========================
    // Booking Form Handler
    // ===========================

    const bookingForm = document.getElementById('booking-form');

    // Format datetime for display
    const formatDateTime = (datetime) => {
        const date = new Date(datetime);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (bookingForm) {
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
                const response = await emailjs.send(
                    EMAILJS_SERVICE_ID,
                    EMAILJS_TEMPLATE_ID,
                    emailParams
                );

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

    // ===========================
    // Datetime Input Optimization
    // ===========================

    // Set minimum date to today for datetime-local inputs
    const datetimeInput = document.getElementById('preferred_datetime');
    if (datetimeInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        datetimeInput.min = minDateTime;
    }

    // Export for external use if needed
    window.BookingForm = {
        getConfig: () => ({
            publicKey: EMAILJS_PUBLIC_KEY,
            serviceId: EMAILJS_SERVICE_ID,
            templateId: EMAILJS_TEMPLATE_ID
        })
    };

})();
