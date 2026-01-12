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
            this.currentUser = result.user;
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
            // IMPORTANT: Sign in anonymously FIRST before any Firestore operations
            // This is required because Firestore rules need authentication
            if (!this.currentUser) {
                console.log('Signing in anonymously first...');
                await this.signInAnonymously();
            }

            let adminCode;
            let settingsDoc;
            
            try {
                // Try to get the admin code from Firestore
                settingsDoc = await db.collection('settings').doc('admin').get();
                console.log('Settings doc exists:', settingsDoc.exists);
            } catch (firestoreError) {
                // If we can't read from Firestore, use default
                console.warn('Could not read settings from Firestore:', firestoreError.message);
                adminCode = APP_SETTINGS.defaultAdminCode;
            }
            
            if (settingsDoc && settingsDoc.exists) {
                adminCode = settingsDoc.data().adminCode;
                console.log('Using admin code from Firestore');
            } else if (!adminCode) {
                // Document doesn't exist, use default and try to create it
                adminCode = APP_SETTINGS.defaultAdminCode;
                console.log('No admin document found, creating with default code...');
                
                try {
                    await db.collection('settings').doc('admin').set({
                        adminCode: adminCode,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('Created admin settings document');
                } catch (writeError) {
                    console.warn('Could not create admin settings document:', writeError.message);
                }
            }

            // Compare codes (trim whitespace)
            const inputCode = code.trim();
            const storedCode = (adminCode || '').trim();
            
            console.log('Comparing codes...');
            
            if (inputCode === storedCode) {
                // Store admin session
                this.isAdmin = true;
                Utils.storage.set('isAdmin', true);
                Utils.storage.set('adminSessionStart', Date.now());
                
                // Log admin login (don't fail if this doesn't work)
                try {
                    await this.logAdminAction('admin_login', { 
                        timestamp: new Date().toISOString() 
                    });
                } catch (logError) {
                    console.warn('Could not log admin login:', logError.message);
                }
                
                console.log('Admin login successful!');
                return true;
            }
            
            console.log('Code mismatch');
            return false;
        } catch (error) {
            console.error('Admin verification error:', error);
            throw error;
        }
    },

    /**
     * Reset admin code to default (useful for recovery)
     * Call this from browser console: Auth.resetAdminCode()
     */
    async resetAdminCode() {
        try {
            // Sign in first if needed
            if (!this.currentUser) {
                await this.signInAnonymously();
            }
            
            const defaultCode = APP_SETTINGS.defaultAdminCode;
            await db.collection('settings').doc('admin').set({
                adminCode: defaultCode,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                resetAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Admin code has been reset to default:', defaultCode);
            return true;
        } catch (error) {
            console.error('Failed to reset admin code:', error);
            return false;
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
     * Force clear admin session (call from console: Auth.clearSession())
     * Useful for testing or if you want to force re-login
     */
    clearSession() {
        this.isAdmin = false;
        Utils.storage.remove('isAdmin');
        Utils.storage.remove('adminSessionStart');
        console.log('Admin session cleared. Refresh the page to see login screen.');
        return true;
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
        
        // Don't redirect - let the calling code handle that
        // This allows the admin page to show the login form again
    },

    /**
     * Look up member by name and phone
     * @param {string} name - Member name
     * @param {string} phone - Member phone
     * @returns {Promise<object|null>} Member data or null
     */
    async lookupMember(name, phone) {
        try {
            // Sign in anonymously if needed for Firestore access
            if (!this.currentUser) {
                await this.signInAnonymously();
            }
            
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