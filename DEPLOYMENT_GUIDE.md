# 🚀 Deployment Guide - Share Your Site

## Option 1: Deploy to Vercel (Recommended - Best for Sharing)

Vercel is free and works perfectly with Next.js. Your site will get a public URL that anyone can access.

### Steps:

1. **Install Vercel CLI** (if you don't have it):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your project folder**:
   ```bash
   cd prop-bet-site
   vercel
   ```
   
   - It will ask you some questions - just press Enter for defaults
   - It will detect Next.js automatically

4. **Add Environment Variables**:
   - Go to https://vercel.com/dashboard
   - Click on your project
   - Go to Settings → Environment Variables
   - Add all the variables from your `.env.local` file:
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
     - `NEXT_PUBLIC_FIREBASE_APP_ID`
     - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
     - `NEXT_PUBLIC_ADMIN_PASSWORD` (if you have one)

5. **Redeploy**:
   ```bash
   vercel --prod
   ```

6. **Share the URL**: Vercel will give you a URL like `https://your-project.vercel.app` - share this with anyone!

### Future Updates:
- Just run `vercel --prod` again to deploy updates
- Or connect to GitHub for automatic deployments

---

## Option 2: Use ngrok (Quick Testing - Temporary URL)

Good for quick testing, but the URL changes each time (unless you pay).

### Steps:

1. **Install ngrok**:
   - Download from https://ngrok.com/download
   - Or: `brew install ngrok` (Mac)

2. **Start your dev server**:
   ```bash
   cd prop-bet-site
   npm run dev
   ```

3. **In a new terminal, run ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Share the URL**: ngrok will give you a URL like `https://abc123.ngrok.io` - share this!

**Note**: The URL expires when you close ngrok. Free accounts get a new random URL each time.

---

## Option 3: Local Network (Same WiFi Only)

We already set this up for mobile testing. Others on your WiFi can access it.

### Steps:

1. **Find your IP address**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   (Or check System Settings → Network on Mac)

2. **Start your dev server**:
   ```bash
   cd prop-bet-site
   npm run dev
   ```

3. **Share the URL**: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.68:3000`
   - **Only works for people on the same WiFi network**

---

## Option 4: Deploy to Netlify (Alternative to Vercel)

Similar to Vercel, also free and easy.

### Steps:

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build your site**:
   ```bash
   cd prop-bet-site
   npm run build
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

4. **Add environment variables** in Netlify dashboard (Settings → Environment Variables)

---

## Which Option Should You Use?

- **Vercel** (Option 1): Best for permanent sharing, professional, free
- **ngrok** (Option 2): Best for quick testing, temporary
- **Local Network** (Option 3): Best if everyone is in the same place
- **Netlify** (Option 4): Alternative to Vercel, also great

## Recommended: Vercel

It's the easiest and most professional option. Your site will be live at a permanent URL that you can share with anyone, anywhere.

---

## After Deployment

Once deployed, you can:
- Share the URL with friends/family
- Test on different devices
- Get feedback
- Make updates and redeploy easily

## Security Note

Make sure your Firebase security rules are set up correctly before sharing publicly. Currently they allow read/write for everyone, which is fine for testing but you may want to restrict writes later.




