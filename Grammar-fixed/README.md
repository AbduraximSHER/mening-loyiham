# GrammarHub

Advanced English Grammar — 100 interactive units with exercises and progress tracking.

**Live:** https://grammar-a7x.pages.dev

---

## v2.0 refactor — what changed

This drop is a batch of safety, performance, and learning-design improvements.
Nothing breaks backward compatibility: existing unit JSON files work as-is, the
site still runs without any build step, and the new modules are additive.

### 1. Viewport zoom unlocked
`index.html` no longer sets `user-scalable=no`. Pinch-zoom works everywhere,
which is a real accessibility requirement (WCAG 1.4.4).

### 2. JSON schema + validator
`scripts/validate-units.js` is a zero-dependency Node script that checks every
`units/*.json` file against the schema in `scripts/unit.schema.json`. It catches
malformed JSON, missing required fields, `correctAnswer` out of range, duplicate
section ids, unbalanced HTML inside lesson content (warning), and `index.json`
drifting out of sync with the actual unit files.

Run it with:

```sh
npm run validate
```

All 100 existing unit files pass cleanly. Wire it into CI or a pre-commit hook.

### 3. Service worker rewritten (`sw.js`)
The old SW used stale-while-revalidate for *all* same-origin requests,
including unit JSON — meaning lesson edits only reached users on the second
visit. The new SW splits strategies:

| Resource                | Strategy                             | Why                                              |
|-------------------------|--------------------------------------|--------------------------------------------------|
| App shell (HTML/CSS/JS) | stale-while-revalidate               | Fast boot, eventual freshness                    |
| `/units/*.json`         | **network-first** + cache fallback   | Content edits ship immediately; offline still ok |
| Cross-origin (fonts)    | cache-first, 7-day expiry            | CDN stability + freshness                        |

Bump `CACHE_VERSION` in `sw.js` on each deploy and the old caches purge.
A new message API lets the client request `{type: 'CLEAR_UNITS'}` to force-refresh.

### 4. New exercise engine (`exercise-engine.js`)
One module, four exercise types:

- **MCQ** — existing unit format, no migration needed
- **Fill-in-the-blank** — `{type:"fill", question:"I ___ home", answer:"go"}`
- **Reorder tokens** — click words into a sentence
- **Error correction** — rewrite a broken sentence

The engine is backward compatible: any exercise without a `type` field is
treated as MCQ. All four types use real `<button>`s and `<input>`s,
`aria-live` feedback, keyboard navigation, and respect `prefers-reduced-motion`.

**Try it:** open `exercise-demo.html` in a browser — it renders one sample of
each type with a live result log.

**Authoring:** the engine is the runtime, not the content. You still need to
write new exercises yourself.

### 5. Cross-device sync via Telegram (`sync.js` + `bot-worker.js`)
When the app runs inside Telegram, progress now syncs across devices.

**Client** (`sync.js`):
- On boot, pulls the server blob and merges into `localStorage`
- Wraps `localStorage.setItem` so any code writing to a tracked key triggers a
  debounced push — no existing modules need to be rewritten
- Gracefully no-ops outside Telegram; everything still works offline-first

**Server** (`bot-worker.js`, Cloudflare Worker):
- New `GET /sync` and `POST /sync` endpoints
- Verifies Telegram `initData` HMAC per
  [Telegram's spec](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
- Field-level last-write-wins merge (stale clients can't overwrite newer data)
- Stores blobs in Cloudflare KV at key `u:<telegram_user_id>`
- Replay protection via `auth_date` (rejects initData older than 24h)

**Deployment steps:**

1. Create a Cloudflare KV namespace and bind it as `PROGRESS` in `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "PROGRESS"
   id = "<your-kv-id>"
   ```
2. Set `BOT_TOKEN` in `bot-worker.js` (or better, as a Worker secret)
3. Deploy the worker: `wrangler deploy`
4. Edit `WORKER_URL` at the top of `sync.js` to point at your deployed worker

### 6. Optional build step (`scripts/build.js`)
A minimal esbuild pipeline that concatenates and minifies all JS modules into
`dist/app.bundle.js` (and CSS into `dist/app.bundle.css`).

```sh
npm install
npm run build         # one-shot
npm run build:watch   # rebuild on change
```

The site works *without* running the build — this is purely for production
deploys that want fewer HTTP requests.

**Sizes:** the bundle is ~112 KB. Notably, `vocabulary-data.js` (700+ KB of
inline corpus) is deliberately **excluded** from the bundle. It should be
lazy-loaded or split into JSON chunks the same way grammar units are; bundling
it into the shell would make the initial download ~8× larger for no benefit.
This is a pre-existing issue worth fixing in a follow-up.

### 7. Accessibility pass on existing exercise UI
`advanced-grammar.html` exercise cards now have:

- `role="radiogroup"` on the options container
- `role="radio"` + `aria-checked` on each option, updated on selection
- `aria-labelledby` linking question text to the radiogroup
- `aria-live="polite"` on the feedback div so screen readers announce results
- `aria-expanded` + `aria-controls` on the hint toggle
- `type="button"` on all buttons (prevents accidental form submits)
- `min-height: 44px` on inputs (WCAG 2.5.5 touch target size)
- `autocomplete="off"` and `spellcheck="false"` on exercise inputs

**Still to do:** `advanced-vocabulary.html` uses the same card pattern and
needs the same patches applied. `advanced-grammar.html` is the reference.

---

## Project structure

```
Grammar-main/
├── index.html, dashboard.html, advanced-*.html, 404.html
├── *.js                    # ~17 vanilla JS modules
├── css/                    # 5 stylesheets
├── units/                  # 100 grammar units as JSON + index.json
├── scripts/                # NEW — build + validate tooling
│   ├── build.js
│   ├── validate-units.js
│   └── unit.schema.json
├── exercise-engine.js      # NEW — 4-type exercise runtime
├── css/exercise-engine.css # NEW — styles for the engine
├── sync.js                 # NEW — Telegram cross-device sync
├── exercise-demo.html      # NEW — try the 4 exercise types
├── bot-worker.js           # EXTENDED — now includes /sync API
├── sw.js                   # REWRITTEN — split cache strategies
└── package.json            # NEW — optional, for the build step
```

---

## Running locally

No build step required:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

With validation + build:

```sh
npm install
npm run check         # validate + build
```

---

## Follow-up work (not in this drop)

The honest list of things still worth doing:

- **Migrate embedded HTML in unit content to Markdown.** Lesson content lives
  as HTML strings inside JSON, which makes diffs noisy and i18n painful.
- **Author new exercise types.** The engine supports fill-in-the-blank,
  reorder, and error-correction, but existing units only have MCQs.
- **Split `vocabulary-data.js` into lazy chunks.** It's a 700 KB module loaded
  on every page.
- **Patch `advanced-vocabulary.html` accessibility** using
  `advanced-grammar.html` as the template.
- **Spaced-repetition queue for wrong answers** — the gamification module
  already tracks answers; feeding missed questions back after a delay is a
  small addition with a large learning impact.
