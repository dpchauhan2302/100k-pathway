// Environment variable validation
// Ensures all required config is present before the server starts.
// Called once at boot — invalid config in production causes a hard exit.

const { logger } = require('./logger');

// ─── PHASE 2 FIX: JWT_SECRET and SUPABASE_KEY promoted to REQUIRED ────────────
// Old config listed SUPABASE_KEY as optional/recommended but business-rules.js
// used it unconditionally with createClient(), producing a silent null client.
// JWT_SECRET was not validated at all — the auth system would fail at runtime
// with no clear error. Both are now required; server exits in production if absent.
const REQUIRED_VARS = [
  'JWT_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS'
];

// Present but not required to boot; warn if absent so operators notice quickly.
const RECOMMENDED_VARS = [
  'NODE_ENV',
  'FRONTEND_URL',
  'APP_URL',
  'EMAIL_FROM',
  'LOG_LEVEL',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

// These must never contain placeholder values — fail if they do.
const NO_DEFAULTS_ALLOWED = [
  'JWT_SECRET',
  'SMTP_PASS',
  'SUPABASE_KEY'
];

// Known-bad placeholder strings that indicate the operator copy-pasted a template
// without filling it in.
const PLACEHOLDER_PATTERNS = [
  'your-secret',
  'change-me',
  'example',
  'test-key',
  'placeholder',
  'changeme',
  'todo',
  'fixme',
  'xxxxx'
];

function containsPlaceholder(value) {
  const v = value.toLowerCase();
  return v === 'secret' || PLACEHOLDER_PATTERNS.some(p => v.includes(p));
}

function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required variables
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Placeholder detection on sensitive vars
  for (const varName of NO_DEFAULTS_ALLOWED) {
    const value = process.env[varName];
    if (value && containsPlaceholder(value)) {
      errors.push(`${varName} contains an unsafe placeholder value — replace it before running`);
    }
  }

  // PHASE 2 FIX: JWT_SECRET minimum length — jsonwebtoken accepts any string but
  // short secrets are trivially brutable. Require at least 32 chars (256 bits).
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters. Generate with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  }

  // Recommended variables
  for (const varName of RECOMMENDED_VARS) {
    if (!process.env[varName]) {
      warnings.push(`Missing recommended environment variable: ${varName}`);
    }
  }

  // NODE_ENV sanity check
  const validEnvs = ['development', 'staging', 'production'];
  if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
    warnings.push(`Invalid NODE_ENV: "${process.env.NODE_ENV}". Expected one of: ${validEnvs.join(', ')}`);
  }

  // URL format validation
  const urlVars = ['SUPABASE_URL', 'FRONTEND_URL', 'APP_URL'];
  for (const varName of urlVars) {
    const value = process.env[varName];
    if (value && !value.match(/^https?:\/\/.+/)) {
      errors.push(`${varName} must be a valid URL starting with http:// or https://`);
    }
  }

  if (warnings.length > 0) {
    logger.warn('Environment configuration warnings', { warnings });
  }

  if (errors.length > 0) {
    logger.error('Environment validation failed', { errors });

    if (process.env.NODE_ENV === 'production') {
      // Hard exit in production — a misconfigured server is worse than no server.
      logger.error('Exiting: production server cannot start with invalid configuration.');
      process.exit(1);
    }

    logger.warn('Continuing in non-production mode with degraded functionality. Fix the errors above.');
    return false;
  }

  logger.info('Environment validation passed', {
    nodeEnv: process.env.NODE_ENV || 'development',
    requiredVars: REQUIRED_VARS.length,
    warnings: warnings.length
  });

  return true;
}

// Single source of truth for runtime config.
// Import this object instead of reading process.env directly in application code.
function getConfig() {
  return {
    // Runtime environment
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production',

    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8001',
    appUrl: process.env.APP_URL || 'http://localhost:3000',

    // Auth — JWT_SECRET is required; no fallback.
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '7d',

    // Database (Supabase) — optional for file-backed mode, required for full features.
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseKey: process.env.SUPABASE_KEY || null,

    // Payments
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || null,
    paymentsSimulation: process.env.PAYMENTS_SIMULATION === 'true',

    // Email
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    sendgridApiKey: process.env.SENDGRID_API_KEY || null,
    emailFrom: process.env.EMAIL_FROM || 'noreply@100k-pathway.com',

    // Logging
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

    // Build info
    appVersion: process.env.APP_VERSION || 'development'

    // PHASE 2 FIX: Removed chaosEnabled / chaosFailureRate from config.
    // Chaos engineering config should never live in production application config.
    // chaos-monkey.js should be deleted from api/_lib/ entirely (Phase 3).
  };
}

module.exports = { validateEnvironment, getConfig };
