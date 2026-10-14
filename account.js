/* Customer account (account.html): home, search tools, saved searches, loan-ready
   checklist and profile. Data lives in this browser only - see raven-app.js. */
(function () {
  var App = window.RavenApp, UI = window.RavenUI;
  var me = App && App.guard('customer');
  if (!me || !UI) return;
  var esc = App.esc, ic = UI.icon, $ = function (id) { return document.getElementById(id); };
  var p = me.profile || {};
  var name = p.fullName || me.username, first = name.split(' ')[0];

  var TOOLS = {
    home: ['home', 'Home Loan', 'home-loans.html#home-loan-search', 'Eligibility, EMI and lenders for buying or building a home.', '#eef0ff', '#4f46e5'],
    personal: ['user', 'Personal Loan', 'personal-loans.html#personal-loan-search', 'See how much you can borrow without collateral.', '#fdf2fa', '#c11574'],
    business: ['briefcase', 'Business Loan', 'business-loans.html#business-loan-search', 'MUDRA, unsecured and secured options for your business.', '#eff8ff', '#175cd3'],
    gold: ['coins', 'Gold Loan', 'gold-loans.html#gold-loan-search', 'Value your gold and see the maximum loan under RBI limits.', '#fffaeb', '#b54708'],
    account: ['bank', 'Bank Account', 'bank-account.html#bank-account-search', 'Pick the right savings or current account and documents.', '#ecfdf3', '#067647'],
    registration: ['file', 'Business Registration', 'registration.html', 'GST, Udyam, company and firm registration.', '#f4f3ff', '#5925dc'],
    vehicle: ['sparkle', 'Vehicle Loan', 'contact.html', 'New or used car, bike or commercial vehicle.', '#f0f9ff', '#026aa2'],
    education: ['sparkle', 'Education Loan', 'contact.html', 'Fund studies in India or abroad.', '#f0f9ff', '#026aa2'],
    insurance: ['shield', 'Insurance', 'contact.html', 'Health, life and business cover.', '#fef3f2', '#b42318'],
    realestate: ['home', 'Real Estate', 'contact.html', 'Buy, sell or rent property with our team.', '#f0fdf9', '#107569']
  };
  var LANG = { en: 'English', mr: 'मराठी', hi: 'हिंदी' };
  var EMP = { 'sal-bank': 'Salaried – Bank Salary', 'sal-cash': 'Salaried – Cash Salary', 'se-business': 'Self-Employed – Business', 'se-professional': 'Self-Employed – Professional', student: 'Student', retired: 'Retired / Pensioner', homemaker: 'Homemaker', other: 'Other' };
  var TIME = { now: 'Immediately', '1m': 'Within 1 month', '3m': '1–3 months', explore: 'Just exploring' };
  var CHECKLIST = [
    ['cibil', 'Check your CIBIL score', 'Free once a year on cibil.com. Above 750 gets the best rates.'],
    ['kyc', 'Keep PAN and Aadhaar ready', 'Make sure your mobile number is linked to Aadhaar for e-KYC.'],
    ['bank', 'Download 6 months bank statement', 'The account where your salary or business income comes in.'],
    ['income', 'Collect income proof', 'Salary slips and Form 16, or ITR with computation for self-employed.'],
    ['papers', 'Keep property or business papers ready', 'Only if your loan needs them – sale deed, 7/12, GST or Udyam.']
  ];
  var done = me.checklist || {};

  /* shell */
  $('me-avatar').innerHTML = UI.avatar(name, 'is-sm');
  $('me-name').textContent = name;
  $('top-me').innerHTML = UI.avatar(name, 'is-sm');
  $('top-me').style.cssText = 'width:42px;padding:0;border:0;background:none';
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-logout]')) { App.logout(); location.href = 'index.html'; }
  });
  var interests = (p.interests || []).map(function (k) { return TOOLS[k] ? TOOLS[k][1] : k; }).join(', ');
  var body = 'Please call me back.\n\nName: ' + name + '\nMobile: ' + (p.mobile || '') + '\nCity: ' + (p.city || '') +
    '\nInterested in: ' + interests + '\nBest time: ' + (p.bestTime || '') + '\nPreferred contact: ' + (p.contactVia || '');
  document.querySelectorAll('[data-callback]').forEach(function (a) {
    a.href = 'mailto:hello@raven.business?subject=' + encodeURIComponent('Callback request – ' + name) + '&body=' + encodeURIComponent(body);
  });

  function tool(k, i, forYou) {
    var t = TOOLS[k];
    return '<a class="ap-card ap-tool" style="--i:' + i + ';--bg:' + t[4] + ';--fg:' + t[5] + '" href="' + t[2] + '">' + (forYou ? '<span class="for">For you</span>' : '') +
      '<span class="ic">' + ic(t[0], 22) + '</span><strong>' + t[1] + '</strong><p>' + t[3] + '</p><span class="go">' + (t[2].indexOf('contact') === 0 ? 'Talk to our team' : 'Start search') + ic('arrow', 16) + '</span></a>';
  }
  function ring(el, n, total, light) {
    var r = 46, c = 2 * Math.PI * r, pct = total ? n / total : 0;
    el.innerHTML = '<svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true"><circle class="bg" cx="56" cy="56" r="' + r + '"/><circle class="fg" cx="56" cy="56" r="' + r + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '"/></svg>' +
      '<span>' + Math.round(pct * 100) + '%<small>loan-ready</small></span>';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', n + ' of ' + total + ' checklist items done');
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.querySelector('.fg').style.strokeDashoffset = c * (1 - pct); }); });
  }
  function savedCard(s, i) {
    var prod = App.PRODUCTS[s.kind] || App.PRODUCTS.other, t = TOOLS[s.kind] || TOOLS.home;
    return '<article class="ap-card pad" style="animation:ap-rise .45s var(--ap-ease) both;animation-delay:' + i * 60 + 'ms"><div style="display:flex;gap:.8rem;align-items:flex-start">' +
      '<span class="ap-tool" style="padding:0;border:0;box-shadow:none;--bg:' + t[4] + ';--fg:' + t[5] + '"><span class="ic">' + ic(t[0], 20) + '</span></span><div style="flex:1;min-width:0">' +
      '<span class="ap-tag">' + prod.label + '</span><h3 style="font-size:1rem;font-weight:600;margin-top:.4rem">' + esc(s.headline) + '</h3>' +
      (s.details ? '<p class="ap-muted" style="font-size:.825rem;margin-top:.3rem;line-height:1.5">' + s.details.map(esc).join('<br>') + '</p>' : '') +
      '<p class="ap-muted" style="font-size:.75rem;margin-top:.4rem">Saved ' + new Date(s.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + '</p></div></div>' +
      '<div style="display:flex;gap:.5rem;margin-top:1rem"><a class="ap-btn is-primary is-sm" style="flex:1" href="' + prod.page + '?saved=' + s.id + '#' + prod.section + '">' + ic('search', 16) + 'Search again</a>' +
      '<button type="button" class="ap-btn is-sm is-danger" data-remove="' + s.id + '">' + ic('trash', 16) + 'Remove</button></div></article>';
  }
  function empty(i, h, text, cta) {
    return '<div class="ap-card ap-empty" style="grid-column:1/-1"><span class="art">' + ic(i, 28) + '</span><h3>' + h + '</h3><p>' + text + '</p>' + (cta || '') + '</div>';
  }

  function render() {
    var saved = App.saved(), n = CHECKLIST.filter(function (c) { return done[c[0]]; }).length;
    $('n-saved').textContent = saved.length;

    // home
    var h = new Date().getHours();
    $('hm-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    $('hm-h').textContent = (h < 12 ? 'Good morning, ' : h < 17 ? 'Good afternoon, ' : 'Good evening, ') + first;
    var nextItem = CHECKLIST.find(function (c) { return !done[c[0]]; });
    $('hm-sub').textContent = n === CHECKLIST.length ? 'You are fully loan-ready. Run a search and send the result to our team.'
      : 'You are ' + n + ' of ' + CHECKLIST.length + ' steps loan-ready. Next: ' + nextItem[1] + '.';
    ring($('hm-ring'), n, CHECKLIST.length);
    var picks = (p.interests || []).filter(function (k) { return TOOLS[k]; });
    var rest = ['home', 'personal', 'business', 'gold', 'account'].filter(function (k) { return picks.indexOf(k) === -1; });
    var top = picks.concat(rest).slice(0, 3);
    $('hm-next').setAttribute('href', TOOLS[top[0]][2]);
    $('hm-tools').innerHTML = top.map(function (k, i) { return tool(k, i, picks.indexOf(k) !== -1); }).join('');
    $('hm-saved').innerHTML = saved.length ? '<div class="ap-list">' + saved.slice(0, 3).map(function (s) {
      var prod = App.PRODUCTS[s.kind] || App.PRODUCTS.other;
      return '<a class="ap-li is-click" style="text-decoration:none;color:inherit" href="' + prod.page + '?saved=' + s.id + '#' + prod.section + '"><span class="ap-avatar is-sm" style="--a1:#a5a8ff;--a2:#625fff">' + ic((TOOLS[s.kind] || TOOLS.home)[0], 16) + '</span><div class="tx"><strong>' + esc(s.headline) + '</strong><small>' + prod.label + ' · ' + new Date(s.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + '</small></div>' + ic('arrow', 16) + '</a>';
    }).join('') + '</div>' : '<div class="ap-empty-chart">' + ic('bookmark', 26) + '<span>Run a search and tap <b>Save this result</b> to keep it here.</span></div>';

    // search
    var all = picks.concat(Object.keys(TOOLS).filter(function (k) { return picks.indexOf(k) === -1; }));
    $('sr-tools').innerHTML = all.map(function (k, i) { return tool(k, i, picks.indexOf(k) !== -1); }).join('');

    // saved
    $('sv-sub').textContent = saved.length ? saved.length + ' saved result' + (saved.length === 1 ? '' : 's') + ' – run any of them again with one tap.' : 'Results you save from any search show up here.';
    $('sv-list').innerHTML = saved.length ? saved.map(savedCard).join('') : empty('bookmark', 'No saved searches yet', 'Run any search and tap Save this result to keep it here.', '<a class="ap-btn is-primary" href="#search">' + ic('search', 18) + 'Start a search</a>');

    // checklist
    $('rd-steps').innerHTML = CHECKLIST.map(function (c, i) {
      return '<label class="ap-step" style="position:relative;animation:ap-rise .45s var(--ap-ease) both;animation-delay:' + i * 60 + 'ms"><input type="checkbox" data-k="' + c[0] + '"' + (done[c[0]] ? ' checked' : '') + '><span class="bx">' + ic('check', 14) + '</span><span><strong>' + c[1] + '</strong><small>' + c[2] + '</small></span></label>';
    }).join('');
    renderReady();

    // profile
    $('pf-prof').innerHTML = UI.avatar(name, 'is-lg') + '<div><h3>' + esc(name) + '</h3><p>Customer · @' + esc(me.username) + '</p></div>';
    var kv = [['Mobile', p.mobile], ['Email', p.email], ['City', p.city], ['Language', LANG[p.language]], ['Employment', EMP[p.employment]], ['Needs it', TIME[p.timeline]], ['Interested in', interests], ['Best time to call', { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', any: 'Any time' }[p.bestTime]]];
    $('pf-kv').innerHTML = kv.filter(function (x) { return x[1]; }).map(function (x) { return '<div><small>' + x[0] + '</small><b>' + esc(x[1]) + '</b></div>'; }).join('');
  }
  function renderReady() {
    var n = CHECKLIST.filter(function (c) { return done[c[0]]; }).length;
    ring($('rd-ring'), n, CHECKLIST.length, true);
    $('rd-msg').textContent = n === CHECKLIST.length ? 'You’re loan-ready!' : n + ' of ' + CHECKLIST.length + ' done';
    $('rd-tip').textContent = n === CHECKLIST.length ? 'Run a search and send the result to our team – we will take it from here.' : 'Keep going – a complete file usually gets a faster decision from the lender.';
  }

  $('rd-steps').addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-k'); if (!k) return;
    done[k] = e.target.checked;
    me.checklist = done;
    App.saveUser(me);
    renderReady();
    var n = CHECKLIST.filter(function (c) { return done[c[0]]; }).length;
    if (e.target.checked) UI.toast(n === CHECKLIST.length ? 'All done – you’re loan-ready!' : 'Nice – ' + n + ' of ' + CHECKLIST.length + ' done');
  });
  $('sv-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-remove]'); if (!b) return;
    var id = b.getAttribute('data-remove'), item = App.saved().find(function (s) { return s.id === id; });
    App.removeSaved(id);
    render();
    UI.toast('Saved search removed', { label: 'Undo', run: function () {
      var list = App.saved(); list.unshift(item);
      try { localStorage.setItem('raven_saved_' + me.id, JSON.stringify(list)); } catch (err) {}
      render();
    } });
  });

  render();
  UI.router('home', function (view) { UI.hideTip(); if (view === 'home' || view === 'ready') render(); });
  if (App.param('welcome')) {
    history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(function () { UI.toast('Welcome to RAVEN, ' + first + '! Your searches are now pre-filled.'); }, 500);
  }
})();
