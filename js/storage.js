/**
 * =====================================================
 * TSHIKOTA RO FARANA - STORAGE MODULE
 * =====================================================
 * Firebase Cloud Storage operations for file uploads
 */

const Storage = {
    /**
     * Maximum file size (5MB)
     */
    MAX_FILE_SIZE: 5 * 1024 * 1024,

    /**
     * Allowed file types
     */
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],

    /**
     * Upload proof of payment file
     * @param {File} file - File to upload
     * @param {string} reference - Payment reference
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<string>} Download URL
     */
    async uploadProof(file, reference, onProgress = null) {
        try {
            // Validate file
            this.validateFile(file);

            // Create storage reference
            const timestamp = Date.now();
            const extension = file.name.split('.').pop().toLowerCase();
            const filename = `${reference}_${timestamp}.${extension}`;
            const storageRef = storage.ref(`proofs/${filename}`);

            // Compress image if applicable
            let uploadFile = file;
            if (file.type.startsWith('image/') && file.size > 500 * 1024) {
                try {
                    uploadFile = await Utils.compressImage(file, 1200, 0.8);
                } catch (compressError) {
                    console.warn('Image compression failed, uploading original:', compressError);
                }
            }

            // Upload with progress tracking
            const uploadTask = storageRef.put(uploadFile, {
                customMetadata: {
                    reference: reference,
                    originalName: file.name,
                    uploadedAt: new Date().toISOString()
                }
            });

            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (onProgress) {
                            onProgress(progress);
                        }
                    },
                    (error) => {
                        console.error('Upload error:', error);
                        reject(this.getErrorMessage(error));
                    },
                    async () => {
                        try {
                            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                            resolve(downloadURL);
                        } catch (error) {
                            reject('Failed to get download URL');
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Upload proof error:', error);
            throw error;
        }
    },

    /**
     * Validate file before upload
     * @param {File} file - File to validate
     * @throws {Error} If validation fails
     */
    validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        if (file.size > this.MAX_FILE_SIZE) {
            throw new Error(`File too large. Maximum size is ${Utils.formatFileSize(this.MAX_FILE_SIZE)}`);
        }

        if (!this.ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Please upload an image (JPG, PNG, GIF, WebP) or PDF');
        }
    },

    /**
     * Get human-readable error message
     * @param {object} error - Firebase storage error
     * @returns {string} Error message
     */
    getErrorMessage(error) {
        switch (error.code) {
            case 'storage/unauthorized':
                return 'Permission denied. Please try again.';
            case 'storage/canceled':
                return 'Upload was cancelled.';
            case 'storage/quota-exceeded':
                return 'Storage quota exceeded. Please contact admin.';
            case 'storage/retry-limit-exceeded':
                return 'Upload failed due to poor connection. Please try again.';
            default:
                return 'Upload failed. Please try again.';
        }
    },

    /**
     * Delete a file from storage
     * @param {string} url - File download URL
     */
    async deleteFile(url) {
        try {
            const fileRef = storage.refFromURL(url);
            await fileRef.delete();
        } catch (error) {
            console.error('Delete file error:', error);
            // Don't throw - file might already be deleted
        }
    },

    /**
     * Get file metadata
     * @param {string} url - File download URL
     * @returns {Promise<object>} File metadata
     */
    async getMetadata(url) {
        try {
            const fileRef = storage.refFromURL(url);
            return await fileRef.getMetadata();
        } catch (error) {
            console.error('Get metadata error:', error);
            return null;
        }
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
    }
};

// Export for use
window.Storage = Storage;
