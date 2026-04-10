/**
 * sw.js — GrammarHub service worker
 *
 * Strategy split (the reason for this rewrite):
 *
 *   1. APP SHELL   — HTML / CSS / JS / manifest / icons
 *                    → stale-while-revalidate, keyed on CACHE_VERSION.
 *                      Bump CACHE_VERSION on every deploy; old caches purged.
 *
 *   2. UNIT FILES  — /units/*.json
 *                    → network-first with cache fallback.
 *                      Content edits reach learners on the next visit, not the
 *                      one after that. Falls back to cache cleanly when offline.
 *
 *   3. CROSS-ORIGIN — Google Fonts, Telegram SDK, any CDN
 *                    → cache-first with a 7-day max age.
 *
 * Message API:
 *   postMessage({ type: 'SKIP_WAITING' }) — activate new SW immediately
 *   postMessage({ type: 'CLEAR_UNITS'  }) — purge unit cache (e.g. after login)
 */

const CACHE_VERSION = 'v19';
const SHELL_CACHE   = `gh-shell-${CACHE_VERSION}`;
const UNITS_CACHE   = `gh-units-${CACHE_VERSION}`;
const EXT_CACHE     = `gh-ext-${CACHE_VERSION}`;

const SHELL_URLS = [
  './',
  './index.html',
  './dashboard.html',
  './advanced-grammar.html',
  './advanced-vocabulary.html',
  './404.html',
  './manifest.json',
  // scripts
  './progress-migrate.js',
  './ui-extras.js',
  './grammar-loader.js',
  './gamification.js',
  './bookmarks.js',
  './reading-progress.js',   // cached but not yet wired to any page
  './certificate.js',        // cached but not yet wired to any page
  './toast.js',
  './telegram.js',
  './accessibility.js',
  './analytics.js',
  './lang-toggle.js',
  './features.js',
  './vocab-features.js',
  './vocab-ux.js',
  './vocabulary-data.js',
  // styles
  './css/theme.css',
  './css/design-system.css',
  './css/modern.css',
  './css/mobile.css',
  './css/darkmode.css',
  './vocab-ux.css',
  // legacy modules kept for backward compatibility
  './exercise-engine.js',
  './sync.js'
];

const EXT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── install ─────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      // addAll is all-or-nothing; use individual adds so one 404 doesn't
      // wreck the whole install (some files above are optional).
      Promise.all(
        SHELL_URLS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[sw] skipped', url, err.message)
          )
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// ─── activate: purge old version caches ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('gh-') && !k.endsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── message channel ────────────────────────────────────────────────────
self.addEventListener('message', event => {
  const msg = event.data || {};
  if (msg.type === 'SKIP_WAITING') self.skipWaiting();
  if (msg.type === 'CLEAR_UNITS') {
    caches.delete(UNITS_CACHE).then(() => {
      event.ports[0]?.postMessage({ ok: true });
    });
  }
});

// ─── fetch router ───────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (url.pathname.includes('/units/') && url.pathname.endsWith('.json')) {
      event.respondWith(networkFirst(req, UNITS_CACHE));
    } else {
      event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    }
  } else {
    event.respondWith(cacheFirstWithExpiry(req, EXT_CACHE, EXT_MAX_AGE_MS));
  }
});

// ─── strategies ─────────────────────────────────────────────────────────
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Unit unavailable offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetching = fetch(req).then(resp => {
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  }).catch(() => cached);
  return cached || fetching;
}

async function cacheFirstWithExpiry(req, cacheName, maxAgeMs) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
    const dateHeader = cached.headers.get('date');
    if (dateHeader) {
      const age = Date.now() - new Date(dateHeader).getTime();
      if (age < maxAgeMs) return cached;
    } else {
      return cached; // no date header, trust it
    }
  }
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return cached || new Response('', { status: 504 });
  }
}
