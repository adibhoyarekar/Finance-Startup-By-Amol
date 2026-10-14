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
      { title: 'About you', sub: 'So we can address you properly and pre-fill your searches.', fields: [
        { n: 'fullName', l: 'Full name', t: 'text', req: 1, ph: 'Your full name', ac: 'name' },
        { n: 'mobile', l: 'Mobile number', t: 'tel', req: 1, ph: '10-digit mobile number', ac: 'tel' },
        { n: 'email', l: 'Email (optional)', t: 'email', ph: 'you@example.com', ac: 'email' },
        { n: 'city', l: 'City', t: 'text', req: 1, ph: 'e.g. Pune', ac: 'address-level2' },
        { n: 'language', l: 'Preferred language', t: 'select', req: 1, o: LANG }
      ] },
      { title: 'What are you looking for?', sub: 'Pick everything that applies – we will show these first.', fields: [
        { n: 'interests', l: 'I am interested in', t: 'chips', req: 1, o: PRODUCTS, full: 1 },
        { n: 'employment', l: 'Employment type', t: 'select', req: 1, o: [['sal-bank', 'Salaried – Bank Salary'], ['sal-cash', 'Salaried – Cash Salary'],
          ['se-business', 'Self-Employed – Business'], ['se-professional', 'Self-Employed – Professional'], ['student', 'Student'], ['retired', 'Retired / Pensioner'], ['homemaker', 'Homemaker'], ['other', 'Other']] },
        { n: 'income', l: 'Monthly income (optional)', t: 'select', o: [['lt25', 'Below ₹25,000'], ['25to50', '₹25,000 – ₹50,000'], ['50to100', '₹50,000 – ₹1,00,000'], ['gt100', 'Above ₹1,00,000'], ['na', 'Prefer not to say']] },
        { n: 'timeline', l: 'When do you need it?', t: 'radio', req: 1, full: 1, o: [['now', 'Immediately'], ['1m', 'Within 1 month'], ['3m', '1–3 months'], ['explore', 'Just exploring']] }
      ] },
      { title: 'How should we reach you?', sub: 'We only contact you about your own enquiries.', fields: [
        { n: 'contactVia', l: 'Preferred contact', t: 'radio', req: 1, full: 1, o: CONTACT },
        { n: 'bestTime', l: 'Best time to call', t: 'select', req: 1, o: [['morning', 'Morning (9–12)'], ['afternoon', 'Afternoon (12–4)'], ['evening', 'Evening (4–8)'], ['any', 'Any time']] },
        { n: 'source', l: 'How did you hear about us? (optional)', t: 'select', o: [['google', 'Google search'], ['friend', 'Friend / family'], ['social', 'Social media'], ['agent', 'An agent referred me'], ['other', 'Other']] },
        { n: 'consent', l: 'I agree that RAVEN may contact me about my enquiries on the number above.', t: 'check', req: 1, full: 1 }
      ] }
    ],
    agent: [
      { title: 'About you', sub: 'Shown on your dashboard and on the enquiries you send us.', fields: [
        { n: 'fullName', l: 'Full name', t: 'text', req: 1, ph: 'Your full name', ac: 'name' },
        { n: 'mobile', l: 'Mobile number', t: 'tel', req: 1, ph: '10-digit mobile number', ac: 'tel' },
        { n: 'email', l: 'Email', t: 'email', req: 1, ph: 'you@example.com', ac: 'email' },
        { n: 'city', l: 'Base city', t: 'text', req: 1, ph: 'e.g. Chhatrapati Sambhajinagar', ac: 'address-level2' },
        { n: 'areas', l: 'Areas you serve (optional)', t: 'text', ph: 'e.g. Pune, Ahilyanagar, Nashik', full: 1 }
      ] },
      { title: 'Your work', sub: 'Helps us route the right cases and lenders to you.', fields: [
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
      { title: 'Preferences', sub: 'Almost done.', fields: [
        { n: 'language', l: 'Preferred language', t: 'select', req: 1, o: LANG },
        { n: 'contactVia', l: 'How should RAVEN reach you?', t: 'radio', req: 1, full: 1, o: CONTACT },
        { n: 'consent', l: 'I confirm my details are correct, and I will only add client information with the client’s consent.', t: 'check', req: 1, full: 1 }
      ] }
    ]
  };

  var steps = STEPS[u.role] || STEPS.customer;
  var data = Object.assign({}, u.profile);
  var at = 0;
  var esc = App.esc;

  function field(f) {
    var id = 'ob-' + f.n, v = data[f.n], h = '<div class="hl-field' + (f.full ? ' hl-full' : '') + '">';
    if (f.t === 'check') {
      return h + '<label class="su-check"><input type="checkbox" id="' + id + '" name="' + f.n + '"' + (v ? ' checked' : '') + '><span>' + esc(f.l) + '</span></label>' + err(f) + '</div>';
    }
    if (f.t === 'chips' || f.t === 'radio') {
      var multi = f.t === 'chips', sel = multi ? (v || []) : [v];
      return h + '<p class="ob-label" id="' + id + '-l">' + esc(f.l) + '</p><div class="ob-chips" role="group" aria-labelledby="' + id + '-l">' +
        f.o.map(function (o) {
          return '<label class="ob-chip"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + f.n + '" value="' + o[0] + '"' +
            (sel.indexOf(o[0]) !== -1 ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
        }).join('') + '</div>' + err(f) + '</div>';
    }
    h += '<label for="' + id + '">' + esc(f.l) + '</label>';
    if (f.t === 'select') {
      h += '<select id="' + id + '" name="' + f.n + '" class="rv-input hl-select"' + (f.req ? ' required' : '') + '><option value="">Select</option>' +
        f.o.map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    } else {
      h += '<input id="' + id + '" name="' + f.n + '" class="rv-input" type="' + f.t + '" placeholder="' + esc(f.ph || '') + '"' +
        (f.ac ? ' autocomplete="' + f.ac + '"' : '') + (f.t === 'tel' ? ' inputmode="tel" maxlength="16"' : '') + ' value="' + esc(v || '') + '">';
    }
    return h + err(f) + '</div>';
  }
  function err(f) {
    var m = f.t === 'tel' ? 'Enter a valid 10-digit mobile number.' : f.t === 'email' ? 'Enter a valid email address.'
      : f.t === 'chips' ? 'Pick at least one.' : f.t === 'check' ? 'Please tick this to continue.' : 'This is required.';
    return '<p class="hl-err" data-for="' + f.n + '">' + m + '</p>';
  }

  function render() {
    var s = steps[at];
    root.innerHTML =
      '<div class="ob-progress" aria-hidden="true">' + steps.map(function (x, i) { return '<span class="' + (i <= at ? 'is-on' : '') + '"></span>'; }).join('') + '</div>' +
      '<p class="hl-kicker">Step ' + (at + 1) + ' of ' + steps.length + (u.role === 'agent' ? ' · Agent account' : ' · Customer account') + '</p>' +
      '<h2 class="hl-title">' + esc(s.title) + '</h2><p class="hl-sub">' + esc(s.sub) + '</p>' +
      '<form class="hl-form ob-form" novalidate>' + s.fields.map(field).join('') +
      '<div class="hl-full hl-actions">' + (at ? '<button type="button" class="hl-reset" data-back>Back</button>' : '') +
      '<button type="submit" class="hl-submit ob-next">' + (at === steps.length - 1 ? (editing ? 'Save profile' : 'Finish setup') : 'Continue') + '</button></div></form>';
    var form = root.querySelector('form');
    form.addEventListener('submit', function (e) { e.preventDefault(); if (collect(form, true)) go(1); });
    var back = form.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () { collect(form, false); go(-1); });
    var first = form.querySelector('input:not([type=checkbox]):not([type=radio]), select');
    if (first && at) first.focus();
  }

  function collect(form, validate) {
    var bad = null;
    steps[at].fields.forEach(function (f) {
      var v;
      if (f.t === 'chips') v = Array.prototype.map.call(form.querySelectorAll('[name="' + f.n + '"]:checked'), function (i) { return i.value; });
      else if (f.t === 'radio') { var r = form.querySelector('[name="' + f.n + '"]:checked'); v = r ? r.value : ''; }
      else if (f.t === 'check') v = form.querySelector('[name="' + f.n + '"]').checked;
      else v = form.querySelector('[name="' + f.n + '"]').value.trim();
      if (f.t === 'tel' && v) v = v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      var wrong = false;
      if (f.req && (!v || (Array.isArray(v) && !v.length))) wrong = true;
      if (f.n === 'fullName' && v && v.length < 2) wrong = true;
      if (f.t === 'tel' && v && !/^[6-9]\d{9}$/.test(v)) wrong = true;
      if (f.t === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) wrong = true;
      data[f.n] = v;
      if (validate) {
        var e = form.querySelector('.hl-err[data-for="' + f.n + '"]');
        if (e) e.classList.toggle('is-on', wrong);
        var el = form.querySelector('[name="' + f.n + '"]');
        if (el && el.classList.contains('rv-input')) el.classList.toggle('is-bad', wrong);
        if (wrong && !bad) bad = el;
      }
    });
    if (bad) bad.focus();
    return !bad;
  }

  function go(d) {
    at += d;
    if (at < steps.length) { render(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var fresh = !u.onboarded;
    u.profile = data;
    u.onboarded = true;
    if (u.role === 'agent' && !u.verification) u.verification = 'pending';
    App.saveUser(u);
    location.href = App.home(u) + (fresh ? '?welcome=1' : '');
  }

  render();
})();
