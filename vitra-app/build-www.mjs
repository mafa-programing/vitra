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

// ── PRODUCTS & IMAGES ────────────────────────────────────────────────────────

// A) Add real Unsplash images to p1-p12 (existing dry fruit products)
html = html.replace(
  `{id:'p1',name:'California Almonds, Premium',cat:'Almonds',tone:'#e7c9a0',p:549,mrp:699,r:4.8,rev:1240,badge:'Bestseller',free:true},
    {id:'p2',name:'Roasted Cashews W320',cat:'Cashews',tone:'#ead9b8',p:629,mrp:799,r:4.7,rev:980,badge:'Bestseller',free:true},
    {id:'p3',name:'Iranian Akbari Pistachios',cat:'Pistachios',tone:'#c2d4a4',p:899,mrp:1099,r:4.9,rev:760,badge:'New',free:true},
    {id:'p4',name:'Kashmiri Walnut Kernels',cat:'Walnuts',tone:'#c9a27e',p:749,mrp:949,r:4.6,rev:540,badge:'-21%',free:false},
    {id:'p5',name:'Jumbo Medjool Dates',cat:'Dates',tone:'#b98a5e',p:699,mrp:849,r:4.8,rev:1120,badge:'Bestseller',free:true},
    {id:'p6',name:'Golden Seedless Raisins',cat:'Raisins',tone:'#cbb27e',p:299,mrp:379,r:4.5,rev:430,badge:'',free:false},
    {id:'p7',name:'Turkish Dried Figs',cat:'Figs',tone:'#caa6bf',p:549,mrp:659,r:4.7,rev:310,badge:'New',free:false},
    {id:'p8',name:'Pure Kashmiri Saffron 2g',cat:'Saffron',tone:'#e3b23c',p:1299,mrp:1599,r:4.9,rev:210,badge:'Premium',free:true},
    {id:'p9',name:'Mixed Seeds & Berries',cat:'Seeds',tone:'#cfc8a8',p:449,mrp:549,r:4.6,rev:670,badge:'',free:true},
    {id:'p10',name:'Signature Festive Gift Box',cat:'Gift Box',tone:'#d8c3a5',p:1499,mrp:1899,r:4.9,rev:540,badge:'Limited',free:true},
    {id:'p11',name:'Sun-Dried Apricots',cat:'Apricots',tone:'#e8b17a',p:399,mrp:499,r:4.5,rev:280,badge:'',free:false},
    {id:'p12',name:'Trail Mix Deluxe',cat:'Trail Mix',tone:'#d3c39a',p:499,mrp:599,r:4.7,rev:820,badge:'Bestseller',free:true},`,
  `{id:'p1',name:'California Almonds, Premium',cat:'Almonds',tone:'#e7c9a0',p:549,mrp:699,r:4.8,rev:1240,badge:'Bestseller',free:true,img:'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400&h=400&fit=crop&q=80'},
    {id:'p2',name:'Roasted Cashews W320',cat:'Cashews',tone:'#ead9b8',p:629,mrp:799,r:4.7,rev:980,badge:'Bestseller',free:true,img:'https://images.unsplash.com/photo-1571680322279-a226e6a4cc2a?w=400&h=400&fit=crop&q=80'},
    {id:'p3',name:'Iranian Akbari Pistachios',cat:'Pistachios',tone:'#c2d4a4',p:899,mrp:1099,r:4.9,rev:760,badge:'New',free:true,img:'https://images.unsplash.com/photo-1573552466d9ec2c1c02a0?w=400&h=400&fit=crop&q=80'},
    {id:'p4',name:'Kashmiri Walnut Kernels',cat:'Walnuts',tone:'#c9a27e',p:749,mrp:949,r:4.6,rev:540,badge:'-21%',free:false,img:'https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=400&h=400&fit=crop&q=80'},
    {id:'p5',name:'Jumbo Medjool Dates',cat:'Dates',tone:'#b98a5e',p:699,mrp:849,r:4.8,rev:1120,badge:'Bestseller',free:true,img:'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=400&h=400&fit=crop&q=80'},
    {id:'p6',name:'Golden Seedless Raisins',cat:'Raisins',tone:'#cbb27e',p:299,mrp:379,r:4.5,rev:430,badge:'',free:false,img:'https://images.unsplash.com/photo-1596591607025-4ebf6c45c63b?w=400&h=400&fit=crop&q=80'},
    {id:'p7',name:'Turkish Dried Figs',cat:'Figs',tone:'#caa6bf',p:549,mrp:659,r:4.7,rev:310,badge:'New',free:false,img:'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=400&h=400&fit=crop&q=80'},
    {id:'p8',name:'Pure Kashmiri Saffron 2g',cat:'Saffron',tone:'#e3b23c',p:1299,mrp:1599,r:4.9,rev:210,badge:'Premium',free:true,img:'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=400&fit=crop&q=80'},
    {id:'p9',name:'Mixed Seeds & Berries',cat:'Seeds',tone:'#cfc8a8',p:449,mrp:549,r:4.6,rev:670,badge:'',free:true,img:'https://images.unsplash.com/photo-1542282811-943ef1a977c3?w=400&h=400&fit=crop&q=80'},
    {id:'p10',name:'Signature Festive Gift Box',cat:'Gift Box',tone:'#d8c3a5',p:1499,mrp:1899,r:4.9,rev:540,badge:'Limited',free:true,img:'https://images.unsplash.com/photo-1549465220-1a629bb7ad09?w=400&h=400&fit=crop&q=80'},
    {id:'p11',name:'Sun-Dried Apricots',cat:'Apricots',tone:'#e8b17a',p:399,mrp:499,r:4.5,rev:280,badge:'',free:false,img:'https://images.unsplash.com/photo-1618373952433-3a20cb7e7bc7?w=400&h=400&fit=crop&q=80'},
    {id:'p12',name:'Trail Mix Deluxe',cat:'Trail Mix',tone:'#d3c39a',p:499,mrp:599,r:4.7,rev:820,badge:'Bestseller',free:true,img:'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=400&h=400&fit=crop&q=80'},`
);

// B) Replace tech/lifestyle p13-p20 with proper dry fruit & nut products
html = replaceOnce(html,
  `{id:'p13',name:'UltraBook Pro 14" M3',cat:'Laptops',tone:'#b7c0cf',p:124999,mrp:139999,r:4.8,rev:540,badge:'Bestseller',free:true},
    {id:'p14',name:'Vitra X5 5G Smartphone',cat:'Mobiles',tone:'#c2c7d0',p:38999,mrp:44999,r:4.7,rev:1320,badge:'New',free:true},
    {id:'p15',name:'AeroBuds Pro ANC',cat:'Audio',tone:'#cdbfd6',p:8999,mrp:11999,r:4.6,rev:980,badge:'-25%',free:true},
    {id:'p16',name:'StudioMax Over-Ear Headphones',cat:'Audio',tone:'#d0c2da',p:14999,mrp:18999,r:4.8,rev:430,badge:'Premium',free:true},
    {id:'p17',name:'Voyager Cabin Trolley',cat:'Travel Bags',tone:'#c9b59a',p:6499,mrp:8999,r:4.7,rev:410,badge:'Bestseller',free:true},
    {id:'p18',name:'Urban Daypack 22L',cat:'Travel Bags',tone:'#a9b8a6',p:2999,mrp:3999,r:4.5,rev:360,badge:'',free:false},
    {id:'p19',name:'Cold-Pressed Almond Oil 500ml',cat:'Oils',tone:'#d8c98a',p:749,mrp:899,r:4.8,rev:290,badge:'New',free:false},
    {id:'p20',name:'Extra Virgin Olive Oil 1L',cat:'Oils',tone:'#cbd39a',p:1199,mrp:1499,r:4.7,rev:220,badge:'',free:true},`,
  `{id:'p13',name:'Chilgoza Pine Nuts',cat:'Pine Nuts',tone:'#d4c49e',p:1799,mrp:2199,r:4.8,rev:180,badge:'Premium',free:true,img:'https://images.unsplash.com/photo-1562280963-430a94042fe8?w=400&h=400&fit=crop&q=80'},
    {id:'p14',name:'Dried Blueberries',cat:'Berries',tone:'#8a7ab0',p:649,mrp:799,r:4.5,rev:340,badge:'New',free:false,img:'https://images.unsplash.com/photo-1502741126161-b048400d085d?w=400&h=400&fit=crop&q=80'},
    {id:'p15',name:'Brazil Nuts, Whole',cat:'Nuts',tone:'#c9ab8a',p:1199,mrp:1499,r:4.6,rev:210,badge:'',free:false,img:'https://images.unsplash.com/photo-1608797178974-15b35a64ede9?w=400&h=400&fit=crop&q=80'},
    {id:'p16',name:'Macadamia Nuts',cat:'Nuts',tone:'#e8d9c0',p:1499,mrp:1799,r:4.7,rev:156,badge:'Premium',free:true,img:'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop&q=80'},
    {id:'p17',name:'Dried Cranberries',cat:'Berries',tone:'#c9607a',p:449,mrp:549,r:4.4,rev:290,badge:'',free:false,img:'https://images.unsplash.com/photo-1541348263662-e068662d82af?w=400&h=400&fit=crop&q=80'},
    {id:'p18',name:'Hazelnut Kernels',cat:'Hazelnuts',tone:'#c49a6a',p:899,mrp:1099,r:4.6,rev:170,badge:'New',free:false,img:'https://images.unsplash.com/photo-1559181567-c3190144480a?w=400&h=400&fit=crop&q=80'},
    {id:'p19',name:'Chia Seeds, Organic',cat:'Seeds',tone:'#8a8a7a',p:349,mrp:449,r:4.5,rev:420,badge:'',free:false,img:'https://images.unsplash.com/photo-1514325253031-4b06b82d0f4c?w=400&h=400&fit=crop&q=80'},
    {id:'p20',name:'Dried Mango Slices',cat:'Dried Fruits',tone:'#e8b97a',p:399,mrp:499,r:4.6,rev:380,badge:'Bestseller',free:false,img:'https://images.unsplash.com/photo-1597181366021-e96a83fccc48?w=400&h=400&fit=crop&q=80'},`,
  'replace-tech-products'
);

// C) Update CATS to dry fruit categories only
html = replaceOnce(html,
  "CATS = ['Almonds','Cashews','Pistachios','Walnuts','Dates','Saffron','Gift Box','Laptops','Mobiles','Audio','Travel Bags','Oils'];",
  "CATS = ['Almonds','Cashews','Pistachios','Walnuts','Dates','Raisins','Figs','Saffron','Seeds','Gift Box','Apricots','Trail Mix','Pine Nuts','Berries','Nuts','Hazelnuts','Dried Fruits'];",
  'update-cats'
);

// D) Update HOMECATS to relevant dry fruit categories
html = replaceOnce(html,
  "HOMECATS = ['Almonds','Cashews','Pistachios','Dates','Laptops','Mobiles','Travel Bags','Oils'];",
  "HOMECATS = ['Almonds','Cashews','Pistachios','Dates','Walnuts','Saffron','Gift Box','Trail Mix'];",
  'update-homecats'
);

// E) Update CATTONE with new categories + remove tech ones
html = replaceOnce(html,
  "CATTONE = {Almonds:'#e7c9a0',Cashews:'#ead9b8',Pistachios:'#c2d4a4',Walnuts:'#c9a27e',Dates:'#b98a5e',Raisins:'#cbb27e',Saffron:'#e3b23c','Gift Box':'#d8c3a5',Figs:'#caa6bf',Seeds:'#cfc8a8',Apricots:'#e8b17a','Trail Mix':'#d3c39a',Laptops:'#b7c0cf',Mobiles:'#c2c7d0',Audio:'#cdbfd6','Travel Bags':'#c9b59a',Oils:'#d8c98a'};",
  "CATTONE = {Almonds:'#e7c9a0',Cashews:'#ead9b8',Pistachios:'#c2d4a4',Walnuts:'#c9a27e',Dates:'#b98a5e',Raisins:'#cbb27e',Saffron:'#e3b23c','Gift Box':'#d8c3a5',Figs:'#caa6bf',Seeds:'#cfc8a8',Apricots:'#e8b17a','Trail Mix':'#d3c39a','Pine Nuts':'#d4c49e',Berries:'#8a7ab0',Nuts:'#c9ab8a',Hazelnuts:'#c49a6a','Dried Fruits':'#e8b97a'};",
  'update-cattone'
);

// F) Include img in vp() output
html = replaceOnce(html,
  'id:p.id, name:p.name, cat:p.cat, tone:p.tone, grad:this.grad(p.tone),',
  'id:p.id, name:p.name, cat:p.cat, tone:p.tone, grad:this.grad(p.tone), img:p.img||null,',
  'vp-include-img'
);

// G) Product detail: use real image for galMain and thumbnails
html = replaceOnce(html,
  'const galMain=this.grad(p.tone,angs[S.gal]);',
  "const galMain=p.img?('url('+p.img+') center/cover no-repeat'):this.grad(p.tone,angs[S.gal]);",
  'galMain-real-image'
);
html = replaceOnce(html,
  'const gallery=angs.map((a,i)=>({i,grad:this.grad(p.tone,a),cls:S.gal===i?\'pdthumb on\':\'pdthumb\',sel:()=>setS({gal:i})}));',
  "const gallery=angs.map((a,i)=>({i,grad:p.img?('url('+p.img+') center/cover no-repeat'):this.grad(p.tone,a),cls:S.gal===i?'pdthumb on':'pdthumb',sel:()=>setS({gal:i})}));",
  'gallery-real-image'
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

// 8) Home screen: remove Bestsellers section (replace with nothing — "All Products" comes from step below)
html = replaceOnce(html,
  '<div class="sect"><div class="shead"><div class="stitle">Bestsellers</div><button class="slink" onClick="{{ goShop }}">More</button></div><div class="prow"><sc-for list="{{ best }}" as="item" hint-placeholder-count="4"><dc-import name="ProductCard" item="{{ item }}" cls="row" hint-size="166px,252px"></dc-import></sc-for></div></div>',
  '',
  'remove-bestsellers'
);

// 8b) Home screen: replace Recently Viewed with "All Products" grid (all products)
html = replaceOnce(html,
  '<div class="sect"><div class="shead"><div class="stitle">Recently Viewed</div></div><div class="prow"><sc-for list="{{ recently }}" as="item" hint-placeholder-count="4"><dc-import name="ProductCard" item="{{ item }}" cls="row" hint-size="166px,252px"></dc-import></sc-for></div></div>',
  '<div class="sect"><div class="shead"><div class="stitle">All Products</div><button class="slink" onClick="{{ goShop }}">See all</button></div><div class="g2"><sc-for list="{{ homeProds }}" as="item" hint-placeholder-count="8"><dc-import name="ProductCard" item="{{ item }}" cls="grid" hint-size="100%,252px"></dc-import></sc-for></div></div>',
  'all-products-section'
);

// 8c) Home screen: make flash sale section clickable → dedicated flash sale page
html = replaceOnce(html,
  '<div class="flash"><div class="flashL">',
  '<div class="flash" style="cursor:pointer" onClick="{{ goFlashSale }}"><div class="flashL">',
  'flash-clickable'
);

// 8d) Home screen: Shop by Category "All" → "See all" (same goShop destination, clearer label)
html = replaceOnce(html,
  '<div class="sect"><div class="shead"><div class="stitle">Shop by Category</div><button class="slink" onClick="{{ goShop }}">All</button>',
  '<div class="sect"><div class="shead"><div class="stitle">Shop by Category</div><button class="slink" onClick="{{ goShop }}">See all</button>',
  'category-see-all'
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
    const sharePD=async()=>{
      const shareUrl=(window.location.origin&&window.location.origin!=='null'?window.location.origin:'https://vitra.app')+'/#product='+p.id;
      const shareData={title:p.name,text:p.name+' — premium dry fruits on Vitra',url:shareUrl};
      const toast=(msg)=>{ this.setState({_toast:msg}); setTimeout(()=>this.setState({_toast:''}),1900); };
      // 1) Capacitor native share sheet (real device)
      try{ const C=window.Capacitor; if(C&&C.Plugins&&C.Plugins.Share){ await C.Plugins.Share.share({title:shareData.title,text:shareData.text,url:shareData.url,dialogTitle:'Share '+p.name}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
      // 2) Web Share API (Android WebView / mobile browsers)
      try{ if(navigator.share){ await navigator.share(shareData); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
      // 3) Clipboard fallback — always confirm with a toast
      try{ if(navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(shareData.text+' '+shareUrl); toast('Link copied to clipboard'); return; } }catch(e){}
      toast('Share link: '+shareUrl);
    };`,
  'homeProds-and-wish-share'
);

// 20) markAllRead + per-notification delete support
html = replaceOnce(html,
  'const notifGroups=this.NOTIF_DATA();',
  `const rawNotifs=this.NOTIF_DATA();
    const deletedNotifs=S.deletedNotifs||{};
    const notifGroups=rawNotifs.map(g=>({...g,items:g.items.filter(n=>!deletedNotifs[n.title]).map(n=>({...n,unread:S._notifAllRead?false:n.unread,rowCls:S._notifAllRead?'nrow':n.rowCls,del:()=>this.setState(st=>({deletedNotifs:{...(st.deletedNotifs||{}),[n.title]:true}}))})).filter(n=>true)}));
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
<sc-if value="{{ isHelp }}" hint-placeholder-val="x"><div class="scr"><div class="topbar">${BACK_BTN}<div class="topttl">Help &amp; Support</div></div><div style="padding:4px 18px 0"><div style="display:flex;align-items:center;gap:11px;padding:12px 14px;background:#faf7f1;border-radius:14px;margin-bottom:14px"><div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#b97a2e,#e3b23c);display:flex;align-items:center;justify-content:center;color:#fff;font:700 16px Marcellus">V</div><div style="flex:1"><div style="font:700 14px Manrope">Vitra Support</div><div style="font-size:11px;font-weight:600;color:{{ supportColor }}"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:{{ supportColor }};margin-right:5px"></span>{{ supportStatus }}</div></div></div></div><div style="padding:0 18px;display:flex;flex-direction:column;gap:9px;min-height:230px"><sc-for list="{{ chatMsgs }}" as="m" hint-placeholder-count="2"><div style="align-self:{{ m.align }};max-width:80%;background:{{ m.bg }};color:{{ m.fg }};padding:9px 13px;border-radius:15px;font:500 13px Manrope;line-height:1.45">{{ m.text }}</div></sc-for></div><div style="height:14px"></div><div style="display:flex;gap:8px;padding:0 18px"><input id="chatInput" class="input" style="flex:1;height:44px;font-size:14px" placeholder="Type your message…"/><button class="applybtn" style="width:auto;padding:0 20px;height:44px;margin:0" onClick="{{ sendChat }}">Send</button></div><div style="font-size:11px;color:#a89c8a;text-align:center;margin-top:14px">Customer support is available 9:00 AM – 10:00 PM, all days</div><div style="height:40px"></div></div></sc-if>
<sc-if value="{{ isSettings }}" hint-placeholder-val="x"><div class="scr"><div class="topbar">${BACK_BTN}<div class="topttl">Settings</div></div><div style="height:8px"></div><div class="sectlabel">Notifications</div><div class="mlist"><div class="mrow" style="cursor:default"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke-linejoin="round"/><path d="M10 20a2 2 0 004 0" stroke-linecap="round"/></svg></div><div style="flex:1"><div class="mlabel">Order Updates</div><div class="msub">Shipping &amp; delivery alerts</div></div><div class="{{ swOrders }}" onClick="{{ swOrd }}"><div class="knob"></div></div></div></div><div class="sectlabel" style="margin-top:16px">Account</div><div class="mlist"><div class="mrow" onClick="{{ noop }}" style="border-bottom:0"><div class="micon" style="background:#fef0ee;color:#c0432f"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M17 16l4-4m0 0l-4-4m4 4H7"/><path d="M3 21V3" stroke-linecap="round"/></svg></div><div style="flex:1"><div class="mlabel">Delete Account</div><div class="msub">This action is irreversible</div></div>${CHEV}</div></div><div style="height:40px"></div></div></sc-if>
`;

html = replaceOnce(html,
  '</div></sc-if><sc-if value="{{ isShop }}" hint-placeholder-val="x">',
  `</div></sc-if>${ACCOUNT_SCREENS}<sc-if value="{{ isShop }}" hint-placeholder-val="x">`,
  'inject-account-screens'
);

// 25) Order detail: add Cancel / Return request buttons
html = replaceOnce(html,
  '<div class="ordbtns" style="margin-top:16px"><button class="obtn">Need help?</button><button class="obtn fill">Reorder</button></div>',
  '<sc-if value="{{ selOrderHasReq }}" hint-placeholder-val="x"><div style="margin-top:16px;display:flex;align-items:center;gap:9px;padding:12px 14px;border-radius:14px;background:#fff7e6;border:1.5px solid rgba(185,122,46,.3)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b97a2e" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/></svg><div><div style="font:700 13px Manrope;color:#8a5a1c">{{ selOrderReqLabel }}</div><div style="font-size:11px;color:#a8824a">Waiting for admin approval. We will notify you once it is processed.</div></div></div></sc-if><div class="ordbtns" style="margin-top:16px"><sc-if value="{{ selOrderCanCancel }}" hint-placeholder-val="x"><button class="obtn" onClick="{{ cancelOrder }}" style="color:#c0432f;border-color:rgba(192,67,47,.35)">Request Cancellation</button></sc-if><sc-if value="{{ selOrderCanReturn }}" hint-placeholder-val="x"><button class="obtn" onClick="{{ returnOrder }}">Request Return</button></sc-if><sc-if value="{{ selOrderShowHelp }}" hint-placeholder-val="x"><button class="obtn">Need help?</button></sc-if><button class="obtn fill">Reorder</button></div>',
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

// 30) Banner go → dedicated banner page with category-specific products
// BANNERS[0]=Harvest Season→dry fruits, BANNERS[1]=Gifting→Gift Box, BANNERS[2]=Limited Drop→Saffron
// NOTE: Must stay as a property (banners:...) not const declarations — this is inside a return {} object literal
html = replaceOnce(html,
  "banners:this.BANNERS.map((b,i)=>({...b, on:i===0?'on':''})),",
  "banners:this.BANNERS.map((b,i)=>({...b, on:i===0?'on':'', go:()=>this.setState(st=>({cust:'banner',bannerIdx:i,bannerCats:[['Almonds','Cashews','Pistachios','Walnuts','Dates','Raisins','Figs','Seeds','Apricots','Trail Mix','Pine Nuts','Nuts','Hazelnuts','Dried Fruits'],['Gift Box'],['Saffron']][i]||[],navHistory:[...(st.navHistory||[]),st.cust]}))})),",
  'banner-go-function'
);

html = replaceOnce(html,
  "populars:['Cashew W320','Trail mix','Pistachios','Walnuts','Figs','Apricots'],",
  "populars:(S.popularSearches||['Cashew W320','Trail mix','Pistachios','Walnuts','Figs','Apricots']),",
  'popular-searches-from-state'
);

// 31) "See all reviews" screen — inject before isCart
const STAR_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 3l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 21.5 6.7 19l1.3-5.9-4.5-4 6-.6z"/></svg>';
const REVIEWS_SCREEN = `<sc-if value="{{ isReviews }}" hint-placeholder-val="x"><div class="scr"><div class="topbar"><button class="backbtn" onClick="{{ closeAllReviews }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="topttl" style="flex:1;text-align:center">All Reviews</div></div><div class="pad" style="padding-top:12px"><div class="fx ac gap16" style="margin-bottom:18px"><div style="font-family:Marcellus;font-size:48px;line-height:1">{{ prod.r }}</div><div><div class="rstars">${STAR_SVG}${STAR_SVG}${STAR_SVG}${STAR_SVG}${STAR_SVG}</div><div class="tiny muted" style="margin-top:3px">{{ prod.rev }} verified ratings</div></div></div><sc-for list="{{ reviews }}" as="rv" hint-placeholder-count="6"><div class="review"><div class="fx ac gap10"><div class="ravatar">{{ rv.av }}</div><div style="flex:1"><div style="font:700 13px Manrope">{{ rv.n }}</div><div class="tiny muted">{{ rv.d }}</div></div><span class="pdrating" style="padding:2px 7px">${STAR_SVG}{{ rv.r }}</span></div><div class="fs13" style="color:#6b6256;line-height:1.5;margin-top:8px">{{ rv.t }}</div></div></sc-for><div style="height:24px"></div></div></div></sc-if>`;

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
    // Order cancel/return — REQUEST based. Customer can only REQUEST; the order
    // is marked "…Requested" (pending). It only becomes Cancelled/Refunded after
    // an admin approves (that approval step is cross-device → needs the backend).
    const _orderReqs=S.orderReqs||{};
    const _selReq=selOrder?_orderReqs[selOrder.id]:null;
    // undelivered = shipped/pending/paid-but-not-delivered; delivered = 'paid' here
    const _delivered=!!(selOrder && selOrder.statusc==='paid');
    const _undelivered=!!(selOrder && (selOrder.statusc==='shipped'||selOrder.statusc==='pending'));
    const selOrderCanCancel=!!(_undelivered && !_selReq);
    const selOrderCanReturn=!!(_delivered && !_selReq);
    const selOrderHasReq=!!_selReq;
    const selOrderReqLabel=_selReq==='cancel'?'Cancellation Requested':(_selReq==='return'?'Return Requested':'');
    const selOrderShowHelp=!selOrderCanCancel && !selOrderCanReturn && !selOrderHasReq;
    const cancelOrder=()=>{ if(selOrder) this.setState(st=>({orderReqs:{...(st.orderReqs||{}),[selOrder.id]:'cancel'},_toast:'Cancellation requested — pending approval'})); setTimeout(()=>this.setState({_toast:''}),2200); };
    const returnOrder=()=>{ if(selOrder) this.setState(st=>({orderReqs:{...(st.orderReqs||{}),[selOrder.id]:'return'},_toast:'Return requested — pending approval'})); setTimeout(()=>this.setState({_toast:''}),2200); };
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

// 33) Extend showNav to include all new cust states
html = replaceOnce(html,
  "showNav: ['home','shop','orders','notif','account','wish'].includes(this.state.cust),",
  "showNav: ['home','shop','orders','notif','account','wish'].includes(this.state.cust),\n      isAddresses:this.state.cust==='addresses', isPayments:this.state.cust==='payments', isHelp:this.state.cust==='help', isSettings:this.state.cust==='settings', isReviews:this.state.cust==='reviews', isBanner:this.state.cust==='banner', isFlashSale:this.state.cust==='flashsale',",
  'extend-shownav'
);

// ── ROUND 2 CHANGES ───────────────────────────────────────────────────────────

// 34) Notifications: add delete button (×) to each notification row
html = replaceOnce(html,
  '<sc-if value="{{ n.unread }}" hint-placeholder-val="x"><span class="ndot"></span></sc-if></div></sc-for></sc-for>',
  '<sc-if value="{{ n.unread }}" hint-placeholder-val="x"><span class="ndot" style="right:38px"></span></sc-if><button onClick="{{ n.del }}" style="position:absolute;top:50%;right:12px;transform:translateY(-50%);background:none;border:0;cursor:pointer;color:#cbbfb0;font-size:22px;line-height:1;padding:2px 5px">×</button></div></sc-for></sc-for>',
  'notif-delete-button'
);

// 35) Bottom nav: rename "Shop" label to "Categories"
html = replaceOnce(html,
  '>Shop</button>',
  '>Categories</button>',
  'nav-shop-to-categories'
);

// 36) Shop screen: rename title "Shop" → "Categories" and restructure
// Change topbar title
html = replaceOnce(html,
  '<div class="topbar"><div class="topttl">Shop</div></div><div class="shopsearch">',
  '<div class="topbar"><div class="topttl">Categories</div></div><div class="shopsearch" style="position:relative">',
  'shop-to-categories-title'
);

// 37) Shop screen: make search input interactive (real-time filtering + open suggestions on click)
html = replaceOnce(html,
  '<input placeholder="Search almonds, saffron, gifts…"/>',
  '<input placeholder="Search products…" value="{{ searchQuery }}" onInput="{{ setSearchQ }}" onClick="{{ openSearch }}" style="flex:1;background:none;border:0;outline:none;font:500 15px Manrope;color:var(--ink)"/><sc-if value="{{ isSearching }}" hint-placeholder-val="x"><button onClick="{{ clearSearch }}" style="background:none;border:0;cursor:pointer;color:#a89c8a;font-size:22px;line-height:1;padding:0 4px">×</button></sc-if>',
  'search-input-interactive'
);

// 38) Shop screen: REMOVE recent searches + "Popular right now" suggestions entirely.
// The search is now a pure real-time product filter — no trending/suggestion UI.
html = replaceOnce(html,
  '<div class="sectlabel">Recent searches</div><sc-for list="{{ recents }}" as="r" hint-placeholder-count="4"><div class="recrow"><div class="recic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 7v5l3 2" stroke-linecap="round"/><circle cx="12" cy="12" r="8.5"/></svg></div><span class="fs14" style="flex:1;font-weight:500">{{ r }}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cabfac" stroke-width="1.8"><path d="M17 7L7 17M9 7h8v8" stroke-linecap="round" stroke-linejoin="round"/></svg></div></sc-for><div class="sectlabel">Popular right now</div><div class="poprow"><sc-for list="{{ populars }}" as="t" hint-placeholder-count="6"><span class="tagchip">{{ t }}</span></sc-for></div>',
  '',
  'remove-search-suggestions'
);

// 39) Shop screen: show categories grid INSTEAD of product grid when no search/filter active
// Inject a categories grid before the filterbar that only shows when showCatGrid is true
// Also show the filter bar + products only when isSearching or activeCat !== 'All'
html = replaceOnce(html,
  '<div class="chiprow" style="margin-top:16px"><sc-for list="{{ shopCats }}" as="c" hint-placeholder-count="6"><button class="chip {{ c.cls }}" onClick="{{ c.sel }}">{{ c.name }}</button></sc-for></div><div class="filterbar">',
  `<sc-if value="{{ showCatGrid }}" hint-placeholder-val="x"><div class="catgrid" style="padding:16px 18px 0"><sc-for list="{{ allCatTiles }}" as="c" hint-placeholder-count="8"><button class="cat" onClick="{{ c.open }}"><div class="catimg" style="background:{{ c.grad }}"></div><span class="catname">{{ c.name }}</span></button></sc-for></div></sc-if><sc-if value="{{ showProducts }}" hint-placeholder-val="x"><div class="chiprow" style="margin-top:16px"><sc-for list="{{ shopCats }}" as="c" hint-placeholder-count="6"><button class="chip {{ c.cls }}" onClick="{{ c.sel }}">{{ c.name }}</button></sc-for></div></sc-if><sc-if value="{{ showProducts }}" hint-placeholder-val="x"><div class="filterbar">`,
  'categories-grid-in-shop'
);

// Close the showProducts sc-if before the shop screen bottom spacer
html = replaceOnce(html,
  '<div style="height:20px"></div></div></sc-if><sc-if value="{{ isProduct }}"',
  '</sc-if><div style="height:20px"></div></div></sc-if><sc-if value="{{ isProduct }}"',
  'close-show-products-scif'
);

// 40) Navigation: patch openProduct to push to navHistory (back goes to correct previous screen)
html = replaceOnce(html,
  "openProduct=(id)=>this.setState({cust:'product',pid:id,pack:1,gal:0,spec:0});",
  "openProduct=(id)=>this.setState(st=>({cust:'product',pid:id,pack:1,gal:0,spec:0,navHistory:[...(st.navHistory||[]),st.cust]}));",
  'open-product-history'
);

// 41) Add goBack() method after go() so back button navigates to real previous screen
html = replaceOnce(html,
  "go(s){ const tabMap={home:0,shop:1,cart:2,account:3}; this.setState({cust:s, tab:(tabMap[s]!==undefined?tabMap[s]:this.state.tab)}); const v=document.querySelector('.phView'); if(v) v.scrollTop=0; }",
  `go(s){ const tabMap={home:0,shop:1,cart:2,account:3}; this.setState({cust:s, tab:(tabMap[s]!==undefined?tabMap[s]:this.state.tab)}); const v=document.querySelector('.phView'); if(v) v.scrollTop=0; }
  goBack(){ const h=this.state.navHistory||[]; if(!h.length){ this.go('home'); return; } const prev=h[h.length-1]; const tabMap={home:0,shop:1,cart:2,account:3}; this.setState({cust:prev,tab:(tabMap[prev]!==undefined?tabMap[prev]:this.state.tab),navHistory:h.slice(0,-1)}); const v=document.querySelector('.phView'); if(v) v.scrollTop=0; }`,
  'go-back-method'
);

// 42) Product page: back button goes to real previous screen (not always goShop)
html = replaceOnce(html,
  '<div class="topbar" style="position:absolute;left:0;right:0;top:0;z-index:12;background:none"><button class="backbtn" onClick="{{ goShop }}">',
  '<div class="topbar" style="position:absolute;left:0;right:0;top:0;z-index:12;background:none"><button class="backbtn" onClick="{{ goBack }}">',
  'product-back-uses-history'
);

// 43) Inject banner + flash sale screens before isCart
const BANNER_SCREEN = `<sc-if value="{{ isBanner }}" hint-placeholder-val="x"><div class="scr"><div class="topbar" style="background:{{ bannerGrad }};padding:12px 18px;margin:-4px -0 8px"><button class="backbtn" onClick="{{ goBack }}" style="color:#fff;background:rgba(255,255,255,.18)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="topttl" style="flex:1;text-align:center;color:#fff">{{ bannerTitle }}</div></div><div style="padding:6px 18px 4px"><div style="font:700 13px Manrope;color:#8a7f70">{{ bannerProdCount }} products</div></div><div class="g2"><sc-for list="{{ bannerProds }}" as="item" hint-placeholder-count="6"><dc-import name="ProductCard" item="{{ item }}" cls="grid" hint-size="100%,252px"></dc-import></sc-for></div><div style="height:40px"></div></div></sc-if>`;

const FLASHSALE_SCREEN = `<sc-if value="{{ isFlashSale }}" hint-placeholder-val="x"><div class="scr"><div class="topbar" style="background:linear-gradient(125deg,#2c2722,#3c352b);padding:12px 18px;margin:-4px 0 8px"><button class="backbtn" onClick="{{ goBack }}" style="color:#e9c987;background:rgba(255,255,255,.12)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="topttl" style="flex:1;text-align:center;color:#e9c987"><svg width="14" height="14" viewBox="0 0 24 24" fill="#e9c987" style="margin-right:5px"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>Flash Sale</div></div><div style="padding:6px 18px 4px"><div style="font:700 13px Manrope;color:#8a7f70">{{ flashProdCount }} products on sale</div></div><div class="g2"><sc-for list="{{ flashProds }}" as="item" hint-placeholder-count="6"><dc-import name="ProductCard" item="{{ item }}" cls="grid" hint-size="100%,252px"></dc-import></sc-for></div><div style="height:40px"></div></div></sc-if>`;

html = replaceOnce(html,
  `</div></sc-if>${REVIEWS_SCREEN}<sc-if value="{{ isCart }}" hint-placeholder-val="x">`,
  `</div></sc-if>${REVIEWS_SCREEN}${BANNER_SCREEN}${FLASHSALE_SCREEN}<sc-if value="{{ isCart }}" hint-placeholder-val="x">`,
  'inject-banner-flash-screens'
);

// 44) JS: add all new computed vars (goBack, goFlashSale, banner vars, flash vars, search vars, allCatTiles)
html = replaceOnce(html,
  `const wishProds=P.filter(x=>S.wish[x.id]).map(x=>({...this.vp(x),mv:()=>this.moveToCart(x.id)}));
    // Account sub-sections`,
  `const wishProds=P.filter(x=>S.wish[x.id]).map(x=>({...this.vp(x),mv:()=>this.moveToCart(x.id)}));
    // Navigation
    const goBack=()=>this.goBack();
    // Flash sale page
    const isFlashSale=S.cust==='flashsale';
    const goFlashSale=()=>this.setState(st=>({cust:'flashsale',navHistory:[...(st.navHistory||[]),st.cust]}));
    const flashPidMap=S.flashPids||{p1:true,p4:true,p5:true,p8:true,p12:true};
    const flashProds=P.filter(p=>flashPidMap[p.id]).map(x=>this.vp(x));
    const flashProdCount=flashProds.length;
    // Banner page
    const isBanner=S.cust==='banner';
    const bannerIdx=S.bannerIdx||0;
    const _b=this.BANNERS[bannerIdx]||this.BANNERS[0];
    const bannerGrad=_b.g||'';
    const bannerTitle=_b.tag||'';
    const bannerProds=P.filter(p=>(S.bannerCats||[]).includes(p.cat)).map(x=>this.vp(x));
    const bannerProdCount=bannerProds.length;
    // Search
    const searchQuery=S.searchQuery||'';
    const isSearching=!!(searchQuery);
    const searchOpen=!!(S.searchOpen||isSearching);
    const setSearchQ=(e)=>this.setState({searchQuery:e.target.value,searchOpen:true});
    const openSearch=()=>this.setState({searchOpen:true});
    const clearSearch=()=>this.setState({searchQuery:'',searchOpen:false,activeCat:'All'});
    const showCatGrid=!isSearching&&S.activeCat==='All';
    const showProducts=isSearching||S.activeCat!=='All';
    // All categories grid for shop screen
    const allCatTiles=(this.HOMECATS||[]).concat(this.CATS||[]).filter((c,i,a)=>a.indexOf(c)===i).map(c=>({name:c,grad:this.grad((this.CATTONE||{})[c]||'#c9b59a'),open:()=>setS({activeCat:c,searchQuery:'',searchOpen:false})}));
    // Account sub-sections`,
  'new-vars-js'
);

// 45) Add searchQuery to shopProds filter
html = replaceOnce(html,
  `const pMin=S.priceMin||199; const pMax=S.priceMax||1599;
    let list=P.filter(p=>(S.activeCat==='All'||p.cat===S.activeCat) && p.r>=S.ratingMin && p.p>=pMin && p.p<=pMax);`,
  `const pMin=S.priceMin||199; const pMax=S.priceMax||1599;
    const _sqTokens=(S.searchQuery||'').toLowerCase().trim().split(/\\s+/).filter(Boolean);
    const _matchSearch=(p)=>{ if(!_sqTokens.length) return true; const hay=(p.name+' '+p.cat).toLowerCase(); return _sqTokens.every(t=>hay.includes(t)); };
    let list=P.filter(p=>(S.activeCat==='All'||p.cat===S.activeCat) && p.r>=S.ratingMin && p.p>=pMin && p.p<=pMax && _matchSearch(p));`,
  'search-filter-shopprods'
);

// 46) homeProds: show ALL products not just first 12
html = replaceOnce(html,
  'const homeProds=P.slice(0,12).map(x=>this.vp(x));',
  'const homeProds=[...P].map(x=>this.vp(x));',
  'homeprods-all'
);

// 47) CRITICAL: expose every new variable in screenData()'s return object.
// screenData() returns an explicit object literal — any const declared in its
// body but missing from the return is `undefined` in templates. Without this,
// every new screen renders empty and every new button calls undefined (no-op).
html = replaceOnce(html,
  '      notifGroups, wishProds, wishEmpty:wishProds.length===0,',
  `      notifGroups, wishProds, wishEmpty:wishProds.length===0,
      // ── newly added bindings (home, search, banner, flash, account, reviews) ──
      homeProds, pdWishCls, toggleWishPD, sharePD,
      markAllRead,
      priceMin, priceMax, setPriceMin, setPriceMax,
      isAddresses, isPayments, isHelp, isSettings,
      goAddresses, goPayments, goHelp, goSettings, userAddresses,
      selOrderCanCancel, selOrderCanReturn, selOrderShowHelp, cancelOrder, returnOrder,
      isReviews, openAllReviews, closeAllReviews,
      showReviewSheet, openReviewSheet, closeReviewSheet, submitReview, reviewStars,
      goBack,
      isFlashSale, goFlashSale, flashProds, flashProdCount,
      isBanner, bannerGrad, bannerTitle, bannerProds, bannerProdCount,
      searchQuery, isSearching, searchOpen, setSearchQ, openSearch, clearSearch,
      showCatGrid, showProducts, allCatTiles,
      selOrderHasReq, selOrderReqLabel,
      toast:S._toast||'', showToast:!!(S._toast),
      flashHH, flashMM, flashSS, flashLive,
      deliverTo, changeAddress, hasUnreadNotif, startVoiceSearch, goSearch,
      addrPickerOpen, closeAddrPicker, addNewAddress,
      supportStatus, supportColor, chatMsgs, sendChat,`,
  'expose-new-vars-in-return'
);

// ── ROUND 3: ticking flash countdown, color filter removal, share toast ──────

// 50) Remove the non-functional "Colour / variant" filter group (dry fruits have
//     no colour variants; this control filtered nothing).
html = replaceOnce(html,
  '<div class="fgroup"><div class="fglabel">Colour / variant</div><div class="swrow"><sc-for list="{{ colors }}" as="c" hint-placeholder-count="6"><button class="{{ c.cls }}" style="background:{{ c.c }}" onClick="{{ c.sel }}"></button></sc-for></div></div>',
  '',
  'remove-colour-filter'
);

// 51) Flash sale: real ticking HH:MM:SS countdown (was a static "02:14:56").
html = replaceOnce(html,
  '<div class="timer"><span class="tbox">02</span><span class="tsep">:</span><span class="tbox">14</span><span class="tsep">:</span><span class="tbox">56</span></div>',
  '<div class="timer"><span class="tbox">{{ flashHH }}</span><span class="tsep">:</span><span class="tbox">{{ flashMM }}</span><span class="tsep">:</span><span class="tbox">{{ flashSS }}</span></div>',
  'flash-timer-binding'
);

// 52) Start a 1s interval so the countdown actually ticks. The DC host forwards
//     componentDidMount/WillUnmount to the logic instance.
html = replaceOnce(html,
  '  rupee(n){ return ',
  `  componentDidMount(){ this.__tick=setInterval(()=>{ const c=this.state.cust; if(c==='home'||c==='flashsale') this.forceUpdate(); },1000); }
  componentWillUnmount(){ if(this.__tick) clearInterval(this.__tick); }
  rupee(n){ return `,
  'flash-tick-interval'
);

// 53) Compute the countdown + live flag in screenData. End time is configurable
//     (S.flashEndsAt, set by admin); default is the next rolling N-hour window so
//     it always shows a real, moving countdown.
html = replaceOnce(html,
  'const flashProds=P.filter(p=>flashPidMap[p.id]).map(x=>this.vp(x));',
  `const flashProds=P.filter(p=>flashPidMap[p.id]).map(x=>this.vp(x));
    const flashLive=S.flashLive!==false;
    const _flashWindowMs=(S.flashWindowHours||3)*3600*1000;
    const _flashEnd=S.flashEndsAt||(Math.ceil(Date.now()/_flashWindowMs)*_flashWindowMs);
    let _rem=Math.max(0,Math.floor((_flashEnd-Date.now())/1000));
    const _hh=Math.floor(_rem/3600); _rem%=3600; const _mm=Math.floor(_rem/60); const _ss=_rem%60;
    const _pad=(n)=>String(n).padStart(2,'0');
    const flashHH=_pad(_hh), flashMM=_pad(_mm), flashSS=_pad(_ss);`,
  'flash-countdown-compute'
);

// 53b) Home: hide the whole flash-sale strip when the sale is toggled off (admin).
html = replaceOnce(html,
  '<div class="flash" style="cursor:pointer" onClick="{{ goFlashSale }}"><div class="flashL">',
  '<sc-if value="{{ flashLive }}" hint-placeholder-val="x"><div class="flash" style="cursor:pointer" onClick="{{ goFlashSale }}"><div class="flashL">',
  'flash-live-wrap-open'
);
html = replaceOnce(html,
  '<span class="tbox">{{ flashSS }}</span></div></div>',
  '<span class="tbox">{{ flashSS }}</span></div></div></sc-if>',
  'flash-live-wrap-close'
);

// ── ROUND 4: home header, notif dot, voice search, product back, filters ─────

// 55) Home: make the "Deliver to" address an editable button + bind to state
html = replaceOnce(html,
  '<span class="loclbl">Deliver to</span><span class="locval">Bandra, Mumbai 400050<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M6 9l6 6 6-6" stroke-linecap="round"/></svg></span>',
  '<span class="loclbl">Deliver to</span><span class="locval">{{ deliverTo }}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M6 9l6 6 6-6" stroke-linecap="round"/></svg></span>',
  'deliver-to-binding'
);
html = replaceOnce(html,
  '<button class="loc" style="border:0;background:none;text-align:left;cursor:pointer;padding:0">',
  '<button class="loc" style="border:0;background:none;text-align:left;cursor:pointer;padding:0" onClick="{{ changeAddress }}">',
  'deliver-to-button'
);

// 56) Notification bell: show the red dot ONLY when there is an unread notification
html = replaceOnce(html,
  '</svg><span class="dot"></span></button>',
  '</svg><sc-if value="{{ hasUnreadNotif }}" hint-placeholder-val="x"><span class="dot"></span></sc-if></button>',
  'notif-dot-conditional'
);

// 57) Mic button → real voice search (Web Speech API); stop it bubbling to goShop
html = replaceOnce(html,
  '<button class="micbtn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3" stroke-linecap="round"/></svg></button>',
  '<button class="micbtn" onClick="{{ startVoiceSearch }}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3" stroke-linecap="round"/></svg></button>',
  'mic-voice-search'
);

// 58) Filters: remove the "Availability & delivery" group (non-functional chips)
html = replaceOnce(html,
  '<div class="fgroup" style="border-bottom:0"><div class="fglabel">Availability &amp; delivery</div><div class="swrow"><span class="tagchip">In stock</span><span class="tagchip">Free delivery</span><span class="tagchip">Express</span><span class="tagchip">Discounted</span></div></div>',
  '',
  'remove-availability-filter'
);

// 59) Product page: back button always returns to Home (per request)
html = replaceOnce(html,
  '<div class="topbar" style="position:absolute;left:0;right:0;top:0;z-index:12;background:none"><button class="backbtn" onClick="{{ goBack }}">',
  '<div class="topbar" style="position:absolute;left:0;right:0;top:0;z-index:12;background:none"><button class="backbtn" onClick="{{ goHome }}">',
  'product-back-to-home'
);

// 60) Home: show ALL products newest-first (last added appears at the top)
html = replaceOnce(html,
  'const homeProds=[...P].map(x=>this.vp(x));',
  'const homeProds=P.map((x,i)=>({...this.vp(x),pos:i})).sort((a,b)=>b.pos-a.pos);',
  'homeprods-newest-first'
);

// 61) New JS: deliverTo, changeAddress, hasUnreadNotif, startVoiceSearch
html = replaceOnce(html,
  'const goBack=()=>this.goBack();',
  `const goBack=()=>this.goBack();
    // Delivery address — tapping the header opens a picker of saved addresses
    const deliverTo=S.deliverTo||'Bandra, Mumbai 400050';
    const addrPickerOpen=!!S.addrPickerOpen;
    const changeAddress=()=>this.setState({addrPickerOpen:true});
    const closeAddrPicker=()=>this.setState({addrPickerOpen:false});
    const addNewAddress=()=>{ const line=window.prompt('Enter your full delivery address'); if(line&&line.trim()){ const tag=(window.prompt('Save as (e.g. Home, Office)','Home')||'Address').trim(); this.setState(st=>({customAddresses:[...(st.customAddresses||[]),{tag:tag,name:(st.userName||'You'),line:line.trim(),phone:''}],addrPickerOpen:true})); } };
    // Unread notification indicator
    const hasUnreadNotif=(notifGroups||[]).some(g=>(g.items||[]).some(n=>n.unread));
    // Open the shop/categories screen with the search active (home search bar)
    const goSearch=()=>this.setState({cust:'shop',tab:1,searchOpen:true});
    const _setVoiceQuery=(t)=>this.setState({cust:'shop',tab:1,activeCat:'All',searchQuery:t,searchOpen:true,_toast:''});
    // Voice search — native speech on the APK (asks for mic permission), Web Speech in a browser
    const startVoiceSearch=async(e)=>{ if(e&&e.stopPropagation)e.stopPropagation();
      const C=window.Capacitor;
      if(C&&C.Plugins&&C.Plugins.SpeechRecognition){
        const SP=C.Plugins.SpeechRecognition;
        try{
          let perm; try{ perm=await SP.checkPermissions(); }catch(_){ perm=null; }
          if(!perm || perm.speechRecognition!=='granted'){ const req=await SP.requestPermissions(); if(req && req.speechRecognition && req.speechRecognition!=='granted'){ this.setState({_toast:'Microphone permission is needed for voice search'}); setTimeout(()=>this.setState({_toast:''}),2200); return; } }
          this.setState({_toast:'Listening\\u2026'});
          const res=await SP.start({language:'en-IN',maxResults:1,popup:false,partialResults:false});
          const t=(res && res.matches && res.matches[0]||'').trim();
          if(t) _setVoiceQuery(t); else { this.setState({_toast:'Did not catch that, try again'}); setTimeout(()=>this.setState({_toast:''}),1700); }
        }catch(err){ this.setState({_toast:'Microphone permission is needed for voice search'}); setTimeout(()=>this.setState({_toast:''}),2200); }
        return;
      }
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR){ this.setState({_toast:'Voice search needs the app \\u2014 please type instead'}); setTimeout(()=>this.setState({_toast:''}),2000); _setVoiceQuery(''); return; }
      const r=new SR(); r.lang='en-IN'; r.interimResults=false; r.maxAlternatives=1;
      r.onresult=(ev)=>{ const t=(ev.results[0][0].transcript||'').trim(); _setVoiceQuery(t); };
      r.onerror=(ev)=>{ const msg=(ev&&ev.error==='not-allowed')?'Microphone permission is needed':'Did not catch that, try again'; this.setState({_toast:msg}); setTimeout(()=>this.setState({_toast:''}),2000); };
      try{ r.start(); this.setState({_toast:'Listening\\u2026'}); }catch(_){ }
    };
    // Help & Support chat (9 AM – 10 PM)
    const _hr=new Date().getHours();
    const supportOnline=_hr>=9 && _hr<22;
    const supportStatus=supportOnline?'Online · 9 AM – 10 PM':'Offline · open 9 AM – 10 PM';
    const supportColor=supportOnline?'#3f8a52':'#c0432f';
    const _defChat=[{from:'support',text:'Hi! 👋 Welcome to Vitra support. How can we help you today?'}];
    const chatMsgs=(S.chatMsgs||_defChat).map(m=>({text:m.text,align:m.from==='me'?'flex-end':'flex-start',bg:m.from==='me'?'var(--ink)':'#f0ebe1',fg:m.from==='me'?'#fff':'var(--ink)'}));
    const sendChat=()=>{ const el=document.getElementById('chatInput'); const v=(el?el.value:'').trim(); if(!v) return; const cur=this.state.chatMsgs||_defChat; const reply=supportOnline?'Thanks for reaching out! An agent will be with you shortly.':'We are offline right now. Our team is available 9 AM – 10 PM and will reply as soon as we are back.'; this.setState({chatMsgs:[...cur,{from:'me',text:v},{from:'support',text:reply}]}); if(el)el.value=''; };`,
  'home-header-voice-js'
);

// 54) Toast overlay (share confirmation, order-request confirmation).
// Place the toast OUTSIDE the showNav conditional so it appears on every screen
// (product, banner, flash, orders…), not only on tabs that show the bottom nav.
html = replaceOnce(html,
  '<sc-if value="{{ showNav }}" hint-placeholder-val="{{ true }}"><nav class="botnav" style="--i:{{ tab }}">',
  '<sc-if value="{{ showToast }}" hint-placeholder-val="x"><div style="position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(35,32,27,.96);color:#fff;padding:11px 20px;border-radius:24px;font:600 13px Manrope;z-index:9999;box-shadow:0 8px 28px rgba(0,0,0,.3);max-width:80%;text-align:center">{{ toast }}</div></sc-if><sc-if value="{{ showNav }}" hint-placeholder-val="{{ true }}"><nav class="botnav" style="--i:{{ tab }}">',
  'toast-overlay'
);

// ── ROUND 5: coupons, payments, returns text, cart-clear, orders back ────────

// 62) Remove the Vitra Wallet payment method
html = replaceOnce(html, "{k:'wallet',label:'Vitra Wallet',sub:'Balance · ₹240'},", '', 'remove-vitra-wallet');

// 63) Remove "easy 7-day returns" copy everywhere
html = replaceOnce(html,
  'Free delivery on orders above ₹999. Easy 7-day returns if the seal is intact and the product is unused. Refunds are processed to your original payment method within 3–5 business days.',
  'Free delivery on orders above ₹999. Refunds, where applicable, are processed to your original payment method within 3–5 business days.',
  'remove-7day-returns-1');
html = replaceOnce(html, '100% secure payment · easy 7-day returns', '100% secure payment', 'remove-7day-returns-2');

// 64) Coupon system — real apply/validate/discount + correct totals
html = replaceOnce(html,
  '<input placeholder="ENTER PROMO CODE"/><button class="promoapply">Apply</button>',
  '<input id="promoInput" placeholder="ENTER PROMO CODE"/><button class="promoapply" onClick="{{ applyCoupon }}">Apply</button>',
  'coupon-input-wire');
// Replace the hardcoded "FRESH100 applied" card with one that only shows when a real coupon is applied
html = replaceOnce(html,
  '<div class="couponcard" style="margin-top:8px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="1.7"><path d="M4 8l8-4 8 4v8l-8 4-8-4z" stroke-linejoin="round"/></svg><div><div style="font:700 12px Manrope">FRESH100 applied</div><div class="tiny muted">You saved ₹100 on this order</div></div><span class="atag" style="margin-left:auto">−₹100</span></div>',
  '<sc-if value="{{ couponApplied }}" hint-placeholder-val="x"><div class="couponcard" style="margin-top:8px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="1.7"><path d="M4 8l8-4 8 4v8l-8 4-8-4z" stroke-linejoin="round"/></svg><div><div style="font:700 12px Manrope">{{ couponCode }} applied</div><div class="tiny muted">You saved {{ couponDiscount }} on this order</div></div><button onClick="{{ removeCoupon }}" style="margin-left:auto;background:none;border:0;cursor:pointer;color:#a89c8a;font-size:18px;line-height:1;padding:0 2px">×</button></div></sc-if>',
  'coupon-card-dynamic');
// Coupon line in the bill (only when applied)
html = replaceOnce(html,
  '<div class="bkrow"><span>Delivery</span><span>{{ cartShip }}</span></div>',
  '<div class="bkrow"><span>Delivery</span><span>{{ cartShip }}</span></div><sc-if value="{{ couponApplied }}" hint-placeholder-val="x"><div class="bkrow"><span>Coupon ({{ couponCode }})</span><span class="savepill">− {{ couponDiscount }}</span></div></sc-if>',
  'coupon-bill-row');
// Compute coupon discount into the cart total (renderVals)
html = replaceOnce(html, 'const total=sub+ship;',
  `const COUPONS={VITRA25:{type:'pct',amt:25,min:0},FRESH100:{type:'flat',amt:100,min:999},WELCOME15:{type:'pct',amt:15,min:0},DIWALI50:{type:'flat',amt:50,min:0}};
    const couponCode=this.state.coupon||'';
    const _cp=COUPONS[couponCode];
    const couponApplied=!!_cp && sub>=_cp.min;
    const couponDiscount=couponApplied?Math.min(sub,(_cp.type==='pct'?Math.round(sub*_cp.amt/100):_cp.amt)):0;
    const total=sub+ship-couponDiscount;`,
  'coupon-compute');
// Expose coupon vars + handlers
html = replaceOnce(html, "freeLeft: sub<999?this.rupee(999-sub):'',",
  `freeLeft: sub<999?this.rupee(999-sub):'',
      couponApplied, couponCode, couponDiscount:this.rupee(couponDiscount),
      applyCoupon:()=>{ const el=document.getElementById('promoInput'); const v=(el?el.value:'').trim().toUpperCase(); if(!v){ return; } if(COUPONS[v]){ if(sub>=COUPONS[v].min){ this.setState({coupon:v,_toast:v+' applied'}); if(el)el.value=''; } else { this.setState({_toast:'Add more to use '+v}); } } else { this.setState({_toast:'Invalid coupon code'}); } setTimeout(()=>this.setState({_toast:''}),1900); },
      removeCoupon:()=>this.setState({coupon:'',_toast:'Coupon removed'}),`,
  'coupon-vars-return');

// 65) Place order → clear the cart. The checkout CTA calls coNext; when it
// advances from Review (co===2) to Done, clear the cart + applied coupon.
html = replaceOnce(html,
  'coNext:()=>this.setCo(Math.min(3,S.co+1)),',
  "coNext:()=>{ if(S.co===2){ this.setState({cart:{},coupon:''}); } this.setCo(Math.min(3,S.co+1)); },",
  'place-order-clear-cart');

// 66) My Orders: add a back-to-Home button at the top
html = replaceOnce(html,
  '<div class="scrhead"><div class="scrtitle">My Orders</div></div>',
  '<div class="topbar"><button class="backbtn" onClick="{{ goHome }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="topttl" style="flex:1">My Orders</div></div>',
  'orders-back-button');

// ── ROUND 6: address picker, home->categories search, mic on categories ──────

// 68) Saved addresses include any the customer added; each can be picked as the
// delivery address (sets the home header) and stays selectable in checkout.
html = replaceOnce(html,
  "const addresses=[{tag:'Home',name:'Aarav Sharma',line:'402, Palm Springs, Linking Rd, Bandra West, Mumbai 400050',phone:'+91 98200 41122'},{tag:'Office',name:'Aarav Sharma',line:'9th Floor, Lotus Towers, BKC, Mumbai 400051',phone:'+91 98200 41122'}].map((a,i)=>({...a,cls:S.coAddr===i?'addrcard on':'addrcard',sel:()=>setS({coAddr:i})}));",
  "const _baseAddr=[{tag:'Home',name:'Aarav Sharma',line:'402, Palm Springs, Linking Rd, Bandra West, Mumbai 400050',phone:'+91 98200 41122'},{tag:'Office',name:'Aarav Sharma',line:'9th Floor, Lotus Towers, BKC, Mumbai 400051',phone:'+91 98200 41122'},...(S.customAddresses||[])];\n    const _shortAddr=(l)=>l.split(',').slice(-2).join(',').trim();\n    const addresses=_baseAddr.map((a,i)=>({...a,short:_shortAddr(a.line),cls:S.coAddr===i?'addrcard on':'addrcard',sel:()=>setS({coAddr:i}),pick:()=>this.setState({coAddr:i,deliverTo:a.tag+' \\u00b7 '+_shortAddr(a.line),addrPickerOpen:false})}));",
  'addresses-with-custom');

// 69) Home search bar → opens the Categories screen with search active
html = replaceOnce(html,
  'class="searchbar" onClick="{{ goShop }}">',
  'class="searchbar" onClick="{{ goSearch }}">',
  'home-search-to-categories');

// 70) Categories search bar: add a mic button (voice search works here too)
html = replaceOnce(html,
  '<sc-if value="{{ isSearching }}" hint-placeholder-val="x"><button onClick="{{ clearSearch }}" style="background:none;border:0;cursor:pointer;color:#a89c8a;font-size:22px;line-height:1;padding:0 4px">×</button></sc-if>',
  '<sc-if value="{{ isSearching }}" hint-placeholder-val="x"><button onClick="{{ clearSearch }}" style="background:none;border:0;cursor:pointer;color:#a89c8a;font-size:22px;line-height:1;padding:0 4px">×</button></sc-if><button onClick="{{ startVoiceSearch }}" style="background:none;border:0;cursor:pointer;color:var(--ac);padding:0 2px;display:flex;align-items:center"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3" stroke-linecap="round"/></svg></button>',
  'categories-search-mic');

// 71) Address picker sheet (opened from the "Deliver to" header)
html = replaceOnce(html,
  '<sc-if value="{{ showToast }}" hint-placeholder-val="x">',
  '<sc-if value="{{ addrPickerOpen }}" hint-placeholder-val="x"><div class="sheetwrap" onClick="{{ closeAddrPicker }}"><div class="sheet" onClick="{{ stop }}"><div class="ghandle"></div><div class="sheethd"><div class="sheett">Deliver to</div></div><sc-for list="{{ addresses }}" as="a" hint-placeholder-count="2"><div class="{{ a.cls }}" onClick="{{ a.pick }}" style="margin-bottom:10px;cursor:pointer"><div class="addrad"></div><div style="flex:1"><div class="atag">{{ a.tag }}</div><div style="font:600 14px Manrope;margin-top:4px">{{ a.short }}</div><div style="font-size:12px;color:#8a7f70;margin-top:2px;line-height:1.4">{{ a.line }}</div></div></div></sc-for><button class="addaddr" onClick="{{ addNewAddress }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>Add new address</button><div style="height:8px"></div></div></div></sc-if><sc-if value="{{ showToast }}" hint-placeholder-val="x">',
  'address-picker-sheet');

// 72) "Add new address" buttons (account Addresses screen) actually add one
html = replaceOnce(html,
  '<button class="addaddr" onClick="{{ noop }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>Add new address</button>',
  '<button class="addaddr" onClick="{{ addNewAddress }}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>Add new address</button>',
  'account-add-address-works');

// 67) Profile: remove the "Payment Methods" menu row (patched to goPayments in step 23)
html = replaceOnce(html,
  '<div class="mrow" onClick="{{ goPayments }}"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18" stroke-linecap="round"/></svg></div><div><div class="mlabel">Payment Methods</div><div class="msub">Cards, UPI &amp; wallets</div></div>',
  '<div class="mrow" onClick="{{ goPayments }}" style="display:none"><div class="micon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18" stroke-linecap="round"/></svg></div><div><div class="mlabel">Payment Methods</div><div class="msub">Cards, UPI &amp; wallets</div></div>',
  'remove-profile-payment-row');

writeFileSync(OUT, html, 'utf8');
console.log('build-www: wrote', OUT, '(' + html.length + ' bytes)');
