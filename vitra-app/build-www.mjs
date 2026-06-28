// Builds vitra-app/www/index.html from the Claude Design prototype source,
// converting the framed phone+admin prototype into a full-bleed, offline,
// device-native customer app for Capacitor. Re-run after editing the prototype.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../project/Vitra.standalone.src.html');
const OUT = resolve(__dirname, 'www/index.html');

let html = readFileSync(SRC, 'utf8');

function replaceOnce(haystack, find, repl, label) {
  const i = haystack.indexOf(find);
  if (i === -1) throw new Error(`build-www: anchor not found -> ${label}`);
  return haystack.slice(0, i) + repl + haystack.slice(i + find.length);
}
function removeBetween(haystack, startMark, endMark, label) {
  const a = haystack.indexOf(startMark);
  const b = haystack.indexOf(endMark);
  if (a === -1 || b === -1 || b < a) throw new Error(`build-www: range not found -> ${label}`);
  return haystack.slice(0, a) + haystack.slice(b);
}

// 1) viewport: cover the notch, lock zoom for an app feel
html = replaceOnce(
  html,
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">',
  'viewport'
);

// 2) drop the standalone fetch-patch + ext-resource meta (relative fetch works under Capacitor's localhost server)
html = removeBetween(
  html,
  '<meta name="ext-resource-dependency"',
  '<script src="./support.js"></script>',
  'fetch-patch'
);

// 3) vendor React/ReactDOM locally (loaded BEFORE support.js so it skips the unpkg CDN), then inject native full-bleed overrides
const NATIVE_HEAD = `<script src="./vendor/react.production.min.js"></script>
<script src="./vendor/react-dom.production.min.js"></script>
<script src="./support.js"></script>
<style id="native-shell">
  :root{ --safe-top: env(safe-area-inset-top, 0px); --safe-bot: env(safe-area-inset-bottom, 0px); }
  html,body{margin:0;padding:0;height:100%;background:#23201b;overflow:hidden;-webkit-tap-highlight-color:transparent;overscroll-behavior:none;}
  /* kill the desktop staging — phone fills the device */
  .stage{min-height:100dvh!important;height:100dvh!important;width:100vw!important;padding:0!important;gap:0!important;overflow:hidden!important;align-items:stretch!important;justify-content:stretch!important;}
  /* this build is the customer app only; admin lives on the web dashboard */
  .toggle{display:none!important;}
  .phwrap{width:100vw!important;height:100dvh!important;animation:none!important;}
  .phone{width:100vw!important;height:100dvh!important;max-width:none!important;border-radius:0!important;box-shadow:none!important;}
  /* the real device already has a notch + status bar */
  .pnotch{display:none!important;}
  .statusbar{display:none!important;}
  /* respect safe areas */
  .phView{padding-top:max(var(--safe-top),14px)!important;padding-bottom:calc(104px + var(--safe-bot))!important;}
  .botnav{bottom:calc(14px + var(--safe-bot))!important;}
  .fcart{bottom:calc(92px + var(--safe-bot))!important;}
  .stickybuy,.checkoutbar{padding-bottom:calc(16px + var(--safe-bot))!important;}
  .sheetwrap{padding-bottom:var(--safe-bot)!important;}
</style>`;
html = replaceOnce(html, '<script src="./support.js"></script>', NATIVE_HEAD, 'support.js->vendor+native');

// 4) fonts: serve the vendored, offline copies instead of Google Fonts
html = removeBetween(
  html,
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<style>',
  'google-fonts'
);
html = replaceOnce(
  html,
  '<helmet data-dc-atomics><style>',
  '<helmet data-dc-atomics><link rel="stylesheet" href="./fonts/fonts.css"><style>',
  'local-fonts-link'
);

writeFileSync(OUT, html, 'utf8');
console.log('build-www: wrote', OUT, '(' + html.length + ' bytes)');
