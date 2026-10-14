/* Public list of bank auctions (auctions.html): tabs, filters, live updates and alerts. */
(function () {
  var S = window.RavenAuctions, U = window.AUI, App = window.RavenApp, UI = window.RavenUI;
  var $ = function (id) { return document.getElementById(id); };
  var esc = App.esc, state = { tab: 'live', q: '', city: '', type: '', bank: '', price: '', sort: 'ending' };
  var TABS = [['live', 'Live now'], ['soon', 'Starting in 24 h'], ['upcoming', 'Upcoming'], ['closed', 'Closed']];

  function bucket(a) {
    var p = S.phase(a), t = Date.now();
    if (p === 'live' || p === 'paused') return 'live';
    if (p === 'registration' || p === 'upcoming') return a.startAt - t < 86400e3 ? 'soon' : 'upcoming';
    return 'closed';
  }
  function list() { return S.all().filter(U.isPublic); }

  // filter options from the data
  function fillFilters() {
    var all = list(), cities = {}, banks = {};
    all.forEach(function (a) { cities[a.city] = 1; banks[a.bankId] = 1; });
    $('f-city').innerHTML = '<option value="">All cities</option>' + Object.keys(cities).sort().map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    $('f-type').innerHTML = '<option value="">All asset types</option>' + Object.keys(S.ASSET).map(function (k) { return '<option value="' + k + '">' + S.ASSET[k].label + '</option>'; }).join('');
    $('f-bank').innerHTML = '<option value="">All banks</option>' + Object.keys(banks).map(function (k) { var b = S.bank(k); return b ? '<option value="' + k + '">' + esc(b.name) + '</option>' : ''; }).join('');
    $('al-type').innerHTML = $('f-type').innerHTML.replace('All asset types', 'Any asset type');
    $('al-city').innerHTML = $('f-city').innerHTML.replace('All cities', 'Any city');
    ['f-city', 'f-type', 'f-bank'].forEach(function (id) { $(id).value = state[id.slice(2)] || ''; });
  }
  var PR = { '': [0, Infinity], a: [0, 2500000], b: [2500000, 10000000], c: [10000000, 50000000], d: [50000000, Infinity] };

  function render() {
    if (!render.live) $('ac-grid').classList.remove('is-static');
    var all = list(), counts = { live: 0, soon: 0, upcoming: 0, closed: 0 };
    all.forEach(function (a) { counts[bucket(a)]++; if (bucket(a) === 'soon') counts.upcoming++; });
    $('ac-tabs').innerHTML = TABS.map(function (t) { return '<button type="button" class="ac-tab' + (state.tab === t[0] ? ' is-on' : '') + '" data-tab="' + t[0] + '" aria-pressed="' + (state.tab === t[0]) + '">' + (t[0] === 'live' ? '<i class="ac-live-dot"></i>' : '') + t[1] + ' <b>' + counts[t[0]] + '</b></button>'; }).join('');
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
    $('ac-count').textContent = rows.length + ' auction' + (rows.length === 1 ? '' : 's');
    $('ac-grid').innerHTML = rows.length ? rows.map(U.card).join('') :
      '<div class="ap-card ap-empty ac-empty"><span class="art">' + UI.icon('search', 28) + '</span><h3>No auctions here</h3><p>Try another tab or clear the filters. Set an alert below and we will tell you when a matching auction is posted.</p></div>';
  }

  $('ac-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) { state.tab = b.getAttribute('data-tab'); render(); } });
  [['f-q', 'q', 'input'], ['f-city', 'city', 'change'], ['f-type', 'type', 'change'], ['f-bank', 'bank', 'change'], ['f-price', 'price', 'change'], ['f-sort', 'sort', 'change']].forEach(function (x) {
    $(x[0]).addEventListener(x[2], function () { state[x[1]] = this.value; render(); });
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
