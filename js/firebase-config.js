/**
 * =====================================================
 * FIREBASE CONFIGURATION
 * =====================================================
 * 
 * ⚠️ REPLACE THE VALUES BELOW WITH YOUR FIREBASE CREDENTIALS
 * 
 * To get your credentials:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Select your project
 * 3. Click the gear icon ⚙️ > Project settings
 * 4. Scroll to "Your apps" > Click the web icon </>
 * 5. Copy the firebaseConfig values
 * 
 * =====================================================
 */

const firebaseConfig = {
    // ⬇️ REPLACE THESE VALUES WITH YOUR OWN ⬇️
    
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
    
    // ⬆️ REPLACE THESE VALUES WITH YOUR OWN ⬆️
};

/**
 * =====================================================
 * APP SETTINGS
 * =====================================================
 * You can customize these settings for your stokvel
 */

const APP_SETTINGS = {
    // Stokvel Information
    stokvelName: "Tshikota Ro Farana",
    stokvelTagline: "Growing Together, Saving Together",
    
    // Financial Rules
    minimumDeposit: 300,          // R300 minimum per month
    lateFineAmount: 50,           // R50 late fee
    graceperiodEndDay: 7,         // Grace period ends on 7th
    interestEligibilityMin: 10000, // R10,000 minimum for interest
    maxSkippedMonths: 3,          // Months before suspension
    
    // Banking Details (displayed on POP submission page)
    bankName: "FNB",
    accountHolder: "Tshikota Ro Farana Stokvel",
    accountNumber: "62XXXXXXXXX",
    branchCode: "250655",
    reference: "NAME + MONTH",
    
    // Default Admin Code (change in Firestore after setup)
    defaultAdminCode: "TSHIKOTA2024",
    
    // Year-end Distribution
    payoutEarliestDate: { month: 1, day: 4 }, // January 4th
    savingsPeriodEnd: { month: 12, day: 31 }  // December 31st
};

/**
 * =====================================================
 * INITIALIZE FIREBASE
 * =====================================================
 * Do not modify below this line unless you know what you're doing
 */

// Check if Firebase is loaded
if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Check your script tags.');
}

// Initialize Firebase
let app, auth, db, storage;

try {
    // Check if already initialized
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.apps[0];
    }
    
    // Initialize services
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    
    // Enable offline persistence for Firestore
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Persistence not supported in this browser');
            }
        });
    
    console.log('✅ Firebase initialized successfully');
    
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

/**
 * Helper to check if Firebase is properly configured
 */
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
           firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

/**
 * Show configuration warning if not set up
 */
function showConfigWarning() {
    if (!isFirebaseConfigured()) {
        const warning = document.createElement('div');
        warning.className = 'firebase-warning';
        warning.innerHTML = `
            <div class="firebase-warning-content">
                <h3>⚠️ Firebase Not Configured</h3>
                <p>Please update <code>js/firebase-config.js</code> with your Firebase credentials.</p>
                <p>See <code>README.md</code> for setup instructions.</p>
            </div>
        `;
        warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #FFF3CD;
            color: #856404;
            padding: 1rem;
            text-align: center;
            z-index: 9999;
            border-bottom: 2px solid #FFE69C;
        `;
        document.body.prepend(warning);
    }
}

// Check configuration when DOM is ready
document.addEventListener('DOMContentLoaded', showConfigWarning);

// Export for use in other modules
window.firebaseConfig = firebaseConfig;
window.APP_SETTINGS = APP_SETTINGS;
window.isFirebaseConfigured = isFirebaseConfigured;
