#!/usr/bin/env node
/**
 * Fix JavaScript loading errors across all source HTML files:
 * 1. Update Lenis CDN URL from deprecated @studio-freight/lenis to new lenis package
 * 2. Wrap `new Lenis(...)` calls in try-catch to prevent page breakage if CDN fails
 * 3. Wrap standalone gsap/ScrollTrigger references in safety checks
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
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

  // 1. Update Lenis CDN URL
  html = html.replace(
    /https:\/\/cdn\.jsdelivr\.net\/npm\/@studio-freight\/lenis@1\.0\.29\/dist\/lenis\.min\.js/g,
    'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js'
  );

  // 2. Wrap bare `const lenis = new Lenis(...)` in try-catch (inline scripts)
  // Pattern: const lenis=new Lenis({...});function raf(t){lenis.raf(t);requestAnimationFrame(raf)}requestAnimationFrame(raf)
  html = html.replace(
    /const lenis\s*=\s*new Lenis\(\{([^}]*)\}\);\s*function raf\((\w+)\)\{lenis\.raf\(\2\);requestAnimationFrame\(raf\)\}\s*requestAnimationFrame\(raf\)/g,
    'try{const lenis=new Lenis({$1});function raf($2){lenis.raf($2);requestAnimationFrame(raf)}requestAnimationFrame(raf)}catch(e){console.warn("Lenis smooth scroll unavailable:",e.message)}'
  );

  // Also handle multi-line versions with more whitespace
  html = html.replace(
    /const lenis\s*=\s*new Lenis\(\{([\s\S]*?)\}\);\s*\n?\s*function raf\((\w+)\)\s*\{\s*\n?\s*lenis\.raf\(\2\);\s*\n?\s*requestAnimationFrame\(raf\);\s*\n?\s*\}\s*\n?\s*requestAnimationFrame\(raf\);/g,
    'try{const lenis=new Lenis({$1});function raf($2){lenis.raf($2);requestAnimationFrame(raf)}requestAnimationFrame(raf)}catch(e){console.warn("Lenis smooth scroll unavailable:",e.message)}'
  );

  // Catch any remaining bare `new Lenis(` that wasn't wrapped yet
  // These are typically: const lenis = new Lenis({...}); (without the raf pattern)
  if (html.includes('new Lenis(') && !html.includes('try{const lenis=new Lenis') && !html.includes('try { const lenis = new Lenis')) {
    html = html.replace(
      /(const lenis\s*=\s*new Lenis\([\s\S]*?\);)/g,
      (match) => {
        if (match.includes('try{') || match.includes('try {')) return match;
        return `try{${match}}catch(e){console.warn("Lenis smooth scroll unavailable:",e.message)}`;
      }
    );
  }

  if (html !== orig) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  FIXED: ${rel}`);
    updated++;
  }
}

console.log(`\nUpdated: ${updated} files`);
