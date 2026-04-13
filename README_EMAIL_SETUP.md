# 100K Pathway Email Service Setup

## Overview
This is a completely self-hosted email service for 100K Pathway that runs independently without any external email service dependencies.

## Features
- ✅ Apple-level professional email templates
- ✅ Self-hosted (no external API dependencies)
- ✅ Zero ongoing costs
- ✅ Full control over email delivery
- ✅ Beautiful HTML email design matching your website
- ✅ Automatic confirmation emails to applicants
- ✅ Team notifications for new applications

## Email Templates Included
1. **Contact Form Confirmation** - Sent to applicants after form submission
2. **Team Notification** - Sent to your team with application details
3. **Payment Welcome** - Sent after payment completion (future)

## Setup Instructions

### 1. Configure SMTP Credentials
Edit the `.env` file in your project root:

```env
# Gmail SMTP Configuration (Recommended for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@100kpathway.com
TEAM_EMAIL=team@100kpathway.com
```

### 2. Gmail App Password Setup (If using Gmail)
1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification (must be enabled)
3. Go to Security → App passwords
4. Generate a new app password for "Mail"
5. Use this 16-character password as `SMTP_PASS`

### 3. Alternative SMTP Providers
You can use any SMTP provider:

**SendGrid (Free 100 emails/day):**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Mailgun (Free 5000 emails/month):**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### 4. Test the Service
```bash
# Start the server
npm start

# Test health check
curl http://localhost:3000/health

# Test email connectivity
curl http://localhost:3000/api/test-email
```

### 5. Deploy to Vercel
1. Push your code to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `FROM_EMAIL`
   - `TEAM_EMAIL`

## Usage

### Form Integration
The service automatically handles form submissions from your `apply.html` page. No changes needed to your frontend.

### API Endpoints
- `POST /api/submit-form` - Handle form submissions
- `POST /api/payment-webhook` - Handle payment confirmations (future)
- `GET /api/test-email` - Test email service
- `GET /health` - Health check

## Email Template Design
The emails feature:
- Clean, minimalist Apple-inspired design
- Responsive layout for all devices
- Professional typography matching your website
- Consistent branding with 100K Pathway colors
- No external CSS dependencies
- Works in all major email clients

## Benefits Over Formspree
- ✅ No monthly fees
- ✅ No submission limits
- ✅ Complete control over email content
- ✅ Professional branding
- ✅ Better deliverability
- ✅ No external service dependencies

## Support
For issues with email delivery:
1. Check your SMTP credentials
2. Verify your email provider settings
3. Test with the `/api/test-email` endpoint
4. Check server logs for detailed error messages

## Next Steps
1. Configure your SMTP credentials in `.env`
2. Test email delivery locally
3. Deploy to production
4. Update your DNS records if needed
5. Monitor email delivery performance