(function () {
  var root = document.querySelector('.pr');
  if (!root) return;
  var input = document.getElementById('pr-q');
  var form = input.form;
  var clear = form.querySelector('.pr-clear');
  var empty = document.getElementById('pr-empty');
  var sections = [].slice.call(root.querySelectorAll('.pr-sec'));
  var tabs = [].slice.call(root.querySelectorAll('.pr-tabs a'));
  var tabBar = root.querySelector('.pr-tabs');
  var tabList = tabBar.querySelector('ul');

  // dock the tab bar under a header bar only while that bar is actually pinned to the viewport top
  var bars = [].slice.call(document.querySelectorAll('.rx-nav, .rx-top'));
  var queued = false;
  function syncOffsets() {
    queued = false;
    var top = 0;
    bars.forEach(function (el) {
      if (el.offsetParent === null || getComputedStyle(el).position !== 'sticky') return;
      var r = el.getBoundingClientRect();
      if (r.top <= 0.5 && r.bottom > 0) top = Math.max(top, r.bottom);
    });
    root.style.setProperty('--pr-top', Math.round(top) + 'px');
    root.style.setProperty('--pr-tabs', tabBar.offsetHeight + 'px');
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(syncOffsets); } }
  syncOffsets();
  addEventListener('resize', queue);
  addEventListener('scroll', queue, { passive: true });

  function norm(s) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); }

  function setActive(id) {
    tabs.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) {
        var li = a.parentNode;
        var left = li.offsetLeft - (tabList.clientWidth - li.offsetWidth) / 2;
        tabList.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }
    });
  }

  function filter() {
    var q = norm(input.value);
    form.classList.toggle('has-q', !!q);
    var total = 0;
    sections.forEach(function (sec) {
      var shown = 0;
      sec.querySelectorAll('[data-item]').forEach(function (item) {
        var head = norm(item.getAttribute('data-item'));
        var subs = [].slice.call(item.querySelectorAll('[data-sub] a'));
        var headHit = !q || head.indexOf(q) > -1;
        var subHit = false;
        subs.forEach(function (a) {
          var hit = !!q && norm(a.textContent).indexOf(q) > -1;
          a.classList.toggle('is-hit', hit);
          if (hit) subHit = true;
        });
        var show = headHit || subHit;
        item.hidden = !show;
        if (show) shown++;
      });
      sec.hidden = shown === 0;
      var tab = root.querySelector('.pr-tabs a[href="#' + sec.id + '"]');
      if (tab) {
        tab.parentNode.classList.toggle('is-off', shown === 0);
        var n = tab.querySelector('small');
        if (n) n.textContent = q ? shown : n.getAttribute('data-n');
      }
      total += shown;
    });
    empty.hidden = total > 0;
    var first = sections.filter(function (s) { return !s.hidden; })[0];
    if (first) setActive(first.id);
  }

  tabs.forEach(function (a) {
    var n = a.querySelector('small');
    if (n) n.setAttribute('data-n', n.textContent);
  });

  input.addEventListener('input', filter);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var first = sections.filter(function (s) { return !s.hidden; })[0];
    if (first) first.scrollIntoView({ behavior: 'smooth' });
    input.blur();
  });
  function reset() { input.value = ''; filter(); input.focus(); }
  clear.addEventListener('click', reset);
  document.getElementById('pr-reset').addEventListener('click', reset);
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
    } else if (e.key === 'Escape' && document.activeElement === input && input.value) {
      reset();
    }
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  var initial = new URLSearchParams(location.search).get('q');
  if (initial) { input.value = initial; filter(); }
})();
