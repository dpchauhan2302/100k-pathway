/**
 * 100 Days, $100K - Shared 3D Animation Effects
 * Inspired by awwwards.com and svgator.com animation examples
 * Effects: Particle constellation, magnetic buttons, 3D card tilt, scroll reveals, cursor glow
 */

(function() {
    'use strict';
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallScreen = window.innerWidth <= 900;
    const safeAnimationsEnabled = !prefersReducedMotion && !isSmallScreen;

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init3DAnimations);
    } else {
        init3DAnimations();
    }

    function init3DAnimations() {
        if (!safeAnimationsEnabled) return;

        // Add required CSS
        injectStyles();
        
        // Initialize essential effects
        initParticleBackground();
        initMagneticButtons();
        // initTiltCards(); // Disabled per user request
        // Disabled: this can hide content on some pages during navigation/cache restores.
        // initScrollReveal();
        // initCursorGlow(); // Disabled per user request
        // initTextAnimations(); // Disabled per user request
        // initSmoothScrollDepth(); // Disabled per user request
        // initBouncyText(); // Disabled per user request
        initPulsingElements();
        initFloatingLabels();
        // initEnergeticHovers(); // Disabled per user request
    }

    // ===== INJECT REQUIRED STYLES =====
    function injectStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            /* Visual Engagement Overrides */
            h1, h2, h3 {
                position: relative;
            }
            
            /* Engaging section backgrounds */
            section, .section {
                position: relative;
            }
            
            section::before, .section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 120px;
                height: 3px;
                background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.5), transparent);
                border-radius: 2px;
            }
            
            /* Unified Footer Styling */
            footer, .global-footer {
                background: linear-gradient(180deg, rgba(13, 17, 23, 0.95) 0%, rgba(11, 22, 34, 1) 100%) !important;
                padding: 60px 20px 30px !important;
                position: relative;
                overflow: hidden;
            }
            
            footer::before, .global-footer::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.5), transparent);
            }
            
            .footer-container {
                max-width: 1200px;
                margin: 0 auto;
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1fr;
                gap: 3rem;
                margin-bottom: 3rem;
                text-align: left;
            }
            
            .footer-section h4 {
                font-size: 1rem;
                font-weight: 600;
                color: #fff;
                margin-bottom: 1.5rem;
                letter-spacing: 0.02em;
            }
            
            .footer-section p {
                color: rgba(255,255,255,0.6);
                font-size: 0.9rem;
                line-height: 1.7;
            }
            
            .footer-links {
                display: flex;
                flex-direction: column;
                gap: 0.8rem;
            }
            
            .footer-link {
                color: rgba(255,255,255,0.6);
                text-decoration: none;
                font-size: 0.9rem;
                transition: color 0.3s, transform 0.3s, padding-left 0.3s;
                display: inline-block;
            }
            
            .footer-link:hover {
                color: #667eea;
                padding-left: 8px;
            }
            
            .footer-bottom {
                text-align: center;
                padding-top: 2rem;
                border-top: 1px solid rgba(255,255,255,0.08);
                color: rgba(255,255,255,0.4);
                font-size: 0.85rem;
            }
            
            @media (max-width: 768px) {
                .footer-container {
                    grid-template-columns: 1fr 1fr;
                }
            }
            
            @media (max-width: 480px) {
                .footer-container {
                    grid-template-columns: 1fr;
                }
            }
            
            /* 3D Animation Base Styles */
            html { perspective: 1000px; }
            body { transform-style: preserve-3d; }
            
            /* Glow Layer */
            .glow-layer-3d {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 0;
                pointer-events: none;
                background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(102, 126, 234, 0.2), transparent),
                            radial-gradient(ellipse 60% 40% at 80% 50%, rgba(118, 75, 162, 0.15), transparent),
                            radial-gradient(ellipse 50% 30% at 20% 80%, rgba(102, 126, 234, 0.1), transparent);
            }
            
            /* Canvas background */
            .bg-canvas-3d {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 0;
                opacity: 1;
                pointer-events: none;
            }
            
            /* Reveal animations */
            .reveal-3d {
                opacity: 0;
                transform: translateY(40px) rotateX(8deg);
                transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
            }
            
            .reveal-3d.revealed {
                opacity: 1;
                transform: translateY(0) rotateX(0);
            }
            
            /* Card hover enhancements */
            .card-3d-hover {
                transition: transform 0.15s ease-out, box-shadow 0.3s ease;
                transform-style: preserve-3d;
            }
            
            /* Button magnetic effect */
            .btn-magnetic {
                transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
                transform-style: preserve-3d;
            }
            
            /* Floating animation */
            @keyframes float3d {
                0%, 100% { transform: translateY(0) translateZ(0); }
                50% { transform: translateY(-10px) translateZ(10px); }
            }
            
            .floating-3d {
                animation: float3d 4s ease-in-out infinite;
            }
            
            /* Subtle pulse glow */
            @keyframes pulseGlow {
                0%, 100% { box-shadow: 0 0 20px rgba(100, 120, 180, 0.1); }
                50% { box-shadow: 0 0 40px rgba(100, 120, 180, 0.2); }
            }
            
            .pulse-glow {
                animation: pulseGlow 3s ease-in-out infinite;
            }
            
            /* Text reveal */
            .text-reveal-3d {
                display: inline-block;
                transform-style: preserve-3d;
            }
            
            /* Noise overlay */
            .noise-overlay-3d {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
                pointer-events: none;
                opacity: 0.025;
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
            }
            
            /* Glassmorphism Effect */
            .glass-effect {
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            
            /* Animated Gradient Background */
            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            
            .animated-gradient {
                background: linear-gradient(-45deg, #0b3b76, #1e40af, #667eea, #764ba2);
                background-size: 400% 400%;
                animation: gradientShift 15s ease infinite;
            }
            
            /* Liquid Motion */
            @keyframes liquidMotion {
                0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
            }
            
            .liquid-shape {
                animation: liquidMotion 8s ease-in-out infinite;
            }
            
            /* Self-Drawing Line */
            @keyframes drawLine {
                to { stroke-dashoffset: 0; }
            }
            
            .self-draw {
                stroke-dasharray: 1000;
                stroke-dashoffset: 1000;
                animation: drawLine 2s ease forwards;
            }
            
            /* Morphing Shape */
            @keyframes morphShape {
                0%, 100% { clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%); }
                25% { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
                50% { clip-path: polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%); }
                75% { clip-path: polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%); }
            }
            
            .morph-shape {
                animation: morphShape 10s ease-in-out infinite;
            }
            
            /* Skeleton Loading */
            @keyframes skeletonPulse {
                0% { background-position: -200px 0; }
                100% { background-position: calc(200px + 100%) 0; }
            }
            
            .skeleton-loading {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200px 100%;
                animation: skeletonPulse 1.5s ease-in-out infinite;
            }
            
            /* Page Transition */
            @keyframes pageEnter {
                from { opacity: 0; transform: translateY(20px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            .page-transition {
                animation: pageEnter 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
            }
            
            /* Expressive Typography */
            @keyframes letterWave {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
            }
            
            .wave-letter {
                display: inline-block;
                animation: letterWave 1s ease-in-out infinite;
            }
            
            /* Ambient Background Motion */
            @keyframes ambientFloat {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                25% { transform: translate(10px, -10px) rotate(2deg); }
                50% { transform: translate(-5px, 15px) rotate(-1deg); }
                75% { transform: translate(-10px, -5px) rotate(1deg); }
            }
            
            .ambient-motion {
                animation: ambientFloat 20s ease-in-out infinite;
            }
            
            /* Neumorphic Effect */
            .neumorphic {
                background: #e0e5ec;
                box-shadow: 9px 9px 16px rgba(163, 177, 198, 0.6),
                           -9px -9px 16px rgba(255, 255, 255, 0.5);
                border-radius: 12px;
            }
            
            .neumorphic:hover {
                box-shadow: inset 9px 9px 16px rgba(163, 177, 198, 0.6),
                           inset -9px -9px 16px rgba(255, 255, 255, 0.5);
            }
            
            /* Faux 3D Depth Layers */
            .depth-layer {
                position: relative;
                transform-style: preserve-3d;
            }
            
            .depth-layer::before {
                content: '';
                position: absolute;
                inset: 0;
                background: inherit;
                transform: translateZ(-20px) scale(1.05);
                filter: blur(8px) opacity(0.5);
                z-index: -1;
            }
            
            /* Scrollytelling Progress */
            .scroll-progress-bar {
                position: fixed;
                top: 0;
                left: 0;
                height: 4px;
                background: linear-gradient(90deg, #667eea, #764ba2);
                z-index: 99999;
                transform-origin: left;
                transition: transform 0.1s linear;
                box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
            }
            
            /* Microinteraction Ripple */
            @keyframes ripple {
                to { transform: scale(4); opacity: 0; }
            }
            
            .ripple-effect {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            }
            
            /* Bouncy Text Animation */
            @keyframes bounceIn {
                0% { transform: scale(0.3) translateY(50px); opacity: 0; }
                50% { transform: scale(1.05) translateY(-10px); }
                70% { transform: scale(0.95) translateY(5px); }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            
            @keyframes bounceWord {
                0%, 100% { transform: translateY(0); }
                25% { transform: translateY(-8px); }
                50% { transform: translateY(0); }
                75% { transform: translateY(-4px); }
            }
            
            .bounce-in {
                animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
            }
            
            .bounce-word {
                display: inline-block;
                animation: bounceWord 2s ease-in-out infinite;
            }
            
            /* Pulsing Glow */
            @keyframes pulseGlowStrong {
                0%, 100% { 
                    box-shadow: 0 0 5px rgba(102, 126, 234, 0.3),
                                0 0 20px rgba(102, 126, 234, 0.2),
                                0 0 40px rgba(102, 126, 234, 0.1);
                }
                50% { 
                    box-shadow: 0 0 10px rgba(102, 126, 234, 0.5),
                                0 0 30px rgba(102, 126, 234, 0.3),
                                0 0 60px rgba(102, 126, 234, 0.2);
                }
            }
            
            .pulse-glow-strong {
                animation: pulseGlowStrong 2s ease-in-out infinite;
            }
            
            /* Floating Label */
            @keyframes floatLabel {
                0%, 100% { transform: translateY(0) rotate(-2deg); }
                50% { transform: translateY(-15px) rotate(2deg); }
            }
            
            .float-label {
                animation: floatLabel 3s ease-in-out infinite;
            }
            
            /* Energetic Scale on Hover */
            .energetic-hover {
                transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55),
                            box-shadow 0.3s ease;
            }
            
            .energetic-hover:hover {
                transform: scale(1.05) translateY(-5px);
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
            }
            
            /* Text Gradient Animation */
            @keyframes gradientText {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            
            .animated-text-gradient {
                background: linear-gradient(90deg, #667eea, #764ba2, #667eea);
                background-size: 200% auto;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: gradientText 3s linear infinite;
            }
            
            /* Shake attention */
            @keyframes gentleShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-3px) rotate(-1deg); }
                75% { transform: translateX(3px) rotate(1deg); }
            }
            
            .attention-shake {
                animation: gentleShake 0.5s ease-in-out;
            }
            
            /* Typing cursor effect */
            @keyframes blink {
                0%, 50% { border-color: #667eea; }
                51%, 100% { border-color: transparent; }
            }
            
            .typing-cursor::after {
                content: '';
                display: inline-block;
                width: 2px;
                height: 1em;
                background: #667eea;
                margin-left: 4px;
                animation: blink 1s step-end infinite;
            }
            
            @media (prefers-reduced-motion: reduce) {
                .reveal-3d, .card-3d-hover, .btn-magnetic, .floating-3d, .pulse-glow,
                .animated-gradient, .liquid-shape, .morph-shape, .ambient-motion, .wave-letter {
                    animation: none !important;
                    transition: none !important;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    // ===== PARTICLE CONSTELLATION BACKGROUND =====
    function initParticleBackground() {
        // Check if canvas already exists
        if (document.getElementById('bgCanvas3d')) return;
        
        // Create layers
        const glowLayer = document.createElement('div');
        glowLayer.className = 'glow-layer-3d';
        document.body.insertBefore(glowLayer, document.body.firstChild);
        
        const noiseLayer = document.createElement('div');
        noiseLayer.className = 'noise-overlay-3d';
        document.body.insertBefore(noiseLayer, document.body.firstChild);
        
        const canvas = document.createElement('canvas');
        canvas.id = 'bgCanvas3d';
        canvas.className = 'bg-canvas-3d';
        document.body.insertBefore(canvas, document.body.firstChild);
        
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        
        let mouseX = width / 2;
        let mouseY = height / 2;
        let targetMouseX = width / 2;
        let targetMouseY = height / 2;
        
        // Particles
        class Particle {
            constructor() {
                this.reset();
            }
            
            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.z = Math.random() * 800 + 200;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = (Math.random() - 0.5) * 0.2;
                this.vz = (Math.random() - 0.5) * 0.3;
                this.size = Math.random() * 3 + 1;
                this.pulseOffset = Math.random() * Math.PI * 2;
            }
            
            update(time) {
                this.x += this.vx;
                this.y += this.vy;
                this.z += this.vz;
                
                // Mouse influence
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 250) {
                    const force = (250 - dist) / 250 * 0.015;
                    this.x += dx * force * 0.2;
                    this.y += dy * force * 0.2;
                }
                
                // Wrap
                if (this.x < -50) this.x = width + 50;
                if (this.x > width + 50) this.x = -50;
                if (this.y < -50) this.y = height + 50;
                if (this.y > height + 50) this.y = -50;
                if (this.z < 100 || this.z > 1000) this.vz *= -1;
                
                this.currentSize = this.size * (1 + Math.sin(time * 0.015 + this.pulseOffset) * 0.25);
            }
            
            getScreenCoords() {
                const perspective = 600 / (600 + this.z);
                return {
                    x: (this.x - width / 2) * perspective + width / 2,
                    y: (this.y - height / 2) * perspective + height / 2,
                    size: this.currentSize * perspective,
                    alpha: Math.min(1, (1000 - this.z) / 700) * 0.5
                };
            }
            
            draw() {
                const c = this.getScreenCoords();
                
                // Glow
                const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 3);
                gradient.addColorStop(0, `rgba(130, 150, 190, ${c.alpha})`);
                gradient.addColorStop(0.5, `rgba(102, 126, 234, ${c.alpha * 0.5})`);
                gradient.addColorStop(1, 'transparent');
                
                ctx.beginPath();
                ctx.fillStyle = gradient;
                ctx.arc(c.x, c.y, c.size * 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Core
                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${c.alpha * 1.2})`;
                ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Connections
        function drawConnections(particles) {
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i].getScreenCoords();
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j].getScreenCoords();
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 120) {
                        const alpha = (1 - dist / 120) * 0.25 * Math.min(p1.alpha, p2.alpha);
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(102, 126, 234, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
        }
        
        // Floating shapes
        class FloatingShape {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.z = Math.random() * 500 + 200;
                this.size = 40 + Math.random() * 80;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.006;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = (Math.random() - 0.5) * 0.15;
                this.type = Math.floor(Math.random() * 4);
            }
            
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.rotSpeed;
                
                if (this.x < -80) this.x = width + 80;
                if (this.x > width + 80) this.x = -80;
                if (this.y < -80) this.y = height + 80;
                if (this.y > height + 80) this.y = -80;
            }
            
            draw() {
                const perspective = 600 / (600 + this.z);
                const sx = (this.x - width / 2) * perspective + width / 2;
                const sy = (this.y - height / 2) * perspective + height / 2;
                const ss = this.size * perspective;
                const alpha = 0.08 + (1 - this.z / 700) * 0.12;
                
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(this.rotation);
                ctx.strokeStyle = `rgba(102, 126, 234, ${alpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                
                if (this.type === 0) {
                    ctx.rect(-ss/2, -ss/2, ss, ss);
                } else if (this.type === 1) {
                    ctx.moveTo(0, -ss/2);
                    ctx.lineTo(ss/2, ss/2);
                    ctx.lineTo(-ss/2, ss/2);
                    ctx.closePath();
                } else if (this.type === 2) {
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI / 3) * i - Math.PI / 2;
                        const px = Math.cos(angle) * ss / 2;
                        const py = Math.sin(angle) * ss / 2;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                } else {
                    ctx.arc(0, 0, ss / 2, 0, Math.PI * 2);
                }
                ctx.stroke();
                ctx.restore();
            }
        }
        
        // Initialize
        const particles = [];
        const shapes = [];
        const particleCount = 80;
        const shapeCount = 8;
        
        for (let i = 0; i < particleCount; i++) particles.push(new Particle());
        for (let i = 0; i < shapeCount; i++) shapes.push(new FloatingShape());
        
        let time = 0;
        
        function animate() {
            ctx.clearRect(0, 0, width, height);
            
            mouseX += (targetMouseX - mouseX) * 0.05;
            mouseY += (targetMouseY - mouseY) * 0.05;
            
            shapes.sort((a, b) => b.z - a.z);
            shapes.forEach(s => { s.update(); s.draw(); });
            
            drawConnections(particles);
            
            particles.sort((a, b) => b.z - a.z);
            particles.forEach(p => { p.update(time); p.draw(); });
            
            time++;
            requestAnimationFrame(animate);
        }
        
        animate();
        
        document.addEventListener('mousemove', (e) => {
            targetMouseX = e.clientX;
            targetMouseY = e.clientY;
        });
        
        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });
    }

    // ===== MAGNETIC BUTTONS =====
    function initMagneticButtons() {
        const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-nav-primary, button[type="submit"], .cta-button, [class*="btn"]');
        
        buttons.forEach(btn => {
            btn.classList.add('btn-magnetic');
            
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                const strength = 0.25;
                btn.style.transform = `translate(${x * strength}px, ${y * strength}px) translateZ(20px) rotateX(${-y * 0.08}deg) rotateY(${x * 0.08}deg)`;
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    // ===== 3D CARD TILT =====
    function initTiltCards() {
        const cards = document.querySelectorAll('.card, .pricing-card, .stat-card, .process-card, .feature-card, .trust-badge, .faq-item, .testimonial-card, .blog-card, [class*="card"], .step, .plan');
        
        cards.forEach(card => {
            card.classList.add('card-3d-hover');
            
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 12;
                const rotateY = (centerX - x) / 12;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(15px) scale(1.01)`;
                card.style.boxShadow = `${-rotateY * 1.5}px ${rotateX * 1.5}px 35px rgba(0,0,0,0.25)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.boxShadow = '';
            });
        });
    }

    // ===== SCROLL REVEAL =====
    function initScrollReveal() {
        const elements = document.querySelectorAll('section, .section, .container, .content-section, .hero, .pricing-section, .faq-section, .stats, .guarantee, .trust-section, main > div');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.1 });
        
        elements.forEach(el => {
            // Skip hero section - should be immediately visible
            if (el.classList.contains('hero') || el.closest('.hero')) {
                el.classList.add('revealed'); // Mark as revealed immediately
                return;
            }
            el.classList.add('reveal-3d');
            observer.observe(el);
        });
    }

    // ===== CURSOR GLOW =====
    function initCursorGlow() {
        // Skip if already exists
        if (document.getElementById('cursorGlow3d')) return;
        
        const glow = document.createElement('div');
        glow.id = 'cursorGlow3d';
        glow.style.cssText = `
            position: fixed;
            width: 250px;
            height: 250px;
            background: radial-gradient(circle, rgba(100, 120, 180, 0.12) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9998;
            transform: translate(-50%, -50%);
            transition: opacity 0.3s ease;
            mix-blend-mode: screen;
        `;
        document.body.appendChild(glow);
        
        let cursorX = 0, cursorY = 0;
        let glowX = 0, glowY = 0;
        
        document.addEventListener('mousemove', (e) => {
            cursorX = e.clientX;
            cursorY = e.clientY;
        });
        
        function updateGlow() {
            glowX += (cursorX - glowX) * 0.1;
            glowY += (cursorY - glowY) * 0.1;
            glow.style.left = glowX + 'px';
            glow.style.top = glowY + 'px';
            requestAnimationFrame(updateGlow);
        }
        updateGlow();
        
        document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
        document.addEventListener('mouseenter', () => { glow.style.opacity = '1'; });
    }

    // ===== TEXT ANIMATIONS =====
    function initTextAnimations() {
        // Skip if GSAP not available
        if (typeof gsap === 'undefined') return;
        
        // Animate main headings (but skip hero section)
        const headings = document.querySelectorAll('h1, .hero-title, .page-title');
        headings.forEach(heading => {
            if (heading.dataset.animated) return;
            // Skip if in hero section
            if (heading.closest('.hero') || heading.closest('[class*="hero"]')) return;
            heading.dataset.animated = 'true';
            
            gsap.from(heading, {
                scrollTrigger: heading,
                duration: 1,
                opacity: 0,
                y: 60,
                rotateX: 15,
                ease: 'power3.out'
            });
        });
        
        // Animate section titles
        const sectionTitles = document.querySelectorAll('h2, .section-title');
        sectionTitles.forEach(title => {
            if (title.dataset.animated) return;
            title.dataset.animated = 'true';
            
            gsap.from(title, {
                scrollTrigger: {
                    trigger: title,
                    start: 'top 85%'
                },
                duration: 0.9,
                opacity: 0,
                y: 50,
                rotateX: 12,
                ease: 'power3.out'
            });
        });
    }

    // ===== SMOOTH SCROLL DEPTH =====
    function initSmoothScrollDepth() {
        const sections = document.querySelectorAll('.section, section, .content-section');
        
        function updateDepth() {
            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const viewportCenter = window.innerHeight / 2;
                const offset = (centerY - viewportCenter) / window.innerHeight;
                
                // Subtle depth effect
                const rotateX = offset * 1.5;
                const translateZ = -Math.abs(offset) * 20;
                
                section.style.transform = `perspective(2000px) rotateX(${rotateX}deg) translateZ(${translateZ}px)`;
            });
            
            requestAnimationFrame(updateDepth);
        }
        
        updateDepth();
    }

    // ===== ENHANCED HEADER/LOGO ANIMATION =====
    function initHeaderEffects() {
        const header = document.querySelector('header, .global-header, .main-nav, nav');
        const logo = document.querySelector('.logo, .nav-logo, [class*="logo"]');
        
        if (header) {
            // Shrink header on scroll
            let lastScroll = 0;
            window.addEventListener('scroll', () => {
                const scroll = window.pageYOffset;
                if (scroll > 50) {
                    header.style.transform = 'translateY(0)';
                    header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                } else {
                    header.style.boxShadow = 'none';
                }
                lastScroll = scroll;
            });
        }
        
        if (logo) {
            // Logo hover 3D effect
            logo.style.transition = 'transform 0.3s ease, filter 0.3s ease';
            logo.style.transformStyle = 'preserve-3d';
            
            logo.addEventListener('mouseenter', () => {
                logo.style.transform = 'scale(1.05) rotateY(5deg)';
                logo.style.filter = 'brightness(1.1)';
            });
            
            logo.addEventListener('mouseleave', () => {
                logo.style.transform = 'scale(1) rotateY(0deg)';
                logo.style.filter = 'brightness(1)';
            });
        }
    }
    
    // ===== ENHANCED BUTTON EFFECTS =====
    function initEnhancedButtons() {
        const buttons = document.querySelectorAll('button, .btn, [class*="btn"], a[href]:not(.logo):not(.nav-logo)');
        
        buttons.forEach(btn => {
            // Skip nav links
            if (btn.closest('nav') && !btn.classList.contains('btn-primary') && !btn.classList.contains('btn-secondary')) {
                return;
            }
            
            // Add glow effect container
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            
            // Shimmer effect on hover
            btn.addEventListener('mouseenter', () => {
                const shimmer = document.createElement('div');
                shimmer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    animation: shimmer 0.6s ease;
                    pointer-events: none;
                `;
                btn.appendChild(shimmer);
                setTimeout(() => shimmer.remove(), 600);
            });
        });
        
        // Add shimmer keyframes
        const shimmerStyle = document.createElement('style');
        shimmerStyle.textContent = `
            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }
        `;
        document.head.appendChild(shimmerStyle);
    }
    
    // ===== LINK UNDERLINE ANIMATION =====
    function initLinkAnimations() {
        const links = document.querySelectorAll('a:not(.btn):not(.logo):not(.nav-logo):not([class*="btn"])');
        
        links.forEach(link => {
            if (link.closest('nav') || link.closest('footer')) {
                link.style.position = 'relative';
                link.style.textDecoration = 'none';
                
                // Create animated underline
                const underline = document.createElement('span');
                underline.style.cssText = `
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 0;
                    height: 1px;
                    background: currentColor;
                    transition: width 0.3s ease;
                `;
                link.appendChild(underline);
                
                link.addEventListener('mouseenter', () => {
                    underline.style.width = '100%';
                });
                
                link.addEventListener('mouseleave', () => {
                    underline.style.width = '0';
                });
            }
        });
    }
    
    // ===== NUMBER COUNTER ANIMATION =====
    function initCounterAnimation() {
        const numbers = document.querySelectorAll('.stat-number, [data-counter], .counter');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.counted) {
                    entry.target.dataset.counted = 'true';
                    animateNumber(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        numbers.forEach(num => observer.observe(num));
        
        function animateNumber(element) {
            const text = element.textContent;
            const match = text.match(/([\d,]+)/);
            if (!match) return;
            
            const target = parseInt(match[1].replace(/,/g, ''));
            const prefix = text.substring(0, text.indexOf(match[1]));
            const suffix = text.substring(text.indexOf(match[1]) + match[1].length);
            const duration = 2000;
            const start = performance.now();
            
            function update(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(target * eased);
                
                element.textContent = prefix + current.toLocaleString() + suffix;
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    element.textContent = text;
                }
            }
            
            requestAnimationFrame(update);
        }
    }
    
    // ===== IMAGE PARALLAX =====
    function initImageParallax() {
        const images = document.querySelectorAll('img:not(.logo img):not([src*="logo"])');
        
        images.forEach(img => {
            if (img.offsetHeight > 100) {
                img.style.transition = 'transform 0.1s ease-out';
                
                window.addEventListener('scroll', () => {
                    const rect = img.getBoundingClientRect();
                    if (rect.top < window.innerHeight && rect.bottom > 0) {
                        const offset = (rect.top - window.innerHeight / 2) / 20;
                        img.style.transform = `translateY(${offset}px)`;
                    }
                });
            }
        });
    }
    
    // Initialize enhanced effects
    setTimeout(() => {
        if (!safeAnimationsEnabled) return;
        initHeaderEffects();
        initEnhancedButtons();
        initLinkAnimations();
        initCounterAnimation();
        initImageParallax();
        initScrollProgress();
        initGlassmorphism();
        initAmbientShapes();
        initRippleEffect();
        // Disabled: global link interception can cause broken navigation states.
        // initPageTransition();
        initHeroAnimations();
        initSVGDrawing();
    }, 100);
    
    // ===== SCROLL PROGRESS BAR =====
    function initScrollProgress() {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-bar';
        progressBar.style.transform = 'scaleX(0)';
        document.body.appendChild(progressBar);
        
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollTop / docHeight;
            progressBar.style.transform = `scaleX(${progress})`;
        });
    }
    
    // ===== GLASSMORPHISM CARDS =====
    function initGlassmorphism() {
        const cards = document.querySelectorAll('.card, .pricing-card, .feature-card, .stat-card');
        
        cards.forEach(card => {
            // Add subtle glass overlay on hover
            card.addEventListener('mouseenter', () => {
                card.style.background = 'rgba(255, 255, 255, 0.12)';
                card.style.backdropFilter = 'blur(8px)';
                card.style.webkitBackdropFilter = 'blur(8px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.background = '';
                card.style.backdropFilter = '';
                card.style.webkitBackdropFilter = '';
            });
        });
    }
    
    // ===== AMBIENT FLOATING SHAPES =====
    function initAmbientShapes() {
        const hero = document.querySelector('.hero, .hero-section, [class*="hero"]');
        if (!hero) return;
        
        // Create ambient shapes container
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
            z-index: 0;
        `;
        
        // Add liquid gradient blobs
        for (let i = 0; i < 3; i++) {
            const blob = document.createElement('div');
            const size = 200 + Math.random() * 300;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            
            blob.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}%;
                top: ${y}%;
                background: radial-gradient(circle, rgba(102, 126, 234, 0.15), transparent 70%);
                border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
                filter: blur(40px);
                animation: liquidMotion ${8 + i * 2}s ease-in-out infinite, ambientFloat ${15 + i * 5}s ease-in-out infinite;
                animation-delay: ${i * -3}s;
            `;
            container.appendChild(blob);
        }
        
        if (hero.style.position !== 'absolute' && hero.style.position !== 'fixed') {
            hero.style.position = 'relative';
        }
        hero.insertBefore(container, hero.firstChild);
    }
    
    // ===== RIPPLE MICROINTERACTION =====
    function initRippleEffect() {
        const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, button[type="submit"], .cta-button');
        
        buttons.forEach(btn => {
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            
            btn.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const ripple = document.createElement('span');
                const size = Math.max(rect.width, rect.height);
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${e.clientX - rect.left - size / 2}px;
                    top: ${e.clientY - rect.top - size / 2}px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.4);
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                `;
                
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
    }
    
    // ===== PAGE TRANSITION EFFECT =====
    function initPageTransition() {
        // Add page enter animation
        document.body.style.opacity = '0';
        document.body.style.transform = 'translateY(10px)';
        
        requestAnimationFrame(() => {
            document.body.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            document.body.style.opacity = '1';
            document.body.style.transform = 'translateY(0)';
        });
        
        // Add exit animation on navigation
        document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"]):not([href^="mailto"])').forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('//')) {
                    e.preventDefault();
                    document.body.style.opacity = '0';
                    document.body.style.transform = 'translateY(-10px)';
                    setTimeout(() => window.location.href = href, 300);
                }
            });
        });
    }
    
    // ===== HERO SECTION ANIMATIONS =====
    function initHeroAnimations() {
        const hero = document.querySelector('.hero, .hero-section, [class*="hero"]');
        if (!hero) return;
        
        // Parallax on mouse move
        const heroContent = hero.querySelector('h1, .hero-title, .hero-heading');
        const heroSubtext = hero.querySelector('p, .hero-subtitle, .hero-text');
        
        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
            const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
            
            if (heroContent) {
                heroContent.style.transform = `translate(${x * 15}px, ${y * 10}px)`;
                heroContent.style.transition = 'transform 0.3s ease-out';
            }
            if (heroSubtext) {
                heroSubtext.style.transform = `translate(${x * 8}px, ${y * 5}px)`;
                heroSubtext.style.transition = 'transform 0.3s ease-out';
            }
        });
        
        hero.addEventListener('mouseleave', () => {
            if (heroContent) heroContent.style.transform = '';
            if (heroSubtext) heroSubtext.style.transform = '';
        });
    }
    
    // ===== SVG SELF-DRAWING EFFECT =====
    function initSVGDrawing() {
        const svgs = document.querySelectorAll('svg path, svg line, svg circle, svg polyline');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.drawn) {
                    entry.target.dataset.drawn = 'true';
                    const length = entry.target.getTotalLength ? entry.target.getTotalLength() : 500;
                    entry.target.style.strokeDasharray = length;
                    entry.target.style.strokeDashoffset = length;
                    entry.target.style.animation = `drawLine 1.5s ease forwards`;
                }
            });
        }, { threshold: 0.3 });
        
        svgs.forEach(svg => {
            if (svg.closest('.logo, .nav-logo, [class*="logo"]')) return;
            observer.observe(svg);
        });
    }
    
    // ===== BOUNCY TEXT ANIMATION =====
    function initBouncyText() {
        // Find hero headings and make them bouncy
        const heroHeadings = document.querySelectorAll('h1, .hero-title, .hero h1, .hero-heading');
        
        heroHeadings.forEach(heading => {
            if (heading.dataset.bounced) return;
            heading.dataset.bounced = 'true';
            
            const text = heading.textContent;
            const words = text.split(' ');
            heading.innerHTML = '';
            
            words.forEach((word, index) => {
                const span = document.createElement('span');
                span.textContent = word + ' ';
                span.className = 'bounce-word';
                span.style.animationDelay = `${index * 0.15}s`;
                heading.appendChild(span);
            });
        });
        
        // Add bounce-in to section titles on scroll
        const sectionTitles = document.querySelectorAll('h2, h3, .section-title');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('bounce-in')) {
                    entry.target.classList.add('bounce-in');
                }
            });
        }, { threshold: 0.2 });
        
        sectionTitles.forEach(title => observer.observe(title));
    }
    
    // ===== PULSING ELEMENTS =====
    function initPulsingElements() {
        // Add pulsing glow to primary CTAs
        const ctas = document.querySelectorAll('.btn-primary, .cta-button, [class*="btn-primary"], a[href*="apply"]');
        
        ctas.forEach(cta => {
            cta.classList.add('pulse-glow-strong');
        });
        
        // Add gradient text to key phrases
        const keyPhrases = document.querySelectorAll('.highlight, .accent-text, strong');
        keyPhrases.forEach(phrase => {
            if (phrase.closest('nav, footer, .footer')) return;
            phrase.classList.add('animated-text-gradient');
        });
    }
    
    // ===== FLOATING LABELS =====
    function initFloatingLabels() {
        // Add floating animation to badges and labels
        const labels = document.querySelectorAll('.badge, .tag, .label, .chip, [class*="badge"], .plan-badge');
        
        labels.forEach((label, index) => {
            label.classList.add('float-label');
            label.style.animationDelay = `${index * 0.3}s`;
        });
    }
    
    // ===== ENERGETIC HOVER EFFECTS =====
    function initEnergeticHovers() {
        // Add energetic hover to cards
        const cards = document.querySelectorAll('.card, .feature-card, .pricing-card, .stat-card, .testimonial-card');
        
        cards.forEach(card => {
            card.classList.add('energetic-hover');
        });
        
        // Add attention shake on CTA hover
        const ctaButtons = document.querySelectorAll('.btn-primary, .cta-button');
        ctaButtons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.classList.add('attention-shake');
            });
            btn.addEventListener('animationend', () => {
                btn.classList.remove('attention-shake');
            });
        });
        
        // Add typing cursor to input placeholders on focus
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.classList.add('typing-cursor');
            });
            input.addEventListener('blur', () => {
                input.classList.remove('typing-cursor');
            });
        });
    }
    
    // ===== NATURAL STAGGERED SCROLL ANIMATIONS =====
    function initNaturalScrollAnimations() {
        // Timeline/Phase elements - staggered reveal
        const phases = document.querySelectorAll('.phase, .timeline-item, .step, .process-step');
        phases.forEach((phase, index) => {
            phase.style.opacity = '0';
            phase.style.transform = 'translateY(60px) rotateX(10deg)';
            phase.style.transition = `all 0.8s cubic-bezier(0.23, 1, 0.32, 1) ${index * 0.15}s`;
        });
        
        // Phase numbers - special treatment
        const phaseNumbers = document.querySelectorAll('.phase-number');
        phaseNumbers.forEach((num, index) => {
            num.style.transform = 'scale(0)';
            num.style.transition = `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + index * 0.15}s`;
        });
        
        // Cards - staggered cascade
        const allCards = document.querySelectorAll('.card, .plan-card, .pricing-card, .feature-card, .phase-content, .stat-card, .testimonial-card, .case-study-card');
        allCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(40px) scale(0.95)';
            card.style.transition = `all 0.7s cubic-bezier(0.23, 1, 0.32, 1) ${(index % 4) * 0.1}s`;
        });
        
        // List items - wave effect
        const listItems = document.querySelectorAll('.phase-deliverables li, .feature-list li, .benefits li, ul:not(.nav-links) li');
        listItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            item.style.transition = `all 0.5s ease ${(index % 6) * 0.08}s`;
        });
        
        // Section headings - slide up with fade
        const sectionHeadings = document.querySelectorAll('section h2, .section h2, .timeline h2, .cta-section h2');
        sectionHeadings.forEach(heading => {
            heading.style.opacity = '0';
            heading.style.transform = 'translateY(30px)';
            heading.style.transition = 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
        });
        
        // Paragraphs in sections - subtle fade in
        const sectionParagraphs = document.querySelectorAll('section > p, .section > p, .hero p, .cta-section p');
        sectionParagraphs.forEach(p => {
            p.style.opacity = '0';
            p.style.transform = 'translateY(20px)';
            p.style.transition = 'all 0.6s ease 0.2s';
        });
        
        // CTA buttons - pop in
        const ctaButtons = document.querySelectorAll('.cta-btn, .btn-primary, .cta-button, a[href*="apply"]');
        ctaButtons.forEach(btn => {
            btn.style.opacity = '0';
            btn.style.transform = 'scale(0.8)';
            btn.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s';
        });
        
        // Intersection Observer for triggering
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0) translateX(0) scale(1) rotateX(0deg)';
                    
                    // Special handling for phase numbers
                    if (entry.target.classList.contains('phase-number')) {
                        entry.target.style.transform = 'scale(1)';
                    }
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });
        
        // Observe all animated elements
        [...phases, ...phaseNumbers, ...allCards, ...listItems, ...sectionHeadings, ...sectionParagraphs, ...ctaButtons].forEach(el => {
            observer.observe(el);
        });
    }
    
    // ===== CONTINUOUS SUBTLE MOTION =====
    function initSubtleMotion() {
        // Add subtle floating to decorative elements
        const floatElements = document.querySelectorAll('.phase-number, .stat-number, .plan-badge, .accent');
        floatElements.forEach((el, index) => {
            el.style.animation = `subtleFloat ${3 + (index % 3)}s ease-in-out infinite`;
            el.style.animationDelay = `${index * 0.5}s`;
        });
        
        // Add subtle pulse to timeline connectors
        const connectors = document.querySelectorAll('.phase::before, .timeline-connector, .step-line');
        connectors.forEach(connector => {
            connector.style.animation = 'pulseLine 2s ease-in-out infinite';
        });
    }
    
    // ===== HERO SECTION ENHANCED ANIMATION =====
    function initHeroEnhanced() {
        const hero = document.querySelector('.hero, [class*="hero"]');
        if (!hero) return;
        
        const heroH1 = hero.querySelector('h1');
        const heroP = hero.querySelector('p');
        const heroCTA = hero.querySelector('.cta-btn, .btn-primary, a[href*="apply"]');
        
        // Staggered entrance
        if (heroH1) {
            heroH1.style.opacity = '0';
            heroH1.style.transform = 'translateY(40px)';
            setTimeout(() => {
                heroH1.style.transition = 'all 1s cubic-bezier(0.23, 1, 0.32, 1)';
                heroH1.style.opacity = '1';
                heroH1.style.transform = 'translateY(0)';
            }, 100);
        }
        
        if (heroP) {
            heroP.style.opacity = '0';
            heroP.style.transform = 'translateY(30px)';
            setTimeout(() => {
                heroP.style.transition = 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
                heroP.style.opacity = '1';
                heroP.style.transform = 'translateY(0)';
            }, 400);
        }
        
        if (heroCTA) {
            heroCTA.style.opacity = '0';
            heroCTA.style.transform = 'scale(0.9)';
            setTimeout(() => {
                heroCTA.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                heroCTA.style.opacity = '1';
                heroCTA.style.transform = 'scale(1)';
            }, 700);
        }
    }
    
    // ===== PRICING CARDS ENHANCED =====
    function initPricingEnhanced() {
        const pricingCards = document.querySelectorAll('.plan-card, .pricing-card');
        
        pricingCards.forEach((card, index) => {
            // Stagger entrance
            card.style.opacity = '0';
            card.style.transform = 'translateY(60px) scale(0.9)';
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            card.style.transition = 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0) scale(1)';
                        }, index * 150);
                        observer.unobserve(card);
                    }
                });
            }, { threshold: 0.2 });
            
            observer.observe(card);
            
            // Enhanced hover
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-12px) scale(1.02)';
                card.style.boxShadow = '0 25px 60px rgba(102, 126, 234, 0.25)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
                card.style.boxShadow = '';
            });
        });
    }
    
    // Add CSS for subtle motion
    const motionStyles = document.createElement('style');
    motionStyles.textContent = `
        @keyframes subtleFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        
        @keyframes pulseLine {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
        }
        
        /* Phase content enhanced */
        .phase-content {
            transition: transform 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease !important;
        }
        
        .phase-content:hover {
            transform: translateX(8px) !important;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2) !important;
            border-color: rgba(102, 126, 234, 0.4) !important;
        }
        
        /* Phase number pulse on hover */
        .phase:hover .phase-number {
            animation: numberPulse 0.6s ease !important;
        }
        
        @keyframes numberPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        /* Deliverables checkmark animation */
        .phase-deliverables li::before {
            transition: transform 0.3s ease, color 0.3s ease !important;
        }
        
        .phase-deliverables li:hover::before {
            transform: scale(1.3) !important;
            color: #3B82F6 !important;
        }
        
        /* Natural text selection highlighting */
        ::selection {
            background: rgba(102, 126, 234, 0.3);
            color: inherit;
        }
        
        /* Smooth scroll behavior */
        html {
            scroll-behavior: smooth;
        }
        
        /* Enhanced focus states */
        a:focus-visible, button:focus-visible {
            outline: 2px solid rgba(102, 126, 234, 0.6);
            outline-offset: 3px;
        }
    `;
    document.head.appendChild(motionStyles);
    
    // Initialize natural animations after DOM ready
    setTimeout(() => {
        // initNaturalScrollAnimations(); // Disabled per user request
        initSubtleMotion();
        initHeroEnhanced();
        initPricingEnhanced();
    }, 50);

})();
