/* RAVEN website behaviour: header, mega menu, mobile drawer, scroll animations,
   counters, loan calculator, animated chat, Lottie icons and the contact form. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function inr(n) { return Math.round(n).toLocaleString('en-IN'); }
  // ₹ in lakh / crore: 3000000 -> ₹30 L, 12500000 -> ₹1.25 Cr
  function short(n) {
    function trim(x) { return x.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1'); }
    if (n >= 1e7) return '₹' + trim(n / 1e7) + ' Cr';
    if (n >= 1e5) return '₹' + trim(n / 1e5) + ' L';
    return '₹' + inr(n);
  }

  /* ---------- sticky header + scroll progress ---------- */
  var header = $('.b-header'), bar = $('.b-progress');
  var ticking = false, scrollFns = [];
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || root.scrollTop;
      if (header) header.classList.toggle('is-stuck', y > 12);
      if (bar) {
        var h = root.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
      }
      scrollFns.forEach(function (f) { f(y); });
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- mega menu (desktop) ---------- */
  var items = $$('.b-nav > li.has-mega');
  var closeTimer;
  function closeAll(except) {
    items.forEach(function (li) {
      if (li === except) return;
      li.classList.remove('is-open');
      var b = $('.b-navlink', li); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  function open(li) {
    clearTimeout(closeTimer);
    closeAll(li);
    li.classList.add('is-open');
    $('.b-navlink', li).setAttribute('aria-expanded', 'true');
  }
  items.forEach(function (li) {
    var btn = $('.b-navlink', li);
    li.addEventListener('mouseenter', function () { if (window.matchMedia('(hover:hover)').matches) open(li); });
    li.addEventListener('mouseleave', function () { closeTimer = setTimeout(function () { li.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 160); });
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (li.classList.contains('is-open')) { li.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
      else open(li);
    });
    li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) { li.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); } });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.b-nav')) closeAll(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openLi = $('.b-nav > li.is-open');
    if (openLi) { closeAll(); $('.b-navlink', openLi).focus(); }
    closeDrawer();
  });

  /* ---------- mobile drawer ---------- */
  var drawer = $('#rv-menu'), scrim = $('.b-scrim'), burger = $('#menu-btn'), lastFocus;
  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(function () { drawer.classList.add('is-on'); scrim.classList.add('is-on'); });
    root.classList.add('b-lock');
    burger.setAttribute('aria-expanded', 'true');
    setTimeout(function () { var f = $('button,a', drawer); if (f) f.focus(); }, 60);
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-on')) return;
    drawer.classList.remove('is-on'); scrim.classList.remove('is-on');
    root.classList.remove('b-lock');
    burger.setAttribute('aria-expanded', 'false');
    setTimeout(function () { if (!drawer.classList.contains('is-on')) drawer.hidden = true; }, 360);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (burger && drawer) {
    burger.addEventListener('click', openDrawer);
    scrim.addEventListener('click', closeDrawer);
    $$('[data-dclose]', drawer).forEach(function (b) { b.addEventListener('click', closeDrawer); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) closeDrawer(); });
    $$('.b-dgroup > button', drawer).forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.parentNode, on = !g.classList.contains('is-open');
        g.classList.toggle('is-open', on);
        b.setAttribute('aria-expanded', String(on));
      });
    });
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('a[href],button:not([disabled])', drawer).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1140) closeDrawer(); });
  }

  /* ---------- accordions ---------- */
  $$('[data-acc] > button').forEach(function (b) {
    b.addEventListener('click', function () {
      var acc = b.parentNode, on = !acc.classList.contains('is-open');
      var group = acc.closest('[data-acc-group]');
      if (group && on) $$('[data-acc].is-open', group).forEach(function (o) { if (o !== acc) { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); } });
      acc.classList.toggle('is-open', on);
      b.setAttribute('aria-expanded', String(on));
    });
  });

  /* ---------- images with a local fallback ---------- */
  $$('img[data-fallback]').forEach(function (img) {
    img.addEventListener('error', function () {
      var fb = img.getAttribute('data-fallback');
      if (fb && img.getAttribute('src') !== fb) img.setAttribute('src', fb);
    });
  });

  /* ---------- scroll reveal (with staggered children) ---------- */
  $$('[data-stagger]').forEach(function (p) {
    var step = parseFloat(p.getAttribute('data-stagger')) || 0.08;
    Array.prototype.forEach.call(p.children, function (c, i) {
      if (!c.hasAttribute('data-anim') && !c.classList.contains('reveal')) c.setAttribute('data-anim', 'up');
      c.style.setProperty('--d', (i * step).toFixed(2) + 's');
    });
  });
  var revealEls = $$('[data-anim],.reveal');
  function inView(cb, opts) {
    if (!('IntersectionObserver' in window)) return function (el) { cb(el); };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); } });
    }, opts || { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    return function (el) { io.observe(el); };
  }
  var watchReveal = inView(function (el) { el.classList.add('is-in'); });
  revealEls.forEach(function (el) { if (reduce) el.classList.add('is-in'); else watchReveal(el); });

  /* ---------- count-up numbers ---------- */
  function runCount(el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    function show(v) { el.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN')) + suf; }
    if (reduce) { show(end); return; }
    var dur = 1700, t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      show(end * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var watchCount = inView(runCount, { threshold: 0.5 });
  $$('[data-count]').forEach(watchCount);

  /* ---------- scroll-linked progress: about journey + process steps ---------- */
  function progressOf(el, startAt, endAt) {
    var r = el.getBoundingClientRect(), vh = window.innerHeight;
    var start = vh * startAt, end = vh * endAt;
    return Math.max(0, Math.min(1, (start - r.top) / (r.height + start - end)));
  }
  $$('.b-journey').forEach(function (j) {
    var steps = $$('.b-jstep', j);
    function upd() {
      var p = reduce ? 1 : progressOf(j, 0.85, 0.45);
      j.style.setProperty('--jp', p.toFixed(3));
      steps.forEach(function (s, i) { s.classList.toggle('is-done', p >= i / (steps.length - 1) - 0.02); });
    }
    scrollFns.push(upd); upd();
  });
  $$('.b-steps').forEach(function (wrap) {
    var line = $('.b-steps-line', wrap), steps = $$('.b-step', wrap);
    function upd() {
      var p = reduce ? 1 : progressOf(wrap, 0.8, 0.35);
      if (line) line.style.setProperty('--sp', p.toFixed(3));
      steps.forEach(function (s, i) { s.classList.toggle('is-lit', p >= (steps.length > 1 ? i / (steps.length - 1) : 0) - 0.02); });
    }
    scrollFns.push(upd); upd();
  });

  /* ---------- parallax (hero decorations) ---------- */
  var par = $$('[data-parallax]');
  if (par.length && !reduce) {
    scrollFns.push(function (y) {
      par.forEach(function (el) { el.style.transform = 'translate3d(0,' + (y * parseFloat(el.getAttribute('data-parallax'))).toFixed(1) + 'px,0)'; });
    });
  }

  /* ---------- animated support chat (why us) ---------- */
  $$('.b-chat').forEach(function (chat) {
    var msgs = $$('.b-msg', chat), typing = $('.b-typing', chat), done = $('.b-approved', chat);
    function play() {
      if (reduce) { msgs.forEach(function (m) { m.classList.add('is-in'); }); if (done) done.classList.add('is-in'); return; }
      var t = 200;
      msgs.forEach(function (m) {
        var bot = m.classList.contains('bot');
        if (bot && typing) {
          setTimeout(function () { m.parentNode.insertBefore(typing, m); typing.classList.add('is-in'); }, t);
          t += 1100;
          setTimeout(function () { typing.classList.remove('is-in'); }, t - 80);
        }
        setTimeout(function () { m.classList.add('is-in'); }, t);
        t += bot ? 700 : 900;
      });
      if (done) setTimeout(function () { done.classList.add('is-in'); }, t + 200);
    }
    inView(play, { threshold: 0.35 })(chat);
  });

  /* ---------- Lottie icons: load when near the screen, play only while visible ---------- */
  var lotties = $$('[data-lottie]');
  if (lotties.length && window.lottie && 'IntersectionObserver' in window) {
    var anims = new Map();
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target, a = anims.get(el);
        if (en.isIntersecting && !a) {
          a = window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: !reduce, path: el.getAttribute('data-lottie'), rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
          a.addEventListener('DOMLoaded', function () { $$('.lt-fallback', el).forEach(function (f) { f.remove(); }); if (reduce) a.goToAndStop(20, true); });
          anims.set(el, a);
        } else if (a && !reduce) {
          if (en.isIntersecting) a.play(); else a.pause();
        }
      });
    }, { rootMargin: '120px 0px' });
    lotties.forEach(function (el) { lio.observe(el); });
  }

  /* ---------- loan EMI calculator (homepage) ---------- */
  var calc = $('#emi-calc');
  if (calc) {
    var PRESET = {
      home: { label: 'Home Loan', amt: [500000, 20000000, 3000000, 100000], rate: 8.5, yrs: [5, 30, 20], href: 'home-loans.html#home-loan-search' },
      personal: { label: 'Personal Loan', amt: [50000, 4000000, 500000, 10000], rate: 10.5, yrs: [1, 7, 5], href: 'personal-loans.html#personal-loan-search' },
      business: { label: 'Business Loan', amt: [100000, 20000000, 1000000, 50000], rate: 14, yrs: [1, 10, 5], href: 'business-loans.html#business-loan-search' },
      car: { label: 'Car Loan', amt: [100000, 5000000, 800000, 10000], rate: 9, yrs: [1, 7, 5], href: 'car-loans.html#car-loan-search' }
    };
    var A = $('#c-amt', calc), Rt = $('#c-rate', calc), Y = $('#c-yrs', calc), go = $('#c-go', calc);
    var kind = 'home';
    function fill(el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); }
    function update() {
      var P = +A.value, r = +Rt.value / 1200, n = +Y.value * 12;
      var emi = r ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : P / n;
      var total = emi * n, interest = total - P;
      $('#o-amt', calc).textContent = short(P);
      $('#o-rate', calc).textContent = (+Rt.value).toFixed(1).replace(/\.0$/, '') + '%';
      $('#o-yrs', calc).textContent = Y.value + (Y.value === '1' ? ' year' : ' years');
      $('#o-emi', calc).textContent = '₹' + inr(emi);
      $('#o-p', calc).textContent = short(P);
      $('#o-i', calc).textContent = short(interest);
      var share = P / total, C = 2 * Math.PI * 49;
      var fg = $('.b-donut .fg', calc);
      fg.setAttribute('stroke-dasharray', (share * C).toFixed(1) + ' ' + C.toFixed(1));
      $('#o-share', calc).textContent = Math.round(share * 100) + '%';
      [A, Rt, Y].forEach(fill);
    }
    function setKind(k) {
      kind = k; var p = PRESET[k];
      A.min = p.amt[0]; A.max = p.amt[1]; A.step = p.amt[3]; A.value = p.amt[2];
      Rt.value = p.rate;
      Y.min = p.yrs[0]; Y.max = p.yrs[1]; Y.value = p.yrs[2];
      go.href = p.href;
      $('span', go).textContent = 'Check ' + p.label + ' eligibility';
      $$('.b-seg button', calc).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kind') === k)); });
      update();
    }
    $$('.b-seg button', calc).forEach(function (b) { b.addEventListener('click', function () { setKind(b.getAttribute('data-kind')); }); });
    [A, Rt, Y].forEach(function (el) { el.addEventListener('input', update); });
    setKind('home');
  }

  /* ---------- contact form: check the details, then open the visitor's email app ---------- */
  var cf = $('#contact-form');
  if (cf) {
    cf.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#f-name').value.trim(), email = $('#f-email').value.trim(), phone = $('#f-phone').value.trim();
      var svc = $('#f-service').value, msg = $('#f-msg').value.trim();
      var digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      var checks = [
        ['f-name', name.length >= 2],
        ['f-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (!email && digits.length === 10)],
        ['f-phone', !phone || /^[6-9]\d{9}$/.test(digits)],
        ['f-msg', msg.length >= 10]
      ];
      var first = null;
      checks.forEach(function (c) {
        var el = document.getElementById(c[0]), err = cf.querySelector('[data-for="' + c[0] + '"]');
        el.classList.toggle('is-bad', !c[1]);
        if (err) err.classList.toggle('is-on', !c[1]);
        if (!c[1] && !first) first = el;
      });
      if (first) { first.focus(); return; }
      var body = 'Name: ' + name + '\nEmail: ' + (email || '-') + '\nPhone: ' + (phone || '-') + '\nService: ' + (svc || '-') + '\n\n' + msg;
      location.href = 'mailto:hello@raven.business?subject=' + encodeURIComponent('Website enquiry – ' + (svc || 'General') + ' – ' + name) + '&body=' + encodeURIComponent(body);
      var ok = $('#contact-sent'); if (ok) ok.hidden = false;
    });
  }

  onScroll();
})();
