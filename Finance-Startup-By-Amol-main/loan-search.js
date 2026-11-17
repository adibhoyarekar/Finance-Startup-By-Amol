/* Live search for the loan card grids (funding-loans.html and home-loans.html).
   Matches every typed word against a card's text plus its optional data-keywords. */
(function () {
  var input = document.getElementById('loan-search');
  var grid = document.getElementById('loan-grid');
  if (!input || !grid) return;
  var empty = document.getElementById('loan-empty');
  var count = document.getElementById('loan-count');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.lc'));

  var data = cards.map(function (c) {
    return {
      el: c,
      cta: c.classList.contains('lc-cta'),
      text: (c.textContent + ' ' + (c.getAttribute('data-keywords') || '')).toLowerCase().replace(/\s+/g, ' ')
    };
  });

  function run() {
    var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    data.forEach(function (d) {
      var match = terms.length
        ? !d.cta && terms.every(function (t) { return d.text.indexOf(t) !== -1; })
        : true;
      d.el.hidden = !match;
      if (match && !d.cta) shown++;
    });
    if (empty) empty.hidden = !(terms.length && shown === 0);
    if (count) count.textContent = terms.length
      ? (shown === 1 ? '1 loan found' : shown + ' loans found')
      : '';
  }

  input.addEventListener('input', run);
  input.addEventListener('search', run);
})();
