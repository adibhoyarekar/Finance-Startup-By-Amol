/* CIBIL Score Dedicated Page Script – CredMates */
(function () {
  'use strict';

  var step1 = document.getElementById('rx-cp-step-1');
  var step2 = document.getElementById('rx-cp-step-2');
  var stepPay = document.getElementById('rx-cp-step-pay');
  var step3 = document.getElementById('rx-cp-step-3'); // Success Step

  var ind1 = document.getElementById('rx-cp-ind-1');
  var ind2 = document.getElementById('rx-cp-ind-2');
  var ind3 = document.getElementById('rx-cp-ind-3');
  var ind4 = document.getElementById('rx-cp-ind-4');
  var line1 = document.getElementById('rx-cp-line-1');
  var line2 = document.getElementById('rx-cp-line-2');
  var line3 = document.getElementById('rx-cp-line-3');

  var bureauCards = document.querySelectorAll('.rx-cp-bureau-card');
  var bureauInput = document.getElementById('rx-cp-bureau-input');
  var selectedBureauName = document.getElementById('rx-cp-selected-name');
  var formHeading = document.getElementById('rx-cp-form-heading');

  var backBtn = document.getElementById('rx-cp-back-btn');
  var changeLink = document.getElementById('rx-cp-change-link');
  var payBackBtn = document.getElementById('rx-cp-pay-back-btn');
  var payBtn = document.getElementById('rx-cp-pay-btn');
  var payBtnText = document.getElementById('rx-cp-pay-btn-text');

  var form = document.getElementById('rx-cp-form');
  var againBtn = document.getElementById('rx-cp-btn-again');

  var nameInp = document.getElementById('rx-cp-name');
  var panInp = document.getElementById('rx-cp-pan');
  var phoneInp = document.getElementById('rx-cp-phone');
  var consentInp = document.getElementById('rx-cp-consent');

  // Payment step elements
  var payBureauPill = document.getElementById('rx-cp-pay-bureau-pill');
  var payName = document.getElementById('rx-cp-pay-name');
  var payPhone = document.getElementById('rx-cp-pay-phone');
  var payTotal = document.getElementById('rx-cp-pay-total');
  var payMsg = stepPay ? stepPay.querySelector('[data-cm-msg]') : null;
  var recheckBtn = stepPay ? stepPay.querySelector('[data-cm-recheck]') : null;
  var guardEl = stepPay ? stepPay.querySelector('[data-cm-guard]') : null;
  var testBadge = stepPay ? stepPay.querySelector('[data-cm-test]') : null;

  // Success step elements
  var resName = document.getElementById('rx-cp-res-name');
  var resBureau = document.getElementById('rx-cp-res-bureau');
  var resAmount = document.getElementById('rx-cp-res-amount');
  var resPhone = document.getElementById('rx-cp-res-phone');
  var refId = document.getElementById('rx-cp-ref-id');

  if (!step1 || !form) return;

  var BUREAU_MAP = {
    crif: 'CRIF CIBIL',
    transunion: 'TransUnion CIBIL',
    both: 'Both Reports (CRIF + TransUnion)'
  };

  var BUREAU_PRICES = {
    crif: 99,
    transunion: 199,
    both: 250
  };

  var currentBureau = 'both';
  var currentPrice = 250;
  var currentName = '';
  var currentPhone = '';
  var currentPan = '';
  var paidView = null;
  var openOrderId = null;

  function updatePayBtn() {
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
    if (!busy) updatePayBtn();
  }

  /* Step switcher */
  function goToStep(num, skipHash) {
    if (num === 3 && paidView) num = 4;
    if (num === 4 && !paidView) num = currentName || openOrderId ? 3 : 1;
    if (num === 3 && !currentName && !openOrderId) num = 1;
    if (num === 2 && !currentName && skipHash) num = 1;
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'none';
    if (stepPay) stepPay.style.display = 'none';
    if (step3) step3.style.display = 'none';

    if (ind1) ind1.className = 'rx-cp-step-item';
    if (ind2) ind2.className = 'rx-cp-step-item';
    if (ind3) ind3.className = 'rx-cp-step-item';
    if (ind4) ind4.className = 'rx-cp-step-item';
    if (line1) line1.className = 'rx-cp-step-line';
    if (line2) line2.className = 'rx-cp-step-line';
    if (line3) line3.className = 'rx-cp-step-line';

    if (num === 1) {
      if (step1) step1.style.display = '';
      if (ind1) ind1.classList.add('is-active');
      if (!skipHash) history.replaceState(null, '', '#step1');
    } else if (num === 2) {
      if (step2) step2.style.display = '';
      if (ind1) ind1.classList.add('is-done');
      if (line1) line1.classList.add('is-done');
      if (ind2) ind2.classList.add('is-active');
      if (!skipHash) history.pushState(null, '', '#step2');
      if (nameInp) setTimeout(function () { nameInp.focus(); }, 150);
    } else if (num === 3) {
      if (stepPay) stepPay.style.display = '';
      if (ind1) ind1.classList.add('is-done');
      if (line1) line1.classList.add('is-done');
      if (ind2) ind2.classList.add('is-done');
      if (line2) line2.classList.add('is-done');
      if (ind3) ind3.classList.add('is-active');
      if (!skipHash) history.pushState(null, '', '#step3');
    } else if (num === 4) {
      if (step3) step3.style.display = '';
      if (ind1) ind1.classList.add('is-done');
      if (line1) line1.classList.add('is-done');
      if (ind2) ind2.classList.add('is-done');
      if (line2) line2.classList.add('is-done');
      if (ind3) ind3.classList.add('is-done');
      if (line3) line3.classList.add('is-done');
      if (ind4) ind4.classList.add('is-active');
      if (!skipHash) history.pushState(null, '', '#step4');
    }

    window.scrollTo({ top: 120, behavior: 'smooth' });
  }

  /* Listen for hash navigation so mobile back button works naturally */
  window.addEventListener('popstate', function () {
    var hash = location.hash;
    if (hash === '#step2') {
      goToStep(2, true);
    } else if (hash === '#step3') {
      goToStep(3, true);
    } else if (hash === '#step4') {
      goToStep(4, true);
    } else {
      goToStep(1, true);
    }
  });

  /* Auto-uppercase PAN input */
  if (panInp) {
    panInp.addEventListener('input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }

  /* Only allow numbers in Phone */
  if (phoneInp) {
    phoneInp.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  }

  /* Select bureau */
  bureauCards.forEach(function (card) {
    card.addEventListener('click', function () {
      var bureau = card.getAttribute('data-bureau') || 'both';
      currentBureau = bureau;
      currentPrice = BUREAU_PRICES[bureau] || 250;
      if (bureauInput) bureauInput.value = bureau;

      var label = BUREAU_MAP[bureau] || BUREAU_MAP.both;
      if (selectedBureauName) selectedBureauName.textContent = label + ' (₹' + currentPrice + ')';
      if (formHeading) formHeading.textContent = 'Enter Details for ' + label;
      clearErrors();
      goToStep(2);
    });
  });

  /* Back buttons */
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      goToStep(1);
    });
  }
  if (changeLink) {
    changeLink.addEventListener('click', function () {
      goToStep(1);
    });
  }
  if (payBackBtn) {
    payBackBtn.addEventListener('click', function () {
      goToStep(2);
    });
  }

  /* Clear errors helper */
  function clearErrors() {
    document.querySelectorAll('.rx-cp-err').forEach(function (el) { el.textContent = ''; });
    document.querySelectorAll('.rx-cp-field').forEach(function (el) { el.classList.remove('has-error'); });
  }

  function setError(fieldId, errId, msg) {
    var field = document.getElementById(fieldId);
    var err = document.getElementById(errId);
    if (field) field.classList.add('has-error');
    if (err) err.textContent = msg;
  }

  /* Form validation and transition to Payment step */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var valid = true;
    var nameVal = (nameInp.value || '').trim();
    var panVal = (panInp.value || '').trim().toUpperCase();
    var phoneVal = (phoneInp.value || '').trim();

    // 1. Full name
    if (!nameVal || nameVal.length < 3) {
      setError('field-cp-name', 'rx-cp-err-name', 'Please enter your full name as per PAN card (minimum 3 characters)');
      valid = false;
    }

    // 2. PAN format ABCDE1234F
    var panRegex = /^[A-Z]{3}P[A-Z][0-9]{4}[A-Z]$/;
    if (!panVal || !panRegex.test(panVal)) {
      setError('field-cp-pan', 'rx-cp-err-pan', 'Please enter a valid individual PAN (e.g. ABCPE1234F)');
      valid = false;
    }

    // 3. Indian Phone 10-digits starting with 6-9
    var phoneRegex = /^[6-9][0-9]{9}$/;
    if (!phoneVal || !phoneRegex.test(phoneVal)) {
      setError('field-cp-phone', 'rx-cp-err-phone', 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
      valid = false;
    }

    // 4. Consent
    if (consentInp && !consentInp.checked) {
      var errConsent = document.getElementById('rx-cp-err-consent');
      if (errConsent) errConsent.textContent = 'Please accept the authorization to fetch your credit report';
      valid = false;
    }

    if (!valid) return;

    currentName = nameVal;
    currentPhone = phoneVal;
    currentPan = panVal;

    // Populate Payment Screen
    if (payBureauPill) payBureauPill.textContent = BUREAU_MAP[currentBureau] || BUREAU_MAP.both;
    if (payName) payName.textContent = currentName;
    if (payPhone) payPhone.textContent = '+91 ' + currentPhone;
    if (payTotal) payTotal.textContent = currentPrice;
    updatePayBtn();
    setMsg('');

    goToStep(3);
  });

  function showPaid(v) {
    paidView = v;
    openOrderId = null;
    var paidAt = new Date(v.payment.paidAt);
    if (resName) resName.textContent = v.customer.name;
    if (resBureau) resBureau.textContent = v.bureauLabel;
    if (resAmount) resAmount.textContent = '₹' + v.amount + ' • Paid via ' + v.payment.method;
    if (resPhone) resPhone.textContent = '+91 ' + v.customer.phone.slice(0, 2) + '•••• ••' + v.customer.phone.slice(8);
    if (refId) refId.textContent = v.payment.id;
    var orderEl = document.getElementById('rx-cp-order-id');
    if (orderEl) orderEl.textContent = v.orderId;
    var paidOn = document.getElementById('rx-cp-paid-on');
    if (window.CMReport) {
      if (paidOn) paidOn.textContent = CMReport.fmtDateTime(paidAt);
      CMReport.mount(step3, CMReport.build({
        bureau: v.bureau, name: v.customer.name, pan: v.customer.pan, phone: v.customer.phone,
        refId: v.payment.id, amount: v.amount, method: v.payment.method, paidAt: paidAt
      }));
    }
    setMsg('');
    goToStep(4);
  }

  function onView(v) {
    if (v.state === 'READY') return showPaid(v);
    openOrderId = v.state === 'PENDING' || v.state === 'PROCESSING' ? v.orderId : null;
    var m = CMPay.message(v);
    setMsg(m.text, m.tone, m.recheck);
  }

  function onError(e) {
    if (e && e.fields) {
      var map = { name: ['field-cp-name', 'rx-cp-err-name'], pan: ['field-cp-pan', 'rx-cp-err-pan'], phone: ['field-cp-phone', 'rx-cp-err-phone'] };
      Object.keys(e.fields).forEach(function (k) { if (map[k]) setError(map[k][0], map[k][1], e.fields[k]); });
      goToStep(2);
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

  if (payBtn) {
    payBtn.addEventListener('click', function () {
      if (!window.CMPay || payBtn.disabled) return;
      setMsg('');
      setBusy(true, 'Opening secure payment…');
      track(CMPay.pay({ bureau: currentBureau, name: currentName, phone: currentPhone, pan: currentPan, consent: true }, {
        guardEl: guardEl,
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

  /* Check another score */
  if (againBtn) {
    againBtn.addEventListener('click', function () {
      form.reset();
      clearErrors();
      paidView = null;
      currentName = '';
      if (window.CMPay) CMPay.clear();
      goToStep(1);
    });
  }

  /* Returning from a bank or UPI redirect, or reopening the page after closing it mid-payment */
  function resumeId() {
    var q = new URLSearchParams(location.search).get('order_id');
    if (q && window.CMPay && CMPay.hasToken(q)) return q;
    return window.CMPay ? CMPay.lastOpen() : null;
  }
  var resumeOrder = resumeId();
  if (new URLSearchParams(location.search).has('order_id')) history.replaceState(null, '', location.pathname + location.hash);

  if (resumeOrder) {
    openOrderId = resumeOrder;
    goToStep(3, true);
    setMsg('Checking your payment status…', 'info');
    setBusy(true, 'Checking payment…');
    track(CMPay.resume(resumeOrder, { maxMs: 60000, onUpdate: function (v) { if (v.state === 'PENDING' || v.state === 'PROCESSING') onView(v); } })).then(function () {
      if (!paidView && !openOrderId) goToStep(1, true);
    });
  } else if (location.hash === '#step2') {
    goToStep(2, true);
  } else {
    goToStep(1, true);
  }
})();
