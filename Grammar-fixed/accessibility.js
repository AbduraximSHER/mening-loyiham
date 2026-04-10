/**
 * accessibility.js — Auto-enhance accessibility across all pages
 * Adds aria-labels, roles, keyboard navigation, and focus management.
 * Load this on every page.
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {

        // 1. Add aria-labels to icon-only buttons
        document.querySelectorAll('.tool-icon, .audio-btn, .mobile-menu-toggle, .modal-close').forEach(btn => {
            if (!btn.getAttribute('aria-label')) {
                const icon = btn.querySelector('.material-icons, i');
                if (icon) {
                    const iconText = icon.textContent.trim();
                    const labels = {
                        'search': 'Search',
                        'home': 'Go to home page',
                        'dashboard': 'Go to dashboard',
                        'volume_up': 'Listen to pronunciation',
                        'bookmark_border': 'Bookmark this page',
                        'menu': 'Open menu',
                        'close': 'Close',
                        'highlight': 'Highlight text',
                        'navigate_next': 'Next unit',
                        'navigate_before': 'Previous unit',
                    };
                    btn.setAttribute('aria-label', labels[iconText] || iconText.replace(/_/g, ' '));
                }
            }
        });

        // 2. Add role="button" to clickable divs
        document.querySelectorAll('[onclick]:not(button):not(a)').forEach(el => {
            if (!el.getAttribute('role')) {
                el.setAttribute('role', 'button');
                el.setAttribute('tabindex', '0');
                // Make Enter/Space work like click
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        el.click();
                    }
                });
            }
        });

        // 3. Add role="navigation" to navbars
        document.querySelectorAll('.navbar, .portal-nav, .web-nav').forEach(nav => {
            if (!nav.getAttribute('role')) {
                nav.setAttribute('role', 'navigation');
            }
        });

        // 4. Add role="main" to main content areas
        const mainContent = document.querySelector('.main-content, #app, main');
        if (mainContent && !mainContent.getAttribute('role')) {
            mainContent.setAttribute('role', 'main');
        }

        // 5. Add alt text to images missing it
        document.querySelectorAll('img:not([alt])').forEach(img => {
            const src = img.src || '';
            if (src.includes('avatar') || src.includes('profile')) {
                img.setAttribute('alt', 'User profile picture');
            } else if (src.includes('photo')) {
                img.setAttribute('alt', 'Photo');
            } else {
                img.setAttribute('alt', '');  // Decorative image
            }
        });

        // 6. Ensure all form inputs have associated labels
        document.querySelectorAll('input:not([aria-label]):not([id])').forEach((input, i) => {
            const placeholder = input.getAttribute('placeholder');
            if (placeholder) {
                input.setAttribute('aria-label', placeholder);
            }
        });

        // 7. Add aria-live region for dynamic content updates
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
        liveRegion.id = 'a11y-announcer';
        document.body.appendChild(liveRegion);

        // Helper to announce changes to screen readers
        window.announce = function(message) {
            const announcer = document.getElementById('a11y-announcer');
            if (announcer) {
                announcer.textContent = '';
                setTimeout(() => { announcer.textContent = message; }, 100);
            }
        };

        // 8. Skip-to-content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-to-content';
        skipLink.style.cssText = `
            position: fixed;
            top: -50px;
            left: 1rem;
            z-index: 99999;
            background: var(--primary, #E8573A);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0 0 8px 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: top 0.3s;
        `;
        skipLink.addEventListener('focus', () => { skipLink.style.top = '0'; });
        skipLink.addEventListener('blur', () => { skipLink.style.top = '-50px'; });
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Add id to main content for skip link target
        const main = document.querySelector('main, .main-content, #app, .hero');
        if (main && !main.id) main.id = 'main-content';

        // 9. Escape key closes modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(modal => {
                    if (modal.style.display === 'flex') {
                        modal.style.display = 'none';
                    }
                });
            }
        });

        // 10. Focus trap inside open modals
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            const observer = new MutationObserver(() => {
                if (overlay.style.display === 'flex') {
                    const firstFocusable = overlay.querySelector('input, button, [tabindex]');
                    if (firstFocusable) firstFocusable.focus();
                }
            });
            observer.observe(overlay, { attributes: true, attributeFilter: ['style'] });
        });

    });
})();
