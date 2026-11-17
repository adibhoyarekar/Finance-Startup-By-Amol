/* Terms and privacy pages: contents scroll-spy, reading progress, mobile contents menu, print. */
(function () {
  var toc = document.querySelector('.lx-toc');
  var doc = document.querySelector('.lx-doc');
  if (!toc || !doc) return;
  var btn = toc.querySelector('.lx-toc-btn');
  var cur = toc.querySelector('[data-cur]');
  var pct = toc.querySelector('[data-pct]');
  var bar = toc.querySelector('.lx-prog i');
  var links = Array.prototype.slice.call(toc.querySelectorAll('nav a'));
  var secs = links.map(function (l) { return document.getElementById(l.getAttribute('href').slice(1)); });

  function setOpen(open) {
    toc.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function () { setOpen(!toc.classList.contains('is-open')); });
  links.forEach(function (l) { l.addEventListener('click', function () { setOpen(false); }); });
  document.addEventListener('click', function (e) { if (!toc.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

  var ticking = false;
  function update() {
    ticking = false;
    var line = Math.max(window.innerHeight * 0.3, 190), on = 0;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= line) on = i; });
    links.forEach(function (l, i) {
      var is = i === on;
      l.classList.toggle('is-on', is);
      if (is) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current');
    });
    if (cur) cur.textContent = links[on].lastChild.textContent;
    var r = doc.getBoundingClientRect();
    var total = r.height - window.innerHeight * 0.6;
    var p = Math.max(0, Math.min(1, (window.innerHeight * 0.4 - r.top) / (total > 0 ? total : 1)));
    if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
    if (pct) pct.textContent = Math.round(p * 100) + '%';
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  Array.prototype.forEach.call(document.querySelectorAll('[data-print]'), function (b) {
    b.addEventListener('click', function () { window.print(); });
  });
})();
