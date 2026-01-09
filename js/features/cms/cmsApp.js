/**
 * CMS App Module
 * Coordinates all CMS modules and initialization
 */

import { initAuthElements, showAuth, showDashboard, checkAuth, setOnLoginSuccess, setOnLogout } from './auth/authUI.js';
import { initDragDrop } from './upload/dragDrop.js';
import { initFilePreview, setFiles, getFiles, getCaptions, clearFiles } from './upload/filePreview.js';
import { uploadFiles } from './upload/uploadService.js';
import { initGalleryManager, loadGalleryImages, deleteImage, openCaptionEditor, closeCaptionEditor, saveCaptionUpdate } from './gallery/galleryManager.js';
import { initGalleryRenderer, setImages, setSearchQuery, setSortOrder, renderGallery, updateStatistics } from './gallery/galleryRenderer.js';
import { initDragReorder, attachDragHandlers } from './gallery/dragReorder.js';
import { initBulkOperations, setAllImages, toggleImageSelection, getSelectedImages, clearSelection } from './gallery/bulkOperations.js';
import { setImages as setCmsStateImages, setFilesToUpload, setFileCaptions, setSearchQuery as setCmsStateSearchQuery, setSortOrder as setCmsStateSortOrder, resetCmsState } from './cmsState.js';
import { showError, showSuccess } from '../../../core/utils.js';
import { createEmojiPicker } from './upload/emojiPicker.js';

let elements = null;

/**
 * Get CMS DOM elements
 * @returns {Object} - CMS elements object
 */
function getCmsElements() {
    return {
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
}

/**
 * Handle file selection from drag & drop or file input
 * @param {FileList} files - Selected files
 */
function handleFilesSelected(files) {
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

    const currentFiles = getFiles();
    const newFiles = [...currentFiles, ...validFiles];
    setFiles(newFiles);
    setFilesToUpload(newFiles);
}

/**
 * Handle file removal
 * @param {number} index - File index to remove
 */
function handleFileRemove(index) {
    const files = getFiles();
    files.splice(index, 1);
    setFiles(files);
    setFilesToUpload(files);
}

/**
 * Handle caption change
 * @param {number} index - File index
 * @param {string} caption - Caption text
 */
function handleCaptionChange(index, caption) {
    const captions = getCaptions();
    if (caption) {
        captions[index] = caption;
    } else {
        delete captions[index];
    }
    setFileCaptions(captions);
}

/**
 * Handle upload button click
 */
async function handleUpload() {
    const files = getFiles();
    if (files.length === 0) {
        if (elements.uploadMessage) {
            showError(elements.uploadMessage, 'No files selected');
        }
        return;
    }

    const captions = getCaptions();
    
    if (elements.uploadBtn) {
        elements.uploadBtn.disabled = true;
        elements.uploadBtn.innerHTML = '<span>Uploading...</span>';
    }

    try {
        const result = await uploadFiles(files, captions, (batchNumber, totalBatches) => {
            if (elements.uploadBtn) {
                elements.uploadBtn.innerHTML = `<span>Uploading batch ${batchNumber}/${totalBatches}...</span>`;
            }
        });

        // Show results
        if (result.totalUploaded > 0 && result.totalFailed === 0) {
            if (elements.uploadMessage) {
                showSuccess(elements.uploadMessage, `Successfully uploaded all ${result.totalUploaded} image(s)!`);
            }
        } else if (result.totalUploaded > 0 && result.totalFailed > 0) {
            if (elements.uploadMessage) {
                showError(elements.uploadMessage, `Uploaded ${result.totalUploaded} image(s), ${result.totalFailed} failed. Check console for details.`);
            }
            console.error('Upload errors:', result.errors);
        } else {
            if (elements.uploadMessage) {
                showError(elements.uploadMessage, `All uploads failed. ${result.errors.join('; ')}`);
            }
        }

        // Clear files and reload gallery
        clearFiles();
        setFilesToUpload([]);
        setFileCaptions({});
        if (elements.imageFilesInput) {
            elements.imageFilesInput.value = '';
        }
        
        // Reload gallery
        await reloadGallery();
    } catch (error) {
        console.error('Upload error:', error);
        if (elements.uploadMessage) {
            showError(elements.uploadMessage, 'Failed to upload images');
        }
    } finally {
        if (elements.uploadBtn) {
            elements.uploadBtn.disabled = false;
            const currentFileCount = getFiles().length;
            elements.uploadBtn.innerHTML = `<span class="btn-icon">⬆️</span><span>Upload <span id="upload-count">${currentFileCount}</span> Images</span>`;
            elements.uploadCount = document.getElementById('upload-count');
        }
    }
}

/**
 * Reload gallery images
 */
async function reloadGallery() {
    try {
        const images = await loadGalleryImages();
        setImages(images);
        setCmsStateImages(images);
        setAllImages(images);
        
        const selectedImages = getSelectedImages();
        renderGallery(selectedImages);
        updateStatistics(images);
        
        // Sync sort dropdown
        if (elements.sortSelect) {
            const sortOrder = elements.sortSelect.value;
            setSortOrder(sortOrder);
            setCmsStateSortOrder(sortOrder);
        }
    } catch (error) {
        console.error('Error reloading gallery:', error);
    }
}

/**
 * Handle image card creation (attach drag handlers)
 * @param {HTMLElement} card - Image card element
 * @param {Object} image - Image data
 */
function handleImageCardCreated(card, image) {
    attachDragHandlers(card);
    
    // Attach checkbox handler
    const checkbox = card.querySelector('.image-card-checkbox');
    if (checkbox) {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const imageId = parseInt(card.dataset.imageId);
            toggleImageSelection(imageId);
        });
    }
}

/**
 * Handle selection change
 * @param {Set} selectedImages - Set of selected image IDs
 */
function handleSelectionChange(selectedImages) {
    renderGallery(selectedImages);
}

/**
 * Handle bulk delete complete
 */
async function handleBulkDeleteComplete() {
    await reloadGallery();
}

/**
 * Handle reorder complete
 */
async function handleReorderComplete() {
    await reloadGallery();
}

/**
 * Initialize caption modal
 */
function initCaptionModal() {
    const captionSaveBtn = document.getElementById('caption-save-btn');
    const captionCancelBtn = document.getElementById('caption-cancel-btn');
    const captionModal = document.getElementById('caption-edit-modal');
    const captionInput = document.getElementById('caption-edit-input');
    const emojiWrapper = document.getElementById('edit-emoji-wrapper');

    if (captionSaveBtn) {
        captionSaveBtn.addEventListener('click', async () => {
            const success = await saveCaptionUpdate();
            if (success) {
                await reloadGallery();
            }
        });
    }

    if (captionCancelBtn) {
        captionCancelBtn.addEventListener('click', () => {
            closeCaptionEditor();
        });
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

    // Initialize emoji picker for caption editor
    if (captionInput && emojiWrapper) {
        createEmojiPicker(captionInput, emojiWrapper, (value) => {
            // Caption updated via emoji picker
        });
    }
}

/**
 * Initialize search and sort handlers
 */
function initSearchAndSort() {
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            setSearchQuery(query);
            setCmsStateSearchQuery(query);
            const selectedImages = getSelectedImages();
            renderGallery(selectedImages);
        });
    }

    if (elements.sortSelect) {
        elements.sortSelect.addEventListener('change', (e) => {
            const order = e.target.value;
            setSortOrder(order);
            setCmsStateSortOrder(order);
            const selectedImages = getSelectedImages();
            renderGallery(selectedImages);
        });
    }

    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', () => {
            reloadGallery();
        });
    }
}

/**
 * Initialize CMS application
 */
export function initCMS() {
    // Get all CMS elements
    elements = getCmsElements();

    // Initialize auth UI
    initAuthElements(elements);
    setOnLoginSuccess(async () => {
        // Load gallery after successful login
        await reloadGallery();
    });
    setOnLogout(() => {
        // Clear state on logout
        resetCmsState();
        clearSelection();
        clearFiles();
    });

    // Initialize drag & drop
    initDragDrop(elements, handleFilesSelected);

    // Initialize file preview
    initFilePreview(elements, handleFileRemove, handleCaptionChange);

    // Initialize upload button
    if (elements.uploadBtn) {
        elements.uploadBtn.addEventListener('click', handleUpload);
    }

    // Initialize gallery manager
    initGalleryManager(elements, (images) => {
        setImages(images);
        setCmsStateImages(images);
        setAllImages(images);
        
        const selectedImages = getSelectedImages();
        renderGallery(selectedImages);
        updateStatistics(images);
    });

    // Initialize gallery renderer
    initGalleryRenderer(elements, handleImageCardCreated);

    // Initialize drag reorder
    initDragReorder(elements, handleReorderComplete);

    // Initialize bulk operations
    initBulkOperations(elements, handleSelectionChange, handleBulkDeleteComplete);

    // Initialize caption modal
    initCaptionModal();

    // Initialize search and sort
    initSearchAndSort();

    // Check authentication
    checkAuth();
}
