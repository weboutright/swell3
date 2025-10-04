/**
 * SWELL CENTRAL AUTH HUB (CODE2.gs) - GOOGLE SHEETS VERSION
 * 
 * PURPOSE:
 * This is a centralized user database for ALL Swell customers.
 * - Users register in setup wizard (provide Gmail + Code.gs URL)
 * - Data stored in YOUR Google Sheet (one row per customer)
 * - Users sign in with Gmail → Redirected to their admin dashboard
 * - Users can edit their account data via Sheet link
 * 
 * DEPLOYMENT:
 * 1. Create a Google Sheet with these columns:
 *    | Gmail | Code.gs URL | Created Date | Last Login | Status |
 * 
 * 2. Deploy THIS file to Google Apps Script:
 *    - Extensions → Apps Script
 *    - Paste this code
 *    - Run setupSheet() to set Sheet ID
 *    - Deploy → New deployment → Web app
 *    - Execute as: Me (your@gmail.com)
 *    - Who has access: Anyone
 * 
 * 3. Copy deployment URL and update:
 *    - admin.html line ~1157: const AUTH_HUB_URL = 'YOUR_URL';
 *    - setup-wizard.html line ~500: const AUTH_HUB_URL = 'YOUR_URL';
 * 
 * STORAGE:
 * - All user data in ONE Google Sheet (centralized database)
 * - Columns: Gmail, Code.gs URL, dates, status
 * - Each user gets a direct link to edit their row
 * 
 * FLOW:
 * 1. User completes setup wizard → Pastes Code.gs URL, enters Gmail
 * 2. Wizard registers user in Sheet (new row)
 * 3. User bookmarks admin.html
 * 4. admin.html → "Sign in" → CODE2.gs login page
 * 5. User enters Gmail (MUST match the Gmail from Code.gs deployment!)
 * 6. CODE2.gs checks Sheet → Finds Code.gs URL → Redirects to admin.html?url=...
 * 7. User clicks "Edit Account" → Gets link to their Sheet row
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const TOKEN_TTL_SECONDS = 3600; // 1 hour

// Your website URLs
const MARKETING_SITE = 'https://weboutright.github.io/swell3';
const ADMIN_PAGE_URL = `${MARKETING_SITE}/admin.html`;
const SETUP_WIZARD_URL = `${MARKETING_SITE}/setup-wizard.html`;

/**
 * Get the Google Sheet (user database)
 */
function getUserSheet() {
  const sheetId = '1jseJENSUcugbAxA_4mRQ_lpXTULrn5ENixuLewHjwJY';
  if (!sheetId) {
    throw new Error('Sheet not configured. Run setupSheet() first!');
  }
  return SpreadsheetApp.openById(sheetId).getActiveSheet();
}

// JWT Secret for session tokens
function getJwtSecret() {
  let secret = SCRIPT_PROPERTIES.getProperty('JWT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid();
    SCRIPT_PROPERTIES.setProperty('JWT_SECRET', secret);
    Logger.log('Generated new JWT secret: ' + secret);
  }
  return secret;
}

// ============================================================================
// USER DATABASE - Google Sheet operations
// ============================================================================

/**
 * Register a new user in the database
 * @param {string} gmail - User's Gmail address (must match Code.gs deployment account!)
 * @param {string} codeGsUrl - Their Code.gs deployment URL
 * @return {object} - Success status and message
 */
function registerUser(gmail, codeGsUrl) {
  try {
    const sheet = getUserSheet();
    
    // Check if Gmail already exists
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === gmail) {
        return { success: false, error: 'Gmail already registered. Use account management to update URL.' };
      }
    }
    
    // Validate URL format
    if (!codeGsUrl.includes('script.google.com/macros/s/') || !codeGsUrl.endsWith('/exec')) {
      return { success: false, error: 'Invalid Code.gs URL format' };
    }
    
    // Validate Gmail
    if (!gmail.includes('@')) {
      return { success: false, error: 'Invalid email format' };
    }
    
    // Add new row
    const newRow = [
      gmail,
      codeGsUrl,
      new Date().toISOString(),
      '', // Last login (empty initially)
      'active'
    ];
    
    sheet.appendRow(newRow);
    
    Logger.log(`✅ New user registered: ${gmail}`);
    
    return { 
      success: true, 
      message: 'Account registered successfully!',
      gmail: gmail
    };
    
  } catch (error) {
    Logger.log('❌ Error registering user: ' + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Get user by Gmail address
 * @param {string} gmail - User's Gmail
 * @return {object} - User data if found, null if not found
 */
function getUserByGmail(gmail) {
  try {
    const sheet = getUserSheet();
    const data = sheet.getDataRange().getValues();
    
    // Find user
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === gmail) {
        // Update last login
        sheet.getRange(i + 1, 4).setValue(new Date().toISOString());
        
        Logger.log(`✅ User found: ${gmail}`);
        
        return {
          gmail: row[0],
          codeGsUrl: row[1],
          createdDate: row[2],
          lastLogin: row[3],
          status: row[4],
          rowNumber: i + 1 // For edit link
        };
      }
    }
    
    Logger.log(`❌ User not found: ${gmail}`);
    return null;
    
  } catch (error) {
    Logger.log('❌ Error getting user: ' + error);
    return null;
  }
}

/**
 * Update user's Code.gs URL
 */
function updateUserUrl(gmail, newCodeGsUrl) {
  try {
    const sheet = getUserSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === gmail) {
        sheet.getRange(i + 1, 2).setValue(newCodeGsUrl);
        Logger.log(`✅ Updated URL for ${gmail}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('Error updating URL: ' + error);
    return false;
  }
}

/**
 * Generate edit link for user's row in Sheet
 */
function getEditLink(rowNumber) {
  const sheetId = '1jseJENSUcugbAxA_4mRQ_lpXTULrn5ENixuLewHjwJY';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0&range=A${rowNumber}`;
}

// ============================================================================
// WEB APP ENTRY POINTS
// ============================================================================

function doGet(e) {
  e = e || { parameter: {} };
  const action = e.parameter.action;
  
  // ============================================================================
  // ACTION: register (handle registration via GET for CORS compatibility)
  // ============================================================================
  if (action === 'register') {
    const gmail = e.parameter.gmail;
    const codeGsUrl = e.parameter.codeGsUrl;
    
    if (!gmail || !codeGsUrl) {
      return jsonResponse({ success: false, error: 'Gmail and Code.gs URL required' });
    }
    
    const result = registerUser(gmail, codeGsUrl);
    return jsonResponse(result);
  }
  
  // ============================================================================
  // ACTION: authenticate (handle login via GET)
  // ============================================================================
  if (action === 'authenticate') {
    const gmail = e.parameter.gmail;
    
    if (!gmail) {
      return jsonResponse({ success: false, error: 'Gmail required' });
    }
    
    const user = getUserByGmail(gmail);
    if (user) {
      return jsonResponse({
        success: true,
        gmail: user.gmail,
        codeGsUrl: user.codeGsUrl
      });
    } else {
      return jsonResponse({
        success: false,
        error: 'Gmail not found. Complete setup wizard first.'
      });
    }
  }
  
  // ============================================================================
  // ACTION: account (redirect to GitHub Pages for account management)
  // ============================================================================
  if (action === 'account') {
    const gmail = e.parameter.gmail;
    if (!gmail) {
      // Redirect to GitHub Pages
      return HtmlService.createHtmlOutput(`
        <script>
          window.location.replace('${MARKETING_SITE}');
        </script>
      `);
    }
    
    const user = getUserByGmail(gmail);
    if (!user) {
      // Redirect to GitHub Pages
      return HtmlService.createHtmlOutput(`
        <script>
          window.location.replace('${MARKETING_SITE}');
        </script>
      `);
    }
    
    // Redirect to admin page with user's Code.gs URL
    return HtmlService.createHtmlOutput(`
      <script>
        window.location.replace('${ADMIN_PAGE_URL}?deploymentUrl=${encodeURIComponent(user.codeGsUrl)}');
      </script>
    `);
  }
  
  // Default: redirect to marketing site
  return HtmlService.createHtmlOutput(`
    <script>
      window.location.replace('${MARKETING_SITE}');
    </script>
  `);
}

// ============================================================================
// SESSION TOKEN GENERATION
// ============================================================================

function createSessionToken(email) {
  const payload = {
    email: email,
    name: email.split('@')[0],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  
  const secret = getJwtSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const headerBase64 = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const payloadBase64 = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  
  const signature = Utilities.computeHmacSha256Signature(
    `${headerBase64}.${payloadBase64}`,
    secret
  );
  const signatureBase64 = Utilities.base64EncodeWebSafe(signature);
  
  return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
}

// ============================================================================
// API ENDPOINTS (POST requests)
// ============================================================================

function doPost(e) {
  try {
    const requestBody = JSON.parse(e.postData.contents);
    const action = requestBody.action;
    
    // Route actions
    switch (action) {
      case 'register':
        return handleRegister(requestBody);
      
      case 'authenticate':
        return handleAuthenticate(requestBody);
      
      case 'updateUrl':
        return handleUpdateUrl(requestBody);
      
      default:
        return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error);
    return jsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Handle user registration from setup wizard
 */
function handleRegister(data) {
  const { gmail, codeGsUrl } = data;
  
  if (!gmail || !codeGsUrl) {
    return jsonResponse({ 
      success: false, 
      error: 'Gmail and Code.gs URL required' 
    });
  }
  
  // Validate Gmail format
  if (!gmail.includes('@') || gmail.length < 5) {
    return jsonResponse({ 
      success: false, 
      error: 'Please provide a valid email address' 
    });
  }
  
  const result = registerUser(gmail, codeGsUrl);
  return jsonResponse(result);
}

/**
 * Handle user authentication (login)
 */
function handleAuthenticate(data) {
  const { gmail } = data;
  
  if (!gmail) {
    return jsonResponse({ 
      success: false, 
      error: 'Gmail address required' 
    });
  }
  
  const user = getUserByGmail(gmail);
  
  if (user) {
    return jsonResponse({
      success: true,
      gmail: user.gmail,
      codeGsUrl: user.codeGsUrl,
      accountLink: `?action=account&gmail=${encodeURIComponent(user.gmail)}`
    });
  } else {
    return jsonResponse({
      success: false,
      error: 'Gmail not found. Make sure you completed setup wizard first.'
    });
  }
}

/**
 * Handle URL update request
 */
function handleUpdateUrl(data) {
  const { gmail, newCodeGsUrl } = data;
  
  if (!gmail || !newCodeGsUrl) {
    return jsonResponse({ 
      success: false, 
      error: 'Gmail and new URL required' 
    });
  }
  
  // Verify user exists
  const user = getUserByGmail(gmail);
  if (!user) {
    return jsonResponse({
      success: false,
      error: 'Gmail not found in database'
    });
  }
  
  // Update URL
  const success = updateUserUrl(gmail, newCodeGsUrl);
  
  if (success) {
    return jsonResponse({
      success: true,
      message: 'Code.gs URL updated successfully!'
    });
  } else {
    return jsonResponse({
      success: false,
      error: 'Failed to update URL'
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// SETUP UTILITIES
// ============================================================================

/**
 * Test the Google Sheet connection and authentication flow
 */
function testSheetFlow() {
  Logger.log('Testing Google Sheet authentication flow...\n');
  
  // Check Sheet connection
  try {
    const sheet = getUserSheet();
    Logger.log('✅ Sheet connected');
    Logger.log('   Rows: ' + sheet.getLastRow());
  } catch (error) {
    Logger.log('❌ Sheet not connected. Run setupSheet() first!');
    return;
  }
  
  // Test user registration
  const testGmail = 'test' + Date.now() + '@gmail.com';
  const testUrl = 'https://script.google.com/macros/s/TEST123/exec';
  
  Logger.log('\n1. Registering test user...');
  const registered = registerUser(testGmail, testUrl);
  Logger.log(registered.success ? '✅ Registration successful' : '❌ ' + registered.error);
  
  if (!registered.success) return;
  
  // Test authentication
  Logger.log('\n2. Testing user lookup...');
  const authenticated = getUserByGmail(testGmail);
  Logger.log(authenticated ? '✅ User found successfully' : '❌ User lookup failed');
  
  if (authenticated) {
    Logger.log('   Gmail: ' + authenticated.gmail);
    Logger.log('   Code.gs URL: ' + authenticated.codeGsUrl);
    Logger.log('   Edit link: ' + getEditLink(authenticated.rowNumber));
  }
  
  // Test non-existent user
  Logger.log('\n3. Testing non-existent user...');
  const nonExistent = getUserByGmail('nonexistent@gmail.com');
  Logger.log(nonExistent ? '❌ Should not have found user' : '✅ Correctly returned null for non-existent user');
  
  Logger.log('\n📊 Test complete! Check your Google Sheet to see the test user.');
  Logger.log('   You can manually delete the test row if needed.');
}

/**
 * List all registered users (for debugging)
 */
function listAllUsers() {
  try {
    const sheet = getUserSheet();
    const data = sheet.getDataRange().getValues();
    
    Logger.log('📋 Registered Users:');
    Logger.log('─'.repeat(80));
    Logger.log('Headers: ' + data[0].join(' | '));
    Logger.log('─'.repeat(80));
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      Logger.log(`${i}. ${row[0]} (${row[1]})`);
      Logger.log(`   URL: ${row[3]}`);
      Logger.log(`   Created: ${row[4]}`);
      Logger.log(`   Status: ${row[6]}`);
      if (i < data.length - 1) Logger.log('');
    }
    
    Logger.log('─'.repeat(80));
    Logger.log(`Total: ${data.length - 1} users`);
  } catch (error) {
    Logger.log('❌ Error: ' + error);
    Logger.log('   Make sure Sheet is configured with setupSheet()');
  }
}

/**
 * Remove a user by Gmail (for cleanup)
 */
function removeUser(gmail) {
  try {
    const sheet = getUserSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === gmail) {
        sheet.deleteRow(i + 1);
        Logger.log(`✅ Removed user: ${gmail}`);
        return true;
      }
    }
    
    Logger.log(`❌ User not found: ${gmail}`);
    return false;
  } catch (error) {
    Logger.log('❌ Error: ' + error);
    return false;
  }
}

/**
 * Create the Google Sheet with proper headers
 */
function createUserSheet() {
  Logger.log('Creating new Google Sheet for Swell users...');
  
  const sheet = SpreadsheetApp.create('Swell User Database');
  const sheetId = sheet.getId();
  
  // Set headers
  const headers = ['Gmail', 'Code.gs URL', 'Created Date', 'Last Login', 'Status'];
  sheet.getActiveSheet().getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  sheet.getActiveSheet().getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#059669')
    .setFontColor('white');
  
  // Set column widths
  sheet.getActiveSheet().setColumnWidth(1, 250); // Gmail
  sheet.getActiveSheet().setColumnWidth(2, 400); // Code.gs URL
  sheet.getActiveSheet().setColumnWidths(3, 3, 150); // Dates and Status
  
  Logger.log('✅ Sheet created successfully!');
  Logger.log('   Sheet ID: ' + sheetId);
  Logger.log('   Sheet URL: ' + sheet.getUrl());
  Logger.log('');
  Logger.log('📋 Next steps:');
  Logger.log('   1. Copy the Sheet ID above');
  Logger.log('   2. Run: setupSheet("YOUR_SHEET_ID")');
  
  return sheetId;
}
