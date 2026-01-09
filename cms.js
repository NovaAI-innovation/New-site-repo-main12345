/**
 * Enhanced CMS JavaScript
 * Features: Drag & Drop Upload, Image Reordering, Bulk Operations, Search & Sort
 */

// =====================
// FETCH HELPER WITH CORS SUPPORT AND JWT AUTH
// =====================

/**
 * Get stored JWT token from sessionStorage
 * @returns {string|null} - JWT token or null
 */
function getAuthToken() {
    return sessionStorage.getItem('cms_jwt_token');
}

/**
 * Store JWT token in sessionStorage
 * @param {string} token - JWT token to store
 */
function setAuthToken(token) {
    sessionStorage.setItem('cms_jwt_token', token);
}

/**
 * Remove JWT token from sessionStorage
 */
function clearAuthToken() {
    sessionStorage.removeItem('cms_jwt_token');
}

/**
 * Helper function to make fetch requests with proper CORS configuration and JWT authentication
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} - The fetch response
 */
async function fetchWithCORS(url, options = {}) {
    // Ensure CORS mode is explicitly set (defaults to 'cors' but being explicit)
    // Note: credentials is set to 'omit' to match backend CORS config (allow_credentials=False)
    // JWT tokens are sent via Authorization header, not cookies
    const fetchOptions = {
        mode: 'cors',  // Explicitly set CORS mode
        credentials: 'omit',  // Don't send credentials (matches backend allow_credentials=False)
        ...options,
    };
    
    // Log request details for debugging (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.debug('Making request:', {
            url,
            method: fetchOptions.method || 'GET',
            mode: fetchOptions.mode,
            credentials: fetchOptions.credentials,
            hasAuth: !!getAuthToken()
        });
    }

    // Add JWT token to Authorization header if available
    const token = getAuthToken();
    if (token && !fetchOptions.headers) {
        fetchOptions.headers = {};
    }
    if (token && fetchOptions.headers) {
        // Ensure headers is an object
        if (fetchOptions.headers instanceof Headers) {
            fetchOptions.headers.set('Authorization', `Bearer ${token}`);
        } else {
            fetchOptions.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    // Don't override Content-Type if body is FormData (browser sets it automatically)
    if (options.body instanceof FormData) {
        // Remove Content-Type from headers if present - browser will set it with boundary
        if (fetchOptions.headers) {
            if (fetchOptions.headers instanceof Headers) {
                fetchOptions.headers.delete('Content-Type');
            } else if (typeof fetchOptions.headers === 'object') {
                // Convert to Headers object to safely delete
                const headers = new Headers(fetchOptions.headers);
                headers.delete('Content-Type');
                fetchOptions.headers = headers;
            }
        }
    } else if (!fetchOptions.headers || (!(fetchOptions.headers instanceof Headers) && !fetchOptions.headers['Content-Type'])) {
        // Set Content-Type for JSON requests if not already set
        if (!fetchOptions.headers) {
            fetchOptions.headers = {};
        }
        if (!(fetchOptions.headers instanceof Headers)) {
            fetchOptions.headers['Content-Type'] = 'application/json';
        } else {
            fetchOptions.headers.set('Content-Type', 'application/json');
        }
    }
    
    try {
        // Use fetchWithRetry if available (from api-config.js)
        const fetchFn = typeof fetchWithRetry !== 'undefined' ? fetchWithRetry : fetch;
        const response = await fetchFn(url, fetchOptions);
        
        // Handle 401 Unauthorized - token expired or invalid
        // Skip token refresh for authentication endpoints (login, refresh)
        const isAuthEndpoint = url.includes('/cms/login') || url.includes('/cms/refresh');
        
        if (response.status === 401 && !isAuthEndpoint) {
            // Only attempt token refresh for non-auth endpoints
            console.warn('Authentication failed, attempting token refresh...');
            try {
                const refreshResponse = await fetchFn(API_ENDPOINTS.CMS_REFRESH, {
                    method: 'POST',
                    credentials: 'omit',
                });
                
                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    if (refreshData.access_token) {
                        setAuthToken(refreshData.access_token);
                        cmsState.token = refreshData.access_token;
                        
                        // Retry original request with new token
                        if (fetchOptions.headers instanceof Headers) {
                            fetchOptions.headers.set('Authorization', `Bearer ${refreshData.access_token}`);
                        } else {
                            fetchOptions.headers['Authorization'] = `Bearer ${refreshData.access_token}`;
                        }
                        return await fetchFn(url, fetchOptions);
                    }
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
            }
            
            // Refresh failed, show auth screen
            showAuth();
            throw new Error('Authentication expired. Please login again.');
        }
        
        // For auth endpoints, return the response as-is (even if 401)
        // This allows the login handler to process the error appropriately
        
        return response;
    } catch (error) {
        // Re-throw with more context
        const errorDetails = {
            url,
            method: options.method || 'GET',
            error: error.message || error.toString(),
            name: error.name,
            stack: error.stack
        };
        console.error('Fetch error:', errorDetails);
        
        // Enhance error message if it's a network error
        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
            error.message = `Network error connecting to ${url}. ${error.message || 'Please check your connection.'}`;
        }
        
        throw error;
    }
}

// =====================
// STATE MANAGEMENT
// =====================

const cmsState = {
    authenticated: false,
    token: null,
    tokenExpiry: null,
    selectedImages: new Set(),
    images: [],
    filesToUpload: [],
    fileCaptions: {},  // Map of file index to caption string
    draggedElement: null,
    searchQuery: '',
    sortOrder: 'manual',  // Default to manual order to preserve backend ordering
    scrollDirection: 0,   // Auto-scroll direction: -1 (up), 0 (none), 1 (down)
    scrollSpeed: 10       // Auto-scroll speed in pixels per tick
};

// =====================
// DOM ELEMENTS
// =====================

const elements = {
    // Auth
    authSection: document.getElementById('auth-section'),
    cmsDashboard: document.getElementById('cms-dashboard'),
    authForm: document.getElementById('auth-form'),
    authError: document.getElementById('auth-error'),
    passwordInput: document.getElementById('password'),
    logoutBtn: document.getElementById('logout-btn'),

    // Stats
    totalImages: document.getElementById('total-images'),
    totalStorage: document.getElementById('total-storage'),
    selectedCount: document.getElementById('selected-count'),

    // Upload
    dropZone: document.getElementById('drop-zone'),
    imageFilesInput: document.getElementById('image-files'),
    browseBtn: document.getElementById('browse-btn'),
    filePreviewContainer: document.getElementById('file-preview-container'),
    filePreviewGrid: document.getElementById('file-preview-grid'),
    fileCount: document.getElementById('file-count'),
    uploadCount: document.getElementById('upload-count'),
    clearFilesBtn: document.getElementById('clear-files-btn'),
    uploadBtn: document.getElementById('upload-btn'),
    uploadMessage: document.getElementById('upload-message'),

    // Gallery
    galleryGrid: document.getElementById('gallery-grid'),
    galleryMessage: document.getElementById('gallery-message'),
    galleryCountBadge: document.getElementById('gallery-count-badge'),
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    refreshBtn: document.getElementById('refresh-btn'),
    emptyState: document.getElementById('empty-state'),

    // Bulk Operations
    bulkToolbar: document.getElementById('bulk-toolbar'),
    bulkCount: document.getElementById('bulk-count'),
    selectAllBtn: document.getElementById('select-all-btn'),
    deselectAllBtn: document.getElementById('deselect-all-btn'),
    deleteSelectedBtn: document.getElementById('delete-selected-btn')
};

// =====================
// AUTHENTICATION
// =====================

function checkAuth() {
    const savedToken = getAuthToken();
    if (savedToken) {
        cmsState.token = savedToken;
        // Try to verify token by making a test request
        // If it fails, we'll show auth screen
        verifyTokenAndLoad();
    }
}

async function verifyTokenAndLoad() {
    try {
        // Try to refresh token or verify it's still valid
        const response = await fetchWithCORS(API_ENDPOINTS.CMS_REFRESH, {
            method: 'POST',
        });

        if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
                setAuthToken(data.access_token);
                cmsState.token = data.access_token;
                cmsState.authenticated = true;
                showDashboard();
                loadGalleryImages();
                return;
            }
        }
    } catch (error) {
        console.error('Token verification failed:', error);
    }

    // Token invalid or expired, show auth screen
    showAuth();
}

function showAuth() {
    elements.authSection.classList.remove('hidden');
    elements.cmsDashboard.classList.add('hidden');
    cmsState.authenticated = false;
    cmsState.token = null;
    clearAuthToken();
}

function showDashboard() {
    elements.authSection.classList.add('hidden');
    elements.cmsDashboard.classList.remove('hidden');
    
    // Initialize sort dropdown to match current sort order
    if (elements.sortSelect) {
        elements.sortSelect.value = cmsState.sortOrder;
    }
}

elements.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = elements.passwordInput.value.trim();

    if (!password) {
        showError(elements.authError, 'Please enter a password');
        return;
    }

    // Show loading state
    const submitButton = elements.authForm.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';
    }
    hideError(elements.authError);

    try {
        // First, verify API is reachable with a health check
        try {
            const healthController = new AbortController();
            const healthTimeout = setTimeout(() => healthController.abort(), 5000);
            
            const healthCheck = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                signal: healthController.signal
            });
            
            clearTimeout(healthTimeout);
            
            if (!healthCheck.ok) {
                throw new Error(`API health check failed with status ${healthCheck.status}`);
            }
        } catch (healthError) {
            console.error('API health check failed:', healthError);
            const errorMsg = healthError.name === 'AbortError' 
                ? `Connection timeout. The API server at ${API_BASE_URL} is not responding.`
                : `Cannot connect to API server at ${API_BASE_URL}. Please verify the server is running and accessible.`;
            showError(elements.authError, errorMsg);
            return;
        }

        // Call login endpoint to get JWT token
        const response = await fetchWithCORS(API_ENDPOINTS.CMS_LOGIN, {
            method: 'POST',
            body: JSON.stringify({ password: password })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
                // Store JWT token
                setAuthToken(data.access_token);
                cmsState.token = data.access_token;
                cmsState.authenticated = true;
                
                // Calculate token expiry (if provided)
                if (data.expires_in) {
                    cmsState.tokenExpiry = Date.now() + (data.expires_in * 1000);
                }
                
                showDashboard();
                loadGalleryImages();
                elements.passwordInput.value = '';
                hideError(elements.authError);
            } else {
                showError(elements.authError, 'Invalid response from server');
            }
        } else {
            // Handle error response
            let errorMessage = 'Invalid password';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail?.message || errorData.detail?.error || errorData.error || 'Invalid password';
            } catch (jsonError) {
                // Response might not be JSON, use status text
                errorMessage = response.statusText || `Server returned ${response.status}`;
            }
            showError(elements.authError, errorMessage);
        }
    } catch (error) {
        console.error('Authentication error:', error);
        
        // Provide specific error messages based on error type
        let errorMessage = 'Failed to connect to server';
        
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
            errorMessage = 'Connection timeout. Please check your internet connection and try again.';
        } else if (error.message?.includes('Failed to fetch') || error.message?.includes('Network error')) {
            errorMessage = `Cannot reach server at ${API_BASE_URL}. Please check:\n` +
                         `1. Your internet connection\n` +
                         `2. The API server is running\n` +
                         `3. CORS is properly configured`;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(elements.authError, errorMessage);
    } finally {
        const submitButton = elements.authForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    }
});

elements.logoutBtn.addEventListener('click', () => {
    showAuth();
    cmsState.selectedImages.clear();
    cmsState.images = [];
});

// =====================
// DRAG & DROP UPLOAD
// =====================

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, () => {
        elements.dropZone.classList.add('drag-over');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, () => {
        elements.dropZone.classList.remove('drag-over');
    }, false);
});

// Handle dropped files
elements.dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
});

// Click to browse
elements.dropZone.addEventListener('click', () => {
    elements.imageFilesInput.click();
});

elements.browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.imageFilesInput.click();
});

elements.imageFilesInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            console.warn(`Skipping non-image file: ${file.name}`);
            return false;
        }
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            console.warn(`File too large: ${file.name}`);
            return false;
        }
        return true;
    });

    cmsState.filesToUpload = [...cmsState.filesToUpload, ...validFiles];
    displayFilePreview();
}

function displayFilePreview() {
    if (cmsState.filesToUpload.length === 0) {
        elements.filePreviewContainer.style.display = 'none';
        // Clear captions when no files
        cmsState.fileCaptions = {};
        return;
    }

    elements.filePreviewContainer.style.display = 'block';
    elements.fileCount.textContent = cmsState.filesToUpload.length;
    elements.uploadCount.textContent = cmsState.filesToUpload.length;
    elements.filePreviewGrid.innerHTML = '';

    cmsState.filesToUpload.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'card file-preview-item';

        // Image preview
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);

        // File size overlay
        const overlay = document.createElement('div');
        overlay.className = 'file-preview-overlay';
        overlay.textContent = formatFileSize(file.size);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeFile(index);
        };

        // Caption input wrapper
        const captionWrapper = document.createElement('div');
        captionWrapper.className = 'file-preview-caption-wrapper';

        // Caption input (textarea for multiline)
        const captionInput = document.createElement('textarea');
        captionInput.className = 'file-preview-caption-input';
        captionInput.id = `caption-input-${index}`;
        captionInput.placeholder = 'Add caption for this image...';
        captionInput.value = cmsState.fileCaptions[index] || '';
        captionInput.dataset.fileIndex = index;
        captionInput.rows = 3;
        
        // Store caption when changed
        captionInput.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.fileIndex);
            const caption = e.target.value.trim();
            if (caption) {
                cmsState.fileCaptions[idx] = caption;
            } else {
                delete cmsState.fileCaptions[idx];
            }
        });

        // Emoji picker wrapper
        const emojiWrapper = document.createElement('div');
        emojiWrapper.className = 'emoji-picker-wrapper';

        // Emoji picker button
        const emojiButton = document.createElement('button');
        emojiButton.type = 'button';
        emojiButton.className = 'emoji-picker-btn';
        emojiButton.id = `emoji-btn-${index}`;
        emojiButton.title = 'Add emoji';
        emojiButton.textContent = '😀';

        // Emoji picker div
        const emojiPicker = document.createElement('div');
        emojiPicker.className = 'emoji-picker';
        emojiPicker.id = `emoji-picker-${index}`;

        // Build emoji picker HTML
        let pickerHTML = '';
        for (const [category, emojis] of Object.entries(EMOJI_CATEGORIES)) {
            pickerHTML += `
                <div class="emoji-category">
                    <div class="emoji-category-title">${category}</div>
                    <div class="emoji-grid">
                        ${emojis.map(emoji => `<button type="button" class="emoji-item" data-emoji="${emoji}">${emoji}</button>`).join('')}
                    </div>
                </div>
            `;
        }
        emojiPicker.innerHTML = pickerHTML;

        // Toggle picker on button click with smart positioning
        emojiButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Close all other pickers first
            document.querySelectorAll('.emoji-picker.active').forEach(p => {
                if (p !== emojiPicker) p.classList.remove('active');
            });
            
            const isActive = emojiPicker.classList.contains('active');
            emojiPicker.classList.toggle('active');
            
            if (!isActive) {
                // Calculate if popup should appear above or below button
                const buttonRect = emojiButton.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const pickerHeight = 350;
                const spaceAbove = buttonRect.top;
                const spaceBelow = viewportHeight - buttonRect.bottom;
                
                emojiWrapper.classList.remove('picker-below');
                
                if (spaceAbove < pickerHeight + 20 && spaceBelow > pickerHeight + 20) {
                    emojiWrapper.classList.add('picker-below');
                }
            }
        });

        // Insert emoji on click
        emojiPicker.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-item')) {
                const emoji = e.target.dataset.emoji;
                const cursorPos = captionInput.selectionStart || captionInput.value.length;
                const textBefore = captionInput.value.substring(0, cursorPos);
                const textAfter = captionInput.value.substring(cursorPos);
                captionInput.value = textBefore + emoji + textAfter;
                
                // Update state
                const idx = parseInt(captionInput.dataset.fileIndex);
                const caption = captionInput.value.trim();
                if (caption) {
                    cmsState.fileCaptions[idx] = caption;
                } else {
                    delete cmsState.fileCaptions[idx];
                }
                
                // Set cursor position after inserted emoji
                const newPos = cursorPos + emoji.length;
                captionInput.setSelectionRange(newPos, newPos);
                captionInput.focus();
                
                // Close picker
                emojiPicker.classList.remove('active');
            }
        });

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!emojiPicker.contains(e.target) && e.target !== emojiButton) {
                emojiPicker.classList.remove('active');
            }
        });

        emojiWrapper.appendChild(emojiButton);
        emojiWrapper.appendChild(emojiPicker);

        captionWrapper.appendChild(captionInput);
        captionWrapper.appendChild(emojiWrapper);
        
        fileItem.appendChild(img);
        fileItem.appendChild(overlay);
        fileItem.appendChild(removeBtn);
        fileItem.appendChild(captionWrapper);
        elements.filePreviewGrid.appendChild(fileItem);
    });
}

function removeFile(index) {
    cmsState.filesToUpload.splice(index, 1);
    // Rebuild captions map with updated indices
    const newCaptions = {};
    Object.keys(cmsState.fileCaptions).forEach(key => {
        const oldIdx = parseInt(key);
        if (oldIdx < index) {
            // Before removed item, keep same index
            newCaptions[oldIdx] = cmsState.fileCaptions[oldIdx];
        } else if (oldIdx > index) {
            // After removed item, shift index down by 1
            newCaptions[oldIdx - 1] = cmsState.fileCaptions[oldIdx];
        }
        // oldIdx === index is skipped (the removed item)
    });
    cmsState.fileCaptions = newCaptions;
    displayFilePreview();
}

elements.clearFilesBtn.addEventListener('click', () => {
    cmsState.filesToUpload = [];
    cmsState.fileCaptions = {};
    displayFilePreview();
    elements.imageFilesInput.value = '';
});

// Upload files in batches to avoid browser/server limits
elements.uploadBtn.addEventListener('click', async () => {
    if (cmsState.filesToUpload.length === 0) {
        showError(elements.uploadMessage, 'No files selected');
        return;
    }

    const fileCount = cmsState.filesToUpload.length;
    const BATCH_SIZE = 5; // Upload 5 images at a time to avoid browser limits

    elements.uploadBtn.disabled = true;
    elements.uploadBtn.innerHTML = '<span>Uploading...</span>';

    try {
        let totalUploaded = 0;
        let totalFailed = 0;
        const allErrors = [];

        // Split files into batches
        for (let i = 0; i < cmsState.filesToUpload.length; i += BATCH_SIZE) {
            const batch = cmsState.filesToUpload.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(cmsState.filesToUpload.length / BATCH_SIZE);

            // Update progress message
            elements.uploadBtn.innerHTML = `<span>Uploading batch ${batchNumber}/${totalBatches}...</span>`;

            // Build FormData for this batch
            const formData = new FormData();
            batch.forEach((file, batchIndex) => {
                const originalIndex = i + batchIndex;
                formData.append('files', file);

                // Add caption for this file if it exists
                const caption = cmsState.fileCaptions[originalIndex];
                if (caption && caption.trim()) {
                    formData.append('captions', caption.trim());
                } else {
                    formData.append('captions', '');
                }
            });

            try {
                const response = await fetchWithCORS(API_ENDPOINTS.CMS_GALLERY_IMAGES, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    totalUploaded += result.length || batch.length;
                    console.log(`Batch ${batchNumber}/${totalBatches} uploaded successfully`);
                } else {
                    const error = await response.json();
                    totalFailed += batch.length;
                    allErrors.push(`Batch ${batchNumber}: ${error.detail || 'Upload failed'}`);
                    console.error(`Batch ${batchNumber} failed:`, error);
                }
            } catch (error) {
                totalFailed += batch.length;
                allErrors.push(`Batch ${batchNumber}: ${error.message}`);
                console.error(`Batch ${batchNumber} error:`, error);
            }

            // Small delay between batches to avoid overwhelming the server
            if (i + BATCH_SIZE < cmsState.filesToUpload.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Clear gallery cache so new images appear immediately
        if (typeof window.clearGalleryCache === 'function') {
            window.clearGalleryCache();
            console.log('Gallery cache cleared after upload');
        }

        // Show results
        if (totalUploaded > 0 && totalFailed === 0) {
            showSuccess(elements.uploadMessage, `Successfully uploaded all ${totalUploaded} image(s)!`);
        } else if (totalUploaded > 0 && totalFailed > 0) {
            showError(elements.uploadMessage, `Uploaded ${totalUploaded} image(s), ${totalFailed} failed. Check console for details.`);
            console.error('Upload errors:', allErrors);
        } else {
            showError(elements.uploadMessage, `All uploads failed. ${allErrors.join('; ')}`);
        }

        // Clear files and reload gallery
        cmsState.filesToUpload = [];
        cmsState.fileCaptions = {};
        elements.imageFilesInput.value = '';
        displayFilePreview();
        loadGalleryImages();

    } catch (error) {
        console.error('Upload error:', error);
        showError(elements.uploadMessage, 'Failed to upload images');
    } finally {
        elements.uploadBtn.disabled = false;
        // Restore button HTML
        const currentFileCount = cmsState.filesToUpload.length;
        elements.uploadBtn.innerHTML = '<span class="btn-icon">⬆️</span><span>Upload <span id="upload-count">' + currentFileCount + '</span> Images</span>';
        elements.uploadCount = document.getElementById('upload-count');
    }
});

// =====================
// GALLERY MANAGEMENT
// =====================

async function loadGalleryImages() {
    elements.galleryGrid.innerHTML = '<div class="gallery-loading"><div class="loading-spinner"></div><p>Loading gallery images...</p></div>';

    try {
        const response = await fetchWithCORS(API_ENDPOINTS.CMS_GALLERY_IMAGES, {
            method: 'GET'
        });

        if (response.ok) {
            cmsState.images = await response.json();
            
            // Sync sort dropdown with current sort order
            if (elements.sortSelect) {
                elements.sortSelect.value = cmsState.sortOrder;
            }
            
            updateStatistics();
            renderGallery();
        } else {
            throw new Error('Failed to load images');
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        elements.galleryGrid.innerHTML = '<div class="gallery-loading"><p style="color: #ff6b6b;">Failed to load images</p></div>';
    }
}

function renderGallery() {
    let filteredImages = [...cmsState.images];

    // Apply search filter
    if (cmsState.searchQuery) {
        const query = cmsState.searchQuery.toLowerCase();
        filteredImages = filteredImages.filter(img =>
            (img.caption && img.caption.toLowerCase().includes(query)) ||
            (img.cloudinary_url && img.cloudinary_url.toLowerCase().includes(query))
        );
    }

    // Apply sort (only if not 'manual' - manual preserves backend order)
    if (cmsState.sortOrder !== 'manual') {
        filteredImages.sort((a, b) => {
            switch (cmsState.sortOrder) {
                case 'newest':
                    return new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0);
                case 'oldest':
                    return new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0);
                case 'name-az':
                    return (a.caption || '').localeCompare(b.caption || '');
                case 'name-za':
                    return (b.caption || '').localeCompare(a.caption || '');
                default:
                    return 0;
            }
        });
    }

    elements.galleryCountBadge.textContent = filteredImages.length;

    if (filteredImages.length === 0) {
        elements.galleryGrid.style.display = 'none';
        elements.emptyState.style.display = 'block';
        return;
    }

    elements.galleryGrid.style.display = 'grid';
    elements.emptyState.style.display = 'none';
    elements.galleryGrid.innerHTML = '';

    filteredImages.forEach((image, index) => {
        const card = createImageCard(image, index);
        elements.galleryGrid.appendChild(card);
    });
}

function createImageCard(image, index) {
    const card = document.createElement('div');
    card.className = 'card cms-image-card';
    card.dataset.imageId = image.id;
    card.draggable = true;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'image-card-checkbox';
    checkbox.checked = cmsState.selectedImages.has(image.id);
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleImageSelection(image.id);
    });

    // Drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'image-card-drag-handle';
    dragHandle.innerHTML = '⋮⋮';

    // Preview
    const preview = document.createElement('div');
    preview.className = 'image-card-preview';
    const img = document.createElement('img');
    img.src = image.cloudinary_url;
    img.alt = image.caption || 'Gallery image';
    img.loading = 'lazy';
    preview.appendChild(img);

    // Info section
    const info = document.createElement('div');
    info.className = 'image-card-info';

    const name = document.createElement('div');
    name.className = 'image-card-name';
    name.textContent = image.caption || 'Untitled';

    const actions = document.createElement('div');
    actions.className = 'image-card-actions';

    const editCaptionBtn = document.createElement('button');
    editCaptionBtn.className = 'btn btn-secondary btn-small';
    editCaptionBtn.innerHTML = '<span>✏️</span> Edit Caption';
    editCaptionBtn.onclick = (e) => {
        e.stopPropagation();
        openCaptionEditor(image.id, image.caption, image.cloudinary_url);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-small';
    deleteBtn.innerHTML = '<span>🗑️</span> Delete';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteImage(image.id);
    };

    actions.appendChild(editCaptionBtn);
    actions.appendChild(deleteBtn);
    info.appendChild(name);
    info.appendChild(actions);

    card.appendChild(checkbox);
    card.appendChild(dragHandle);
    card.appendChild(preview);
    card.appendChild(info);

    // Drag events for reordering
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);

    return card;
}

// =====================
// DRAG TO REORDER (OPTIMIZED FOR GRID LAYOUT)
// =====================

let dragOverElement = null;
let autoScrollInterval = null;
const AUTO_SCROLL_ZONE = 100; // Pixels from edge to trigger scroll
const AUTO_SCROLL_SPEED = 15; // Pixels per scroll tick (increased by 1.5x)

function handleDragStart(e) {
    cmsState.draggedElement = this;
    this.classList.add('dragging');
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    
    // Start auto-scroll monitoring
    startAutoScroll();
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    this.style.opacity = '1';

    // Stop auto-scrolling
    stopAutoScroll();

    // Remove all drop indicators
    document.querySelectorAll('.cms-image-card').forEach(card => {
        card.classList.remove('drag-over-before', 'drag-over-after');
    });

    cmsState.draggedElement = null;
    dragOverElement = null;

    // Save the new order to the backend
    saveImageOrder();
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const draggingElement = document.querySelector('.dragging');
    if (!draggingElement || this === draggingElement) return false;

    // Remove previous indicators
    document.querySelectorAll('.cms-image-card').forEach(card => {
        card.classList.remove('drag-over-before', 'drag-over-after');
    });

    // Get the bounding box of the current element
    const rect = this.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;

    // Determine if we should insert before or after based on cursor position
    const shouldInsertBefore = isBeforeElement(e.clientX, e.clientY, rect);

    if (shouldInsertBefore) {
        this.classList.add('drag-over-before');
        elements.galleryGrid.insertBefore(draggingElement, this);
    } else {
        this.classList.add('drag-over-after');
        elements.galleryGrid.insertBefore(draggingElement, this.nextSibling);
    }

    dragOverElement = this;
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    // Remove all drop indicators
    document.querySelectorAll('.cms-image-card').forEach(card => {
        card.classList.remove('drag-over-before', 'drag-over-after');
    });

    return false;
}

/**
 * Save the current visual order of images to the backend.
 * Collects image IDs in their current DOM order and sends to API.
 */
async function saveImageOrder() {
    try {
        // Get all image cards in their current DOM order
        const cards = Array.from(elements.galleryGrid.querySelectorAll('.cms-image-card'));

        // Extract image IDs in display order
        const orderedIds = cards.map(card => parseInt(card.dataset.imageId));

        // Validate we have IDs to save
        if (orderedIds.length === 0) {
            console.warn('No images to reorder');
            return;
        }

        console.log('Saving new image order:', orderedIds);
        console.log('API Endpoint:', API_ENDPOINTS.CMS_REORDER_IMAGES);
        console.log('Password present:', !!cmsState.password);

        // Call reorder API endpoint
        const response = await fetchWithCORS(API_ENDPOINTS.CMS_REORDER_IMAGES, {
            method: 'PUT',
            body: JSON.stringify({
                image_ids: orderedIds
            })
        });

        console.log('Response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('Image order saved successfully:', result);
            console.log('Ordered IDs sent to backend:', orderedIds);

            // IMPORTANT: Invalidate cache FIRST (sets timestamp BEFORE clearing)
            // This ensures cache writes are blocked even if page loads quickly
            if (typeof window.invalidateGalleryCache === 'function') {
                window.invalidateGalleryCache();
                console.log('Gallery cache version invalidated after reordering');
                console.log('Cache writes blocked for 60 seconds to prevent stale data');
            }
            
            // Also clear existing cache
            if (typeof window.clearGalleryCache === 'function') {
                window.clearGalleryCache();
                console.log('Gallery cache cleared after reordering');
            }
            
            console.log('Note: Gallery page will show new order after refresh/reload');
            console.log('Note: Cache writes are temporarily disabled to ensure fresh data');

            // Switch to manual order and reload to show the new order
            cmsState.sortOrder = 'manual';
            if (elements.sortSelect) {
                elements.sortSelect.value = 'manual';
            }
            
            // Reload images to reflect the new order from backend
            loadGalleryImages();

            // Show success message
            showSuccess(elements.galleryMessage, 'Image order saved');
        } else {
            const errorText = await response.text();
            console.error('Failed to save image order. Status:', response.status);
            console.error('Error response:', errorText);

            let errorMessage = 'Failed to save image order';
            try {
                const error = JSON.parse(errorText);
                errorMessage = error.detail?.error || error.detail || errorMessage;
            } catch (e) {
                // Not JSON, use text as is
                errorMessage = errorText || errorMessage;
            }

            showError(elements.galleryMessage, errorMessage);

            // Reload to restore correct order
            loadGalleryImages();
        }
    } catch (error) {
        console.error('Error saving image order:', error);
        console.error('Error details:', error.message, error.stack);
        showError(elements.galleryMessage, 'Error saving image order: ' + error.message);

        // Reload to restore correct order
        loadGalleryImages();
    }
}

function isBeforeElement(mouseX, mouseY, rect) {
    // Calculate the center point of the element
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Get the grid's computed style to determine layout direction
    const gridStyle = window.getComputedStyle(elements.galleryGrid);
    const isRTL = gridStyle.direction === 'rtl';

    // For grid layouts, we need to consider both X and Y positions
    // First, check if we're on the same row (within vertical tolerance)
    const verticalTolerance = rect.height * 0.3;
    const onSameRow = Math.abs(mouseY - centerY) < verticalTolerance;

    if (onSameRow) {
        // If on same row, use horizontal position
        return isRTL ? mouseX > centerX : mouseX < centerX;
    } else {
        // If on different rows, use vertical position
        return mouseY < centerY;
    }
}

// Enhanced drag enter for grid container
elements.galleryGrid.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const draggingElement = document.querySelector('.dragging');
    if (!draggingElement) return;

    // Update auto-scroll based on cursor position
    updateAutoScroll(e.clientY);

    // Find the closest element to cursor position
    const afterElement = getClosestElement(elements.galleryGrid, e.clientX, e.clientY);

    if (afterElement && afterElement !== draggingElement) {
        const rect = afterElement.getBoundingClientRect();
        const shouldInsertBefore = isBeforeElement(e.clientX, e.clientY, rect);

        if (shouldInsertBefore) {
            elements.galleryGrid.insertBefore(draggingElement, afterElement);
        } else {
            elements.galleryGrid.insertBefore(draggingElement, afterElement.nextSibling);
        }
    }
});

// Monitor drag events globally for auto-scrolling
document.addEventListener('dragover', (e) => {
    // Only handle if dragging a gallery image
    if (document.querySelector('.cms-image-card.dragging')) {
        updateAutoScroll(e.clientY);
    }
});

function getClosestElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.cms-image-card:not(.dragging)')];

    let closest = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    draggableElements.forEach(child => {
        const box = child.getBoundingClientRect();
        const centerX = box.left + box.width / 2;
        const centerY = box.top + box.height / 2;

        // Calculate Euclidean distance from cursor to element center
        const distance = Math.sqrt(
            Math.pow(x - centerX, 2) +
            Math.pow(y - centerY, 2)
        );

        if (distance < closestDistance) {
            closestDistance = distance;
            closest = child;
        }
    });

    return closest;
}

// =====================
// AUTO-SCROLL DURING DRAG
// =====================

/**
 * Start auto-scroll monitoring during drag
 */
function startAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
    }
    
    // Initialize scroll direction
    cmsState.scrollDirection = 0;
    
    // Start checking scroll conditions
    autoScrollInterval = setInterval(() => {
        if (cmsState.scrollDirection !== 0) {
            performScroll(cmsState.scrollDirection);
        }
    }, 16); // ~60fps
}

/**
 * Stop auto-scrolling
 */
function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    cmsState.scrollDirection = 0;
}

/**
 * Update auto-scroll direction based on cursor position
 */
function updateAutoScroll(clientY) {
    if (!cmsState.draggedElement) {
        cmsState.scrollDirection = 0;
        return;
    }

    const viewportHeight = window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollBottom = scrollTop + viewportHeight;
    
    // Calculate distance from top and bottom edges
    const distanceFromTop = clientY;
    const distanceFromBottom = viewportHeight - clientY;
    
    // Determine scroll direction and speed based on proximity to edges
    let scrollDirection = 0;
    let scrollSpeed = AUTO_SCROLL_SPEED;
    
    if (distanceFromTop < AUTO_SCROLL_ZONE) {
        // Near top edge - scroll up
        const proximity = 1 - (distanceFromTop / AUTO_SCROLL_ZONE);
        scrollDirection = -1;
        scrollSpeed = AUTO_SCROLL_SPEED * (0.5 + proximity * 1.5); // Speed up closer to edge
    } else if (distanceFromBottom < AUTO_SCROLL_ZONE) {
        // Near bottom edge - scroll down
        const proximity = 1 - (distanceFromBottom / AUTO_SCROLL_ZONE);
        scrollDirection = 1;
        scrollSpeed = AUTO_SCROLL_SPEED * (0.5 + proximity * 1.5); // Speed up closer to edge
    }
    
    cmsState.scrollDirection = scrollDirection;
    cmsState.scrollSpeed = scrollSpeed;
}

/**
 * Perform the actual scrolling
 */
function performScroll(direction) {
    if (!cmsState.draggedElement) return;
    
    const scrollAmount = (cmsState.scrollSpeed || AUTO_SCROLL_SPEED) * direction;
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    
    // Only scroll if we're not at the limits
    if ((direction < 0 && currentScroll > 0) || (direction > 0 && currentScroll < maxScroll)) {
        // Use scrollBy for smooth continuous scrolling (handles boundaries automatically)
        window.scrollBy(0, scrollAmount);
        
        // Also try scrolling the gallery container if it has its own scroll
        const galleryContainer = elements.galleryGrid?.closest('.cms-gallery-grid') || 
                                 elements.galleryGrid?.parentElement;
        if (galleryContainer && galleryContainer.scrollHeight > galleryContainer.clientHeight) {
            const containerScroll = galleryContainer.scrollTop;
            const containerMaxScroll = galleryContainer.scrollHeight - galleryContainer.clientHeight;
            
            if ((direction < 0 && containerScroll > 0) || 
                (direction > 0 && containerScroll < containerMaxScroll)) {
                galleryContainer.scrollTop += scrollAmount;
            }
        }
    }
}

// =====================
// BULK OPERATIONS
// =====================

function toggleImageSelection(imageId) {
    if (cmsState.selectedImages.has(imageId)) {
        cmsState.selectedImages.delete(imageId);
    } else {
        cmsState.selectedImages.add(imageId);
    }
    updateSelectionUI();
}

function updateSelectionUI() {
    const count = cmsState.selectedImages.size;
    elements.selectedCount.textContent = count;
    elements.bulkCount.textContent = count;

    if (count > 0) {
        elements.bulkToolbar.style.display = 'flex';
        elements.deleteSelectedBtn.disabled = false;
    } else {
        elements.bulkToolbar.style.display = 'none';
        elements.deleteSelectedBtn.disabled = true;
    }

    // Update card selection visuals
    document.querySelectorAll('.cms-image-card').forEach(card => {
        const imageId = parseInt(card.dataset.imageId);
        const checkbox = card.querySelector('.image-card-checkbox');

        if (cmsState.selectedImages.has(imageId)) {
            card.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        } else {
            card.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        }
    });
}

elements.selectAllBtn.addEventListener('click', () => {
    cmsState.images.forEach(img => cmsState.selectedImages.add(img.id));
    updateSelectionUI();
});

elements.deselectAllBtn.addEventListener('click', () => {
    cmsState.selectedImages.clear();
    updateSelectionUI();
});

elements.deleteSelectedBtn.addEventListener('click', async () => {
    const count = cmsState.selectedImages.size;
    if (!confirm(`Delete ${count} selected image(s)?`)) return;

    try {
        const response = await fetchWithCORS(API_ENDPOINTS.CMS_BULK_DELETE, {
            method: 'DELETE',
            body: JSON.stringify({
                image_ids: Array.from(cmsState.selectedImages)
            })
        });

        if (response.ok) {
            // Clear gallery cache so deleted images disappear immediately
            if (typeof window.clearGalleryCache === 'function') {
                window.clearGalleryCache();
                console.log('Gallery cache cleared after bulk delete');
            }

            showSuccess(elements.galleryMessage, `Deleted ${count} image(s)`);
            cmsState.selectedImages.clear();
            updateSelectionUI(); // Hide bulk toolbar and reset selection count
            loadGalleryImages();
        } else {
            throw new Error('Bulk delete failed');
        }
    } catch (error) {
        console.error('Bulk delete error:', error);
        showError(elements.galleryMessage, 'Failed to delete images');
    }
});

// =====================
// SINGLE IMAGE DELETE
// =====================

async function deleteImage(imageId) {
    if (!confirm('Delete this image?')) return;

    try {
        const response = await fetchWithCORS(API_ENDPOINTS.CMS_GALLERY_IMAGE(imageId), {
            method: 'DELETE'
        });

        if (response.ok) {
            // Clear gallery cache so deleted images disappear immediately
            if (typeof window.clearGalleryCache === 'function') {
                window.clearGalleryCache();
                console.log('Gallery cache cleared after delete');
            }

            showSuccess(elements.galleryMessage, 'Image deleted');
            cmsState.selectedImages.delete(imageId);
            updateSelectionUI(); // Update UI in case deleted image was selected
            loadGalleryImages();
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showError(elements.galleryMessage, 'Failed to delete image');
    }
}

// =====================
// CAPTION EDITING
// =====================

let currentEditingImageId = null;

function openCaptionEditor(imageId, currentCaption, imageUrl) {
    const modal = document.getElementById('caption-edit-modal');
    const previewImg = document.getElementById('caption-edit-preview-img');
    const captionInput = document.getElementById('caption-edit-input');

    if (modal && previewImg && captionInput) {
        currentEditingImageId = imageId;
        previewImg.src = imageUrl;
        captionInput.value = currentCaption || '';
        modal.classList.remove('hidden');
        captionInput.focus();
    }
}

function closeCaptionEditor() {
    const modal = document.getElementById('caption-edit-modal');
    const captionInput = document.getElementById('caption-edit-input');

    if (modal) {
        modal.classList.add('hidden');
        currentEditingImageId = null;
        if (captionInput) {
            captionInput.value = '';
        }
    }
}

async function saveCaptionUpdate() {
    const captionInput = document.getElementById('caption-edit-input');

    if (!currentEditingImageId || !captionInput) {
        return;
    }

    const newCaption = captionInput.value.trim();

    try {
        const response = await fetchWithCORS(API_ENDPOINTS.CMS_GALLERY_IMAGE(currentEditingImageId), {
            method: 'PUT',
            body: JSON.stringify({
                caption: newCaption || null
            })
        });

        if (response.ok) {
            // Clear gallery cache so caption updates appear immediately
            if (typeof window.clearGalleryCache === 'function') {
                window.clearGalleryCache();
                console.log('Gallery cache cleared after caption update');
            }

            showSuccess(elements.galleryMessage, 'Caption updated successfully');
            closeCaptionEditor();
            loadGalleryImages(); // Reload to show updated caption
        } else {
            const error = await response.json();
            showError(elements.galleryMessage, error.detail?.error || 'Failed to update caption');
        }
    } catch (error) {
        console.error('Caption update error:', error);
        showError(elements.galleryMessage, 'Error updating caption');
    }
}

// =====================
// EMOJI PICKER
// =====================

// Popular emoji categories
const EMOJI_CATEGORIES = {
    'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
    'Animals & Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦡', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
    'Food & Drink': ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧃', '🧉', '🧊'],
    'Activities': ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳️', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
    'Travel & Places': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩', '💺', '🚁', '🚟', '🚠', '🚡', '🛰', '🚀', '🛸', '⛵️', '🚤', '🛥', '🛳', '⛴', '🚢', '⚓️', '⛽️', '🚧', '🚦', '🚥', '🗺', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟', '🎡', '🎢', '🎠', '⛲️', '⛱', '🏖', '🏝', '🏜', '🌋', '⛰', '🏔', '🗻', '⛺️', '🏕', '🏠', '🏡', '🏘', '🏚', '🏗', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛', '⛪️', '🕌', '🕍', '🕋', '⛩', '🛤', '🛣', '🗾', '🎑', '🏞', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙', '🌃', '🌌', '🌉', '🌁'],
    'Objects': ['⌚️', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '⏱', '⏲', '⏰', '🕰', '⌛️', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒', '🛠', '⛏', '🔩', '⚙️', '🧱', '⛓', '🧲', '🔫', '💣', '🧨', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '💊', '💉', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🧽', '🧴', '🛎', '🔑', '🗝', '🚪', '🛋', '🛏', '🛌', '🧸', '🖼', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🪁', '🧧', '🏮', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧'],
    'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️', '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓️', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❓', '❕', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸', '⏯', '⏹', '⏺', '⏭', '⏮', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔜', '🔝', '✔️', '☑️', '🔘', '⚪️', '⚫️', '🔴', '🔵', '🟠', '🟡', '🟢', '🟣', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾️', '◽️', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛️', '⬜️', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁‍🗨', '💬', '💭', '🗯', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄️', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧']
};

/**
 * Initialize emoji picker for a given input/textarea
 */
function initEmojiPicker(pickerId, buttonId, inputId) {
    const picker = document.getElementById(pickerId);
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);

    if (!picker || !button || !input) return;

    // Build emoji picker HTML
    let pickerHTML = '';
    for (const [category, emojis] of Object.entries(EMOJI_CATEGORIES)) {
        pickerHTML += `
            <div class="emoji-category">
                <div class="emoji-category-title">${category}</div>
                <div class="emoji-grid">
                    ${emojis.map(emoji => `<button type="button" class="emoji-item" data-emoji="${emoji}">${emoji}</button>`).join('')}
                </div>
            </div>
        `;
    }
    picker.innerHTML = pickerHTML;

    // Toggle picker on button click with smart positioning
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isActive = picker.classList.contains('active');
        picker.classList.toggle('active');
        
        if (!isActive) {
            // Calculate if popup should appear above or below button
            const buttonRect = button.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const pickerHeight = 350; // max-height from CSS
            const spaceAbove = buttonRect.top;
            const spaceBelow = viewportHeight - buttonRect.bottom;
            
            const wrapper = picker.parentElement;
            // Remove any previous positioning class
            wrapper.classList.remove('picker-below');
            
            // If not enough space above but enough below, show below
            if (spaceAbove < pickerHeight + 20 && spaceBelow > pickerHeight + 20) {
                wrapper.classList.add('picker-below');
            }
        }
    });

    // Insert emoji on click
    picker.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-item')) {
            const emoji = e.target.dataset.emoji;
            const cursorPos = input.selectionStart || input.value.length;
            const textBefore = input.value.substring(0, cursorPos);
            const textAfter = input.value.substring(cursorPos);
            input.value = textBefore + emoji + textAfter;
            
            // Set cursor position after inserted emoji
            const newPos = cursorPos + emoji.length;
            input.setSelectionRange(newPos, newPos);
            input.focus();
            
            // Close picker
            picker.classList.remove('active');
        }
    });

    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && e.target !== button) {
            picker.classList.remove('active');
        }
    });
}

// Initialize emoji pickers when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initEmojiPicker('edit-emoji-picker', 'edit-emoji-btn', 'caption-edit-input');
    });
} else {
    initEmojiPicker('edit-emoji-picker', 'edit-emoji-btn', 'caption-edit-input');
}

// Caption modal event listeners
const captionSaveBtn = document.getElementById('caption-save-btn');
const captionCancelBtn = document.getElementById('caption-cancel-btn');
const captionModal = document.getElementById('caption-edit-modal');

if (captionSaveBtn) {
    captionSaveBtn.addEventListener('click', saveCaptionUpdate);
}

if (captionCancelBtn) {
    captionCancelBtn.addEventListener('click', closeCaptionEditor);
}

// Close modal on overlay click
if (captionModal) {
    captionModal.addEventListener('click', (e) => {
        if (e.target === captionModal || e.target.classList.contains('modal-overlay')) {
            closeCaptionEditor();
        }
    });
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('caption-edit-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeCaptionEditor();
        }
    }
});

// =====================
// SEARCH & SORT
// =====================

elements.searchInput.addEventListener('input', (e) => {
    cmsState.searchQuery = e.target.value;
    renderGallery();
});

elements.sortSelect.addEventListener('change', (e) => {
    cmsState.sortOrder = e.target.value;
    renderGallery();
});

elements.refreshBtn.addEventListener('click', () => {
    loadGalleryImages();
});

// =====================
// STATISTICS
// =====================

function updateStatistics() {
    elements.totalImages.textContent = cmsState.images.length;

    // Calculate total storage (if available)
    const totalBytes = cmsState.images.reduce((sum, img) => sum + (img.file_size || 0), 0);
    elements.totalStorage.textContent = formatFileSize(totalBytes);
}

// =====================
// UTILITY FUNCTIONS
// =====================

function showError(element, message) {
    element.textContent = message;
    element.className = 'cms-message error';
    element.style.display = 'block';
}

function showSuccess(element, message) {
    element.textContent = message;
    element.className = 'cms-message success';
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function hideError(element) {
    element.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// =====================
// INITIALIZATION
// =====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}

