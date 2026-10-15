/* Public list of bank auctions (auctions.html): tabs, filters, live updates and alerts. */
(function () {
  var S = window.RavenAuctions, U = window.AUI, App = window.RavenApp, UI = window.RavenUI;
  var $ = function (id) { return document.getElementById(id); };
  var esc = App.esc, state = { tab: 'live', q: '', city: '', type: '', bank: '', price: '', sort: 'ending' };
  var TABS = [['live', 'Live now', 'Live'], ['soon', 'Starting in 24 h', 'Next 24 h'], ['upcoming', 'Upcoming', 'Upcoming'], ['closed', 'Closed', 'Closed']];

  function bucket(a) {
    var p = S.phase(a), t = Date.now();
    if (p === 'live' || p === 'paused') return 'live';
    if (p === 'registration' || p === 'upcoming') return a.startAt - t < 86400e3 ? 'soon' : 'upcoming';
    return 'closed';
  }
  function list() { return S.all().filter(U.isPublic); }

  // filters: one panel, choices are staged in a draft and only applied with "Apply N filters"
  var KEYS = ['city', 'type', 'bank', 'price'];
  var PRICE = [['a', 'Up to ₹25 L'], ['b', '₹25 L – ₹1 Cr'], ['c', '₹1 Cr – ₹5 Cr'], ['d', 'Above ₹5 Cr']];
  var SORT = [['ending', 'Ending / starting soonest'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['bids', 'Most bids']];
  var GROUPS, draft = {};
  function fillFilters() {
    var all = list(), cities = {}, banks = {};
    all.forEach(function (a) { cities[a.city] = 1; banks[a.bankId] = 1; });
    GROUPS = [
      ['city', 'City', 'Any city', Object.keys(cities).sort().map(function (c) { return [c, c]; })],
      ['type', 'Asset type', 'Any type', Object.keys(S.ASSET).map(function (k) { return [k, S.ASSET[k].label]; })],
      ['bank', 'Bank', 'Any bank', Object.keys(banks).filter(function (k) { return S.bank(k); }).map(function (k) { return [k, S.bank(k).name]; })],
      ['price', 'Price', 'Any price', PRICE],
      ['sort', 'Sort by', null, SORT]
    ];
    var opt = function (arr) { return arr.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join(''); };
    $('al-type').innerHTML = '<option value="">Any asset type</option>' + opt(GROUPS[1][3]);
    $('al-city').innerHTML = '<option value="">Any city</option>' + opt(GROUPS[0][3]);
  }
  function labelOf(key, val) {
    var g = GROUPS.filter(function (x) { return x[0] === key; })[0];
    var o = g[3].filter(function (x) { return x[0] === val; })[0];
    return o ? o[1] : val;
  }
  function countOf(o) { return KEYS.filter(function (k) { return o[k]; }).length + (o.sort !== 'ending' ? 1 : 0); }
  function renderPanel() {
    $('f-groups').innerHTML = GROUPS.map(function (g) {
      var opts = (g[2] ? [['', g[2]]] : []).concat(g[3]);
      return '<div class="ac-fg"><p class="ac-fg-t">' + g[1] + '</p><div class="ac-chips" role="radiogroup" aria-label="' + g[1] + '">' + opts.map(function (o) {
        var on = (draft[g[0]] || '') === o[0];
        return '<button type="button" role="radio" aria-checked="' + on + '" class="ac-chip' + (on ? ' is-on' : '') + '" data-k="' + g[0] + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>';
      }).join('') + '</div></div>';
    }).join('');
    var n = countOf(draft);
    $('f-apply').textContent = n ? 'Apply ' + n + ' filter' + (n === 1 ? '' : 's') : 'Apply filters';
    $('f-clear').disabled = !n;
  }
  function openPanel() {
    draft = {}; KEYS.concat('sort').forEach(function (k) { draft[k] = state[k]; });
    renderPanel();
    if (window.matchMedia('(min-width: 640px)').matches) {
      var top = $('ac-tools').getBoundingClientRect().top;
      if (top > 140 || top < 90) window.scrollTo({ top: top + window.pageYOffset - 116, behavior: 'smooth' });
    }
    $('f-panel').hidden = false; $('f-back').hidden = false;
    $('f-open').setAttribute('aria-expanded', 'true'); document.body.classList.add('ac-fp-open');
    var first = $('f-panel').querySelector('.ac-chip.is-on') || $('f-panel').querySelector('.ac-chip'); if (first) first.focus();
  }
  function closePanel() {
    $('f-panel').hidden = true; $('f-back').hidden = true;
    $('f-open').setAttribute('aria-expanded', 'false'); document.body.classList.remove('ac-fp-open');
  }
  function renderActive() {
    var n = countOf(state), chips = KEYS.filter(function (k) { return state[k]; }).map(function (k) { return [k, labelOf(k, state[k])]; });
    if (state.sort !== 'ending') chips.push(['sort', labelOf('sort', state.sort)]);
    $('f-badge').hidden = !n; $('f-badge').textContent = n;
    $('f-open').classList.toggle('is-on', n > 0);
    $('f-active').innerHTML = chips.length ? chips.map(function (c) {
      return '<button type="button" class="ac-tag" data-rmf="' + c[0] + '" aria-label="Remove filter ' + esc(c[1]) + '">' + esc(c[1]) + '<span aria-hidden="true">&times;</span></button>';
    }).join('') + '<button type="button" class="ac-tag-clear" data-rmf="*">Clear all</button>' : '';
  }
  var PR = { '': [0, Infinity], a: [0, 2500000], b: [2500000, 10000000], c: [10000000, 50000000], d: [50000000, Infinity] };

  function render() {
    if (!render.live) $('ac-grid').classList.remove('is-static');
    var all = list(), counts = { live: 0, soon: 0, upcoming: 0, closed: 0 };
    all.forEach(function (a) { counts[bucket(a)]++; if (bucket(a) === 'soon') counts.upcoming++; });
    $('ac-tabs').innerHTML = TABS.map(function (t) { return '<button type="button" class="ac-tab' + (state.tab === t[0] ? ' is-on' : '') + '" data-tab="' + t[0] + '" aria-pressed="' + (state.tab === t[0]) + '">' + (t[0] === 'live' ? '<i class="ac-live-dot"></i>' : '') + '<span class="ac-tl">' + t[1] + '</span><span class="ac-ts">' + t[2] + '</span> <b>' + counts[t[0]] + '</b></button>'; }).join('');
    var liveVal = all.filter(function (a) { return bucket(a) === 'live'; }).reduce(function (s, a) { return s + (a.currentHigh || a.reserve); }, 0);
    var bids = all.reduce(function (s, a) { return s + a.bidCount; }, 0);
    $('ac-strip').innerHTML = '<div><b>' + counts.live + '</b><span>live now</span></div><div><b>' + (counts.upcoming) + '</b><span>upcoming</span></div><div><b>' + U.short(liveVal) + '</b><span>value in live auctions</span></div><div><b>' + bids + '</b><span>bids placed</span></div>';

    var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean), pr = PR[state.price];
    var rows = all.filter(function (a) {
      var b = bucket(a);
      if (state.tab === 'upcoming' ? (b !== 'upcoming' && b !== 'soon') : b !== state.tab) return false;
      if (state.city && a.city !== state.city) return false;
      if (state.type && a.assetType !== state.type) return false;
      if (state.bank && a.bankId !== state.bank) return false;
      var price = a.currentHigh || a.reserve;
      if (price < pr[0] || price >= pr[1]) return false;
      var hay = [a.title, a.city, a.district, a.address, a.ref, (S.bank(a.bankId) || {}).name, (S.ASSET[a.assetType] || {}).label].join(' ').toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    rows.sort(function (x, y) {
      if (state.sort === 'low') return (x.currentHigh || x.reserve) - (y.currentHigh || y.reserve);
      if (state.sort === 'high') return (y.currentHigh || y.reserve) - (x.currentHigh || x.reserve);
      if (state.sort === 'bids') return y.bidCount - x.bidCount;
      return state.tab === 'closed' ? y.endAt - x.endAt : (S.phase(x) === 'live' ? x.endAt : x.startAt) - (S.phase(y) === 'live' ? y.endAt : y.startAt);
    });
    renderActive();
    $('ac-count').textContent = rows.length + ' auction' + (rows.length === 1 ? '' : 's');
    $('ac-grid').innerHTML = rows.length ? rows.map(U.card).join('') :
      '<div class="ap-card ap-empty ac-empty"><span class="art">' + UI.icon('search', 28) + '</span><h3>No auctions here</h3><p>Try another tab or clear the filters. Set an alert below and we will tell you when a matching auction is posted.</p></div>';
  }

  $('ac-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) { state.tab = b.getAttribute('data-tab'); render(); } });
  $('f-q').addEventListener('input', function () { state.q = this.value; render(); });
  $('f-open').addEventListener('click', function () { if ($('f-panel').hidden) openPanel(); else closePanel(); });
  $('f-close').addEventListener('click', closePanel);
  $('f-back').addEventListener('click', closePanel);
  $('f-panel').addEventListener('click', function (e) {
    var c = e.target.closest('[data-k]'); if (!c) return;
    var k = c.getAttribute('data-k'), v = c.getAttribute('data-v');
    draft[k] = k === 'sort' ? v : (draft[k] === v ? '' : v);
    renderPanel();
    var again = [].filter.call($('f-panel').querySelectorAll('[data-k="' + k + '"]'), function (x) { return x.getAttribute('data-v') === v; })[0]; if (again) again.focus();
  });
  $('f-clear').addEventListener('click', function () { KEYS.forEach(function (k) { draft[k] = ''; }); draft.sort = 'ending'; renderPanel(); });
  $('f-apply').addEventListener('click', function () {
    KEYS.concat('sort').forEach(function (k) { state[k] = draft[k]; });
    closePanel(); render(); $('f-open').focus();
    var n = countOf(state); if (UI && UI.toast) UI.toast(n ? n + ' filter' + (n === 1 ? '' : 's') + ' applied' : 'Filters cleared');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('f-panel').hidden) { closePanel(); $('f-open').focus(); } });
  $('f-active').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rmf]'); if (!b) return;
    var k = b.getAttribute('data-rmf');
    if (k === '*') { KEYS.forEach(function (x) { state[x] = ''; }); state.sort = 'ending'; } else if (k === 'sort') state.sort = 'ending'; else state[k] = '';
    render();
  });

  // alerts (form K)
  var u = App.current();
  if (u && u.profile) { $('al-contact').value = u.profile.mobile || u.profile.email || ''; }
  function renderAlerts() {
    var mine = S.db().alerts.filter(function (a) { return a.userKey === U.userKey(); });
    $('al-list').innerHTML = mine.length ? '<p class="ap-mini" style="margin:1rem 0 .5rem">Your alerts</p><div class="ap-list">' + mine.map(function (a) {
      return '<div class="ap-li"><div class="tx"><strong>' + esc([a.typeLabel || 'Any asset', a.city || 'any city', a.max ? 'up to ' + U.short(a.max) : ''].filter(Boolean).join(' · ')) + '</strong><small>' + esc(a.channel + ' · ' + a.freq + ' · ' + a.contact) + '</small></div><button type="button" class="ap-btn is-sm is-danger" data-rm="' + a.id + '">Remove</button></div>';
    }).join('') + '</div>' : '';
  }
  $('al-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var contact = $('al-contact').value.trim();
    var ok = /^[6-9]\d{9}$/.test(contact.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    $('al-err').classList.toggle('is-on', !ok); $('al-contact').classList.toggle('is-bad', !ok);
    if (!ok) { $('al-contact').focus(); return; }
    var max = +$('al-max').value || 0;
    S.addAlert(U.userKey(), { type: $('al-type').value, typeLabel: $('al-type').value ? S.ASSET[$('al-type').value].label : '', city: $('al-city').value, max: max, channel: $('al-channel').value, freq: $('al-freq').value, contact: contact });
    UI.toast('Alert saved – we will notify you when a matching auction is posted');
    renderAlerts();
  });
  $('al-list').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { S.removeAlert(b.getAttribute('data-rm')); renderAlerts(); } });

  // live updates: re-render on every change from any tab; refresh timers every second
  var pending;
  S.on(function () { clearTimeout(pending); pending = setTimeout(function () { $('ac-grid').classList.add('is-static'); render.live = true; render(); render.live = false; }, 120); });
  setInterval(function () { U.tick(); }, 1000);
  var url = new URLSearchParams(location.search);
  if (url.get('tab')) state.tab = url.get('tab');
  fillFilters(); render(); renderAlerts();
})();
