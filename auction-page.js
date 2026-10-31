/* Auction detail + live bidding room (auction.html?id=...). */
(function () {
  var S = window.RavenAuctions, U = window.AUI, App = window.RavenApp, UI = window.RavenUI;
  var $ = function (id) { return document.getElementById(id); };
  var esc = App.esc, ic = UI.icon;
  var id = new URLSearchParams(location.search).get('id');
  var a = S.get(id);
  if (!a || !U.isPublic(a) && !new URLSearchParams(location.search).get('preview')) {
    $('ad-root').innerHTML = '<div class="ap-card ap-empty" style="margin-top:2rem"><span class="art">' + ic('search', 28) + '</span><h3>Auction not found</h3><p>It may have been removed or is not public yet.</p><a class="ap-btn is-primary" href="auctions.html">See all auctions</a></div>';
    return;
  }
  var me = App.current();
  var bank = S.bank(a.bankId) || {}, asset = S.ASSET[a.assetType] || {};
  var here = 'auction.html?id=' + encodeURIComponent(a.id);
  var loginUrl = 'signup.html?mode=login&next=' + encodeURIComponent(here), joinUrl = 'signup.html?mode=register&next=' + encodeURIComponent(here);
  document.title = a.title + ' – Bank auction – RAVEN';

  function myPart() { return me ? S.partOf(a.id, me.id) : null; }
  function profile() { return me ? S.profile(me.id) : null; }
  var fld = U.fld, opts = U.opts, money = U.money, wireMoney = U.wireMoney, num = U.num, bad = U.bad;
  function kycForm() { U.kycForm(me, function () { renderAll(); }); }

  /* ---------- static layout ---------- */
  $('ad-root').innerHTML =
    '<div class="ad-top"><a href="auctions.html">Bank auctions</a><span>/</span><span>' + esc(asset.label) + '</span><span>/</span><span>' + esc(a.city) + '</span></div>' +
    '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;align-items:flex-start"><div style="min-width:0;flex:1 1 18rem"><h1 class="ad-title">' + esc(a.title) + '</h1>' +
    '<div class="ad-sub"><span>' + (bank.logo ? '<img src="' + bank.logo + '" alt="">' : '') + esc(bank.name || '') + '</span><span>' + esc(a.ref) + '</span><span>' + esc(S.KIND[a.kind] || '') + '</span><span>' + ic('home', 14) + ' ' + esc(a.address) + '</span></div></div>' +
    '<div class="ad-share"><button type="button" class="ap-btn" id="ad-watch"></button><a class="ap-btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(a.title + ' – bank auction on RAVEN: ' + location.href) + '">' + ic('chat', 17) + 'Share</a></div></div>' +
    '<div class="ad-grid"><div class="ad-main">' +
    '<div class="ad-gal"><img src="' + S.img(a) + '" alt="' + esc(asset.label) + ' illustration"><span id="ad-badge"></span></div>' +
    '<div class="ap-card ad-room" id="live"><div id="ad-livecard"></div></div>' +
    '<div class="ad-tabs" role="tablist">' + [['ov', 'Overview'], ['docs', 'Documents'], ['sched', 'Schedule'], ['qa', 'Questions'], ['case', 'Bank & case'], ['terms', 'Terms']].map(function (t, i) { return '<button type="button" role="tab" class="' + (i ? '' : 'is-on') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="ad-pane is-on" data-pane="ov"></div><div class="ad-pane" data-pane="docs"></div><div class="ad-pane" data-pane="sched"></div><div class="ad-pane" data-pane="qa"></div><div class="ad-pane" data-pane="case"></div><div class="ad-pane" data-pane="terms"></div>' +
    '</div><aside class="ad-side"><div class="ap-card ad-price" id="ad-price"></div><div class="ap-card ad-console" id="ad-console"></div><div class="ap-card pad" id="ad-more"></div></aside></div>' +
    '<div class="ad-bar" id="ad-bar" role="region" aria-label="Bid quickly"></div>';
  document.body.classList.add('ad-has-bar');

  document.querySelector('.ad-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (!b) return;
    document.querySelectorAll('.ad-tabs button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    document.querySelectorAll('.ad-pane').forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-pane') === b.getAttribute('data-tab')); });
  });

  function renderStatic() {
    var q = document.querySelector.bind(document);
    q('[data-pane="ov"]').innerHTML = '<div class="ad-specs">' + (a.specs || []).map(function (s) { return '<div><small>' + esc(s[0]) + '</small><b>' + esc(s[1]) + '</b></div>'; }).join('') +
      '<div><small>Possession</small><b>' + (a.possession === 'symbolic' ? 'Symbolic' : 'Physical') + '</b></div><div><small>Asset type</small><b>' + esc(asset.label) + '</b></div></div>' +
      '<p class="ad-p" style="margin-top:1rem"><b>Address:</b> ' + esc(a.address) + ', ' + esc(a.district) + ', ' + esc(a.state) + ' ' + esc(a.pin || '') + '</p>' +
      (a.legal ? '<p class="ad-p" style="margin-top:.5rem"><b>Legal & dues:</b> ' + esc(a.legal) + '</p>' : '') +
      '<p class="ad-p" style="margin-top:.5rem"><a href="https://www.google.com/maps/search/' + encodeURIComponent(a.address) + '" target="_blank" rel="noopener">Open location in Google Maps →</a></p>';
    q('[data-pane="docs"]').innerHTML = '<div class="ad-docs">' + (a.docs || []).map(function (d) { return '<button type="button" class="ad-doc" data-doc="' + esc(d) + '">' + ic('file', 18) + esc(d) + '<small>PDF</small></button>'; }).join('') + '</div><p class="ap-mini" style="margin-top:.75rem">Read the sale notice and terms carefully before you bid.</p>';
    var t = Date.now(), steps = [['Sale notice published', a.publishAt], ['Inspection', a.inspection && a.inspection[0] ? new Date(a.inspection[0].date).getTime() : 0], ['Last date for EMD & documents', a.emdDeadline], ['Auction starts', a.startAt], ['Auction ends' + (a.extCount ? ' (extended ' + a.extCount + '×)' : ''), a.endAt], ['25% payment by winner', a.endAt + 86400e3], ['Balance 75% (within 15 days)', a.endAt + 15 * 86400e3]];
    q('[data-pane="sched"]').innerHTML = '<ul class="ad-tl">' + steps.filter(function (s) { return s[1]; }).map(function (s, i, arr) {
      var done = s[1] <= t, nowStep = done && (!arr[i + 1] || arr[i + 1][1] > t);
      return '<li class="' + (nowStep ? 'is-now' : done ? 'is-done' : '') + '"><b>' + s[0] + '</b><span>' + U.dt(s[1], i >= 2 && i <= 4) + '</span></li>';
    }).join('') + '</ul>';
    var qs = (a.queries || []).filter(function (x) { return x.public && x.a || (me && x.userId === me.id); });
    q('[data-pane="qa"]').innerHTML = (qs.length ? '<div class="ad-qa">' + qs.map(function (x) { return '<div><strong>Q: ' + esc(x.q) + '</strong>' + (x.a ? '<p><b>Bank:</b> ' + esc(x.a) + '</p>' : '<p class="ap-mini">Waiting for the bank’s answer' + (x.public ? '' : ' (only you can see this)') + '</p>') + '</div>'; }).join('') + '</div>' : '<p class="ap-muted">No public questions yet.</p>') +
      '<button type="button" class="ap-btn" style="margin-top:1rem" data-act="ask">' + ic('chat', 17) + 'Ask the bank a question</button>';
    q('[data-pane="case"]').innerHTML = '<div class="ad-specs"><div><small>Bank</small><b>' + esc(bank.name) + '</b></div><div><small>Branch</small><b>' + esc(a.branch || '') + '</b></div><div><small>Sale type</small><b>' + esc(S.KIND[a.kind]) + '</b></div>' +
      (a.borrower ? '<div><small>Borrower / guarantor</small><b>' + esc(a.borrower) + '</b></div>' : '') + (a.outstanding ? '<div><small>Dues outstanding</small><b>' + U.short(a.outstanding) + '</b></div>' : '') +
      (a.demandNotice ? '<div><small>Demand notice 13(2)</small><b>' + U.dt(a.demandNotice) + '</b></div>' : '') + (a.possessionNotice ? '<div><small>Possession notice 13(4)</small><b>' + U.dt(a.possessionNotice) + '</b></div>' : '') +
      (a.valuation ? '<div><small>Valuation</small><b>' + U.short(a.valuation) + '</b></div>' : '') + '</div>' +
      (a.contact ? '<p class="ad-p" style="margin-top:1rem"><b>Contact:</b> ' + esc(a.contact.name) + ' · <a href="tel:' + esc(a.contact.phone) + '">' + esc(a.contact.phone) + '</a></p>' : '');
    q('[data-pane="terms"]').innerHTML = '<p class="ad-p">' + esc(a.terms || '') + '</p><ul class="hl-docs" style="margin-top:1rem"><li>EMD of ' + U.inr(a.emd) + ' must reach the bank before ' + U.dt(a.emdDeadline, true) + '.</li><li>Bids go up in steps of ' + U.inr(a.increment) + '. The first bid must be at least the reserve price.</li><li>A bid in the last ' + a.extWindow + ' minutes extends the auction by ' + a.extMin + ' minutes.</li><li>The winner pays 25% of the sale price (including EMD) by the next working day and the balance within 15 days, or the EMD is forfeited.</li><li>Unsuccessful bidders get their EMD refunded to their verified bank account.</li></ul>';
  }
  document.addEventListener('click', function (e) {
    var d = e.target.closest('[data-doc]');
    if (d) UI.toast(d.getAttribute('data-doc') + ' – demo document (the bank uploads the real PDF)');
  });

  /* ---------- dynamic parts ---------- */
  function clockHtml(ms, label, urgent) {
    var p = U.parts(ms);
    return '<p class="lbl" style="margin-top:.9rem">' + label + '</p><div class="ad-clock' + (urgent ? ' is-urgent' : '') + '" id="ad-clock"><div><b>' + p.d + '</b><small>days</small></div><div><b>' + U.pad(p.h) + '</b><small>hrs</small></div><div><b>' + U.pad(p.m) + '</b><small>min</small></div><div><b>' + U.pad(p.s) + '</b><small>sec</small></div></div>';
  }
  function renderPrice(bump) {
    var p = S.phase(a), t = Date.now(), live = p === 'live' || p === 'paused';
    var sold = ['h1', 'confirmed', 'paid25', 'paid75', 'certificate'].indexOf(p) !== -1;
    var price = a.bidCount ? a.currentHigh : a.reserve, up = a.bidCount ? (a.currentHigh / a.reserve - 1) * 100 : 0;
    var bidders = S.partsOf(a.id).filter(function (x) { return x.status === 'approved'; }).length;
    $('ad-badge').innerHTML = U.badge(a);
    $('ad-price').innerHTML = '<p class="lbl">' + (live ? 'Current highest bid' : sold ? 'Sold at' : p === 'unsold' ? 'Reserve price (no bids)' : 'Reserve price') + '</p>' +
      '<p class="big' + (bump ? ' is-bump' : '') + '">' + U.inr(price) + '</p><div class="meta">' + (a.bidCount ? '<span class="up">+' + up.toFixed(1) + '% over reserve</span>' : '') + '<span>' + a.bidCount + ' bids</span><span>' + bidders + ' approved bidders</span></div>' +
      (live ? (p === 'paused' ? '<div class="ad-status is-warn" style="margin-top:1rem">' + ic('clock', 18) + 'Paused by the bank – lost time will be added back.</div>' : clockHtml(a.endAt - t, 'Auction ends in', a.endAt - t < 5 * 60e3)) :
        p === 'registration' || p === 'upcoming' ? clockHtml(a.startAt - t, 'Auction starts in', false) : '<p class="lbl" style="margin-top:.9rem">Ended ' + U.dt(a.endAt, true) + '</p>') +
      '<div class="ad-ext' + (a.extCount ? ' is-on' : '') + '">' + ic('clock', 15) + 'Extended ' + a.extCount + '× (+' + a.extMin + ' min for late bids)</div>' +
      '<div class="ad-kv"><div><small>Reserve price</small><b>' + U.short(a.reserve) + '</b></div><div><small>EMD</small><b>' + U.short(a.emd) + '</b></div><div><small>Bid step</small><b>' + U.inr(a.increment) + '</b></div><div><small>Start / end</small><b style="font-size:.78rem">' + U.dt(a.startAt, true) + '</b></div></div>';
  }
  function feedHtml(bids, mine) {
    return '<ul class="ad-feed">' + bids.slice().reverse().slice(0, 40).map(function (b, i) {
      var isMe = mine && b.partId === mine.id;
      return '<li class="' + (isMe ? 'is-me ' : '') + (i === 0 && b.at > Date.now() - 5000 ? 'is-new' : '') + '"><span class="who">' + esc(b.alias) + '</span><span>' + (isMe ? 'You' : 'Bidder #' + esc(b.alias)) + (b.proxy ? '<span class="tag">auto</span>' : '') + (b.extended ? '<span class="tag">+' + a.extMin + ' min</span>' : '') +
        '<small>' + new Date(b.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' }) + '</small></span><span class="amt">' + U.inr(b.amount) + '</span></li>';
    }).join('') + '</ul>';
  }
  function chartHtml(bids) {
    if (bids.length < 2) return '';
    var W = 600, H = 160, L = 8, R = 8, T = 10, B = 18, t0 = a.startAt, t1 = Math.max(Date.now(), bids[bids.length - 1].at) , lo = a.reserve, hi = Math.max(bids[bids.length - 1].amount, a.reserve + a.increment);
    function x(t) { return L + (W - L - R) * (t - t0) / Math.max(1, t1 - t0); }
    function y(v) { return T + (H - T - B) * (1 - (v - lo) / Math.max(1, hi - lo)); }
    var d = 'M' + x(t0) + ' ' + y(lo);
    bids.forEach(function (b) { d += ' H' + x(b.at).toFixed(1) + ' V' + y(b.amount).toFixed(1); });
    d += ' H' + x(t1);
    return '<div class="ad-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Price over time"><defs><linearGradient id="ad-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2563eb" stop-opacity=".16"/><stop offset="1" stop-color="#2563eb" stop-opacity="0"/></linearGradient></defs>' +
      '<g class="grid"><line x1="0" x2="' + W + '" y1="' + y(lo) + '" y2="' + y(lo) + '"/><line x1="0" x2="' + W + '" y1="' + y(hi) + '" y2="' + y(hi) + '"/></g>' +
      '<path class="a" d="' + d + ' V' + (H - B) + ' H' + x(t0) + 'Z"/><path class="l" vector-effect="non-scaling-stroke" d="' + d + '"/></svg>' +
      '<div style="display:flex;justify-content:space-between" class="ap-mini"><span>Reserve ' + U.short(lo) + '</span><span>Now ' + U.short(hi) + '</span></div></div>';
  }
  function ago(t) {
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    return s < 60 ? s + 's ago' : s < 3600 ? Math.floor(s / 60) + ' min ago' : U.dt(t, true);
  }
  function renderLive() {
    var bids = S.bidsOf(a.id), mine = myPart(), p = S.phase(a), live = p === 'live', before = p === 'registration' || p === 'upcoming';
    var head = '<div class="ad-room-h"><div><p class="ad-room-k">' + (live ? '<i class="ac-live-dot"></i>Live now' : p === 'paused' ? 'Paused' : before ? 'Bidding room' : 'Auction ended') + '</p>' +
      '<h2>' + (live || p === 'paused' ? 'Watch the bidding live' : before ? 'Bidding opens soon' : 'Bid history') + '</h2>' +
      '<p>' + (live ? 'Every bid shows up here the moment it is placed. No refresh needed.' : 'Bidder identities stay hidden until the bank confirms the result.') + '</p></div>' +
      (bids.length ? '<span class="ap-dpill">' + bids.length + ' bid' + (bids.length === 1 ? '' : 's') + '</span>' : '') + '</div>';
    if (!bids.length) {
      $('ad-livecard').innerHTML = head + '<div class="ad-room-empty">' + ic(before ? 'clock' : 'info', 26) +
        '<b>' + (before ? 'Bids will stream here live' : 'No bids were placed') + '</b><p>' + (before ? 'The auction opens on ' + U.dt(a.startAt, true) + '. Keep this page open, or get a reminder before it starts.' : 'The bank may re-auction this asset at a revised price.') + '</p>' +
        (before ? '<button type="button" class="ap-btn" data-act="remind">' + ic('bell', 17) + 'Remind me before it starts</button>' : '<a class="ap-btn" href="auctions.html#alerts">' + ic('bell', 17) + 'Set an alert</a>') + '</div>';
      return;
    }
    var top = bids[bids.length - 1], isMe = mine && top.partId === mine.id;
    $('ad-livecard').innerHTML = head +
      '<div class="ad-latest' + (top.at > Date.now() - 6000 ? ' is-new' : '') + '"><span class="who">' + esc(top.alias) + '</span><div><small>' + (live ? 'Latest bid' : 'Final bid') + ' · ' + (isMe ? 'You' : 'Bidder #' + esc(top.alias)) + ' · <span data-ago="' + top.at + '">' + ago(top.at) + '</span></small><b>' + U.inr(top.amount) + '</b></div>' +
      (a.reserve ? '<span class="ad-latest-up">+' + ((top.amount / a.reserve - 1) * 100).toFixed(1) + '%<small>over reserve</small></span>' : '') + '</div>' +
      chartHtml(bids) + feedHtml(bids, mine);
  }

  /* ---------- console: what this visitor can do now ---------- */
  var draftAmt = '', proxyOpen = false, proxyDraft = '';
  // 0 sign up, 1 KYC, 2 EMD (apply or in review), 3 bid
  function stepOf() {
    var prof = profile(), part = myPart();
    if (!me) return 0;
    if (!prof || prof.kyc !== 'verified') return 1;
    if (!part || part.status !== 'approved') return 2;
    return 3;
  }
  function stepsHtml(cur, waiting) {
    return '<ol class="ad-steps" aria-label="Your progress">' + ['Sign up', 'KYC', 'Pay EMD', 'Bid live'].map(function (s, i) {
      var st = i < cur ? 'is-done' : i === cur ? (waiting ? 'is-wait' : 'is-now') : '';
      return '<li class="' + st + '"' + (i === cur ? ' aria-current="step"' : '') + '><i>' + (i < cur ? ic('check', 13) : i + 1) + '</i><span>' + s + '</span></li>';
    }).join('') + '</ol>';
  }
  // mobile sticky bar: price, clock and the one next action
  function renderBar() {
    var p = S.phase(a), part = myPart(), live = p === 'live' || p === 'paused', step = stepOf();
    var sold = ['h1', 'confirmed', 'paid25', 'paid75', 'certificate'].indexOf(p) !== -1, ended = !live && p !== 'registration' && p !== 'upcoming';
    var price = a.bidCount ? a.currentHigh : a.reserve, tm = U.timer(a), cta;
    if (ended) cta = part && part.status === 'approved' && a.highPart === part.id ? '<a class="ap-btn is-primary" href="#ad-console" data-go-console>Next steps</a>' : '<a class="ap-btn is-primary" href="auctions.html">More auctions</a>';
    else if (step === 0) cta = '<a class="ap-btn is-primary" href="' + joinUrl + '">Start bidding</a>';
    else if (step === 1) cta = '<button type="button" class="ap-btn is-primary" data-act="kyc">Complete KYC</button>';
    else if (step === 2 && (!part || part.status === 'rejected')) cta = p === 'upcoming' ? '<button type="button" class="ap-btn is-primary" data-act="remind">Remind me</button>' : '<button type="button" class="ap-btn is-primary" data-act="apply">Pay EMD</button>';
    else if (step === 2) cta = '<a class="ap-btn" href="#live" data-go-live>EMD in review</a>';
    else if (p === 'live' && a.highPart === part.id) cta = '<span class="ad-bar-lead">' + ic('check', 16) + 'You lead</span>';
    else if (p === 'live') cta = '<button type="button" class="ap-btn is-primary" data-quick="' + S.nextMin(a) + '">Bid ' + U.short(S.nextMin(a)) + '</button>';
    else cta = '<a class="ap-btn" href="#ad-console" data-go-console>Auto-bid</a>';
    $('ad-bar').innerHTML = '<a class="ad-bar-info" href="#live" data-go-live><small>' + (live ? '<i class="ac-live-dot"></i>Current bid' : sold ? 'Sold at' : 'Reserve price') + '</small><b>' + U.short(price) + '</b>' +
      '<span class="ac-timer' + (tm.urgent ? ' is-urgent' : '') + '" data-timer="' + esc(a.id) + '">' + ic('clock', 13) + tm.text + '</span></a>' + cta;
  }
  function renderConsole() {
    var p = S.phase(a), part = myPart(), prof = profile(), html = '', live = p === 'live';
    var inp = $('bid-amt'); if (inp) draftAmt = inp.value;
    // keep what the bidder is doing (open panel, typed maximum, cursor) across live refreshes
    var det = document.querySelector('.ad-proxy'), pin = $('proxy-amt'), act = document.activeElement;
    if (det) proxyOpen = det.open; if (pin) proxyDraft = pin.value;
    var focusId = act && (act.id === 'bid-amt' || act.id === 'proxy-amt') ? act.id : '';
    var regOpen = p === 'registration' || p === 'live', open = regOpen || p === 'upcoming' || p === 'paused';
    var step = stepOf();
    if (!me && open) {
      html = '<h3>Start bidding in 4 simple steps</h3><p class="ap-muted">Free to join. Your EMD is fully refunded if you don’t win.</p>' + stepsHtml(0) +
        '<ol class="ad-how"><li><b>Create a free account</b><span>Mobile number and a password · 1 min</span></li><li><b>Verify your KYC</b><span>PAN, Aadhaar e-KYC and refund bank account · 3 min</span></li>' +
        '<li><b>Pay the EMD of ' + U.short(a.emd) + '</b><span>NEFT / RTGS to the bank · last date ' + U.dt(a.emdDeadline) + '</span></li><li><b>Bid live from any device</b><span>Quick-bid buttons or set an automatic maximum</span></li></ol>' +
        '<a class="ap-btn is-primary ad-cta" href="' + joinUrl + '">' + ic('sparkle', 18) + 'Start bidding</a>' +
        '<a class="ap-btn ad-cta2" href="#live" data-go-live>' + '<i class="ac-live-dot"></i>' + (p === 'live' ? 'Just watch it live' : 'See the bidding room') + '</a>' +
        '<p class="ad-hint" style="text-align:center">Already registered? <a href="' + loginUrl + '">Log in</a></p>';
    } else if (!me) {
      html = postHtml(p, null);
    } else if (!prof || prof.kyc !== 'verified') {
      html = '<h3>Step 2 of 4 – Verify your KYC</h3>' + stepsHtml(step) + '<p class="ap-muted">PAN, Aadhaar e-KYC and the bank account for EMD refunds. Takes about 3 minutes.</p>' +
        (prof && prof.kyc === 'review' ? '<div class="ad-status is-warn">' + ic('clock', 18) + 'Your KYC is under review: ' + esc(prof.flag || '') + '</div>' : '') +
        '<button type="button" class="ap-btn is-primary ad-cta" data-act="kyc">' + ic('shield', 18) + (prof ? 'Update KYC' : 'Complete KYC') + '</button>';
    } else if (!part || part.status === 'rejected') {
      html = '<h3>Step 3 of 4 – Pay EMD & apply</h3>' + stepsHtml(step) + (part ? '<div class="ad-status is-out">Your EMD was rejected: ' + esc(part.reason || 'please contact the bank') + '</div>' : '<p class="ap-muted">Pay the refundable EMD of <b>' + U.inr(a.emd) + '</b> and submit the bid form. The bank approves you, then you can bid.</p>') +
        (regOpen ? '<button type="button" class="ap-btn is-primary ad-cta" data-act="apply">' + ic('rupee', 18) + 'Pay EMD & apply</button><p class="ad-hint">Last date: ' + U.dt(a.emdDeadline, true) + '</p>'
          : p === 'upcoming' ? '<div class="ad-status is-info">' + ic('clock', 18) + 'EMD registration opens soon. We will remind you.</div><button type="button" class="ap-btn ad-cta" data-act="remind">' + ic('bell', 18) + 'Remind me</button>'
          : '<div class="ad-status is-info">Registration for this auction is closed.</div>');
    } else if (part.status === 'pending') {
      html = '<h3>Almost there – EMD in review</h3>' + stepsHtml(step, true) + '<div class="ad-status is-info">' + ic('clock', 18) + 'The bank is checking your EMD (UTR ' + esc(part.emd.utr) + '). You can bid as soon as it is approved.</div>' +
        '<a class="ap-btn ad-cta2" href="#live" data-go-live><i class="ac-live-dot"></i>Watch the bidding meanwhile</a>';
    } else if (live) {
      var lead = a.highPart === part.id, min = S.nextMin(a);
      html = '<h3>Place your bid</h3>' + stepsHtml(3) + (lead ? '<div class="ad-status is-lead">' + ic('check', 18) + 'You are the highest bidder</div>' : a.bidCount && S.bidsOf(a.id).some(function (b) { return b.partId === part.id; }) ? '<div class="ad-status is-out">' + ic('bell', 18) + 'You have been outbid</div>' : '<div class="ad-status is-info">You are approved as Bidder #' + esc(part.alias) + '</div>') +
        '<div class="ad-quick">' + [1, 2, 5].map(function (k) { var v = min + (k - 1) * a.increment; return '<button type="button" data-quick="' + v + '">+' + (k === 1 ? '1 step' : k + ' steps') + '<br><b>' + U.short(v) + '</b></button>'; }).join('') + '</div>' +
        '<div class="ad-amt"><div class="ap-money"><span>₹</span><input class="ap-input" id="bid-amt" inputmode="numeric" aria-label="Bid amount" placeholder="' + App.inr(min) + '"></div><button type="button" class="ap-btn is-primary" data-act="bid"' + (lead ? ' disabled' : '') + '>Place bid</button></div>' +
        '<p class="ad-hint">Minimum next bid ' + U.inr(min) + ' · steps of ' + U.inr(a.increment) + '</p><p class="ap-err" id="bid-err"></p>' + proxyHtml(part);
    } else if (p === 'registration' || p === 'upcoming') {
      html = '<h3>You are ready to bid</h3>' + stepsHtml(3) + '<div class="ad-status is-lead">' + ic('check', 18) + 'Bidder #' + esc(part.alias) + ' · EMD verified</div><p class="ap-muted">Bidding opens ' + U.dt(a.startAt, true) + '. You can set an automatic maximum bid now.</p>' + proxyHtml(part);
    } else if (p === 'paused') {
      html = '<h3>Auction paused</h3><div class="ad-status is-warn">The bank has paused this auction. Bidding resumes shortly.</div>';
    } else {
      html = postHtml(p, part);
    }
    $('ad-console').innerHTML = html;
    var ni = $('bid-amt'); if (ni && draftAmt) ni.value = draftAmt;
    var nd = document.querySelector('.ad-proxy'); if (nd && proxyOpen) nd.open = true;
    var np = $('proxy-amt'); if (np && proxyDraft && document.querySelector('.ad-proxy')) np.value = proxyDraft;
    if (np) np.addEventListener('input', function () { var d = np.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11); np.value = d ? App.inr(+d) : ''; });
    if (focusId && $(focusId)) { var fe = $(focusId); fe.focus({ preventScroll: true }); try { fe.setSelectionRange(fe.value.length, fe.value.length); } catch (e) {} }
    if (ni) ni.addEventListener('input', function () { var d = ni.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11); ni.value = d ? App.inr(+d) : ''; });
  }
  function proxyHtml(part) {
    return '<details class="ad-proxy"' + (part.proxyMax ? ' open' : '') + '><summary>' + ic('sparkle', 16) + 'Automatic maximum bid' + (part.proxyMax ? ' · ' + U.short(part.proxyMax) : '') + '</summary>' +
      '<p class="ad-hint" style="margin:.5rem 0">We bid for you one step at a time, only when someone outbids you, up to your maximum. Other bidders never see it.</p>' +
      '<div class="ad-amt"><div class="ap-money"><span>₹</span><input class="ap-input" id="proxy-amt" inputmode="numeric" placeholder="Your maximum" value="' + (part.proxyMax ? App.inr(part.proxyMax) : '') + '"></div><button type="button" class="ap-btn is-dark" data-act="proxy">' + (part.proxyMax ? 'Update' : 'Set') + '</button></div>' +
      (part.proxyMax ? '<button type="button" class="ap-link" style="margin-top:.5rem" data-act="proxy-off">Turn off automatic bidding</button>' : '') + (part.proxyOutbid ? '<p class="ad-hint" style="color:#b42318">Your previous maximum was outbid.</p>' : '') + '</details>';
  }
  function postHtml(p, part) {
    var won = part && part.status === 'approved' && a.highPart === part.id, pay = (part && part.payments) || {};
    if (p === 'unsold' || p === 'cancelled') return '<h3>' + (p === 'unsold' ? 'No bids received' : 'Auction cancelled') + '</h3><p class="ap-muted">' + (part && part.status === 'approved' ? 'Your EMD of ' + U.inr(part.emd.amount) + ' will be refunded to your bank account.' : 'The bank may re-auction this asset at a revised reserve price. Set an alert so you don’t miss it.') + '</p><a class="ap-btn" style="width:100%" href="auctions.html#alerts">Set an alert</a>';
    if (!part || part.status !== 'approved') return '<h3>Auction closed</h3><p class="ap-muted">This auction has ended. See live and upcoming auctions.</p><a class="ap-btn is-primary" style="width:100%" href="auctions.html">Browse auctions</a>';
    if (!won) return '<h3>Auction closed</h3><div class="ad-status is-info">Your highest bid was not the winning bid.</div><p class="ap-muted">EMD refund of ' + U.inr(part.emd.amount) + ': <b>' + (part.refund ? 'refunded ' + U.dt(part.refund.at) : 'processed after the bank confirms the sale') + '</b></p>';
    var p25 = Math.max(0, Math.round(a.currentHigh * 0.25) - part.emd.amount), p75 = a.currentHigh - Math.round(a.currentHigh * 0.25);
    var steps = [['H1 declared', true], ['Bank confirms sale', ['confirmed', 'paid25', 'paid75', 'certificate'].indexOf(p) !== -1], ['25% payment', !!pay.p25], ['Balance 75%', !!pay.p75], ['Sale certificate', p === 'certificate']];
    var html = '<h3>🎉 You won this auction</h3><div class="ad-status is-lead">Winning bid ' + U.inr(a.currentHigh) + '</div><ul class="ad-tl" style="margin:.75rem 0">' + steps.map(function (s) { return '<li class="' + (s[1] ? 'is-done' : '') + '"><b>' + s[0] + '</b><span>' + (s[1] ? '✓' : '') + '</span></li>'; }).join('') + '</ul>';
    if (p === 'h1') html += '<p class="ap-muted">The bank will confirm the sale shortly. Keep the 25% payment of ' + U.inr(p25) + ' ready.</p>';
    else if (p === 'confirmed' && !pay.p25) html += '<button type="button" class="ap-btn is-primary" style="width:100%;height:46px" data-act="pay25">Pay 25% – ' + U.short(p25) + '</button><p class="ad-hint">Due by the next working day. EMD is adjusted.</p>';
    else if ((p === 'confirmed' || p === 'paid25') && pay.p25 && !pay.p75) html += (pay.p25.status === 'submitted' ? '<div class="ad-status is-info">25% payment submitted – the bank is verifying it.</div>' : '') + '<button type="button" class="ap-btn is-primary" style="width:100%;height:46px" data-act="pay75">Pay balance 75% – ' + U.short(p75) + '</button><button type="button" class="ap-link" style="margin-top:.5rem" data-act="extension">Request more time</button>' + (part.extension ? '<p class="ad-hint">Extension ' + part.extension.status + '.</p>' : '');
    else if (p !== 'certificate') html += '<div class="ad-status is-info">Payment received. The bank will issue the sale certificate.</div>';
    else html += '<button type="button" class="ap-btn is-primary" style="width:100%;height:46px" data-act="cert">' + ic('download', 18) + 'View sale certificate</button>';
    return html;
  }
  function renderMore() {
    var w = S.isWatched(U.userKey(), a.id), p = S.phase(a), before = Date.now() < a.startAt;
    $('ad-watch').innerHTML = ic('bookmark', 17) + (w ? 'Watching' : 'Watch');
    $('ad-watch').classList.toggle('is-soft', w);
    $('ad-more').innerHTML = '<h2 style="font-size:1rem;font-weight:600;margin-bottom:.75rem">More actions</h2><div class="ap-actions-list">' +
      (before ? '<button type="button" class="ap-btn" data-act="inspect">' + ic('calendar', 18) + 'Book a site inspection</button>' : '') +
      '<button type="button" class="ap-btn" data-act="ask">' + ic('chat', 18) + 'Ask the bank a question</button>' +
      (before ? '<button type="button" class="ap-btn" data-act="remind">' + ic('bell', 18) + 'Remind me before it starts</button>' : '') +
      '<a class="ap-btn" href="home-loans.html#home-loan-search">' + ic('home', 18) + 'Get a loan for this purchase</a>' +
      '<a class="ap-btn" href="auction-bidder.html#disputes">' + ic('info', 18) + 'Report an issue</a></div>';
  }

  /* ---------- actions ---------- */
  function need(fn) { return function () { if (!me) { location.href = loginUrl; return; } fn.apply(null, arguments); }; }
  var ACT = {
    kyc: need(kycForm), apply: need(applyForm), inspect: need(inspectForm), ask: need(askForm),
    remind: function () { S.toggleWatch(U.userKey(), a.id); if (!S.isWatched(U.userKey(), a.id)) S.toggleWatch(U.userKey(), a.id); UI.toast('We will remind you 1 hour and 15 minutes before the auction starts'); renderMore(); },
    bid: function () { var v = num($('bid-amt').value) || S.nextMin(a); confirmBid(v); },
    proxy: function () { var part = myPart(), v = num($('proxy-amt').value); try { S.setProxy(part.id, v); proxyDraft = ''; UI.toast('Automatic bidding on, up to ' + U.inr(v)); } catch (e) { UI.toast(e.message); } },
    'proxy-off': function () { proxyDraft = ''; proxyOpen = false; S.setProxy(myPart().id, 0); UI.toast('Automatic bidding turned off'); },
    pay25: function () { payForm('p25'); }, pay75: function () { payForm('p75'); },
    extension: function () { extForm(); },
    cert: function () { window.open('auction-bank.html#cert/' + encodeURIComponent(a.id), '_blank'); }
  };
  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quick]'); if (q) { var v = +q.getAttribute('data-quick'), bi = $('bid-amt'); if (bi) bi.value = App.inr(v); confirmBid(v); return; }
    var g = e.target.closest('[data-go-live],[data-go-console]'); if (g) { e.preventDefault(); goTo(g.hasAttribute('data-go-live') ? 'live' : 'ad-console'); return; }
    var b = e.target.closest('[data-act]'); if (b && ACT[b.getAttribute('data-act')]) { e.preventDefault(); ACT[b.getAttribute('data-act')](); }
    if (e.target.closest('#ad-watch')) { var on = S.toggleWatch(U.userKey(), a.id); UI.toast(on ? 'Added to your watchlist' : 'Removed from watchlist'); renderMore(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'bid-amt') ACT.bid(); });

  function confirmBid(v) {
    var min = S.nextMin(a), big = v >= min + 5 * a.increment, otp = String(Math.floor(1000 + Math.random() * 9000));
    var dr = UI.openDrawer({ title: 'Confirm your bid', body:
      '<div class="af-box">You are bidding <b style="font-size:1.4rem;display:block;margin:.2rem 0">' + U.inr(v) + '</b>on <b>' + esc(a.title) + '</b> (' + esc(a.ref) + '). Bids cannot be withdrawn.</div>' +
      (big ? '<div class="ad-status is-warn" style="margin-top:1rem">This is ' + Math.round((v - min) / a.increment + 1) + ' steps above the minimum. Enter the OTP sent to your mobile to confirm.</div><div class="ap-field"><label>OTP</label><input class="ap-input" name="otp" inputmode="numeric" maxlength="4" placeholder="4-digit OTP"><p class="ap-err">Wrong OTP.</p></div><p class="ap-mini">Demo OTP: <b>' + otp + '</b></p>' : '') +
      '<p class="ap-err" id="cb-err"></p>',
      foot: '<button type="button" class="ap-btn" data-dclose2>Cancel</button><button type="button" class="ap-btn is-primary" data-go>' + ic('check', 18) + 'Confirm bid</button>', focus: big ? '[name=otp]' : '[data-go]' });
    dr.querySelector('[data-dclose2]').onclick = UI.closeDrawer;
    dr.querySelector('[data-go]').onclick = function () {
      if (big) { var o = dr.querySelector('[name=otp]'); if (bad(dr, 'otp', o.value !== otp)) return; }
      try { S.placeBid(a.id, myPart().id, v); a = S.get(id); UI.closeDrawer(); draftAmt = ''; UI.toast('Bid placed – ' + U.inr(v)); }
      catch (err) { var e2 = dr.querySelector('#cb-err'); e2.textContent = err.message; e2.classList.add('is-on'); }
    };
  }

  function applyForm() {
    var prof = profile(), today = new Date().toISOString().slice(0, 10);
    var body = '<div class="af-steps"><span class="is-on"></span><span class="is-on"></span><span></span></div>' +
      '<div class="af-box">Pay the EMD of <b>' + U.inr(a.emd) + '</b> by NEFT / RTGS to:<br><b>' + esc(bank.name) + ' – Auction EMD account</b><br>A/c 6012' + String(a.ref.length * 7919).slice(0, 6) + ' · IFSC ' + (bank.id || 'BANK').toUpperCase().slice(0, 4) + '0001234<br>Use reference <b>' + esc(a.ref) + '</b>. Last date ' + U.dt(a.emdDeadline, true) + '.</div>' +
      '<form id="pf" novalidate style="margin-top:1rem"><div class="ap-fgrid">' +
      fld('Payment method', '<select class="ap-input" name="method">' + opts([['NEFT', 'NEFT'], ['RTGS', 'RTGS'], ['IMPS', 'IMPS'], ['DD', 'Demand draft']], 'NEFT') + '</select>') +
      fld('UTR / transaction reference', '<input class="ap-input" name="utr" placeholder="e.g. MAHBN26101412345" style="text-transform:uppercase">', 'Enter the UTR / reference (at least 6 characters).') +
      fld('Amount paid', money('amount', 'EMD amount', a.emd), 'The EMD must be at least ' + U.inr(a.emd) + '.') +
      fld('Date paid', '<input class="ap-input" type="date" name="date" max="' + today + '" value="' + today + '">', 'Choose the payment date.') +
      fld('Payment proof (optional)', '<input class="ap-input" type="file" name="proof" accept=".pdf,.jpg,.png" style="padding-top:.6rem">', '', true) +
      fld('Joint bidder (optional)', '<input class="ap-input" name="joint" placeholder="Name of joint bidder, if any">') +
      fld('Need a loan for this purchase?', '<select class="ap-input" name="loan">' + opts([['no', 'No'], ['yes', 'Yes – help me with a loan']], 'no') + '</select>') +
      fld('Agent / referral code (optional)', '<input class="ap-input" name="agent">', '', true) +
      '</div><div class="ap-fsec" style="margin-top:1rem"><h3>Declarations</h3>' +
      ['I have inspected the asset or chosen not to, and I buy it on an “as is where is” basis.', 'I have read the sale notice, terms and conditions of this auction.', 'I understand that bids cannot be withdrawn and the EMD is forfeited if I win and don’t pay on time.', prof.dsc === 'yes' ? 'I sign the bid form with my Digital Signature Certificate.' : 'I will sign the bid form (DSC or physical signature) as required by the bank.'].map(function (t, i) { return '<label class="ap-check" style="margin-bottom:.5rem"><input type="checkbox" name="d' + i + '"><span>' + t + '</span></label>'; }).join('') +
      '<p class="ap-err" data-for="decl">Please accept all declarations.</p></div></form>';
    var dr = UI.openDrawer({ title: 'Apply to bid – ' + esc(a.ref), body: body, foot: '<button type="button" class="ap-btn" data-dclose2>Cancel</button><button type="button" class="ap-btn is-primary" data-go>Submit application</button>', focus: '[name=utr]' });
    var f = dr.querySelector('#pf'); wireMoney(f);
    dr.querySelector('[data-dclose2]').onclick = UI.closeDrawer;
    dr.querySelector('[data-go]').onclick = function () {
      var e1 = bad(f, 'utr', f.utr.value.trim().length < 6), e2 = bad(f, 'amount', num(f.amount.value) < a.emd), e3 = bad(f, 'date', !f.date.value);
      var dErr = [0, 1, 2, 3].some(function (i) { return !f['d' + i].checked; }); dr.querySelector('[data-for="decl"]').classList.toggle('is-on', dErr);
      if (e1 || e2 || e3 || dErr) return;
      try {
        var part = S.participate(a.id, me.id, { emd: { method: f.method.value, utr: f.utr.value.trim().toUpperCase(), amount: num(f.amount.value), date: f.date.value, proof: f.proof.files[0] ? f.proof.files[0].name : '' },
          joint: f.joint.value.trim(), loanNeeded: f.loan.value === 'yes', agentCode: f.agent.value.trim(), declaration: true });
        UI.closeDrawer(); UI.toast('Application submitted – the bank is verifying your EMD');
        if (a.demo) setTimeout(function () { S.reviewPart(part.id, true, '', 'Demo bank'); UI.toast('EMD verified – you are approved to bid (demo)'); }, 3500);
      } catch (err) { UI.toast(err.message); }
    };
  }

  function inspectForm() {
    var body = '<form id="if" novalidate><div class="ap-fsec"><h3>' + ic('calendar', 15) + 'Choose a slot</h3>' + (a.inspection || []).map(function (d, i) {
      return '<p class="ap-label" style="margin:.5rem 0 .4rem">' + U.dt(d.date) + '</p><div class="af-slot">' + d.slots.map(function (s, j) { return '<label><input type="radio" name="slot" value="' + d.date + ' ' + s + '"' + (!i && !j ? ' checked' : '') + '><span>' + s + '</span></label>'; }).join('') + '</div>';
    }).join('') + '</div><div class="ap-fgrid">' + fld('Number of visitors', '<select class="ap-input" name="count">' + opts([['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], '1') + '</select>') +
      fld('Contact number', '<input class="ap-input" name="phone" inputmode="tel" value="' + esc((me.profile || {}).mobile || '') + '">', 'Enter a valid 10-digit mobile.') +
      fld('Visitor names', '<input class="ap-input" name="names" value="' + esc((me.profile || {}).fullName || '') + '">', 'Enter the visitor names.', true) + '</div><p class="ap-mini" style="margin-top:.75rem">Carry a photo ID. The bank’s officer will meet you at the site.</p></form>';
    var dr = UI.openDrawer({ title: 'Book a site inspection', body: body, foot: '<button type="button" class="ap-btn" data-dclose2>Cancel</button><button type="button" class="ap-btn is-primary" data-go>Request slot</button>' });
    var f = dr.querySelector('#if'); dr.querySelector('[data-dclose2]').onclick = UI.closeDrawer;
    dr.querySelector('[data-go]').onclick = function () {
      var ph = f.phone.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      if (bad(f, 'phone', !/^[6-9]\d{9}$/.test(ph)) | bad(f, 'names', f.names.value.trim().length < 2)) return;
      S.bookInspection(a.id, me.id, { slot: (f.querySelector('[name=slot]:checked') || {}).value, count: f.count.value, phone: ph, names: f.names.value.trim(), name: App.displayName(me) });
      UI.closeDrawer(); UI.toast('Inspection requested – the bank will confirm your slot');
    };
  }
  function askForm() {
    var body = '<form id="qf" novalidate><div class="ap-fgrid">' + fld('Topic', '<select class="ap-input" name="cat">' + opts([['legal', 'Legal / title'], ['possession', 'Possession'], ['dues', 'Dues & taxes'], ['documents', 'Documents'], ['payment', 'Payment / EMD'], ['other', 'Other']], 'legal') + '</select>', '', true) +
      fld('Your question', '<textarea class="ap-input" name="q" rows="4" placeholder="e.g. Are society maintenance dues included in the reserve price?"></textarea>', 'Please write your question (at least 10 characters).', true) + '</div><p class="ap-mini" style="margin-top:.75rem">The bank may publish the answer for all bidders without your name.</p></form>';
    var dr = UI.openDrawer({ title: 'Ask the bank', body: body, foot: '<button type="button" class="ap-btn" data-dclose2>Cancel</button><button type="button" class="ap-btn is-primary" data-go>Send question</button>', focus: '[name=q]' });
    var f = dr.querySelector('#qf'); dr.querySelector('[data-dclose2]').onclick = UI.closeDrawer;
    dr.querySelector('[data-go]').onclick = function () {
      if (bad(f, 'q', f.q.value.trim().length < 10)) return;
      S.ask(a.id, me.id, App.displayName(me), f.q.value.trim(), f.cat.value); UI.closeDrawer(); UI.toast('Question sent to the bank'); a = S.get(id); renderStatic();
    };
  }
  function payForm(kind) {
    var part = myPart(), amt = kind === 'p25' ? Math.max(0, Math.round(a.currentHigh * 0.25) - part.emd.amount) : a.currentHigh - Math.round(a.currentHigh * 0.25), today = new Date().toISOString().slice(0, 10);
    var body = '<div class="af-box">' + (kind === 'p25' ? '25% of ' + U.inr(a.currentHigh) + ' minus your EMD of ' + U.inr(part.emd.amount) : 'Balance 75% of ' + U.inr(a.currentHigh)) + ' = <b>' + U.inr(amt) + '</b><br>Pay to ' + esc(bank.name) + ' – Auction sale account, reference ' + esc(a.ref) + '.</div>' +
      '<form id="yf" novalidate style="margin-top:1rem"><div class="ap-fgrid">' + fld('Method', '<select class="ap-input" name="method">' + opts([['RTGS', 'RTGS'], ['NEFT', 'NEFT'], ['DD', 'Demand draft']], 'RTGS') + '</select>') +
      fld('UTR / reference', '<input class="ap-input" name="utr" style="text-transform:uppercase">', 'Enter the UTR (at least 6 characters).') + fld('Amount', money('amount', 'Amount', amt), 'Amount must be at least ' + U.inr(amt) + '.') +
      fld('Date paid', '<input class="ap-input" type="date" name="date" max="' + today + '" value="' + today + '">') + fld('Name for the sale certificate', '<input class="ap-input" name="certname" value="' + esc((profile() || {}).name || '') + '">', 'Enter the name for the certificate.', true) + '</div></form>';
    var dr = UI.openDrawer({ title: kind === 'p25' ? 'Pay 25% of the sale price' : 'Pay the balance 75%', body: body, foot: '<button type="button" class="ap-btn" data-dclose2>Cancel</button><button type="button" class="ap-btn is-primary" data-go>Submit payment</button>' });
    var f = dr.querySelector('#yf'); wireMoney(f); dr.querySelector('[data-dclose2]').onclick = UI.closeDrawer;
    dr.querySelector('[data-go]').onclick = function () {
      if (bad(f, 'utr', f.utr.value.trim().length < 6) | bad(f, 'amount', num(f.amount.value) < amt) | bad(f, 'certname', f.certname.value.trim().length < 3)) return;
      S.pay(part.id, kind, { method: f.method.value, utr: f.utr.value.trim().toUpperCase(), amount: num(f.amount.value), date: f.date.value, certName: f.certname.value.trim() });
      if (a.demo) setTimeout(function () { S.setPost(a.id, kind === 'p25' ? 'paid25' : 'paid75', 'Demo bank'); if (kind === 'p75') setTimeout(function () { S.setPost(a.id, 'certificate', 'Demo bank', { certificateAt: Date.now() }); }, 2500); }, 2500);
      UI.closeDrawer(); UI.toast('Payment submitted – the bank will verify it');
    };
  }
  function extForm() {
    var dr = UI.openDrawer({ title: 'Request more time for the 75% payment', body: '<form id="xf" novalidate>' + fld('Reason', '<textarea class="ap-input" name="r" rows="4" placeholder="e.g. Home loan sanctioned, disbursement expected in 3 weeks"></textarea>', 'Please give a reason.', true) + '<p class="ap-mini" style="margin-top:.75rem">The bank can extend the balance payment up to 3 months in writing.</p></form>',
      foot: '<button type="button" class="ap-btn" data-dclose2>Cancel</button><button type="button" class="ap-btn is-primary" data-go>Send request</button>' });
    var f = dr.querySelector('#xf'); dr.querySelector('[data-dclose2]').onclick = UI.closeDrawer;
    dr.querySelector('[data-go]').onclick = function () { if (bad(f, 'r', f.r.value.trim().length < 10)) return; S.requestExtension(myPart().id, f.r.value.trim()); UI.closeDrawer(); UI.toast('Extension request sent to the bank'); renderAll(); };
  }

  /* ---------- live loop ---------- */
  function renderAll(bump) { a = S.get(id) || a; renderPrice(bump); renderLive(); renderConsole(); renderMore(); renderBar(); }
  function goTo(elId) {
    var el = $(elId); if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
  }
  renderStatic(); renderAll();
  S.on(function (msg) {
    var before = { high: a.currentHigh, leader: a.highPart, ext: a.extCount };
    a = S.get(id) || a;
    var part = myPart();
    if (part && before.leader === part.id && a.highPart !== part.id) UI.toast('You have been outbid – the price is now ' + U.inr(a.currentHigh));
    if (a.extCount > before.ext) UI.toast('Late bid – auction extended by ' + a.extMin + ' minutes');
    renderAll(a.currentHigh !== before.high);
    if (msg && msg.type !== 'bid') renderStatic();
  });
  var lastPhase = S.phase(a);
  setInterval(function () {
    var ph = S.phase(a);
    if (ph !== lastPhase) { lastPhase = ph; renderAll(); renderStatic(); return; }
    U.tick($('ad-bar'));
    document.querySelectorAll('[data-ago]').forEach(function (el) { el.textContent = ago(+el.getAttribute('data-ago')); });
    var c = $('ad-clock'); if (!c) return;
    var t = Date.now(), ms = ph === 'live' ? a.endAt - t : a.startAt - t, p = U.parts(ms), b = c.querySelectorAll('b');
    b[0].textContent = p.d; b[1].textContent = U.pad(p.h); b[2].textContent = U.pad(p.m); b[3].textContent = U.pad(p.s);
    c.classList.toggle('is-urgent', ph === 'live' && ms < 5 * 60e3);
  }, 1000);
})();
