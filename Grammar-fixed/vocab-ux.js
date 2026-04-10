// Vocabulary UX Improvements v1.0
(function(){
'use strict';

// Scroll to top when unit changes
const _loadUnit = window.loadUnit;
if (_loadUnit) {
    window.loadUnit = function(id) {
        _loadUnit(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Update top nav title
        const nav = document.getElementById('top-nav-title');
        if (nav) nav.textContent = 'Unit ' + id;
    };
}

// Swipe between units on mobile
let touchStartX = 0;
let touchEndX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    // Only trigger on horizontal swipes > 80px and not inside scrollable areas
    if (Math.abs(diff) > 80 && e.target.closest('.match-container, .options-grid, textarea, input') === null) {
        if (diff > 0 && typeof changeUnit === 'function') changeUnit(1);  // Swipe left = next
        else if (diff < 0 && typeof changeUnit === 'function') changeUnit(-1);  // Swipe right = prev
    }
}, { passive: true });

// Auto-switch to Practice tab after reading theory for 30s
let theoryTimer = null;
const _switchMobile = window.switchMobilePanel;
if (_switchMobile) {
    window.switchMobilePanel = function(panel) {
        _switchMobile(panel);
        if (panel === 'theory') {
            clearTimeout(theoryTimer);
            // Don't auto-switch, just show a gentle nudge after 30s
            theoryTimer = setTimeout(() => {
                const practiceTab = document.querySelector('[data-panel="practice"]');
                if (practiceTab && !practiceTab.classList.contains('active')) {
                    practiceTab.style.animation = 'pulse 1s ease 3';
                }
            }, 30000);
        }
    };
}

// Add keyboard navigation hint
document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' && typeof changeUnit === 'function') changeUnit(1);
    if (e.key === 'ArrowLeft' && typeof changeUnit === 'function') changeUnit(-1);
    if (e.key === 'Enter') {
        const practiceTab = document.querySelector('[data-panel="practice"]');
        if (practiceTab && !practiceTab.classList.contains('active')) {
            window.switchMobilePanel?.('practice');
        }
    }
});

// Add subtle haptic feedback on correct/wrong (for supported browsers)
const _origSelect = window.selectOption;
if (_origSelect) {
    window.selectOption = function(q, o) {
        _origSelect(q, o);
        try {
            const unit = vocabularyUnits[currentUnitIndex];
            const correct = o === unit.exercises[q].correctAnswer;
            if (navigator.vibrate) {
                navigator.vibrate(correct ? [50] : [30, 50, 30]);
            }
        } catch(e) {}
    };
}

// Show exercise count in Practice tab
function updatePracticeTabCount() {
    const tab = document.querySelector('[data-panel="practice"]');
    if (tab && typeof vocabularyUnits !== 'undefined' && typeof currentUnitIndex !== 'undefined') {
        const unit = vocabularyUnits[currentUnitIndex];
        if (unit) {
            tab.innerHTML = '<i class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px;">touch_app</i> Practice (' + unit.exercises.length + ')';
        }
    }
}

// Run on unit load
const _renderUnit = window.renderUnit;
if (_renderUnit) {
    window.renderUnit = function(i) {
        _renderUnit(i);
        setTimeout(updatePracticeTabCount, 100);
    };
}

// Initialize
setTimeout(updatePracticeTabCount, 1000);

})();
