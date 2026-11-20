/* Loan application status page (track.html) – read-only view of a link shared by an agent. */
(function () {
  'use strict';
  var T = window.CMTrack, App = window.RavenApp, root = document.getElementById('tk');
  if (!T || !root) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inr(n) { var s = String(Math.round(n)); if (s.length <= 3) return s; return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3); }
  var ICON = {
    check: '<path d="M20 6L9 17l-5-5"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  function ic(n, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }
  var WA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.4A9.9 9.9 0 1 0 12.04 2zm5.8 14.1c-.25.7-1.45 1.33-2 1.4-.51.08-1.16.11-1.87-.12-.43-.13-.98-.31-1.69-.62-2.98-1.29-4.93-4.29-5.08-4.49-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.6-.37.79-.37h.57c.18.01.43-.07.67.51.25.6.84 2.06.92 2.21.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.1 1.33 2.4 1.48.3.15.47.12.65-.07.17-.2.74-.87.94-1.17.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.08.12.08.72-.17 1.42z"/></svg>';

  function invalid() {
    root.innerHTML = '<div class="tk-empty"><span class="tk-empty-ic">' + ic('link', 26) + '</span><h1>This link isn’t working</h1>' +
      '<p>The status link may be incomplete or copied wrongly. Ask your FinMatrix advisor to send it again, or contact us and we’ll tell you where your application stands.</p>' +
      '<div class="tk-acts"><a class="tk-btn is-primary" href="contact.html">Contact us</a><a class="tk-btn" href="index.html">Go to home page</a></div></div>';
  }

  function render(t) {
    var closed = t.stage === 'closed', idx = closed ? 0 : T.STAGES.indexOf(t.stage), info = T.STAGE[t.stage];
    var first = (t.name || '').split(' ')[0];
    var tone = closed ? 'is-closed' : t.stage === 'disbursed' ? 'is-done' : t.stage === 'sanctioned' ? 'is-good' : 'is-active';
    var steps = T.STAGES.map(function (s, i) {
      var st = closed ? (i === 0 ? 'done' : 'todo') : i < idx || (i === idx && s === 'disbursed') ? 'done' : i === idx ? 'now' : 'todo';
      return '<li class="is-' + st + '" style="--d:' + i + '"><span class="tk-dot">' + (st === 'done' ? ic('check', 14) : '') + '</span><div><b>' + esc(T.STAGE[s].label) + '</b>' +
        (st === 'now' ? '<small>Current stage</small>' : '') + '</div></li>';
    }).join('') + (closed ? '<li class="is-fail" style="--d:5"><span class="tk-dot">' + ic('x', 14) + '</span><div><b>' + esc(info.label) + '</b><small>Current stage</small></div></li>' : '');
    var updated = t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + new Date(t.updatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
    var me = App && App.current();
    var saved = T.save(t);
    var mine = me && me.onboarded && me.role === 'customer';
    root.innerHTML =
      '<p class="tk-eyebrow">' + esc(t.productLabel) + (t.amount ? ' · ₹' + inr(t.amount) : '') + '</p>' +
      '<h1>' + (first ? 'Hi ' + esc(first) + ', here’s your application' : 'Your application status') + '</h1>' +
      '<div class="tk-now ' + tone + '"><span class="tk-now-l">Current stage</span><strong>' + esc(info.label) + '</strong></div>' +
      '<ol class="tk-steps">' + steps + '</ol>' +
      '<div class="tk-info">' + ic('info', 20) + '<div><b>What’s happening</b><p>' + esc(info.text) + '</p></div></div>' +
      (updated ? '<p class="tk-upd">Last updated by your advisor on ' + esc(updated) + '</p>' : '') +
      (t.agent || t.agentMobile ? '<div class="tk-adv"><div><span>Your advisor</span><strong>' + esc(t.agent || 'FinMatrix advisor') + '</strong></div>' +
        (t.agentMobile ? '<div class="tk-adv-acts"><a class="tk-btn is-sm" href="tel:+91' + esc(t.agentMobile) + '">' + ic('phone', 16) + 'Call</a><a class="tk-btn is-sm is-wa" href="https://wa.me/91' + esc(t.agentMobile) + '?text=' + encodeURIComponent('Hi, I’m checking on my ' + t.productLabel + ' application.') + '" target="_blank" rel="noopener">' + WA + 'WhatsApp</a></div>' : '') + '</div>' : '') +
      '<div class="tk-acts">' + (mine ? '<a class="tk-btn is-primary" href="orders.html">See all my orders</a>' : '<a class="tk-btn is-primary" href="contact.html">Ask a question</a>') + '<a class="tk-btn" href="index.html">FinMatrix home</a></div>' +
      '<p class="tk-note">' + (saved ? 'Saved on this device' + (mine ? ' – you’ll also find it in My orders.' : '.') + ' ' : '') + 'This page shows the status your advisor last shared. For a newer update, ask them for a fresh link.</p>';
    document.title = info.label + ' – ' + t.productLabel + ' - FinMatrix';
  }

  function show() { var t = T.fromLocation(); if (t) render(t); else invalid(); }
  window.addEventListener('hashchange', show);
  show();
})();
