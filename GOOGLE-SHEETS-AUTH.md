# Swell User Database Setup Guide (Google Sheets)

## Overview

This new approach uses a **centralized Google Sheet** to store ALL customer account data. Much simpler than having each user deploy multiple Apps Script projects!

## Benefits

✅ **One central database** - All users in one Google Sheet  
✅ **Username + password login** - Users pick memorable credentials  
✅ **Edit account in Sheet** - Direct link to edit their data  
✅ **Simple setup** - Users just paste Code.gs URL and create account  
✅ **No AdminWrapper needed** - admin.html works directly with dynamic URL  

## Architecture

```
User completes setup wizard
   ↓
Creates username + password
   ↓
Pastes Code.gs URL
   ↓
Data stored in YOUR Google Sheet
   ↓
User bookmarks admin.html
   ↓
admin.html → "Sign In" → CODE2.gs login page
   ↓
User enters username/password
   ↓
CODE2.gs checks Sheet → Finds URL
   ↓
Redirects to admin.html?deploymentUrl=USER_URL
   ↓
✅ User in their dashboard!
```

## Setup Instructions

### Step 1: Create User Database Sheet

**Option A: Auto-create (Easiest)**
```javascript
// In CODE2.gs Apps Script editor, run this function:
createUserSheet()

// Copy the Sheet ID from the logs
```

**Option B: Manual creation**
1. Create new Google Sheet
2. Name it "Swell User Database"
3. Add these headers in row 1:
   ```
   Username | Gmail | Password | Code.gs URL | Created Date | Last Login | Status
   ```
4. Copy Sheet ID from URL: `docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

### Step 2: Configure CODE2.gs

```javascript
// In CODE2.gs Apps Script editor, run:
setupSheet('YOUR_SHEET_ID_HERE')

// You'll see:
// ✅ Sheet connected successfully!
```

### Step 3: Deploy CODE2.gs

1. In Apps Script editor: **Deploy → New deployment**
2. Type: **Web app**
3. Settings:
   - Execute as: **Me** (your@gmail.com)
   - Who has access: **Anyone**
4. Click **Deploy**
5. Copy the deployment URL

### Step 4: Update Website Files

Update two files with your CODE2.gs URL:

**admin.html** (line ~1157):
```javascript
const AUTH_HUB_URL = 'YOUR_CODE2_URL_HERE';
```

**setup-wizard.html** (line ~500):
```javascript
const AUTH_HUB_URL = 'YOUR_CODE2_URL_HERE';
```

### Step 5: Test!

```javascript
// In CODE2.gs editor, run:
testSheetFlow()

// This will:
// - Create a test user
// - Test authentication
// - Test password validation
// - Show edit link
```

## Google Sheet Structure

| Column | Description | Example |
|--------|-------------|---------|
| Username | User's chosen username | `surfshop123` |
| Gmail | User's Gmail address | `john@gmail.com` |
| Password | SHA-256 hashed password | `aB3kT9p...` |
| Code.gs URL | Their deployment URL | `https://script.google.com/...` |
| Created Date | ISO timestamp | `2024-10-03T10:30:00Z` |
| Last Login | ISO timestamp (auto-updates) | `2024-10-03T15:45:00Z` |
| Status | Account status | `active` |

## User Flow

### Step 1: Registration (Setup Wizard)

User completes setup wizard:
```
Step 1: Deploy Code.gs
   - Create new Apps Script project
   - Paste Code.gs
   - ⚠️ ENABLE GOOGLE CALENDAR API (click Services → Add Calendar API)
   - Deploy as web app
Step 2: Copy deployment URL
Step 3: Paste URL in wizard
Step 4: Create account:
   - Choose username (3-20 chars, alphanumeric)
   - Enter Gmail address
   - Create password (min 6 chars)
Step 5: Click "Complete Setup"
```

Wizard sends to CODE2.gs:
```javascript
POST /
{
  action: 'register',
  username: 'surfshop123',
  gmail: 'john@gmail.com',
  password: 'mypassword123',
  codeGsUrl: 'https://script.google.com/...'
}
```

CODE2.gs:
- Validates data
- Hashes password
- Adds row to Sheet
- Returns success

### 2. Login (Admin Dashboard)

User visits admin.html:
```
1. Click "Sign In"
2. Redirected to CODE2.gs login page
3. Enter username + password
4. CODE2.gs checks Sheet
5. If valid → Redirects to admin.html?deploymentUrl=...
6. admin.html loads with their Code.gs URL
```

### 3. Account Management

User can:
- **View account**: CODE2.gs/?action=account&username=surfshop123
- **Edit in Sheet**: Click "Edit Account" → Opens Sheet at their row
- **Update URL**: Change Code.gs URL directly in Sheet
- **Change password**: Update password in Sheet (must be SHA-256 hashed)

## Security Features

### Password Hashing
Passwords stored as SHA-256 hash:
```javascript
// User's password: "mypassword123"
// Stored in Sheet: "aB3kT9p2xV7nQ8..." (base64 encoded SHA-256)
```

### Validation
- **Username**: 3-20 chars, alphanumeric + underscore only
- **Gmail**: Must be @gmail.com address
- **Password**: Minimum 6 characters
- **Code.gs URL**: Must be valid Apps Script deployment URL

### Duplicate Prevention
- Username must be unique
- Gmail must be unique
- Checked during registration

## API Endpoints

### POST `/?action=register`
Register new user from setup wizard.

**Request:**
```json
{
  "action": "register",
  "username": "surfshop123",
  "gmail": "john@gmail.com",
  "password": "mypassword123",
  "codeGsUrl": "https://script.google.com/macros/s/ABC123/exec"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully!",
  "username": "surfshop123"
}
```

### POST `/?action=authenticate`
Login user.

**Request:**
```json
{
  "action": "authenticate",
  "username": "surfshop123",
  "password": "mypassword123"
}
```

**Response:**
```json
{
  "success": true,
  "username": "surfshop123",
  "gmail": "john@gmail.com",
  "codeGsUrl": "https://script.google.com/macros/s/ABC123/exec",
  "accountLink": "?action=account&username=surfshop123"
}
```

### GET `/?action=login`
Shows login page HTML.

### GET `/?action=account&username=USERNAME`
Shows account management page with edit link.

## Useful Functions

### List All Users
```javascript
listAllUsers()
// Shows all registered users in logs
```

### Remove User
```javascript
removeUser('surfshop123')
// Deletes user from Sheet
```

### Test Everything
```javascript
testSheetFlow()
// Complete test of registration and authentication
```

## Troubleshooting

### "Sheet not configured" Error
Run `setupSheet('YOUR_SHEET_ID')` first.

### "Username already taken"
That username exists in the Sheet. Choose a different one.

### "Invalid Code.gs URL format"
URL must be: `https://script.google.com/macros/s/.../exec`

### Can't access Sheet
Make sure CODE2.gs is deployed as "Execute as: Me" so it has access to your Sheet.

### Password doesn't work
If you manually edit password in Sheet, it must be SHA-256 hashed:
```javascript
// In Apps Script console:
const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'newpassword');
const hashBase64 = Utilities.base64Encode(hash);
Logger.log(hashBase64); // Copy this to Sheet
```

## Next Steps

1. ✅ Create Google Sheet
2. ✅ Configure CODE2.gs with `setupSheet()`
3. ✅ Deploy CODE2.gs
4. ✅ Update admin.html and setup-wizard.html with CODE2 URL
5. ✅ Test with `testSheetFlow()`
6. 🔄 Update setup-wizard.html to include registration form
7. 🔄 Update admin.html to use CODE2.gs login
8. 🔄 Add "Edit Account" link in admin dashboard

## Comparison: Old vs New

### Old Approach (AdminWrapper)
- ❌ User deploys 2 Apps Script projects
- ❌ Complex setup
- ❌ Hard to edit URLs later
- ✅ No central database needed

### New Approach (Google Sheets)
- ✅ User deploys 1 Apps Script project (Code.gs)
- ✅ Simple username/password
- ✅ Easy to edit in Sheet
- ✅ Centralized user management
- ✅ You can see all customers in one place
- ✅ Direct Sheet editing for support
