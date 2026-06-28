// Builds admin/public/index.html — the Vitra Admin Dashboard as a static,
// Vercel-deployable website, from the same Claude Design prototype that powers
// the app. Reuses the prototype's desktop "admin deck" view verbatim (identical
// to the design) and opens straight into admin mode.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../project/Vitra.standalone.src.html');
const APPWWW = resolve(__dirname, '../vitra-app/www');
const OUTDIR = resolve(__dirname, 'public');
const OUT = resolve(OUTDIR, 'index.html');

mkdirSync(resolve(OUTDIR, 'vendor'), { recursive: true });
mkdirSync(resolve(OUTDIR, 'fonts'), { recursive: true });
// reuse the same vendored runtime + fonts + child component as the app
cpSync(resolve(APPWWW, 'vendor'), resolve(OUTDIR, 'vendor'), { recursive: true });
cpSync(resolve(APPWWW, 'fonts'), resolve(OUTDIR, 'fonts'), { recursive: true });
cpSync(resolve(APPWWW, 'support.js'), resolve(OUTDIR, 'support.js'));
cpSync(resolve(APPWWW, 'ProductCard.dc.html'), resolve(OUTDIR, 'ProductCard.dc.html'));

let html = readFileSync(SRC, 'utf8');
const replaceOnce = (h, f, r, l) => { const i = h.indexOf(f); if (i === -1) throw new Error('build-admin anchor: ' + l); return h.slice(0, i) + r + h.slice(i + f.length); };
const removeBetween = (h, a, b, l) => { const i = h.indexOf(a), j = h.indexOf(b); if (i === -1 || j === -1) throw new Error('build-admin range: ' + l); return h.slice(0, i) + h.slice(j); };

html = replaceOnce(html, '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Vitra Admin — Dry Fruits & More</title>', 'viewport');
html = removeBetween(html, '<meta name="ext-resource-dependency"', '<script src="./support.js"></script>', 'fetch-patch');

const HEAD = `<link rel="icon" href="data:,">
<script src="./vendor/react.production.min.js"></script>
<script src="./vendor/react-dom.production.min.js"></script>
<script src="./support.js"></script>
<style id="admin-shell">
  html,body{margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  /* single-purpose admin site: hide the app/admin toggle */
  .toggle{display:none!important;}
  .stage{padding:26px 18px 48px!important;min-height:100vh!important;}
</style>`;
html = replaceOnce(html, '<script src="./support.js"></script>', HEAD, 'support.js->admin');

html = removeBetween(html, '<link rel="preconnect" href="https://fonts.googleapis.com">', '<style>', 'google-fonts');
html = replaceOnce(html, '<helmet data-dc-atomics><style>', '<helmet data-dc-atomics><link rel="stylesheet" href="./fonts/fonts.css"><style>', 'fonts-link');

// open straight into the admin desktop view (reliable: set the initial state, not a timed click)
html = replaceOnce(html, "mode:'customer', cust:'home'", "mode:'admin', cust:'home'", 'default-admin-mode');

writeFileSync(OUT, html, 'utf8');
console.log('build-admin: wrote', OUT, '(' + html.length + ' bytes)');
