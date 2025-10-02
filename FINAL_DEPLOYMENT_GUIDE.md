# 🌊 Swell Booking System - Final Deployment Architecture

## Architecture Overview

### Static Files (GitHub Pages)
- ✅ `index.html` - Home page (completely static)
- ✅ `features.html` - Features page (completely static)
- ✅ `pricing.html` - Pricing page (completely static)

### Dynamic Files (Google Apps Script)
- ✅ `admin.html` - Admin dashboard (requires Google authentication)
- ✅ `widget.html` - Booking widget (uses Google Calendar API)
- ✅ `Code.gs` - Backend API

## 📋 Deployment Steps

### Step 1: Deploy Backend to Google Apps Script

1. Go to https://script.google.com
2. Create new project: "Swell Booking API"
3. Create two files:
   - `Code.gs` - Copy from `/home/harrison/Desktop/swell/Code.gs`
   - `admin.html` - Copy from `/home/harrison/Desktop/swell/admin.html`
   - `widget.html` - Copy from `/home/harrison/Desktop/swell/widget.html`

4. Deploy as Web App:
   - Click **Deploy** > **New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**

5. **COPY THE DEPLOYMENT URL** (e.g., `https://script.google.com/macros/s/ABC123.../exec`)

### Step 2: Update Static HTML Files

Update `index.html`, `features.html`, and `pricing.html`:

Find this line in each file:
```javascript
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';
```

Replace with your actual Google Apps Script deployment URL:
```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/ABC123.../exec';
```

### Step 3: Deploy Static Files to GitHub Pages

```bash
cd /home/harrison/Desktop/swell

# Initialize git repository
git init

# Add only static files
git add index.html features.html pricing.html

# Commit
git commit -m "Initial deployment - static pages"

# Add remote (replace with your repo)
git remote add origin https://github.com/YOUR_USERNAME/swell-booking.git

# Push to main
git branch -M main
git push -u origin main
```

### Step 4: Configure GitHub Pages

1. Go to your repository on GitHub
2. Settings > Pages
3. Source: Deploy from branch `main` / root
4. Save

Your site will be at: `https://YOUR_USERNAME.github.io/swell-booking/`

### Step 5: Add Custom Domain (Optional)

1. In GitHub Pages settings, add your custom domain
2. In your DNS provider, add CNAME record:
   ```
   Type: CNAME
   Name: book (or your subdomain)
   Value: YOUR_USERNAME.github.io
   ```

## 🔗 How It Works

### User Journey

1. **Visit Your Site** (`https://yourdomain.com`)
   - User browses `index.html`, `features.html`, `pricing.html`
   - All served from GitHub Pages (fast, static)

2. **Click "Login"**
   - JavaScript redirects to: `GOOGLE_SCRIPT_URL?page=admin`
   - Google handles authentication
   - User logs in with Google account

3. **Admin Dashboard**
   - Google Apps Script serves `admin.html`
   - Admin dashboard makes API calls to Code.gs
   - All data stored in Google Calendar & Script Properties

4. **Booking Widget**
   - Customers use the widget on your site
   - Widget makes API calls to Google Apps Script
   - Bookings go directly to your Google Calendar

## 📁 File Locations

```
GitHub Pages (Your Custom Domain)
├── index.html           (Static - Home page)
├── features.html        (Static - Features)
└── pricing.html         (Static - Pricing)

Google Apps Script (script.google.com)
├── Code.gs             (Backend API)
├── admin.html          (Admin dashboard - authenticated)
└── widget.html         (Booking widget - public)
```

## 🔐 Authentication Flow

```
User clicks "Login" on GitHub Pages site
         ↓
Redirects to Google Apps Script URL
         ↓
Google Authentication
         ↓
Code.gs checks: Is authenticated? Is admin?
         ↓
If YES: Serve admin.html template
If NO: Show "Access Denied" or "Login Required"
```

## 🔧 Configuration

### admin.html Template Variables
In Code.gs, we pass these variables to admin.html:
```javascript
template.userEmail = session.email;
template.apiUrl = ScriptApp.getService().getUrl();
```

### In admin.html, use them like this:
```html
<script>
  const API_URL = '<?= apiUrl ?>';
  const USER_EMAIL = '<?= userEmail ?>';
</script>
```

## 📊 Data Flow

### Static Pages → Google Script
```javascript
// In index.html, features.html, pricing.html
function loginToAdmin() {
    window.location.href = GOOGLE_SCRIPT_URL + '?page=admin';
}
```

### Admin Dashboard → API
```javascript
// In admin.html (served by Google Script)
fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
        action: 'getConfiguration'
    })
})
```

## ✅ Testing Checklist

- [ ] Deploy Code.gs to Google Apps Script
- [ ] Upload admin.html and widget.html to Google Apps Script
- [ ] Copy deployment URL
- [ ] Update GOOGLE_SCRIPT_URL in static HTML files
- [ ] Push static files to GitHub
- [ ] Enable GitHub Pages
- [ ] Test navigation on your site
- [ ] Click "Login" - should redirect to Google authentication
- [ ] After login, admin dashboard should load
- [ ] Test saving configuration in admin panel
- [ ] Verify data saves to Google Calendar

## 🚀 Benefits of This Architecture

✅ **Fast Static Pages** - GitHub Pages serves HTML instantly  
✅ **Secure Authentication** - Google handles all login  
✅ **No Domain Redirects** - Static pages stay on your domain  
✅ **Scalable** - GitHub Pages handles unlimited traffic  
✅ **Free Forever** - GitHub Pages + Google Apps Script both free  
✅ **Easy Updates** - Edit static pages without touching Google Script  

## 🔄 Updating Your Site

### Update Static Pages
```bash
cd /home/harrison/Desktop/swell
git add index.html features.html pricing.html
git commit -m "Update content"
git push
```
GitHub Pages automatically redeploys.

### Update Admin Dashboard or API
1. Edit in Google Apps Script editor
2. Deploy > Manage deployments
3. Edit deployment > New version
4. Deploy

## 📝 Important URLs

**Your Custom Domain:**
- Home: `https://yourdomain.com/index.html`
- Features: `https://yourdomain.com/features.html`
- Pricing: `https://yourdomain.com/pricing.html`

**Google Apps Script:**
- Admin: `https://script.google.com/macros/s/YOUR_ID/exec?page=admin`
- Widget: `https://script.google.com/macros/s/YOUR_ID/exec?page=widget`
- API: `https://script.google.com/macros/s/YOUR_ID/exec` (POST requests)

## 🎯 Summary

Your Swell booking system now uses a **hybrid architecture**:

1. **Marketing site** (index, features, pricing) → Fast, static, on your domain
2. **Admin dashboard** → Authenticated, served by Google Apps Script
3. **Booking widget** → Public, served by Google Apps Script
4. **API backend** → Handles all data, runs on Google Apps Script

This gives you the best of both worlds: fast static pages on your domain, with powerful authenticated features when needed!
