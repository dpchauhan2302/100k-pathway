const nodemailer = require('nodemailer');

// Check if email is configured
const emailEnabled = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
const smtpPort = parseInt(process.env.SMTP_PORT || '587');

// Simple in-memory rate limiter (resets on cold start — acceptable for serverless)
const rateLimitMap = new Map();
const RATE_LIMIT = 5;       // max submissions
const RATE_WINDOW = 60000;  // per 60 seconds

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  // Prune stale entries every 500 records to prevent memory leak
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap) {
      if (now - val.start > RATE_WINDOW) rateLimitMap.delete(key);
    }
  }
  return entry.count > RATE_LIMIT;
}

// Factory: create fresh transporter per invocation (serverless-safe)
const getTransporter = () => {
  if (!emailEnabled) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

module.exports = async function handler(req, res) {
  // CORS - do not hard-block unknown origins to avoid breaking new live domains/previews
  const allowedOrigins = new Set([
    'https://100kpathway-vshwa-dps-projects.vercel.app',
    'https://100k-pathway.com',
    'https://www.100k-pathway.com',
    'http://localhost:8080',
    'http://localhost:3000'
  ]);
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const requestHost = req.headers.host;
      const isKnownOrigin = allowedOrigins.has(origin);
      const isSameHost = Boolean(requestHost && originHost === requestHost);
      const isVercelPreview = originHost.endsWith('.vercel.app');

      if (isKnownOrigin || isSameHost || isVercelPreview) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } catch (err) {
      console.warn('[CORS] Invalid origin header:', origin);
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    console.warn('[RATE LIMIT]', clientIp);
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  // Guard: missing body
  if (!req.body) {
    return res.status(400).json({ error: 'Missing request body' });
  }

  // Sanitize HTML to prevent XSS in emails
  const sanitize = str => String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  try {
    const { fullName: _fn, email: _em, phone: _ph, countryCode, plan: _pl, experience: _ex } = req.body;

    // Trim raw values before validation to avoid trailing-space rejections
    const planRaw = (_pl || '').trim();
    const experienceRaw = (_ex || '').trim();

    // Validate email on RAW value before sanitizing (sanitize breaks + in emails)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!_em || !emailRegex.test(_em)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const fullName = sanitize(_fn);
    const email = sanitize(_em);
    const phone = sanitize(_ph);
    const plan = sanitize(planRaw);
    const experience = sanitize(experienceRaw);
    const safeCountry = sanitize(countryCode);

    // Combine country code with phone
    const fullPhone = safeCountry ? `${safeCountry} ${phone}` : phone;

    // Honeypot check (bot detection)
    if (req.body.website?.trim() || req.body.url?.trim() || req.body.honeypot?.trim()) {
      console.warn('[BOT BLOCKED]', req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown IP');
      return res.status(200).json({ success: true });
    }

    // Validate required fields + input hardening
    if (!fullName || !phone || !plan || !experience) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!/^[0-9\s+\-()]{6,20}$/.test(_ph)) {
      return res.status(400).json({ error: 'Phone number must be 6-20 digits' });
    }
    const validExperience = ['2-3 years', '4-6 years', '7-10 years', '10+ years'];
    if (!validExperience.includes(experienceRaw)) {
      return res.status(400).json({ error: 'Invalid experience value' });
    }
    const validPlans = ['Essential ($1,299 + 15%)', 'Standard ($1,999 + 12%)', 'Premium ($2,999 + 10%)'];
    if (!validPlans.includes(planRaw)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Log SMTP config
    console.log('[SMTP]', process.env.SMTP_HOST, process.env.SMTP_USER ? 'USER OK' : 'NO USER', 'PORT:', smtpPort);

    // PERSISTENCE: log full submission before email attempt
    // Vercel retains logs — this is the backup if SMTP fails
    console.log('[LEAD]', JSON.stringify({
      ts: new Date().toISOString(),
      fullName,
      email,
      phone: fullPhone,
      plan,
      experience,
      ip: clientIp
    }));

    // PERSISTENCE: save to Airtable if configured.
    // Awaited via Promise.allSettled so Vercel does not kill the process before
    // the write completes, and so failures don't prevent the email send below.
    const airtableKey = process.env.AIRTABLE_API_KEY;
    const airtableBase = process.env.AIRTABLE_BASE_ID;
    const airtablePromise = (airtableKey && airtableBase)
      ? fetch(`https://api.airtable.com/v0/${airtableBase}/Leads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${airtableKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Name: fullName,
              Email: email,
              Phone: fullPhone,
              Plan: plan,
              Experience: experience,
              'Submitted At': new Date().toISOString(),
              IP: clientIp
            }
          })
        })
          .then(r => r.ok ? console.log('[AIRTABLE] Lead saved') : r.text().then(t => console.error('[AIRTABLE] Error:', t)))
          .catch(err => console.error('[AIRTABLE] Failed:', err.message))
      : Promise.resolve();

    // Send both emails and await completion so Vercel doesn't kill the process
    const fromEmail = process.env.SMTP_USER;
    const transporter = emailEnabled ? getTransporter() : null;

    const teamMail = transporter ? transporter.sendMail({
      from: fromEmail,
      to: process.env.TEAM_EMAIL || 'hello@100k-pathway.com',
      subject: `New Application: ${fullName} - ${plan} Plan`,
      html: `<meta charset="UTF-8">
        <h2>New Application Received</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fullName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fullPhone}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Plan:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${plan}</td></tr>
          <tr><td style="padding: 8px;"><strong>Experience:</strong></td><td style="padding: 8px;">${experience}</td></tr>
        </table>
        <hr style="margin: 24px 0;">
        <p style="color: #666; font-size: 12px;">Submitted from 100K Pathway application form</p>
      `
    }) : Promise.resolve();

    const userMail = transporter ? transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: 'Application Received - 100K Pathway',
      html: `
        <meta charset="UTF-8">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0B1120; margin: 0;">100K Pathway</h1>
          </div>
          <h2 style="color: #0B1120; margin-bottom: 16px;">Application Received</h2>
          <p style="color: #374151; line-height: 1.6;">Hi ${fullName},</p>
          <p style="color: #374151; line-height: 1.6;">Thank you for applying to the 100K Pathway program. We've received your application for the <strong>${plan}</strong> plan.</p>
          <p style="color: #374151; line-height: 1.6;"><strong>What happens next:</strong></p>
          <ul style="color: #374151; line-height: 1.8;">
            <li>Our team will review your application within 24-48 hours</li>
            <li>You'll receive an email with next steps</li>
            <li>If you have questions, reply to this email</li>
          </ul>
          <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #374151; margin: 0;"><strong>Your Details:</strong></p>
            <p style="color: #6B7280; margin: 8px 0 0;">Plan: ${plan}<br>Experience: ${experience}</p>
          </div>
          <p style="color: #374151; line-height: 1.6;">Looking forward to helping you land your next opportunity.</p>
          <p style="color: #374151; line-height: 1.6;">Best,<br>The 100K Pathway Team</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;">
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">100K Pathway | Interview Guarantee Program</p>
        </div>
      `
    }) : Promise.resolve();

    const t1 = Date.now();
    const [teamResult, userResult, airtableResult] = await Promise.allSettled([teamMail, userMail, airtablePromise]);
    console.log('[EMAIL] Team:', teamResult.status, '| User:', userResult.status, '| Airtable:', airtableResult.status, '| Total:', Date.now() - t1, 'ms');
    if (teamResult.status === 'rejected') console.error('[EMAIL] Team failed:', teamResult.reason?.message);
    if (userResult.status === 'rejected') console.error('[EMAIL] User failed:', userResult.reason?.message);
    if (!transporter) console.log('[DEV] Email skipped - SMTP not configured.');

    return res.status(200).json({
      success: true,
      emailSent: teamResult.status === 'fulfilled' && userResult.status === 'fulfilled',
      message: 'Application submitted successfully. Check your email for confirmation.'
    });

  } catch (error) {
    console.error('Application form error:', error);
    return res.status(500).json({ error: 'Failed to submit application' });
  }
};
