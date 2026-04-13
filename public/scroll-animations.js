// Scroll-triggered animations and micro-interactions
// Lightweight, performant, no dependencies

(function() {
    'use strict';

    // Number counter animation
    function animateNumber(element) {
        const target = parseInt(element.dataset.count || element.textContent.replace(/[^0-9]/g, ''));
        const duration = 1500;
        const start = 0;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);
            
            // Format based on original text
            const originalText = element.dataset.original || element.textContent;
            if (originalText.includes('$')) {
                element.textContent = '$' + current.toLocaleString();
            } else if (originalText.includes('%')) {
                element.textContent = current + '%';
            } else if (originalText.includes('K')) {
                element.textContent = '$' + current + 'K';
            } else {
                element.textContent = current.toLocaleString();
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = originalText; // Restore original formatting
            }
        }
        
        requestAnimationFrame(update);
    }

    // Intersection Observer for scroll-triggered animations
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                // Add stagger delay for multiple items
                const delay = entry.target.dataset.delay || (index * 100);
                
                setTimeout(() => {
                    entry.target.classList.add('animated');
                    
                    // Trigger number animation if element has counter
                    if (entry.target.classList.contains('stat-number') || 
                        entry.target.dataset.count) {
                        animateNumber(entry.target);
                    }
                }, delay);
            }
        });
    }, observerOptions);

    // Initialize on DOM ready
    function init() {
        // Observe stat numbers
        document.querySelectorAll('.stat-number').forEach((el, idx) => {
            if (!el.dataset.original) {
                el.dataset.original = el.textContent;
            }
            el.dataset.delay = idx * 150;
            observer.observe(el);
        });

        // Observe cards for stagger effect
        document.querySelectorAll('.post-card, .case-study-card, .feature-card').forEach((el, idx) => {
            el.dataset.delay = idx * 100;
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });

        // Observe sections for fade-in
        document.querySelectorAll('.section, .timeline-milestone').forEach((el, idx) => {
            if (!el.classList.contains('hero')) {
                el.dataset.delay = Math.min(idx * 80, 400);
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';
                el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                observer.observe(el);
            }
        });

        // Reading progress bar for blog articles
        addReadingProgress();

        // Smooth reveal for interactive tools
        document.querySelectorAll('[onmouseover*="transform"]').forEach((el, idx) => {
            el.dataset.delay = idx * 120;
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    }

    // Reading progress bar for blog articles
    function addReadingProgress() {
        const article = document.querySelector('.article-content');
        if (!article) return;

        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            z-index: 9999;
            transition: width 0.1s ease;
        `;
        document.body.appendChild(progressBar);

        function updateProgress() {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight - windowHeight;
            const scrolled = window.scrollY;
            const progress = (scrolled / documentHeight) * 100;
            progressBar.style.width = Math.min(progress, 100) + '%';
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    }

    // Add animated class styles
    const style = document.createElement('style');
    style.textContent = `
        .animated {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        
        .stat-number {
            display: inline-block;
            transition: transform 0.3s ease;
        }
        
        .stat-number.animated {
            transform: scale(1.05);
            animation: pulse 0.6s ease;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;
    document.head.appendChild(style);

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
