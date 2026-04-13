# DEPLOYMENT CHECKLIST - 100K PATHWAY

## CURRENT STATUS: 20% PRODUCTION READY
**Completed:** Frontend design, backend structure, database schema  
**Needed:** Configuration, testing, deployment

---

## PRE-DEPLOYMENT (Complete These First)

### 1. Environment Setup
- [ ] Create Supabase account
- [ ] Create SendGrid account  
- [ ] Create Stripe account
- [ ] Generate JWT secret
- [ ] Create `.env` file from `.env.example`
- [ ] Fill all environment variables

### 2. Database Initialization
- [ ] Log into Supabase dashboard
- [ ] Go to SQL Editor
- [ ] Copy contents of `api/database-schema.sql`
- [ ] Execute SQL script
- [ ] Verify 11 tables created
- [ ] Test insert/select on `users` table

### 3. Email Configuration
- [ ] Verify sender email in SendGrid
- [ ] Test email sending (run test script)
- [ ] Whitelist production domain
- [ ] Set up email templates (optional)

### 4. Payment Integration
- [ ] Enable Stripe test mode
- [ ] Add test payment method
- [ ] Process test transaction
- [ ] Set up webhook endpoint
- [ ] Test webhook locally (Stripe CLI)
- [ ] Switch to live mode when ready

---

## LOCAL TESTING (Must Pass All)

### Backend API Tests
```bash
cd api
node server.js
```

- [ ] Server starts without errors
- [ ] `/health` endpoint returns 200
- [ ] POST `/api/auth/signup` creates user
- [ ] POST `/api/auth/signin` returns token
- [ ] POST `/api/submit-application` saves data
- [ ] POST `/api/contact` sends email
- [ ] POST `/api/create-payment-intent` works
- [ ] Rate limiting triggers after max attempts
- [ ] CORS allows frontend origin

### Frontend Integration Tests
```bash
python3 -m http.server 8001
# Visit http://localhost:8001
```

- [ ] Homepage loads completely
- [ ] Calculator on pricing page works
- [ ] Apply form submits successfully
- [ ] Contact form sends message
- [ ] Auth pages show login/signup
- [ ] Checkout flow completes
- [ ] Dashboard loads (after login)
- [ ] All navigation links work
- [ ] Mobile responsive on all pages
- [ ] No console errors in browser

### Security Tests
- [ ] Passwords are hashed (bcrypt)
- [ ] JWT tokens expire correctly
- [ ] Rate limiting blocks excessive requests
- [ ] SQL injection prevented
- [ ] XSS protection active
- [ ] HTTPS redirects work
- [ ] CORS restricted to allowed origins

---

## DEPLOYMENT STEPS

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
vercel login
```

### Step 2: Deploy Backend API
```bash
cd "/Users/vishwa/Desktop/100k Pathway"
vercel
```
- [ ] Select "100k-pathway" project (or create new)
- [ ] Set root directory to `.` (current)
- [ ] Vercel detects Node.js
- [ ] Build succeeds
- [ ] Deployment URL received

### Step 3: Add Environment Variables
**In Vercel Dashboard: Settings → Environment Variables**

Add these (from your `.env`):
- [ ] SUPABASE_URL
- [ ] SUPABASE_KEY
- [ ] SUPABASE_SERVICE_KEY
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] SENDGRID_API_KEY
- [ ] EMAIL_FROM
- [ ] ADMIN_EMAIL
- [ ] JWT_SECRET
- [ ] FRONTEND_URL (your production domain)
- [ ] NODE_ENV=production

### Step 4: Deploy Frontend (Static Files)
**Option A: Same Vercel Project**
- Frontend files automatically deployed with backend

**Option B: Separate Deployment**
```bash
vercel --prod
```

### Step 5: Configure Custom Domain
1. Vercel Dashboard → Domains → Add Domain
2. Enter your domain (e.g., `100k-pathway.com`)
3. Update DNS records at your registrar:
   - Type: `A` Record
   - Name: `@`
   - Value: `76.76.21.21` (Vercel's IP)
4. Wait for SSL certificate (auto-generated)

### Step 6: Update Stripe Webhook
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://100k-pathway.com/api/stripe-webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.created`
4. Copy webhook secret → Update in Vercel env vars
5. Redeploy: `vercel --prod`

---

## POST-DEPLOYMENT TESTING

### Smoke Tests (Production)
- [ ] Visit homepage: `https://100k-pathway.com`
- [ ] Test pricing calculator
- [ ] Submit contact form
- [ ] Submit application
- [ ] Process test payment (Stripe test mode)
- [ ] Verify emails arrive
- [ ] Check Supabase for new records
- [ ] Test mobile browser
- [ ] Test in incognito mode
- [ ] Check page load speed (<2s)

### Monitoring Setup
- [ ] Set up Vercel analytics
- [ ] Configure error tracking (Sentry optional)
- [ ] Add Plausible analytics
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Configure backup alerts

---

## GO-LIVE CHECKLIST

### Final Pre-Launch
- [ ] All tests passing
- [ ] SSL certificate active (HTTPS)
- [ ] Custom domain working
- [ ] Emails sending to inbox (not spam)
- [ ] Payments processing correctly
- [ ] Database backups enabled
- [ ] Support email monitored
- [ ] Legal pages reviewed (terms, privacy, refund)
- [ ] Pricing correct ($1299, $1999, $2999)
- [ ] Success fees correct (15%, 12%, 8%)

### Launch Day
- [ ] Switch Stripe to live mode
- [ ] Update Stripe keys in Vercel
- [ ] Redeploy: `vercel --prod`
- [ ] Test real payment ($0.50)
- [ ] Refund test transaction
- [ ] Announce on social media
- [ ] Monitor error logs
- [ ] Check analytics

---

## ROLLBACK PLAN (If Issues Arise)

### Immediate Actions
1. Vercel Dashboard → Deployments → Previous deployment → Promote to Production
2. Or: `vercel rollback`
3. Investigate errors in Vercel logs
4. Fix locally → Test → Redeploy

### Common Issues
**Issue:** Database connection fails  
**Fix:** Verify SUPABASE_URL and SUPABASE_KEY in Vercel env vars

**Issue:** Emails not sending  
**Fix:** Check SendGrid sender verification, API key, check spam folder

**Issue:** Payments failing  
**Fix:** Verify Stripe keys, check webhook endpoint, use test card `4242 4242 4242 4242`

**Issue:** CORS errors  
**Fix:** Update FRONTEND_URL to match production domain (include https://)

**Issue:** 500 errors  
**Fix:** Check Vercel Function logs, verify all env vars set correctly

---

## MAINTENANCE PLAN

### Daily
- [ ] Check Vercel logs for errors
- [ ] Monitor uptime (99.9% target)
- [ ] Review new applications

### Weekly
- [ ] Review Stripe transactions
- [ ] Check database storage usage
- [ ] Review email delivery rates
- [ ] Backup database (manual)

### Monthly
- [ ] Review security updates
- [ ] Update dependencies (`npm outdated`)
- [ ] Analyze performance metrics
- [ ] Review and optimize costs

---

## COST BREAKDOWN (Monthly)

### Development/Testing (Free)
- Vercel: Free tier
- Supabase: Free tier (500MB)
- SendGrid: Free tier (100 emails/day)
- Stripe: Test mode (free)
- **Total: $0/month**

### Production (First 100 Users)
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- SendGrid Essentials: $15/month (40K emails)
- Stripe: 2.9% + $0.30 per transaction
- Domain: ~$12/year
- **Total: ~$60/month + payment fees**

### Scale (1000 Users)
- Vercel Pro: $20/month
- Supabase Pro: $25/month (may need upgrade at 8GB)
- SendGrid: $80/month (100K emails)
- Stripe: 2.9% + $0.30 per transaction
- CDN: ~$20/month (Cloudflare Pro)
- **Total: ~$145/month + payment fees**

---

## SUPPORT CONTACTS

**Vercel Support:** support@vercel.com  
**Supabase Support:** support@supabase.com  
**SendGrid Support:** support@sendgrid.com  
**Stripe Support:** support@stripe.com

**Emergency:** Rollback to previous deployment  
**Downtime:** Check status.vercel.com

---

## SUCCESS CRITERIA

### Technical
- [ ] 99.9% uptime
- [ ] Page load <2 seconds
- [ ] Zero security vulnerabilities
- [ ] All forms working
- [ ] Payments processing

### Business
- [ ] Applications storing correctly
- [ ] Emails delivering
- [ ] No refund requests due to tech issues
- [ ] Support tickets <24h response
- [ ] User satisfaction >4.5/5

---

## ESTIMATED TIMELINE

- **Setup (first time):** 2-3 hours
- **Testing:** 1 hour
- **Deployment:** 30 minutes
- **Verification:** 30 minutes
- **Total:** ~4-5 hours to production

**Next Action:** Start with "PRE-DEPLOYMENT" section above
