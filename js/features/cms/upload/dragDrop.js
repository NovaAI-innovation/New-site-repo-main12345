/**
 * CMS Drag & Drop Module
 * Handles drag and drop file upload functionality
 */

let elements = null;
let onFilesSelected = null;

/**
 * Initialize drag and drop
 * @param {Object} cmsElements - CMS DOM elements object
 * @param {Function} filesHandler - Callback when files are selected
 */
export function initDragDrop(cmsElements, filesHandler) {
    elements = cmsElements;
    onFilesSelected = filesHandler;

    if (!elements || !elements.dropZone) {
        console.warn('Drop zone element not found');
        return;
    }

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        elements.dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

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
        if (onFilesSelected) {
            onFilesSelected(files);
        }
    });

    // Click to browse
    elements.dropZone.addEventListener('click', () => {
        if (elements.imageFilesInput) {
            elements.imageFilesInput.click();
        }
    });

    if (elements.browseBtn) {
        elements.browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (elements.imageFilesInput) {
                elements.imageFilesInput.click();
            }
        });
    }

    if (elements.imageFilesInput) {
        elements.imageFilesInput.addEventListener('change', (e) => {
            if (onFilesSelected) {
                onFilesSelected(e.target.files);
            }
        });
    }
}

/**
 * Prevent default drag behaviors
 * @param {Event} e - Event object
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
