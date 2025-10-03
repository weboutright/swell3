/**
 * SWELL BOOKING SYSTEM - Multi-Tenant SaaS Platform
 * Modern Google Apps Script (2024+)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const USER_PROPERTIES = PropertiesService.getUserProperties();
const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();

const USER_CONFIG_KEYS = {
  USER_EMAIL: 'userEmail',
  USERNAME: 'username',
  TIMEZONE: 'timezone',
  CALENDAR_ID: 'calendarId',
  PAYMENT_PROCESSOR: 'paymentProcessor',
  BASE_PAYMENT_LINK: 'basePaymentLink',
  PAYMENTS_ENABLED: 'paymentsEnabled',
  BUSINESS_HOURS: 'businessHours',
  SERVICES: 'services',
  HOLIDAYS: 'holidays',
  ZOOM_LINK: 'zoomLink',
  CREATED_AT: 'createdAt'
};

const TOKEN_TTL_SECONDS = 3600; // 1 hour
const TOKEN_REFRESH_THRESHOLD = 600; // 10 minutes

function getFrontendUrl() {
  return SCRIPT_PROPERTIES.getProperty('FRONTEND_URL') || 'https://weboutright.github.io/swell3/admin.html';
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

function autoInitialize() {
  const session = getCurrentSession();
  
  if (!session.isAuthenticated || !session.email) {
    return null;
  }
  
  const userEmail = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.USER_EMAIL);
  
  if (!userEmail) {
    Logger.log('Initializing new user: ' + session.email);
    
    USER_PROPERTIES.setProperties({
      [USER_CONFIG_KEYS.USER_EMAIL]: session.email,
      [USER_CONFIG_KEYS.CREATED_AT]: new Date().toISOString(),
      [USER_CONFIG_KEYS.CALENDAR_ID]: session.email,
      [USER_CONFIG_KEYS.TIMEZONE]: Session.getScriptTimeZone(),
      [USER_CONFIG_KEYS.USERNAME]: session.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
      [USER_CONFIG_KEYS.BUSINESS_HOURS]: JSON.stringify({
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: false, start: '09:00', end: '17:00' },
        sunday: { enabled: false, start: '09:00', end: '17:00' }
      }),
      [USER_CONFIG_KEYS.SERVICES]: JSON.stringify([
        {
          id: '1',
          name: 'Consultation',
          description: '30-minute consultation call',
          duration: 30,
          price: 50,
          enabled: true
        }
      ]),
      [USER_CONFIG_KEYS.HOLIDAYS]: JSON.stringify([])
    });
    
    Logger.log('User initialization complete: ' + session.email);
  }
  
  return session.email;
}

// ============================================================================
// WEB APP ENTRY POINTS
// ============================================================================

function doGet(e) {
  e = e || { parameter: {} };
  autoInitialize();
  
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  
  // Handle getUserData via GET (for CORS compatibility and JSONP)
  if (action === 'getUserData') {
    // Accept token, gmail, OR apiKey parameter
    const token = e.parameter.token;
    const gmail = e.parameter.gmail;
    const apiKey = e.parameter.apiKey;
    
    let result;
    if (apiKey) {
      // API key authentication (most secure)
      result = getUserDataByApiKey(apiKey);
    } else if (gmail) {
      // Simple gmail-based lookup (backward compatibility)
      // Pass API key from URL if available, so it can be stored
      const apiKeyFromUrl = e.parameter.storeApiKey;
      result = getUserDataByGmail(gmail, apiKeyFromUrl);
    } else if (token) {
      // Token-based auth (backward compatibility)
      result = getUserData(token);
    } else {
      result = jsonResponse({ success: false, error: 'API key, Gmail, or token required' }, 400);
    }
    
    // If callback parameter exists, wrap response in JSONP
    if (callback) {
      const jsonData = result.getContent();
      return ContentService.createTextOutput(callback + '(' + jsonData + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return result;
  }
  
  // Handle getConfiguration via GET
  if (action === 'getConfiguration') {
    const token = e.parameter.token;
    return getConfiguration(token);
  }
  
  // Handle getServices via GET
  if (action === 'getServices') {
    return getPublicServices();
  }
  
  // Handle getAvailability via GET
  if (action === 'getAvailability') {
    return getAvailability(e.parameter.date, e.parameter.serviceId);
  }
  
  // Handle login redirect
  if (action === 'login') {
    return handleLogin(e.parameter.redirectUrl);
  }
  
  // Handle JSONP
  if (callback) {
    const session = getCurrentSession();
    const data = {
      success: true,
      session: {
        email: session.email,
        isAuthenticated: session.isAuthenticated,
        isAdmin: session.isAuthenticated
      }
    };
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  // Handle page routing
  const page = e.parameter.page || 'api';
  
  switch(page) {
    case 'admin':
      return serveAdminPage();
    case 'widget':
      return serveWidgetPage();
    case 'api':
    case 'getSession':
      const session = getCurrentSession();
      return jsonResponse({
        success: true,
        session: {
          email: session.email,
          isAuthenticated: session.isAuthenticated,
          isAdmin: session.isAuthenticated
        }
      });
    default:
      return jsonResponse({ success: false, error: 'Unknown page' }, 400);
  }
}

function handleLogin(redirectUrl) {
  const session = getCurrentSession();
  
  Logger.log('Login - Session: ' + JSON.stringify(session));
  Logger.log('Redirect URL: ' + redirectUrl);
  
  if (!redirectUrl) {
    return HtmlService.createHtmlOutput('<h1>Error: No redirect URL</h1>');
  }
  
  if (!session.isAuthenticated) {
    Logger.log('User not authenticated');
    return HtmlService.createHtmlOutput('<h1>Authorization Required</h1><p>Please authorize to continue.</p>');
  }
  
  const token = createSessionToken(session.email);
  const decodedUrl = decodeURIComponent(redirectUrl);
  const baseUrl = decodedUrl.split('#')[0].split('?')[0];
  const finalUrl = baseUrl + '#session=' + token;
  
  Logger.log('Token created (length): ' + token.length);
  Logger.log('Final redirect: ' + finalUrl);
  
  // Pure JavaScript redirect - preserves hash
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redirecting...</title>
  <style>
    body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}
    .spinner{width:50px;height:50px;border:4px solid #e0f2fe;border-top:4px solid #059669;border-radius:50%;margin:0 auto 20px;animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{color:#065f46;margin:0 0 8px;font-size:16px}
    p{color:#6b7280;margin:0;font-size:12px}
  </style>
</head>
<body>
  <div style="text-align:center">
    <div class="spinner"></div>
    <h1>Redirecting...</h1>
    <p>Please wait</p>
  </div>
  <script>window.location.replace("${finalUrl}");</script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function serveAdminPage() {
  const session = getCurrentSession();
  const frontend = getFrontendUrl();
  
  if (!frontend) {
    return HtmlService.createHtmlOutput('<h1>Frontend URL not configured</h1><p>Set FRONTEND_URL in Script Properties</p>');
  }
  
  if (!session.isAuthenticated) {
    return HtmlService.createHtmlOutput('<h1>Login Required</h1><p>Visit <a href="' + frontend + '">' + frontend + '</a></p>');
  }
  
  const token = createSessionToken(session.email);
  const redirectUrl = frontend.replace(/\/$/, '') + '#session=' + token;
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redirecting to Admin</title>
  <style>
    body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}
    .spinner{width:50px;height:50px;border:4px solid #e0f2fe;border-top:4px solid #059669;border-radius:50%;margin:0 auto;animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div style="text-align:center">
    <div class="spinner"></div>
    <p style="color:#6b7280;margin-top:20px;font-size:14px">Redirecting...</p>
  </div>
  <script>window.location.replace("${redirectUrl}");</script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function serveWidgetPage() {
  // Widget can be embedded by anyone, no auth required
  // It will fetch the owner's configuration via API
  
  // Get the script URL to pass to widget for API calls
  const scriptUrl = ScriptApp.getService().getUrl();
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Swell Booking Widget</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
    .widget-container {
      background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(4, 120, 87, 0.15);
      padding: 2rem;
      max-width: 800px;
      margin: 2rem auto;
    }
    .service-card {
      background: rgba(236, 253, 245, 0.9);
      border: 2px solid rgba(16, 185, 129, 0.2);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .service-card:hover { border-color: #059669; transform: translateY(-2px); }
    .service-card.selected { border-color: #047857; background: #d1fae5; }
    .btn-primary {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      padding: 1rem 2rem;
      border-radius: 12px;
      border: none;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-primary:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="widget-container">
    <h1 style="font-size: 2rem; font-weight: 800; color: #065f46; margin-bottom: 1rem;">
      Book Your Appointment
    </h1>
    <p style="color: #6b7280; margin-bottom: 2rem;">
      Select a service and choose your preferred time slot.
    </p>
    
    <div id="loading" style="text-align: center; padding: 2rem;">
      <div style="width: 50px; height: 50px; border: 4px solid #e0f2fe; border-top: 4px solid #059669; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;"></div>
      <p style="color: #6b7280; margin-top: 1rem;">Loading services...</p>
    </div>
    
    <div id="services-container" style="display: none;"></div>
    
    <div id="booking-form" style="display: none; margin-top: 2rem;">
      <h2 style="font-size: 1.5rem; font-weight: 700; color: #065f46; margin-bottom: 1rem;">
        Your Information
      </h2>
      <div style="display: grid; gap: 1rem;">
        <input type="text" id="customer-name" placeholder="Full Name" required 
          style="padding: 0.75rem; border: 2px solid #d1fae5; border-radius: 8px; font-size: 1rem;">
        <input type="email" id="customer-email" placeholder="Email Address" required 
          style="padding: 0.75rem; border: 2px solid #d1fae5; border-radius: 8px; font-size: 1rem;">
        <input type="tel" id="customer-phone" placeholder="Phone Number" 
          style="padding: 0.75rem; border: 2px solid #d1fae5; border-radius: 8px; font-size: 1rem;">
        <input type="date" id="booking-date" required 
          style="padding: 0.75rem; border: 2px solid #d1fae5; border-radius: 8px; font-size: 1rem;">
        <select id="booking-time" required 
          style="padding: 0.75rem; border: 2px solid #d1fae5; border-radius: 8px; font-size: 1rem;">
          <option value="">Select Time Slot</option>
        </select>
        <textarea id="customer-notes" placeholder="Additional notes (optional)" rows="3"
          style="padding: 0.75rem; border: 2px solid #d1fae5; border-radius: 8px; font-size: 1rem;"></textarea>
        <button onclick="submitBooking()" class="btn-primary">
          Confirm Booking
        </button>
      </div>
    </div>
  </div>
  
  <script>
    const SCRIPT_URL = '${scriptUrl}';
    let selectedService = null;
    
    // Load services on page load
    async function loadServices() {
      try {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getServices' })
        });
        
        const data = await response.json();
        
        if (data.success && data.services) {
          renderServices(data.services);
        } else {
          document.getElementById('loading').innerHTML = 
            '<p style="color: #991b1b;">No services available</p>';
        }
      } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('loading').innerHTML = 
          '<p style="color: #991b1b;">Error loading services</p>';
      }
    }
    
    function renderServices(services) {
      document.getElementById('loading').style.display = 'none';
      const container = document.getElementById('services-container');
      container.style.display = 'block';
      
      container.innerHTML = services.filter(s => s.enabled !== false).map(service => \`
        <div class="service-card" onclick="selectService('\${service.id || service.name}', '\${service.name}', \${service.price}, \${service.duration})">
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #065f46; margin-bottom: 0.5rem;">
            \${service.name}
          </h3>
          <p style="color: #6b7280; margin-bottom: 0.5rem;">\${service.duration} minutes</p>
          <p style="font-size: 1.5rem; font-weight: 800; color: #059669;">$\${service.price}</p>
        </div>
      \`).join('');
    }
    
    function selectService(id, name, price, duration) {
      selectedService = { id, name, price, duration };
      document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
      });
      event.currentTarget.classList.add('selected');
      document.getElementById('booking-form').style.display = 'block';
    }
    
    async function submitBooking() {
      if (!selectedService) {
        alert('Please select a service');
        return;
      }
      
      const name = document.getElementById('customer-name').value;
      const email = document.getElementById('customer-email').value;
      const phone = document.getElementById('customer-phone').value;
      const date = document.getElementById('booking-date').value;
      const time = document.getElementById('booking-time').value;
      const notes = document.getElementById('customer-notes').value;
      
      if (!name || !email || !date || !time) {
        alert('Please fill in all required fields');
        return;
      }
      
      // Split name into first and last
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];
      
      try {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createBooking',
            booking: {
              serviceId: selectedService.id || selectedService.name,
              service: selectedService.name,
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone,
              date: date,
              time: time,
              notes: notes
            }
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert('Booking confirmed! Check your email for details.');
          location.reload();
        } else {
          alert('Booking failed: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error submitting booking:', error);
        alert('Error submitting booking. Please try again.');
      }
    }
    
    // Load services on page load
    loadServices();
  </script>
  <style>
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Swell Booking Widget')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  e = e || {};
  
  if (!e.postData || !e.postData.contents) {
    return jsonResponse({ success: false, error: 'No data provided' });
  }
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    Logger.log('API Call: ' + action);
    
    // Public actions (no auth required)
    const publicActions = ['getAvailability', 'createBooking', 'getServices', 'getUserData', 'refreshToken', 'issueToken'];
    
    if (!publicActions.includes(action)) {
      const email = resolveUserEmail(data);
      if (!email) {
        return jsonResponse({ success: false, error: 'Authentication required' }, 401);
      }
    }
    
    // Route actions
    switch(action) {
      case 'saveConfiguration': return saveConfiguration(data.config, data.token);
      case 'getConfiguration': return getConfiguration(data.token);
      case 'saveBusinessHours': return saveBusinessHours(data.businessHours, data.token);
      case 'saveServices': return saveServices(data.services, data.token);
      case 'saveHolidays': return saveHolidays(data.holidays, data.token);
      case 'getBookings': return getBookings(data.filters, data.token);
      case 'createBooking': return createBooking(data.booking);
      case 'updateBooking': return updateBooking(data.bookingId, data.updates, data.token);
      case 'cancelBooking': return cancelBooking(data.bookingId, data.token);
      case 'getAvailability': return getAvailability(data.date, data.serviceId);
      case 'getServices': return getPublicServices();
      case 'getUserData': 
        // Support multiple authentication methods
        if (data.apiKey) {
          return getUserDataByApiKey(data.apiKey);
        } else if (data.gmail) {
          return getUserDataByGmail(data.gmail, data.storeApiKey);
        } else if (data.token) {
          return getUserData(data.token);
        } else {
          return jsonResponse({ success: false, error: 'API key, Gmail, or token required' }, 400);
        }
      case 'getAnalytics': return getAnalytics(data.startDate, data.endDate, data.token);
      case 'refreshToken': return refreshToken(data.token);
      case 'issueToken': return issueToken();
      default: return jsonResponse({ success: false, error: 'Unknown action: ' + action }, 400);
    }
  } catch (error) {
    Logger.log('Error: ' + error);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

// ============================================================================
// AUTHENTICATION & JWT
// ============================================================================

function base64UrlEncode(input) {
  let bytes;
  if (typeof input === 'string') {
    bytes = Utilities.newBlob(input).getBytes();
  } else if (Array.isArray(input)) {
    bytes = input;
  } else {
    bytes = Utilities.newBlob(String(input)).getBytes();
  }
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function base64UrlDecode(input) {
  if (!input) return [];
  let str = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const remainder = str.length % 4;
  if (remainder > 0) {
    str += '='.repeat(4 - remainder);
  }
  return Utilities.base64Decode(str);
}

function getJwtSecret() {
  let secret = SCRIPT_PROPERTIES.getProperty('JWT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, '').substring(0, 32);
    SCRIPT_PROPERTIES.setProperty('JWT_SECRET', secret);
  }
  return secret;
}

function createSessionToken(email, ttl) {
  ttl = ttl || TOKEN_TTL_SECONDS;
  const payload = {
    email: email,
    exp: Math.floor(Date.now() / 1000) + ttl
  };
  
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const unsigned = header + '.' + payloadEncoded;
  
  const signature = Utilities.computeHmacSha256Signature(unsigned, getJwtSecret());
  const signatureEncoded = base64UrlEncode(signature);
  
  return unsigned + '.' + signatureEncoded;
}

function parseTokenPayload(token) {
  if (!token) throw new Error('No token');
  
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  
  const [header, payload, signature] = parts;
  
  // Verify signature
  const unsigned = header + '.' + payload;
  const expected = base64UrlEncode(Utilities.computeHmacSha256Signature(unsigned, getJwtSecret()));
  
  if (expected !== signature) throw new Error('Invalid signature');
  
  // Decode payload
  const payloadJson = JSON.parse(Utilities.newBlob(base64UrlDecode(payload)).getDataAsString());
  
  if (!payloadJson.email) throw new Error('Missing email');
  if (!payloadJson.exp) throw new Error('Missing expiration');
  
  return payloadJson;
}

function verifyToken(token) {
  try {
    const payload = parseTokenPayload(token);
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) {
      return { error: 'Token expired' };
    }
    
    return { email: payload.email };
  } catch (error) {
    return { error: error.message || String(error) };
  }
}

function getCurrentSession() {
  const userEmail = Session.getActiveUser().getEmail();
  const effectiveEmail = Session.getEffectiveUser().getEmail();
  const email = userEmail || effectiveEmail;
  
  return {
    email: email,
    isAuthenticated: !!email,
    timestamp: new Date().toISOString()
  };
}

function resolveUserEmail(data) {
  const session = getCurrentSession();
  if (session.isAuthenticated) return session.email;
  
  if (data && data.token) {
    const result = verifyToken(data.token);
    if (result.email) return result.email;
  }
  
  return null;
}

function issueToken() {
  const session = getCurrentSession();
  if (!session.isAuthenticated) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }
  
  const token = createSessionToken(session.email);
  const payload = parseTokenPayload(token);
  
  return jsonResponse({
    success: true,
    token: token,
    expiresAt: payload.exp
  });
}

function refreshToken(oldToken) {
  try {
    const payload = parseTokenPayload(oldToken);
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) {
      return jsonResponse({ success: false, error: 'Token expired' }, 401);
    }
    
    const remaining = payload.exp - now;
    
    if (remaining > TOKEN_REFRESH_THRESHOLD) {
      return jsonResponse({
        success: true,
        token: oldToken,
        refreshed: false,
        expiresAt: payload.exp
      });
    }
    
    const newToken = createSessionToken(payload.email);
    const newPayload = parseTokenPayload(newToken);
    
    return jsonResponse({
      success: true,
      token: newToken,
      refreshed: true,
      expiresAt: newPayload.exp
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 401);
  }
}

function getUserData(token) {
  try {
    const payload = parseTokenPayload(token);
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) {
      throw new Error('Token expired');
    }
    
    const email = payload.email;
    
    // Get all user configuration
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID) || email;
    const timezone = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.TIMEZONE) || Session.getScriptTimeZone();
    const paymentProcessor = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.PAYMENT_PROCESSOR) || 'stripe';
    const basePaymentLink = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BASE_PAYMENT_LINK) || '';
    
    const businessHoursStr = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BUSINESS_HOURS);
    const servicesStr = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES);
    const holidaysStr = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.HOLIDAYS);
    
    let businessHours = null;
    try {
      businessHours = businessHoursStr ? JSON.parse(businessHoursStr) : null;
    } catch (e) {
      Logger.log('Error parsing business hours: ' + e);
    }
    
    let services = [];
    try {
      services = servicesStr ? JSON.parse(servicesStr) : [];
    } catch (e) {
      Logger.log('Error parsing services: ' + e);
    }
    
    let holidays = [];
    try {
      holidays = holidaysStr ? JSON.parse(holidaysStr) : [];
    } catch (e) {
      Logger.log('Error parsing holidays: ' + e);
    }
    
    return jsonResponse({
      success: true,
      user: {
        name: email.split('@')[0],
        email: email,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=0D8ABC&color=fff`
      },
      config: {
        calendarId: calendarId,
        timezone: timezone,
        paymentProcessor: paymentProcessor,
        basePaymentLink: basePaymentLink,
        businessHours: businessHours,
        services: services,
        holidays: holidays
      },
      exp: payload.exp
    });
  } catch (error) {
    Logger.log('getUserData error: ' + error);
    return jsonResponse({ success: false, error: error.message }, 401);
  }
}

/**
 * Simplified getUserData that accepts Gmail directly (no token required)
 * Used when CODE2.gs redirects with Gmail parameter
 * @param {string} email - User's email address
 * @param {string} apiKeyToStore - Optional API key to store for this user
 */
function getUserDataByGmail(email, apiKeyToStore) {
  try {
    // Auto-initialize user if they don't exist
    const userEmail = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.USER_EMAIL);
    
    // Store API key if provided
    if (apiKeyToStore) {
      USER_PROPERTIES.setProperty('API_KEY', apiKeyToStore);
      Logger.log('✅ Stored API key for user: ' + email);
    }
    
    if (!userEmail) {
      // Initialize new user
      USER_PROPERTIES.setProperties({
        [USER_CONFIG_KEYS.USER_EMAIL]: email,
        [USER_CONFIG_KEYS.CREATED_AT]: new Date().toISOString(),
        [USER_CONFIG_KEYS.CALENDAR_ID]: email,
        [USER_CONFIG_KEYS.TIMEZONE]: Session.getScriptTimeZone(),
        [USER_CONFIG_KEYS.USERNAME]: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
        [USER_CONFIG_KEYS.BUSINESS_HOURS]: JSON.stringify({
          monday: { enabled: true, start: '09:00', end: '17:00' },
          tuesday: { enabled: true, start: '09:00', end: '17:00' },
          wednesday: { enabled: true, start: '09:00', end: '17:00' },
          thursday: { enabled: true, start: '09:00', end: '17:00' },
          friday: { enabled: true, start: '09:00', end: '17:00' },
          saturday: { enabled: false, start: '09:00', end: '17:00' },
          sunday: { enabled: false, start: '09:00', end: '17:00' }
        }),
        [USER_CONFIG_KEYS.SERVICES]: JSON.stringify([
          {
            id: '1',
            name: 'Consultation',
            description: '30-minute consultation call',
            duration: 30,
            price: 50,
            enabled: true
          }
        ]),
        [USER_CONFIG_KEYS.HOLIDAYS]: JSON.stringify([])
      });
    }
    
    // Get all user configuration
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID) || email;
    const timezone = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.TIMEZONE) || Session.getScriptTimeZone();
    const paymentProcessor = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.PAYMENT_PROCESSOR) || 'stripe';
    const basePaymentLink = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BASE_PAYMENT_LINK) || '';
    
    const businessHoursStr = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BUSINESS_HOURS);
    const servicesStr = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES);
    const holidaysStr = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.HOLIDAYS);
    
    let businessHours = null;
    try {
      businessHours = businessHoursStr ? JSON.parse(businessHoursStr) : null;
    } catch (e) {
      Logger.log('Error parsing business hours: ' + e);
    }
    
    let services = [];
    try {
      services = servicesStr ? JSON.parse(servicesStr) : [];
    } catch (e) {
      Logger.log('Error parsing services: ' + e);
    }
    
    let holidays = [];
    try {
      holidays = holidaysStr ? JSON.parse(holidaysStr) : [];
    } catch (e) {
      Logger.log('Error parsing holidays: ' + e);
    }
    
    // Create a simple session token for this user
    const token = createSessionToken(email);
    const payload = parseTokenPayload(token);
    
    return jsonResponse({
      success: true,
      user: {
        name: email.split('@')[0],
        email: email,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=0D8ABC&color=fff`
      },
      config: {
        calendarId: calendarId,
        timezone: timezone,
        paymentProcessor: paymentProcessor,
        basePaymentLink: basePaymentLink,
        businessHours: businessHours,
        services: services,
        holidays: holidays
      },
      token: token,
      exp: payload.exp
    });
  } catch (error) {
    Logger.log('getUserDataByGmail error: ' + error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * API Key based authentication - most secure method
 * Used when admin.html has stored API key from registration/login
 */
function getUserDataByApiKey(apiKey) {
  try {
    // Validate API key format
    if (!apiKey || !apiKey.startsWith('sk_')) {
      return jsonResponse({ success: false, error: 'Invalid API key format' }, 401);
    }
    
    // Get API key from user properties
    const storedApiKey = USER_PROPERTIES.getProperty('API_KEY');
    
    if (!storedApiKey) {
      return jsonResponse({ success: false, error: 'No API key configured. Please re-register.' }, 401);
    }
    
    if (storedApiKey !== apiKey) {
      return jsonResponse({ success: false, error: 'Invalid API key' }, 401);
    }
    
    // API key valid - get user email
    const email = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.USER_EMAIL);
    
    if (!email) {
      return jsonResponse({ success: false, error: 'User not initialized' }, 401);
    }
    
    // Return user data using existing function
    return getUserDataByGmail(email);
    
  } catch (error) {
    Logger.log('getUserDataByApiKey error: ' + error);
    return jsonResponse({ success: false, error: error.message }, 401);
  }
}

/**
 * Store API key during user initialization
 */
function storeApiKey(apiKey) {
  USER_PROPERTIES.setProperty('API_KEY', apiKey);
}

// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================

function saveConfiguration(config, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    
    if (!config.calendarId) throw new Error('Calendar ID required');
    
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.CALENDAR_ID, config.calendarId);
    
    if (config.paymentProcessorType) {
      USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.PAYMENT_PROCESSOR, config.paymentProcessorType);
    }
    if (config.basePaymentLink !== undefined) {
      USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.BASE_PAYMENT_LINK, config.basePaymentLink || '');
    }
    if (config.paymentsEnabled !== undefined) {
      USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.PAYMENTS_ENABLED, String(config.paymentsEnabled));
    }
    if (config.timezone) {
      USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.TIMEZONE, config.timezone);
    }
    if (config.businessHours) {
      USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.BUSINESS_HOURS, JSON.stringify(config.businessHours));
    }
    if (config.services) {
      USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.SERVICES, JSON.stringify(config.services));
    }
    if (config.holidays) {
      USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.HOLIDAYS, JSON.stringify(config.holidays));
    }
    
    return jsonResponse({ success: true, message: 'Configuration saved' });
  } catch (error) {
    Logger.log('saveConfiguration error: ' + error);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

function getConfiguration(token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    
    const config = {
      adminEmail: email,
      calendarId: USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID) || '',
      paymentProcessor: USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.PAYMENT_PROCESSOR) || 'stripe',
      basePaymentLink: USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BASE_PAYMENT_LINK) || '',
      paymentsEnabled: USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.PAYMENTS_ENABLED) === 'true',
      businessHours: JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BUSINESS_HOURS) || '{}'),
      services: JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES) || '[]'),
      holidays: JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.HOLIDAYS) || '[]'),
      timezone: USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.TIMEZONE) || Session.getScriptTimeZone()
    };
    
    return jsonResponse({ success: true, config: config });
  } catch (error) {
    Logger.log('getConfiguration error: ' + error);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

function saveBusinessHours(businessHours, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.BUSINESS_HOURS, JSON.stringify(businessHours));
    return jsonResponse({ success: true, message: 'Business hours saved' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

function saveServices(services, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.SERVICES, JSON.stringify(services));
    return jsonResponse({ success: true, message: 'Services saved' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

function saveHolidays(holidays, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    
    USER_PROPERTIES.setProperty(USER_CONFIG_KEYS.HOLIDAYS, JSON.stringify(holidays));
    return jsonResponse({ success: true, message: 'Holidays saved' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

// ============================================================================
// CALENDAR & BOOKINGS
// ============================================================================

function getAvailability(dateString, serviceId) {
  try {
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    const businessHours = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.BUSINESS_HOURS) || '{}');
    const services = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES) || '[]');
    const holidays = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.HOLIDAYS) || '[]');
    const timezone = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.TIMEZONE) || Session.getScriptTimeZone();
    
    if (!calendarId) throw new Error('Calendar not configured');
    
    // Find service by id or name
    const service = services.find(s => s.id === serviceId || s.name === serviceId);
    if (!service) throw new Error('Service not found');
    
    const date = new Date(dateString);
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    
    if (!businessHours[dayOfWeek] || !businessHours[dayOfWeek].enabled) {
      return jsonResponse({ success: true, availableSlots: [], businessTimezone: timezone });
    }
    
    const isHoliday = holidays.some(h => {
      const start = new Date(h.startDate);
      const end = new Date(h.endDate);
      return date >= start && date <= end;
    });
    
    if (isHoliday) {
      return jsonResponse({ success: true, availableSlots: [], businessTimezone: timezone });
    }
    
    const { start: startTime, end: endTime } = businessHours[dayOfWeek];
    const slots = generateTimeSlots(date, startTime, endTime, service.duration || 60);
    
    const calendar = CalendarApp.getCalendarById(calendarId);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const events = calendar.getEvents(startOfDay, endOfDay);
    
    const availableSlots = slots.filter(slot => {
      return !events.some(event => {
        const eventStart = event.getStartTime();
        const eventEnd = event.getEndTime();
        return slot.start < eventEnd && slot.end > eventStart;
      });
    });
    
    return jsonResponse({
      success: true,
      availableSlots: availableSlots.map(slot => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        displayTime: formatTime(slot.start)
      })),
      businessTimezone: timezone
    });
  } catch (error) {
    Logger.log('getAvailability error: ' + error);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

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
    
    current = new Date(current.getTime() + 30 * 60000);
  }
  
  return slots;
}

function createBooking(booking) {
  try {
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    const services = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES) || '[]');
    
    if (!calendarId) throw new Error('Calendar not configured');
    
    // Find service by id or name
    const service = services.find(s => s.id === booking.serviceId || s.name === booking.serviceId);
    if (!service) throw new Error('Service not found');
    
    const calendar = CalendarApp.getCalendarById(calendarId);
    const startTime = new Date(booking.date + 'T' + booking.time);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);
    
    const eventTitle = `${service.name} - ${booking.firstName} ${booking.lastName}`;
    const eventDescription = [
      `Customer: ${booking.firstName} ${booking.lastName}`,
      `Email: ${booking.email}`,
      `Phone: ${booking.phone}`,
      `Service: ${service.name}`,
      `Duration: ${service.duration} minutes`,
      `Price: $${service.price}`,
      booking.notes ? `Notes: ${booking.notes}` : '',
      `Booking ID: ${generateBookingId()}`
    ].filter(Boolean).join('\n');
    
    const event = calendar.createEvent(eventTitle, startTime, endTime, {
      description: eventDescription,
      location: service.meetingLink || '',
      guests: booking.email,
      sendInvites: true
    });
    
    sendBookingConfirmationEmail(booking, service, event);
    
    return jsonResponse({
      success: true,
      message: 'Booking created',
      bookingId: event.getId()
    });
  } catch (error) {
    Logger.log('createBooking error: ' + error);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

function getBookings(filters, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    if (!calendarId) throw new Error('Calendar not configured');
    
    const calendar = CalendarApp.getCalendarById(calendarId);
    const startDate = filters && filters.startDate ? new Date(filters.startDate) : new Date();
    const endDate = filters && filters.endDate ? new Date(filters.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
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
    
    return jsonResponse({ success: true, bookings: bookings });
  } catch (error) {
    Logger.log('getBookings error: ' + error);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

function cancelBooking(bookingId, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    if (!calendarId) throw new Error('Calendar not configured');
    
    const calendar = CalendarApp.getCalendarById(calendarId);
    const event = calendar.getEventById(bookingId);
    
    if (!event) throw new Error('Booking not found');
    
    const guests = event.getGuestList();
    if (guests.length > 0) {
      sendCancellationEmail(guests[0].getEmail(), event);
    }
    
    event.deleteEvent();
    
    return jsonResponse({ success: true, message: 'Booking cancelled' });
  } catch (error) {
    Logger.log('cancelBooking error: ' + error);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

function getPublicServices() {
  try {
    const services = JSON.parse(USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.SERVICES) || '[]');
    return jsonResponse({ success: true, services: services });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

function getAnalytics(startDate, endDate, token) {
  try {
    const email = resolveUserEmail({ token: token });
    if (!email) throw new Error('Authentication required');
    
    const calendarId = USER_PROPERTIES.getProperty(USER_CONFIG_KEYS.CALENDAR_ID);
    if (!calendarId) throw new Error('Calendar not configured');
    
    const calendar = CalendarApp.getCalendarById(calendarId);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const events = calendar.getEvents(start, end);
    
    let totalRevenue = 0;
    const totalBookings = events.length;
    
    events.forEach(event => {
      const description = event.getDescription();
      const priceMatch = description.match(/Price: \$(\d+)/);
      if (priceMatch) {
        totalRevenue += parseFloat(priceMatch[1]);
      }
    });
    
    return jsonResponse({
      success: true,
      analytics: {
        totalBookings: totalBookings,
        totalRevenue: totalRevenue,
        averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });
  } catch (error) {
    Logger.log('getAnalytics error: ' + error);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

function sendBookingConfirmationEmail(booking, service, event) {
  const subject = `Booking Confirmed: ${service.name}`;
  const body = `
<html>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
<div style="max-width:600px;margin:0 auto;padding:20px">
<h1 style="color:#065f46">🌊 Booking Confirmed!</h1>
<p>Hi ${booking.firstName},</p>
<p>Your booking has been confirmed!</p>
<div style="background:#f0fdf4;border-left:4px solid #059669;padding:15px;margin:20px 0">
<h3 style="margin-top:0;color:#065f46">Session Details</h3>
<p><strong>Service:</strong> ${service.name}</p>
<p><strong>Date:</strong> ${formatDate(event.getStartTime())}</p>
<p><strong>Time:</strong> ${formatTime(event.getStartTime())} - ${formatTime(event.getEndTime())}</p>
<p><strong>Duration:</strong> ${service.duration} minutes</p>
${service.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${service.meetingLink}">${service.meetingLink}</a></p>` : ''}
</div>
<p>A calendar invitation has been sent to your email.</p>
<p style="color:#6b7280;font-size:14px;margin-top:30px">- The Swell Team</p>
</div>
</body>
</html>`;
  
  MailApp.sendEmail({
    to: booking.email,
    subject: subject,
    htmlBody: body
  });
}

function sendCancellationEmail(email, event) {
  const subject = `Booking Cancelled: ${event.getTitle()}`;
  const body = `
<html>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
<div style="max-width:600px;margin:0 auto;padding:20px">
<h1 style="color:#991b1b">Booking Cancelled</h1>
<p>Your booking has been cancelled:</p>
<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:15px;margin:20px 0">
<p><strong>Session:</strong> ${event.getTitle()}</p>
<p><strong>Date:</strong> ${formatDate(event.getStartTime())}</p>
<p><strong>Time:</strong> ${formatTime(event.getStartTime())}</p>
</div>
<p>If you'd like to reschedule, please book a new session.</p>
<p style="color:#6b7280;font-size:14px;margin-top:30px">- The Swell Team</p>
</div>
</body>
</html>`;
  
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: body
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'EEEE, MMMM d, yyyy');
}

function formatTime(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'h:mm a');
}

function generateBookingId() {
  return 'BOOK-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11).toUpperCase();
}
