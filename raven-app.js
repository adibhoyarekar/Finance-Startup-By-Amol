/* RAVEN accounts (demo version): customers and agents.
   Everything is stored only in this browser (localStorage) - nothing is sent to a server.
   Loaded on every page: keeps the header button in sync with the session, pre-fills the
   search tools and lets logged-in users save search results. */
(function () {
  var USERS = 'raven_users', SESSION = 'raven_session';

  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function hash(salt, pw) {
    var text = salt + ':' + pw;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(hex);
    }
    var h = 5381; // fallback for very old browsers / insecure contexts
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return Promise.resolve('d' + (h >>> 0).toString(16));
  }

  function inr(n) {
    var s = String(Math.round(n || 0));
    if (s.length <= 3) return s;
    var last = s.slice(-3), rest = s.slice(0, -3);
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last;
  }
  function short(n) {
    function t(x) { return x.toFixed(2).replace(/\.?0+$/, ''); }
    if (n >= 10000000) return '₹' + t(n / 10000000) + ' Cr';
    if (n >= 100000) return '₹' + t(n / 100000) + ' L';
    return '₹' + inr(n);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function param(name) { var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search); return m ? decodeURIComponent(m[1]) : ''; }

  var PRODUCTS = {
    home:     { label: 'Home Loan',            page: 'home-loans.html',     section: 'home-loan-search' },
    business: { label: 'Business Loan',        page: 'business-loans.html', section: 'business-loan-search' },
    personal: { label: 'Personal Loan',        page: 'personal-loans.html', section: 'personal-loan-search' },
    gold:     { label: 'Gold Loan',            page: 'gold-loans.html',     section: 'gold-loan-search' },
    account:  { label: 'Bank Account Opening', page: 'bank-account.html',   section: 'bank-account-search' },
    other:    { label: 'Other',                page: 'contact.html',        section: '' }
  };
  var STATUSES = [
    ['new', 'New lead'], ['docs', 'Documents pending'], ['submitted', 'Submitted to bank'],
    ['sanctioned', 'Sanctioned'], ['disbursed', 'Disbursed'], ['closed', 'Rejected / Closed']
  ];
  var DEFAULT_PAYOUT = { home: 0.5, business: 1, personal: 1.5, gold: 0.3, account: 0, other: 0.5 };

  var App = {
    PRODUCTS: PRODUCTS, STATUSES: STATUSES, DEFAULT_PAYOUT: DEFAULT_PAYOUT,
    esc: esc, inr: inr, short: short, uid: uid, param: param,

    users: function () { return read(USERS, []); },
    saveUser: function (u) {
      var list = App.users(), i = list.findIndex(function (x) { return x.id === u.id; });
      if (i === -1) list.push(u); else list[i] = u;
      return write(USERS, list);
    },
    findUser: function (username) {
      var n = String(username).trim().toLowerCase();
      return App.users().find(function (u) { return u.username === n; }) || null;
    },
    current: function () {
      var s = read(SESSION, null);
      if (!s) return null;
      return App.users().find(function (u) { return u.id === s.id; }) || null;
    },
    register: function (role, username, pw) {
      if (App.findUser(username)) return Promise.reject(new Error('That username is already taken on this device. Try another or log in.'));
      var salt = uid();
      return hash(salt, pw).then(function (h) {
        var u = { id: uid(), role: role, username: username.trim().toLowerCase(), salt: salt, hash: h,
          createdAt: new Date().toISOString(), onboarded: false, profile: {} };
        if (!App.saveUser(u)) throw new Error('This browser is blocking storage, so the account could not be saved. Try a normal (not private) window.');
        write(SESSION, { id: u.id });
        return u;
      });
    },
    login: function (username, pw) {
      var u = App.findUser(username);
      if (!u) return Promise.reject(new Error('No account with that username on this device.'));
      return hash(u.salt, pw).then(function (h) {
        if (h !== u.hash) throw new Error('Wrong password. Please try again.');
        write(SESSION, { id: u.id });
        return u;
      });
    },
    logout: function () { try { localStorage.removeItem(SESSION); } catch (e) {} },
    home: function (u) {
      u = u || App.current();
      if (!u) return 'signup.html';
      if (!u.onboarded) return 'welcome.html';
      return u.role === 'agent' ? 'dashboard.html' : 'account.html';
    },
    // send away anyone who should not see this page
    guard: function (role) {
      var u = App.current();
      if (!u) { location.replace('signup.html?mode=login&next=' + encodeURIComponent(location.pathname.split('/').pop())); return null; }
      if (!u.onboarded) { location.replace('welcome.html'); return null; }
      if (role && u.role !== role) { location.replace(App.home(u)); return null; }
      return u;
    },
    displayName: function (u) { return (u && u.profile && u.profile.fullName) || (u && u.username) || ''; },

    /* agent clients */
    clients: function (u) { u = u || App.current(); return u ? read('raven_clients_' + u.id, []) : []; },
    saveClients: function (list, u) { u = u || App.current(); return u && write('raven_clients_' + u.id, list); },
    getClient: function (id) { return App.clients().find(function (c) { return c.id === id; }) || null; },
    saveClient: function (c) {
      var list = App.clients(), now = new Date().toISOString();
      c.updatedAt = now;
      if (!c.id) { c.id = uid(); c.createdAt = now; list.unshift(c); }
      else {
        var i = list.findIndex(function (x) { return x.id === c.id; });
        if (i === -1) list.unshift(c); else list[i] = c;
      }
      App.saveClients(list);
      return c;
    },
    deleteClient: function (id) { App.saveClients(App.clients().filter(function (c) { return c.id !== id; })); },

    /* customer saved searches */
    saved: function (u) { u = u || App.current(); return u ? read('raven_saved_' + u.id, []) : []; },
    addSaved: function (item) {
      var list = App.saved(); item.id = uid(); item.at = new Date().toISOString();
      list.unshift(item); write('raven_saved_' + App.current().id, list.slice(0, 50));
      return item;
    },
    removeSaved: function (id) {
      write('raven_saved_' + App.current().id, App.saved().filter(function (s) { return s.id !== id; }));
    }
  };
  window.RavenApp = App;

  /* ---------- header: Registration -> Dashboard / My Account ---------- */
  function syncNav() {
    var u = App.current();
    if (!u) return;
    var label = !u.onboarded ? 'Finish setup' : u.role === 'agent' ? 'Dashboard' : 'My Account';
    document.querySelectorAll('header a[href="signup.html"], #rv-menu a[href="signup.html"]').forEach(function (a) {
      a.textContent = label;
      a.setAttribute('href', App.home(u));
    });
  }

  /* ---------- search tools: pre-fill + save results ---------- */
  function setField(form, name, value) {
    var el = form.querySelector('[name="' + name + '"]');
    if (!el || value == null || value === '' || el.value) return;
    if (el.tagName === 'SELECT' && !el.querySelector('option[value="' + String(value).replace(/"/g, '') + '"]')) return;
    el.value = el.getAttribute('data-check') === 'money' || name === 'amount' ? inr(value) : value;
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }
  App.prefill = function (form, kind) {
    var u = App.current();
    if (!u || !u.onboarded) return;
    var p = u.profile || {}, values = {}, banner = '';
    if (u.role === 'agent') {
      var c = param('client') && App.getClient(param('client'));
      if (!c) return;
      values = Object.assign({ name: c.name, mobile: c.mobile, city: c.city, amount: c.amount, cibil: c.cibil },
        (c.searches && c.searches[kind] && c.searches[kind].values) || {});
      banner = 'Searching for your client <strong>' + esc(c.name) + '</strong>. Save the result to update their file.';
    } else {
      var s = param('saved') && App.saved().find(function (x) { return x.id === param('saved'); });
      values = Object.assign({ name: p.fullName, mobile: p.mobile, city: p.city }, (s && s.values) || {});
      banner = 'Filled in from your profile' + (s ? ' and your saved search' : '') + '. Change anything before searching.';
    }
    Object.keys(values).forEach(function (k) { setField(form, k, values[k]); });
    var b = document.createElement('p');
    b.className = 'ra-banner';
    b.innerHTML = banner;
    form.parentNode.insertBefore(b, form);
  };

  // info: { kind, values, labels, headline, details[], out }
  App.onResult = function (info) {
    var cta = info.out.querySelector('.hl-cta');
    if (!cta) return;
    var u = App.current(), box = document.createElement('div');
    box.className = 'ra-save';
    var page = location.pathname.split('/').pop() || 'index.html';

    if (!u || !u.onboarded) {
      box.innerHTML = '<p>Agents can save this result to a client file, customers to their account. <a href="signup.html?mode=login&next=' +
        encodeURIComponent(page) + '">Log in</a> or <a href="signup.html">register</a>.</p>';
    } else if (u.role === 'agent') {
      var c = param('client') && App.getClient(param('client'));
      box.innerHTML = '<button type="button" class="ra-btn">' + (c ? 'Save to ' + esc(c.name) + '’s file' : 'Add as new client') + '</button><span class="ra-done" hidden></span>';
      box.querySelector('button').addEventListener('click', function () {
        var v = info.values, client = c ? App.getClient(c.id) : {
          name: v.name, mobile: v.mobile || '', city: v.city || '', product: info.kind,
          amount: v.amount || 0, cibil: v.cibil || '', status: 'new', notes: '', followUp: ''
        };
        client.searches = client.searches || {};
        client.searches[info.kind] = { values: v, headline: info.headline, details: info.details, at: new Date().toISOString() };
        client.lastSearch = { kind: info.kind, headline: info.headline, at: new Date().toISOString() };
        client.activity = [{ at: new Date().toISOString(), text: (c ? '' : 'added from a search · ') + PRODUCTS[info.kind].label + ' search saved – ' + info.headline }].concat(client.activity || []).slice(0, 40);
        if (!client.amount && v.amount) client.amount = v.amount;
        if (!client.product) client.product = info.kind;
        client = App.saveClient(client);
        if (!c) { c = client; history.replaceState(null, '', page + '?client=' + client.id); }
        this.textContent = 'Saved';
        this.disabled = true;
        var d = box.querySelector('.ra-done');
        d.hidden = false;
        d.innerHTML = 'Saved to ' + esc(client.name) + '. <a href="dashboard.html#c-' + client.id + '">Open in dashboard</a>';
      });
    } else {
      box.innerHTML = '<button type="button" class="ra-btn">Save this result</button><span class="ra-done" hidden></span>';
      box.querySelector('button').addEventListener('click', function () {
        App.addSaved({ kind: info.kind, values: info.values, headline: info.headline, details: info.details });
        this.textContent = 'Saved';
        this.disabled = true;
        var d = box.querySelector('.ra-done');
        d.hidden = false;
        d.innerHTML = 'Saved to <a href="account.html#saved">My Account</a>.';
      });
    }
    cta.parentNode.insertBefore(box, cta);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncNav); else syncNav();
})();
