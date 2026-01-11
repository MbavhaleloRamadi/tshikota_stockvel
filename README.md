# Tshikota Ro Farana Stokvel Web App

A mobile-first stokvel management system built with HTML, CSS, and Vanilla JavaScript, powered by Firebase.

## 📁 File Structure

```
tshikota-stokvel/
├── index.html                 # Landing page (home)
├── submit-pop.html            # POP submission form
├── view-account.html          # Member account view
├── admin/
│   └── index.html             # Admin dashboard
├── css/
│   ├── styles.css             # Main stylesheet (mobile-first)
│   ├── components.css         # Reusable UI components
│   └── admin.css              # Admin-specific styles
├── js/
│   ├── firebase-config.js     # ⚠️ REPLACE CREDENTIALS HERE
│   ├── auth.js                # Authentication logic
│   ├── database.js            # Firestore operations
│   ├── storage.js             # Cloud Storage operations
│   ├── utils.js               # Utility functions
│   ├── app.js                 # Main app initialization
│   ├── submit-pop.js          # POP submission logic
│   ├── view-account.js        # View account logic
│   └── admin.js               # Admin dashboard logic
├── assets/
│   └── icons/                 # SVG icons
├── firebase/
│   ├── firestore.rules        # Firestore security rules
│   ├── storage.rules          # Storage security rules
│   └── firebase.json          # Firebase hosting config
└── README.md                  # This file
```

## 🚀 Quick Start

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it (e.g., "tshikota-stokvel")
4. Enable Google Analytics (optional)

### Step 2: Enable Firebase Services

In your Firebase project:

1. **Authentication**
   - Go to Build > Authentication
   - Click "Get started"
   - Enable "Anonymous" sign-in (for members)
   
2. **Firestore Database**
   - Go to Build > Firestore Database
   - Click "Create database"
   - Start in "test mode" (we'll add rules later)
   - Choose a location close to South Africa

3. **Storage**
   - Go to Build > Storage
   - Click "Get started"
   - Start in "test mode"

4. **Hosting** (optional, for deployment)
   - Go to Build > Hosting
   - Click "Get started"

### Step 3: Get Your Firebase Credentials

1. In Firebase Console, click the gear icon ⚙️ > Project settings
2. Scroll down to "Your apps"
3. Click the web icon `</>`
4. Register your app (e.g., "stokvel-web")
5. Copy the `firebaseConfig` object

### Step 4: Add Your Credentials

Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### Step 5: Deploy Security Rules

Copy the contents of `firebase/firestore.rules` and `firebase/storage.rules` to your Firebase Console:

1. Firestore > Rules > Paste rules > Publish
2. Storage > Rules > Paste rules > Publish

### Step 6: Initialize Admin Data

When you first access the admin panel, the system will create initial data structures. The default admin code is:

```
TSHIKOTA2024
```

**⚠️ IMPORTANT: Change this code in Firestore after first login!**

## 🏃 Running Locally

### Option 1: VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

### Option 2: Simple HTTP Server (Python)

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

### Option 3: Node.js

```bash
npx serve
```

## 📱 Features

### For Members
- Submit proof of payment (POP)
- View personal savings and fines
- Track submission history
- See stokvel total

### For Admin (Treasurer)
- Review and approve/reject submissions
- Manage members
- View compliance reports
- Generate monthly reports
- Track interest pool

## 💰 Financial Rules

| Rule | Details |
|------|---------|
| Minimum Deposit | R300/month |
| Grace Period | 1st - 7th of month |
| Late Fine | R50 (once per month) |
| Suspension | 3 consecutive skipped months |
| Interest Eligibility | Total savings ≥ R10,000 |
| Payout Date | After January 4th |

## 🔒 Security

- All financial data is immutable (no deletion)
- Full audit trail for all transactions
- Role-based access control
- Firebase Authentication required

## 🎨 Customization

### Change Colors
Edit CSS variables in `css/styles.css`:

```css
:root {
    --primary: #1B5E20;      /* Main green */
    --primary-dark: #0D3B12; /* Darker green */
    --accent: #FFB300;       /* Gold accent */
    /* ... more variables */
}
```

### Change Admin Code
In Firestore, update the `settings/admin` document:

```json
{
    "adminCode": "YOUR_NEW_CODE"
}
```

## 📞 Support

For issues or questions, contact the stokvel committee.

---

Built with ❤️ for the Tshikota Ro Farana community
