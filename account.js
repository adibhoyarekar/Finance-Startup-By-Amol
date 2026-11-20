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
    home: ['home', 'Home Loan', 'home-loans.html', 'Eligibility, EMI and lenders for buying or building a home.', '#eaf1fd', '#1d4ed8', 'images/loan-home.svg'],
    personal: ['user', 'Personal Loan', 'personal-loans.html#personal-loan-search', 'See how much you can borrow without collateral.', '#fdf2fa', '#c11574', 'images/loan-personal.svg'],
    business: ['briefcase', 'Business Loan', 'business-loans.html#business-loan-search', 'MUDRA, unsecured and secured options for your business.', '#eff8ff', '#175cd3', 'images/loan-business.svg'],
    gold: ['coins', 'Gold Loan', 'gold-loans.html#gold-loan-search', 'Value your gold and see the maximum loan under RBI limits.', '#fffaeb', '#b54708', 'images/loan-gold.svg'],
    account: ['bank', 'Bank Account', 'bank-account.html#bank-account-search', 'Pick the right savings or current account and documents.', '#ecfdf3', '#067647', 'images/bank-account.svg'],
    vehicle: ['sparkle', 'Car Loan', 'car-loans.html#car-loan-search', 'Eligibility, EMI and lenders for a new or used car.', '#f0f9ff', '#026aa2', 'images/loan-vehicle.svg'],
    education: ['sparkle', 'Education Loan', 'contact.html', 'Fund studies in India or abroad.', '#f0f9ff', '#026aa2', 'images/loan-education.svg'],
    insurance: ['shield', 'Insurance', 'insurance.html#insurance-form', 'Life, health, motor and travel cover.', '#fef3f2', '#b42318'],
    realestate: ['home', 'Real Estate', 'real-estate.html#real-estate-form', 'Buy, sell, rent or lease property – apply in minutes.', '#f0fdf9', '#107569', 'images/real-estate.svg'],
    auction: ['board', 'Bank Auctions', 'auctions.html', 'Bid live on flats, shops, plots, vehicles and gold sold by banks.', '#fef3f2', '#b42318', 'images/bank-auction.svg']
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
  var interests = (p.interests || []).filter(function (k) { return TOOLS[k]; }).map(function (k) { return TOOLS[k][1]; }).join(', ');
  var body = 'Please call me back.\n\nName: ' + name + '\nMobile: ' + (p.mobile || '') + '\nCity: ' + (p.city || '') +
    '\nInterested in: ' + interests + '\nBest time: ' + (p.bestTime || '') + '\nPreferred contact: ' + (p.contactVia || '');
  document.querySelectorAll('[data-callback]').forEach(function (a) {
    a.href = 'mailto:hello@credmates.business?subject=' + encodeURIComponent('Callback request – ' + name) + '&body=' + encodeURIComponent(body);
  });

  function tool(k, i, forYou) {
    var t = TOOLS[k];
    return UI.toolCard({ i: i, href: t[2], img: t[6], icon: t[0], title: t[1], text: t[3], badge: forYou ? 'For you' : '',
      go: t[2].indexOf('auctions') === 0 ? 'Browse auctions' : t[2].indexOf('contact') === 0 ? 'Talk to our team' : t[2].indexOf('real-estate') === 0 || t[2].indexOf('mutual') === 0 ? 'Start application' : 'Start search' });
  }
  // the loan file: one paper per checklist item; ready papers rise out of the folder with a stamp
  var SHORT = { cibil: 'CIBIL score', kyc: 'PAN and Aad\u00adhaar', bank: 'Bank state\u00adment', income: 'Income proof', papers: 'Pro\u00adperty papers' }; // soft hyphens for narrow phones
  var introDone = false;
  function file(el, n) {
    el.innerHTML = '<ul class="acx-sheets' + (introDone ? '' : ' acx-intro') + '">' + CHECKLIST.map(function (c, i) {
      var ok = !!done[c[0]];
      return '<li class="acx-sheet' + (ok ? ' is-ready' : '') + '" style="--i:' + i + '"><span class="acx-sheet-name">' + SHORT[c[0]] + '</span>' +
        (ok ? '<span class="acx-stamp">Ready</span>' : '<span class="acx-sheet-wait">To do</span>') + '</li>';
    }).join('') + '</ul><p class="acx-count"><b>' + n + ' of ' + CHECKLIST.length + '</b> papers ready</p>';
  }
  function savedHref(s) { var prod = App.PRODUCTS[s.kind] || App.PRODUCTS.other; return prod.page + '?saved=' + encodeURIComponent(s.id) + '#' + prod.section; }
  function savedDate(s, year) { return new Date(s.at).toLocaleDateString('en-IN', year ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }); }
  function savedCard(s) {
    var prod = App.PRODUCTS[s.kind] || App.PRODUCTS.other, t = TOOLS[s.kind] || TOOLS.home;
    return '<article class="acx-slip"><div class="acx-slip-main">' +
      '<p class="acx-slip-kind"><span class="acx-thumb">' + (t[6] ? '<img src="' + t[6] + '" alt="" loading="lazy">' : '') + '</span>' + esc(prod.label) + '</p>' +
      '<h2 class="acx-slip-h">' + esc(s.headline) + '</h2>' +
      (s.details ? '<p class="acx-slip-d">' + s.details.map(esc).join('<br>') + '</p>' : '') +
      '</div><div class="acx-slip-stub"><p class="acx-slip-date">Saved on<b>' + savedDate(s, true) + '</b></p>' +
      '<a class="acx-btn is-ink" href="' + esc(savedHref(s)) + '">' + ic('search', 18) + 'Search again</a>' +
      '<button type="button" class="acx-btn is-quiet" data-remove="' + esc(s.id) + '">' + ic('trash', 18) + 'Remove</button></div></article>';
  }
  function empty(i, h, text, cta) {
    return '<div class="acx-empty"><span class="acx-empty-art">' + ic(i, 26) + '</span><h2>' + h + '</h2><p>' + text + '</p>' + (cta || '') + '</div>';
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
    $('hm-tab').textContent = name;
    file($('hm-file'), n);
    var picks = (p.interests || []).filter(function (k) { return TOOLS[k]; });
    var rest = ['home', 'personal', 'business', 'gold', 'account'].filter(function (k) { return picks.indexOf(k) === -1; });
    var top = picks.concat(rest).slice(0, 3);
    $('hm-next').setAttribute('href', TOOLS[top[0]][2]);
    $('hm-tools').innerHTML = top.map(function (k, i) { return tool(k, i, picks.indexOf(k) !== -1); }).join('');
    $('hm-saved').innerHTML = saved.length ? '<ul class="acx-mini">' + saved.slice(0, 3).map(function (s) {
      var prod = App.PRODUCTS[s.kind] || App.PRODUCTS.other, t = TOOLS[s.kind] || TOOLS.home;
      return '<li><a href="' + esc(savedHref(s)) + '"><span class="acx-thumb">' + (t[6] ? '<img src="' + t[6] + '" alt="" loading="lazy">' : '') + '</span>' +
        '<span class="acx-mini-tx"><strong>' + esc(s.headline) + '</strong><small>' + esc(prod.label) + '</small></span><span class="acx-mini-date">' + savedDate(s) + '</span></a></li>';
    }).join('') + '</ul>' : '<div class="acx-empty is-inline"><span class="acx-empty-art">' + ic('bookmark', 22) + '</span><p>Run any search and tap <b>Save this result</b>. It will show up here.</p></div>';

    // search
    var all = picks.concat(Object.keys(TOOLS).filter(function (k) { return picks.indexOf(k) === -1; }));
    $('sr-tools').innerHTML = all.map(function (k, i) { return tool(k, i, picks.indexOf(k) !== -1); }).join('');

    // saved
    $('sv-sub').textContent = saved.length ? saved.length + ' saved result' + (saved.length === 1 ? '' : 's') + ' – run any of them again with one tap.' : 'Results you save from any search show up here.';
    $('sv-list').innerHTML = saved.length ? saved.map(savedCard).join('') : empty('bookmark', 'No saved searches yet', 'Run any search and tap Save this result to keep it here.', '<a class="ap-btn is-primary" href="#search">' + ic('search', 18) + 'Start a search</a>');

    // checklist
    $('rd-steps').innerHTML = CHECKLIST.map(function (c, i) {
      return '<label class="acx-paper"><input type="checkbox" data-k="' + c[0] + '"' + (done[c[0]] ? ' checked' : '') + '><span class="acx-box" aria-hidden="true">' + ic('check', 16) + '</span>' +
        '<span class="acx-paper-tx"><strong>' + c[1] + '</strong><small>' + c[2] + '</small></span><span class="acx-stamp" aria-hidden="true">Ready</span></label>';
    }).join('');
    renderReady();

    // profile
    $('pf-prof').innerHTML = UI.avatar(name, 'is-lg') + '<div><h2>' + esc(name) + '</h2><p>Signed in as ' + esc(me.username) + '</p></div>';
    var kv = [['Mobile', p.mobile], ['Email', p.email], ['City', p.city], ['Language', LANG[p.language]], ['Employment', EMP[p.employment]], ['Needs it', TIME[p.timeline]], ['Interested in', interests], ['Best time to call', { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', any: 'Any time' }[p.bestTime]]];
    $('pf-kv').innerHTML = kv.filter(function (x) { return x[1]; }).map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('');
  }
  function renderReady() {
    var n = CHECKLIST.filter(function (c) { return done[c[0]]; }).length;
    file($('rd-file'), n);
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
  introDone = true;
  if (App.param('welcome')) {
    history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(function () { UI.toast('Welcome to FinMatrix, ' + first + '! Your searches are now pre-filled.'); }, 500);
  }
})();
