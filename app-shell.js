/* Shared UI for the RAVEN app screens: icons, view routing, drawer, toasts,
   chart tooltips and count-up numbers. Used by dashboard.js and account.js. */
(function () {
  var P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    users: '<path d="M16 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18.5V20"/><circle cx="10" cy="8" r="3.5"/><path d="M20 20v-1.5a3.5 3.5 0 00-2.5-3.35M15.5 4.6a3.5 3.5 0 010 6.8"/>',
    board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
    bell: '<path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a2 2 0 003.4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    phone: '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.8 2z"/>',
    chat: '<path d="M21 12a8.5 8.5 0 01-12.4 7.6L3 21l1.4-5.4A8.5 8.5 0 1121 12z"/><path d="M8.5 9.5c.3 2.6 2.4 4.7 5 5l1.2-1.3 1.8.8-.4 1.6c-3.8.3-8.1-3.9-7.8-7.7l1.6-.4.8 1.8z" fill="currentColor" stroke="none"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
    rupee: '<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 000-10"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 010-4h12v4"/><path d="M4 6v12a2 2 0 002 2h14v-4"/><path d="M18 12a2 2 0 000 4h4v-4z"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/>',
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    coins: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    file: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>',
    listcheck: '<path d="M11 6h10M11 12h10M11 18h10"/><path d="M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
  };
  function icon(name, size, cls) {
    var s = size || 20;
    return '<svg class="ap-icon' + (cls ? ' ' + cls : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/).filter(function (w) { return /^[\p{L}\d]/u.test(w); });
    if (!parts.length) parts = ['?'];
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  var HUES = [['#0ea5e9', '#0369a1'], ['#f472b6', '#db2777'], ['#34d399', '#059669'], ['#fbbf24', '#ea580c'], ['#60a5fa', '#2563eb'], ['#a78bfa', '#7c3aed'], ['#2dd4bf', '#0d9488']];
  function avatar(name, cls) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    var c = HUES[h % HUES.length];
    return '<span class="ap-avatar' + (cls ? ' ' + cls : '') + '" style="--a1:' + c[0] + ';--a2:' + c[1] + '" aria-hidden="true">' + RavenApp.esc(initials(name)) + '</span>';
  }

  /* toasts */
  var toastBox;
  function toast(msg, action) {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'ap-toasts'; toastBox.setAttribute('aria-live', 'polite'); document.body.appendChild(toastBox); }
    var t = document.createElement('div');
    t.className = 'ap-toast';
    t.innerHTML = icon('check', 18) + '<span></span>' + (action ? '<button type="button"></button>' : '');
    t.querySelector('span').textContent = msg;
    if (action) {
      var b = t.querySelector('button');
      b.textContent = action.label;
      b.addEventListener('click', function () { action.run(); close(); });
    }
    Array.prototype.forEach.call(toastBox.children, function (o) { o.classList.add('is-out'); setTimeout(function () { o.remove(); }, 300); });
    toastBox.appendChild(t);
    var timer = setTimeout(close, action ? 6000 : 3200);
    function close() { clearTimeout(timer); t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 300); }
  }

  /* tooltips: any element with data-tip (HTML) */
  var tip;
  function placeTip(el) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'ap-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.innerHTML = el.getAttribute('data-tip');
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var x = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
    var y = r.top - h - 10;
    if (y < 8) y = r.bottom + 10;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
    tip.classList.add('is-on');
  }
  function hideTip() { if (tip) tip.classList.remove('is-on'); }
  document.addEventListener('mouseover', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) placeTip(el); });
  document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('[data-tip]')) hideTip(); });
  document.addEventListener('focusin', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-tip')) placeTip(e.target); });
  document.addEventListener('focusout', hideTip);
  window.addEventListener('scroll', hideTip, true);

  /* count-up numbers */
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function countUp(el, to, fmt) {
    fmt = fmt || function (n) { return String(Math.round(n)); };
    if (still || !to) { el.textContent = fmt(to); return; }
    var start = performance.now(), dur = 900;
    (function step(now) {
      var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e);
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  /* drawer (bottom sheet on phones, side panel from 768px) */
  var dr, scrim, lastFocus, onClose;
  function drawerEls() {
    if (dr) return;
    scrim = document.createElement('div'); scrim.className = 'ap-scrim';
    dr = document.createElement('aside'); dr.className = 'ap-drawer';
    dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true'); dr.setAttribute('aria-labelledby', 'ap-dtitle');
    dr.innerHTML = '<div class="grab"></div><div class="ap-dhead"><h2 id="ap-dtitle"></h2><button type="button" class="ap-btn is-ghost is-icon" data-dclose aria-label="Close">' + icon('x') + '</button></div><div class="ap-dbody"></div><div class="ap-dfoot"></div>';
    document.body.appendChild(scrim); document.body.appendChild(dr);
    scrim.addEventListener('click', closeDrawer);
    dr.querySelector('[data-dclose]').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (!dr.classList.contains('is-on')) return;
      if (e.key === 'Escape') closeDrawer();
      if (e.key === 'Tab') { // keep focus inside
        var f = dr.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }
  function openDrawer(o) {
    drawerEls();
    lastFocus = document.activeElement;
    onClose = o.onClose;
    dr.querySelector('#ap-dtitle').innerHTML = o.title;
    dr.querySelector('.ap-dbody').innerHTML = o.body;
    var foot = dr.querySelector('.ap-dfoot');
    foot.innerHTML = o.foot || '';
    foot.hidden = !o.foot;
    dr.querySelector('.ap-dbody').scrollTop = 0;
    scrim.classList.add('is-on');
    dr.classList.add('is-on');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { var f = dr.querySelector(o.focus || '.ap-dbody input, .ap-dbody select, [data-dclose]'); if (f) f.focus({ preventScroll: true }); }, 60);
    return dr;
  }
  function closeDrawer() {
    if (!dr || !dr.classList.contains('is-on')) return;
    scrim.classList.remove('is-on');
    dr.classList.remove('is-on');
    document.documentElement.style.overflow = '';
    if (onClose) onClose();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* views: [data-view] sections, [data-nav] links */
  function router(def, onShow) {
    function show() {
      var h = location.hash.slice(1), name = h.split('/')[0];
      var view = document.querySelector('.ap-view[data-view="' + name + '"]') ? name : def;
      document.querySelectorAll('.ap-view').forEach(function (v) { v.classList.toggle('is-on', v.getAttribute('data-view') === view); });
      document.querySelectorAll('[data-nav]').forEach(function (a) {
        var on = a.getAttribute('data-nav') === view;
        a.classList.toggle('is-on', on);
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      var t = document.querySelector('[data-nav="' + view + '"]');
      var title = document.getElementById('ap-title');
      if (title && t) title.textContent = t.getAttribute('data-title') || t.textContent.trim();
      if (onShow) onShow(view, h);
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', show);
    show();
  }

  function hydrate(root) {
    (root || document).querySelectorAll('[data-ico]').forEach(function (el) {
      el.outerHTML = icon(el.getAttribute('data-ico'), +el.getAttribute('data-size') || 20);
    });
  }
  hydrate();

  // search-tool card in the website's loan-card style: illustration on top, title with arrow, description
  function toolCard(o) {
    var e = RavenApp.esc;
    return '<a class="ap-card ap-tool has-img" style="--i:' + (o.i || 0) + '" href="' + o.href + '">' +
      '<span class="pic' + (o.img ? '' : ' is-icon') + '">' + (o.img ? '<img src="' + o.img + '" alt="" width="640" height="400" loading="lazy">' : icon(o.icon, 40)) + '</span>' +
      (o.badge ? '<span class="for">' + e(o.badge) + '</span>' : '') +
      '<span class="body"><span class="row"><strong>' + e(o.title) + '</strong><span class="arrow">' + icon('arrow', 16) + '</span></span>' +
      '<p>' + e(o.text) + '</p><span class="go">' + e(o.go) + '</span></span></a>';
  }

  window.RavenUI = { toolCard: toolCard, hydrate: hydrate, icon: icon, avatar: avatar, initials: initials, toast: toast, countUp: countUp, openDrawer: openDrawer, closeDrawer: closeDrawer, router: router, hideTip: hideTip };
})();
