/**
 * 100 Days, $100K Unified Navigation & Footer JS
 * Handles mobile menu, authentication state, and active link highlighting
 */

// Mobile menu handled by mobile-nav.js

// Check user authentication status and update UI
async function checkAuthStatus() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const userName = localStorage.getItem('userName');
    
    const loginLink = document.getElementById('nav-login');
    const applyLink = document.getElementById('nav-apply');
    const userMenu = document.getElementById('nav-user');
    
    if (token && (user || userName)) {
        try {
            const userData = user ? JSON.parse(user) : { full_name: userName };
            
            // Hide login/apply buttons
            if (loginLink) loginLink.style.display = 'none';
            if (applyLink) applyLink.style.display = 'none';
            
            // Show user menu
            if (userMenu) {
                userMenu.style.display = 'flex';
                const avatar = document.getElementById('nav-avatar');
                const username = document.getElementById('nav-username');
                if (avatar) avatar.textContent = userData.full_name?.charAt(0).toUpperCase() || 'U';
                if (username) username.textContent = userData.full_name || 'User';
            }
        } catch (e) {
            // Auth check failed - clear invalid data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    } else {
        // Ensure guest view
        if (loginLink) loginLink.style.display = 'flex';
        if (applyLink) applyLink.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Set active nav link based on current page
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        // Handle both relative and absolute paths
        const linkPath = new URL(link.href).pathname;
        const normalizedPath = currentPath.endsWith('/') ? currentPath + 'index.html' : currentPath;
        const normalizedLinkPath = linkPath.endsWith('/') ? linkPath + 'index.html' : linkPath;
        
        if (normalizedPath === normalizedLinkPath || 
            (normalizedPath === '/index.html' && normalizedLinkPath === '/')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setActiveNavLink();
    
    // Handle sticky header scroll effect
    const header = document.querySelector('.global-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }
    });
});
