# ⚡ Quick Start Commands

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Firebase Commands

```bash
# Login to Firebase
firebase login

# Initialize Firebase (first time only)
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy everything
firebase deploy
```

## File Structure

```
📁 prop-bet-site/
├── 📁 app/              # All pages (Next.js App Router)
│   ├── 📁 admin/        # Admin-only pages
│   ├── 📁 events/       # User event pages
│   ├── 📁 leaderboard/  # Leaderboard
│   ├── 📁 login/        # Login page
│   └── 📁 register/     # Sign up page
├── 📁 components/       # Reusable components
├── 📁 lib/              # Utilities and config
│   ├── AuthContext.tsx  # User auth state
│   ├── firebase.ts      # Firebase setup
│   └── types.ts         # TypeScript types
├── .env.local          # Your Firebase config (CREATE THIS!)
├── firestore.rules     # Security rules
└── README.md           # Full documentation
```

## Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123
```

## First Time Setup Checklist

- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Enable Email/Password authentication
- [ ] Create Firestore database
- [ ] Copy Firebase config to `.env.local`
- [ ] Run `npm install`
- [ ] Run `firebase login`
- [ ] Run `firebase init firestore`
- [ ] Run `firebase deploy --only firestore:rules`
- [ ] Run `npm run dev`
- [ ] Register first user
- [ ] Set `isAdmin: true` in Firestore for first user
- [ ] Start creating events!

## Useful Links

- **App**: http://localhost:3000
- **Firebase Console**: https://console.firebase.google.com
- **Vercel Deployment**: https://vercel.com

## Database Collections

- **users**: User profiles (email, displayName, isAdmin)
- **events**: Prop bet events (name, date, description, status)
- **questions**: Prop questions (type, options, correctAnswer)
- **submissions**: User picks (userId, eventId, picks array)

## Making Users Admin

1. Go to Firebase Console
2. Firestore Database → users collection
3. Click user document
4. Change `isAdmin` from `false` to `true`
5. User needs to refresh the app

## Locking an Event

Prevent new submissions:

1. Firebase Console → events collection
2. Find your event
3. Change `isLocked` from `false` to `true`

## Troubleshooting

**Problem**: Can't login
- ✅ Check Firebase Authentication is enabled

**Problem**: Permission denied
- ✅ Run: `firebase deploy --only firestore:rules`

**Problem**: Not seeing admin panel
- ✅ Set `isAdmin: true` in Firestore users collection

**Problem**: .env.local changes not working
- ✅ Restart dev server: `npm run dev`









