# 🌊 Swell Booking System - Complete Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Authentication & Data Flow](#authentication--data-flow)
4. [File Breakdown](#file-breakdown)
5. [API Endpoints](#api-endpoints)
6. [Known Issues & Fixes](#known-issues--fixes)
7. [Deployment Guide](#deployment-guide)

---

## System Overview

**Swell** is a multi-tenant SaaS booking platform that allows users to:
- Deploy their own Google Apps Script backend (Code.gs) to their personal Google account
- Manage bookings, services, and calendar integration via a centralized admin dashboard
- Embed a customizable booking widget on their websites
- Accept payments through Stripe or other processors

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S PERSPECTIVE                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User visits index.html (Marketing Site)                  │
│  2. User logs in with Gmail                                  │
│  3. Redirected to admin.html (Dashboard)                     │
│  4. Dashboard loads user's booking data from their Code.gs   │
│  5. User embeds widget.html on their website                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   TECHNICAL ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  CODE2.gs (Central Auth Hub)                                 │
│  ├─ Google Sheet database (Gmail → Code.gs URL mapping)     │
│  ├─ Handles user registration                                │
│  └─ Authenticates users and returns their backend URL        │
│                                                               │
│  Code.gs (Personal Backend) - Each user deploys their own    │
│  ├─ JWT-based authentication                                 │
│  ├─ UserProperties for isolated data storage                 │
│  ├─ Calendar API integration                                 │
│  ├─ Booking management                                        │
│  ├─ Service configuration                                     │
│  └─ Widget serving (JSONP for cross-domain)                  │
│                                                               │
│  admin.html (Dashboard Frontend) - GitHub Pages hosted       │
│  ├─ User management interface                                │
│  ├─ Service configuration                                     │
│  ├─ Calendar management                                       │
│  ├─ Analytics & reporting                                     │
│  └─ Widget embed code generator                              │
│                                                               │
│  widget.html (Booking Widget) - Embeddable iframe            │
│  ├─ Service selection                                         │
│  ├─ Date/time picker                                          │
│  ├─ Booking form                                              │
│  └─ Payment integration                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Components

### 1. CODE2.gs - Central Authentication Hub

**Purpose:** Centralized user directory that maps Gmail addresses to individual Code.gs deployment URLs.

**Storage:** Google Sheets database with columns:
- Gmail (unique identifier)
- Code.gs URL (user's personal backend deployment)
- Created Date
- Last Login
- Status (active/inactive)

**Key Functions:**
- `registerUser(gmail, codeGsUrl)` - Add new user to Sheet
- `getUserByGmail(gmail)` - Look up user's backend URL
- `handleAuthenticate(data)` - Process login requests
- `createSessionToken(email)` - Generate JWT tokens

**Deployment:**
- Lives in YOUR Google account (the platform owner)
- Web App deployment with "Anyone" access
- Single instance serves ALL users

**Important Notes:**
- This is NOT the user's personal backend
- It only stores the directory mapping
- Does NOT handle booking logic or user data storage
- Acts as a "phone book" pointing users to their backends

---

### 2. Code.gs - Personal User Backend

**Purpose:** Each user deploys this to their OWN Google account to handle all booking operations.

**Storage:** 
- UserProperties (per-user isolated storage in Google Apps Script)
- User's personal Google Calendar

**Multi-Tenant Design:**
- Each user has their own instance
- Data isolation via UserProperties
- No data sharing between users
- Each instance is completely independent

**Key Features:**

#### Authentication System
- **JWT Tokens:** HS256 signing, 1-hour TTL, 10-minute refresh threshold
- **Three Auth Methods:**
  1. Token-based (primary method for admin dashboard)
  2. Gmail-based (simplified auth with API key storage)
  3. API Key-based (most secure, stored in UserProperties)

#### Configuration Management (UserProperties Keys)
```javascript
USER_CONFIG_KEYS = {
  USER_EMAIL: 'USER_EMAIL',
  CALENDAR_ID: 'CALENDAR_ID',
  TIMEZONE: 'TIMEZONE',
  BUSINESS_HOURS: 'BUSINESS_HOURS',
  SERVICES: 'SERVICES',
  HOLIDAYS: 'HOLIDAYS',
  PAYMENT_PROCESSOR: 'PAYMENT_PROCESSOR',
  BASE_PAYMENT_LINK: 'BASE_PAYMENT_LINK',
  PAYMENTS_ENABLED: 'PAYMENTS_ENABLED',
  API_KEY: 'API_KEY'
}
```

#### HTTP Routing

**doGet(e) - HTTP GET Requests:**
- `?page=admin` → Serve admin dashboard HTML
- `?page=widget` → Serve booking widget HTML
- `?action=getUserData&token=xxx` → Get user configuration
- `?action=getUserDataByGmail&email=xxx` → Simplified auth
- `?action=getPublicServices&user=xxx` → Public services list
- `?action=getAvailability&date=xxx&serviceId=xxx` → Available time slots
- `?callback=xxx` → JSONP support for cross-domain widget

**doPost(e) - HTTP POST Requests:**
- `action: 'saveConfiguration'` → Save user settings
- `action: 'createBooking'` → Create new booking
- `action: 'cancelBooking'` → Cancel existing booking
- `action: 'saveBusinessHours'` → Update business hours
- `action: 'saveServices'` → Update services
- `action: 'saveHolidays'` → Update holiday schedule

#### Calendar Integration
- Uses CalendarApp API to access user's Google Calendar
- `getAvailability()` - Checks calendar for free slots
- `createBooking()` - Creates calendar events with guest invites
- `cancelBooking()` - Deletes calendar events and sends notifications

#### Email Notifications
- `sendBookingConfirmationEmail()` - Confirmation to customer
- `sendCancellationEmail()` - Cancellation notifications
- Uses MailApp API with HTML templates

#### Widget Serving
- Serves widget.html via `serveWidgetPage()`
- JSONP support for cross-domain embedding
- Allows widget to bypass CORS restrictions
- Callback parameter for JavaScript injection

---

### 3. admin.html - Dashboard Frontend

**Purpose:** Control panel for users to manage their booking system.

**Hosting:** GitHub Pages at `https://weboutright.github.io/swell3/admin.html`

**Key Sections:**

#### 1. Dashboard (Overview)
- Total bookings count
- Revenue analytics
- Upcoming bookings list
- Quick stats

#### 2. Services Management
- Create/edit/delete services
- Configure pricing, duration, descriptions
- Enable/disable services
- Meeting link configuration

#### 3. Calendar Management
- Calendar ID configuration
- Business hours setup (per day of week)
- Holiday schedule management
- Timezone settings

#### 4. Settings
- Google Calendar integration
- Payment processor configuration (Stripe, PayPal, etc.)
- Base payment link setup
- Email notifications

#### 5. Widget Configuration
- Embed code generator
- Widget customization options
- Preview functionality

#### 6. Analytics
- Booking statistics
- Revenue tracking
- Date range filtering

**Critical Functions:**

```javascript
// Get user's Code.gs URL from query params or localStorage
async function getGoogleScriptUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const scriptUrlFromQuery = urlParams.get('scriptUrl'); // ⚠️ BUG: Should be 'deploymentUrl'
    
    if (scriptUrlFromQuery) {
        localStorage.setItem('google_script_url', scriptUrlFromQuery);
        return scriptUrlFromQuery;
    }
    
    // Check localStorage
    const storedUrl = localStorage.getItem('google_script_url');
    if (storedUrl) return storedUrl;
    
    // If no URL found, redirect to main site
    window.location.href = 'https://weboutright.github.io/swell3';
    return null;
}

// Initialize dashboard on page load
async function initializeAdminPanel() {
    GOOGLE_SCRIPT_URL = await getGoogleScriptUrl();
    
    // Get session token from URL hash or trigger login
    const token = await getSessionFromHash();
    
    // Fetch user data from their Code.gs backend
    const userData = await fetchUserData(token);
    
    // Render dashboard with user's configuration
    renderDashboard(userData);
}
```

**Authentication Flow:**
1. User lands on admin.html with `?deploymentUrl=XXX` parameter (from login)
2. Dashboard extracts URL and stores in localStorage
3. Extracts JWT token from URL hash
4. Calls user's Code.gs with token to fetch configuration
5. Renders dashboard with user's data

---

### 4. index.html - Marketing & Login Page

**Purpose:** Landing page with login modal for existing users.

**Hosting:** GitHub Pages at `https://weboutright.github.io/swell3/index.html`

**Key Features:**
- Marketing content (features, pricing, testimonials)
- Login modal
- Setup wizard link
- Demo widget showcase

**Login Flow:**

```javascript
// CODE2.gs Authentication Hub URL
const AUTH_HUB_URL = 'https://script.google.com/macros/s/.../exec';

async function handleLogin(gmail) {
    // Call CODE2.gs to authenticate
    const url = `${AUTH_HUB_URL}?action=authenticate&gmail=${encodeURIComponent(gmail)}`;
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
        // Redirect to admin dashboard with user's Code.gs URL
        const redirectUrl = 'admin.html?deploymentUrl=' + encodeURIComponent(result.codeGsUrl) + 
                           '#token=' + result.token;
        window.location.href = redirectUrl;
    } else {
        // Show error: "Gmail not found. Complete setup wizard first."
    }
}
```

**Key Points:**
- Login sends `deploymentUrl` parameter to admin.html
- CODE2.gs returns user's personal Code.gs URL
- Token passed in URL hash for security
- If Gmail not found, redirects to setup wizard

---

### 5. widget.html - Embeddable Booking Widget

**Purpose:** Customer-facing booking interface that can be embedded on any website.

**Hosting:** Served dynamically by each user's Code.gs deployment.

**Embedding Methods:**

**1. IFrame Embed (Recommended):**
```html
<iframe 
    src="https://script.google.com/macros/s/YOUR_CODE_GS_ID/exec?page=widget&user=YOUR_EMAIL" 
    width="100%" 
    height="600" 
    frameborder="0">
</iframe>
```

**2. JSONP Embed (Cross-Domain):**
```javascript
<script src="https://script.google.com/macros/s/YOUR_CODE_GS_ID/exec?callback=swellInit"></script>
```

**Widget Flow:**
1. Customer selects service
2. Picks date and time from available slots
3. Fills out booking form
4. (Optional) Completes payment
5. Receives confirmation email
6. Booking added to user's Google Calendar

**Data Sources:**
- Services list from user's Code.gs (`getPublicServices`)
- Availability from Google Calendar (`getAvailability`)
- Booking creation via POST (`createBooking`)

---

## Authentication & Data Flow

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SETUP PHASE (One-time)                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User → setup-wizard.html                                        │
│   ├─ Guides user to deploy Code.gs to their Google account      │
│   ├─ User copies their Code.gs deployment URL                   │
│   ├─ User enters Gmail + Code.gs URL                            │
│   └─ Wizard calls CODE2.gs to register user in Sheet            │
│                                                                  │
│  CODE2.gs.registerUser(gmail, codeGsUrl)                        │
│   └─ Adds row to Google Sheet: [Gmail, URL, Date, '', 'active']│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. LOGIN FLOW (Each session)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User → index.html → Clicks "Sign In"                           │
│   ├─ Enters Gmail address                                       │
│   └─ Submits to CODE2.gs                                        │
│                                                                  │
│  index.html → CODE2.gs.authenticate(gmail)                      │
│   ├─ CODE2.gs looks up Gmail in Sheet                           │
│   ├─ Finds user's Code.gs URL                                   │
│   └─ Returns: { success: true, codeGsUrl: "..." }               │
│                                                                  │
│  index.html receives response                                    │
│   ├─ Constructs redirect URL                                    │
│   └─ Redirects to: admin.html?deploymentUrl=XXX#token=YYY      │
│                                                                  │
│  ⚠️ BUG: admin.html looks for 'scriptUrl' not 'deploymentUrl'  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. DASHBOARD SESSION (After login)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  admin.html → getGoogleScriptUrl()                              │
│   ├─ Checks URL params for 'scriptUrl' ❌ (WRONG PARAM NAME)   │
│   ├─ Should check for 'deploymentUrl' ✅                        │
│   ├─ Falls back to localStorage                                 │
│   └─ If not found, redirects to main site (LOOP!)               │
│                                                                  │
│  admin.html → Code.gs.getUserData(token)                        │
│   ├─ Code.gs verifies JWT token                                 │
│   ├─ Loads user config from UserProperties                      │
│   └─ Returns: { user, config, services, holidays, etc. }        │
│                                                                  │
│  admin.html renders dashboard                                    │
│   ├─ Shows services, bookings, analytics                        │
│   ├─ All API calls go to user's Code.gs                         │
│   └─ Token stored in localStorage for subsequent requests       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 4. CUSTOMER BOOKING FLOW (Widget)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Customer → User's website with embedded widget                  │
│   └─ IFrame: https://script.google.com/.../exec?page=widget     │
│                                                                  │
│  widget.html → Code.gs.getPublicServices(userEmail)             │
│   └─ Loads available services from UserProperties               │
│                                                                  │
│  Customer selects service and date                               │
│   └─ widget.html → Code.gs.getAvailability(date, serviceId)     │
│       ├─ Code.gs checks business hours configuration            │
│       ├─ Queries Google Calendar for existing bookings          │
│       └─ Returns available time slots                           │
│                                                                  │
│  Customer fills form and submits                                 │
│   └─ widget.html → Code.gs.createBooking(bookingData)           │
│       ├─ Code.gs creates Google Calendar event                  │
│       ├─ Sends confirmation email to customer                   │
│       ├─ Sends event invite to customer                         │
│       └─ Returns booking confirmation                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Security Model

**JWT Tokens:**
- Algorithm: HS256
- TTL: 1 hour (3600 seconds)
- Refresh threshold: 10 minutes before expiry
- Secret: Unique per Code.gs instance, stored in ScriptProperties
- Payload: `{ email, name, iat, exp }`

**Authentication Hierarchy:**
1. **API Key** (Most Secure) - Stored in UserProperties, prefixed with 'sk_'
2. **JWT Token** (Standard) - Generated on login, short-lived
3. **Gmail** (Convenience) - Simplified auth for widget/public endpoints

**Data Isolation:**
- Each user's Code.gs uses UserProperties (sandboxed per Google account)
- No cross-user data access possible
- Calendar data stays in user's Google Calendar
- Sheet in CODE2.gs only stores Gmail→URL mapping (no sensitive data)

---

## File Breakdown

### CODE2.gs (595 lines)
```
Lines 1-70:    Configuration & Sheet connection
Lines 71-170:  User database operations (registerUser, getUserByGmail, etc.)
Lines 171-350: Web app entry points (doGet, doPost routing)
Lines 351-450: Authentication handlers (register, authenticate, updateUrl)
Lines 451-550: JWT token generation & validation
Lines 551-595: Testing utilities & setup functions
```

### Code.gs (1592 lines)
```
Lines 1-100:   Configuration constants & UserProperties keys
Lines 101-300: Session management & JWT functions
Lines 301-500: HTTP routing (doGet, doPost)
Lines 501-700: User data & authentication methods
Lines 701-900: Configuration management (save/get settings)
Lines 901-1100: Calendar & booking operations
Lines 1101-1300: Availability calculation & time slot generation
Lines 1301-1450: Email notifications (booking confirmations, cancellations)
Lines 1451-1592: Utility functions (JSON response, date formatting, etc.)
```

### admin.html (1493 lines)
```
Lines 1-200:   HTML head, CSS styles, Tailwind config
Lines 201-400: Dashboard header & navigation sidebar
Lines 401-600: Dashboard section (overview, stats, charts)
Lines 601-800: Services management UI
Lines 801-1000: Calendar & business hours UI
Lines 1001-1200: Settings & payment configuration
Lines 1201-1400: Widget embed code generator
Lines 1401-1493: JavaScript initialization & API calls
```

### index.html (729 lines)
```
Lines 1-100:   HTML head, CSS styles, animations
Lines 101-200: Hero section with call-to-action
Lines 201-350: Features showcase
Lines 351-450: Pricing section
Lines 451-550: Testimonials & social proof
Lines 551-650: Login modal implementation
Lines 651-729: Footer & JavaScript (login handler)
```

### widget.html (1140 lines)
```
Lines 1-100:   HTML head, CSS styles for widget
Lines 101-300: Service selection UI
Lines 301-500: Calendar date picker
Lines 501-700: Time slot selection
Lines 701-900: Booking form
Lines 901-1000: Payment integration
Lines 1001-1140: JavaScript (availability, booking submission)
```

---

## API Endpoints

### CODE2.gs Endpoints

**Base URL:** `https://script.google.com/macros/s/YOUR_CODE2_ID/exec`

#### GET Requests

**1. Register User**
```
GET ?action=register&gmail=user@gmail.com&codeGsUrl=https://...
```
Response:
```json
{
  "success": true,
  "message": "Account registered successfully!",
  "gmail": "user@gmail.com"
}
```

**2. Authenticate User**
```
GET ?action=authenticate&gmail=user@gmail.com
```
Response:
```json
{
  "success": true,
  "gmail": "user@gmail.com",
  "codeGsUrl": "https://script.google.com/macros/s/.../exec"
}
```

**3. Account Management**
```
GET ?action=account&gmail=user@gmail.com
```
Redirects to admin.html with user's Code.gs URL

#### POST Requests

**1. Register User**
```json
POST /
{
  "action": "register",
  "gmail": "user@gmail.com",
  "codeGsUrl": "https://..."
}
```

**2. Authenticate User**
```json
POST /
{
  "action": "authenticate",
  "gmail": "user@gmail.com"
}
```

**3. Update URL**
```json
POST /
{
  "action": "updateUrl",
  "gmail": "user@gmail.com",
  "newCodeGsUrl": "https://..."
}
```

---

### Code.gs Endpoints

**Base URL:** `https://script.google.com/macros/s/YOUR_CODE_GS_ID/exec`

#### GET Requests

**1. Serve Admin Page**
```
GET ?page=admin
```
Returns: HTML of admin dashboard (deprecated - now uses GitHub Pages)

**2. Serve Widget**
```
GET ?page=widget&user=user@gmail.com
```
Returns: HTML of booking widget with JSONP support

**3. Get User Data (Token Auth)**
```
GET ?action=getUserData&token=JWT_TOKEN
```
Response:
```json
{
  "success": true,
  "user": {
    "name": "John",
    "email": "john@gmail.com",
    "avatarUrl": "..."
  },
  "config": {
    "calendarId": "john@gmail.com",
    "timezone": "America/New_York",
    "businessHours": { ... },
    "services": [ ... ],
    "holidays": [ ... ]
  },
  "token": "...",
  "exp": 1234567890
}
```

**4. Get User Data (Gmail Auth)**
```
GET ?action=getUserDataByGmail&email=user@gmail.com&apiKey=sk_xxx
```
Response: Same as above

**5. Get User Data (API Key Auth)**
```
GET ?action=getUserDataByApiKey&apiKey=sk_xxx
```
Response: Same as above

**6. Get Public Services**
```
GET ?action=getPublicServices&user=user@gmail.com
```
Response:
```json
{
  "success": true,
  "services": [
    {
      "id": "service_1",
      "name": "Consultation",
      "duration": 30,
      "price": 50,
      "enabled": true
    }
  ]
}
```

**7. Get Availability**
```
GET ?action=getAvailability&date=2024-01-15&serviceId=service_1&user=user@gmail.com
```
Response:
```json
{
  "success": true,
  "availableSlots": [
    {
      "start": "2024-01-15T09:00:00.000Z",
      "end": "2024-01-15T09:30:00.000Z",
      "displayTime": "9:00 AM"
    }
  ],
  "businessTimezone": "America/New_York"
}
```

**8. JSONP Callback (for cross-domain widgets)**
```
GET ?callback=swellInit&action=getPublicServices&user=user@gmail.com
```
Returns: JavaScript with callback function wrapper

#### POST Requests

**1. Save Configuration**
```json
POST /
{
  "action": "saveConfiguration",
  "token": "JWT_TOKEN",
  "config": {
    "calendarId": "...",
    "timezone": "...",
    "paymentProcessor": "stripe",
    "basePaymentLink": "...",
    "businessHours": { ... },
    "services": [ ... ],
    "holidays": [ ... ]
  }
}
```

**2. Create Booking**
```json
POST /
{
  "action": "createBooking",
  "booking": {
    "serviceId": "service_1",
    "date": "2024-01-15",
    "time": "09:00",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "notes": "Looking forward to it!"
  },
  "userIdentifier": "user@gmail.com"
}
```

**3. Cancel Booking**
```json
POST /
{
  "action": "cancelBooking",
  "token": "JWT_TOKEN",
  "bookingId": "CALENDAR_EVENT_ID"
}
```

**4. Get Bookings**
```json
POST /
{
  "action": "getBookings",
  "token": "JWT_TOKEN",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

**5. Save Business Hours**
```json
POST /
{
  "action": "saveBusinessHours",
  "token": "JWT_TOKEN",
  "businessHours": {
    "monday": { "enabled": true, "start": "09:00", "end": "17:00" },
    "tuesday": { "enabled": true, "start": "09:00", "end": "17:00" }
  }
}
```

**6. Save Services**
```json
POST /
{
  "action": "saveServices",
  "token": "JWT_TOKEN",
  "services": [
    {
      "id": "service_1",
      "name": "Consultation",
      "duration": 30,
      "price": 50,
      "enabled": true
    }
  ]
}
```

**7. Get Analytics**
```json
POST /
{
  "action": "getAnalytics",
  "token": "JWT_TOKEN",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```
Response:
```json
{
  "success": true,
  "analytics": {
    "totalBookings": 15,
    "totalRevenue": 750,
    "averageBookingValue": 50,
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z"
    }
  }
}
```

---

## Known Issues & Fixes

### 🐛 CRITICAL BUG: Parameter Name Mismatch

**Issue:**
The login flow is broken because of a parameter name mismatch between `index.html` and `admin.html`.

**Root Cause:**
```javascript
// index.html (line 616) - Sends parameter named 'deploymentUrl'
const redirectUrl = 'admin.html?deploymentUrl=' + encodeURIComponent(result.codeGsUrl);

// admin.html (line 1138) - Looks for parameter named 'scriptUrl' ❌
const scriptUrlFromQuery = urlParams.get('scriptUrl');
```

**Impact:**
- User completes login successfully in index.html
- Redirect to admin.html happens with `?deploymentUrl=XXX`
- admin.html fails to find parameter (looks for 'scriptUrl')
- Falls back to localStorage (empty on first login)
- Redirects back to main site
- Creates infinite redirect loop

**Fix:**
Change admin.html line 1138 to check for BOTH parameter names:

```javascript
// Before (BROKEN):
const scriptUrlFromQuery = urlParams.get('scriptUrl');

// After (FIXED):
const scriptUrlFromQuery = urlParams.get('deploymentUrl') || urlParams.get('scriptUrl');
```

This maintains backward compatibility while fixing the new login flow.

**Alternative Fix:**
Change index.html line 616 to send 'scriptUrl' instead:

```javascript
// Alternative fix in index.html:
const redirectUrl = 'admin.html?scriptUrl=' + encodeURIComponent(result.codeGsUrl);
```

**Recommended Solution:** Fix admin.html to accept both parameters (more robust).

---

### Other Potential Issues

**1. Token Expiry Handling**
- **Issue:** JWT tokens expire after 1 hour
- **Impact:** User must re-login after session expires
- **Solution:** Implement token refresh logic before expiry

**2. CORS Issues with Widget**
- **Issue:** Cross-domain requests from widget to Code.gs may fail
- **Impact:** Widget can't load services or availability on some sites
- **Solution:** JSONP callback support is already implemented (good!)

**3. No User Registration Validation**
- **Issue:** Users can register with any Gmail, even if Code.gs deployment fails
- **Impact:** Registered users with invalid Code.gs URLs can't use system
- **Solution:** Add validation step that tests Code.gs URL before registration

**4. No Account Deletion**
- **Issue:** No way to remove users from CODE2.gs Sheet
- **Impact:** Inactive accounts remain in database
- **Solution:** Add admin function to delete rows or mark as inactive

**5. Email Validation**
- **Issue:** No email validation during booking submission
- **Impact:** Invalid emails can be submitted
- **Solution:** Add regex validation in widget.html before submission

---

## Deployment Guide

### Prerequisites
- Google account
- GitHub account (for hosting frontend)
- Access to Google Apps Script
- Access to Google Calendar

---

### Part 1: Deploy CODE2.gs (One-time, Platform Owner)

**Step 1: Create Google Sheet**
1. Go to Google Sheets: https://sheets.google.com
2. Create new spreadsheet named "Swell User Database"
3. Add column headers in Row 1:
   - A1: `Gmail`
   - B1: `Code.gs URL`
   - C1: `Created Date`
   - D1: `Last Login`
   - E1: `Status`
4. Copy the Sheet ID from URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Example: `1jseJENSUcugbAxA_4mRQ_lpXTULrn5ENixuLewHjwJY`

**Step 2: Create Apps Script Project**
1. In your Sheet: Extensions → Apps Script
2. Delete default code
3. Paste CODE2.gs contents
4. Update Sheet ID in code (line ~56):
   ```javascript
   const sheetId = 'YOUR_SHEET_ID_HERE';
   ```

**Step 3: Deploy as Web App**
1. Click "Deploy" → "New deployment"
2. Type: "Web app"
3. Description: "Swell Central Auth Hub"
4. Execute as: **Me (your@gmail.com)**
5. Who has access: **Anyone**
6. Click "Deploy"
7. Copy deployment URL: `https://script.google.com/macros/s/CODE2_ID/exec`

**Step 4: Update Frontend URLs**
1. Open `admin.html` in editor
2. Find line ~1157: `const AUTH_HUB_URL = '...'`
3. Replace with your CODE2.gs deployment URL
4. Open `index.html` in editor
5. Find line ~578: `const AUTH_HUB_URL = '...'`
6. Replace with same CODE2.gs deployment URL
7. Open `setup-wizard.html` in editor (if exists)
8. Find and update AUTH_HUB_URL there too

---

### Part 2: Deploy Frontend to GitHub Pages

**Step 1: Create GitHub Repository**
1. Go to GitHub: https://github.com
2. Create new repository named "swell" (or any name)
3. Make it public
4. Don't initialize with README

**Step 2: Push Code**
```bash
cd /path/to/swell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/swell.git
git push -u origin main
```

**Step 3: Enable GitHub Pages**
1. Go to repository Settings
2. Pages section (left sidebar)
3. Source: Deploy from branch
4. Branch: main, folder: / (root)
5. Save
6. Note your GitHub Pages URL: `https://YOUR_USERNAME.github.io/swell/`

**Step 4: Update Links**
1. Update CODE2.gs (lines 50-52):
   ```javascript
   const MARKETING_SITE = 'https://YOUR_USERNAME.github.io/swell';
   const ADMIN_PAGE_URL = `${MARKETING_SITE}/admin.html`;
   ```
2. Redeploy CODE2.gs (New deployment)

---

### Part 3: User Setup (Each User)

**Step 1: Deploy Personal Code.gs**
1. Go to Google Apps Script: https://script.google.com
2. Create new project
3. Paste Code.gs contents
4. Save project (name: "Swell Booking Backend")

**Step 2: Configure Calendar Access**
1. In Apps Script editor
2. Click "Services" (+ icon on left)
3. Add "Google Calendar API"
4. Add "Google Sheets API" (if not already enabled)

**Step 3: Deploy as Web App**
1. Click "Deploy" → "New deployment"
2. Type: "Web app"
3. Description: "My Swell Booking System"
4. Execute as: **Me (your@gmail.com)** ← IMPORTANT!
5. Who has access: **Anyone**
6. Click "Deploy"
7. **Grant permissions:**
   - Allow access to Calendar
   - Allow access to send emails
   - Allow access to external requests
8. Copy deployment URL: `https://script.google.com/macros/s/YOUR_CODE_GS_ID/exec`

**Step 4: Register Account**
1. Go to setup wizard: `https://YOUR_USERNAME.github.io/swell/setup-wizard.html`
2. Paste your Code.gs deployment URL
3. Enter your Gmail (MUST match the Gmail of Google account used in Step 3.5)
4. Click "Register"
5. Confirmation message appears

**Step 5: Login & Configure**
1. Go to: `https://YOUR_USERNAME.github.io/swell/index.html`
2. Click "Sign In"
3. Enter your Gmail
4. Dashboard opens
5. Configure:
   - Calendar ID (usually your Gmail)
   - Business hours
   - Services (name, price, duration)
   - Payment settings
   - Timezone

**Step 6: Embed Widget**
1. In dashboard, go to "Widget" section
2. Copy embed code
3. Paste on your website:
```html
<iframe 
    src="https://script.google.com/macros/s/YOUR_CODE_GS_ID/exec?page=widget&user=YOUR_EMAIL@gmail.com" 
    width="100%" 
    height="700" 
    frameborder="0"
    style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
</iframe>
```

---

### Part 4: Testing & Verification

**Test Authentication Flow:**
1. Clear browser localStorage
2. Go to index.html
3. Click "Sign In"
4. Enter registered Gmail
5. Should redirect to admin.html
6. Dashboard should load with your configuration

**Test Booking Flow:**
1. Embed widget on test page
2. Select a service
3. Choose date/time
4. Fill out booking form
5. Submit
6. Check:
   - Confirmation email received
   - Event appears in Google Calendar
   - Booking shows in admin dashboard

**Test Calendar Integration:**
1. In dashboard, create manual booking
2. Check Google Calendar for event
3. Cancel booking in dashboard
4. Verify event deleted from Calendar

---

### Maintenance & Updates

**Update Code.gs (User):**
1. Edit code in Apps Script editor
2. Save
3. Deploy → Manage deployments
4. Edit existing deployment (pencil icon)
5. Version: New version
6. Deploy

**Update Frontend:**
```bash
git add .
git commit -m "Update description"
git push
```
Changes go live automatically on GitHub Pages.

**Update CODE2.gs (Platform Owner):**
1. Edit code in Apps Script editor
2. Save
3. Deploy → Manage deployments
4. Edit existing deployment
5. Version: New version
6. Deploy
7. URL remains the same (no need to update frontends)

---

## Troubleshooting

### "Gmail not found" Error
- **Cause:** User not registered in CODE2.gs Sheet
- **Solution:** Complete setup wizard first

### "Authentication required" Error
- **Cause:** JWT token expired or invalid
- **Solution:** Log out and log in again

### "Calendar not configured" Error
- **Cause:** Calendar ID not set in dashboard settings
- **Solution:** Go to Settings → Enter Calendar ID (usually your Gmail)

### Widget Not Loading
- **Cause:** Incorrect embed URL or user email
- **Solution:** Verify Code.gs deployment URL and user parameter in iframe src

### Bookings Not Appearing in Calendar
- **Cause:** Calendar ID mismatch or permissions issue
- **Solution:**
  1. Verify Calendar ID in dashboard settings
  2. Check Code.gs has Calendar API access
  3. Ensure user granted calendar permissions during deployment

### Admin Dashboard Blank/White Screen
- **Cause:** JavaScript error or API call failure
- **Solution:**
  1. Open browser console (F12)
  2. Check for errors
  3. Verify Code.gs deployment URL in localStorage
  4. Clear localStorage and re-login

### Infinite Redirect Loop
- **Cause:** Parameter name mismatch (THE BUG!)
- **Solution:** Apply fix in admin.html line 1138 (see Known Issues section)

---

## Development Notes

### Technology Stack
- **Frontend:** HTML, Tailwind CSS, Vanilla JavaScript
- **Backend:** Google Apps Script (JavaScript)
- **Database:** 
  - Google Sheets (for CODE2.gs user directory)
  - UserProperties (for per-user config in Code.gs)
- **Calendar:** Google Calendar API
- **Email:** MailApp (Google Apps Script)
- **Hosting:** GitHub Pages

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript required
- LocalStorage support required

### Mobile Responsive
- All pages use Tailwind CSS responsive utilities
- Widget adapts to mobile screens
- Touch-friendly date/time pickers

### Security Considerations
- JWT tokens for authentication
- HTTPS everywhere (GitHub Pages + Apps Script)
- No passwords stored (Gmail-based auth)
- UserProperties isolated per Google account
- CORS handled via JSONP for widgets

---

## Future Enhancements

### High Priority
1. **Fix parameter name mismatch** (Critical bug)
2. **Token refresh mechanism** (Better UX)
3. **Email validation** (Data quality)
4. **URL validation during registration** (Prevent errors)

### Medium Priority
1. **Multi-language support** (i18n)
2. **Custom email templates** (Branding)
3. **SMS notifications** (Twilio integration)
4. **Waitlist feature** (Overbooking prevention)
5. **Recurring bookings** (Weekly/monthly appointments)

### Low Priority
1. **Dark mode** (UI enhancement)
2. **Analytics dashboard** (More metrics)
3. **Customer management** (CRM lite)
4. **Team calendars** (Multiple providers)
5. **Custom fields** (Flexible forms)

---

## License & Credits

**Project:** Swell Booking System  
**Version:** 1.0  
**Last Updated:** 2024  

**Technologies Used:**
- Tailwind CSS
- Lucide Icons
- Google Apps Script
- Google Calendar API
- Google Sheets API

---

## Support & Contact

For issues or questions:
1. Check Troubleshooting section
2. Review Known Issues
3. Inspect browser console for errors
4. Verify deployment URLs are correct

---

**End of Documentation**
