/* Loan application tracker links – FinMatrix.
   An agent shares a link (track.html#t=…) that carries the client's current stage. Everything
   stays in the link and this browser; nothing is sent to a server. */
(function () {
  'use strict';

  var KEY = 'cm_trackers';
  var STAGES = ['new', 'docs', 'submitted', 'sanctioned', 'disbursed'];
  var STAGE = {
    new: { label: 'Request received', short: 'Received', text: 'We have your request. Your advisor will call you to understand what you need and tell you which documents to keep ready.' },
    docs: { label: 'Collecting documents', short: 'Documents', text: 'Please share the documents your advisor asked for. The sooner your file is complete, the faster it goes to the bank.' },
    submitted: { label: 'Submitted to the bank', short: 'With bank', text: 'Your application is with the bank for review. This usually takes 3–7 working days, and the bank may call you to verify details.' },
    sanctioned: { label: 'Loan sanctioned', short: 'Sanctioned', text: 'Good news – the bank has approved your loan. Sign the sanction letter and finish any remaining formalities so the money can be released.' },
    disbursed: { label: 'Loan disbursed', short: 'Disbursed', text: 'The loan amount has been released. Your first EMI date and loan account details are in your sanction letter.' },
    closed: { label: 'Application closed', short: 'Closed', text: 'This application was not approved or has been closed. Talk to your advisor about other options that may suit you.' }
  };
  var PRODUCT = { home: 'Home Loan', business: 'Business Loan', personal: 'Personal Loan', gold: 'Gold Loan', account: 'Bank Account', vehicle: 'Car Loan', realestate: 'Real Estate', mf: 'Mutual Fund & SIP', other: 'Loan / Service' };

  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64decode(str) {
    str = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return decodeURIComponent(escape(atob(str)));
  }
  function clip(v, n) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, n) : ''; }

  /* client: an agent client file; agent: the logged-in agent account */
  function encode(client, agent) {
    var p = (agent && agent.profile) || {};
    var data = {
      v: 1,
      id: String(client.id || ''),
      n: client.name || '',
      p: PRODUCT[client.product] ? client.product : 'other',
      a: Math.round(+client.amount || 0),
      s: STAGE[client.status] ? client.status : 'new',
      u: client.updatedAt || new Date().toISOString(),
      ag: p.fullName || (agent && agent.username) || '',
      am: String(p.mobile || '').replace(/\D/g, '').slice(-10)
    };
    return b64encode(JSON.stringify(data));
  }

  // Only well-formed, known values survive, so a hand-edited link can't inject anything odd.
  function decode(token) {
    var d;
    try { d = JSON.parse(b64decode(token)); } catch (e) { return null; }
    if (!d || d.v !== 1 || !STAGE[d.s]) return null;
    var updated = Date.parse(d.u);
    return {
      id: clip(d.id, 40) || 'link',
      name: clip(d.n, 80),
      product: PRODUCT[d.p] ? d.p : 'other',
      productLabel: PRODUCT[d.p] || PRODUCT.other,
      amount: isFinite(d.a) && d.a > 0 ? Math.min(Math.round(d.a), 1e11) : 0,
      stage: d.s,
      updatedAt: isNaN(updated) ? null : new Date(updated).toISOString(),
      agent: clip(d.ag, 60),
      agentMobile: /^[6-9]\d{9}$/.test(String(d.am || '')) ? String(d.am) : '',
      token: token
    };
  }

  function fromLocation() {
    var m = /[#&]t=([A-Za-z0-9_-]+)/.exec(location.hash);
    return m ? decode(m[1]) : null;
  }

  function link(token) {
    return location.origin + location.pathname.replace(/[^/]*$/, '') + 'track.html#t=' + token;
  }

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function write(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; } }

  // keep the newest version of each application (a fresh link from the agent replaces an older one)
  function save(t) {
    var all = read(), old = all[t.id] && decode(all[t.id].token);
    if (old && old.updatedAt && t.updatedAt && Date.parse(old.updatedAt) > Date.parse(t.updatedAt)) return false;
    all[t.id] = { token: t.token, savedAt: Date.now() };
    return write(all);
  }
  function list() {
    var all = read();
    return Object.keys(all).map(function (id) {
      var t = decode(all[id].token);
      if (t) t.savedAt = all[id].savedAt;
      return t;
    }).filter(Boolean).sort(function (a, b) { return Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0); });
  }
  function remove(id) { var all = read(); delete all[id]; write(all); }

  window.CMTrack = { STAGES: STAGES, STAGE: STAGE, PRODUCT: PRODUCT, encode: encode, decode: decode, fromLocation: fromLocation, link: link, save: save, list: list, remove: remove };
})();
