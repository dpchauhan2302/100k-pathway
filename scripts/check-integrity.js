#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

function getJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function toProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function checkJavaScriptSyntax() {
  const rootJsFiles = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => path.join(projectRoot, entry.name));

  const jsFiles = [
    ...getJsFiles(path.join(projectRoot, 'api')),
    ...getJsFiles(path.join(projectRoot, 'public')),
    ...rootJsFiles,
    path.join(projectRoot, 'scripts', 'check-integrity.js'),
  ];

  const uniqueFiles = [...new Set(jsFiles)];
  const errors = [];

  for (const file of uniqueFiles) {
    const syntaxCheck = spawnSync(process.execPath, ['--check', file], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    if (syntaxCheck.status !== 0) {
      errors.push(
        `[syntax] ${toProjectPath(file)}\n${(syntaxCheck.stderr || syntaxCheck.stdout || '').trim()}`
      );
    }
  }

  return errors;
}

function checkDuplicateMobileNavScriptTag() {
  const errors = [];
  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) {
      continue;
    }
    const htmlPath = path.join(publicDir, entry.name);
    const html = fs.readFileSync(htmlPath, 'utf8');
    const matches = html.match(/<script\s+[^>]*src=["']mobile-nav\.js["'][^>]*>/gi);
    const count = matches ? matches.length : 0;
    if (count > 1) {
      errors.push(`[mobile-nav] ${toProjectPath(htmlPath)} includes mobile-nav.js ${count} times`);
    }
  }
  return errors;
}

function checkApplyFormPiiLogs() {
  const applyPath = path.join(publicDir, 'apply.html');
  const html = fs.readFileSync(applyPath, 'utf8');
  const disallowedPatterns = [
    '[FORM] Data collected:',
    'console.log("[FORM] Data collected:',
    "console.log('[FORM] Data collected:",
  ];

  return disallowedPatterns
    .filter((pattern) => html.includes(pattern))
    .map((pattern) => `[privacy] ${toProjectPath(applyPath)} contains disallowed log pattern: ${pattern}`);
}

const allErrors = [
  ...checkJavaScriptSyntax(),
  ...checkDuplicateMobileNavScriptTag(),
  ...checkApplyFormPiiLogs(),
];

if (allErrors.length > 0) {
  console.error('Integrity checks failed:\n');
  for (const error of allErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Integrity checks passed.');
