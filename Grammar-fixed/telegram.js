// ═══════════════════════════════════════════════
// TELEGRAM MINI APP INTEGRATION
// ═══════════════════════════════════════════════
(function() {
    'use strict';

    const tg = window.Telegram?.WebApp;
    if (!tg) return; // Not running inside Telegram

    // ─── INIT ───
    tg.ready();
    tg.expand(); // Fullscreen

    const user = tg.initDataUnsafe?.user;
    const isTelegram = true;
    window.isTelegram = true;
    window.tgUser = user;

    console.log('[TG] Mini App initialized', user?.first_name || 'Anonymous');

    // ─── THEME ADAPTATION ───
    function applyTelegramTheme() {
        const tp = tg.themeParams;
        if (!tp) return;

        const style = document.createElement('style');
        style.id = 'tg-theme';
        style.textContent = `
            :root {
                --tg-bg: ${tp.bg_color || '#ffffff'};
                --tg-text: ${tp.text_color || '#000000'};
                --tg-hint: ${tp.hint_color || '#999999'};
                --tg-link: ${tp.link_color || '#2678b6'};
                --tg-btn: ${tp.button_color || '#3390ec'};
                --tg-btn-text: ${tp.button_text_color || '#ffffff'};
                --tg-secondary-bg: ${tp.secondary_bg_color || '#f0f0f0'};
            }
            body.tg-mode {
                background: var(--tg-bg) !important;
                color: var(--tg-text) !important;
            }
            body.tg-mode .exercise-card {
                background: var(--tg-secondary-bg) !important;
                border-color: ${tp.hint_color || '#e0e0e0'} !important;
            }
            body.tg-mode .option-btn {
                background: var(--tg-bg) !important;
                border-color: ${tp.hint_color || '#e0e0e0'} !important;
                color: var(--tg-text) !important;
            }
            body.tg-mode #smart-bar {
                background: var(--tg-bg) !important;
                border-color: ${tp.hint_color || '#e0e0e0'} !important;
            }
            body.tg-mode .sb-btn .sb-l {
                color: var(--tg-hint) !important;
            }
            body.tg-mode strong {
                color: var(--tg-link) !important;
            }
            body.tg-mode a {
                color: var(--tg-link) !important;
            }
            /* Hide elements not needed in Telegram */
            body.tg-mode .site-header,
            body.tg-mode .site-nav,
            body.tg-mode footer {
                display: none !important;
            }
            /* Telegram-specific padding */
            body.tg-mode {
                padding-top: 0 !important;
            }
            /* Smooth Telegram MainButton area */
            body.tg-mode {
                padding-bottom: 80px !important;
            }
        `;
        document.head.appendChild(style);
        document.body.classList.add('tg-mode');
    }

    // ─── HAPTIC FEEDBACK ───
    const haptic = tg.HapticFeedback;
    
    // Override selectOption to add haptics
    const _origSelect = window.selectOption;
    if (_origSelect) {
        window.selectOption = function(qIdx, optIdx) {
            const unit = vocabularyUnits[currentUnitIndex];
            const ex = unit.exercises[qIdx];
            const correct = optIdx === ex.correctAnswer;
            
            if (correct) {
                haptic?.notificationOccurred('success');
            } else {
                haptic?.notificationOccurred('error');
            }
            
            _origSelect(qIdx, optIdx);
        };
    }

    // Add haptics to fill check
    const _origFill = window.checkFill;
    if (_origFill) {
        window.checkFill = function(qIdx) {
            haptic?.impactOccurred('light');
            _origFill(qIdx);
        };
    }

    // ─── BACK BUTTON ───
    tg.BackButton.onClick(function() {
        // If modal is open, close it
        const modal = document.getElementById('fm');
        if (modal && modal.style.display === 'block') {
            window.closeModal();
            return;
        }
        // Otherwise go to previous unit
        if (typeof changeUnit === 'function') {
            changeUnit(-1);
        }
    });

    // Show back button when navigating units
    const _origLoadUnit = window.loadUnit;
    if (_origLoadUnit) {
        window.loadUnit = function(id) {
            _origLoadUnit(id);
            if (id > 1) {
                tg.BackButton.show();
            } else {
                tg.BackButton.hide();
            }
        };
    }

    // ─── MAIN BUTTON: Daily Practice ───
    tg.MainButton.setText('⚡ Kunlik mashq');
    tg.MainButton.color = tg.themeParams?.button_color || '#6366F1';
    tg.MainButton.textColor = tg.themeParams?.button_text_color || '#ffffff';
    tg.MainButton.onClick(function() {
        haptic?.impactOccurred('medium');
        if (typeof dailyPractice === 'function') {
            dailyPractice();
        }
    });
    tg.MainButton.show();

    // ─── PERSONALIZED GREETING ───
    function showTelegramGreeting() {
        if (!user) return;
        
        const name = user.first_name || 'Foydalanuvchi';
        const streak = JSON.parse(localStorage.getItem('v_streak') || '{}');
        const xp = JSON.parse(localStorage.getItem('v_xp') || '0');
        
        // Add greeting banner at top
        const banner = document.createElement('div');
        banner.id = 'tg-greeting';
        banner.style.cssText = 'padding:12px 16px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;display:flex;justify-content:space-between;align-items:center;';
        banner.innerHTML = `
            <div>
                <div style="font-weight:700;font-size:1rem;">Salom, ${name}! 👋</div>
                <div style="font-size:0.75rem;opacity:0.8;">🔥 ${streak.current || 0} kun · ⭐ ${xp} XP</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:0.7rem;opacity:0.7;">Telegram Mini App</div>
            </div>
        `;
        
        document.body.insertBefore(banner, document.body.firstChild);
    }

    // ─── SHARE via Telegram ───
    window.shareViaTelegram = function() {
        const p = JSON.parse(localStorage.getItem('v_progress') || '{}');
        let tc = 0, ta = 0;
        Object.values(p).forEach(d => { tc += d.correct; ta += d.answered; });
        const acc = ta > 0 ? Math.round(tc / ta * 100) : 0;
        
        const text = `🎓 Men English Vocabulary Mini App da ${ta} ta mashq yechdim! Aniqlik: ${acc}%\n\nSen ham sinab ko'r:`;
        const url = 'https://t.me/abgrammar_bot/vocab'; // Replace with actual bot username
        
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    };

    // Override share function for Telegram
    window.shareResult = function() {
        if (window.isTelegram) {
            shareViaTelegram();
        }
    };

    // ─── CLOUD STORAGE (Telegram's built-in) ───
    async function syncToTelegramCloud() {
        if (!tg.CloudStorage) return;
        
        try {
            const progress = localStorage.getItem('v_progress');
            const xp = localStorage.getItem('v_xp');
            const streak = localStorage.getItem('v_streak');
            
            if (progress) await tg.CloudStorage.setItem('progress', progress);
            if (xp) await tg.CloudStorage.setItem('xp', xp);
            if (streak) await tg.CloudStorage.setItem('streak', streak);
        } catch(e) {
            console.log('[TG] Cloud sync error:', e);
        }
    }

    async function restoreFromTelegramCloud() {
        if (!tg.CloudStorage) return;
        
        try {
            const keys = ['progress', 'xp', 'streak'];
            tg.CloudStorage.getItems(keys, function(err, values) {
                if (err) return;
                if (values.progress && !localStorage.getItem('v_progress')) {
                    localStorage.setItem('v_progress', values.progress);
                }
                if (values.xp && !localStorage.getItem('v_xp')) {
                    localStorage.setItem('v_xp', values.xp);
                }
                if (values.streak && !localStorage.getItem('v_streak')) {
                    localStorage.setItem('v_streak', values.streak);
                }
            });
        } catch(e) {
            console.log('[TG] Cloud restore error:', e);
        }
    }

    // Auto-sync every 30 seconds
    setInterval(syncToTelegramCloud, 30000);

    // ─── INITIALIZE ───
    function initTelegram() {
        applyTelegramTheme();
        restoreFromTelegramCloud();
        
        // Wait for DOM
        setTimeout(() => {
            showTelegramGreeting();
        }, 500);
        
        // Listen for theme changes
        tg.onEvent('themeChanged', applyTelegramTheme);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTelegram);
    } else {
        initTelegram();
    }

})();
