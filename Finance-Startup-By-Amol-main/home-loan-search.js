/* Home Loan Search (home-loans.html): validates the customer form, works out an
   indicative eligibility and lists the lender groups that usually fit the profile.
   Figures are rough estimates for a first conversation, not a lender's sanction. */
(function () {
  var form = document.getElementById('hl-form');
  var out = document.getElementById('hl-result');
  if (!form || !out) return;

  var MIN_AMOUNT = 100000, MAX_AMOUNT = 500000000, TENURE_YEARS = 20;

  // FOIR = share of income lenders allow towards EMIs; rate = typical starting rate (% p.a.)
  var EMP = {
    'sal-bank':        { label: 'Salaried – Bank Salary',            foir: 0.50, foirHigh: 0.60, rate: 8.50 },
    'sal-cash':        { label: 'Salaried – Cash Salary',            foir: 0.40, foirHigh: 0.45, rate: 11.50 },
    'sal-govt':        { label: 'Salaried – Government / PSU',       foir: 0.55, foirHigh: 0.65, rate: 8.40 },
    'sal-cheque':      { label: 'Salaried – Cheque Salary',          foir: 0.50, foirHigh: 0.55, rate: 8.75 },
    'se-business':     { label: 'Self-Employed – Business',          foir: 0.50, foirHigh: 0.60, rate: 9.25 },
    'se-professional': { label: 'Self-Employed – Professional',      foir: 0.55, foirHigh: 0.65, rate: 9.00 },
    'se-agri':         { label: 'Self-Employed – Agriculture / Farmer', foir: 0.40, foirHigh: 0.45, rate: 11.00 },
    'nri':             { label: 'NRI – Salaried / Business Abroad',  foir: 0.50, foirHigh: 0.60, rate: 9.00 },
    'pension':         { label: 'Pensioner / Retired',               foir: 0.40, foirHigh: 0.50, rate: 9.00, tenure: 10 }
  };

  // product = what to ask for; rateFloor = typical minimum rate for that property
  var PROP = {
    flat:          { label: 'Flat / Apartment',                  product: 'Home Loan (purchase)' },
    rowhouse:      { label: 'Row House / Bungalow',              product: 'Home Loan (purchase)' },
    plot:          { label: 'Plot',                              product: 'Plot / Land Loan', rateFloor: 9.00 },
    resale:        { label: 'Resale Property',                   product: 'Home Loan (resale purchase)' },
    na:            { label: 'NA-44 / NA-45 Property',            product: 'Home Loan / Plot Loan on NA land' },
    gaothan:       { label: 'Gaothan Property',                  product: 'Home Loan (Gaothan)', rateFloor: 10.50 },
    underconst:    { label: 'Under-Construction (Builder Project)', product: 'Home Loan (stage-wise disbursal)' },
    selfconst:     { label: 'Self-Construction on Own Plot',     product: 'Construction Loan' },
    plotconst:     { label: 'Plot + Construction',               product: 'Composite Loan (Plot + Construction)', rateFloor: 8.75 },
    gunthewari:    { label: 'Gunthewari / Regularised Property', product: 'Home Loan (affordable housing)', rateFloor: 10.50 },
    authority:     { label: 'MHADA / CIDCO / SRA Property',      product: 'Home Loan (with society / authority NOC)' },
    grampanchayat: { label: 'Gram Panchayat Property',           product: 'Home Loan (affordable housing)', rateFloor: 10.50 },
    commercial:    { label: 'Commercial Shop / Office',          product: 'Commercial Property Loan / LAP', rateFloor: 9.50 },
    other:         { label: 'Other',                             product: 'Our team will suggest the right product', rateFloor: 10.00 }
  };

  var FORMAL = ['sal-bank', 'sal-govt', 'sal-cheque', 'se-business', 'se-professional', 'nri', 'pension'];
  var MAINSTREAM_PROP = ['flat', 'rowhouse', 'plot', 'resale', 'na', 'underconst', 'selfconst', 'plotconst', 'authority'];

  var LENDERS = [
    { name: 'Public Sector Banks', eg: 'SBI, Bank of Maharashtra, Bank of Baroda, Union Bank', from: 8.25, minIncome: 20000,
      emp: { good: FORMAL, maybe: ['se-agri'] },
      prop: { good: MAINSTREAM_PROP, maybe: ['commercial'] } },
    { name: 'Private Banks', eg: 'HDFC Bank, ICICI Bank, Axis Bank, Kotak Mahindra Bank', from: 8.50, minIncome: 25000,
      emp: { good: ['sal-bank', 'sal-govt', 'sal-cheque', 'se-business', 'se-professional', 'nri'], maybe: ['pension'] },
      prop: { good: MAINSTREAM_PROP.concat('commercial'), maybe: [] } },
    { name: 'Housing Finance Companies', eg: 'LIC Housing Finance, Bajaj Housing Finance, PNB Housing, Tata Capital', from: 8.75, minIncome: 20000,
      emp: { good: FORMAL, maybe: ['sal-cash', 'se-agri'] },
      prop: { good: MAINSTREAM_PROP, maybe: ['gunthewari', 'commercial'] } },
    { name: 'Affordable Housing Finance', eg: 'Aavas, Aadhar Housing, Home First, India Shelter', from: 10.50, minIncome: 10000, maxLoan: 7500000,
      emp: { good: ['sal-bank', 'sal-cash', 'sal-cheque', 'se-business', 'se-agri', 'se-professional'], maybe: ['sal-govt', 'pension'] },
      prop: { good: ['flat', 'rowhouse', 'resale', 'na', 'gaothan', 'selfconst', 'plotconst', 'gunthewari', 'grampanchayat', 'authority'], maybe: ['plot', 'underconst'] } },
    { name: 'Small Finance Banks & NBFCs', eg: 'AU Small Finance Bank, Equitas, Ujjivan, Shriram Housing', from: 11.00, minIncome: 10000,
      emp: { good: Object.keys(EMP), maybe: [] },
      prop: { good: ['flat', 'rowhouse', 'resale', 'na', 'gaothan', 'selfconst', 'plotconst', 'gunthewari', 'grampanchayat', 'commercial', 'other'], maybe: ['plot', 'underconst', 'authority'] } }
  ];

  var KYC = 'KYC – PAN card, Aadhaar card, photographs';
  var PROPERTY_DOCS = 'Property papers – agreement / sale deed, 7/12 or property card, approved plan, NOC';
  var DOCS = {
    'sal-bank':        ['Last 3 months salary slips', '6 months salary bank statement', 'Form 16 / ITR for 2 years'],
    'sal-cash':        ['Salary certificate from employer', 'Employer ID card / appointment letter', '6–12 months bank statement'],
    'sal-govt':        ['Last 3 months salary slips', '6 months salary bank statement', 'Form 16 for 2 years'],
    'sal-cheque':      ['Last 3 months salary slips', '6 months bank statement showing cheque credits', 'Form 16 / ITR for 2 years'],
    'se-business':     ['ITR with computation for 2–3 years', 'CA-certified P&L and balance sheet', '12 months business bank statement', 'Business proof – GST / Udyam / Shop Act'],
    'se-professional': ['Degree / professional registration certificate', 'ITR with computation for 2–3 years', '12 months bank statement'],
    'se-agri':         ['7/12 extract and 8A', 'Agriculture income certificate', '12 months bank statement'],
    'nri':             ['Passport, visa / work permit', 'Overseas salary slips or employment contract', 'NRE / NRO bank statements', 'Power of attorney for India'],
    'pension':         ['Pension payment order', '12 months pension bank statement', 'Co-applicant income proof (if any)']
  };

  var nameEl = document.getElementById('hl-name');
  var empEl = document.getElementById('hl-emp');
  var incEl = document.getElementById('hl-income');
  var propEl = document.getElementById('hl-prop');
  var amtEl = document.getElementById('hl-amount');
  var words = document.getElementById('hl-amount-words');

  function inr(n) {
    var s = String(Math.round(n));
    if (s.length <= 3) return s;
    var last = s.slice(-3), rest = s.slice(0, -3);
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last;
  }
  function short(n) {
    if (n >= 10000000) return '₹' + trim(n / 10000000) + ' Crore';
    if (n >= 100000) return '₹' + trim(n / 100000) + ' Lakh';
    return '₹' + inr(n);
  }
  function trim(x) { return x.toFixed(2).replace(/\.?0+$/, ''); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function amount() { return parseInt(amtEl.value.replace(/\D/g, ''), 10) || 0; }

  // live Indian comma formatting + amount in words
  amtEl.addEventListener('input', function () {
    var digits = amtEl.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
    amtEl.value = digits ? inr(+digits) : '';
    words.textContent = digits ? short(+digits) : '';
    if (form.classList.contains('was-checked')) check();
  });
  [nameEl, empEl, incEl, propEl].forEach(function (el) {
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () {
      if (form.classList.contains('was-checked')) check();
    });
  });

  function setErr(el, bad) {
    el.classList.toggle('is-bad', bad);
    el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    var msg = form.querySelector('.hl-err[data-for="' + el.id + '"]');
    if (msg) msg.classList.toggle('is-on', bad);
    return bad;
  }
  function check() {
    var a = amount();
    var bad = [
      setErr(nameEl, nameEl.value.trim().length < 2) && nameEl,
      setErr(empEl, !empEl.value) && empEl,
      setErr(incEl, !incEl.value) && incEl,
      setErr(propEl, !propEl.value) && propEl,
      setErr(amtEl, a < MIN_AMOUNT || a > MAX_AMOUNT) && amtEl
    ].filter(Boolean);
    return bad;
  }

  function emi(p, ratePa, years) {
    var r = ratePa / 1200, n = years * 12;
    return p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  }
  function principalFor(emiAmt, ratePa, years) {
    var r = ratePa / 1200, n = years * 12;
    return emiAmt * (1 - Math.pow(1 + r, -n)) / r;
  }
  // RBI loan-to-value caps for housing loans
  function maxLtv(a) { return a <= 3000000 ? 90 : a <= 7500000 ? 80 : 75; }

  function fit(l, emp, prop, income, a) {
    var e = l.emp.good.indexOf(emp) !== -1 ? 2 : l.emp.maybe.indexOf(emp) !== -1 ? 1 : 0;
    var p = l.prop.good.indexOf(prop) !== -1 ? 2 : l.prop.maybe.indexOf(prop) !== -1 ? 1 : 0;
    if (!e || !p || income < l.minIncome * 0.75) return 0;
    var score = Math.min(e, p);
    if (income < l.minIncome) score = 1;
    if (l.maxLoan && a > l.maxLoan) score = Math.min(score, 1);
    return score;
  }

  function render() {
    var name = nameEl.value.trim();
    var emp = EMP[empEl.value], prop = PROP[propEl.value];
    var income = +incEl.value, a = amount();
    var rate = Math.max(emp.rate, prop.rateFloor || 0);
    var years = emp.tenure || TENURE_YEARS;
    var foir = income >= 75000 ? emp.foirHigh : emp.foir;
    var capacity = income * foir;
    var eligible = Math.floor(principalFor(capacity, rate, years) / 10000) * 10000;
    var reqEmi = emi(a, rate, years);
    var ok = a <= eligible;
    var ltv = maxLtv(a);

    var matches = LENDERS.map(function (l) {
      return { l: l, s: fit(l, empEl.value, propEl.value, income, a) };
    }).filter(function (m) { return m.s; })
      .sort(function (x, y) { return y.s - x.s || x.l.from - y.l.from; });

    var html = '';
    html += '<div class="hl-rhead"><div><p class="hl-kicker">Indicative result</p>' +
      '<h3>Home loan options for ' + esc(name) + '</h3>' +
      '<p class="hl-rsub">' + esc(emp.label) + ' · ' + esc(prop.label) + ' · Income from ₹' + inr(income) + '/month</p></div>' +
      '<button type="button" class="hl-edit" id="hl-edit">Edit details</button></div>';

    html += '<div class="hl-stats">' +
      stat('Estimated eligibility', short(eligible), years + ' yrs at ~' + trim(rate) + '% p.a.') +
      stat('Required loan', short(a), '₹' + inr(a)) +
      stat('Approx. EMI', '₹' + inr(reqEmi) + '/mo', 'for the required loan') +
      '</div>';

    html += '<div class="hl-verdict ' + (ok ? 'is-ok' : 'is-warn') + '">' + (ok
      ? '<strong>Within estimated eligibility.</strong> The required amount fits the customer\'s income on a ' + years + '-year tenure.'
      : '<strong>Above estimated eligibility by ' + short(a - eligible) + '.</strong> Add an earning co-applicant, choose a longer tenure, or show additional income to close the gap.') +
      '</div>';

    html += '<div class="hl-grid2"><div class="hl-box"><h4>Suggested product</h4><p class="hl-product">' + esc(prop.product) + '</p>' +
      '<p class="hl-note">Lenders fund up to <strong>' + ltv + '%</strong> of the property value for this loan size, so the customer needs at least ' + (100 - ltv) + '% as own contribution (property value of about ' + short(a / ltv * 100) + ' or more).</p></div>';
    html += '<div class="hl-box"><h4>Documents to keep ready</h4><ul class="hl-docs">' +
      [KYC].concat(DOCS[empEl.value], PROPERTY_DOCS).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') +
      '</ul></div></div>';

    html += '<h4 class="hl-lh">Lenders that usually fit (' + matches.length + ')</h4>';
    if (matches.length) {
      html += '<div class="hl-lenders">' + matches.map(function (m) {
        return '<div class="hl-lender"><div class="hl-lender-top"><h5>' + esc(m.l.name) + '</h5>' +
          '<span class="hl-fit ' + (m.s === 2 ? 'is-good' : 'is-maybe') + '">' + (m.s === 2 ? 'Good fit' : 'Possible') + '</span></div>' +
          '<p>' + esc(m.l.eg) + '</p><p class="hl-rate">Rates from ~' + trim(m.l.from) + '% p.a.</p></div>';
      }).join('') + '</div>';
    } else {
      html += '<p class="hl-none">No standard lender group matches this profile directly. Our team handles special cases like this – share the details and we will find a route.</p>';
    }

    var body = 'Home loan enquiry\n\nCustomer: ' + name + '\nEmployment: ' + emp.label +
      '\nMonthly income: from Rs ' + inr(income) + '\nProperty type: ' + prop.label +
      '\nRequired loan: Rs ' + inr(a) + '\nEstimated eligibility: Rs ' + inr(eligible);
    html += '<div class="hl-cta"><a class="hl-submit" href="mailto:hello@raven.business?subject=' +
      encodeURIComponent('Home loan enquiry – ' + name) + '&body=' + encodeURIComponent(body) + '">Send to RAVEN team</a>' +
      '<a class="hl-reset" href="contact.html">Talk to our team</a></div>';
    html += '<p class="hl-disc">Indicative only. Final eligibility, rate and amount depend on the lender\'s policy, CIBIL score, age, existing EMIs, property valuation and legal checks.</p>';

    out.innerHTML = html;
    if (window.RavenApp) RavenApp.onResult({
      kind: 'home', out: out,
      values: { name: name, employment: empEl.value, income: incEl.value, property: propEl.value, amount: a },
      labels: { employment: emp.label, property: prop.label },
      headline: 'Eligibility ' + short(eligible) + ' · ' + prop.product,
      details: ['Required ' + short(a) + ' · EMI ₹' + inr(reqEmi) + '/mo at ~' + trim(rate) + '%',
        'Best fit: ' + (matches.filter(function (m) { return m.s === 2; }).map(function (m) { return m.l.name; }).join(', ') || 'our team to advise')]
    });
    out.hidden = false;
    form.hidden = true;
    document.getElementById('hl-edit').addEventListener('click', function () {
      out.hidden = true;
      form.hidden = false;
      nameEl.focus();
    });
    out.focus({ preventScroll: true });
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function stat(k, v, s) {
    return '<div class="hl-stat"><p class="hl-sk">' + k + '</p><p class="hl-sv">' + v + '</p><p class="hl-ss">' + s + '</p></div>';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.classList.add('was-checked');
    var bad = check();
    if (bad.length) { bad[0].focus(); return; }
    render();
  });
  form.addEventListener('reset', function () {
    form.classList.remove('was-checked');
    words.textContent = '';
    [nameEl, empEl, incEl, propEl, amtEl].forEach(function (el) { setErr(el, false); });
  });

  if (window.RavenApp) RavenApp.prefill(form, 'home');
})();
