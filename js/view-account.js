/**
 * View Account Page Logic
 * Handles member login and account dashboard display
 */

const ViewAccount = (() => {
    // DOM Elements
    let loginSection;
    let dashboardSection;
    let loginForm;
    let logoutBtn;

    // State
    let currentMember = null;
    let memberSubmissions = [];

    /**
     * Initialize the page
     */
    function init() {
        // Cache DOM elements
        loginSection = document.getElementById('loginSection');
        dashboardSection = document.getElementById('dashboardSection');
        loginForm = document.getElementById('loginForm');
        logoutBtn = document.getElementById('logoutBtn');

        // Initialize app
        App.init();

        // Set up event listeners
        setupEventListeners();

        // Check for existing session
        checkSession();
    }

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Login form submission
        loginForm.addEventListener('submit', handleLogin);

        // Logout button
        logoutBtn.addEventListener('click', handleLogout);

        // Refresh submissions
        document.getElementById('refreshSubmissions').addEventListener('click', loadSubmissions);

        // Phone number formatting
        document.getElementById('memberPhone').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });
    }

    /**
     * Check for existing member session
     */
    function checkSession() {
        const session = Auth.getMemberSession();
        if (session && session.phone) {
            // Try to restore session
            currentMember = session;
            showDashboard();
            loadAccountData();
        } else {
            showLogin();
        }
    }

    /**
     * Handle member login
     */
    async function handleLogin(e) {
        e.preventDefault();

        const nameInput = document.getElementById('memberName');
        const phoneInput = document.getElementById('memberPhone');
        const submitBtn = document.getElementById('viewAccountBtn');

        // Validate inputs
        let isValid = true;

        if (!nameInput.value.trim()) {
            showFieldError(nameInput, 'Please enter your name');
            isValid = false;
        } else {
            clearFieldError(nameInput);
        }

        if (!phoneInput.value.trim()) {
            showFieldError(phoneInput, 'Please enter your phone number');
            isValid = false;
        } else if (!Utils.isValidPhone(phoneInput.value)) {
            showFieldError(phoneInput, 'Please enter a valid 10-digit phone number');
            isValid = false;
        } else {
            clearFieldError(phoneInput);
        }

        if (!isValid) return;

        // Start loading
        Utils.setButtonLoading(submitBtn, true);

        try {
            // Look up member
            const member = await Auth.lookupMember(
                nameInput.value.trim(),
                phoneInput.value.trim()
            );

            if (member) {
                currentMember = member;
                Auth.setMemberSession(member);
                showDashboard();
                await loadAccountData();
            } else {
                // Member not found - but still allow them to view with phone
                currentMember = {
                    name: nameInput.value.trim(),
                    phone: phoneInput.value.trim()
                };
                Auth.setMemberSession(currentMember);
                showDashboard();
                await loadAccountData();
            }

        } catch (error) {
            console.error('Login error:', error);
            App.showToast('Failed to load account. Please try again.', 'error');
        } finally {
            Utils.setButtonLoading(submitBtn, false);
        }
    }

    /**
     * Handle logout
     */
    function handleLogout() {
        Auth.clearMemberSession();
        currentMember = null;
        memberSubmissions = [];
        showLogin();
        loginForm.reset();
        App.showToast('Logged out successfully', 'info');
    }

    /**
     * Show login section
     */
    function showLogin() {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        logoutBtn.style.display = 'none';
    }

    /**
     * Show dashboard section
     */
    function showDashboard() {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        logoutBtn.style.display = 'block';

        // Update welcome header
        if (currentMember) {
            document.getElementById('memberDisplayName').textContent = currentMember.name;
            document.getElementById('memberAvatar').textContent = Utils.getInitials(currentMember.name);
            
            // Update status badge
            const statusEl = document.getElementById('memberStatus');
            if (currentMember.status === 'suspended') {
                statusEl.textContent = 'Suspended';
                statusEl.classList.add('suspended');
            } else {
                statusEl.textContent = 'Active Member';
                statusEl.classList.remove('suspended');
            }
        }
    }

    /**
     * Load all account data
     */
    async function loadAccountData() {
        try {
            // Load stats
            await loadStats();

            // Load submissions
            await loadSubmissions();

            // Load stokvel total
            await loadStokvelTotal();

        } catch (error) {
            console.error('Error loading account data:', error);
            App.showToast('Some data could not be loaded', 'warning');
        }
    }

    /**
     * Load member stats
     */
    async function loadStats() {
        if (!currentMember?.phone) return;

        try {
            const stats = await Database.getMemberStats(currentMember.phone);

            // Update stat cards
            document.getElementById('totalSaved').textContent = Utils.formatCurrency(stats.totalSavings || 0);
            document.getElementById('totalFines').textContent = Utils.formatCurrency(stats.totalFines || 0);

            // Update summary
            const totalContributions = (stats.totalSavings || 0) + (stats.totalFines || 0);
            document.getElementById('totalContributions').textContent = Utils.formatCurrency(totalContributions);
            document.getElementById('submissionCount').textContent = stats.totalSubmissions || 0;
            document.getElementById('verifiedCount').textContent = stats.verifiedCount || 0;
            document.getElementById('pendingCount').textContent = stats.pendingCount || 0;

            // Update interest eligibility
            updateEligibility(stats.totalSavings || 0);

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    /**
     * Update interest eligibility display
     */
    function updateEligibility(totalSavings) {
        const threshold = APP_SETTINGS.interestThreshold;
        const progress = Math.min((totalSavings / threshold) * 100, 100);
        const isEligible = totalSavings >= threshold;

        const card = document.getElementById('eligibilityCard');
        const icon = document.getElementById('eligibilityIcon');
        const title = document.getElementById('eligibilityTitle');
        const text = document.getElementById('eligibilityText');
        const progressFill = document.getElementById('eligibilityProgress');
        const progressText = document.getElementById('eligibilityProgressText');

        if (isEligible) {
            card.classList.add('eligible');
            title.textContent = 'Interest Eligible! ✓';
            text.textContent = 'You qualify for year-end interest distribution';
            icon.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            `;
        } else {
            card.classList.remove('eligible');
            title.textContent = 'Interest Eligibility';
            text.textContent = `Save ${Utils.formatCurrency(threshold)}+ to qualify for interest`;
        }

        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Utils.formatCurrency(totalSavings)} / ${Utils.formatCurrency(threshold)}`;
    }

    /**
     * Load member submissions
     */
    async function loadSubmissions() {
        if (!currentMember?.phone) return;

        const loadingEl = document.getElementById('submissionsLoading');
        const listEl = document.getElementById('submissionsList');
        const emptyEl = document.getElementById('emptyState');

        // Show loading
        loadingEl.style.display = 'block';
        listEl.innerHTML = '';
        emptyEl.style.display = 'none';

        try {
            memberSubmissions = await Database.getMemberSubmissions(currentMember.phone);

            // Hide loading
            loadingEl.style.display = 'none';

            if (memberSubmissions.length === 0) {
                emptyEl.style.display = 'flex';
                return;
            }

            // Render submissions
            memberSubmissions.forEach(sub => {
                listEl.appendChild(createSubmissionCard(sub));
            });

        } catch (error) {
            console.error('Error loading submissions:', error);
            loadingEl.style.display = 'none';
            listEl.innerHTML = `
                <div class="error-state">
                    <p>Failed to load submissions</p>
                    <button class="btn btn-ghost btn-sm" onclick="ViewAccount.loadSubmissions()">Try again</button>
                </div>
            `;
        }
    }

    /**
     * Create submission card element
     */
    function createSubmissionCard(submission) {
        const card = document.createElement('div');
        card.className = 'submission-card';

        const statusClass = getStatusClass(submission.status);
        const statusText = getStatusText(submission.status);
        const paymentDate = Utils.formatDate(submission.paymentDate?.toDate?.() || submission.paymentDate, 'medium');

        card.innerHTML = `
            <div class="submission-header">
                <span class="submission-month">${submission.paymentMonth}</span>
                <span class="badge badge-${statusClass}">${statusText}</span>
            </div>
            <div class="submission-body">
                <div class="submission-amount">${Utils.formatCurrency(submission.amount)}</div>
                <div class="submission-date">Paid: ${paymentDate}</div>
                ${submission.fineAmount ? `
                    <div class="submission-fine">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        Late Fee: ${Utils.formatCurrency(submission.fineAmount)}
                    </div>
                ` : ''}
            </div>
            <div class="submission-footer">
                <span class="submission-ref">${submission.reference}</span>
                ${submission.status === 'pending' ? '<span class="submission-pending">Awaiting approval</span>' : ''}
                ${submission.status === 'rejected' ? `<span class="submission-rejected">Reason: ${submission.rejectionReason || 'Not specified'}</span>` : ''}
            </div>
        `;

        return card;
    }

    /**
     * Get status CSS class
     */
    function getStatusClass(status) {
        switch (status) {
            case 'verified':
            case 'approved':
                return 'success';
            case 'pending':
                return 'warning';
            case 'rejected':
                return 'error';
            default:
                return 'default';
        }
    }

    /**
     * Get status display text
     */
    function getStatusText(status) {
        switch (status) {
            case 'verified':
            case 'approved':
                return 'Verified';
            case 'pending':
                return 'Pending';
            case 'rejected':
                return 'Rejected';
            default:
                return status;
        }
    }

    /**
     * Load stokvel total
     */
    async function loadStokvelTotal() {
        try {
            const total = await Database.getStokvelTotal();
            document.getElementById('stokvelTotal').textContent = Utils.formatCurrency(total);
        } catch (error) {
            console.error('Error loading stokvel total:', error);
        }
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

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    // Public API
    return {
        init,
        loadSubmissions,
        handleLogout
    };
})();
