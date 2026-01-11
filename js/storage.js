/**
 * =====================================================
 * TSHIKOTA RO FARANA - STORAGE MODULE (NO FIREBASE STORAGE)
 * =====================================================
 * Handles file uploads by converting to base64 and storing in Firestore
 * This version works with Firebase's free Spark plan
 */

const Storage = {
    /**
     * Maximum file size (2MB - will be compressed further)
     */
    MAX_FILE_SIZE: 2 * 1024 * 1024,

    /**
     * Maximum base64 size to store (800KB to stay well under Firestore 1MB limit)
     */
    MAX_BASE64_SIZE: 800 * 1024,

    /**
     * Allowed file types (images only - PDFs don't compress well for base64)
     */
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

    /**
     * Upload proof of payment file (converts to base64)
     * @param {File} file - File to upload
     * @param {string} reference - Payment reference
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<string>} Base64 data URL
     */
    async uploadProof(file, reference, onProgress = null) {
        try {
            // Validate file (throws on error)
            const validation = this.validateFile(file);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            if (onProgress) onProgress(10);

            // Compress image
            let processedFile = file;
            if (file.type.startsWith('image/')) {
                try {
                    processedFile = await this.compressImage(file, 800, 0.6);
                    if (onProgress) onProgress(50);
                } catch (compressError) {
                    console.warn('Image compression failed:', compressError);
                    // Try with lower quality
                    try {
                        processedFile = await this.compressImage(file, 600, 0.4);
                    } catch (e) {
                        throw new Error('Could not compress image. Please try a smaller file.');
                    }
                }
            }

            if (onProgress) onProgress(70);

            // Convert to base64
            const base64 = await this.fileToBase64(processedFile);
            
            if (onProgress) onProgress(90);

            // Check final size
            if (base64.length > this.MAX_BASE64_SIZE) {
                throw new Error('Image is still too large after compression. Please use a smaller image.');
            }

            if (onProgress) onProgress(100);

            return base64;
        } catch (error) {
            console.error('Upload proof error:', error);
            throw error;
        }
    },

    /**
     * Compress an image file
     * @param {File} file - Image file to compress
     * @param {number} maxWidth - Maximum width in pixels
     * @param {number} quality - JPEG quality (0-1)
     * @returns {Promise<Blob>} Compressed image blob
     */
    compressImage(file, maxWidth = 800, quality = 0.6) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        // Calculate new dimensions
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }

                        canvas.width = width;
                        canvas.height = height;

                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    resolve(blob);
                                } else {
                                    reject(new Error('Failed to compress image'));
                                }
                            },
                            'image/jpeg',
                            quality
                        );
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Convert file to base64 data URL
     * @param {File|Blob} file - File to convert
     * @returns {Promise<string>} Base64 data URL
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Validate file before upload
     * Returns {valid: boolean, error: string} for compatibility with submit-pop.js
     * @param {File} file - File to validate
     * @returns {object} Validation result {valid: boolean, error?: string}
     */
    validateFile(file) {
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }

        if (file.size > this.MAX_FILE_SIZE) {
            return { 
                valid: false, 
                error: `File too large. Maximum size is ${this.formatFileSize(this.MAX_FILE_SIZE)}` 
            };
        }

        if (!this.ALLOWED_TYPES.includes(file.type)) {
            return { 
                valid: false, 
                error: 'Invalid file type. Please upload an image (JPG, PNG, GIF, or WebP)' 
            };
        }

        return { valid: true };
    },

    /**
     * Format file size for display
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    /**
     * Get human-readable error message
     * @param {object} error - Error object
     * @returns {string} Error message
     */
    getErrorMessage(error) {
        if (error.message) {
            return error.message;
        }
        return 'Upload failed. Please try again.';
    },

    /**
     * Delete a file (no-op for base64 storage, kept for compatibility)
     * @param {string} url - File URL or base64 string
     */
    async deleteFile(url) {
        // No action needed for base64 strings stored in Firestore
        // The data is deleted when the document is deleted
        console.log('Delete file called - no action needed for base64 storage');
    },

    /**
     * Get file metadata (limited for base64)
     * @param {string} base64 - Base64 data URL
     * @returns {object} Basic metadata
     */
    getMetadata(base64) {
        if (!base64 || !base64.startsWith('data:')) {
            return null;
        }
        
        const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) return null;
        
        return {
            contentType: matches[1],
            size: Math.round((matches[2].length * 3) / 4), // Approximate original size
            isBase64: true
        };
    },

    /**
     * Create a preview URL for local file
     * @param {File} file - File to preview
     * @returns {string} Object URL for preview
     */
    createPreviewURL(file) {
        return URL.createObjectURL(file);
    },

    /**
     * Revoke a preview URL
     * @param {string} url - Object URL to revoke
     */
    revokePreviewURL(url) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    },

    /**
     * Check if a string is a base64 data URL
     * @param {string} str - String to check
     * @returns {boolean} Whether it's a base64 data URL
     */
    isBase64DataURL(str) {
        return typeof str === 'string' && str.startsWith('data:');
    },

    /**
     * Check if a string is a Firebase Storage URL (for migration)
     * @param {string} str - String to check
     * @returns {boolean} Whether it's a Firebase Storage URL
     */
    isFirebaseStorageURL(str) {
        return typeof str === 'string' && 
               (str.includes('firebasestorage.googleapis.com') || 
                str.includes('storage.googleapis.com'));
    }
};

// Export for use
window.Storage = Storage;