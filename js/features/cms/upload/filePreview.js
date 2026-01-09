/**
 * CMS File Preview Module
 * Handles file preview display and caption input
 */

import { formatFileSize } from '../../../core/utils.js';
import { createEmojiPicker } from './emojiPicker.js';

let elements = null;
let filesToUpload = [];
let fileCaptions = {};
let onFileRemove = null;
let onCaptionChange = null;

/**
 * Initialize file preview
 * @param {Object} cmsElements - CMS DOM elements object
 * @param {Function} removeHandler - Callback when file is removed
 * @param {Function} captionHandler - Callback when caption changes
 */
export function initFilePreview(cmsElements, removeHandler, captionHandler) {
    elements = cmsElements;
    onFileRemove = removeHandler;
    onCaptionChange = captionHandler;

    if (elements.clearFilesBtn) {
        elements.clearFilesBtn.addEventListener('click', () => {
            filesToUpload = [];
            fileCaptions = {};
            displayFilePreview();
            if (elements.imageFilesInput) {
                elements.imageFilesInput.value = '';
            }
        });
    }
}

/**
 * Set files to preview
 * @param {Array} files - Array of File objects
 */
export function setFiles(files) {
    filesToUpload = files || [];
    displayFilePreview();
}

/**
 * Get files to upload
 * @returns {Array} - Array of File objects
 */
export function getFiles() {
    return filesToUpload;
}

/**
 * Get file captions
 * @returns {Object} - Map of file index to caption
 */
export function getCaptions() {
    return { ...fileCaptions };
}

/**
 * Clear all files
 */
export function clearFiles() {
    filesToUpload = [];
    fileCaptions = {};
    displayFilePreview();
}

/**
 * Remove a file by index
 * @param {number} index - File index to remove
 */
export function removeFile(index) {
    filesToUpload.splice(index, 1);
    // Rebuild captions map with updated indices
    const newCaptions = {};
    Object.keys(fileCaptions).forEach(key => {
        const oldIdx = parseInt(key);
        if (oldIdx < index) {
            newCaptions[oldIdx] = fileCaptions[oldIdx];
        } else if (oldIdx > index) {
            newCaptions[oldIdx - 1] = fileCaptions[oldIdx];
        }
    });
    fileCaptions = newCaptions;
    displayFilePreview();
}

/**
 * Display file preview grid
 */
function displayFilePreview() {
    if (!elements || !elements.filePreviewContainer) return;

    if (filesToUpload.length === 0) {
        elements.filePreviewContainer.style.display = 'none';
        fileCaptions = {};
        return;
    }

    elements.filePreviewContainer.style.display = 'block';
    if (elements.fileCount) elements.fileCount.textContent = filesToUpload.length;
    if (elements.uploadCount) elements.uploadCount.textContent = filesToUpload.length;
    if (elements.filePreviewGrid) elements.filePreviewGrid.innerHTML = '';

    filesToUpload.forEach((file, index) => {
        const fileItem = createFilePreviewItem(file, index);
        if (elements.filePreviewGrid) {
            elements.filePreviewGrid.appendChild(fileItem);
        }
    });
}

/**
 * Create a file preview item
 * @param {File} file - File object
 * @param {number} index - File index
 * @returns {HTMLElement} - File preview item element
 */
function createFilePreviewItem(file, index) {
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
        if (onFileRemove) {
            onFileRemove(index);
        }
    };

    // Caption input wrapper
    const captionWrapper = document.createElement('div');
    captionWrapper.className = 'file-preview-caption-wrapper';

    // Caption input
    const captionInput = document.createElement('textarea');
    captionInput.className = 'file-preview-caption-input';
    captionInput.id = `caption-input-${index}`;
    captionInput.placeholder = 'Add caption for this image...';
    captionInput.value = fileCaptions[index] || '';
    captionInput.dataset.fileIndex = index;
    captionInput.rows = 3;
    
    // Store caption when changed
    captionInput.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.fileIndex);
        const caption = e.target.value.trim();
        if (caption) {
            fileCaptions[idx] = caption;
        } else {
            delete fileCaptions[idx];
        }
        if (onCaptionChange) {
            onCaptionChange(idx, caption);
        }
    });

    // Emoji picker wrapper
    const emojiWrapper = document.createElement('div');
    emojiWrapper.className = 'emoji-picker-wrapper';
    emojiWrapper.id = `emoji-wrapper-${index}`;

    // Initialize emoji picker for this input
    createEmojiPicker(captionInput, emojiWrapper, (value) => {
        const idx = parseInt(captionInput.dataset.fileIndex);
        const caption = value.trim();
        if (caption) {
            fileCaptions[idx] = caption;
        } else {
            delete fileCaptions[idx];
        }
        if (onCaptionChange) {
            onCaptionChange(idx, caption);
        }
    });

    captionWrapper.appendChild(captionInput);
    captionWrapper.appendChild(emojiWrapper);
    
    fileItem.appendChild(img);
    fileItem.appendChild(overlay);
    fileItem.appendChild(removeBtn);
    fileItem.appendChild(captionWrapper);

    return fileItem;
}

// Export for emoji picker to access
export function getFileCaptions() {
    return fileCaptions;
}

export function setFileCaption(index, caption) {
    if (caption) {
        fileCaptions[index] = caption;
    } else {
        delete fileCaptions[index];
    }
}
