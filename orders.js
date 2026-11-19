/* My orders (orders.html): credit reports, client files (agents) and bank auction bids,
   each with a progress tracker. Credit report status comes from the payment server; the
   rest lives in this browser like the other account pages (see raven-app.js). */
(function () {
  var App = window.RavenApp, UI = window.RavenUI, Pay = window.CMPay, S = window.RavenAuctions;
  var me = App && App.guard();
  if (!me || !UI) return;
  var esc = App.esc, ic = UI.icon, $ = function (id) { return document.getElementById(id); };
  var isAgent = me.role === 'agent';
  var name = App.displayName(me);
  var RETRY_WINDOW_MS = 25 * 60 * 1000;
  var LABEL = { crif: 'CRIF credit report', transunion: 'TransUnion CIBIL report', both: 'CRIF + TransUnion reports' };
  var SOLD = ['h1', 'confirmed', 'paid25', 'paid75', 'certificate'];
  var filter = { type: 'all', status: 'all', q: '' };
  var reports = {}; // order id -> { view, error, loading }

  /* ---------- shell ---------- */
  var NAV = isAgent
    ? [['dashboard.html#overview', 'grid', 'Overview'], ['dashboard.html#clients', 'users', 'Clients'], ['dashboard.html#pipeline', 'board', 'Pipeline'], ['orders.html', 'listcheck', 'My orders', 1], ['auction-bidder.html', 'board', 'Auction bids'], ['dashboard.html#settings', 'gear', 'Settings']]
    : [['account.html#home', 'grid', 'Home'], ['account.html#search', 'search', 'Search tools'], ['account.html#saved', 'bookmark', 'Saved searches'], ['orders.html', 'listcheck', 'My orders', 1], ['auction-bidder.html', 'board', 'My auction bids'], ['account.html#profile', 'user', 'Profile']];
  $('side-nav').innerHTML = NAV.map(function (n) { return '<a href="' + n[0] + '"' + (n[3] ? ' class="is-on" aria-current="page"' : '') + '>' + ic(n[1], 18) + esc(n[2]) + '</a>'; }).join('');
  var SHORT = { 'My orders': 'Orders', 'Search tools': 'Search', 'Saved searches': 'Saved', 'My auction bids': 'Auctions', 'Auction bids': 'Auctions' };
  $('tabbar').innerHTML = [NAV[0], NAV[1], NAV[3], NAV[4], NAV[5]].map(function (n) { return '<a class="ap-tab' + (n[3] ? ' is-on' : '') + '" href="' + n[0] + '">' + ic(n[1], 22) + esc(SHORT[n[2]] || n[2]) + '</a>'; }).join('');
  $('side-role').textContent = $('me-role').textContent = isAgent ? 'Agent' : 'Customer';
  $('top-area').textContent = isAgent ? 'Agent dashboard' : 'My account';
  $('me-avatar').innerHTML = UI.avatar(name, 'is-sm');
  $('me-name').textContent = name;
  $('o-sub').textContent = isAgent ? 'Credit reports you ordered, your client files and auction bids – and where each one stands.' : 'Your credit reports and auction bids – and where each one stands.';
  document.addEventListener('click', function (e) { if (e.target.closest('[data-logout]')) { App.logout(); location.href = 'index.html'; } });
  UI.hydrate();

  if (!isAgent) $('o-newwrap').innerHTML = '<a class="ap-btn is-primary ord-newbtn" href="cibil-score.html">' + ic('plus', 18) + 'New CIBIL check</a>';
  if (isAgent) {
    var clients = App.clients();
    $('o-new').textContent = '';
    $('o-new').insertAdjacentHTML('beforeend', ic('plus', 18) + 'New CIBIL check');
    $('o-newwrap').innerHTML = clients.length ? '<label class="ord-pick"><span>Check a client’s CIBIL</span><select id="o-client"><option value="">Choose a client…</option>' +
      clients.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + (c.mobile ? ' · ' + esc(c.mobile) : '') + '</option>'; }).join('') + '</select></label>' : '';
    var sel = $('o-client');
    if (sel) sel.addEventListener('change', function () { if (sel.value) location.href = 'cibil-score.html?client=' + encodeURIComponent(sel.value); });
  }

  /* ---------- helpers ---------- */
  function when(t) {
    var d = new Date(t);
    return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  function rupee(n) { return '₹' + App.inr(n); }
  function steps(list) {
    // list: [[label, state]] where state is done | now | warn | fail | todo
    return '<ol class="ord-steps">' + list.map(function (s) {
      var mark = s[1] === 'done' ? ic('check', 14) : s[1] === 'fail' ? ic('x', 14) : s[1] === 'warn' ? '!' : '';
      return '<li class="is-' + s[1] + '"><span class="ord-dot">' + mark + '</span><span class="ord-sl">' + esc(s[0]) + '</span></li>';
    }).join('') + '</ol>';
  }
  function btn(label, attrs, primary, icon) {
    var tag = /href=/.test(attrs) ? 'a' : 'button';
    return '<' + tag + ' class="ap-btn is-sm' + (primary ? ' is-primary' : '') + '" ' + (tag === 'button' ? 'type="button" ' : '') + attrs + '>' + (icon ? ic(icon, 16) : '') + esc(label) + '</' + tag + '>';
  }

  /* ---------- credit reports ---------- */
  function myReports() {
    if (!Pay) return [];
    return Pay.list().filter(function (e) {
      if (!e.owner) Pay.claim(e.id, me.id); // placed on this device before logging in
      return !e.owner || e.owner === me.id;
    });
  }

  function reportItem(e) {
    var r = reports[e.id] || { loading: true }, v = r.view;
    var title = LABEL[(v && v.bureau) || e.bureau] || 'Credit report';
    var amount = (v && v.amount) || e.amount;
    var client = e.client ? App.getClient(e.client) : null;
    var who = v && v.customer && v.customer.name ? v.customer.name : client ? client.name : '';
    var it = { kind: 'report', id: e.id, at: e.at, title: title, icon: 'file', tone: 'info', pill: 'Checking…', bucket: 'active',
      meta: ['Order ' + e.id, when(e.at)].concat(amount ? [rupee(amount)] : []).concat(isAgent && who ? ['For ' + who] : []),
      search: [title, e.id, who, v && v.payment ? v.payment.id : ''].join(' ') };
    var recent = Date.now() - e.at < RETRY_WINDOW_MS;
    if (r.loading && !v) { it.steps = steps([['Order placed', 'done'], ['Payment', 'todo'], ['Report', 'todo']]); it.note = 'Checking the latest status…'; it.loading = true; return it; }
    if (r.error === 'gone') {
      Object.assign(it, { tone: 'mute', pill: 'Not available', bucket: 'closed', note: 'This order is no longer on record. Orders are kept for 30 days.', steps: steps([['Order placed', 'done'], ['Payment', 'todo'], ['Report', 'todo']]) });
      return it;
    }
    if (r.error && !v) {
      Object.assign(it, { tone: 'warn', pill: 'Status unavailable', note: r.error, actions: btn('Try again', 'data-refresh="' + esc(e.id) + '"', false, 'clock'), steps: steps([['Order placed', 'done'], ['Payment', 'todo'], ['Report', 'todo']]) });
      return it;
    }
    var pay = v.payment;
    switch (v.state) {
      case 'READY':
        Object.assign(it, { tone: 'ok', pill: 'Report ready', bucket: 'done',
          note: 'Paid ' + rupee(v.amount) + ' via ' + pay.method + ' · Payment ID ' + pay.id,
          steps: steps([['Order placed', 'done'], ['Paid', 'done'], ['Report ready', 'done']]),
          actions: btn('View report', 'data-view="' + esc(e.id) + '"', true, 'eye') + btn('Download PDF', 'data-dl="' + esc(e.id) + '"', false, 'download') });
        break;
      case 'PROCESSING':
        Object.assign(it, { tone: 'info', pill: 'Preparing report', note: 'Payment received (ID ' + (pay ? pay.id : '') + '). Your report is being prepared.',
          steps: steps([['Order placed', 'done'], ['Paid', 'done'], ['Preparing report', 'now']]), actions: btn('Refresh', 'data-refresh="' + esc(e.id) + '"', false, 'clock') });
        break;
      case 'PENDING':
        Object.assign(it, { tone: 'info', pill: 'Confirming payment', note: 'The bank is still confirming this payment. Please don’t pay again.',
          steps: steps([['Order placed', 'done'], ['Confirming payment', 'now'], ['Report', 'todo']]), actions: btn('Refresh', 'data-refresh="' + esc(e.id) + '"', false, 'clock') });
        break;
      case 'AWAITING_PAYMENT':
        Object.assign(it, { tone: 'warn', pill: v.attempt === 'FAILED' ? 'Payment failed' : 'Payment not completed', bucket: recent ? 'action' : 'active',
          note: (v.attempt === 'FAILED' ? 'The payment didn’t go through. If money was debited, your bank returns it in 5–7 working days.' : 'You haven’t been charged.') + (recent ? ' You can still complete this payment.' : ''),
          steps: steps([['Order placed', 'done'], [v.attempt === 'FAILED' ? 'Payment failed' : 'Awaiting payment', 'warn'], ['Report', 'todo']]),
          actions: recent ? btn('Complete payment', 'data-pay="' + esc(e.id) + '"', true, 'wallet') : btn('Start a new check', 'href="cibil-score.html' + (e.client ? '?client=' + encodeURIComponent(e.client) : '') + '"', false, 'plus') });
        break;
      case 'EXPIRED':
        Object.assign(it, { tone: 'mute', pill: 'Expired', bucket: 'closed', note: 'This payment session timed out. You were not charged.',
          steps: steps([['Order placed', 'done'], ['Not paid', 'fail'], ['Report', 'todo']]),
          actions: btn('Start a new check', 'href="cibil-score.html' + (e.client ? '?client=' + encodeURIComponent(e.client) : '') + '"', false, 'plus') });
        break;
      case 'REFUND_PENDING':
      case 'REFUNDED':
        var doneRefund = v.state === 'REFUNDED';
        Object.assign(it, { tone: doneRefund ? 'mute' : 'info', pill: doneRefund ? 'Refunded' : 'Refund in progress', bucket: doneRefund ? 'closed' : 'active',
          note: doneRefund ? rupee(v.amount) + ' has been refunded to your original payment method.' : 'We couldn’t generate this report, so a full refund of ' + rupee(v.amount) + ' is on its way (5–7 working days).',
          steps: steps([['Order placed', 'done'], ['Paid', 'done'], [doneRefund ? 'Refunded' : 'Refund in progress', doneRefund ? 'done' : 'now']]) });
        break;
      default:
        Object.assign(it, { tone: 'warn', pill: 'Being verified', bucket: 'action', note: 'This payment needs a quick manual check. Contact us with the Order ID and we’ll sort it out.',
          steps: steps([['Order placed', 'done'], ['Payment check', 'warn'], ['Report', 'todo']]), actions: btn('Contact us', 'href="contact.html"', true, 'chat') });
    }
    if (client) it.actions = (it.actions || '') + btn('Client file', 'href="dashboard.html#c-' + encodeURIComponent(client.id) + '"', false, 'user');
    return it;
  }

  function loadReport(id) {
    reports[id] = Object.assign(reports[id] || {}, { loading: true });
    return Pay.status(id).then(function (v) {
      reports[id] = { view: v };
    }, function (err) {
      reports[id] = { view: reports[id].view, error: err && (err.code === 'not_found' || err.status === 404) ? 'gone' : (err && err.message) || 'Could not load the status.' };
    });
  }

  function loadAll(ids) {
    var queue = ids.slice(), running = 0;
    return new Promise(function (resolve) {
      function next() {
        if (!queue.length && !running) return resolve();
        while (running < 3 && queue.length) {
          running++;
          loadReport(queue.shift()).then(function () { running--; render(); next(); });
        }
      }
      next();
    });
  }

  /* ---------- client files (agents) ---------- */
  var STAGES = ['new', 'docs', 'submitted', 'sanctioned', 'disbursed'];
  var STAGE_LABEL = { new: 'New lead', docs: 'Documents', submitted: 'Submitted to bank', sanctioned: 'Sanctioned', disbursed: 'Disbursed' };
  function clientItem(c) {
    var st = c.status || 'new', idx = STAGES.indexOf(st), closed = st === 'closed';
    var prod = (App.PRODUCTS[c.product] || App.PRODUCTS.other).label;
    var label = (App.STATUSES.find(function (s) { return s[0] === st; }) || [st, st])[1];
    var due = c.followUp && new Date(c.followUp) <= new Date(new Date().toDateString());
    var last = c.activity && c.activity[0];
    return {
      kind: 'file', id: c.id, at: Date.parse(c.updatedAt || c.createdAt) || 0, title: c.name + ' – ' + prod, icon: 'briefcase',
      tone: closed ? 'mute' : st === 'disbursed' ? 'ok' : due ? 'warn' : 'info', pill: label,
      bucket: closed ? 'closed' : st === 'disbursed' ? 'done' : due ? 'action' : 'active',
      meta: [prod].concat(c.amount ? [rupee(c.amount)] : []).concat(c.mobile ? [c.mobile] : []).concat(c.city ? [c.city] : []).concat(['Updated ' + when(c.updatedAt || c.createdAt)]),
      steps: steps(STAGES.map(function (s, i) { return [STAGE_LABEL[s], closed ? (i === 0 ? 'done' : 'todo') : i < idx ? 'done' : i === idx ? (s === 'disbursed' ? 'done' : 'now') : 'todo']; }).concat(closed ? [['Rejected / closed', 'fail']] : [])),
      note: due ? 'Follow-up due ' + new Date(c.followUp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + '.' + (last ? ' Last update: ' + last.text : '') : last ? 'Last update: ' + last.text : '',
      actions: btn('Open file', 'href="dashboard.html#c-' + encodeURIComponent(c.id) + '"', true, 'user') + btn('Check CIBIL', 'href="cibil-score.html?client=' + encodeURIComponent(c.id) + '"', false, 'file'),
      search: [c.name, c.mobile, c.city, prod, label].join(' ')
    };
  }

  /* ---------- bank auctions ---------- */
  function auctionItem(x) {
    var a = x.a, p = x.p, ph = S.phase(a), won = a.highPart === p.id;
    var live = ph === 'live' || ph === 'paused', before = ph === 'registration' || ph === 'upcoming', sold = SOLD.indexOf(ph) !== -1;
    var mineBids = S.bidsOf(a.id).filter(function (b) { return b.partId === p.id; });
    var best = mineBids.length ? mineBids[mineBids.length - 1].amount : 0;
    var pill, tone, bucket = 'active', s3 = ['Auction', 'todo'], s4 = ['Result', 'todo'];
    var s2 = p.status === 'approved' ? ['EMD verified', 'done'] : p.status === 'rejected' ? ['EMD rejected', 'fail'] : ['EMD check', 'now'];
    if (p.status === 'pending') { pill = 'EMD being verified'; tone = 'info'; }
    else if (p.status === 'rejected') { pill = 'EMD rejected'; tone = 'bad'; bucket = 'closed'; }
    else if (before) { pill = 'Waiting for start'; tone = 'info'; s3 = ['Starts ' + new Date(a.startAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), 'now']; }
    else if (live) { won ? (pill = 'You are leading', tone = 'ok') : best ? (pill = 'Outbid', tone = 'bad', bucket = 'action') : (pill = 'Live – not bid yet', tone = 'warn', bucket = 'action'); s3 = ['Live now', 'now']; }
    else if (sold) { s3 = ['Auction', 'done']; if (won) { pill = 'You won'; tone = 'ok'; bucket = 'done'; s4 = ['Won', 'done']; } else { pill = p.refund ? 'Not won – EMD refunded' : 'Not won – refund due'; tone = 'mute'; bucket = 'closed'; s4 = [p.refund ? 'EMD refunded' : 'EMD refund due', p.refund ? 'done' : 'now']; } }
    else { pill = S.PHASE[ph] || 'Closed'; tone = 'mute'; bucket = 'closed'; s3 = ['Auction', 'done']; s4 = [pill, 'done']; }
    return {
      kind: 'auction', id: p.id, at: p.createdAt || a.startAt, title: a.title, icon: 'board', tone: tone, pill: pill, bucket: bucket,
      meta: [a.ref, (S.bank(a.bankId) || {}).name || '', 'EMD ' + rupee(p.emd ? p.emd.amount : a.emd)].concat(best ? ['Your bid ' + rupee(best)] : []).filter(Boolean),
      steps: steps([['Registered', 'done'], s2, s3, s4]),
      note: live && !won && best ? 'Someone bid higher. Bid again before the auction ends.' : '',
      actions: btn(live ? 'Bid now' : 'Open auction', 'href="auction.html?id=' + encodeURIComponent(a.id) + '"', live, 'board'),
      search: [a.title, a.ref, a.city, pill].join(' ')
    };
  }
  function myAuctions() {
    if (!S) return [];
    try {
      return S.db().parts.filter(function (p) { return p.userId === me.id; }).map(function (p) { return { p: p, a: S.get(p.auctionId) }; }).filter(function (x) { return x.a; });
    } catch (e) { return []; }
  }

  /* ---------- render ---------- */
  var TYPES = [['all', 'All'], ['report', 'Credit reports']].concat(isAgent ? [['file', 'Client files']] : []).concat([['auction', 'Auctions']]);
  var STATUS = [['all', 'Any status'], ['action', 'Needs action'], ['active', 'In progress'], ['done', 'Completed'], ['closed', 'Closed']];
  var TONE_PILL = { ok: 'st-disbursed', info: 'st-submitted', warn: 'st-docs', bad: 'ord-bad', mute: 'st-closed' };

  function items() {
    var list = myReports().map(reportItem);
    if (isAgent) list = list.concat(App.clients().map(clientItem));
    list = list.concat(myAuctions().map(auctionItem));
    return list.sort(function (a, b) { return (b.bucket === 'action') - (a.bucket === 'action') || b.at - a.at; });
  }

  function card(it, i) {
    return '<article class="ap-card ord" style="--i:' + Math.min(i, 8) + '" data-kind="' + it.kind + '">' +
      '<div class="ord-top"><span class="ord-ic ord-ic-' + it.kind + '">' + ic(it.icon, 20) + '</span>' +
      '<div class="ord-t"><h3>' + esc(it.title) + '</h3><p>' + it.meta.map(esc).join('<i aria-hidden="true">·</i>') + '</p></div>' +
      '<span class="ap-pill ' + (TONE_PILL[it.tone] || '') + (it.loading ? ' is-loading' : '') + '">' + esc(it.pill) + '</span></div>' +
      it.steps + (it.note ? '<p class="ord-note">' + esc(it.note) + '</p>' : '') +
      (it.actions ? '<div class="ord-act">' + it.actions + '</div>' : '') + '</article>';
  }

  function render(anim) {
    var all = items();
    $('o-list').classList.toggle('is-anim', !!anim);
    var count = function (fn) { return all.filter(fn).length; };
    $('o-kpis').innerHTML = [
      ['Total orders', all.length, 'listcheck', ''],
      ['Needs your action', count(function (x) { return x.bucket === 'action'; }), 'bell', 'is-warn'],
      ['In progress', count(function (x) { return x.bucket === 'active'; }), 'clock', 'is-mute'],
      ['Completed', count(function (x) { return x.bucket === 'done'; }), 'check', '']
    ].map(function (k) {
      return '<div class="ap-card ap-kpi"><div class="top"><p class="l">' + k[0] + '</p><span class="ic">' + ic(k[2], 16) + '</span></div><p class="v">' + k[1] + '</p></div>';
    }).join('');
    $('o-types').innerHTML = TYPES.map(function (t) {
      var n = t[0] === 'all' ? all.length : count(function (x) { return x.kind === t[0]; });
      return '<button type="button" role="tab" class="ap-chip' + (filter.type === t[0] ? ' is-on' : '') + '" aria-selected="' + (filter.type === t[0]) + '" data-type="' + t[0] + '">' + t[1] + ' <b>' + n + '</b></button>';
    }).join('');
    $('o-status').innerHTML = STATUS.map(function (t) {
      return '<button type="button" role="tab" class="ap-chip' + (filter.status === t[0] ? ' is-on' : '') + '" aria-selected="' + (filter.status === t[0]) + '" data-status="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    var q = filter.q.toLowerCase();
    var shown = all.filter(function (x) {
      return (filter.type === 'all' || x.kind === filter.type) && (filter.status === 'all' || x.bucket === filter.status) && (!q || x.search.toLowerCase().indexOf(q) !== -1);
    });
    $('o-list').innerHTML = shown.length ? shown.map(card).join('') : '<div class="ap-card ap-empty"><span class="art">' + ic('listcheck', 28) + '</span><h3>' +
      (all.length ? 'No orders match' : 'No orders yet') + '</h3><p>' + (all.length ? 'Try another filter or clear the search.' : isAgent ? 'Check a client’s CIBIL score, add a client file or join a bank auction – everything shows up here.' : 'Check your CIBIL score or join a bank auction – your orders will show up here.') + '</p>' +
      (all.length ? '' : '<a class="ap-btn is-primary" href="cibil-score.html">' + ic('plus', 18) + 'Check CIBIL score</a>') + '</div>';
    $('o-foot').textContent = all.some(function (x) { return x.kind === 'report'; }) ? 'Credit reports bought on this device are listed for 30 days. Statuses update automatically.' : '';
  }

  /* ---------- actions ---------- */
  function reportData(v) {
    return CMReport.build({ bureau: v.bureau, name: v.customer.name, pan: v.customer.pan, phone: v.customer.phone,
      refId: v.payment.id, amount: v.amount, method: v.payment.method, paidAt: new Date(v.payment.paidAt) });
  }
  var REPORT_ACTIONS = '<div class="cmr-actions"><div class="cmr-act-row"><button type="button" class="cmr-btn is-primary" data-cmr="view" aria-expanded="false">' + ic('eye', 18) + '<span data-cmr-label>View report</span></button><button type="button" class="cmr-btn" data-cmr="download">' + ic('download', 18) + '<span>Download PDF</span></button></div>' +
    '<div class="cmr-share"><span>Share</span><a class="cmr-link is-wa" data-cmr="wa" href="#" target="_blank" rel="noopener">WhatsApp</a><a class="cmr-link is-mail" data-cmr="mail" href="#">Email</a></div><div class="cmr-panel" data-cmr="panel" hidden></div></div>';

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-type]'))) { filter.type = t.getAttribute('data-type'); render(true); return; }
    if ((t = e.target.closest('[data-status]'))) { filter.status = t.getAttribute('data-status'); render(true); return; }
    if ((t = e.target.closest('[data-refresh]'))) { loadReport(t.getAttribute('data-refresh')).then(render); render(); return; }
    if ((t = e.target.closest('[data-dl]'))) { var v1 = reports[t.getAttribute('data-dl')].view; if (v1 && window.CMReport) CMReport.download(reportData(v1)); return; }
    if ((t = e.target.closest('[data-view]'))) {
      var v = reports[t.getAttribute('data-view')].view;
      if (!v || !window.CMReport) return;
      var dr = UI.openDrawer({
        title: LABEL[v.bureau] || 'Credit report',
        body: '<dl class="ord-kv"><dt>Name</dt><dd>' + esc(v.customer.name) + '</dd><dt>Payment ID</dt><dd>' + esc(v.payment.id) + '</dd><dt>Order ID</dt><dd>' + esc(v.orderId) + '</dd><dt>Paid on</dt><dd>' + esc(when(v.payment.paidAt)) + '</dd><dt>Amount</dt><dd>' + rupee(v.amount) + ' via ' + esc(v.payment.method) + '</dd></dl>' + REPORT_ACTIONS
      });
      CMReport.mount(dr, reportData(v));
      return;
    }
    if ((t = e.target.closest('[data-pay]'))) {
      t.disabled = true;
      t.textContent = 'Opening payment…';
      Pay.retry(t.getAttribute('data-pay')).catch(function (err) {
        UI.toast((err && err.message) || 'Could not open the payment. Please start a new check.');
        render();
      });
    }
  });
  $('o-search').addEventListener('input', function () { filter.q = this.value.trim(); render(); });
  $('o-refresh').addEventListener('click', function () { refresh(true); });

  function refresh(all) {
    var ids = myReports().filter(function (e) {
      var v = reports[e.id] && reports[e.id].view;
      return all || !v || ['PENDING', 'PROCESSING', 'AWAITING_PAYMENT', 'REFUND_PENDING'].indexOf(v.state) !== -1;
    }).map(function (e) { return e.id; });
    if (all) UI.toast('Refreshing statuses…');
    return loadAll(ids).then(render);
  }

  render(true);
  refresh(false);
  setInterval(function () { if (!document.hidden) refresh(false); }, 20000);
  if (S && S.on) S.on(function () { render(); });
})();
