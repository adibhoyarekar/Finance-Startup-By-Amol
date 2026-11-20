/* RAVEN header, menus, search routing, offers carousel and form pre-fill */
(function () {
  var nav = document.querySelector('.rx-nav');

  function closeAll(except) {
    if (!nav) return;
    nav.querySelectorAll('li.is-open').forEach(function (li) {
      if (li === except) return;
      li.classList.remove('is-open');
      var b = li.querySelector(':scope > button');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  if (nav) {
    nav.querySelectorAll('li > button.rx-nl').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = b.parentElement, open = !li.classList.contains('is-open');
        closeAll(li);
        li.classList.toggle('is-open', open);
        b.setAttribute('aria-expanded', String(open));
      });
    });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) closeAll(); });
  }

  var loc = document.querySelector('.rx-loc');
  if (loc) {
    var lb = loc.querySelector('.rx-mi'), label = loc.querySelector('[data-rx-city]');
    var setCity = function (c) {
      var i = c.indexOf(' ');
      label.innerHTML = (i > 0 ? c.slice(0, i) + '<br>' + c.slice(i + 1) : c) + ' ' + lb.querySelector('[data-rx-city] svg').outerHTML;
      loc.querySelectorAll('[data-city]').forEach(function (x) { x.setAttribute('aria-checked', String(x.getAttribute('data-city') === c)); });
    };
    try { var saved = localStorage.getItem('raven_city'); if (saved) setCity(saved); } catch (x) { /* storage blocked */ }
    lb.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !loc.classList.contains('is-open');
      loc.classList.toggle('is-open', open);
      lb.setAttribute('aria-expanded', String(open));
    });
    loc.querySelectorAll('[data-city]').forEach(function (x) {
      x.addEventListener('click', function () {
        var c = x.getAttribute('data-city');
        setCity(c);
        try { localStorage.setItem('raven_city', c); } catch (y) { /* storage blocked */ }
        loc.classList.remove('is-open');
        lb.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', function (e) { if (!loc.contains(e.target)) { loc.classList.remove('is-open'); lb.setAttribute('aria-expanded', 'false'); } });
  }

  var drawer = document.getElementById('rx-drawer'), burger = document.querySelector('.rx-burger');
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (burger) burger.setAttribute('aria-expanded', String(open));
    if (open) { var x = drawer.querySelector('.rx-drawer-x'); if (x) x.focus(); } else if (burger) burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(true); });
  if (drawer) {
    drawer.querySelectorAll('[data-rx-close]').forEach(function (x) { x.addEventListener('click', function () { setDrawer(false); }); });
    drawer.querySelectorAll('.rx-dgrp > button').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.parentElement, open = !g.classList.contains('is-open');
        g.classList.toggle('is-open', open);
        b.setAttribute('aria-expanded', String(open));
      });
    });
  }
  // phones: a placeholder short enough to read in full
  var q = document.getElementById('rx-q');
  if (q && window.matchMedia && window.matchMedia('(max-width:599px)').matches) q.placeholder = 'Search loans, insurance, property…';
  // menu icons, coloured like the product sections
  if (drawer) {
    var P = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
    var ICONS = {
      'home': ['#1d4ed8', '#e8efff', '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'],
      'loans': ['#1d4ed8', '#e8efff', '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18M7 6V4h10v2"/>'],
      'insurance': ['#16a34a', '#e6f7ec', '<path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'],
      'banking': ['#7c3aed', '#f1ebff', '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>'],
      'real estate': ['#ea580c', '#fff0e6', '<path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-5h6v5"/>'],
      'investments': ['#0d9488', '#e3f7f3', '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'],
      'offers': ['#dc2626', '#feecec', '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'],
      'contact us': ['#0284c7', '#e0f2fe', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'],
      'ask a question': ['#c026d3', '#fae8ff', '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>']
    };
    drawer.querySelectorAll('.rx-drawer-body > .rx-dl, .rx-dgrp > .rx-dl').forEach(function (el) {
      var key = (el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : el.textContent).trim().toLowerCase();
      var ic = ICONS[key];
      if (!ic || el.querySelector('.rx-dico')) return;
      var host = el.parentElement.classList.contains('rx-dgrp') ? el.parentElement : el;
      host.style.setProperty('--c', ic[0]);
      host.style.setProperty('--bg', ic[1]);
      var span = document.createElement('span');
      span.className = 'rx-dico';
      span.innerHTML = P + ic[2] + '</svg>';
      el.insertBefore(span, el.firstChild);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeAll();
    if (drawer && drawer.classList.contains('is-open')) setDrawer(false);
    if (loc) loc.classList.remove('is-open');
  });

  // search: send people straight to the matching page, otherwise to the assistant
  var ROUTES = [
    [/auction|e-?auction|sarfaesi/, 'auctions.html'],
    [/home ?loan|housing loan|plot loan|lap\b|loan against property|balance transfer/, 'home-loans.html'],
    [/personal ?loan|salary loan/, 'personal-loans.html'],
    [/business ?loan|msme|mudra|working capital|cc limit|od limit/, 'business-loans.html'],
    [/gold/, 'gold-loans.html'],
    [/(car|bike|motor|two.?wheeler) insurance/, 'insurance.html#motor'],
    [/\bcar\b|\bcar loan|bike|vehicle|two.?wheeler|auto loan/, 'car-loans.html'],
    [/loan|\bemi\b|funding|finance/, 'funding-loans.html'],
    [/life insurance|term plan/, 'insurance.html#life'],
    [/health|medical|mediclaim/, 'insurance.html#health'],
    [/motor|car insurance|bike insurance/, 'insurance.html#motor'],
    [/travel/, 'insurance.html#travel'],
    [/insurance|policy|cover/, 'insurance.html'],
    [/saving/, 'bank-account.html?ba-atype=savings'],
    [/current account/, 'bank-account.html?ba-atype=current'],
    [/bank|account|credit card|debit card/, 'bank-account.html'],
    [/\bsip\b/, 'mutual-funds.html?mf-type=sip'],
    [/mutual|invest|fund|wealth|\bfds?\b|fixed deposit/, 'mutual-funds.html'],
    [/flat|apartment|bhk/, 'real-estate.html?re-ptype=flat'],
    [/plot|land/, 'real-estate.html?re-ptype=plot'],
    [/shop|office|commercial/, 'real-estate.html?re-ptype=shop'],
    [/house|bungalow|property|real estate|villa/, 'real-estate.html'],
    [/contact|call|phone|address|office/, 'contact.html']
  ];
  document.querySelectorAll('[data-rx-search]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var q = (form.querySelector('input').value || '').trim();
      e.preventDefault();
      if (!q) { form.querySelector('input').focus(); return; }
      var t = q.toLowerCase();
      for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i][0].test(t)) { location.href = ROUTES[i][1]; return; }
      location.href = 'ask.html?q=' + encodeURIComponent(q);
    });
  });

  // offers carousel arrows
  document.querySelectorAll('[data-rx-carousel]').forEach(function (box) {
    var track = box.querySelector('.rx-of-track');
    function go(dir) {
      var card = track.firstElementChild, step = card ? card.getBoundingClientRect().width + 10 : 240;
      var end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (dir > 0 && end) track.scrollTo({ left: 0, behavior: 'smooth' });
      else if (dir < 0 && track.scrollLeft <= 2) track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
      else track.scrollBy({ left: dir * step, behavior: 'smooth' });
    }
    box.querySelectorAll('[data-dir]').forEach(function (b) {
      b.addEventListener('click', function () { go(Number(b.getAttribute('data-dir'))); hold(4000); });
    });
    // auto-advance every 2 seconds; pause while someone is looking at or using it
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var paused = false, visible = !('IntersectionObserver' in window), resumeAt = 0;
    function hold(ms) { resumeAt = Date.now() + ms; }
    track.addEventListener('mouseenter', function () { paused = true; });
    track.addEventListener('mouseleave', function () { paused = false; });
    track.addEventListener('focusin', function () { paused = true; });
    track.addEventListener('focusout', function () { paused = false; });
    track.addEventListener('touchstart', function () { hold(4000); }, { passive: true });
    track.addEventListener('pointerdown', function () { hold(4000); });
    if (!visible) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(track);
    setInterval(function () {
      if (paused || !visible || document.hidden || Date.now() < resumeAt) return;
      if (track.scrollWidth <= track.clientWidth + 4) return;
      go(1);
    }, 2000);
  });

  // pre-fill a form field from a menu link, e.g. bank-account.html?ba-atype=savings
  try {
    new URLSearchParams(location.search).forEach(function (v, k) {
      var el = document.getElementById(k);
      if (!el || !/^(SELECT|INPUT)$/.test(el.tagName) || el.value) return;
      if (el.tagName === 'SELECT' && ![].some.call(el.options, function (o) { return o.value === v; })) return;
      el.value = v;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  } catch (x) { /* old browser */ }
})();
