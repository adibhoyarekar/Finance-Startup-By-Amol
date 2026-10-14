/* Customer account (account.html): profile, recommended tools, saved searches and a
   loan-readiness checklist. Data lives in this browser only - see raven-app.js. */
(function () {
  var App = window.RavenApp;
  var me = App && App.guard('customer');
  if (!me) return;
  var esc = App.esc, $ = function (id) { return document.getElementById(id); };
  var p = me.profile || {};

  var TOOLS = {
    home: ['Home Loan', 'home-loans.html#home-loan-search', 'Eligibility, EMI and lenders for buying or building a home'],
    personal: ['Personal Loan', 'personal-loans.html#personal-loan-search', 'See how much you can borrow without collateral'],
    business: ['Business Loan', 'business-loans.html#business-loan-search', 'MUDRA, unsecured and secured options for your business'],
    gold: ['Gold Loan', 'gold-loans.html#gold-loan-search', 'Value your gold and see the maximum loan'],
    account: ['Bank Account', 'bank-account.html#bank-account-search', 'Pick the right savings or current account'],
    registration: ['Business Registration', 'registration.html', 'GST, Udyam, company and firm registration'],
    vehicle: ['Vehicle Loan', 'contact.html', 'New or used car, bike or commercial vehicle'],
    education: ['Education Loan', 'contact.html', 'Study in India or abroad'],
    insurance: ['Insurance', 'contact.html', 'Health, life and business cover'],
    realestate: ['Real Estate', 'contact.html', 'Buy, sell or rent property with our team']
  };
  var LANG = { en: 'English', mr: 'मराठी', hi: 'हिंदी' };
  var CHECKLIST = [
    ['cibil', 'Check my CIBIL score (free once a year on cibil.com)'],
    ['kyc', 'Keep PAN card and Aadhaar card ready'],
    ['bank', 'Download the last 6 months bank statement'],
    ['income', 'Collect income proof – salary slips, Form 16 or ITR'],
    ['papers', 'Keep property or business papers ready (if needed)']
  ];

  $('ac-hello').textContent = 'Hello, ' + (p.fullName || me.username).split(' ')[0];
  $('ac-meta').textContent = [p.city, p.mobile, LANG[p.language]].filter(Boolean).join(' · ');
  $('ac-out').addEventListener('click', function () { App.logout(); location.href = 'index.html'; });
  if (App.param('welcome')) {
    $('ac-welcome').hidden = false;
    $('ac-welcome').innerHTML = '<strong>Your account is ready.</strong> Your searches are now pre-filled with your details, and you can save any result to compare later.';
  }

  // recommended tools: interests first, then the rest
  var picks = (p.interests || []).filter(function (k) { return TOOLS[k]; });
  var rest = ['home', 'personal', 'business', 'gold', 'account'].filter(function (k) { return picks.indexOf(k) === -1; });
  $('ac-tools').innerHTML = picks.concat(rest).slice(0, 6).map(function (k, i) {
    var t = TOOLS[k];
    return '<a class="ac-tool" href="' + t[1] + '">' + (i < picks.length ? '<span class="ac-for">For you</span>' : '') +
      '<strong>' + t[0] + '</strong><small>' + t[2] + '</small><span class="rv-go" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a>';
  }).join('');

  function renderSaved() {
    var list = App.saved();
    $('ac-saved').innerHTML = list.length ? list.map(function (s) {
      var prod = App.PRODUCTS[s.kind] || App.PRODUCTS.other;
      return '<article class="db-client"><div class="db-c-top"><div><h3>' + esc(s.headline) + '</h3><p class="db-c-meta">' +
        new Date(s.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + '</p></div><span class="db-chip">' + prod.label + '</span></div>' +
        (s.details ? '<p class="db-last">' + s.details.map(esc).join('<br>') + '</p>' : '') +
        '<div class="db-actions"><a class="db-btn db-primary" href="' + prod.page + '?saved=' + s.id + '#' + prod.section + '">Search again</a>' +
        '<button type="button" class="db-btn db-danger" data-remove="' + s.id + '">Remove</button></div></article>';
    }).join('') : '<div class="db-empty"><h3>No saved searches yet</h3><p>Run any search above and tap <strong>Save this result</strong> to keep it here.</p></div>';
  }
  $('ac-saved').addEventListener('click', function (e) {
    var id = e.target.getAttribute('data-remove');
    if (id) { App.removeSaved(id); renderSaved(); }
  });
  renderSaved();

  // readiness checklist
  var done = me.checklist || {};
  function renderCheck() {
    var n = CHECKLIST.filter(function (c) { return done[c[0]]; }).length;
    $('ac-check-n').textContent = n + ' of ' + CHECKLIST.length + ' done';
    $('ac-bar').style.width = (n / CHECKLIST.length * 100) + '%';
  }
  $('ac-check').innerHTML = CHECKLIST.map(function (c) {
    return '<label class="su-check"><input type="checkbox" data-k="' + c[0] + '"' + (done[c[0]] ? ' checked' : '') + '><span>' + c[1] + '</span></label>';
  }).join('');
  $('ac-check').addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-k');
    if (!k) return;
    done[k] = e.target.checked;
    me.checklist = done;
    App.saveUser(me);
    renderCheck();
  });
  renderCheck();

  // callback request by email
  var interests = (p.interests || []).map(function (k) { return TOOLS[k] ? TOOLS[k][0] : k; }).join(', ');
  var body = 'Please call me back.\n\nName: ' + (p.fullName || '') + '\nMobile: ' + (p.mobile || '') + '\nCity: ' + (p.city || '') +
    '\nInterested in: ' + interests + '\nBest time: ' + (p.bestTime || '') + '\nPreferred contact: ' + (p.contactVia || '');
  $('ac-callback').href = 'mailto:hello@raven.business?subject=' + encodeURIComponent('Callback request – ' + (p.fullName || me.username)) + '&body=' + encodeURIComponent(body);
})();
