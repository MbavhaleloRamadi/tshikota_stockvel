/**
 * =====================================================
 * TSHIKOTA RO FARANA - AUTHENTICATION MODULE
 * =====================================================
 * Handles user authentication and session management
 */

const Auth = {
    currentUser: null,
    isAdmin: false,

    /**
     * Initialize authentication listener
     */
    init() {
        if (!window.auth) {
            console.error('Firebase Auth not initialized');
            return;
        }

        // Listen for auth state changes
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.onAuthStateChanged(user);
        });
    },

    /**
     * Handle auth state changes
     * @param {object} user - Firebase user object
     */
    onAuthStateChanged(user) {
        if (user) {
            console.log('User signed in:', user.uid);
        } else {
            console.log('User signed out');
        }
    },

    /**
     * Sign in anonymously (for members viewing their account)
     * @returns {Promise<object>} User object
     */
    async signInAnonymously() {
        try {
            const result = await auth.signInAnonymously();
            return result.user;
        } catch (error) {
            console.error('Anonymous sign-in error:', error);
            throw error;
        }
    },

    /**
     * Verify admin code
     * @param {string} code - Admin code to verify
     * @returns {Promise<boolean>} Whether code is valid
     */
    async verifyAdminCode(code) {
        try {
            // First check Firestore for admin code
            const settingsDoc = await db.collection('settings').doc('admin').get();
            
            let adminCode;
            if (settingsDoc.exists) {
                adminCode = settingsDoc.data().adminCode;
            } else {
                // Use default code and create settings document
                adminCode = APP_SETTINGS.defaultAdminCode;
                await db.collection('settings').doc('admin').set({
                    adminCode: adminCode,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            if (code === adminCode) {
                // Sign in anonymously if not already
                if (!this.currentUser) {
                    await this.signInAnonymously();
                }
                
                // Store admin session
                this.isAdmin = true;
                Utils.storage.set('isAdmin', true);
                Utils.storage.set('adminSessionStart', Date.now());
                
                // Log admin login
                await this.logAdminAction('admin_login', { 
                    timestamp: new Date().toISOString() 
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Admin verification error:', error);
            throw error;
        }
    },

    /**
     * Check if current session is admin
     * @returns {boolean} Admin status
     */
    checkAdminSession() {
        const isAdmin = Utils.storage.get('isAdmin', false);
        const sessionStart = Utils.storage.get('adminSessionStart', 0);
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
        
        if (isAdmin && (Date.now() - sessionStart) < sessionDuration) {
            this.isAdmin = true;
            return true;
        }
        
        this.isAdmin = false;
        Utils.storage.remove('isAdmin');
        Utils.storage.remove('adminSessionStart');
        return false;
    },

    /**
     * Log admin action for audit trail
     * @param {string} action - Action type
     * @param {object} details - Action details
     */
    async logAdminAction(action, details = {}) {
        try {
            await db.collection('auditLogs').add({
                action,
                details,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: this.currentUser?.uid || 'unknown'
            });
        } catch (error) {
            console.error('Failed to log action:', error);
        }
    },

    /**
     * Sign out admin
     */
    async signOutAdmin() {
        try {
            await this.logAdminAction('admin_logout', {
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Logout logging error:', error);
        }
        
        this.isAdmin = false;
        Utils.storage.remove('isAdmin');
        Utils.storage.remove('adminSessionStart');
        
        // Redirect to home
        window.location.href = '../index.html';
    },

    /**
     * Look up member by name and phone
     * @param {string} name - Member name
     * @param {string} phone - Member phone
     * @returns {Promise<object|null>} Member data or null
     */
    async lookupMember(name, phone) {
        try {
            // Normalize phone number
            const normalizedPhone = phone.replace(/[\s-]/g, '');
            
            // Query members collection
            const snapshot = await db.collection('members')
                .where('phone', '==', normalizedPhone)
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                return null;
            }
            
            const memberDoc = snapshot.docs[0];
            const memberData = memberDoc.data();
            
            // Verify name matches (case-insensitive)
            const normalizedName = name.toLowerCase().trim();
            const storedName = memberData.name.toLowerCase().trim();
            
            if (!storedName.includes(normalizedName) && !normalizedName.includes(storedName)) {
                return null;
            }
            
            return {
                id: memberDoc.id,
                ...memberData
            };
        } catch (error) {
            console.error('Member lookup error:', error);
            throw error;
        }
    },

    /**
     * Store member session for viewing account
     * @param {object} member - Member data
     */
    setMemberSession(member) {
        Utils.storage.set('currentMember', {
            id: member.id,
            name: member.name,
            phone: member.phone
        });
        Utils.storage.set('memberSessionStart', Date.now());
    },

    /**
     * Get current member session
     * @returns {object|null} Member session data
     */
    getMemberSession() {
        const member = Utils.storage.get('currentMember');
        const sessionStart = Utils.storage.get('memberSessionStart', 0);
        const sessionDuration = 30 * 60 * 1000; // 30 minutes
        
        if (member && (Date.now() - sessionStart) < sessionDuration) {
            return member;
        }
        
        Utils.storage.remove('currentMember');
        Utils.storage.remove('memberSessionStart');
        return null;
    },

    /**
     * Clear member session
     */
    clearMemberSession() {
        Utils.storage.remove('currentMember');
        Utils.storage.remove('memberSessionStart');
    },

    /**
     * Require admin access (redirect if not admin)
     * @returns {boolean} Whether admin access granted
     */
    requireAdmin() {
        if (!this.checkAdminSession()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
};

// Export for use
window.Auth = Auth;
