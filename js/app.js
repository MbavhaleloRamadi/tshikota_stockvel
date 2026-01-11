/**
 * =====================================================
 * TSHIKOTA RO FARANA - MAIN APP
 * =====================================================
 * Application initialization and common UI functions
 */

const App = {
    /**
     * Initialize the application
     */
    init() {
        // Initialize authentication
        Auth.init();
        
        // Set up global event listeners
        this.setupGlobalListeners();
        
        // Initialize toast container
        this.initToastContainer();
        
        // Check online status
        this.setupOnlineStatusListener();
        
        console.log('🚀 Tshikota Ro Farana App Initialized');
    },

    /**
     * Set up global event listeners
     */
    setupGlobalListeners() {
        // Handle all link clicks with navigation confirmation if needed
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-confirm]');
            if (link) {
                e.preventDefault();
                const message = link.dataset.confirm || 'Are you sure you want to leave?';
                if (confirm(message)) {
                    window.location.href = link.href;
                }
            }
        });

        // Handle form submissions with Enter key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                const form = e.target.closest('form');
                if (form) {
                    const submitBtn = form.querySelector('[type="submit"]');
                    if (submitBtn && !submitBtn.disabled) {
                        e.preventDefault();
                        submitBtn.click();
                    }
                }
            }
        });

        // Handle escape key for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Handle back/forward navigation
        window.addEventListener('popstate', () => {
            this.closeAllModals();
        });
    },

    /**
     * Initialize toast notification container
     */
    initToastContainer() {
        if (!document.querySelector('.toast-container')) {
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    },

    /**
     * Set up online status listener
     */
    setupOnlineStatusListener() {
        window.addEventListener('online', () => {
            this.showToast('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            this.showToast('You are offline. Some features may not work.', 'warning');
        });
    },

    /**
     * ==========================================
     * MODAL FUNCTIONS
     * ==========================================
     */

    /**
     * Open a modal
     * @param {string} modalId - Modal element ID
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Focus first focusable element
            setTimeout(() => {
                const focusable = modal.querySelector('input, button, [tabindex]:not([tabindex="-1"])');
                if (focusable) focusable.focus();
            }, 100);
        }
    },

    /**
     * Close a modal
     * @param {string} modalId - Modal element ID
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    /**
     * Close all open modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    },

    /**
     * Show success modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {string} reference - Reference code (optional)
     * @param {Function} onClose - Callback when modal closes
     */
    showSuccessModal(title, message, reference = null, onClose = null) {
        // Remove existing success modal if any
        const existing = document.getElementById('success-modal');
        if (existing) existing.remove();

        const modalHtml = `
            <div id="success-modal" class="modal-overlay active">
                <div class="modal">
                    <div class="modal-body modal-success">
                        <div class="modal-success-icon">✓</div>
                        <h2 class="modal-success-title">${Utils.escapeHtml(title)}</h2>
                        <p class="modal-success-message">${Utils.escapeHtml(message)}</p>
                        ${reference ? `<div class="modal-success-ref">Ref: ${Utils.escapeHtml(reference)}</div>` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="App.handleSuccessModalClose()">Done</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';

        // Store callback
        this._successModalCallback = onClose;
    },

    /**
     * Handle success modal close
     */
    handleSuccessModalClose() {
        this.closeModal('success-modal');
        const modal = document.getElementById('success-modal');
        if (modal) modal.remove();
        
        if (this._successModalCallback) {
            this._successModalCallback();
            this._successModalCallback = null;
        }
    },

    /**
     * Show confirmation modal
     * @param {object} options - Modal options
     * @returns {Promise<boolean>} User's choice
     */
    showConfirmModal(options) {
        const { 
            title = 'Confirm', 
            message = 'Are you sure?', 
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'warning' // 'warning' or 'danger'
        } = options;

        return new Promise((resolve) => {
            // Remove existing confirm modal if any
            const existing = document.getElementById('confirm-modal');
            if (existing) existing.remove();

            const icon = type === 'danger' ? '⚠️' : '❓';
            const btnClass = type === 'danger' ? 'btn-danger' : 'btn-primary';

            const modalHtml = `
                <div id="confirm-modal" class="modal-overlay active">
                    <div class="modal">
                        <div class="modal-body">
                            <div class="confirm-dialog">
                                <div class="confirm-icon ${type}">${icon}</div>
                                <h3 class="confirm-title">${Utils.escapeHtml(title)}</h3>
                                <p class="confirm-message">${Utils.escapeHtml(message)}</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-ghost" id="confirm-cancel">${Utils.escapeHtml(cancelText)}</button>
                            <button class="btn ${btnClass}" id="confirm-ok">${Utils.escapeHtml(confirmText)}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.body.style.overflow = 'hidden';

            const modal = document.getElementById('confirm-modal');
            const cancelBtn = document.getElementById('confirm-cancel');
            const okBtn = document.getElementById('confirm-ok');

            const cleanup = (result) => {
                modal.remove();
                document.body.style.overflow = '';
                resolve(result);
            };

            cancelBtn.addEventListener('click', () => cleanup(false));
            okBtn.addEventListener('click', () => cleanup(true));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cleanup(false);
            });
        });
    },

    /**
     * ==========================================
     * TOAST NOTIFICATIONS
     * ==========================================
     */

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (default 3000)
     */
    showToast(message, type = 'info', duration = 3000) {
        const container = document.querySelector('.toast-container');
        if (!container) return;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${Utils.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        // Remove after duration
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * ==========================================
     * LOADING STATES
     * ==========================================
     */

    /**
     * Show page loading overlay
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        // Remove existing loader
        this.hideLoading();

        const loader = document.createElement('div');
        loader.id = 'page-loader';
        loader.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p class="loading-text">${Utils.escapeHtml(message)}</p>
            </div>
        `;
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        document.body.appendChild(loader);
    },

    /**
     * Hide page loading overlay
     */
    hideLoading() {
        const loader = document.getElementById('page-loader');
        if (loader) loader.remove();
    },

    /**
     * ==========================================
     * TAB FUNCTIONALITY
     * ==========================================
     */

    /**
     * Initialize tabs
     * @param {string} containerId - Tabs container ID
     * @param {Function} onTabChange - Callback when tab changes
     */
    initTabs(containerId, onTabChange = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const tabs = container.querySelectorAll('.tab-btn');
        const contents = container.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;

                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update content
                contents.forEach(content => {
                    if (content.id === `${target}-content`) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });

                // Callback
                if (onTabChange) {
                    onTabChange(target);
                }
            });
        });
    },

    /**
     * Set active tab programmatically
     * @param {string} containerId - Tabs container ID
     * @param {string} tabId - Tab to activate
     */
    setActiveTab(containerId, tabId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const tab = container.querySelector(`[data-tab="${tabId}"]`);
        if (tab) tab.click();
    },

    /**
     * ==========================================
     * FORM HELPERS
     * ==========================================
     */

    /**
     * Validate a form and return data
     * @param {HTMLFormElement} form - Form element
     * @returns {object|null} Form data or null if invalid
     */
    validateForm(form) {
        const data = {};
        let isValid = true;

        // Clear previous errors
        form.querySelectorAll('.form-error').forEach(err => err.remove());
        form.querySelectorAll('.form-input.error').forEach(input => {
            input.classList.remove('error');
        });

        // Validate each required field
        form.querySelectorAll('[required]').forEach(field => {
            const value = field.value.trim();
            
            if (!value) {
                this.showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                // Type-specific validation
                if (field.type === 'email' && !Utils.isValidEmail(value)) {
                    this.showFieldError(field, 'Please enter a valid email');
                    isValid = false;
                } else if (field.type === 'tel' && !Utils.isValidPhone(value)) {
                    this.showFieldError(field, 'Please enter a valid phone number');
                    isValid = false;
                } else if (field.type === 'number') {
                    const num = parseFloat(value);
                    if (isNaN(num) || (field.min && num < parseFloat(field.min))) {
                        this.showFieldError(field, `Minimum value is ${field.min}`);
                        isValid = false;
                    }
                }
            }

            data[field.name] = value;
        });

        // Get non-required fields too
        form.querySelectorAll('input:not([required]), select:not([required]), textarea:not([required])').forEach(field => {
            if (field.name) {
                data[field.name] = field.value.trim();
            }
        });

        return isValid ? data : null;
    },

    /**
     * Show field error
     * @param {HTMLElement} field - Form field
     * @param {string} message - Error message
     */
    showFieldError(field, message) {
        field.classList.add('error');
        
        const error = document.createElement('p');
        error.className = 'form-error';
        error.textContent = message;
        
        field.parentNode.appendChild(error);
    },

    /**
     * Reset form and clear errors
     * @param {HTMLFormElement} form - Form element
     */
    resetForm(form) {
        form.reset();
        form.querySelectorAll('.form-error').forEach(err => err.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    },

    /**
     * ==========================================
     * UTILITY WRAPPERS
     * ==========================================
     */

    /**
     * Format currency (wrapper)
     */
    formatCurrency: (amount) => Utils.formatCurrency(amount),

    /**
     * Format date (wrapper)
     */
    formatDate: (date, format) => Utils.formatDate(date, format),

    /**
     * Get initials (wrapper)
     */
    getInitials: (name) => Utils.getInitials(name)
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use
window.App = App;
