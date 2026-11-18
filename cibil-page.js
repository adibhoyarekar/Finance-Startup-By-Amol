/* CIBIL Score Dedicated Page Script – CredMates */
(function () {
  'use strict';

  var step1 = document.getElementById('rx-cp-step-1');
  var step2 = document.getElementById('rx-cp-step-2');

  var ind1 = document.getElementById('rx-cp-ind-1');
  var ind2 = document.getElementById('rx-cp-ind-2');
  var ind3 = document.getElementById('rx-cp-ind-3');
  var ind4 = document.getElementById('rx-cp-ind-4');
  var line1 = document.getElementById('rx-cp-line-1');
  var line2 = document.getElementById('rx-cp-line-2');
  var line3 = document.getElementById('rx-cp-line-3');
  var stepsBar = document.getElementById('rx-cp-steps');

  var bureauCards = document.querySelectorAll('.rx-cp-bureau-card');
  var bureauInput = document.getElementById('rx-cp-bureau-input');
  var selectedBureauName = document.getElementById('rx-cp-selected-name');
  var formHeading = document.getElementById('rx-cp-form-heading');

  var backBtn = document.getElementById('rx-cp-back-btn');
  var changeLink = document.getElementById('rx-cp-change-link');

  var form = document.getElementById('rx-cp-form');
  var submitBtn = document.getElementById('rx-cp-submit');
  var submitText = document.getElementById('rx-cp-submit-text');
  var guardEl = step2 ? step2.querySelector('[data-cm-guard]') : null;
  var testBadge = step2 ? step2.querySelector('[data-cm-test]') : null;

  var nameInp = document.getElementById('rx-cp-name');
  var panInp = document.getElementById('rx-cp-pan');
  var phoneInp = document.getElementById('rx-cp-phone');
  var consentInp = document.getElementById('rx-cp-consent');

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

  var DRAFT_KEY = 'cm_cibil_draft';
  var RESUME_WINDOW_MS = 35 * 60 * 1000;
  var currentBureau = 'both';
  var currentPrice = 250;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Screen = window.CMScreen;
  var Pay = window.CMPay;

  function updateSubmit() {
    if (submitText) submitText.textContent = 'Pay ₹' + currentPrice + ' securely →';
  }

  function setBureau(bureau) {
    currentBureau = BUREAU_PRICES[bureau] ? bureau : 'both';
    currentPrice = BUREAU_PRICES[currentBureau];
    if (bureauInput) bureauInput.value = currentBureau;
    var label = BUREAU_MAP[currentBureau];
    if (selectedBureauName) selectedBureauName.textContent = label + ' (₹' + currentPrice + ')';
    if (formHeading) formHeading.textContent = 'Enter Details for ' + label;
    updateSubmit();
  }

  /* Keep the step bar in view without jumping the page when it is already visible */
  function bringIntoView() {
    if (!stepsBar) return;
    var header = document.querySelector('.rx-header');
    var offset = (header && getComputedStyle(header).position === 'sticky' ? header.offsetHeight : 0) + 12;
    var top = stepsBar.getBoundingClientRect().top;
    if (top < offset || top > window.innerHeight * 0.45) {
      window.scrollTo({ top: Math.max(0, window.pageYOffset + top - offset), behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /* Step switcher */
  function goToStep(num, skipHash) {
    var show = num === 2 ? step2 : step1;
    var hide = num === 2 ? step1 : step2;
    if (hide) hide.style.display = 'none';
    if (show) {
      show.style.display = '';
      show.classList.remove('is-enter');
      void show.offsetWidth;
      show.classList.add('is-enter');
    }

    [ind1, ind2, ind3, ind4].forEach(function (el) { if (el) el.className = 'rx-cp-step-item'; });
    [line1, line2, line3].forEach(function (el) { if (el) el.className = 'rx-cp-step-line'; });
    if (num === 2) {
      if (ind1) ind1.classList.add('is-done');
      if (line1) line1.classList.add('is-done');
      if (ind2) ind2.classList.add('is-active');
      if (!skipHash) history.pushState(null, '', '#step2');
      if (nameInp && !nameInp.value) setTimeout(function () { nameInp.focus({ preventScroll: true }); }, 380);
    } else {
      if (ind1) ind1.classList.add('is-active');
      if (!skipHash) history.replaceState(null, '', location.pathname);
    }
    bringIntoView();
  }

  window.addEventListener('popstate', function () {
    if (Screen && Screen.isOpen()) return;
    goToStep(location.hash === '#step2' ? 2 : 1, true);
  });

  if (panInp) {
    panInp.addEventListener('input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }
  if (phoneInp) {
    phoneInp.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  }

  /* Select bureau */
  bureauCards.forEach(function (card) {
    card.addEventListener('click', function () {
      setBureau(card.getAttribute('data-bureau') || 'both');
      clearErrors();
      card.classList.add('is-picked');
      setTimeout(function () { card.classList.remove('is-picked'); goToStep(2); }, reduce ? 0 : 140);
    });
  });

  if (backBtn) backBtn.addEventListener('click', function () { goToStep(1); });
  if (changeLink) changeLink.addEventListener('click', function () { goToStep(1); });

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

  function saveDraft(d) {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ bureau: d.bureau, name: d.name, phone: d.phone })); } catch (e) { /* storage blocked */ }
  }
  function restoreDraft() {
    var d = null;
    try { d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { d = null; }
    if (!d) return false;
    setBureau(d.bureau);
    if (nameInp && d.name) nameInp.value = d.name;
    if (phoneInp && d.phone) phoneInp.value = d.phone;
    return true;
  }

  function setBusy(busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    if (busy && submitText) submitText.textContent = 'Opening secure payment…';
    if (!busy) updateSubmit();
  }

  /* ---------- Full-screen pages ---------- */
  var esc = Screen ? Screen.esc : function (s) { return String(s); };

  function startOver(toForm) {
    if (Pay) Pay.clear();
    Screen.hide();
    setBusy(false);
    if (toForm && restoreDraft()) goToStep(2); else goToStep(1);
  }

  function showLoading(title, text) {
    Screen.show({ kind: 'loading', title: title, text: text, dots: true, noFocus: true });
  }

  function showError(err, retry) {
    Screen.show({
      kind: 'error',
      title: err && err.code === 'network' ? 'You seem to be offline' : 'We couldn’t open the payment',
      text: (err && err.message) || 'Something went wrong. Please try again.',
      actions: [
        { label: 'Try again', primary: true, onClick: retry },
        { label: 'Edit my details', onClick: function () { Screen.hide(); setBusy(false); goToStep(2); } }
      ],
      note: 'You have not been charged.'
    });
  }

  function rows(list) {
    return '<div class="cms-rows">' + list.map(function (r) {
      return '<div class="cms-row"><span>' + esc(r[0]) + '</span><b' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' + esc(r[1]) + '</b></div>';
    }).join('') + '</div>';
  }

  var REPORT_ACTIONS = '<div class="cmr-actions"><div class="cmr-act-row"><button type="button" class="cmr-btn is-primary" data-cmr="view" aria-expanded="false"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><span data-cmr-label>View report</span></button><button type="button" class="cmr-btn" data-cmr="download"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg><span>Download PDF</span></button></div>' +
    '<div class="cmr-share"><span>Share</span><a class="cmr-link is-wa" data-cmr="wa" href="#" target="_blank" rel="noopener"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>WhatsApp</a><a class="cmr-link is-mail" data-cmr="mail" href="#"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>Email</a></div><div class="cmr-panel" data-cmr="panel" hidden></div></div>';

  function showSuccess(v) {
    var paidAt = new Date(v.payment.paidAt);
    var when = window.CMReport ? CMReport.fmtDateTime(paidAt) : paidAt.toLocaleString('en-IN');
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    Screen.show({
      kind: 'success',
      title: 'Payment successful',
      text: 'Thank you, ' + v.customer.name + '. Your credit report is ready.',
      html: rows([
        ['Payment status', '✓ Paid', 'is-ok'],
        ['Payment ID', v.payment.id],
        ['Order ID', v.orderId],
        ['Paid on', when],
        ['Report', v.bureauLabel],
        ['Amount paid', '₹' + v.amount + ' via ' + v.payment.method],
        ['Mobile', '+91 ' + v.customer.phone.slice(0, 2) + '•••• ••' + v.customer.phone.slice(8)]
      ]) + REPORT_ACTIONS,
      actions: [
        { label: 'Check another score', onClick: function () { form.reset(); clearErrors(); startOver(false); } },
        { label: 'Back to home', href: 'index.html' }
      ],
      noFocus: true,
      onRender: function (card) {
        if (!window.CMReport) return;
        CMReport.mount(card, CMReport.build({
          bureau: v.bureau, name: v.customer.name, pan: v.customer.pan, phone: v.customer.phone,
          refId: v.payment.id, amount: v.amount, method: v.payment.method, paidAt: paidAt
        }));
      }
    });
  }

  function retryPayment(id) {
    showLoading('Opening secure payment', 'Taking you back to Cashfree to finish paying ₹' + currentPrice + '.');
    Pay.retry(id).catch(function (e) {
      Screen.show({
        kind: 'warning', title: 'Let’s start a fresh payment', text: e.message,
        actions: [{ label: 'Start again', primary: true, onClick: function () { Pay.forget(id); startOver(true); } }]
      });
    });
  }

  function contactAction() { return { label: 'Contact us', href: 'contact.html' }; }

  function onView(v) {
    var id = v.orderId;
    currentPrice = v.amount;
    switch (v.state) {
      case 'READY':
        return showSuccess(v);
      case 'PENDING':
      case 'PROCESSING':
        return Screen.show({
          kind: 'pending',
          title: v.state === 'PROCESSING' ? 'Preparing your report' : 'Confirming your payment',
          text: v.state === 'PROCESSING'
            ? 'Payment received (ID ' + (v.payment ? v.payment.id : '') + '). Your report is being prepared – this can take a minute.'
            : 'Your bank is still confirming the payment. Please don’t pay again – this page updates when it’s done.',
          actions: [{ label: 'Check again', primary: true, onClick: function () { checkOrder(id, 30000); } }, { label: 'Back to home', href: 'index.html' }],
          note: 'Order ID ' + id
        });
      case 'AWAITING_PAYMENT':
        if (v.attempt === 'FAILED') {
          return Screen.show({
            kind: 'error', title: 'Payment failed',
            text: 'Your payment didn’t go through. If money was debited, your bank returns it automatically within 5–7 working days.',
            actions: [{ label: 'Try again', primary: true, onClick: function () { retryPayment(id); } }, { label: 'Change details', onClick: function () { Pay.forget(id); startOver(true); } }],
            note: 'Order ID ' + id
          });
        }
        return Screen.show({
          kind: 'warning', title: 'Payment not completed',
          text: 'You left the payment page before paying. You have not been charged.',
          actions: [{ label: 'Complete payment', primary: true, onClick: function () { retryPayment(id); } }, { label: 'Change details', onClick: function () { Pay.forget(id); startOver(true); } }],
          note: 'Order ID ' + id
        });
      case 'EXPIRED':
        return Screen.show({
          kind: 'warning', title: 'Payment session expired',
          text: 'This payment link has timed out. You have not been charged. Start again to get your report.',
          actions: [{ label: 'Start again', primary: true, onClick: function () { Pay.forget(id); startOver(true); } }, { label: 'Back to home', href: 'index.html' }]
        });
      case 'REFUND_PENDING':
      case 'REFUNDED':
        return Screen.show({
          kind: 'refund',
          title: v.state === 'REFUNDED' ? 'Refund completed' : 'Refund on its way',
          text: v.state === 'REFUNDED'
            ? 'Your payment of ₹' + v.amount + ' has been refunded to your account.'
            : 'We couldn’t generate your report, so we’ve started a full refund of ₹' + v.amount + '. It reaches your account in 5–7 working days.',
          actions: [{ label: 'Back to home', primary: true, href: 'index.html' }, contactAction()],
          note: 'Order ID ' + id
        });
      default:
        return Screen.show({
          kind: 'warning', title: 'We’re verifying your payment',
          text: 'Something about this payment needs a quick manual check. Please contact us with your Order ID and we’ll sort it out.',
          actions: [contactAction(), { label: 'Back to home', href: 'index.html' }],
          note: 'Order ID ' + id
        });
    }
  }

  function checkOrder(id, maxMs) {
    showLoading('Confirming your payment', 'Please wait while we confirm your payment with Cashfree.');
    Pay.resume(id, { maxMs: maxMs || 90000, unpaidWaitMs: 6000 }).then(onView, function (e) {
      if (e && e.code === 'not_found') {
        Pay.forget(id);
        return Screen.show({
          kind: 'warning', title: 'We couldn’t find this payment',
          text: 'Open this page on the same phone or browser you paid from, or contact us with your payment details.',
          actions: [{ label: 'Start a new check', primary: true, onClick: function () { startOver(false); } }, contactAction()]
        });
      }
      Screen.show({
        kind: 'error', title: 'Couldn’t check your payment', text: (e && e.message) || 'Please try again in a moment.',
        actions: [{ label: 'Try again', primary: true, onClick: function () { checkOrder(id, maxMs); } }, { label: 'Back to home', href: 'index.html' }],
        note: 'Order ID ' + id
      });
    });
  }

  /* ---------- Details form: validate, then go straight to Cashfree ---------- */
  function startPayment(details) {
    if (!Pay || !Screen) return;
    setBusy(true);
    showLoading('Opening secure payment', 'Taking you to Cashfree Payments to pay ₹' + currentPrice + '. Please don’t close this page.');
    Pay.pay(details, { guardEl: guardEl }).catch(function (e) {
      setBusy(false);
      if (e && e.fields) {
        Screen.hide();
        var map = { name: ['field-cp-name', 'rx-cp-err-name'], pan: ['field-cp-pan', 'rx-cp-err-pan'], phone: ['field-cp-phone', 'rx-cp-err-phone'] };
        Object.keys(e.fields).forEach(function (k) { if (map[k]) setError(map[k][0], map[k][1], e.fields[k]); });
        return;
      }
      if (e && (e.code === 'security_check' || e.code === 'security_check_failed')) {
        Screen.hide();
        var errConsent = document.getElementById('rx-cp-err-consent');
        if (errConsent) errConsent.textContent = e.message;
        return;
      }
      showError(e, function () { startPayment(details); });
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var valid = true;
    var nameVal = (nameInp.value || '').replace(/\s+/g, ' ').trim();
    var panVal = (panInp.value || '').trim().toUpperCase();
    var phoneVal = (phoneInp.value || '').trim();

    if (!nameVal || nameVal.length < 3) {
      setError('field-cp-name', 'rx-cp-err-name', 'Please enter your full name as per PAN card (minimum 3 characters)');
      valid = false;
    }
    if (!/^[A-Z]{3}P[A-Z][0-9]{4}[A-Z]$/.test(panVal)) {
      setError('field-cp-pan', 'rx-cp-err-pan', 'Please enter a valid individual PAN (e.g. ABCPE1234F)');
      valid = false;
    }
    if (!/^[6-9][0-9]{9}$/.test(phoneVal)) {
      setError('field-cp-phone', 'rx-cp-err-phone', 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
      valid = false;
    }
    if (consentInp && !consentInp.checked) {
      var errConsent = document.getElementById('rx-cp-err-consent');
      if (errConsent) errConsent.textContent = 'Please accept the authorization to fetch your credit report';
      valid = false;
    }
    if (!valid) {
      var firstBad = form.querySelector('.has-error input');
      if (firstBad) firstBad.focus();
      return;
    }

    var details = { bureau: currentBureau, name: nameVal, phone: phoneVal, pan: panVal, consent: true };
    saveDraft(details);
    startPayment(details);
  });

  if (Pay) {
    Pay.config().then(function (c) { if (testBadge) testBadge.hidden = c.mode !== 'sandbox' || !c.enabled; }, function () {});
    Pay.mountGuard(guardEl);
  }
  if (Screen) Screen.preload();

  /* ---------- Coming back from Cashfree ---------- */
  // A plain visit never opens a status screen by itself. An earlier order is checked quietly and
  // only surfaced if money is involved (paid, being confirmed or refunded); unpaid ones are dropped.
  function quietCheck(id) {
    Pay.status(id).then(function (v) {
      if (v.state === 'AWAITING_PAYMENT' || v.state === 'EXPIRED') { Pay.forget(id); return; }
      if (!Screen.isOpen()) onView(v);
    }, function (e) {
      if (e && e.code === 'not_found') Pay.forget(id);
    });
  }

  function boot() {
    if (!Pay || !Screen) return false;
    var params = new URLSearchParams(location.search);
    var q = params.get('order_id');
    if (params.has('order_id')) history.replaceState(null, '', location.pathname);
    if (q && Pay.hasToken(q)) {
      restoreDraft();
      checkOrder(q);
      return true;
    }
    var open = Pay.lastOpen(RESUME_WINDOW_MS);
    if (open) quietCheck(open);
    return false;
  }

  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    setBusy(false);
    if (Screen) Screen.hide();
    boot();
  });

  if (!boot()) {
    if (location.hash === '#step2' && restoreDraft()) goToStep(2, true);
    else goToStep(1, true);
  }
})();
