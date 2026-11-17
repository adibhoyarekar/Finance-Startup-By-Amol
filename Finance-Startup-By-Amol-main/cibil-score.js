/* CIBIL Score Modal – RAVEN */
(function () {
  'use strict';

  const modal    = document.getElementById('rx-cibil-modal');
  const openBtn  = document.getElementById('rx-cibil-btn');
  const step1    = document.getElementById('rx-cibil-step1');
  const step2    = document.getElementById('rx-cibil-step2');
  const step3    = document.getElementById('rx-cibil-step3');
  const backBtn  = document.getElementById('rx-cibil-back');
  const form     = document.getElementById('rx-cibil-form');
  const bureauTag = document.getElementById('rx-cibil-bureau-tag');
  const bureauVal = document.getElementById('rx-cibil-bureau-val');
  const formTitle = document.getElementById('rx-cibil-form-title');

  if (!modal || !openBtn) return;

  const BUREAU_LABELS = {
    crif: 'CRIF CIBIL',
    transunion: 'TransUnion CIBIL',
    both: 'CRIF + TransUnion (Both)'
  };
  const BUREAU_COLORS = {
    crif: '#1d4ed8',
    transunion: '#16a34a',
    both: '#7c3aed'
  };

  /* ---- helpers ---- */
  function showStep(show) {
    [step1, step2, step3].forEach(function (s) { s.style.display = 'none'; });
    show.style.display = '';
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
  openBtn.addEventListener('click', function () {
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
      var bureau = btn.getAttribute('data-bureau');
      bureauVal.value = bureau;
      bureauTag.textContent = BUREAU_LABELS[bureau];
      bureauTag.style.setProperty('--tag-c', BUREAU_COLORS[bureau]);
      formTitle.textContent = 'Enter Your Details — ' + BUREAU_LABELS[bureau];
      clearErrors();
      form.reset();
      bureauVal.value = bureau;          // reset clears hidden too
      showStep(step2);
    });
  });

  /* ---- back ---- */
  backBtn.addEventListener('click', function () {
    showStep(step1);
  });

  /* ---- validation ---- */
  function validateField(id, errId, test, msg) {
    var val = document.getElementById(id).value.trim();
    var errEl = document.getElementById(errId);
    var field = document.getElementById(id).closest('.rx-cibil-field');
    if (!test(val)) {
      errEl.textContent = msg;
      field.classList.add('has-error');
      return false;
    }
    errEl.textContent = '';
    field.classList.remove('has-error');
    return true;
  }

  /* ---- submit ---- */
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

    /* Frontend-only: show success */
    showStep(step3);
  });
})();
