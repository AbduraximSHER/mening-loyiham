/**
 * gamification.js
 * Handles core logic for points, streaks, badges, and smart notifications.
 * Uses localStorage for progress tracking.
 */

const Gamification = {
    LOCAL_DATA_PREFIX: "em_user_data_",

    /**
     * Get or create a stable anonymous user ID for localStorage-based tracking.
     * Falls back to a generated ID if no auth system is active.
     */
    _getUserId() {
        // Check if a Supabase/auth user is available globally
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) {
            return currentUser.id;
        }
        // Fallback: generate and persist an anonymous ID
        let anonId = localStorage.getItem('em_anon_user_id');
        if (!anonId) {
            anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('em_anon_user_id', anonId);
        }
        return anonId;
    },

    getUserData() {
        const userId = this._getUserId();
        if (!userId) return null;
        const lsKey = this.LOCAL_DATA_PREFIX + userId;
        try {
            const raw = localStorage.getItem(lsKey);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to parse gamification data:', e);
        }
        // Initialize default data structure
        const defaultData = {
            points: 0,
            streak: { current: 0, lastStudyDate: null },
            badges: [],
            timeline: []
        };
        this.saveUserData(defaultData);
        return defaultData;
    },

    saveUserData(data) {
        const userId = this._getUserId();
        if (!userId) return;
        const lsKey = this.LOCAL_DATA_PREFIX + userId;
        try {
            localStorage.setItem(lsKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save gamification data:', e);
        }
    },

    /**
     * Track and update the daily learning streak.
     * Should be called when the dashboard loads or when a user logs in for the day.
     */
    trackStreak() {
        const extData = this.getUserData();
        if (!extData) return;

        // Guard first, then read — avoids relying on ?. to paper over an uninitialised field.
        if (!extData.streak) {
            extData.streak = { current: 0, lastStudyDate: null };
        }

        const today = new Date().setHours(0, 0, 0, 0);
        const lastStudy = extData.streak.lastStudyDate
            ? new Date(extData.streak.lastStudyDate).setHours(0, 0, 0, 0)
            : null;

        if (!lastStudy) {
            extData.streak.current = 1;
            extData.streak.lastStudyDate = new Date().toISOString();
            // Save streak state first — no addPoints here so order doesn't matter,
            // but keeping the pattern consistent.
            this.saveUserData(extData);
            this.showNotification('Welcome to gamified learning!', 'Start a streak by learning tomorrow.', 'emoji_events', 0);
        } else {
            const diffTime = Math.abs(today - lastStudy);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                extData.streak.current += 1;
                extData.streak.lastStudyDate = new Date().toISOString();
                // IMPORTANT: save streak BEFORE addPoints. addPoints does its own
                // getUserData→saveUserData internally. If we saved after, it would
                // read the stale extData (points=0) and clobber the +10 just added.
                this.saveUserData(extData);
                this.showNotification('Streak Maintained!', `You are on a ${extData.streak.current}-day streak! Keep going.`, 'local_fire_department', 10);
                this.addPoints(10, 'daily streak');
            } else if (diffDays > 1) {
                extData.streak.current = 1;
                extData.streak.lastStudyDate = new Date().toISOString();
                this.saveUserData(extData);
                this.showNotification('Welcome Back!', "Let's start a new learning streak today.", 'waving_hand', 5);
                this.addPoints(5, 'returning');
            }
            // diffDays === 0: same day revisit — streak unchanged, no save needed.
        }

        this.evaluateBadges();
    },

    /**
     * Add points to the user's progress and display a toast.
     */
    addPoints(amount, reason = null) {
        const extData = this.getUserData();
        if (!extData) return;

        extData.points = (extData.points || 0) + amount;

        // Add to timeline
        if (!extData.timeline) extData.timeline = [];
        extData.timeline.unshift({
            action: reason ? `+${amount} pts for ${reason}` : `+${amount} pts`,
            date: new Date().toISOString()
        });
        if (extData.timeline.length > 20) extData.timeline.length = 20;

        this.saveUserData(extData);

        if (reason) {
            this.showNotification('Points Earned!', `+${amount} pts for ${reason}`, 'stars');
        }
    },

    /**
     * Evaluate unlock conditions for badges based on current stats.
     * @param {Object} sessionStats - Optional stats from an active session
     */
    evaluateBadges(sessionStats = null) {
        const extData = this.getUserData();
        if (!extData) return;

        // Count completed units from localStorage progress
        let completedCount = 0;
        try {
            const progress = JSON.parse(localStorage.getItem('grammar_progress') || '{}');
            if (progress.completedUnits) {
                completedCount = progress.completedUnits.length;
            }
        } catch (e) {
            // Ignore parse errors
        }

        const streak = extData.streak?.current || 0;
        const currentBadges = extData.badges || [];
        const newBadges = [];

        const badgeDefinitions = [
            { id: 'first_win', name: 'First Step', icon: 'directions_walk', condition: () => completedCount >= 1 },
            { id: 'master_10', name: 'Dedicated', icon: 'stars', condition: () => completedCount >= 10 },
            { id: 'grammar_guru', name: 'Halfway There', icon: 'school', condition: () => completedCount >= 50 },
            { id: 'streak_3', name: '3-Day Streak', icon: 'local_fire_department', condition: () => streak >= 3 },
            { id: 'streak_30', name: 'Committed Learner', icon: 'calendar_today', condition: () => streak >= 30 },
            { id: 'night_owl', name: 'Night Owl', icon: 'bedtime', condition: () => (new Date().getHours() >= 22 || new Date().getHours() <= 4) && completedCount >= 1 }
        ];

        // Session-based badges: triggered by unit completion score recorded in progress
        try {
            const prog = JSON.parse(localStorage.getItem('grammar_progress') || '{}');
            const units = prog.completedUnits || [];
            const perfectUnits = units.filter(u => u.score === 100).length;
            const highScoreUnits = units.filter(u => u.score >= 90).length;
            badgeDefinitions.push(
                { id: 'perfect_unit',  name: 'Perfect Unit',  icon: 'psychology',
                  condition: () => perfectUnits >= 1 },
                { id: 'high_achiever', name: 'High Achiever',  icon: 'bolt',
                  condition: () => highScoreUnits >= 10 }
            );
        } catch(e) {}

        badgeDefinitions.forEach(badge => {
            if (!currentBadges.some(b => b.id === badge.id) && badge.condition()) {
                newBadges.push({ id: badge.id, name: badge.name, icon: badge.icon, unlockedAt: new Date().toISOString() });
                this.showNotification('Badge Unlocked!', `You earned the "${badge.name}" badge!`, badge.icon, 50);
                this.addPoints(50, `unlocking "${badge.name}" badge`);
            }
        });

        if (newBadges.length > 0) {
            // Re-fetch after addPoints() calls so we don't overwrite the +50 pts
            // that addPoints() already saved into localStorage for each badge.
            const freshData = this.getUserData();
            freshData.badges = [...(freshData.badges || []), ...newBadges];

            if (!freshData.timeline) freshData.timeline = [];
            newBadges.forEach(b => {
                freshData.timeline.unshift({
                    action: `Unlocked badge: ${b.name}`,
                    date: new Date().toISOString()
                });
            });
            if (freshData.timeline.length > 20) freshData.timeline.length = 20;

            this.saveUserData(freshData);
        }
    },

    /**
     * SRS: Calculate which units need urgent review based on time decay or poor score.
     * @returns {Array} Array of unit IDs needing review.
     */
    getUnitsNeedingReview() {
        try {
            const progress = JSON.parse(localStorage.getItem('grammar_progress') || '{}');
            if (!progress.completedUnits || !Array.isArray(progress.completedUnits)) return [];

            const reviewNeeded = [];
            const now = Date.now();
            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

            progress.completedUnits.forEach(unit => {
                if (typeof unit !== 'object') return;

                if (unit.score !== undefined && unit.score < 70) {
                    reviewNeeded.push(unit.id);
                    return;
                }

                if (unit.date) {
                    const completedDate = new Date(unit.date).getTime();
                    if (now - completedDate > SEVEN_DAYS_MS) {
                        reviewNeeded.push(unit.id);
                    }
                }
            });

            return reviewNeeded;
        } catch (e) {
            return [];
        }
    },

    /**
     * Display an immersive, glassmorphism-styled notification toast.
     */
    showNotification(title, message, iconName = 'notifications', points = 0) {
        let container = document.getElementById('gamification-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'gamification-toast-container';
            container.className = 'gh-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'gh-toast';

        let pointsHTML = '';
        if (points > 0) {
            pointsHTML = `<div class="gh-toast__points">+${points} pts</div>`;
        }

        toast.innerHTML = `
            <div class="gh-toast__icon">
                <i class="material-icons">${iconName}</i>
            </div>
            <div class="gh-toast__body">
                <h4 class="gh-toast__title">${title}</h4>
                <p class="gh-toast__msg">${message}</p>
                ${pointsHTML}
            </div>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('gh-toast--visible');
        });

        setTimeout(() => {
            toast.classList.remove('gh-toast--visible');
            setTimeout(() => {
                if (container.contains(toast)) container.removeChild(toast);
            }, 400);
        }, 5000);
    },

    startSessionTimer() {
        this.sessionStartTime = new Date();
    },

    getSessionTimeMinutes() {
        if (!this.sessionStartTime) return 0;
        return (new Date() - this.sessionStartTime) / 1000 / 60;
    },

    getSessionTimeSeconds() {
        if (!this.sessionStartTime) return 0;
        return (new Date() - this.sessionStartTime) / 1000;
    }
};

window.Gamification = Gamification;
