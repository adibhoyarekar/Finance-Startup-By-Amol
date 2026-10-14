/* Bank console (auction-bank.html): create and approve auctions, verify EMD, run the live
   auction, confirm the sale, verify payments, issue the sale certificate, answer questions,
   manage inspections, reports, team and bank profile. Maker / Checker / Authorised Officer
   roles decide which buttons work (checker approves what the maker prepares). */
(function () {
  var App = window.RavenApp, UI = window.RavenUI, S = window.RavenAuctions, U = window.AUI, P = window.AP;
  if (!S || !P) return;
  var esc = App.esc, ic = UI.icon, $ = P.$, inr = U.inr, short = U.short, fld = U.fld, opts = U.opts, num = U.num, bad = U.bad;
  var MIN = S.MIN, HOUR = S.HOUR, DAY = S.DAY;
  var ROLE = { maker: 'Maker', checker: 'Checker', ao: 'Authorised Officer' };
  var CAN = { create: ['maker', 'ao'], approve: ['checker', 'ao'], emd: ['checker', 'ao'], pay: ['checker', 'ao'], control: ['ao'], post: ['ao'], admin: ['ao'], service: ['maker', 'checker', 'ao'] };
  var NEED = { create: 'Maker', approve: 'Checker', emd: 'Checker', pay: 'Checker', control: 'Authorised Officer', post: 'Authorised Officer', admin: 'Authorised Officer' };
  var SOLD = ['h1', 'confirmed', 'paid25', 'paid75', 'certificate'], POST = SOLD.concat(['unsold', 'forfeited']);
  var st = { bank: 'bom', role: 'ao', view: 'overview', arg: '', chip: 'all', bidChip: 'pending', postChip: 'action' };
  try { var saved = JSON.parse(localStorage.getItem('raven_bank_demo') || '{}'); if (saved.bank) st.bank = saved.bank; if (saved.role) st.role = saved.role; } catch (e) {}
  function remember() { try { localStorage.setItem('raven_bank_demo', JSON.stringify({ bank: st.bank, role: st.role })); } catch (e) {} }

  function bank() { return S.bank(st.bank) || S.db().banks[0]; }
  function can(k) { return CAN[k].indexOf(st.role) !== -1; }
  function actor() { return ROLE[st.role] + ' · ' + bank().name; }
  function mine() { return S.all().filter(function (a) { return a.bankId === st.bank; }); }
  function partsMine() { var ids = {}; mine().forEach(function (a) { ids[a.id] = a; }); return S.db().parts.filter(function (p) { return ids[p.auctionId]; }); }
  function btn(label, attrs, need, cls) {
    if (need && !can(need)) return '<button type="button" class="ap-btn is-sm ' + (cls || '') + '" disabled data-tip="Needs the ' + NEED[need] + ' role" style="opacity:.5;cursor:not-allowed">' + label + '</button>';
    return '<button type="button" class="ap-btn is-sm ' + (cls || '') + '" ' + attrs + '>' + label + '</button>';
  }
  function partName(p) { return p ? p.name + (p.bot ? '' : '') : '–'; }
  function winner(a) { return S.db().parts.find(function (p) { return p.id === a.highPart; }) || null; }
  function pubLink(a, label) { return '<a class="ap-btn is-sm" href="auction.html?id=' + encodeURIComponent(a.id) + '&preview=1" target="_blank" rel="noopener">' + (label || 'View') + '</a>'; }
  function chips(name, list, cur) { return '<div class="ap-chips" role="group">' + list.map(function (c) { return '<button type="button" class="ap-chip' + (c[0] === cur ? ' is-on' : '') + '" data-chip="' + name + ':' + c[0] + '">' + c[1] + (c[2] != null ? ' <b>' + c[2] + '</b>' : '') + '</button>'; }).join('') + '</div>'; }

  /* ---------- tasks that need someone at the bank ---------- */
  function tasks() {
    var list = [], A = mine(), parts = partsMine();
    A.filter(function (a) { return a.status === 'pending'; }).forEach(function (a) { list.push({ t: 'Approve auction ' + a.ref, s: a.title, href: '#approvals', ic: 'listcheck' }); });
    var pend = parts.filter(function (p) { return p.status === 'pending'; });
    if (pend.length) list.push({ t: pend.length + ' EMD payment' + (pend.length > 1 ? 's' : '') + ' to verify', s: 'Bidders are waiting to be approved', href: '#bidders', ic: 'wallet' });
    A.forEach(function (a) {
      var ph = S.phase(a), w = winner(a);
      if (ph === 'h1') list.push({ t: 'Confirm the sale – ' + a.ref, s: 'H1 at ' + inr(a.currentHigh), href: '#post', ic: 'check' });
      if (ph === 'confirmed' && w && w.payments && w.payments.p25 && w.payments.p25.status !== 'verified') list.push({ t: 'Verify 25% payment – ' + a.ref, s: 'UTR ' + w.payments.p25.utr, href: '#post', ic: 'rupee' });
      if (ph === 'paid25' && w && w.payments && w.payments.p75 && w.payments.p75.status !== 'verified') list.push({ t: 'Verify 75% payment – ' + a.ref, s: 'UTR ' + w.payments.p75.utr, href: '#post', ic: 'rupee' });
      if (ph === 'paid75') list.push({ t: 'Issue sale certificate – ' + a.ref, s: a.title, href: '#post', ic: 'file' });
      if (w && w.extension && w.extension.status === 'requested') list.push({ t: 'Extension request – ' + a.ref, s: w.extension.reason, href: '#post', ic: 'clock' });
      (a.queries || []).filter(function (q) { return !q.a; }).forEach(function (q) { list.push({ t: 'Answer a question – ' + a.ref, s: q.q, href: '#queries', ic: 'chat' }); });
      (a.inspections || []).filter(function (i) { return i.status === 'requested'; }).forEach(function (i) { list.push({ t: 'Inspection request – ' + a.ref, s: i.name + ' · ' + i.slot, href: '#inspections', ic: 'calendar' }); });
    });
    return list;
  }

  /* ---------- overview ---------- */
  function overview() {
    var A = mine(), live = A.filter(function (a) { return S.isLiveish(a); }), up = A.filter(function (a) { var p = S.phase(a); return p === 'registration' || p === 'upcoming'; });
    var sold = A.filter(function (a) { return SOLD.indexOf(S.phase(a)) !== -1; }), realised = sold.reduce(function (s, a) { return s + a.currentHigh; }, 0);
    var dues = sold.reduce(function (s, a) { return s + (a.outstanding || 0); }, 0), T = tasks();
    var by = {}; A.forEach(function (a) { var p = S.phase(a); by[p] = (by[p] || 0) + 1; });
    var order = ['draft', 'pending', 'registration', 'upcoming', 'live', 'paused', 'h1', 'confirmed', 'paid25', 'paid75', 'certificate', 'unsold', 'forfeited', 'cancelled'];
    var refs = {}; A.forEach(function (a) { refs[a.ref] = 1; });
    var log = S.auditLog().filter(function (l) { return Object.keys(refs).some(function (r) { return String(l.detail).indexOf(r) !== -1; }); }).slice(0, 8);
    $('v-overview').innerHTML = P.head(esc(bank().name), 'Auction desk · signed in as ' + ROLE[st.role] + ' (demo)', btn(ic('plus', 16) + 'Create auction', 'data-go="#create"', 'create', 'is-primary')) +
      '<div class="ap-grid ap-stagger">' + P.kpis([
        ['Live now', live.length, live.length ? live.reduce(function (s, a) { return s + a.bidCount; }, 0) + ' bids so far' : 'no live auctions', 'trend'],
        ['Upcoming', up.length, up.length ? 'next on ' + U.dt(Math.min.apply(null, up.map(function (a) { return a.startAt; }))) : 'none scheduled', 'calendar'],
        ['Needs action', T.length, T.length ? 'tasks waiting' : 'all clear', 'bell', T.length ? 'is-warn' : ''],
        ['Realised', short(realised), dues ? Math.round(realised / dues * 100) + '% of dues recovered' : 'from sold auctions', 'rupee']]) +
      '<div class="ap-grid ap-g2e">' +
      P.card('Needs your action', 'Across all your auctions', T.length ? '<div class="ap-list">' + T.slice(0, 8).map(function (t) {
        return '<a class="ap-li is-click" href="' + t.href + '" style="text-decoration:none;color:inherit"><span style="color:var(--ap-ind)">' + ic(t.ic, 18) + '</span><div class="tx"><strong>' + esc(t.t) + '</strong><small>' + esc(t.s || '') + '</small></div>' + ic('arrow', 16) + '</a>';
      }).join('') + '</div>' : '<p class="ap-muted">Nothing waiting. Nice.</p>') +
      P.card('Auctions by status', A.length + ' in total', A.length ? P.bars(order.filter(function (k) { return by[k]; }).map(function (k) { return [S.PHASE[k], by[k]]; })) : '<p class="ap-muted">No auctions yet.</p>') +
      '</div>' +
      P.card('Recent activity', 'From the tamper-proof audit log', log.length ? '<div class="ap-list">' + log.map(function (l) {
        return '<div class="ap-li"><div class="tx"><strong>' + esc(l.action.replace('.', ' · ')) + '</strong><small>' + esc(l.detail) + '</small></div><span class="ap-mini">' + esc(l.actor) + ' · ' + P.ago(l.at) + '</span></div>';
      }).join('') + '</div>' : '<p class="ap-muted">No activity yet.</p>') + '</div>';
  }

  /* ---------- all auctions ---------- */
  function auctions() {
    var A = mine().sort(function (x, y) { return y.startAt - x.startAt; });
    var G = { all: function () { return true; }, prep: function (a) { return a.status === 'draft' || a.status === 'pending'; }, sched: function (a) { var p = S.phase(a); return p === 'registration' || p === 'upcoming'; }, live: S.isLiveish, closed: function (a) { return POST.indexOf(S.phase(a)) !== -1 || a.status === 'cancelled'; } };
    var rows = A.filter(G[st.chip] || G.all);
    $('v-auctions').innerHTML = P.head('All auctions', A.length + ' auctions for ' + esc(bank().name), btn(ic('plus', 16) + 'Create auction', 'data-go="#create"', 'create', 'is-primary')) +
      chips('chip', [['all', 'All', A.length], ['prep', 'Draft & approval', A.filter(G.prep).length], ['sched', 'Scheduled', A.filter(G.sched).length], ['live', 'Live', A.filter(G.live).length], ['closed', 'Closed', A.filter(G.closed).length]], st.chip) +
      P.table([['Auction'], ['Status'], ['Reserve', 'num'], ['Highest bid', 'num'], ['Bidders', 'num'], ['Starts']], rows.map(function (a) {
        var ph = S.phase(a), n = S.partsOf(a.id).filter(function (p) { return p.status === 'approved'; }).length, acts = pubLink(a);
        if (a.status === 'draft' || a.status === 'pending') acts += btn('Edit', 'data-go="#create/' + a.id + '"', 'create');
        if (S.isLiveish(a)) acts += '<a class="ap-btn is-sm is-primary" href="#live/' + a.id + '">Monitor</a>';
        if (POST.indexOf(ph) !== -1) acts += '<a class="ap-btn is-sm" href="#post">Result</a>';
        if (ph === 'registration' || ph === 'upcoming' || a.status === 'draft' || a.status === 'pending') acts += btn('Cancel', 'data-cancel="' + a.id + '"', 'control', 'is-danger');
        return { cells: [P.nm(esc(a.title), esc(a.ref) + ' · ' + esc(a.city)), P.phasePill(a), short(a.reserve), a.bidCount ? inr(a.currentHigh) : '–', n, U.dt(a.startAt, true)], acts: acts };
      }), P.empty('board', 'No auctions here', 'Try another filter or create a new auction.'));
  }

  /* ---------- create / edit (form C, 9 sections) ---------- */
  var STEPS = ['Basics', 'Location', 'Asset', 'Case & legal', 'Pricing', 'Schedule', 'Bid rules', 'Documents', 'Terms & submit'];
  var DOCS = ['Sale notice (English)', 'Sale notice (regional language)', 'Valuation report', 'Title search report', 'Possession notice 13(4)', 'Photos', 'Bid form & terms', 'Encumbrance certificate'];
  var STATES = ['Maharashtra', 'Gujarat', 'Karnataka', 'Madhya Pradesh', 'Telangana', 'Goa', 'Delhi', 'Rajasthan', 'Tamil Nadu', 'Uttar Pradesh', 'Other'];
  function toLocal(t) { if (!t) return ''; var d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
  function fromLocal(s) { return s ? new Date(s).getTime() : 0; }
  function dateOnly(t) { return toLocal(t).slice(0, 10); }
  var wiz = { step: 0, a: null };
  function create(id) {
    var src = id && S.get(id);
    if (id && (!src || src.bankId !== st.bank)) { location.hash = '#create'; return; }
    var t = Date.now(), b = bank();
    var a = src ? JSON.parse(JSON.stringify(src)) : {
      ref: (b.id || 'BNK').toUpperCase().slice(0, 4) + '/' + new Date().getFullYear() + '/' + String(100 + mine().length + 1), kind: 'sarfaesi', assetType: 'residential', visibility: 'public', status: 'draft', possession: 'physical',
      title: '', branch: '', address: '', city: '', district: '', state: 'Maharashtra', pin: '', specs: [['Carpet area', ''], ['Floor', '']], borrower: '', outstanding: 0, demandNotice: '', possessionNotice: '', legal: '',
      reserve: 0, valuation: 0, emd: 0, increment: 0, publishAt: t, startAt: t + 31 * DAY, endAt: t + 31 * DAY + 2 * HOUR, emdDeadline: t + 31 * DAY - 2 * HOUR,
      inspection: [{ date: dateOnly(t + 24 * DAY), slots: ['11:00–13:00', '15:00–17:00'] }, { date: dateOnly(t + 27 * DAY), slots: ['11:00–13:00'] }],
      extWindow: 5, extMin: 5, maxExt: 20, docs: DOCS.slice(0, 4).concat(['Bid form & terms']), terms: 'Sold on "as is where is, as is what is and whatever there is" basis under the SARFAESI Act, 2002 and the Security Interest (Enforcement) Rules, 2002. Bidders must inspect the property and verify title, dues and encumbrances before bidding.',
      contact: { name: '', phone: '' }
    };
    a.bankId = st.bank;
    wiz = { step: 0, a: a, done: {}, emdTouched: !!a.emd };
    renderWizard();
  }
  function renderWizard() {
    var a = wiz.a, editing = !!a.id;
    if (!can('create')) {
      $('v-create').innerHTML = P.head(editing ? 'Edit auction' : 'Create auction', 'Prepare a sale notice and send it for approval.') + P.empty('lock', 'Makers create auctions', 'Switch your role to Maker or Authorised Officer at the top to create or edit an auction. Checkers approve them.');
      return;
    }
    var s = wiz.step;
    var html = P.head(editing ? 'Edit ' + esc(a.ref) : 'Create auction', editing ? (a.returnNote ? '<span class="ap-late">Returned by checker: ' + esc(a.returnNote) + '</span>' : 'Changes go back for approval.') : 'Fill the sale notice in 9 short steps. A checker approves it before it goes live.',
      '<button type="button" class="ap-btn" data-wz="quick" data-tip="Fill a ready-made example that starts in 10 minutes">' + ic('sparkle', 16) + 'Demo: quick fill</button>') +
      '<div class="ap-wizard" role="tablist">' + STEPS.map(function (n, i) { return '<button type="button" role="tab" data-wstep="' + i + '" class="' + (i === s ? 'is-on' : wiz.done[i] ? 'is-done' : '') + '"><b>' + (wiz.done[i] && i !== s ? '✓' : i + 1) + '</b>' + n + '</button>'; }).join('') + '</div>' +
      '<form class="ap-card pad" id="wz" novalidate><div class="af-steps">' + STEPS.map(function (n, i) { return '<span class="' + (i <= s ? 'is-on' : '') + '"></span>'; }).join('') + '</div>' + pane(s, a) +
      '<div style="display:flex;gap:.5rem;justify-content:space-between;flex-wrap:wrap;margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--ap-line2)">' +
      '<div style="display:flex;gap:.5rem">' + (s ? '<button type="button" class="ap-btn" data-wz="back">' + ic('back', 16) + 'Back</button>' : '') + '<button type="button" class="ap-btn" data-wz="draft">Save draft</button></div>' +
      (s < STEPS.length - 1 ? '<button type="button" class="ap-btn is-primary" data-wz="next">Next: ' + STEPS[s + 1] + ic('arrow', 16) + '</button>' : '<button type="button" class="ap-btn is-primary" data-wz="submit">' + ic('check', 16) + 'Send for approval</button>') +
      '</div></form>';
    $('v-create').innerHTML = html;
    var f = $('wz'); U.wireMoney(f);
    if (s === 4) f.reserve.addEventListener('input', function () { if (!wiz.emdTouched) { var r = num(f.reserve.value); f.emd.value = r ? App.inr(Math.round(r / 10)) : ''; } });
    if (s === 4) f.emd.addEventListener('input', function () { wiz.emdTouched = true; });
  }
  function pane(s, a) {
    var M = U.money;
    if (s === 0) return '<div class="ap-fgrid3">' +
      fld('Auction reference no.', '<input class="ap-input" name="ref" value="' + esc(a.ref) + '">', 'Enter the reference number.') +
      fld('Type of sale', '<select class="ap-input" name="kind">' + opts(Object.keys(S.KIND).map(function (k) { return [k, S.KIND[k]]; }), a.kind) + '</select>') +
      fld('Asset type', '<select class="ap-input" name="assetType">' + opts(Object.keys(S.ASSET).map(function (k) { return [k, S.ASSET[k].label]; }), a.assetType) + '</select>') +
      fld('Title shown to bidders', '<input class="ap-input" name="title" maxlength="80" value="' + esc(a.title) + '" placeholder="e.g. 2 BHK flat, 3rd floor, Kothrud">', 'Enter a short title (at least 8 characters).', true) +
      fld('Branch handling the sale', '<input class="ap-input" name="branch" value="' + esc(a.branch || '') + '" placeholder="e.g. Kothrud branch, Pune">', 'Enter the branch.') +
      fld('Visibility', '<select class="ap-input" name="visibility">' + opts([['public', 'Public – anyone can see'], ['private', 'Private – invited bidders only']], a.visibility) + '</select>') + '</div>';
    if (s === 1) return '<div class="ap-fgrid3">' +
      fld('Full address of the asset', '<textarea class="ap-input" name="address" rows="2" placeholder="Flat / plot no., building, street, area">' + esc(a.address) + '</textarea>', 'Enter the full address.', true) +
      fld('City / town', '<input class="ap-input" name="city" value="' + esc(a.city) + '">', 'Enter the city.') +
      fld('District', '<input class="ap-input" name="district" value="' + esc(a.district || '') + '">', 'Enter the district.') +
      fld('State', '<select class="ap-input" name="state">' + opts(STATES.map(function (x) { return [x, x]; }), a.state) + '</select>') +
      fld('PIN code', '<input class="ap-input" name="pin" inputmode="numeric" maxlength="6" value="' + esc(a.pin || '') + '">', 'Enter a 6-digit PIN code.') + '</div>';
    if (s === 2) return '<p class="ap-label" style="margin-bottom:.6rem">Key details shown on the auction page</p><div id="wz-specs">' + (a.specs || []).map(specRow).join('') + '</div>' +
      '<button type="button" class="ap-btn is-sm" data-wz="addspec">' + ic('plus', 16) + 'Add a detail</button><div class="ap-fgrid3" style="margin-top:1rem">' +
      fld('Possession', '<select class="ap-input" name="possession">' + opts([['physical', 'Physical possession'], ['symbolic', 'Symbolic possession']], a.possession) + '</select>') + '</div>' +
      '<p class="ap-mini" style="margin-top:.6rem">Examples: carpet area, floor, age, facing, parking. For vehicles: fuel, km, owners. For gold: net weight and purity.</p>';
    if (s === 3) return '<div class="ap-fgrid3">' +
      fld('Borrower / guarantor (as in notice)', '<input class="ap-input" name="borrower" value="' + esc(a.borrower || '') + '" placeholder="Names are partly hidden to bidders">', a.kind === 'sarfaesi' ? 'Enter the borrower name.' : '', true) +
      fld('Dues outstanding', M('outstanding', 'Amount', a.outstanding)) +
      fld('Demand notice 13(2) date', '<input class="ap-input" type="date" name="demandNotice" value="' + esc(a.demandNotice || '') + '">', 'Required for SARFAESI sales.') +
      fld('Possession notice 13(4) date', '<input class="ap-input" type="date" name="possessionNotice" value="' + esc(a.possessionNotice || '') + '">', 'Required for SARFAESI sales.') +
      fld('Known encumbrances, dues and legal notes', '<textarea class="ap-input" name="legal" rows="3" placeholder="e.g. Society dues about ₹48,000 payable by buyer. No court stay.">' + esc(a.legal || '') + '</textarea>', '', true) + '</div>';
    if (s === 4) return '<div class="ap-fgrid3">' +
      fld('Reserve price', M('reserve', 'Reserve price', a.reserve), 'Enter the reserve price.') +
      fld('Valuation (by approved valuer)', M('valuation', 'Valuation', a.valuation), 'Reserve price should not be above the valuation.') +
      fld('EMD (max 10% of reserve)', M('emd', 'EMD', a.emd), 'EMD must be between ₹1 and 10% of the reserve price.') +
      fld('Bid increment', M('increment', 'Step', a.increment), 'Enter a step between 0.1% and 5% of the reserve.') +
      '</div><div class="af-box" style="margin-top:1rem">The first bid must be at least the reserve price. Every next bid must be higher by exactly the increment (or a multiple of it).</div>';
    if (s === 5) return '<div class="ap-fgrid3">' +
      fld('Sale notice published on', '<input class="ap-input" type="date" name="publishAt" value="' + dateOnly(a.publishAt) + '">', 'Enter the publication date.') +
      fld('Inspection date 1', '<input class="ap-input" type="date" name="insp0" value="' + esc((a.inspection[0] || {}).date || '') + '">') +
      fld('Inspection date 2', '<input class="ap-input" type="date" name="insp1" value="' + esc((a.inspection[1] || {}).date || '') + '">') +
      fld('Last date & time for EMD', '<input class="ap-input" type="datetime-local" name="emdDeadline" value="' + toLocal(a.emdDeadline) + '">', 'EMD deadline must be before the auction starts.') +
      fld('Auction starts', '<input class="ap-input" type="datetime-local" name="startAt" value="' + toLocal(a.startAt) + '">', 'Start must be in the future.') +
      fld('Auction ends', '<input class="ap-input" type="datetime-local" name="endAt" value="' + toLocal(a.endAt) + '">', 'The auction must run at least 30 minutes.') +
      '</div><div class="af-box" style="margin-top:1rem">' + ic('info', 16) + ' SARFAESI rule 8(6): the auction must be at least <b>30 days</b> after the sale notice is published. Gold auctions need 14 days’ notice to borrowers.</div>' +
      '<label class="ap-check" style="margin-top:.75rem"><input type="checkbox" name="shortNotice"' + (a.shortNotice ? ' checked' : '') + '><span>Demo only: allow a short schedule so the auction can be tested today</span></label><p class="ap-err" data-for="notice">The auction starts less than 30 days after the notice. Change the dates or tick the demo box.</p>';
    if (s === 6) return '<div class="ap-fgrid3">' +
      fld('Extend if a bid comes in the last', '<select class="ap-input" name="extWindow">' + opts([['3', '3 minutes'], ['5', '5 minutes'], ['10', '10 minutes']], String(a.extWindow)) + '</select>') +
      fld('Extend by', '<select class="ap-input" name="extMin">' + opts([['3', '3 minutes'], ['5', '5 minutes'], ['10', '10 minutes']], String(a.extMin)) + '</select>') +
      fld('Maximum extensions', '<select class="ap-input" name="maxExt">' + opts([['10', '10'], ['20', '20'], ['50', '50'], ['999', 'Unlimited']], String(a.maxExt)) + '</select>') +
      '</div><div class="af-box" style="margin-top:1rem">Auto-extension stops last-second sniping: every bid in the final ' + a.extWindow + ' minutes gives everyone another ' + a.extMin + ' minutes. Bidders can also set an automatic (proxy) maximum.</div>';
    if (s === 7) return '<p class="ap-label" style="margin-bottom:.6rem">Documents bidders can download</p><div class="ap-fgrid">' + DOCS.map(function (d, i) {
      return '<label class="ap-check"><input type="checkbox" name="doc' + i + '"' + ((a.docs || []).indexOf(d) !== -1 ? ' checked' : '') + '><span>' + d + '</span></label>';
    }).join('') + '</div><div class="ap-fgrid" style="margin-top:1rem">' + fld('Upload PDFs', '<input class="ap-input" type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png" style="padding-top:.6rem">', '', true) + '</div>' +
      '<p class="ap-err" data-for="docs">Tick at least the sale notice.</p>' + ((a.docs || []).filter(function (d) { return DOCS.indexOf(d) === -1; }).length ? '<p class="ap-mini" style="margin-top:.5rem">Uploaded: ' + esc(a.docs.filter(function (d) { return DOCS.indexOf(d) === -1; }).join(', ')) + '</p>' : '');
    var sum = [['Reference', a.ref], ['Asset', a.title], ['Location', [a.city, a.state].join(', ')], ['Reserve / EMD', short(a.reserve) + ' / ' + short(a.emd)], ['Increment', inr(a.increment)], ['Auction', U.dt(a.startAt, true) + ' → ' + U.dt(a.endAt, true)], ['EMD deadline', U.dt(a.emdDeadline, true)], ['Extension', a.extWindow + ' / ' + a.extMin + ' min, max ' + a.maxExt]];
    return '<div class="ap-fgrid3">' + fld('Terms & conditions', '<textarea class="ap-input" name="terms" rows="5">' + esc(a.terms || '') + '</textarea>', 'Enter the terms.', true) +
      fld('Authorised Officer / contact name', '<input class="ap-input" name="cname" value="' + esc((a.contact || {}).name || '') + '">', 'Enter the contact name.') +
      fld('Contact phone', '<input class="ap-input" name="cphone" value="' + esc((a.contact || {}).phone || '') + '">', 'Enter a phone number.') + '</div>' +
      '<label class="ap-check" style="margin-top:1rem"><input type="checkbox" name="decl"' + (a.decl ? ' checked' : '') + '><span>I confirm the sale notice was published in two newspapers (one in the regional language), served on the borrower, and the reserve price is fixed on the valuer’s report.</span></label><p class="ap-err" data-for="decl">Please confirm.</p>' +
      '<p class="ap-label" style="margin:1.25rem 0 .6rem">Review</p><div class="ap-kv">' + sum.map(function (r) { return '<div><small>' + r[0] + '</small><b>' + esc(r[1] || '–') + '</b></div>'; }).join('') + '</div>';
  }
  function specRow(r, i) { return '<div class="ap-specrow"><input class="ap-input" data-sl value="' + esc(r[0]) + '" placeholder="Detail" aria-label="Detail name"><input class="ap-input" data-sv value="' + esc(r[1]) + '" placeholder="Value" aria-label="Detail value"><button type="button" class="ap-btn is-icon is-ghost" data-wz="rmspec" aria-label="Remove">' + ic('x', 16) + '</button></div>'; }
  // read and check the current step; returns false if something is wrong
  function collect(validate) {
    var f = $('wz'), a = wiz.a, s = wiz.step, v = function (n) { return f[n] ? String(f[n].value || '').trim() : ''; }, e = [];
    function chk(n, isBad) { if (validate) e.push(bad(f, n, isBad)); }
    if (s === 0) {
      ['ref', 'kind', 'assetType', 'title', 'branch', 'visibility'].forEach(function (n) { a[n] = v(n); });
      chk('ref', a.ref.length < 4); chk('title', a.title.length < 8); chk('branch', a.branch.length < 3);
    } else if (s === 1) {
      ['address', 'city', 'district', 'state', 'pin'].forEach(function (n) { a[n] = v(n); });
      chk('address', a.address.length < 8); chk('city', !a.city); chk('district', !a.district); chk('pin', !/^\d{6}$/.test(a.pin));
    } else if (s === 2) {
      a.specs = Array.prototype.map.call(f.querySelectorAll('.ap-specrow'), function (r) { return [r.querySelector('[data-sl]').value.trim(), r.querySelector('[data-sv]').value.trim()]; }).filter(function (r) { return r[0] && r[1]; });
      a.possession = v('possession');
    } else if (s === 3) {
      a.borrower = v('borrower'); a.outstanding = num(v('outstanding')); a.demandNotice = v('demandNotice'); a.possessionNotice = v('possessionNotice'); a.legal = v('legal');
      var sar = a.kind === 'sarfaesi';
      chk('borrower', sar && a.borrower.length < 3); chk('demandNotice', sar && !a.demandNotice); chk('possessionNotice', sar && !a.possessionNotice);
    } else if (s === 4) {
      a.reserve = num(v('reserve')); a.valuation = num(v('valuation')); a.emd = num(v('emd')); a.increment = num(v('increment'));
      chk('reserve', a.reserve < 1000); chk('valuation', a.valuation && a.reserve > a.valuation); chk('emd', !a.emd || a.emd > a.reserve * 0.1); chk('increment', !a.increment || a.increment < a.reserve * 0.001 || a.increment > a.reserve * 0.05);
    } else if (s === 5) {
      a.publishAt = v('publishAt') ? new Date(v('publishAt') + 'T09:00').getTime() : 0; a.emdDeadline = fromLocal(v('emdDeadline')); a.startAt = fromLocal(v('startAt')); a.endAt = fromLocal(v('endAt'));
      a.inspection = [v('insp0'), v('insp1')].filter(Boolean).map(function (d, i) { return { date: d, slots: i ? ['11:00–13:00'] : ['11:00–13:00', '15:00–17:00'] }; });
      a.shortNotice = f.shortNotice.checked;
      chk('publishAt', !a.publishAt); chk('startAt', !a.startAt || a.startAt < Date.now()); chk('endAt', !a.endAt || a.endAt - a.startAt < 30 * MIN); chk('emdDeadline', !a.emdDeadline || a.emdDeadline >= a.startAt);
      var days = a.kind === 'gold' ? 14 : a.kind === 'sarfaesi' ? 30 : 0, shortBad = days && a.startAt - a.publishAt < days * DAY && !a.shortNotice;
      if (validate) { f.querySelector('[data-for="notice"]').classList.toggle('is-on', !!shortBad); e.push(shortBad); }
    } else if (s === 6) {
      a.extWindow = +v('extWindow'); a.extMin = +v('extMin'); a.maxExt = +v('maxExt');
    } else if (s === 7) {
      var extra = (a.docs || []).filter(function (d) { return DOCS.indexOf(d) === -1; });
      a.docs = DOCS.filter(function (d, i) { return f['doc' + i].checked; }).concat(extra).concat(Array.prototype.map.call(f.files.files, function (x) { return x.name; }));
      var noNotice = !f.doc0.checked && !f.doc1.checked;
      if (validate) { f.querySelector('[data-for="docs"]').classList.toggle('is-on', noNotice); e.push(noNotice); }
    } else if (s === 8) {
      a.terms = v('terms'); a.contact = { name: v('cname'), phone: v('cphone') }; a.decl = f.decl.checked;
      chk('terms', a.terms.length < 20); chk('cname', a.contact.name.length < 3); chk('cphone', a.contact.phone.replace(/\D/g, '').length < 8);
      if (validate) { f.querySelector('[data-for="decl"]').classList.toggle('is-on', !a.decl); e.push(!a.decl); }
    }
    if (e.some(Boolean)) { var x = f.querySelector('.is-bad'); if (x) x.focus(); return false; }
    return true;
  }
  function saveWizard(status) {
    var a = wiz.a; a.status = status; a.emd = a.emd || Math.round(a.reserve / 10);
    a.post = a.post || null; a.paused = 0; a.highPart = a.highPart || null; a.demo = false;
    if (status === 'pending') { delete a.returnNote; }
    S.saveAuction(a, actor());
    UI.toast(status === 'pending' ? 'Sent to the checker for approval' : 'Draft saved');
    location.hash = status === 'pending' ? '#approvals' : '#auctions';
  }
  function wizardAction(act, el) {
    var f = $('wz'), a = wiz.a;
    if (act === 'quick') {
      var t = Date.now();
      Object.assign(a, { title: a.title || '1 BHK flat, 4th floor, Wakad', branch: a.branch || 'Wakad branch, Pune', address: a.address || 'Flat 402, Sai Heights, Wakad Road, Wakad, Pune', city: a.city || 'Pune', district: a.district || 'Pune', pin: a.pin || '411057',
        specs: [['Carpet area', '540 sq ft'], ['Floor', '4 of 7'], ['Age', '8 years'], ['Parking', 'Open']], borrower: a.borrower || 'S*** K***', outstanding: a.outstanding || 3600000, demandNotice: a.demandNotice || dateOnly(t - 200 * DAY), possessionNotice: a.possessionNotice || dateOnly(t - 90 * DAY), legal: a.legal || 'Physical possession. No known encumbrance.',
        reserve: a.reserve || 3200000, valuation: a.valuation || 3700000, emd: a.emd || 320000, increment: a.increment || 20000,
        publishAt: t, emdDeadline: t + 6 * MIN, startAt: t + 8 * MIN, endAt: t + 38 * MIN, shortNotice: true, inspection: [{ date: dateOnly(t), slots: ['15:00–17:00'] }],
        contact: { name: (a.contact && a.contact.name) || 'Authorised Officer', phone: (a.contact && a.contact.phone) || '020 2700 1234' }, decl: true });
      STEPS.forEach(function (n, i) { wiz.done[i] = true; }); wiz.step = STEPS.length - 1; renderWizard(); UI.toast('Example filled – starts in 8 minutes after approval'); return;
    }
    if (act === 'addspec') { $('wz-specs').insertAdjacentHTML('beforeend', specRow(['', ''])); $('wz-specs').lastElementChild.querySelector('input').focus(); return; }
    if (act === 'rmspec') { el.closest('.ap-specrow').remove(); return; }
    if (act === 'back') { collect(false); wiz.step--; renderWizard(); return; }
    if (act === 'next') { if (!collect(true)) return; wiz.done[wiz.step] = true; wiz.step++; renderWizard(); window.scrollTo(0, 0); return; }
    if (act === 'draft') { collect(false); if (!a.title) { UI.toast('Add a title first (step 1)'); return; } saveWizard('draft'); return; }
    if (act === 'submit') {
      if (!collect(true)) return;
      // check every step before sending
      for (var i = 0; i < STEPS.length - 1; i++) {
        wiz.step = i; renderWizard();
        if (!collect(true)) { UI.toast('Please fix step ' + (i + 1) + ': ' + STEPS[i]); return; }
      }
      wiz.step = STEPS.length - 1; saveWizard('pending');
    }
  }

  /* ---------- approvals (checker) ---------- */
  function approvals() {
    var pend = mine().filter(function (a) { return a.status === 'pending'; }), recent = S.auditLog().filter(function (l) { return /^auction\.(scheduled|draft)$/.test(l.action) && mine().some(function (a) { return a.ref === l.detail; }); }).slice(0, 6);
    $('v-approvals').innerHTML = P.head('Approvals', 'Four-eyes check: a checker approves what a maker prepares.') +
      (st.role === 'maker' ? '<div class="ad-status is-info" style="margin-bottom:1rem">' + ic('info', 18) + 'You are a Maker. Switch to Checker or Authorised Officer at the top to approve.</div>' : '') +
      (pend.length ? '<div class="ap-grid">' + pend.map(function (a) {
        return '<div class="ap-card pad"><div class="ap-ch"><div><h2>' + esc(a.title) + '</h2><p>' + esc(a.ref) + ' · ' + esc(S.KIND[a.kind]) + ' · ' + esc(a.city) + ' · prepared by ' + esc(a.createdBy || 'maker') + '</p></div>' + P.phasePill(a) + '</div>' +
          '<div class="ap-kv">' + [['Reserve', short(a.reserve)], ['Valuation', a.valuation ? short(a.valuation) : '–'], ['EMD', short(a.emd) + ' (' + Math.round(a.emd / a.reserve * 100) + '%)'], ['Increment', inr(a.increment)], ['Notice → start', Math.round((a.startAt - a.publishAt) / DAY) + ' days' + (a.shortNotice ? ' (demo short notice)' : '')], ['Auction', U.dt(a.startAt, true)], ['Documents', (a.docs || []).length], ['Extension', a.extWindow + '/' + a.extMin + ' min']].map(function (r) { return '<div><small>' + r[0] + '</small><b>' + esc(String(r[1])) + '</b></div>'; }).join('') + '</div>' +
          '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">' + btn(ic('check', 16) + 'Approve & publish', 'data-approve="' + a.id + '"', 'approve', 'is-primary') + btn('Return to maker', 'data-return="' + a.id + '"', 'approve') + pubLink(a, 'Preview') + '</div></div>';
      }).join('') + '</div>' : P.empty('listcheck', 'Nothing to approve', 'Auctions sent for approval by a maker show up here.')) +
      (recent.length ? '<div style="margin-top:1rem">' + P.card('Recent decisions', '', '<div class="ap-list">' + recent.map(function (l) { return '<div class="ap-li"><div class="tx"><strong>' + esc(l.detail) + ' – ' + (l.action === 'auction.scheduled' ? 'approved' : 'returned') + '</strong><small>' + esc(l.actor) + ' · ' + P.ago(l.at) + '</small></div></div>'; }).join('') + '</div>') + '</div>' : '');
  }

  /* ---------- bidders & EMD ---------- */
  function bidders() {
    var parts = partsMine(), utr = {};
    parts.forEach(function (p) { if (p.emd && p.emd.utr) utr[p.emd.utr] = (utr[p.emd.utr] || 0) + 1; });
    var F = { pending: function (p) { return p.status === 'pending'; }, approved: function (p) { return p.status === 'approved'; }, rejected: function (p) { return p.status === 'rejected'; }, all: function () { return true; } };
    var rows = parts.filter(F[st.bidChip]).sort(function (x, y) { return (y.createdAt || 0) - (x.createdAt || 0); });
    $('v-bidders').innerHTML = P.head('Bidders & EMD', 'Check each EMD credit in your account before approving. Bidders see only aliases – you see real identities.') +
      chips('bidChip', [['pending', 'To verify', parts.filter(F.pending).length], ['approved', 'Approved', parts.filter(F.approved).length], ['rejected', 'Rejected', parts.filter(F.rejected).length], ['all', 'All', parts.length]], st.bidChip) +
      P.table([['Bidder'], ['Auction'], ['EMD', 'num'], ['Payment'], ['KYC'], ['Status']], rows.map(function (p) {
        var a = S.get(p.auctionId), prof = S.profile(p.userId), flags = [];
        if (p.emd && p.emd.amount < a.emd) flags.push('Short by ' + inr(a.emd - p.emd.amount));
        if (p.emd && utr[p.emd.utr] > 1) flags.push('UTR used twice');
        var kyc = p.bot ? P.pill('Demo', 'mute') : prof ? P.pill(prof.kyc === 'verified' ? 'Verified' : 'Review', prof.kyc === 'verified' ? 'ok' : 'warn') : P.pill('Missing', 'bad');
        var stp = p.status === 'approved' ? P.pill('Approved', 'ok') : p.status === 'rejected' ? P.pill('Rejected', 'bad') : P.pill('To verify', 'warn');
        return { cells: [P.nm(esc(p.name), 'Alias #' + esc(p.alias) + (prof && prof.pan ? ' · PAN ' + esc(prof.pan.slice(0, 2) + 'XXXXX' + prof.pan.slice(-3)) : '') + (p.joint ? ' · joint: ' + esc(p.joint) : ''), p.name), esc(a.ref), p.emd ? inr(p.emd.amount) : '–',
          p.emd ? esc(p.emd.method + ' · ' + p.emd.utr) + (flags.length ? '<br><span class="ap-late" style="font-size:.75rem">' + esc(flags.join(' · ')) + '</span>' : '') + (p.emd.proof ? '<br><span class="ap-mini">' + esc(p.emd.proof) + '</span>' : '') : '–', kyc, stp + (p.reason ? '<br><span class="ap-mini">' + esc(p.reason) + '</span>' : '')],
          acts: p.status === 'pending' ? btn('Approve', 'data-papprove="' + p.id + '"', 'emd', 'is-primary') + btn('Reject', 'data-preject="' + p.id + '"', 'emd', 'is-danger') : p.status === 'approved' && ['registration', 'upcoming'].indexOf(S.phase(a)) !== -1 ? btn('Revoke', 'data-preject="' + p.id + '"', 'emd', 'is-danger') : '' };
      }), P.empty('users', st.bidChip === 'pending' ? 'No EMD to verify' : 'No bidders here', 'Bidder applications for your auctions appear here.'));
  }

  /* ---------- live monitor ---------- */
  function verifyChain(a) { return S.verifyChain(a.id); }
  function liveView(id) {
    var list = mine().filter(function (a) { return S.isLiveish(a) || (S.phase(a) === 'upcoming' || S.phase(a) === 'registration') && a.startAt - Date.now() < DAY; });
    var a = id && S.get(id) && S.get(id).bankId === st.bank ? S.get(id) : list.filter(S.isLiveish)[0] || list[0];
    var html = P.head('Live monitor', 'Watch bids as they happen. Only the bank sees real names.');
    if (!a) { $('v-live').innerHTML = html + P.empty('trend', 'No live auctions', 'Auctions that are live or start within 24 hours show here.', '<a class="ap-btn" href="#auctions">All auctions</a>'); return; }
    var ph = S.phase(a), t = Date.now(), parts = S.partsOf(a.id).filter(function (p) { return p.status === 'approved'; }), bids = S.bidsOf(a.id);
    var byPart = {}; parts.forEach(function (p) { byPart[p.id] = p; });
    var best = {}; bids.forEach(function (b) { best[b.partId] = b; });
    html += '<div class="ap-chips">' + list.map(function (x) { return '<a class="ap-chip' + (x.id === a.id ? ' is-on' : '') + '" href="#live/' + x.id + '">' + (S.isLiveish(x) ? '<i class="ac-live-dot"></i>' : '') + esc(x.ref) + '</a>'; }).join('') + '</div>' +
      '<div class="ap-livebox"><div class="ap-card pad ad-price" style="box-shadow:var(--ap-shadow)"><div class="ap-ch" style="margin-bottom:.5rem"><div><h2>' + esc(a.title) + '</h2><p>' + esc(a.ref) + '</p></div>' + P.phasePill(a) + '</div>' +
      '<p class="lbl">' + (a.bidCount ? 'Highest bid (H1)' : 'Reserve price') + '</p><p class="big">' + inr(a.bidCount ? a.currentHigh : a.reserve) + '</p>' +
      '<div class="meta">' + (a.bidCount ? '<span class="up">+' + ((a.currentHigh / a.reserve - 1) * 100).toFixed(1) + '% over reserve</span>' : '') + '<span>' + a.bidCount + ' bids</span><span>' + parts.length + ' bidders</span><span>' + a.extCount + ' extensions</span></div>' +
      '<p class="ap-mini" style="margin-top:.75rem"><span class="ac-timer" data-timer="' + esc(a.id) + '"></span></p>' +
      (a.highPart && byPart[a.highPart] ? '<div class="ad-status is-lead" style="margin-top:.75rem">' + ic('user', 18) + 'H1: ' + esc(byPart[a.highPart].name) + ' (#' + esc(byPart[a.highPart].alias) + ')</div>' : '') +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:1rem">' +
      (ph === 'live' ? btn(ic('clock', 16) + 'Pause', 'data-pause="' + a.id + '"', 'control') : ph === 'paused' ? btn(ic('clock', 16) + 'Resume', 'data-resume="' + a.id + '"', 'control', 'is-primary') : '') +
      (S.isLiveish(a) ? btn('+5 min', 'data-extend="' + a.id + ':5"', 'control') + btn('+15 min', 'data-extend="' + a.id + ':15"', 'control') : '') +
      '<button type="button" class="ap-btn is-sm" data-verify="' + a.id + '">' + ic('shield', 16) + 'Verify bid log</button>' + pubLink(a, 'Bidder view') + '</div>' +
      '<div id="lv-verify"></div></div>' +
      P.card('Bidders', 'Real identities – visible to the bank only', parts.length ? '<div class="ap-list">' + parts.sort(function (x, y) { return ((best[y.id] || {}).amount || 0) - ((best[x.id] || {}).amount || 0); }).map(function (p) {
        var b = best[p.id];
        return '<div class="ap-li">' + UI.avatar(p.name, 'is-sm') + '<div class="tx"><strong>' + esc(p.name) + ' <span class="ap-mini">#' + esc(p.alias) + '</span></strong><small>' + (b ? 'Last bid ' + inr(b.amount) + ' · ' + P.ago(b.at) : 'No bid yet') + (p.proxyMax ? ' · auto-bid on' : '') + '</small></div>' + (a.highPart === p.id ? P.pill('H1', 'ok') : '') + '</div>';
      }).join('') + '</div>' : '<p class="ap-muted">No approved bidders yet.</p>') + '</div>' +
      '<div style="margin-top:1rem">' + P.card('Bid log', 'Each entry is chained to the previous one with a hash, so edits can be detected', bids.length ? P.table([['Time'], ['Bidder'], ['Amount', 'num'], ['Type'], ['Hash']], bids.slice().reverse().slice(0, 60).map(function (b) {
        var p = byPart[b.partId] || {};
        return { cells: [new Date(b.at).toLocaleTimeString('en-IN'), esc(p.name || b.alias) + ' <span class="ap-mini">#' + esc(b.alias) + '</span>', inr(b.amount), (b.proxy ? 'Auto' : 'Manual') + (b.extended ? ' · +' + a.extMin + ' min' : ''), '<code style="font-size:.75rem">' + esc(b.hash) + '</code>'] };
      })) : '<p class="ap-muted">No bids yet.</p>') + '</div>';
    $('v-live').innerHTML = html;
    U.tick($('v-live'));
  }

  /* ---------- post-auction ---------- */
  var FLOW = [['h1', 'H1 declared'], ['confirmed', 'Sale confirmed'], ['paid25', '25% received'], ['paid75', '75% received'], ['certificate', 'Certificate issued']];
  function due(a, k) { return k === 'p25' ? a.endAt + DAY : a.endAt + 15 * DAY + (winner(a) && winner(a).extension && winner(a).extension.status === 'approved' ? 30 * DAY : 0); }
  function post() {
    var A = mine().filter(function (a) { return POST.indexOf(S.phase(a)) !== -1; }).sort(function (x, y) { return y.endAt - x.endAt; });
    function needs(a) { return S.phase(a) !== 'certificate'; }
    var rows = st.postChip === 'action' ? A.filter(needs) : A;
    $('v-post').innerHTML = P.head('Post-auction', 'Confirm the winner, verify payments, issue the sale certificate – or re-auction.') +
      chips('postChip', [['action', 'In progress', A.filter(needs).length], ['all', 'All closed', A.length]], st.postChip) +
      (rows.length ? '<div class="ap-grid">' + rows.map(postCard).join('') + '</div>' : P.empty('check', 'Nothing waiting', 'Closed auctions that need a decision appear here.'));
  }
  function postCard(a) {
    var ph = S.phase(a), w = winner(a), idx = FLOW.findIndex(function (f) { return f[0] === ph; }), pay = (w && w.payments) || {};
    var amt25 = Math.round(a.currentHigh * 0.25) - (w && w.emd ? w.emd.amount : 0), amt75 = a.currentHigh - Math.round(a.currentHigh * 0.25);
    var acts = '';
    if (ph === 'h1') acts += btn(ic('check', 16) + 'Confirm sale to H1', 'data-post="' + a.id + ':confirmed"', 'post', 'is-primary');
    if (ph === 'confirmed') acts += pay.p25 ? btn('Verify 25% (' + short(pay.p25.amount) + ')', 'data-post="' + a.id + ':paid25"', 'pay', 'is-primary') : '<span class="ap-mini">Waiting for 25% – due ' + U.dt(due(a, 'p25')) + '</span>';
    if (ph === 'paid25') acts += pay.p75 ? btn('Verify 75% (' + short(pay.p75.amount) + ')', 'data-post="' + a.id + ':paid75"', 'pay', 'is-primary') : '<span class="ap-mini">Waiting for 75% – due ' + U.dt(due(a, 'p75')) + '</span>';
    if (ph === 'paid75') acts += btn(ic('file', 16) + 'Issue sale certificate', 'data-post="' + a.id + ':certificate"', 'post', 'is-primary');
    if (ph === 'certificate') acts += '<a class="ap-btn is-sm is-primary" href="#cert/' + a.id + '">' + ic('file', 16) + 'View certificate</a>';
    if (w && w.bot && ((ph === 'confirmed' && !pay.p25) || (ph === 'paid25' && !pay.p75))) acts += '<button type="button" class="ap-btn is-sm" data-simpay="' + a.id + '">Demo: simulate winner payment</button>';
    if (ph === 'confirmed' || ph === 'paid25') acts += btn('Forfeit EMD', 'data-post="' + a.id + ':forfeited"', 'post', 'is-danger');
    if (ph === 'unsold' || ph === 'forfeited') acts += btn('Re-auction (reserve −10%)', 'data-reauction="' + a.id + '"', 'create', 'is-primary');
    if (w && w.extension && w.extension.status === 'requested') acts += btn('Allow 30 more days', 'data-ext="' + a.id + ':approved"', 'post') + btn('Decline', 'data-ext="' + a.id + ':declined"', 'post', 'is-danger');
    var losers = S.partsOf(a.id).filter(function (p) { return p.status === 'approved' && p.id !== a.highPart; });
    return '<div class="ap-card pad"><div class="ap-ch"><div><h2>' + esc(a.title) + '</h2><p>' + esc(a.ref) + ' · ended ' + U.dt(a.endAt, true) + '</p></div>' + P.phasePill(a) + '</div>' +
      (w ? '<div class="ap-kv">' + [['Highest bidder', w.name + ' (#' + w.alias + ')'], ['Sale price', inr(a.currentHigh)], ['Over reserve', '+' + ((a.currentHigh / a.reserve - 1) * 100).toFixed(1) + '%'], ['EMD adjusted', w.emd ? inr(w.emd.amount) : '–'],
        ['25% (less EMD)', inr(amt25) + (pay.p25 ? ' · UTR ' + pay.p25.utr : '')], ['Balance 75%', inr(amt75) + (pay.p75 ? ' · UTR ' + pay.p75.utr : '')], ['Refunds to others', losers.length + (losers.some(function (p) { return p.refund; }) ? ' processed' : ' pending')], ['Certificate name', (pay.p25 && pay.p25.certName) || w.name]]
        .map(function (r) { return '<div><small>' + r[0] + '</small><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>' +
        '<ul class="ad-tl" style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:.25rem 1.25rem">' + FLOW.map(function (f, i) { return '<li class="' + (i < idx ? 'is-done' : i === idx ? 'is-now' : '') + '" style="padding-bottom:.25rem"><b>' + f[1] + '</b></li>'; }).join('') + '</ul>' +
        (w.extension ? '<p class="ap-mini" style="margin-top:.5rem">Extension request: “' + esc(w.extension.reason) + '” – ' + esc(w.extension.status) + '</p>' : '')
        : '<p class="ap-muted">' + (ph === 'unsold' ? 'No bids were received at the reserve price.' : 'The winner did not pay in time and the EMD was forfeited.') + '</p>') +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:1rem">' + acts + pubLink(a) + '</div></div>';
  }

  /* ---------- sale certificate ---------- */
  function cert(id) {
    var a = S.get(id), w = a && winner(a), b = a && S.bank(a.bankId);
    $('ap-title').textContent = 'Sale certificate';
    if (!a || !w || S.phase(a) !== 'certificate') { $('v-cert').innerHTML = P.empty('file', 'Certificate not ready', 'The certificate is available after the full payment is verified and the officer issues it.', '<a class="ap-btn" href="#post">Post-auction</a>'); return; }
    var pay = w.payments || {}, name = (pay.p25 && pay.p25.certName) || w.name, prop = S.KIND[a.kind] === 'SARFAESI sale';
    $('v-cert').innerHTML = '<div class="ap-h no-print"><div><h1>Sale certificate</h1><p>' + esc(a.ref) + '</p></div><div class="acts"><a class="ap-btn" href="#post">' + ic('back', 16) + 'Back</a><button type="button" class="ap-btn is-primary" onclick="window.print()">' + ic('download', 16) + 'Print / save as PDF</button></div></div>' +
      '<div class="ap-cert"><p style="text-align:center;font-size:.8rem;letter-spacing:.1em">' + (prop ? 'APPENDIX V [See rule 9(6)]' : 'SALE CONFIRMATION') + '</p><h2 style="text-align:center;font-size:1.5rem;margin:.25rem 0 1.25rem">' + (prop ? 'SALE CERTIFICATE' : 'CERTIFICATE OF SALE') + '</h2>' +
      '<p>' + esc(b.name) + ', ' + esc(a.branch || '') + '</p><p style="margin-top:1rem">Whereas the undersigned, being the Authorised Officer of <b>' + esc(b.name) + '</b>, ' + (prop ? 'under the Securitisation and Reconstruction of Financial Assets and Enforcement of Security Interest Act, 2002, and in exercise of the powers conferred under section 13(12) read with rule 9 of the Security Interest (Enforcement) Rules, 2002, ' : '') +
      'sold on behalf of the bank in favour of <b>' + esc(name) + '</b> the asset described below, in the e-auction held on <b>' + U.dt(a.startAt) + '</b> (reference ' + esc(a.ref) + '), for a total consideration of <b>' + inr(a.currentHigh) + '</b>.</p>' +
      '<p style="margin-top:1rem">The purchaser has paid the entire sale price: 25% (including EMD of ' + inr(w.emd ? w.emd.amount : 0) + ') ' + (pay.p25 ? 'vide UTR ' + esc(pay.p25.utr) : '') + ' and the balance 75% ' + (pay.p75 ? 'vide UTR ' + esc(pay.p75.utr) : '') + '. The sale is confirmed, and the asset is sold free from all encumbrances known to the bank except: ' + esc(a.legal || 'none') + '</p>' +
      '<p style="margin-top:1.25rem;font-weight:bold">Description of the asset</p><p>' + esc(a.title) + ' – ' + esc(a.address) + ', ' + esc(a.district || a.city) + ', ' + esc(a.state) + ' ' + esc(a.pin || '') + '.</p>' +
      '<p>' + (a.specs || []).map(function (s) { return esc(s[0]) + ': ' + esc(s[1]); }).join(' · ') + '</p>' +
      '<div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.5rem"><div><p>Place: ' + esc(a.city) + '</p><p>Date: ' + U.dt(a.certificateAt || Date.now()) + '</p></div><div style="text-align:right"><p style="margin-top:2rem">______________________</p><p>Authorised Officer</p><p>' + esc(b.name) + '</p></div></div>' +
      '<p style="margin-top:1.5rem;font-size:.75rem;color:#6a7282">Bid log hash: ' + esc((S.bidsOf(a.id).slice(-1)[0] || {}).hash || '') + ' · Demo document generated by RAVEN</p></div>';
  }

  /* ---------- questions, inspections ---------- */
  function queries() {
    var list = [];
    mine().forEach(function (a) { (a.queries || []).forEach(function (q) { list.push({ a: a, q: q }); }); });
    list.sort(function (x, y) { return (x.q.a ? 1 : 0) - (y.q.a ? 1 : 0) || y.q.at - x.q.at; });
    $('v-queries').innerHTML = P.head('Questions from bidders', 'Answer once and publish it for every bidder – saves you repeat calls.') +
      (list.length ? '<div class="ap-grid">' + list.map(function (x) {
        var q = x.q;
        return '<div class="ap-card pad"><div class="ap-ch"><div><h2 style="font-weight:500">' + esc(q.q) + '</h2><p>' + esc(x.a.ref) + ' · ' + esc(q.cat || '') + ' · ' + esc(q.name || '') + ' · ' + P.ago(q.at) + '</p></div>' + (q.a ? P.pill(q.public ? 'Published' : 'Answered privately', 'ok') : P.pill('Waiting', 'warn')) + '</div>' +
          (q.a ? '<p class="ad-p"><b>Answer:</b> ' + esc(q.a) + '</p>' : '<form data-answer="' + x.a.id + ':' + q.id + '" novalidate><div class="ap-field"><label>Your answer</label><textarea class="ap-input" name="ans" rows="3"></textarea><p class="ap-err">Please write an answer.</p></div><label class="ap-check" style="margin-top:.6rem"><input type="checkbox" name="pub" checked><span>Publish for all bidders (asker’s name stays hidden)</span></label><button type="submit" class="ap-btn is-primary is-sm" style="margin-top:.75rem">Send answer</button></form>') + '</div>';
      }).join('') + '</div>' : P.empty('chat', 'No questions yet', 'Questions bidders ask on your auction pages show up here.'));
  }
  function inspections() {
    var list = [];
    mine().forEach(function (a) { (a.inspections || []).forEach(function (i) { list.push({ a: a, i: i }); }); });
    list.sort(function (x, y) { return y.i.at - x.i.at; });
    var T = { requested: ['Requested', 'warn'], confirmed: ['Confirmed', 'info'], declined: ['Declined', 'bad'], visited: ['Visited', 'ok'] };
    $('v-inspections').innerHTML = P.head('Site inspections', 'Confirm visit slots. Bidders get an SMS with the officer’s contact.') +
      P.table([['Visitor'], ['Auction'], ['Slot'], ['People'], ['Phone'], ['Status']], list.map(function (x) {
        var i = x.i, s = T[i.status] || T.requested;
        return { cells: [P.nm(esc(i.name || ''), esc(i.names || '')), esc(x.a.ref), esc(i.slot || ''), esc(i.count || '1'), '<a href="tel:' + esc(i.phone) + '">' + esc(i.phone) + '</a>', P.pill(s[0], s[1])],
          acts: i.status === 'requested' ? btn('Confirm', 'data-insp="' + x.a.id + ':' + i.id + ':confirmed"', 'service', 'is-primary') + btn('Decline', 'data-insp="' + x.a.id + ':' + i.id + ':declined"', 'service', 'is-danger') : i.status === 'confirmed' ? btn('Mark visited', 'data-insp="' + x.a.id + ':' + i.id + ':visited"', 'service') : '' };
      }), P.empty('calendar', 'No inspection requests', 'When bidders book a site visit, it shows here.'));
  }

  /* ---------- reports ---------- */
  function reports() {
    var A = mine(), closed = A.filter(function (a) { return POST.indexOf(S.phase(a)) !== -1; }), sold = closed.filter(function (a) { return SOLD.indexOf(S.phase(a)) !== -1; });
    var realised = sold.reduce(function (s, a) { return s + a.currentHigh; }, 0), reserve = sold.reduce(function (s, a) { return s + a.reserve; }, 0);
    var refunds = partsMine().filter(function (p) { return p.refund; });
    $('v-reports').innerHTML = P.head('Reports', 'Results, recovery and exports for audit and RBI returns.') +
      '<div class="ap-grid ap-stagger">' + P.kpis([
        ['Auctions closed', closed.length, sold.length + ' sold · ' + (closed.length - sold.length) + ' unsold/forfeited', 'board'],
        ['Success rate', closed.length ? Math.round(sold.length / closed.length * 100) + '%' : '–', 'sold out of closed', 'trend'],
        ['Realised', short(realised), reserve ? '+' + ((realised / reserve - 1) * 100).toFixed(1) + '% over reserve' : 'no sales yet', 'rupee'],
        ['EMD refunds', refunds.length, short(refunds.reduce(function (s, p) { return s + p.refund.amount; }, 0)) + ' returned', 'wallet']]) +
      '<div class="ap-grid ap-g2e">' +
      P.card('Premium over reserve', 'Sold auctions, % above the reserve price', sold.length ? P.bars(sold.map(function (a) { return [a.ref, Math.round((a.currentHigh / a.reserve - 1) * 1000) / 10]; }), function (v) { return v + '%'; }) : '<p class="ap-muted">No sales yet.</p>') +
      P.card('Bids per auction', 'Live and closed auctions', A.filter(function (a) { return a.bidCount; }).length ? P.bars(A.filter(function (a) { return a.bidCount; }).map(function (a) { return [a.ref, a.bidCount]; })) : '<p class="ap-muted">No bids yet.</p>') +
      '</div>' + P.card('Download', 'CSV files open in Excel', '<div class="ap-actions-list">' +
        '<button type="button" class="ap-btn" data-csv="auctions">' + ic('file', 16) + 'Auction register</button><button type="button" class="ap-btn" data-csv="bids">' + ic('file', 16) + 'Bid log with hashes</button>' +
        '<button type="button" class="ap-btn" data-csv="emd">' + ic('file', 16) + 'EMD & bidders</button><button type="button" class="ap-btn" data-csv="audit">' + ic('file', 16) + 'Audit trail</button></div>') + '</div>';
  }
  function exportCsv(kind) {
    var A = mine(), b = bank().id;
    if (kind === 'auctions') P.csv(b + '-auctions.csv', [['Reference', 'Title', 'City', 'Type', 'Status', 'Reserve', 'EMD', 'Increment', 'Start', 'End', 'Bids', 'Highest bid', 'Outstanding']].concat(A.map(function (a) { return [a.ref, a.title, a.city, S.ASSET[a.assetType].label, S.PHASE[S.phase(a)], a.reserve, a.emd, a.increment, new Date(a.startAt).toISOString(), new Date(a.endAt).toISOString(), a.bidCount, a.currentHigh, a.outstanding]; })));
    if (kind === 'bids') { var rows = [['Auction', 'Time', 'Alias', 'Bidder', 'Amount', 'Auto', 'Extended', 'Prev hash', 'Hash']]; A.forEach(function (a) { S.bidsOf(a.id).forEach(function (x) { var p = S.db().parts.find(function (q) { return q.id === x.partId; }) || {}; rows.push([a.ref, new Date(x.at).toISOString(), x.alias, p.name, x.amount, x.proxy ? 'yes' : '', x.extended ? 'yes' : '', x.prev, x.hash]); }); }); P.csv(b + '-bid-log.csv', rows); }
    if (kind === 'emd') P.csv(b + '-emd.csv', [['Auction', 'Bidder', 'Alias', 'Status', 'EMD', 'Method', 'UTR', 'Refund']].concat(partsMine().map(function (p) { return [(S.get(p.auctionId) || {}).ref, p.name, p.alias, p.status, p.emd && p.emd.amount, p.emd && p.emd.method, p.emd && p.emd.utr, p.refund ? p.refund.amount : '']; })));
    if (kind === 'audit') { var refs = A.map(function (a) { return a.ref; }); P.csv(b + '-audit.csv', [['Time', 'Action', 'Detail', 'By']].concat(S.auditLog().filter(function (l) { return refs.some(function (r) { return String(l.detail).indexOf(r) !== -1; }); }).map(function (l) { return [new Date(l.at).toISOString(), l.action, l.detail, l.actor]; }))); }
  }

  /* ---------- team (form B) and bank profile (form A) ---------- */
  function team() {
    var b = bank(), users = b.users || [];
    $('v-team').innerHTML = P.head('Team & roles', 'Who can do what. Every action is logged with the person’s name.') +
      '<div class="ap-grid ap-g2e ap-stagger">' + P.card('Team members', users.length + ' added', '<div class="af-box" style="margin-bottom:1rem"><b>Maker</b> prepares auctions and answers questions · <b>Checker</b> approves auctions and verifies payments · <b>Authorised Officer</b> runs the auction, confirms the sale and signs the certificate · <b>Viewer</b> sees reports only.</div>' +
        (users.length ? '<div class="ap-list">' + users.map(function (u) { return '<div class="ap-li">' + UI.avatar(u.name, 'is-sm') + '<div class="tx"><strong>' + esc(u.name) + '</strong><small>' + esc([u.empId, u.branch, u.email].filter(Boolean).join(' · ')) + '</small></div>' + P.pill(u.roleLabel || u.role, u.role === 'ao' ? 'ind' : 'info') + '</div>'; }).join('') + '</div>' : '<p class="ap-muted">No one added yet.</p>')) +
      '<form class="ap-card pad" id="tm" novalidate><div class="ap-ch"><div><h2>Add a team member</h2><p>They get a login link by email. 2-step login is required.</p></div></div><div class="ap-fgrid">' +
      fld('Full name', '<input class="ap-input" name="name">', 'Enter the name.') + fld('Employee ID', '<input class="ap-input" name="empId">', 'Enter the employee ID.') +
      fld('Official email', '<input class="ap-input" type="email" name="email" placeholder="name@bank.co.in">', 'Enter a valid email.') + fld('Mobile', '<input class="ap-input" name="mobile" inputmode="tel">', 'Enter a valid 10-digit mobile.') +
      fld('Role', '<select class="ap-input" name="role">' + opts([['maker', 'Maker'], ['checker', 'Checker'], ['ao', 'Authorised Officer'], ['viewer', 'Viewer']], 'maker') + '</select>') + fld('Branch', '<input class="ap-input" name="branch">') +
      fld('DSC serial no. (Authorised Officer)', '<input class="ap-input" name="dsc">', 'Authorised Officers need a DSC.', true) +
      '</div><button type="submit" class="ap-btn is-primary" style="margin-top:1rem"' + (can('admin') ? '' : ' disabled data-tip="Needs the Authorised Officer role"') + '>Add member</button></form></div>';
    var f = $('tm');
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (!can('admin')) return;
      var v = function (n) { return f[n].value.trim(); }, mob = v('mobile').replace(/\D/g, '');
      var errs = [bad(f, 'name', v('name').length < 3), bad(f, 'empId', v('empId').length < 2), bad(f, 'email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))), bad(f, 'mobile', !/^[6-9]\d{9}$/.test(mob)), bad(f, 'dsc', v('role') === 'ao' && v('dsc').length < 4)];
      if (errs.some(Boolean)) { f.querySelector('.is-bad').focus(); return; }
      S.addBankUser(st.bank, { name: v('name'), empId: v('empId'), email: v('email'), mobile: mob, role: v('role'), roleLabel: f.role.options[f.role.selectedIndex].text, branch: v('branch'), dsc: v('dsc') });
      UI.toast(v('name') + ' added'); team();
    });
  }
  function profile() {
    var b = bank();
    $('v-profile').innerHTML = P.head('Bank profile', 'Shown on your auction pages and used on sale certificates.', P.pill(b.status === 'active' ? 'Verified by RAVEN' : 'Pending verification', b.status === 'active' ? 'ok' : 'warn')) +
      '<form class="ap-card pad" id="bp" novalidate><div class="ap-fsec"><h3>' + ic('bank', 15) + 'Institution</h3><div class="ap-fgrid3">' +
      fld('Bank / institution name', '<input class="ap-input" name="name" value="' + esc(b.name) + '">', 'Enter the name.') +
      fld('Type', '<select class="ap-input" name="type">' + opts([['Public sector bank', 'Public sector bank'], ['Private sector bank', 'Private sector bank'], ['Small finance bank', 'Small finance bank'], ['Co-operative bank', 'Co-operative bank'], ['NBFC / HFC', 'NBFC / HFC'], ['ARC', 'Asset reconstruction company']], b.type) + '</select>') +
      fld('RBI licence / registration no.', '<input class="ap-input" name="rbi" value="' + esc(b.rbi || '') + '">') +
      fld('Head office address', '<input class="ap-input" name="hq" value="' + esc(b.hq || '') + '">', '', true) +
      fld('GSTIN', '<input class="ap-input" name="gstin" maxlength="15" value="' + esc(b.gstin || '') + '" style="text-transform:uppercase">', 'Enter a valid 15-character GSTIN.') +
      fld('Website', '<input class="ap-input" name="web" value="' + esc(b.web || '') + '" placeholder="https://">') + '</div></div>' +
      '<div class="ap-fsec"><h3>' + ic('user', 15) + 'Nodal officer for auctions</h3><div class="ap-fgrid3">' +
      fld('Name', '<input class="ap-input" name="nodal" value="' + esc(b.nodal || '') + '">') + fld('Email', '<input class="ap-input" type="email" name="nemail" value="' + esc(b.nemail || '') + '">', 'Enter a valid email.') + fld('Phone', '<input class="ap-input" name="nphone" value="' + esc(b.nphone || '') + '">') + '</div></div>' +
      '<div class="ap-fsec"><h3>' + ic('wallet', 15) + 'EMD collection account</h3><div class="ap-fgrid3">' +
      fld('Account name', '<input class="ap-input" name="eacname" value="' + esc(b.eacname || '') + '">') + fld('Account number', '<input class="ap-input" name="eacno" inputmode="numeric" value="' + esc(b.eacno || '') + '">', 'Enter a valid account number.') +
      fld('IFSC', '<input class="ap-input" name="eifsc" maxlength="11" value="' + esc(b.eifsc || '') + '" style="text-transform:uppercase">', 'Enter a valid IFSC.') + '</div></div>' +
      '<button type="submit" class="ap-btn is-primary"' + (can('admin') ? '' : ' disabled data-tip="Needs the Authorised Officer role"') + '>Save profile</button></form>';
    var f = $('bp');
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (!can('admin')) return;
      var v = function (n) { return f[n].value.trim(); };
      var errs = [bad(f, 'name', v('name').length < 3), bad(f, 'gstin', v('gstin') && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(v('gstin').toUpperCase())), bad(f, 'nemail', v('nemail') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('nemail'))),
        bad(f, 'eacno', v('eacno') && !/^\d{9,18}$/.test(v('eacno'))), bad(f, 'eifsc', v('eifsc') && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v('eifsc').toUpperCase()))];
      if (errs.some(Boolean)) { f.querySelector('.is-bad').focus(); return; }
      S.saveBank({ id: b.id, name: v('name'), type: v('type'), rbi: v('rbi'), hq: v('hq'), gstin: v('gstin').toUpperCase(), web: v('web'), nodal: v('nodal'), nemail: v('nemail'), nphone: v('nphone'), eacname: v('eacname'), eacno: v('eacno'), eifsc: v('eifsc').toUpperCase() });
      UI.toast('Bank profile saved'); setupBar();
    });
  }

  /* ---------- wiring ---------- */
  var VIEWS = { overview: overview, auctions: auctions, create: function () {}, approvals: approvals, bidders: bidders, live: function () { liveView(st.arg); }, post: post, queries: queries, inspections: inspections, reports: reports, team: team, profile: profile, cert: function () { cert(st.arg); } };
  function counts() {
    var A = mine(), parts = partsMine();
    P.count('approvals', A.filter(function (a) { return a.status === 'pending'; }).length, true);
    P.count('bidders', parts.filter(function (p) { return p.status === 'pending'; }).length, true);
    P.count('live', A.filter(S.isLiveish).length);
    P.count('post', tasks().filter(function (t) { return t.href === '#post'; }).length, true);
    P.count('queries', A.reduce(function (s, a) { return s + (a.queries || []).filter(function (q) { return !q.a; }).length; }, 0), true);
    P.count('inspections', A.reduce(function (s, a) { return s + (a.inspections || []).filter(function (i) { return i.status === 'requested'; }).length; }, 0), true);
  }
  function render() { counts(); VIEWS[st.view](); }
  function setupBar() {
    var sel = $('bk-bank');
    sel.innerHTML = S.db().banks.filter(function (b) { return b.status === 'active'; }).map(function (b) { return '<option value="' + esc(b.id) + '"' + (b.id === st.bank ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('');
    if (!bank() || bank().status !== 'active') { st.bank = sel.value; }
    $('bk-role').value = st.role;
    $('me-role').textContent = ROLE[st.role] + ' · ' + bank().name;
  }
  document.querySelector('.ap-content').insertAdjacentHTML('beforeend', '<section class="ap-view" data-view="cert" id="v-cert"></section>');
  $('bk-bank').addEventListener('change', function () { st.bank = this.value; remember(); setupBar(); if (st.view === 'create') create(); else render(); });
  $('bk-role').addEventListener('change', function () { st.role = this.value; remember(); setupBar(); if (st.view === 'create') renderWizard(); else render(); UI.toast('Now acting as ' + ROLE[st.role]); });

  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-answer]'); if (!f) return;
    e.preventDefault();
    var k = f.getAttribute('data-answer').split(':'), ans = f.ans.value.trim();
    if (bad(f, 'ans', ans.length < 3)) return;
    S.answer(k[0], k[1], ans, f.pub.checked); UI.toast('Answer sent'); queries(); counts();
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-go],[data-chip],[data-wz],[data-wstep],[data-cancel],[data-approve],[data-return],[data-papprove],[data-preject],[data-pause],[data-resume],[data-extend],[data-verify],[data-post],[data-simpay],[data-reauction],[data-ext],[data-insp],[data-csv]');
    if (!el || el.disabled) return;
    var g = function (n) { return el.getAttribute(n); };
    if (g('data-go')) { location.hash = g('data-go'); return; }
    if (g('data-chip')) { var c = g('data-chip').split(':'); st[c[0]] = c[1]; render(); return; }
    if (g('data-wz')) { wizardAction(g('data-wz'), el); return; }
    if (g('data-wstep') != null) { var to = +g('data-wstep'); if (to < wiz.step || wiz.done[to] || wiz.done[to - 1]) { collect(false); wiz.step = to; renderWizard(); } else UI.toast('Finish the current step first'); return; }
    if (g('data-cancel')) { var ca = S.get(g('data-cancel')); P.ask({ title: 'Cancel ' + esc(ca.ref) + '?', text: 'Approved bidders get their EMD refunded. This cannot be undone.', input: 'Reason (shown to bidders)', required: true, ok: 'Cancel auction', danger: true }, function (r) { S.cancel(ca.id, r, actor()); UI.toast('Auction cancelled'); }); return; }
    if (g('data-approve')) { var ap = S.get(g('data-approve')); if (ap.createdBy === actor()) { UI.toast('You prepared this auction – another person must approve it'); return; } S.setStatus(ap.id, 'scheduled', actor(), { approvedBy: actor(), approvedAt: Date.now() }); UI.toast('Approved – ' + ap.ref + ' is now public'); return; }
    if (g('data-return')) { var rt = S.get(g('data-return')); P.ask({ title: 'Return to maker', input: 'What should be changed?', required: true, ok: 'Return' }, function (r) { S.setStatus(rt.id, 'draft', actor(), { returnNote: r }); UI.toast('Returned to the maker'); }); return; }
    if (g('data-papprove')) { S.reviewPart(g('data-papprove'), true, '', actor()); UI.toast('EMD verified – bidder approved'); return; }
    if (g('data-preject')) { var pid = g('data-preject'); P.ask({ title: 'Reject this bidder', text: 'The bidder is told the reason and the EMD is refunded.', input: 'Reason', required: true, ok: 'Reject', danger: true }, function (r) { S.reviewPart(pid, false, r, actor()); S.refund(pid, actor()); UI.toast('Bidder rejected'); }); return; }
    if (g('data-pause')) { S.pause(g('data-pause'), actor()); UI.toast('Auction paused – bidders see a notice'); return; }
    if (g('data-resume')) { S.resume(g('data-resume'), actor()); UI.toast('Resumed – paused time added back'); return; }
    if (g('data-extend')) { var x = g('data-extend').split(':'); S.extend(x[0], +x[1], actor()); UI.toast('Extended by ' + x[1] + ' minutes'); return; }
    if (g('data-verify')) { var r = verifyChain(S.get(g('data-verify'))); $('lv-verify').innerHTML = '<div class="ad-status ' + (r.ok ? 'is-lead' : 'is-out') + '" style="margin-top:.75rem">' + ic('shield', 18) + (r.ok ? 'Bid log intact – all ' + r.n + ' bids match their hashes.' : 'Bid log broken at entry ' + r.at + ' – report to RAVEN.') + '</div>'; return; }
    if (g('data-post')) {
      var y = g('data-post').split(':'), pa = S.get(y[0]);
      var LBL = { confirmed: ['Confirm the sale?', 'Losing bidders’ EMD is refunded automatically. The winner must pay 25% by ' + U.dt(pa.endAt + DAY) + '.', 'Confirm sale'], paid25: ['Mark 25% as received?', 'Only after the money is credited to the EMD account.', 'Verify payment'], paid75: ['Mark the balance as received?', 'Only after the money is credited.', 'Verify payment'], certificate: ['Issue the sale certificate?', 'It will be digitally signed with your DSC.', 'Issue certificate'], forfeited: ['Forfeit the EMD?', 'The winner did not pay in time. The EMD goes to the bank and the asset can be re-auctioned.', 'Forfeit EMD'] }[y[1]];
      P.ask({ title: LBL[0], text: LBL[1], ok: LBL[2], danger: y[1] === 'forfeited' }, function () { S.setPost(pa.id, y[1], actor(), y[1] === 'certificate' ? { certificateAt: Date.now() } : null); UI.toast(LBL[2] + ' – done'); if (y[1] === 'certificate') location.hash = '#cert/' + pa.id; });
      return;
    }
    if (g('data-simpay')) { var sa = S.get(g('data-simpay')), w = winner(sa), k = S.phase(sa) === 'confirmed' ? 'p25' : 'p75'; S.pay(w.id, k, { method: 'RTGS', utr: 'DEMO' + Date.now().toString().slice(-8), amount: k === 'p25' ? Math.round(sa.currentHigh * 0.25) - w.emd.amount : sa.currentHigh - Math.round(sa.currentHigh * 0.25), date: new Date().toISOString().slice(0, 10), certName: w.name.replace(' (demo)', '') }); UI.toast('Demo payment received – verify it now'); return; }
    if (g('data-reauction')) { var na = S.reauction(g('data-reauction'), actor()); UI.toast('New draft created with reserve ' + short(na.reserve)); location.hash = '#create/' + na.id; return; }
    if (g('data-ext')) { var z = g('data-ext').split(':'), wz = winner(S.get(z[0])); S.decideExtension(wz.id, z[1], actor()); UI.toast(z[1] === 'approved' ? 'Extension allowed' : 'Extension declined'); return; }
    if (g('data-insp')) { var q = g('data-insp').split(':'); S.reviewInspection(q[0], q[1], q[2]); UI.toast('Inspection ' + q[2]); return; }
    if (g('data-csv')) exportCsv(g('data-csv'));
  });

  setupBar();
  P.init({ name: 'Bank officer (demo)', role: ROLE[st.role] + ' · ' + bank().name, onShow: function (v, h) {
    st.view = v; st.arg = h.split('/')[1] || '';
    if (v === 'create') { create(st.arg); counts(); } else render();
  } });
  $('me-role').textContent = ROLE[st.role] + ' · ' + bank().name;
  P.live(function () { if (st.view !== 'create') render(); else counts(); });
  setInterval(function () { U.tick(); }, 1000);
})();
