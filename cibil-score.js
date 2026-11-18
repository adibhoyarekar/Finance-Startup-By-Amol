/* CIBIL Score Modal – CredMates */
(function () {
  'use strict';

  var modal      = document.getElementById('rx-cibil-modal');
  var openBtn    = document.getElementById('rx-cibil-btn');
  var step1      = document.getElementById('rx-cibil-step1');
  var step2      = document.getElementById('rx-cibil-step2');
  var stepPay    = document.getElementById('rx-cibil-step-pay');
  var step3      = document.getElementById('rx-cibil-step3');

  var backBtn    = document.getElementById('rx-cibil-back');
  var payBackBtn = document.getElementById('rx-cibil-pay-back');
  var payBtn     = document.getElementById('rx-cibil-pay-now');
  var payBtnText = document.getElementById('rx-cibil-pay-btn-text');

  var form       = document.getElementById('rx-cibil-form');
  var bureauTag  = document.getElementById('rx-cibil-bureau-tag');
  var bureauVal  = document.getElementById('rx-cibil-bureau-val');
  var formTitle  = document.getElementById('rx-cibil-form-title');

  // Payment elements
  var payBureauPill = document.getElementById('rx-cibil-pay-bureau-pill');
  var payName    = document.getElementById('rx-cibil-pay-name');
  var payPhone   = document.getElementById('rx-cibil-pay-phone');
  var payTotal   = document.getElementById('rx-cibil-pay-total');
  var payMsg     = stepPay ? stepPay.querySelector('[data-cm-msg]') : null;
  var recheckBtn = stepPay ? stepPay.querySelector('[data-cm-recheck]') : null;
  var guardEl    = stepPay ? stepPay.querySelector('[data-cm-guard]') : null;
  var testBadge  = stepPay ? stepPay.querySelector('[data-cm-test]') : null;

  // Success elements
  var modalResName   = document.getElementById('rx-cibil-modal-res-name');
  var modalResAmount = document.getElementById('rx-cibil-modal-res-amount');
  var modalRef       = document.getElementById('rx-cibil-modal-ref');

  if (!modal || !openBtn) return;

  var BUREAU_LABELS = {
    crif: 'CRIF CIBIL',
    transunion: 'TransUnion CIBIL',
    both: 'Both Reports (CRIF + TransUnion)'
  };
  var BUREAU_PRICES = {
    crif: 99,
    transunion: 199,
    both: 250
  };
  var BUREAU_COLORS = {
    crif: '#1d4ed8',
    transunion: '#16a34a',
    both: '#7c3aed'
  };

  var currentBureau = 'both';
  var currentPrice = 250;
  var currentName = '';
  var currentPhone = '';
  var currentPan = '';
  var openOrderId = null;

  function updateModalPayBtn() {
    if (!payBtnText) return;
    payBtnText.textContent = 'Pay ₹' + currentPrice + ' securely →';
  }

  function setMsg(text, tone, recheck) {
    if (payMsg) {
      payMsg.textContent = text || '';
      payMsg.className = 'rx-pay-msg' + (tone && tone !== 'info' ? ' is-' + tone : '');
      payMsg.hidden = !text;
    }
    if (recheckBtn) recheckBtn.hidden = !recheck;
  }

  function setBusy(busy, label) {
    if (!payBtn) return;
    payBtn.disabled = busy;
    if (busy && payBtnText) payBtnText.textContent = label;
    if (!busy) updateModalPayBtn();
  }

  /* ---- helpers ---- */
  function showStep(show) {
    [step1, step2, stepPay, step3].forEach(function (s) {
      if (s) s.style.display = 'none';
    });
    if (show) show.style.display = '';
  }

  function resetModal() {
    if (openOrderId) { showStep(stepPay); return; }
    setMsg('');
    showStep(step1);
    form.reset();
    clearErrors();
  }

  function clearErrors() {
    modal.querySelectorAll('.rx-cibil-err').forEach(function (el) { el.textContent = ''; });
    modal.querySelectorAll('.rx-cibil-field').forEach(function (el) { el.classList.remove('has-error'); });
  }

  /* ---- open / close ---- */
  openBtn.addEventListener('click', function (e) {
    if (window.innerWidth <= 768) {
      return; // Allows standard navigation to cibil-score.html
    }
    e.preventDefault();
    resetModal();
    modal.showModal();
  });

  modal.querySelectorAll('[data-rx-cibil-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { modal.close(); });
  });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.close();
  });

  /* ---- bureau selection ---- */
  modal.querySelectorAll('.rx-cibil-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var bureau = btn.getAttribute('data-bureau') || 'both';
      currentBureau = bureau;
      currentPrice = BUREAU_PRICES[bureau] || 250;
      bureauVal.value = bureau;

      if (bureauTag) {
        bureauTag.textContent = BUREAU_LABELS[bureau] + ' • ₹' + currentPrice;
        bureauTag.style.setProperty('--tag-c', BUREAU_COLORS[bureau]);
      }
      if (formTitle) {
        formTitle.textContent = 'Enter Details — ' + BUREAU_LABELS[bureau];
      }
      clearErrors();
      form.reset();
      bureauVal.value = bureau;
      showStep(step2);
    });
  });

  /* ---- back buttons ---- */
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      showStep(step1);
    });
  }
  if (payBackBtn) {
    payBackBtn.addEventListener('click', function () {
      showStep(step2);
    });
  }

  /* Auto-uppercase PAN input */
  var panInput = document.getElementById('rx-cibil-pan');
  if (panInput) {
    panInput.addEventListener('input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }

  /* Only numbers in phone */
  var phoneInput = document.getElementById('rx-cibil-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  }

  /* ---- validation ---- */
  function validateField(id, errId, test, msg) {
    var el = document.getElementById(id);
    if (!el) return true;
    var val = el.value.trim();
    var errEl = document.getElementById(errId);
    var field = el.closest('.rx-cibil-field');
    if (!test(val)) {
      if (errEl) errEl.textContent = msg;
      if (field) field.classList.add('has-error');
      return false;
    }
    if (errEl) errEl.textContent = '';
    if (field) field.classList.remove('has-error');
    return true;
  }

  /* ---- submit details -> go to payment ---- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var ok = true;

    ok = validateField('rx-cibil-name', 'rx-cibil-name-err',
      function (v) { return v.length >= 2; },
      'Please enter your full name') && ok;

    ok = validateField('rx-cibil-pan', 'rx-cibil-pan-err',
      function (v) { return /^[A-Z]{3}P[A-Z][0-9]{4}[A-Z]$/.test(v.toUpperCase()); },
      'Enter a valid individual PAN (e.g. ABCPE1234F)') && ok;

    ok = validateField('rx-cibil-phone', 'rx-cibil-phone-err',
      function (v) { return /^[6-9][0-9]{9}$/.test(v); },
      'Enter a valid 10-digit phone number') && ok;

    if (!ok) return;

    var nameVal = (document.getElementById('rx-cibil-name').value || '').trim();
    var phoneVal = (document.getElementById('rx-cibil-phone').value || '').trim();
    currentName = nameVal;
    currentPhone = phoneVal;
    currentPan = (document.getElementById('rx-cibil-pan').value || '').trim().toUpperCase();

    // Populate Payment step
    if (payBureauPill) payBureauPill.textContent = BUREAU_LABELS[currentBureau];
    if (payName) payName.textContent = currentName;
    if (payPhone) payPhone.textContent = '+91 ' + currentPhone;
    if (payTotal) payTotal.textContent = currentPrice;
    updateModalPayBtn();
    setMsg('');

    showStep(stepPay);
  });

  function showPaid(v) {
    openOrderId = null;
    var paidAt = new Date(v.payment.paidAt);
    if (modalResName) modalResName.textContent = v.customer.name;
    if (modalResAmount) modalResAmount.textContent = '₹' + v.amount + ' via ' + v.payment.method;
    if (modalRef) modalRef.textContent = v.payment.id;
    var orderEl = document.getElementById('rx-cibil-modal-order');
    if (orderEl) orderEl.textContent = v.orderId;
    var paidOn = document.getElementById('rx-cibil-modal-paid-on');
    if (window.CMReport) {
      if (paidOn) paidOn.textContent = CMReport.fmtDateTime(paidAt);
      CMReport.mount(step3, CMReport.build({
        bureau: v.bureau, name: v.customer.name, pan: v.customer.pan, phone: v.customer.phone,
        refId: v.payment.id, amount: v.amount, method: v.payment.method, paidAt: paidAt
      }));
    }
    setMsg('');
    if (window.CMPay) CMPay.clear();
    showStep(step3);
  }

  function onView(v) {
    if (v.state === 'READY') return showPaid(v);
    openOrderId = v.state === 'PENDING' || v.state === 'PROCESSING' ? v.orderId : null;
    var m = CMPay.message(v);
    setMsg(m.text, m.tone, m.recheck);
  }

  function onError(e) {
    if (e && e.fields) {
      var map = { name: 'rx-cibil-name', pan: 'rx-cibil-pan', phone: 'rx-cibil-phone' };
      Object.keys(e.fields).forEach(function (k) {
        if (!map[k]) return;
        var err = document.getElementById(map[k] + '-err');
        var el = document.getElementById(map[k]);
        if (err) err.textContent = e.fields[k];
        if (el && el.closest('.rx-cibil-field')) el.closest('.rx-cibil-field').classList.add('has-error');
      });
      showStep(step2);
      return;
    }
    setMsg((e && e.message) || 'Something went wrong. Please try again.', 'error');
  }

  function track(promise) {
    return promise.then(onView, onError).then(function () { setBusy(false); });
  }

  if (window.CMPay) {
    CMPay.config().then(function (c) { if (testBadge) testBadge.hidden = c.mode !== 'sandbox' || !c.enabled; }, function () {});
    CMPay.mountGuard(guardEl);
  }

  /* ---- pay button click ---- */
  if (payBtn) {
    payBtn.addEventListener('click', function () {
      if (!window.CMPay || payBtn.disabled) return;
      setMsg('');
      setBusy(true, 'Opening secure payment…');
      track(CMPay.pay({ bureau: currentBureau, name: currentName, phone: currentPhone, pan: currentPan, consent: true }, {
        guardEl: guardEl,
        // The payment window cannot sit above a modal dialog, so the dialog steps aside while it is open.
        beforeCheckout: function () { if (modal.open) modal.close(); },
        afterCheckout: function () { if (!modal.open) modal.showModal(); showStep(stepPay); },
        onUpdate: function (v) {
          if (v.state === 'PENDING' || v.state === 'PROCESSING') { setBusy(true, 'Confirming payment…'); onView(v); }
        }
      }));
    });
  }

  if (recheckBtn) {
    recheckBtn.addEventListener('click', function () {
      if (!openOrderId) return;
      setBusy(true, 'Checking payment…');
      track(CMPay.resume(openOrderId, { maxMs: 30000, onUpdate: onView }));
    });
  }
})();
