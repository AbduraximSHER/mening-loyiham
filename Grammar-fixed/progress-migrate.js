/**
 * progress-migrate.js
 * Normalizes localStorage['grammar_progress'] into a consistent shape so both
 * old page logic AND gamification.js read it correctly.
 *
 * Old format (legacy): { completedUnits: [1, 2, 3], scores: {1: 90} }
 * New format:          { completedUnits: [{id, score, date}], scores: {1: 90} }
 *
 * Exposes:
 *   Progress.get()                    -> normalized object
 *   Progress.save(p)                  -> writes back
 *   Progress.markComplete(id, score)  -> upserts a completion
 *   Progress.isCompleted(id)          -> bool
 *   Progress.getScore(id)             -> number|null
 *   Progress.stats()                  -> { total, completed, avgScore, lastDate }
 */
(function () {
  const KEY = 'grammar_progress';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }

  function normalize(p) {
    if (!p || typeof p !== 'object') p = {};
    if (!p.scores || typeof p.scores !== 'object') p.scores = {};
    if (!Array.isArray(p.completedUnits)) p.completedUnits = [];

    // Convert legacy number entries into objects
    p.completedUnits = p.completedUnits
      .map(entry => {
        if (typeof entry === 'number') {
          return { id: entry, score: p.scores[entry] ?? null, date: null };
        }
        if (entry && typeof entry === 'object' && typeof entry.id === 'number') {
          return {
            id: entry.id,
            score: entry.score ?? p.scores[entry.id] ?? null,
            date: entry.date || null,
          };
        }
        return null;
      })
      .filter(Boolean);

    // De-dupe by id, keep latest
    const seen = new Map();
    for (const e of p.completedUnits) seen.set(e.id, e);
    p.completedUnits = [...seen.values()];

    return p;
  }

  const Progress = {
    get() {
      const p = normalize(read());
      return p;
    },
    save(p) {
      try { localStorage.setItem(KEY, JSON.stringify(normalize(p))); }
      catch (e) { console.warn('[progress] save failed', e); }
    },
    markComplete(id, score) {
      id = parseInt(id, 10);
      if (!id) return;
      const p = this.get();
      const existing = p.completedUnits.find(u => u.id === id);
      const now = new Date().toISOString();
      if (existing) {
        if (typeof score === 'number') existing.score = score;
        existing.date = now;
      } else {
        p.completedUnits.push({ id, score: score ?? null, date: now });
      }
      if (typeof score === 'number') p.scores[id] = score;
      this.save(p);

      // Notify gamification if available
      if (window.Gamification) {
        try {
          window.Gamification.trackStreak?.();
          window.Gamification.addPoints?.(10, `completed unit ${id}`);
          window.Gamification.evaluateBadges?.({ score });
        } catch (e) { /* quietly */ }
      }
    },
    isCompleted(id) {
      id = parseInt(id, 10);
      return this.get().completedUnits.some(u => u.id === id);
    },
    getScore(id) {
      id = parseInt(id, 10);
      const u = this.get().completedUnits.find(u => u.id === id);
      return u && typeof u.score === 'number' ? u.score : null;
    },
    stats() {
      const p = this.get();
      const completed = p.completedUnits.length;
      const scored = p.completedUnits.filter(u => typeof u.score === 'number');
      const avg = scored.length
        ? Math.round(scored.reduce((s, u) => s + u.score, 0) / scored.length)
        : null;
      const lastDate = p.completedUnits
        .map(u => u.date)
        .filter(Boolean)
        .sort()
        .pop() || null;
      return { completed, avgScore: avg, lastDate };
    },
  };

  // Run migration once on load so legacy data is upgraded in place
  try {
    const before = localStorage.getItem(KEY);
    if (before) {
      const migrated = JSON.stringify(normalize(read()));
      if (before !== migrated) {
        localStorage.setItem(KEY, migrated);
        console.log('[progress] migrated legacy format');
      }
    }
  } catch (e) { /* ignore */ }

  window.Progress = Progress;
})();
