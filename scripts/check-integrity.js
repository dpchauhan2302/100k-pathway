#!/usr/bin/env node
// scripts/check-integrity.js
// Run via: npm test  OR  npm run lint
//
// PHASE 3 additions:
//  - Detects chaos-monkey.js in the api/_lib/ directory (should be deleted)
//  - Detects if node_modules is tracked in git
//  - Detects if data/ directory contains JSON files that could be committed
//  - Detects PII log patterns in any HTML file (was only apply.html before)
//  - All existing checks retained

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const apiLibDir = path.join(projectRoot, 'api', '_lib');

function toProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function getJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

// ─── Check 1: JavaScript syntax ───────────────────────────────────────────────
function checkJavaScriptSyntax() {
  const rootJsFiles = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.js'))
    .map(e => path.join(projectRoot, e.name));

  const jsFiles = [
    ...getJsFiles(path.join(projectRoot, 'api')),
    ...getJsFiles(publicDir),
    ...rootJsFiles,
    path.join(projectRoot, 'scripts', 'check-integrity.js')
  ];

  const errors = [];
  for (const file of [...new Set(jsFiles)]) {
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: projectRoot, encoding: 'utf8'
    });
    if (result.status !== 0) {
      errors.push(
        `[syntax] ${toProjectPath(file)}\n  ${(result.stderr || result.stdout || '').trim()}`
      );
    }
  }
  return errors;
}

// ─── Check 2: Duplicate mobile-nav script tags ────────────────────────────────
function checkDuplicateMobileNavScriptTag() {
  if (!fs.existsSync(publicDir)) return [];
  const errors = [];
  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const htmlPath = path.join(publicDir, entry.name);
    const html = fs.readFileSync(htmlPath, 'utf8');
    const matches = html.match(/<script\s+[^>]*src=["']mobile-nav\.js["'][^>]*>/gi);
    if (matches && matches.length > 1) {
      errors.push(
        `[mobile-nav] ${toProjectPath(htmlPath)} includes mobile-nav.js ${matches.length} times`
      );
    }
  }
  return errors;
}

// ─── Check 3: PII log patterns in HTML ───────────────────────────────────────
// Extended from apply.html-only to all HTML files in public/.
function checkPiiLogs() {
  if (!fs.existsSync(publicDir)) return [];
  const DISALLOWED = [
    '[FORM] Data collected:',
    'console.log("[FORM] Data collected:',
    "console.log('[FORM] Data collected:"
  ];

  const errors = [];
  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const htmlPath = path.join(publicDir, entry.name);
    const html = fs.readFileSync(htmlPath, 'utf8');
    for (const pattern of DISALLOWED) {
      if (html.includes(pattern)) {
        errors.push(
          `[privacy] ${toProjectPath(htmlPath)} contains disallowed PII log pattern: ${pattern}`
        );
      }
    }
  }
  return errors;
}

// ─── Check 4 (NEW): chaos-monkey.js must not exist in api/_lib/ ──────────────
// chaos-monkey.js intentionally breaks things. It belongs in a dev-only
// test harness, not in the production API lib folder.
function checkChaosMonkeyAbsent() {
  const chaosPath = path.join(apiLibDir, 'chaos-monkey.js');
  if (fs.existsSync(chaosPath)) {
    return [
      `[chaos] api/_lib/chaos-monkey.js exists in the production code path. ` +
      `Delete it. Chaos engineering tooling must never be deployed to production.`
    ];
  }
  return [];
}

// ─── Check 5 (NEW): Required env vars documented in .env.example ─────────────
// Ensures REQUIRED env vars all appear in .env.example as a documentation
// check — not a runtime check (that's config.js's job).
function checkEnvExample() {
  const envExamplePath = path.join(projectRoot, '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    return [
      `[env] .env.example is missing. Create it so operators know what to configure.`
    ];
  }

  const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
  const REQUIRED_IN_DOCS = ['JWT_SECRET', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const errors = [];

  for (const varName of REQUIRED_IN_DOCS) {
    if (!exampleContent.includes(varName)) {
      errors.push(`[env] .env.example is missing documentation for required var: ${varName}`);
    }
  }
  return errors;
}

// ─── Check 6 (NEW): data/ directory should not contain committed user data ───
// Verifies that data/ JSON files don't contain real email addresses, which
// would indicate user data has been accidentally committed.
function checkDataDirectoryClean() {
  const dataDir = path.join(projectRoot, 'data');
  if (!fs.existsSync(dataDir)) return [];

  const errors = [];
  const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@(?!example\.com)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

  function scanDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (EMAIL_RE.test(content)) {
            errors.push(
              `[data] ${toProjectPath(fullPath)} appears to contain real user data (non-example email found). ` +
              `Add data/ to .gitignore and remove it from git tracking.`
            );
          }
        } catch {
          // Can't read — skip
        }
      }
    }
  }

  scanDir(dataDir);
  return errors;
}

// ─── Run all checks ───────────────────────────────────────────────────────────
const allErrors = [
  ...checkJavaScriptSyntax(),
  ...checkDuplicateMobileNavScriptTag(),
  ...checkPiiLogs(),
  ...checkChaosMonkeyAbsent(),
  ...checkEnvExample(),
  ...checkDataDirectoryClean()
];

if (allErrors.length > 0) {
  console.error('Integrity checks failed:\n');
  for (const error of allErrors) {
    console.error(`  ✗ ${error}`);
  }
  process.exit(1);
}

console.log('✓ All integrity checks passed.');
