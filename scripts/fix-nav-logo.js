#!/usr/bin/env node
/**
 * Standardize nav logo text across all source HTML files to "100K Pathway"
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname.replace(/[\\/]scripts$/, '');
const files = [];

function scan(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && !['public', 'dist', 'node_modules', '.git', 'api', 'data', 'Candidate Data'].includes(e.name)) scan(f);
    else if (e.name.endsWith('.html') && !['nav-template.html', 'test.html', 'simple-index.html', 'email-preview.html'].includes(e.name)) files.push(f);
  });
}
scan(ROOT);

let updated = 0;

for (const filePath of files) {
  let html = fs.readFileSync(filePath, 'utf8');
  const orig = html;
  const rel = path.relative(ROOT, filePath);

  // Pattern 1: Multi-line with spans
  // <a href="..." class="nav-logo">
  //     <span class="nav-logo-prefix">100 Days</span>
  //     <span class="nav-logo-accent">$100K</span>
  // </a>
  html = html.replace(
    /(<a\s+href="[^"]*"\s+class="nav-logo">)\s*\n\s*<span class="nav-logo-prefix">[^<]*<\/span>\s*\n\s*<span class="nav-logo-accent">[^<]*<\/span>\s*\n?\s*(<\/a>)/g,
    '$1100K Pathway$2'
  );

  // Pattern 2: Plain text "100 Days $100K" or "100 Days, $100K"
  html = html.replace(
    /(<a\s+href="[^"]*"\s+class="nav-logo">)\s*100 Days,?\s*\$100K\s*(<\/a>)/g,
    '$1100K Pathway$2'
  );

  // Pattern 3: Already "100K Pathway" - no change needed

  if (html !== orig) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  FIXED: ${rel}`);
    updated++;
  }
}

console.log(`\nUpdated: ${updated} files`);
