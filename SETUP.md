# 100K PATHWAY - COMPLETE SETUP GUIDE

## ⚠️ INFRASTRUCTURE FOUNDATIONS COMPLETE

**Production-Grade Components Now in Place:**
- ✅ Idempotency (no duplicate charges/operations)
- ✅ State machines (enforced entity workflows)
- ✅ Async job queue (reliable background processing)
- ✅ Centralized business rules (single source of truth)
- ✅ Graceful startup/shutdown (zero data loss)
- ✅ Full observability (tracing, metrics, audit logs)

**Before ANY features:**
1. Run updated database schema (adds audit tables, job queue)
2. Test infrastructure components
3. Configure external services

## DEPLOYMENT STATUS: INFRASTRUCTURE READY, CONFIGURATION NEEDED
**What's Done:** Frontend pages, backend API, **enterprise infrastructure**, database schema  
**What's Needed:** Environment setup, database initialization, infrastructure testing

## NO-SUPABASE MODE (SUPPORTED)

If you do not want Supabase, run in local storage mode:
- Forms, auth, interviews, and refunds are stored under `data/` as JSON.
- Keep SMTP configured for email delivery.
- Set `PAYMENTS_SIMULATION=true` to test checkout flow without Stripe backend integration.

---

## QUICK START (15 Minutes)

### 1. **Install Dependencies**
```bash
cd "/Users/vishwa/Desktop/100k Pathway"
npm install
```

### 2. **Database Setup (Supabase)**
1. Go to [supabase.com](https://supabase.com) → Create account → New Project
2. Once created, go to **Settings** → **API**
3. Copy these values:
   - `Project URL` → SUPABASE_URL
   - `anon public` key → SUPABASE_KEY
   - `service_role` key → SUPABASE_SERVICE_KEY
4. Run database schema:
   ```bash
   # In Supabase dashboard: SQL Editor → New Query
   # Paste contents of api/database-schema.sql → Run
   ```

### 3. **Email Setup (SendGrid)**
1. Go to [sendgrid.com](https://sendgrid.com) → Create account (free tier: 100 emails/day)
2. **Settings** → **API Keys** → Create API Key
3. Copy key → SENDGRID_API_KEY
4. **Sender Authentication** → Single Sender Verification → Verify your email

### 4. **Payment Setup (Stripe)**
1. Go to [stripe.com/register](https://stripe.com/register) → Create account
2. **Developers** → **API keys** → Copy:
   - `Publishable key` → STRIPE_PUBLISHABLE_KEY
   - `Secret key` → STRIPE_SECRET_KEY
3. **Developers** → **Webhooks** → Add endpoint:
   - URL: `https://your-domain.com/api/stripe-webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook secret → STRIPE_WEBHOOK_SECRET

### 5. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 6. **Generate JWT Secret**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to JWT_SECRET in .env
```

### 7. **Test Locally**
```bash
# Terminal 1: Start backend
cd api
node server.js

# Terminal 2: Start frontend (any HTTP server)
python3 -m http.server 8001
# OR
npx serve -p 8001

# Visit: http://localhost:8001
```

### 8. **Deploy to Vercel**
```bash
npm install -g vercel
vercel login
vercel
# Follow prompts, add environment variables from .env
```

---

## WHAT'S CURRENTLY MISSING (THE 80% WORK)

### Backend Integration (40%)
- [ ] Environment variables not configured
- [ ] Database not initialized
- [ ] Email service not set up
- [ ] Stripe not connected
- [ ] Frontend forms not connected to backend
- [ ] Auth flow not complete
- [ ] Dashboard data not loading from API

### Frontend Functionality (30%)
- [ ] Auth pages (auth.html) need backend connection
- [ ] Checkout flow (checkout.html) needs Stripe integration
- [ ] Dashboard (dashboard.html) needs real user data
- [ ] Admin dashboard needs API endpoints
- [ ] Forms show success but don't persist data
- [ ] No error handling/validation feedback

### Testing & Security (10%)
- [ ] No error handling on frontend
- [ ] No input validation UI
- [ ] Stripe webhook not tested
- [ ] Rate limiting not tested
- [ ] CORS configuration for production
- [ ] HTTPS/SSL certificate
- [ ] Security headers verification

### Infrastructure (20%)
- [ ] Database tables not created
- [ ] No automated deployments
- [ ] No monitoring/logging
- [ ] No backup strategy
- [ ] Performance optimization needed
- [ ] CDN not configured

---

## PRIORITY ORDER TO COMPLETE

### Phase 1: Core Functionality (1-2 hours)
1. **Set up Supabase** → Initialize database
2. **Configure SendGrid** → Test email sending
3. **Set up Stripe Test Mode** → Process test payment
4. **Update .env** → All keys in place
5. **Test backend locally** → All endpoints respond

### Phase 2: Connect Frontend (1-2 hours)
6. **Update API URLs** → Point to localhost/production
7. **Connect auth.html** → Real login/signup
8. **Connect apply.html** → Store applications
9. **Connect contact.html** → Send emails
10. **Test checkout.html** → Complete payment flow

### Phase 3: Deploy (30 minutes)
11. **Deploy to Vercel** → Backend API live
12. **Deploy frontend** → Static hosting (Vercel/Netlify)
13. **Add environment variables** → Production values
14. **Test production** → Full flow works

### Phase 4: Polish (30 minutes)
15. **Add error handling** → User-friendly messages
16. **Test on mobile** → Responsive fixes
17. **Performance check** → Load times <2s
18. **Security audit** → HTTPS, headers, rate limits

---

## FILE LOCATIONS

### Frontend (Static HTML)
- `/index.html` → Homepage
- `/pricing.html` → Pricing with calculator
- `/apply.html` → Application form
- `/auth.html` → Login/signup
- `/checkout.html` → Payment flow
- `/dashboard.html` → User dashboard
- `/admin-dashboard.html` → Admin panel

### Backend (Node.js API)
- `/api/server.js` → Main API server (436 lines)
- `/api/database-schema.sql` → PostgreSQL schema (193 lines)

### Configuration
- `/.env.example` → Environment template
- `/vercel.json` → Deployment config
- `/package.json` → Dependencies

---

## TESTING CHECKLIST

### Before Launch
- [ ] Create test user account
- [ ] Submit test application
- [ ] Process test payment ($0.50 in Stripe test mode)
- [ ] Send contact form message
- [ ] Log into dashboard
- [ ] Verify email arrives
- [ ] Check database records created
- [ ] Test on mobile device
- [ ] Test in incognito/private mode
- [ ] Verify all links work
- [ ] Check 404 page loads
- [ ] Test refund policy page
- [ ] Verify about page loads

---

## COMMON ISSUES & FIXES

### "Cannot connect to database"
**Fix:** Check SUPABASE_URL and SUPABASE_KEY in .env match Supabase dashboard

### "Email not sending"
**Fix:** Verify sender email in SendGrid, check SENDGRID_API_KEY, check spam folder

### "Payment failed"
**Fix:** Use Stripe test card `4242 4242 4242 4242`, expiry `12/34`, CVC `123`

### "CORS error"
**Fix:** Update FRONTEND_URL in .env to match your domain (include http:// or https://)

### "JWT invalid"
**Fix:** Generate new JWT_SECRET (see step 6 above), restart server

---

## PRODUCTION DEPLOYMENT

### Vercel (Recommended - Free)
```bash
vercel --prod
```

### Environment Variables to Add in Vercel Dashboard:
- SUPABASE_URL
- SUPABASE_KEY
- STRIPE_SECRET_KEY
- SENDGRID_API_KEY
- EMAIL_FROM
- ADMIN_EMAIL
- JWT_SECRET
- FRONTEND_URL

### Custom Domain Setup
1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g., 100k-pathway.com)
3. Update DNS records as shown
4. SSL certificate auto-generated

---

## ESTIMATED COSTS

### Minimum (Free Tier)
- **Hosting:** Vercel Free ($0/mo)
- **Database:** Supabase Free ($0/mo, 500MB)
- **Email:** SendGrid Free ($0/mo, 100 emails/day)
- **Payments:** Stripe (0% fees on test mode)
- **Total:** $0/month

### Production Scale (100 users)
- **Hosting:** Vercel Pro ($20/mo)
- **Database:** Supabase Pro ($25/mo)
- **Email:** SendGrid Essentials ($15/mo, 40K emails)
- **Payments:** Stripe (2.9% + $0.30 per transaction)
- **Total:** ~$60/month + payment fees

---

## SUPPORT

**Issues:** Create issue in GitHub repo  
**Email:** support@100k-pathway.com  
**Docs:** This file (SETUP.md)

---

## NEXT STEPS

1. **Run:** `npm install`
2. **Create:** Supabase account → Get keys
3. **Create:** SendGrid account → Get API key
4. **Create:** Stripe account → Get test keys
5. **Update:** `.env` with all values
6. **Initialize:** Database schema in Supabase
7. **Test:** Local server → All endpoints
8. **Deploy:** Vercel → Production

**Estimated Time to Production:** 3-4 hours
