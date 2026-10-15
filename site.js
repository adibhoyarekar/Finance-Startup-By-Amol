/* RAVEN site behaviour: mobile menu, accordions, tabs, scroll reveal */
(function () {
  document.documentElement.classList.add('js');

  // mobile menu
  var btn = document.getElementById('menu-btn');
  var menu = document.getElementById('rv-menu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  // desktop top bar: dock-style magnification on hover; neighbours slide aside
  var dockMq = window.matchMedia && window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  var dockCalm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dockBar = document.querySelector('header nav .rounded-\\[18px\\]');
  if (dockBar && dockMq && !dockCalm) {
    var q = function (sel) { return [].slice.call(dockBar.querySelectorAll(sel)); };
    var dockGroups = [
      { items: q(':scope > a'), anchor: 'left' },
      { items: q(':scope > .lg\\:block a'), anchor: 'center' },
      { items: q(':scope > .lg\\:flex a'), anchor: 'right' }
    ].filter(function (g) { return g.items.length; });
    var dockAll = [];
    dockGroups.forEach(function (g) { g.items.forEach(function (a) { a.classList.add('rv-dk'); dockAll.push(a); }); });
    dockBar.classList.add('rv-dock');
    var dockBase = null, dockX = null, dockRaf = 0;
    var dockMeasure = function () {
      dockBar.classList.add('rv-dk-measure');
      dockBase = dockAll.map(function (a) { var r = a.getBoundingClientRect(); return { c: r.left + r.width / 2, w: r.width }; });
      dockBar.classList.remove('rv-dk-measure');
    };
    var dockPaint = function () {
      dockRaf = 0;
      var k = 0;
      dockGroups.forEach(function (g) {
        var sc = g.items.map(function (a, i) {
          var b = dockBase && dockBase[k + i];
          if (dockX === null || !b || !dockMq.matches) return 1;
          var d = dockX - b.c, sp = Math.max(70, b.w * 0.75);
          return 1 + 0.24 * Math.exp(-(d * d) / (2 * sp * sp));
        });
        var ex = sc.map(function (s, i) { var b = dockBase && dockBase[k + i]; return b ? (s - 1) * b.w : 0; });
        var total = ex.reduce(function (t, e) { return t + e; }, 0), before = 0;
        g.items.forEach(function (a, i) {
          var shift;
          if (g.anchor === 'left') shift = before + ex[i] / 2;
          else if (g.anchor === 'right') shift = before + ex[i] / 2 - total;
          else shift = before + ex[i] / 2 - total / 2;
          before += ex[i];
          a.style.setProperty('--dk-s', sc[i].toFixed(3));
          a.style.setProperty('--dk-x', shift.toFixed(2) + 'px');
          a.style.setProperty('--dk-y', (-(sc[i] - 1) * 12).toFixed(2) + 'px');
        });
        k += g.items.length;
      });
    };
    var dockQueue = function () { if (!dockRaf) dockRaf = requestAnimationFrame(dockPaint); };
    dockBar.addEventListener('mouseenter', function () { dockMeasure(); });
    dockBar.addEventListener('mousemove', function (e) { if (!dockBase) dockMeasure(); dockX = e.clientX; dockQueue(); });
    dockBar.addEventListener('mouseleave', function () { dockX = null; dockQueue(); });
    window.addEventListener('resize', function () { dockBase = null; });
    window.addEventListener('scroll', function () { dockBase = null; }, { passive: true });
  }

  // accordions (FAQ, terms)
  document.querySelectorAll('[data-acc] > button').forEach(function (b) {
    b.addEventListener('click', function () {
      var acc = b.parentNode;
      var open = !acc.classList.contains('is-open');
      acc.classList.toggle('is-open', open);
      b.setAttribute('aria-expanded', String(open));
    });
  });

  // tabs ("Why Partner With Us")
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = root.querySelectorAll('[data-tab]');
    var panes = root.querySelectorAll('[data-pane]');
    function show(i) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === String(i);
        t.classList.toggle('border-[#388AF3]', on);
        t.classList.toggle('border-gray-100', !on);
        t.setAttribute('aria-selected', String(on));
      });
      panes.forEach(function (p) {
        var on = p.getAttribute('data-pane') === String(i);
        p.classList.toggle('hidden', !on);
        p.classList.toggle('opacity-0', !on);
        p.classList.toggle('opacity-100', on);
      });
    }
    tabs.forEach(function (t) {
      var i = t.getAttribute('data-tab');
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('mouseenter', function () { show(i); });
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); } });
    });
  });

  // testimonial photos: fall back to the local initials avatar if the remote photo fails
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    img.addEventListener('error', function () {
      var fb = img.getAttribute('data-fallback');
      if (fb && img.getAttribute('src') !== fb) img.setAttribute('src', fb);
    });
  });

  // animated loan icons (Lottie)
  if (window.lottie) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-lottie]').forEach(function (el) {
      var anim = window.lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: true,
        autoplay: !reduce,
        path: el.getAttribute('data-lottie'),
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
      });
      anim.addEventListener('DOMLoaded', function () {
        el.querySelectorAll('.rv-fallback').forEach(function (f) { f.remove(); });
        if (reduce) anim.goToAndStop(20, true);
      });
    });
  }

  // spotlight that follows the pointer on service cards
  document.querySelectorAll('.sv-card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // count-up numbers
  var counters = document.querySelectorAll('[data-count]');
  function runCount(el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var pre = el.getAttribute('data-prefix') || '';
    var suf = el.getAttribute('data-suffix') || '';
    var fmt = el.getAttribute('data-format') === 'in';
    var dur = 1600, t0 = null;
    function show(v) { el.textContent = pre + (fmt ? Math.round(v).toLocaleString('en-IN') : Math.round(v)) + suf; }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { show(end); return; }
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      show(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { cio.observe(c); });
  } else { counters.forEach(runCount); }

  // scroll reveal
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  items.forEach(function (el) { io.observe(el); });
})();
