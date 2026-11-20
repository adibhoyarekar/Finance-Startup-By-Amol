/* Lottie animations for the top menu (dropdowns and All Categories) and for tiles marked data-rx-lottie.
   lottie.min.js is fetched only when a menu first opens or a tile scrolls near the screen. */
(function () {
  'use strict';
  var doc = document;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var DIR = 'animations/';
  // same animations as the home page "Explore" section
  var SUB = {
    'home loan': 'ln-home', 'personal loan': 'ln-personal', 'business loan': 'ln-business', 'gold loan': 'ln-gold',
    'vehicle loan': 'ln-vehicle', 'all loans': 'cm-explore-loans',
    'life insurance': 'cm-sub-life', 'health insurance': 'cm-sub-health', 'motor insurance': 'ln-vehicle', 'travel insurance': 'cm-sub-travel',
    'savings account': 'cm-sub-piggy', 'current account': 'cm-why-banks', 'credit cards': 'ln-bank', 'fixed deposits': 'cm-sub-vault',
    'flats / apartments': 'svc-estate-ic', 'houses': 'ln-home', 'plots': 'cm-sub-plot', 'commercial properties': 'cm-sub-shop',
    'bank auctions': 'svc-auction-ic'
  };
  var CAT = { loans: 'cm-explore-loans', insurance: 'svc-insurance-ic', banking: 'ln-bank', 'real estate': 'svc-estate-ic' };

  var st = doc.createElement('style');
  st.textContent =
    '.rxl{display:inline-block;flex:none;line-height:0;background:transparent}' +
    '.rxl svg{display:block}' +
    '.rx-dd a i{position:relative}' +
    '.rx-dd a i .rxl{position:absolute;inset:3px}' +
    '.rx-dd a i.rxl-host{background:transparent}' +
    '.rx-dd a i.rxl-host>svg{display:none}' +
    '.rx-mega h4 .rxl{width:24px;height:24px;background:transparent}' +
    '.rx-mega a{gap:9px}' +
    '.rx-mega a .rxl{width:22px;height:22px}' +
    '[data-rx-lottie]{display:block;line-height:0}' +
    '.rxl-tile{position:absolute;left:50%;top:50%;width:min(64%,240px);height:80%;transform:translate(-50%,-50%);pointer-events:none}' +
    '.rxl-card{position:relative;aspect-ratio:16/10;border-radius:.75rem;overflow:hidden;background:radial-gradient(circle at 50% 58%,#fff 0,var(--bg,#eef4ff) 78%)}';
  (doc.head || doc.documentElement).appendChild(st);

  /* ---------- lottie loader (shared with explore.js) ---------- */
  var waiting = [];
  function getLottie(cb) {
    if (window.lottie) { cb(); return; }
    waiting.push(cb);
    var s = doc.querySelector('script[data-lazy-lottie]');
    if (!s) {
      s = doc.createElement('script');
      s.src = 'lottie.min.js';
      s.async = true;
      s.setAttribute('data-lazy-lottie', '');
      doc.head.appendChild(s);
    }
    if (!s.rxl) {
      s.rxl = true;
      s.addEventListener('load', function () { var w = waiting; waiting = []; if (window.lottie) w.forEach(function (f) { f(); }); });
    }
  }
  function still(a) { a.goToAndStop(Math.min(20, Math.max(0, (a.totalFrames || 1) - 1)), true); }
  function load(el, path, active) {
    if (el.rxlA || el.rxlBusy) return;
    el.rxlBusy = true;
    getLottie(function () {
      var a;
      try {
        a = window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: false, path: path, rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      } catch (e) { return; }
      el.rxlA = a;
      a.addEventListener('DOMLoaded', function () {
        el.classList.add('is-on');
        if (el.parentNode && el.parentNode.tagName === 'I') el.parentNode.classList.add('rxl-ready');
        if (!reduce && active && active()) a.play(); else still(a);
      });
    });
  }
  function play(el) { if (el.rxlA && !reduce) el.rxlA.play(); }
  function stop(el) { if (el.rxlA && el.rxlA.isLoaded) still(el.rxlA); }
  function pause(el) { if (el.rxlA) el.rxlA.pause(); }

  function label(a) {
    var sp = a.querySelector('span');
    var t = sp ? (sp.childNodes[0] && sp.childNodes[0].nodeValue) || sp.textContent : a.textContent;
    return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function holder(cls) { var s = doc.createElement('span'); s.className = 'rxl' + (cls ? ' ' + cls : ''); s.setAttribute('aria-hidden', 'true'); return s; }

  /* ---------- top menu ---------- */
  function setupNav() {
    var nav = doc.querySelector('.rx-nav');
    if (!nav) return;
    [].forEach.call(nav.querySelectorAll('li'), function (li) {
      var dd = li.querySelector('.rx-dd');
      if (!dd) return;
      var mega = dd.classList.contains('rx-mega');
      // add holders now so nothing moves when the animations arrive
      if (mega) {
        [].forEach.call(dd.querySelectorAll('h4'), function (h) {
          var k = CAT[h.textContent.replace(/\s+/g, ' ').trim().toLowerCase()];
          if (k) { var s = holder(); s.setAttribute('data-rxl', DIR + k + '.json'); h.insertBefore(s, h.firstChild); }
        });
      }
      [].forEach.call(dd.querySelectorAll('a'), function (a) {
        var k = SUB[label(a)];
        if (!k) return;
        var s = holder(), i = a.querySelector('i');
        s.setAttribute('data-rxl', DIR + k + '.json');
        if (i) { i.classList.add('rxl-host'); i.appendChild(s); } else a.insertBefore(s, a.firstChild);
        if (mega) {
          a.addEventListener('mouseenter', function () { play(s); });
          a.addEventListener('focus', function () { play(s); });
          a.addEventListener('mouseleave', function () { stop(s); });
          a.addEventListener('blur', function () { stop(s); });
        }
      });
      var items = [].slice.call(dd.querySelectorAll('[data-rxl]'));
      if (!items.length) return;
      var hover = false;
      function isOpen() { return hover || li.classList.contains('is-open'); }
      function loops(el) { return !mega || el.parentNode.tagName === 'H4'; }
      function update() {
        items.forEach(function (el) {
          if (!el.rxlA) { if (isOpen()) load(el, el.getAttribute('data-rxl'), function () { return isOpen() && loops(el); }); return; }
          if (isOpen() && loops(el)) play(el); else if (mega && !loops(el)) stop(el); else pause(el);
        });
      }
      li.addEventListener('mouseenter', function () { hover = true; update(); });
      li.addEventListener('mouseleave', function () { hover = false; update(); });
      li.addEventListener('focusin', function () { items.forEach(function (el) { if (!el.rxlA) load(el, el.getAttribute('data-rxl'), function () { return isOpen() && loops(el); }); }); });
      if (window.MutationObserver) new MutationObserver(update).observe(li, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ---------- tiles in the page ---------- */
  function setupTiles() {
    var els = [].slice.call(doc.querySelectorAll('[data-rx-lottie]'));
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { load(el, el.getAttribute('data-rx-lottie'), function () { return true; }); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        el.rxlIn = e.isIntersecting;
        if (!el.rxlA) { if (e.isIntersecting) load(el, el.getAttribute('data-rx-lottie'), function () { return el.rxlIn; }); }
        else if (e.isIntersecting) play(el); else pause(el);
      });
    }, { rootMargin: '120px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function start() { setupNav(); setupTiles(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
