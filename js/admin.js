/**
 * Admin Dashboard Logic
 * Handles admin authentication, submissions management, members, and reports
 */

const Admin = (() => {
    // DOM Elements
    let loginSection;
    let dashboardSection;
    let adminLoginForm;
    let tabButtons;
    let tabPanels;

    // State
    let currentSubmission = null;
    let pendingSubmissions = [];
    let verifiedSubmissions = [];
    let members = [];
    let currentTab = 'pending';

    /**
     * Initialize the admin page
     */
    function init() {
        // Cache DOM elements
        loginSection = document.getElementById('adminLogin');
        dashboardSection = document.getElementById('adminDashboard');
        adminLoginForm = document.getElementById('adminLoginForm');
        tabButtons = document.querySelectorAll('.admin-tab');
        tabPanels = document.querySelectorAll('.tab-panel');

        // Initialize app
        App.init();

        // Set up event listeners
        setupEventListeners();

        // Check for existing admin session
        checkAdminSession();
    }

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Admin login form
        adminLoginForm.addEventListener('submit', handleAdminLogin);

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);

        // Tab navigation
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Refresh buttons
        document.getElementById('refreshPending').addEventListener('click', loadPendingSubmissions);

        // Month filter for verified
        document.getElementById('monthFilter').addEventListener('change', loadVerifiedSubmissions);

        // Add member button
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            App.openModal('addMemberModal');
        });

        // Member search
        document.getElementById('memberSearch').addEventListener('input', Utils.debounce(filterMembers, 300));

        // Generate report button
        document.getElementById('generateReportBtn').addEventListener('click', generateReport);

        // Modal close buttons
        document.getElementById('closeSubmissionModal').addEventListener('click', () => {
            App.closeModal('submissionModal');
        });
        document.getElementById('closeDetailBtn').addEventListener('click', () => {
            App.closeModal('submissionModal');
        });
        document.getElementById('closeAddMemberModal').addEventListener('click', () => {
            App.closeModal('addMemberModal');
        });
        document.getElementById('cancelAddMember').addEventListener('click', () => {
            App.closeModal('addMemberModal');
        });
        document.getElementById('closeRejectModal').addEventListener('click', () => {
            App.closeModal('rejectModal');
        });
        document.getElementById('cancelReject').addEventListener('click', () => {
            App.closeModal('rejectModal');
        });

        // Approve/Reject buttons
        document.getElementById('approveBtn').addEventListener('click', handleApprove);
        document.getElementById('rejectBtn').addEventListener('click', () => {
            App.closeModal('submissionModal');
            App.openModal('rejectModal');
        });
        document.getElementById('confirmRejectBtn').addEventListener('click', handleReject);

        // Save member button
        document.getElementById('saveMemberBtn').addEventListener('click', handleAddMember);
    }

    /**
     * Check for existing admin session
     */
    async function checkAdminSession() {
        const isAdmin = await Auth.checkAdminSession();
        if (isAdmin) {
            showDashboard();
            loadDashboardData();
        } else {
            showLogin();
        }
    }

    /**
     * Handle admin login
     */
    async function handleAdminLogin(e) {
        e.preventDefault();

        const codeInput = document.getElementById('adminCode');
        const loginBtn = document.getElementById('loginBtn');

        if (!codeInput.value.trim()) {
            showFieldError(codeInput, 'Please enter the admin code');
            return;
        }

        clearFieldError(codeInput);
        Utils.setButtonLoading(loginBtn, true);

        try {
            const isValid = await Auth.verifyAdminCode(codeInput.value.trim());

            if (isValid) {
                App.showToast('Welcome, Admin!', 'success');
                showDashboard();
                loadDashboardData();
            } else {
                showFieldError(codeInput, 'Invalid admin code');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            App.showToast('Login failed. Please try again.', 'error');
        } finally {
            Utils.setButtonLoading(loginBtn, false);
        }
    }

    /**
     * Handle logout
     */
    async function handleLogout() {
        await Auth.signOutAdmin();
        showLogin();
        document.getElementById('adminCode').value = '';
        App.showToast('Logged out successfully', 'info');
    }

    /**
     * Show login section
     */
    function showLogin() {
        loginSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
    }

    /**
     * Show dashboard section
     */
    function showDashboard() {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
    }

    /**
     * Switch between tabs
     */
    function switchTab(tabId) {
        currentTab = tabId;

        // Update tab buttons
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update panels
        tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabId}Panel`);
        });

        // Load tab-specific data
        switch (tabId) {
            case 'pending':
                loadPendingSubmissions();
                break;
            case 'verified':
                loadVerifiedSubmissions();
                break;
            case 'members':
                loadMembers();
                break;
            case 'reports':
                loadReportsData();
                break;
        }
    }

    /**
     * Load all dashboard data
     */
    async function loadDashboardData() {
        try {
            // Load stats
            const stats = await Database.getDashboardStats();
            updateDashboardStats(stats);

            // Load data for current tab
            switchTab(currentTab);

            // Populate month filter
            populateMonthFilter();

            // Populate report month dropdown
            populateReportMonths();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            App.showToast('Failed to load some data', 'warning');
        }
    }

    /**
     * Update dashboard statistics
     */
    function updateDashboardStats(stats) {
        document.getElementById('statTotalMembers').textContent = stats.totalMembers || 0;
        document.getElementById('statTotalSavings').textContent = Utils.formatCurrency(stats.totalSavings || 0);
        document.getElementById('statPending').textContent = stats.pendingCount || 0;
        document.getElementById('statInterestPool').textContent = Utils.formatCurrency(stats.interestPool || 0);
        document.getElementById('pendingBadge').textContent = stats.pendingCount || 0;
    }

    /**
     * Load pending submissions
     */
    async function loadPendingSubmissions() {
        const listEl = document.getElementById('pendingList');
        const emptyEl = document.getElementById('pendingEmpty');

        // Show loading
        listEl.innerHTML = `
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
        `;
        emptyEl.style.display = 'none';

        try {
            pendingSubmissions = await Database.getPendingSubmissions();

            listEl.innerHTML = '';

            if (pendingSubmissions.length === 0) {
                emptyEl.style.display = 'flex';
                document.getElementById('pendingBadge').textContent = '0';
                return;
            }

            document.getElementById('pendingBadge').textContent = pendingSubmissions.length;

            pendingSubmissions.forEach(sub => {
                listEl.appendChild(createPendingCard(sub));
            });

        } catch (error) {
            console.error('Error loading pending submissions:', error);
            listEl.innerHTML = `
                <div class="error-state">
                    <p>Failed to load submissions</p>
                    <button class="btn btn-ghost btn-sm" onclick="Admin.loadPendingSubmissions()">Try again</button>
                </div>
            `;
        }
    }

    /**
     * Create pending submission card
     */
    function createPendingCard(submission) {
        const card = document.createElement('div');
        card.className = 'pending-card';
        card.onclick = () => openSubmissionDetail(submission);

        const submittedAt = Utils.formatDate(
            submission.submittedAt?.toDate?.() || submission.submittedAt,
            'relative'
        );

        card.innerHTML = `
            <div class="pending-card-header">
                <div class="pending-member">
                    <span class="member-avatar">${Utils.getInitials(submission.name)}</span>
                    <div class="member-info">
                        <span class="member-name">${Utils.escapeHtml(submission.name)}</span>
                        <span class="member-phone">${Utils.formatPhone(submission.phone)}</span>
                    </div>
                </div>
                <span class="badge badge-warning">Pending</span>
            </div>
            <div class="pending-card-body">
                <div class="pending-amount">${Utils.formatCurrency(submission.amount)}</div>
                <div class="pending-meta">
                    <span>${submission.paymentMonth}</span>
                    ${submission.fineAmount ? `<span class="fine-badge">+R${submission.fineAmount} fine</span>` : ''}
                </div>
            </div>
            <div class="pending-card-footer">
                <span class="submitted-at">${submittedAt}</span>
                <span class="view-link">View details →</span>
            </div>
        `;

        return card;
    }

    /**
     * Open submission detail modal
     */
    function openSubmissionDetail(submission) {
        currentSubmission = submission;

        // Populate modal fields
        document.getElementById('detailName').textContent = submission.name;
        document.getElementById('detailPhone').textContent = Utils.formatPhone(submission.phone);
        document.getElementById('detailAmount').textContent = Utils.formatCurrency(submission.amount);
        document.getElementById('detailPaymentDate').textContent = Utils.formatDate(
            submission.paymentDate?.toDate?.() || submission.paymentDate,
            'long'
        );
        document.getElementById('detailPaymentMonth').textContent = submission.paymentMonth;
        document.getElementById('detailMethod').textContent = getPaymentMethodLabel(submission.paymentMethod);
        document.getElementById('detailReference').textContent = submission.reference;
        document.getElementById('detailSubmittedAt').textContent = Utils.formatDate(
            submission.submittedAt?.toDate?.() || submission.submittedAt,
            'long'
        );

        // Show/hide fine row
        const fineRow = document.getElementById('detailFineRow');
        if (submission.fineAmount) {
            fineRow.style.display = 'flex';
            document.getElementById('detailFine').textContent = Utils.formatCurrency(submission.fineAmount);
        } else {
            fineRow.style.display = 'none';
        }

        // Show/hide notes
        const notesSection = document.getElementById('notesSection');
        if (submission.notes) {
            notesSection.style.display = 'block';
            document.getElementById('detailNotes').textContent = submission.notes;
        } else {
            notesSection.style.display = 'none';
        }

        // Load proof image
        loadProofImage(submission.proofURL);

        // Show/hide action buttons based on status
        const approveBtn = document.getElementById('approveBtn');
        const rejectBtn = document.getElementById('rejectBtn');
        if (submission.status === 'pending') {
            approveBtn.style.display = 'inline-flex';
            rejectBtn.style.display = 'inline-flex';
        } else {
            approveBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
        }

        App.openModal('submissionModal');
    }

    /**
     * Load proof image
     */
    function loadProofImage(url) {
        const proofImage = document.getElementById('proofImage');
        const proofViewer = document.getElementById('proofViewer');

        proofViewer.classList.add('loading');
        proofImage.style.display = 'none';

        proofImage.onload = () => {
            proofViewer.classList.remove('loading');
            proofImage.style.display = 'block';
        };

        proofImage.onerror = () => {
            proofViewer.classList.remove('loading');
            proofViewer.innerHTML = `
                <div class="proof-error">
                    <p>Failed to load proof image</p>
                    <a href="${url}" target="_blank" class="btn btn-ghost btn-sm">Open in new tab</a>
                </div>
            `;
        };

        proofImage.src = url;
    }

    /**
     * Handle submission approval
     */
    async function handleApprove() {
        if (!currentSubmission) return;

        const confirmed = await App.showConfirmModal({
            title: 'Approve Submission',
            message: `Approve ${Utils.formatCurrency(currentSubmission.amount)} payment from ${currentSubmission.name}?`,
            confirmText: 'Approve',
            type: 'success'
        });

        if (!confirmed) return;

        const approveBtn = document.getElementById('approveBtn');
        Utils.setButtonLoading(approveBtn, true);

        try {
            // Find or create member
            let member = await Auth.lookupMember(currentSubmission.name, currentSubmission.phone);
            let memberId;

            if (!member) {
                // Create new member
                memberId = await Database.addMember({
                    name: currentSubmission.name,
                    phone: currentSubmission.phone
                });
            } else {
                memberId = member.id;
            }

            // Approve submission
            await Database.approveSubmission(currentSubmission.id, memberId);

            // Log admin action
            await Auth.logAdminAction('approve_submission', {
                submissionId: currentSubmission.id,
                memberId: memberId,
                amount: currentSubmission.amount,
                reference: currentSubmission.reference
            });

            App.showToast('Payment approved successfully!', 'success');
            App.closeModal('submissionModal');

            // Refresh data
            loadDashboardData();

        } catch (error) {
            console.error('Approval error:', error);
            App.showToast('Failed to approve. Please try again.', 'error');
        } finally {
            Utils.setButtonLoading(approveBtn, false);
        }
    }

    /**
     * Handle submission rejection
     */
    async function handleReject() {
        if (!currentSubmission) return;

        const reasonInput = document.getElementById('rejectReason');
        const reason = reasonInput.value.trim();

        if (!reason) {
            App.showToast('Please provide a reason for rejection', 'warning');
            return;
        }

        const rejectBtn = document.getElementById('confirmRejectBtn');
        Utils.setButtonLoading(rejectBtn, true);

        try {
            await Database.rejectSubmission(currentSubmission.id, reason);

            // Log admin action
            await Auth.logAdminAction('reject_submission', {
                submissionId: currentSubmission.id,
                reference: currentSubmission.reference,
                reason: reason
            });

            App.showToast('Submission rejected', 'info');
            App.closeModal('rejectModal');
            reasonInput.value = '';

            // Refresh data
            loadDashboardData();

        } catch (error) {
            console.error('Rejection error:', error);
            App.showToast('Failed to reject. Please try again.', 'error');
        } finally {
            Utils.setButtonLoading(rejectBtn, false);
        }
    }

    /**
     * Load verified submissions
     */
    async function loadVerifiedSubmissions() {
        const listEl = document.getElementById('verifiedList');
        const emptyEl = document.getElementById('verifiedEmpty');
        const monthFilter = document.getElementById('monthFilter').value;

        listEl.innerHTML = `
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
        `;
        emptyEl.style.display = 'none';

        try {
            const filters = monthFilter ? { month: monthFilter } : {};
            verifiedSubmissions = await Database.getVerifiedSubmissions(filters);

            listEl.innerHTML = '';

            if (verifiedSubmissions.length === 0) {
                emptyEl.style.display = 'flex';
                return;
            }

            verifiedSubmissions.forEach(sub => {
                listEl.appendChild(createVerifiedCard(sub));
            });

        } catch (error) {
            console.error('Error loading verified submissions:', error);
            listEl.innerHTML = `
                <div class="error-state">
                    <p>Failed to load verified payments</p>
                </div>
            `;
        }
    }

    /**
     * Create verified submission card
     */
    function createVerifiedCard(submission) {
        const card = document.createElement('div');
        card.className = 'verified-card';
        card.onclick = () => openSubmissionDetail(submission);

        const verifiedAt = Utils.formatDate(
            submission.verifiedAt?.toDate?.() || submission.verifiedAt,
            'medium'
        );

        card.innerHTML = `
            <div class="verified-card-header">
                <div class="pending-member">
                    <span class="member-avatar">${Utils.getInitials(submission.name)}</span>
                    <div class="member-info">
                        <span class="member-name">${Utils.escapeHtml(submission.name)}</span>
                        <span class="member-phone">${Utils.formatPhone(submission.phone)}</span>
                    </div>
                </div>
                <span class="badge badge-success">Verified</span>
            </div>
            <div class="verified-card-body">
                <div class="verified-amount">${Utils.formatCurrency(submission.amount)}</div>
                <div class="verified-month">${submission.paymentMonth}</div>
            </div>
            <div class="verified-card-footer">
                <span>Verified: ${verifiedAt}</span>
            </div>
        `;

        return card;
    }

    /**
     * Load members
     */
    async function loadMembers() {
        const listEl = document.getElementById('membersList');

        listEl.innerHTML = `
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
        `;

        try {
            members = await Database.getMembers();

            renderMembers(members);
            updateMembersSummary(members);

        } catch (error) {
            console.error('Error loading members:', error);
            listEl.innerHTML = `
                <div class="error-state">
                    <p>Failed to load members</p>
                </div>
            `;
        }
    }

    /**
     * Render members list
     */
    function renderMembers(membersList) {
        const listEl = document.getElementById('membersList');
        listEl.innerHTML = '';

        if (membersList.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <p>No members found</p>
                </div>
            `;
            return;
        }

        membersList.forEach(member => {
            listEl.appendChild(createMemberCard(member));
        });
    }

    /**
     * Create member card
     */
    function createMemberCard(member) {
        const card = document.createElement('div');
        card.className = 'member-card';

        const statusClass = member.status === 'suspended' ? 'error' : 'success';

        card.innerHTML = `
            <div class="member-card-header">
                <div class="pending-member">
                    <span class="member-avatar">${Utils.getInitials(member.name)}</span>
                    <div class="member-info">
                        <span class="member-name">${Utils.escapeHtml(member.name)}</span>
                        <span class="member-phone">${Utils.formatPhone(member.phone)}</span>
                    </div>
                </div>
                <span class="badge badge-${statusClass}">${member.status || 'Active'}</span>
            </div>
            <div class="member-card-stats">
                <div class="member-stat">
                    <span class="stat-label">Submissions</span>
                    <span class="stat-value">${member.verifiedCount || 0}</span>
                </div>
                <div class="member-stat">
                    <span class="stat-label">Saved</span>
                    <span class="stat-value">${Utils.formatCurrency(member.totalSavings || 0)}</span>
                </div>
                <div class="member-stat">
                    <span class="stat-label">Fines</span>
                    <span class="stat-value">${Utils.formatCurrency(member.totalFines || 0)}</span>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Update members summary
     */
    function updateMembersSummary(membersList) {
        const totalMembers = membersList.length;
        const totalSaved = membersList.reduce((sum, m) => sum + (m.totalSavings || 0), 0);
        const totalFines = membersList.reduce((sum, m) => sum + (m.totalFines || 0), 0);

        document.getElementById('summaryTotalMembers').textContent = totalMembers;
        document.getElementById('summaryTotalSaved').textContent = Utils.formatCurrency(totalSaved);
        document.getElementById('summaryTotalFines').textContent = Utils.formatCurrency(totalFines);
    }

    /**
     * Filter members by search query
     */
    function filterMembers() {
        const query = document.getElementById('memberSearch').value.toLowerCase().trim();

        if (!query) {
            renderMembers(members);
            return;
        }

        const filtered = members.filter(m =>
            m.name.toLowerCase().includes(query) ||
            m.phone.includes(query)
        );

        renderMembers(filtered);
    }

    /**
     * Handle add member
     */
    async function handleAddMember() {
        const form = document.getElementById('addMemberForm');
        const formData = new FormData(form);
        const saveBtn = document.getElementById('saveMemberBtn');

        // Validate
        const name = formData.get('name')?.trim();
        const phone = formData.get('phone')?.trim();

        if (!name) {
            showFieldError(document.getElementById('newMemberName'), 'Name is required');
            return;
        }

        if (!phone || !Utils.isValidPhone(phone)) {
            showFieldError(document.getElementById('newMemberPhone'), 'Valid phone number is required');
            return;
        }

        Utils.setButtonLoading(saveBtn, true);

        try {
            // Check if member already exists
            const existing = await Auth.lookupMember(name, phone);
            if (existing) {
                App.showToast('Member already exists', 'warning');
                Utils.setButtonLoading(saveBtn, false);
                return;
            }

            // Add member
            await Database.addMember({
                name: name,
                phone: phone,
                email: formData.get('email')?.trim() || '',
                notes: formData.get('notes')?.trim() || ''
            });

            // Log admin action
            await Auth.logAdminAction('add_member', {
                name: name,
                phone: phone
            });

            App.showToast('Member added successfully!', 'success');
            App.closeModal('addMemberModal');
            form.reset();

            // Refresh members list
            loadMembers();
            loadDashboardData();

        } catch (error) {
            console.error('Add member error:', error);
            App.showToast('Failed to add member. Please try again.', 'error');
        } finally {
            Utils.setButtonLoading(saveBtn, false);
        }
    }

    /**
     * Load reports data
     */
    async function loadReportsData() {
        try {
            const stats = await Database.getDashboardStats();

            document.getElementById('reportTotalSubs').textContent = stats.totalSubmissions || 0;
            document.getElementById('reportTotalAmount').textContent = Utils.formatCurrency(stats.totalSavings || 0);
            document.getElementById('reportPendingCount').textContent = stats.pendingCount || 0;
            document.getElementById('reportVerifiedCount').textContent = stats.verifiedCount || 0;

        } catch (error) {
            console.error('Error loading reports data:', error);
        }
    }

    /**
     * Generate and download report
     */
    async function generateReport() {
        const month = document.getElementById('reportMonth').value;
        const reportType = document.querySelector('input[name="reportType"]:checked')?.value || 'summary';

        if (!month) {
            App.showToast('Please select a month', 'warning');
            return;
        }

        const generateBtn = document.getElementById('generateReportBtn');
        Utils.setButtonLoading(generateBtn, true);

        try {
            const [year, monthNum] = month.split('-');
            const reportData = await Database.generateMonthlyReport(parseInt(monthNum), parseInt(year));

            // Generate CSV content
            let csvContent = '';

            if (reportType === 'summary') {
                csvContent = generateSummaryReport(reportData, month);
            } else if (reportType === 'detailed') {
                csvContent = generateDetailedReport(reportData, month);
            } else {
                csvContent = generateComplianceReport(reportData, month);
            }

            // Download file
            downloadCSV(csvContent, `${reportType}-report-${month}.csv`);

            // Log admin action
            await Auth.logAdminAction('generate_report', {
                month: month,
                type: reportType
            });

            App.showToast('Report downloaded!', 'success');

        } catch (error) {
            console.error('Report generation error:', error);
            App.showToast('Failed to generate report', 'error');
        } finally {
            Utils.setButtonLoading(generateBtn, false);
        }
    }

    /**
     * Generate summary report CSV
     */
    function generateSummaryReport(data, month) {
        const lines = [
            'Tshikota Ro Farana Stokvel - Summary Report',
            `Month: ${month}`,
            `Generated: ${new Date().toLocaleString()}`,
            '',
            'SUMMARY',
            `Total Members,${data.totalMembers}`,
            `Total Submissions,${data.totalSubmissions}`,
            `Total Amount,R ${data.totalAmount}`,
            `Pending Review,${data.pendingCount}`,
            `Verified,${data.verifiedCount}`,
            `Total Fines Collected,R ${data.totalFines}`,
            '',
            'Note: This is a summary report. For detailed transactions use the Detailed Transactions report.'
        ];

        return lines.join('\n');
    }

    /**
     * Generate detailed report CSV
     */
    function generateDetailedReport(data, month) {
        const headers = 'Name,Phone,Amount,Payment Date,Method,Fine,Status,Reference';
        const rows = data.submissions.map(s => {
            const paymentDate = Utils.formatDate(s.paymentDate?.toDate?.() || s.paymentDate, 'short');
            return `"${s.name}",${s.phone},R ${s.amount},${paymentDate},${s.paymentMethod},R ${s.fineAmount || 0},${s.status},${s.reference}`;
        });

        return [
            'Tshikota Ro Farana Stokvel - Detailed Transactions',
            `Month: ${month}`,
            `Generated: ${new Date().toLocaleString()}`,
            '',
            headers,
            ...rows
        ].join('\n');
    }

    /**
     * Generate compliance report CSV
     */
    function generateComplianceReport(data, month) {
        const headers = 'Name,Phone,Status,Total Saved,Total Fines,Interest Eligible';
        const rows = data.members.map(m => {
            const eligible = (m.totalSavings || 0) >= APP_SETTINGS.interestThreshold ? 'Yes' : 'No';
            return `"${m.name}",${m.phone},${m.status || 'Active'},R ${m.totalSavings || 0},R ${m.totalFines || 0},${eligible}`;
        });

        return [
            'Tshikota Ro Farana Stokvel - Compliance Report',
            `Month: ${month}`,
            `Generated: ${new Date().toLocaleString()}`,
            '',
            headers,
            ...rows
        ].join('\n');
    }

    /**
     * Download CSV file
     */
    function downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    /**
     * Populate month filter dropdown
     */
    function populateMonthFilter() {
        const select = document.getElementById('monthFilter');
        const options = Utils.generateMonthOptions(12);

        // Clear existing options except first
        while (select.options.length > 1) {
            select.remove(1);
        }

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });
    }

    /**
     * Populate report month dropdown
     */
    function populateReportMonths() {
        const select = document.getElementById('reportMonth');
        const options = Utils.generateMonthOptions(12);

        select.innerHTML = '<option value="">Select month</option>';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });
    }

    /**
     * Get payment method display label
     */
    function getPaymentMethodLabel(method) {
        const labels = {
            'eft': 'EFT / Bank Transfer',
            'cash': 'Cash Deposit',
            'ewallet': 'eWallet',
            'other': 'Other'
        };
        return labels[method] || method;
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
        loadPendingSubmissions,
        loadVerifiedSubmissions,
        loadMembers,
        switchTab
    };
})();
