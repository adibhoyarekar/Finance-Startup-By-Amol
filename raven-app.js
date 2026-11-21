/* FinMatrix accounts: customers and agents.
   Sign-up and log-in run on Supabase Auth. Passwords go straight to Supabase over HTTPS, are
   hashed there (bcrypt) and are never stored or seen by this site; Google sign-in happens on
   Google's own page. Profile answers are kept on the Supabase user (encrypted at rest by Supabase).
   Saved searches and agent client files still live in this browser only.
   Loaded on every page: keeps the header button in sync with the session, pre-fills the
   search tools and lets logged-in users save search results. */
(function () {
  var SB_KEY = 'fm-auth', UCACHE = 'fm_user', CFG = 'fm_auth_cfg', PENDING_ROLE = 'fm_pending_role', CHECKED = 'fm_user_at';
  var LIB = 'vendor/supabase-auth-2.119.2.js';
  var AUTH_PAGE = /(^|\/)signup(\.html)?$/.test(location.pathname);

  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

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

  /* ---------- Supabase Auth ---------- */
  function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : null; }
  function mapUser(su) {
    var md = obj(su.user_metadata) || {}, prof = obj(md.profile) || {};
    var hint = typeof (md.full_name || md.name) === 'string' ? (md.full_name || md.name) : '';
    if (!md.onboarded && !prof.fullName && hint) prof = Object.assign({ fullName: hint.slice(0, 80), email: su.email || '' }, prof);
    return {
      id: su.id, email: su.email || '', username: su.email || '',
      role: md.role === 'agent' ? 'agent' : 'customer', hasRole: md.role === 'agent' || md.role === 'customer',
      onboarded: md.onboarded === true, profile: prof,
      verification: md.verification || undefined, checklist: obj(md.checklist) || undefined, payout: obj(md.payout) || undefined,
      provider: (obj(su.app_metadata) || {}).provider || 'email', createdAt: su.created_at || ''
    };
  }
  function session() { var s = read(SB_KEY, null); return s && s.user && s.user.id && s.refresh_token ? s : null; }

  var clientP = null, pushing = null, guarded = false, leaving = false;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.FMAuthClient) return res();
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { window.FMAuthClient ? res() : rej(new Error('offline')); };
      s.onerror = function () { rej(new Error('offline')); };
      document.head.appendChild(s);
    });
  }
  function config() {
    var c = null;
    try { c = JSON.parse(sessionStorage.getItem(CFG)); } catch (e) {}
    if (c && c.configured) return Promise.resolve(c);
    return fetch('/api/auth/config', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('offline');
      return r.json();
    }).then(function (c) {
      if (!c || !c.configured || !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(c.url || '') || !c.key) {
        var e = new Error('not_configured'); e.code = 'not_configured'; throw e;
      }
      try { sessionStorage.setItem(CFG, JSON.stringify({ configured: true, url: c.url, key: c.key })); } catch (e2) {}
      return c;
    });
  }
  function client() {
    if (clientP) return clientP;
    clientP = Promise.all([config(), loadScript(LIB)]).then(function (r) {
      var cfg = r[0];
      var c = new window.FMAuthClient({
        url: cfg.url + '/auth/v1',
        headers: { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key },
        storageKey: SB_KEY, persistSession: true, autoRefreshToken: true,
        detectSessionInUrl: AUTH_PAGE, flowType: 'pkce'
      });
      c.onAuthStateChange(function (ev, s) { setTimeout(function () { onAuth(ev, s); }, 0); });
      return c;
    });
    clientP.catch(function () { clientP = null; });
    return clientP;
  }
  function onAuth(ev, s) {
    if (ev === 'SIGNED_OUT' || !s || !s.user) {
      drop(UCACHE);
      if (guarded && !leaving && ev === 'SIGNED_OUT') location.replace('signup.html?mode=login&next=' + encodeURIComponent(location.pathname.split('/').pop()));
      return;
    }
    var c = read(UCACHE, null);
    if (c && c.id === s.user.id && c.dirty) push();
    else write(UCACHE, mapUser(s.user));
  }
  // send the profile (kept in this browser first so pages stay fast) up to Supabase
  function push() {
    if (pushing) return pushing;
    var c = read(UCACHE, null);
    if (!c || !c.dirty) return Promise.resolve();
    var stamp = c.dirty;
    pushing = client().then(function (cl) {
      return cl.updateUser({ data: {
        role: c.role === 'agent' ? 'agent' : 'customer', onboarded: !!c.onboarded, profile: c.profile || {},
        verification: c.verification || null, checklist: c.checklist || null, payout: c.payout || null
      } });
    }).then(function (r) {
      if (r.error) throw r.error;
      var now = read(UCACHE, null);
      if (now && now.id === c.id && now.dirty === stamp) write(UCACHE, mapUser(r.data.user));
    }).finally(function () {
      pushing = null;
      var now = read(UCACHE, null);
      if (now && now.dirty && now.dirty !== stamp) push();
    });
    return pushing;
  }
  function friendly(e) {
    var m = String((e && e.message) || ''), code = (e && e.code) || '', st = e && e.status, msg;
    if (code === 'not_configured') msg = 'Login is being set up. Please try again in a little while.';
    else if (m === 'offline' || /fetch|network|load failed/i.test(m) || (e && e.name === 'AuthRetryableFetchError') || (typeof navigator !== 'undefined' && navigator.onLine === false)) msg = 'No internet connection. Check your network and try again.';
    else if (code === 'invalid_credentials' || /invalid login credentials/i.test(m)) msg = 'Wrong email or password. Please try again.';
    else if (code === 'email_not_confirmed' || /not confirmed/i.test(m)) msg = 'Please confirm your email first – open the link we sent to your inbox.';
    else if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(m)) msg = 'An account with this email already exists. Please log in instead.';
    else if (code === 'weak_password' || /password should/i.test(m)) msg = 'Please choose a stronger password – at least 8 characters with letters and numbers.';
    else if (code === 'same_password') msg = 'Your new password must be different from the old one.';
    else if (st === 429 || /rate limit/i.test(code + m)) msg = 'Too many attempts. Please wait a minute and try again.';
    else if (code === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(m)) msg = 'Please enter a valid email address.';
    else if (code === 'signup_disabled' || /signups not allowed/i.test(m)) msg = 'New sign-ups are paused right now. Please try again later.';
    else if (/code verifier|flow state|auth code|otp_expired|expired/i.test(code + ' ' + m)) msg = 'This link has expired or was opened in a different browser. Please try again from this browser.';
    else if (/access_denied/i.test(code + m)) msg = 'Google sign-in was cancelled.';
    else msg = 'Something went wrong. Please try again.';
    var out = new Error(msg); out.code = code || (st ? 'http_' + st : 'error'); return out;
  }
  function call(fn) {
    return client().then(fn).then(function (r) {
      if (r && r.error) throw r.error;
      return r ? r.data : null;
    }).catch(function (e) { throw friendly(e); });
  }
  function back(next) { return location.origin + '/signup.html' + (next ? '?next=' + encodeURIComponent(next) : ''); }

  var PRODUCTS = {
    home:     { label: 'Home Loan',            page: 'home-loans.html',     section: 'home-loan-search' },
    business: { label: 'Business Loan',        page: 'business-loans.html', section: 'business-loan-search' },
    personal: { label: 'Personal Loan',        page: 'personal-loans.html', section: 'personal-loan-search' },
    gold:     { label: 'Gold Loan',            page: 'gold-loans.html',     section: 'gold-loan-search' },
    account:  { label: 'Bank Account Opening', page: 'bank-account.html',   section: 'bank-account-search' },
    vehicle:  { label: 'Car Loan',             page: 'car-loans.html',      section: 'car-loan-search' },
    realestate: { label: 'Real Estate',        page: 'real-estate.html',    section: 'real-estate-form' },
    insurance: { label: 'Insurance',           page: 'insurance.html',      section: 'insurance-form' },
    other:    { label: 'Other',                page: 'contact.html',        section: '' }
  };
  var STATUSES = [
    ['new', 'New lead'], ['docs', 'Documents pending'], ['submitted', 'Submitted to bank'],
    ['sanctioned', 'Sanctioned'], ['disbursed', 'Disbursed'], ['closed', 'Rejected / Closed']
  ];
  var DEFAULT_PAYOUT = { home: 0.5, business: 1, personal: 1.5, gold: 0.3, account: 0, vehicle: 1, realestate: 1, other: 0.5 };

  var App = {
    PRODUCTS: PRODUCTS, STATUSES: STATUSES, DEFAULT_PAYOUT: DEFAULT_PAYOUT,
    esc: esc, inr: inr, short: short, uid: uid, param: param,

    current: function () {
      var s = session();
      if (!s) return null;
      var c = read(UCACHE, null);
      if (c && c.id === s.user.id) return c;
      c = mapUser(s.user);
      write(UCACHE, c);
      return c;
    },
    // keeps the change in this browser at once and saves it to the Supabase account in the background
    saveUser: function (u) {
      var cur = App.current();
      if (!u || !cur || cur.id !== u.id) return false;
      u.dirty = Date.now();
      if (!write(UCACHE, u)) return false;
      push().catch(function () {});
      return true;
    },
    authReady: function () {
      return client().then(function (cl) { return cl.initialize(); }).then(function (r) {
        if (r && r.error) throw r.error;
        return App.current();
      }).catch(function (e) { throw friendly(e); });
    },
    register: function (role, email, pw, next) {
      return call(function (cl) {
        return cl.signUp({ email: email, password: pw, options: { data: { role: role === 'agent' ? 'agent' : 'customer', onboarded: false }, emailRedirectTo: back(next) } });
      }).then(function (d) { return { user: d && d.session ? App.current() : null, confirm: !(d && d.session) }; });
    },
    login: function (email, pw) {
      return call(function (cl) { return cl.signInWithPassword({ email: email, password: pw }); }).then(function () { return App.current(); });
    },
    google: function (role, next) {
      if (role) write(PENDING_ROLE, role === 'agent' ? 'agent' : 'customer'); else drop(PENDING_ROLE);
      return call(function (cl) { return cl.signInWithOAuth({ provider: 'google', options: { redirectTo: back(next), queryParams: { prompt: 'select_account' } } }); });
    },
    pendingRole: function () { var r = read(PENDING_ROLE, ''); drop(PENDING_ROLE); return r === 'agent' || r === 'customer' ? r : ''; },
    resetPassword: function (email) {
      return call(function (cl) { return cl.resetPasswordForEmail(email, { redirectTo: location.origin + '/signup.html?mode=reset' }); });
    },
    updatePassword: function (pw) {
      return call(function (cl) { return cl.updateUser({ password: pw }); });
    },
    logout: function () {
      function clear() { [UCACHE, SB_KEY, SB_KEY + '-code-verifier', SB_KEY + '-user', CHECKED].forEach(drop); }
      leaving = true;
      var p = session() ? client().then(function (cl) { return cl.signOut({ scope: 'local' }); }) : Promise.resolve();
      return Promise.race([p, new Promise(function (r) { setTimeout(r, 3000); })]).catch(function () {}).then(clear);
    },
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
      guarded = true;
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
    document.querySelectorAll('header a[href="signup.html"], #rv-menu a[href="signup.html"], .rx-drawer a[href="signup.html"]').forEach(function (a) {
      var t = a.querySelector('[data-rx-label]') || a;
      t.textContent = label;
      a.setAttribute('aria-label', label);
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
          amount: v.amount || v.budget || v.lump || 0, cibil: v.cibil || '', status: 'new', notes: '', followUp: ''
        };
        client.searches = client.searches || {};
        client.searches[info.kind] = { values: v, headline: info.headline, details: info.details, at: new Date().toISOString() };
        client.lastSearch = { kind: info.kind, headline: info.headline, at: new Date().toISOString() };
        client.activity = [{ at: new Date().toISOString(), text: (c ? '' : 'added from a search · ') + PRODUCTS[info.kind].label + ' search saved – ' + info.headline }].concat(client.activity || []).slice(0, 40);
        if (!client.amount && (v.amount || v.budget)) client.amount = v.amount || v.budget;
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

  /* keep the login fresh in the background: refreshes the token, saves any profile change that
     did not reach Supabase yet, and every 10 minutes picks up changes made on another device */
  if (session() && !AUTH_PAGE) {
    setTimeout(function () {
      client().then(function (cl) {
        return cl.getSession().then(function () {
          var c = read(UCACHE, null);
          if (!session()) return;
          if (c && c.dirty) return push();
          if (Date.now() - (read(CHECKED, 0) || 0) < 600000) return;
          return cl.getUser().then(function (r) {
            if (r.error && (r.error.status === 401 || r.error.status === 403)) return cl.signOut({ scope: 'local' });
            if (!r.data || !r.data.user) return;
            write(CHECKED, Date.now());
            var now = read(UCACHE, null);
            if (!(now && now.dirty)) write(UCACHE, mapUser(r.data.user));
          });
        });
      }).catch(function () {});
    }, 1500);
  }
})();
