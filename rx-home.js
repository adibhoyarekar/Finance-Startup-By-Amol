/* Homepage: EMI calculator dialog */
(function () {
  var dlg = document.getElementById('rx-emi');
  if (!dlg) return;
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var v = {};
  function calc() {
    dlg.querySelectorAll('input[type=range]').forEach(function (r) { v[r.getAttribute('data-k')] = Number(r.value); });
    var m = v.r / 1200, k = v.n * 12;
    var emi = m ? v.p * m * Math.pow(1 + m, k) / (Math.pow(1 + m, k) - 1) : v.p / k;
    var set = function (key, t) { dlg.querySelector('[data-o="' + key + '"]').textContent = t; };
    set('p', inr(v.p)); set('r', v.r.toFixed(2).replace(/\.?0+$/, '') + '%'); set('n', v.n + (v.n === 1 ? ' year' : ' years'));
    var tot = emi * k;
    set('emi', inr(emi)); set('pri', inr(v.p)); set('int', inr(tot - v.p)); set('tot', inr(tot));
    dlg.style.setProperty('--pc', (tot ? v.p / tot * 100 : 100).toFixed(1) + '%');
  }
  dlg.addEventListener('input', calc);
  document.querySelectorAll('[data-rx-emi]').forEach(function (b) {
    b.addEventListener('click', function () {
      calc();
      if (dlg.showModal) dlg.showModal(); else location.href = 'funding-loans.html';
    });
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
})();
