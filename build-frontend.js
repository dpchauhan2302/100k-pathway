#!/usr/bin/env node

/**
 * Frontend Build Script
 * Minifies CSS, JS, and HTML files for production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(__dirname, 'public');
const DIST_DIR = path.join(__dirname, 'dist');

console.log('🚀 Starting frontend build process...\n');

// Create dist directory
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

// 1. Minify CSS files
console.log('📦 Minifying CSS files...');
const cssFiles = ['global-nav.css'];
cssFiles.forEach(file => {
    const inputPath = path.join(BUILD_DIR, file);
    const outputPath = path.join(DIST_DIR, file);
    
    if (fs.existsSync(inputPath)) {
        try {
            execSync(`npx cleancss -o "${outputPath}" "${inputPath}"`, { stdio: 'inherit' });
            console.log(`  ✓ ${file}`);
        } catch (error) {
            console.error(`  ✗ Failed to minify ${file}`);
        }
    }
});

// 2. Minify JS files
console.log('\n📦 Minifying JavaScript files...');
const jsFiles = [
    'api-client.js',
    'navigation.js',
    '3d-animations.js',
    'scroll-animations.js',
    'premium-enhancements.js'
];

jsFiles.forEach(file => {
    const inputPath = path.join(BUILD_DIR, file);
    const outputPath = path.join(DIST_DIR, file);
    
    if (fs.existsSync(inputPath)) {
        try {
            execSync(`npx terser "${inputPath}" -o "${outputPath}" -c -m`, { stdio: 'inherit' });
            console.log(`  ✓ ${file}`);
        } catch (error) {
            console.error(`  ✗ Failed to minify ${file}`);
        }
    }
});

// 3. Copy config files (don't minify - needed for deployment)
console.log('\n📋 Copying config files...');
['config.js', 'config.template.js'].forEach(file => {
    const src = path.join(BUILD_DIR, file);
    const dest = path.join(DIST_DIR, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ ${file}`);
    }
});

// 4. Copy static assets (SVG, images)
console.log('\n🖼️  Copying static assets...');
['favicon.svg', 'logo.svg'].forEach(file => {
    const src = path.join(BUILD_DIR, file);
    const dest = path.join(DIST_DIR, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ ${file}`);
    }
});

// 5. Minify HTML files (optional - can be large)
console.log('\n📄 Processing HTML files...');
const htmlFiles = fs.readdirSync(BUILD_DIR).filter(f => f.endsWith('.html'));
let processedCount = 0;

htmlFiles.forEach(file => {
    const inputPath = path.join(BUILD_DIR, file);
    const outputPath = path.join(DIST_DIR, file);
    
    try {
        execSync(`npx html-minifier-terser "${inputPath}" -o "${outputPath}" --collapse-whitespace --remove-comments --minify-css true --minify-js true`, 
            { stdio: 'pipe' });
        processedCount++;
    } catch (error) {
        // Copy original if minification fails
        fs.copyFileSync(inputPath, outputPath);
    }
});

console.log(`  ✓ Processed ${processedCount}/${htmlFiles.length} HTML files`);

// 6. Copy blog directory
console.log('\n📚 Copying blog directory...');
const blogSrc = path.join(BUILD_DIR, 'blog');
const blogDest = path.join(DIST_DIR, 'blog');
if (fs.existsSync(blogSrc)) {
    fs.mkdirSync(blogDest, { recursive: true });
    const blogFiles = fs.readdirSync(blogSrc);
    blogFiles.forEach(file => {
        fs.copyFileSync(path.join(blogSrc, file), path.join(blogDest, file));
    });
    console.log(`  ✓ Copied ${blogFiles.length} blog files`);
}

// 7. Generate build report
console.log('\n📊 Build Report:');
const getSize = (filePath) => {
    if (fs.existsSync(filePath)) {
        return (fs.statSync(filePath).size / 1024).toFixed(2);
    }
    return 0;
};

let totalOriginal = 0;
let totalMinified = 0;

[...cssFiles, ...jsFiles].forEach(file => {
    const originalSize = parseFloat(getSize(path.join(BUILD_DIR, file)));
    const minifiedSize = parseFloat(getSize(path.join(DIST_DIR, file)));
    
    if (originalSize > 0) {
        totalOriginal += originalSize;
        totalMinified += minifiedSize;
        const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
        console.log(`  ${file}: ${originalSize}KB → ${minifiedSize}KB (${reduction}% reduction)`);
    }
});

const totalReduction = ((1 - totalMinified / totalOriginal) * 100).toFixed(1);
console.log(`\n  Total: ${totalOriginal.toFixed(2)}KB → ${totalMinified.toFixed(2)}KB (${totalReduction}% reduction)`);

console.log('\n✅ Build complete! Production files are in /dist directory');
console.log('💡 To deploy: Copy contents of /dist to your production server\n');
