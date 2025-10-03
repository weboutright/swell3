# 🌊 Swell Booking System

**The simplest way to add booking functionality to your website.**

One file. One deployment. Your own booking system in 5 minutes.

## ✨ What is Swell?

Swell is a **self-hosted booking system** that runs in your own Google account. No monthly fees, no user limits, no BS.

- 📅 **Google Calendar Integration** - Bookings go straight to your calendar
- 💰 **Payment Links** - Connect Stripe or Square
- 🎨 **Embeddable Widget** - Drop it on any website
- 🔐 **Secure** - Data stored in YOUR Google account
- 🚀 **Fast Setup** - Copy one file, deploy, done

## 🚀 Quick Start

### 1. Copy Code.gs

```bash
# Clone this repo or just copy Code.gs
git clone https://github.com/weboutright/swell3.git
```

### 2. Deploy to Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Create new project
3. Paste `Code.gs`
4. Deploy → Web app
5. **Execute as: User accessing the web app**
6. **Who has access: Anyone**
7. Copy your URL

### 3. Configure Your Services

1. Open `YOUR_URL?page=admin`
2. Login with Google
3. Add your services (name, duration, price)
4. Set business hours
5. Connect payment processor

### 4. Embed on Your Website

```html
<iframe 
  src="YOUR_URL?page=widget" 
  width="100%" 
  height="600px">
</iframe>
```

**Done!** You now have a complete booking system. 🎉

## 💡 How It Works

```
Your Website → Booking Widget → Google Calendar
                    ↓
            Payment Processor
```

1. Customer visits your website
2. Selects service and time slot
3. Fills booking form
4. Pays via Stripe/Square
5. Booking created in your calendar
6. Confirmation emails sent

## 🎯 Features

### For You (Business Owner)

- ✅ Admin dashboard to manage everything
- ✅ Configure services, pricing, duration
- ✅ Set business hours and holidays
- ✅ View all bookings in one place
- ✅ Automatic calendar sync
- ✅ Payment link generation

### For Your Customers

- ✅ Clean, modern booking interface
- ✅ Real-time availability
- ✅ Select service and time
- ✅ Secure payment
- ✅ Email confirmations
- ✅ Mobile-friendly

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT-GUIDE.md) - Full setup instructions
- [Architecture](DEPLOYMENT-GUIDE.md#architecture-overview) - How it works under the hood

## 🔐 Security & Privacy

- **Your data, your account** - Everything stored in YOUR Google account
- **No third-party servers** - Runs directly on Google's infrastructure
- **Automatic isolation** - Each user's data is completely separate
- **OAuth authentication** - Secure login with Google

## 💰 Pricing

**Free!** Forever.

- ❌ No monthly fees
- ❌ No booking limits
- ❌ No user limits
- ❌ No hidden charges

You only pay for:
- Google Calendar (free)
- Payment processor fees (Stripe/Square standard rates)

## 🛠️ Tech Stack

- **Backend**: Google Apps Script (JavaScript)
- **Frontend**: Tailwind CSS + Vanilla JS
- **Storage**: Google USER_PROPERTIES
- **Calendar**: Google Calendar API
- **Payments**: Stripe or Square (your choice)

## 📋 Requirements

- Google account (free)
- Website to embed widget
- Stripe or Square account (for payments)

## 🤝 Support

- 📚 [Read the docs](DEPLOYMENT-GUIDE.md)
- 🐛 [Report a bug](https://github.com/weboutright/swell3/issues)
- 💬 [Discussions](https://github.com/weboutright/swell3/discussions)

## 📝 License

MIT License - Use it however you want!

## 🎉 Get Started Now

1. Visit [https://weboutright.github.io/swell3/](https://weboutright.github.io/swell3/)
2. Copy Code.gs
3. Deploy to Apps Script
4. Start taking bookings!

---

Built with ❤️ for small businesses and freelancers who want simple, powerful booking without the hassle.
