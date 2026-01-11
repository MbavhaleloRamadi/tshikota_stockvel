/**
 * POP Submission Page Logic
 * Handles proof of payment form submission
 */

const SubmitPOP = (() => {
    // DOM Elements
    let form;
    let fileInput;
    let fileUpload;
    let filePreview;
    let previewImage;
    let submitBtn;
    let lateWarning;
    let successModal;

    // State
    let selectedFile = null;
    let previewURL = null;

    /**
     * Initialize the page
     */
    function init() {
        // Cache DOM elements
        form = document.getElementById('pop-form');
        fileInput = document.getElementById('proofFile');
        fileUpload = document.getElementById('fileUpload');
        filePreview = document.getElementById('filePreview');
        previewImage = document.getElementById('previewImage');
        submitBtn = document.getElementById('submitBtn');
        lateWarning = document.getElementById('lateWarning');
        successModal = document.getElementById('successModal');

        // Initialize app
        App.init();

        // Set up event listeners
        setupEventListeners();

        // Populate month dropdown
        populateMonthOptions();

        // Set default date to today
        setDefaultDate();

        // Load banking details from config
        loadBankingDetails();

        // Check for existing session
        checkExistingSession();
    }

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Form submission
        form.addEventListener('submit', handleSubmit);

        // File upload
        fileInput.addEventListener('change', handleFileSelect);
        
        // Drag and drop
        fileUpload.addEventListener('dragover', handleDragOver);
        fileUpload.addEventListener('dragleave', handleDragLeave);
        fileUpload.addEventListener('drop', handleDrop);

        // Remove file button
        document.getElementById('removeFile').addEventListener('click', removeFile);

        // Payment date change - check for late payment
        document.getElementById('paymentDate').addEventListener('change', checkLatePayment);

        // Success modal done button
        document.getElementById('doneBtn').addEventListener('click', () => {
            App.closeModal('successModal');
            resetForm();
        });

        // Copy banking details
        document.querySelectorAll('.copyable').forEach(el => {
            el.addEventListener('click', () => {
                const text = el.dataset.copy || el.textContent.trim();
                Utils.copyToClipboard(text).then(() => {
                    App.showToast('Copied to clipboard!', 'success');
                });
            });
        });

        // Phone number formatting
        document.getElementById('phone').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });

        // Amount validation
        document.getElementById('amount').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value < 300) {
                showFieldWarning(e.target, 'Minimum deposit is R300');
            } else {
                clearFieldWarning(e.target);
            }
        });
    }

    /**
     * Populate month dropdown with options
     */
    function populateMonthOptions() {
        const select = document.getElementById('paymentMonth');
        const options = Utils.generateMonthOptions(12);
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });

        // Select current month by default
        const currentMonth = Utils.getCurrentPaymentMonth();
        select.value = currentMonth;
    }

    /**
     * Set default date to today
     */
    function setDefaultDate() {
        const dateInput = document.getElementById('paymentDate');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.max = today; // Can't select future dates
        
        // Check if today is late
        checkLatePayment();
    }

    /**
     * Load banking details from config
     */
    function loadBankingDetails() {
        const banking = APP_SETTINGS.bankingDetails;
        
        document.getElementById('bankName').textContent = banking.bankName;
        document.getElementById('accountName').textContent = banking.accountName;
        document.getElementById('accountNumber').textContent = banking.accountNumber;
        document.getElementById('accountNumber').dataset.copy = banking.accountNumber;
        document.getElementById('branchCode').textContent = banking.branchCode;
    }

    /**
     * Check for existing member session and pre-fill form
     */
    function checkExistingSession() {
        const session = Auth.getMemberSession();
        if (session) {
            document.getElementById('fullName').value = session.name || '';
            document.getElementById('phone').value = session.phone || '';
        }
    }

    /**
     * Handle file selection
     */
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    }

    /**
     * Handle drag over
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUpload.classList.add('dragover');
    }

    /**
     * Handle drag leave
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUpload.classList.remove('dragover');
    }

    /**
     * Handle file drop
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUpload.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    }

    /**
     * Process selected file
     */
    function processFile(file) {
        // Validate file
        const validation = Storage.validateFile(file);
        if (!validation.valid) {
            showFileError(validation.error);
            return;
        }

        clearFileError();
        selectedFile = file;

        // Show preview
        showFilePreview(file);
    }

    /**
     * Show file preview
     */
    function showFilePreview(file) {
        // Revoke previous preview URL
        if (previewURL) {
            Storage.revokePreviewURL(previewURL);
        }

        // Create preview URL
        previewURL = Storage.createPreviewURL(file);

        // Update preview UI
        if (file.type.startsWith('image/')) {
            previewImage.src = previewURL;
            previewImage.style.display = 'block';
        } else {
            // PDF - show icon
            previewImage.src = 'data:image/svg+xml,' + encodeURIComponent(`
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <text x="12" y="16" font-size="4" fill="#666" text-anchor="middle">PDF</text>
                </svg>
            `);
            previewImage.style.display = 'block';
        }

        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = Utils.formatFileSize(file.size);

        // Show preview, hide upload area
        document.querySelector('.file-upload-content').style.display = 'none';
        filePreview.style.display = 'flex';
        fileUpload.classList.add('has-file');
    }

    /**
     * Remove selected file
     */
    function removeFile() {
        selectedFile = null;
        fileInput.value = '';

        if (previewURL) {
            Storage.revokePreviewURL(previewURL);
            previewURL = null;
        }

        // Reset UI
        previewImage.src = '';
        document.querySelector('.file-upload-content').style.display = 'flex';
        filePreview.style.display = 'none';
        fileUpload.classList.remove('has-file');
    }

    /**
     * Check if payment is late
     */
    function checkLatePayment() {
        const dateInput = document.getElementById('paymentDate');
        const date = new Date(dateInput.value);
        
        if (Utils.isPaymentLate(date)) {
            lateWarning.style.display = 'flex';
        } else {
            lateWarning.style.display = 'none';
        }
    }

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        // Check file
        if (!selectedFile) {
            showFileError('Please upload proof of payment');
            return;
        }

        // Start loading
        Utils.setButtonLoading(submitBtn, true);

        try {
            // Generate reference
            const reference = Utils.generateReference();

            // Upload file
            const proofURL = await Storage.uploadProof(selectedFile, reference, (progress) => {
                // Could update progress UI here
                console.log('Upload progress:', progress);
            });

            // Prepare submission data
            const formData = new FormData(form);
            const submissionData = {
                name: formData.get('fullName').trim(),
                phone: formData.get('phone').trim(),
                amount: parseFloat(formData.get('amount')),
                paymentDate: new Date(formData.get('paymentDate')),
                paymentMonth: formData.get('paymentMonth'),
                paymentMethod: formData.get('paymentMethod'),
                proofURL: proofURL,
                notes: formData.get('notes')?.trim() || '',
                reference: reference
            };

            // Submit to database
            await Database.submitPOP(submissionData);

            // Save member session for convenience
            Auth.setMemberSession({
                name: submissionData.name,
                phone: submissionData.phone
            });

            // Show success modal
            document.getElementById('referenceNumber').textContent = reference;
            App.openModal('successModal');

            // Log success
            console.log('Submission successful:', reference);

        } catch (error) {
            console.error('Submission error:', error);
            App.showToast(error.message || 'Failed to submit. Please try again.', 'error');
        } finally {
            Utils.setButtonLoading(submitBtn, false);
        }
    }

    /**
     * Validate form fields
     */
    function validateForm() {
        let isValid = true;

        // Full name
        const nameInput = document.getElementById('fullName');
        if (!nameInput.value.trim()) {
            showFieldError(nameInput, 'Please enter your full name');
            isValid = false;
        } else if (nameInput.value.trim().length < 2) {
            showFieldError(nameInput, 'Name must be at least 2 characters');
            isValid = false;
        } else {
            clearFieldError(nameInput);
        }

        // Phone number
        const phoneInput = document.getElementById('phone');
        if (!phoneInput.value.trim()) {
            showFieldError(phoneInput, 'Please enter your phone number');
            isValid = false;
        } else if (!Utils.isValidPhone(phoneInput.value)) {
            showFieldError(phoneInput, 'Please enter a valid 10-digit phone number');
            isValid = false;
        } else {
            clearFieldError(phoneInput);
        }

        // Amount
        const amountInput = document.getElementById('amount');
        const amount = parseFloat(amountInput.value);
        if (!amountInput.value || isNaN(amount)) {
            showFieldError(amountInput, 'Please enter the amount paid');
            isValid = false;
        } else if (amount < 1) {
            showFieldError(amountInput, 'Amount must be greater than 0');
            isValid = false;
        } else {
            clearFieldError(amountInput);
        }

        // Payment date
        const dateInput = document.getElementById('paymentDate');
        if (!dateInput.value) {
            showFieldError(dateInput, 'Please select the payment date');
            isValid = false;
        } else {
            clearFieldError(dateInput);
        }

        // Payment month
        const monthSelect = document.getElementById('paymentMonth');
        if (!monthSelect.value) {
            showFieldError(monthSelect, 'Please select the payment month');
            isValid = false;
        } else {
            clearFieldError(monthSelect);
        }

        // Payment method
        const methodSelect = document.getElementById('paymentMethod');
        if (!methodSelect.value) {
            showFieldError(methodSelect, 'Please select payment method');
            isValid = false;
        } else {
            clearFieldError(methodSelect);
        }

        return isValid;
    }

    /**
     * Show field error
     */
    function showFieldError(field, message) {
        field.classList.add('error');
        const errorEl = field.parentElement.querySelector('.form-error');
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    /**
     * Clear field error
     */
    function clearFieldError(field) {
        field.classList.remove('error');
        const errorEl = field.parentElement.querySelector('.form-error');
        if (errorEl) {
            errorEl.textContent = '';
        }
    }

    /**
     * Show field warning (non-blocking)
     */
    function showFieldWarning(field, message) {
        const hint = field.parentElement.querySelector('.form-hint');
        if (hint) {
            hint.textContent = message;
            hint.classList.add('warning');
        }
    }

    /**
     * Clear field warning
     */
    function clearFieldWarning(field) {
        const hint = field.parentElement.querySelector('.form-hint');
        if (hint) {
            hint.classList.remove('warning');
            // Restore original hint
            if (field.id === 'amount') {
                hint.textContent = 'Minimum R300 per month';
            }
        }
    }

    /**
     * Show file error
     */
    function showFileError(message) {
        const errorEl = document.getElementById('fileError');
        if (errorEl) {
            errorEl.textContent = message;
        }
        fileUpload.classList.add('error');
    }

    /**
     * Clear file error
     */
    function clearFileError() {
        const errorEl = document.getElementById('fileError');
        if (errorEl) {
            errorEl.textContent = '';
        }
        fileUpload.classList.remove('error');
    }

    /**
     * Reset form to initial state
     */
    function resetForm() {
        form.reset();
        removeFile();
        clearFileError();
        
        // Clear all field errors
        form.querySelectorAll('.form-input, .form-select').forEach(field => {
            clearFieldError(field);
        });

        // Reset defaults
        setDefaultDate();
        populateMonthOptions();
        checkExistingSession();
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    // Public API
    return {
        init,
        resetForm
    };
})();
