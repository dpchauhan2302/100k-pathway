// Mobile Navigation Toggle - Universal Script
// Automatically attaches to .mobile-menu-toggle and keeps state/ARIA in sync.
document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.classList.add('js');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (!menuToggle || !navLinks) {
        return;
    }

    // Avoid duplicate event listeners when the script is included more than once.
    if (menuToggle.dataset.mobileNavInitialized === 'true') {
        return;
    }
    menuToggle.dataset.mobileNavInitialized = 'true';

    menuToggle.setAttribute('aria-controls', 'nav-links');
    menuToggle.setAttribute('aria-expanded', 'false');

    function closeMenu() {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
        navLinks.classList.add('active');
        menuToggle.classList.add('active');
        menuToggle.setAttribute('aria-expanded', 'true');
    }

    function toggleMenu() {
        if (navLinks.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    menuToggle.addEventListener('click', function (event) {
        event.preventDefault();
        toggleMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (event) {
        const isClickInsideMenu = navLinks.contains(event.target);
        const isClickOnToggle = menuToggle.contains(event.target);
        if (!isClickInsideMenu && !isClickOnToggle) {
            closeMenu();
        }
    });

    // Close menu on Escape for keyboard users
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeMenu();
        }
    });

    // Close menu when clicking any link inside it
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Ensure clean state when moving from mobile to desktop widths
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            closeMenu();
        }
    });
});
