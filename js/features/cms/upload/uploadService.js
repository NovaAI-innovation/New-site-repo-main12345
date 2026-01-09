/**
 * CMS Upload Service Module
 * Handles file upload API calls with batch processing
 */

import { API_ENDPOINTS } from '../../../core/config.js';
import { fetchWithCORS } from '../../../core/http.js';
import { getAuthToken } from '../auth/authService.js';
import { refreshToken, setAuthToken } from '../auth/authService.js';
import { showAuth } from '../auth/authUI.js';

const BATCH_SIZE = 5; // Upload 5 images at a time

/**
 * Upload a batch of files
 * @param {Array<File>} files - Array of File objects
 * @param {Object} captions - Map of file index to caption string
 * @param {Function} onProgress - Progress callback (batchNumber, totalBatches)
 * @returns {Promise<Object>} - Upload result with success/failure counts
 */
export async function uploadFiles(files, captions = {}, onProgress = null) {
    if (!files || files.length === 0) {
        throw new Error('No files to upload');
    }

    let totalUploaded = 0;
    let totalFailed = 0;
    const allErrors = [];

    // Split files into batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(files.length / BATCH_SIZE);

        // Report progress
        if (onProgress) {
            onProgress(batchNumber, totalBatches);
        }

        // Build FormData for this batch
        const formData = new FormData();
        batch.forEach((file, batchIndex) => {
            const originalIndex = i + batchIndex;
            formData.append('files', file);

            // Add caption for this file if it exists
            const caption = captions[originalIndex];
            if (caption && caption.trim()) {
                formData.append('captions', caption.trim());
            } else {
                formData.append('captions', '');
            }
        });

        try {
            const response = await fetchWithCORS(
                API_ENDPOINTS.CMS_GALLERY_IMAGES,
                {
                    method: 'POST',
                    body: formData
                },
                getAuthToken,
                setAuthToken,
                refreshToken,
                showAuth
            );

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
        if (i + BATCH_SIZE < files.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Clear gallery cache so new images appear immediately
    if (typeof window.clearGalleryCache === 'function') {
        window.clearGalleryCache();
        console.log('Gallery cache cleared after upload');
    }

    return {
        totalUploaded,
        totalFailed,
        errors: allErrors
    };
}
