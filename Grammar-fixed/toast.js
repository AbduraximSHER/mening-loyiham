/**
 * toast.js — Toast Notification System
 * Replaces all browser alert() calls with elegant, non-blocking toasts.
 */

const Toast = {
    container: null,

    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 1.5rem;
            right: 1.5rem;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            max-width: 380px;
            width: calc(100vw - 2rem);
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    },

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'success' | 'error' | 'info' | 'warning'
     * @param {number} duration - Auto-dismiss in ms (0 = manual dismiss only)
     */
    show(message, type = 'info', duration = 4000) {
        this.init();

        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠'
        };

        const colors = {
            success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', icon: '#10b981' },
            error:   { bg: '#fef2f2', border: '#ef4444', text: '#7f1d1d', icon: '#ef4444' },
            info:    { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a5a', icon: '#3b82f6' },
            warning: { bg: '#fffbeb', border: '#f59e0b', text: '#78350f', icon: '#f59e0b' }
        };

        // Dark mode colors
        const darkColors = {
            success: { bg: '#064e3b', border: '#34d399', text: '#d1fae5', icon: '#34d399' },
            error:   { bg: '#450a0a', border: '#f87171', text: '#fecaca', icon: '#f87171' },
            info:    { bg: '#1e3a5a', border: '#60a5fa', text: '#dbeafe', icon: '#60a5fa' },
            warning: { bg: '#451a03', border: '#fbbf24', text: '#fef3c7', icon: '#fbbf24' }
        };

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const c = isDark ? (darkColors[type] || darkColors.info) : (colors[type] || colors.info);

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${c.bg};
            border: 1px solid ${c.border};
            border-left: 4px solid ${c.border};
            color: ${c.text};
            padding: 0.85rem 1rem;
            border-radius: 10px;
            font-size: 0.9rem;
            line-height: 1.5;
            font-family: 'Outfit', 'Inter', system-ui, sans-serif;
            display: flex;
            align-items: flex-start;
            gap: 0.65rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            pointer-events: all;
            cursor: pointer;
            opacity: 0;
            transform: translateX(40px);
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;

        toast.innerHTML = `
            <span style="
                font-size: 1.1rem;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: ${c.icon}22;
                color: ${c.icon};
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                font-weight: bold;
            ">${icons[type] || icons.info}</span>
            <span style="flex:1;">${message}</span>
            <span style="
                color: ${c.text}88;
                font-size: 1.1rem;
                cursor: pointer;
                line-height: 1;
                flex-shrink: 0;
                padding: 0 0.25rem;
            " onclick="this.parentElement.remove()">×</span>
        `;

        // Click to dismiss
        toast.addEventListener('click', () => this._dismiss(toast));

        this.container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => this._dismiss(toast), duration);
        }

        return toast;
    },

    _dismiss(toast) {
        if (!toast || !toast.parentElement) return;
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    },

    success(msg, duration) { return this.show(msg, 'success', duration); },
    error(msg, duration)   { return this.show(msg, 'error', duration); },
    info(msg, duration)    { return this.show(msg, 'info', duration); },
    warning(msg, duration) { return this.show(msg, 'warning', duration); }
};

// Override global alert() to use Toast instead
const _originalAlert = window.alert;
window.alert = function(message) {
    // Detect type from message content
    const msg = String(message);
    if (msg.includes('Error') || msg.includes('error') || msg.includes('failed') || msg.includes('Failed')) {
        Toast.error(msg);
    } else if (msg.includes('Success') || msg.includes('success') || msg.includes('saved') || msg.includes('Complete') || msg.includes('created') || msg.includes('Great job') || msg.includes('updated')) {
        Toast.success(msg);
    } else if (msg.includes('check your email') || msg.includes('confirm') || msg.includes('Please')) {
        Toast.info(msg, 6000);
    } else if (msg.includes('Warning') || msg.includes('warning')) {
        Toast.warning(msg);
    } else {
        Toast.info(msg);
    }
};

// Export
window.Toast = Toast;
