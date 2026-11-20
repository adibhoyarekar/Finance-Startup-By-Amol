/* Home loans: picking a loan type takes the customer to the eligibility form with that type selected */
(function () {
  var grid = document.getElementById('loan-grid');
  var formSec = document.getElementById('home-loan-search');
  var form = document.getElementById('hl-form');
  var picked = document.getElementById('hlx-picked');
  var pickedName = document.getElementById('hlx-picked-name');
  var change = document.getElementById('hlx-change');
  var prop = document.getElementById('hl-prop');
  var nameEl = document.getElementById('hl-name');
  if (!grid || !formSec || !form || !picked) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scrollTo(el) {
    var header = document.querySelector('.rx-top');
    var off = header && getComputedStyle(header).position === 'sticky' ? header.offsetHeight : 0;
    var y = el.getBoundingClientRect().top + window.pageYOffset - off - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
  }

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('a.lc[data-type]');
    if (!card || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    grid.querySelectorAll('.lc.is-picked').forEach(function (c) { c.classList.remove('is-picked'); c.removeAttribute('aria-current'); });
    card.classList.add('is-picked');
    card.setAttribute('aria-current', 'true');
    pickedName.textContent = card.getAttribute('data-type');
    picked.hidden = false;
    var p = card.getAttribute('data-prop');
    if (p && prop && [].some.call(prop.options, function (o) { return o.value === p; })) {
      prop.value = p;
      prop.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // if a previous result is showing, go back to the form
    if (form.hidden) { var edit = document.getElementById('hl-edit'); if (edit) edit.click(); }
    scrollTo(formSec);
    if (nameEl) setTimeout(function () { nameEl.focus({ preventScroll: true }); }, reduce ? 0 : 450);
  });

  change.addEventListener('click', function () {
    picked.hidden = true;
    grid.querySelectorAll('.lc.is-picked').forEach(function (c) { c.classList.remove('is-picked'); c.removeAttribute('aria-current'); });
    scrollTo(document.getElementById('home-loans'));
  });

  form.addEventListener('reset', function () {
    picked.hidden = true;
    grid.querySelectorAll('.lc.is-picked').forEach(function (c) { c.classList.remove('is-picked'); c.removeAttribute('aria-current'); });
  });
})();
