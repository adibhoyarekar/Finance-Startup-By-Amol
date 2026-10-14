/* Bidder portal (auction-bidder.html): my auctions, payments and refunds, KYC, watchlist, alerts and disputes. */
(function () {
  var App = window.RavenApp, UI = window.RavenUI, S = window.RavenAuctions, U = window.AUI, P = window.AP;
  var me = App && App.guard();
  if (!me || !S) return;
  var esc = App.esc, ic = UI.icon, $ = P.$, inr = U.inr, short = U.short;
  var SOLD = ['h1', 'confirmed', 'paid25', 'paid75', 'certificate'];

  function mine() {
    return S.db().parts.filter(function (p) { return p.userId === me.id; }).map(function (p) { return { p: p, a: S.get(p.auctionId) }; }).filter(function (x) { return x.a; })
      .sort(function (x, y) { return y.a.endAt - x.a.endAt; });
  }
  function myBest(a, p) { var b = S.bidsOf(a.id).filter(function (x) { return x.partId === p.id; }); return b.length ? b[b.length - 1].amount : 0; }
  function standing(a, p) {
    var ph = S.phase(a), won = a.highPart === p.id;
    if (p.status === 'pending') return ['EMD being verified', 'warn'];
    if (p.status === 'rejected') return ['EMD rejected', 'bad'];
    if (ph === 'registration' || ph === 'upcoming') return ['Approved – waiting for start', 'info'];
    if (ph === 'live' || ph === 'paused') return won ? ['You are leading', 'ok'] : myBest(a, p) ? ['Outbid', 'bad'] : ['Approved – not bid yet', 'info'];
    if (SOLD.indexOf(ph) !== -1) return won ? ['You won', 'ok'] : ['Not won – EMD ' + (p.refund ? 'refunded' : 'refund due'), 'mute'];
    if (ph === 'forfeited') return won ? ['EMD forfeited', 'bad'] : ['Closed', 'mute'];
    return ['Closed', 'mute'];
  }
  function openBtn(a, label) { return '<a class="ap-btn is-sm' + (label ? ' is-primary' : '') + '" href="auction.html?id=' + encodeURIComponent(a.id) + '">' + (label || 'Open') + '</a>'; }

  /* ---------- overview ---------- */
  function overview() {
    var list = mine(), prof = S.profile(me.id);
    var active = list.filter(function (x) { var p = S.phase(x.a); return ['registration', 'upcoming', 'live', 'paused'].indexOf(p) !== -1 && x.p.status !== 'rejected'; });
    var leading = list.filter(function (x) { return S.isLiveish(x.a) && x.a.highPart === x.p.id; });
    var won = list.filter(function (x) { return x.a.highPart === x.p.id && SOLD.indexOf(S.phase(x.a)) !== -1; });
    var locked = list.filter(function (x) { return x.p.status !== 'rejected' && !x.p.refund && !(x.a.highPart === x.p.id && SOLD.indexOf(S.phase(x.a)) !== -1); }).reduce(function (s, x) { return s + (x.p.emd ? x.p.emd.amount : 0); }, 0);
    var liveMine = list.filter(function (x) { return S.isLiveish(x.a) && x.p.status === 'approved'; });
    var recs = S.all().filter(function (a) { return U.isPublic(a) && ['live', 'registration'].indexOf(S.phase(a)) !== -1 && !S.partOf(a.id, me.id); }).slice(0, 3);
    var kycBanner = !prof || prof.kyc !== 'verified' ? '<div class="ad-status ' + (prof && prof.kyc === 'review' ? 'is-warn' : 'is-info') + '" style="margin-bottom:1rem">' + ic('shield', 18) +
      '<span style="flex:1">' + (prof && prof.kyc === 'review' ? 'Your KYC is under review: ' + esc(prof.flag || '') : 'Complete your bidder KYC once to take part in any auction.') + '</span><a class="ap-btn is-sm is-primary" href="#kyc">' + (prof ? 'View KYC' : 'Complete KYC') + '</a></div>' : '';
    $('v-overview').innerHTML = P.head('Hello, ' + esc(App.displayName(me).split(' ')[0]), 'Your bank auction bids and payments in one place.', '<a class="ap-btn is-primary" href="auctions.html">' + ic('search', 18) + 'Find auctions</a>') + kycBanner +
      '<div class="ap-grid ap-stagger">' + P.kpis([
        ['Active auctions', active.length, active.length ? 'registered or bidding' : 'none yet', 'board'],
        ['Leading now', leading.length, leading.length ? 'you are the highest bidder' : 'in live auctions', 'trend', leading.length ? '' : 'is-mute'],
        ['EMD with banks', short(locked), 'refunded if you don’t win', 'wallet'],
        ['Won', won.length, won.length ? short(won.reduce(function (s, x) { return s + x.a.currentHigh; }, 0)) + ' total' : 'no wins yet', 'check']]) +
      P.card('<i class="ac-live-dot"></i> Your live auctions', 'Updates instantly as bids come in', liveMine.length ? '<div class="ap-list">' + liveMine.map(function (x) {
        var st = standing(x.a, x.p);
        return '<div class="ap-li"><span class="ap-thumb"><img src="' + S.img(x.a) + '" alt="" width="48" height="36"></span><div class="tx"><strong>' + esc(x.a.title) + '</strong><small>' + inr(x.a.currentHigh || x.a.reserve) + ' · <span data-timer="' + esc(x.a.id) + '"></span></small><span style="display:block;margin-top:.35rem">' + P.pill(st[0], st[1]) + '</span></div><div class="acts">' + openBtn(x.a, 'Bid') + '</div></div>';
      }).join('') + '</div>' : '<p class="ap-muted">None of your auctions is live right now.</p>') +
      (recs.length ? '<div><div class="ap-ch" style="margin:.5rem 0 1rem"><div><h2 style="font-size:1rem;font-weight:600">Open for bidding</h2><p class="ap-mini">Live or taking registrations now</p></div><a class="ap-link" href="auctions.html">All auctions' + ic('arrow') + '</a></div><div class="ac-grid">' + recs.map(U.card).join('') + '</div></div>' : '') +
      '</div>';
    U.tick($('v-overview'));
  }

  /* ---------- my auctions ---------- */
  function auctions() {
    var list = mine();
    $('v-auctions').innerHTML = P.head('My auctions', list.length + ' auction' + (list.length === 1 ? '' : 's') + ' you applied for') +
      P.table([['Auction'], ['Status'], ['Your last bid', 'num'], ['Highest bid', 'num'], ['Timing']], list.map(function (x) {
        var st = standing(x.a, x.p), best = myBest(x.a, x.p);
        return { cells: [P.nm(esc(x.a.title), esc(x.a.ref) + ' · Bidder #' + esc(x.p.alias)), P.pill(st[0], st[1]), best ? inr(best) : '–', x.a.bidCount ? inr(x.a.currentHigh) : '–', '<span data-timer="' + esc(x.a.id) + '"></span>'],
          acts: openBtn(x.a, S.isLiveish(x.a) && x.p.status === 'approved' ? 'Bid' : '') };
      }), P.empty('board', 'No auctions yet', 'Find an auction, complete KYC and pay the EMD to apply.', '<a class="ap-btn is-primary" href="auctions.html">Browse auctions</a>'));
    U.tick($('v-auctions'));
  }

  /* ---------- payments & refunds ---------- */
  function payments() {
    var rows = [];
    mine().forEach(function (x) {
      var p = x.p, a = x.a;
      if (p.emd) rows.push({ at: p.createdAt, a: a, what: 'EMD', amount: p.emd.amount, ref: p.emd.method + ' · UTR ' + p.emd.utr, st: p.status === 'approved' ? ['Verified', 'ok'] : p.status === 'rejected' ? ['Rejected', 'bad'] : ['Verifying', 'warn'] });
      ['p25', 'p75'].forEach(function (k) {
        var y = p.payments && p.payments[k];
        if (y) rows.push({ at: y.at, a: a, what: k === 'p25' ? '25% of sale price' : 'Balance 75%', amount: y.amount, ref: y.method + ' · UTR ' + y.utr, st: y.status === 'verified' ? ['Verified', 'ok'] : ['Verifying', 'warn'] });
      });
      if (p.refund) rows.push({ at: p.refund.at, a: a, what: 'EMD refund', amount: p.refund.amount, ref: 'To your bank account', st: ['Refunded', 'good'] });
      if (S.phase(a) === 'forfeited' && a.highPart === p.id) rows.push({ at: a.endAt, a: a, what: 'EMD forfeited', amount: p.emd.amount, ref: 'Payment not made in time', st: ['Forfeited', 'bad'] });
    });
    rows.sort(function (x, y) { return y.at - x.at; });
    var paid = rows.filter(function (r) { return ['EMD', '25% of sale price', 'Balance 75%'].indexOf(r.what) !== -1 && r.st[0] !== 'Rejected'; }).reduce(function (s, r) { return s + r.amount; }, 0);
    var back = rows.filter(function (r) { return r.what === 'EMD refund'; }).reduce(function (s, r) { return s + r.amount; }, 0);
    $('v-payments').innerHTML = P.head('Payments & refunds', 'EMD, sale payments and refunds for all your auctions.') +
      '<div class="ap-grid ap-stagger">' + P.kpis([['Paid to banks', short(paid), 'EMD and sale payments', 'rupee'], ['Refunded to you', short(back), 'losing bids get the EMD back', 'wallet'], ['Payments', rows.length, 'in total', 'listcheck']]) +
      P.table([['Payment'], ['Amount', 'num'], ['Reference'], ['Date'], ['Status']], rows.map(function (r) {
        return { cells: [P.nm(r.what, esc(r.a.title)), inr(r.amount), esc(r.ref), U.dt(r.at), P.pill(r.st[0], r.st[1])], acts: openBtn(r.a) };
      }), P.empty('wallet', 'No payments yet', 'Your EMD and sale payments will show here.')) + '</div>';
  }

  /* ---------- watchlist ---------- */
  function watchlist() {
    var w = S.db().watch[me.id] || {}, list = S.all().filter(function (a) { return w[a.id]; });
    $('v-watchlist').innerHTML = P.head('Watchlist', 'Auctions you saved. Tap “Watch” on any auction to add it.') +
      (list.length ? '<div class="ac-grid">' + list.map(U.card).join('') + '</div>' : P.empty('bookmark', 'Nothing saved yet', 'Open an auction and tap Watch to follow it here.', '<a class="ap-btn is-primary" href="auctions.html">Browse auctions</a>'));
    U.tick($('v-watchlist'));
  }

  /* ---------- KYC ---------- */
  var TYPE = { individual: 'Individual', proprietor: 'Proprietorship', partnership: 'Partnership firm', llp: 'LLP', company: 'Company', huf: 'HUF', trust: 'Trust / Society' };
  function kyc() {
    var p = S.profile(me.id);
    var st = !p ? ['Not started', 'mute'] : p.kyc === 'verified' ? ['Verified', 'ok'] : p.kyc === 'review' ? ['Under review', 'warn'] : ['Rejected', 'bad'];
    function mask(s, n) { s = String(s || ''); return s ? 'XXXX' + s.slice(-(n || 4)) : '–'; }
    $('v-kyc').innerHTML = P.head('KYC profile', 'Done once – used for every auction you join.', '<button type="button" class="ap-btn is-primary" data-kyc>' + ic('shield', 18) + (p ? 'Update KYC' : 'Complete KYC') + '</button>') +
      (p ? '<div class="ap-grid ap-g2e ap-stagger">' + P.card('Bidder', P.pill(st[0], st[1]) + (p.flag ? ' <span class="ap-mini">' + esc(p.flag) + '</span>' : ''), '<div class="ap-kv">' +
        [['Name', p.name], ['Type', TYPE[p.type] || p.type], ['PAN', p.pan ? p.pan.slice(0, 2) + 'XXXXX' + p.pan.slice(-3) : ''], ['Aadhaar', p.aadhaar4 ? 'XXXX XXXX ' + p.aadhaar4 : '–'], ['Mobile', p.mobile], ['Email', p.email], ['Address', [p.address, p.city, p.pin].filter(Boolean).join(', ')], ['Digital signature', p.dsc === 'yes' ? 'Class 3 DSC' : 'Not yet']]
          .concat(p.type && p.type !== 'individual' ? [['Organisation', p.org], ['CIN / reg. no.', p.cin], ['Signatory', p.signatory]] : [])
          .map(function (r) { return '<div><small>' + r[0] + '</small><b>' + esc(r[1] || '–') + '</b></div>'; }).join('') + '</div>') +
        P.card('Refund account', 'EMD refunds are sent only to this verified account', '<div class="ap-kv"><div><small>Account holder</small><b>' + esc(p.holder || '–') + '</b></div><div><small>Account number</small><b>' + mask(p.acc) + '</b></div><div><small>IFSC</small><b>' + esc(p.ifsc || '–') + '</b></div><div><small>Verified on</small><b>' + U.dt(p.createdAt) + '</b></div></div>' +
          '<p class="ap-mini" style="margin-top:1rem">Your full PAN, Aadhaar and account number are never shown to banks or other bidders.</p>') + '</div>'
        : P.empty('shield', 'Complete your bidder KYC', 'PAN, Aadhaar e-KYC and your bank account for EMD refunds. Takes about 3 minutes.', '<button type="button" class="ap-btn is-primary" data-kyc>Start KYC</button>'));
  }

  /* ---------- alerts ---------- */
  function alerts() {
    var list = S.db().alerts.filter(function (a) { return a.userKey === me.id; });
    $('v-alerts').innerHTML = P.head('Alerts', 'We tell you when a bank posts an auction that matches.', '<a class="ap-btn is-primary" href="auctions.html#alerts">' + ic('plus', 18) + 'New alert</a>') +
      (list.length ? '<div class="ap-card pad"><div class="ap-list">' + list.map(function (a) {
        var matches = S.all().filter(function (x) { return U.isPublic(x) && ['registration', 'upcoming', 'live'].indexOf(S.phase(x)) !== -1 && (!a.type || x.assetType === a.type) && (!a.city || x.city === a.city) && (!a.max || x.reserve <= a.max); }).length;
        return '<div class="ap-li"><span class="ap-kpi" style="padding:0;border:0;box-shadow:none"><span class="ic" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:var(--ap-tint);color:var(--ap-ind)">' + ic('bell', 18) + '</span></span><div class="tx"><strong>' + esc([a.typeLabel || 'Any asset', a.city || 'any city', a.max ? 'up to ' + short(a.max) : ''].filter(Boolean).join(' · ')) + '</strong><small>' + esc(a.channel + ' · ' + a.freq + ' · ' + a.contact) + ' · ' + matches + ' open now</small></div><div class="acts"><button type="button" class="ap-btn is-sm is-danger" data-rm="' + a.id + '">Remove</button></div></div>';
      }).join('') + '</div></div>' : P.empty('bell', 'No alerts yet', 'Set an alert for the city, asset type and budget you want.', '<a class="ap-btn is-primary" href="auctions.html#alerts">Create an alert</a>'));
  }

  /* ---------- help & disputes (form J) ---------- */
  var CATS = [['refund', 'EMD refund not received'], ['bid', 'My bid was not accepted'], ['tech', 'Technical problem during the auction'], ['notice', 'Wrong information in the sale notice'], ['payment', 'Payment not updated'], ['possession', 'Possession / handover problem'], ['other', 'Other']];
  function disputes() {
    var list = S.db().disputes.filter(function (d) { return d.userId === me.id; }), parts = mine();
    var o = U.opts;
    $('v-disputes').innerHTML = P.head('Help & disputes', 'Raise an issue about an auction. The bank and RAVEN reply within 2 working days.') +
      '<div class="ap-grid ap-g2e ap-stagger"><div class="ap-card pad"><div class="ap-ch"><div><h2>Raise an issue</h2><p>Bid times and logs are kept tamper-proof, so we can check exactly what happened.</p></div></div>' +
      '<form id="dj" novalidate><div class="ap-fgrid">' +
      U.fld('Auction', '<select class="ap-input" name="auction"><option value="">Not about a specific auction</option>' + parts.map(function (x) { return '<option value="' + esc(x.a.id) + '">' + esc(x.a.ref + ' – ' + x.a.title) + '</option>'; }).join('') + '</select>', '', true) +
      U.fld('What is it about?', '<select class="ap-input" name="category">' + o(CATS, 'refund') + '</select>', '', true) +
      U.fld('Subject', '<input class="ap-input" name="subject" maxlength="80" placeholder="e.g. EMD refund pending for 10 days">', 'Please add a short subject.', true) +
      U.fld('Details', '<textarea class="ap-input" name="details" rows="4" placeholder="What happened, when, and any UTR or bid amount"></textarea>', 'Please describe the issue (at least 20 characters).', true) +
      U.fld('UTR / reference (if any)', '<input class="ap-input" name="utr" style="text-transform:uppercase">') +
      U.fld('Contact me by', '<select class="ap-input" name="contact">' + o([['phone', 'Phone call'], ['whatsapp', 'WhatsApp'], ['email', 'Email']], 'whatsapp') + '</select>') +
      U.fld('Screenshot or document', '<input class="ap-input" type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" style="padding-top:.6rem">', '', true) +
      '</div><button type="submit" class="ap-btn is-primary" style="margin-top:1rem">Submit issue</button></form></div>' +
      P.card('Your issues', list.length + ' raised', list.length ? '<div class="ap-list">' + list.map(function (d) {
        return '<div class="ap-li" style="align-items:flex-start"><div class="tx"><strong>' + esc(d.subject) + '</strong><small>' + esc((CATS.find(function (c) { return c[0] === d.category; }) || ['', d.category])[1]) + ' · ' + P.ago(d.at) + '</small>' +
          (d.note ? '<p class="ap-mini" style="margin-top:.35rem;white-space:normal"><b>Reply:</b> ' + esc(d.note) + '</p>' : '') + '</div>' + P.pill(d.status === 'resolved' ? 'Resolved' : 'Open', d.status === 'resolved' ? 'ok' : 'warn') + '</div>';
      }).join('') + '</div>' : '<p class="ap-muted">No issues raised. We hope it stays that way.</p>') + '</div>';
    var f = $('dj');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var e1 = U.bad(f, 'subject', f.subject.value.trim().length < 5), e2 = U.bad(f, 'details', f.details.value.trim().length < 20);
      if (e1 || e2) { f.querySelector('.is-bad').focus(); return; }
      var a = S.get(f.auction.value);
      S.addDispute(me.id, App.displayName(me), { auctionId: f.auction.value, ref: a ? a.ref : '', bankId: a ? a.bankId : '', category: f.category.value, subject: f.subject.value.trim(), details: f.details.value.trim(), utr: f.utr.value.trim().toUpperCase(), contact: f.contact.value, file: f.file.files[0] ? f.file.files[0].name : '' });
      UI.toast('Issue submitted – reference ' + S.db().disputes[0].id.slice(-6).toUpperCase());
      disputes();
    });
  }

  /* ---------- wiring ---------- */
  var VIEWS = { overview: overview, auctions: auctions, payments: payments, watchlist: watchlist, kyc: kyc, alerts: alerts, disputes: disputes };
  var current = 'overview';
  function counts() {
    var list = mine();
    P.count('auctions', list.filter(function (x) { return ['registration', 'upcoming', 'live', 'paused'].indexOf(S.phase(x.a)) !== -1; }).length);
    P.count('watchlist', Object.keys(S.db().watch[me.id] || {}).filter(function (k) { return S.db().watch[me.id][k]; }).length);
    P.count('disputes', S.db().disputes.filter(function (d) { return d.userId === me.id && d.status === 'open'; }).length);
    var p = S.profile(me.id); P.count('kyc', !p || p.kyc !== 'verified' ? '!' : 0, true);
  }
  function render() { counts(); VIEWS[current](); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-kyc]')) U.kycForm(me, function () { render(); });
    var rm = e.target.closest('[data-rm]'); if (rm) { S.removeAlert(rm.getAttribute('data-rm')); UI.toast('Alert removed'); }
  });
  P.init({ name: App.displayName(me), role: (me.role === 'agent' ? 'Agent' : 'Customer') + ' · Bidder', leave: function () { location.href = App.home(me); }, onShow: function (v) { current = v; render(); } });
  // outbid notice across the portal
  var leadingIds = {};
  function trackLead(notify) {
    mine().forEach(function (x) {
      var lead = S.isLiveish(x.a) && x.a.highPart === x.p.id;
      if (notify && leadingIds[x.a.id] && !lead && S.isLiveish(x.a)) UI.toast('Outbid on ' + x.a.title + ' – now ' + inr(x.a.currentHigh), { label: 'Bid', run: function () { location.href = 'auction.html?id=' + x.a.id; } });
      leadingIds[x.a.id] = lead;
    });
  }
  trackLead(false);
  S.on(function () { trackLead(true); });
  P.live(render);
  setInterval(function () { U.tick(); }, 1000);
})();
