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
      sub: L.atype + ' · ' + L.occ + ' · ' + L.purpose + ' · ' + v.city,
      html: verdict(current || !entity, '<strong>Recommended: ' + esc(variant) + '.</strong> ' + why) +
        grid2(box('Things to know', bullets(notes.concat('Most banks open the account in a day with Aadhaar e-KYC and video KYC; a branch visit is needed for firms and companies.'))),
          box('Documents to keep ready', bullets(docs.map(esc)))) +
        lenders('Banks to consider in ' + esc(v.city), groups, ''),
      email: ['Mobile: ' + v.mobile, 'City: ' + v.city, 'Account type: ' + L.atype, 'Occupation: ' + L.occ,
        'Business type: ' + L.btype, 'Purpose: ' + L.purpose, 'Recommended: ' + variant]
    };
  }

  var RENDER = { business: business, personal: personal, gold: gold, account: account };
  var KICKER = { business: 'Business loan', personal: 'Personal loan', gold: 'Gold loan', account: 'Bank account' };

  /* ---------- form wiring ---------- */
  Array.prototype.forEach.call(forms, function (form) {
    var kind = form.getAttribute('data-search');
    var out = document.getElementById(form.getAttribute('data-result'));
    var fields = Array.prototype.slice.call(form.querySelectorAll('input, select'));

    function num(el) { return parseFloat(el.value.replace(/[^\d.]/g, '')) || 0; }
    function invalid(el) {
      var t = el.getAttribute('data-check'), val = el.value.trim();
      if (t === 'name') return val.length < 2;
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
        if (form.classList.contains('was-checked')) setErr(el, invalid(el));
      });
    });

    form.addEventListener('reset', function () {
      form.classList.remove('was-checked');
      fields.forEach(function (el) { setErr(el, false); });
      Array.prototype.forEach.call(form.querySelectorAll('[data-words-for]'), function (w) { w.textContent = ''; });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('was-checked');
      var bad = check();
      if (bad.length) { bad[0].focus(); return; }

      var v = {}, L = {};
      fields.forEach(function (el) {
        var t = el.getAttribute('data-check');
        v[el.name] = t === 'money' || t === 'grams' ? num(el) : el.value.trim();
        L[el.name] = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value.trim();
      });
      var r = RENDER[kind](v, L);
      var name = v.name;
      var body = KICKER[kind] + ' enquiry\n\nCustomer: ' + name + '\n' + r.email.join('\n');

      out.innerHTML = '<div class="hl-rhead"><div><p class="hl-kicker">' + (kind === 'account' ? 'Recommendation' : 'Indicative result') + '</p>' +
        '<h3>' + KICKER[kind] + ' options for ' + esc(name) + '</h3><p class="hl-rsub">' + esc(r.sub) + '</p></div>' +
        '<button type="button" class="hl-edit">Edit details</button></div>' + r.html +
        '<div class="hl-cta"><a class="hl-submit" href="mailto:hello@raven.business?subject=' +
        encodeURIComponent(KICKER[kind] + ' enquiry – ' + name) + '&body=' + encodeURIComponent(body) + '">Send to RAVEN team</a>' +
        '<a class="hl-reset" href="contact.html">Talk to our team</a></div>' +
        '<p class="hl-disc">' + (kind === 'account'
          ? 'Suggestions only. Account features, charges and minimum balance are set by each bank and change from time to time.'
          : 'Indicative only. Final eligibility, rate and amount depend on the lender\'s policy, credit checks, documents and valuation.') + '</p>';
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
  });
})();
