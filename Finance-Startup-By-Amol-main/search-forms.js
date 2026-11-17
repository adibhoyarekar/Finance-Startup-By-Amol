/* Search forms for business, personal and gold loans and bank account opening.
   Each <form data-search="..."> is validated here, then its renderer below turns the
   answers into an indicative result. Figures are rough estimates for a first
   conversation, not a lender's sanction. Home loans use home-loan-search.js. */
(function () {
  var forms = document.querySelectorAll('form[data-search]');
  if (!forms.length) return;

  // Assumed 24K gold rate in ₹ per gram (about the April 2026 level). Update when the market moves.
  var GOLD_RATE_24K = 15000;

  /* ---------- helpers ---------- */
  function inr(n) {
    var s = String(Math.round(n));
    if (s.length <= 3) return s;
    var last = s.slice(-3), rest = s.slice(0, -3);
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last;
  }
  function trim(x) { return x.toFixed(2).replace(/\.?0+$/, ''); }
  function short(n) {
    if (n >= 10000000) return '₹' + trim(n / 10000000) + ' Crore';
    if (n >= 100000) return '₹' + trim(n / 100000) + ' Lakh';
    return '₹' + inr(n);
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function emi(p, ratePa, months) {
    var r = ratePa / 1200;
    return p * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  }
  function principalFor(emiAmt, ratePa, months) {
    var r = ratePa / 1200;
    return emiAmt * (1 - Math.pow(1 + r, -months)) / r;
  }
  function floor10k(n) { return Math.max(0, Math.floor(n / 10000) * 10000); }
  function rank(v, order) { return order.indexOf(v); }

  function stat(k, v, s) {
    return '<div class="hl-stat"><p class="hl-sk">' + k + '</p><p class="hl-sv">' + v + '</p><p class="hl-ss">' + s + '</p></div>';
  }
  function stats(list) { return '<div class="hl-stats">' + list.join('') + '</div>'; }
  function verdict(ok, html) { return '<div class="hl-verdict ' + (ok ? 'is-ok' : 'is-warn') + '">' + html + '</div>'; }
  function box(title, inner) { return '<div class="hl-box"><h4>' + title + '</h4>' + inner + '</div>'; }
  function bullets(items) {
    return '<ul class="hl-docs">' + items.map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul>';
  }
  function product(name, note) {
    return '<p class="hl-product">' + esc(name) + '</p>' + (note ? '<p class="hl-note">' + note + '</p>' : '');
  }
  // groups: [{ name, eg, rate, note, s }] where s = 2 good fit, 1 possible, 0 hidden
  function lenders(title, groups, emptyText) {
    var list = groups.filter(function (g) { return g.s; })
      .sort(function (a, b) { return b.s - a.s || (a.from || 0) - (b.from || 0); });
    var html = '<h4 class="hl-lh">' + title + ' (' + list.length + ')</h4>';
    if (!list.length) return html + '<p class="hl-none">' + emptyText + '</p>';
    return html + '<div class="hl-lenders">' + list.map(function (g) {
      return '<div class="hl-lender">' +
        '<div class="hl-lender-top">' + (g.logo ? '<img class="hl-logo" src="' + g.logo + '" alt="" width="36" height="36" loading="lazy">' : '') +
        '<h5>' + esc(g.name) + '</h5>' +
        '<span class="hl-fit ' + (g.s === 2 ? 'is-good' : 'is-maybe') + '">' + (g.s === 2 ? 'Good fit' : 'Possible') + '</span></div>' +
        (g.eg ? '<p>' + esc(g.eg) + '</p>' : '') +
        (g.from ? '<p class="hl-rate">Rates from ~' + trim(g.from) + '% p.a.</p>' : '') +
        (g.note ? '<p class="hl-rate">' + g.note + '</p>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function top(groups) {
    return 'Best fit: ' + (groups.filter(function (g) { return g.s === 2; }).map(function (g) { return g.name; }).join(', ') || 'our team to advise');
  }
  function grid2(a, b) { return '<div class="hl-grid2">' + a + b + '</div>'; }

  var CIBIL_ORDER = ['lt650', '650to700', '700to750', 'gt750'];
  function cibilAtLeast(c, min) { return c !== 'unknown' && rank(c, CIBIL_ORDER) >= rank(min, CIBIL_ORDER); }
  var CIBIL_TIPS = {
    lt650: 'A score below 650 rules out most unsecured loans. A secured loan (gold or property), an earning co-applicant with a good score, or 6–12 months of on-time repayments will help.',
    '650to700': 'A score of 650–700 gets approvals mainly from NBFCs at higher rates. Clearing overdue amounts and keeping card usage under 30% lifts it quickly.',
    '700to750': 'A good score. Most lenders will consider the file; above 750 unlocks the best rates.',
    gt750: 'An excellent score – the customer qualifies for the best rates on offer.',
    unknown: 'Check the CIBIL score first (free once a year on cibil.com). Lenders price the loan on it.'
  };

  /* ---------- business loan ---------- */
  function business(v, L) {
    var income = { lt25: 15000, '25to50': 25000, '50to100': 50000, gt100: 100000 }[v.income];
    var foir = { self: 0.5, bank: 0.5, salbiz: 0.55, cash: 0.35 }[v.itype];
    var rate = { gt750: 14, '700to750': 16, '650to700': 19, lt650: 24, unknown: 18 }[v.cibil];
    var months = v.vintage === 'gt5' ? 60 : v.vintage === '3to5' ? 48 : 36;
    var a = v.amount, itr = v.itr === 'yes', cash = v.itype === 'cash';
    var eligible = floor10k(principalFor(income * foir * (itr ? 1 : 0.8), rate, months));
    var ok = a <= eligible;
    var vint = rank(v.vintage, ['lt1', '1to3', '3to5', 'gt5']);
    var badCibil = v.cibil === 'lt650';

    var prod, prodNote;
    if (vint === 0) { prod = 'Startup loan – MUDRA / PMEGP'; prodNote = 'Businesses under 1 year old are mostly funded through government schemes or secured loans; most banks and NBFCs want 1–3 years of history for unsecured loans.'; }
    else if (!ok || badCibil) { prod = 'Secured business loan (against property or gold)'; prodNote = 'Security brings the rate down and closes the gap between eligibility and the amount needed. CGTMSE cover can replace collateral for MSMEs.'; }
    else if (a <= 1000000 && !itr) { prod = 'MUDRA loan or banking-based business loan'; prodNote = 'Without ITR, lenders assess the bank statement; MUDRA loans suit amounts up to ₹10 lakh (₹20 lakh under Tarun Plus).'; }
    else { prod = vint >= 2 && !cash ? 'Unsecured business loan / working capital OD' : 'Unsecured business loan'; prodNote = 'Collateral-free term loan for 1–5 years; established businesses with steady banking can also take an overdraft for working capital.'; }

    var bizDocs = {
      prop: 'Business proof – GST certificate, Udyam registration or Shop Act licence',
      partnership: 'Partnership deed, firm PAN and registration certificate',
      pvtltd: 'Certificate of incorporation, MOA / AOA, company PAN, board resolution',
      llp: 'LLP agreement, certificate of incorporation, LLP PAN',
      other: 'Registration certificate and PAN of the entity'
    }[v.btype];
    var docs = ['KYC of the owner / all partners / directors – PAN, Aadhaar, photo', bizDocs, '12 months business bank statement'];
    if (itr) docs.push('ITR with computation, P&L and balance sheet for 2–3 years');
    docs.push('GST returns for 12 months (if GST registered)', 'Office / shop address proof – rent agreement or electricity bill');

    var groups = [
      { name: 'Government schemes', eg: 'MUDRA, PMEGP, CGTMSE, Stand-Up India – through public sector banks',
        s: vint === 0 || a <= 1000000 ? 2 : 1, note: 'Lower rates, collateral-free for eligible MSMEs' },
      { name: 'Public Sector Banks', eg: 'SBI, Bank of Maharashtra, Bank of Baroda, Union Bank', from: 9.5,
        s: !itr || badCibil || cash ? 0 : vint >= 1 && cibilAtLeast(v.cibil, '700to750') ? 2 : 1 },
      { name: 'Private Banks', eg: 'HDFC Bank, ICICI Bank, Axis Bank, Kotak Mahindra Bank', from: 11,
        s: !itr || badCibil || cash || vint === 0 || income < 25000 ? 0 : vint >= 2 && cibilAtLeast(v.cibil, '700to750') && income >= 50000 ? 2 : 1 },
      { name: 'NBFCs & Fintech Lenders', eg: 'Bajaj Finserv, Tata Capital, Lendingkart, FlexiLoans, Indifi', from: 14,
        s: badCibil || cash ? 0 : vint >= 1 && cibilAtLeast(v.cibil, '650to700') ? 2 : 1 },
      { name: 'Small Finance Banks & MFIs', eg: 'AU Small Finance Bank, Equitas, Ujjivan, Jana', from: 15,
        s: a > 5000000 ? 0 : vint >= 1 && !badCibil ? 2 : 1 },
      { name: 'Secured options', eg: 'Loan against property or gold loan', note: '<a href="gold-loans.html">Gold loan search</a> · <a href="home-loans.html">Loan against property</a>',
        s: badCibil || !itr || !ok || vint === 0 ? 2 : 1 }
    ];

    return {
      headline: 'Eligibility ' + short(eligible) + ' · ' + prod,
      details: ['Required ' + short(a) + ' · EMI ₹' + inr(emi(a, rate, months)) + '/mo at ~' + rate + '%', top(groups)],
      sub: L.btype + ' · ' + L.vintage + ' in business · ' + L.itype + ' · ' + L.income + '/month',
      html: stats([
        stat('Estimated eligibility', short(eligible), trim(months / 12) + ' yrs at ~' + rate + '% p.a.'),
        stat('Required loan', short(a), '₹' + inr(a)),
        stat('Approx. EMI', '₹' + inr(emi(a, rate, months)) + '/mo', 'for the required loan')
      ]) +
        verdict(ok, ok
          ? '<strong>Within estimated eligibility.</strong> The amount fits the income on an unsecured basis.'
          : '<strong>Above estimated eligibility by ' + short(a - eligible) + '.</strong> Consider a secured loan, a co-applicant, or showing higher income in ITR / banking.') +
        grid2(box('Suggested product', product(prod, prodNote) + '<p class="hl-note" style="margin-top:.6rem"><strong>CIBIL:</strong> ' + CIBIL_TIPS[v.cibil] + '</p>'),
          box('Documents to keep ready', bullets(docs.map(esc)))) +
        lenders('Lenders that usually fit', groups, ''),
      email: ['Business type: ' + L.btype, 'Vintage: ' + L.vintage, 'Income type: ' + L.itype, 'Monthly income: ' + L.income,
        'ITR available: ' + L.itr, 'CIBIL: ' + L.cibil, 'Required loan: Rs ' + inr(a), 'Estimated eligibility: Rs ' + inr(eligible)]
    };
  }

  /* ---------- personal loan ---------- */
  function personal(v, L) {
    var income = { '15to20': 15000, '20to30': 20001, '30to50': 30001, '50to100': 50001, gt100: 100001 }[v.income];
    var base = { gt750: 10.5, '700to750': 12.5, '650to700': 16, lt650: 22, unknown: 14 }[v.cibil];
    var rate = base + ({ 'sal-bank': 0, 'sal-cash': 6, 'se-business': 2, 'se-professional': 1 }[v.emp]);
    var salaried = v.emp.indexOf('sal') === 0, cash = v.emp === 'sal-cash';
    var months = salaried ? 60 : 48;
    var foir = income > 50000 ? 0.6 : 0.5;
    if (v.existing === 'yes') foir -= 0.2;
    if (cash) foir -= 0.1;
    var cap = income * (cash ? 10 : 20);
    var eligible = floor10k(Math.min(principalFor(income * foir, rate, months), cap));
    var a = v.amount, ok = a <= eligible;
    var exp = rank(v.exp, ['lt1', '1to3', '3to5', 'gt5']);
    var badCibil = v.cibil === 'lt650';
    var good = cibilAtLeast(v.cibil, '700to750');

    var groups = [
      { name: 'Public Sector Banks', eg: 'SBI, Bank of Baroda, Punjab National Bank, Canara Bank', from: 10.5,
        s: cash || badCibil || v.emp === 'se-business' ? 0 : v.emp === 'sal-bank' && good && exp >= 1 ? 2 : 1,
        note: 'Best rates if the salary account is with the same bank' },
      { name: 'Private Banks', eg: 'HDFC Bank, ICICI Bank, Axis Bank, Kotak Mahindra Bank, IDFC FIRST Bank', from: 10.75,
        s: cash || badCibil || income < 20000 ? 0 : (v.emp === 'sal-bank' || v.emp === 'se-professional') && good && exp >= 1 && income > 30000 ? 2 : 1 },
      { name: 'NBFCs', eg: 'Bajaj Finserv, Tata Capital, Aditya Birla Capital, SMFG India Credit', from: 11.5,
        s: cash || badCibil ? 0 : cibilAtLeast(v.cibil, '650to700') && exp >= 1 ? 2 : 1 },
      { name: 'Fintech Lending Apps', eg: 'KreditBee, Moneyview, Navi, Fibe', from: 14,
        s: cash || badCibil || a > 1000000 ? 0 : v.emp === 'sal-bank' && a <= 500000 ? 2 : 1,
        note: 'Small, fast loans – usually up to ₹5–10 lakh' },
      { name: 'Small Finance Banks & MFIs', eg: 'AU Small Finance Bank, Ujjivan, Equitas', from: 16,
        s: a > 1500000 ? 0 : cash || badCibil ? 1 : 0 },
      { name: 'Gold loan instead', eg: 'Lowest-cost option when unsecured approval is hard', note: '<a href="gold-loans.html">Try the gold loan search</a>',
        s: cash || badCibil || !ok ? 2 : 0 }
    ];

    var docs = ['KYC – PAN, Aadhaar, photo'];
    if (salaried) docs.push(cash ? 'Salary certificate and employer ID card' : 'Last 3 months salary slips', '6 months bank statement', 'Form 16 / ITR (for larger amounts)', 'Employer ID card');
    else docs.push(v.emp === 'se-professional' ? 'Degree / professional registration certificate' : 'Business proof – GST / Udyam / Shop Act', 'ITR with computation for 2 years', '12 months bank statement');
    if (v.existing === 'yes') docs.push('Statements of existing loans (sanction letter / EMI schedule)');

    var notes = [CIBIL_TIPS[v.cibil]];
    if (cash) notes.unshift('Cash salary is hard to finance unsecured. Getting the salary credited to a bank account for 3–6 months opens up banks and NBFCs.');
    if (exp === 0) notes.push('Most lenders want at least 1 year of total experience (6 months in the current job).');
    if (v.existing === 'yes') notes.push('Eligibility assumes existing EMIs take about 20% of income; closing small loans first increases it.');

    return {
      headline: 'Eligibility ' + short(eligible) + ' · ' + (ok ? 'within limit' : 'short by ' + short(a - eligible)),
      details: ['Required ' + short(a) + ' · EMI ₹' + inr(emi(a, rate, months)) + '/mo at ~' + trim(rate) + '%', top(groups)],
      sub: L.emp + ' · ' + L.income + '/month · ' + v.company + ' · ' + L.exp + ' experience',
      html: stats([
        stat('Estimated eligibility', short(eligible), months / 12 + ' yrs at ~' + trim(rate) + '% p.a.'),
        stat('Required loan', short(a), '₹' + inr(a)),
        stat('Approx. EMI', '₹' + inr(emi(a, rate, months)) + '/mo', 'for the required loan')
      ]) +
        verdict(ok, ok
          ? '<strong>Within estimated eligibility.</strong> The required amount fits the income on a ' + months / 12 + '-year tenure.'
          : '<strong>Above estimated eligibility by ' + short(a - eligible) + '.</strong> Lower the amount, add a co-applicant, or close existing loans first.') +
        grid2(box('Things to know', bullets(notes)), box('Documents to keep ready', bullets(docs.map(esc)))) +
        lenders('Lenders that usually fit', groups, 'No unsecured lender group fits this profile directly. Our team can still look at secured options.'),
      email: ['Employment: ' + L.emp, 'Monthly income: ' + L.income, 'Company / business: ' + v.company, 'Experience: ' + L.exp,
        'Existing EMI: ' + L.existing, 'CIBIL: ' + L.cibil, 'Required loan: Rs ' + inr(a), 'Estimated eligibility: Rs ' + inr(eligible)]
    };
  }

  /* ---------- gold loan ---------- */
  // RBI Directions 2025: LTV 85% up to ₹2.5 lakh, 80% up to ₹5 lakh, 75% above
  function ltvFor(loan) { return loan <= 250000 ? 0.85 : loan <= 500000 ? 0.80 : 0.75; }
  function maxGoldLoan(value) {
    if (value * 0.85 <= 250000) return value * 0.85;
    if (value * 0.80 <= 500000) return Math.max(250000, value * 0.80);
    return Math.max(500000, value * 0.75);
  }
  function gold(v, L) {
    var notes = [];
    var grams = v.weight;
    if (v.gtype === 'coins' && grams > 50) {
      notes.push('RBI allows at most 50 g of gold coins per borrower, so only 50 g is counted.');
      grams = 50;
    }
    if (v.gtype === 'other') notes.push('Gold bars, biscuits and bullion are not accepted. Other items are valued only if they are ornaments or coins.');
    var net = { jewellery: 0.9, coins: 1, other: 0.85 }[v.gtype];
    var carat = v.purity === 'unknown' ? 20 : +v.purity;
    if (v.purity === 'unknown') notes.push('Purity unknown – assumed 20 carat. The branch tests the gold in a few minutes.');
    if (v.gtype === 'jewellery') notes.push('About 10% is deducted from jewellery weight for stones, lac and wastage.');
    var value = grams * net * (carat / 24) * GOLD_RATE_24K;
    var maxLoan = floor10k(maxGoldLoan(value));
    var a = v.amount, ok = a <= maxLoan;
    var needGrams = a / (ltvFor(a) * net * (carat / 24) * GOLD_RATE_24K);
    notes.push('Gold value uses an assumed 24K rate of ₹' + inr(GOLD_RATE_24K) + '/g; the lender uses the day\'s rate.');
    notes.push('No income proof is needed for most gold loans – ' + esc(L.emp.toLowerCase()) + ' customers apply with KYC only.');

    var groups = [
      { name: 'Public Sector Banks', eg: 'SBI, Bank of Baroda, Canara Bank, Indian Bank', from: 8.75, s: 2, note: 'Lowest rates; processing can take a day' },
      { name: 'Private Banks', eg: 'HDFC Bank, ICICI Bank, Federal Bank, Kotak Mahindra Bank', from: 9.25, s: 2 },
      { name: 'Gold Loan NBFCs', eg: 'Muthoot Finance, Manappuram Finance, IIFL Finance', from: 9.9, s: 2, note: 'Disbursal in about 30 minutes, branches in most towns' },
      { name: 'Small Finance Banks', eg: 'AU Small Finance Bank, Equitas, Ujjivan', from: 9.5, s: a <= 2500000 ? 2 : 1 }
    ];

    return {
      headline: 'Max loan ' + short(maxLoan) + ' on ' + trim(v.weight) + ' g ' + L.gtype.toLowerCase(),
      details: ['Required ' + short(a) + (ok ? ' – covered' : ' – short by ' + short(a - maxLoan)), 'Gold value ' + short(value) + ' at ₹' + inr(GOLD_RATE_24K) + '/g (24K)'],
      sub: L.gtype + ' · ' + trim(v.weight) + ' g · ' + L.purity + ' · ' + v.city,
      html: stats([
        stat('Estimated gold value', short(value), trim(grams * net) + ' g net at ' + carat + 'K'),
        stat('Maximum loan', short(maxLoan), 'as per RBI loan-to-value limits'),
        stat('Required loan', short(a), 'about ₹' + inr(a * 0.0099) + '/mo interest at ~11.9%')
      ]) +
        verdict(ok, ok
          ? '<strong>The gold covers the required amount.</strong> The loan can usually be disbursed the same day.'
          : '<strong>Short by ' + short(a - maxLoan) + '.</strong> About ' + Math.ceil(needGrams) + ' g of ' + carat + 'K gold is needed for ' + short(a) + ' – ' + (v.gtype === 'coins' ? 'add jewellery (coins are capped at 50 g)' : 'pledge more gold') + ' or lower the amount.') +
        grid2(box('Things to know', bullets(notes)),
          box('Documents to keep ready', bullets(['KYC – Aadhaar card and PAN card', 'Two photographs', 'Address proof if different from Aadhaar', 'The gold – ornaments or coins (no bars)'].map(esc)) +
            '<p class="hl-note" style="margin-top:.6rem">Repay as monthly EMI, interest-only every month, or as a single bullet payment at the end (up to 12 months).</p>')) +
        lenders('Lenders near ' + esc(v.city), groups, ''),
      email: ['Mobile: ' + v.mobile, 'City: ' + v.city, 'Gold type: ' + L.gtype, 'Weight: ' + trim(v.weight) + ' g', 'Purity: ' + L.purity,
        'Employment: ' + L.emp, 'Required loan: Rs ' + inr(a), 'Estimated maximum loan: Rs ' + inr(maxLoan)]
    };
  }

  /* ---------- bank account opening ---------- */
  var BANKS = {
    sbi: ['State Bank of India', 'state-bank-of-india', 'Public sector', 'Largest branch network and low minimum balance'],
    bom: ['Bank of Maharashtra', 'bank-of-maharashtra', 'Public sector', 'Strong branch presence across Maharashtra'],
    bob: ['Bank of Baroda', 'bank-of-baroda', 'Public sector', 'Wide network with simple current accounts'],
    hdfc: ['HDFC Bank', 'hdfc-bank', 'Private sector', 'Wide range of accounts with quick digital opening'],
    icici: ['ICICI Bank', 'icici-bank', 'Private sector', 'Instant digital account and business banking tools'],
    axis: ['Axis Bank', 'axis-bank', 'Private sector', 'Feature-rich current and salary accounts'],
    kotak: ['Kotak Mahindra Bank', 'kotak-mahindra-bank', 'Private sector', 'Zero-balance 811 digital savings option'],
    idfc: ['IDFC FIRST Bank', 'idfc-first-bank', 'Private sector', 'Monthly interest credit on savings']
  };
  function account(v, L) {
    var current = v.atype === 'current';
    var entity = ['partnership', 'llp', 'pvtltd'].indexOf(v.btype) !== -1;
    var notes = [], variant, why;

    if (current) {
      variant = { prop: 'Proprietorship Current Account', partnership: 'Partnership Firm Current Account', llp: 'LLP Current Account', pvtltd: 'Company Current Account', na: 'Individual Current Account' }[v.btype];
      why = 'Built for daily business receipts and payments, with no limit on transactions, cheque book, UPI QR and net banking for the business.';
      if (v.occ === 'student') notes.push('Students rarely need a current account – a savings account is usually the right choice.');
      if (v.btype === 'na' && v.occ !== 'professional' && v.occ !== 'self') notes.push('Without a registered business, banks open current accounts mainly for professionals and self-employed individuals.');
    } else {
      if (v.occ === 'student') { variant = 'Student / Zero-Balance Savings Account'; why = 'No minimum balance (Basic Savings Bank Deposit account) with debit card and UPI.'; }
      else if (v.purpose === 'salary' || v.occ === 'salaried') { variant = 'Salary Account'; why = 'Usually zero balance when the employer has a salary tie-up with the bank, plus faster personal loan approvals later.'; }
      else if (v.purpose === 'savings') { variant = 'Savings Account with Auto Sweep FD'; why = 'Extra balance moves into a fixed deposit automatically and earns a higher rate.'; }
      else { variant = 'Regular Savings Account'; why = 'Everyday account with debit card, UPI and net banking. A zero-balance option is available if needed.'; }
      if (entity) notes.push((v.btype === 'llp' ? 'An ' : 'A ') + L.btype + ' cannot open a savings account in its own name – the business needs a current account.');
      if (v.purpose === 'business') notes.push('Banks expect business transactions to run through a current account; heavy business use of a savings account can be flagged.');
    }

    var docs = ['PAN card and Aadhaar card', 'Passport-size photographs', 'Mobile number linked to Aadhaar for e-KYC'];
    if (current) docs = docs.concat({
      prop: ['Two business proofs – GST certificate, Udyam registration, Shop Act licence or trade licence', 'Business address proof'],
      partnership: ['Partnership deed and firm PAN', 'Registration certificate of the firm', 'KYC of all partners'],
      llp: ['LLP agreement and certificate of incorporation', 'LLP PAN', 'KYC of designated partners and resolution to open the account'],
      pvtltd: ['Certificate of incorporation, MOA and AOA', 'Company PAN', 'Board resolution and KYC of directors and authorised signatories'],
      na: ['Professional / work proof – registration certificate, GST or ITR']
    }[v.btype]);
    else if (v.occ === 'salaried' || v.purpose === 'salary') docs.push('Offer letter or employee ID card');
    else if (v.occ === 'student') docs.push('College ID card (and guardian KYC if under 18)');

    var pick = current
      ? ['hdfc', 'icici', 'axis', 'kotak', 'sbi', 'bob']
      : v.occ === 'student' ? ['sbi', 'bom', 'kotak', 'idfc']
        : ['sbi', 'bom', 'hdfc', 'icici', 'kotak', 'idfc'];
    var groups = pick.map(function (k, i) {
      var b = BANKS[k];
      return { name: b[0], logo: 'images/banks/' + b[1] + '.svg', eg: b[2] + ' · ' + b[3], s: i < 3 ? 2 : 1 };
    });

    return {
      headline: 'Recommended: ' + variant,
      details: ['Banks: ' + pick.slice(0, 3).map(function (k) { return BANKS[k][0]; }).join(', ')].concat(notes.slice(0, 1)),
      sub: L.atype + ' · ' + L.occ + ' · ' + L.purpose + ' · ' + v.city,
      html: verdict(current || !entity, '<strong>Recommended: ' + esc(variant) + '.</strong> ' + why) +
        grid2(box('Things to know', bullets(notes.concat('Most banks open the account in a day with Aadhaar e-KYC and video KYC; a branch visit is needed for firms and companies.'))),
          box('Documents to keep ready', bullets(docs.map(esc)))) +
        lenders('Banks to consider in ' + esc(v.city), groups, ''),
      email: ['Mobile: ' + v.mobile, 'City: ' + v.city, 'Account type: ' + L.atype, 'Occupation: ' + L.occ,
        'Business type: ' + L.btype, 'Purpose: ' + L.purpose, 'Recommended: ' + variant]
    };
  }

  /* ---------- real estate application ---------- */
  var BUY_SERVICES = ['buy', 'commercial', 'residential', 'plot', 'agri'];
  function refNo(prefix) {
    var d = new Date();
    return prefix + '-' + String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + String(Math.floor(1000 + Math.random() * 9000));
  }
  function realestate(v, L) {
    var ref = refNo('RE'), buying = BUY_SERVICES.indexOf(v.service) !== -1;
    var selling = v.service === 'sell', renting = v.service === 'rent' || v.service === 'lease';
    var budget = v.budget, area = v.area, loan = v.loan || 0;
    var perSqft = area ? budget / area : 0;
    var notes = [], docs = ['KYC – PAN card and Aadhaar card', 'Passport-size photographs'];
    var tiles = [stat(selling ? 'Expected price' : renting ? 'Rent / budget' : 'Budget', short(budget), '₹' + inr(budget))];
    tiles.push(stat('Area', area ? inr(area) + ' sq ft' : '–', perSqft ? 'about ₹' + inr(perSqft) + ' per sq ft' : 'add area for a rate check'));

    var loanBox = '';
    if (buying && v.payment && v.payment !== 'self') {
      var ltv = maxLtvHome(budget), maxLoan = budget * ltv / 100, okLoan = loan <= maxLoan;
      var rate = 8.5, months = 240;
      tiles.push(stat('Approx. EMI', '₹' + inr(emi(loan, rate, months)) + '/mo', short(loan) + ' at ~' + rate + '% for 20 yrs'));
      loanBox = verdict(okLoan, okLoan
        ? '<strong>Loan of ' + short(loan) + ' is within the usual limit.</strong> Banks fund up to ' + ltv + '% of the property value, so keep at least ' + short(budget - loan) + ' as your own contribution.'
        : '<strong>Loan is above the usual limit.</strong> For a ' + short(budget) + ' property, banks usually fund up to ' + ltv + '% (' + short(maxLoan) + '). Plan an own contribution of at least ' + short(budget - maxLoan) + '.') +
        '<p class="hl-note" style="margin:-.25rem 0 1rem"><a href="home-loans.html#home-loan-search">Check home loan eligibility and lenders →</a>' +
        (v.approval === 'yes' ? ' · Loan approval: ready' : v.approval === 'applied' ? ' · Loan approval: applied' : ' · Getting a pre-approval first makes negotiation easier.') + '</p>';
    } else {
      tiles.push(stat('Payment', buying ? 'Self-funding' : selling ? 'Sale' : 'Rent / lease', buying ? 'no loan needed' : 'we help with the paperwork'));
    }

    if (buying) {
      notes.push('Keep about 5–6% of the property value for stamp duty, plus a registration fee of up to ₹30,000, in most Maharashtra cities (women buyers get a 1% stamp duty concession).');
      notes.push(v.pstatus === 'under' ? 'For under-construction property, check the project’s MahaRERA registration and the builder’s payment plan.' : v.pstatus === 'resale' ? 'For resale property, check the title chain, society NOC and that property tax and maintenance are paid up.' : 'Ready-to-move property: ask for the occupancy certificate (OC) and completion certificate (CC).');
      if (v.ptype === 'agri' || v.service === 'agri') notes.push('Agricultural land can usually be bought only by a registered agriculturist in Maharashtra – our team will check eligibility.');
      if (v.ptype === 'na' || v.ptype === 'plot') notes.push('For plots, verify NA order, layout approval and the 7/12 extract before paying any token amount.');
      docs.push('Address proof', v.payment && v.payment !== 'self' ? 'Income documents for the home loan' : 'Proof of funds / bank statement');
    } else if (selling) {
      notes.push('Properties priced in line with the local rate per sq ft sell faster – our team shares recent deals in ' + v.location + '.');
      docs.push('Sale deed and Index II', '7/12 extract or property card', 'Latest property tax and electricity bill', 'Society NOC / share certificate (for flats)', 'OC / CC from the builder (if available)');
    } else {
      notes.push('In Maharashtra, rent and lease agreements (leave and licence) must be registered – we help you register online.');
      notes.push('Tenant police verification is needed after the agreement is signed.');
      docs.push('Ownership proof (for owners) or employer / college ID (for tenants)', 'Address proof');
    }

    var visit = v.visit ? new Date(v.visit + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    var steps = ['Our team calls you on ' + v.mobile + (v.whatsapp ? ' (WhatsApp ' + v.whatsapp + ')' : '') + ' within one working day.',
      selling ? 'We list and market your property and screen genuine buyers.' : renting ? 'We shortlist matching ' + L.ptype.toLowerCase() + ' options in ' + v.location + '.' : 'We shortlist matching ' + L.ptype.toLowerCase() + ' options in ' + v.location + '.',
      visit ? 'Site visit planned for ' + visit + '.' : 'We fix a site visit at a time that suits you.',
      buying && v.payment !== 'self' ? 'We help with the home loan and documentation till registration.' : 'We help with the agreement and registration.'];

    return {
      kicker: 'Application ' + ref, title: 'Real estate application – ' + v.name, send: 'Send application to RAVEN', subject: 'Real estate application ' + ref,
      disc: 'Application summary only – your request reaches RAVEN when you send it. Stamp duty, loan limits and timelines are indicative; our team confirms them for your property.',
      headline: L.service + ' · ' + L.ptype + ' in ' + v.location + ' · ' + short(budget),
      details: ['Ref ' + ref + (visit ? ' · visit ' + visit : ''), buying ? L.payment + (loan ? ' · loan ' + short(loan) : '') : L.pstatus],
      sub: L.service + ' · ' + L.ptype + ' · ' + L.pstatus + ' · ' + v.location,
      html: stats(tiles) + loanBox +
        grid2(box('What happens next', '<ol class="hl-steps">' + steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>'),
          box('Documents to keep ready', bullets(docs.map(esc)))) +
        '<div style="margin-top:.75rem">' + box('Things to know', bullets(notes.map(esc))) + '</div>',
      email: ['Reference: ' + ref, 'Mobile: ' + v.mobile, 'WhatsApp: ' + (v.whatsapp || v.mobile), 'Email: ' + (v.email || '-'), 'City: ' + v.city,
        'Service: ' + L.service, 'Property type: ' + L.ptype, 'Preferred location: ' + v.location, 'Area: ' + (area ? inr(area) + ' sq ft' : '-'),
        'Budget: Rs ' + inr(budget), 'Status: ' + L.pstatus].concat(buying ? ['Payment: ' + (L.payment || '-'), 'Loan required: ' + (loan ? 'Rs ' + inr(loan) : '-'), 'Loan approval: ' + (L.approval || '-')] : [])
        .concat(['Preferred visit: ' + (v.visit || '-'), 'Additional requirements: ' + (v.notes || '-')])
    };
  }
  // RBI loan-to-value caps for housing loans
  function maxLtvHome(a) { return a <= 3000000 ? 90 : a <= 7500000 ? 80 : 75; }

  /* ---------- car loan ---------- */
  function car(v, L) {
    var used = v.ltype === 'used', yearNow = new Date().getFullYear();
    var income = { salaried: v.salary, self: v.bizincome, business: v.bizincome, cash: v.cashsalary }[v.emp] || 0;
    var rate = { salaried: 9, self: 9.5, business: 9.5, cash: 12 }[v.emp] + (used ? 3.5 : 0);
    var foir = v.emp === 'cash' ? 0.35 : 0.5;
    var age = used && v.year ? yearNow - +v.year : 0;
    var maxTenure = used ? Math.max(1, Math.min(5, 10 - age)) : 7;
    var tenure = Math.min(+v.tenure, maxTenure), months = tenure * 12;
    var ltv = used ? 80 : 90, ltvCap = v.price * ltv / 100;
    var byIncome = principalFor(income * foir, rate, months);
    var eligible = floor10k(Math.min(ltvCap, byIncome));
    var a = v.amount, ok = a <= eligible;
    var notes = [];
    if (+v.tenure > maxTenure) notes.push('A ' + (used ? age + '-year-old car' : 'new car') + ' can usually be financed for up to ' + maxTenure + ' year' + (maxTenure === 1 ? '' : 's') + ' (car age plus loan tenure is normally capped at 10 years), so ' + maxTenure + ' years is used here.');
    var gap = v.price - a - (v.down || 0);
    if (gap > 1000) notes.push('Loan plus down payment is ' + short(gap) + ' short of the car price – increase the down payment or the loan.');
    if (gap < -1000) notes.push('Loan plus down payment is ' + short(-gap) + ' more than the car price – you can borrow less.');
    notes.push(used ? 'Used car loans are based on the lender’s valuation (usually up to 80% of it), not the asking price.' : 'Banks fund up to about 90% of the on-road price; some offer 100% to salaried customers with a good CIBIL score.');
    if ((v.emp === 'salaried' && v.jobexp === 'lt1') || (v.emp === 'cash' && v.workexp === 'lt1')) notes.push('Most lenders want at least 1 year of work experience – a co-applicant helps.');
    if ((v.emp === 'self' || v.emp === 'business') && v.vintage === 'lt1') notes.push('Most lenders want 2+ years of business vintage with ITR – a co-applicant or higher down payment helps.');
    if (v.emp === 'cash') notes.push('With cash salary, banks rarely lend – NBFCs may, usually with a guarantor and a higher down payment.');

    var cash = v.emp === 'cash', se = v.emp === 'self' || v.emp === 'business';
    var groups = [
      { name: 'Banks', eg: 'SBI, HDFC Bank, ICICI Bank, Axis Bank, Bank of Baroda, Kotak', from: used ? 11.5 : 8.75, s: cash ? 0 : used ? 1 : 2, note: 'Lowest rates, longer tenure for new cars' },
      { name: 'NBFCs & captive financiers', eg: 'Mahindra Finance, Cholamandalam, Sundaram Finance, Toyota Financial Services', from: used ? 12.5 : 9.5, s: cash ? 1 : 2, note: 'Faster approvals, flexible on income proof' + (se ? ' for self-employed' : '') },
      { name: 'Used car specialists', eg: 'Shriram Finance, Cholamandalam, Mahindra Finance', from: 13, s: used ? 2 : 0, note: 'Finance older cars and private-seller deals' }
    ];
    var docs = ['KYC – PAN, Aadhaar, photo', 'Address proof'];
    if (v.emp === 'salaried') docs.push('Last 3 months salary slips', '6 months salary bank statement', 'Form 16 / ITR');
    else if (se) docs.push('ITR with computation for 2 years', 'Business proof – GST / Udyam / Shop Act', '12 months bank statement');
    else docs.push('Salary certificate from employer', '6–12 months bank statement', 'Guarantor KYC (often required)');
    docs.push(used ? 'RC copy, insurance and valuation report of the car' : 'Proforma invoice / quotation from the dealer');

    return {
      headline: 'Eligibility ' + short(eligible) + ' · EMI ₹' + inr(emi(a, rate, months)) + '/mo',
      details: [L.ltype + ' · ' + [v.brand, v.model].filter(Boolean).join(' ') + ' · price ' + short(v.price), 'Loan ' + short(a) + ' for ' + tenure + ' yrs at ~' + trim(rate) + '%'],
      sub: L.ltype + ' · ' + L.ctype + ' · ' + [v.brand, v.model].filter(Boolean).join(' ') + ' · ' + L.emp,
      title: 'Car loan offers for ' + v.name,
      html: stats([
        stat('Estimated eligibility', short(eligible), 'up to ' + ltv + '% of price · ' + tenure + ' yrs'),
        stat('Loan required', short(a), '₹' + inr(a) + (v.down ? ' · down ' + short(v.down) : '')),
        stat('Approx. EMI', '₹' + inr(emi(a, rate, months)) + '/mo', tenure + ' yrs at ~' + trim(rate) + '% p.a.')
      ]) +
        verdict(ok, ok ? '<strong>Within estimated eligibility.</strong> The loan fits the car price and the income on a ' + tenure + '-year tenure.'
          : '<strong>Above estimated eligibility by ' + short(a - eligible) + '.</strong> Increase the down payment, choose a longer tenure or add a co-applicant.') +
        grid2(box('Things to know', bullets(notes.map(esc))), box('Documents to keep ready', bullets(docs.map(esc)))) +
        lenders('Lenders that usually fit', groups, 'No standard lender fits this profile directly – our team can still help.'),
      email: ['Mobile: ' + v.mobile, 'City: ' + v.city, 'Loan type: ' + L.ltype, 'Employment: ' + L.emp, 'Car: ' + L.ctype + ' · ' + [v.brand, v.model].filter(Boolean).join(' '),
        'Car price: Rs ' + inr(v.price)].concat(used ? ['Year: ' + v.year, 'Registration: ' + (v.regno || '-')] : [])
        .concat(['Loan required: Rs ' + inr(a), 'Down payment: Rs ' + inr(v.down || 0), 'Tenure: ' + L.tenure, 'Monthly income: Rs ' + inr(income), 'Estimated eligibility: Rs ' + inr(eligible)])
    };
  }

  /* ---------- mutual fund & SIP ---------- */
  // assumed long-run returns by category for illustration only (% p.a.) - not guaranteed
  var MF_RET = { equity: 11, debt: 7, hybrid: 9, index: 11, elss: 12, large: 11, mid: 13, small: 14, flexi: 12, liquid: 6.5, other: 10 };
  var MF_EQUITY = ['equity', 'index', 'elss', 'large', 'mid', 'small', 'flexi'];
  function sipFv(p, ratePa, years) { var r = ratePa / 1200, n = years * 12; return p * ((Math.pow(1 + r, n) - 1) / r) * (1 + r); }
  function mf(v, L) {
    var ref = refNo('MF'), years = { '1to3': 3, '3to5': 5, '5to10': 10, gt10: 15 }[v.duration], rate = MF_RET[v.category] || 10;
    var sip = v.type === 'lump' ? 0 : v.sipamt === 'other' ? v.sipother : +v.sipamt;
    var lump = v.type === 'sip' ? 0 : v.lump;
    var invested = sip * 12 * years + lump, value = sipFv(sip, rate, years) + lump * Math.pow(1 + rate / 100, years);
    var notes = [], equity = MF_EQUITY.indexOf(v.category) !== -1;
    if (equity && years <= 3) notes.push('Equity funds can fall in the short term. For 1–3 years, debt, hybrid or liquid funds are usually a better fit.');
    if (v.risk === 'low' && (v.category === 'small' || v.category === 'mid')) notes.push(L.category + 's are high risk – with a low-risk profile, consider large cap, hybrid or debt funds instead.');
    if (v.goal === 'emergency' && v.category !== 'liquid' && v.category !== 'debt') notes.push('For an emergency fund, liquid or short-duration debt funds keep money safe and easy to withdraw.');
    if (v.category === 'elss' || v.goal === 'tax') notes.push('ELSS funds have a 3-year lock-in and qualify for tax deduction under Section 80C (old tax regime).');
    if (v.goal === 'retirement' || v.goal === 'education' || v.goal === 'marriage') notes.push('For long goals, increase the SIP every year (step-up) and move to safer funds 2–3 years before you need the money.');
    var mix = { low: [20, 80], moderate: [50, 50], high: [80, 20], unsure: [50, 50] }[v.risk];
    var kyc = [];
    if (v.pan === 'no') kyc.push('Apply for a PAN card first – it is required for all mutual fund investments.');
    if (v.kyc !== 'completed') kyc.push('Complete KYC once (Aadhaar e-KYC or in person) – we help you check and update the status.');
    kyc.push('Keep PAN, Aadhaar, a cancelled cheque or bank statement, and a nominee’s details ready.');
    var start = v.start ? new Date(v.start + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return {
      kicker: 'Application ' + ref, title: 'Investment options for ' + v.name, send: 'Send application to RAVEN', subject: 'Mutual fund & SIP application ' + ref,
      disc: 'Mutual fund investments are subject to market risks; read all scheme-related documents carefully. Projections use assumed returns for illustration only and are not guaranteed.',
      headline: (sip ? 'SIP ₹' + inr(sip) + '/mo' : '') + (sip && lump ? ' + ' : '') + (lump ? 'lump sum ' + short(lump) : '') + ' · ' + L.category + ' · ' + years + ' yrs',
      details: ['Could grow to about ' + short(value) + ' (invested ' + short(invested) + ' at ~' + rate + '% p.a.)', L.goal + ' · ' + L.risk],
      sub: L.type + ' · ' + L.category + ' · ' + L.goal + ' · ' + L.risk,
      html: stats([
        stat('You invest', short(invested), (sip ? '₹' + inr(sip) + '/mo' : '') + (sip && lump ? ' + ' : '') + (lump ? short(lump) + ' once' : '') + ' · ' + years + ' yrs'),
        stat('Could grow to', short(value), 'at an assumed ~' + rate + '% p.a.'),
        stat('Estimated gain', short(value - invested), invested ? '≈ ' + Math.round((value / invested - 1) * 100) + '% over ' + years + ' yrs' : '')
      ]) +
        verdict(!notes.length || notes.every(function (n) { return n.indexOf('ELSS') === 0 || n.indexOf('For long') === 0; }),
          '<strong>Suggested mix for a ' + L.risk.toLowerCase() + ' profile:</strong> about ' + mix[0] + '% equity and ' + mix[1] + '% debt' + (v.risk === 'unsure' ? ' to start – our advisor will fine-tune it after a short risk check.' : '.')) +
        grid2(box('Things to know', bullets((notes.length ? notes : ['Your fund choice fits your goal and time frame.']).map(esc))), box('KYC and documents', bullets(kyc.map(esc)))) +
        '<div style="margin-top:.75rem">' + box('What happens next', '<ol class="hl-steps">' + ['Our advisor calls you' + (v.time ? ' in the ' + L.time.toLowerCase() : '') + ' on ' + v.mobile + '.', 'We shortlist 2–3 funds in the ' + L.category.toLowerCase() + ' category that match your goal.', (sip ? 'We set up the SIP' : 'We place the investment') + (start ? ' from ' + start : '') + ' with auto-debit from your bank.', 'You get a yearly review to keep the plan on track.'].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>') + '</div>',
      email: ['Reference: ' + ref, 'Mobile: ' + v.mobile, 'WhatsApp: ' + (v.whatsapp || v.mobile), 'Email: ' + (v.email || '-'), 'Date of birth: ' + v.dob, 'City: ' + v.city,
        'Investment: ' + L.type, 'Monthly SIP: ' + (sip ? 'Rs ' + inr(sip) : '-'), 'Lump sum: ' + (lump ? 'Rs ' + inr(lump) : '-'), 'Duration: ' + L.duration, 'Category: ' + L.category,
        'Goal: ' + L.goal, 'Risk profile: ' + L.risk, 'Existing MF: ' + L.existing + (v.existing === 'yes' ? ' (SIP Rs ' + inr(v.existsip || 0) + ', ' + (v.platform || '-') + ')' : ''),
        'PAN available: ' + L.pan, 'KYC: ' + L.kyc, 'Start date: ' + (v.start || '-'), 'Contact time: ' + (L.time || '-'), 'Requirements: ' + (v.notes || '-')]
    };
  }

  var RENDER = { mf: mf, business: business, personal: personal, gold: gold, account: account, realestate: realestate, vehicle: car };
  var KICKER = { mf: 'Mutual fund', business: 'Business loan', personal: 'Personal loan', gold: 'Gold loan', account: 'Bank account', realestate: 'Real estate', vehicle: 'Car loan' };

  /* ---------- form wiring ---------- */
  Array.prototype.forEach.call(forms, function (form) {
    var kind = form.getAttribute('data-search');
    var out = document.getElementById(form.getAttribute('data-result'));
    var fields = Array.prototype.slice.call(form.querySelectorAll('input, select, textarea'));
    var conds = Array.prototype.slice.call(form.querySelectorAll('[data-show]'));

    // show a field group only when another answer matches, e.g. data-show="payment:loan|both"
    function sync() {
      conds.forEach(function (box) {
        var rule = box.getAttribute('data-show').split(':'), src = form.querySelector('[name="' + rule[0] + '"]');
        var on = !!src && rule[1].split('|').indexOf(src.value) !== -1 && !box.parentElement.closest('[data-show][hidden]');
        box.hidden = !on;
        Array.prototype.forEach.call(box.querySelectorAll('input, select, textarea'), function (el) {
          el.disabled = !on;
          if (!on) setErr(el, false);
        });
      });
    }
    function todayIso() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
    Array.prototype.forEach.call(form.querySelectorAll('input[data-check="date"]'), function (el) { el.min = todayIso(); });
    Array.prototype.forEach.call(form.querySelectorAll('input[data-check="dob"]'), function (el) { el.max = todayIso(); });

    function num(el) { return parseFloat(el.value.replace(/[^\d.]/g, '')) || 0; }
    function invalid(el) {
      var t = el.getAttribute('data-check'), val = el.value.trim();
      if (el.disabled) return false;
      if (!val && !el.required) return false;
      if (t === 'name') return val.length < 2;
      if (t === 'email') return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (t === 'regno') return !/^[A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{0,3}[ -]?\d{1,4}$/i.test(val);
      if (t === 'date') return !val || val < todayIso();
      if (t === 'dob') { var age = (new Date() - new Date(val + 'T00:00')) / 31557600000; return !val || age < 18 || age > 100; }
      if (t === 'number') { var x = num(el); return !val || x < +el.getAttribute('data-min') || x > +el.getAttribute('data-max'); }
      if (t === 'mobile') return !/^[6-9]\d{9}$/.test(val.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''));
      if (t === 'money' || t === 'grams') {
        var n = num(el);
        return n < +el.getAttribute('data-min') || n > +el.getAttribute('data-max');
      }
      return el.required && !val;
    }
    function setErr(el, bad) {
      el.classList.toggle('is-bad', bad);
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      var msg = form.querySelector('.hl-err[data-for="' + el.id + '"]');
      if (msg) msg.classList.toggle('is-on', bad);
      return bad;
    }
    function check() { return fields.filter(function (el) { return setErr(el, invalid(el)); }); }

    fields.forEach(function (el) {
      var words = form.querySelector('[data-words-for="' + el.id + '"]');
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () {
        if (el.getAttribute('data-check') === 'money') {
          var digits = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
          el.value = digits ? inr(+digits) : '';
          if (words) words.textContent = digits ? short(+digits) : '';
        }
        if (conds.length) sync();
        if (form.classList.contains('was-checked')) setErr(el, invalid(el));
      });
    });
    sync();

    form.addEventListener('reset', function () {
      form.classList.remove('was-checked');
      fields.forEach(function (el) { setErr(el, false); });
      Array.prototype.forEach.call(form.querySelectorAll('[data-words-for]'), function (w) { w.textContent = ''; });
      setTimeout(sync, 0);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('was-checked');
      var bad = check();
      if (bad.length) { bad[0].focus(); return; }

      var v = {}, L = {};
      fields.forEach(function (el) {
        if (el.disabled) return;
        var t = el.getAttribute('data-check');
        v[el.name] = t === 'money' || t === 'grams' || t === 'number' ? num(el) : el.value.trim();
        L[el.name] = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value.trim();
      });
      var r = RENDER[kind](v, L);
      var name = v.name;
      var subject = (r.subject || KICKER[kind] + ' enquiry') + ' – ' + name;
      var body = (r.subject || KICKER[kind] + ' enquiry') + '\n\nCustomer: ' + name + '\n' + r.email.join('\n');

      out.innerHTML = '<div class="hl-rhead"><div><p class="hl-kicker">' + (r.kicker || (kind === 'account' ? 'Recommendation' : 'Indicative result')) + '</p>' +
        '<h3>' + (r.title ? esc(r.title) : KICKER[kind] + ' options for ' + esc(name)) + '</h3><p class="hl-rsub">' + esc(r.sub) + '</p></div>' +
        '<button type="button" class="hl-edit">Edit details</button></div>' + r.html +
        '<div class="hl-cta"><a class="hl-submit" href="mailto:hello@raven.business?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body) + '">' + (r.send || 'Send to RAVEN team') + '</a>' +
        '<a class="hl-reset" href="contact.html">Talk to our team</a></div>' +
        '<p class="hl-disc">' + (r.disc || (kind === 'account'
          ? 'Suggestions only. Account features, charges and minimum balance are set by each bank and change from time to time.'
          : 'Indicative only. Final eligibility, rate and amount depend on the lender\'s policy, credit checks, documents and valuation.')) + '</p>';
      if (window.RavenApp) RavenApp.onResult({ kind: kind, values: v, labels: L, headline: r.headline, details: r.details, out: out });
      out.hidden = false;
      form.hidden = true;
      out.querySelector('.hl-edit').addEventListener('click', function () {
        out.hidden = true;
        form.hidden = false;
        fields[0].focus();
      });
      out.focus({ preventScroll: true });
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    if (window.RavenApp) RavenApp.prefill(form, kind);
    sync();
  });
})();
