# Quick Fix for Setup Issues

## Problem: "405 Not Allowed" Error

If you're seeing this error when trying to complete setup, here's the quick fix:

### ✅ Simple Solution (No CODE2.gs Needed)

The setup wizard has been updated to work WITHOUT CODE2.gs. Here's what happens now:

1. **User completes setup wizard** → Deployment URL saved to browser localStorage
2. **User clicks "Open Admin Dashboard"** → Goes to admin.html with URL parameter
3. **Admin.html loads** → Connects to their Code.gs backend automatically

**No central authentication needed!** Each user manages their own deployment independently.

---

## How It Works Now

### Setup Flow:
```
1. User visits setup-wizard.html
2. Follows 4-step process
3. Deploys their Code.gs
4. Pastes deployment URL
5. URL saved to localStorage
6. Clicks "Open Admin Dashboard"
7. → Redirects to: admin.html?deploymentUrl=THEIR_URL
8. Admin.html connects to their backend
```

### Returning Users:
```
1. User visits admin.html
2. Admin.html checks localStorage for deployment URL
3. If found → Connects automatically
4. If not found → Redirects to setup wizard
```

---

## Current Settings

- **CODE2.gs**: Optional (disabled by default)
- **Setup Wizard**: Works standalone
- **Admin.html**: Uses localStorage + URL parameter

---

## If You Want to Enable CODE2.gs Later

CODE2.gs is optional but useful if you want:
- Users to bookmark ONE URL (your admin.html) 
- Automatic deployment URL lookup
- Centralized user directory

### To Enable:

1. Deploy CODE2.gs to your Google account
2. Get the deployment URL
3. Open `setup-wizard.html`
4. Find line ~500:
   ```javascript
   const AUTH_HUB_URL = '';
   ```
5. Update to:
   ```javascript
   const AUTH_HUB_URL = 'https://script.google.com/macros/s/YOUR_CODE2_ID/exec';
   ```
6. Push to GitHub

### CODE2.gs Deployment Settings:
- **Execute as**: Me (your@gmail.com)
- **Who has access**: Anyone
- **Purpose**: URL lookup service only (no user data stored except email→URL mapping)

---

## Testing the Fix

### Test 1: New User Setup
1. Go to setup-wizard.html in incognito mode
2. Complete all 4 steps
3. Paste your deployment URL
4. Click "Verify & Complete Setup"
5. Should show success screen
6. Click "Open Admin Dashboard"
7. Should load admin.html with your deployment URL

### Test 2: Returning User
1. Close and reopen browser
2. Go to admin.html directly
3. Should load your backend automatically (from localStorage)
4. If not, should prompt to complete setup

### Test 3: Clear and Try Again
1. Clear browser data (localStorage)
2. Go to admin.html
3. Should redirect to setup wizard
4. Complete setup again
5. Should work

---

## Troubleshooting

### "Redirecting please wait" stuck
**Cause**: localStorage not being read properly  
**Fix**: 
1. Open browser console (F12)
2. Type: `localStorage.getItem('swell_deployment_url')`
3. If null, localStorage was cleared - complete setup again
4. If shows URL, check admin.html `getGoogleScriptUrl()` function

### Admin.html won't connect to backend
**Cause**: Deployment URL not in localStorage or query param  
**Fix**:
1. Complete setup wizard again
2. Or manually set: `localStorage.setItem('swell_deployment_url', 'YOUR_URL')`
3. Or visit: `admin.html?deploymentUrl=YOUR_URL`

### Can't access setup wizard
**Cause**: Browser blocking localStorage  
**Fix**:
1. Check browser privacy settings
2. Allow cookies/localStorage for your domain
3. Try different browser

---

## Summary

✅ **Setup wizard now works standalone** (no CODE2.gs required)  
✅ **Admin.html uses localStorage** (no authentication hub needed)  
✅ **Each user independent** (no cross-user data)  
✅ **CODE2.gs optional** (enable later if desired)  

The 405 error is fixed by removing the dependency on CODE2.gs during setup!
