# 🎬 Visual Setup Guide - Step by Step Screenshots

> **Note:** These are descriptions of what users will see. You can replace with actual screenshots later.

---

## 📸 **Step 1: Copy Code from Wizard**

**What you'll see:**
- Setup wizard page with Step 1 highlighted
- Large code block with ~900 lines of code
- Blue "Copy Code" button at top right
- After clicking: Button changes to "✓ Copied!" in green

**Action:** Click "Copy Code" button

**What to look for:**
- Success message: "✓ Code copied! (XXX lines)"
- "Next Step" button becomes active (green)
- Line count should be 900+

---

## 📸 **Step 2: Open Google Apps Script**

**What you'll see:**
- "Open Google Apps Script" button in wizard
- New browser tab opens to: https://script.google.com/create
- Google Apps Script editor with default code:
  ```javascript
  function myFunction() {
    
  }
  ```

**Action:** 
1. Click "Open Google Apps Script"
2. Select ALL default code (Ctrl+A or Cmd+A)
3. Delete it
4. Paste your code (Ctrl+V or Cmd+V)

**What to look for:**
- Left sidebar shows "Code.gs" file
- Editor shows ~900 lines
- No red syntax error indicators
- Project name: "Untitled project" (can rename)

---

## 📸 **Step 3: Deploy as Web App**

### 3a. Click Deploy Button

**What you'll see:**
- Top-right corner of Apps Script editor
- Blue "Deploy" button
- Dropdown menu appears

**Action:** Click "Deploy" → "New deployment"

---

### 3b. Select Web App Type

**What you'll see:**
- Modal window: "New deployment"
- Top section: "Select type" with gear icon ⚙️
- Default: "Select type"

**Action:** Click gear icon ⚙️ → Select "Web app"

**What to look for:**
- Type changes to "Web app"
- Configuration options appear below

---

### 3c. Configure Settings (CRITICAL!)

**What you'll see:**

```
Description: [ Optional description       ]

Execute as: [ Me (your@gmail.com)    ▼ ]  ⚠️ WRONG!

Who has access: [ Anyone              ▼ ]
```

**⚠️ CRITICAL ACTIONS:**

1. **Click "Execute as" dropdown**
2. **YOU WILL SEE TWO OPTIONS:**
   ```
   ○ Me (your@gmail.com)           ← ❌ DO NOT SELECT
   ○ User accessing the web app     ← ✅ SELECT THIS
   ```
3. **Select "User accessing the web app"**
4. **Verify "Who has access" = "Anyone"**

**Common mistake:** Leaving it on "Me" - this breaks data isolation!

---

### 3d. Click Deploy

**What you'll see:**
- Blue "Deploy" button at bottom
- Click it
- Loading spinner
- **If first time:** Authorization screen appears

**Action:** Click "Deploy"

**If authorization needed:**
1. Click "Authorize access"
2. Select your Google account
3. See "This app isn't verified" warning (NORMAL!)
4. Click "Advanced"
5. Click "Go to [Project Name] (unsafe)"
6. Click "Allow" for all permissions
7. Check all boxes
8. Click "Continue"

---

### 3e. Copy Deployment URL

**What you'll see:**
- Success modal: "Deployment successfully created"
- **Web app URL:**
  ```
  https://script.google.com/macros/s/AKfycbz61JIl.../exec
  ```
- Copy icon button next to URL

**Action:** 
1. Click copy icon (or select and copy URL)
2. Paste into setup wizard's URL field
3. Click "Test Connection" (optional)
4. Click "Verify & Complete Setup"

**What to look for:**
- URL must end with `/exec`
- URL must start with `https://script.google.com/macros/s/`

---

## 📸 **Step 4: Success Screen**

**What you'll see:**
- ✅ Green checkmark icon
- "🎉 You're All Set!" message
- Two options:
  - "Configure Your System" → Opens admin dashboard
  - "Get Embed Code" → Copies widget iframe code

**Next actions:**
1. Click "Open Admin Dashboard"
2. You'll be prompted to login with Google
3. Admin dashboard loads with your profile
4. Configure services, hours, payments
5. Get embed code from "Deployment & Embed" section

---

## 🎯 **Visual Indicators of Success**

### ✅ **Deployment Worked:**
- Admin dashboard opens and shows your Google profile
- No "Loading..." forever
- Calendar ID field is present
- Services section visible
- No error messages in browser console

### ❌ **Something Went Wrong:**
- Admin shows "Loading..." forever
- Error messages in console (F12)
- "Authorization required" on admin
- Widget shows blank/white screen
- URL doesn't end with `/exec`

---

## 📱 **Mobile Considerations**

**Setup on Mobile:**
- ⚠️ Setup wizard works on mobile
- ⚠️ Google Apps Script editor DOES NOT work well on mobile
- ✅ **Recommendation:** Use desktop/laptop for deployment
- ✅ Admin dashboard works great on mobile after deployment

---

## 🖼️ **Common Screen Variations**

### Google Account Picker
If you have multiple Google accounts:
- Select the account you want to use for deployments
- This account's calendar will receive bookings
- Stick with this account for future updates

### Browser Differences
- **Chrome/Edge:** Works perfectly
- **Firefox:** May need to allow pop-ups
- **Safari:** Sometimes requires explicit permission for script.google.com
- **Brave:** Need to disable shields for script.google.com

---

## 💡 **Pro Tips**

1. **Take a screenshot** of your deployment URL
2. **Save the URL** in a password manager
3. **Bookmark** your admin dashboard
4. **Name your project** something memorable (e.g., "My Store Booking System")
5. **Test immediately** after deployment - don't wait!

---

## 📹 **Video Tutorial Coming Soon**

We're working on a video walkthrough! In the meantime:
- Follow the wizard step-by-step
- Read the red warning boxes carefully
- Check the troubleshooting guide if stuck
- The whole process takes ~5 minutes once you know the steps

---

## 🆘 **If You Get Stuck**

**Most common issues:**
1. Wrong "Execute as" setting (see Issue #2 in COMMON-ISSUES.md)
2. Authorization not completed (see Issue #1)
3. Didn't paste all the code (see Issue #4)

**Check:**
- Browser console (F12) for errors
- Apps Script "Executions" tab for failed runs
- Verify URL format: `https://script.google.com/macros/s/.../exec`
