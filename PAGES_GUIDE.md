# 📄 Pages Guide

## Public Pages (No Login Required)

### 🔐 `/login`
**Login Page**
- Email/password login form
- Link to registration
- Redirects to home after login

### 📝 `/register`
**Registration Page**
- Create new account
- Email, password, display name
- Auto-login after signup

---

## User Pages (Login Required)

### 🏠 `/` (Home)
**Dashboard**
- Welcome message
- Quick links to Events and Leaderboard
- Admin panel link (if admin)

### 🏆 `/events`
**Events List**
- Shows all active events
- Status indicators (submitted, locked)
- Click to submit/view picks

### 📋 `/events/[eventId]`
**Submit Picks**
- View all questions for an event
- Submit answers for all prop types
- Update picks before event locks
- Shows if already submitted

### 📊 `/leaderboard`
**Leaderboard**
- Select event from dropdown
- Real-time standings
- Rank, name, score, percentage
- Visual progress bars
- Highlights current user

---

## Admin Pages (Admin Only)

### ⚙️ `/admin`
**Admin Dashboard**
- List all events
- Create new event button
- Manage questions link
- Mark results link
- Shows event status (active, locked)

### ➕ `/admin/create-event`
**Create New Event**
- Enter event name
- Event description
- Event date/time
- Redirects to add questions

### ❓ `/admin/event/[eventId]/questions`
**Manage Questions**
- Add new questions
- Choose question type:
  - Multiple Choice
  - Over/Under
  - Yes/No
  - Number Entry
- Delete questions
- View all questions for event

### ✅ `/admin/event/[eventId]/results`
**Mark Correct Answers**
- View all questions
- Select correct answer for each
- Save results
- Auto-updates leaderboard

---

## Navigation Flow

```
Login/Register
    ↓
Home Dashboard
    ├→ Events → Select Event → Submit Picks
    ├→ Leaderboard → View Standings
    └→ Admin (if admin)
        ├→ Create Event → Add Questions
        └→ Manage Event → Mark Results
```

## User Journey

### New User
1. Register at `/register`
2. See dashboard at `/`
3. Go to `/events`
4. Click event → `/events/[eventId]`
5. Submit picks
6. Check `/leaderboard`

### Admin User
1. Go to `/admin`
2. Click "Create New Event"
3. Fill event details at `/admin/create-event`
4. Add questions at `/admin/event/[eventId]/questions`
5. Wait for users to submit
6. Mark results at `/admin/event/[eventId]/results`
7. Check `/leaderboard` with everyone else!

## Page Components

### Every Page Includes
- `<Navbar />` - Navigation bar with user info
- Auth protection - Redirects if not logged in
- Loading states - Shows while checking auth

### Navbar Shows
- App logo/title
- Dashboard link
- Events link
- Leaderboard link
- Admin link (if admin)
- User name
- Sign out button

## Access Control

| Page | Public | User | Admin |
|------|--------|------|-------|
| `/login` | ✅ | ✅ | ✅ |
| `/register` | ✅ | ✅ | ✅ |
| `/` | ❌ | ✅ | ✅ |
| `/events` | ❌ | ✅ | ✅ |
| `/events/[eventId]` | ❌ | ✅ | ✅ |
| `/leaderboard` | ❌ | ✅ | ✅ |
| `/admin` | ❌ | ❌ | ✅ |
| `/admin/*` | ❌ | ❌ | ✅ |

## Mobile Responsive

All pages are fully responsive:
- ✅ Mobile (320px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)
- ✅ Large screens (1280px+)









