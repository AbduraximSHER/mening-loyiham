/**
 * reading-progress.js — Thin progress bar at top of page
 * Shows how far the user has scrolled through content.
 * Only activates on pages with .main-content or .web-content
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const scrollContainer = document.querySelector('.main-content') || document.querySelector('.web-content');
        if (!scrollContainer) return;

        // Create progress bar
        const bar = document.createElement('div');
        bar.id = 'reading-progress-bar';
        bar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            height: 3px;
            width: 0%;
            background: linear-gradient(90deg, var(--primary, #E8573A), var(--accent, #f59e0b));
            z-index: 9999;
            transition: width 0.1s linear;
            pointer-events: none;
            border-radius: 0 2px 2px 0;
        `;
        document.body.appendChild(bar);

        // Track scroll
        const updateProgress = () => {
            const el = scrollContainer;
            const scrollTop = el.scrollTop || window.scrollY;
            const scrollHeight = el.scrollHeight - el.clientHeight;
            if (scrollHeight <= 0) { bar.style.width = '0%'; return; }
            const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
            bar.style.width = progress + '%';
        };

        // Listen on the scroll container or window
        if (scrollContainer.scrollHeight > scrollContainer.clientHeight) {
            scrollContainer.addEventListener('scroll', updateProgress, { passive: true });
        } else {
            window.addEventListener('scroll', updateProgress, { passive: true });
        }

        updateProgress();
    });
})();
