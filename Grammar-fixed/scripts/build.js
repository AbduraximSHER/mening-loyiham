#!/usr/bin/env node
/**
 * build.js — optional bundler for GrammarHub
 *
 * Produces:
 *   dist/app.bundle.js    — concatenated & minified JS modules
 *   dist/app.bundle.css   — concatenated & minified CSS
 *
 * The site still runs without running this. If you do run it, change the
 * <script> and <link> tags in your HTML to point at the bundle for faster loads.
 *
 * Usage:
 *   npm install
 *   npm run build
 *   npm run build:watch   # rebuild on change
 */

const fs   = require('fs');
const path = require('path');

let esbuild;
try {
  esbuild = require('esbuild');
} catch {
  console.error('\nesbuild not installed. Run:\n\n  npm install\n');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Order matters: earlier files can be depended on by later ones
const JS_ENTRIES = [
  'toast.js',
  'accessibility.js',
  'lang-toggle.js',
  'gamification.js',
  'bookmarks.js',
  'reading-progress.js',
  'certificate.js',
  'analytics.js',
  'features.js',
  'grammar-loader.js',
  'exercise-engine.js',
  // vocabulary-data.js is 700+ KB of inline corpus data and should be loaded
  // lazily (or split into JSON chunks like grammar units), NOT bundled into
  // the app shell. Left out of this build on purpose.
  'vocab-features.js',
  'vocab-ux.js',
  'telegram.js',
  'sync.js'
];

const CSS_ENTRIES = [
  'css/design-system.css',
  'css/modern.css',
  'css/mobile.css',
  'css/darkmode.css',
  'css/exercise-engine.css',
  'vocab-ux.css'
];

const watch = process.argv.includes('--watch');

async function build() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

  // ── JS ─────────────────────────────────────────────────────────
  // Concatenate in order, then minify as one file. These scripts are
  // not ES modules so we can't use esbuild's resolver; we splice them
  // into a single synthetic entry instead.
  const jsSource = JS_ENTRIES
    .filter(f => fs.existsSync(path.join(ROOT, f)))
    .map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n\n');

  const jsResult = await esbuild.build({
    stdin: { contents: jsSource, loader: 'js', resolveDir: ROOT },
    outfile: path.join(DIST, 'app.bundle.js'),
    bundle: false,
    minify: true,
    sourcemap: true,
    target: ['es2020'],
    legalComments: 'none'
  });
  const jsSize = fs.statSync(path.join(DIST, 'app.bundle.js')).size;

  // ── CSS ────────────────────────────────────────────────────────
  const cssSource = CSS_ENTRIES
    .filter(f => fs.existsSync(path.join(ROOT, f)))
    .map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n\n');

  await esbuild.build({
    stdin: { contents: cssSource, loader: 'css', resolveDir: ROOT },
    outfile: path.join(DIST, 'app.bundle.css'),
    bundle: false,
    minify: true,
    sourcemap: true
  });
  const cssSize = fs.statSync(path.join(DIST, 'app.bundle.css')).size;

  const kb = n => (n / 1024).toFixed(1) + ' KB';
  console.log(`\n✓ built:`);
  console.log(`  dist/app.bundle.js   ${kb(jsSize)}`);
  console.log(`  dist/app.bundle.css  ${kb(cssSize)}\n`);
}

if (watch) {
  const chokidar = { watch: (paths, cb) => {
    const interval = setInterval(() => {}, 1 << 30); // keep-alive
    for (const p of paths) {
      try { fs.watch(p, { recursive: false }, cb); } catch {}
    }
    return () => clearInterval(interval);
  }};
  build().catch(console.error);
  chokidar.watch([ROOT, path.join(ROOT, 'css')], () => {
    console.log('rebuilding...');
    build().catch(console.error);
  });
} else {
  build().catch(err => { console.error(err); process.exit(1); });
}
