/**
 * sync.js — cross-device progress sync via Telegram bot
 *
 * How it works:
 *   1. On boot, if running inside Telegram, fetch the server blob (GET /sync).
 *   2. Merge server state into localStorage using field-level last-write-wins.
 *   3. Whenever tracked keys change locally, queue a debounced push (POST /sync).
 *   4. Every push carries the Telegram initData so the worker can verify identity.
 *
 * Tracked keys (extend as needed):
 *   - gh:progress          — per-unit completion state
 *   - gh:xp                — total XP
 *   - gh:streak            — daily streak counter
 *   - gh:bookmarks         — saved units
 *   - gh:last-unit         — most recently opened unit
 *
 * Timestamp metadata is stored as `_ts:<key>` siblings so the server merger
 * can do field-level LWW.
 *
 * Graceful degradation:
 *   - Not in Telegram → module is a no-op, app works offline-first as before.
 *   - Worker unreachable → silently queues for next boot; no user-visible error.
 *   - Worker returns 401 → logs and disables sync for this session.
 */

(function (global) {
  'use strict';

  const WORKER_URL = 'https://YOUR-WORKER.workers.dev/sync'; // ← replace with real URL before deploying
  // These must match the exact keys the app modules write to localStorage.
  // progress-migrate.js uses 'grammar_progress'; bookmarks.js uses 'em_bookmarks'.
  // Gamification data lives under 'em_user_data_<userId>' — too dynamic to track here,
  // so XP/streak changes sync indirectly via grammar_progress updates.
  const TRACKED_KEYS = [
    'grammar_progress',   // was 'gh:progress' — mismatched, never triggered
    'em_bookmarks',       // was 'gh:bookmarks' — mismatched, never triggered
    'gh:last-unit'        // kept — can be written by callers directly via Sync.setItem()
  ];
  const DEBOUNCE_MS = 2000;

  const Sync = {
    enabled: false,
    _initData: null,
    _pushTimer: null,
    _disabled: false,

    async init() {
      // Bail out immediately if the worker URL was never configured.
      if (WORKER_URL.includes('YOUR-WORKER')) {
        console.info('[sync] WORKER_URL not configured — sync disabled');
        return;
      }

      const tg = global.Telegram?.WebApp;
      if (!tg || !tg.initData) {
        console.info('[sync] not in Telegram, sync disabled');
        return;
      }
      this._initData = tg.initData;
      this.enabled = true;

      // 1. Pull remote state and merge into local
      try {
        await this.pull();
      } catch (e) {
        console.warn('[sync] initial pull failed:', e.message);
      }

      // 2. Watch for local changes
      this._installWatchers();
    },

    async pull() {
      if (!this.enabled || this._disabled) return;
      const resp = await fetch(WORKER_URL, {
        method: 'GET',
        headers: { 'X-Telegram-Init-Data': this._initData }
      });
      if (resp.status === 401) {
        this._disabled = true;
        console.warn('[sync] unauthorized; sync disabled for this session');
        return;
      }
      if (!resp.ok) throw new Error('HTTP ' + resp.status);

      const { data } = await resp.json();
      if (!data) return; // no server state yet

      // Merge server blob into localStorage, field-level LWW
      for (const key of TRACKED_KEYS) {
        const serverVal = data[key];
        const serverTs  = data[`_ts:${key}`] || 0;
        if (serverVal === undefined) continue;

        const localTs = +(localStorage.getItem(`_ts:${key}`) || 0);
        if (serverTs > localTs) {
          localStorage.setItem(key, typeof serverVal === 'string' ? serverVal : JSON.stringify(serverVal));
          localStorage.setItem(`_ts:${key}`, String(serverTs));
        }
      }
      console.info('[sync] pulled remote state');
    },

    async push() {
      if (!this.enabled || this._disabled) return;
      const body = {};
      for (const key of TRACKED_KEYS) {
        const val = localStorage.getItem(key);
        if (val == null) continue;
        // Try to parse back to object if it looks like JSON, otherwise pass through
        try { body[key] = JSON.parse(val); }
        catch { body[key] = val; }
        body[`_ts:${key}`] = +(localStorage.getItem(`_ts:${key}`) || Date.now());
      }
      try {
        const resp = await fetch(WORKER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': this._initData
          },
          body: JSON.stringify(body)
        });
        if (resp.status === 401) {
          this._disabled = true;
          return;
        }
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        console.info('[sync] pushed');
      } catch (e) {
        console.warn('[sync] push failed, will retry on next change:', e.message);
      }
    },

    queuePush() {
      if (!this.enabled) return;
      clearTimeout(this._pushTimer);
      this._pushTimer = setTimeout(() => this.push(), DEBOUNCE_MS);
    },

    /**
     * Public helper: call this instead of localStorage.setItem when writing
     * a tracked key, so the timestamp is updated atomically.
     */
    setItem(key, value) {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, str);
      if (TRACKED_KEYS.includes(key)) {
        localStorage.setItem(`_ts:${key}`, String(Date.now()));
        this.queuePush();
      }
    },

    /**
     * Install a storage watcher. We wrap setItem on the fly so existing
     * modules that do `localStorage.setItem('gh:xp', ...)` still trigger sync
     * without having to be rewritten.
     */
    _installWatchers() {
      const origSet = Storage.prototype.setItem;
      const self = this;
      Storage.prototype.setItem = function (key, value) {
        origSet.call(this, key, value);
        if (this === localStorage && TRACKED_KEYS.includes(key)) {
          // Only bump timestamp if caller didn't go through Sync.setItem()
          // (that path already set it).
          const tsKey = `_ts:${key}`;
          if (!origSet._skipTs) {
            origSet.call(localStorage, tsKey, String(Date.now()));
          }
          self.queuePush();
        }
      };

      // Push one more time on page hide, in case a change is still debounced
      global.addEventListener('pagehide', () => {
        if (this._pushTimer) {
          clearTimeout(this._pushTimer);
          this.push();
        }
      });
    }
  };

  global.Sync = Sync;

  // Auto-init once the DOM is ready and Telegram SDK has had a chance to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Sync.init());
  } else {
    Sync.init();
  }
})(window);
