# Updated Setup Flow - TWO Apps Script Deployments

## The Problem We're Solving

**Issue:** Users can't edit admin.html hosted on GitHub Pages to add their Code.gs URL.

**Solution:** Users deploy TWO Apps Script projects:
1. **Code.gs** - Their backend (handles bookings, calendar, payments)
2. **AdminWrapper.gs** - Serves admin.html with their Code.gs URL injected

## New User Flow

### Step 1: Deploy Code.gs (Backend)
- Copy Code.gs from setup wizard
- Create new Apps Script project: "Swell Backend"
- Paste code
- Deploy as web app:
  - Execute as: **User accessing the web app**
  - Who has access: **Anyone**
- Copy deployment URL → Save for Step 3

### Step 2: Deploy AdminWrapper.gs (Frontend)
- Copy AdminWrapper.gs from setup wizard
- Create ANOTHER Apps Script project: "Swell Admin Dashboard"
- Paste code
- Deploy as web app:
  - Execute as: **Me (your email)**
  - Who has access: **Anyone**
- Copy deployment URL → This is your admin dashboard URL!

### Step 3: Configure Admin Dashboard
- In AdminWrapper.gs editor, run this function:
  ```javascript
  setupAdminDashboard('YOUR_CODE_GS_URL_FROM_STEP_1')
  ```
- This tells AdminWrapper.gs which backend to connect to

### Step 4: Bookmark & Go!
- Open your AdminWrapper.gs URL
- You'll see the admin dashboard (with your Code.gs URL pre-configured!)
- Bookmark this URL - it's your permanent admin dashboard
- (Optional) Register with CODE2.gs for easy cross-device access

## Why This Works

### Before (Broken):
```
User → admin.html (GitHub Pages, static)
       ↓
       Tries to load Code.gs URL dynamically
       ↓
       Race condition, fetch errors, timing issues ❌
```

### After (Fixed):
```
User → AdminWrapper.gs URL
       ↓
       Fetches admin.html from GitHub
       ↓
       Injects user's Code.gs URL into HTML
       ↓
       Serves customized admin.html ✅
       ↓
       admin.html already has GOOGLE_SCRIPT_URL set!
```

## Benefits

1. **No Race Conditions** - URL is injected server-side before page loads
2. **No Dynamic Loading** - GOOGLE_SCRIPT_URL is a static variable
3. **User-Specific** - Each user gets admin.html customized for them
4. **Bookmarkable** - AdminWrapper.gs URL is the permanent dashboard
5. **Works Offline** - After first load, URL is hardcoded

## CODE2.gs Integration (Optional)

If you deploy CODE2.gs:
- Users can register their AdminWrapper.gs URL
- Access from any device: CODE2.gs → redirects to → AdminWrapper.gs → serves admin.html
- Users bookmark CODE2.gs URL instead (even simpler!)

## File Structure

```
GitHub Pages (weboutright.github.io/swell3):
├── admin.html          ← Base template (static)
├── setup-wizard.html   ← Updated with 2-deployment flow
├── Code.gs            ← Backend code to copy
├── AdminWrapper.gs    ← NEW: Dashboard wrapper to copy
└── CODE2.gs           ← Optional: URL lookup service

User's Apps Script:
├── Project 1: "Swell Backend"
│   └── Code.gs (deployed)
└── Project 2: "Swell Admin Dashboard"  
    └── AdminWrapper.gs (deployed, configured with Project 1's URL)
```

## Implementation Checklist

- [x] Create AdminWrapper.gs file
- [ ] Update setup-wizard.html to guide users through 2 deployments
- [ ] Update admin.html to work when served by AdminWrapper.gs
- [ ] Update CODE2.gs to accept AdminWrapper URLs
- [ ] Create setup video/screenshots
- [ ] Update documentation

## Next Steps

1. Test AdminWrapper.gs with current admin.html
2. Update setup wizard UI for 2-step deployment
3. Add validation to ensure URLs are correct
4. Update CODE2.gs registration to use AdminWrapper URLs
