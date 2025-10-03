/**
 * SWELL BOOKING SYSTEM - Multi-Tenant SaaS Platform
 * 
 * FREE CALENDLY ALTERNATIVE where:
 * - Anyone can sign up with their Google account
 * - Each user gets their own booking page (like swell.com/username)
 * - Uses THEIR OWN Google Calendar as the backend
 * - They configure THEIR OWN payment links (Stripe/Square)
 * - They add THEIR OWN meeting links (Zoom/Google Meet)
 * - Complete data isolation between users (via User Properties)
 * 
 * ARCHITECTURE:
 * - Single Google Apps Script serves ALL users
 * - Each user's data stored in User Properties (automatic isolation)
 * - Script runs with EACH USER'S permissions (not owner's)
 * - Each user only accesses THEIR OWN calendar
 * 
 * Setup Instructions:
 * 1. Create a new Google Apps Script project
 * 2. Enable Google Calendar API in Services
 * 3. Deploy as web app with:
 *    - "Execute as: User accessing the web app" (multi-tenant)
 *    - "Who has access: Anyone with a Google account" (public signup)
 * 
 * CRITICAL: "Execute as: User accessing" allows each user to manage their own calendar!
 */

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

// MULTI-TENANT STORAGE:
// - USER_PROPERTIES = Per-user isolated storage (each user has separate data)
// - SCRIPT_PROPERTIES = Global shared storage (for platform-wide settings only)

const USER_PROPERTIES = PropertiesService.getUserProperties();
const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();

// Per-user configuration keys (stored in User Properties)
const USER_CONFIG_KEYS = {
  USER_EMAIL: 'userEmail',
  USERNAME: 'username',              // For booking page URL (e.g., swell.com/alice)
  TIMEZONE: 'timezone',              // User's business timezone
  CALENDAR_ID: 'calendarId',         // User's Google Calendar ID
  PAYMENT_PROCESSOR: 'paymentProcessor',
  BASE_PAYMENT_LINK: 'basePaymentLink',
  BUSINESS_HOURS: 'businessHours',
  SERVICES: 'services',
  HOLIDAYS: 'holidays',
  ZOOM_LINK: 'zoomLink',
  CREATED_AT: 'createdAt'
};

// Legacy keys for backwards compatibility (will be migrated to User Properties)
const CONFIG_KEYS = {
  ADMIN_EMAIL: 'adminEmail',
  CALENDAR_ID: 'calendarId',
  PAYMENT_PROCESSOR: 'paymentProcessor',
  BASE_PAYMENT_LINK: 'basePaymentLink',
  BUSINESS_HOURS: 'businessHours',
  SERVICES: 'services',
  HOLIDAYS: 'holidays',
  WIDGET_SETTINGS: 'widgetSettings'
};

// External frontend URL (GitHub Pages). Set Script Property FRONTEND_URL to override.
function getFrontendUrl() {
  const url = SCRIPT_PROPERTIES.getProperty('FRONTEND_URL');
  if (url && url.trim().length > 0) {
    return url.trim();
  }
  // Default to GitHub Pages admin URL
  return 'https://weboutright.github.io/swell3/admin.html';
}

// ============================================================================
// AUTO-INITIALIZATION (Multi-Tenant)
// ============================================================================

/**
 * Auto-initialize User Properties for first-time users
 * Each user gets their own isolated settings
 */
function autoInitialize() {
  const session = getCurrentSession();
  
  if (!session.isAuthenticated || !session.email) {
    return null;
  }
  
  // Check if THIS USER has initialized their account
  let userEmail = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.USER_EMAIL);
  
  if (!userEmail) {
    // First time this user is accessing - initialize THEIR settings
    Logger.log('Auto-initializing new user: ' + session.email);
    
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.USER_EMAIL, session.email);
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.CREATED_AT, new Date().toISOString());
    
    // Set default calendar ID to user's primary calendar
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.CALENDAR_ID, session.email);
    
    // Auto-detect and set user's timezone
    const timezone = Session.getScriptTimeZone();
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.TIMEZONE, timezone);
    Logger.log('Set user timezone to: ' + timezone);
    
    // Generate username from email (e.g., alice@gmail.com → alice)
    const username = session.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.USERNAME, username);
    Logger.log('Generated username: ' + username);
    
    // Initialize default business hours for THIS USER
    const defaultBusinessHours = JSON.stringify({
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: false, start: '09:00', end: '17:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00' }
    });
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.BUSINESS_HOURS, defaultBusinessHours);
    
    // Initialize default services for THIS USER
    const defaultServices = JSON.stringify([
      {
        id: '1',
        name: 'Consultation',
        description: '30-minute consultation call',
        duration: 30,
        price: 50,
        enabled: true
      }
    ]);
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.SERVICES, defaultServices);
    
    // Initialize empty holidays array
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.HOLIDAYS, JSON.stringify([]));
    
    Logger.log('User initialization complete for: ' + session.email);
  }
  
  return session.email;
}

// ============================================================================
// WEB APP ENTRY POINTS
// ============================================================================

/**
 * Main entry point for GET requests
 */
function doGet(e) {
  e = e || { parameter: {}, parameters: {} };
  autoInitialize();
  const action = e.parameter.action;
  
  // Handle JSONP callback for cross-origin requests
  const callback = e.parameter.callback;
  
  if (action === 'login') {
    const rawRedirect = e.parameter.redirectUrl;
    const redirectUrl = rawRedirect ? decodeURIComponent(rawRedirect) : null;
    const session = getCurrentSession();
    
    Logger.log('Login attempt - Session: ' + JSON.stringify(session));
    Logger.log('Decoded redirect URL: ' + redirectUrl);
    
    if (session.isAuthenticated && redirectUrl) {
      const token = createSessionToken(session.email);
      const baseUrl = redirectUrl.split('#')[0].split('?')[0];
      const finalRedirectUrl = baseUrl + '#session=' + token;
      
      Logger.log('=== LOGIN REDIRECT DEBUG ===');
      Logger.log('User authenticated: ' + session.email);
      Logger.log('Token created (length): ' + token.length);
      Logger.log('Token (first 50 chars): ' + token.substring(0, 50));
      Logger.log('Base URL: ' + baseUrl);
      Logger.log('Final redirect URL: ' + finalRedirectUrl);
      Logger.log('Final redirect URL length: ' + finalRedirectUrl.length);
      
      // CRITICAL: Only use JavaScript redirect - meta refresh strips hash!
      const html = '<!DOCTYPE html>' +
        '<html><head>' +
        '<title>Redirecting...</title>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
        '<style>' +
        'body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}' +
        '.spinner{width:50px;height:50px;border:4px solid #e0f2fe;border-top:4px solid #059669;border-radius:50%;margin:0 auto 20px;animation:spin 1s linear infinite}' +
        '@keyframes spin{to{transform:rotate(360deg)}}' +
        'h1{color:#065f46;margin:0 0 8px;font-size:16px}' +
        'p{color:#6b7280;margin:0;font-size:12px}' +
        '</style>' +
        '</head><body>' +
        '<div style="text-align:center">' +
        '<div class="spinner"></div>' +
        '<h1>Redirecting...</h1>' +
        '<p>Please wait</p>' +
        '</div>' +
        '<script>' +
        'window.location.replace("' + finalRedirectUrl + '");' +
        '</script>' +
        '</body></html>';
      
      return HtmlService.createHtmlOutput(html)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        
    } else if (!redirectUrl) {
      return HtmlService.createHtmlOutput('<html><body><h1>Error: No redirect URL provided</h1></body></html>');
    } else {
      Logger.log('User not authenticated - showing OAuth prompt');
      return HtmlService.createHtmlOutput('<html><body><h1>Authorization Required</h1><p>Please authorize access to continue.</p></body></html>')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }
  
  const page = e.parameter.page || 'api';
  const session = getCurrentSession();
  Logger.log('doGet called - Page: ' + page + ', Session: ' + JSON.stringify(session));
  
  // Handle JSONP requests for cross-origin compatibility
  if (callback) {
    const data = {
      success: true,
      session: {
        email: session.email,
        isAuthenticated: session.isAuthenticated,
        isAdmin: session.isAuthenticated ? isAdmin(session.email) : false
      }
    };
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  switch(page) {
    case 'admin':
      return serveAdminPage(session);
    case 'api':
    case 'getSession':
      return jsonResponse({
        success: true,
        session: {
          email: session.email,
          isAuthenticated: session.isAuthenticated,
          isAdmin: session.isAuthenticated ? isAdmin(session.email) : false
        }
      });
    default:
      return jsonResponse({ success: false, error: 'Unknown page' }, 400);
  }
}

/**
 * Serve admin page (protected)
 */
function serveAdminPage(session) {
  session = session || getCurrentSession();
  const frontend = getFrontendUrl();
  
  if (!frontend) {
    return HtmlService.createHtmlOutput('<!DOCTYPE html><html><head><title>Swell Admin Setup</title></head><body><h1>External Admin UI Not Configured</h1><p>Please set FRONTEND_URL in Script Properties.</p></body></html>');
  }
  
  if (!session.isAuthenticated) {
    return HtmlService.createHtmlOutput('<!DOCTYPE html><html><head><title>Login Required</title></head><body><h1>Login Required</h1><p>Please visit <a href="' + frontend + '">' + frontend + '</a> to login.</p></body></html>');
  }
  
  // Redirect authenticated users to GitHub Pages admin with token
  const token = createSessionToken(session.email);
  const clean = frontend.replace(/\/$/, '');
  const redirectUrl = clean + '#session=' + token;
  
  // Immediate redirect with ONLY JavaScript (meta refresh strips hash!)
  const html = '<!DOCTYPE html>' +
    '<html><head>' +
    '<title>Redirecting to Admin</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    '<style>' +
    'body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}' +
    '.spinner{width:50px;height:50px;border:4px solid #e0f2fe;border-top:4px solid #059669;border-radius:50%;margin:0 auto;animation:spin 1s linear infinite}' +
    '@keyframes spin{to{transform:rotate(360deg)}}' +
    '</style>' +
    '</head><body>' +
    '<div style="text-align:center">' +
    '<div class="spinner"></div>' +
    '<p style="color:#6b7280;margin-top:20px;font-size:14px">Redirecting...</p>' +
    '</div>' +
    '<script>' +
    'window.location.replace("' + redirectUrl + '");' +
    '</script>' +
    '</body></html>';
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Main entry point for POST requests (API calls from client)
 */
function doPost(e) {
  // Defensive guard: prevent undefined access when run without event
  e = e || {};
  if (!e.postData) {
    return jsonResponse({ success: false, error: 'No postData supplied' });
  }
  // Handle CORS preflight requests (cannot set custom headers in Apps Script TextOutput)
  if (e.postData && e.postData.contents === '') {
    const empty = ContentService.createTextOutput('');
    empty.setMimeType(ContentService.MimeType.TEXT);
    return empty;
  }
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    Logger.log(`doPost called - Action: ${action}`);
    const publicActions = ['getAvailability', 'createBooking', 'getServices', 'getUserData', 'refreshToken', 'issueToken'];
    if (!publicActions.includes(action)) {
      const userEmail = resolveUserEmail(data);
      if (!userEmail) {
        return jsonResponse({ success: false, error: 'Authentication required. Provide valid session or token.' });
      }
    }
    switch(action) {
      case 'saveConfiguration': return saveConfiguration(data.config, data.token);
      case 'getConfiguration': return getConfiguration(data.token);
      case 'saveBusinessHours': return saveBusinessHours(data.businessHours, data.token);
      case 'saveServices': return saveServices(data.services, data.token);
      case 'saveHolidays': return saveHolidays(data.holidays, data.token);
      case 'getBookings': return getBookings(data.filters);
      case 'createBooking': return createBooking(data.booking);
      case 'updateBooking': return updateBooking(data.bookingId, data.updates);
      case 'cancelBooking': return cancelBooking(data.bookingId);
      case 'getAvailability': return getAvailability(data.date, data.serviceId);
      case 'getServices': return getPublicServices();
      case 'getUserData': return getUserData(data.token);
      case 'getAnalytics': return getAnalytics(data.startDate, data.endDate);
      case 'refreshToken': return refreshToken(data.token);
      case 'issueToken': {
          const session = getCurrentSession();
          if (!session.isAuthenticated) return jsonResponse({ success:false, error:'Not authenticated' },401);
          const token = createSessionToken(session.email);
          const p = parseTokenPayload(token);
          return jsonResponse({ success:true, token, expiresAt:p.exp });
        }
      default: return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// ============================================================================
// AUTHENTICATION & SESSION MANAGEMENT
// ============================================================================

/**
 * URL-safe base64 encoding helper
 */
function base64UrlEncode(input) {
  if (input === null || input === undefined) {
    // Gracefully handle null to avoid breaking auth flows; represent as empty string
    input = '';
  }
  let bytes;
  if (typeof input === 'string') {
    bytes = Utilities.newBlob(input).getBytes();
  } else if (Object.prototype.toString.call(input) === '[object Array]') {
    bytes = input;
  } else {
    bytes = Utilities.newBlob(String(input)).getBytes();
  }
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

// Helper to consistently get/create JWT secret
function getJwtSecret() {
  let secret = SCRIPT_PROPERTIES.getProperty('JWT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, '').slice(0, 32);
    SCRIPT_PROPERTIES.setProperty('JWT_SECRET', secret);
  }
  return secret;
}

/**
 * URL-safe base64 decoding helper
 */
function base64UrlDecode(input) {
  if (input === null || input === undefined) {
    // Treat null/undefined as empty to avoid hard failure; caller will validate downstream
    return [];
  }
  if (typeof input !== 'string') {
    input = String(input);
  }
  if (input.length === 0) {
    return [];
  }
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = str.length % 4;
  if (remainder === 1) {
    // Invalid base64 length
    throw new Error('base64UrlDecode: invalid base64 string length');
  } else if (remainder > 0) {
    str += '='.repeat(4 - remainder);
  }
  return Utilities.base64Decode(str);
}

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour token lifetime
const TOKEN_REFRESH_THRESHOLD_SECONDS = 10 * 60; // Refresh if <10m remaining

/**
 * Create a short-lived session token
 */
function createSessionToken(email, ttlSeconds) {
  const ttl = ttlSeconds || TOKEN_TTL_SECONDS;
  const payload = { email: email, exp: Math.floor(Date.now() / 1000) + ttl };
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const token = header + '.' + payloadEncoded;
  const secret = getJwtSecret();
  const signature = Utilities.computeHmacSha256Signature(token, secret);
  const signatureEncoded = base64UrlEncode(signature);
  return token + '.' + signatureEncoded;
}

/**
 * Get current user session
 */
function getCurrentSession() {
  const userEmail = Session.getActiveUser().getEmail();
  const effectiveEmail = Session.getEffectiveUser().getEmail();
  
  // When deployed as "Anyone", Session.getActiveUser() returns empty string
  // So we check if effectiveEmail (the script owner) is available
  const email = userEmail || effectiveEmail;
  
  return {
    email: email,
    isAuthenticated: !!email,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if user is admin
 */
function isAdmin(email) {
  // In multi-tenant mode every authenticated user administers only their own data
  return !!email; 
}

/**
 * Parse token payload
 */
function parseTokenPayload(token) {
  if (!token || typeof token !== 'string') throw new Error('Missing token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [headerSeg, payloadSeg, sigSeg] = parts;
  if (!headerSeg || !payloadSeg || !sigSeg) throw new Error('Malformed token');
  const secret = getJwtSecret();
  const unsigned = headerSeg + '.' + payloadSeg;
  const expected = base64UrlEncode(Utilities.computeHmacSha256Signature(unsigned, secret));
  if (expected !== sigSeg) throw new Error('Invalid token signature');
  let payloadJson;
  try {
    payloadJson = JSON.parse(Utilities.newBlob(base64UrlDecode(payloadSeg)).getDataAsString() || '{}');
  } catch (e) { throw new Error('Invalid payload JSON'); }
  if (!payloadJson.email) throw new Error('Token missing email');
  if (!payloadJson.exp) throw new Error('Token missing exp');
  return payloadJson;
}

/**
 * Refresh token
 */
function refreshToken(oldToken) {
  try {
    const payload = parseTokenPayload(oldToken);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return jsonResponse({ success: false, error: 'Token expired' }, 401);
    }
    const remaining = payload.exp - now;
    if (remaining > TOKEN_REFRESH_THRESHOLD_SECONDS) {
      // Not yet time to refresh – return existing
      return jsonResponse({ success: true, token: oldToken, refreshed: false, expiresAt: payload.exp });
    }
    const newToken = createSessionToken(payload.email);
    const newPayload = parseTokenPayload(newToken);
    return jsonResponse({ success: true, token: newToken, refreshed: true, expiresAt: newPayload.exp });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message || String(e) }, 401);
  }
}

/**
 * Get user data from a session token
 */
function getUserData(token) {
  try {
    const payloadJson = parseTokenPayload(token);
    if (payloadJson.exp < Math.floor(Date.now()/1000)) throw new Error('Token expired');
    const userEmail = payloadJson.email;
    return jsonResponse({ success: true, user: { name: userEmail.split('@')[0], email: userEmail, avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=0D8ABC&color=fff` }, exp: payloadJson.exp });
  } catch (error) {
    Logger.log('getUserData error for token: ' + token + ' -> ' + error.toString());
    return jsonResponse({ success: false, error: error.message || error.toString() }, 401);
  }
}

// ============================================================================
// TOKEN VALIDATION (for external static front-end)
// ============================================================================

/**
 * Lightweight token verifier that returns { email, error }
 */
function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string') return { error: 'Missing token' };
    const parts = token.split('.');
    if (parts.length !== 3) return { error: 'Invalid token format' };
    const [headerSeg, payloadSeg, sigSeg] = parts;
    if (!headerSeg || !payloadSeg || !sigSeg) return { error: 'Malformed token segments' };
    const secret = getJwtSecret();
    const unsigned = headerSeg + '.' + payloadSeg;
    const expectedSignature = base64UrlEncode(Utilities.computeHmacSha256Signature(unsigned, secret));
    if (expectedSignature !== sigSeg) return { error: 'Invalid token signature' };
    let payloadJson;
    try {
      payloadJson = JSON.parse(Utilities.newBlob(base64UrlDecode(payloadSeg)).getDataAsString() || '{}');
    } catch (e) {
      return { error: 'Invalid payload JSON' };
    }
    if (!payloadJson.email) return { error: 'Token missing email' };
    if (!payloadJson.exp || payloadJson.exp < Math.floor(Date.now() / 1000)) return { error: 'Token expired' };
    return { email: payloadJson.email };
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

/**
 * Resolve authenticated user email using session first, then token fallback
 */
function resolveUserEmail(data) {
  const session = getCurrentSession();
  if (session.isAuthenticated) return session.email;
  if (data && data.token) {
    const v = verifyToken(data.token);
    if (v.email) return v.email;
  }
  return null;
}

// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================

/**
 * Save complete configuration
 */
function saveConfiguration(config, token) {
  try {
    const email = resolveUserEmail({ token: token, config });
    if (!email) throw new Error('Authentication required');
    if (!config.calendarId) { throw new Error('Calendar ID is required'); }
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.CALENDAR_ID, config.calendarId);
    if (config.paymentProcessorType) USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.PAYMENT_PROCESSOR, config.paymentProcessorType);
    if (config.basePaymentLink !== undefined) USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.BASE_PAYMENT_LINK, config.basePaymentLink || '');
    if (config.timezone) USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.TIMEZONE, config.timezone);
    if (config.businessHours) USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.BUSINESS_HOURS, JSON.stringify(config.businessHours));
    if (config.services) USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.SERVICES, JSON.stringify(config.services));
    if (config.holidays) USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.HOLIDAYS, JSON.stringify(config.holidays));
    return jsonResponse({ success: true, message: 'Configuration saved for user ' + email });
  } catch (error) {
    Logger.log('Error saving configuration: ' + error.toString());
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Get current configuration
 */
function getConfiguration(token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    const config = {
      // For backward compatibility expose adminEmail as current user
      adminEmail: email,
      calendarId: USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID) || '',
      paymentProcessor: USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.PAYMENT_PROCESSOR) || 'stripe',
      basePaymentLink: USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BASE_PAYMENT_LINK) || '',
      businessHours: JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BUSINESS_HOURS) || '{}'),
      services: JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES) || '[]'),
      holidays: JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.HOLIDAYS) || '[]'),
      timezone: USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.TIMEZONE) || Session.getScriptTimeZone()
    };
    return jsonResponse({ success: true, config: config });
  } catch (error) {
    Logger.log('Error getting configuration: ' + error.toString());
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Save business hours
 */
function saveBusinessHours(businessHours, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.BUSINESS_HOURS, JSON.stringify(businessHours));
    return jsonResponse({ success: true, message: 'Business hours saved for user ' + email });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Save services
 */
function saveServices(services, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.SERVICES, JSON.stringify(services));
    return jsonResponse({ success: true, message: 'Services saved for user ' + email });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Save holidays
 */
function saveHolidays(holidays, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.HOLIDAYS, JSON.stringify(holidays));
    return jsonResponse({ success: true, message: 'Holidays saved for user ' + email });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

// ============================================================================
// GOOGLE CALENDAR INTEGRATION
// ============================================================================

/**
 * Get availability for a specific date and service
 */
function getAvailability(dateString, serviceId) {
  try {
    // Availability is based on the authenticated user's settings
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    const businessHours = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BUSINESS_HOURS) || '{}');
    const services = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES) || '[]');
    const holidays = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.HOLIDAYS) || '[]');
    const businessTimezone = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.TIMEZONE) || Session.getScriptTimeZone();
    if (!calendarId) { throw new Error('Calendar ID not configured for this user'); }
    const service = services.find(s => s.id === serviceId);
    if (!service) { throw new Error('Service not found'); }
    const date = new Date(dateString);
    const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()];
    if (!businessHours[dayOfWeek] || !businessHours[dayOfWeek].enabled) {
      return jsonResponse({ success: true, availableSlots: [], businessTimezone });
    }
    const isHoliday = holidays.some(h => { const start = new Date(h.startDate); const end = new Date(h.endDate); return date >= start && date <= end; });
    if (isHoliday) { return jsonResponse({ success: true, availableSlots: [], businessTimezone }); }
    const startTime = businessHours[dayOfWeek].start;
    const endTime = businessHours[dayOfWeek].end;
    const slots = generateTimeSlots(date, startTime, endTime, service.duration || 60);
    const calendar = CalendarApp.getCalendarById(calendarId);
    const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);
    const events = calendar.getEvents(startOfDay, endOfDay);
    const availableSlots = slots.filter(slot => {
      return !events.some(event => {
        const eventStart = event.getStartTime();
        const eventEnd = event.getEndTime();
        return (slot.start < eventEnd && slot.end > eventStart); // overlap check
      });
    });
    return jsonResponse({
      success: true,
      availableSlots: availableSlots.map(slot => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        displayTime: formatTime(slot.start),
        businessTimezone
      })),
      businessTimezone
    });
  } catch (error) {
    Logger.log('Error getting availability: ' + error.toString());
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Generate time slots for a given day
 */
function generateTimeSlots(date, startTime, endTime, duration) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let current = new Date(date);
  current.setHours(startHour, startMin, 0, 0);
  
  const end = new Date(date);
  end.setHours(endHour, endMin, 0, 0);
  
  while (current < end) {
    const slotEnd = new Date(current.getTime() + duration * 60000);
    
    if (slotEnd <= end) {
      slots.push({
        start: new Date(current),
        end: slotEnd
      });
    }
    
    current = new Date(current.getTime() + 30 * 60000); // 30-minute intervals
  }
  
  return slots;
}

/**
 * Create a new booking
 */
function createBooking(booking) {
  try {
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    const services = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES) || '[]');
    if (!calendarId) { throw new Error('Calendar ID not configured for this user'); }
    const service = services.find(s => s.id === booking.serviceId);
    if (!service) { throw new Error('Service not found'); }
    const calendar = CalendarApp.getCalendarById(calendarId);
    const startTime = new Date(booking.date + 'T' + booking.time);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);
    const eventTitle = `${service.name} - ${booking.firstName} ${booking.lastName}`;
    const eventDescription = `\nCustomer: ${booking.firstName} ${booking.lastName}\nEmail: ${booking.email}\nPhone: ${booking.phone}\nService: ${service.name}\nDuration: ${service.duration} minutes\nPrice: $${service.price}\n\n${booking.notes ? 'Notes: ' + booking.notes : ''}\n\nBooking ID: ${generateBookingId()}\n    `.trim();
    const event = calendar.createEvent(eventTitle, startTime, endTime, {
      description: eventDescription,
      location: service.meetingLink || '',
      guests: booking.email,
      sendInvites: true
    });
    sendBookingConfirmationEmail(booking, service, event);
    const paymentLink = generatePaymentLink(service, booking);
    return jsonResponse({ success: true, message: 'Booking created successfully', bookingId: event.getId(), paymentLink });
  } catch (error) {
    Logger.log('Error creating booking: ' + error.toString());
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Get all bookings
 */
function getBookings(filters) {
  try {
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    if (!calendarId) { throw new Error('Calendar ID not configured for this user'); }
    const calendar = CalendarApp.getCalendarById(calendarId);
    const startDate = filters && filters.startDate ? new Date(filters.startDate) : new Date();
    const endDate = filters && filters.endDate ? new Date(filters.endDate) : new Date(Date.now() + 30*24*60*60*1000);
    const events = calendar.getEvents(startDate, endDate);
    const bookings = events.map(event => ({
      id: event.getId(),
      title: event.getTitle(),
      start: event.getStartTime().toISOString(),
      end: event.getEndTime().toISOString(),
      description: event.getDescription(),
      location: event.getLocation(),
      guests: event.getGuestList().map(g => g.getEmail())
    }));
    return jsonResponse({ success: true, bookings });
  } catch (error) {
    Logger.log('Error getting bookings: ' + error.toString());
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Cancel a booking
 */
function cancelBooking(bookingId) {
  try {
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    if (!calendarId) { throw new Error('Calendar ID not configured for this user'); }
    const calendar = CalendarApp.getCalendarById(calendarId);
    const event = calendar.getEventById(bookingId);
    if (!event) { throw new Error('Booking not found'); }
    const guests = event.getGuestList();
    if (guests.length > 0) {
      const customerEmail = guests[0].getEmail();
      sendCancellationEmail(customerEmail, event);
    }
    event.deleteEvent();
    return jsonResponse({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    Logger.log('Error cancelling booking: ' + error.toString());
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

/**
 * Send booking confirmation email
 */
function sendBookingConfirmationEmail(booking, service, event) {
  const subject = `Booking Confirmed: ${service.name}`;
  
  const body = `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #065f46;">🌊 Booking Confirmed!</h1>
      
      <p>Hi ${booking.firstName},</p>
      
      <p>Your booking has been confirmed! Here are your session details:</p>
      
      <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #065f46;">Session Details</h3>
        <p><strong>Service:</strong> ${service.name}</p>
        <p><strong>Date:</strong> ${formatDate(event.getStartTime())}</p>
        <p><strong>Time:</strong> ${formatTime(event.getStartTime())} - ${formatTime(event.getEndTime())}</p>
        <p><strong>Duration:</strong> ${service.duration} minutes</p>
        ${service.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${service.meetingLink}">${service.meetingLink}</a></p>` : ''}
      </div>
      
      <p>A calendar invitation has been sent to your email. Please add it to your calendar.</p>
      
      <p>If you need to cancel or reschedule, please contact us as soon as possible.</p>
      
      <p>Looking forward to seeing you!</p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        - The Swell Team
      </p>
    </div>
  </body>
</html>
  `;
  
  MailApp.sendEmail({
    to: booking.email,
    subject: subject,
    htmlBody: body
  });
}

/**
 * Send cancellation email
 */
function sendCancellationEmail(email, event) {
  const subject = `Booking Cancelled: ${event.getTitle()}`;
  
  const body = `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #991b1b;">Booking Cancelled</h1>
      
      <p>Your booking has been cancelled:</p>
      
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
        <p><strong>Session:</strong> ${event.getTitle()}</p>
        <p><strong>Date:</strong> ${formatDate(event.getStartTime())}</p>
        <p><strong>Time:</strong> ${formatTime(event.getStartTime())}</p>
      </div>
      
      <p>If you'd like to reschedule, please book a new session at your convenience.</p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        - The Swell Team
      </p>
    </div>
  </body>
</html>
  `;
  
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: body
  });
}

// ============================================================================
// PAYMENT PROCESSING
// ============================================================================

/**
 * Generate payment link for a booking
 */
function generatePaymentLink(service, booking) {
  const basePaymentLink = SCRIPT_PROPERTIES.getProperty(CONFIG_KEYS.BASE_PAYMENT_LINK);
  const paymentProcessor = SCRIPT_PROPERTIES.getProperty(CONFIG_KEYS.PAYMENT_PROCESSOR);
  
  if (!basePaymentLink) {
    return null;
  }
  
  // Add booking details to payment link
  const params = new URLSearchParams({
    amount: service.price * 100, // Convert to cents for Stripe
    description: `${service.name} - ${booking.firstName} ${booking.lastName}`,
    customer_email: booking.email
  });
  
  return `${basePaymentLink}?${params.toString()}`;
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get analytics data
 */
function getAnalytics(startDate, endDate) {
  try {
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    if (!calendarId) { throw new Error('Calendar ID not configured for this user'); }
    const services = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES) || '[]');
    const calendar = CalendarApp.getCalendarById(calendarId);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7*24*60*60*1000);
    const end = endDate ? new Date(endDate) : new Date();
    const events = calendar.getEvents(start, end);
    let totalRevenue = 0; let totalBookings = events.length;
    events.forEach(event => {
      const description = event.getDescription();
      const priceMatch = description.match(/Price: \$(\d+)/);
      if (priceMatch) { totalRevenue += parseFloat(priceMatch[1]); }
    });
    return jsonResponse({ success: true, analytics: { totalBookings, totalRevenue, averageBookingValue: totalBookings>0 ? totalRevenue/totalBookings : 0, period: { start: start.toISOString(), end: end.toISOString() } } });
  } catch (error) {
    Logger.log('Error getting analytics: ' + error.toString());
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

// ============================================================================
// PUBLIC API ENDPOINTS
// ============================================================================

/**
 * Get public services (for widget)
 */
function getPublicServices() {
  try {
    // For now, return the authenticated user's services (widget must be loaded after auth for multi-tenant)
    const services = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES) || '[]');
    return jsonResponse({ success: true, services });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Return JSON response
 */
function jsonResponse(data, statusCode) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

/**
 * Format date
 */
function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'EEEE, MMMM d, yyyy');
}

/**
 * Format time
 */
function formatTime(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'h:mm a');
}

/**
 * Generate unique booking ID
 */
function generateBookingId() {
  return 'BOOK-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

/**
 * Include HTML file (for templates)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================================
// SETUP & INITIALIZATION
// ============================================================================

/**
 * One-time setup function (run manually after deployment)
 */
function setupScript() {
  Logger.log('Starting Swell Booking System setup...');
  
  // Check Calendar API access
  try {
    const calendars = CalendarApp.getAllCalendars();
    Logger.log('Calendar API access: OK (' + calendars.length + ' calendars found)');
  } catch (e) {
    Logger.log('Calendar API access: FAILED - ' + e.toString());
  }
  
  // Log script URL
  const scriptUrl = ScriptApp.getService().getUrl();
  Logger.log('Web App URL: ' + scriptUrl);
  Logger.log('Admin Page: ' + scriptUrl + '?page=admin');
  Logger.log('Widget Page: ' + scriptUrl + '?page=widget');
  
  Logger.log('Setup complete! Deploy as web app if not done already.');
  Logger.log('Remember to set admin email in Script Properties!');
}

/**
 * Trigger Calendar API authorization (for OAuth consent screen)
 */
function triggerCalendarAuthorization() {
  try {
    // Attempt to access Calendar API to trigger OAuth
    const calendarId = 'primary';
    CalendarApp.getCalendarById(calendarId);
    
    return {
      success: true,
      message: 'Authorization successful'
    };
  } catch (error) {
    Logger.log('Authorization error: ' + error);
    throw new Error('Please authorize this app to access your Google Calendar');
  }
}
