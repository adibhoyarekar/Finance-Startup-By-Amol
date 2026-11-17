/* CIBIL Score Dedicated Page Script – RAVEN */
(function () {
  'use strict';

  var step1 = document.getElementById('rx-cp-step-1');
  var step2 = document.getElementById('rx-cp-step-2');
  var step3 = document.getElementById('rx-cp-step-3');

  var ind1 = document.getElementById('rx-cp-ind-1');
  var ind2 = document.getElementById('rx-cp-ind-2');
  var ind3 = document.getElementById('rx-cp-ind-3');
  var line1 = document.getElementById('rx-cp-line-1');
  var line2 = document.getElementById('rx-cp-line-2');

  var bureauCards = document.querySelectorAll('.rx-cp-bureau-card');
  var bureauInput = document.getElementById('rx-cp-bureau-input');
  var selectedBureauName = document.getElementById('rx-cp-selected-name');
  var formHeading = document.getElementById('rx-cp-form-heading');

  var backBtn = document.getElementById('rx-cp-back-btn');
  var changeLink = document.getElementById('rx-cp-change-link');
  var form = document.getElementById('rx-cp-form');
  var againBtn = document.getElementById('rx-cp-btn-again');

  var nameInp = document.getElementById('rx-cp-name');
  var panInp = document.getElementById('rx-cp-pan');
  var phoneInp = document.getElementById('rx-cp-phone');
  var consentInp = document.getElementById('rx-cp-consent');

  var resName = document.getElementById('rx-cp-res-name');
  var resBureau = document.getElementById('rx-cp-res-bureau');
  var resPhone = document.getElementById('rx-cp-res-phone');
  var refId = document.getElementById('rx-cp-ref-id');

  if (!step1 || !form) return;

  var BUREAU_MAP = {
    crif: 'CRIF CIBIL',
    transunion: 'TransUnion CIBIL',
    both: 'Both Reports (CRIF + TransUnion)'
  };

  /* Step switcher */
  function goToStep(num, skipHash) {
    step1.style.display = 'none';
    step2.style.display = 'none';
    step3.style.display = 'none';

    ind1.className = 'rx-cp-step-item';
    ind2.className = 'rx-cp-step-item';
    ind3.className = 'rx-cp-step-item';
    line1.className = 'rx-cp-step-line';
    line2.className = 'rx-cp-step-line';

    if (num === 1) {
      step1.style.display = '';
      ind1.classList.add('is-active');
      if (!skipHash) history.replaceState(null, '', '#step1');
    } else if (num === 2) {
      step2.style.display = '';
      ind1.classList.add('is-done');
      line1.classList.add('is-done');
      ind2.classList.add('is-active');
      if (!skipHash) history.pushState(null, '', '#step2');
      if (nameInp) setTimeout(function () { nameInp.focus(); }, 150);
    } else if (num === 3) {
      step3.style.display = '';
      ind1.classList.add('is-done');
      line1.classList.add('is-done');
      ind2.classList.add('is-done');
      line2.classList.add('is-done');
      ind3.classList.add('is-active');
      if (!skipHash) history.pushState(null, '', '#step3');
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
    } else {
      goToStep(1, true);
    }
  });

  /* Auto-uppercase PAN input as user types */
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
      bureauInput.value = bureau;
      var label = BUREAU_MAP[bureau] || BUREAU_MAP.both;
      selectedBureauName.textContent = label;
      formHeading.textContent = 'Enter Details for ' + label;
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

  /* Form validation and submission */
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
    var panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panVal || !panRegex.test(panVal)) {
      setError('field-cp-pan', 'rx-cp-err-pan', 'Please enter a valid 10-digit PAN card number (e.g. ABCDE1234F)');
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

    // Populate success screen
    if (resName) resName.textContent = nameVal;
    if (resBureau) resBureau.textContent = BUREAU_MAP[bureauInput.value] || BUREAU_MAP.both;
    if (resPhone) {
      resPhone.textContent = '+91 ' + phoneVal.substring(0, 2) + '•••• ••' + phoneVal.substring(8);
    }
    if (refId) {
      var randomRef = Math.floor(10000 + Math.random() * 90000);
      refId.textContent = 'RAV-CIBIL-' + randomRef;
    }

    goToStep(3);
  });

  /* Check another score */
  if (againBtn) {
    againBtn.addEventListener('click', function () {
      form.reset();
      clearErrors();
      goToStep(1);
    });
  }

  // Initial step setup based on hash or default
  if (location.hash === '#step2') {
    goToStep(2, true);
  } else if (location.hash === '#step3') {
    goToStep(3, true);
  } else {
    goToStep(1, true);
  }
})();
