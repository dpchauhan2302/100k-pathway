/**
 * Lazy Loading Optimization
 * Load images and heavy content only when needed
 */

(function() {
    'use strict';
    
    // Intersection Observer for lazy loading
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                
                // Load image
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                
                // Load srcset
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                    img.removeAttribute('data-srcset');
                }
                
                // Load background image
                if (img.dataset.bg) {
                    img.style.backgroundImage = `url(${img.dataset.bg})`;
                    img.removeAttribute('data-bg');
                }
                
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });
    
    // Observe all lazy images
    function observeLazyImages() {
        const lazyImages = document.querySelectorAll('img[data-src], [data-bg], img[loading="lazy"]');
        lazyImages.forEach(img => imageObserver.observe(img));
    }
    
    // Lazy load sections
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-visible');
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    });
    
    function observeSections() {
        const sections = document.querySelectorAll('section:not(.hero)');
        sections.forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            sectionObserver.observe(section);
        });
    }
    
    // Preload critical resources
    function preloadCritical() {
        const criticalResources = [
            { href: '/global-nav.css', as: 'style' },
            { href: '/performance-mobile-fix.css', as: 'style' }
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = resource.as;
            link.href = resource.href;
            document.head.appendChild(link);
        });
    }
    
    // Defer non-critical CSS
    function deferCSS() {
        const cssLinks = document.querySelectorAll('link[rel="stylesheet"][data-defer]');
        cssLinks.forEach(link => {
            link.rel = 'preload';
            link.as = 'style';
            link.onload = function() {
                this.onload = null;
                this.rel = 'stylesheet';
            };
        });
    }
    
    // Font loading optimization
    function optimizeFonts() {
        if ('fonts' in document) {
            Promise.all([
                document.fonts.load('400 16px Inter'),
                document.fonts.load('600 16px Inter'),
                document.fonts.load('700 16px Inter')
            ]).then(() => {
                document.body.classList.add('fonts-loaded');
            });
        }
    }
    
    // Reduce JavaScript execution on low-end devices
    function optimizeForDevice() {
        const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
        const isSlow = navigator.connection && (
            navigator.connection.effectiveType === 'slow-2g' ||
            navigator.connection.effectiveType === '2g' ||
            navigator.connection.effectiveType === '3g'
        );
        
        if (isLowEnd || isSlow) {
            document.body.classList.add('low-performance');
            
            // Disable heavy animations
            const style = document.createElement('style');
            style.textContent = `
                .low-performance * {
                    animation: none !important;
                    transition: none !important;
                }
                .low-performance #bgCanvas3d,
                .low-performance .particle-background {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        observeLazyImages();
        observeSections();
        optimizeFonts();
        optimizeForDevice();
        
        // Run after initial render
        setTimeout(() => {
            preloadCritical();
            deferCSS();
        }, 100);
    }
    
})();
