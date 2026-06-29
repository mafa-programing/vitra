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
const NATIVE_HEAD = `<link rel="icon" href="data:,">
<script src="./vendor/react.production.min.js"></script>
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
  /* wishlist active state on product page top button */
  .backbtn.on{color:#d8553f!important;background:rgba(216,85,63,.1)!important;}
  /* price range inputs */
  .priceRng{-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;height:24px;margin:0;}
  .priceRng::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.2),inset 0 0 0 2.5px var(--ink);cursor:grab;margin-top:-9px;}
  .priceRng::-webkit-slider-runnable-track{height:5px;border-radius:3px;background:transparent;}
  .priceRng::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.2),inset 0 0 0 2.5px var(--ink);border:none;cursor:grab;}
  .priceRng::-moz-range-track{height:5px;border-radius:3px;background:transparent;}
</style>
<script>
// Native back-button + edge-swipe handling. Without this, Android's back gesture
// exits the app (the app navigates via internal state, not browser history).
// Order: close an open sheet/modal -> use the on-screen back arrow -> go to Home
// tab -> only then minimize to the launcher.
(function(){
  function whenReady(fn){
    var C = window.Capacitor;
    if (C && C.Plugins && C.Plugins.App) return fn(C.Plugins.App);
    setTimeout(function(){ whenReady(fn); }, 250);
  }
  function visible(el){ return !!(el && el.offsetParent !== null); }
  whenReady(function(App){
    App.addListener('backButton', function(){
      // 1) a bottom sheet / filter / sort / modal is open -> close it
      var sheet = document.querySelector('.sheetwrap');
      if (sheet){ sheet.click(); return; }
      // 2) the current screen has a back arrow (Product, Checkout, Order detail, ...) -> use it
      var back = document.querySelector('.backbtn');
      if (visible(back)){ back.click(); return; }
      // 3) on a secondary tab (Shop / Cart / Account) -> go to Home
      var navis = document.querySelectorAll('.navi');
      if (navis.length && !navis[0].classList.contains('on')){ navis[0].click(); return; }
      // 4) already on Home -> drop to the launcher instead of killing the app
      if (App.minimizeApp) App.minimizeApp(); else App.exitApp();
    });
  });
})();
</script>`;
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

// ── UI CHANGES ──────────────────────────────────────────────────────────────

// 5) Home screen: remove Daily Deals section
html = replaceOnce(html,
  '<div class="sect"><div class="shead"><div><div class="stitle">Daily Deals</div><div class="ssub">Handpicked savings, refreshed daily</div></div><button class="slink" onClick="{{ goShop }}">See all</button></div><div class="prow"><sc-for list="{{ deals }}" as="item" hint-placeholder-count="4"><dc-import name="ProductCard" item="{{ item }}" cls="row" hint-size="166px,252px"></dc-import></sc-for></div></div>',
  '',
  'remove-daily-deals'
);

// 6) Home screen: remove Sponsored section
html = replaceOnce(html,
  '<div class="sponsor" style="background:linear-gradient(120deg,#3d4a36,#6c7a4f)"><span class="adlabel">Sponsored</span><div style="font-family:Marcellus,serif;font-size:22px">The Wellness Edit</div><div style="font-size:12px;opacity:.85;margin-top:3px">Seeds, berries &amp; superfoods · up to 25% off</div></div>',
  '',
  'remove-sponsored'
);

// 7) Home screen: remove New Arrivals section
html = replaceOnce(html,
  '<div class="sect"><div class="shead"><div class="stitle">New Arrivals</div><button class="slink">Fresh in</button></div><div class="g2"><sc-for list="{{ neu }}" as="item" hint-placeholder-count="4"><dc-import name="ProductCard" item="{{ item }}" cls="grid" hint-size="100%,252px"></dc-import></sc-for></div></div>',
  '',
  'remove-new-arrivals'
);

// 8) Home screen: replace Recently Viewed with unified "All Products" grid
html = replaceOnce(html,
  '<div class="sect"><div class="shead"><div class="stitle">Recently Viewed</div></div><div class="prow"><sc-for list="{{ recently }}" as="item" hint-placeholder-count="4"><dc-import name="ProductCard" item="{{ item }}" cls="row" hint-size="166px,252px"></dc-import></sc-for></div></div>',
  '<div class="sect"><div class="shead"><div class="stitle">All Products</div><button class="slink" onClick="{{ goShop }}">See all</button></div><div class="g2"><sc-for list="{{ homeProds }}" as="item" hint-placeholder-count="8"><dc-import name="ProductCard" item="{{ item }}" cls="grid" hint-size="100%,252px"></dc-import></sc-for></div></div>',
  'all-products-section'
);

// 9) Profile: remove Reward Points stat
html = replaceOnce(html,
  '<div class="pstat"><div class="pstatv">{{ user.points }}</div><div class="pstatk">Reward Points</div></div>',
  '',
  'remove-reward-points'
);

// 10) Profile: remove Gold Member tier badge
html = replaceOnce(html,
  '<span class="tier">{{ user.tier }}</span>',
  '',
  'remove-gold-member-tier'
);

// 11) Notifications: make "Mark all read" functional
html = replaceOnce(html,
  '<button class="minilink" style="margin-left:auto">Mark all read</button>',
  '<button class="minilink" style="margin-left:auto" onClick="{{ markAllRead }}">Mark all read</button>',
  'mark-all-read-btn'
);

// 12) Product page: remove "Free delivery by Tomorrow" box + coupon card
html = replaceOnce(html,
  '<div class="deliverybox"><div class="delic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" stroke-linejoin="round"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/></svg></div><div style="flex:1"><div style="font:700 13px Manrope">Free delivery by Tomorrow</div><div class="tiny muted">to Bandra, Mumbai 400050 · <span style="color:var(--ac);font-weight:700">Change</span></div></div></div><div class="couponcard"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="1.7"><path d="M4 8l8-4 8 4v8l-8 4-8-4z" stroke-linejoin="round"/></svg><div><div style="font:700 12px Manrope">Save ₹100 with FRESH100</div><div class="tiny muted">On orders above ₹999</div></div><button class="couptag">Apply</button></div>',
  '',
  'remove-free-delivery-coupon'
);

// 13) Product page: remove "Frequently bought together" section
html = replaceOnce(html,
  '<div class="sect"><div class="shead"><div class="stitle" style="font-size:18px">Frequently bought together</div></div><div class="prow"><sc-for list="{{ related }}" as="item" hint-placeholder-count="4"><dc-import name="ProductCard" item="{{ item }}" cls="row" hint-size="166px,252px"></dc-import></sc-for></div></div>',
  '',
  'remove-frequently-together'
);

// 14) Cart: remove free shipping progress bar
html = replaceOnce(html,
  '<div class="freeprog"><div class="fx jb ac"><span class="fs13" style="font-weight:600">{{ fcartNote }}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="1.7"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" stroke-linejoin="round"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/></svg></div><div class="fpbar"><div class="fpfill" style="width:{{ cartProgStr }}"></div></div></div>',
  '',
  'remove-free-shipping-bar'
);

// 15) Cart: add back button to topbar
html = replaceOnce(html,
  '<div class="topttl">Cart</div><span class="muted fs13" style="margin-left:auto">{{ cartCount }} items</span>',
  '<button class="backbtn" onClick="{{ goShop }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="topttl" style="flex:1;text-align:center">Cart</div><span class="muted fs13">{{ cartCount }} items</span>',
  'cart-back-button'
);

// 16) Product card: change "+" quick-add to cart icon
html = replaceOnce(html,
  '<button class="qadd" onClick="{{ item.add }}" style="bottom:12px;right:12px">+</button>',
  '<button class="qadd" onClick="{{ item.add }}" style="bottom:12px;right:12px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 8h12l-1 11a1 1 0 01-1 1H8a1 1 0 01-1-1z" stroke-linejoin="round"/><path d="M9 8a3 3 0 016 0" stroke-linecap="round"/></svg></button>',
  'qadd-cart-icon'
);

// 17) Product detail: replace cart button with wishlist + share buttons in top-right
html = replaceOnce(html,
  '<button class="backbtn" onClick="{{ goCart }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8h12l-1 11a1 1 0 01-1 1H8a1 1 0 01-1-1z" stroke-linejoin="round"/><path d="M9 8a3 3 0 016 0" stroke-linecap="round"/></svg></button>',
  '<button class="{{ pdWishCls }}" onClick="{{ toggleWishPD }}" style="transition:.2s"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="none"/></svg></button><button class="backbtn" onClick="{{ sharePD }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>',
  'product-wishlist-share-buttons'
);

// 18) Filter sheet: replace decorative price range with functional dual sliders
html = replaceOnce(html,
  '<div class="rng"><div class="rngfill" style="left:14%;width:54%"></div><div class="rngnob" style="left:14%"></div><div class="rngnob" style="left:68%"></div></div><div class="fx jb" style="font:600 12px Manrope;color:#8a7f70;margin-top:4px"><span>₹199</span><span>₹1,599</span></div>',
  '<div style="position:relative;height:24px;margin:14px 6px 2px"><div style="position:absolute;top:50%;left:0;right:0;height:5px;background:#e6ddcc;border-radius:3px;transform:translateY(-50%)"><div id="priceFill" style="position:absolute;height:100%;background:var(--ink);border-radius:3px"></div></div><input type="range" class="priceRng" id="priceMinR" min="199" max="1599" step="50" value="{{ priceMin }}" onInput="{{ setPriceMin }}" style="position:absolute;width:100%;z-index:2"><input type="range" class="priceRng" id="priceMaxR" min="199" max="1599" step="50" value="{{ priceMax }}" onInput="{{ setPriceMax }}" style="position:absolute;width:100%;z-index:3"></div><div class="fx jb" style="font:600 12px Manrope;color:#8a7f70;margin-top:6px"><span>₹{{ priceMin }}</span><span>₹{{ priceMax }}</span></div>',
  'price-range-sliders'
);

// ── JS LOGIC PATCHES ─────────────────────────────────────────────────────────

// 19) Add homeProds, pdWishCls, toggleWishPD, sharePD after related
html = replaceOnce(html,
  'const related=P.filter(x=>x.id!==p.id).slice(0,6).map(x=>this.vp(x));',
  `const related=P.filter(x=>x.id!==p.id).slice(0,6).map(x=>this.vp(x));
    const homeProds=P.slice(0,12).map(x=>this.vp(x));
    const pdWishCls=S.wish[p.id]?'backbtn on':'backbtn';
    const toggleWishPD=()=>this.toggleWish(p.id);
    const sharePD=()=>{ try{ if(navigator.share){navigator.share({title:p.name,url:window.location.href});}else{ navigator.clipboard&&navigator.clipboard.writeText(p.name+' - Vitra'); } }catch(e){} };`,
  'homeProds-and-wish-share'
);

// 20) Add markAllRead + respect _notifAllRead in notification groups
html = replaceOnce(html,
  'const notifGroups=this.NOTIF_DATA();',
  `const rawNotifs=this.NOTIF_DATA();
    const notifGroups=S._notifAllRead?rawNotifs.map(g=>({...g,items:g.items.map(n=>({...n,unread:false,rowCls:'nrow'}))})):rawNotifs;
    const markAllRead=()=>this.setState({_notifAllRead:true});`,
  'mark-all-read-logic'
);

// 21) Add priceMin, priceMax, setPriceMin, setPriceMax for filter sliders
// Insert after shopProds / filterCount
html = replaceOnce(html,
  'const filterCount=(S.activeCat!==\'All\'?1:0)+(S.ratingMin>0?1:0)+(S.colorSel>0?1:0);',
  `const priceMin=S.priceMin||199; const priceMax=S.priceMax||1599;
    const setPriceMin=(e)=>{ const v=parseInt(e.target.value); if(v<priceMax) this.setState({priceMin:v}); };
    const setPriceMax=(e)=>{ const v=parseInt(e.target.value); if(v>priceMin) this.setState({priceMax:v}); };
    const filterCount=(S.activeCat!=='All'?1:0)+(S.ratingMin>0?1:0)+(S.colorSel>0?1:0)+((S.priceMin&&S.priceMin>199)||( S.priceMax&&S.priceMax<1599)?1:0);`,
  'price-filter-state'
);

// 22) Apply price filter to shopProds
html = replaceOnce(html,
  `let list=P.filter(p=>(S.activeCat==='All'||p.cat===S.activeCat) && p.r>=S.ratingMin);`,
  `const pMin=S.priceMin||199; const pMax=S.priceMax||1599;
    let list=P.filter(p=>(S.activeCat==='All'||p.cat===S.activeCat) && p.r>=S.ratingMin && p.p>=pMin && p.p<=pMax);`,
  'price-filter-apply'
);

// 23) Account: wire up sub-section navigation (Addresses, Payments, Help, Settings)
html = replaceOnce(html,
  '<div class="mrow" onClick="{{ noop }}"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4"/></svg></div><div><div class="mlabel">Addresses</div>',
  '<div class="mrow" onClick="{{ goAddresses }}"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4"/></svg></div><div><div class="mlabel">Addresses</div>',
  'account-addresses-nav'
);

html = replaceOnce(html,
  '<div class="mrow" onClick="{{ noop }}"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18" stroke-linecap="round"/></svg></div><div><div class="mlabel">Payment Methods</div>',
  '<div class="mrow" onClick="{{ goPayments }}"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18" stroke-linecap="round"/></svg></div><div><div class="mlabel">Payment Methods</div>',
  'account-payments-nav'
);

html = replaceOnce(html,
  '<div class="mrow" onClick="{{ noop }}"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 18l1-3a7 7 0 1112 0l1 3a1 1 0 01-1 1H6a1 1 0 01-1-1z" stroke-linejoin="round"/></svg></div><div><div class="mlabel">Help &amp; Support</div>',
  '<div class="mrow" onClick="{{ goHelp }}"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 18l1-3a7 7 0 1112 0l1 3a1 1 0 01-1 1H6a1 1 0 01-1-1z" stroke-linejoin="round"/></svg></div><div><div class="mlabel">Help &amp; Support</div>',
  'account-help-nav'
);

html = replaceOnce(html,
  '<div class="mrow" onClick="{{ noop }}" style="border-bottom:0"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18" stroke-linecap="round"/></svg></div><div><div class="mlabel">Settings</div>',
  '<div class="mrow" onClick="{{ goSettings }}" style="border-bottom:0"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18" stroke-linecap="round"/></svg></div><div><div class="mlabel">Settings</div>',
  'account-settings-nav'
);

// 24) Inject account sub-screens before isShop
const BACK_BTN = '<button class="backbtn" onClick="{{ goAccount }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
const CHEV = '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" stroke-linecap="round"/></svg>';

const ACCOUNT_SCREENS = `
<sc-if value="{{ isAddresses }}" hint-placeholder-val="x"><div class="scr"><div class="topbar">${BACK_BTN}<div class="topttl">Addresses</div></div><div style="height:8px"></div><sc-for list="{{ userAddresses }}" as="a" hint-placeholder-count="2"><div class="addrcard on" style="cursor:default"><div class="addrad"></div><div style="flex:1"><div class="atag">{{ a.tag }}</div><div style="font:600 14px Manrope;margin-top:5px">{{ a.name }}</div><div style="font-size:12px;color:#8a7f70;margin-top:3px;line-height:1.4">{{ a.line }}</div><div style="font-size:12px;color:#8a7f70;margin-top:1px">{{ a.phone }}</div></div></div></sc-for><button class="addaddr" onClick="{{ noop }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>Add new address</button><div style="height:40px"></div></div></sc-if>
<sc-if value="{{ isPayments }}" hint-placeholder-val="x"><div class="scr"><div class="topbar">${BACK_BTN}<div class="topttl">Payment Methods</div></div><div style="height:12px"></div><div class="sectlabel">Saved methods</div><sc-for list="{{ payMethods }}" as="m" hint-placeholder-count="3"><div class="{{ m.cls }}" onClick="{{ m.sel }}" style="margin:0 18px 10px"><div class="payic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18" stroke-linecap="round"/></svg></div><div><div style="font:600 14px Manrope">{{ m.label }}</div><div class="msub">{{ m.sub }}</div></div><div class="payrad" style="margin-left:auto"></div></div></sc-for><button class="addaddr" style="margin:8px 18px 0" onClick="{{ noop }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>Add payment method</button><div style="height:40px"></div></div></sc-if>
<sc-if value="{{ isHelp }}" hint-placeholder-val="x"><div class="scr"><div class="topbar">${BACK_BTN}<div class="topttl">Help &amp; Support</div></div><div style="height:8px"></div><div class="mlist"><div class="mrow" onClick="{{ noop }}"><div class="micon" style="background:#eef3e8;color:#3f8a52"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-linejoin="round"/></svg></div><div><div class="mlabel">Live Chat</div><div class="msub">Avg. response &lt; 2 min</div></div>${CHEV}</div><div class="mrow" onClick="{{ noop }}"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.62 12 19.79 19.79 0 011.58 3.44 2 2 0 013.55 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 9.91A16 16 0 0012 16.09l.88-.88a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke-linejoin="round"/></svg></div><div><div class="mlabel">Call Support</div><div class="msub">1800-XXX-XXXX · Mon–Sat 9–6</div></div>${CHEV}</div><div class="mrow" onClick="{{ noop }}" style="border-bottom:0"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01" stroke-linecap="round"/></svg></div><div><div class="mlabel">FAQs</div><div class="msub">Order, shipping &amp; returns</div></div>${CHEV}</div></div><div class="sectlabel" style="margin-top:16px">Common topics</div><div class="mlist"><div class="mrow" onClick="{{ noop }}"><div><div class="mlabel">How do I track my order?</div></div>${CHEV}</div><div class="mrow" onClick="{{ noop }}"><div><div class="mlabel">Return &amp; refund policy</div></div>${CHEV}</div><div class="mrow" onClick="{{ noop }}" style="border-bottom:0"><div><div class="mlabel">Change or cancel an order</div></div>${CHEV}</div></div><div style="height:40px"></div></div></sc-if>
<sc-if value="{{ isSettings }}" hint-placeholder-val="x"><div class="scr"><div class="topbar">${BACK_BTN}<div class="topttl">Settings</div></div><div style="height:8px"></div><div class="sectlabel">Notifications</div><div class="mlist"><div class="mrow" style="cursor:default"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke-linejoin="round"/><path d="M10 20a2 2 0 004 0" stroke-linecap="round"/></svg></div><div style="flex:1"><div class="mlabel">Order Updates</div><div class="msub">Shipping &amp; delivery alerts</div></div><div class="{{ swOrders }}" onClick="{{ swOrd }}"><div class="knob"></div></div></div><div class="mrow" style="cursor:default"><div class="micon" style="background:#eef3e8;color:#3f8a52"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div style="flex:1"><div class="mlabel">Promotions</div><div class="msub">Offers, deals &amp; flash sales</div></div><div class="{{ swPromos }}" onClick="{{ swPromo }}"><div class="knob"></div></div></div><div class="mrow" style="cursor:default;border-bottom:0"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div><div style="flex:1"><div class="mlabel">Price Drop Alerts</div><div class="msub">Wishlisted item price changes</div></div><div class="{{ swPrice }}" onClick="{{ tgPrice }}"><div class="knob"></div></div></div></div><div class="sectlabel" style="margin-top:16px">Account</div><div class="mlist"><div class="mrow" onClick="{{ noop }}" style="border-bottom:0"><div class="micon" style="background:#fef0ee;color:#c0432f"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M17 16l4-4m0 0l-4-4m4 4H7"/><path d="M3 21V3" stroke-linecap="round"/></svg></div><div style="flex:1"><div class="mlabel">Delete Account</div><div class="msub">This action is irreversible</div></div>${CHEV}</div></div><div style="height:40px"></div></div></sc-if>
`;

html = replaceOnce(html,
  '</div></sc-if><sc-if value="{{ isShop }}" hint-placeholder-val="x">',
  `</div></sc-if>${ACCOUNT_SCREENS}<sc-if value="{{ isShop }}" hint-placeholder-val="x">`,
  'inject-account-screens'
);

// 25) Order detail: add Cancel / Return request buttons
html = replaceOnce(html,
  '<div class="ordbtns" style="margin-top:16px"><button class="obtn">Need help?</button><button class="obtn fill">Reorder</button></div>',
  '<div class="ordbtns" style="margin-top:16px"><sc-if value="{{ selOrderCanCancel }}" hint-placeholder-val="x"><button class="obtn" onClick="{{ cancelOrder }}" style="color:#c0432f;border-color:rgba(192,67,47,.35)">Cancel Order</button></sc-if><sc-if value="{{ selOrderCanReturn }}" hint-placeholder-val="x"><button class="obtn" onClick="{{ returnOrder }}">Request Return</button></sc-if><sc-if value="{{ selOrderShowHelp }}" hint-placeholder-val="x"><button class="obtn">Need help?</button></sc-if><button class="obtn fill">Reorder</button></div>',
  'order-cancel-return-buttons'
);

// 26) Write review: make Write button open the review sheet + add "See all" reviews
html = replaceOnce(html,
  '<div class="sect"><div class="shead"><div class="stitle" style="font-size:18px">Ratings &amp; Reviews</div><button class="slink">Write</button></div>',
  '<div class="sect"><div class="shead"><div class="stitle" style="font-size:18px">Ratings &amp; Reviews</div><div class="fx gap8"><button class="slink" onClick="{{ openAllReviews }}">See all</button><button class="slink" onClick="{{ openReviewSheet }}">Write</button></div></div>',
  'write-review-button'
);

// Inject review sheet before closing stickybuy sc-if
html = replaceOnce(html,
  '<sc-if value="{{ showCartBar }}" hint-placeholder-val="x"><div class="checkoutbar">',
  `<sc-if value="{{ showReviewSheet }}" hint-placeholder-val="x"><div class="sheetwrap" onClick="{{ closeReviewSheet }}"><div class="sheet" onClick="{{ stop }}"><div class="ghandle"></div><div class="sheethd"><div class="sheett">Write a Review</div></div><div style="display:flex;gap:8px;margin-bottom:16px"><sc-for list="{{ reviewStars }}" as="s" hint-placeholder-count="5"><button style="font-size:28px;background:none;border:0;cursor:pointer;padding:4px;transition:.2s" onClick="{{ s.sel }}">{{ s.icon }}</button></sc-for></div><textarea style="width:100%;min-height:100px;border:1.5px solid rgba(140,120,90,.2);border-radius:14px;padding:12px;font:500 14px Manrope;color:var(--ink);background:#faf7f1;resize:none;outline:none" placeholder="Share your experience with this product..."></textarea><button class="applybtn" onClick="{{ submitReview }}" style="margin-top:12px">Submit Review</button></div></div></sc-if><sc-if value="{{ showCartBar }}" hint-placeholder-val="x"><div class="checkoutbar">`,
  'review-sheet'
);

// 29) Banner "Shop now" button: add onClick handler
html = replaceOnce(html,
  '<button class="banbtn">Shop now',
  '<button class="banbtn" onClick="{{ b.go }}">Shop now',
  'banner-shop-now-click'
);

// 30) Add go function to each banner + wire popular searches from state
html = replaceOnce(html,
  "banners:this.BANNERS.map((b,i)=>({...b, on:i===0?'on':''})),",
  "banners:this.BANNERS.map((b,i)=>({...b, on:i===0?'on':'', go:()=>this.go('shop')})),",
  'banner-go-function'
);

html = replaceOnce(html,
  "populars:['Cashew W320','Trail mix','Pistachios','Walnuts','Figs','Apricots'],",
  "populars:(S.popularSearches||['Cashew W320','Trail mix','Pistachios','Walnuts','Figs','Apricots']),",
  'popular-searches-from-state'
);

// 31) "See all reviews" screen — inject before isCart
const STAR_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 3l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 21.5 6.7 19l1.3-5.9-4.5-4 6-.6z"/></svg>';
const REVIEWS_SCREEN = `<sc-if value="{{ isReviews }}" hint-placeholder-val="x"><div class="scr"><div class="topbar"><button class="backbtn" onClick="{{ closeAllReviews }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="topttl" style="flex:1;text-align:center">All Reviews</div></div><div class="phView"><div class="pad" style="padding-top:12px"><div class="fx ac gap16" style="margin-bottom:18px"><div style="font-family:Marcellus;font-size:48px;line-height:1">{{ prod.r }}</div><div><div class="rstars">${STAR_SVG}${STAR_SVG}${STAR_SVG}${STAR_SVG}${STAR_SVG}</div><div class="tiny muted" style="margin-top:3px">{{ prod.rev }} verified ratings</div></div></div><sc-for list="{{ reviews }}" as="rv" hint-placeholder-count="6"><div class="review"><div class="fx ac gap10"><div class="ravatar">{{ rv.av }}</div><div style="flex:1"><div style="font:700 13px Manrope">{{ rv.n }}</div><div class="tiny muted">{{ rv.d }}</div></div><span class="pdrating" style="padding:2px 7px">${STAR_SVG}{{ rv.r }}</span></div><div class="fs13" style="color:#6b6256;line-height:1.5;margin-top:8px">{{ rv.t }}</div></div></sc-for><div style="height:24px"></div></div></div></div></sc-if>`;

html = replaceOnce(html,
  '</div></sc-if><sc-if value="{{ isCart }}" hint-placeholder-val="x">',
  `</div></sc-if>${REVIEWS_SCREEN}<sc-if value="{{ isCart }}" hint-placeholder-val="x">`,
  'inject-reviews-screen'
);

// ── JS LOGIC PATCHES 2 ────────────────────────────────────────────────────────

// 32) Add account sub-section navigation + order cancel/return + review sheet + all reviews to screenData
html = replaceOnce(html,
  'const wishProds=P.filter(x=>S.wish[x.id]).map(x=>({...this.vp(x),mv:()=>this.moveToCart(x.id)}));',
  `const wishProds=P.filter(x=>S.wish[x.id]).map(x=>({...this.vp(x),mv:()=>this.moveToCart(x.id)}));
    // Account sub-sections
    const isAddresses=S.cust==='addresses', isPayments=S.cust==='payments', isHelp=S.cust==='help', isSettings=S.cust==='settings';
    const goAddresses=()=>setS({cust:'addresses'}), goPayments=()=>setS({cust:'payments'}), goHelp=()=>setS({cust:'help'}), goSettings=()=>setS({cust:'settings'});
    const userAddresses=addresses;
    // Order cancel/return
    const selOrderCanCancel=!!(selOrder && selOrder.statusc==='shipped');
    const selOrderCanReturn=!!(selOrder && selOrder.statusc==='paid');
    const selOrderShowHelp=!selOrderCanCancel && !selOrderCanReturn;
    const cancelOrder=()=>{ if(selOrder){ this.setState({ord:null}); } };
    const returnOrder=()=>{ if(selOrder){ this.setState({ord:null}); } };
    // Review sheet + all reviews
    const isReviews=S.cust==='reviews';
    const openAllReviews=()=>setS({cust:'reviews'});
    const closeAllReviews=()=>setS({cust:'product'});
    const showReviewSheet=!!(S.reviewSheet);
    const openReviewSheet=()=>setS({reviewSheet:true,reviewRating:0});
    const closeReviewSheet=()=>setS({reviewSheet:false});
    const submitReview=()=>setS({reviewSheet:false});
    const reviewStars=[1,2,3,4,5].map(n=>({icon:(S.reviewRating||0)>=n?'★':'☆',sel:()=>setS({reviewRating:n})}));`,
  'account-screens-js'
);

// 33) Extend showNav to include account sub-sections and exclude reviews screen
html = replaceOnce(html,
  "showNav: ['home','shop','orders','notif','account','wish'].includes(this.state.cust),",
  "showNav: ['home','shop','orders','notif','account','wish'].includes(this.state.cust),\n      isAddresses:this.state.cust==='addresses', isPayments:this.state.cust==='payments', isHelp:this.state.cust==='help', isSettings:this.state.cust==='settings', isReviews:this.state.cust==='reviews',",
  'extend-shownav'
);

writeFileSync(OUT, html, 'utf8');
console.log('build-www: wrote', OUT, '(' + html.length + ' bytes)');
