/* Shown on every page: offline / back-online banner, a notice when something on the page fails,
   and a full-page fallback instead of a blank screen. Standalone and loaded first in <head>. */
(function () {
  'use strict';
  var doc = document, ORIGIN = location.origin;
  var root, stack, net, note, screenEl, hideT, offline = navigator.onLine === false, wasOffline = offline;
  var booted = false, bootError = false, errors = [];

  var ICON = {
    off: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 2l20 20"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M19 12.9a10 10 0 0 0-2.3-1.6"/><path d="M1.4 9a15 15 0 0 1 4.3-2.7"/><path d="M22.6 9A15 15 0 0 0 10.7 5"/><path d="M12 20h.01"/></svg>',
    on: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.6a10 10 0 0 1 14 0"/><path d="M1.4 9a15 15 0 0 1 21.2 0"/><path d="M8.5 16.1a5 5 0 0 1 7 0"/><path d="M12 20h.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  };

  var CSS =
    '#cm-status{font-family:"Poppins",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.4}' +
    '#cm-status *{box-sizing:border-box}' +
    '.cms-stack{position:fixed;z-index:2147483000;left:16px;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:flex-start;gap:10px;pointer-events:none}' +
    '.cms-stack.is-lift{bottom:calc(80px + env(safe-area-inset-bottom))}' +
    'body.ad-has-bar .cms-stack{bottom:calc(100px + env(safe-area-inset-bottom))}' +
    '.cms-net,.cms-note{pointer-events:auto;opacity:0;transform:translateY(16px);transition:opacity .3s ease,transform .35s cubic-bezier(.2,.8,.2,1)}' +
    '.cms-net.is-in,.cms-note.is-in{opacity:1;transform:none}' +
    '.cms-net{display:flex;align-items:center;gap:12px;max-width:min(440px,calc(100vw - 96px));padding:10px 10px 10px 14px;border-radius:14px;color:#fff;background:#0b2b5e;box-shadow:0 18px 40px -16px rgba(11,43,94,.6)}' +
    '.cms-net.is-off{background:#1f2937}' +
    '.cms-net.is-off .cms-ic{background:#ef4444}' +
    '.cms-net.is-on{background:#15803d}' +
    '.cms-net.is-on .cms-ic{background:rgba(255,255,255,.18)}' +
    '.cms-ic{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;color:#fff}' +
    '.cms-tx{display:grid;gap:1px;min-width:0;padding-right:4px}' +
    '.cms-tx b{font-size:14px;font-weight:600}' +
    '.cms-tx small{font-size:12px;opacity:.82}' +
    '.cms-btn{flex:none;font:inherit;font-size:13px;font-weight:600;border:0;border-radius:10px;padding:8px 14px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-height:36px}' +
    '.cms-btn:focus-visible{outline:3px solid #facc15;outline-offset:2px}' +
    '.cms-btn[disabled]{opacity:.65;cursor:default}' +
    '.cms-net .cms-btn{background:#fff;color:#1f2937}' +
    '.cms-note{position:relative;width:min(420px,calc(100vw - 32px));padding:16px 16px 14px;border-radius:16px;background:#fff;color:#334155;border:1px solid #e2e8f0;border-left:4px solid #f97316;box-shadow:0 24px 50px -18px rgba(11,43,94,.45)}' +
    '.cms-note-h{display:flex;gap:10px;align-items:flex-start;padding-right:28px}' +
    '.cms-note-h .cms-ic{width:32px;height:32px;background:#fff7ed;color:#ea580c}' +
    '.cms-note b{display:block;color:#0f2a5c;font-size:15px;font-weight:600;margin:2px 0 2px}' +
    '.cms-note p{margin:0;font-size:13px}' +
    '.cms-x{position:absolute;top:8px;right:8px;width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:#64748b;cursor:pointer}' +
    '.cms-x:hover{background:#f1f5f9}' +
    '.cms-x:focus-visible{outline:3px solid #1d56b8;outline-offset:1px}' +
    '.cms-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' +
    '.cms-pri{background:#0b2b5e;color:#fff}' +
    '.cms-pri:hover{background:#1d56b8}' +
    '.cms-sec{background:#f1f5f9;color:#0f2a5c}' +
    '.cms-sec:hover{background:#e2e8f0}' +
    '.cms-det{margin-top:10px;font-size:12px;color:#64748b}' +
    '.cms-det summary{cursor:pointer;width:max-content}' +
    '.cms-det code{display:block;margin-top:6px;max-height:96px;overflow:auto;padding:8px 10px;border-radius:8px;background:#f8fafc;color:#475569;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word}' +
    '.cms-screen{position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center;padding:24px;overflow:auto;background:linear-gradient(160deg,#f5f8fc,#e8eef8)}' +
    '.cms-card{width:min(460px,100%);padding:32px 28px 26px;border-radius:22px;background:#fff;text-align:center;color:#334155;box-shadow:0 30px 70px -30px rgba(11,43,94,.45)}' +
    '.cms-card .cms-ic{width:64px;height:64px;margin:0 auto 16px;border-radius:18px;background:#fff7ed;color:#ea580c}' +
    '.cms-card .cms-ic svg{width:30px;height:30px}' +
    '.cms-card.is-offline .cms-ic{background:#fef2f2;color:#ef4444}' +
    '.cms-card h2{margin:0 0 8px;color:#0f2a5c;font-size:22px;font-weight:700;line-height:1.25}' +
    '.cms-card p{margin:0 auto;max-width:34ch;font-size:14.5px}' +
    '.cms-card .cms-row{justify-content:center;margin-top:20px}' +
    '.cms-card .cms-btn{padding:10px 18px;min-height:42px;font-size:14px}' +
    '.cms-card .cms-det{text-align:left}' +
    '.cms-card .cms-det summary{margin:0 auto}' +
    '@media (max-width:520px){.cms-stack{left:12px;bottom:calc(12px + env(safe-area-inset-bottom))}.cms-stack.is-chat{bottom:calc(76px + env(safe-area-inset-bottom))}body.ad-has-bar .cms-stack.is-chat{bottom:calc(148px + env(safe-area-inset-bottom))}.cms-note{width:calc(100vw - 24px)}.cms-net .cms-tx small{display:none}}' +
    '@media (prefers-reduced-motion:reduce){.cms-net,.cms-note{transition:none}}';

  function ready(fn) { if (doc.body) fn(); else doc.addEventListener('DOMContentLoaded', fn); }
  function h(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(name, cls) { var s = h('span', cls || 'cms-ic'); s.innerHTML = ICON[name]; return s; }
  function btn(label, cls, fn) { var b = h('button', 'cms-btn ' + cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function link(label, cls, href) { var a = h('a', 'cms-btn ' + cls, label); a.href = href; return a; }
  function reload() { location.reload(); }
  function show(el) { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); }); }
  function details(list) {
    var d = h('details', 'cms-det'); d.appendChild(h('summary', null, 'Technical details'));
    d.appendChild(h('code', null, list.slice(-5).join('\n'))); return d;
  }

  function mount() {
    if (root) return;
    var st = doc.createElement('style'); st.id = 'cm-status-css'; st.textContent = CSS; (doc.head || doc.documentElement).appendChild(st);
    root = h('div'); root.id = 'cm-status';
    stack = h('div', 'cms-stack'); root.appendChild(stack);
    doc.body.appendChild(root);
  }
  // keep the notices above the app tab bar and the chat button on phones
  function shown(sel) { var el = doc.querySelector(sel), r = el && el.getBoundingClientRect(); return !!(r && r.width && r.height && getComputedStyle(el).visibility !== 'hidden'); }
  function lift() {
    var bar = shown('.ap-tabbar');
    stack.classList.toggle('is-lift', bar);
    stack.classList.toggle('is-chat', !bar && shown('.rv-chat-btn'));
  }

  /* ---------- network ---------- */
  function hideNet() {
    if (!net) return;
    var el = net; net = null; el.classList.remove('is-in');
    setTimeout(function () { el.remove(); }, 350);
  }
  function showNet(online) {
    ready(function () {
      mount(); lift(); clearTimeout(hideT);
      doc.documentElement.classList.toggle('cm-offline', !online);
      if (!net) { net = h('div', 'cms-net'); net.setAttribute('role', 'status'); net.setAttribute('aria-live', 'polite'); stack.appendChild(net); show(net); }
      net.className = 'cms-net ' + (online ? 'is-on' : 'is-off') + (net.classList.contains('is-in') ? ' is-in' : '');
      net.textContent = '';
      var tx = h('span', 'cms-tx');
      tx.appendChild(h('b', null, online ? 'You\u2019re back online' : 'You\u2019re offline'));
      tx.appendChild(h('small', null, online ? 'Your connection is working again.' : 'Check your Wi\u2011Fi or mobile data. We\u2019ll reconnect automatically.'));
      net.appendChild(icon(online ? 'on' : 'off'));
      net.appendChild(tx);
      if (online) hideT = setTimeout(hideNet, 4000);
      else net.appendChild(btn('Retry', '', retry));
    });
  }
  function ping() {
    if (!window.fetch) return Promise.resolve(navigator.onLine !== false);
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch('/images/rx/logo-mark.svg?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); return r.ok; }, function () { clearTimeout(t); return false; });
  }
  function retry() {
    var b = this; b.disabled = true; b.textContent = 'Checking\u2026';
    ping().then(function (ok) {
      if (ok) { goOnline(); return; }
      b.disabled = false; b.textContent = 'Still offline \u00b7 Retry';
    });
  }
  function goOffline() { offline = true; wasOffline = true; showNet(false); }
  function goOnline() {
    offline = false;
    if (screenEl && screenEl.getAttribute('data-kind') === 'offline') { reload(); return; }
    if (wasOffline) showNet(true);
    wasOffline = false;
  }
  window.addEventListener('offline', goOffline);
  window.addEventListener('online', goOnline);
  if (offline) showNet(false);

  /* ---------- errors ---------- */
  function sameOrigin(u) { if (!u) return true; try { return new URL(u, location.href).origin === ORIGIN; } catch (e) { return false; } }
  function file(u) { try { return new URL(u, location.href).pathname.split('/').pop() || u; } catch (e) { return String(u); } }
  function isNetMsg(m) { return /failed to fetch|networkerror|load failed|network request failed|err_internet|err_network/i.test(m); }

  function report(detail) {
    errors.push(detail);
    if (!booted) bootError = true;
    ready(function () {
      if (booted) setTimeout(function () { checkBlank(true); }, 300);
      if (offline || navigator.onLine === false) return; // the offline banner already explains it
      showNote(detail);
    });
  }

  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && t.nodeType === 1) { // a file failed to load
      var url = t.src || t.href || '';
      var isCode = t.tagName === 'SCRIPT' || (t.tagName === 'LINK' && /stylesheet/i.test(t.rel || ''));
      if (isCode && sameOrigin(url)) report('Could not load ' + file(url));
      return;
    }
    var msg = e.message || (e.error && e.error.message) || '';
    if (!msg || /^(uncaught )?script error\.?$/i.test(msg) || /resizeobserver loop/i.test(msg)) return;
    if (e.filename && !sameOrigin(e.filename)) return; // third-party scripts
    report(msg + (e.filename ? ' (' + file(e.filename) + (e.lineno ? ':' + e.lineno : '') + ')' : ''));
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    if (!r || typeof r !== 'object' || !r.message || r.name === 'AbortError') return;
    var urls = String(r.stack || '').match(/https?:\/\/[^\s)]+/g);
    if (urls && !urls.some(sameOrigin)) return; // came from a third-party script
    report(r.message);
  });

  function showNote(detail) {
    mount(); lift();
    if (note) { var c = note.querySelector('code'); if (c) c.textContent = errors.slice(-5).join('\n'); return; }
    var netErr = isNetMsg(detail);
    note = h('div', 'cms-note'); note.setAttribute('role', 'alert');
    var head = h('div', 'cms-note-h'), tx = h('div');
    tx.appendChild(h('b', null, netErr ? 'Couldn\u2019t reach our server' : 'Something went wrong'));
    tx.appendChild(h('p', null, netErr ? 'Your connection may be weak. Please try again in a moment.' : 'Part of this page didn\u2019t work as expected. Reloading the page usually fixes it.'));
    head.appendChild(icon('warn')); head.appendChild(tx);
    var x = h('button', 'cms-x'); x.type = 'button'; x.setAttribute('aria-label', 'Dismiss'); x.innerHTML = ICON.x;
    x.addEventListener('click', closeNote);
    var row = h('div', 'cms-row');
    row.appendChild(btn('Reload page', 'cms-pri', reload));
    row.appendChild(btn('Dismiss', 'cms-sec', closeNote));
    note.appendChild(x); note.appendChild(head); note.appendChild(row); note.appendChild(details(errors));
    stack.insertBefore(note, stack.firstChild); show(note);
  }
  function closeNote() {
    if (!note) return;
    var el = note; note = null; el.classList.remove('is-in');
    setTimeout(function () { el.remove(); }, 350);
  }

  /* ---------- blank page ---------- */
  function visibleText(el) { return el ? (el.innerText || '').replace(/\s+/g, '').length : 0; }
  function hasMedia(el) {
    return [].some.call(el.querySelectorAll('img,svg,canvas,video,iframe'), function (m) {
      return !(root && root.contains(m)) && m.getBoundingClientRect().width > 40;
    });
  }
  function checkBlank(hadError) {
    if (screenEl || !doc.body) return;
    var bodyBlank = visibleText(doc.body) - (root ? visibleText(root) : 0) < 20 && !hasMedia(doc.body);
    var main = doc.querySelector('main');
    var mainBlank = !!main && visibleText(main) < 20 && !hasMedia(main);
    if (bodyBlank || (hadError && mainBlank)) showScreen();
  }
  function showScreen() {
    mount();
    var isOff = offline || navigator.onLine === false;
    screenEl = h('div', 'cms-screen'); screenEl.setAttribute('data-kind', isOff ? 'offline' : 'error');
    screenEl.setAttribute('role', 'alertdialog'); screenEl.setAttribute('aria-modal', 'true'); screenEl.setAttribute('aria-labelledby', 'cms-screen-t');
    var card = h('div', 'cms-card' + (isOff ? ' is-offline' : ''));
    card.appendChild(icon(isOff ? 'off' : 'warn'));
    var t = h('h2', null, isOff ? 'You\u2019re offline' : 'This page couldn\u2019t load'); t.id = 'cms-screen-t';
    card.appendChild(t);
    card.appendChild(h('p', null, isOff ? 'Connect to the internet and this page will reload on its own.' : 'Something went wrong while loading this page. Please reload, or head back to the home page.'));
    var row = h('div', 'cms-row');
    var r = btn('Reload page', 'cms-pri', reload); row.appendChild(r);
    row.appendChild(link('Go to home', 'cms-sec', '/'));
    if (!isOff) row.appendChild(link('Contact us', 'cms-sec', '/contact.html'));
    card.appendChild(row);
    if (errors.length && !isOff) card.appendChild(details(errors));
    screenEl.appendChild(card);
    closeNote(); root.appendChild(screenEl);
    try { r.focus({ preventScroll: true }); } catch (e) { r.focus(); }
  }

  window.addEventListener('load', function () {
    setTimeout(function () { checkBlank(bootError); booted = true; }, 1500);
  });

  /* ---------- offline page for pages opened without a connection ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
})();
