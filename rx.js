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
    box.querySelectorAll('[data-dir]').forEach(function (b) {
      b.addEventListener('click', function () {
        var card = track.firstElementChild, step = card ? card.getBoundingClientRect().width + 10 : 240;
        var dir = Number(b.getAttribute('data-dir'));
        var end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
        if (dir > 0 && end) track.scrollTo({ left: 0, behavior: 'smooth' });
        else if (dir < 0 && track.scrollLeft <= 2) track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
        else track.scrollBy({ left: dir * step, behavior: 'smooth' });
      });
    });
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
