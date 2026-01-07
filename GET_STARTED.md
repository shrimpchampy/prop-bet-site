# 🚀 Get Started with Your Prop Bet Pool

## What You Have

A complete, production-ready prop bet pool application! Here's what's been built for you:

### ✅ Complete Features
- 🔐 User authentication (sign up, login, logout)
- 👥 User profiles and role management
- ⚙️ Full admin panel
- 📝 Create custom events
- ❓ 4 types of prop questions (Multiple Choice, Over/Under, Yes/No, Number)
- 📊 Real-time leaderboard
- 🔒 Event locking to prevent late submissions
- ✅ Mark correct answers
- 🏆 Automatic score calculation
- 📱 Mobile-responsive design
- 🔐 Comprehensive security rules

### 📁 Documentation Included
- `README.md` - Complete project documentation
- `SETUP_GUIDE.md` - Step-by-step setup instructions (10 min)
- `QUICK_START.md` - Command reference
- `PROJECT_SUMMARY.md` - Feature overview
- `PAGES_GUIDE.md` - All pages explained
- `BUILD_NOTES.md` - Build configuration info
- `GET_STARTED.md` - This file!

## Next Steps (Choose Your Path)

### 🏃‍♂️ Quick Start (10 Minutes)

**Goal**: Get the app running locally

1. **Set up Firebase** (5 min)
   - Go to https://console.firebase.google.com
   - Create a project
   - Enable Email/Password auth
   - Create Firestore database
   - Copy your config values

2. **Configure the app** (2 min)
   ```bash
   cd prop-bet-site
   npm install
   
   # Create .env.local and add your Firebase config
   # (copy from env.template)
   ```

3. **Deploy security rules** (1 min)
   ```bash
   firebase login
   firebase init firestore
   firebase deploy --only firestore:rules
   ```

4. **Run it!** (1 min)
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

5. **Make yourself admin** (1 min)
   - Register in the app
   - Go to Firebase Console → Firestore → users
   - Set `isAdmin: true` on your user

### 📖 Learn the App (15 Minutes)

**Goal**: Understand how everything works

1. Read `SETUP_GUIDE.md` - Detailed setup walkthrough
2. Read `PAGES_GUIDE.md` - Understand all pages
3. Read `PROJECT_SUMMARY.md` - See all features
4. Try creating a test event with questions

### 🚢 Deploy to Production (30 Minutes)

**Goal**: Make it live for your friends

1. **Complete local setup** (see Quick Start above)

2. **Test locally**
   - Create a test event
   - Add questions
   - Submit picks
   - Mark results
   - Check leaderboard

3. **Deploy to Vercel** (recommended)
   ```bash
   # Push to GitHub first
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   
   # Then go to vercel.com
   # Import your GitHub repo
   # Add environment variables
   # Deploy!
   ```

4. **Share with friends!**
   - Send them the URL
   - They can register
   - Start your first prop bet pool!

## Recommended First Event Workflow

### 1. Create Your First Event
```
Admin Panel → Create New Event
- Name: "Super Bowl Test"
- Description: "Testing with friends"
- Date: This weekend
```

### 2. Add Fun Questions
```
Manage Questions → Add Question

Example questions:
✓ "Who wins the coin toss?" (Multiple Choice: Team A, Team B)
✓ "Total points over/under 50.5" (Over/Under: 50.5)
✓ "Will there be overtime?" (Yes/No)
✓ "How many field goals?" (Number Entry)
```

### 3. Test with Friends
- Share the URL
- Have 2-3 friends register
- Everyone submits picks
- Mark answers (make some correct, some wrong)
- Check the leaderboard together

### 4. Plan Your Real Event
Once you've tested it, plan your big event:
- Super Bowl
- Oscars
- March Madness
- Fantasy Draft
- Any event you want!

## Common First-Time Tasks

### Make Someone Admin
1. Firebase Console → Firestore → users
2. Find their user document
3. Change `isAdmin` from `false` to `true`

### Lock an Event
1. Firebase Console → Firestore → events
2. Find the event
3. Change `isLocked` from `false` to `true`

### View All Submissions
1. Firebase Console → Firestore → submissions
2. See all user picks

### Reset Everything
1. Firebase Console → Firestore
2. Delete collections: events, questions, submissions
3. Keep users collection

## Troubleshooting First Steps

**"Can't login"**
- Check Firebase Console → Authentication is enabled
- Email/Password provider must be turned ON

**"Permission denied"**
- Run: `firebase deploy --only firestore:rules`

**"No admin panel"**
- Set `isAdmin: true` in Firestore users collection
- Refresh the app

**"App won't start"**
- Check `.env.local` has all Firebase values
- Restart dev server: `npm run dev`

## Your Checklist

- [ ] Read this document
- [ ] Follow SETUP_GUIDE.md
- [ ] Run app locally
- [ ] Create test event
- [ ] Invite 2-3 friends to test
- [ ] Plan your first real event
- [ ] Deploy to production
- [ ] Share with your group!

## Need Help?

All documentation is in this folder:
- Setup issues? → `SETUP_GUIDE.md`
- Build problems? → `BUILD_NOTES.md`
- Page questions? → `PAGES_GUIDE.md`
- Feature info? → `PROJECT_SUMMARY.md`
- Commands? → `QUICK_START.md`

---

**You're all set! Let's get your prop bet pool running! 🎉**

Start with the Quick Start section above, then follow SETUP_GUIDE.md for detailed instructions.









