/**
 * Asset Optimization Script
 * Lazy load images, optimize fonts, reduce CLS
 */

(function() {
    'use strict';
    
    // 1. Optimize Font Loading
    function optimizeFonts() {
        if ('fonts' in document) {
            // Preload critical fonts
            const fonts = [
                new FontFace('Inter', 'url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2)', {
                    weight: '400',
                    style: 'normal',
                    display: 'swap'
                }),
                new FontFace('Inter', 'url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2)', {
                    weight: '600',
                    style: 'normal',
                    display: 'swap'
                })
            ];
            
            Promise.all(fonts.map(font => font.load())).then(loadedFonts => {
                loadedFonts.forEach(font => document.fonts.add(font));
                document.documentElement.classList.add('fonts-loaded');
            });
        }
    }
    
    // 2. Lazy Load Images
    function lazyLoadImages() {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    
                    if (img.dataset.srcset) {
                        img.srcset = img.dataset.srcset;
                        img.removeAttribute('data-srcset');
                    }
                    
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });
        
        document.querySelectorAll('img[data-src], img[loading="lazy"]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // 3. Reduce CLS (Cumulative Layout Shift)
    function reduceCLS() {
        // Add aspect ratio boxes for images without dimensions
        document.querySelectorAll('img:not([width]):not([height])').forEach(img => {
            if (img.naturalWidth && img.naturalHeight) {
                const ratio = (img.naturalHeight / img.naturalWidth) * 100;
                img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
            }
        });
        
        // Reserve space for lazy-loaded content
        document.querySelectorAll('[data-src]').forEach(el => {
            if (!el.style.minHeight) {
                el.style.minHeight = '200px';
            }
        });
    }
    
    // 4. Preconnect to external domains
    function addPreconnects() {
        const domains = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://cdnjs.cloudflare.com',
            'https://plausible.io'
        ];
        
        domains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = domain;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }
    
    // 5. Defer non-critical CSS
    function deferNonCriticalCSS() {
        const cssLinks = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
        cssLinks.forEach(link => {
            if (!link.media || link.media === 'all') {
                link.media = 'print';
                link.onload = function() {
                    this.media = 'all';
                    this.onload = null;
                };
            }
        });
    }
    
    // 6. Optimize scroll performance
    function optimizeScroll() {
        let ticking = false;
        let lastScrollY = window.pageYOffset;
        
        window.addEventListener('scroll', () => {
            lastScrollY = window.pageYOffset;
            
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll(lastScrollY);
                    ticking = false;
                });
                
                ticking = true;
            }
        }, { passive: true });
        
        function handleScroll(scrollY) {
            // Add scroll-based optimizations here
            if (scrollY > 100) {
                document.body.classList.add('scrolled');
            } else {
                document.body.classList.remove('scrolled');
            }
        }
    }
    
    // 7. Remove unused resources
    function cleanupUnusedResources() {
        // Remove duplicate scripts
        const scripts = document.querySelectorAll('script[src]');
        const seen = new Set();
        
        scripts.forEach(script => {
            if (seen.has(script.src)) {
                script.remove();
            } else {
                seen.add(script.src);
            }
        });
        
        // Remove empty styles
        document.querySelectorAll('style').forEach(style => {
            if (!style.textContent.trim()) {
                style.remove();
            }
        });
    }
    
    // 8. Add loading indicator
    function addLoadingIndicator() {
        const style = document.createElement('style');
        style.textContent = `
            .page-loading {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: linear-gradient(90deg, #667eea, #764ba2);
                transform: scaleX(0);
                transform-origin: left;
                transition: transform 0.3s ease;
                z-index: 99999;
            }
            
            .page-loading.active {
                transform: scaleX(1);
            }
            
            img[data-src] {
                background: rgba(255,255,255,0.05);
            }
            
            img.loaded {
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .fonts-loaded body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize all optimizations
    function init() {
        addLoadingIndicator();
        addPreconnects();
        optimizeFonts();
        lazyLoadImages();
        reduceCLS();
        optimizeScroll();
        cleanupUnusedResources();
        
        // Mark page as loaded
        window.addEventListener('load', () => {
            document.documentElement.classList.add('page-loaded');
            
            // Remove loading indicator after short delay
            setTimeout(() => {
                const loader = document.querySelector('.page-loading');
                if (loader) loader.remove();
            }, 500);
        });
    }
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
