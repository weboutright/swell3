# API Key Authentication Setup Guide

## Overview
Swell now uses API key authentication for secure communication between the admin dashboard and Code.gs backend. This provides better security than Gmail-only authentication.

## How It Works

### 1. Registration Flow (Setup Wizard)
When a user completes the setup wizard:
- User provides Gmail + Code.gs deployment URL
- CODE2.gs generates a unique API key (format: `sk_xxxxxxxxxx`)
- API key stored in Google Sheet (column 6)
- API key returned to frontend and stored in localStorage

### 2. Login Flow (All Marketing Pages)
When a user signs in:
- User enters Gmail address
- CODE2.gs looks up Gmail in Google Sheet
- Returns Code.gs URL + API key
- Frontend redirects to admin.html with: `?deploymentUrl=URL&gmail=EMAIL&apiKey=KEY`
- Admin page stores API key in localStorage

### 3. API Requests (Admin Dashboard)
When admin.html needs data from Code.gs:
- Checks localStorage for `swell_api_key`
- Makes GET request: `Code.gs?action=getUserData&apiKey=KEY`
- Code.gs validates API key against stored value in UserProperties
- Returns user data if valid

## Google Sheet Structure

Your CODE2.gs Google Sheet should have these columns:

| Column | Name | Description |
|--------|------|-------------|
| A | Gmail | User's Gmail address |
| B | Code.gs URL | User's deployment URL |
| C | Created Date | Registration timestamp |
| D | Last Login | Last login timestamp |
| E | Status | Account status (active/inactive) |
| F | API Key | Unique API key (sk_xxxxx) |

## Security Benefits

1. **No password storage** - Users authenticate with Gmail, but API key is separate
2. **Revocable access** - Admin can regenerate API keys without changing Gmail
3. **Secure API calls** - All admin panel requests use API key instead of Gmail
4. **LocalStorage persistence** - User stays logged in across sessions

## Backward Compatibility

The system still supports Gmail-only authentication for backward compatibility:
- `?action=getUserData&gmail=EMAIL` still works
- Gradually migrate users to API key authentication
- Both methods validate against user's Code.gs deployment

## API Key Storage Locations

1. **CODE2.gs Google Sheet** (column F) - Master list of all API keys
2. **Browser localStorage** (`swell_api_key`) - User's current session
3. **Code.gs UserProperties** (`API_KEY`) - Per-deployment validation

## Testing

To test API key authentication:

1. Register new user via setup wizard
2. Check console for API key in registration response
3. Check localStorage: `localStorage.getItem('swell_api_key')`
4. Check Google Sheet column F for API key
5. Try admin.html with API key in URL
6. Verify admin panel loads correctly

## Troubleshooting

**API key not working?**
- Check that Code.gs has stored the API key in UserProperties
- Verify API key matches between Sheet and localStorage
- Check browser console for authentication errors

**Need to regenerate API key?**
- Manually edit Google Sheet column F
- Update localStorage: `localStorage.setItem('swell_api_key', 'new_key')`
- Or re-register through setup wizard

**API key missing after login?**
- Check that CODE2.gs returns `apiKey` in authentication response
- Verify frontend stores it: `localStorage.setItem('swell_api_key', result.apiKey)`
- Check URL parameters include `&apiKey=...`
