/* Homepage try-it agent dashboard. Sample data lives in memory only, so a refresh restores the defaults. */
(function () {
  var root = document.getElementById('agent-demo');
  if (!root) return;

  var STAGES = [['new', 'New lead', '#8b5cf6'], ['docs', 'Documents pending', '#f59e0b'], ['submitted', 'Submitted to bank', '#0ea5e9'],
    ['sanctioned', 'Sanctioned', '#22c55e'], ['disbursed', 'Disbursed', '#059669'], ['closed', 'Closed', '#94a3b8']];
  var LABEL = {}, COLOR = {}, ORDER = {};
  STAGES.forEach(function (s, i) { LABEL[s[0]] = s[1]; COLOR[s[0]] = s[2]; ORDER[s[0]] = i; });
  var ACTIVE = ['new', 'docs', 'submitted', 'sanctioned'];
  var PRODUCTS = { business: ['Business Loan', 1], home: ['Home Loan', 0.5], personal: ['Personal Loan', 1.5], gold: ['Gold Loan', 0.3], vehicle: ['Car Loan', 1], account: ['Bank Account', 0] };
  var AVA = ['#2563eb', '#f59e0b', '#10b981', '#ec4899', '#0ea5e9', '#f97316', '#8b5cf6'];

  var DEFAULTS = [
    { name: 'Rahul Deshmukh', city: 'Mumbai', product: 'home', amount: 4500000, status: 'submitted', follow: 2 },
    { name: 'Kavita Joshi', city: 'Pune', product: 'business', amount: 1200000, status: 'docs', follow: 0 },
    { name: 'Vikram Shinde', city: 'Kolhapur', product: 'vehicle', amount: 700000, status: 'new', follow: -1 },
    { name: 'Anjali More', city: 'Thane', product: 'home', amount: 3200000, status: 'sanctioned', follow: 3 },
    { name: 'Sunil Kadam', city: 'Nashik', product: 'business', amount: 800000, status: 'disbursed', follow: null },
    { name: 'Pooja Wagh', city: 'Nagpur', product: 'gold', amount: 150000, status: 'disbursed', follow: null },
    { name: 'Rohan Pawar', city: 'Satara', product: 'personal', amount: 250000, status: 'new', follow: 0 },
    { name: 'Meera Chavan', city: 'Aurangabad', product: 'personal', amount: 400000, status: 'sanctioned', follow: 1 },
    { name: 'Ajay Gaikwad', city: 'Solapur', product: 'vehicle', amount: 450000, status: 'closed', follow: null },
    { name: 'Sneha Salunkhe', city: 'Pune', product: 'account', amount: 0, status: 'docs', follow: 1 }
  ];
  var MONTH_BASE = [28, 35, 31, 46, 42, 58]; // ₹ lakh added per month, oldest first
  var YEAR_BASE = [210, 365, 240];

  var S;
  function reset() {
    S = { clients: DEFAULTS.map(function (c, i) { var x = {}; for (var k in c) x[k] = c[k]; x.id = i + 1; return x; }),
      nextId: DEFAULTS.length + 1, view: 'overview', q: '', stage: 'all', range: 'm', added: 0 };
  }
  reset();

  // helpers ---------------------------------------------------------------
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) {
    n = +n || 0;
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(n % 1e7 ? 2 : 0).replace(/\.?0+$/, '') + ' Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }
  function sum(l, f) { return l.reduce(function (t, c) { return t + f(c); }, 0); }
  function isActive(c) { return ACTIVE.indexOf(c.status) !== -1; }
  function when(d) {
    if (d === null || d === undefined) return '';
    if (d < 0) return (-d) + (d === -1 ? ' day' : ' days') + ' late';
    return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : 'In ' + d + ' days';
  }
  function initials(n) { return n.split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase(); }
  function avatar(c) { return '<span class="rvd-ava" style="background:' + AVA[c.id % AVA.length] + '">' + esc(initials(c.name)) + '</span>'; }
  function pill(st) { return '<span class="rvd-pill" style="--c:' + COLOR[st] + '"><i></i>' + LABEL[st] + '</span>'; }
  function byId(id) { return S.clients.filter(function (c) { return c.id === +id; })[0]; }
  function icon(p, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var I = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6"/>',
    flow: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    case: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M16 15h2"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>', reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5"/>',
    left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>'
  };

  // shell -------------------------------------------------------------------
  var VIEWS = [['overview', 'Overview', I.grid], ['clients', 'Clients', I.users], ['pipeline', 'Pipeline', I.flow], ['followups', 'Follow-ups', I.bell]];
  root.innerHTML =
    '<aside class="rvd-side"><div class="rvd-brand"><img src="images/logo.svg" alt="RAVEN" width="92" height="24"><span>Agent</span></div>' +
    '<p class="rvd-label">Menu</p><nav class="rvd-nav">' + VIEWS.map(function (v) {
      return '<button type="button" data-view="' + v[0] + '">' + icon(v[2], 17) + '<span>' + v[1] + '</span><em data-badge="' + v[0] + '"></em></button>';
    }).join('') + '</nav>' +
    '<div class="rvd-demo"><b>Demo mode</b><p>Try anything. Refresh to restore the sample data.</p><button type="button" data-act="reset">' + icon(I.reset, 14) + 'Reset demo</button></div></aside>' +
    '<div class="rvd-main"><div class="rvd-top"><div><h3 class="rvd-title"></h3><p class="rvd-sub">Sample agent dashboard &middot; no login needed</p></div>' +
    '<div class="rvd-top-r"><span class="rvd-tag">Live demo</span><button type="button" class="rvd-btn rvd-add" data-act="add" aria-label="Add client">' + icon(I.plus, 16) + '<span>Add client</span></button></div></div>' +
    '<div class="rvd-tabs">' + VIEWS.map(function (v) { return '<button type="button" data-view="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>' +
    '<div class="rvd-view" aria-live="polite"></div></div>' +
    '<div class="rvd-modal" hidden><form class="rvd-form" novalidate><div class="rvd-form-h"><b>Add a client</b><button type="button" class="rvd-x" data-act="close" aria-label="Close">' + icon(I.x, 16) + '</button></div>' +
    '<label>Full name<input name="name" maxlength="40" placeholder="e.g. Arjun Mehta" autocomplete="off"></label>' +
    '<div class="rvd-2"><label>City<input name="city" maxlength="24" placeholder="e.g. Pune" autocomplete="off"></label>' +
    '<label>Product<select name="product">' + Object.keys(PRODUCTS).map(function (k) { return '<option value="' + k + '">' + PRODUCTS[k][0] + '</option>'; }).join('') + '</select></label></div>' +
    '<div class="rvd-2"><label>Loan amount (₹)<input name="amount" type="number" min="0" step="10000" inputmode="numeric" placeholder="e.g. 500000"></label>' +
    '<label>Follow up<select name="follow"><option value="0">Today</option><option value="1">Tomorrow</option><option value="3">In 3 days</option><option value="7">Next week</option></select></label></div>' +
    '<p class="rvd-err" hidden></p><button type="submit" class="rvd-btn rvd-full">' + icon(I.plus, 16) + 'Add as new lead</button></form></div>' +
    '<div class="rvd-toast" role="status"></div>';

  var view = root.querySelector('.rvd-view'), modal = root.querySelector('.rvd-modal'), form = root.querySelector('.rvd-form'), toastEl = root.querySelector('.rvd-toast'), toastT;
  function toast(msg) {
    toastEl.innerHTML = icon(I.check, 15) + '<span>' + esc(msg) + '</span>';
    toastEl.classList.add('is-on'); clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  }

  // views -------------------------------------------------------------------
  function overview() {
    var all = S.clients, act = all.filter(isActive), won = all.filter(function (c) { return c.status === 'disbursed'; });
    var sanc = all.filter(function (c) { return c.status === 'sanctioned'; }), lost = all.filter(function (c) { return c.status === 'closed'; });
    var rate = won.length + sanc.length + lost.length ? Math.round((won.length + sanc.length) * 100 / (won.length + sanc.length + lost.length)) : 0;
    var pay = function (l) { return sum(l, function (c) { return c.amount * PRODUCTS[c.product][1] / 100; }); };
    var kpi = function (cls, ic, label, val, sub, go) {
      return '<button type="button" class="rvd-kpi ' + cls + '" data-go="' + go + '"><span class="rvd-kic">' + icon(ic, 18) + '</span><p>' + label + '</p><b>' + val + '</b><i>' + sub + '</i></button>';
    };
    var months = [], d = new Date();
    for (var k = 5; k >= 0; k--) months.push(new Date(d.getFullYear(), d.getMonth() - k, 1).toLocaleString('en-IN', { month: 'short' }));
    var yr = d.getFullYear();
    var series = S.range === 'm' ? MONTH_BASE.map(function (v, i) { return [months[i], v + (i === 5 ? S.added / 1e5 : 0)]; })
      : YEAR_BASE.map(function (v, i) { return [String(yr - 2 + i), v + (i === 2 ? S.added / 1e5 : 0)]; });
    var max = Math.max.apply(null, series.map(function (s) { return s[1]; })) * 1.15;
    var bars = series.map(function (s, i) {
      var h = Math.max(4, s[1] / max * 100), last = i === series.length - 1;
      return '<div class="rvd-bar' + (last ? ' is-now' : '') + '" style="--h:' + h.toFixed(1) + '%;--i:' + i + '"><em>₹' + (Math.round(s[1] * 10) / 10) + 'L</em><span></span><small>' + s[0] + '</small></div>';
    }).join('');
    var stages = STAGES.map(function (s) {
      var n = all.filter(function (c) { return c.status === s[0]; }).length;
      return '<button type="button" class="rvd-srow" data-stagego="' + s[0] + '"><span>' + s[1] + '</span><em><i style="width:' + (all.length ? n / all.length * 100 : 0) + '%;background:' + s[2] + '"></i></em><b>' + n + '</b></button>';
    }).join('');
    return '<div class="rvd-kpis">' +
      kpi('k1', I.case, 'Active cases', act.length, money(sum(act, function (c) { return c.amount; })) + ' in pipeline', 'active') +
      kpi('k2', I.coin, 'Disbursed', money(sum(won, function (c) { return c.amount; })), won.length + (won.length === 1 ? ' case' : ' cases') + ' paid out', 'disbursed') +
      kpi('k3', I.target, 'Success rate', rate + '%', 'sanctioned + disbursed', 'all') +
      kpi('k4', I.wallet, 'Payout earned', money(pay(won)), '+ ' + money(pay(sanc)) + ' expected', 'sanctioned') +
      '</div><div class="rvd-row"><div class="rvd-card"><div class="rvd-card-h"><h4>Loan amount added</h4><span class="rvd-seg"><button type="button" data-range="m" class="' + (S.range === 'm' ? 'on' : '') + '">Monthly</button><button type="button" data-range="y" class="' + (S.range === 'y' ? 'on' : '') + '">Annually</button></span></div>' +
      '<div class="rvd-bars">' + bars + '</div></div>' +
      '<div class="rvd-card"><div class="rvd-card-h"><h4>Cases by stage</h4><button type="button" class="rvd-link" data-view="pipeline">Open pipeline</button></div><div class="rvd-stages">' + stages + '</div></div></div>';
  }

  function filtered() {
    var q = S.q.trim().toLowerCase();
    return S.clients.filter(function (c) {
      if (S.stage === 'active' ? !isActive(c) : S.stage !== 'all' && c.status !== S.stage) return false;
      return !q || (c.name + ' ' + c.city + ' ' + PRODUCTS[c.product][0]).toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) { return b.id - a.id; });
  }
  function clients() {
    var list = filtered();
    var chips = [['all', 'All', S.clients.length], ['active', 'Active', S.clients.filter(isActive).length]].concat(STAGES.map(function (s) {
      return [s[0], s[1], S.clients.filter(function (c) { return c.status === s[0]; }).length];
    }));
    var rows = list.map(function (c) {
      return '<div class="rvd-tr" data-id="' + c.id + '"><div class="rvd-who">' + avatar(c) + '<div><b>' + esc(c.name) + '</b><small>' + esc(c.city || '—') + '</small></div></div>' +
        '<span class="rvd-prod">' + PRODUCTS[c.product][0] + '</span><span class="rvd-amt">' + (c.amount ? money(c.amount) : '—') + '</span>' +
        '<label class="rvd-sel" style="--c:' + COLOR[c.status] + '"><i></i><select data-stage="' + c.id + '" aria-label="Stage for ' + esc(c.name) + '">' +
        STAGES.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === c.status ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label>' +
        '<span class="rvd-when' + (c.follow < 0 && isActive(c) ? ' is-late' : '') + '">' + (isActive(c) ? when(c.follow) || '—' : '—') + '</span>' +
        '<button type="button" class="rvd-del" data-del="' + c.id + '" aria-label="Remove ' + esc(c.name) + '">' + icon(I.x, 14) + '</button></div>';
    }).join('');
    return '<div class="rvd-tools"><label class="rvd-search">' + icon(I.search, 16) + '<input type="search" placeholder="Search name, city or product" value="' + esc(S.q) + '" data-q></label></div>' +
      '<div class="rvd-chips">' + chips.map(function (c) { return '<button type="button" data-chip="' + c[0] + '" class="' + (S.stage === c[0] ? 'on' : '') + '">' + c[1] + ' <em>' + c[2] + '</em></button>'; }).join('') + '</div>' +
      '<div class="rvd-table"><div class="rvd-th"><span>Client</span><span>Product</span><span>Amount</span><span>Stage</span><span>Follow-up</span><span></span></div>' +
      (rows || '<p class="rvd-empty">No clients match. Try another filter or add a client.</p>') + '</div>';
  }

  function pipeline() {
    return '<p class="rvd-hint">Drag a card to another stage (on a phone, press and hold it first), or use the arrows. Closed cases stay under Clients.</p><div class="rvd-board">' + STAGES.slice(0, 5).map(function (s) {
      var items = S.clients.filter(function (c) { return c.status === s[0]; });
      return '<div class="rvd-col" data-col="' + s[0] + '" style="--c:' + s[2] + '"><div class="rvd-col-h"><i></i><b>' + s[1] + '</b><em>' + items.length + '</em></div>' +
        '<p class="rvd-col-sum">' + money(sum(items, function (c) { return c.amount; })) + '</p>' +
        items.map(function (c) {
          var i = ORDER[c.status];
          return '<div class="rvd-pc" draggable="true" data-drag="' + c.id + '"><div class="rvd-who">' + avatar(c) + '<div><b>' + esc(c.name) + '</b><small>' + PRODUCTS[c.product][0] + (c.amount ? ' · ' + money(c.amount) : '') + '</small></div></div>' +
            '<div class="rvd-pc-f"><span class="rvd-when' + (c.follow < 0 && isActive(c) ? ' is-late' : '') + '">' + (isActive(c) ? when(c.follow) : '') + '</span>' +
            '<span class="rvd-arw"><button type="button" data-move="' + c.id + '" data-dir="-1" aria-label="Move back"' + (i === 0 ? ' disabled' : '') + '>' + icon(I.left, 14) + '</button>' +
            '<button type="button" data-move="' + c.id + '" data-dir="1" aria-label="Move forward"' + (i >= 4 ? ' disabled' : '') + '>' + icon(I.right, 14) + '</button></span></div></div>';
        }).join('') + '</div>';
    }).join('') + '</div>';
  }

  function followups() {
    var list = S.clients.filter(function (c) { return isActive(c) && c.follow !== null; }).sort(function (a, b) { return a.follow - b.follow; });
    if (!list.length) return '<div class="rvd-done">' + icon(I.check, 28) + '<b>All caught up</b><p>No follow-ups pending. Add a client to create one.</p></div>';
    return '<div class="rvd-fu">' + list.map(function (c) {
      return '<div class="rvd-fi' + (c.follow < 0 ? ' is-late' : c.follow === 0 ? ' is-today' : '') + '">' + avatar(c) +
        '<div class="rvd-fi-t"><b>' + esc(c.name) + '</b><small>' + PRODUCTS[c.product][0] + ' &middot; ' + LABEL[c.status] + '</small></div>' +
        '<span class="rvd-when">' + when(c.follow) + '</span>' +
        '<button type="button" class="rvd-mini" data-snooze="' + c.id + '">+1 day</button><button type="button" class="rvd-mini is-ok" data-done="' + c.id + '">' + icon(I.check, 14) + 'Done</button></div>';
    }).join('') + '</div>';
  }

  var TITLES = { overview: 'Overview', clients: 'Clients', pipeline: 'Pipeline', followups: 'Follow-ups' };
  function render(keepFocus) {
    root.querySelectorAll('[data-view]').forEach(function (b) {
      if (b.closest('.rvd-nav') || b.closest('.rvd-tabs')) {
        var on = b.getAttribute('data-view') === S.view;
        b.classList.toggle('is-on', on);
        if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      }
    });
    root.querySelector('.rvd-title').textContent = TITLES[S.view];
    var due = S.clients.filter(function (c) { return isActive(c) && c.follow !== null && c.follow <= 0; }).length;
    root.querySelector('[data-badge="clients"]').textContent = S.clients.length;
    var fc = root.querySelector('[data-badge="followups"]'); fc.textContent = due || ''; fc.classList.toggle('is-alert', due > 0);
    view.innerHTML = '<div class="rvd-in">' + { overview: overview, clients: clients, pipeline: pipeline, followups: followups }[S.view]() + '</div>';
    if (keepFocus) { var q = view.querySelector('[data-q]'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  }

  function setStage(id, st) {
    var c = byId(id); if (!c || c.status === st) return;
    c.status = st;
    if (!isActive(c)) c.follow = null; else if (c.follow === null) c.follow = 2;
    toast(c.name + ' → ' + LABEL[st]);
    render();
  }

  // events --------------------------------------------------------------------
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    var v = t.getAttribute('data-view'), act = t.getAttribute('data-act');
    if (v) { S.view = v; render(); return; }
    if (act === 'add') { form.reset(); form.querySelector('.rvd-err').hidden = true; modal.hidden = false; setTimeout(function () { form.querySelector('[name=name]').focus(); }, 30); return; }
    if (act === 'close') { modal.hidden = true; return; }
    if (act === 'reset') { reset(); render(); toast('Demo reset to sample data'); return; }
    if (t.hasAttribute('data-range')) { S.range = t.getAttribute('data-range'); render(); return; }
    if (t.hasAttribute('data-go')) { S.view = 'clients'; S.q = ''; S.stage = t.getAttribute('data-go'); render(); return; }
    if (t.hasAttribute('data-stagego')) { S.view = 'clients'; S.q = ''; S.stage = t.getAttribute('data-stagego'); render(); return; }
    if (t.hasAttribute('data-chip')) { S.stage = t.getAttribute('data-chip'); render(); return; }
    if (t.hasAttribute('data-del')) {
      var c = byId(t.getAttribute('data-del'));
      S.clients = S.clients.filter(function (x) { return x !== c; }); toast(c.name + ' removed'); render(); return;
    }
    if (t.hasAttribute('data-move')) {
      var m = byId(t.getAttribute('data-move')), ni = ORDER[m.status] + (+t.getAttribute('data-dir'));
      if (ni >= 0 && ni <= 4) setStage(m.id, STAGES[ni][0]); return;
    }
    if (t.hasAttribute('data-done')) { var d = byId(t.getAttribute('data-done')); d.follow = null; toast('Follow-up with ' + d.name + ' done'); render(); return; }
    if (t.hasAttribute('data-snooze')) { var z = byId(t.getAttribute('data-snooze')); z.follow = Math.max(z.follow, 0) + 1; toast(z.name + ' moved to ' + when(z.follow).toLowerCase()); render(); }
  });
  root.addEventListener('change', function (e) {
    var s = e.target.getAttribute && e.target.getAttribute('data-stage');
    if (s) setStage(s, e.target.value);
  });
  root.addEventListener('input', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-q')) { S.q = e.target.value; render(true); }
  });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
  form.addEventListener('input', function () { form.querySelector('.rvd-err').hidden = true; });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) modal.hidden = true; });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.querySelector('[name=name]').value.trim(), amt = Math.max(0, Math.round(+form.amount.value || 0)), prod = form.product.value, err = form.querySelector('.rvd-err');
    var msg = name.length < 2 ? 'Please enter the client’s name.' : prod !== 'account' && !amt ? 'Please enter a loan amount.' : amt > 1e9 ? 'Please enter an amount under ₹100 Cr.' : '';
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    S.clients.push({ id: S.nextId++, name: name, city: form.city.value.trim(), product: prod, amount: amt, status: 'new', follow: +form.follow.value });
    S.added += amt; modal.hidden = true;
    toast(name + ' added as a new lead');
    render();
  });

  // drag and drop between pipeline columns
  var dragId = null;
  root.addEventListener('dragstart', function (e) {
    var c = e.target.closest && e.target.closest('[data-drag]'); if (!c) return;
    dragId = c.getAttribute('data-drag'); c.classList.add('is-drag');
    try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* older browsers */ }
  });
  root.addEventListener('dragend', function () { dragId = null; root.querySelectorAll('.is-over,.is-drag').forEach(function (n) { n.classList.remove('is-over', 'is-drag'); }); });
  root.addEventListener('dragover', function (e) {
    var col = e.target.closest && e.target.closest('[data-col]'); if (!col || !dragId) return;
    e.preventDefault(); root.querySelectorAll('.is-over').forEach(function (n) { if (n !== col) n.classList.remove('is-over'); }); col.classList.add('is-over');
  });
  root.addEventListener('drop', function (e) {
    var col = e.target.closest && e.target.closest('[data-col]'); if (!col || !dragId) return;
    e.preventDefault(); var id = dragId; dragId = null; setStage(id, col.getAttribute('data-col'));
  });

    if (window.TouchDrag) TouchDrag(root, { card: '[data-drag]', col: '[data-col]',
    cardId: function (c) { return c.getAttribute('data-drag'); }, colId: function (c) { return c.getAttribute('data-col'); }, onDrop: setStage });

  render();
})();
