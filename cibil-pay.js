/* CIBIL checkout via Cashfree – CredMates. The browser never decides that a payment succeeded; the server confirms it with Cashfree. */
(function () {
  'use strict';

  var SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
  var TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var STORE_KEY = 'cm_pay_orders';
  var KEEP_MS = 24 * 60 * 60 * 1000;
  var FINAL = { READY: 1, EXPIRED: 1, REFUND_PENDING: 1, REFUNDED: 1, REVIEW: 1 };
  var scripts = {};
  var cfgPromise = null;
  var inflight = null;

  function fail(code, message, extra) {
    var e = new Error(message);
    e.code = code;
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }

  function api(path, body) {
    return fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw fail(j.error || 'http_' + r.status, j.message || 'Something went wrong. Please try again.', { status: r.status, fields: j.fields });
        return j;
      });
    }, function () {
      throw fail('network', 'No internet connection. Check your network and try again.');
    });
  }

  function config() {
    if (!cfgPromise) cfgPromise = api('/api/cibil/config').catch(function (e) { cfgPromise = null; throw e; });
    return cfgPromise;
  }

  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = function () { delete scripts[src]; s.remove(); reject(fail('sdk', 'Could not load the secure payment page. Check your connection and try again.')); };
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }

  function readSaved() {
    var all = {};
    try { all = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { all = {}; }
    var now = Date.now(), changed = false;
    Object.keys(all).forEach(function (id) { if (!all[id] || now - all[id].at > KEEP_MS) { delete all[id]; changed = true; } });
    if (changed) writeSaved(all);
    return all;
  }
  function writeSaved(all) { try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) { /* storage full or blocked */ } }
  function remember(id, token) { var all = readSaved(); all[id] = { token: token, at: Date.now() }; writeSaved(all); }
  function settle(id) { var all = readSaved(); if (all[id]) { all[id].done = true; writeSaved(all); } }
  function tokenFor(id) { var e = readSaved()[id]; return e ? e.token : null; }
  function lastOpen() {
    var all = readSaved(), best = null;
    Object.keys(all).forEach(function (id) { if (!all[id].done && (!best || all[id].at > all[best].at)) best = id; });
    return best;
  }

  /* Cloudflare Turnstile bot check (only when a site key is configured on the server) */
  function mountGuard(el) {
    if (!el) return;
    config().then(function (c) {
      if (!c.turnstileSiteKey || el.getAttribute('data-wid')) return;
      return loadScript(TURNSTILE_URL).then(function () {
        if (el.getAttribute('data-wid') || !window.turnstile) return;
        el.hidden = false;
        var wid = window.turnstile.render(el, {
          sitekey: c.turnstileSiteKey,
          action: 'cibil_order',
          callback: function (t) { el._cmToken = t; },
          'expired-callback': function () { el._cmToken = null; },
          'error-callback': function () { el._cmToken = null; }
        });
        el.setAttribute('data-wid', wid);
      });
    }).catch(function () { /* surfaced again when the user taps Pay */ });
  }
  function resetGuard(el) {
    if (el && el.getAttribute('data-wid') && window.turnstile) { window.turnstile.reset(el.getAttribute('data-wid')); el._cmToken = null; }
  }

  function status(id) {
    var token = tokenFor(id);
    if (!token) return Promise.reject(fail('not_found', 'We could not find this payment on this device.'));
    return api('/api/cibil/status', { orderId: id, token: token }).then(function (v) {
      if (FINAL[v.state]) settle(id);
      return v;
    });
  }

  function poll(id, opts) {
    opts = opts || {};
    var started = Date.now(), maxMs = opts.maxMs || 120000;
    return new Promise(function (resolve, reject) {
      function tick(delay) {
        setTimeout(function () {
          status(id).then(function (v) {
            if (opts.onUpdate) opts.onUpdate(v);
            var unpaid = v.state === 'AWAITING_PAYMENT';
            if (FINAL[v.state] || (unpaid && opts.stopIfUnpaid) || Date.now() - started > maxMs) return resolve(v);
            if (unpaid && Date.now() - started > 20000) return resolve(v);
            tick(v.state === 'PROCESSING' ? 2000 : 3000);
          }, function (e) {
            var retryable = e.code === 'network' || e.status === 429 || (e.status >= 500);
            if (retryable && Date.now() - started < maxMs) return tick(5000);
            reject(e);
          });
        }, delay);
      }
      tick(opts.firstDelay || 0);
    });
  }

  function guardInflight() {
    if (!inflight) return Promise.resolve(null);
    return status(inflight).then(function (v) {
      if (v.state === 'PENDING' || v.state === 'PROCESSING') return v;
      inflight = null;
      return null;
    }, function () { return null; });
  }

  /* details: { bureau, name, phone, pan, consent }
     ui: { guardEl, beforeCheckout(), afterCheckout(), onUpdate(view) } */
  function pay(details, ui) {
    ui = ui || {};
    return config().then(function (c) {
      if (!c.enabled) throw fail('payments_unavailable', 'Online payment is not available right now. Please try again later or call us.');
      return guardInflight().then(function (existing) {
        if (existing) return existing;
        var token = null;
        if (c.turnstileSiteKey) {
          token = ui.guardEl && ui.guardEl._cmToken;
          if (!token) throw fail('security_check', 'Please complete the security check above, then tap Pay.');
        }
        var body = { bureau: details.bureau, name: details.name, phone: details.phone, pan: details.pan, consent: details.consent === true, turnstileToken: token };
        return api('/api/cibil/order', body).then(function (o) {
          resetGuard(ui.guardEl);
          remember(o.orderId, o.accessToken);
          inflight = o.orderId;
          return loadScript(SDK_URL).then(function () {
            if (typeof window.Cashfree !== 'function') throw fail('sdk', 'Could not load the secure payment page. Please try again.');
            var cashfree = window.Cashfree({ mode: o.mode === 'production' ? 'production' : 'sandbox' });
            if (ui.beforeCheckout) ui.beforeCheckout();
            return cashfree.checkout({ paymentSessionId: o.paymentSessionId, redirectTarget: '_modal' });
          }).then(function (res) {
            if (ui.afterCheckout) ui.afterCheckout();
            var closed = !!(res && res.error);
            return poll(o.orderId, { onUpdate: ui.onUpdate, stopIfUnpaid: closed });
          }, function (e) {
            if (ui.afterCheckout) ui.afterCheckout();
            throw e;
          });
        }, function (e) {
          resetGuard(ui.guardEl);
          throw e;
        });
      });
    });
  }

  function resume(id, opts) {
    inflight = id;
    return poll(id, opts);
  }

  function rupees(n) { return '₹' + n; }

  /* Customer-facing message for every state other than READY. tone: info | warn | error */
  function message(v) {
    switch (v.state) {
      case 'PENDING':
        return { tone: 'info', recheck: true, text: 'Your bank is still confirming the payment. Please do not pay again – this page updates automatically.' };
      case 'PROCESSING':
        return { tone: 'info', recheck: true, text: 'Payment received (ID ' + (v.payment ? v.payment.id : '') + '). We are preparing your report – this can take a minute.' };
      case 'AWAITING_PAYMENT':
        if (v.attempt === 'FAILED') return { tone: 'error', text: 'The payment failed. If money was debited, your bank returns it automatically in 5–7 working days. You can try again.' };
        return { tone: 'warn', text: 'Payment was not completed and you have not been charged. Tap Pay to try again.' };
      case 'EXPIRED':
        return { tone: 'warn', text: 'This payment session expired. Tap Pay to start again.' };
      case 'REFUND_PENDING':
        return { tone: 'error', text: 'We could not generate your report, so we have started a full refund of ' + rupees(v.amount) + '. It reaches your account in 5–7 working days. Order ID ' + v.orderId + '.' };
      case 'REFUNDED':
        return { tone: 'error', text: 'Your payment of ' + rupees(v.amount) + ' has been refunded. Order ID ' + v.orderId + '.' };
      case 'REVIEW':
        return { tone: 'error', text: 'We are verifying this payment. Please contact us with Order ID ' + v.orderId + ' and we will sort it out.' };
      default:
        return { tone: 'info', text: '' };
    }
  }

  function clear() { inflight = null; }

  window.CMPay = { pay: pay, resume: resume, status: status, poll: poll, config: config, mountGuard: mountGuard, lastOpen: lastOpen, message: message, clear: clear, hasToken: function (id) { return !!tokenFor(id); } };
})();
