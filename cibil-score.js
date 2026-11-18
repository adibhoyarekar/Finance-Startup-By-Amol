/* CIBIL Score Modal – RAVEN */
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
  var customUpiField = document.getElementById('rx-cibil-upi-field');

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
  var selectedApp = 'Google Pay';

  var modalLottieAnim = null;

  function initModalPaymentLottie() {
    var container = document.getElementById('rx-cibil-lottie');
    if (!container || !window.lottie || modalLottieAnim) return;

    try {
      var params = {
        container: container,
        renderer: 'svg',
        loop: true,
        autoplay: true
      };
      if (window.PAYMENT_LOTTIE_DATA) {
        params.animationData = window.PAYMENT_LOTTIE_DATA;
      } else {
        params.path = 'animations/payment.json';
      }
      modalLottieAnim = window.lottie.loadAnimation(params);
    } catch (e) {
      console.warn('Modal Lottie initialization failed:', e);
    }
  }

  function updateModalPayBtn() {
    if (!payBtnText) return;
    payBtnText.textContent = 'Pay ₹' + currentPrice + ' via ' + (selectedApp || 'UPI') + ' →';
  }

  /* ---- helpers ---- */
  function showStep(show) {
    [step1, step2, stepPay, step3].forEach(function (s) {
      if (s) s.style.display = 'none';
    });
    if (show) show.style.display = '';
    if (show === stepPay) {
      initModalPaymentLottie();
    }
  }

  function resetModal() {
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

  /* UPI app option buttons inside modal */
  var upiApps = modal.querySelectorAll('.rx-upi-app');
  upiApps.forEach(function (btn) {
    btn.addEventListener('click', function () {
      upiApps.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var appType = btn.getAttribute('data-app');

      if (appType === 'gpay') selectedApp = 'Google Pay';
      else if (appType === 'phonepe') selectedApp = 'PhonePe';
      else if (appType === 'paytm') selectedApp = 'Paytm';
      else selectedApp = 'UPI';

      if (customUpiField) {
        customUpiField.style.display = (appType === 'other') ? 'flex' : 'none';
        if (appType === 'other') {
          var inp = document.getElementById('rx-cibil-vpa');
          if (inp) inp.focus();
        }
      }
      updateModalPayBtn();
    });
  });

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
      function (v) { return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()); },
      'Enter a valid PAN (e.g. ABCDE1234F)') && ok;

    ok = validateField('rx-cibil-phone', 'rx-cibil-phone-err',
      function (v) { return /^[6-9][0-9]{9}$/.test(v); },
      'Enter a valid 10-digit phone number') && ok;

    if (!ok) return;

    var nameVal = (document.getElementById('rx-cibil-name').value || '').trim();
    var phoneVal = (document.getElementById('rx-cibil-phone').value || '').trim();
    currentName = nameVal;
    currentPhone = phoneVal;

    // Populate Payment step
    if (payBureauPill) payBureauPill.textContent = BUREAU_LABELS[currentBureau];
    if (payName) payName.textContent = currentName;
    if (payPhone) payPhone.textContent = '+91 ' + currentPhone;
    if (payTotal) payTotal.textContent = currentPrice;
    updateModalPayBtn();

    showStep(stepPay);
  });

  /* ---- pay button click ---- */
  if (payBtn) {
    payBtn.addEventListener('click', function () {
      payBtn.disabled = true;
      if (payBtnText) payBtnText.textContent = 'Connecting to ' + (selectedApp || 'UPI') + '...';

      setTimeout(function () {
        payBtn.disabled = false;
        updateModalPayBtn();

        if (modalResName) modalResName.textContent = currentName;
        if (modalResAmount) modalResAmount.textContent = '₹' + currentPrice + ' via ' + (selectedApp || 'UPI');
        if (modalRef) {
          modalRef.textContent = 'RAV-CIBIL-' + Math.floor(10000 + Math.random() * 90000);
        }

        showStep(step3);
      }, 700);
    });
  }
})();
