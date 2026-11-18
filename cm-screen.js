/* Full-screen status pages (loading, success, error, warning, pending, refund) with Lottie animations – CredMates */
(function () {
  'use strict';

  var KINDS = {
    loading: { anim: 'animations/cm-loading.json', loop: true, tint: '#1d4ed8', bg: '#eef4ff' },
    pending: { anim: 'animations/cm-pending.json', loop: true, tint: '#d97706', bg: '#fff8eb' },
    success: { anim: 'animations/cm-success.json', loop: false, tint: '#16a34a', bg: '#ecfdf3' },
    error: { anim: 'animations/cm-error.json', loop: false, tint: '#dc2626', bg: '#fef2f2' },
    warning: { anim: 'animations/cm-warning.json', loop: false, tint: '#d97706', bg: '#fffbeb' },
    refund: { anim: 'animations/cm-refund.json', loop: false, tint: '#2563eb', bg: '#eff6ff' }
  };
  var FALLBACK = {
    loading: '<circle cx="12" cy="12" r="9" stroke-dasharray="14 40"/>',
    pending: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    success: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    warning: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
    refund: '<circle cx="12" cy="12" r="9"/><path d="M15 9a4 4 0 1 0 1 4"/>'
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = null, card = null, anim = null, lottiePromise = null, animCache = {}, lastFocus = null, opening = 0, swapTimer = 0;

  var css = '' +
    '.cms{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;background:var(--cms-bg,#f8fafc);overflow-y:auto;-webkit-overflow-scrolling:touch;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .35s ease,background-color .5s ease,visibility 0s linear .35s;font-family:inherit}' +
    '.cms.is-on{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .35s ease,background-color .5s ease,visibility 0s}' +
    '.cms::before{content:"";position:fixed;inset:-20% -10% auto;height:70%;background:radial-gradient(closest-side,var(--cms-glow,rgba(29,78,216,.14)),transparent);pointer-events:none;transition:background .5s ease}' +
    '.cms-bar{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px clamp(16px,4vw,40px);background:rgba(255,255,255,.75);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(15,23,42,.06);z-index:1}' +
    '.cms-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:#0b2b5e;font-weight:800;font-size:17px}' +
    '.cms-logo img{width:34px;height:34px}' +
    '.cms-secure{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:#15803d;background:#fff;border:1px solid #bbf7d0;border-radius:999px;padding:6px 12px}' +
    '.cms-body{position:relative;flex:1;display:flex;align-items:flex-start;justify-content:center;padding:clamp(20px,6vh,64px) 16px 48px}' +
    '.cms-card{width:100%;max-width:560px;background:#fff;border-radius:24px;box-shadow:0 30px 70px -30px rgba(11,43,94,.35),0 2px 6px rgba(15,23,42,.05);padding:clamp(24px,5vw,40px) clamp(18px,5vw,40px) clamp(22px,4vw,34px);text-align:center;box-sizing:border-box}' +
    '.cms-card>*{opacity:0;transform:translateY(14px)}' +
    '.cms-card.is-in>*{animation:cmsUp .55s cubic-bezier(.2,.8,.2,1) forwards}' +
    '.cms-card.is-in>*:nth-child(1){animation-delay:.02s}.cms-card.is-in>*:nth-child(2){animation-delay:.12s}.cms-card.is-in>*:nth-child(3){animation-delay:.2s}.cms-card.is-in>*:nth-child(4){animation-delay:.28s}.cms-card.is-in>*:nth-child(5){animation-delay:.36s}.cms-card.is-in>*:nth-child(6){animation-delay:.44s}' +
    '.cms-card.is-out>*{animation:cmsDown .22s ease forwards}' +
    '@keyframes cmsUp{to{opacity:1;transform:none}}' +
    '@keyframes cmsDown{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-8px)}}' +
    '.cms-anim{width:min(170px,44vw);height:min(170px,44vw);margin:-6px auto 6px;display:flex;align-items:center;justify-content:center}' +
    '.cms-anim svg.cms-fb{width:96px;height:96px;fill:none;stroke:var(--cms-tint);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    '.cms-title{margin:0 0 8px;font-size:clamp(22px,4.6vw,28px);line-height:1.2;font-weight:800;color:#0f172a;letter-spacing:-.01em}' +
    '.cms-text{margin:0 auto 20px;max-width:440px;font-size:15px;line-height:1.6;color:#475569}' +
    '.cms-text:empty{display:none}' +
    '.cms-extra{text-align:left}' +
    '.cms-extra:empty{display:none}' +
    '.cms-rows{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:6px 16px;margin:0 0 18px}' +
    '.cms-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed #e2e8f0;font-size:14px}' +
    '.cms-row:last-child{border-bottom:0}' +
    '.cms-row span{color:#64748b}' +
    '.cms-row b{color:#0f172a;font-weight:700;text-align:right;word-break:break-all}' +
    '.cms-row b.is-ok{color:#16a34a}' +
    '.cms-actions{display:flex;flex-direction:column;gap:10px;margin-top:6px}' +
    '.cms-actions:empty{display:none}' +
    '.cms-btn{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 18px;border-radius:14px;border:1.5px solid #cfdcf2;background:#fff;color:#0b2b5e;font:inherit;font-size:15.5px;font-weight:700;text-decoration:none;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease,background-color .18s ease}' +
    '.cms-btn:hover{transform:translateY(-1px);background:#f8fbff}' +
    '.cms-btn:active{transform:translateY(0) scale(.99)}' +
    '.cms-btn.is-primary{border-color:transparent;color:#fff;background:linear-gradient(135deg,#0b2b5e,#1d4ed8);box-shadow:0 14px 28px -12px rgba(29,78,216,.65)}' +
    '.cms-btn.is-primary:hover{filter:brightness(1.08);background:linear-gradient(135deg,#0b2b5e,#1d4ed8)}' +
    '.cms-btn:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}' +
    '.cms-note{margin:14px 0 0;font-size:12.5px;color:#94a3b8}' +
    '.cms-dots{display:inline-flex;gap:5px;margin-left:2px}' +
    '.cms-dots i{width:5px;height:5px;border-radius:50%;background:currentColor;animation:cmsDot 1.2s infinite ease-in-out}' +
    '.cms-dots i:nth-child(2){animation-delay:.15s}.cms-dots i:nth-child(3){animation-delay:.3s}' +
    '@keyframes cmsDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}' +
    'html.cms-lock,html.cms-lock body{overflow:hidden}' +
    '@media(max-width:480px){.cms-row{font-size:13.5px}.cms-btn{min-height:50px;font-size:15px}}' +
    '@media(prefers-reduced-motion:reduce){.cms,.cms-card>*{transition:none!important;animation:none!important;opacity:1!important;transform:none!important}.cms-dots i{animation:none}}';

  function injectStyles() {
    if (document.getElementById('cms-styles')) return;
    var s = document.createElement('style');
    s.id = 'cms-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function loadLottie() {
    if (window.lottie) return Promise.resolve(window.lottie);
    if (!lottiePromise) {
      lottiePromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'lottie.min.js';
        s.async = true;
        s.onload = function () { resolve(window.lottie); };
        s.onerror = function () { lottiePromise = null; reject(new Error('lottie')); };
        document.head.appendChild(s);
      });
    }
    return lottiePromise;
  }

  function animData(path) {
    if (!animCache[path]) {
      animCache[path] = fetch(path, { cache: 'force-cache' }).then(function (r) {
        if (!r.ok) throw new Error('anim');
        return r.json();
      }).catch(function (e) { delete animCache[path]; throw e; });
    }
    return animCache[path];
  }

  function build() {
    if (root) return;
    injectStyles();
    root = document.createElement('div');
    root.className = 'cms';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'cms-title');
    root.innerHTML = '<div class="cms-bar"><a class="cms-logo" href="index.html"><img src="images/rx/logo-mark.svg" alt="" width="34" height="34"><span>CredMates</span></a>' +
      '<span class="cms-secure"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Secure</span></div>' +
      '<div class="cms-body"><div class="cms-card" aria-live="polite"></div></div>';
    card = root.querySelector('.cms-card');
    document.body.appendChild(root);
  }

  function playAnim(holder, kind) {
    var k = KINDS[kind];
    holder.innerHTML = '<svg class="cms-fb" viewBox="0 0 24 24" aria-hidden="true">' + FALLBACK[kind] + '</svg>';
    Promise.all([loadLottie(), animData(k.anim)]).then(function (res) {
      if (!holder.isConnected) return;
      var a = res[0].loadAnimation({
        container: holder, renderer: 'svg', loop: k.loop && !reduce, autoplay: false,
        animationData: res[1], rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
      });
      a.addEventListener('DOMLoaded', function () {
        var fb = holder.querySelector('.cms-fb');
        if (fb) fb.remove();
        if (reduce) a.goToAndStop(a.totalFrames - 1, true); else a.play();
      });
      anim = a;
    }).catch(function () { /* the static icon stays */ });
  }

  function render(o) {
    if (anim) { anim.destroy(); anim = null; }
    var k = KINDS[o.kind] || KINDS.loading;
    root.style.setProperty('--cms-bg', k.bg);
    root.style.setProperty('--cms-tint', k.tint);
    root.style.setProperty('--cms-glow', k.tint + '26');
    card.className = 'cms-card';
    card.innerHTML = '<div class="cms-anim" aria-hidden="true"></div>' +
      '<h1 class="cms-title" id="cms-title">' + esc(o.title) + (o.dots ? ' <span class="cms-dots" aria-hidden="true"><i></i><i></i><i></i></span>' : '') + '</h1>' +
      '<p class="cms-text">' + esc(o.text || '') + '</p>' +
      '<div class="cms-extra">' + (o.html || '') + '</div>' +
      '<div class="cms-actions"></div>' +
      (o.note ? '<p class="cms-note">' + esc(o.note) + '</p>' : '');
    var acts = card.querySelector('.cms-actions');
    (o.actions || []).forEach(function (a) {
      var el = document.createElement(a.href ? 'a' : 'button');
      el.className = 'cms-btn' + (a.primary ? ' is-primary' : '');
      el.textContent = a.label;
      if (a.href) el.href = a.href; else el.type = 'button';
      if (a.onClick) el.addEventListener('click', a.onClick);
      acts.appendChild(el);
    });
    playAnim(card.querySelector('.cms-anim'), o.kind);
    void card.offsetWidth;
    card.classList.add('is-in');
    root.scrollTop = 0;
    if (o.onRender) o.onRender(card);
    var first = acts.querySelector('.cms-btn.is-primary') || acts.querySelector('.cms-btn');
    if (first && !o.noFocus) setTimeout(function () { first.focus({ preventScroll: true }); }, 450);
  }

  function show(o) {
    var fresh = !isOpen();
    build();
    clearTimeout(swapTimer);
    if (fresh) {
      lastFocus = document.activeElement;
      document.documentElement.classList.add('cms-lock');
      render(o);
      opening = requestAnimationFrame(function () { opening = 0; root.classList.add('is-on'); });
      return;
    }
    if (reduce) return render(o);
    card.classList.remove('is-in');
    card.classList.add('is-out');
    swapTimer = setTimeout(function () { render(o); }, 200);
  }

  function hide() {
    if (!root) return;
    clearTimeout(swapTimer);
    if (opening) { cancelAnimationFrame(opening); opening = 0; }
    else if (!root.classList.contains('is-on')) return;
    root.classList.remove('is-on');
    document.documentElement.classList.remove('cms-lock');
    setTimeout(function () {
      if (root && !root.classList.contains('is-on')) {
        if (anim) { anim.destroy(); anim = null; }
        card.innerHTML = '';
      }
    }, 360);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function isOpen() { return !!(root && (opening || root.classList.contains('is-on'))); }

  window.CMScreen = { show: show, hide: hide, isOpen: isOpen, esc: esc, preload: function () { loadLottie().catch(function () {}); Object.keys(KINDS).forEach(function (k) { animData(KINDS[k].anim).catch(function () {}); }); } };
})();
