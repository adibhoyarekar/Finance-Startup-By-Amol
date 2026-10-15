/* Touch drag-and-drop for pipeline boards: press and hold a card, drag it, drop it on a column.
   A quick swipe still scrolls the page and a tap still works as a normal click. */
(function () {
  window.TouchDrag = function (root, o) {
    var HOLD = 220, SLOP = 8;
    var timer = null, el = null, ghost = null, over = null, active = false, sx = 0, sy = 0, offX = 0, offY = 0, lastT = null, raf = 0;

    function cancelHold() { clearTimeout(timer); timer = null; }
    function begin() {
      timer = null;
      if (!el || !document.body.contains(el)) return;
      active = true;
      var r = el.getBoundingClientRect();
      offX = sx - r.left; offY = sy - r.top;
      ghost = el.cloneNode(true);
      ghost.removeAttribute('id');
      ghost.className += ' td-ghost';
      ghost.style.cssText += ';position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;margin:0;z-index:9999;pointer-events:none;' +
        'box-shadow:0 18px 40px -12px rgba(15,23,42,.45);transform:rotate(2deg) scale(1.04);opacity:.96;transition:none;animation:none';
      document.body.appendChild(ghost);
      el.classList.add('is-drag');
      document.documentElement.classList.add('td-dragging');
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (x) { /* not allowed */ } }
    }
    function track() {
      raf = 0;
      if (!active || !lastT) return;
      ghost.style.left = (lastT.clientX - offX) + 'px';
      ghost.style.top = (lastT.clientY - offY) + 'px';
      var under = document.elementFromPoint(lastT.clientX, lastT.clientY);
      var col = under && under.closest ? under.closest(o.col) : null;
      if (col && !root.contains(col)) col = null;
      if (col !== over) {
        if (over) over.classList.remove('is-over');
        over = col;
        if (over) over.classList.add('is-over');
      }
      if (lastT.clientY < 70) window.scrollBy(0, -14);
      else if (lastT.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
    }
    function finish(drop) {
      cancelHold();
      if (!active) { el = null; return false; }
      active = false;
      if (ghost) ghost.remove();
      ghost = null;
      if (el) el.classList.remove('is-drag');
      document.documentElement.classList.remove('td-dragging');
      var col = over, card = el;
      if (over) over.classList.remove('is-over');
      over = null; el = null; lastT = null;
      if (drop && col && card) o.onDrop(o.cardId(card), o.colId(col));
      return true;
    }

    root.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { finish(false); return; }
      var t = e.target;
      if (t.closest && t.closest('button, select, input, textarea, a')) return;
      var c = t.closest ? t.closest(o.card) : null;
      if (!c || !root.contains(c)) return;
      el = c; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      cancelHold(); timer = setTimeout(begin, HOLD);
    }, { passive: true });

    root.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (!active) {
        if (timer && (Math.abs(t.clientX - sx) > SLOP || Math.abs(t.clientY - sy) > SLOP)) { cancelHold(); el = null; }
        return;
      }
      e.preventDefault();
      lastT = { clientX: t.clientX, clientY: t.clientY };
      if (!raf) raf = requestAnimationFrame(track);
    }, { passive: false });

    root.addEventListener('touchend', function (e) { if (finish(true)) e.preventDefault(); });
    root.addEventListener('touchcancel', function () { finish(false); });
    root.addEventListener('contextmenu', function (e) { if (active || timer) e.preventDefault(); });
  };
})();
