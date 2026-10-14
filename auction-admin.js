/* Platform admin (auction-admin.html): bank onboarding, bidder KYC queue, all auctions,
   disputes, fraud checks, audit log and platform settings. */
(function () {
  var App = window.RavenApp, UI = window.RavenUI, S = window.RavenAuctions, U = window.AUI, P = window.AP;
  if (!S || !P) return;
  var esc = App.esc, ic = UI.icon, $ = P.$, inr = U.inr, short = U.short, fld = U.fld, opts = U.opts, bad = U.bad;
  var ACTOR = 'RAVEN admin';
  var SOLD = ['h1', 'confirmed', 'paid25', 'paid75', 'certificate'];
  var st = { view: 'overview', kyc: 'review', dis: 'open', q: '', bank: '' };

  function profiles() { var d = S.db().profiles; return Object.keys(d).map(function (k) { return Object.assign({ userId: k }, d[k]); }); }

  /* ---------- fraud and integrity checks ---------- */
  function chainOk(a) { return S.verifyChain(a.id).ok; }
  function flags() {
    var out = [], pans = {}, utrs = {};
    profiles().forEach(function (p) { if (p.pan) (pans[p.pan] = pans[p.pan] || []).push(p); });
    Object.keys(pans).forEach(function (k) { if (pans[k].length > 1) out.push({ level: 'high', title: 'Same PAN on ' + pans[k].length + ' accounts', text: pans[k].map(function (p) { return p.name; }).join(', ') + ' – possible proxy bidding or ring', ic: 'users' }); });
    S.db().parts.forEach(function (p) { if (p.emd && p.emd.utr && !p.bot) (utrs[p.emd.utr] = utrs[p.emd.utr] || []).push(p); });
    Object.keys(utrs).forEach(function (k) { if (utrs[k].length > 1) out.push({ level: 'high', title: 'EMD UTR ' + k + ' used ' + utrs[k].length + ' times', text: utrs[k].map(function (p) { return p.name; }).join(', '), ic: 'wallet' }); });
    S.all().forEach(function (a) {
      var ph = S.phase(a), approved = S.partsOf(a.id).filter(function (p) { return p.status === 'approved'; });
      if (a.bidCount && !chainOk(a)) out.push({ level: 'high', title: 'Bid log tampered – ' + a.ref, text: 'Hash chain does not match. Freeze the result and investigate.', ic: 'shield' });
      if (SOLD.indexOf(ph) !== -1 && approved.length === 1) out.push({ level: 'medium', title: 'Single bidder sale – ' + a.ref, text: 'Sold at ' + inr(a.currentHigh) + ' with only one bidder. Check for collusion before confirmation.', ic: 'user' });
      if (SOLD.indexOf(ph) !== -1 && a.currentHigh === a.reserve) out.push({ level: 'low', title: 'Sold exactly at reserve – ' + a.ref, text: 'No competition above the reserve price.', ic: 'rupee' });
      var late = S.bidsOf(a.id).filter(function (b) { return b.extended; }).length;
      if (late >= 6) out.push({ level: 'low', title: 'Heavy late bidding – ' + a.ref, text: late + ' extensions. Normal for popular assets; review if the same bidders repeat across auctions.', ic: 'clock' });
      if (a.valuation && a.reserve < a.valuation * 0.6) out.push({ level: 'medium', title: 'Reserve far below valuation – ' + a.ref, text: 'Reserve is ' + Math.round(a.reserve / a.valuation * 100) + '% of valuation.', ic: 'trend' });
    });
    return out;
  }

  /* ---------- overview ---------- */
  function overview() {
    var A = S.all(), banks = S.db().banks, profs = profiles(), dis = S.db().disputes.filter(function (d) { return d.status === 'open'; });
    var gmv = A.filter(function (a) { return SOLD.indexOf(S.phase(a)) !== -1; }).reduce(function (s, a) { return s + a.currentHigh; }, 0), F = flags();
    var byBank = banks.map(function (b) { return [b.name, A.filter(function (a) { return a.bankId === b.id; }).length]; }).filter(function (x) { return x[1]; }).sort(function (x, y) { return y[1] - x[1]; });
    $('v-overview').innerHTML = P.head('Platform overview', 'Everything across all banks and bidders.') +
      '<div class="ap-grid ap-stagger">' + P.kpis([
        ['Banks', banks.filter(function (b) { return b.status === 'active'; }).length, banks.filter(function (b) { return b.status === 'pending'; }).length + ' waiting for approval', 'bank'],
        ['Bidders', profs.length, profs.filter(function (p) { return p.kyc === 'review'; }).length + ' KYC in review', 'users'],
        ['Live auctions', A.filter(S.isLiveish).length, A.length + ' auctions in total', 'trend'],
        ['Value sold', short(gmv), dis.length + ' open disputes · ' + F.filter(function (f) { return f.level === 'high'; }).length + ' high-risk flags', 'rupee', dis.length ? 'is-warn' : '']]) +
      '<div class="ap-grid ap-g2e">' + P.card('Auctions by bank', 'All statuses', byBank.length ? P.bars(byBank) : '<p class="ap-muted">No auctions.</p>') +
      P.card('Latest activity', '', '<div class="ap-list">' + S.auditLog().slice(0, 7).map(function (l) { return '<div class="ap-li"><div class="tx"><strong>' + esc(l.action) + '</strong><small>' + esc(l.detail) + '</small></div><span class="ap-mini">' + P.ago(l.at) + '</span></div>'; }).join('') + '</div>', '<a class="ap-link" href="#audit">Audit log' + ic('arrow') + '</a>') + '</div></div>';
  }

  /* ---------- banks ---------- */
  function banks() {
    var list = S.db().banks;
    $('v-banks').innerHTML = P.head('Banks', 'Onboard banks after checking their RBI licence and authorised officers.', '<button type="button" class="ap-btn is-primary" data-newbank>' + ic('plus', 16) + 'Onboard a bank</button>') +
      P.table([['Bank'], ['Type'], ['Auctions', 'num'], ['Team', 'num'], ['Status']], list.map(function (b) {
        var n = S.all().filter(function (a) { return a.bankId === b.id; }).length;
        return { cells: [P.nm(esc(b.name), esc(b.rbi || b.id)), esc(b.type || ''), n, (b.users || []).length, P.pill(b.status === 'active' ? 'Active' : b.status === 'pending' ? 'Pending' : 'Suspended', b.status === 'active' ? 'ok' : b.status === 'pending' ? 'warn' : 'bad')],
          acts: b.status === 'pending' ? '<button type="button" class="ap-btn is-sm is-primary" data-bank="' + b.id + ':active">Approve</button><button type="button" class="ap-btn is-sm is-danger" data-bank="' + b.id + ':rejected">Reject</button>'
            : b.status === 'active' ? '<button type="button" class="ap-btn is-sm is-danger" data-bank="' + b.id + ':suspended">Suspend</button>' : '<button type="button" class="ap-btn is-sm" data-bank="' + b.id + ':active">Reactivate</button>' };
      }));
  }
  function bankForm() {
    var body = '<form id="nb" novalidate><div class="ap-fsec"><h3>' + ic('bank', 15) + 'Institution</h3><div class="ap-fgrid">' +
      fld('Bank / institution name', '<input class="ap-input" name="name">', 'Enter the name.', true) +
      fld('Type', '<select class="ap-input" name="type">' + opts([['Public sector bank', 'Public sector bank'], ['Private sector bank', 'Private sector bank'], ['Small finance bank', 'Small finance bank'], ['Co-operative bank', 'Co-operative bank'], ['NBFC / HFC', 'NBFC / HFC'], ['ARC', 'Asset reconstruction company']], 'Co-operative bank') + '</select>') +
      fld('RBI licence / registration no.', '<input class="ap-input" name="rbi">', 'Enter the licence number.') +
      fld('Head office address', '<input class="ap-input" name="hq">', 'Enter the address.', true) +
      fld('GSTIN', '<input class="ap-input" name="gstin" maxlength="15" style="text-transform:uppercase">', 'Enter a valid 15-character GSTIN.') +
      fld('Agreement signed on', '<input class="ap-input" type="date" name="signed">') +
      '</div></div><div class="ap-fsec"><h3>' + ic('user', 15) + 'Nodal officer</h3><div class="ap-fgrid">' +
      fld('Name', '<input class="ap-input" name="nodal">', 'Enter the name.') + fld('Official email', '<input class="ap-input" type="email" name="nemail">', 'Enter a valid email.') +
      fld('Phone', '<input class="ap-input" name="nphone" inputmode="tel">', 'Enter a valid phone number.') + fld('Board resolution / authority letter', '<input class="ap-input" type="file" name="doc" accept=".pdf" style="padding-top:.6rem">') + '</div></div></form>';
    var dr = UI.openDrawer({ title: 'Onboard a bank', body: body, foot: '<button type="button" class="ap-btn" data-x>Cancel</button><button type="button" class="ap-btn is-primary" data-ok>Add bank</button>' });
    var f = dr.querySelector('#nb'); dr.querySelector('[data-x]').onclick = UI.closeDrawer;
    dr.querySelector('[data-ok]').onclick = function () {
      var v = function (n) { return f[n].value.trim(); };
      var e = [bad(f, 'name', v('name').length < 3), bad(f, 'rbi', v('rbi').length < 3), bad(f, 'hq', v('hq').length < 5), bad(f, 'gstin', !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(v('gstin').toUpperCase())),
        bad(f, 'nodal', v('nodal').length < 3), bad(f, 'nemail', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('nemail'))), bad(f, 'nphone', v('nphone').replace(/\D/g, '').length < 10)];
      if (e.some(Boolean)) { f.querySelector('.is-bad').focus(); return; }
      S.saveBank({ name: v('name'), type: v('type'), rbi: v('rbi'), hq: v('hq'), gstin: v('gstin').toUpperCase(), signed: v('signed'), nodal: v('nodal'), nemail: v('nemail'), nphone: v('nphone'), doc: f.doc.files[0] ? f.doc.files[0].name : '' });
      UI.closeDrawer(); UI.toast(v('name') + ' added – approve it to let them post auctions');
    };
  }

  /* ---------- KYC queue ---------- */
  function kyc() {
    var all = profiles(), F = { review: function (p) { return p.kyc === 'review'; }, verified: function (p) { return p.kyc === 'verified'; }, rejected: function (p) { return p.kyc === 'rejected'; }, all: function () { return true; } };
    var rows = all.filter(F[st.kyc]);
    $('v-kyc').innerHTML = P.head('Bidder KYC', 'PAN, Aadhaar e-KYC and bank account checks. Flagged profiles need a manual decision.') +
      '<div class="ap-chips">' + [['review', 'Needs review'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['all', 'All']].map(function (c) { return '<button type="button" class="ap-chip' + (st.kyc === c[0] ? ' is-on' : '') + '" data-f="kyc:' + c[0] + '">' + c[1] + ' <b>' + all.filter(F[c[0]]).length + '</b></button>'; }).join('') + '</div>' +
      P.table([['Bidder'], ['PAN'], ['Type'], ['Refund account'], ['Joined'], ['Status']], rows.map(function (p) {
        return { cells: [P.nm(esc(p.name), esc(p.mobile + ' · ' + p.email), p.name), esc(p.pan || ''), esc(p.type || ''), esc((p.ifsc || '') + ' · XX' + String(p.acc || '').slice(-4)), U.dt(p.createdAt), P.pill(p.kyc, p.kyc === 'verified' ? 'ok' : p.kyc === 'review' ? 'warn' : 'bad') + (p.flag ? '<br><span class="ap-late" style="font-size:.75rem">' + esc(p.flag) + '</span>' : '')],
          acts: (p.kyc !== 'verified' ? '<button type="button" class="ap-btn is-sm is-primary" data-kyc="' + esc(p.userId) + ':verified">Verify</button>' : '') + (p.kyc !== 'rejected' ? '<button type="button" class="ap-btn is-sm is-danger" data-kyc="' + esc(p.userId) + ':rejected">Reject</button>' : '') };
      }), P.empty('shield', 'Queue is empty', 'Bidder KYC that needs a manual check shows up here.'));
  }

  /* ---------- auctions ---------- */
  function auctions() {
    var q = st.q.toLowerCase(), A = S.all().filter(function (a) { return (!st.bank || a.bankId === st.bank) && (!q || (a.title + ' ' + a.ref + ' ' + a.city).toLowerCase().indexOf(q) !== -1); }).sort(function (x, y) { return y.startAt - x.startAt; });
    $('v-auctions').innerHTML = P.head('All auctions', A.length + ' shown') +
      '<div class="ap-toolbar"><label class="ac-q" style="flex:1">' + ic('search', 18) + '<input class="ap-input" id="ad-q" type="search" placeholder="Search title, reference or city" value="' + esc(st.q) + '"></label><select class="ap-input" id="ad-bank" style="max-width:16rem"><option value="">All banks</option>' + S.db().banks.map(function (b) { return '<option value="' + b.id + '"' + (b.id === st.bank ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') + '</select></div>' +
      P.table([['Auction'], ['Bank'], ['Status'], ['Reserve', 'num'], ['Highest', 'num'], ['Bids', 'num']], A.map(function (a) {
        var ph = S.phase(a);
        return { cells: [P.nm(esc(a.title), esc(a.ref)), esc((S.bank(a.bankId) || {}).name || ''), P.phasePill(a), short(a.reserve), a.bidCount ? inr(a.currentHigh) : '–', a.bidCount],
          acts: '<a class="ap-btn is-sm" href="auction.html?id=' + encodeURIComponent(a.id) + '&preview=1" target="_blank" rel="noopener">View</a>' + (['registration', 'upcoming', 'live', 'paused', 'pending'].indexOf(ph) !== -1 ? '<button type="button" class="ap-btn is-sm is-danger" data-cancel="' + a.id + '">Stop</button>' : '') };
      }));
    var qi = $('ad-q'); qi.addEventListener('input', function () { st.q = qi.value; clearTimeout(qi.t); qi.t = setTimeout(function () { auctions(); var n = $('ad-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
    $('ad-bank').addEventListener('change', function () { st.bank = this.value; auctions(); });
  }

  /* ---------- disputes ---------- */
  var CAT = { refund: 'EMD refund', bid: 'Bid not accepted', tech: 'Technical problem', notice: 'Wrong sale notice info', payment: 'Payment not updated', possession: 'Possession / handover', other: 'Other' };
  function disputes() {
    var all = S.db().disputes, rows = all.filter(function (d) { return st.dis === 'all' || d.status === st.dis; });
    $('v-disputes').innerHTML = P.head('Disputes', 'Check the bid log and payment records, then reply. Target: 2 working days.') +
      '<div class="ap-chips">' + [['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].map(function (c) { return '<button type="button" class="ap-chip' + (st.dis === c[0] ? ' is-on' : '') + '" data-f="dis:' + c[0] + '">' + c[1] + ' <b>' + all.filter(function (d) { return c[0] === 'all' || d.status === c[0]; }).length + '</b></button>'; }).join('') + '</div>' +
      (rows.length ? '<div class="ap-grid">' + rows.map(function (d) {
        var late = d.status === 'open' && Date.now() - d.at > 2 * S.DAY;
        return '<div class="ap-card pad"><div class="ap-ch"><div><h2>' + esc(d.subject) + '</h2><p>' + esc(d.name) + ' · ' + esc(CAT[d.category] || d.category) + (d.ref ? ' · ' + esc(d.ref) : '') + ' · ' + P.ago(d.at) + (late ? ' · <span class="ap-late">past 2 days</span>' : '') + '</p></div>' + P.pill(d.status === 'open' ? 'Open' : 'Resolved', d.status === 'open' ? 'warn' : 'ok') + '</div>' +
          '<p class="ad-p">' + esc(d.details) + '</p>' + (d.utr || d.file ? '<p class="ap-mini" style="margin-top:.5rem">' + esc([d.utr ? 'UTR ' + d.utr : '', d.file ? 'Attachment: ' + d.file : '', 'Contact by ' + d.contact].filter(Boolean).join(' · ')) + '</p>' : '') +
          (d.status === 'resolved' ? '<p class="ad-p" style="margin-top:.75rem"><b>Resolution:</b> ' + esc(d.note) + '</p>' : '<button type="button" class="ap-btn is-sm is-primary" style="margin-top:.85rem" data-resolve="' + d.id + '">Resolve</button>') + '</div>';
      }).join('') + '</div>' : P.empty('info', 'No disputes', 'Issues raised by bidders appear here.'));
  }

  /* ---------- fraud ---------- */
  function fraud() {
    var F = flags(), T = { high: ['High', 'bad'], medium: ['Medium', 'warn'], low: ['Low', 'info'] };
    F.sort(function (x, y) { return ['high', 'medium', 'low'].indexOf(x.level) - ['high', 'medium', 'low'].indexOf(y.level); });
    $('v-fraud').innerHTML = P.head('Fraud checks', 'Automatic checks run on every change: duplicate identities, reused payments, bid-log integrity and unusual results.') +
      '<div class="ap-grid ap-g2e ap-stagger">' + P.card('Flags', F.length + ' found', F.length ? '<div class="ap-list">' + F.map(function (f) { return '<div class="ap-li" style="align-items:flex-start"><span style="color:var(--ap-ind);margin-top:2px">' + ic(f.ic, 18) + '</span><div class="tx"><strong style="white-space:normal">' + esc(f.title) + '</strong><small style="white-space:normal">' + esc(f.text) + '</small></div>' + P.pill(T[f.level][0], T[f.level][1]) + '</div>'; }).join('') + '</div>' : '<p class="ap-muted">No flags. All checks passed.</p>') +
      P.card('Bid-log integrity', 'Hash chain check for every auction with bids', '<div class="ap-list">' + S.all().filter(function (a) { return a.bidCount; }).map(function (a) { var ok = chainOk(a); return '<div class="ap-li"><div class="tx"><strong>' + esc(a.ref) + '</strong><small>' + a.bidCount + ' bids</small></div>' + P.pill(ok ? 'Intact' : 'Broken', ok ? 'ok' : 'bad') + '</div>'; }).join('') + '</div>') + '</div>';
  }

  /* ---------- audit ---------- */
  function audit() {
    var q = (st.aq || '').toLowerCase(), list = S.auditLog().filter(function (l) { return !q || (l.action + ' ' + l.detail + ' ' + l.actor).toLowerCase().indexOf(q) !== -1; });
    $('v-audit').innerHTML = P.head('Audit log', 'Every action by banks, bidders and admins – who, what and when.', '<button type="button" class="ap-btn" data-export>' + ic('download', 16) + 'Export CSV</button>') +
      '<div class="ap-toolbar"><label class="ac-q" style="flex:1">' + ic('search', 18) + '<input class="ap-input" id="au-q" type="search" placeholder="Filter by action, reference or person" value="' + esc(st.aq || '') + '"></label></div>' +
      P.table([['Time'], ['Action'], ['Detail'], ['By']], list.slice(0, 150).map(function (l) { return { cells: [new Date(l.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }), '<code style="font-size:.78rem">' + esc(l.action) + '</code>', esc(l.detail), esc(l.actor)] }; }));
    var qi = $('au-q'); qi.addEventListener('input', function () { st.aq = qi.value; clearTimeout(qi.t); qi.t = setTimeout(function () { audit(); var n = $('au-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
  }

  /* ---------- settings ---------- */
  function settings() {
    var s = S.settings();
    $('v-settings').innerHTML = P.head('Settings', 'Platform rules and demo controls.') +
      '<div class="ap-grid ap-g2e ap-stagger">' + P.card('Demo controls', 'Only for this browser', '<label class="ap-check"><input type="checkbox" id="set-bots"' + (s.bots ? ' checked' : '') + '><span><b>Simulated bidders</b> – demo bidders place bids in live demo auctions every few seconds.</span></label>' +
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem"><button type="button" class="ap-btn is-danger" data-reset>' + ic('trash', 16) + 'Reset demo auctions</button></div><p class="ap-mini" style="margin-top:.6rem">Resets the 9 demo auctions to fresh times. Auctions created by banks stay.</p>') +
      P.card('Platform rules', 'Applied to every new auction', '<div class="ap-kv">' + [['SARFAESI notice', '30 days minimum'], ['Gold auction notice', '14 days minimum'], ['EMD', 'Up to 10% of reserve'], ['Winner pays', '25% next working day'], ['Balance', '75% within 15 days'], ['Default extension', '5 min if bid in last 5 min'], ['Bid rate limit', '1 bid / second / bidder'], ['Large jump check', 'OTP for 5+ steps']].map(function (r) { return '<div><small>' + r[0] + '</small><b>' + r[1] + '</b></div>'; }).join('') + '</div>') + '</div>';
    $('set-bots').addEventListener('change', function () { S.setSetting('bots', this.checked); UI.toast(this.checked ? 'Demo bidders on' : 'Demo bidders off'); });
  }

  /* ---------- wiring ---------- */
  var VIEWS = { overview: overview, banks: banks, kyc: kyc, auctions: auctions, disputes: disputes, fraud: fraud, audit: audit, settings: settings };
  function counts() {
    P.count('banks', S.db().banks.filter(function (b) { return b.status === 'pending'; }).length, true);
    P.count('kyc', profiles().filter(function (p) { return p.kyc === 'review'; }).length, true);
    P.count('disputes', S.db().disputes.filter(function (d) { return d.status === 'open'; }).length, true);
    P.count('fraud', flags().filter(function (f) { return f.level === 'high'; }).length, true);
  }
  function render() { counts(); VIEWS[st.view](); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-newbank],[data-bank],[data-kyc],[data-f],[data-cancel],[data-resolve],[data-export],[data-reset]'); if (!el) return;
    var g = function (n) { return el.getAttribute(n); };
    if (el.hasAttribute('data-newbank')) bankForm();
    else if (g('data-bank')) { var b = g('data-bank').split(':'); S.saveBank({ id: b[0], status: b[1] }); UI.toast('Bank ' + b[1]); }
    else if (g('data-kyc')) { var k = g('data-kyc').split(':'); S.setProfileKyc(k[0], k[1], ACTOR); UI.toast('KYC ' + k[1]); }
    else if (g('data-f')) { var f = g('data-f').split(':'); st[f[0]] = f[1]; render(); }
    else if (g('data-cancel')) { var a = S.get(g('data-cancel')); P.ask({ title: 'Stop ' + esc(a.ref) + '?', text: 'Cancels the auction for everyone and refunds all EMD. Use only for fraud, a court order or a serious error.', input: 'Reason', required: true, ok: 'Stop auction', danger: true }, function (r) { S.cancel(a.id, r, ACTOR); UI.toast('Auction stopped'); }); }
    else if (g('data-resolve')) { var id = g('data-resolve'); P.ask({ title: 'Resolve dispute', input: 'Resolution sent to the bidder', required: true, ok: 'Resolve' }, function (r) { S.resolveDispute(id, r); UI.toast('Dispute resolved'); }); }
    else if (el.hasAttribute('data-export')) P.csv('raven-audit-log.csv', [['Time', 'Action', 'Detail', 'By']].concat(S.auditLog().map(function (l) { return [new Date(l.at).toISOString(), l.action, l.detail, l.actor]; })));
    else if (el.hasAttribute('data-reset')) P.ask({ title: 'Reset demo auctions?', text: 'Demo auctions, their bids and registrations start again with fresh times.', ok: 'Reset', danger: true }, function () { S.resetDemo(); UI.toast('Demo auctions reset'); });
  });
  P.init({ name: 'RAVEN admin (demo)', role: 'Platform admin', onShow: function (v) { st.view = v; render(); } });
  P.live(function () { var a = document.activeElement; if (a && (a.id === 'ad-q' || a.id === 'au-q')) return; render(); });
})();
