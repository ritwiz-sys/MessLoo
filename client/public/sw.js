const CACHE = 'messloo-v6'

// ─── Standalone offline page ───────────────────────────────────────────────────
// KEY RULE for this template literal:
//   ✗ Never use \" or \' — the backslash is consumed by the template literal,
//     leaving a bare quote that breaks the inner JS string.
//   ✓ Use SINGLE-QUOTED JS strings ('...') for HTML building.
//     Double quotes inside HTML attributes need NO escaping inside single-quoted strings.
//   ✓ Plain " and ' are fine as literal characters; only \x22 / \x27 SEQUENCES are eaten.
const OFFLINE_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"/>
  <meta name="theme-color" content="#E23744"/>
  <title>MessLoo</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html{min-height:100%}
    html::before{content:'';position:fixed;inset:0;background:linear-gradient(135deg,#FFB5B5 0%,#B5E8C8 40%,#F5E87A 75%,#FFFFFF 100%);z-index:-1;pointer-events:none}
    body{font-family:system-ui,sans-serif;min-height:100dvh;background:transparent;-webkit-font-smoothing:antialiased;padding-bottom:max(112px,calc(env(safe-area-inset-bottom,0px) + 104px))}
    .wrap{max-width:512px;margin:0 auto;padding:max(56px,calc(env(safe-area-inset-top,0px) + 16px)) 20px 0}
    .greeting{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8B8B8B}
    .uname{font-size:32px;font-weight:800;color:#1C1C1E;letter-spacing:-.01em;margin-top:2px;line-height:1}
    .block-pill{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:6px 12px;border-radius:100px;background:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.6);font-size:11px;font-weight:700;color:#555}
    /* segmented */
    .seg{position:relative;display:flex;background:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.6);border-radius:100px;padding:4px;margin-top:16px}
    .seg-pill{position:absolute;top:4px;bottom:4px;border-radius:100px;background:#E23744;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:left .22s cubic-bezier(.4,0,.2,1);pointer-events:none}
    .seg button{flex:1;position:relative;z-index:1;padding:9px 8px;border-radius:100px;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:color .22s}
    .seg button.active{color:#fff}
    .seg button:not(.active){color:#666}
    /* section */
    .sec-title{font-size:15px;font-weight:900;color:#1C1C1E;margin:16px 0 8px}
    /* meal card */
    .card{width:100%;border-radius:20px;overflow:hidden;background:rgba(255,255,255,.45);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.6);box-shadow:0 4px 24px rgba(0,0,0,.08);margin-bottom:12px;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s;display:block}
    .card:active{transform:scale(.98)}
    .banner{position:relative;overflow:hidden;min-height:92px;display:flex;align-items:center}
    .b-img{position:absolute;inset:0;background-size:cover;background-position:right center;opacity:.7}
    .b-fade{position:absolute;inset:0;pointer-events:none}
    .b-wash{position:absolute;inset:0;opacity:.42;pointer-events:none}
    .b-text{position:relative;z-index:1;padding:14px 16px;flex:0 0 58%;max-width:58%}
    .b-name{font-size:18px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-.01em;margin-bottom:3px}
    .b-time{font-size:11px;color:rgba(255,255,255,.75)}
    .dishes{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px 13px 16px}
    .dish-txt{font-size:13px;font-weight:500;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
    .more-pill{display:inline-block;margin-top:5px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px;background:rgba(226,55,68,.1);color:#E23744;border:1px solid rgba(226,55,68,.2)}
    .arrow{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .no-menu{font-size:12px;font-style:italic;color:#8B8B8B}
    /* bottom pill nav */
    .bottom-bar{position:fixed;left:0;right:0;display:flex;justify-content:center;pointer-events:none;z-index:50;bottom:max(20px,calc(env(safe-area-inset-bottom,0px) + 12px))}
    .pill-nav{pointer-events:auto;display:flex;align-items:center;border-radius:100px;padding:6px 8px;gap:4px;background:rgba(255,255,255,.82);-webkit-backdrop-filter:blur(28px);backdrop-filter:blur(28px);border:1px solid rgba(0,0,0,.06);box-shadow:0 8px 32px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.1)}
    .tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:80px;padding:8px 28px;min-width:80px;border:none;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .15s;color:#999}
    .tab.active{background:rgba(226,55,68,.1);color:#E23744}
    .tab span{font-size:10px;font-weight:700;letter-spacing:.04em}
    /* modal overlay */
    #overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);z-index:50}
    #sheet{display:none;position:fixed;bottom:0;left:0;right:0;max-width:512px;margin:0 auto;border-radius:24px 24px 0 0;background:rgba(255,255,255,.96);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,.8);z-index:51;overflow:hidden}
  </style>
</head>
<body>
<div id="overlay"></div>
<div id="sheet"></div>
<div class="wrap" id="app"></div>
<div class="bottom-bar">
  <nav class="pill-nav">
    <button class="tab active">
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
  var EMOJIS = {breakfast:'☀️',lunch:'🍛',snacks:'🧆',dinner:'🌙'};
  var TIMES  = {breakfast:'7:30 – 9:00 AM',lunch:'12:00 – 2:00 PM',snacks:'4:00 – 5:30 PM',dinner:'7:00 – 9:30 PM'};
  var GRADS  = {breakfast:'linear-gradient(145deg,#FF9966,#FF5E62)',lunch:'linear-gradient(145deg,#EB3349,#F45C43)',snacks:'linear-gradient(145deg,#F7971E,#FFD200)',dinner:'linear-gradient(145deg,#C94B4B,#8B0000)'};
  var FADES  = {breakfast:'#FF7040',lunch:'#E83040',snacks:'#F79A1E',dinner:'#A03030'};
  var DOTS   = {breakfast:'#FF7A7A',lunch:'#EB3349',snacks:'#F7971E',dinner:'#C94B4B'};
  var SHADS  = {breakfast:'rgba(255,94,98,.4)',lunch:'rgba(235,51,73,.4)',snacks:'rgba(247,151,30,.4)',dinner:'rgba(201,75,75,.4)'};
  var IMGS   = {breakfast:'/breakfast.jpg',lunch:'/lunch.jpg',snacks:'/snacks.jpg',dinner:'/dinner.jpg'};
  var TYPES  = [{key:'veg',label:'Veg'},{key:'non_veg',label:'Non-Veg'},{key:'special',label:'Special'}];

  function todayISO() {
    var n=new Date(),l=new Date(n.getTime()-n.getTimezoneOffset()*60000);
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

  function loadMenus(type) {
    var arr = getCached('messloo_menus_'+date+'_'+block+'_'+type)||[];
    menuMap={};
    arr.forEach(function(m){menuMap[m.meal_type]=m;});
  }

  function makeCard(mt) {
    var item   = menuMap[mt];
    var dishes = item?splitDishes(item.items):[];
    var f      = FADES[mt];
    var prev   = dishes.slice(0,3).join('  ·  ');
    var extra  = dishes.length>3?dishes.length-3:0;
    var g      = GRADS[mt];
    var hasMenu= !!item;

    return '<div class="card" data-meal="'+mt+'">'
      +'<div class="banner" style="background:'+g+'">'
      +'<div class="b-img" style="background-image:url('+IMGS[mt]+')"></div>'
      +'<div class="b-fade" style="background:linear-gradient(90deg,'+f+' 0%,'+f+' 38%,'+f+'ee 50%,'+f+'aa 60%,'+f+'55 70%,'+f+'22 80%,transparent 92%)"></div>'
      +'<div class="b-wash" style="background:'+g+'"></div>'
      +'<div class="b-text">'
      +'<p class="b-name">'+LABELS[mt]+'</p>'
      +'<p class="b-time">'+EMOJIS[mt]+' '+TIMES[mt]+'</p>'
      +'</div>'
      +'</div>'
      +'<div class="dishes">'
      +'<div style="flex:1;min-width:0">'
      +(hasMenu
        ?'<p class="dish-txt">'+(prev||item.items||'')+'</p>'+(extra>0?'<span class="more-pill">+'+extra+' more</span>':'')
        :'<p class="no-menu">Menu not posted yet</p>')
      +'</div>'
      +(hasMenu
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
    document.getElementById('cards').innerHTML = ORDER.map(makeCard).join('');
    document.querySelectorAll('.card[data-meal]').forEach(function(el) {
      if(menuMap[el.getAttribute('data-meal')]) {
        el.addEventListener('click',function(){openSheet(el.getAttribute('data-meal'));});
      }
    });
  }

  function setSeg(key,idx) {
    curType=key;
    document.querySelectorAll('.seg button').forEach(function(b,i){
      b.className=i===idx?'active':'';
    });
    var n=TYPES.length;
    var pill=document.querySelector('.seg-pill');
    pill.style.left='calc(4px + '+idx+' * (100% - 8px) / '+n+')';
    pill.style.width='calc((100% - 8px) / '+n+')';
    renderCards();
  }

  /* bottom sheet */
  var overlay=document.getElementById('overlay');
  var sheet=document.getElementById('sheet');
  window.openSheet=function(mt) {
    var item=menuMap[mt]; if(!item) return;
    var dishes=splitDishes(item.items);
    var rows=dishes.map(function(d,i){
      var bg=i%2===0?'rgba(255,255,255,.85)':'rgba(248,248,248,.85)';
      var sep=i<dishes.length-1?'border-bottom:1px solid rgba(0,0,0,.06);':'';
      return '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:'+bg+';'+sep+'">'
        +'<span style="width:6px;height:6px;border-radius:50%;background:'+DOTS[mt]+';flex-shrink:0"></span>'
        +'<span style="font-size:14px;font-weight:500;color:#1C1C1E">'+d+'</span></div>';
    }).join('');
    sheet.innerHTML='<div style="height:4px;background:'+GRADS[mt]+'"></div>'
      +'<div style="padding:20px 20px max(40px,calc(env(safe-area-inset-bottom,0px)+32px))">'
      +'<div style="width:40px;height:4px;border-radius:2px;background:#DDD;margin:0 auto 16px"></div>'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
      +'<div style="width:40px;height:40px;border-radius:12px;background:'+GRADS[mt]+';display:flex;align-items:center;justify-content:center;font-size:20px">'+EMOJIS[mt]+'</div>'
      +'<div><p style="font-size:16px;font-weight:900;color:#1C1C1E">'+LABELS[mt]+'</p>'
      +'<p style="font-size:11px;color:#8B8B8B">'+TIMES[mt]+'</p></div>'
      +'</div>'
      +(rows?'<div style="border:1px solid rgba(0,0,0,.06);border-radius:12px;overflow:hidden">'+rows+'</div>':'')
      +'<button onclick="closeSheet()" style="width:100%;margin-top:16px;padding:12px;border-radius:16px;background:rgba(0,0,0,.07);color:#8B8B8B;font-size:14px;font-weight:600;border:none;cursor:pointer">Close</button>'
      +'</div>';
    overlay.style.display='block';sheet.style.display='block';
  };
  window.closeSheet=function(){overlay.style.display='none';sheet.style.display='none';};
  overlay.addEventListener('click',closeSheet);

  /* build header */
  // data-key / data-idx avoids onclick string literals with embedded quotes
  var segBtns=TYPES.map(function(t,i){
    return '<button class="'+(i===0?'active':'')+'" data-key="'+t.key+'" data-idx="'+i+'">'+t.label+'</button>';
  }).join('');

  document.getElementById('app').innerHTML=
    '<div style="display:flex;align-items:flex-start;justify-content:space-between">'
    +'<div style="flex:1;min-width:0">'
    +'<p class="greeting">'+greeting()+'</p>'
    +'<h1 class="uname">'+(fname||'MessLoo')+'</h1>'
    +'</div>'
    +'</div>'
    +(block?'<div><span class="block-pill">&#127968; '+block+'</span></div>':'')
    +'<div class="seg"><div class="seg-pill" style="width:calc((100% - 8px)/3);left:4px"></div>'+segBtns+'</div>'
    +'<p class="sec-title">Today&#39;s Menu</p>'
    +'<div id="cards"></div>';

  // Bind seg buttons after innerHTML — no onclick string args needed
  document.querySelectorAll('.seg button[data-key]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setSeg(btn.getAttribute('data-key'), parseInt(btn.getAttribute('data-idx'), 10));
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
        // Navigation → standalone offline page (no Vite/module refs → nothing 503s)
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
