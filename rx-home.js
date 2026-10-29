/* Homepage: EMI calculator dialog */
(function () {
  var dlg = document.getElementById('rx-emi');
  if (!dlg) return;
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var v = {};

  function fmtNum(n, k) {
    if (k === 'p') return Math.round(n).toLocaleString('en-IN');
    if (k === 'r') return n.toFixed(2).replace(/\.?0+$/, '');
    return String(Math.round(n));
  }

  function calc() {
    dlg.querySelectorAll('input[type=range]').forEach(function (r) { v[r.getAttribute('data-k')] = Number(r.value); });
    var m = v.r / 1200, k = v.n * 12;
    var emi = m ? v.p * m * Math.pow(1 + m, k) / (Math.pow(1 + m, k) - 1) : v.p / k;
    var set = function (key, t) { var el = dlg.querySelector('[data-o="' + key + '"]'); if (el) el.textContent = t; };
    set('emi', inr(emi)); set('pri', inr(v.p)); set('int', inr(emi * k - v.p)); set('tot', inr(emi * k));
    dlg.style.setProperty('--pc', (emi * k ? v.p / (emi * k) * 100 : 100).toFixed(1) + '%');
    dlg.querySelectorAll('input[data-num]').forEach(function (inp) {
      var key = inp.getAttribute('data-num');
      if (inp !== document.activeElement) inp.value = fmtNum(v[key], key);
    });
  }

  function clamp(val, slider) {
    var mn = Number(slider.min), mx = Number(slider.max);
    return Math.min(mx, Math.max(mn, val));
  }

  dlg.addEventListener('input', function (e) {
    if (e.target.type === 'range') {
      calc();
    }
  });

  dlg.querySelectorAll('input[data-num]').forEach(function (inp) {
    var key = inp.getAttribute('data-num');
    var slider = dlg.querySelector('input[data-k="' + key + '"]');

    inp.addEventListener('input', function () {
      var raw = inp.value.replace(/[^0-9.]/g, '');
      var num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        num = clamp(num, slider);
        slider.value = num;
        v[key] = num;
        calc();
      }
    });

    inp.addEventListener('blur', function () {
      var raw = inp.value.replace(/[^0-9.]/g, '');
      var num = parseFloat(raw);
      if (isNaN(num) || num <= 0) {
        num = Number(slider.value);
      }
      num = clamp(num, slider);
      var step = Number(slider.step);
      if (step >= 1 && key !== 'r') num = Math.round(num / step) * step;
      slider.value = num;
      v[key] = num;
      inp.value = fmtNum(num, key);
      calc();
    });

    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    });
  });

  document.querySelectorAll('[data-rx-emi]').forEach(function (b) {
    b.addEventListener('click', function () {
      calc();
      if (dlg.showModal) dlg.showModal(); else location.href = 'funding-loans.html';
    });
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
})();
