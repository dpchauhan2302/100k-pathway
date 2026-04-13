# 🚀 QUICK START - GET LIVE IN 15 MINUTES

## ✅ What's Already Done
- Frontend wired to backend (apply, contact, auth, checkout)
- API client with retries + idempotency
- Security hardened (chaos blocked in production)
- Deployment script ready

---

## 📋 YOUR CHECKLIST (3 Steps)

### **STEP 1: Fill .env (5 min)**

Open `/Users/vishwa/Desktop/100k Pathway/.env` and update these 6 values:

```bash
# 1. Supabase (get from https://supabase.com/dashboard/project/_/settings/api)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_service_role_key_here

# 2. Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# 3. SendGrid (get from https://app.sendgrid.com/settings/api_keys)
SENDGRID_API_KEY=SG.your_key_here

# 4. JWT (already generated)
JWT_SECRET=4ec8d02270d43f6a24ee8eff1756c92d8f66da281a509895b4bf095f0b386922

# 5. Emails
FROM_EMAIL=hello@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# 6. Production settings
APP_URL=https://100k-pathway.com
NODE_ENV=production
```

**Where to get keys:**
- **Supabase:** Create project → Settings → API → Copy "service_role" key
- **Stripe:** Dashboard → Developers → API keys → Reveal test key
- **SendGrid:** Settings → API Keys → Create API Key (Full Access)

---

### **STEP 2: Initialize Database (3 min)**

1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **SQL Editor** (left sidebar)
4. Click **New query**
5. Copy contents of `/Users/vishwa/Desktop/100k Pathway/api/database-schema.sql`
6. Paste into editor
7. Click **Run**
8. Verify "Success. No rows returned" (20+ tables created)

---

### **STEP 3: Deploy (2 min)**

```bash
cd "/Users/vishwa/Desktop/100k Pathway"
./deploy.sh
```

The script will:
- ✓ Verify .env configured
- ✓ Test server startup
- ✓ Deploy to Vercel
- ✓ Output your live URL

---

## 🎯 POST-DEPLOYMENT (5 min)

### **Configure Stripe Webhook**
1. Copy your Vercel URL (e.g., `https://100k-pathway.vercel.app`)
2. Go to https://dashboard.stripe.com/test/webhooks
3. Click **Add endpoint**
4. URL: `https://your-domain.vercel.app/api/stripe-webhook`
5. Events: Select `payment_intent.succeeded` and `payment_intent.payment_failed`
6. Copy webhook signing secret
7. Add to Vercel: Settings → Environment Variables → `STRIPE_WEBHOOK_SECRET`

### **Update Stripe Publishable Key**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Publishable key** (starts with `pk_test_`)
3. Update in `/public/checkout.html` line 257:
   ```javascript
   const stripe = Stripe('pk_test_YOUR_KEY_HERE');
   ```

### **Test Your Site**
1. Visit your Vercel URL
2. Click "Apply Now" → Fill form → Submit (should save to database)
3. Click "Sign Up" → Create account → Check email for verification
4. Test payment with Stripe test card: `4242 4242 4242 4242`

---

## ✅ VERIFICATION

Your site is live when:
- [ ] Apply form submits successfully
- [ ] Contact form sends email
- [ ] Sign up creates account
- [ ] Payment processes (test mode)
- [ ] No console errors in browser

---

## 🆘 TROUBLESHOOTING

**"Server failed to start"**
→ Run `node api/server.js` to see error. Usually missing env var.

**"Database connection failed"**
→ Verify SUPABASE_URL and SUPABASE_KEY in .env match Supabase dashboard.

**"Emails not sending"**
→ Verify SendGrid sender email at https://app.sendgrid.com/settings/sender_auth

**"Payment fails"**
→ Update STRIPE_WEBHOOK_SECRET in Vercel after creating webhook.

---

## 🚀 YOU'RE LIVE!

Your site is now:
- ✅ Accepting applications
- ✅ Processing payments
- ✅ Sending emails
- ✅ Saving to database
- ✅ Production-ready

**Total time:** 15 minutes  
**Next:** Monitor at https://vercel.com/dashboard
