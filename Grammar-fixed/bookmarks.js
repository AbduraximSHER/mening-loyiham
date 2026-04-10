/**
 * bookmarks.js — Save & review example sentences
 * Students can click a bookmark icon on any example to save it.
 * Bookmarks are stored in localStorage and viewable in a panel.
 */

const Bookmarks = {
    STORAGE_KEY: 'em_bookmarks',

    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch { return []; }
    },

    save(bookmark) {
        const all = this.getAll();
        // Avoid duplicates
        const exists = all.find(b => b.text === bookmark.text && b.unitId === bookmark.unitId);
        if (exists) return false;

        all.unshift({
            text: bookmark.text,
            unitId: bookmark.unitId,
            unitTitle: bookmark.unitTitle,
            savedAt: new Date().toISOString()
        });

        // Keep max 100 bookmarks
        if (all.length > 100) all.pop();

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
        return true;
    },

    remove(index) {
        const all = this.getAll();
        all.splice(index, 1);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    },

    /**
     * Inject bookmark buttons into all example sentences
     */
    init() {
        const examples = document.querySelectorAll('.web-example');
        if (examples.length === 0) return;

        // Get current unit info
        const unitTitle = document.getElementById('nav-unit-title')?.textContent || '';
        const unitIdText = document.getElementById('nav-unit-id')?.textContent || '';
        const unitId = parseInt(unitIdText.replace(/\D/g, '')) || 0;

        examples.forEach(example => {
            // Bookmark buttons on example sentences are disabled in this version.
            // Remove the early return below and the guard above to re-enable.
            /* istanbul ignore next */
            return;
            // Skip if already has bookmark button
            if (example.querySelector('.bookmark-btn')) return;

            const span = example.querySelector('span');
            if (!span) return;

            const btn = document.createElement('button');
            btn.className = 'bookmark-btn';
            btn.title = 'Save this sentence';
            btn.innerHTML = '🔖';
            btn.style.cssText = `
                background: none;
                border: none;
                cursor: pointer;
                font-size: 1rem;
                padding: 2px 4px;
                opacity: 0.4;
                transition: opacity 0.2s, transform 0.2s;
                flex-shrink: 0;
            `;

            // Check if already bookmarked
            const text = span.textContent.trim();
            const all = this.getAll();
            if (all.find(b => b.text === text)) {
                btn.style.opacity = '1';
                btn.title = 'Bookmarked!';
            }

            btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; btn.style.transform = 'scale(1.2)'; });
            btn.addEventListener('mouseleave', () => {
                const isBookmarked = this.getAll().find(b => b.text === text);
                btn.style.opacity = isBookmarked ? '1' : '0.4';
                btn.style.transform = 'scale(1)';
            });

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const saved = this.save({
                    text: text,
                    unitId: unitId,
                    unitTitle: unitTitle
                });

                if (saved) {
                    btn.style.opacity = '1';
                    btn.innerHTML = '✅';
                    btn.title = 'Saved!';
                    setTimeout(() => { btn.innerHTML = '🔖'; }, 1500);
                    if (typeof Toast !== 'undefined') Toast.success('Sentence bookmarked!', 2000);
                } else {
                    if (typeof Toast !== 'undefined') Toast.info('Already bookmarked', 2000);
                }
            });

            example.appendChild(btn);
        });
    },

    /**
     * Render bookmarks panel (for dashboard or a modal)
     */
    renderPanel(container) {
        if (!container) return;
        const bookmarks = this.getAll();

        if (bookmarks.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:2rem; color:var(--text-light, #64748b);">
                    <div style="font-size:2rem; margin-bottom:0.5rem;">🔖</div>
                    <p style="margin:0;">No bookmarks yet. Click the 🔖 icon on any example sentence in a grammar lesson to save it here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h3 style="margin:0; font-size:1.1rem; color:var(--text-heading, #1e293b);">
                    🔖 My Bookmarks <span style="font-size:0.85rem; color:var(--text-light, #64748b); font-weight:400;">(${bookmarks.length})</span>
                </h3>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
                ${bookmarks.map((bm, i) => `
                    <div style="
                        padding:0.75rem 1rem;
                        background:var(--card-bg, white);
                        border:1px solid var(--border, #e2e8f0);
                        border-radius:10px;
                        border-left:3px solid var(--primary, #E8573A);
                    ">
                        <div style="font-size:0.9rem; color:var(--text-main, #334155); font-style:italic; margin-bottom:0.4rem;">
                            "${bm.text}"
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <a href="advanced-grammar.html?unit=${bm.unitId}" style="
                                font-size:0.75rem; color:var(--primary, #E8573A); text-decoration:none;
                            ">Unit ${bm.unitId}: ${bm.unitTitle}</a>
                            <button onclick="Bookmarks.removeAndRerender(${i}, this)" style="
                                background:none; border:none; cursor:pointer; font-size:0.8rem;
                                color:var(--text-light, #64748b); padding:2px 6px;
                            " title="Remove bookmark">×</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    removeAndRerender(index, btn) {
        this.remove(index);
        const container = btn.closest('#bookmarks-container') || btn.closest('[id*="bookmark"]');
        if (container) this.renderPanel(container);
        if (typeof Toast !== 'undefined') Toast.info('Bookmark removed', 2000);
    }
};

// Auto-init on grammar pages
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for content to render
    setTimeout(() => Bookmarks.init(), 1000);
    
    // Re-init when unit changes (MutationObserver on theory content)
    const theoryContent = document.querySelector('.theory-content');
    if (theoryContent) {
        const observer = new MutationObserver(() => {
            setTimeout(() => Bookmarks.init(), 300);
        });
        observer.observe(theoryContent, { childList: true, subtree: true });
    }
});

window.Bookmarks = Bookmarks;
