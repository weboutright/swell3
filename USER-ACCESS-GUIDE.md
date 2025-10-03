# How Users Access Their Admin Dashboard

## The Simple Answer

**Users only need to remember ONE URL:**
```
https://weboutright.github.io/swell3/admin.html
```

That's it! They bookmark this URL and it automatically connects them to their personal backend.

---

## How It Works (3 Scenarios)

### Scenario 1: Returning User (Has Used System Before)
```
1. User visits: admin.html
2. Admin checks localStorage for deployment URL
3. Found! → Connects to their backend automatically
4. User sees their admin dashboard
```

**User Experience**: Instant access, no login needed (stored in browser)

---

### Scenario 2: First-Time User OR Cleared Browser Data
```
1. User visits: admin.html
2. Admin checks localStorage → Not found
3. Redirects to CODE2.gs: ?action=login
4. CODE2.gs: "Please sign in with Google"
5. User signs in with their Google account
6. CODE2.gs checks directory: Does this email have a deployment?
   
   If YES:
   → Redirects back to admin.html?deploymentUrl=THEIR_URL
   → Admin saves to localStorage
   → User sees their dashboard
   
   If NO:
   → Redirects to setup-wizard.html
   → User completes 4-step setup
   → Registers deployment with CODE2.gs
   → Redirects to admin.html
```

**User Experience**: One-time Google sign-in, then automatic forever

---

### Scenario 3: CODE2.gs Not Configured (Current State)
```
1. User visits: admin.html
2. Admin checks localStorage → Not found
3. No CODE2.gs configured
4. Redirects to setup-wizard.html
5. User completes setup
6. Deployment URL saved to localStorage
7. Redirects to admin.html
8. Admin connects to their backend
```

**User Experience**: Complete setup once, then automatic (per browser)

---

## Setup Required (For You, The Website Owner)

### Option A: Without CODE2.gs (Current - Simpler)

**What Users Do:**
- Bookmark: `admin.html`
- Complete setup wizard once per browser
- URL stored in browser localStorage
- Works until they clear browser data

**Pros:**
✅ No CODE2.gs deployment needed
✅ Simpler architecture
✅ Works immediately

**Cons:**
❌ If user clears browser data, must complete setup again
❌ Different browsers = different setups
❌ Can't easily switch devices

**Best For:** Single-browser users, testing, simple deployments

---

### Option B: With CODE2.gs (Recommended for Production)

**What Users Do:**
- Bookmark: `admin.html`
- Sign in with Google once
- Works across all browsers/devices
- Never need to remember their deployment URL

**Pros:**
✅ Users sign in once with Google
✅ Works across browsers and devices
✅ Can clear browser data without losing access
✅ Professional user experience
✅ You can see all registered users in one sheet

**Cons:**
❌ Requires CODE2.gs deployment
❌ Stores email → URL mappings (privacy consideration)
❌ Slightly more setup for you

**Best For:** Production, multiple users, professional deployment

---

## How to Enable CODE2.gs (Recommended)

### Step 1: Deploy CODE2.gs

1. Go to https://script.google.com
2. New project → Paste CODE2.gs
3. Deploy as Web App:
   - **Execute as**: Me (your@gmail.com)
   - **Who has access**: Anyone
4. Copy deployment URL

### Step 2: Configure admin.html

1. Open `admin.html`
2. Find line ~1157:
   ```javascript
   const AUTH_HUB_URL = '';
   ```
3. Update to:
   ```javascript
   const AUTH_HUB_URL = 'https://script.google.com/macros/s/YOUR_CODE2_ID/exec';
   ```
4. Push to GitHub

### Step 3: Configure setup-wizard.html

1. Open `setup-wizard.html`
2. Find line ~500:
   ```javascript
   const AUTH_HUB_URL = '';
   ```
3. Update to same URL as Step 2
4. Push to GitHub

### Step 4: Initialize CODE2.gs

1. In CODE2.gs project, run function: `setupUserDirectorySheet()`
2. Copy the Sheet ID from logs
3. Run function: `setUserDirectorySheetId('YOUR_SHEET_ID')`
4. Run function: `testAuthFlow()` to verify

### Step 5: Test

1. Open `admin.html` in incognito mode
2. Should redirect to CODE2.gs login
3. Sign in with Google
4. Should redirect to setup wizard (first time)
5. Complete setup
6. Should redirect back to admin.html
7. Close browser and try again
8. Should redirect to CODE2.gs → auto-login → admin.html

---

## User Flow Comparison

### Without CODE2.gs:
```
User → admin.html → localStorage check → Setup wizard → admin.html
      (Stored in browser only)
```

### With CODE2.gs:
```
User → admin.html → CODE2.gs lookup → admin.html
      (Stored centrally, works everywhere)
```

---

## What Users Bookmark

### Marketing Pages:
- `index.html` - Landing page
- `pricing.html` - Pricing info
- `features.html` - Feature list

### For Using the System:
- **`admin.html`** ← THE ONLY URL USERS NEED TO BOOKMARK
  - Manages their settings
  - View bookings
  - Configure system
  - Get embed codes

### For Setup (One-Time):
- `setup-wizard.html` - Initial setup (auto-redirected if needed)

---

## Common User Questions

### "Where do I manage my bookings?"
→ `admin.html` (bookmark this!)

### "I cleared my browser cache and can't access my dashboard"
**Without CODE2.gs:**
→ Go to `admin.html` → Will redirect to setup wizard → Re-enter deployment URL

**With CODE2.gs:**
→ Go to `admin.html` → Sign in with Google → Automatic access!

### "Can I access from my phone and laptop?"
**Without CODE2.gs:**
→ Yes, but must complete setup on each device

**With CODE2.gs:**
→ Yes! Sign in with Google on any device, instant access

### "Do customers need an account?"
→ No! Customers just visit the widget URL or embedded form. No account needed for booking.

### "What's my admin URL?"
→ Always the same: `https://weboutright.github.io/swell3/admin.html`

---

## Summary

**For Users:**
- ONE URL to remember: `admin.html`
- First time: Sign in with Google (if CODE2.gs enabled) or complete setup
- After that: Just visit `admin.html`, everything automatic

**For You:**
- Deploy CODE2.gs once (recommended)
- Update AUTH_HUB_URL in admin.html and setup-wizard.html
- Users get seamless experience across all devices

**The Magic:**
- Users think they're logging into one system
- Behind the scenes: Each has their own backend
- CODE2.gs is just a "phone book" (email → URL lookup)
- All data stays in THEIR Google account, not yours
