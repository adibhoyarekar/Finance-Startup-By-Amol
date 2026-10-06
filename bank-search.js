/* Search + filters for the personal loan bank list (personal-loans.html). */
(function () {
  var input = document.getElementById('bank-search');
  var grid = document.getElementById('bank-grid');
  if (!input || !grid) return;
  var empty = document.getElementById('bank-empty');
  var count = document.getElementById('bank-count');
  var reset = document.getElementById('bk-reset');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.bk-chip'));
  var state = { type: 'all', region: 'all' };

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.bk')).map(function (el) {
    return {
      el: el,
      type: el.getAttribute('data-type'),
      region: el.getAttribute('data-region'),
      text: (el.textContent + ' ' + el.getAttribute('data-keywords')).toLowerCase().replace(/\s+/g, ' ')
    };
  });

  function run() {
    var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (state.type === 'all' || c.type === state.type) &&
               (state.region === 'all' || c.region === state.region) &&
               terms.every(function (t) { return c.text.indexOf(t) !== -1; });
      c.el.hidden = !ok;
      if (ok) shown++;
    });
    var filtered = terms.length || state.type !== 'all' || state.region !== 'all';
    if (empty) empty.hidden = shown !== 0;
    if (reset) reset.hidden = !filtered;
    if (count) count.textContent = shown === 1 ? '1 bank' : shown + ' banks';
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var g = chip.getAttribute('data-group');
      state[g] = chip.getAttribute('data-value');
      chips.forEach(function (o) {
        if (o.getAttribute('data-group') !== g) return;
        var on = o === chip;
        o.classList.toggle('is-on', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      run();
    });
  });
  if (reset) reset.addEventListener('click', function () {
    input.value = '';
    chips.forEach(function (o) { if (o.getAttribute('data-value') === 'all') o.click(); });
    run();
  });
  input.addEventListener('input', run);
  input.addEventListener('search', run);
})();
