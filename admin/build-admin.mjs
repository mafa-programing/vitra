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

// ── Products & Images (same as app build) ────────────────────────────────────

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
  'admin-replace-tech-products'
);

html = replaceOnce(html,
  "CATS = ['Almonds','Cashews','Pistachios','Walnuts','Dates','Saffron','Gift Box','Laptops','Mobiles','Audio','Travel Bags','Oils'];",
  "CATS = ['Almonds','Cashews','Pistachios','Walnuts','Dates','Raisins','Figs','Saffron','Seeds','Gift Box','Apricots','Trail Mix','Pine Nuts','Berries','Nuts','Hazelnuts','Dried Fruits'];",
  'admin-update-cats'
);

html = replaceOnce(html,
  "HOMECATS = ['Almonds','Cashews','Pistachios','Dates','Laptops','Mobiles','Travel Bags','Oils'];",
  "HOMECATS = ['Almonds','Cashews','Pistachios','Dates','Walnuts','Saffron','Gift Box','Trail Mix'];",
  'admin-update-homecats'
);

html = replaceOnce(html,
  "CATTONE = {Almonds:'#e7c9a0',Cashews:'#ead9b8',Pistachios:'#c2d4a4',Walnuts:'#c9a27e',Dates:'#b98a5e',Raisins:'#cbb27e',Saffron:'#e3b23c','Gift Box':'#d8c3a5',Figs:'#caa6bf',Seeds:'#cfc8a8',Apricots:'#e8b17a','Trail Mix':'#d3c39a',Laptops:'#b7c0cf',Mobiles:'#c2c7d0',Audio:'#cdbfd6','Travel Bags':'#c9b59a',Oils:'#d8c98a'};",
  "CATTONE = {Almonds:'#e7c9a0',Cashews:'#ead9b8',Pistachios:'#c2d4a4',Walnuts:'#c9a27e',Dates:'#b98a5e',Raisins:'#cbb27e',Saffron:'#e3b23c','Gift Box':'#d8c3a5',Figs:'#caa6bf',Seeds:'#cfc8a8',Apricots:'#e8b17a','Trail Mix':'#d3c39a','Pine Nuts':'#d4c49e',Berries:'#8a7ab0',Nuts:'#c9ab8a',Hazelnuts:'#c49a6a','Dried Fruits':'#e8b97a'};",
  'admin-update-cattone'
);

html = replaceOnce(html,
  'id:p.id, name:p.name, cat:p.cat, tone:p.tone, grad:this.grad(p.tone),',
  'id:p.id, name:p.name, cat:p.cat, tone:p.tone, grad:this.grad(p.tone), img:p.img||null,',
  'admin-vp-include-img'
);

// ── Admin JS patches ─────────────────────────────────────────────────────────

// Add homeProds, pdWishCls, toggleWishPD, sharePD (needed so JS doesn't error if customer side renders)
html = replaceOnce(html,
  'const related=P.filter(x=>x.id!==p.id).slice(0,6).map(x=>this.vp(x));',
  `const related=P.filter(x=>x.id!==p.id).slice(0,6).map(x=>this.vp(x));
    const homeProds=P.slice(0,12).map(x=>this.vp(x));
    const pdWishCls=S.wish[p.id]?'backbtn on':'backbtn';
    const toggleWishPD=()=>this.toggleWish(p.id);
    const sharePD=()=>{};`,
  'admin-homeProds'
);

// Add markAllRead
html = replaceOnce(html,
  'const notifGroups=this.NOTIF_DATA();',
  `const rawNotifs=this.NOTIF_DATA();
    const notifGroups=S._notifAllRead?rawNotifs.map(g=>({...g,items:g.items.map(n=>({...n,unread:false,rowCls:'nrow'}))})):rawNotifs;
    const markAllRead=()=>this.setState({_notifAllRead:true});`,
  'admin-mark-all-read'
);

// Add priceMin/priceMax for filter
html = replaceOnce(html,
  'const filterCount=(S.activeCat!==\'All\'?1:0)+(S.ratingMin>0?1:0)+(S.colorSel>0?1:0);',
  `const priceMin=S.priceMin||199; const priceMax=S.priceMax||1599;
    const setPriceMin=(e)=>{ const v=parseInt(e.target.value); if(v<priceMax) this.setState({priceMin:v}); };
    const setPriceMax=(e)=>{ const v=parseInt(e.target.value); if(v>priceMin) this.setState({priceMax:v}); };
    const filterCount=(S.activeCat!=='All'?1:0)+(S.ratingMin>0?1:0)+(S.colorSel>0?1:0);`,
  'admin-price-filter'
);

// Apply price filter to shopProds
html = replaceOnce(html,
  `let list=P.filter(p=>(S.activeCat==='All'||p.cat===S.activeCat) && p.r>=S.ratingMin);`,
  `const pMin=S.priceMin||199; const pMax=S.priceMax||1599;
    let list=P.filter(p=>(S.activeCat==='All'||p.cat===S.activeCat) && p.r>=S.ratingMin && p.p>=pMin && p.p<=pMax);`,
  'admin-price-filter-apply'
);

// Add account sub-section vars and order cancel/return vars and review sheet
html = replaceOnce(html,
  'const wishProds=P.filter(x=>S.wish[x.id]).map(x=>({...this.vp(x),mv:()=>this.moveToCart(x.id)}));',
  `const wishProds=P.filter(x=>S.wish[x.id]).map(x=>({...this.vp(x),mv:()=>this.moveToCart(x.id)}));
    const isAddresses=S.cust==='addresses', isPayments=S.cust==='payments', isHelp=S.cust==='help', isSettings=S.cust==='settings';
    const goAddresses=()=>setS({cust:'addresses'}), goPayments=()=>setS({cust:'payments'}), goHelp=()=>setS({cust:'help'}), goSettings=()=>setS({cust:'settings'});
    const userAddresses=addresses;
    const selOrderCanCancel=!!(selOrder && selOrder.statusc==='shipped');
    const selOrderCanReturn=!!(selOrder && selOrder.statusc==='paid');
    const selOrderShowHelp=!selOrderCanCancel && !selOrderCanReturn;
    const cancelOrder=()=>{ if(selOrder){ this.setState({ord:null}); } };
    const returnOrder=()=>{ if(selOrder){ this.setState({ord:null}); } };
    const showReviewSheet=!!(S.reviewSheet);
    const openReviewSheet=()=>setS({reviewSheet:true,reviewRating:0});
    const closeReviewSheet=()=>setS({reviewSheet:false});
    const submitReview=()=>setS({reviewSheet:false});
    const reviewStars=[1,2,3,4,5].map(n=>({icon:(S.reviewRating||0)>=n?'★':'☆',sel:()=>setS({reviewRating:n})}));`,
  'admin-account-screens-js'
);

html = replaceOnce(html,
  "showNav: ['home','shop','orders','notif','account','wish'].includes(this.state.cust),",
  "showNav: ['home','shop','orders','notif','account','wish'].includes(this.state.cust),\n      isAddresses:this.state.cust==='addresses', isPayments:this.state.cust==='payments', isHelp:this.state.cust==='help', isSettings:this.state.cust==='settings', isReviews:this.state.cust==='reviews', isBanner:this.state.cust==='banner', isFlashSale:this.state.cust==='flashsale',",
  'admin-extend-shownav'
);

// ── ADMIN-SPECIFIC PATCHES ───────────────────────────────────────────────────

// Popular searches from state (so admin edits are reflected in customer view within session)
html = replaceOnce(html,
  "populars:['Cashew W320','Trail mix','Pistachios','Walnuts','Figs','Apricots'],",
  "populars:(S.popularSearches||['Cashew W320','Trail mix','Pistachios','Walnuts','Figs','Apricots']),",
  'admin-popular-searches-from-state'
);

// Banner product management + Flash sale state
html = replaceOnce(html,
  "const adBanners=[{title:'Harvest Festival'",
  `const adFlashPids=S.flashPids||{p1:true,p4:true,p5:true,p8:true,p12:true};
    const adFlashProds=P.map(pr=>({...pr,grad:this.grad(pr.tone),inFlash:!!(adFlashPids[pr.id]),toggle:()=>this.setState(st=>({flashPids:{...(st.flashPids||{p1:true,p4:true,p5:true,p8:true,p12:true}),[pr.id]:!(st.flashPids||{p1:true,p4:true,p5:true,p8:true,p12:true})[pr.id]}}))}));
    const adFlashLive=S.flashLive!==false;
    const toggleFlashLive=()=>this.setState(st=>({flashLive:!(st.flashLive!==false)}));
    const flashLiveCls=adFlashLive?'st paid':'st cancel';
    const flashLiveLbl=adFlashLive?'Live':'Off';
    // Popular searches admin
    const adPopulars=S.popularSearches||['Cashew W320','Trail mix','Pistachios','Walnuts','Figs','Apricots'];
    const removePopular=(t)=>()=>this.setState(st=>{const cur=st.popularSearches||['Cashew W320','Trail mix','Pistachios','Walnuts','Figs','Apricots'];return {popularSearches:cur.filter(x=>x!==t)};});
    const addPopularSearch=()=>{const v=(document.getElementById('popSearchInput')||{}).value;if(v&&v.trim())this.setState(st=>{const cur=st.popularSearches||['Cashew W320','Trail mix','Pistachios','Walnuts','Figs','Apricots'];const el=document.getElementById('popSearchInput');if(el)el.value='';return {popularSearches:[...cur,v.trim()]};});};
    // Banner product management
    const selBannerIdx=S.selBannerIdx||0;
    const _defBannerPids=[{p1:true,p2:true,p3:true,p4:true,p5:true,p6:true,p7:true,p9:true,p11:true,p12:true,p13:true,p15:true,p16:true,p17:true,p18:true,p19:true,p20:true},{p10:true},{p8:true}];
    const _bannerProdsMap=S.bannerProdsMap||{};
    const _getBannerPids=(idx)=>_bannerProdsMap[idx]||_defBannerPids[idx]||{};
    const adBannerProds=P.map(pr=>({...pr,grad:this.grad(pr.tone),inBanner:!!(_getBannerPids(selBannerIdx)[pr.id]),toggle:()=>this.setState(st=>{const bpm=st.bannerProdsMap||{};const cur=bpm[selBannerIdx]||_defBannerPids[selBannerIdx]||{};return{bannerProdsMap:{...bpm,[selBannerIdx]:{...cur,[pr.id]:!cur[pr.id]}}};}) }));
    const bannerTabs=[{name:'Harvest Season',idx:0},{name:'Gifting',idx:1},{name:'Saffron Drop',idx:2}].map(t=>({...t,cls:selBannerIdx===t.idx?'adtab on':'adtab',sel:()=>this.setState({selBannerIdx:t.idx})}));
    const adBanners=[{title:'Harvest Festival'`,
  'admin-flash-and-popular-data'
);

// Banner Products + Flash Sale + Popular Searches panels
html = replaceOnce(html,
  '<div style="height:8px"></div></div></sc-if><sc-if value="{{ adSettings }}"',
  `<div style="height:16px"></div>
<div class="panel" style="margin-bottom:12px">
  <div class="panelhd"><div class="panelt">Banner Products</div><div style="font-size:11px;color:#a89c8a">Session only — connect Supabase for live sync</div></div>
  <div style="display:flex;gap:6px;margin-bottom:12px">
    <sc-for list="{{ bannerTabs }}" as="bt" hint-placeholder-count="3">
      <button class="{{ bt.cls }}" onClick="{{ bt.sel }}" style="font-size:11px;padding:4px 12px">{{ bt.name }}</button>
    </sc-for>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;max-height:260px;overflow-y:auto">
    <sc-for list="{{ adBannerProds }}" as="bp" hint-placeholder-count="9">
      <div style="display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;background:#faf7f1;border:1.5px solid {{ bp.inBanner ? 'rgba(185,122,46,.4)' : 'rgba(140,120,90,.1)' }};cursor:pointer" onClick="{{ bp.toggle }}">
        <div style="width:28px;height:28px;border-radius:8px;flex:none;background:{{ bp.grad }}"></div>
        <div style="flex:1;min-width:0"><div style="font:600 10px Manrope;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ bp.name }}</div><div style="font-size:9px;color:#a89c8a">{{ bp.cat }}</div></div>
        <div style="width:14px;height:14px;border-radius:50%;background:{{ bp.inBanner ? 'var(--ac)' : '#e6ddcc' }};flex:none;transition:.2s"></div>
      </div>
    </sc-for>
  </div>
</div>
<div class="adcols" style="grid-template-columns:1fr 1fr;margin-top:0">
  <div class="panel">
    <div class="panelhd"><div class="panelt">Flash Sale Products</div><span class="st {{ flashLiveCls }}" style="cursor:pointer" onClick="{{ toggleFlashLive }}"><span class="stipdot"></span>{{ flashLiveLbl }}</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:320px;overflow-y:auto">
      <sc-for list="{{ adFlashProds }}" as="fp" hint-placeholder-count="6">
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:#faf7f1;border:1.5px solid {{ fp.inFlash ? 'rgba(185,122,46,.4)' : 'rgba(140,120,90,.1)' }};cursor:pointer" onClick="{{ fp.toggle }}">
          <div style="width:32px;height:32px;border-radius:8px;flex:none;background:{{ fp.grad }}"></div>
          <div style="flex:1;min-width:0"><div style="font:600 11px Manrope;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ fp.name }}</div><div style="font-size:10px;color:#a89c8a;margin-top:1px">{{ fp.cat }}</div></div>
          <div style="width:16px;height:16px;border-radius:50%;background:{{ fp.inFlash ? 'var(--ac)' : '#e6ddcc' }};flex:none;transition:.2s;display:flex;align-items:center;justify-content:center">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>
          </div>
        </div>
      </sc-for>
    </div>
  </div>
  <div class="panel">
    <div class="panelhd"><div class="panelt">Popular Searches</div></div>
    <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px">
      <sc-for list="{{ adPopulars }}" as="t" hint-placeholder-count="6">
        <div style="display:flex;align-items:center;gap:5px;background:#f5f1e9;padding:5px 11px 5px 13px;border-radius:20px;font:600 12px Manrope">
          {{ t }}<button onClick="{{ removePopular(t) }}" style="background:none;border:0;cursor:pointer;color:#a89c8a;font-size:15px;padding:0 0 0 2px;line-height:1">×</button>
        </div>
      </sc-for>
    </div>
    <div style="display:flex;gap:8px">
      <input id="popSearchInput" class="input" style="flex:1;height:36px;font-size:13px" placeholder="Add search term…"/>
      <button class="adbtn" style="height:36px;padding:0 14px;font-size:12px" onClick="{{ addPopularSearch }}">Add</button>
    </div>
  </div>
</div>
<div style="height:8px"></div></div></sc-if><sc-if value="{{ adSettings }}"`,
  'admin-flash-popular-panels'
);

writeFileSync(OUT, html, 'utf8');
console.log('build-admin: wrote', OUT, '(' + html.length + ' bytes)');
