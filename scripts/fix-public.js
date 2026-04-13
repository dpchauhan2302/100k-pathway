#!/usr/bin/env node
/**
 * Apply ALL fixes to the public/ folder (which is what Vercel serves live):
 * 1. Inject branded page loader
 * 2. Standardize nav logo to "100K Pathway"
 * 3. Fix "auout" typo
 * 4. Update Lenis CDN URL + wrap in try-catch
 * 5. Add GSAP safe fallback shim
 */

const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const files = [];

function scan(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', '.git'].includes(e.name)) scan(f);
    else if (e.name.endsWith('.html') && !['test-emails.html'].includes(e.name)) files.push(f);
  });
}
scan(PUBLIC);

console.log(`Found ${files.length} HTML files in public/\n`);

// ── LOADER ASSETS ──
const LOADER_CSS = `\n<!-- 100K Pathway Branded Page Loader CSS -->\n<style id="pk-loader-styles">\n  #pk-page-loader{position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0f1e;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;opacity:1;transition:opacity .5s ease,visibility .5s ease}\n  #pk-page-loader.pk-loaded{opacity:0;visibility:hidden;pointer-events:none}\n  .pk-loader-brand{text-align:center;position:relative}\n  .pk-loader-100k{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:72px;font-weight:800;color:rgba(255,255,255,.15);letter-spacing:-3px;line-height:1;opacity:0;animation:pkFade100k .7s ease .1s forwards}\n  .pk-loader-pathway{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:20px;font-weight:700;color:#00B894;letter-spacing:10px;text-transform:uppercase;margin-top:4px;opacity:0;transform:translateY(8px);animation:pkFadePathway .6s ease .5s forwards}\n  .pk-loader-bar-wrap{position:absolute;bottom:0;left:0;width:100%;height:3px}\n  .pk-loader-bar{height:100%;background:linear-gradient(90deg,transparent,#00B894,#00d4aa,#00B894,transparent);background-size:300% 100%;animation:pkBarShimmer 1.8s ease-in-out infinite;border-radius:2px}\n  .pk-loader-glow{position:absolute;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(0,184,148,.12) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);animation:pkGlowPulse 2s ease-in-out infinite}\n  @keyframes pkFade100k{0%{opacity:0;transform:scale(.92)}100%{opacity:1;transform:scale(1)}}\n  @keyframes pkFadePathway{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}\n  @keyframes pkBarShimmer{0%{background-position:300% 0}100%{background-position:-300% 0}}\n  @keyframes pkGlowPulse{0%,100%{opacity:.4;transform:translate(-50%,-50%) scale(1)}50%{opacity:.8;transform:translate(-50%,-50%) scale(1.3)}}\n</style>`;

const LOADER_HTML = `\n<!-- 100K Pathway Branded Page Loader -->\n<div id="pk-page-loader">\n  <div class="pk-loader-glow"></div>\n  <div class="pk-loader-brand">\n    <div class="pk-loader-100k">100K</div>\n    <div class="pk-loader-pathway">Pathway</div>\n  </div>\n  <div class="pk-loader-bar-wrap"><div class="pk-loader-bar"></div></div>\n</div>`;

const LOADER_JS = `\n<!-- 100K Pathway Loader Dismiss Script -->\n<script id="pk-loader-script">\n(function(){var l=document.getElementById('pk-page-loader');if(!l)return;window.addEventListener('load',function(){setTimeout(function(){l.classList.add('pk-loaded');setTimeout(function(){l.remove()},600)},250)});setTimeout(function(){if(l&&!l.classList.contains('pk-loaded')){l.classList.add('pk-loaded');setTimeout(function(){l.remove()},600)}},6000)})();\n</script>`;

const GSAP_SHIM = `<script>if(typeof gsap==='undefined'){window.gsap={to:function(){},from:function(){},set:function(){},registerPlugin:function(){},utils:{toArray:function(s){return [].slice.call(document.querySelectorAll(s))}}};window.ScrollTrigger={}}</script>`;

let stats = { loader: 0, navLogo: 0, titleFix: 0, lenis: 0, gsap: 0 };

for (const filePath of files) {
  let html = fs.readFileSync(filePath, 'utf8');
  const orig = html;
  const rel = path.relative(PUBLIC, filePath);

  // ── 1. FIX "auout" TYPO ──
  if (html.includes('<title>auout')) {
    html = html.replace('<title>auout - 100K Pathway</title>', '<title>About - 100K Pathway</title>');
    stats.titleFix++;
  }

  // ── 2. STANDARDIZE NAV LOGO ──
  // Multi-line with spans
  const navLogoChanged = html;
  html = html.replace(
    /(<a\s+href="[^"]*"\s+class="nav-logo">)\s*\n\s*<span class="nav-logo-prefix">[^<]*<\/span>\s*\n\s*<span class="nav-logo-accent">[^<]*<\/span>\s*\n?\s*(<\/a>)/g,
    '$1100K Pathway$2'
  );
  // Plain text "100 Days $100K" or "100 Days, $100K"
  html = html.replace(
    /(<a\s+href="[^"]*"\s+class="nav-logo">)\s*100 Days,?\s*\$100K\s*(<\/a>)/g,
    '$1100K Pathway$2'
  );
  if (html !== navLogoChanged) stats.navLogo++;

  // ── 3. UPDATE LENIS CDN ──
  if (html.includes('@studio-freight/lenis@1.0.29')) {
    html = html.replace(
      /https:\/\/cdn\.jsdelivr\.net\/npm\/@studio-freight\/lenis@1\.0\.29\/dist\/lenis\.min\.js/g,
      'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js'
    );
    stats.lenis++;
  }

  // Wrap Lenis init in try-catch
  html = html.replace(
    /const lenis\s*=\s*new Lenis\(\{([^}]*)\}\);\s*function raf\((\w+)\)\{lenis\.raf\(\2\);requestAnimationFrame\(raf\)\}\s*requestAnimationFrame\(raf\)/g,
    'try{const lenis=new Lenis({$1});function raf($2){lenis.raf($2);requestAnimationFrame(raf)}requestAnimationFrame(raf)}catch(e){console.warn("Lenis smooth scroll unavailable:",e.message)}'
  );
  // Multi-line versions
  html = html.replace(
    /const lenis\s*=\s*new Lenis\(\{([\s\S]*?)\}\);\s*\n?\s*function raf\((\w+)\)\s*\{\s*\n?\s*lenis\.raf\(\2\);\s*\n?\s*requestAnimationFrame\(raf\);\s*\n?\s*\}\s*\n?\s*requestAnimationFrame\(raf\);/g,
    'try{const lenis=new Lenis({$1});function raf($2){lenis.raf($2);requestAnimationFrame(raf)}requestAnimationFrame(raf)}catch(e){console.warn("Lenis smooth scroll unavailable:",e.message)}'
  );

  // ── 4. ADD GSAP SHIM ──
  if (html.includes('gsap.') && !html.includes("if(typeof gsap==='undefined')")) {
    const scrollTriggerPattern = /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/[\d.]+\/ScrollTrigger\.min\.js"[^>]*><\/script>/;
    const gsapPattern = /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/[\d.]+\/gsap\.min\.js"[^>]*><\/script>/;

    if (scrollTriggerPattern.test(html)) {
      html = html.replace(scrollTriggerPattern, (match) => match + '\n' + GSAP_SHIM);
      stats.gsap++;
    } else if (gsapPattern.test(html)) {
      html = html.replace(gsapPattern, (match) => match + '\n' + GSAP_SHIM);
      stats.gsap++;
    } else if (html.includes('</head>')) {
      html = html.replace('</head>', GSAP_SHIM + '\n</head>');
      stats.gsap++;
    }
  }

  // ── 5. INJECT LOADER ──
  if (!html.includes('pk-page-loader')) {
    // Remove old page-loader if present
    html = html.replace(/\n?\s*<!--\s*Page Loader\s*-->\s*\n?\s*<div class="page-loader"[^>]*>[\s\S]*?<\/div>\s*\n?\s*<\/div>/g, '');

    // CSS before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${LOADER_CSS}\n</head>`);
    }

    // HTML after <body...>
    const bodyMatch = html.match(/<body[^>]*>/);
    if (bodyMatch) {
      html = html.replace(bodyMatch[0], `${bodyMatch[0]}${LOADER_HTML}`);
    }

    // JS before </body>
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${LOADER_JS}\n</body>`);
    }
    stats.loader++;
  }

  // ── 6. FIX OLD LOADER JS REFERENCES (pricing, privacy, etc.) ──
  if (html.includes("getElementById('pageLoader')")) {
    html = html.replace(
      /\/\/ Page Loader\s*\n\s*document\.addEventListener\('DOMContentLoaded',\s*function\(\)\s*\{[\s\S]*?getElementById\('pageLoader'\)[\s\S]*?\}\);/g,
      '// Page Loader (handled by pk-page-loader)'
    );
  }

  // Fix bare gsap.registerPlugin
  if (html.includes('gsap.registerPlugin(ScrollTrigger);') && !html.includes("typeof gsap !== 'undefined'")) {
    html = html.replace(
      /(\s+)gsap\.registerPlugin\(ScrollTrigger\);/,
      '$1if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") { gsap.registerPlugin(ScrollTrigger); }'
    );
  }

  if (html !== orig) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  DONE: ${rel}`);
  }
}

console.log(`\n--- Summary ---`);
console.log(`Loader added: ${stats.loader} files`);
console.log(`Nav logo fixed: ${stats.navLogo} files`);
console.log(`Title typo fixed: ${stats.titleFix} files`);
console.log(`Lenis CDN updated: ${stats.lenis} files`);
console.log(`GSAP shim added: ${stats.gsap} files`);
