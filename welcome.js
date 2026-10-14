/* First-time setup after registering (welcome.html). Asks customers and agents different
   questions, saves them to the profile, then sends them to their home screen.
   ?edit=1 reopens it with the saved answers to update the profile. */
(function () {
  var App = window.RavenApp;
  var root = document.getElementById('ob');
  if (!App || !root) return;
  var u = App.current();
  if (!u) { location.replace('signup.html'); return; }
  var editing = App.param('edit') === '1';
  if (u.onboarded && !editing) { location.replace(App.home(u)); return; }

  var LANG = [['en', 'English'], ['mr', 'मराठी (Marathi)'], ['hi', 'हिंदी (Hindi)']];
  var PRODUCTS = [['home', 'Home Loan'], ['personal', 'Personal Loan'], ['business', 'Business Loan'], ['gold', 'Gold Loan'],
    ['vehicle', 'Vehicle Loan'], ['education', 'Education Loan'], ['account', 'Bank Account'], ['registration', 'Business Registration'],
    ['insurance', 'Insurance'], ['realestate', 'Real Estate']];
  var CONTACT = [['call', 'Phone call'], ['whatsapp', 'WhatsApp'], ['email', 'Email']];

  var STEPS = {
    customer: [
      { title: 'About you', short: 'Name, mobile and city', sub: 'So we can address you properly and pre-fill your searches.', fields: [
        { n: 'fullName', l: 'Full name', t: 'text', req: 1, ph: 'Your full name', ac: 'name' },
        { n: 'mobile', l: 'Mobile number', t: 'tel', req: 1, ph: '10-digit mobile number', ac: 'tel' },
        { n: 'email', l: 'Email (optional)', t: 'email', ph: 'you@example.com', ac: 'email' },
        { n: 'city', l: 'City', t: 'text', req: 1, ph: 'e.g. Pune', ac: 'address-level2' },
        { n: 'language', l: 'Preferred language', t: 'select', req: 1, o: LANG }
      ] },
      { title: 'What are you looking for?', short: 'Products and timeline', sub: 'Pick everything that applies – we will show these first.', fields: [
        { n: 'interests', l: 'I am interested in', t: 'chips', req: 1, o: PRODUCTS, full: 1 },
        { n: 'employment', l: 'Employment type', t: 'select', req: 1, o: [['sal-bank', 'Salaried – Bank Salary'], ['sal-cash', 'Salaried – Cash Salary'],
          ['se-business', 'Self-Employed – Business'], ['se-professional', 'Self-Employed – Professional'], ['student', 'Student'], ['retired', 'Retired / Pensioner'], ['homemaker', 'Homemaker'], ['other', 'Other']] },
        { n: 'income', l: 'Monthly income (optional)', t: 'select', o: [['lt25', 'Below ₹25,000'], ['25to50', '₹25,000 – ₹50,000'], ['50to100', '₹50,000 – ₹1,00,000'], ['gt100', 'Above ₹1,00,000'], ['na', 'Prefer not to say']] },
        { n: 'timeline', l: 'When do you need it?', t: 'radio', req: 1, full: 1, o: [['now', 'Immediately'], ['1m', 'Within 1 month'], ['3m', '1–3 months'], ['explore', 'Just exploring']] }
      ] },
      { title: 'How should we reach you?', short: 'Contact preferences', sub: 'We only contact you about your own enquiries.', fields: [
        { n: 'contactVia', l: 'Preferred contact', t: 'radio', req: 1, full: 1, o: CONTACT },
        { n: 'bestTime', l: 'Best time to call', t: 'select', req: 1, o: [['morning', 'Morning (9–12)'], ['afternoon', 'Afternoon (12–4)'], ['evening', 'Evening (4–8)'], ['any', 'Any time']] },
        { n: 'source', l: 'How did you hear about us? (optional)', t: 'select', o: [['google', 'Google search'], ['friend', 'Friend / family'], ['social', 'Social media'], ['agent', 'An agent referred me'], ['other', 'Other']] },
        { n: 'consent', l: 'I agree that RAVEN may contact me about my enquiries on the number above.', t: 'check', req: 1, full: 1 }
      ] }
    ],
    agent: [
      { title: 'About you', short: 'Name, contact and city', sub: 'Shown on your dashboard and on the enquiries you send us.', fields: [
        { n: 'fullName', l: 'Full name', t: 'text', req: 1, ph: 'Your full name', ac: 'name' },
        { n: 'mobile', l: 'Mobile number', t: 'tel', req: 1, ph: '10-digit mobile number', ac: 'tel' },
        { n: 'email', l: 'Email', t: 'email', req: 1, ph: 'you@example.com', ac: 'email' },
        { n: 'city', l: 'Base city', t: 'text', req: 1, ph: 'e.g. Chhatrapati Sambhajinagar', ac: 'address-level2' },
        { n: 'areas', l: 'Areas you serve (optional)', t: 'text', ph: 'e.g. Pune, Ahilyanagar, Nashik', full: 1 }
      ] },
      { title: 'Your work', short: 'Role, products and lenders', sub: 'Helps us route the right cases and lenders to you.', fields: [
        { n: 'agentType', l: 'You work as', t: 'select', req: 1, o: [['dsa', 'DSA / Loan Connector'], ['ifa', 'Independent Financial Advisor'], ['bank', 'Bank / NBFC Sales Executive'],
          ['posp', 'Insurance Agent (POSP)'], ['ca', 'CA / Tax Consultant'], ['broker', 'Real Estate Broker'], ['other', 'Other']] },
        { n: 'experience', l: 'Experience', t: 'select', req: 1, o: [['lt1', 'Less than 1 Year'], ['1to3', '1–3 Years'], ['3to5', '3–5 Years'], ['gt5', 'More than 5 Years']] },
        { n: 'firm', l: 'Agency / firm name (optional)', t: 'text', ph: 'e.g. Shree Finance Services', ac: 'organization' },
        { n: 'code', l: 'DSA / partner code (optional)', t: 'text', ph: 'If you have one' },
        { n: 'products', l: 'Products you handle', t: 'chips', req: 1, o: PRODUCTS, full: 1 },
        { n: 'lenders', l: 'Lenders you already work with (optional)', t: 'chips', full: 1, o: [['sbi', 'SBI'], ['hdfc', 'HDFC Bank'], ['icici', 'ICICI Bank'], ['axis', 'Axis Bank'],
          ['kotak', 'Kotak'], ['bom', 'Bank of Maharashtra'], ['bajaj', 'Bajaj Finserv'], ['tata', 'Tata Capital'], ['lichfl', 'LIC Housing'], ['muthoot', 'Muthoot'], ['other', 'Other']] },
        { n: 'volume', l: 'Cases per month', t: 'select', req: 1, o: [['1to5', '1–5'], ['6to15', '6–15'], ['16to30', '16–30'], ['gt30', 'More than 30']] }
      ] },
      { title: 'Preferences', short: 'Language and consent', sub: 'Almost done.', fields: [
        { n: 'language', l: 'Preferred language', t: 'select', req: 1, o: LANG },
        { n: 'contactVia', l: 'How should RAVEN reach you?', t: 'radio', req: 1, full: 1, o: CONTACT },
        { n: 'consent', l: 'I confirm my details are correct, and I will only add client information with the client’s consent.', t: 'check', req: 1, full: 1 }
      ] }
    ]
  };

  var steps = STEPS[u.role] || STEPS.customer;
  var data = Object.assign({}, u.profile);
  var at = 0, dir = 1;
  var esc = App.esc, agent = u.role === 'agent';
  var TYPE = { dsa: 'DSA / Loan Connector', ifa: 'Financial Advisor', bank: 'Bank / NBFC Sales', posp: 'Insurance Agent', ca: 'CA / Tax Consultant', broker: 'Real Estate Broker', other: 'Agent' };
  document.getElementById('ob-pitch').textContent = editing ? 'Update your profile' : agent ? 'Set up your agent workspace' : 'Let’s personalise RAVEN for you';
  document.getElementById('ob-pitch-sub').textContent = editing ? 'Change anything and save – your dashboard updates instantly.' : agent ? 'Three quick steps and your client dashboard is ready.' : 'Three quick steps so your searches are pre-filled and easy to save.';
  document.getElementById('ob-out').addEventListener('click', function (e) { e.preventDefault(); App.logout(); location.href = 'index.html'; });

  function field(f) {
    var id = 'ob-' + f.n, v = data[f.n], full = f.full ? ' ob-full' : '';
    if (f.t === 'check') {
      return '<div class="ap-field' + full + '"><label class="ap-check"><input type="checkbox" id="' + id + '" name="' + f.n + '"' + (v ? ' checked' : '') + '><span>' + esc(f.l) + '</span></label>' + err(f) + '</div>';
    }
    if (f.t === 'chips' || f.t === 'radio') {
      var multi = f.t === 'chips', sel = multi ? (v || []) : [v];
      return '<div class="ap-field' + full + '"><p class="ap-label" id="' + id + '-l">' + esc(f.l) + '</p><div class="ob-chips" role="group" aria-labelledby="' + id + '-l">' +
        f.o.map(function (o) {
          return '<label class="ob-chip"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + f.n + '" value="' + o[0] + '"' + (sel.indexOf(o[0]) !== -1 ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
        }).join('') + '</div>' + err(f) + '</div>';
    }
    var h = '<div class="ap-field' + full + '"><label for="' + id + '">' + esc(f.l) + '</label>';
    if (f.t === 'select') {
      h += '<select id="' + id + '" name="' + f.n + '" class="ap-input"><option value="">Select</option>' +
        f.o.map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    } else {
      h += '<input id="' + id + '" name="' + f.n + '" class="ap-input" type="' + f.t + '" placeholder="' + esc(f.ph || '') + '"' +
        (f.ac ? ' autocomplete="' + f.ac + '"' : '') + (f.t === 'tel' ? ' inputmode="tel" maxlength="16"' : '') + ' value="' + esc(v || '') + '">';
    }
    return h + err(f) + '</div>';
  }
  function err(f) {
    var m = f.t === 'tel' ? 'Enter a valid 10-digit mobile number.' : f.t === 'email' ? 'Enter a valid email address.'
      : f.t === 'chips' ? 'Pick at least one.' : f.t === 'check' ? 'Please tick this to continue.' : 'This is required.';
    return '<p class="ap-err" data-for="' + f.n + '">' + m + '</p>';
  }

  function renderSteps() {
    document.getElementById('ob-steps').innerHTML = steps.map(function (s, i) {
      var cls = i < at ? 'is-done' : i === at ? 'is-on' : '';
      return '<li class="' + cls + '"' + (i === at ? ' aria-current="step"' : '') + '><span>' + (i < at ? '✓' : i + 1) + '</span><div class="t"><strong>' + esc(s.title) + '</strong><small>' + esc(s.short) + '</small></div></li>';
    }).join('');
  }
  function preview() {
    var name = data.fullName || u.username;
    document.getElementById('ob-preview').innerHTML = (window.RavenUI ? RavenUI.avatar(name) : '') +
      '<div style="min-width:0"><strong>' + esc(name) + '</strong><small>' + esc([agent ? (TYPE[data.agentType] || 'Agent') : 'Customer', data.city].filter(Boolean).join(' · ')) + '</small></div>';
  }

  function render() {
    var s = steps[at], last = at === steps.length - 1;
    root.innerHTML =
      '<p class="ob-kicker">Step ' + (at + 1) + ' of ' + steps.length + ' · ' + (agent ? 'Agent account' : 'Customer account') + '</p>' +
      '<h1 style="margin-top:.35rem">' + esc(s.title) + '</h1><p class="au-sub" style="margin-bottom:0">' + esc(s.sub) + '</p>' +
      '<form class="ob-form ' + (dir > 0 ? 'is-enter' : 'is-back') + '" novalidate>' + s.fields.map(field).join('') +
      '<div class="ob-actions ob-full">' + (at ? '<button type="button" class="ap-btn" data-back>Back</button>' : '') +
      '<button type="submit" class="au-submit"><span class="lbl">' + (last ? (editing ? 'Save profile' : 'Finish setup') : 'Continue') + '</span><span class="spin" aria-hidden="true"></span></button></div></form>';
    var form = root.querySelector('form');
    form.addEventListener('submit', function (e) { e.preventDefault(); if (collect(form, true)) go(1); else { root.classList.remove('is-shake'); void root.offsetWidth; root.classList.add('is-shake'); } });
    form.addEventListener('input', function () { collect(form, false); preview(); });
    form.addEventListener('change', function () { collect(form, false); preview(); });
    var back = form.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () { collect(form, false); go(-1); });
    renderSteps();
    preview();
    var first = form.querySelector('input:not([type=checkbox]):not([type=radio]), select');
    if (first && (at || editing)) first.focus({ preventScroll: true });
  }

  function collect(form, validate) {
    var bad = null;
    steps[at].fields.forEach(function (f) {
      var v;
      if (f.t === 'chips') v = Array.prototype.map.call(form.querySelectorAll('[name="' + f.n + '"]:checked'), function (i) { return i.value; });
      else if (f.t === 'radio') { var r = form.querySelector('[name="' + f.n + '"]:checked'); v = r ? r.value : ''; }
      else if (f.t === 'check') v = form.querySelector('[name="' + f.n + '"]').checked;
      else v = form.querySelector('[name="' + f.n + '"]').value.trim();
      if (f.t === 'tel' && v && validate) v = v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      var wrong = false;
      if (f.req && (!v || (Array.isArray(v) && !v.length))) wrong = true;
      if (f.n === 'fullName' && v && v.length < 2) wrong = true;
      if (f.t === 'tel' && v && !/^[6-9]\d{9}$/.test(String(v).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))) wrong = true;
      if (f.t === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) wrong = true;
      data[f.n] = v;
      if (validate) {
        var e = form.querySelector('.ap-err[data-for="' + f.n + '"]');
        if (e) e.classList.toggle('is-on', wrong);
        var el = form.querySelector('[name="' + f.n + '"]');
        if (el && el.classList.contains('ap-input')) el.classList.toggle('is-bad', wrong);
        if (wrong && !bad) bad = el;
      }
    });
    if (bad) bad.focus();
    return !bad;
  }

  function go(d) {
    dir = d;
    at += d;
    if (at < steps.length) { render(); if (window.innerWidth < 1024) root.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    at = steps.length;
    var fresh = !u.onboarded;
    u.profile = data;
    u.onboarded = true;
    if (agent && !u.verification) u.verification = 'pending';
    App.saveUser(u);
    renderSteps();
    var first = (data.fullName || u.username).split(' ')[0];
    root.innerHTML = '<div class="au-done"><span class="ring"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span>' +
      '<h2>' + (editing ? 'Profile saved' : 'You’re all set, ' + esc(first) + '!') + '</h2><p>' + (agent ? 'Opening your agent dashboard…' : 'Opening your account…') + '</p>' +
      '<a class="ap-btn is-primary" href="' + App.home(u) + (fresh ? '?welcome=1' : '') + '">Continue</a></div>';
    setTimeout(function () { location.href = App.home(u) + (fresh ? '?welcome=1' : ''); }, 1400);
  }

  render();
})();
