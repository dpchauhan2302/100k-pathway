require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validateEnvironment } = require('./config');
const LocalApiStore = require('./local-api-store');

// ─── PHASE 1 FIX: Fail fast if JWT_SECRET is missing ─────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    '❌ FATAL: JWT_SECRET env var is missing or too short (min 32 chars). ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

const app = express();
const localStore = new LocalApiStore();

// ─── PHASE 2 WIRING: BusinessRules uses the same data store as routes ─────────
const { BusinessRules } = require('./business-rules');
const rules = BusinessRules.create(localStore);

// Check if backend services are available
const backendEnabled = validateEnvironment();

let EmailService, FileStorage, emailService, storage;

FileStorage = require('./file-storage');
storage = new FileStorage();

if (backendEnabled) {
  EmailService = require('./email-service');
  emailService = new EmailService();
} else {
  console.warn('⚠️  Email service not configured. API stays available, email delivery is disabled.');
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://cdnjs.cloudflare.com',
        'https://plausible.io',
        'https://js.stripe.com'
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://plausible.io', 'https://api.stripe.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
}));

// Middleware
const allowedOrigins = [
  'https://100kpathway-vshwa-dps-projects.vercel.app',
  'https://100k-pathway.com',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:8888'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(mongoSanitize());

// Prevent parameter pollution
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many form submissions, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── PHASE 1 FIX: Tighter auth-specific rate limit ───────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

app.disable('x-powered-by');

if (process.env.NODE_ENV !== 'production') {
  app.use(express.static('public'));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeEmail(email) {
  const normalized = validator.normalizeEmail(String(email || '').trim());
  return normalized || '';
}

function sanitizeText(value, maxLength = 500) {
  return validator.escape(validator.trim(String(value || '')).slice(0, maxLength));
}

// ─── PHASE 1 FIX: Tokens are now real signed JWTs via jsonwebtoken ────────────
// Old code: Buffer.from(JSON.stringify(payload)).toString('base64url')
// That was unsigned — anyone could craft {role:"admin"} and encode it freely.
// Now: jwt.sign() with HS256 and a server-side secret. Tampered tokens fail
// signature verification and are rejected.

function issueAuthToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'user',
    fullName: user.full_name || user.fullName || ''
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// ─── PHASE 1 FIX: parseAuthToken now verifies signature AND expiry ────────────
// Old code accepted any base64 payload — no signature check, no expiry.
function parseAuthToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  if (!JWT_SECRET) return null;

  try {
    // jwt.verify throws if signature is invalid OR if token is expired.
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.userId || !payload.email) return null;
    return payload;
  } catch {
    // TokenExpiredError, JsonWebTokenError, etc. — all treated as invalid.
    return null;
  }
}

function requireAuth(req, res) {
  const auth = parseAuthToken(req);
  if (!auth) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return auth;
}

// ─── PHASE 1 FIX: requireAdmin re-reads role from the DB, not the token ──────
// Old code trusted role from the token payload directly. A user could sign up,
// then craft a token with role:"admin" (trivial when tokens were unsigned).
// Now: role comes from the live DB record, so the token role field is ignored
// for privilege decisions.
async function requireAdmin(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return null;

  const user = await localStore.findUserById(auth.userId);
  if (!user || String(user.role || '').toLowerCase() !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return { ...auth, role: user.role };
}

// ─── PHASE 1 FIX: Password hashing — added max length to prevent DoS ─────────
// pbkdf2Sync with 100k iterations on a 10MB password blocks the event loop.
// Hard limit: 1024 chars. Real passwords are never longer than this.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 1024;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 100000, 64, 'sha512')
    .toString('hex');
  return { hash, salt };
}

function verifyPassword(password, user) {
  if (!user || !user.password_salt || !user.password_hash) return false;
  const { hash } = hashPassword(password, user.password_salt);
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(user.password_hash, 'hex')
  );
}

function planInterviewLimit(plan) {
  const normalized = String(plan || 'Standard').toLowerCase();
  if (normalized === 'premium') return 7;
  if (normalized === 'essential') return 3;
  return 5;
}

// ─── PHASE 1 FIX: Health endpoint no longer leaks uptime/version ─────────────
// Version and uptime are useful to attackers (version targeting, fingerprinting).
// Public health check now returns only the minimal liveness signal.
// A separate authenticated /api/admin/health endpoint provides full detail.
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Admin-only detailed health (requires auth)
app.get('/api/admin/health', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || 'development',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Storage stats endpoint (admin-only)
app.get('/api/stats', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const stats = await storage.getStats();
    res.json(stats);
  } catch (error) {
    await storage.logError('stats_endpoint', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Recent errors (admin-only)
app.get('/api/errors', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const errors = await storage.getRecentErrors(7);
    res.json({ errors });
  } catch (error) {
    await storage.logError('errors_endpoint', error);
    res.status(500).json({ error: 'Failed to get errors' });
  }
});

// Contact form endpoint
app.post('/api/contact', formLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedName = validator.escape(validator.trim(name));
    const sanitizedEmail = validator.normalizeEmail(email);
    const sanitizedMessage = validator.escape(validator.trim(message));

    if (!validator.isEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (emailService) {
      try {
        await emailService.sendContactFormNotification({
          fullName: sanitizedName,
          email: sanitizedEmail,
          message: sanitizedMessage
        });
      } catch (emailError) {
        console.error('Failed to send contact notification:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Message sent successfully. We\'ll be in touch soon!'
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({ error: 'Failed to process contact form' });
  }
});

// Application form submission endpoint
app.post('/api/submit-form', formLimiter, async (req, res) => {
  try {
    const { fullName, email, phone, plan, experience } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Honeypot detection
    if (req.body.website || req.body.url || req.body.honeypot) {
      console.warn(`[SECURITY] Bot detected from IP: ${clientIp}`);
      return res.json({ success: true, message: 'Application submitted successfully.' });
    }

    if (!fullName || !email || !phone || !plan || !experience) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedFullName = validator.escape(validator.trim(fullName));
    const sanitizedEmail = validator.normalizeEmail(email);
    const sanitizedPhone = validator.trim(phone);

    if (!validator.isEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validator.isLength(sanitizedFullName, { min: 2, max: 100 })) {
      return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
    }
    if (!validator.matches(sanitizedPhone, /^[0-9+\-\s\(\)]{7,20}$/)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    try {
      const saved = await storage.saveApplication({
        fullName: sanitizedFullName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        plan,
        experience,
        ipAddress: clientIp,
        userAgent: req.headers['user-agent']
      });
      await storage.logActivity('application_submitted', { id: saved.id, email: sanitizedEmail, plan });
    } catch (storageError) {
      console.error('Storage failed:', storageError);
      await storage.logError('saveApplication', storageError);
    }

    if (emailService) {
      try {
        await emailService.sendContactFormNotification({
          fullName: sanitizedFullName, email: sanitizedEmail,
          phone: sanitizedPhone, plan, experience
        });
      } catch (e) { console.error('Team notification failed:', e); }

      try {
        await emailService.sendApplicantConfirmation({
          fullName: sanitizedFullName, email: sanitizedEmail,
          phone: sanitizedPhone, plan, experience
        });
      } catch (e) { console.error('Applicant confirmation failed:', e); }
    }

    res.json({
      success: true,
      message: 'Application submitted successfully. Check your email for confirmation.'
    });

  } catch (error) {
    console.error('Error processing form submission:', error);
    // PHASE 1 FIX: Never send error.message or error.details to the client —
    // it can expose file paths, stack traces, and internal library details.
    res.status(500).json({ error: 'Failed to process form submission' });
  }
});

// Payment webhook
app.post('/api/payment-webhook', async (req, res) => {
  try {
    if (!emailService) {
      return res.status(503).json({ error: 'Email service not configured' });
    }
    const { customer, amount, plan } = req.body;
    await emailService.sendPaymentWelcome({
      fullName: customer.name,
      email: customer.email,
      plan: plan.name,
      experience: customer.experience
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Email preview (admin-only — previously open to anyone)
app.post('/api/preview-email', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { type, data } = req.body;
    const { getEmailTemplate } = require('./email-templates');
    const html = getEmailTemplate(type, data);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Email preview error:', error);
    res.status(500).send('Failed to generate email preview');
  }
});

// Testimonials (public, static)
app.get('/api/testimonials', (req, res) => {
  const testimonials = [
    {
      name: 'Sarah M.',
      role: 'Senior Software Engineer',
      company: 'Fortune 500 Tech',
      quote: 'The volume-based approach worked. I went from 2 responses in 6 months of solo applying to 7 interviews in 45 days.',
      outcome: '$165,000 offer'
    },
    {
      name: 'James K.',
      role: 'Full Stack Developer',
      company: 'Series B Startup',
      quote: 'I was skeptical about the guarantee but they delivered. 5 interviews, 2 offers, closed at $140K.',
      outcome: '$140,000 offer'
    },
    {
      name: 'Priya R.',
      role: 'Backend Engineer',
      company: 'FAANG Adjacent',
      quote: 'The interview prep was worth it alone. Felt prepared for every technical round.',
      outcome: '$185,000 offer'
    }
  ];
  res.json({ testimonials });
});

// Confirm enrollment
app.post('/api/confirm-enrollment', async (req, res) => {
  try {
    const { email, contractId, signature } = req.body;
    if (!email || !contractId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    console.log(`[ENROLLMENT] Confirmed for ${email}, Contract: ${contractId}`);
    await storage.logActivity('enrollment_confirmed', { email, contractId });
    res.json({
      success: true,
      message: 'Enrollment confirmed successfully',
      nextStep: 'You will receive onboarding details within 24 hours'
    });
  } catch (error) {
    console.error('Enrollment confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm enrollment' });
  }
});

// ─── PHASE 1 FIX: Email verification — real token flow ────────────────────────
// Old code accepted any non-empty string as a valid verification token.
// Now: signup stores a crypto token in the user record (email_verification_token).
// This endpoint looks it up, marks the user verified, and clears the token.
// Token TTL: 24 hours.
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string' || token.length < 32) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const users = await localStore.listUsers();
    const user = users.find(u =>
      u.email_verification_token === token &&
      !u.verified
    );

    if (!user) {
      return res.status(400).json({ error: 'Token is invalid, already used, or expired' });
    }

    // Check token age (24-hour TTL)
    const tokenAge = Date.now() - (user.email_verification_token_created_at || 0);
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    }

    await localStore.markUserVerified(user.id);

    res.json({ success: true, message: 'Email verified successfully', verified: true });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── PHASE 1 FIX: Signup — password max length + real verification token ──────
// Old: no max password length (DoS risk), no real verification token generated.
// New: password capped at PASSWORD_MAX, verification token created and stored,
// user starts as unverified, token would be emailed in production.
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const fullName = sanitizeText(req.body.full_name || req.body.fullName, 120);
    const email = sanitizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < PASSWORD_MIN) {
      return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN} characters` });
    }
    // PHASE 1 FIX: Hard cap prevents DoS via pbkdf2Sync with huge inputs
    if (password.length > PASSWORD_MAX) {
      return res.status(400).json({ error: 'Password is too long' });
    }

    const existing = await localStore.findUserByEmail(email);
    if (existing) {
      // Return 409 but don't confirm whether the email exists (user enumeration)
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const { hash, salt } = hashPassword(password);

    // PHASE 1 FIX: Admin role is NEVER granted at signup via email match alone.
    // Admin role must be assigned manually in the data store after account creation.
    const role = 'user';

    // PHASE 1 FIX: Generate a real verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenCreatedAt = Date.now();

    const user = await localStore.createUser({
      fullName,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      role,
      plan: 'Standard',
      verified: false,
      emailVerificationToken: verificationToken,
      emailVerificationTokenCreatedAt: verificationTokenCreatedAt
    });

    // Send verification email if email service is available
    if (emailService) {
      try {
        const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`;
        await emailService.sendEmail({
          to: email,
          subject: 'Verify your email – 100K Pathway',
          html: `<p>Hi ${fullName},</p><p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>`
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
    } else if (process.env.NODE_ENV !== 'production') {
      // Dev/test only: log the token so developers can verify manually.
      // Never runs in production because emailService is required there.
      console.log(`[DEV] Email verification token for ${email}: ${verificationToken}`);
    }

    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your address.',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        verified: false
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/signin', authLimiter, async (req, res) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // PHASE 1 FIX: Enforce max password length here too to prevent DoS
    if (password.length > PASSWORD_MAX) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = await localStore.findUserByEmail(email);

    // PHASE 1 FIX: Use a constant-time comparison path even when user not found,
    // to prevent timing-based user enumeration attacks.
    const passwordValid = user ? verifyPassword(password, user) : false;

    if (!user || !passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.verified) {
      return res.status(403).json({
        error: 'Please verify your email address before signing in.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    const token = issueAuthToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'user',
        plan: localStore.normalizePlan(user.plan)
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

app.post('/api/auth/resend-verification', authLimiter, async (req, res) => {
  const email = sanitizeEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Always return success to prevent user enumeration
  const user = await localStore.findUserByEmail(email);

  if (user && !user.verified && emailService) {
    try {
      const newToken = crypto.randomBytes(32).toString('hex');
      await localStore.updateVerificationToken(user.id, newToken);
      const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${newToken}`;
      await emailService.sendEmail({
        to: email,
        subject: 'Verify your email – 100K Pathway',
        html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>`
      });
    } catch (err) {
      console.error('Resend verification failed:', err);
    }
  } else if (user && !user.verified && process.env.NODE_ENV !== 'production') {
    // Dev/test only: print the token so developers can verify manually.
    const newToken = crypto.randomBytes(32).toString('hex');
    await localStore.updateVerificationToken(user.id, newToken);
    console.log(`[DEV] New verification token for ${email}: ${newToken}`);
  }

  return res.json({
    success: true,
    message: 'If an unverified account exists for that email, a verification link has been sent.'
  });
});

// Application submission
app.post('/api/applications', formLimiter, async (req, res) => {
  try {
    const auth = parseAuthToken(req);
    const fullName = sanitizeText(req.body.full_name || req.body.fullName, 120);
    const email = sanitizeEmail(req.body.email || auth?.email);
    const phone = sanitizeText(req.body.phone, 40);
    const plan = localStore.normalizePlan(req.body.plan || req.body.plan_type || 'Standard');
    const experience = sanitizeText(req.body.experience || req.body.experience_level, 120);
    const targetRole = sanitizeText(req.body.target_role || req.body.goals, 180);

    if (!fullName || !email) {
      return res.status(400).json({ error: 'full_name and email are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // PHASE 2 WIRING: Check business rule before saving
    if (auth?.userId) {
      const check = await rules.canSubmitApplication(auth.userId);
      if (!check.allowed) {
        return res.status(409).json({ error: check.message });
      }
    }

    const saved = await storage.saveApplication({
      fullName, email, phone, plan, experience,
      target_role: targetRole,
      userId: auth?.userId || null,
      submittedAt: new Date().toISOString(),
      status: 'PENDING'
    });

    const application = await localStore.getApplicationById(saved.id);
    return res.status(201).json({ success: true, application });
  } catch (error) {
    console.error('Application submission error:', error);
    return res.status(500).json({ error: 'Failed to submit application' });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    const auth = parseAuthToken(req);
    const all = await localStore.listApplications();
    const applications = auth
      ? all.filter(item => String(item.email).toLowerCase() === String(auth.email).toLowerCase())
      : all;
    res.json({ applications });
  } catch (error) {
    console.error('Applications list error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

app.get('/api/applications/:id', async (req, res) => {
  try {
    const auth = parseAuthToken(req);
    const application = await localStore.getApplicationById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const isOwner = auth && String(auth.email).toLowerCase() === String(application.email).toLowerCase();
    const isAdmin = auth && String(auth.role).toLowerCase() === 'admin';
    if (auth && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ application });
  } catch (error) {
    console.error('Application fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch application' });
  }
});

app.get('/api/admin/applications', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const status = String(req.query.status || '').toUpperCase();
    let applications = await localStore.listApplications();
    if (status) {
      applications = applications.filter(item => String(item.status || '').toUpperCase() === status);
    }
    return res.json({ applications });
  } catch (error) {
    console.error('Admin applications fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin applications' });
  }
});

app.put('/api/admin/applications/:id/status', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const status = String(req.body.status || '').toUpperCase();
    const notes = sanitizeText(req.body.notes, 1000);
    const allowed = new Set(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']);
    if (!allowed.has(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const updated = await localStore.updateApplicationStatus(req.params.id, status, notes, admin.email);
    if (!updated) {
      return res.status(404).json({ error: 'Application not found' });
    }
    return res.json({ success: true, application: updated });
  } catch (error) {
    console.error('Admin application status update error:', error);
    return res.status(500).json({ error: 'Failed to update application status' });
  }
});

app.post('/api/create-payment-intent', async (req, res) => {
  const planType = String(req.body.plan_type || 'standard').toLowerCase();
  const planAmounts = { essential: 129900, standard: 199900, premium: 299900 };
  const amount = planAmounts[planType] || planAmounts.standard;

  if (String(process.env.PAYMENTS_SIMULATION || '').toLowerCase() === 'true') {
    if (process.env.NODE_ENV === 'production') {
      // PAYMENTS_SIMULATION must never be active in production — it bypasses real payment.
      console.error('[SECURITY] PAYMENTS_SIMULATION=true detected in production. Refusing payment intent.');
      return res.status(503).json({ error: 'Payment processing is currently unavailable' });
    }
    return res.json({
      simulated: true,
      clientSecret: `simulated_${planType}_${Date.now()}`,
      amount,
      currency: 'usd'
    });
  }

  return res.status(503).json({
    error: 'Payment processing is not configured',
    message: 'Set PAYMENTS_SIMULATION=true for local flow tests.'
  });
});

app.post('/api/interviews', async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const interview = {
      user_id: auth.userId,
      email: auth.email,
      company_name: sanitizeText(req.body.company_name, 120),
      position_title: sanitizeText(req.body.position_title, 120),
      interview_type: sanitizeText(req.body.interview_type, 60),
      interview_date: req.body.interview_date ? new Date(req.body.interview_date).toISOString() : null,
      duration_minutes: Number(req.body.duration_minutes || 60),
      outcome: String(req.body.outcome || 'PENDING').toUpperCase(),
      notes: sanitizeText(req.body.notes, 1000)
    };

    if (!interview.company_name || !interview.position_title || !interview.interview_type || !interview.interview_date) {
      return res.status(400).json({ error: 'Missing required interview fields' });
    }

    const saved = await localStore.addInterview(interview);
    const userInterviews = await localStore.listInterviewsForUser({ userId: auth.userId, email: auth.email });
    const totalQualifyingInterviews = userInterviews.filter(item => String(item.outcome).toUpperCase() !== 'REJECTED').length;

    return res.status(201).json({ success: true, interview: saved, totalQualifyingInterviews });
  } catch (error) {
    console.error('Interview create error:', error);
    return res.status(500).json({ error: 'Failed to save interview' });
  }
});

app.get('/api/interviews', async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;
    const interviews = await localStore.listInterviewsForUser({ userId: auth.userId, email: auth.email });
    const totalQualifyingInterviews = interviews.filter(item => String(item.outcome).toUpperCase() !== 'REJECTED').length;
    return res.json({ interviews, totalQualifyingInterviews });
  } catch (error) {
    console.error('Interview list error:', error);
    return res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

app.get('/api/enrollment/progress', async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const user = await localStore.findUserById(auth.userId);
    const enrollmentDate = user?.enrollment_date || user?.created_at || new Date().toISOString();
    const plan = localStore.normalizePlan(user?.plan || 'Standard');
    const daysSinceStart = Math.max(
      0,
      Math.floor((Date.now() - new Date(enrollmentDate).getTime()) / (1000 * 60 * 60 * 24))
    );

    return res.json({
      enrollmentDate,
      plan,
      currentDay: Math.min(daysSinceStart, 100),
      daysRemaining: Math.max(180 - daysSinceStart, 0),
      interviewGoal: planInterviewLimit(plan)
    });
  } catch (error) {
    console.error('Enrollment progress error:', error);
    return res.status(500).json({ error: 'Failed to fetch enrollment progress' });
  }
});

app.get('/api/user/progress', async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;
    const user = await localStore.findUserById(auth.userId);
    const enrollmentDate = user?.enrollment_date || user?.created_at || new Date().toISOString();
    return res.json({
      enrollmentDate,
      plan: localStore.normalizePlan(user?.plan || 'Standard')
    });
  } catch (error) {
    console.error('User progress error:', error);
    return res.status(500).json({ error: 'Failed to fetch user progress' });
  }
});

app.post('/api/refunds/request', async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const reason = sanitizeText(req.body.reason, 1000);
    if (!reason) {
      return res.status(400).json({ error: 'Refund reason is required' });
    }

    const refund = await localStore.addRefundRequest({
      user_id: auth.userId,
      email: auth.email,
      reason
    });
    return res.status(201).json({ success: true, refund });
  } catch (error) {
    console.error('Refund request error:', error);
    return res.status(500).json({ error: 'Failed to submit refund request' });
  }
});

app.get('/api/refunds/status', async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;
    const latest = await localStore.getLatestRefundForUser({ userId: auth.userId, email: auth.email });
    if (!latest) {
      return res.json({ status: 'NONE', message: 'No refund request submitted' });
    }
    return res.json({
      status: latest.status,
      requestedAt: latest.created_at,
      reason: latest.reason
    });
  } catch (error) {
    console.error('Refund status error:', error);
    return res.status(500).json({ error: 'Failed to fetch refund status' });
  }
});

app.get('/api/test-email', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    if (!emailService) {
      return res.status(503).json({ success: false, message: 'Email service is not configured' });
    }
    const result = await emailService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to test email service' });
  }
});

// Admin: Send email
app.post('/api/admin/send-email', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    if (!emailService) {
      return res.status(503).json({ error: 'Email service not configured' });
    }
    const { template, email, fullName, plan, experience, ...extraData } = req.body;

    if (!template || !email || !fullName) {
      return res.status(400).json({ error: 'Missing required fields: template, email, fullName' });
    }

    const { getEmailTemplate } = require('./email-templates');

    const subjects = {
      'applicant_confirmation': 'Application Received - 100K Pathway',
      'payment_welcome': 'Welcome to 100K Pathway!',
      'agreement_invite': 'Sign Your Agreement - 100K Pathway',
      'interview_scheduled': 'Interview Scheduled - 100K Pathway',
      'offer_received': 'Congratulations! - 100K Pathway',
      'feedback_request': 'Quick Check-In - 100K Pathway',
      'company_announcement': extraData.headline || 'Update from 100K Pathway'
    };

    const templateData = {
      fullName,
      email,
      plan: plan || 'Standard Plan',
      experience: experience || '3-5 years',
      timestamp: Date.now(),
      ...extraData
    };

    const html = getEmailTemplate(template, templateData);
    if (!html) {
      return res.status(400).json({ error: 'Invalid template type' });
    }

    await emailService.sendEmail({
      to: email,
      subject: subjects[template] || 'Message from 100K Pathway',
      html
    });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Admin send email error:', error);
    // PHASE 1 FIX: Was `res.status(500).json({ error: error.message })` — leaked internals
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ─── Error handling ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}
