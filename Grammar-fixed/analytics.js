/**
 * analytics.js — Lightweight privacy-friendly analytics
 * 
 * Tracks page views, time on page, and key actions locally.
 * No external services, no cookies, no personal data collection.
 * Data is stored in localStorage for the site owner to review.
 * 
 * View analytics: open browser console and type Analytics.report()
 */

const Analytics = {
    STORAGE_KEY: 'em_analytics',
    sessionStart: Date.now(),
    currentPage: window.location.pathname.split('/').pop() || 'index.html',

    init() {
        this._trackPageView();
        this._trackTimeOnPage();
        this._trackEngagement();
    },

    _getData() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || this._defaultData();
        } catch { return this._defaultData(); }
    },

    _save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch(e) { /* localStorage full or unavailable */ }
    },

    _defaultData() {
        return {
            firstVisit: new Date().toISOString(),
            totalSessions: 0,
            pageViews: {},
            actions: {},
            dailyVisits: {},
            totalTimeSeconds: 0,
            lastVisit: null
        };
    },

    _trackPageView() {
        const data = this._getData();
        const page = this.currentPage;
        const today = new Date().toISOString().split('T')[0];

        // Increment session count (once per page load that's a new session)
        if (!sessionStorage.getItem('em_session_counted')) {
            data.totalSessions = (data.totalSessions || 0) + 1;
            sessionStorage.setItem('em_session_counted', 'true');
        }

        // Track page view
        if (!data.pageViews[page]) data.pageViews[page] = 0;
        data.pageViews[page]++;

        // Track daily visits
        if (!data.dailyVisits[today]) data.dailyVisits[today] = 0;
        data.dailyVisits[today]++;

        data.lastVisit = new Date().toISOString();

        // Keep only last 90 days of daily data
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        Object.keys(data.dailyVisits).forEach(date => {
            if (date < cutoffStr) delete data.dailyVisits[date];
        });

        this._save(data);
    },

    _trackTimeOnPage() {
        // Track time when user leaves or switches tabs
        const saveTime = () => {
            const seconds = Math.floor((Date.now() - this.sessionStart) / 1000);
            if (seconds > 0 && seconds < 7200) { // Cap at 2 hours to filter idle tabs
                const data = this._getData();
                data.totalTimeSeconds = (data.totalTimeSeconds || 0) + seconds;
                this._save(data);
            }
        };

        window.addEventListener('beforeunload', saveTime);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                saveTime();
                this.sessionStart = Date.now(); // Reset for when they come back
            } else {
                this.sessionStart = Date.now();
            }
        });
    },

    _trackEngagement() {
        // Track scroll depth
        let maxScroll = 0;
        const trackScroll = () => {
            const scrollEl = document.querySelector('.main-content') || document.documentElement;
            const scrollTop = scrollEl.scrollTop || window.scrollY;
            const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
            if (scrollHeight > 0) {
                const percent = Math.round((scrollTop / scrollHeight) * 100);
                if (percent > maxScroll) maxScroll = percent;
            }
        };
        window.addEventListener('scroll', trackScroll, { passive: true });
        document.querySelector('.main-content')?.addEventListener('scroll', trackScroll, { passive: true });

        // Save max scroll on leave
        window.addEventListener('beforeunload', () => {
            if (maxScroll > 0) {
                this.trackAction('scroll_depth_' + this.currentPage, maxScroll);
            }
        });
    },

    /**
     * Track a custom action/event
     */
    trackAction(action, value = 1) {
        const data = this._getData();
        if (!data.actions[action]) data.actions[action] = 0;
        data.actions[action] += (typeof value === 'number' ? value : 1);
        this._save(data);
    },

    /**
     * Generate a readable analytics report
     * Usage: open console, type Analytics.report()
     */
    report() {
        const data = this._getData();
        const totalMinutes = Math.round((data.totalTimeSeconds || 0) / 60);
        const avgSessionMin = data.totalSessions > 0 ? Math.round(totalMinutes / data.totalSessions) : 0;

        // Last 7 days visits
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last7.push({ date: dateStr, views: data.dailyVisits[dateStr] || 0 });
        }

        console.log('%c📊 GrammarHub Analytics Report', 'font-size:16px; font-weight:bold; color:#E8573A;');
        console.log('');
        console.log(`First visit: ${data.firstVisit?.split('T')[0] || 'Unknown'}`);
        console.log(`Last visit: ${data.lastVisit?.split('T')[0] || 'Unknown'}`);
        console.log(`Total sessions: ${data.totalSessions}`);
        console.log(`Total time: ${totalMinutes} minutes (avg ${avgSessionMin} min/session)`);
        console.log('');
        console.log('%cPage Views:', 'font-weight:bold;');
        console.table(data.pageViews);
        console.log('');
        console.log('%cLast 7 Days:', 'font-weight:bold;');
        console.table(last7);
        console.log('');
        if (Object.keys(data.actions).length > 0) {
            console.log('%cActions:', 'font-weight:bold;');
            console.table(data.actions);
        }

        return data;
    },

    /**
     * Reset all analytics data
     */
    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('Analytics data cleared.');
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => Analytics.init());

// Track specific actions on relevant pages
document.addEventListener('DOMContentLoaded', () => {
    // Track unit loads on grammar page
    const unitTitle = document.getElementById('nav-unit-title');
    if (unitTitle) {
        const observer = new MutationObserver(() => {
            Analytics.trackAction('unit_viewed');
        });
        observer.observe(unitTitle, { childList: true, characterData: true, subtree: true });
    }

    // Track exercise checks
    const origCheckAnswers = window.checkAnswers;
    if (typeof origCheckAnswers === 'function') {
        window.checkAnswers = function() {
            Analytics.trackAction('exercises_checked');
            return origCheckAnswers.apply(this, arguments);
        };
    }
});

window.Analytics = Analytics;
