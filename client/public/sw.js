const CACHE = 'messloo-v4'

// ─── Standalone offline page ───────────────────────────────────────────────────
// No Vite / React / Clerk — zero module imports, nothing that 503s.
// IMPORTANT: this string is a JS template literal. Rules for the inline <script>:
//   • No backticks (would end the outer template literal)
//   • No \' (backslash is consumed; use double-quoted JS strings inside)
//   • No ${…} (would be interpolated by the outer template literal)
//   • Use data-* attributes + addEventListener instead of inline onclick
const OFFLINE_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"/>
  <meta name="theme-color" content="#E23744"/>
  <title>MessLoo</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#FFF4EC;font-family:"Plus Jakarta Sans",system-ui,sans-serif;min-height:100dvh;padding-bottom:80px}
    .wrap{max-width:512px;margin:0 auto;padding:52px 20px 0}
    .badge{font-size:11px;font-weight:700;padding:6px 12px;border-radius:20px;background:rgba(247,151,30,.15);color:#D97706;border:1px solid rgba(247,151,30,.4);white-space:nowrap}
    .badge-sm{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(247,151,30,.15);color:#D97706;border:1px solid rgba(247,151,30,.3)}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
    .card{position:relative;overflow:hidden;border-radius:24px;min-height:180px;padding:16px 16px 52px;transition:transform .15s;-webkit-tap-highlight-color:transparent}
    .card.clickable{cursor:pointer}
    .card.clickable:active{transform:scale(.95)}
    .card-time{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:4px}
    .card-title{font-size:16px;font-weight:900;color:#fff;margin-bottom:10px;line-height:1.2}
    .card-preview{font-size:11px;font-weight:600;color:rgba(255,255,255,.85);line-height:1.5}
    .card-empty{font-size:11px;font-style:italic;color:rgba(255,255,255,.5)}
    .card-footer{position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:8px 12px 12px;background:linear-gradient(to top,rgba(0,0,0,.18),transparent)}
    .card-arrow{width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center}
    .card-count{font-size:10px;font-weight:900;padding:4px 10px;border-radius:20px;background:rgba(0,0,0,.25);color:#fff}
    .deco1{position:absolute;bottom:-32px;right:-32px;width:112px;height:112px;border-radius:50%;background:rgba(255,255,255,.08);pointer-events:none}
    .deco2{position:absolute;bottom:-12px;right:-12px;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.08);pointer-events:none}
    .hint{font-size:11px;color:#C4A882;text-align:center;margin-top:28px}
    #overlay{display:none;position:fixed;inset:0;background:rgba(15,10,5,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:50}
    #sheet{display:none;position:fixed;bottom:0;left:0;right:0;max-width:512px;margin:0 auto;border-radius:24px 24px 0 0;background:#FFFAF5;overflow:hidden;z-index:51}
    .sheet-inner{padding:20px 24px 40px}
    .handle{width:40px;height:4px;border-radius:2px;background:#EEE3D6;margin:0 auto 20px}
    .dish-row{display:flex;align-items:center;gap:12px;padding:12px 16px}
    .dish-dot{width:6px;height:6px;border-radius:50%;background:#E23744;flex-shrink:0}
    .dish-name{font-size:14px;font-weight:500;color:#3D2C1E}
    .close-btn{width:100%;margin-top:16px;padding:14px;border-radius:16px;background:#FFF6EE;color:#8B7355;font-size:14px;font-weight:700;border:1px solid #F0E6D3;cursor:pointer}
  </style>
</head>
<body>
<div id="overlay"></div>
<div id="sheet">
  <div id="sheet-accent" style="height:4px"></div>
  <div class="sheet-inner">
    <div class="handle"></div>
    <h2 id="sheet-title" style="font-size:20px;font-weight:900;color:#1C1C1E"></h2>
    <p id="sheet-time" style="font-size:12px;font-weight:500;color:#8B7355;margin-top:3px;margin-bottom:20px"></p>
    <div id="sheet-dishes" style="border:1px solid #F0E6D3;border-radius:16px;overflow:hidden"></div>
    <p id="sheet-empty" style="display:none;font-size:13px;color:#8B7355;text-align:center;margin-top:8px">No items listed</p>
    <button id="close-btn" class="close-btn">Close</button>
  </div>
</div>
<div class="wrap" id="app"></div>

<script>
(function() {
  var ORDER  = ["breakfast","lunch","snacks","dinner"];
  var LABELS = {breakfast:"Breakfast",lunch:"Lunch",snacks:"Evening Snacks",dinner:"Dinner"};
  var TIMES  = {breakfast:"7:30 – 9:00 AM",lunch:"12:00 – 2:00 PM",snacks:"4:00 – 5:30 PM",dinner:"7:00 – 9:30 PM"};
  var GRADS  = {
    breakfast:"linear-gradient(145deg,#FF9966,#FF5E62)",
    lunch:    "linear-gradient(145deg,#EB3349,#F45C43)",
    snacks:   "linear-gradient(145deg,#F7971E,#FFD200)",
    dinner:   "linear-gradient(145deg,#C94B4B,#8B0000)"
  };

  function todayISO() {
    var now = new Date(), local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }
  function getCached(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch(e) { return null; } }
  function splitDishes(s) {
    if (!s) return [];
    return s.split(/[,;|\/]/).map(function(x) { return x.trim(); }).filter(Boolean);
  }

  var date  = todayISO();
  var block = localStorage.getItem("messloo_user_block") || "";
  var name  = (localStorage.getItem("messloo_user_name") || "Student").split(" ")[0];
  var menus = getCached("messloo_menus_" + date + "_" + block + "_veg")
           || getCached("messloo_menus_" + date + "_" + block + "_non_veg")
           || [];

  var menuMap = {};
  menus.forEach(function(m) { menuMap[m.meal_type] = m; });

  /* ── bottom sheet ── */
  function openSheet(mt) {
    var item = menuMap[mt];
    if (!item) return;
    var dishes = splitDishes(item.items);
    document.getElementById("sheet-accent").style.background = GRADS[mt];
    document.getElementById("sheet-title").textContent = LABELS[mt];
    document.getElementById("sheet-time").textContent = TIMES[mt];
    var dishesEl = document.getElementById("sheet-dishes");
    var emptyEl  = document.getElementById("sheet-empty");
    if (dishes.length === 0) {
      dishesEl.style.display = "none";
      emptyEl.style.display  = "block";
    } else {
      emptyEl.style.display  = "none";
      dishesEl.style.display = "block";
      dishesEl.innerHTML = dishes.map(function(d, i) {
        return "<div class=\"dish-row\" style=\"background:" + (i % 2 === 0 ? "#FFFAF5" : "#FFF6EE")
          + ";" + (i < dishes.length - 1 ? "border-bottom:1px solid #F0E6D3" : "") + "\">"
          + "<span class=\"dish-dot\"></span>"
          + "<span class=\"dish-name\">" + d + "</span>"
          + "</div>";
      }).join("");
    }
    document.getElementById("overlay").style.display = "block";
    document.getElementById("sheet").style.display = "block";
  }
  function closeSheet() {
    document.getElementById("overlay").style.display = "none";
    document.getElementById("sheet").style.display   = "none";
  }
  document.getElementById("overlay").addEventListener("click", closeSheet);
  document.getElementById("close-btn").addEventListener("click", closeSheet);

  /* ── card HTML ── */
  function card(mt) {
    var item    = menuMap[mt];
    var dishes  = item ? splitDishes(item.items) : [];
    var preview = dishes.slice(0, 3).join("  ·  ") + (dishes.length > 3 ? "  +" + (dishes.length - 3) : "");
    return "<div class=\"card" + (item ? " clickable" : "") + "\" data-meal=\"" + mt + "\""
      + " style=\"background:" + GRADS[mt] + ";box-shadow:0 8px 28px rgba(0,0,0,.18)\">"
      + "<div class=\"card-time\">" + TIMES[mt] + "</div>"
      + "<div class=\"card-title\">" + LABELS[mt] + "</div>"
      + (item
          ? "<div class=\"card-preview\">" + (preview || item.items) + "</div>"
          : "<div class=\"card-empty\">Menu not posted</div>")
      + "<div class=\"card-footer\">"
      + (item
          ? "<div class=\"card-arrow\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M5 12H19M13 6L19 12L13 18\" stroke=\"white\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>"
          : "<span></span>")
      + (dishes.length > 0 ? "<span class=\"card-count\">" + dishes.length + " dishes</span>" : "")
      + "</div>"
      + "<div class=\"deco1\"></div><div class=\"deco2\"></div>"
      + "</div>";
  }

  /* ── render ── */
  document.getElementById("app").innerHTML =
    "<div style=\"display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px\">"
    + "<div>"
    + "<p style=\"font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#B08040;margin-bottom:4px\">" + greeting() + "</p>"
    + "<h1 style=\"font-size:26px;font-weight:900;color:#1C1C1E;line-height:1.1;margin-bottom:5px\">" + name + "</h1>"
    + (block ? "<p style=\"font-size:11px;font-weight:600;color:#8B7355\">" + block + "</p>" : "")
    + "</div>"
    + "<span class=\"badge\">Offline</span>"
    + "</div>"
    + "<div style=\"display:flex;align-items:center;gap:8px\">"
    + "<h2 style=\"font-size:15px;font-weight:900;color:#1C1C1E\">Today&#39;s Menu</h2>"
    + "<span class=\"badge-sm\">Cached</span>"
    + "</div>"
    + (menus.length === 0
        ? "<div style=\"text-align:center;margin-top:48px\"><p style=\"font-size:13px;font-weight:600;color:#8B7355;margin-bottom:6px\">No cached menu for today.</p><p style=\"font-size:11px;color:#B0956E\">Open the app while online to cache today&#39;s menu.</p></div>"
        : "<div class=\"grid\">" + ORDER.map(card).join("") + "</div>")
    + "<p class=\"hint\">Connect to internet to mark attendance or rate meals.</p>";

  /* ── wire up card taps after render ── */
  document.querySelectorAll(".card.clickable").forEach(function(el) {
    el.addEventListener("click", function() {
      openSheet(el.getAttribute("data-meal"));
    });
  });
})();
</script>
</body>
</html>`

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting())
})

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
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
