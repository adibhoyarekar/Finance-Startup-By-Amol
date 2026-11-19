/* CIBIL checkout via Cashfree's hosted payment page – CredMates. The browser never decides that a payment succeeded; the server confirms it with Cashfree. */
(function () {
  'use strict';

  var SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
  var TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var STORE_KEY = 'cm_pay_orders';
  var KEEP_MS = 30 * 24 * 60 * 60 * 1000;
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
  function remember(id, token, session, mode, meta) {
    var all = readSaved();
    all[id] = Object.assign({ token: token, session: session, mode: mode, at: Date.now() }, meta || {});
    writeSaved(all);
  }
  /* Orders saved on this device, newest first: [{ id, at, done, owner, client, bureau, amount }] (never the token) */
  function list() {
    var all = readSaved();
    return Object.keys(all).map(function (id) {
      var e = all[id];
      return { id: id, at: e.at, done: !!e.done, owner: e.owner || null, client: e.client || null, bureau: e.bureau || null, amount: e.amount || null };
    }).sort(function (a, b) { return b.at - a.at; });
  }
  function claim(id, owner) { var all = readSaved(); if (all[id] && !all[id].owner) { all[id].owner = owner; writeSaved(all); } }
  function settle(id) { var all = readSaved(); if (all[id]) { all[id].done = true; writeSaved(all); } }
  function tokenFor(id) { var e = readSaved()[id]; return e ? e.token : null; }
  function lastOpen(maxAgeMs) {
    var all = readSaved(), best = null, now = Date.now();
    Object.keys(all).forEach(function (id) {
      var e = all[id];
      if (e.done || (maxAgeMs && now - e.at > maxAgeMs)) return;
      if (!best || e.at > all[best].at) best = id;
    });
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
            if (unpaid && (v.attempt || Date.now() - started > (opts.unpaidWaitMs || 20000))) return resolve(v);
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

  function openCheckout(session, mode) {
    return loadScript(SDK_URL).then(function () {
      if (typeof window.Cashfree !== 'function') throw fail('sdk', 'Could not load the secure payment page. Please try again.');
      var cashfree = window.Cashfree({ mode: mode === 'production' ? 'production' : 'sandbox' });
      return cashfree.checkout({ paymentSessionId: session, redirectTarget: '_self' });
    }).then(function (res) {
      if (res && res.error) throw fail('checkout', res.error.message || 'Could not open the payment page. Please try again.');
      return { redirecting: true };
    });
  }

  /* details: { bureau, name, phone, pan, consent }; ui: { guardEl, beforeRedirect(order) }
     Creates the order on the server, then sends the browser to Cashfree's payment page.
     Cashfree brings the customer back to cibil-score.html?order_id=… when they finish. */
  function pay(details, ui) {
    ui = ui || {};
    return config().then(function (c) {
      if (!c.enabled) throw fail('payments_unavailable', 'Online payment is not available right now. Please try again later or call us.');
      var token = null;
      if (c.turnstileSiteKey) {
        token = ui.guardEl && ui.guardEl._cmToken;
        if (!token) throw fail('security_check', 'Please complete the security check, then tap Pay.');
      }
      var body = { bureau: details.bureau, name: details.name, phone: details.phone, pan: details.pan, consent: details.consent === true, turnstileToken: token };
      return api('/api/cibil/order', body).then(function (o) {
        resetGuard(ui.guardEl);
        remember(o.orderId, o.accessToken, o.paymentSessionId, o.mode, { owner: details.owner || null, client: details.client || null, bureau: details.bureau, amount: o.amount });
        inflight = o.orderId;
        if (ui.beforeRedirect) ui.beforeRedirect(o);
        return openCheckout(o.paymentSessionId, o.mode);
      }, function (e) {
        resetGuard(ui.guardEl);
        throw e;
      });
    });
  }

  /* Reopen Cashfree's page for an order that was not paid yet (same order, no double charge). */
  function retry(id) {
    var e = readSaved()[id];
    if (!e || !e.session) return Promise.reject(fail('not_found', 'This payment can no longer be retried. Please start again.'));
    inflight = id;
    return openCheckout(e.session, e.mode);
  }

  function resume(id, opts) {
    inflight = id;
    return poll(id, opts);
  }

  function clear() { inflight = null; }
  function forget(id) { settle(id); if (inflight === id) inflight = null; }

  window.CMPay = { pay: pay, retry: retry, resume: resume, status: status, poll: poll, config: config, mountGuard: mountGuard, lastOpen: lastOpen, clear: clear, forget: forget, list: list, claim: claim, hasToken: function (id) { return !!tokenFor(id); } };
})();
