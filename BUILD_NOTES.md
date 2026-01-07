# 🔨 Build Configuration Notes

## Important: Firebase Credentials Required for Build

The app requires Firebase credentials to build successfully. Before building or deploying, make sure you have:

1. **Created a `.env.local` file** with your Firebase credentials
2. **Set all environment variables** (see `env.template`)

## Development vs Production

### Development (No Credentials Needed to Start)
```bash
npm run dev
```
- You can start the dev server without Firebase credentials
- You'll see connection errors in the browser, but the app structure will load
- Add credentials to `.env.local` to fully test

### Production Build (Credentials Required)
```bash
npm run build
```
- **Requires valid Firebase credentials** in `.env.local`
- Will fail with "invalid-api-key" error if credentials are missing
- This is expected behavior - Firebase must be configured before deployment

## Dynamic Rendering Configuration

All pages that use Firebase have been configured with:
```typescript
export const dynamic = 'force-dynamic';
```

This tells Next.js to:
- ✅ Skip static generation at build time
- ✅ Render pages on-demand at runtime
- ✅ Allow Firebase to initialize properly
- ✅ Ensure auth state is checked on each request

## If Build Fails

**Error**: `Firebase: Error (auth/invalid-api-key)`

**Solution**:
1. Create `.env.local` file in project root
2. Copy template from `env.template`
3. Fill in your Firebase credentials from Firebase Console
4. Run `npm run build` again

## Deployment Checklist

Before deploying to production:

- [ ] Create Firebase project
- [ ] Enable Authentication (Email/Password)
- [ ] Create Firestore database
- [ ] Copy Firebase config values
- [ ] Create `.env.local` with credentials
- [ ] Test build locally: `npm run build`
- [ ] Deploy security rules: `firebase deploy --only firestore:rules`
- [ ] Add environment variables to hosting platform (Vercel, Netlify, etc.)
- [ ] Deploy!

## Environment Variables for Deployment

When deploying to Vercel, Netlify, or other platforms, add these environment variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

## Firebase Demo Config

For build testing without real Firebase (not recommended for production):

The app includes demo Firebase config values that allow builds to complete, but the app won't work at runtime. This is only for CI/CD testing purposes.

**For actual use, you MUST provide real Firebase credentials.**









