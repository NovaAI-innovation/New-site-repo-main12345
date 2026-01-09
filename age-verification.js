/**
 * Age Verification Module
 * 
 * A robust, isolated age verification system with:
 * - Configurable expiration times
 * - Timestamp-based verification
 * - Security measures to prevent bypassing
 * - Event system for extensibility
 * - Cross-page consistency
 */

(function() {
    'use strict';

    // ===========================
    // Configuration
    // ===========================
    const CONFIG = {
        // Storage key for age verification
        STORAGE_KEY: 'ageVerified',
        
        // Verification expiration time (in milliseconds)
        // Default: 30 days
        EXPIRATION_MS: 30 * 24 * 60 * 60 * 1000,
        
        // Minimum age required (in years)
        MIN_AGE: 18,
        
        // Exit URL when user declines
        EXIT_URL: 'https://www.google.com',
        
        // Storage type: 'localStorage' or 'sessionStorage'
        // localStorage persists across sessions, sessionStorage only for current session
        STORAGE_TYPE: 'localStorage',
        
        // Prevent interaction with page content until verified
        BLOCK_INTERACTION: true,
        
        // Enable console logging for debugging
        DEBUG: false
    };

    // ===========================
    // State Management
    // ===========================
    const state = {
        isVerified: false,
        modal: null,
        confirmButton: null,
        declineButton: null,
        initialized: false
    };

    // ===========================
    // Storage Utilities
    // ===========================
    const storage = {
        get: function(key) {
            try {
                const storageObj = CONFIG.STORAGE_TYPE === 'localStorage' 
                    ? localStorage 
                    : sessionStorage;
                const value = storageObj.getItem(key);
                return value ? JSON.parse(value) : null;
            } catch (error) {
                this.log('Error reading from storage:', error);
                return null;
            }
        },
        
        set: function(key, value) {
            try {
                const storageObj = CONFIG.STORAGE_TYPE === 'localStorage' 
                    ? localStorage 
                    : sessionStorage;
                storageObj.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                this.log('Error writing to storage:', error);
                return false;
            }
        },
        
        remove: function(key) {
            try {
                const storageObj = CONFIG.STORAGE_TYPE === 'localStorage' 
                    ? localStorage 
                    : sessionStorage;
                storageObj.removeItem(key);
                return true;
            } catch (error) {
                this.log('Error removing from storage:', error);
                return false;
            }
        },
        
        log: function(...args) {
            if (CONFIG.DEBUG) {
                console.log('[Age Verification]', ...args);
            }
        }
    };

    // ===========================
    // Verification Logic
    // ===========================
    const verification = {
        /**
         * Check if user has verified their age
         * @returns {boolean} True if verified and not expired
         */
        isVerified: function() {
            // Check for new format (JSON object with timestamp)
            const verificationData = storage.get(CONFIG.STORAGE_KEY);
            
            if (verificationData) {
                // New format: check expiration
                if (verificationData.timestamp && typeof verificationData.timestamp === 'number') {
                    const now = Date.now();
                    const verificationTime = verificationData.timestamp;
                    const expirationTime = verificationTime + CONFIG.EXPIRATION_MS;
                    
                    if (now > expirationTime) {
                        storage.log('Verification expired');
                        storage.remove(CONFIG.STORAGE_KEY);
                        return false;
                    }
                    
                    storage.log('Verification valid, expires at:', new Date(expirationTime));
                    return true;
                } else {
                    // Invalid new format structure
                    storage.log('Invalid verification data structure');
                    storage.remove(CONFIG.STORAGE_KEY);
                    return false;
                }
            }
            
            // Backward compatibility: check for old format (string 'true')
            try {
                const storageObj = CONFIG.STORAGE_TYPE === 'localStorage' 
                    ? localStorage 
                    : sessionStorage;
                const oldValue = storageObj.getItem(CONFIG.STORAGE_KEY);
                
                if (oldValue === 'true') {
                    storage.log('Found old format verification, migrating to new format');
                    // Migrate to new format
                    this.setVerified();
                    return true;
                }
            } catch (error) {
                storage.log('Error checking old format:', error);
            }
            
            storage.log('No verification data found');
            return false;
        },
        
        /**
         * Mark user as age verified
         * @returns {boolean} True if successfully saved
         */
        setVerified: function() {
            const verificationData = {
                timestamp: Date.now(),
                version: '1.0' // For future compatibility
            };
            
            const success = storage.set(CONFIG.STORAGE_KEY, verificationData);
            if (success) {
                state.isVerified = true;
                storage.log('Age verification saved');
                this.dispatchEvent('verified');
            }
            return success;
        },
        
        /**
         * Clear verification (for testing or logout scenarios)
         */
        clear: function() {
            storage.remove(CONFIG.STORAGE_KEY);
            state.isVerified = false;
            storage.log('Verification cleared');
            this.dispatchEvent('cleared');
        },
        
        /**
         * Dispatch custom events for extensibility
         */
        dispatchEvent: function(eventName, detail = {}) {
            const event = new CustomEvent('ageVerification:' + eventName, {
                detail: {
                    ...detail,
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(event);
        }
    };

    // ===========================
    // UI Management
    // ===========================
    const ui = {
        /**
         * Initialize the age verification modal
         */
        init: function() {
            state.modal = document.getElementById('age-modal');
            state.confirmButton = document.getElementById('age-confirm');
            state.declineButton = document.getElementById('age-decline');
            
            if (!state.modal) {
                storage.log('Age modal element not found');
                return false;
            }
            
            if (!state.confirmButton || !state.declineButton) {
                storage.log('Age modal buttons not found');
                return false;
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Block page interaction if needed
            if (CONFIG.BLOCK_INTERACTION) {
                this.blockPageInteraction();
            }
            
            return true;
        },
        
        /**
         * Set up event listeners for the modal
         */
        setupEventListeners: function() {
            // Confirm button
            state.confirmButton.addEventListener('click', () => {
                if (verification.setVerified()) {
                    this.hideModal();
                    this.unblockPageInteraction();
                    verification.dispatchEvent('confirmed');
                } else {
                    alert('Error saving verification. Please try again.');
                }
            });
            
            // Decline button
            state.declineButton.addEventListener('click', () => {
                verification.dispatchEvent('declined');
                window.location.href = CONFIG.EXIT_URL;
            });
            
            // Prevent closing modal by clicking outside (security measure)
            state.modal.addEventListener('click', (e) => {
                if (e.target === state.modal) {
                    // Optionally prevent closing by clicking outside
                    // For now, we'll allow it but log it
                    storage.log('Modal clicked outside');
                }
            });
            
            // Prevent keyboard shortcuts that might bypass verification
            document.addEventListener('keydown', (e) => {
                if (!state.isVerified && state.modal && !state.modal.classList.contains('hidden')) {
                    // Prevent F12 (dev tools), Ctrl+Shift+I, etc.
                    if (e.key === 'F12' || 
                        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
                        e.preventDefault();
                        return false;
                    }
                }
            }, true);
        },
        
        /**
         * Show the age verification modal
         */
        showModal: function() {
            if (state.modal) {
                state.modal.classList.remove('hidden');
                // Focus on confirm button for accessibility
                if (state.confirmButton) {
                    state.confirmButton.focus();
                }
            }
        },
        
        /**
         * Hide the age verification modal
         */
        hideModal: function() {
            if (state.modal) {
                state.modal.classList.add('hidden');
            }
        },
        
        /**
         * Block interaction with page content until verified
         */
        blockPageInteraction: function() {
            if (!state.isVerified) {
                // Add class to body to prevent interaction
                document.body.style.overflow = 'hidden';
                document.body.style.pointerEvents = 'none';
                
                // Allow interaction with modal only
                if (state.modal) {
                    state.modal.style.pointerEvents = 'auto';
                }
            }
        },
        
        /**
         * Unblock page interaction after verification
         */
        unblockPageInteraction: function() {
            document.body.style.overflow = '';
            document.body.style.pointerEvents = '';
        }
    };

    // ===========================
    // Public API
    // ===========================
    const AgeVerification = {
        /**
         * Initialize age verification system
         * @param {Object} options - Configuration options to override defaults
         */
        init: function(options = {}) {
            // Merge custom options with default config
            Object.assign(CONFIG, options);
            
            // Initialize UI
            if (!ui.init()) {
                storage.log('Failed to initialize age verification UI');
                return false;
            }
            
            // Check if already verified
            state.isVerified = verification.isVerified();
            
            if (state.isVerified) {
                ui.hideModal();
                ui.unblockPageInteraction();
                storage.log('User already verified');
            } else {
                ui.showModal();
                if (CONFIG.BLOCK_INTERACTION) {
                    ui.blockPageInteraction();
                }
                storage.log('Showing age verification modal');
            }
            
            state.initialized = true;
            verification.dispatchEvent('initialized', { isVerified: state.isVerified });
            
            return true;
        },
        
        /**
         * Check if user is currently verified
         * @returns {boolean}
         */
        isVerified: function() {
            return verification.isVerified();
        },
        
        /**
         * Manually verify (for programmatic use)
         */
        verify: function() {
            if (verification.setVerified()) {
                ui.hideModal();
                ui.unblockPageInteraction();
                return true;
            }
            return false;
        },
        
        /**
         * Clear verification (for testing or logout)
         */
        clear: function() {
            verification.clear();
            ui.showModal();
            if (CONFIG.BLOCK_INTERACTION) {
                ui.blockPageInteraction();
            }
        },
        
        /**
         * Get configuration
         * @returns {Object} Current configuration
         */
        getConfig: function() {
            return { ...CONFIG };
        },
        
        /**
         * Update configuration
         * @param {Object} options - Configuration options to update
         */
        updateConfig: function(options) {
            Object.assign(CONFIG, options);
        }
    };

    // ===========================
    // Auto-initialize on DOM ready
    // ===========================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            AgeVerification.init();
        });
    } else {
        // DOM already loaded
        AgeVerification.init();
    }

    // ===========================
    // Export to global scope
    // ===========================
    window.AgeVerification = AgeVerification;

    // ===========================
    // Debug mode helper
    // ===========================
    if (CONFIG.DEBUG) {
        console.log('%c[Age Verification]', 'color: #d4af37; font-weight: bold;', 'Module loaded');
    }
})();
