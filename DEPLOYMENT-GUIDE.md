# Swell Booking System - Deployment Guide

## Architecture Overview

This is a **single-file, per-user booking system** where each user deploys ONE file (Code.gs) and gets everything they need.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  GITHUB PAGES (Public Marketing Website)                    │
│  https://weboutright.github.io/swell3/                      │
│                                                              │
│  - index.html (Landing page with login)                     │
│  - features.html (Feature showcase)                         │
│  - pricing.html (Pricing page)                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ User clicks "Get Started"
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  USER COPIES Code.gs TO THEIR APPS SCRIPT                   │
│                                                              │
│  One file contains EVERYTHING:                              │
│  ✅ Backend API                                             │
│  ✅ Admin dashboard HTML                                    │
│  ✅ Booking widget HTML                                     │
│  ✅ Authentication                                           │
│  ✅ Calendar integration                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Deploy as Web App
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  USER'S UNIQUE DEPLOYMENT URL                               │
│  https://script.google.com/macros/s/[USER_ID]/exec         │
│                                                              │
│  Routes:                                                     │
│  • ?action=login     → OAuth login                          │
│  • ?page=admin       → Admin dashboard                      │
│  • ?page=widget      → Booking widget                       │
│  • POST with action  → API endpoints                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Data stored in USER_PROPERTIES
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  USER'S GOOGLE ACCOUNT (Automatic Data Isolation)          │
│                                                              │
│  USER_PROPERTIES stores:                                    │
│  - userEmail, calendarId, timezone                          │
│  - services: [{name, duration, price}]                      │
│  - businessHours: {monday: {enabled, start, end}}           │
│  - holidays: [{name, start, end}]                           │
│  - paymentProcessor, basePaymentLink                        │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### � **One File Deployment**
- Copy `Code.gs` to Apps Script
- Deploy once
- Get admin panel + booking widget + API

### 🔐 **Automatic Per-User Isolation**
- USER_PROPERTIES automatically isolates data per Google account
- Each user can only access their own configuration
- No database setup needed

### 🎨 **Self-Contained Widget**
- Widget HTML embedded in Code.gs
- Automatically loads user's services and settings
- No external dependencies

### 📅 **Google Calendar Integration**
- Creates events in user's calendar
- Real-time availability checking
- Respects business hours and holidays

## Quick Start (5 Minutes)

## Quick Start (5 Minutes)

### Step 1: Copy Code.gs to Apps Script

1. Go to https://script.google.com
2. Click **New project**
3. Copy the entire `Code.gs` file from this repo
4. Paste it into the Apps Script editor
5. Name your project: "My Booking System"

### Step 2: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure settings:
   - **Description**: "Booking System v1"
   - **Execute as**: **User accessing the web app** ✅ (CRITICAL!)
   - **Who has access**: **Anyone**
5. Click **Deploy**
6. Copy your deployment URL (e.g., `https://script.google.com/macros/s/AKfycbz.../exec`)

### Step 3: Test Your System

1. Open your deployment URL in a new tab
2. Add `?page=admin` to the URL
3. You'll be redirected to login with Google
4. Authorize the app
5. Configure your:
   - Services (name, duration, price)
   - Business hours
   - Calendar ID (use "primary" for your main calendar)
   - Payment processor (Stripe or Square)

### Step 4: Embed Your Widget

1. In the admin dashboard, go to **Deployment & Embed**
2. Copy the iframe code
3. Paste it into your website:

```html
<iframe 
  src="YOUR_DEPLOYMENT_URL?page=widget" 
  width="100%" 
  height="600px" 
  frameborder="0">
</iframe>
```

**Done!** Your booking widget is live and taking bookings! 🎉

## How Users Get Started

When someone visits your website and wants to use Swell:

1. They click "Get Started" on https://weboutright.github.io/swell3/
2. They're guided to copy Code.gs
3. They deploy to their own Apps Script
4. They get their unique URLs:
   - Admin: `their-url?page=admin`
   - Widget: `their-url?page=widget`
5. They configure their services
6. They embed widget on their website
7. Customers book directly!

## Understanding the Architecture

### One File = Everything

The `Code.gs` file contains:

1. **Backend API** - Handles bookings, availability checks
2. **Admin Dashboard HTML** - Served at `?page=admin`
3. **Widget HTML** - Served at `?page=widget`
4. **Authentication** - OAuth with Google
5. **Storage** - USER_PROPERTIES for data isolation

### Automatic Data Isolation

Google Apps Script's USER_PROPERTIES provides **automatic multi-tenancy**:

- Deployed **once** at: `script.google.com/macros/s/ABC123/exec`
- User A logs in → Gets their own data in their Google account
- User B logs in → Gets their own data in their Google account
- **Same URL, different data** - automatically isolated!

This is why you don't need Apps Script API to create projects - one deployment serves everyone!

## API Endpoints

All calls go to: `YOUR_SCRIPT_URL`

### Authentication
- `?action=login` - OAuth login flow
- `?page=admin` - Admin dashboard (requires auth)
- `?page=widget` - Public booking widget

### POST API
Send JSON with `action` parameter:

```javascript
{
  "action": "getUserData",
  "token": "JWT_TOKEN"
}
```

Available actions:
- `getUserData` - Get user's configuration
- `saveConfiguration` - Save user's settings
- `getAvailability` - Check calendar availability
- `createBooking` - Create a booking
- `getServices` - Get user's services list

## Security

- **JWT tokens** with 1-hour expiry
- **OAuth** with Google for authentication
- **USER_PROPERTIES** for automatic data isolation
- **CORS** enabled for widget embedding
- **X-Frame-Options** set to ALLOWALL for iframe embedding

## Maintenance

### Updating Code.gs
1. Make changes in Google Apps Script editor
2. Click **Deploy** → **Manage deployments**
3. Click ✏️ (Edit) on your deployment
4. Change version to **New version**
5. Click **Deploy**

### Monitoring
- View logs: **Executions** tab in Apps Script
- Check errors: Look for failed API calls
- User issues: Check their Google account permissions

## Common Issues

### "Login Required" error
- User needs to authorize the app
- Check that "Execute as: User accessing the web app" is set

### Widget not loading
- Check CORS settings
- Verify `?page=widget` is appended to URL
- Check iframe isn't blocked by CSP

### Data not saving
- Verify JWT token is valid
- Check USER_PROPERTIES quota (500KB per user)
- Look at Apps Script execution logs

## FAQ

**Q: Do I need separate Apps Script projects for each user?**
A: No! One deployment serves all users with automatic data isolation via USER_PROPERTIES.

**Q: How many users can use the system?**
A: Unlimited! Each user gets their own isolated storage in their Google account.

**Q: Can users see each other's data?**
A: No! USER_PROPERTIES is completely isolated per Google account.

**Q: What if I update Code.gs?**
A: All users automatically get the update since they all use the same deployment URL.

**Q: Do users need a Google account?**
A: Yes, for the admin panel. But their customers (who book) don't need Google accounts.

---

Built with ❤️ by Swell Booking System
