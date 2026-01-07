# 📋 Quick Setup Guide

Follow these steps to get your prop bet pool running locally in under 10 minutes!

## Step 1: Firebase Project Setup (5 minutes)

### Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Enter a project name (e.g., "prop-bet-pool")
4. Disable Google Analytics (not needed)
5. Click "Create project"

### Enable Authentication
1. In Firebase Console, click "Authentication" in left sidebar
2. Click "Get started"
3. Click "Sign-in method" tab
4. Click "Email/Password"
5. Toggle "Enable" to ON
6. Click "Save"

### Create Firestore Database
1. Click "Firestore Database" in left sidebar
2. Click "Create database"
3. Select "Start in production mode" (we'll add rules later)
4. Choose a location (pick one closest to you)
5. Click "Enable"

### Get Configuration
1. Click the gear icon (⚙️) next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`)
5. Register app (nickname: "prop-bet-web")
6. **Copy the config values** - you'll need these!

## Step 2: Local Project Setup (2 minutes)

### Install Dependencies
```bash
cd prop-bet-site
npm install
```

### Configure Environment Variables
Create a file named `.env.local` in the root directory:

```bash
# On Mac/Linux:
touch .env.local

# On Windows:
type nul > .env.local
```

Open `.env.local` and paste your Firebase config (replace with your actual values):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxx
```

## Step 3: Deploy Security Rules (1 minute)

### Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Login and Deploy
```bash
# Login to Firebase
firebase login

# Initialize Firestore (only needed once)
firebase init firestore
# - Select your project from the list
# - Accept default firestore.rules
# - Accept default firestore.indexes.json

# Deploy the security rules
firebase deploy --only firestore:rules
```

## Step 4: Run the App (1 minute)

### Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser!

## Step 5: Create Admin Account (1 minute)

### Register First User
1. Click "Sign Up" in the app
2. Enter your email, password, and display name
3. Click "Sign Up"

### Make Yourself Admin
1. Go to Firebase Console → Firestore Database
2. Click on "users" collection
3. Click on your user document
4. Click the "isAdmin" field
5. Change value from `false` to `true`
6. Click "Update"

### Verify Admin Access
1. Go back to your app at http://localhost:3000
2. Refresh the page
3. You should now see "Admin" in the navbar!

## 🎉 You're All Set!

### Quick Test
1. Go to Admin panel
2. Click "Create New Event"
3. Fill in event details:
   - Name: "Super Bowl Test"
   - Description: "Testing the app"
   - Date: Pick any future date
4. Add some questions (try different types)
5. Go back to home → Events → Submit picks
6. Fill in your picks and submit
7. Go to Admin → Mark Results
8. Mark some answers as correct
9. Check the Leaderboard!

## 🚀 Next Steps

### Invite Your Friends
- Share the URL with your friends
- They can register and start submitting picks!
- First event should have at least 3-5 participants for fun

### Before Real Event
1. Create the actual event (Super Bowl, Oscars, etc.)
2. Add all your fun prop questions
3. Share with your group
4. Lock the event before it starts (set `isLocked: true` in Firebase)
5. Mark answers as they happen during the event
6. Check leaderboard for winner!

## 🐛 Common Issues

**App won't start**
- Make sure `.env.local` has all the correct values
- Try restarting: `npm run dev`

**Can't login**
- Check Firebase Console → Authentication is enabled
- Make sure email/password provider is turned on

**Permission denied errors**
- Deploy security rules: `firebase deploy --only firestore:rules`

**Not seeing admin panel**
- Refresh the page after setting `isAdmin: true` in Firestore
- Check your browser console for errors

## 📞 Need Help?

Check the main README.md for more detailed information!









