# 🎯 Prop Bet Pool

A fully customizable prop bet pool platform for events like the Super Bowl, Oscars, and more! Built with Next.js and Firebase.

## ✨ Features

- **User Authentication**: Self-registration with email/password
- **Admin Panel**: Create events, add custom questions, and mark correct answers
- **Multiple Question Types**:
  - Multiple Choice
  - Over/Under
  - Yes/No
  - Number Entry
- **User Submissions**: Users can submit and update their picks before event lockout
- **Real-time Leaderboard**: Automatically updates when admin marks correct answers
- **Event Management**: Lock events to prevent late submissions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Firebase account (free tier works great!)

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Authentication:
   - Click "Authentication" in the sidebar
   - Go to "Sign-in method" tab
   - Enable "Email/Password" provider
4. Create a Firestore Database:
   - Click "Firestore Database" in the sidebar
   - Click "Create database"
   - Start in **production mode** (we'll add rules next)
   - Choose a location close to your users
5. Get your Firebase config:
   - Go to Project Settings (gear icon) → General
   - Scroll down to "Your apps" section
   - Click the web icon `</>`
   - Register your app
   - Copy the configuration values

### 2. Project Setup

1. Clone or navigate to this project:
```bash
cd prop-bet-site
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
# Create a .env.local file in the root directory
touch .env.local
```

4. Add your Firebase credentials to `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Deploy Firestore Security Rules

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init firestore
```
- Select your project
- Accept the default `firestore.rules` file
- Accept the default `firestore.indexes.json` file

4. Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```

### 4. Create Admin User

Since the first user to register will not be an admin, you need to manually set admin privileges:

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000)

3. Register a new account (this will be your admin account)

4. Go to Firebase Console → Firestore Database

5. Find the `users` collection → find your user document → edit it

6. Change `isAdmin` from `false` to `true`

7. Refresh the app - you should now see the Admin panel!

## 📖 How to Use

### For Admins

1. **Create an Event**:
   - Go to Admin Panel → Create New Event
   - Enter event name, description, and date
   - Click "Create Event & Add Questions"

2. **Add Questions**:
   - Choose question type (Multiple Choice, Over/Under, Yes/No, or Number)
   - Enter the question text
   - Add options or set the line (depending on type)
   - Add as many questions as you want
   - Click "Done - Back to Admin" when finished

3. **Lock Event** (optional):
   - Edit the event in Firebase Console
   - Set `isLocked: true` to prevent new/updated submissions

4. **Mark Results**:
   - Go to Admin Panel → Click "Mark Results" for your event
   - Select the correct answer for each question
   - Click "Save Results"
   - Leaderboard updates automatically!

### For Users

1. **Sign Up**: Create an account with email and password

2. **Submit Picks**:
   - Go to "Events" tab
   - Click on an active event
   - Answer all questions
   - Click "Submit Picks"
   - You can update your picks anytime before the event is locked

3. **View Leaderboard**:
   - Go to "Leaderboard" tab
   - Select an event from the dropdown
   - See standings and your rank!

## 🏗️ Project Structure

```
prop-bet-site/
├── app/
│   ├── admin/                  # Admin pages
│   │   ├── create-event/       # Create new event
│   │   └── event/[eventId]/
│   │       ├── questions/      # Manage questions
│   │       └── results/        # Mark correct answers
│   ├── events/                 # User event pages
│   │   └── [eventId]/          # Submit picks
│   ├── leaderboard/            # Leaderboard page
│   ├── login/                  # Login page
│   └── register/               # Registration page
├── components/
│   └── Navbar.tsx              # Navigation component
├── lib/
│   ├── AuthContext.tsx         # Auth state management
│   ├── firebase.ts             # Firebase config
│   └── types.ts                # TypeScript types
└── firestore.rules             # Security rules
```

## 🔒 Security

The app includes comprehensive Firestore security rules:
- Users can only edit their own submissions
- Only admins can create/edit events and questions
- Only admins can mark correct answers
- All users can view leaderboards

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub

2. Go to [Vercel](https://vercel.com)

3. Import your repository

4. Add environment variables (same as `.env.local`)

5. Deploy!

### Other Options

You can also deploy to:
- Netlify
- Railway
- AWS Amplify
- Any platform that supports Next.js

## 🎨 Customization

### Styling
The app uses Tailwind CSS. Customize colors and styles in:
- `tailwind.config.ts` - Theme configuration
- Component files - Individual component styles

### Features to Add
Some ideas for enhancements:
- Point multipliers for certain questions
- Automated scoring via external APIs
- Prize pool tracking
- Email notifications
- Social sharing
- Mobile app version

## 🐛 Troubleshooting

**Issue**: "Firebase configuration error"
- Solution: Make sure all environment variables are set correctly in `.env.local`

**Issue**: "Permission denied" errors
- Solution: Deploy the Firestore security rules using `firebase deploy --only firestore:rules`

**Issue**: "Can't see admin panel"
- Solution: Make sure `isAdmin: true` is set in your user document in Firestore

**Issue**: Leaderboard not updating
- Solution: Make sure correct answers are saved in the questions documents

## 📝 License

MIT License - feel free to use this for your prop bet pools!

## 🤝 Contributing

This is a personal project, but feel free to fork and customize for your needs!

---

**Enjoy your prop bet pool! 🎉**
