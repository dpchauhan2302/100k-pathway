# DNS & DOMAIN CONFIGURATION FOR 100k-pathway.com

## DOMAIN: 100k-pathway.com

### DNS RECORDS TO ADD (at your domain registrar)

#### 1. Root Domain (A Records)
Point `100k-pathway.com` to Vercel:
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

#### 2. WWW Subdomain (CNAME)
Point `www.100k-pathway.com` to root:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com.
TTL: 3600
```

#### 3. Email Records (for SendGrid)

**SPF Record** (TXT):
```
Type: TXT
Name: @
Value: v=spf1 include:sendgrid.net ~all
TTL: 3600
```

**DKIM Records** (CNAME):
SendGrid will provide these after domain authentication.
Format will be:
```
Type: CNAME
Name: s1._domainkey
Value: s1.domainkey.u12345678.wl123.sendgrid.net.
TTL: 3600

Type: CNAME
Name: s2._domainkey
Value: s2.domainkey.u12345678.wl123.sendgrid.net.
TTL: 3600
```

**DMARC Record** (TXT):
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; pct=100; rua=mailto:admin@100k-pathway.com
TTL: 3600
```

#### 4. Email Forwarding (Optional)
If you want all emails to go to one inbox:

**MX Records:**
```
Type: MX
Name: @
Value: mx1.forwardemail.net
Priority: 10
TTL: 3600

Type: MX
Name: @
Value: mx2.forwardemail.net
Priority: 20
TTL: 3600
```

**Forward Emails:**
- hello@100k-pathway.com → your-email@gmail.com
- support@100k-pathway.com → your-email@gmail.com
- admin@100k-pathway.com → your-email@gmail.com
- privacy@100k-pathway.com → your-email@gmail.com
- legal@100k-pathway.com → your-email@gmail.com
- refunds@100k-pathway.com → your-email@gmail.com
- appeals@100k-pathway.com → your-email@gmail.com

---

## SENDGRID DOMAIN AUTHENTICATION

### Step 1: Add Domain in SendGrid
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Choose "Yes" for branded links
4. Enter domain: `100k-pathway.com`
5. Select DNS host (e.g., Namecheap, GoDaddy)

### Step 2: Add DNS Records
SendGrid will show you 3 CNAME records. Add them to your DNS:

**Example (your actual values will differ):**
```
em1234.100k-pathway.com → u12345678.wl123.sendgrid.net
s1._domainkey.100k-pathway.com → s1.domainkey.u12345678.wl123.sendgrid.net
s2._domainkey.100k-pathway.com → s2.domainkey.u12345678.wl123.sendgrid.net
```

### Step 3: Verify
- Click "Verify" in SendGrid (may take up to 48 hours)
- Once verified, emails from `@100k-pathway.com` will have full deliverability

---

## VERCEL DEPLOYMENT

### Step 1: Connect Domain
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add domain: `100k-pathway.com`
3. Add domain: `www.100k-pathway.com`

### Step 2: Update Environment Variables
In Vercel → Settings → Environment Variables:
```
APP_URL=https://100k-pathway.com
FROM_EMAIL=hello@100k-pathway.com
ADMIN_EMAIL=admin@100k-pathway.com
```

### Step 3: Redeploy
```bash
vercel --prod
```

---

## SSL CERTIFICATE
✅ Automatic via Vercel (Let's Encrypt)
- No action required
- Auto-renews every 90 days
- HTTPS enforced by default

---

## EMAIL ADDRESSES TO SET UP

### Required (for system):
- `hello@100k-pathway.com` - Customer inquiries, payment confirmations
- `admin@100k-pathway.com` - Internal notifications
- `support@100k-pathway.com` - Customer support

### Legal/Compliance:
- `privacy@100k-pathway.com` - GDPR/privacy requests
- `legal@100k-pathway.com` - Legal notices, arbitration
- `refunds@100k-pathway.com` - Refund requests
- `appeals@100k-pathway.com` - Refund appeals

### Optional:
- `noreply@100k-pathway.com` - Transactional emails (no replies expected)

---

## VERIFICATION CHECKLIST

After DNS propagation (24-48 hours):

### Domain Resolution:
- [ ] `100k-pathway.com` loads website
- [ ] `www.100k-pathway.com` redirects to root
- [ ] HTTPS certificate active (green padlock)

### Email Deliverability:
- [ ] Send test email from SendGrid
- [ ] Check spam score at mail-tester.com (target: 10/10)
- [ ] Verify DKIM signature in email headers
- [ ] Test email forwarding works

### Stripe Webhook:
- [ ] Update webhook URL to `https://100k-pathway.com/api/stripe-webhook`
- [ ] Test payment flow end-to-end
- [ ] Verify webhook events received

### Analytics:
- [ ] Update Google Analytics property
- [ ] Verify tracking code fires
- [ ] Update Facebook Pixel domain (if applicable)

---

## TROUBLESHOOTING

### DNS not propagating?
```bash
# Check DNS resolution
dig 100k-pathway.com
dig www.100k-pathway.com

# Check from different locations
https://dnschecker.org/
```

### Emails going to spam?
1. Verify SPF/DKIM records added
2. Check DMARC alignment
3. Warm up sender reputation (start with low volume)
4. Avoid spam trigger words in subject lines

### Domain not loading on Vercel?
1. Verify A record points to 76.76.21.21
2. Check Vercel domain status (Dashboard → Domains)
3. Wait 24-48 hours for DNS propagation
4. Clear browser cache

---

## DNS PROPAGATION TIMELINE

- **Initial setup:** 0-2 hours (local changes)
- **Regional propagation:** 2-24 hours (most users)
- **Global propagation:** 24-48 hours (all users)

**Tools to check:**
- https://dnschecker.org/
- https://www.whatsmydns.net/

---

## COST BREAKDOWN

- **Domain registration:** ~$12/year (Namecheap, GoDaddy)
- **SSL Certificate:** FREE (Vercel auto-provision)
- **Email forwarding:** FREE (ForwardEmail.net)
- **SendGrid:** FREE up to 100 emails/day
- **Vercel hosting:** FREE for hobby tier

**Total ongoing cost:** ~$1/month

---

**Next Steps After DNS Setup:**
1. Update `.env` file with production domain
2. Test payment flow with live Stripe keys
3. Send test emails to verify deliverability
4. Monitor first week for issues
