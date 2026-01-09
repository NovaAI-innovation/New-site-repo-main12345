/**
 * Gallery Renderer Module
 * Handles rendering of gallery images and Cloudinary URL transformations
 */

/**
 * Cloudinary transformation configurations
 * @type {Object}
 */
const CLOUDINARY_TRANSFORMS = {
    thumbnail: 'c_fill,w_400,h_400,q_auto,f_auto',
    medium: 'c_fill,w_800,h_800,q_auto,f_auto',
    full: 'c_fill,w_1600,h_1600,q_auto,f_auto'
};

/**
 * Generate optimized Cloudinary URL with transformations
 * @param {string} originalUrl - Original Cloudinary URL
 * @param {string} size - Size preset (thumbnail, medium, full)
 * @returns {string} Transformed URL
 */
export function generateCloudinaryUrl(originalUrl, size = 'thumbnail') {
    if (!originalUrl) return '';

    // Cloudinary URL pattern: https://res.cloudinary.com/{cloud}/image/upload/{public_id}
    const uploadPattern = /\/upload\//;

    if (!uploadPattern.test(originalUrl)) {
        console.warn('Not a Cloudinary URL, returning original:', originalUrl);
        return originalUrl;
    }

    const transformation = CLOUDINARY_TRANSFORMS[size] || CLOUDINARY_TRANSFORMS.thumbnail;

    // Insert transformations after /upload/
    return originalUrl.replace('/upload/', `/upload/${transformation}/`);
}

/**
 * Generate srcset for responsive images
 * @param {string} originalUrl - Original Cloudinary URL
 * @returns {string} srcset attribute value
 */
export function generateSrcset(originalUrl) {
    return `${generateCloudinaryUrl(originalUrl, 'thumbnail')} 400w, ${generateCloudinaryUrl(originalUrl, 'medium')} 800w`;
}

/**
 * Create a gallery grid item element from image data
 * @param {Object} image - Image data object
 * @param {number} index - Image index in the gallery
 * @param {Function} onImageClick - Callback function when image is clicked
 * @returns {HTMLElement} - Gallery item element
 */
export function createGalleryItem(image, index, onImageClick) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.imageIndex = index;

    // Create image wrapper
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'gallery-item-image';

    // Create optimized image element with responsive images
    const img = document.createElement('img');

    // Use thumbnail as primary src, with srcset for responsiveness
    img.src = generateCloudinaryUrl(image.cloudinary_url, 'thumbnail');
    img.srcset = generateSrcset(image.cloudinary_url);
    img.sizes = '(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw';
    img.alt = image.caption || `Makayla Moon Gallery ${index + 1}`;
    img.loading = 'lazy';

    // Add error handling for broken images
    img.onerror = function() {
        console.error(`Failed to load image: ${image.cloudinary_url}`);
        this.style.display = 'none';
        const errorMsg = document.createElement('div');
        errorMsg.className = 'gallery-item-error';
        errorMsg.textContent = 'Failed to load image';
        imageWrapper.appendChild(errorMsg);
    };

    // Add click handler for lightbox
    if (onImageClick) {
        img.addEventListener('click', () => {
            onImageClick(image.cloudinary_url, index);
        });
    }

    // Create overlay on hover
    const overlay = document.createElement('div');
    overlay.className = 'gallery-item-overlay';
    const overlayIcon = document.createElement('span');
    overlayIcon.className = 'gallery-item-icon';
    overlayIcon.textContent = '👁️';
    overlay.appendChild(overlayIcon);

    // Add caption if available
    if (image.caption) {
        const caption = document.createElement('div');
        caption.className = 'gallery-item-caption';
        caption.textContent = image.caption;
        overlay.appendChild(caption);
    }

    // Assemble item
    imageWrapper.appendChild(img);
    imageWrapper.appendChild(overlay);
    item.appendChild(imageWrapper);

    return item;
}

/**
 * Render images in the gallery grid
 * @param {Array} images - Array of image objects
 * @param {HTMLElement} galleryGrid - The gallery grid container element
 * @param {Function} onImageClick - Callback function when image is clicked
 */
export function renderImages(images, galleryGrid, onImageClick) {
    if (!galleryGrid) {
        console.error('Gallery grid container not found');
        return;
    }

    // Clear grid completely (including load more button)
    galleryGrid.innerHTML = '';

    // Create and append grid items
    images.forEach((image, index) => {
        const item = createGalleryItem(image, index, onImageClick);
        galleryGrid.appendChild(item);
    });
}

/**
 * Add "Load More" button to gallery
 * @param {HTMLElement} galleryGrid - The gallery grid container element
 * @param {Function} onLoadMore - Callback function when load more is clicked
 */
export function addLoadMoreButton(galleryGrid, onLoadMore) {
    if (!galleryGrid) return;

    // Remove existing button if present
    const existing = galleryGrid.querySelector('.load-more-container');
    if (existing) {
        existing.remove();
    }

    // Create load more container
    const container = document.createElement('div');
    container.className = 'load-more-container';

    const button = document.createElement('button');
    button.className = 'btn btn-primary load-more-btn';
    button.textContent = 'Load More';
    if (onLoadMore) {
        button.onclick = onLoadMore;
    }

    container.appendChild(button);
    galleryGrid.appendChild(container);
}
