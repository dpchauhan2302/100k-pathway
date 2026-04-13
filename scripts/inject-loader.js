#!/usr/bin/env node
/**
 * Injects the branded 100K Pathway page loader into all source HTML files.
 * - Adds inline CSS in <head> for instant rendering
 * - Adds loader HTML right after <body...>
 * - Adds dismiss script before </body>
 * - Replaces any existing page-loader if found
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Source HTML files only (exclude public/, dist/, node_modules/)
const SOURCE_FILES = [];

function collectHtmlFiles(dir, depth = 0) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip build outputs and node_modules
      if (['public', 'dist', 'node_modules', '.git', 'api', 'data', 'Candidate Data'].includes(entry.name)) continue;
      collectHtmlFiles(full, depth + 1);
    } else if (entry.name.endsWith('.html')) {
      // Skip non-page files
      const skip = ['nav-template.html', 'test.html', 'simple-index.html', 'email-preview.html'];
      if (skip.includes(entry.name)) continue;
      SOURCE_FILES.push(full);
    }
  }
}

collectHtmlFiles(ROOT);

// ── Loader Assets ──────────────────────────────────────────────

const LOADER_CSS = `
<!-- 100K Pathway Branded Page Loader CSS -->
<style id="pk-loader-styles">
  #pk-page-loader{position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0f1e;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;opacity:1;transition:opacity .5s ease,visibility .5s ease}
  #pk-page-loader.pk-loaded{opacity:0;visibility:hidden;pointer-events:none}
  .pk-loader-brand{text-align:center;position:relative}
  .pk-loader-100k{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:72px;font-weight:800;color:rgba(255,255,255,.15);letter-spacing:-3px;line-height:1;opacity:0;animation:pkFade100k .7s ease .1s forwards}
  .pk-loader-pathway{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:20px;font-weight:700;color:#00B894;letter-spacing:10px;text-transform:uppercase;margin-top:4px;opacity:0;transform:translateY(8px);animation:pkFadePathway .6s ease .5s forwards}
  .pk-loader-bar-wrap{position:absolute;bottom:0;left:0;width:100%;height:3px}
  .pk-loader-bar{height:100%;background:linear-gradient(90deg,transparent,#00B894,#00d4aa,#00B894,transparent);background-size:300% 100%;animation:pkBarShimmer 1.8s ease-in-out infinite;border-radius:2px}
  .pk-loader-glow{position:absolute;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(0,184,148,.12) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);animation:pkGlowPulse 2s ease-in-out infinite}
  @keyframes pkFade100k{0%{opacity:0;transform:scale(.92)}100%{opacity:1;transform:scale(1)}}
  @keyframes pkFadePathway{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
  @keyframes pkBarShimmer{0%{background-position:300% 0}100%{background-position:-300% 0}}
  @keyframes pkGlowPulse{0%,100%{opacity:.4;transform:translate(-50%,-50%) scale(1)}50%{opacity:.8;transform:translate(-50%,-50%) scale(1.3)}}
</style>`;

const LOADER_HTML = `
<!-- 100K Pathway Branded Page Loader -->
<div id="pk-page-loader">
  <div class="pk-loader-glow"></div>
  <div class="pk-loader-brand">
    <div class="pk-loader-100k">100K</div>
    <div class="pk-loader-pathway">Pathway</div>
  </div>
  <div class="pk-loader-bar-wrap"><div class="pk-loader-bar"></div></div>
</div>`;

const LOADER_JS = `
<!-- 100K Pathway Loader Dismiss Script -->
<script id="pk-loader-script">
(function(){var l=document.getElementById('pk-page-loader');if(!l)return;window.addEventListener('load',function(){setTimeout(function(){l.classList.add('pk-loaded');setTimeout(function(){l.remove()},600)},250)});setTimeout(function(){if(l&&!l.classList.contains('pk-loaded')){l.classList.add('pk-loaded');setTimeout(function(){l.remove()},600)}},6000)})();
</script>`;

// ── Processing ─────────────────────────────────────────────────

let updated = 0;
let skipped = 0;

for (const filePath of SOURCE_FILES) {
  let html = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT, filePath);

  // Skip if already has our branded loader
  if (html.includes('pk-page-loader')) {
    console.log(`  SKIP (already has branded loader): ${relPath}`);
    skipped++;
    continue;
  }

  // ── Remove old page-loader if present ──
  // Remove old loader HTML: <div class="page-loader" ...>...</div>
  html = html.replace(/\n?\s*<!--\s*Page Loader\s*-->\s*\n?\s*<div class="page-loader"[^>]*>[\s\S]*?<\/div>\s*\n?\s*<\/div>/g, '');

  // Remove old loader inline CSS block (between /* Page Loader */ comments)
  html = html.replace(/\s*\/\*\s*Page Loader\s*\*\/[\s\S]*?@keyframes gradientShift\s*\{[^}]*\}\s*\n?/g, '');

  // Remove old loader JS (pageLoader references)
  // The old JS is typically: window.addEventListener('load', function() { document.getElementById('pageLoader')...
  html = html.replace(/\s*\/\/\s*Page loader[\s\S]*?pageLoader[\s\S]*?\}\);?\s*\n?/g, '');

  // ── Inject new branded loader ──

  // 1. CSS before </head>
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${LOADER_CSS}\n</head>`);
  }

  // 2. HTML right after <body...>
  const bodyMatch = html.match(/<body[^>]*>/);
  if (bodyMatch) {
    html = html.replace(bodyMatch[0], `${bodyMatch[0]}${LOADER_HTML}`);
  }

  // 3. JS before </body>
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${LOADER_JS}\n</body>`);
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  DONE: ${relPath}`);
  updated++;
}

console.log(`\n✓ Updated: ${updated} files`);
console.log(`  Skipped: ${skipped} files`);
console.log(`  Total scanned: ${SOURCE_FILES.length} files`);
