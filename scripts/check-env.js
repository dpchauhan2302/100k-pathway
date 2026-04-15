#!/usr/bin/env node
// Environment variable validation script.
// Referenced in package.json as: "check:env": "node scripts/check-env.js"
// Run before deployment to catch missing or invalid configuration.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const REQUIRED = [
  'JWT_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS'
];

const RECOMMENDED = [
  'NODE_ENV',
  'APP_URL',
  'FRONTEND_URL',
  'EMAIL_FROM',
  'TEAM_EMAIL',
  'SMTP_PORT'
];

const OPTIONAL_BUT_NOTED = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'PAYMENTS_SIMULATION',
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'LOG_LEVEL',
  'JWT_EXPIRY',
  'APP_VERSION'
];

const errors = [];
const warnings = [];
const notes = [];

// Required vars
for (const key of REQUIRED) {
  if (!process.env[key]) {
    errors.push(`MISSING: ${key} is required but not set`);
  }
}

// JWT_SECRET minimum length
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret && jwtSecret.length < 32) {
  errors.push(
    `INVALID: JWT_SECRET must be at least 32 characters (currently ${jwtSecret.length}). ` +
    `Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
  );
}

// Placeholder detection
const PLACEHOLDERS = ['your-secret', 'change-me', 'example', 'test-key', 'placeholder', 'changeme', 'todo', 'fixme', 'xxxxx'];
for (const key of [...REQUIRED, 'STRIPE_SECRET_KEY', 'SUPABASE_KEY']) {
  const val = process.env[key];
  if (val && PLACEHOLDERS.some(p => val.toLowerCase().includes(p))) {
    errors.push(`PLACEHOLDER: ${key} contains a placeholder value — replace it before running`);
  }
}

// PAYMENTS_SIMULATION must not be true in production
if (process.env.NODE_ENV === 'production' && String(process.env.PAYMENTS_SIMULATION).toLowerCase() === 'true') {
  errors.push('INVALID: PAYMENTS_SIMULATION=true must not be set in production');
}

// Recommended vars
for (const key of RECOMMENDED) {
  if (!process.env[key]) {
    warnings.push(`UNSET: ${key} is recommended but not configured`);
  }
}

// URL format validation
for (const key of ['APP_URL', 'FRONTEND_URL', 'SUPABASE_URL']) {
  const val = process.env[key];
  if (val && !val.match(/^https?:\/\/.+/)) {
    errors.push(`INVALID: ${key} must be a valid URL starting with http:// or https://`);
  }
}

// Optional notes
for (const key of OPTIONAL_BUT_NOTED) {
  if (!process.env[key]) {
    notes.push(`  (optional) ${key} not set`);
  }
}

// Output
console.log('\n100K Pathway — Environment Check\n' + '─'.repeat(40));

if (notes.length > 0) {
  console.log('\nOptional vars not set (these are fine to skip):');
  notes.forEach(n => console.log(n));
}

if (warnings.length > 0) {
  console.warn('\n⚠️  Warnings:');
  warnings.forEach(w => console.warn(`  ${w}`));
}

if (errors.length > 0) {
  console.error('\n❌ Environment check FAILED:\n');
  errors.forEach(e => console.error(`  ✗ ${e}`));
  console.error('\n  Copy .env.example to .env and fill in the missing values.\n');
  process.exit(1);
}

console.log(`\n✅ All ${REQUIRED.length} required variables are set.`);
if (warnings.length === 0) {
  console.log('✅ All recommended variables are set.');
}
console.log('');
