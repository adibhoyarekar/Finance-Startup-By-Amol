/* Agent dashboard (dashboard.html): overview, clients, pipeline, follow-ups, search tools
   and settings. Data lives in this browser only - see raven-app.js. */
(function () {
  var App = window.RavenApp, UI = window.RavenUI;
  var me = App && App.guard('agent');
  if (!me || !UI) return;
  var esc = App.esc, short = App.short, inr = App.inr, ic = UI.icon;
  var $ = function (id) { return document.getElementById(id); };

  // funnel stages, coloured with a validated single-hue ordinal ramp (light -> dark)
  var STAGES = [['new', 'New lead', '#9d9aff'], ['docs', 'Documents pending', '#7d7aff'], ['submitted', 'Submitted to bank', '#625fff'],
    ['sanctioned', 'Sanctioned', '#4f46e5'], ['disbursed', 'Disbursed', '#3730a3']];
  var ALL_STAGES = STAGES.concat([['closed', 'Rejected / Closed', '#98a2b3']]);
  var LABEL = {}; ALL_STAGES.forEach(function (s) { LABEL[s[0]] = s[1]; });
  var ACTIVE = ['new', 'docs', 'submitted', 'sanctioned'];
  var PICON = { home: 'home', personal: 'user', business: 'briefcase', gold: 'coins', account: 'bank', other: 'sparkle' };
  var AGENT_TYPE = { dsa: 'DSA / Loan Connector', ifa: 'Independent Financial Advisor', bank: 'Bank / NBFC Sales Executive', posp: 'Insurance Agent (POSP)', ca: 'CA / Tax Consultant', broker: 'Real Estate Broker', other: 'Agent' };
  var EXP = { lt1: 'Less than 1 year', '1to3': '1–3 years', '3to5': '3–5 years', gt5: '5+ years' };
  var LANG = { en: 'English', mr: 'मराठी', hi: 'हिंदी' };
  var state = { stage: 'all', product: 'all', q: '', sort: 'recent' };
  var prof = me.profile || {};
  var first = (prof.fullName || me.username).split(' ')[0];

  /* ---------- helpers ---------- */
  function iso(d) { d = new Date(d); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function today() { return iso(new Date()); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
  function fmtDate(s) { return new Date(s + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  function when(s) {
    if (!s) return '';
    var t = today();
    if (s < t) return 'Overdue · ' + fmtDate(s);
    if (s === t) return 'Today';
    if (s === addDays(1)) return 'Tomorrow';
    return fmtDate(s);
  }
  function ago(isoStr) {
    var m = Math.round((Date.now() - new Date(isoStr)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    if (m < 1440) return Math.round(m / 60) + ' h ago';
    var d = Math.round(m / 1440);
    return d === 1 ? 'yesterday' : d < 30 ? d + ' days ago' : new Date(isoStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  function isActive(c) { return ACTIVE.indexOf(c.status) !== -1; }
  function late(c) { return isActive(c) && c.followUp && c.followUp < today(); }
  function pct(product) { var p = me.payout || {}; return p[product] != null ? +p[product] : App.DEFAULT_PAYOUT[product] || 0; }
  function payout(c) { return (+c.amount || 0) * pct(c.product) / 100; }
  function plabel(p) { return (App.PRODUCTS[p] || App.PRODUCTS.other).label; }
  function findLink(c) { var p = App.PRODUCTS[c.product] || App.PRODUCTS.other; return p.section ? p.page + '?client=' + c.id + '#' + p.section : 'funding-loans.html'; }
  function mob(c) { return (c.mobile || '').replace(/\D/g, ''); }
  function pill(s) { return '<span class="ap-pill st-' + s + '">' + LABEL[s] + '</span>'; }
  function sum(list, f) { return list.reduce(function (a, c) { return a + f(c); }, 0); }
  function log(c, text) { c.activity = [{ at: new Date().toISOString(), text: text }].concat(c.activity || []).slice(0, 40); }
  function save(c, text) { if (text) log(c, text); return App.saveClient(c); }
  function contactBtns(c, sm) {
    var m = mob(c), k = sm ? ' is-sm' : '';
    if (!m) return '';
    return '<a class="ap-btn is-icon' + k + '" href="tel:+91' + m + '" aria-label="Call ' + esc(c.name) + '" data-tip="Call" data-stop>' + ic('phone', 17) + '</a>' +
      '<a class="ap-btn is-icon ap-wa' + k + '" href="https://wa.me/91' + m + '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(c.name) + '" data-tip="WhatsApp" data-stop>' + ic('chat', 17) + '</a>';
  }

  /* ---------- shell ---------- */
  $('me-avatar').innerHTML = UI.avatar(prof.fullName || me.username, 'is-sm');
  $('me-name').textContent = prof.fullName || me.username;
  $('me-role').textContent = AGENT_TYPE[prof.agentType] || 'Agent';
  $('top-me').innerHTML = UI.avatar(prof.fullName || me.username, 'is-sm');
  $('top-me').classList.remove('is-icon');
  $('top-me').style.cssText = 'width:42px;padding:0;border:0;background:none';
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-add],[data-logout]');
    if (!t) return;
    if (t.hasAttribute('data-add')) openForm(null);
    else { App.logout(); location.href = 'index.html'; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); ($('g-search').offsetParent ? $('g-search') : $('cl-q')).focus(); }
  });
  $('g-search').addEventListener('input', function () {
    state.q = this.value; $('cl-q').value = this.value;
    if (location.hash !== '#clients') location.hash = 'clients'; else renderClients();
  });

  /* ---------- overview ---------- */
  var kpiAnimated = false;
  function renderOverview(animate) {
    var list = App.clients(), t = today();
    var active = list.filter(isActive), won = list.filter(function (c) { return c.status === 'disbursed'; });
    var due = active.filter(function (c) { return c.followUp && c.followUp <= t; });
    var h = new Date().getHours();
    var thisMonth = new Date().toISOString().slice(0, 7);
    var newThisMonth = list.filter(function (c) { return (c.createdAt || '').slice(0, 7) === thisMonth; }).length;
    $('ov-h').textContent = (h < 12 ? 'Good morning, ' : h < 17 ? 'Good afternoon, ' : 'Good evening, ') + first;
    $('ov-sub').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' +
      (!list.length ? 'add your first client to start your pipeline' : due.length + ' follow-up' + (due.length === 1 ? '' : 's') + ' due today');
    var v = me.verification === 'verified';
    $('ov-badge').className = 'ap-dpill ' + (v ? 'is-ok' : 'is-warn');
    $('ov-badge').textContent = v ? 'Verified agent' : 'Verification pending';

    // stat cards: label, icon, value, formatter, sub-line, sub-line tone
    var pipe = sum(active, function (c) { return +c.amount || 0; });
    var tiles = [
      ['Active cases', 'briefcase', active.length, String, newThisMonth ? '+' + newThisMonth + ' new this month' : 'of ' + list.length + ' clients', newThisMonth ? '' : 'is-mute'],
      ['Pipeline value', 'trend', pipe, short, 'across ' + active.length + ' active case' + (active.length === 1 ? '' : 's'), 'is-mute'],
      ['Expected payout', 'wallet', sum(active, payout), short, short(sum(won, payout)) + ' earned so far', won.length ? '' : 'is-mute'],
      ['Follow-ups due', 'bell', due.length, String, due.length ? 'today or overdue' : 'all caught up', due.length ? 'is-warn' : '']
    ];
    $('ov-kpis').innerHTML = tiles.map(function (k, i) {
      return '<div class="ap-card ap-kpi"><div class="top"><p class="l">' + k[0] + '</p><span class="ic">' + ic(k[1], 16) + '</span></div>' +
        '<p class="v" data-kpi="' + i + '">' + k[3](k[2]) + '</p><p class="s ' + k[5] + '">' + k[4] + '</p></div>';
    }).join('');
    if (animate) tiles.forEach(function (k, i) { UI.countUp(document.querySelector('[data-kpi="' + i + '"]'), k[2], k[3] === String ? function (n) { return String(Math.round(n)); } : k[3]); });

    renderLine(list);
    renderRing(list);

    // cases by stage (ordered -> validated ordinal ramp, single series, value at tip)
    var counts = STAGES.map(function (s) { var l = list.filter(function (c) { return c.status === s[0]; }); return { s: s, n: l.length, amt: sum(l, function (c) { return +c.amount || 0; }) }; });
    var closed = list.filter(function (c) { return c.status === 'closed'; }).length;
    var max = Math.max.apply(null, counts.map(function (x) { return x.n; }).concat(1));
    $('ov-funnel').innerHTML = list.length ? '<div class="ap-bars">' + counts.map(function (x, i) {
      return '<div class="ap-brow"><span>' + x.s[1] + '</span><div class="ap-btrack"><span class="ap-bar" tabindex="0" style="--c:' + x.s[2] + ';--i:' + i + ';width:' + Math.max(1.5, x.n / max * 86) + '%" data-tip="<strong>' + x.s[1] + '</strong>' + x.n + ' case' + (x.n === 1 ? '' : 's') + ' · ' + short(x.amt) + '" aria-label="' + x.s[1] + ': ' + x.n + ' cases"></span><span class="ap-bval">' + x.n + '</span></div></div>';
    }).join('') + '</div>' + (closed ? '<p class="ap-muted" style="margin-top:.9rem;font-size:.8rem">+ ' + closed + ' rejected / closed</p>' : '') +
      dataTable(['Stage', 'Cases'], counts.map(function (x) { return [x.s[1], x.n]; }))
      : emptyChart('board', 'Stages fill in as you move clients through the pipeline.');

    // due soon
    var soon = active.filter(function (c) { return c.followUp && c.followUp <= addDays(3); }).sort(function (a, b) { return a.followUp < b.followUp ? -1 : 1; }).slice(0, 5);
    $('ov-due').innerHTML = soon.length ? '<div class="ap-list">' + soon.map(function (c) {
      return '<div class="ap-li is-click" data-open="' + c.id + '" tabindex="0">' + UI.avatar(c.name, 'is-sm') + '<div class="tx"><strong>' + esc(c.name) + '</strong><small class="' + (late(c) ? 'ap-late' : '') + '">' + when(c.followUp) + ' · ' + plabel(c.product) + '</small></div>' +
        '<div class="acts">' + contactBtns(c, true) + '</div></div>';
    }).join('') + '</div>' : emptyChart('check', list.length ? 'Nothing due in the next 3 days.' : 'Follow-ups you set on clients show up here.');

    // pipeline by product (single series, one colour)
    var prods = Object.keys(App.PRODUCTS).map(function (k) { var l = active.filter(function (c) { return c.product === k; }); return { k: k, amt: sum(l, function (c) { return +c.amount || 0; }), n: l.length }; })
      .filter(function (x) { return x.amt > 0; }).sort(function (a, b) { return b.amt - a.amt; });
    var pmax = Math.max.apply(null, prods.map(function (x) { return x.amt; }).concat(1));
    $('ov-products').innerHTML = prods.length ? '<div class="ap-bars">' + prods.map(function (x, i) {
      return '<div class="ap-brow"><span>' + plabel(x.k) + '</span><div class="ap-btrack"><span class="ap-bar" tabindex="0" style="--i:' + i + ';width:' + Math.max(1.5, x.amt / pmax * 74) + '%" data-tip="<strong>' + plabel(x.k) + '</strong>' + x.n + ' active · ' + short(x.amt) + ' · payout ~' + short(x.amt * pct(x.k) / 100) + '" aria-label="' + plabel(x.k) + ': ' + short(x.amt) + '"></span><span class="ap-bval">' + short(x.amt) + '</span></div></div>';
    }).join('') + '</div>' + dataTable(['Product', 'Amount'], prods.map(function (x) { return [plabel(x.k), short(x.amt)]; }))
      : emptyChart('trend', 'Add amounts to active cases to see where your pipeline sits.');

    // recent activity
    var acts = [];
    list.forEach(function (c) { (c.activity || []).forEach(function (a) { acts.push({ c: c, a: a }); }); });
    acts.sort(function (x, y) { return x.a.at < y.a.at ? 1 : -1; });
    $('ov-activity').innerHTML = acts.length ? '<ul class="ap-tl">' + acts.slice(0, 6).map(function (x) {
      return '<li><strong>' + esc(x.c.name) + '</strong> · ' + esc(x.a.text) + '<small>' + ago(x.a.at) + '</small></li>';
    }).join('') + '</ul>' : emptyChart('clock', 'Client updates, stage changes and saved searches appear here.');
  }

  // line chart: loan amount of clients added per month (single series, 2px line, 10% wash, hover crosshair)
  function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function renderLine(list) {
    var months = [];
    for (var m = 5; m >= 0; m--) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m); months.push({ key: d.getFullYear() + '-' + d.getMonth(), label: d.toLocaleDateString('en-IN', { month: 'short' }), amt: 0, n: 0 }); }
    list.forEach(function (c) { var d = new Date(c.createdAt || c.updatedAt), k = d.getFullYear() + '-' + d.getMonth(); months.forEach(function (x) { if (x.key === k) { x.amt += +c.amount || 0; x.n++; } }); });
    var total = sum(months, function (x) { return x.amt; });
    $('ov-line-total').textContent = short(total) + ' total';
    $('ov-line-total').hidden = !total;
    if (!list.length) { $('ov-line').innerHTML = emptyChart('trend', 'Your monthly pipeline growth appears here once you add clients.'); return; }
    var W = Math.max(300, Math.round($('ov-line').clientWidth) || 600), H = 210, L = 46, R = 14, T = 12, B = 28, top = niceMax(Math.max.apply(null, months.map(function (x) { return x.amt; }))), step = (W - L - R) / 5;
    var pts = months.map(function (x, i) { return [L + i * step, T + (H - T - B) * (1 - x.amt / top)]; });
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) { // smooth curve through the points
      var p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p2 = pts[i], p3 = pts[i + 1] || p2;
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6) + ' ' + p2[0] + ' ' + p2[1];
    }
    var base = H - B, grid = '', ylab = '';
    [0, .5, 1].forEach(function (f) { var y = T + (H - T - B) * (1 - f); grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/>'; ylab += '<text class="yl" x="' + (L - 10) + '" y="' + (y + 4) + '" text-anchor="end">' + (f ? short(top * f) : '0') + '</text>'; });
    $('ov-line').innerHTML = '<div class="ap-line"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Loan amount added per month" style="height:auto">' +
      '<defs><linearGradient id="ov-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#625fff" stop-opacity=".16"/><stop offset="1" stop-color="#625fff" stop-opacity="0"/></linearGradient></defs>' +
      '<g class="grid">' + grid + '</g>' + ylab +
      '<path class="a" fill="url(#ov-area)" d="' + d + ' L' + pts[5][0] + ' ' + base + ' L' + pts[0][0] + ' ' + base + 'Z"/><path class="l" d="' + d + '"/>' +
      '<line class="cross" x1="0" x2="0" y1="' + T + '" y2="' + base + '"/>' +
      pts.map(function (p, i) { return '<circle class="pt' + (i === 5 ? ' is-end' : '') + '" cx="' + p[0] + '" cy="' + p[1] + '" r="5" data-pt="' + i + '"/>'; }).join('') +
      months.map(function (x, i) { return '<text class="xl" x="' + pts[i][0] + '" y="' + (H - 6) + '" text-anchor="middle">' + x.label + '</text>'; }).join('') +
      months.map(function (x, i) { return '<rect class="hit" tabindex="0" x="' + (pts[i][0] - step / 2) + '" y="0" width="' + step + '" height="' + base + '" data-hit="' + i + '" data-tip="<strong>' + x.label + '</strong>' + short(x.amt) + ' · ' + x.n + ' new client' + (x.n === 1 ? '' : 's') + '" aria-label="' + x.label + ': ' + short(x.amt) + '"/>'; }).join('') +
      '</svg></div>' + dataTable(['Month', 'Amount added'], months.map(function (x) { return [x.label, short(x.amt)]; }));
    var box = $('ov-line').querySelector('.ap-line'), line = box.querySelector('path.l'), cross = box.querySelector('.cross');
    try { line.style.setProperty('--len', Math.ceil(line.getTotalLength())); } catch (e) {}
    function on(i) {
      box.classList.add('is-hover');
      cross.setAttribute('x1', pts[i][0]); cross.setAttribute('x2', pts[i][0]);
      box.querySelectorAll('.pt').forEach(function (c) { c.classList.toggle('is-on', +c.getAttribute('data-pt') === i); });
    }
    function off() { box.classList.remove('is-hover'); box.querySelectorAll('.pt').forEach(function (c) { c.classList.remove('is-on'); }); }
    box.querySelectorAll('.hit').forEach(function (r) {
      var i = +r.getAttribute('data-hit');
      r.addEventListener('mouseenter', function () { on(i); }); r.addEventListener('focus', function () { on(i); });
      r.addEventListener('mouseleave', off); r.addEventListener('blur', off);
    });
  }

  // success ring: sanctioned + disbursed out of decided cases (those + closed)
  function renderRing(list) {
    var good = list.filter(function (c) { return c.status === 'sanctioned' || c.status === 'disbursed'; }).length;
    var lost = list.filter(function (c) { return c.status === 'closed'; }).length;
    var open = list.filter(function (c) { return c.status === 'new' || c.status === 'docs' || c.status === 'submitted'; }).length;
    var decided = good + lost, pctv = decided ? good / decided : 0;
    if (!list.length) { $('ov-ring').innerHTML = emptyChart('sparkle', 'Your approval rate shows here once cases are decided.'); return; }
    var r = 52, c = 2 * Math.PI * r;
    $('ov-ring').innerHTML = '<div class="ap-donut"><div class="ap-ring" role="img" aria-label="Success rate ' + (decided ? Math.round(pctv * 100) + '%' : 'not available yet') + '"><svg viewBox="0 0 128 128" aria-hidden="true"><circle class="bg" cx="64" cy="64" r="' + r + '"/><circle class="fg" cx="64" cy="64" r="' + r + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '"/></svg>' +
      '<span>' + (decided ? '<em><b data-ring>0</b>%</em>' : '–') + '<small>' + (decided ? 'success rate' : 'no decisions yet') + '</small></span></div>' +
      '<div class="ap-legend"><div><span>Sanctioned or disbursed</span><b>' + good + '</b></div><div><span>Rejected or closed</span><b>' + lost + '</b></div><div><span>Still in progress</span><b>' + open + '</b></div></div></div>';
    var fg = $('ov-ring').querySelector('.fg'), num = $('ov-ring').querySelector('[data-ring]');
    requestAnimationFrame(function () { requestAnimationFrame(function () { fg.style.strokeDashoffset = c * (1 - pctv); }); });
    if (num) UI.countUp(num, Math.round(pctv * 100));
  }
  function emptyChart(i, text) { return '<div class="ap-empty-chart">' + ic(i, 26) + '<span>' + text + '</span></div>'; }
  function dataTable(head, rows) {
    return '<details class="ap-data"><summary>Show data</summary><table><thead><tr><th>' + head[0] + '</th><th>' + head[1] + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table></details>';
  }

  /* ---------- clients ---------- */
  $('cl-product').innerHTML = '<option value="all">All products</option>' + Object.keys(App.PRODUCTS).map(function (k) { return '<option value="' + k + '">' + App.PRODUCTS[k].label + '</option>'; }).join('');
  $('cl-q').addEventListener('input', function () { state.q = this.value; $('g-search').value = this.value; renderClients(); });
  $('cl-product').addEventListener('change', function () { state.product = this.value; renderClients(); });
  $('cl-sort').addEventListener('change', function () { state.sort = this.value; renderClients(); });
  $('cl-chips').addEventListener('click', function (e) { var b = e.target.closest('[data-stage]'); if (b) { state.stage = b.getAttribute('data-stage'); renderClients(); } });

  function filtered() {
    var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    var list = App.clients().filter(function (c) {
      if (state.stage === 'active' ? !isActive(c) : state.stage !== 'all' && c.status !== state.stage) return false;
      if (state.product !== 'all' && c.product !== state.product) return false;
      var hay = [c.name, c.mobile, c.city, c.email, c.notes, plabel(c.product)].join(' ').toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    list.sort(function (a, b) {
      if (state.sort === 'follow') return (a.followUp || '9999') < (b.followUp || '9999') ? -1 : 1;
      if (state.sort === 'amount') return (+b.amount || 0) - (+a.amount || 0);
      if (state.sort === 'name') return a.name.localeCompare(b.name);
      return (a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1;
    });
    return list;
  }
  function renderClients() {
    var all = App.clients(), list = filtered();
    var chips = [['all', 'All', all.length], ['active', 'Active', all.filter(isActive).length]].concat(ALL_STAGES.map(function (s) { return [s[0], s[1], all.filter(function (c) { return c.status === s[0]; }).length]; }));
    $('cl-chips').innerHTML = chips.map(function (c) {
      return '<button type="button" class="ap-chip' + (state.stage === c[0] ? ' is-on' : '') + '" data-stage="' + c[0] + '" aria-pressed="' + (state.stage === c[0]) + '">' + c[1] + ' <b>' + c[2] + '</b></button>';
    }).join('');
    $('cl-count').textContent = all.length ? 'Showing ' + list.length + ' of ' + all.length + ' clients' : 'Your client book';
    $('cl-rows').innerHTML = list.map(function (c, i) {
      var pay = payout(c);
      return '<tr data-open="' + c.id + '" style="--i:' + Math.min(i, 12) + '" tabindex="0"><td><div class="nm">' + UI.avatar(c.name, 'is-sm') + '<div><strong>' + esc(c.name) + '</strong><small>' + esc([c.mobile, c.city].filter(Boolean).join(' · ')) + '</small></div></div></td>' +
        '<td><span class="ap-tag">' + plabel(c.product) + '</span></td><td class="num">' + (c.amount ? short(+c.amount) : '–') + '</td><td>' + pill(c.status) + '</td>' +
        '<td class="num' + (late(c) ? ' ap-late' : '') + '">' + (c.followUp ? when(c.followUp) : '<span class="ap-muted">–</span>') + '</td><td class="num">' + (pay ? short(pay) : '–') + '</td>' +
        '<td><div class="acts">' + contactBtns(c, true) + '<a class="ap-btn is-sm is-primary" href="' + findLink(c) + '" data-stop>' + (c.lastSearch ? 'Search again' : 'Find best option') + '</a></div></td></tr>';
    }).join('');
    $('cl-cards').innerHTML = list.map(function (c, i) {
      return '<article class="ap-card ap-ccard" data-open="' + c.id + '" style="--i:' + Math.min(i, 10) + '" tabindex="0"><div class="top">' + UI.avatar(c.name) + '<div class="tx"><strong>' + esc(c.name) + '</strong><small>' + esc([c.mobile, c.city].filter(Boolean).join(' · ')) + '</small></div>' + pill(c.status) + '</div>' +
        '<div class="mid"><span class="ap-tag">' + plabel(c.product) + '</span>' + (c.amount ? '<b>' + short(+c.amount) + '</b>' : '') +
        (c.followUp && isActive(c) ? '<span class="' + (late(c) ? 'ap-late' : '') + '">' + ic('calendar', 14) + ' ' + when(c.followUp) + '</span>' : '') + '</div>' +
        '<div class="bot">' + contactBtns(c) + '<a class="ap-btn is-primary" href="' + findLink(c) + '" data-stop>' + ic('search', 16) + (c.lastSearch ? 'Search again' : 'Find best option') + '</a></div></article>';
    }).join('');
    var showEmpty = !list.length;
    document.querySelector('.ap-tablewrap').style.visibility = showEmpty ? 'hidden' : '';
    document.querySelector('.ap-tablewrap').style.height = showEmpty ? '0' : '';
    $('cl-empty').innerHTML = !all.length ? emptyState('users', 'No clients yet', 'Add a client with their basic details, then use Find best option to run the right search and save the result to their file.', true)
      : showEmpty ? emptyState('search', 'No clients match', 'Try another name or clear the filters.', false) : '';
  }
  function emptyState(i, h, p, add) {
    return '<div class="ap-card ap-empty"><span class="art">' + ic(i, 28) + '</span><h3>' + h + '</h3><p>' + p + '</p>' + (add ? '<button type="button" class="ap-btn is-primary" data-add>' + ic('plus', 18) + 'Add your first client</button>' : '') + '</div>';
  }

  /* ---------- pipeline ---------- */
  function renderPipeline() {
    var list = App.clients();
    $('pl-board').innerHTML = ALL_STAGES.map(function (s) {
      var items = list.filter(function (c) { return c.status === s[0]; }).sort(function (a, b) { return (a.followUp || '9999') < (b.followUp || '9999') ? -1 : 1; });
      return '<section class="ap-colm" data-drop="' + s[0] + '" aria-label="' + s[1] + '"><header><span style="display:flex;align-items:center;gap:.5rem"><i class="sw" style="--c:' + s[2] + '"></i><strong>' + s[1] + '</strong></span><small>' + items.length + ' · ' + short(sum(items, function (c) { return +c.amount || 0; })) + '</small></header><div class="stack">' +
        (items.length ? items.map(function (c, i) {
          return '<article class="ap-kcard" draggable="true" data-drag="' + c.id + '" data-open="' + c.id + '" tabindex="0" style="animation-delay:' + i * 40 + 'ms"><div style="display:flex;gap:.6rem;align-items:center">' + UI.avatar(c.name, 'is-sm') + '<div style="min-width:0"><strong>' + esc(c.name) + '</strong><small>' + plabel(c.product) + '</small></div></div>' +
            '<div class="kf"><b>' + (c.amount ? short(+c.amount) : '–') + '</b>' + (c.followUp && isActive(c) ? '<span class="' + (late(c) ? 'ap-late' : 'ap-muted') + '">' + when(c.followUp) + '</span>' : '') + '</div></article>';
        }).join('') : '<p class="none">Drop cases here</p>') + '</div></section>';
    }).join('');
  }
  var dragId = null;
  document.addEventListener('dragstart', function (e) { var el = e.target.closest && e.target.closest('[data-drag]'); if (!el) return; dragId = el.getAttribute('data-drag'); el.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
  document.addEventListener('dragend', function (e) { var el = e.target.closest && e.target.closest('[data-drag]'); if (el) el.classList.remove('is-drag'); document.querySelectorAll('.is-over').forEach(function (x) { x.classList.remove('is-over'); }); });
  document.addEventListener('dragover', function (e) { var col = e.target.closest && e.target.closest('[data-drop]'); if (!col || !dragId) return; e.preventDefault(); document.querySelectorAll('.is-over').forEach(function (x) { if (x !== col) x.classList.remove('is-over'); }); col.classList.add('is-over'); });
  document.addEventListener('drop', function (e) {
    var col = e.target.closest && e.target.closest('[data-drop]'); if (!col || !dragId) return;
    e.preventDefault(); setStage(dragId, col.getAttribute('data-drop')); dragId = null;
  });

  if (window.TouchDrag) TouchDrag($('pl-board'), { card: '[data-drag]', col: '[data-drop]',
    cardId: function (c) { return c.getAttribute('data-drag'); }, colId: function (c) { return c.getAttribute('data-drop'); },
    onDrop: function (id, st) { setStage(id, st); } });

  function setStage(id, st) {
    var c = App.getClient(id);
    if (!c || c.status === st) return;
    var prev = c.status;
    c.status = st;
    if (st === 'disbursed' && !c.disbursedAt) c.disbursedAt = new Date().toISOString();
    save(c, 'moved to ' + LABEL[st]);
    renderAll();
    UI.toast(c.name + ' → ' + LABEL[st], { label: 'Undo', run: function () { var x = App.getClient(id); x.status = prev; save(x, 'moved back to ' + LABEL[prev]); renderAll(); refreshDrawer(id); } });
    refreshDrawer(id);
  }

  /* ---------- follow-ups ---------- */
  function renderFollow() {
    var list = App.clients().filter(isActive), t = today(), tm = addDays(1), wk = addDays(7);
    var groups = [
      ['Overdue', function (c) { return c.followUp && c.followUp < t; }, true],
      ['Today', function (c) { return c.followUp === t; }],
      ['Tomorrow', function (c) { return c.followUp === tm; }],
      ['This week', function (c) { return c.followUp > tm && c.followUp <= wk; }],
      ['Later', function (c) { return c.followUp > wk; }],
      ['No follow-up set', function (c) { return !c.followUp; }]
    ];
    var html = groups.map(function (g) {
      var items = list.filter(g[1]).sort(function (a, b) { return (a.followUp || '') < (b.followUp || '') ? -1 : 1; });
      if (!items.length) return '';
      return '<div class="ap-card pad ap-fgroup' + (g[2] ? ' is-late' : '') + '"><h3>' + g[0] + ' <b>' + items.length + '</b></h3><div class="ap-list">' + items.map(function (c) {
        return '<div class="ap-li" style="flex-wrap:wrap">' + UI.avatar(c.name, 'is-sm') + '<div class="tx is-click" data-open="' + c.id + '" style="cursor:pointer"><strong>' + esc(c.name) + '</strong><small>' + plabel(c.product) + ' · ' + LABEL[c.status] + (c.followUp ? ' · ' + when(c.followUp) : '') + '</small></div>' +
          '<div class="acts">' + contactBtns(c, true) + '</div><div class="ap-snooze" style="width:100%;padding-left:2.75rem"><span class="ap-muted" style="font-size:.75rem;align-self:center">Next follow-up:</span>' +
          [[1, '+1 day'], [3, '+3 days'], [7, '+1 week']].map(function (s) { return '<button type="button" class="ap-btn is-sm" data-snooze="' + c.id + '" data-days="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div></div>';
      }).join('') + '</div></div>';
    }).join('');
    $('fu-groups').innerHTML = html || emptyState('bell', 'No follow-ups yet', 'Set a follow-up date when you add or edit a client and it will show up here.', !App.clients().length);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-snooze]');
    if (!b) return;
    var c = App.getClient(b.getAttribute('data-snooze')), n = +b.getAttribute('data-days');
    c.followUp = addDays(n);
    save(c, 'follow-up set for ' + fmtDate(c.followUp));
    renderAll();
    refreshDrawer(c.id);
    UI.toast('Next follow-up with ' + c.name + ': ' + when(c.followUp));
  });

  /* ---------- tools ---------- */
  var TOOLS = [['home', 'home', 'Home Loan', 'Eligibility, EMI and the lenders that fit – purchase, plot, construction, LAP.', 'images/loan-home.svg'],
    ['personal', 'user', 'Personal Loan', 'Salary-based eligibility, EMI and banks, NBFCs and apps that fit.', 'images/loan-personal.svg'],
    ['business', 'briefcase', 'Business Loan', 'MUDRA, unsecured and secured options by vintage, ITR and CIBIL.', 'images/loan-business.svg'],
    ['gold', 'coins', 'Gold Loan', 'Gold value and maximum loan under RBI limits, with lenders nearby.', 'images/loan-gold.svg'],
    ['account', 'bank', 'Bank Account', 'The right savings or current account, documents and banks.', 'images/bank-account.svg'],
    ['vehicle', 'sparkle', 'Car Loan', 'New or used car – eligibility, EMI, tenure and lenders that fit.', 'images/loan-vehicle.svg'],
    ['realestate', 'home', 'Real Estate', 'Buy, sell, rent or lease – a complete application with next steps.', 'images/real-estate.svg'],
    ['mf', 'trend', 'Mutual Fund & SIP', 'SIP or lump sum – growth projection, fund mix by risk and KYC steps.', 'images/mutual-fund.svg']];
  function renderTools() {
    var sel = $('tl-client'), cur = sel.value, list = App.clients();
    sel.innerHTML = '<option value="">No client – just explore</option>' + list.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + ' · ' + plabel(c.product) + '</option>'; }).join('');
    if (cur && App.getClient(cur)) sel.value = cur;
    var c = sel.value && App.getClient(sel.value);
    $('tl-grid').innerHTML = TOOLS.map(function (t, i) {
      var p = App.PRODUCTS[t[0]];
      return UI.toolCard({ i: i, href: p.page + (c ? '?client=' + c.id : '') + '#' + p.section, img: t[4], icon: t[1], title: t[2], text: t[3],
        badge: c && c.product === t[0] ? 'For ' + c.name.split(' ')[0] : '', go: c ? 'Search for ' + c.name.split(' ')[0] : 'Open tool' });
    }).join('') + UI.toolCard({ i: TOOLS.length, href: 'auctions.html', img: 'images/bank-auction.svg', icon: 'board', title: 'Bank Auctions', text: 'Live SARFAESI auctions – flats, shops, plots and vehicles below market for your clients.', go: 'Browse auctions' });
  }
  $('tl-client').addEventListener('change', renderTools);

  /* ---------- settings ---------- */
  function renderSettings() {
    $('st-prof').innerHTML = UI.avatar(prof.fullName || me.username, 'is-lg') + '<div><h3>' + esc(prof.fullName || me.username) + '</h3><p>' + esc([AGENT_TYPE[prof.agentType], prof.firm].filter(Boolean).join(' · ')) + '</p>' +
      '<span class="ap-pill ' + (me.verification === 'verified' ? 'st-disbursed' : 'st-docs') + '" style="margin-top:.4rem">' + (me.verification === 'verified' ? 'Verified agent' : 'Verification pending') + '</span></div>';
    var kv = [['Username', me.username], ['Mobile', prof.mobile], ['Email', prof.email], ['Base city', prof.city], ['Areas served', prof.areas], ['Experience', EXP[prof.experience]], ['DSA / partner code', prof.code], ['Language', LANG[prof.language]]];
    $('st-kv').innerHTML = kv.filter(function (x) { return x[1]; }).map(function (x) { return '<div><small>' + x[0] + '</small><b>' + esc(x[1]) + '</b></div>'; }).join('');
    $('st-payout').innerHTML = Object.keys(App.PRODUCTS).map(function (k) {
      return '<label class="ap-pct"><span>' + App.PRODUCTS[k].label + '</span><span class="in"><input type="number" inputmode="decimal" min="0" max="10" step="0.05" data-pct="' + k + '" value="' + pct(k) + '" aria-label="' + App.PRODUCTS[k].label + ' payout percent">%</span></label>';
    }).join('');
  }
  $('st-payout').addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-pct'); if (!k) return;
    me.payout = me.payout || {};
    me.payout[k] = Math.max(0, Math.min(10, parseFloat(e.target.value) || 0));
    e.target.value = me.payout[k];
    App.saveUser(me);
    UI.toast('Payout rate saved');
    renderAll();
  });
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $('st-csv').addEventListener('click', function () {
    var cols = ['name', 'mobile', 'email', 'city', 'product', 'amount', 'income', 'employment', 'cibil', 'status', 'followUp', 'source', 'notes', 'lastSearch', 'updatedAt'];
    var rows = [cols.join(',')].concat(App.clients().map(function (c) {
      return cols.map(function (k) {
        var v = k === 'product' ? plabel(c.product) : k === 'status' ? LABEL[c.status] : k === 'lastSearch' ? (c.lastSearch ? c.lastSearch.headline : '') : c[k];
        v = String(v == null ? '' : v);
        if (/^[=+\-@]/.test(v)) v = "'" + v; // stop spreadsheets running it as a formula
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(',');
    }));
    download('raven-clients-' + today() + '.csv', '﻿' + rows.join('\n'), 'text/csv');
    UI.toast('Client list exported');
  });
  $('st-backup').addEventListener('click', function () {
    download('raven-backup-' + today() + '.json', JSON.stringify({ app: 'raven', version: 1, clients: App.clients(), payout: me.payout || {} }, null, 2), 'application/json');
    UI.toast('Backup downloaded');
  });
  $('st-restore').addEventListener('change', function () {
    var file = this.files[0], input = this;
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        if (!data || data.app !== 'raven' || !Array.isArray(data.clients)) throw new Error('bad');
        var byId = {}, added = 0;
        App.clients().forEach(function (c) { byId[c.id] = c; });
        data.clients.forEach(function (c) { if (!c || !c.id || typeof c.name !== 'string') return; if (!byId[c.id]) added++; byId[c.id] = c; });
        App.saveClients(Object.keys(byId).map(function (k) { return byId[k]; }));
        if (data.payout && typeof data.payout === 'object') { me.payout = data.payout; App.saveUser(me); }
        UI.toast('Backup restored – ' + added + ' new client' + (added === 1 ? '' : 's'));
        renderAll();
      } catch (err) { UI.toast('That file is not a RAVEN backup'); }
      input.value = '';
    };
    r.readAsText(file);
  });

  /* ---------- client detail drawer ---------- */
  var openId = null;
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-stop]')) return;
    var o = e.target.closest('[data-open]');
    if (o) openClient(o.getAttribute('data-open'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var o = e.target.closest && e.target.closest('[data-open]');
    if (o && o === e.target) openClient(o.getAttribute('data-open'));
  });
  function refreshDrawer(id) { if (openId === id) openClient(id, true); }

  function openClient(id, keep) {
    var c = App.getClient(id);
    if (!c) return;
    openId = id;
    var si = STAGES.findIndex(function (s) { return s[0] === c.status; }), m = mob(c);
    var searches = Object.keys(c.searches || {}).map(function (k) { return { k: k, s: c.searches[k] }; }).sort(function (a, b) { return a.s.at < b.s.at ? 1 : -1; });
    var kv = [['Mobile', c.mobile], ['Email', c.email], ['City', c.city], ['Monthly income', c.income ? '₹' + inr(c.income) : ''], ['CIBIL', { lt650: 'Below 650', '650to700': '650–700', '700to750': '700–750', gt750: 'Above 750', unknown: 'Don’t know' }[c.cibil]],
      ['Lead source', { walkin: 'Walk-in', referral: 'Referral', call: 'Phone call', website: 'RAVEN website', social: 'Social media', other: 'Other' }[c.source]], ['Expected payout', payout(c) ? short(payout(c)) + ' (' + pct(c.product) + '%)' : ''], ['Added', c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '']];
    var body =
      '<div class="ap-prof">' + UI.avatar(c.name, 'is-lg') + '<div style="min-width:0"><h3>' + esc(c.name) + '</h3><p>' + plabel(c.product) + (c.amount ? ' · ' + short(+c.amount) : '') + '</p><div style="margin-top:.35rem">' + pill(c.status) + '</div></div></div>' +
      '<div class="ap-quick">' + (m ? '<a href="tel:+91' + m + '">' + ic('phone') + 'Call</a><a href="https://wa.me/91' + m + '" target="_blank" rel="noopener" class="ap-wa">' + ic('chat') + 'WhatsApp</a>' : '') +
      (c.email ? '<a href="mailto:' + esc(c.email) + '">' + ic('mail') + 'Email</a>' : '<button type="button" data-edit="' + c.id + '">' + ic('edit') + 'Edit</button>') + '</div>' +
      '<a class="ap-btn is-primary" style="width:100%;height:48px" href="' + findLink(c) + '">' + ic('search', 18) + (c.lastSearch ? 'Search again' : 'Find best option') + '</a>' +
      '<div class="ap-fsec" style="margin-top:1.4rem"><h3>Stage</h3>' +
      (c.status === 'closed' ? '<p class="ap-muted">This case is closed. <button type="button" class="ap-link" data-setstage="new">Reopen as new lead</button></p>' :
        '<div class="ap-stages">' + STAGES.map(function (s, i) { return '<button type="button" class="' + (i <= si ? 'is-done' : '') + '" style="--c:' + s[2] + '" data-setstage="' + s[0] + '" aria-label="Move to ' + s[1] + '" data-tip="' + s[1] + '"></button>'; }).join('') + '</div>' +
        '<div class="ap-stagel">' + STAGES.map(function (s, i) { return '<span class="' + (i === si ? 'is-on' : '') + '">' + s[1].split(' ')[0] + '</span>'; }).join('') + '</div>' +
        '<div style="display:flex;gap:.5rem;margin-top:.8rem;flex-wrap:wrap">' + (si < 4 ? '<button type="button" class="ap-btn is-sm is-dark" data-setstage="' + STAGES[si + 1][0] + '">Move to ' + STAGES[si + 1][1] + ' ' + ic('arrow', 15) + '</button>' : '') +
        '<button type="button" class="ap-btn is-sm" data-setstage="closed">Mark rejected / closed</button></div>') + '</div>' +
      (isActive(c) ? '<div class="ap-fsec"><h3>Next follow-up</h3><div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center"><input type="date" class="ap-input" style="width:auto;height:40px" value="' + (c.followUp || '') + '" data-fdate="' + c.id + '" aria-label="Next follow-up date">' +
        [[1, '+1 day'], [3, '+3 days'], [7, '+1 week']].map(function (s) { return '<button type="button" class="ap-btn is-sm" data-snooze="' + c.id + '" data-days="' + s[0] + '">' + s[1] + '</button>'; }).join('') +
        (c.followUp ? '<span class="' + (late(c) ? 'ap-late' : 'ap-muted') + '" style="font-size:.8rem">' + when(c.followUp) + '</span>' : '') + '</div></div>' : '') +
      '<div class="ap-fsec"><h3>Details</h3><div class="ap-kv">' + kv.filter(function (x) { return x[1]; }).map(function (x) { return '<div><small>' + x[0] + '</small><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div></div>' +
      (searches.length ? '<div class="ap-fsec"><h3>Saved search results</h3>' + searches.map(function (x) {
        return '<div class="ap-search-res"><strong>' + esc(x.s.headline) + '</strong>' + (x.s.details ? '<p>' + x.s.details.map(esc).join('<br>') + '</p>' : '') + '<small>' + plabel(x.k) + ' · ' + ago(x.s.at) + '</small></div>';
      }).join('') + '</div>' : '') +
      (c.notes ? '<div class="ap-fsec"><h3>Notes</h3><p style="white-space:pre-line;font-size:.9rem;color:var(--ap-ink2)">' + esc(c.notes) + '</p></div>' : '') +
      ((c.activity || []).length ? '<div class="ap-fsec"><h3>Activity</h3><ul class="ap-tl">' + c.activity.slice(0, 10).map(function (a) { return '<li>' + esc(a.text) + '<small>' + ago(a.at) + '</small></li>'; }).join('') + '</ul></div>' : '');
    var foot = '<button type="button" class="ap-btn is-danger" data-del="' + c.id + '">' + ic('trash', 17) + 'Delete</button><button type="button" class="ap-btn is-dark" data-edit="' + c.id + '">' + ic('edit', 17) + 'Edit client</button>';
    var dr = UI.openDrawer({ title: 'Client', body: body, foot: foot, focus: keep ? '.no-focus' : '[data-dclose]', onClose: function () { openId = null; } });
    if (!dr._wired) {
      dr._wired = true;
      dr.addEventListener('click', function (e) {
        var b = e.target.closest('[data-setstage],[data-edit],[data-del]');
        if (!b || !openId) return;
        if (b.hasAttribute('data-setstage')) setStage(openId, b.getAttribute('data-setstage'));
        else if (b.hasAttribute('data-edit')) openForm(App.getClient(openId));
        else delClient(openId);
      });
      dr.addEventListener('change', function (e) {
        var id = e.target.getAttribute('data-fdate');
        if (!id) return;
        var x = App.getClient(id);
        x.followUp = e.target.value;
        save(x, x.followUp ? 'follow-up set for ' + fmtDate(x.followUp) : 'follow-up cleared');
        renderAll(); refreshDrawer(id);
      });
    }
  }
  function delClient(id) {
    var c = App.getClient(id);
    if (!c || !confirm('Delete ' + c.name + ' and all their saved searches?')) return;
    var copy = JSON.parse(JSON.stringify(c));
    App.deleteClient(id);
    UI.closeDrawer();
    renderAll();
    UI.toast(c.name + ' deleted', { label: 'Undo', run: function () { App.saveClient(copy); renderAll(); } });
  }

  /* ---------- add / edit form ---------- */
  function opt(list, v) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); }
  function openForm(c) {
    var x = c || { status: 'new', followUp: addDays(1) };
    var body = '<form id="cf" novalidate>' +
      '<div class="ap-fsec"><h3>' + ic('user', 15) + 'Contact</h3><div class="ap-fgrid">' +
      f('name', 'Client name', '<input class="ap-input" name="name" autocomplete="off" placeholder="Full name" value="' + esc(x.name || '') + '">', 'Please enter the client name.', true) +
      f('mobile', 'Mobile number', '<input class="ap-input" name="mobile" type="tel" inputmode="tel" maxlength="16" placeholder="10-digit mobile" value="' + esc(x.mobile || '') + '">', 'Enter a valid 10-digit mobile number.') +
      f('email', 'Email (optional)', '<input class="ap-input" name="email" type="email" placeholder="client@example.com" value="' + esc(x.email || '') + '">', 'Enter a valid email address.') +
      f('city', 'City', '<input class="ap-input" name="city" placeholder="e.g. Pune" value="' + esc(x.city || '') + '">') + '</div></div>' +
      '<div class="ap-fsec"><h3>' + ic('briefcase', 15) + 'Requirement</h3><div class="ap-fgrid">' +
      f('product', 'Product needed', '<select class="ap-input" name="product"><option value="">Select product</option>' + opt(Object.keys(App.PRODUCTS).map(function (k) { return [k, App.PRODUCTS[k].label]; }), x.product) + '</select>', 'Please select a product.') +
      f('amount', 'Required amount', '<div class="ap-money"><span>₹</span><input class="ap-input" name="amount" inputmode="numeric" placeholder="Loan amount" value="' + (x.amount ? inr(x.amount) : '') + '" data-money></div>') +
      f('employment', 'Employment', '<select class="ap-input" name="employment"><option value="">Select</option>' + opt([['sal-bank', 'Salaried – Bank Salary'], ['sal-cash', 'Salaried – Cash Salary'], ['se-business', 'Self-Employed – Business'], ['se-professional', 'Self-Employed – Professional'], ['other', 'Other']], x.employment) + '</select>') +
      f('income', 'Monthly income', '<div class="ap-money"><span>₹</span><input class="ap-input" name="income" inputmode="numeric" placeholder="Approximate" value="' + (x.income ? inr(x.income) : '') + '" data-money></div>') +
      f('cibil', 'CIBIL score', '<select class="ap-input" name="cibil"><option value="">Select</option>' + opt([['lt650', 'Below 650'], ['650to700', '650–700'], ['700to750', '700–750'], ['gt750', 'Above 750'], ['unknown', 'Don’t know']], x.cibil) + '</select>') + '</div></div>' +
      '<div class="ap-fsec"><h3>' + ic('board', 15) + 'Case</h3><div class="ap-fgrid">' +
      f('status', 'Stage', '<select class="ap-input" name="status">' + opt(ALL_STAGES, x.status) + '</select>') +
      f('followUp', 'Next follow-up', '<input class="ap-input" name="followUp" type="date" value="' + (x.followUp || '') + '">') +
      f('source', 'Lead source', '<select class="ap-input" name="source"><option value="">Select</option>' + opt([['walkin', 'Walk-in'], ['referral', 'Referral'], ['call', 'Phone call'], ['website', 'RAVEN website'], ['social', 'Social media'], ['other', 'Other']], x.source) + '</select>') +
      '<div class="ap-field full"><label for="cf-notes">Notes</label><textarea id="cf-notes" class="ap-input" name="notes" rows="3" placeholder="Documents received, bank feedback, next step…">' + esc(x.notes || '') + '</textarea></div>' +
      '<div class="ap-field full"><label class="ap-check"><input type="checkbox" name="consent"' + (c ? ' checked' : '') + '><span>The client has agreed to share these details with me.</span></label><p class="ap-err" data-for="consent">Please confirm the client’s consent.</p></div>' +
      '</div></div><button type="submit" hidden></button></form>';
    var foot = '<button type="button" class="ap-btn" data-dclose2>Cancel</button><button type="button" class="ap-btn is-primary" data-save>' + ic('check', 18) + (c ? 'Save changes' : 'Add client') + '</button>';
    var dr = UI.openDrawer({ title: c ? 'Edit ' + esc(c.name) : 'Add client', body: body, foot: foot, focus: '[name=name]', onClose: function () { openId = null; } });
    openId = null;
    var form = dr.querySelector('#cf');
    form.querySelectorAll('[data-money]').forEach(function (el) {
      el.addEventListener('input', function () { var d = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10); el.value = d ? inr(+d) : ''; });
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(form, c); });
    dr.querySelector('[data-save]').onclick = function () { submit(form, c); };
    dr.querySelector('[data-dclose2]').onclick = UI.closeDrawer;
  }
  function f(name, label, input, err, full) {
    return '<div class="ap-field' + (full ? ' full' : '') + '"><label>' + label + '</label>' + input.replace('name="' + name + '"', 'name="' + name + '" aria-label="' + label + '"') + (err ? '<p class="ap-err" data-for="' + name + '">' + err + '</p>' : '') + '</div>';
  }
  function submit(form, c) {
    function val(k) { return form.querySelector('[name="' + k + '"]').value.trim(); }
    var mobile = val('mobile').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    var checks = { name: val('name').length < 2, mobile: !/^[6-9]\d{9}$/.test(mobile), email: val('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')), product: !val('product'), consent: !form.querySelector('[name="consent"]').checked };
    var bad = null;
    Object.keys(checks).forEach(function (k) {
      var el = form.querySelector('[name="' + k + '"]');
      form.querySelector('.ap-err[data-for="' + k + '"]').classList.toggle('is-on', !!checks[k]);
      if (el.classList.contains('ap-input')) el.classList.toggle('is-bad', !!checks[k]);
      if (checks[k] && !bad) bad = el;
    });
    if (bad) { bad.focus(); return; }
    var x = c ? App.getClient(c.id) : { searches: {} };
    var prevStatus = x.status;
    Object.assign(x, {
      name: val('name'), mobile: mobile, email: val('email'), city: val('city'), product: val('product'),
      amount: +val('amount').replace(/\D/g, '') || 0, income: +val('income').replace(/\D/g, '') || 0,
      employment: val('employment'), cibil: val('cibil'), status: val('status'), followUp: val('followUp'), source: val('source'), notes: val('notes')
    });
    if (x.status === 'disbursed' && !x.disbursedAt) x.disbursedAt = new Date().toISOString();
    x = save(x, c ? (prevStatus !== x.status ? 'details updated, moved to ' + LABEL[x.status] : 'details updated') : 'added as ' + LABEL[x.status]);
    UI.closeDrawer();
    renderAll();
    if (c) { UI.toast('Changes saved'); openClient(x.id); }
    else UI.toast(x.name + ' added', { label: 'Find best option', run: function () { location.href = findLink(x); } });
  }

  /* ---------- wiring ---------- */
  function renderNav() {
    var list = App.clients(), due = list.filter(function (c) { return isActive(c) && c.followUp && c.followUp <= today(); }).length;
    $('n-clients').textContent = list.length;
    $('n-follow').textContent = due; $('n-follow').hidden = !due; $('n-follow').classList.toggle('is-alert', due > 0);
    $('top-dot').hidden = !due; $('tab-dot').hidden = !due;
  }
  var currentView = 'overview';
  function renderAll() { renderNav(); renderOverview(false); renderClients(); renderPipeline(); renderFollow(); renderTools(); renderSettings(); }

  var pending = /^#c-/.test(location.hash) ? location.hash.slice(3) : null;
  if (pending) history.replaceState(null, '', location.pathname + '#clients');
  renderAll();
  UI.router('overview', function (view) {
    currentView = view;
    UI.hideTip();
    if (view === 'overview' && !kpiAnimated) { kpiAnimated = true; renderOverview(true); }
    else if (view === 'overview') renderLine(App.clients());
  });
  if (pending) setTimeout(function () { openClient(pending); }, 250);
  if (App.param('welcome')) {
    history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(function () { UI.toast('Welcome to RAVEN, ' + first + '! Your agent dashboard is ready.'); }, 500);
  }
  var rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (currentView === 'overview') renderLine(App.clients()); }, 200); });
  // keep in sync if another tab changes the data
  window.addEventListener('storage', function (e) { if (e.key && e.key.indexOf('raven_clients_') === 0) renderAll(); });
})();
