(function () {
  var root = document.querySelector('[data-xp]');
  if (!root) return;
  var tiles = [].slice.call(root.querySelectorAll('.xp-tile'));
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function panelOf(t) { return document.getElementById(t.getAttribute('aria-controls')); }

  function close(t) {
    t.setAttribute('aria-expanded', 'false');
    var p = panelOf(t);
    if (p) { p.hidden = true; (p._anims || []).forEach(function (a) { a.pause(); }); }
  }

  // Sub-product animations load the first time their panel opens.
  function playSubs(p) {
    if (p._anims) { if (!reduce) p._anims.forEach(function (a) { a.play(); }); return; }
    p._anims = [];
    getLottie(function () {
      p.querySelectorAll('[data-xp-sub]').forEach(function (el) {
        var a = window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: false, path: el.getAttribute('data-xp-sub'), rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
        a.addEventListener('DOMLoaded', function () {
          var fb = el.querySelector('.xp-sfb');
          if (fb) fb.remove();
          el.classList.add('is-anim');
          if (reduce) a.goToAndStop(20, true); else if (!p.hidden) a.play();
        });
        p._anims.push(a);
      });
    });
  }

  function open(t) {
    tiles.forEach(function (o) { if (o !== t) close(o); });
    t.setAttribute('aria-expanded', 'true');
    var p = panelOf(t);
    if (!p) return;
    p.hidden = false;
    root.classList.add('is-open');
    playSubs(p);
    var r = p.getBoundingClientRect();
    if (r.bottom > window.innerHeight || r.top < 0) {
      var header = document.querySelector('.rx-header');
      var off = header && getComputedStyle(header).position === 'sticky' ? header.offsetHeight : 0;
      var y = window.pageYOffset + (window.innerWidth < 768 ? r.top - off - 12 : t.getBoundingClientRect().top - off - 12);
      window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  tiles.forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.getAttribute('aria-expanded') === 'true') {
        close(t);
        root.classList.remove('is-open');
      } else {
        open(t);
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var t = root.querySelector('.xp-tile[aria-expanded="true"]');
    if (!t) return;
    close(t);
    root.classList.remove('is-open');
    t.focus();
  });

  lazyLottie(root, 'data-xp-lottie', '.xp-fb');
})();

function getLottie(cb) {
  if (window.lottie) return cb();
  var s = document.querySelector('script[data-lazy-lottie]');
  if (!s) {
    s = document.createElement('script');
    s.src = 'lottie.min.js';
    s.async = true;
    s.setAttribute('data-lazy-lottie', '');
    document.head.appendChild(s);
  }
  s.addEventListener('load', function () { if (window.lottie) cb(); });
}

// Animations load only when their section comes near, so the home page stays light.
function lazyLottie(root, attr, fbSel) {
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var anims = [];
  var started = false;
  var visible = false;
  function startAnims() {
    if (started) return;
    started = true;
    root.querySelectorAll('[' + attr + ']').forEach(function (el) {
      var a = window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: false, path: el.getAttribute(attr), rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      a.addEventListener('DOMLoaded', function () {
        var fb = el.querySelector(fbSel);
        if (fb) fb.remove();
        if (reduce) a.goToAndStop(20, true); else if (visible) a.play();
      });
      anims.push(a);
    });
  }
  function setVisible(v) {
    visible = v;
    if (reduce) return;
    anims.forEach(function (a) { if (v) a.play(); else a.pause(); });
  }
  var loadLottie = getLottie;
  if (!('IntersectionObserver' in window)) {
    visible = true;
    loadLottie(startAnims);
    return;
  }
  var near = new IntersectionObserver(function (es) {
    if (es.some(function (e) { return e.isIntersecting; })) {
      near.disconnect();
      loadLottie(startAnims);
    }
  }, { rootMargin: '400px 0px' });
  near.observe(root);
  new IntersectionObserver(function (es) {
    es.forEach(function (e) { setVisible(e.isIntersecting); });
  }).observe(root);
}

lazyLottie(document.querySelector('[data-wy]'), 'data-wy-lottie', '.wy-fb');
