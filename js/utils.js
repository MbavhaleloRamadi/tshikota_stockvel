/**
 * =====================================================
 * TSHIKOTA RO FARANA - UTILITY FUNCTIONS
 * =====================================================
 * Common helper functions used across the application
 */

const Utils = {
    /**
     * Format currency in South African Rand
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * Format date for display
     * @param {Date|string|object} date - Date to format (can be Firestore Timestamp)
     * @param {string} format - Format type: 'short', 'long', 'relative'
     * @returns {string} Formatted date string
     */
    formatDate(date, format = 'short') {
        // Handle Firestore Timestamp
        if (date && typeof date.toDate === 'function') {
            date = date.toDate();
        }
        
        // Handle string dates
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        if (!(date instanceof Date) || isNaN(date)) {
            return 'Invalid date';
        }

        const options = {
            short: { day: 'numeric', month: 'short', year: 'numeric' },
            long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
            time: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
        };

        if (format === 'relative') {
            return this.getRelativeTime(date);
        }

        return date.toLocaleDateString('en-ZA', options[format] || options.short);
    },

    /**
     * Get relative time string (e.g., "2 hours ago")
     * @param {Date} date - Date to compare
     * @returns {string} Relative time string
     */
    getRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        
        return this.formatDate(date, 'short');
    },

    /**
     * Get month name from month number
     * @param {number} month - Month number (1-12)
     * @returns {string} Month name
     */
    getMonthName(month) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1] || '';
    },

    /**
     * Get current month-year string for payment month
     * @returns {string} e.g., "December 2024"
     */
    getCurrentPaymentMonth() {
        const now = new Date();
        return `${this.getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`;
    },

    /**
     * Generate a unique reference code
     * @returns {string} Reference code (e.g., "TRF-A1B2C3")
     */
    generateReference() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = 'TRF-';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Validate South African phone number
     * @param {string} phone - Phone number to validate
     * @returns {boolean} Whether phone is valid
     */
    isValidPhone(phone) {
        // Remove spaces and dashes
        const cleaned = phone.replace(/[\s-]/g, '');
        // SA mobile: 0XX XXX XXXX or +27XX XXX XXXX
        const pattern = /^(\+27|0)[6-8][0-9]{8}$/;
        return pattern.test(cleaned);
    },

    /**
     * Format phone number for display
     * @param {string} phone - Phone number
     * @returns {string} Formatted phone
     */
    formatPhone(phone) {
        const cleaned = phone.replace(/[\s-]/g, '');
        if (cleaned.startsWith('+27')) {
            return cleaned.replace(/(\+27)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4');
        }
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    },

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} Whether email is valid
     */
    isValidEmail(email) {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    },

    /**
     * Get initials from name
     * @param {string} name - Full name
     * @returns {string} Initials (max 2 chars)
     */
    getInitials(name) {
        if (!name) return '?';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].charAt(0).toUpperCase();
        }
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    },

    /**
     * Capitalize first letter of each word
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalize(str) {
        return str.replace(/\b\w/g, char => char.toUpperCase());
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in ms
     * @returns {Function} Throttled function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Check if a payment is late (after grace period)
     * @param {Date} paymentDate - Date of payment
     * @returns {boolean} Whether payment is late
     */
    isPaymentLate(paymentDate) {
        const graceEnd = APP_SETTINGS?.graceperiodEndDay || 7;
        return paymentDate.getDate() > graceEnd;
    },

    /**
     * Calculate if member qualifies for interest
     * @param {number} totalSavings - Total savings amount
     * @returns {boolean} Whether member qualifies
     */
    qualifiesForInterest(totalSavings) {
        const minAmount = APP_SETTINGS?.interestEligibilityMin || 10000;
        return totalSavings >= minAmount;
    },

    /**
     * Get payment status based on amount
     * @param {number} amount - Amount paid in month
     * @returns {string} Status: 'compliant', 'non-compliant', 'skipped'
     */
    getPaymentStatus(amount) {
        const minDeposit = APP_SETTINGS?.minimumDeposit || 300;
        if (amount >= minDeposit) return 'compliant';
        if (amount > 0) return 'non-compliant';
        return 'skipped';
    },

    /**
     * Check if device is mobile
     * @returns {boolean} Whether device is mobile
     */
    isMobile() {
        return window.innerWidth < 768;
    },

    /**
     * Check if device supports touch
     * @returns {boolean} Whether touch is supported
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    /**
     * Scroll to element smoothly
     * @param {string|Element} target - Element or selector
     * @param {number} offset - Offset from top
     */
    scrollTo(target, offset = 0) {
        const element = typeof target === 'string' 
            ? document.querySelector(target) 
            : target;
        
        if (element) {
            const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    },

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    },

    /**
     * Parse query string parameters
     * @param {string} queryString - Query string to parse
     * @returns {object} Parsed parameters
     */
    parseQueryString(queryString = window.location.search) {
        const params = {};
        const searchParams = new URLSearchParams(queryString);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    /**
     * Generate list of months for dropdown
     * @param {number} count - Number of months to generate
     * @returns {Array} Array of month objects
     */
    generateMonthOptions(count = 12) {
        const months = [];
        const now = new Date();
        
        for (let i = 0; i < count; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                value: `${this.getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`,
                label: `${this.getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`,
                month: date.getMonth() + 1,
                year: date.getFullYear()
            });
        }
        
        return months;
    },

    /**
     * Validate file type for upload
     * @param {File} file - File to validate
     * @param {Array} allowedTypes - Allowed MIME types
     * @returns {boolean} Whether file type is valid
     */
    isValidFileType(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']) {
        return allowedTypes.includes(file.type);
    },

    /**
     * Get file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Human readable size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Compress image file
     * @param {File} file - Image file to compress
     * @param {number} maxWidth - Maximum width
     * @param {number} quality - JPEG quality (0-1)
     * @returns {Promise<Blob>} Compressed image blob
     */
    async compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(resolve, 'image/jpeg', quality);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    },

    /**
     * Show loading state on button
     * @param {HTMLButtonElement} button - Button element
     * @param {boolean} loading - Loading state
     */
    setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            button.dataset.originalText = button.innerHTML;
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
            }
        }
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Deep clone an object
     * @param {object} obj - Object to clone
     * @returns {object} Cloned object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Check if online
     * @returns {boolean} Online status
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Storage wrapper with JSON support
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            localStorage.removeItem(key);
        },
        clear() {
            localStorage.clear();
        }
    }
};

// Export for use
window.Utils = Utils;
