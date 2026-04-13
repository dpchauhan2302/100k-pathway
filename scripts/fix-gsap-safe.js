#!/usr/bin/env node
/**
 * Add GSAP safe fallback shim to all source HTML files that use gsap.
 * Injects a small inline script after the GSAP CDN tags that provides
 * a no-op gsap object if the CDN fails to load.
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

const SHIM = `<script>if(typeof gsap==='undefined'){window.gsap={to:function(){},from:function(){},set:function(){},registerPlugin:function(){},utils:{toArray:function(s){return [].slice.call(document.querySelectorAll(s))}}};window.ScrollTrigger={}}</script>`;

let updated = 0;

for (const filePath of files) {
  let html = fs.readFileSync(filePath, 'utf8');
  const orig = html;
  const rel = path.relative(ROOT, filePath);

  // Skip if already has the shim
  if (html.includes("if(typeof gsap==='undefined')")) continue;

  // Only process files that actually use gsap
  if (!html.includes('gsap.')) continue;

  // Insert shim after the last GSAP CDN script tag
  // Try ScrollTrigger first (comes after gsap.min.js)
  const scrollTriggerPattern = /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/[\d.]+\/ScrollTrigger\.min\.js"[^>]*><\/script>/;
  const gsapPattern = /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/[\d.]+\/gsap\.min\.js"[^>]*><\/script>/;

  if (scrollTriggerPattern.test(html)) {
    html = html.replace(scrollTriggerPattern, (match) => match + '\n' + SHIM);
  } else if (gsapPattern.test(html)) {
    html = html.replace(gsapPattern, (match) => match + '\n' + SHIM);
  } else {
    // No CDN tag found but gsap is used - add shim before </head>
    html = html.replace('</head>', SHIM + '\n</head>');
  }

  if (html !== orig) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  FIXED: ${rel}`);
    updated++;
  }
}

console.log(`\nUpdated: ${updated} files`);
