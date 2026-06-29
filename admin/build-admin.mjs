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

// Flash sale state + adFlashPids for admin to toggle products into flash sale
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
    const adBanners=[{title:'Harvest Festival'`,
  'admin-flash-and-popular-data'
);

// Flash Sale + Popular Searches panel: inject after campaigns panel in adPromos section
html = replaceOnce(html,
  '<div style="height:8px"></div></div></sc-if><sc-if value="{{ adSettings }}"',
  `<div style="height:16px"></div>
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
