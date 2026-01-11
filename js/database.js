/**
 * =====================================================
 * TSHIKOTA RO FARANA - DATABASE OPERATIONS
 * =====================================================
 * Firestore CRUD operations and business logic
 */

const Database = {
    /**
     * ==========================================
     * MEMBERS OPERATIONS
     * ==========================================
     */

    /**
     * Get all members
     * @returns {Promise<Array>} Array of member objects
     */
    async getMembers() {
        try {
            const snapshot = await db.collection('members')
                .orderBy('name')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Get members error:', error);
            throw error;
        }
    },

    /**
     * Get a single member by ID
     * @param {string} memberId - Member document ID
     * @returns {Promise<object|null>} Member data
     */
    async getMember(memberId) {
        try {
            const doc = await db.collection('members').doc(memberId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Get member error:', error);
            throw error;
        }
    },

    /**
     * Add a new member
     * @param {object} memberData - Member data
     * @returns {Promise<string>} New member ID
     */
    async addMember(memberData) {
        try {
            const docRef = await db.collection('members').add({
                ...memberData,
                phone: memberData.phone.replace(/[\s-]/g, ''),
                totalSavings: 0,
                totalFines: 0,
                submissionCount: 0,
                verifiedCount: 0,
                status: 'active',
                skippedMonths: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Log action
            await Auth.logAdminAction('member_added', {
                memberId: docRef.id,
                memberName: memberData.name
            });
            
            return docRef.id;
        } catch (error) {
            console.error('Add member error:', error);
            throw error;
        }
    },

    /**
     * Update a member
     * @param {string} memberId - Member ID
     * @param {object} updates - Fields to update
     */
    async updateMember(memberId, updates) {
        try {
            await db.collection('members').doc(memberId).update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await Auth.logAdminAction('member_updated', {
                memberId,
                updates: Object.keys(updates)
            });
        } catch (error) {
            console.error('Update member error:', error);
            throw error;
        }
    },

    /**
     * ==========================================
     * SUBMISSIONS OPERATIONS
     * ==========================================
     */

    /**
     * Submit proof of payment
     * @param {object} submissionData - Submission data
     * @returns {Promise<string>} Reference code
     */
    async submitPOP(submissionData) {
        try {
            const reference = Utils.generateReference();
            
            // Check if payment is late
            const paymentDate = new Date(submissionData.paymentDate);
            const isLate = Utils.isPaymentLate(paymentDate);
            const fineAmount = isLate ? (APP_SETTINGS?.lateFineAmount || 50) : 0;
            
            const docRef = await db.collection('submissions').add({
                ...submissionData,
                phone: submissionData.phone.replace(/[\s-]/g, ''),
                reference,
                status: 'pending',
                isLate,
                fineAmount,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return reference;
        } catch (error) {
            console.error('Submit POP error:', error);
            throw error;
        }
    },

    /**
     * Get pending submissions
     * @returns {Promise<Array>} Array of pending submissions
     */
    async getPendingSubmissions() {
        try {
            const snapshot = await db.collection('submissions')
                .where('status', '==', 'pending')
                .orderBy('submittedAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Get pending submissions error:', error);
            throw error;
        }
    },

    /**
     * Get verified submissions with optional filters
     * @param {object} filters - Optional filters (month, memberId)
     * @returns {Promise<Array>} Array of verified submissions
     */
    async getVerifiedSubmissions(filters = {}) {
        try {
            let query = db.collection('submissions')
                .where('status', '==', 'verified');
            
            if (filters.month) {
                query = query.where('paymentMonth', '==', filters.month);
            }
            
            if (filters.memberId) {
                query = query.where('memberId', '==', filters.memberId);
            }
            
            const snapshot = await query
                .orderBy('verifiedAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Get verified submissions error:', error);
            throw error;
        }
    },

    /**
     * Get submissions for a specific member
     * @param {string} phone - Member phone number
     * @returns {Promise<Array>} Array of submissions
     */
    async getMemberSubmissions(phone) {
        try {
            const normalizedPhone = phone.replace(/[\s-]/g, '');
            
            const snapshot = await db.collection('submissions')
                .where('phone', '==', normalizedPhone)
                .orderBy('submittedAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Get member submissions error:', error);
            throw error;
        }
    },

    /**
     * Get a single submission by ID
     * @param {string} submissionId - Submission document ID
     * @returns {Promise<object|null>} Submission data
     */
    async getSubmission(submissionId) {
        try {
            const doc = await db.collection('submissions').doc(submissionId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Get submission error:', error);
            throw error;
        }
    },

    /**
     * Approve a submission
     * @param {string} submissionId - Submission ID
     * @param {string} memberId - Linked member ID (optional)
     */
    async approveSubmission(submissionId, memberId = null) {
        try {
            const batch = db.batch();
            
            const submissionRef = db.collection('submissions').doc(submissionId);
            const submission = await this.getSubmission(submissionId);
            
            if (!submission) {
                throw new Error('Submission not found');
            }
            
            // Update submission status
            batch.update(submissionRef, {
                status: 'verified',
                memberId,
                verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
                verifiedBy: Auth.currentUser?.uid || 'admin',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // If member linked, update their stats
            if (memberId) {
                const memberRef = db.collection('members').doc(memberId);
                batch.update(memberRef, {
                    totalSavings: firebase.firestore.FieldValue.increment(submission.amount),
                    totalFines: firebase.firestore.FieldValue.increment(submission.fineAmount || 0),
                    verifiedCount: firebase.firestore.FieldValue.increment(1),
                    lastPaymentDate: firebase.firestore.FieldValue.serverTimestamp(),
                    skippedMonths: 0,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // If late, add to interest pool
            if (submission.fineAmount > 0) {
                const year = new Date().getFullYear();
                const interestRef = db.collection('interestPool').doc(year.toString());
                batch.set(interestRef, {
                    totalFines: firebase.firestore.FieldValue.increment(submission.fineAmount),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            
            await batch.commit();
            
            await Auth.logAdminAction('submission_approved', {
                submissionId,
                reference: submission.reference,
                amount: submission.amount,
                memberId
            });
        } catch (error) {
            console.error('Approve submission error:', error);
            throw error;
        }
    },

    /**
     * Reject a submission
     * @param {string} submissionId - Submission ID
     * @param {string} reason - Rejection reason
     */
    async rejectSubmission(submissionId, reason = '') {
        try {
            const submission = await this.getSubmission(submissionId);
            
            await db.collection('submissions').doc(submissionId).update({
                status: 'rejected',
                rejectionReason: reason,
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                rejectedBy: Auth.currentUser?.uid || 'admin',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await Auth.logAdminAction('submission_rejected', {
                submissionId,
                reference: submission?.reference,
                reason
            });
        } catch (error) {
            console.error('Reject submission error:', error);
            throw error;
        }
    },

    /**
     * ==========================================
     * STATISTICS & REPORTS
     * ==========================================
     */

    /**
     * Get dashboard statistics
     * @returns {Promise<object>} Statistics object
     */
    async getDashboardStats() {
        try {
            const [members, pendingSubmissions, verifiedSubmissions] = await Promise.all([
                this.getMembers(),
                this.getPendingSubmissions(),
                db.collection('submissions').where('status', '==', 'verified').get()
            ]);
            
            const totalSavings = members.reduce((sum, m) => sum + (m.totalSavings || 0), 0);
            const totalFines = members.reduce((sum, m) => sum + (m.totalFines || 0), 0);
            
            return {
                memberCount: members.length,
                pendingCount: pendingSubmissions.length,
                verifiedCount: verifiedSubmissions.size,
                totalSavings,
                totalFines,
                activeMembers: members.filter(m => m.status === 'active').length
            };
        } catch (error) {
            console.error('Get stats error:', error);
            throw error;
        }
    },

    /**
     * Get member statistics for their account view
     * @param {string} phone - Member phone number
     * @returns {Promise<object>} Member statistics
     */
    async getMemberStats(phone) {
        try {
            const normalizedPhone = phone.replace(/[\s-]/g, '');
            
            // Get member data
            const memberSnapshot = await db.collection('members')
                .where('phone', '==', normalizedPhone)
                .limit(1)
                .get();
            
            if (memberSnapshot.empty) {
                return null;
            }
            
            const member = { 
                id: memberSnapshot.docs[0].id, 
                ...memberSnapshot.docs[0].data() 
            };
            
            // Get submissions
            const submissions = await this.getMemberSubmissions(phone);
            
            // Calculate stats
            const verified = submissions.filter(s => s.status === 'verified');
            const pending = submissions.filter(s => s.status === 'pending');
            
            return {
                member,
                totalSavings: member.totalSavings || 0,
                totalFines: member.totalFines || 0,
                submissionCount: submissions.length,
                verifiedCount: verified.length,
                pendingCount: pending.length,
                qualifiesForInterest: Utils.qualifiesForInterest(member.totalSavings || 0),
                submissions
            };
        } catch (error) {
            console.error('Get member stats error:', error);
            throw error;
        }
    },

    /**
     * Get stokvel total (all members combined)
     * @returns {Promise<number>} Total savings
     */
    async getStokvelTotal() {
        try {
            const members = await this.getMembers();
            return members.reduce((sum, m) => sum + (m.totalSavings || 0), 0);
        } catch (error) {
            console.error('Get stokvel total error:', error);
            throw error;
        }
    },

    /**
     * Generate monthly report data
     * @param {number} month - Month number (1-12)
     * @param {number} year - Year
     * @returns {Promise<object>} Report data
     */
    async generateMonthlyReport(month, year) {
        try {
            const monthName = Utils.getMonthName(month);
            const paymentMonth = `${monthName} ${year}`;
            
            // Get all submissions for this month
            const submissionsSnapshot = await db.collection('submissions')
                .where('paymentMonth', '==', paymentMonth)
                .get();
            
            const submissions = submissionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const verified = submissions.filter(s => s.status === 'verified');
            const pending = submissions.filter(s => s.status === 'pending');
            const rejected = submissions.filter(s => s.status === 'rejected');
            
            const totalAmount = verified.reduce((sum, s) => sum + (s.amount || 0), 0);
            const totalFines = verified.reduce((sum, s) => sum + (s.fineAmount || 0), 0);
            const latePayments = verified.filter(s => s.isLate).length;
            
            const members = await this.getMembers();
            const compliantMembers = verified.length;
            const complianceRate = members.length > 0 
                ? Math.round((compliantMembers / members.length) * 100) 
                : 0;
            
            return {
                period: paymentMonth,
                totalMembers: members.length,
                submissions: {
                    total: submissions.length,
                    verified: verified.length,
                    pending: pending.length,
                    rejected: rejected.length
                },
                financials: {
                    totalAmount,
                    totalFines,
                    latePayments
                },
                compliance: {
                    compliantMembers,
                    rate: complianceRate
                },
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Generate report error:', error);
            throw error;
        }
    },

    /**
     * ==========================================
     * INTEREST POOL OPERATIONS
     * ==========================================
     */

    /**
     * Get interest pool for a year
     * @param {number} year - Year
     * @returns {Promise<object>} Interest pool data
     */
    async getInterestPool(year) {
        try {
            const doc = await db.collection('interestPool').doc(year.toString()).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return { year, totalFines: 0, bankInterest: 0 };
        } catch (error) {
            console.error('Get interest pool error:', error);
            throw error;
        }
    },

    /**
     * Calculate interest distribution
     * @param {number} year - Year for distribution
     * @returns {Promise<object>} Distribution details
     */
    async calculateInterestDistribution(year) {
        try {
            const pool = await this.getInterestPool(year);
            const members = await this.getMembers();
            
            // Find qualifying members
            const qualifyingMembers = members.filter(m => 
                m.status === 'active' && 
                Utils.qualifiesForInterest(m.totalSavings || 0)
            );
            
            const totalPool = (pool.totalFines || 0) + (pool.bankInterest || 0);
            const perMember = qualifyingMembers.length > 0 
                ? Math.floor(totalPool / qualifyingMembers.length) 
                : 0;
            
            return {
                year,
                totalPool,
                qualifyingMembersCount: qualifyingMembers.length,
                perMemberAmount: perMember,
                qualifyingMembers: qualifyingMembers.map(m => ({
                    id: m.id,
                    name: m.name,
                    totalSavings: m.totalSavings
                }))
            };
        } catch (error) {
            console.error('Calculate distribution error:', error);
            throw error;
        }
    }
};

// Export for use
window.Database = Database;
