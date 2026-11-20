/* "Get the app": install FinMatrix as an app (PWA) from the header, the menu, the app sidebar
   and a one-time prompt on phones. Hidden when the site is already running as the installed app. */
(function () {
  'use strict';
  var doc = document, mm = window.matchMedia ? function (q) { return window.matchMedia(q).matches; } : function () { return false; };
  function installedMode() { return navigator.standalone === true || mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || mm('(display-mode: minimal-ui)') || mm('(display-mode: window-controls-overlay)'); }
  if (installedMode()) return;

  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(ua);
  var isFirefox = /firefox|fxios/i.test(ua);
  var isSafariMac = !isIOS && /macintosh/i.test(ua) && /safari/i.test(ua) && !/chrome|chromium|edg|opr|firefox/i.test(ua);
  var SNOOZE = 'cm_install_hide', DAYS = 14;
  var deferred = null, installed = false, sheet, banner, lastFocus;
  var APP_ICON = '/images/pwa/icon-192.png';

  var ICON = {
    dl: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 7v7"/><path d="M9 11.5l3 3 3-3"/><path d="M10.5 18.5h3"/></svg>',
    share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    dots: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  };

  var CSS =
    '.rx-mi.rx-install{color:var(--rx-blue,#1d56b8)}' +
    '.rx-mi.rx-install b{color:var(--rx-navy,#0b2b5e)}' +
    '@media (max-width:1023px){.rx-mi.rx-install{display:none!important}}' +
    '.cmi{font-family:"Poppins",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.4;box-sizing:border-box}' +
    '.cmi *{box-sizing:border-box}' +
    '.cmi-card{display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:linear-gradient(135deg,#0b2b5e,#1d56b8);color:#fff;box-shadow:0 14px 30px -18px rgba(11,43,94,.8)}' +
    '.cmi-card img{flex:none;width:44px;height:44px;border-radius:12px;background:#fff}' +
    '.cmi-card .cmi-t{flex:1;min-width:0;display:grid;gap:1px}' +
    '.cmi-card b{font-size:14.5px;font-weight:600;color:#fff}' +
    '.cmi-card small{font-size:12px;color:rgba(255,255,255,.8)}' +
    '.cmi-btn{flex:none;font:inherit;font-size:13.5px;font-weight:600;border:0;border-radius:11px;padding:9px 14px;min-height:38px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none}' +
    '.cmi-btn:focus-visible,.cmi-x:focus-visible{outline:3px solid #facc15;outline-offset:2px}' +
    '.cmi-y{background:#facc15;color:#0b2b5e}' +
    '.cmi-y:hover{background:#fde047}' +
    '.cmi-pri{background:#0b2b5e;color:#fff}' +
    '.cmi-pri:hover{background:#1d56b8}' +
    '.cmi-sec{background:#f1f5f9;color:#0f2a5c}' +
    '.cmi-sec:hover{background:#e2e8f0}' +
    '.rx-drawer-body>.cmi-card{margin:0 0 12px}' +
    '.ap-side>.cmi-card{margin:12px 0 4px;flex-wrap:wrap}' +
    '.ap-side>.cmi-card .cmi-btn{width:100%}' +
    '.cmi-banner{position:fixed;z-index:2147482990;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));padding:14px 14px 12px;border-radius:18px;background:#fff;color:#334155;border:1px solid #e2e8f0;box-shadow:0 24px 50px -16px rgba(11,43,94,.5);opacity:0;transform:translateY(20px);transition:opacity .3s ease,transform .35s cubic-bezier(.2,.8,.2,1)}' +
    '.cmi-banner.is-in{opacity:1;transform:none}' +
    '.cmi-banner-h{display:flex;gap:12px;align-items:center;padding-right:30px}' +
    '.cmi-banner img{flex:none;width:48px;height:48px;border-radius:13px;box-shadow:0 4px 12px -6px rgba(11,43,94,.5)}' +
    '.cmi-banner b{display:block;color:#0f2a5c;font-size:15px;font-weight:600}' +
    '.cmi-banner p{margin:1px 0 0;font-size:12.5px;color:#64748b}' +
    '.cmi-row{display:flex;gap:8px;margin-top:12px}' +
    '.cmi-row .cmi-btn{flex:1}' +
    '.cmi-x{position:absolute;top:8px;right:8px;width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:9px;background:transparent;color:#64748b;cursor:pointer}' +
    '.cmi-x:hover{background:#f1f5f9}' +
    '.cmi-sheet{position:fixed;inset:0;z-index:2147482995;display:flex;align-items:flex-end;justify-content:center;background:rgba(11,25,50,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);opacity:0;transition:opacity .25s}' +
    '.cmi-sheet.is-in{opacity:1}' +
    '.cmi-panel{position:relative;width:min(460px,100%);max-height:calc(100dvh - 24px);overflow:auto;padding:24px 22px calc(20px + env(safe-area-inset-bottom));border-radius:22px 22px 0 0;background:#fff;color:#334155;transform:translateY(24px);transition:transform .3s cubic-bezier(.2,.8,.2,1)}' +
    '.cmi-sheet.is-in .cmi-panel{transform:none}' +
    '@media (min-width:640px){.cmi-sheet{align-items:center;padding:24px}.cmi-panel{border-radius:22px;padding-bottom:22px}}' +
    '.cmi-head{display:flex;gap:14px;align-items:center;padding-right:30px}' +
    '.cmi-head img{flex:none;width:56px;height:56px;border-radius:15px;box-shadow:0 6px 16px -8px rgba(11,43,94,.55)}' +
    '.cmi-panel h2{margin:0;color:#0f2a5c;font-size:19px;font-weight:700;line-height:1.25}' +
    '.cmi-panel .cmi-sub{margin:2px 0 0;font-size:13px;color:#64748b}' +
    '.cmi-perks{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:7px;font-size:13.5px}' +
    '.cmi-perks li{display:flex;gap:9px;align-items:center}' +
    '.cmi-perks li span{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#dcfce7;color:#16a34a}' +
    '.cmi-steps{list-style:none;counter-reset:s;margin:18px 0 0;padding:14px;border-radius:16px;background:#f5f8fc;display:grid;gap:10px;font-size:14px}' +
    '.cmi-steps li{counter-increment:s;display:flex;gap:10px;align-items:center}' +
    '.cmi-steps li::before{content:counter(s);flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#0b2b5e;color:#fff;font-size:12px;font-weight:700}' +
    '.cmi-steps i{display:inline-grid;place-items:center;width:28px;height:28px;margin:0 2px;border-radius:8px;background:#fff;color:#1d56b8;border:1px solid #e2e8f0;vertical-align:middle;font-style:normal}' +
    '.cmi-note{margin:12px 0 0;font-size:12.5px;color:#64748b}' +
    '.cmi-panel .cmi-row{margin-top:18px}' +
    '.cmi-toast{position:fixed;z-index:2147482996;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translate(-50%,16px);max-width:calc(100vw - 32px);padding:12px 16px;border-radius:14px;background:#15803d;color:#fff;font-size:14px;font-weight:500;box-shadow:0 18px 40px -16px rgba(0,0,0,.45);opacity:0;transition:opacity .3s,transform .3s}' +
    '.cmi-toast.is-in{opacity:1;transform:translate(-50%,0)}' +
    '@media (prefers-reduced-motion:reduce){.cmi-banner,.cmi-sheet,.cmi-panel,.cmi-toast{transition:none}}';

  function h(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(label, cls, fn) { var b = h('button', 'cmi-btn ' + cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function appImg() { var i = h('img'); i.src = APP_ICON; i.alt = ''; i.width = 48; i.height = 48; return i; }
  function show(el) { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); }); }
  function gone(el) { if (!el) return; el.classList.remove('is-in'); setTimeout(function () { el.remove(); }, 320); }
  function snoozed() { try { var t = +localStorage.getItem(SNOOZE); return t && Date.now() - t < DAYS * 864e5; } catch (e) { return false; } }
  function snooze() { try { localStorage.setItem(SNOOZE, String(Date.now())); } catch (e) {} }

  /* ---------- install ---------- */
  function install() {
    hideBanner();
    if (deferred) {
      var e = deferred; deferred = null;
      try {
        e.prompt();
        Promise.resolve(e.userChoice).then(function (c) { if (c && c.outcome === 'dismissed') snooze(); }, function () {});
      } catch (err) { openSheet(); }
      return;
    }
    openSheet();
  }

  function steps() {
    var s = h('ol', 'cmi-steps'), add = function (parts) {
      var li = h('li'), span = h('span');
      parts.forEach(function (p) { if (ICON[p]) { var i = h('i'); i.innerHTML = ICON[p]; span.appendChild(i); } else span.appendChild(doc.createTextNode(p)); });
      li.appendChild(span); s.appendChild(li);
    };
    if (isIOS) {
      add(['Tap the Share button ', 'share', ' in Safari\u2019s toolbar']);
      add(['Scroll down and tap ', 'plus', ' \u201cAdd to Home Screen\u201d']);
      add(['Tap \u201cAdd\u201d \u2013 FinMatrix appears on your home screen']);
    } else if (isAndroid) {
      add(['Tap the browser menu ', 'dots', ' at the top right']);
      add(['Tap \u201cInstall app\u201d or \u201cAdd to Home screen\u201d']);
      add(['Tap \u201cInstall\u201d to confirm']);
    } else if (isSafariMac) {
      add(['In the menu bar, click File']);
      add(['Choose \u201cAdd to Dock\u201d']);
      add(['Click \u201cAdd\u201d \u2013 open FinMatrix from your Dock']);
    } else if (isFirefox) {
      add(['Firefox on computers can\u2019t install web apps']);
      add(['Open this site in Chrome, Edge or Safari']);
      add(['Click \u201cGet the App\u201d again to install']);
    } else {
      add(['Click the install icon in the address bar, or open the menu ', 'dots']);
      add(['Choose \u201cInstall FinMatrix\u201d (may be under \u201cCast, save and share\u201d)']);
      add(['Click \u201cInstall\u201d \u2013 FinMatrix opens in its own window']);
    }
    return s;
  }

  function openSheet() {
    if (sheet) return;
    lastFocus = doc.activeElement;
    sheet = h('div', 'cmi cmi-sheet');
    var panel = h('div', 'cmi-panel');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'cmi-title');
    var head = h('div', 'cmi-head'), tx = h('div'), img = appImg(); img.width = img.height = 56;
    var t = h('h2', null, 'Install the FinMatrix app'); t.id = 'cmi-title';
    tx.appendChild(t); tx.appendChild(h('p', 'cmi-sub', 'Free \u00b7 No app store needed \u00b7 Takes almost no space'));
    head.appendChild(img); head.appendChild(tx);
    var perks = h('ul', 'cmi-perks');
    ['Opens full screen, just like an app', 'One tap from your home screen', 'Same secure FinMatrix account and payments'].forEach(function (p) {
      var li = h('li'), c = h('span'); c.innerHTML = ICON.check; li.appendChild(c); li.appendChild(doc.createTextNode(p)); perks.appendChild(li);
    });
    var x = h('button', 'cmi-x'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.innerHTML = ICON.x; x.addEventListener('click', closeSheet);
    var row = h('div', 'cmi-row'), done = btn('Got it', 'cmi-pri', closeSheet);
    row.appendChild(done);
    panel.appendChild(x); panel.appendChild(head); panel.appendChild(perks); panel.appendChild(steps());
    panel.appendChild(h('p', 'cmi-note', 'Already installed? Open FinMatrix from your home screen or app list.'));
    panel.appendChild(row);
    sheet.appendChild(panel);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
    sheet.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSheet(); return; }
      if (e.key !== 'Tab') return;
      var f = panel.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    doc.body.appendChild(sheet); show(sheet);
    done.focus();
  }
  function closeSheet() {
    if (!sheet) return;
    gone(sheet); sheet = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function toast(msg) {
    var t = h('div', 'cmi cmi-toast', msg); t.setAttribute('role', 'status');
    doc.body.appendChild(t); show(t);
    setTimeout(function () { gone(t); }, 4500);
  }

  /* ---------- buttons in the header, menu and app sidebar ---------- */
  function card(sub) {
    var c = h('div', 'cmi cmi-card'), tx = h('span', 'cmi-t'), img = appImg(); img.width = img.height = 44;
    c.setAttribute('data-cmi', '');
    tx.appendChild(h('b', null, 'Get the FinMatrix app'));
    tx.appendChild(h('small', null, sub));
    c.appendChild(img); c.appendChild(tx); c.appendChild(btn('Install', 'cmi-y', install));
    return c;
  }
  function mountButtons() {
    var meta = doc.querySelector('.rx-meta');
    if (meta && !meta.querySelector('.rx-install')) {
      var b = h('button', 'rx-mi rx-install'); b.type = 'button'; b.setAttribute('data-cmi', '');
      b.setAttribute('aria-label', 'Get the FinMatrix app');
      b.innerHTML = ICON.dl;
      var sp = h('span'); sp.appendChild(h('b', null, 'Get the App')); sp.appendChild(h('small', null, 'Install free'));
      b.appendChild(sp); b.addEventListener('click', install);
      meta.insertBefore(b, meta.querySelector('.rx-login') || meta.querySelector('.rx-burger'));
    }
    var drawer = doc.querySelector('.rx-drawer-body');
    if (drawer && !drawer.querySelector('[data-cmi]')) drawer.insertBefore(card('Faster access, opens like an app'), drawer.firstChild);
    var side = doc.querySelector('.ap-side');
    if (side && !side.querySelector('[data-cmi]')) side.insertBefore(card('Open it in one tap'), side.querySelector('.ap-me'));
  }
  function removeAll() {
    [].forEach.call(doc.querySelectorAll('[data-cmi]'), function (el) { el.remove(); });
    hideBanner(); closeSheet();
  }

  /* ---------- one-time prompt on phones ---------- */
  function hideBanner() { if (banner) { gone(banner); banner = null; } }
  function maybeBanner() {
    if (banner || installed || snoozed() || !mm('(max-width: 768px)') || !(deferred || isIOS)) return;
    if (doc.querySelector('.rv-consent') || sheet) { setTimeout(maybeBanner, 4000); return; }
    banner = h('div', 'cmi cmi-banner'); banner.setAttribute('role', 'dialog'); banner.setAttribute('aria-label', 'Install the FinMatrix app');
    var head = h('div', 'cmi-banner-h'), tx = h('div');
    tx.appendChild(h('b', null, 'Install the FinMatrix app'));
    tx.appendChild(h('p', null, 'Quick access from your home screen. Free, no app store needed.'));
    head.appendChild(appImg()); head.appendChild(tx);
    var x = h('button', 'cmi-x'); x.type = 'button'; x.setAttribute('aria-label', 'Not now'); x.innerHTML = ICON.x;
    var later = function () { snooze(); hideBanner(); };
    x.addEventListener('click', later);
    var row = h('div', 'cmi-row');
    row.appendChild(btn('Not now', 'cmi-sec', later));
    row.appendChild(btn('Install', 'cmi-pri', install));
    banner.appendChild(x); banner.appendChild(head); banner.appendChild(row);
    doc.body.appendChild(banner); show(banner);
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); // use our own button and prompt instead of the browser's mini bar
    deferred = e;
    setTimeout(maybeBanner, 6000);
  });
  window.addEventListener('appinstalled', function () {
    installed = true; deferred = null; removeAll();
    toast('FinMatrix is installed. Open it from your home screen.');
  });

  function start() {
    var st = h('style'); st.id = 'cm-install-css'; st.textContent = CSS; (doc.head || doc.documentElement).appendChild(st);
    mountButtons();
    if (isIOS) setTimeout(maybeBanner, 6000);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
