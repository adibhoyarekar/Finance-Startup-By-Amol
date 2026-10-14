/* Agent dashboard (dashboard.html): client list, pipeline, follow-ups and expected payout.
   Data lives in this browser only - see raven-app.js. */
(function () {
  var App = window.RavenApp;
  var me = App && App.guard('agent');
  if (!me) return;
  var esc = App.esc, short = App.short, inr = App.inr;
  var STATUS = {}; App.STATUSES.forEach(function (s) { STATUS[s[0]] = s[1]; });
  var ACTIVE = ['new', 'docs', 'submitted', 'sanctioned'];
  var $ = function (id) { return document.getElementById(id); };

  function today() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function niceDate(s) {
    if (!s) return '';
    var t = today();
    if (s < t) return 'Overdue · ' + new Date(s + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (s === t) return 'Today';
    if (s === addDays(1)) return 'Tomorrow';
    return new Date(s + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  function payoutPct(product) {
    var p = me.payout || {};
    return p[product] != null ? +p[product] : App.DEFAULT_PAYOUT[product] || 0;
  }
  function payout(c) { return (+c.amount || 0) * payoutPct(c.product) / 100; }
  function productLabel(p) { return (App.PRODUCTS[p] || App.PRODUCTS.other).label; }
  function findLink(c) {
    var p = App.PRODUCTS[c.product] || App.PRODUCTS.other;
    return p.section ? p.page + '?client=' + c.id + '#' + p.section : 'funding-loans.html';
  }

  /* ---------- header ---------- */
  var prof = me.profile || {};
  $('db-hello').textContent = 'Welcome, ' + (prof.fullName || me.username).split(' ')[0];
  $('db-meta').innerHTML = esc([prof.firm, prof.city].filter(Boolean).join(' · ')) +
    ' <span class="db-badge ' + (me.verification === 'verified' ? 'is-ok' : '') + '">' + (me.verification === 'verified' ? 'Verified agent' : 'Verification pending') + '</span>';
  if (App.param('welcome')) {
    var w = $('db-welcome');
    w.hidden = false;
    w.innerHTML = '<strong>Your agent account is ready.</strong> Add your first client, then use <em>Find best option</em> to run the matching search and save the result to their file.';
  }
  $('db-out').addEventListener('click', function () { App.logout(); location.href = 'index.html'; });

  /* ---------- filters ---------- */
  var q = $('db-q'), fStatus = $('db-fstatus'), fProduct = $('db-fproduct'), sort = $('db-sort');
  fStatus.innerHTML = '<option value="all">All statuses</option><option value="active">Active cases</option>' +
    App.STATUSES.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('');
  fProduct.innerHTML = '<option value="all">All products</option>' +
    Object.keys(App.PRODUCTS).map(function (k) { return '<option value="' + k + '">' + App.PRODUCTS[k].label + '</option>'; }).join('');
  [q, fStatus, fProduct, sort].forEach(function (el) { el.addEventListener('input', renderList); });

  /* ---------- render ---------- */
  function render() { renderStats(); renderFollow(); renderList(); renderPayout(); }

  function renderStats() {
    var list = App.clients(), t = today();
    var active = list.filter(function (c) { return ACTIVE.indexOf(c.status) !== -1; });
    var due = active.filter(function (c) { return c.followUp && c.followUp <= t; });
    var won = list.filter(function (c) { return c.status === 'disbursed'; });
    function sum(a, f) { return a.reduce(function (s, c) { return s + f(c); }, 0); }
    var tiles = [
      ['Clients', list.length, 'in your book'],
      ['Active cases', active.length, 'not yet disbursed'],
      ['Follow-ups due', due.length, due.length ? 'today or overdue' : 'all caught up'],
      ['Pipeline', short(sum(active, function (c) { return +c.amount || 0; })), 'loan amount in progress'],
      ['Expected payout', short(sum(active, payout)), 'on active cases'],
      ['Earned', short(sum(won, payout)), won.length + ' disbursed']
    ];
    $('db-stats').innerHTML = tiles.map(function (x, i) {
      return '<div class="db-stat' + (i === 2 && due.length ? ' is-warn' : '') + '"><p class="hl-sk">' + x[0] + '</p><p class="hl-sv">' + x[1] + '</p><p class="hl-ss">' + x[2] + '</p></div>';
    }).join('');
  }

  function renderFollow() {
    var limit = addDays(7);
    var list = App.clients().filter(function (c) { return ACTIVE.indexOf(c.status) !== -1 && c.followUp && c.followUp <= limit; })
      .sort(function (a, b) { return a.followUp < b.followUp ? -1 : 1; });
    $('db-follow').innerHTML = list.length ? '<ul class="db-follow">' + list.map(function (c) {
      var late = c.followUp < today();
      return '<li><a href="#c-' + c.id + '" data-jump="' + c.id + '"><span>' + esc(c.name) + '</span><small>' + productLabel(c.product) + ' · ' + STATUS[c.status] + '</small></a>' +
        '<span class="db-when' + (late ? ' is-late' : '') + '">' + niceDate(c.followUp) + '</span></li>';
    }).join('') + '</ul>' : '<p class="db-muted">No follow-ups in the next 7 days. Set a follow-up date when you add or edit a client.</p>';
  }

  function renderList() {
    var all = App.clients(), terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    var list = all.filter(function (c) {
      if (fStatus.value === 'active' ? ACTIVE.indexOf(c.status) === -1 : fStatus.value !== 'all' && c.status !== fStatus.value) return false;
      if (fProduct.value !== 'all' && c.product !== fProduct.value) return false;
      var hay = [c.name, c.mobile, c.city, c.email, c.notes, productLabel(c.product)].join(' ').toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    var s = sort.value;
    list.sort(function (a, b) {
      if (s === 'follow') return (a.followUp || '9999') < (b.followUp || '9999') ? -1 : 1;
      if (s === 'amount') return (+b.amount || 0) - (+a.amount || 0);
      if (s === 'name') return a.name.localeCompare(b.name);
      return a.updatedAt < b.updatedAt ? 1 : -1;
    });
    $('db-count').textContent = all.length ? list.length + ' of ' + all.length : '';

    if (!all.length) {
      $('db-list').innerHTML = '<div class="db-empty"><h3>No clients yet</h3><p>Add a client with their basic details, then use <strong>Find best option</strong> to run the right search and save the result to their file.</p>' +
        '<button type="button" class="hl-submit" data-add>Add your first client</button></div>';
      return;
    }
    if (!list.length) { $('db-list').innerHTML = '<p class="db-muted db-pad">No clients match these filters.</p>'; return; }

    $('db-list').innerHTML = list.map(function (c) {
      var mob = (c.mobile || '').replace(/\D/g, '');
      var late = c.followUp && c.followUp < today() && ACTIVE.indexOf(c.status) !== -1;
      var pay = payout(c);
      return '<article class="db-client" id="c-' + c.id + '">' +
        '<div class="db-c-top"><div><h3>' + esc(c.name) + '</h3><p class="db-c-meta">' +
        [mob ? '<a href="tel:+91' + mob + '">' + esc(c.mobile) + '</a>' : '', esc(c.city), c.amount ? short(+c.amount) : ''].filter(Boolean).join(' · ') + '</p></div>' +
        '<span class="db-chip">' + productLabel(c.product) + '</span></div>' +
        '<div class="db-c-row"><label class="db-status db-s-' + c.status + '"><span class="sr-only">Status</span><select data-status="' + c.id + '">' +
        App.STATUSES.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === c.status ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label>' +
        (c.followUp ? '<span class="db-when' + (late ? ' is-late' : '') + '">Follow-up: ' + niceDate(c.followUp) + '</span>' : '') +
        (pay ? '<span class="db-pay">Payout ~' + short(pay) + '</span>' : '') + '</div>' +
        (c.lastSearch ? '<p class="db-last"><strong>' + esc(c.lastSearch.headline) + '</strong>' +
          (c.searches && c.searches[c.lastSearch.kind] && c.searches[c.lastSearch.kind].details ? '<br>' + c.searches[c.lastSearch.kind].details.map(esc).join(' · ') : '') + '</p>' : '') +
        (c.notes ? '<p class="db-notes">' + esc(c.notes) + '</p>' : '') +
        '<div class="db-actions"><a class="db-btn db-primary" href="' + findLink(c) + '">' + (c.lastSearch ? 'Search again' : 'Find best option') + '</a>' +
        (mob ? '<a class="db-btn" href="https://wa.me/91' + mob + '" target="_blank" rel="noopener">WhatsApp</a><a class="db-btn" href="tel:+91' + mob + '">Call</a>' : '') +
        '<button type="button" class="db-btn" data-edit="' + c.id + '">Edit</button>' +
        '<button type="button" class="db-btn db-danger" data-del="' + c.id + '">Delete</button></div></article>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-edit],[data-del],[data-add],[data-jump]');
    if (!t) return;
    if (t.hasAttribute('data-add')) return openForm(null);
    if (t.hasAttribute('data-edit')) return openForm(App.getClient(t.getAttribute('data-edit')));
    if (t.hasAttribute('data-jump')) {
      var card = $('c-' + t.getAttribute('data-jump'));
      if (!card) { q.value = ''; fStatus.value = 'all'; fProduct.value = 'all'; renderList(); card = $('c-' + t.getAttribute('data-jump')); }
      if (card) { e.preventDefault(); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('is-flash'); setTimeout(function () { card.classList.remove('is-flash'); }, 1600); }
      return;
    }
    var c = App.getClient(t.getAttribute('data-del'));
    if (c && confirm('Delete ' + c.name + ' and all their saved searches? This cannot be undone.')) { App.deleteClient(c.id); render(); }
  });
  document.addEventListener('change', function (e) {
    var id = e.target.getAttribute && e.target.getAttribute('data-status');
    if (!id) return;
    var c = App.getClient(id);
    c.status = e.target.value;
    if (c.status === 'disbursed' && !c.disbursedAt) c.disbursedAt = new Date().toISOString();
    App.saveClient(c);
    render();
  });

  /* ---------- add / edit client ---------- */
  var dlg = $('db-dialog'), form = $('db-form'), editing = null;
  $('db-add').addEventListener('click', function () { openForm(null); });
  form.querySelector('[name="product"]').innerHTML = '<option value="">Select product</option>' +
    Object.keys(App.PRODUCTS).map(function (k) { return '<option value="' + k + '">' + App.PRODUCTS[k].label + '</option>'; }).join('');
  form.querySelector('[name="status"]').innerHTML = App.STATUSES.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('');
  var amt = form.querySelector('[name="amount"]'), inc = form.querySelector('[name="income"]');
  [amt, inc].forEach(function (el) {
    el.addEventListener('input', function () { var d = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10); el.value = d ? inr(+d) : ''; });
  });

  function openForm(c) {
    editing = c;
    form.reset();
    form.querySelectorAll('.is-on').forEach(function (e) { e.classList.remove('is-on'); });
    form.querySelectorAll('.is-bad').forEach(function (e) { e.classList.remove('is-bad'); });
    $('db-dlg-title').textContent = c ? 'Edit ' + c.name : 'Add client';
    if (c) {
      ['name', 'mobile', 'email', 'city', 'product', 'employment', 'cibil', 'status', 'followUp', 'source', 'notes'].forEach(function (k) {
        var el = form.querySelector('[name="' + k + '"]'); if (el) el.value = c[k] || '';
      });
      amt.value = c.amount ? inr(c.amount) : '';
      inc.value = c.income ? inr(c.income) : '';
      form.querySelector('[name="consent"]').checked = true;
    } else {
      form.querySelector('[name="status"]').value = 'new';
      form.querySelector('[name="followUp"]').value = addDays(1);
    }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    form.querySelector('[name="name"]').focus();
  }
  function closeForm() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('db-cancel').addEventListener('click', closeForm);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    function val(k) { return form.querySelector('[name="' + k + '"]').value.trim(); }
    var mobile = val('mobile').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    var checks = {
      name: val('name').length < 2,
      mobile: !/^[6-9]\d{9}$/.test(mobile),
      email: val('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')),
      product: !val('product'),
      consent: !form.querySelector('[name="consent"]').checked
    };
    var first = null;
    Object.keys(checks).forEach(function (k) {
      var el = form.querySelector('[name="' + k + '"]');
      form.querySelector('.hl-err[data-for="' + k + '"]').classList.toggle('is-on', !!checks[k]);
      if (el.classList.contains('rv-input')) el.classList.toggle('is-bad', !!checks[k]);
      if (checks[k] && !first) first = el;
    });
    if (first) { first.focus(); return; }
    var c = editing ? App.getClient(editing.id) : { searches: {} };
    Object.assign(c, {
      name: val('name'), mobile: mobile, email: val('email'), city: val('city'), product: val('product'),
      amount: +amt.value.replace(/\D/g, '') || 0, income: +inc.value.replace(/\D/g, '') || 0,
      employment: val('employment'), cibil: val('cibil'), status: val('status'), followUp: val('followUp'),
      source: val('source'), notes: val('notes')
    });
    if (c.status === 'disbursed' && !c.disbursedAt) c.disbursedAt = new Date().toISOString();
    c = App.saveClient(c);
    closeForm();
    render();
    var card = $('c-' + c.id);
    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('is-flash'); setTimeout(function () { card.classList.remove('is-flash'); }, 1600); }
  });

  /* ---------- payout settings ---------- */
  function renderPayout() {
    $('db-payout').innerHTML = Object.keys(App.PRODUCTS).map(function (k) {
      return '<label class="db-pct"><span>' + App.PRODUCTS[k].label + '</span><span class="db-pct-in"><input type="number" min="0" max="10" step="0.05" data-pct="' + k + '" value="' + payoutPct(k) + '">%</span></label>';
    }).join('');
  }
  $('db-payout').addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-pct');
    if (!k) return;
    me.payout = me.payout || {};
    me.payout[k] = Math.max(0, Math.min(10, parseFloat(e.target.value) || 0));
    App.saveUser(me);
    renderStats();
    renderList();
  });

  /* ---------- export / backup / restore ---------- */
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $('db-csv').addEventListener('click', function () {
    var cols = ['name', 'mobile', 'email', 'city', 'product', 'amount', 'income', 'employment', 'cibil', 'status', 'followUp', 'source', 'notes', 'lastSearch', 'updatedAt'];
    var rows = [cols.join(',')].concat(App.clients().map(function (c) {
      return cols.map(function (k) {
        var v = k === 'product' ? productLabel(c.product) : k === 'status' ? STATUS[c.status] : k === 'lastSearch' ? (c.lastSearch ? c.lastSearch.headline : '') : c[k];
        v = String(v == null ? '' : v);
        if (/^[=+\-@]/.test(v)) v = "'" + v; // keep spreadsheets from running it as a formula
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(',');
    }));
    download('raven-clients-' + today() + '.csv', '﻿' + rows.join('\n'), 'text/csv');
  });
  $('db-backup').addEventListener('click', function () {
    download('raven-backup-' + today() + '.json', JSON.stringify({ app: 'raven', version: 1, clients: App.clients(), payout: me.payout || {} }, null, 2), 'application/json');
  });
  $('db-restore').addEventListener('change', function () {
    var file = this.files[0], input = this;
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        if (!data || data.app !== 'raven' || !Array.isArray(data.clients)) throw new Error('bad');
        var list = App.clients(), byId = {};
        list.forEach(function (c) { byId[c.id] = c; });
        var added = 0;
        data.clients.forEach(function (c) {
          if (!c || !c.id || typeof c.name !== 'string') return;
          if (!byId[c.id]) added++;
          byId[c.id] = c;
        });
        App.saveClients(Object.keys(byId).map(function (k) { return byId[k]; }));
        if (data.payout && typeof data.payout === 'object') { me.payout = data.payout; App.saveUser(me); }
        alert('Backup restored: ' + added + ' new client' + (added === 1 ? '' : 's') + ' added, existing ones updated.');
        render();
      } catch (err) { alert('That file is not a RAVEN backup.'); }
      input.value = '';
    };
    r.readAsText(file);
  });

  render();
  if (location.hash.indexOf('#c-') === 0) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(function () { target.scrollIntoView({ block: 'center' }); target.classList.add('is-flash'); }, 200);
  }
})();
