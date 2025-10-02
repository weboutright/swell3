# 🌊 Swell - Free Calendly Alternative

A multi-tenant SaaS booking platform where anyone can sign up with their Google account and create their own booking page using their own Google Calendar.

## ✨ Features

- 🔐 **OAuth Authentication** - Sign in with Google
- 📅 **Personal Calendar Integration** - Each user uses their own Google Calendar
- 💳 **Payment Links** - Integrate Stripe or Square payment links
- 🎥 **Meeting Links** - Add Zoom, Google Meet, or custom meeting links
- ⏰ **Business Hours** - Configure weekly availability
- 🎨 **Beautiful UI** - Modern, responsive design with Tailwind CSS
- 🔒 **Data Isolation** - Complete separation between users

## 🚀 Live Demo

- **Admin Dashboard**: [Your GitHub Pages URL]/admin.html
- **Landing Page**: [Your GitHub Pages URL]/index.html
- **Booking Widget**: [Your GitHub Pages URL]/widget.html

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS (Tailwind), JavaScript
- **Backend**: Google Apps Script
- **Database**: Google User Properties (per-user isolation)
- **Calendar**: Google Calendar API
- **Hosting**: GitHub Pages

## 📦 Deployment

### 1. Google Apps Script Setup

1. Go to [script.google.com](https://script.google.com)
2. Create new project: "Swell Booking System"
3. Copy contents of `Code.gs` and paste
4. Copy contents of `appsscript.json` and paste
5. Deploy as Web App:
   - Execute as: **User accessing the web app**
   - Who has access: **Anyone**

### 2. GitHub Pages Setup

Already done! This repository is hosted on GitHub Pages.

### 3. Update Script URL

Update `GOOGLE_SCRIPT_URL` in all HTML files with your deployed script URL.

## 🎯 Usage

### For Administrators (You)

1. Visit `/admin.html`
2. Sign in with Google
3. Configure your:
   - Business hours
   - Services & pricing
   - Payment links
   - Meeting links
   - Holidays

### For Customers

1. Visit your booking page
2. Select a service
3. Choose date & time
4. Fill in details
5. Complete payment (if required)
6. Receive calendar invitation

## 🔧 Configuration

All configuration is stored per-user in Google User Properties:

- `timezone` - User's business timezone
- `calendarId` - Google Calendar ID
- `services` - Array of booking services
- `businessHours` - Weekly availability
- `holidays` - Blocked dates
- `paymentProcessor` - Stripe or Square
- `basePaymentLink` - Payment checkout URL

## 🏗️ Architecture

```
┌─────────────────┐
│  GitHub Pages   │ ← Frontend (HTML/CSS/JS)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Google Apps     │ ← Backend API
│ Script          │
└────────┬────────┘
         │
         ├→ User Properties (per-user data)
         ├→ Google Calendar API
         └→ Gmail API (notifications)
```

## 📝 License

MIT License - Feel free to use for personal or commercial projects!

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🐛 Known Issues

- Session tokens expire after 15 minutes (by design)
- First-time OAuth requires manual authorization
- Limited to Google Calendar only

## 🔮 Future Features

- [ ] Multi-calendar support
- [ ] SMS notifications (Twilio)
- [ ] Advanced analytics dashboard
- [ ] Custom branding options
- [ ] API for integrations
- [ ] Mobile app

## 📧 Support

Open an issue on GitHub or contact the maintainer.

---

**Made with ❤️ using Google Apps Script**
