/**
 * SWELL ADMIN DASHBOARD WRAPPER
 * 
 * PURPOSE:
 * This serves YOUR admin.html with YOUR specific Code.gs URL injected.
 * Users deploy this alongside Code.gs to get a personalized admin dashboard.
 * 
 * WHY THIS IS NEEDED:
 * - admin.html on GitHub Pages is static (can't be customized per user)
 * - Each user needs their Code.gs URL embedded in admin.html
 * - This wrapper serves admin.html with their URL pre-configured
 * 
 * DEPLOYMENT:
 * 1. User deploys Code.gs first (gets URL like https://script.google.com/.../exec)
 * 2. User creates NEW Apps Script project for THIS file
 * 3. User sets their Code.gs URL in SCRIPT_PROPERTIES (see below)
 * 4. User deploys THIS as web app → Gets admin dashboard URL to bookmark!
 * 
 * SETUP:
 * After deployment, run: setupAdminDashboard('YOUR_CODE_GS_URL')
 * This saves the URL so admin.html knows which backend to connect to.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();

// Base URL where admin.html is hosted (GitHub Pages)
const ADMIN_HTML_BASE_URL = 'https://weboutright.github.io/swell3/admin.html';

// ============================================================================
// SETUP FUNCTION - Run this after deployment!
// ============================================================================

/**
 * Configure this admin dashboard with your Code.gs deployment URL
 * 
 * USAGE:
 * 1. Deploy Code.gs first, copy the URL
 * 2. Deploy THIS file as web app
 * 3. Run: setupAdminDashboard('https://script.google.com/macros/s/YOUR_CODE_GS_URL/exec')
 * 
 * @param {string} codeGsUrl - Your Code.gs deployment URL
 */
function setupAdminDashboard(codeGsUrl) {
  if (!codeGsUrl || !codeGsUrl.includes('script.google.com/macros/s/')) {
    throw new Error('Invalid Code.gs URL. Expected format: https://script.google.com/macros/s/.../exec');
  }
  
  SCRIPT_PROPERTIES.setProperty('CODE_GS_URL', codeGsUrl);
  Logger.log('✅ Admin dashboard configured!');
  Logger.log('   Code.gs URL: ' + codeGsUrl);
  Logger.log('');
  Logger.log('📌 Next steps:');
  Logger.log('   1. Copy THIS deployment URL');
  Logger.log('   2. Bookmark it - that\'s your admin dashboard!');
  Logger.log('   3. (Optional) Register with CODE2.gs for easy access');
}

/**
 * Get the configured Code.gs URL
 */
function getCodeGsUrl() {
  const url = SCRIPT_PROPERTIES.getProperty('CODE_GS_URL');
  if (!url) {
    throw new Error('Admin dashboard not configured. Run setupAdminDashboard() first!');
  }
  return url;
}

// ============================================================================
// WEB APP - Serves admin.html with injected Code.gs URL
// ============================================================================

function doGet(e) {
  try {
    // Get the user's Code.gs URL from Script Properties
    const codeGsUrl = getCodeGsUrl();
    
    // Fetch the base admin.html from GitHub Pages
    const response = UrlFetchApp.fetch(ADMIN_HTML_BASE_URL);
    let htmlContent = response.getContentText();
    
    // Inject the Code.gs URL into the HTML
    // This replaces the dynamic URL loading with a static, pre-configured URL
    
    // Find and replace the GOOGLE_SCRIPT_URL initialization
    const scriptUrlPattern = /let GOOGLE_SCRIPT_URL = null;[\s\S]*?\}\)\(\);/;
    const replacement = `let GOOGLE_SCRIPT_URL = '${codeGsUrl}';
        
        // URL pre-configured by AdminWrapper.gs
        console.log('✅ Admin dashboard loaded with Code.gs URL:', GOOGLE_SCRIPT_URL);`;
    
    htmlContent = htmlContent.replace(scriptUrlPattern, replacement);
    
    // Also replace AUTH_HUB_URL if needed (set to empty for standalone mode)
    htmlContent = htmlContent.replace(
      /const AUTH_HUB_URL = '[^']*';/,
      "const AUTH_HUB_URL = '';"
    );
    
    // Serve the modified HTML
    return HtmlService.createHtmlOutput(htmlContent)
      .setTitle('Swell Admin Dashboard')
      .setFaviconUrl('https://weboutright.github.io/swell3/img/favicon.png');
    
  } catch (error) {
    // If not configured, show setup instructions
    if (error.message.includes('not configured')) {
      return HtmlService.createHtmlOutput(`
        <html>
          <head>
            <title>Setup Required</title>
            <style>
              body {
                font-family: 'Segoe UI', system-ui, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              }
              h1 { margin-top: 0; font-size: 2.5em; }
              .step {
                background: rgba(255, 255, 255, 0.15);
                padding: 20px;
                margin: 15px 0;
                border-radius: 10px;
                border-left: 4px solid #10b981;
              }
              code {
                background: rgba(0, 0, 0, 0.3);
                padding: 3px 8px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
              }
              .warning {
                background: rgba(239, 68, 68, 0.2);
                padding: 20px;
                border-radius: 10px;
                border-left: 4px solid #ef4444;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚙️ Admin Dashboard Setup Required</h1>
              <p>This admin dashboard wrapper needs to be configured with your Code.gs deployment URL.</p>
              
              <div class="step">
                <h3>Step 1: Deploy Code.gs</h3>
                <p>Make sure you've already deployed Code.gs and have the URL.</p>
                <p>It should look like: <code>https://script.google.com/macros/s/AKfycbx.../exec</code></p>
              </div>
              
              <div class="step">
                <h3>Step 2: Configure This Dashboard</h3>
                <p>In the Apps Script editor for THIS project:</p>
                <ol>
                  <li>Click <strong>Run</strong> → <strong>Run function</strong></li>
                  <li>Edit the <code>setupAdminDashboard</code> function with your Code.gs URL</li>
                  <li>Run it!</li>
                </ol>
                <p>Example:</p>
                <pre><code>setupAdminDashboard('https://script.google.com/macros/s/YOUR_URL/exec');</code></pre>
              </div>
              
              <div class="step">
                <h3>Step 3: Refresh This Page</h3>
                <p>After configuration, refresh this page to see your admin dashboard!</p>
              </div>
              
              <div class="warning">
                <strong>⚠️ First Time Setup:</strong>
                <p>If this is your first time, follow the complete setup wizard at:</p>
                <p><a href="https://weboutright.github.io/swell3/setup-wizard.html" style="color: #10b981;">
                  https://weboutright.github.io/swell3/setup-wizard.html
                </a></p>
              </div>
            </div>
          </body>
        </html>
      `);
    }
    
    // Other errors
    return HtmlService.createHtmlOutput(`
      <html>
        <body>
          <h2>Error Loading Admin Dashboard</h2>
          <p>${error.message}</p>
          <p>Please contact support or check the logs.</p>
        </body>
      </html>
    `);
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Test the configuration
 */
function testConfiguration() {
  try {
    const url = getCodeGsUrl();
    Logger.log('✅ Configuration valid!');
    Logger.log('   Code.gs URL: ' + url);
    return true;
  } catch (error) {
    Logger.log('❌ Configuration invalid: ' + error.message);
    return false;
  }
}

/**
 * Clear configuration (for testing)
 */
function clearConfiguration() {
  SCRIPT_PROPERTIES.deleteProperty('CODE_GS_URL');
  Logger.log('✅ Configuration cleared');
}
