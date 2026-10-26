/* RAVEN Bank Auctions - data store and live bidding engine (demo version).
   Everything is kept in this browser (localStorage) and synced live between open tabs
   with BroadcastChannel. The rules (reserve price, bid increments, auto-extension,
   proxy bids, tamper-evident bid log, SARFAESI timelines) are written the way a real
   server would enforce them, so the backend can later run the same logic. */
(function () {
  var KEY = 'raven_auctions_v1', DEMO_TTL = 3 * 3600e3, MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;
  var listeners = [], bc = null;
  try { bc = new BroadcastChannel('raven-auctions'); } catch (e) {}

  /* ---------- reference data ---------- */
  var BANKS = [
    { id: 'bom', name: 'Bank of Maharashtra', type: 'Public sector bank', logo: 'images/banks/bank-of-maharashtra.svg' },
    { id: 'sbi', name: 'State Bank of India', type: 'Public sector bank', logo: 'images/banks/state-bank-of-india.svg' },
    { id: 'hdfc', name: 'HDFC Bank', type: 'Private sector bank', logo: 'images/banks/hdfc-bank.svg' },
    { id: 'canara', name: 'Canara Bank', type: 'Public sector bank', logo: 'images/banks/canara-bank.svg' },
    { id: 'union', name: 'Union Bank of India', type: 'Public sector bank', logo: 'images/banks/union-bank-of-india.svg' },
    { id: 'bob', name: 'Bank of Baroda', type: 'Public sector bank', logo: 'images/banks/bank-of-baroda.svg' },
    { id: 'federal', name: 'Federal Bank', type: 'Private sector bank', logo: 'images/banks/federal-bank.svg' }
  ];
  var ASSET = {
    residential: { label: 'Residential', img: 'images/loan-home.svg' },
    commercial: { label: 'Commercial', img: 'images/loan-business.svg' },
    plot: { label: 'Plot / Land', img: 'images/loan-home-plot.svg' },
    industrial: { label: 'Industrial', img: 'images/loan-home-construction.svg' },
    agri: { label: 'Agricultural land', img: 'images/real-estate.svg' },
    vehicle: { label: 'Vehicle', img: 'images/loan-vehicle.svg' },
    gold: { label: 'Gold', img: 'images/loan-gold.svg' },
    machinery: { label: 'Plant & machinery', img: 'images/loan-business.svg' }
  };
  var KIND = { sarfaesi: 'SARFAESI sale', drt: 'DRT sale', ibc: 'IBC liquidation', gold: 'Gold auction', vehicle: 'Vehicle auction', other: 'Other' };
  var PHASE = {
    draft: 'Draft', pending: 'Awaiting approval', registration: 'Registration open', upcoming: 'Registration closed',
    live: 'Live now', paused: 'Paused', closed: 'Closed', h1: 'H1 declared', confirmed: 'Sale confirmed',
    paid25: '25% paid', paid75: 'Fully paid', certificate: 'Sale certificate issued', unsold: 'Unsold',
    forfeited: 'EMD forfeited', cancelled: 'Cancelled'
  };

  /* ---------- storage ---------- */
  function blank() { return { seededAt: 0, auctions: [], parts: [], bids: [], profiles: {}, alerts: [], disputes: [], watch: {}, audit: [], banks: BANKS.map(function (b) { return Object.assign({ status: 'active', users: [] }, b); }), settings: { bots: true } }; }
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && d.auctions ? d : blank(); } catch (e) { return blank(); } }
  var db = load();
  function save(change) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
    var msg = change || { type: 'change' };
    if (bc) try { bc.postMessage(msg); } catch (e) {}
    emit(msg);
  }
  function emit(msg) { listeners.forEach(function (f) { try { f(msg); } catch (e) {} }); }
  function reload(msg) { db = load(); emit(msg || { type: 'change' }); }
  if (bc) bc.onmessage = function (e) { reload(e.data); };
  window.addEventListener('storage', function (e) { if (e.key === KEY) reload({ type: 'change' }); });

  function uid(p) { return (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function now() { return Date.now(); }
  // FNV-1a hash: each bid stores the hash of the previous one so any edit to the log is detectable
  function hash(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function audit(action, detail, actor) { db.audit.unshift({ at: now(), action: action, detail: detail, actor: actor || 'system' }); db.audit = db.audit.slice(0, 400); }

  /* ---------- demo seed ---------- */
  function seed() {
    var t = now();
    db.auctions = db.auctions.filter(function (a) { return !a.demo; });
    var demoIds = {};
    db.parts = db.parts.filter(function (p) { var keep = !String(p.auctionId).startsWith('demo-'); if (!keep) demoIds[p.id] = 1; return keep; });
    db.bids = db.bids.filter(function (b) { return !String(b.auctionId).startsWith('demo-'); });
    function A(o) {
      var a = Object.assign({
        demo: true, kind: 'sarfaesi', possession: 'physical', visibility: 'public', status: 'scheduled',
        extMin: 5, extWindow: 5, maxExt: 20, extCount: 0, bidCount: 0, currentHigh: 0, highPart: null, queries: [], post: null,
        docs: ['Sale notice (English)', 'Sale notice (Marathi)', 'Valuation report', 'Title search report', 'Bid form & terms'],
        terms: 'Sold on "as is where is, as is what is and whatever there is" basis under the SARFAESI Act, 2002. Bidders must inspect the property and verify title and dues before bidding.',
        createdBy: 'Demo', approvedBy: 'Demo'
      }, o);
      a.emd = a.emd || Math.round(a.reserve / 10);
      a.origEndAt = a.endAt;
      a.publishAt = a.publishAt || a.startAt - 31 * DAY;
      a.emdDeadline = a.emdDeadline || a.startAt - 2 * HOUR;
      a.inspection = a.inspection || [{ date: new Date(a.startAt - 5 * DAY).toISOString().slice(0, 10), slots: ['11:00–13:00', '15:00–17:00'] }, { date: new Date(a.startAt - 3 * DAY).toISOString().slice(0, 10), slots: ['11:00–13:00'] }];
      db.auctions.push(a);
      return a;
    }
    var L = [
      A({ id: 'demo-1', ref: 'BOM/PUN/2026/118', bankId: 'bom', branch: 'Baner branch, Pune', assetType: 'residential', title: '2 BHK flat, 8th floor, Baner', city: 'Pune', district: 'Pune', state: 'Maharashtra', pin: '411045',
        address: 'Flat 804, Wing B, Green Meadows, Baner Road, Baner, Pune', reserve: 6200000, increment: 50000, valuation: 7100000, startAt: t - 40 * MIN, endAt: t + 25 * MIN,
        specs: [['Carpet area', '780 sq ft'], ['Built-up area', '1,010 sq ft'], ['Floor', '8 of 12'], ['Facing', 'East'], ['Age', '6 years'], ['Parking', '1 covered']],
        borrower: 'R*** S*** (borrower), M*** S*** (guarantor)', outstanding: 6845000, demandNotice: '2025-11-12', possessionNotice: '2026-03-04', legal: 'Physical possession taken on 18 Jun 2026. Society dues of about ₹48,000 to be paid by the buyer.', contact: { name: 'S. Kulkarni, Authorised Officer', phone: '020 2567 8899' } }),
      A({ id: 'demo-2', ref: 'SBI/NSK/2026/052', bankId: 'sbi', branch: 'Nashik Road branch', assetType: 'commercial', title: 'Ground-floor shop, Nashik Road', city: 'Nashik', district: 'Nashik', state: 'Maharashtra', pin: '422101',
        address: 'Shop 3, Sai Plaza, Bytco Point, Nashik Road, Nashik', reserve: 3800000, increment: 25000, valuation: 4400000, startAt: t - 50 * MIN, endAt: t + 8 * MIN,
        specs: [['Carpet area', '320 sq ft'], ['Frontage', '14 ft'], ['Floor', 'Ground'], ['Age', '11 years']], borrower: 'S*** T*** (proprietor)', outstanding: 4510000, demandNotice: '2025-09-20', possessionNotice: '2026-01-15', legal: 'Physical possession. No known encumbrance other than property tax of about ₹22,000.', contact: { name: 'A. Pawar, Authorised Officer', phone: '0253 246 1100' } }),
      A({ id: 'demo-3', ref: 'HDFC/VEH/2026/310', bankId: 'hdfc', branch: 'Retail Assets, Pune', kind: 'vehicle', assetType: 'vehicle', title: 'Mahindra XUV500 W10, 2019', city: 'Pune', district: 'Pune', state: 'Maharashtra', pin: '411014',
        address: 'Yard: Shree Parking, Nagar Road, Wagholi, Pune', reserve: 650000, increment: 10000, valuation: 720000, startAt: t - 20 * MIN, endAt: t + 45 * MIN, possession: 'physical',
        specs: [['Fuel', 'Diesel'], ['Kilometres', '78,400'], ['Owners', '1'], ['Registration', 'MH12 **** 4521'], ['Insurance', 'Expired']], borrower: 'Hidden for vehicle auctions', outstanding: 0, legal: 'RC and NOC transferred to buyer after full payment.', contact: { name: 'Recovery desk', phone: '1800 202 6161' },
        docs: ['Inspection report', 'Photos (12)', 'RC copy (masked)', 'Bid terms'] }),
      A({ id: 'demo-4', ref: 'CAN/CSN/2026/071', bankId: 'canara', branch: 'CIDCO branch, Chhatrapati Sambhajinagar', assetType: 'residential', title: 'Row house, CIDCO N-7', city: 'Chhatrapati Sambhajinagar', district: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', pin: '431003',
        address: 'Row house 14, Sector N-7, CIDCO, Chhatrapati Sambhajinagar', reserve: 4500000, increment: 25000, valuation: 5200000, startAt: t + 3 * HOUR, endAt: t + 5 * HOUR, emdDeadline: t + 1 * HOUR,
        specs: [['Plot area', '1,200 sq ft'], ['Built-up', '1,450 sq ft'], ['Floors', 'G+1'], ['Facing', 'North'], ['Age', '14 years']], borrower: 'P*** J***', outstanding: 5120000, demandNotice: '2025-08-02', possessionNotice: '2026-02-11', legal: 'Physical possession. Clear title as per search report.', contact: { name: 'V. Joshi, Authorised Officer', phone: '0240 248 7700' } }),
      A({ id: 'demo-5', ref: 'UBI/AHN/2026/029', bankId: 'union', branch: 'Savedi branch, Ahilyanagar', assetType: 'plot', title: 'NA plot, 2,400 sq ft, Savedi', city: 'Ahilyanagar', district: 'Ahilyanagar', state: 'Maharashtra', pin: '414003',
        address: 'Plot 27, Survey 112/2, Savedi, Ahilyanagar', reserve: 2100000, increment: 20000, valuation: 2500000, startAt: t + 3 * DAY, endAt: t + 3 * DAY + 2 * HOUR, possession: 'symbolic',
        specs: [['Plot area', '2,400 sq ft'], ['NA order', 'Yes'], ['Road', '30 ft'], ['Zone', 'Residential']], borrower: 'K*** D***', outstanding: 2640000, demandNotice: '2025-10-01', possessionNotice: '2026-04-20', legal: 'Symbolic possession only – buyer takes physical possession with bank support.', contact: { name: 'M. Gaikwad, Authorised Officer', phone: '0241 234 5566' } }),
      A({ id: 'demo-6', ref: 'BOB/WLJ/2026/008', bankId: 'bob', branch: 'MIDC Waluj branch', kind: 'sarfaesi', assetType: 'industrial', title: 'Industrial shed with machinery, MIDC Waluj', city: 'Chhatrapati Sambhajinagar', district: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', pin: '431136',
        address: 'Plot G-42, MIDC Waluj, Chhatrapati Sambhajinagar', reserve: 18500000, increment: 100000, valuation: 21000000, startAt: t + 6 * DAY, endAt: t + 6 * DAY + 3 * HOUR,
        specs: [['Plot area', '10,000 sq ft'], ['Shed', '6,500 sq ft'], ['Power', '150 HP sanctioned'], ['Machinery', 'CNC lathe ×2, press ×1']], borrower: 'M/s S*** Engineering', outstanding: 24800000, demandNotice: '2025-07-15', possessionNotice: '2026-01-28', legal: 'MIDC transfer charges payable by the buyer.', contact: { name: 'R. Deshpande, Authorised Officer', phone: '0240 255 1234' } }),
      A({ id: 'demo-7', ref: 'FED/PUN/2026/GL44', bankId: 'federal', branch: 'Gold loan hub, Pune', kind: 'gold', assetType: 'gold', title: 'Gold ornaments lot – 248 g (22K)', city: 'Pune', district: 'Pune', state: 'Maharashtra', pin: '411001',
        address: 'Federal Bank, Camp, Pune (viewing by appointment)', reserve: 2950000, increment: 10000, startAt: t + 2 * DAY, endAt: t + 2 * DAY + HOUR, possession: 'physical',
        specs: [['Gross weight', '262 g'], ['Net weight', '248 g'], ['Purity', '22K (tested)'], ['Items', '9 ornaments']], borrower: '9 overdue gold loan accounts', outstanding: 0, legal: 'Sold after notice to borrowers as per RBI gold loan directions.', contact: { name: 'Gold loan desk', phone: '020 2612 3344' },
        docs: ['Item list with weights', 'Purity test report', 'Photos', 'Bid terms'] }),
      A({ id: 'demo-8', ref: 'SBI/PUN/2026/044', bankId: 'sbi', branch: 'Kothrud branch, Pune', assetType: 'residential', title: '3 BHK flat, Kothrud', city: 'Pune', district: 'Pune', state: 'Maharashtra', pin: '411038',
        address: 'Flat 502, Shanti Kunj, Karve Road, Kothrud, Pune', reserve: 7000000, increment: 50000, valuation: 8200000, startAt: t - 2 * DAY - 2 * HOUR, endAt: t - 2 * DAY,
        specs: [['Carpet area', '1,050 sq ft'], ['Floor', '5 of 7'], ['Age', '15 years']], borrower: 'A*** K***', outstanding: 7650000, legal: 'Physical possession.', contact: { name: 'N. Bhosale, Authorised Officer', phone: '020 2543 1122' } }),
      A({ id: 'demo-9', ref: 'BOM/STR/2026/012', bankId: 'bom', branch: 'Satara branch', assetType: 'agri', title: 'Agricultural land, 2.1 acres, Koregaon', city: 'Satara', district: 'Satara', state: 'Maharashtra', pin: '415501',
        address: 'Gat no. 233, Koregaon, Satara', reserve: 3200000, increment: 25000, startAt: t - 4 * DAY - 2 * HOUR, endAt: t - 4 * DAY, possession: 'symbolic',
        specs: [['Area', '2.1 acres'], ['Water', 'Well'], ['Crop', 'Sugarcane']], borrower: 'G*** M***', outstanding: 4100000, legal: 'Buyer must be eligible to buy agricultural land in Maharashtra.', contact: { name: 'S. More, Authorised Officer', phone: '02162 230 456' } })
    ];
    // demo bidders with hidden maximums, and some opening bids on live and closed auctions
    var names = ['Amit Patil', 'Neha Shah', 'Rahul Jadhav', 'Pooja Kulkarni', 'Imran Shaikh', 'Kiran Rao'];
    L.forEach(function (a, i) {
      if (a.startAt > t && a.id !== 'demo-4') return;
      var n = a.id === 'demo-9' ? 0 : 4;
      for (var k = 0; k < n; k++) {
        db.parts.push({ id: 'bot-' + a.id + '-' + k, auctionId: a.id, userId: 'bot', bot: true, alias: 'B' + (k + 2) + String.fromCharCode(65 + i), name: names[(i + k) % names.length] + ' (demo)', status: 'approved',
          emd: { method: 'NEFT', utr: 'DEMO' + (100000 + k), amount: a.emd, at: a.startAt - DAY }, botMax: snap(a, a.reserve * (1.04 + Math.random() * 0.22)), createdAt: a.startAt - DAY });
      }
    });
    L.filter(function (a) { return a.startAt < t && a.id !== 'demo-9'; }).forEach(function (a) {
      var bots = db.parts.filter(function (p) { return p.auctionId === a.id; });
      var steps = a.endAt < t ? 9 : 3 + Math.floor(Math.random() * 3), at = a.startAt + 2 * MIN, span = Math.min(t, a.endAt) - a.startAt;
      for (var k = 0; k < steps && bots.length; k++) {
        var p = bots[k % bots.length], amt = a.bidCount ? a.currentHigh + a.increment * (1 + (k % 3 === 0 ? 1 : 0)) : a.reserve;
        pushBid(a, p, amt, false, at); at += span / (steps + 3); // opening bids stay in the past
      }
    });
    var sold = L[7]; sold.post = 'certificate'; sold.certificateAt = sold.endAt + 9 * DAY;
    L[8].post = 'unsold';
    db.seededAt = t;
    audit('demo.seed', 'Demo auctions refreshed');
  }
  function ensureSeed() { if (!db.seededAt || now() - db.seededAt > DEMO_TTL || !db.auctions.some(function (a) { return a.demo; })) { seed(); save(); } }

  /* ---------- helpers ---------- */
  function snap(a, x) { return a.reserve + Math.max(0, Math.floor((x - a.reserve) / a.increment)) * a.increment; }
  function get(id) { return db.auctions.find(function (a) { return a.id === id; }) || null; }
  function bank(id) { return db.banks.find(function (b) { return b.id === id; }) || null; }
  function phase(a, t) {
    t = t || now();
    if (['draft', 'pending', 'cancelled'].indexOf(a.status) !== -1) return a.status;
    if (a.post) return a.post;
    if (t < a.startAt) return t < a.emdDeadline ? 'registration' : 'upcoming';
    if (a.paused) return 'paused';
    if (t < a.endAt) return 'live';
    return a.bidCount ? 'h1' : 'unsold';
  }
  function finalize() { // record the result once an auction has closed
    var changed = false;
    db.auctions.forEach(function (a) {
      if (a.post || ['draft', 'pending', 'cancelled'].indexOf(a.status) !== -1 || a.paused || now() < a.endAt) return;
      a.post = a.bidCount ? 'h1' : 'unsold'; changed = true;
      audit('auction.closed', a.ref + ' closed – ' + (a.bidCount ? 'H1 at ₹' + a.currentHigh : 'no bids'));
    });
    if (changed) save({ type: 'closed' });
  }
  function bidsOf(id) { return db.bids.filter(function (b) { return b.auctionId === id; }).sort(function (x, y) { return x.at - y.at; }); }
  function partsOf(id) { return db.parts.filter(function (p) { return p.auctionId === id; }); }
  function partOf(id, userId) { return db.parts.find(function (p) { return p.auctionId === id && p.userId === userId; }) || null; }
  function nextMin(a) { return a.bidCount ? a.currentHigh + a.increment : a.reserve; }

  function pushBid(a, p, amount, proxy, at) {
    var prev = db.bids.filter(function (b) { return b.auctionId === a.id; }).slice(-1)[0];
    var b = { id: uid('b'), auctionId: a.id, partId: p.id, alias: p.alias, amount: amount, at: at || now(), proxy: !!proxy, prev: prev ? prev.hash : '00000000' };
    b.hash = hash(b.prev + '|' + a.id + '|' + p.alias + '|' + amount + '|' + b.at);
    db.bids.push(b);
    a.currentHigh = amount; a.highPart = p.id; a.bidCount++;
    p.lastBidAt = b.at;
    // soft close: a bid in the last few minutes extends the auction
    var t = at || now();
    if (a.endAt - t <= a.extWindow * MIN && t < a.endAt && a.extCount < a.maxExt) { a.endAt += a.extMin * MIN; a.extCount++; b.extended = true; }
    return b;
  }
  // automatic (proxy) bids: the highest hidden maximum wins at one step above the next best
  function resolveProxies(a) {
    for (var guard = 0; guard < 50; guard++) {
      var leader = db.parts.find(function (p) { return p.id === a.highPart; });
      // how far the current leader would go automatically (at least the current price)
      var lMax = leader && leader.proxyMax && snap(a, leader.proxyMax) > a.currentHigh ? snap(a, leader.proxyMax) : a.currentHigh;
      var cands = partsOf(a.id).filter(function (p) { return p.status === 'approved' && p.id !== a.highPart && p.proxyMax && snap(a, p.proxyMax) >= nextMin(a); })
        .sort(function (x, y) { return y.proxyMax - x.proxyMax || x.proxyAt - y.proxyAt; });
      if (!cands.length) return;
      var c = cands[0], cMax = snap(a, c.proxyMax);
      if (cMax > lMax) { pushBid(a, c, Math.min(cMax, Math.max(nextMin(a), lMax + a.increment)), true); continue; }
      // the leader's maximum is equal or higher (earlier maximum wins a tie): leader defends just above the challenger
      var amt = Math.min(lMax, cMax + a.increment);
      if (leader && amt > a.currentHigh) pushBid(a, leader, amt, true);
      c.proxyMax = 0; c.proxyOutbid = true;
    }
  }

  /* ---------- public API ---------- */
  var Store = {
    BANKS: BANKS, ASSET: ASSET, KIND: KIND, PHASE: PHASE, MIN: MIN, HOUR: HOUR, DAY: DAY,
    db: function () { return db; },
    on: function (f) { listeners.push(f); },
    reload: reload,
    all: function () { finalize(); return db.auctions.slice(); },
    verifyChain: function (id) { // recompute every hash in the order the bids were written
      var prev = '00000000', list = db.bids.filter(function (b) { return b.auctionId === id; });
      for (var i = 0; i < list.length; i++) { var b = list[i]; if (b.prev !== prev || hash(b.prev + '|' + id + '|' + b.alias + '|' + b.amount + '|' + b.at) !== b.hash) return { ok: false, at: i + 1 }; prev = b.hash; }
      return { ok: true, n: list.length };
    },
    get: get, bank: bank, phase: phase, bidsOf: bidsOf, partsOf: partsOf, partOf: partOf, nextMin: nextMin, snap: snap,
    isLiveish: function (a) { var p = phase(a); return p === 'live' || p === 'paused'; },
    img: function (a) {
      if (a.assetType === 'residential' && /\b(flat|apartment|bhk)\b/i.test(a.title || '') && !/row house|bungalow/i.test(a.title || '')) return 'images/real-estate.svg';
      if (a.assetType === 'agri') return 'images/loan-home-plot.svg';
      return (ASSET[a.assetType] || ASSET.residential).img;
    },

    /* bidder profile (KYC) */
    profile: function (userId) { return db.profiles[userId] || null; },
    saveProfile: function (userId, data) {
      var p = Object.assign(db.profiles[userId] || { createdAt: now() }, data);
      // demo: Aadhaar e-KYC and PAN check are instant; duplicate PANs are flagged for admin review
      var dup = Object.keys(db.profiles).some(function (k) { return k !== userId && db.profiles[k].pan && db.profiles[k].pan === p.pan; });
      p.kyc = dup ? 'review' : 'verified'; p.flag = dup ? 'Same PAN used by another account' : '';
      db.profiles[userId] = p; audit('bidder.kyc', p.name + ' KYC ' + p.kyc, p.name); save();
      return p;
    },

    /* participation */
    participate: function (auctionId, userId, data) {
      var a = get(auctionId), prof = db.profiles[userId];
      if (!a) throw new Error('Auction not found');
      if (!prof || prof.kyc !== 'verified') throw new Error('Complete your bidder KYC first');
      if (phase(a) !== 'registration' && phase(a) !== 'live') throw new Error('Registration for this auction is closed');
      var p = partOf(auctionId, userId);
      var taken = partsOf(auctionId).length;
      p = Object.assign(p || { id: uid('p'), auctionId: auctionId, userId: userId, alias: 'B' + (taken + 2) + String.fromCharCode(75 + (taken % 10)), createdAt: now() }, data, { name: prof.name, status: 'pending' });
      if (db.parts.indexOf(p) === -1) db.parts.push(p);
      audit('participation.submit', prof.name + ' applied for ' + a.ref + ' (EMD ₹' + data.emd.amount + ')', prof.name); save();
      return p;
    },
    reviewPart: function (partId, ok, reason, actor) {
      var p = db.parts.find(function (x) { return x.id === partId; }); if (!p) return;
      p.status = ok ? 'approved' : 'rejected'; p.reason = reason || ''; p.reviewedAt = now();
      audit('participation.' + p.status, p.name + ' for ' + (get(p.auctionId) || {}).ref + (reason ? ' – ' + reason : ''), actor); save();
    },
    setProxy: function (partId, max) {
      var p = db.parts.find(function (x) { return x.id === partId; }); var a = p && get(p.auctionId);
      if (!p || !a) throw new Error('Not registered');
      if (max && max < nextMin(a)) throw new Error('Your maximum must be at least ₹' + nextMin(a).toLocaleString('en-IN'));
      p.proxyMax = max || 0; p.proxyAt = now();
      if (max && phase(a) === 'live') resolveProxies(a);
      save({ type: 'bid', auctionId: a.id });
    },
    placeBid: function (auctionId, partId, amount) {
      db = load(); // always validate against the latest state from every tab
      var a = get(auctionId), p = db.parts.find(function (x) { return x.id === partId; });
      if (!a || !p) throw new Error('Auction or registration not found');
      if (phase(a) !== 'live') throw new Error(phase(a) === 'paused' ? 'The auction is paused by the bank' : 'The auction is not live');
      if (p.status !== 'approved') throw new Error('Your EMD is not verified yet');
      if (a.highPart === p.id) throw new Error('You are already the highest bidder');
      if (p.lastBidAt && now() - p.lastBidAt < 1000) throw new Error('Please wait a moment between bids');
      var min = nextMin(a);
      if (amount < min) throw new Error('Someone bid first – the minimum bid is now ₹' + min.toLocaleString('en-IN'));
      if ((amount - a.reserve) % a.increment !== 0) throw new Error('Bids go up in steps of ₹' + a.increment.toLocaleString('en-IN'));
      var b = pushBid(a, p, amount, false);
      resolveProxies(a);
      audit('bid.accepted', a.ref + ' ' + p.alias + ' ₹' + amount + (b.extended ? ' (extended)' : ''), p.name);
      save({ type: 'bid', auctionId: a.id, extended: b.extended });
      return b;
    },

    /* questions, inspections, watchlist, alerts, disputes */
    ask: function (auctionId, userId, name, q, cat) { var a = get(auctionId); a.queries.push({ id: uid('q'), userId: userId, name: name, cat: cat, q: q, a: '', public: false, at: now() }); save(); },
    answer: function (auctionId, qid, text, pub) { var a = get(auctionId), q = a.queries.find(function (x) { return x.id === qid; }); q.a = text; q.public = pub; q.answeredAt = now(); audit('query.answered', a.ref, 'bank'); save(); },
    bookInspection: function (auctionId, userId, data) {
      var a = get(auctionId); a.inspections = a.inspections || [];
      a.inspections = a.inspections.filter(function (x) { return x.userId !== userId; });
      a.inspections.push(Object.assign({ id: uid('i'), userId: userId, status: 'requested', at: now() }, data)); save();
    },
    reviewInspection: function (auctionId, iid, status) { var a = get(auctionId), i = (a.inspections || []).find(function (x) { return x.id === iid; }); if (i) { i.status = status; save(); } },
    isWatched: function (userKey, id) { return !!(db.watch[userKey] || {})[id]; },
    toggleWatch: function (userKey, id) { db.watch[userKey] = db.watch[userKey] || {}; db.watch[userKey][id] = !db.watch[userKey][id]; save(); return db.watch[userKey][id]; },
    addAlert: function (userKey, data) { db.alerts.push(Object.assign({ id: uid('al'), userKey: userKey, at: now() }, data)); save(); },
    removeAlert: function (id) { db.alerts = db.alerts.filter(function (x) { return x.id !== id; }); save(); },
    addDispute: function (userId, name, data) { db.disputes.unshift(Object.assign({ id: uid('d'), userId: userId, name: name, status: 'open', at: now() }, data)); audit('dispute.opened', data.subject || data.category, name); save(); },
    resolveDispute: function (id, note) { var d = db.disputes.find(function (x) { return x.id === id; }); d.status = 'resolved'; d.note = note; d.resolvedAt = now(); audit('dispute.resolved', d.subject || d.category, 'admin'); save(); },

    /* post-auction payments */
    pay: function (partId, kind, data) {
      var p = db.parts.find(function (x) { return x.id === partId; }); p.payments = p.payments || {};
      p.payments[kind] = Object.assign({ status: 'submitted', at: now() }, data);
      audit('payment.' + kind, p.name + ' submitted ₹' + data.amount + ' (UTR ' + data.utr + ')', p.name); save();
    },
    decideExtension: function (partId, status, actor) { var p = db.parts.find(function (x) { return x.id === partId; }); if (!p || !p.extension) return; p.extension.status = status; p.extension.decidedAt = now(); audit('payment.extension', p.name + ' – ' + status, actor); save(); },
    refund: function (partId, actor) { var p = db.parts.find(function (x) { return x.id === partId; }); if (!p || !p.emd || p.refund) return; p.refund = { status: 'processed', amount: p.emd.amount, at: now() }; audit('emd.refund', p.name + ' ₹' + p.emd.amount, actor); save(); },
    cancel: function (id, reason, actor) {
      var a = get(id); a.status = 'cancelled'; a.cancelReason = reason;
      partsOf(id).forEach(function (p) { if (p.emd && p.status !== 'rejected' && !p.refund) p.refund = { status: 'processed', amount: p.emd.amount, at: now() }; });
      audit('auction.cancelled', a.ref + ' – ' + reason, actor); save();
    },
    requestExtension: function (partId, reason) { var p = db.parts.find(function (x) { return x.id === partId; }); p.extension = { reason: reason, status: 'requested', at: now() }; save(); },

    /* bank actions */
    saveAuction: function (a, actor) {
      if (!a.id) { a.id = uid('a'); a.createdAt = now(); a.queries = []; a.bidCount = 0; a.currentHigh = 0; a.extCount = 0; a.createdBy = actor; db.auctions.push(a); }
      else { var i = db.auctions.findIndex(function (x) { return x.id === a.id; }); db.auctions[i] = a; }
      a.origEndAt = a.endAt; audit('auction.saved', (a.ref || a.title) + ' (' + a.status + ')', actor); save();
      return a;
    },
    setStatus: function (id, status, actor, extra) { var a = get(id); a.status = status; Object.assign(a, extra || {}); audit('auction.' + status, a.ref, actor); save(); },
    pause: function (id, actor) { var a = get(id); a.paused = now(); audit('auction.paused', a.ref, actor); save({ type: 'bid', auctionId: id }); },
    resume: function (id, actor) { var a = get(id); a.endAt += now() - a.paused; a.paused = 0; audit('auction.resumed', a.ref + ' (lost time added back)', actor); save({ type: 'bid', auctionId: id }); },
    extend: function (id, minutes, actor) { var a = get(id); a.endAt += minutes * MIN; audit('auction.extended', a.ref + ' +' + minutes + ' min', actor); save({ type: 'bid', auctionId: id, extended: true }); },
    setPost: function (id, post, actor, extra) {
      var a = get(id); a.post = post; Object.assign(a, extra || {});
      if (post === 'confirmed') partsOf(id).forEach(function (p) { if (p.id !== a.highPart && p.status === 'approved') p.refund = { status: 'processed', amount: p.emd.amount, at: now() }; });
      if (post === 'paid25' || post === 'paid75') { var w = db.parts.find(function (p) { return p.id === a.highPart; }); var k = post === 'paid25' ? 'p25' : 'p75'; if (w && w.payments && w.payments[k]) w.payments[k].status = 'verified'; }
      audit('auction.' + post, a.ref, actor); save();
    },
    reauction: function (id, actor) {
      var a = get(id), b = JSON.parse(JSON.stringify(a)), t = now();
      delete b.id; b.demo = false; b.post = null; b.paused = 0; b.status = 'draft'; b.ref = a.ref + '-R'; b.reserve = Math.round(a.reserve * 0.9 / 1000) * 1000; b.emd = Math.round(b.reserve / 10);
      b.startAt = t + 31 * DAY; b.endAt = b.startAt + 2 * HOUR; b.emdDeadline = b.startAt - 2 * HOUR; b.publishAt = t; b.inspections = [];
      return Store.saveAuction(b, actor);
    },
    addBankUser: function (bankId, u) { var b = bank(bankId); b.users.push(Object.assign({ id: uid('u'), at: now() }, u)); audit('bank.user', u.name + ' added as ' + u.role, 'bank'); save(); },
    saveBank: function (data) {
      var b = data.id && bank(data.id);
      if (b) Object.assign(b, data); else { b = Object.assign({ id: uid('bank'), users: [], status: 'pending', logo: '' }, data); db.banks.push(b); }
      audit('bank.saved', b.name + ' (' + b.status + ')', 'admin'); save(); return b;
    },
    setProfileKyc: function (userId, status, actor) { var p = db.profiles[userId]; if (p) { p.kyc = status; p.flag = status === 'verified' ? '' : p.flag; audit('bidder.kyc', p.name + ' → ' + status, actor); save(); } },
    settings: function () { return db.settings; },
    setSetting: function (k, v) { db.settings[k] = v; save(); },
    resetDemo: function () { seed(); save({ type: 'reset' }); },
    auditLog: function () { return db.audit; }
  };
  window.RavenAuctions = Store;

  /* ---------- demo bidders (run in one tab only) ---------- */
  var TAB = uid('tab'), LEAD = 'raven_auctions_leader';
  function isLeader() {
    try {
      var l = JSON.parse(localStorage.getItem(LEAD) || 'null');
      if (!l || l.tab === TAB || now() - l.ts > 6000) { localStorage.setItem(LEAD, JSON.stringify({ tab: TAB, ts: now() })); return true; }
    } catch (e) { return true; }
    return false;
  }
  function botTick() {
    if (!db.settings.bots || document.hidden || !isLeader()) return;
    db = load();
    finalize();
    db.auctions.filter(function (a) { return a.demo && phase(a) === 'live'; }).forEach(function (a) {
      var left = a.endAt - now(), chance = left < 2 * MIN ? 0.55 : 0.22;
      if (Math.random() > chance) return;
      var bots = partsOf(a.id).filter(function (p) { return p.bot && p.id !== a.highPart && p.botMax >= nextMin(a); });
      if (!bots.length) return;
      var p = bots[Math.floor(Math.random() * bots.length)], amt = Math.min(p.botMax, nextMin(a) + (Math.random() < 0.25 ? a.increment : 0));
      try { Store.placeBid(a.id, p.id, snap(a, amt)); } catch (e) {}
    });
  }
  ensureSeed();
  finalize();
  setInterval(botTick, 4000);
  setInterval(finalize, 5000);
})();
