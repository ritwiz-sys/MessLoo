const CACHE = 'messloo-v6'

// ─── Standalone offline page ───────────────────────────────────────────────────
// KEY RULE for this template literal:
//   ✗ Never use \' or \" — the backslash is consumed by the template literal.
//   ✓ Plain single quotes and double quotes are fine as literal characters.
//   ✓ data-* attributes instead of onclick="fn('arg')" — avoids embedded quotes.
//   ✓ &#39; for apostrophes in HTML text.
//   ✓ <div style="background-image:url(...)"> instead of <img onerror>.
//   ✓ CSS custom properties work fine in inline style="color:var(--x)".
const OFFLINE_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"/>
  <meta name="theme-color" content="#E23744"/>
  <title>MessLoo</title>

  <!-- Anti-flash: apply stored/system theme before CSS renders -->
  <script>
  (function(){
    var t='';
    try{t=localStorage.getItem('messloo_theme')||'';}catch(e){}
    if(t!=='dark'&&t!=='light') t=window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
    document.documentElement.setAttribute('data-theme',t);
  })();
  <\/script>

  <style>
    /* ── CSS variables (mirrors index.css) ── */
    :root{
      --bg-gradient:linear-gradient(135deg,#FFB5B5 0%,#B5E8C8 40%,#F5E87A 75%,#FFFFFF 100%);
      --text-primary:#1C1C1E;
      --text-secondary:#555;
      --text-muted:#8B8B8B;
      --card-bg:rgba(255,255,255,.45);
      --card-blur:blur(16px);
      --card-border:1px solid rgba(255,255,255,.6);
      --card-shadow:0 4px 24px rgba(0,0,0,.08);
      --seg-bg:rgba(255,255,255,.45);
      --seg-border:1px solid rgba(255,255,255,.6);
      --seg-active-bg:#E23744;
      --seg-active-text:#fff;
      --seg-inactive-text:#666;
      --pill-bg:rgba(226,55,68,.1);
      --pill-color:#E23744;
      --pill-border:rgba(226,55,68,.2);
      --bottom-bar-bg:rgba(255,255,255,.82);
      --bottom-bar-border:rgba(0,0,0,.06);
      --tab-active:#E23744;
      --tab-active-bg:rgba(226,55,68,.1);
      --tab-inactive:#999;
      --modal-bg:rgba(255,255,255,.96);
      --dish-odd:rgba(255,255,255,.85);
      --dish-even:rgba(248,248,248,.85);
      --dish-border:rgba(0,0,0,.06);
      --dish-text:#1C1C1E;
      --greeting-color:#8B8B8B;
      --handle-color:#DDD;
      --toggle-bg:rgba(0,0,0,.07);
      --section-title:#1C1C1E;
      --block-bg:rgba(255,255,255,.45);
      --block-border:rgba(255,255,255,.6);
      --block-color:#555;
    }
    [data-theme="dark"]{
      --bg-gradient:linear-gradient(135deg,#3D0000 0%,#0A0A3A 40%,#1A1A00 70%,#7A4500 100%);
      --text-primary:#fff;
      --text-secondary:rgba(255,255,255,.65);
      --text-muted:rgba(255,255,255,.38);
      --card-bg:rgba(255,255,255,.08);
      --card-border:1px solid rgba(255,255,255,.12);
      --card-shadow:0 4px 24px rgba(0,0,0,.32);
      --seg-bg:rgba(255,255,255,.10);
      --seg-border:1px solid rgba(255,255,255,.14);
      --seg-active-bg:#fff;
      --seg-active-text:#1C1C1E;
      --seg-inactive-text:rgba(255,255,255,.48);
      --pill-bg:rgba(255,255,255,.12);
      --pill-color:rgba(255,255,255,.80);
      --pill-border:rgba(255,255,255,.18);
      --bottom-bar-bg:rgba(5,5,15,.80);
      --bottom-bar-border:rgba(255,255,255,.10);
      --tab-active:#FF8A96;
      --tab-active-bg:rgba(255,138,150,.14);
      --tab-inactive:rgba(255,255,255,.38);
      --modal-bg:rgba(12,8,8,.96);
      --dish-odd:rgba(255,255,255,.06);
      --dish-even:rgba(255,255,255,.03);
      --dish-border:rgba(255,255,255,.08);
      --dish-text:rgba(255,255,255,.88);
      --greeting-color:rgba(255,255,255,.38);
      --handle-color:rgba(255,255,255,.18);
      --toggle-bg:rgba(255,255,255,.10);
      --section-title:rgba(255,255,255,.90);
      --block-bg:rgba(255,255,255,.08);
      --block-border:rgba(255,255,255,.12);
      --block-color:rgba(255,255,255,.65);
    }
    @media(prefers-color-scheme:dark){
      :root:not([data-theme="light"]){
        --bg-gradient:linear-gradient(135deg,#3D0000 0%,#0A0A3A 40%,#1A1A00 70%,#7A4500 100%);
        --text-primary:#fff;
        --text-secondary:rgba(255,255,255,.65);
        --text-muted:rgba(255,255,255,.38);
        --card-bg:rgba(255,255,255,.08);
        --card-border:1px solid rgba(255,255,255,.12);
        --card-shadow:0 4px 24px rgba(0,0,0,.32);
        --seg-bg:rgba(255,255,255,.10);
        --seg-border:1px solid rgba(255,255,255,.14);
        --seg-active-bg:#fff;
        --seg-active-text:#1C1C1E;
        --seg-inactive-text:rgba(255,255,255,.48);
        --pill-bg:rgba(255,255,255,.12);
        --pill-color:rgba(255,255,255,.80);
        --pill-border:rgba(255,255,255,.18);
        --bottom-bar-bg:rgba(5,5,15,.80);
        --bottom-bar-border:rgba(255,255,255,.10);
        --tab-active:#FF8A96;
        --tab-active-bg:rgba(255,138,150,.14);
        --tab-inactive:rgba(255,255,255,.38);
        --modal-bg:rgba(12,8,8,.96);
        --dish-odd:rgba(255,255,255,.06);
        --dish-even:rgba(255,255,255,.03);
        --dish-border:rgba(255,255,255,.08);
        --dish-text:rgba(255,255,255,.88);
        --greeting-color:rgba(255,255,255,.38);
        --handle-color:rgba(255,255,255,.18);
        --toggle-bg:rgba(255,255,255,.10);
        --section-title:rgba(255,255,255,.90);
        --block-bg:rgba(255,255,255,.08);
        --block-border:rgba(255,255,255,.12);
        --block-color:rgba(255,255,255,.65);
      }
    }

    /* ── Base ── */
    *{box-sizing:border-box;margin:0;padding:0}
    html{min-height:100%}
    html::before{content:'';position:fixed;inset:0;background:var(--bg-gradient);z-index:-1;pointer-events:none;transition:background .4s ease}
    body{font-family:system-ui,sans-serif;min-height:100dvh;background:transparent;-webkit-font-smoothing:antialiased;padding-bottom:max(112px,calc(env(safe-area-inset-bottom,0px) + 104px));color:var(--text-primary)}
    .wrap{max-width:512px;margin:0 auto;padding:max(56px,calc(env(safe-area-inset-top,0px) + 16px)) 20px 0}

    /* ── Header ── */
    .greeting{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--greeting-color)}
    .uname{font-size:32px;font-weight:800;color:var(--text-primary);letter-spacing:-.01em;margin-top:2px;line-height:1}
    .block-pill{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:6px 12px;border-radius:100px;background:var(--block-bg);border:1px solid var(--block-border);font-size:11px;font-weight:700;color:var(--block-color)}

    /* ── Theme toggle ── */
    .theme-btn{width:36px;height:36px;border-radius:50%;border:var(--card-border);background:var(--toggle-bg);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s;font-size:17px;flex-shrink:0;line-height:1}
    .theme-btn:active{transform:scale(.9)}

    /* ── Segmented control ── */
    .seg{position:relative;display:flex;background:var(--seg-bg);border:var(--seg-border);border-radius:100px;padding:4px;margin-top:16px}
    .seg-pill{position:absolute;top:4px;bottom:4px;border-radius:100px;background:var(--seg-active-bg);box-shadow:0 2px 8px rgba(0,0,0,.18);transition:left .22s cubic-bezier(.4,0,.2,1),width .22s cubic-bezier(.4,0,.2,1);pointer-events:none}
    .seg button{flex:1;position:relative;z-index:1;padding:9px 8px;border-radius:100px;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:color .22s}
    .seg button.active{color:var(--seg-active-text)}
    .seg button:not(.active){color:var(--seg-inactive-text)}

    /* ── Section title ── */
    .sec-title{font-size:15px;font-weight:900;color:var(--section-title);margin:16px 0 8px}

    /* ── Meal card ── */
    .card{width:100%;border-radius:20px;overflow:hidden;background:var(--card-bg);-webkit-backdrop-filter:var(--card-blur);backdrop-filter:var(--card-blur);border:var(--card-border);box-shadow:var(--card-shadow);margin-bottom:12px;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s;display:block}
    .card:active{transform:scale(.98)}
    .banner{position:relative;overflow:hidden;min-height:92px;display:flex;align-items:center}
    .b-bg{position:absolute;inset:0;background-size:cover;background-position:right center;opacity:.7}
    .b-fade{position:absolute;inset:0;pointer-events:none}
    .b-wash{position:absolute;inset:0;opacity:.42;pointer-events:none}
    .b-text{position:relative;z-index:1;padding:14px 16px;flex:0 0 58%;max-width:58%}
    .b-name{font-size:18px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-.01em;margin-bottom:3px}
    .b-time{font-size:11px;color:rgba(255,255,255,.75)}
    .dishes{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px 13px 16px}
    .dish-txt{font-size:13px;font-weight:500;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
    .more-pill{display:inline-block;margin-top:5px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px;background:var(--pill-bg);color:var(--pill-color);border:1px solid var(--pill-border)}
    .arrow{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .no-menu{font-size:12px;font-style:italic;color:var(--text-muted)}

    /* ── Bottom pill nav ── */
    .bottom-bar{position:fixed;left:0;right:0;display:flex;justify-content:center;pointer-events:none;z-index:50;bottom:max(20px,calc(env(safe-area-inset-bottom,0px) + 12px))}
    .pill-nav{pointer-events:auto;display:flex;align-items:center;border-radius:100px;padding:6px 8px;gap:4px;background:var(--bottom-bar-bg);-webkit-backdrop-filter:blur(28px);backdrop-filter:blur(28px);border:1px solid var(--bottom-bar-border);box-shadow:0 8px 32px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.1)}
    .tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:80px;padding:8px 28px;min-width:80px;border:none;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .15s;color:var(--tab-inactive)}
    .tab.tab-active{background:var(--tab-active-bg);color:var(--tab-active)}
    .tab span{font-size:10px;font-weight:700;letter-spacing:.04em}

    /* ── Sheet ── */
    #overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);z-index:50}
    #sheet{display:none;position:fixed;bottom:0;left:0;right:0;max-width:512px;margin:0 auto;border-radius:24px 24px 0 0;background:var(--modal-bg);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,.2);z-index:51;overflow:hidden}
  </style>
</head>
<body>
<div id="overlay"></div>
<div id="sheet"></div>
<div class="wrap" id="app"></div>
<div class="bottom-bar">
  <nav class="pill-nav">
    <button class="tab tab-active">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="opacity:.9"/>
      </svg>
      <span>Home</span>
    </button>
    <button class="tab">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/>
        <path d="M4 20C4 17.2386 7.58172 15 12 15C16.4183 15 20 17.2386 20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <span>Profile</span>
    </button>
  </nav>
</div>

<script>
(function() {
  var ORDER  = ['breakfast','lunch','snacks','dinner'];
  var LABELS = {breakfast:'Breakfast',lunch:'Lunch',snacks:'Evening Snacks',dinner:'Dinner'};
  var EMOJIS = {breakfast:'&#9728;&#65039;',lunch:'&#127835;',snacks:'&#129286;',dinner:'&#127769;'};
  var TIMES  = {breakfast:'7:30 – 9:00 AM',lunch:'12:00 – 2:00 PM',snacks:'4:00 – 5:30 PM',dinner:'7:00 – 9:30 PM'};
  var GRADS  = {
    breakfast:'linear-gradient(145deg,#FF9966,#FF5E62)',
    lunch:    'linear-gradient(145deg,#EB3349,#F45C43)',
    snacks:   'linear-gradient(145deg,#F7971E,#FFD200)',
    dinner:   'linear-gradient(145deg,#C94B4B,#8B0000)'
  };
  var FADES  = {breakfast:'#FF7040',lunch:'#E83040',snacks:'#F79A1E',dinner:'#A03030'};
  var DOTS   = {breakfast:'#FF7A7A',lunch:'#EB3349',snacks:'#F7971E',dinner:'#C94B4B'};
  var SHADS  = {breakfast:'rgba(255,94,98,.4)',lunch:'rgba(235,51,73,.4)',snacks:'rgba(247,151,30,.4)',dinner:'rgba(201,75,75,.4)'};
  var IMGS   = {breakfast:'/breakfast.jpg',lunch:'/lunch.jpg',snacks:'/snacks.jpg',dinner:'/dinner.jpg'};
  var TYPES  = [
    {key:'veg',    label:'Veg'},
    {key:'non_veg',label:'Non-Veg'},
    {key:'special',label:'Special'}
  ];

  function todayISO() {
    var n=new Date(), l=new Date(n.getTime()-n.getTimezoneOffset()*60000);
    return l.toISOString().slice(0,10);
  }
  function greeting() {
    var h=new Date().getHours();
    return h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  }
  function getCached(k) { try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;} }
  function splitDishes(s) {
    if(!s) return [];
    return s.split(/[,;|\/]/).map(function(x){return x.trim();}).filter(Boolean);
  }

  var date    = todayISO();
  var block   = localStorage.getItem('messloo_user_block')||'';
  var rawName = localStorage.getItem('messloo_user_name')||'';
  var fname   = rawName.split(' ')[0]||'';
  var curType = 'veg';
  var menuMap = {};

  /* ── Theme ── */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme')||'light';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
  }

  /* ── Menus ── */
  function loadMenus(type) {
    var arr=getCached('messloo_menus_'+date+'_'+block+'_'+type)||[];
    menuMap={};
    arr.forEach(function(m){ menuMap[m.meal_type]=m; });
  }

  function makeCard(mt) {
    var item  = menuMap[mt];
    var dishes= item?splitDishes(item.items):[];
    var f=FADES[mt], g=GRADS[mt];
    var prev  = dishes.slice(0,3).join('  ·  ');
    var extra = dishes.length>3?dishes.length-3:0;

    return '<div class="card" data-meal="'+mt+'">'
      +'<div class="banner" style="background:'+g+'">'
      +'<div class="b-bg" style="background-image:url('+IMGS[mt]+')"></div>'
      +'<div class="b-fade" style="background:linear-gradient(90deg,'+f+' 0%,'+f+' 38%,'+f+'ee 50%,'+f+'aa 60%,'+f+'55 70%,'+f+'22 80%,transparent 92%)"></div>'
      +'<div class="b-wash" style="background:'+g+'"></div>'
      +'<div class="b-text">'
      +'<p class="b-name">'+LABELS[mt]+'</p>'
      +'<p class="b-time">'+EMOJIS[mt]+' '+TIMES[mt]+'</p>'
      +'</div>'
      +'</div>'
      +'<div class="dishes">'
      +'<div style="flex:1;min-width:0">'
      +(item
        ?'<p class="dish-txt">'+(prev||item.items||'')+'</p>'+(extra>0?'<span class="more-pill">+'+extra+' more</span>':'')
        :'<p class="no-menu">Menu not posted yet</p>')
      +'</div>'
      +(item
        ?'<div class="arrow" style="background:'+g+';box-shadow:0 4px 10px '+SHADS[mt]+'">'
          +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none">'
          +'<path d="M5 12H19M13 6L19 12L13 18" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
          +'</svg></div>'
        :'')
      +'</div>'
      +'</div>';
  }

  function renderCards() {
    loadMenus(curType);
    document.getElementById('cards').innerHTML=ORDER.map(makeCard).join('');
    document.querySelectorAll('.card[data-meal]').forEach(function(el) {
      if(menuMap[el.getAttribute('data-meal')]) {
        el.addEventListener('click', function(){ openSheet(el.getAttribute('data-meal')); });
      }
    });
  }

  /* ── Segmented control ── */
  function setSeg(key, idx) {
    curType=key;
    document.querySelectorAll('.seg button').forEach(function(b,i){ b.className=i===idx?'active':''; });
    var n=TYPES.length;
    var pill=document.querySelector('.seg-pill');
    pill.style.left='calc(4px + '+idx+' * (100% - 8px) / '+n+')';
    pill.style.width='calc((100% - 8px) / '+n+')';
    renderCards();
  }

  /* ── Bottom sheet ── */
  var overlay=document.getElementById('overlay');
  var sheet=document.getElementById('sheet');

  function openSheet(mt) {
    var item=menuMap[mt]; if(!item) return;
    document.body.style.overflow='hidden';
    var dishes=splitDishes(item.items);
    var rows=dishes.map(function(d,i){
      var bg=i%2===0?'var(--dish-odd)':'var(--dish-even)';
      var sep=i<dishes.length-1?'border-bottom:1px solid var(--dish-border);':'';
      return '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:'+bg+';'+sep+'">'
        +'<span style="width:6px;height:6px;border-radius:50%;background:'+DOTS[mt]+';flex-shrink:0"></span>'
        +'<span style="font-size:14px;font-weight:500;color:var(--dish-text)">'+d+'</span>'
        +'</div>';
    }).join('');

    sheet.innerHTML='<div style="height:4px;background:'+GRADS[mt]+'"></div>'
      +'<div style="padding-bottom:max(32px,calc(env(safe-area-inset-bottom,0px) + 24px))">'
      // Header row — emoji+name left, X button right (identical to online MealCard popup)
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<div style="width:40px;height:40px;border-radius:12px;background:'+GRADS[mt]+';box-shadow:0 4px 12px '+SHADS[mt]+';display:flex;align-items:center;justify-content:center;font-size:20px">'+EMOJIS[mt]+'</div>'
      +'<div>'
      +'<p style="font-size:16px;font-weight:900;line-height:1.2;color:var(--text-primary)">'+LABELS[mt]+'</p>'
      +'<p style="font-size:11px;color:var(--text-muted)">'+TIMES[mt]+'</p>'
      +'</div>'
      +'</div>'
      +'<button id="close-btn" style="width:32px;height:32px;border-radius:50%;background:var(--toggle-bg);color:var(--text-muted);border:none;cursor:pointer;-webkit-tap-highlight-color:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s">'
      +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none">'
      +'<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
      +'</svg>'
      +'</button>'
      +'</div>'
      +(rows?'<div style="margin:0 20px;border:1px solid var(--dish-border);border-radius:12px;overflow:hidden">'+rows+'</div>':'')
      +'</div>';

    overlay.style.display='block';
    sheet.style.display='block';
    document.getElementById('close-btn').addEventListener('click', closeSheet);
  }

  function closeSheet() {
    overlay.style.display='none';
    sheet.style.display='none';
    document.body.style.overflow='';
  }
  overlay.addEventListener('click', closeSheet);

  /* ── Build initial HTML ── */
  // data-key / data-idx on seg buttons — avoids onclick with quoted string args
  var segBtns=TYPES.map(function(t,i){
    return '<button class="'+(i===0?'active':'')+'" data-key="'+t.key+'" data-idx="'+i+'">'+t.label+'</button>';
  }).join('');

  document.getElementById('app').innerHTML=
    '<div style="display:flex;align-items:flex-start;justify-content:space-between">'
    +'<div style="flex:1;min-width:0">'
    +'<p class="greeting">'+greeting()+'</p>'
    +'<h1 class="uname">'+(fname||'MessLoo')+'</h1>'
    +'</div>'
    +'<div style="flex-shrink:0;margin-left:12px;margin-top:4px">'
    +'<button class="theme-btn" id="theme-btn"></button>'
    +'</div>'
    +'</div>'
    +(block?'<div><span class="block-pill">&#127968; '+block+'</span></div>':'')
    +'<div class="seg">'
    +'<div class="seg-pill" style="width:calc((100% - 8px)/3);left:4px"></div>'
    +segBtns
    +'</div>'
    +'<p class="sec-title">Today&#39;s Menu</p>'
    +'<div id="cards"></div>';

  /* Wire up theme toggle */
  applyTheme(currentTheme()); // set button icon from already-applied theme
  document.getElementById('theme-btn').addEventListener('click', function() {
    var next=currentTheme()==='dark'?'light':'dark';
    try{localStorage.setItem('messloo_theme',next);}catch(e){}
    applyTheme(next);
  });

  /* Wire up seg buttons */
  document.querySelectorAll('.seg button[data-key]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setSeg(btn.getAttribute('data-key'), parseInt(btn.getAttribute('data-idx'),10));
    });
  });

  renderCards();
})();
</script>
</body>
</html>`

/* ── Install ── */
self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting())
})

/* ── Activate ── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

/* ── Fetch ── */
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('supabase')) return
  if (!url.protocol.startsWith('http')) return
  if (url.hostname.includes('clerk') && !url.pathname.startsWith('/npm/')) return

  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
        }
        return res
      })
      .catch(async () => {
        if (request.mode === 'navigate') {
          return new Response(OFFLINE_PAGE, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        }
        const cached = await caches.match(request)
        if (cached) return cached
        return new Response('Offline', { status: 503 })
      })
  )
})
