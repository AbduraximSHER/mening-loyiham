/**
 * ui-extras.js
 * Shared behavior for the new pages:
 *   - Theme toggle (dark / light) with localStorage persistence
 *   - Command-palette style search modal (works with GrammarLoader or
 *     vocabularyUnits, whichever is on the page)
 *   - Bookmark button factory + bookmark list renderer
 *
 * The initial theme attribute MUST be set by an inline script in <head>
 * before CSS paints — see the <head> of every page. This module handles
 * only the click-to-toggle behavior.
 */
(function () {
  const root = document.documentElement;

  // ─── theme ───────────────────────────────────────
  const Theme = {
    get() { return root.getAttribute('data-theme') || 'light'; },
    set(t) {
      root.setAttribute('data-theme', t);
      try { localStorage.setItem('gh_theme', t); } catch {}
    },
    toggle() { this.set(this.get() === 'dark' ? 'light' : 'dark'); },
  };
  window.Theme = Theme;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="toggle-theme"]');
    if (!btn) return;
    e.preventDefault();
    Theme.toggle();
  });

  // ─── search modal ────────────────────────────────
  const Search = {
    overlay: null,
    input: null,
    resultsEl: null,
    activeIdx: 0,
    results: [],

    open() {
      if (!this.overlay) return;
      this.overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => this.input?.focus(), 20);
      // Lazy-load vocabulary data on first search open (saves 694KB on initial page load)
      if (!window._vocabLoadStarted && typeof window.vocabularyUnits === 'undefined') {
        window._vocabLoadStarted = true;
        const script = document.createElement('script');
        script.src = 'vocabulary-data.js?v=5';
        script.onload = () => {
          try { if (typeof vocabularyUnits !== 'undefined') window.vocabularyUnits = vocabularyUnits; }
          catch(e) {}
          this.render(this.input ? this.input.value : '');
        };
        document.head.appendChild(script);
      }
      this.render('');
    },
    close() {
      if (!this.overlay) return;
      this.overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      if (this.input) this.input.value = '';
    },
    toggle() {
      if (!this.overlay) return;
      this.overlay.classList.contains('is-open') ? this.close() : this.open();
    },

    _source() {
      // Prefer the grammar index if available; also merge vocab
      const out = [];
      if (window.GrammarLoader && window.GrammarLoader.getAllTitles) {
        const titles = window.GrammarLoader.getAllTitles() || [];
        titles.forEach(t => out.push({
          id: t.id,
          title: t.title,
          kind: 'Grammar',
          href: 'advanced-grammar.html#unit-' + t.id,
        }));
      }
      if (Array.isArray(window.vocabularyUnits)) {
        window.vocabularyUnits.forEach(u => out.push({
          id: u.id,
          title: u.title,
          kind: 'Vocabulary',
          href: 'advanced-vocabulary.html#unit-' + u.id,
        }));
      }
      return out;
    },

    render(query) {
      const q = query.trim().toLowerCase();
      const all = this._source();
      let list;
      if (!q) {
        list = all.slice(0, 20);
      } else {
        // Simple fuzzy-ish: split tokens and match each
        const tokens = q.split(/\s+/).filter(Boolean);
        list = all
          .map(item => {
            const hay = (item.title + ' unit ' + item.id).toLowerCase();
            const hit = tokens.every(t => hay.includes(t));
            if (!hit) return null;
            // Score: earlier match = better
            const score = tokens.reduce(
              (s, t) => s + (hay.indexOf(t) === -1 ? 999 : hay.indexOf(t)),
              0
            );
            return { ...item, _score: score };
          })
          .filter(Boolean)
          .sort((a, b) => a._score - b._score)
          .slice(0, 30);
      }
      this.results = list;
      this.activeIdx = 0;

      if (!this.resultsEl) return;
      if (list.length === 0) {
        this.resultsEl.innerHTML = `<div class="search-empty">No matches. Try a different word.</div>`;
        return;
      }

      // Group by kind
      const groups = {};
      list.forEach(r => {
        if (!groups[r.kind]) groups[r.kind] = [];
        groups[r.kind].push(r);
      });

      const highlight = (text, tokens) => {
        if (!tokens.length) return escapeHtml(text);
        let out = escapeHtml(text);
        tokens.forEach(t => {
          const re = new RegExp(
            '(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')',
            'ig'
          );
          out = out.replace(re, '<mark>$1</mark>');
        });
        return out;
      };
      const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

      this.resultsEl.innerHTML = Object.entries(groups).map(([kind, items]) => `
        <div class="search-section-label">${kind}</div>
        ${items.map((r, globalIdx) => `
          <a class="search-result" href="${r.href}" data-idx="${list.indexOf(r)}">
            <div class="search-result__num">${r.id}</div>
            <div class="search-result__body">
              <div class="search-result__title">${highlight(r.title, tokens)}</div>
              <div class="search-result__meta">${kind} · Unit ${r.id}</div>
            </div>
          </a>
        `).join('')}
      `).join('');

      this._highlightActive();
    },

    _highlightActive() {
      if (!this.resultsEl) return;
      [...this.resultsEl.querySelectorAll('.search-result')].forEach((el, i) => {
        el.classList.toggle('is-active', i === this.activeIdx);
      });
      const active = this.resultsEl.querySelector('.search-result.is-active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    },

    move(delta) {
      const total = this.resultsEl
        ? this.resultsEl.querySelectorAll('.search-result').length
        : 0;
      if (total === 0) return;
      this.activeIdx = (this.activeIdx + delta + total) % total;
      this._highlightActive();
    },

    enter() {
      const active = this.resultsEl?.querySelector('.search-result.is-active');
      if (active) {
        active.click();
      }
    },

    init() {
      this.overlay = document.getElementById('search-overlay');
      if (!this.overlay) return;
      this.input = this.overlay.querySelector('.search-input');
      this.resultsEl = this.overlay.querySelector('.search-results');

      this.input.addEventListener('input', () => this.render(this.input.value));
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); this.enter(); }
        else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      });

      // Close on overlay click (but not when clicking the modal itself)
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });

      // Global open trigger
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="open-search"]')) {
          e.preventDefault();
          this.open();
        }
      });

      // Keyboard shortcut: Cmd/Ctrl+K
      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.toggle();
        }
      });
    },
  };
  window.SearchUI = Search;

  // ─── bookmarks UI ────────────────────────────────
  const BookmarkUI = {
    /**
     * Toggle a bookmark. Returns new is-bookmarked state (true/false).
     */
    toggle({ text, unitId, unitTitle }) {
      if (!window.Bookmarks) return false;
      const all = window.Bookmarks.getAll();
      const existingIdx = all.findIndex(b => b.text === text && b.unitId === unitId);
      if (existingIdx !== -1) {
        window.Bookmarks.remove(existingIdx);
        return false;
      }
      window.Bookmarks.save({ text, unitId, unitTitle });
      return true;
    },

    isBookmarked({ text, unitId }) {
      if (!window.Bookmarks) return false;
      return window.Bookmarks
        .getAll()
        .some(b => b.text === text && b.unitId === unitId);
    },

    /** Returns the HTML for a bookmark button */
    buttonHtml(bookmarked) {
      const iconFilled = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z"/></svg>`;
      const iconOutline = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v18l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>`;
      return `<button class="bookmark-btn ${bookmarked ? 'is-active' : ''}" data-action="bookmark" aria-label="${bookmarked ? 'Remove bookmark' : 'Bookmark this'}" title="${bookmarked ? 'Remove bookmark' : 'Bookmark this'}">
        ${bookmarked ? iconFilled : iconOutline}
      </button>`;
    },

    /** Delegated click handler — call once per page. */
    bindClicks(container) {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="bookmark"]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('[data-bookmark-text]');
        if (!card) return;
        const text = card.getAttribute('data-bookmark-text');
        const unitId = parseInt(card.getAttribute('data-bookmark-unit'), 10);
        const unitTitle = card.getAttribute('data-bookmark-title') || '';
        const nowOn = this.toggle({ text, unitId, unitTitle });
        btn.outerHTML = this.buttonHtml(nowOn);
        if (nowOn && window.Toast) {
          try { Toast.success('Bookmarked', 1500); } catch {}
        }
      });
    },

    /** Render the bookmarks list into a container */
    renderPanel(container) {
      if (!container) return;
      const all = window.Bookmarks ? window.Bookmarks.getAll() : [];
      if (all.length === 0) {
        container.innerHTML = `<div class="bookmark-empty">
          <div style="font-size: 1.75rem; margin-bottom: 0.5rem;">🔖</div>
          <div>Nothing saved yet.</div>
          <div style="margin-top: 0.25rem;">Tap the bookmark icon on any question to save it.</div>
        </div>`;
        return;
      }
      container.innerHTML = `<div class="bookmark-list">
        ${all.map((b, i) => `
          <div class="bookmark-item">
            <div class="bookmark-item__text">"${escapeHtml(b.text)}"</div>
            <div class="bookmark-item__meta">
              <a href="advanced-grammar.html#unit-${b.unitId}">
                Unit ${b.unitId}${b.unitTitle ? ' · ' + escapeHtml(b.unitTitle) : ''}
              </a>
              <button class="bookmark-item__remove" data-remove-bookmark="${i}" aria-label="Remove">×</button>
            </div>
          </div>
        `).join('')}
      </div>`;

      container.querySelectorAll('[data-remove-bookmark]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-remove-bookmark'), 10);
          if (window.Bookmarks) window.Bookmarks.remove(idx);
          this.renderPanel(container);
        });
      });
    },
  };
  window.BookmarkUI = BookmarkUI;

  // ─── utils ───────────────────────────────────────
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
    );
  }

  // ─── init ────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Search.init());
  } else {
    Search.init();
  }
})();
