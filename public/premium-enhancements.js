/**
 * Premium Frontend Enhancements
 * Strategic animations for trust, credibility, and conversion
 * Focus: Professional career transition service
 */

(function() {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initSuccessMetricsCounter();
        // initPricingCardDepth(); // Disabled per user request
        initProgressIndicators();
        initFormStateAnimations();
        initTrustBadgePulse();
        initParallaxSections();
        initDataVisualization();
        // initCTAMagnetism(); // Disabled per user request
    }

    // 1. SUCCESS METRICS COUNTER - Build trust with real data
    function initSuccessMetricsCounter() {
        const metrics = document.querySelectorAll('[data-metric]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                    entry.target.classList.add('counted');
                    animateMetric(entry.target);
                }
            });
        }, { threshold: 0.5 });

        metrics.forEach(metric => observer.observe(metric));
    }

    function animateMetric(element) {
        const target = parseInt(element.dataset.metric);
        const suffix = element.dataset.suffix || '';
        const prefix = element.dataset.prefix || '';
        const duration = 2000;
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutExpo(progress);
            const current = Math.floor(start + (target - start) * eased);
            
            element.textContent = prefix + current.toLocaleString() + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = prefix + target.toLocaleString() + suffix;
            }
        }
        
        requestAnimationFrame(update);
    }

    function easeOutExpo(x) {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }

    // 2. PRICING CARD DEPTH - Premium 3D effect for tier comparison
    function initPricingCardDepth() {
        const pricingCards = document.querySelectorAll('.pricing-card, .tier-card, .plan-card');
        
        pricingCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-12px) translateZ(40px) rotateX(2deg)';
                this.style.boxShadow = '0 30px 60px rgba(0,0,0,0.4), 0 0 80px rgba(59, 130, 246, 0.15)';
                this.style.transition = 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
                
                // Highlight selected tier
                const badge = this.querySelector('.badge, .popular, .recommended');
                if (badge) {
                    badge.style.transform = 'scale(1.1)';
                    badge.style.transition = 'transform 0.3s ease';
                }
            });

            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) translateZ(0) rotateX(0)';
                this.style.boxShadow = '';
                
                const badge = this.querySelector('.badge, .popular, .recommended');
                if (badge) {
                    badge.style.transform = 'scale(1)';
                }
            });
        });
    }

    // 3. PROGRESS INDICATORS - Show journey clarity
    function initProgressIndicators() {
        const steps = document.querySelectorAll('.step, .process-step, [data-step]');
        
        steps.forEach((step, index) => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                            entry.target.style.transition = 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
                            
                            // Animate step number
                            const stepNum = entry.target.querySelector('.step-number, .number');
                            if (stepNum) {
                                stepNum.style.transform = 'scale(1.2)';
                                setTimeout(() => {
                                    stepNum.style.transform = 'scale(1)';
                                    stepNum.style.transition = 'transform 0.3s ease';
                                }, 200);
                            }
                        }, index * 150);
                    }
                });
            }, { threshold: 0.3 });

            step.style.opacity = '0';
            step.style.transform = 'translateY(30px)';
            observer.observe(step);
        });
    }

    // 4. FORM STATE ANIMATIONS - Clear feedback during application
    function initFormStateAnimations() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, textarea, select');
            
            inputs.forEach(input => {
                input.addEventListener('focus', function() {
                    const label = this.previousElementSibling;
                    if (label && label.tagName === 'LABEL') {
                        label.style.transform = 'translateY(-4px)';
                        label.style.fontSize = '0.85rem';
                        label.style.color = '#3B82F6';
                        label.style.transition = 'all 0.2s ease';
                    }
                    
                    this.style.borderColor = '#3B82F6';
                    this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    this.style.transition = 'all 0.2s ease';
                });

                input.addEventListener('blur', function() {
                    const label = this.previousElementSibling;
                    if (label && label.tagName === 'LABEL' && !this.value) {
                        label.style.transform = '';
                        label.style.fontSize = '';
                        label.style.color = '';
                    }
                    
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                });

                // Success state
                input.addEventListener('input', function() {
                    if (this.validity.valid && this.value) {
                        this.style.borderColor = '#10b981';
                    }
                });
            });

            // Submit animation
            form.addEventListener('submit', function(e) {
                const submitBtn = this.querySelector('button[type="submit"], input[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        submitBtn.style.transform = '';
                        submitBtn.style.transition = 'transform 0.1s ease';
                    }, 100);
                }
            });
        });
    }

    // 5. TRUST BADGE PULSE - Subtle attention to credibility signals
    function initTrustBadgePulse() {
        const trustBadges = document.querySelectorAll('.trust-badge, .guarantee-badge, [data-trust]');
        
        trustBadges.forEach((badge, index) => {
            setTimeout(() => {
                badge.style.animation = 'subtle-pulse 3s ease-in-out infinite';
            }, index * 200);
        });

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes subtle-pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                50% { transform: scale(1.02); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15); }
            }
        `;
        document.head.appendChild(style);
    }

    // 6. PARALLAX SECTIONS - Depth on hero and key sections
    function initParallaxSections() {
        const parallaxSections = document.querySelectorAll('.hero, [data-parallax]');
        let ticking = false;

        function updateParallax() {
            const scrollY = window.pageYOffset;

            parallaxSections.forEach(section => {
                const speed = section.dataset.parallaxSpeed || 0.5;
                const yPos = -(scrollY * speed);
                section.style.transform = `translateY(${yPos}px)`;
            });

            ticking = false;
        }

        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(updateParallax);
                ticking = true;
            }
        });
    }

    // 7. DATA VISUALIZATION - Animate success rate progress bars
    function initDataVisualization() {
        const progressBars = document.querySelectorAll('[data-progress]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                    entry.target.classList.add('animated');
                    const target = entry.target.dataset.progress;
                    
                    setTimeout(() => {
                        entry.target.style.width = target + '%';
                        entry.target.style.transition = 'width 1.5s cubic-bezier(0.23, 1, 0.32, 1)';
                    }, 100);
                }
            });
        }, { threshold: 0.5 });

        progressBars.forEach(bar => {
            bar.style.width = '0%';
            observer.observe(bar);
        });
    }

    // 8. CTA MAGNETISM - Subtle attraction to primary actions
    function initCTAMagnetism() {
        const ctaButtons = document.querySelectorAll('.btn-primary, .cta-button, [data-cta="primary"]');
        
        ctaButtons.forEach(button => {
            button.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05) translateY(-2px)';
                this.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.35)';
                this.style.transition = 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)';
            });

            button.addEventListener('mouseleave', function() {
                this.style.transform = '';
                this.style.boxShadow = '';
            });

            button.addEventListener('mousedown', function() {
                this.style.transform = 'scale(0.98) translateY(0)';
            });

            button.addEventListener('mouseup', function() {
                this.style.transform = 'scale(1.05) translateY(-2px)';
            });
        });
    }

})();
