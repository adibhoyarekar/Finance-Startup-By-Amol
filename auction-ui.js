/* Shared UI helpers for the RAVEN Bank Auctions pages. */
(function () {
  var S = window.RavenAuctions, App = window.RavenApp;
  var esc = App.esc;
  function inr(n) { return '₹' + Math.round(n || 0).toLocaleString('en-IN'); }
  function short(n) { return App.short(n || 0).replace(' L', ' L').replace(' Cr', ' Cr'); }
  function parts(ms) {
    ms = Math.max(0, ms); var s = Math.floor(ms / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dur(ms) {
    var p = parts(ms);
    if (p.d) return p.d + 'd ' + p.h + 'h';
    if (p.h) return p.h + 'h ' + pad(p.m) + 'm';
    return pad(p.m) + ':' + pad(p.s);
  }
  function dt(t, withTime) {
    var d = new Date(t);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + (withTime ? ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');
  }
  function badge(a) {
    var p = S.phase(a);
    if (p === 'live') return '<span class="ac-badge is-live"><i class="ac-live-dot"></i>Live now</span>';
    if (p === 'paused') return '<span class="ac-badge is-live">Paused</span>';
    if (p === 'registration') return '<span class="ac-badge is-reg">Registration open</span>';
    if (p === 'upcoming') return '<span class="ac-badge is-up">Starts soon</span>';
    if (p === 'draft' || p === 'pending') return '<span class="ac-badge is-up">' + S.PHASE[p] + '</span>';
    var sold = ['h1', 'confirmed', 'paid25', 'paid75', 'certificate'].indexOf(p) !== -1;
    return '<span class="ac-badge is-done">' + (sold ? 'Sold' : S.PHASE[p] || 'Closed') + '</span>';
  }
  // text for countdown elements; updated every second by tick()
  function timer(a) {
    var p = S.phase(a), t = Date.now();
    if (p === 'live') return { text: 'Ends in ' + dur(a.endAt - t), urgent: a.endAt - t < 5 * 60e3 };
    if (p === 'paused') return { text: 'Paused by bank', urgent: true };
    if (p === 'registration' || p === 'upcoming') return { text: 'Starts in ' + dur(a.startAt - t), urgent: false };
    return { text: 'Ended ' + dt(a.endAt), urgent: false };
  }
  function card(a, i) {
    var b = S.bank(a.bankId) || {}, p = S.phase(a), live = p === 'live' || p === 'paused';
    var closedSold = ['h1', 'confirmed', 'paid25', 'paid75', 'certificate'].indexOf(p) !== -1, tm = timer(a);
    var price = a.bidCount ? a.currentHigh : a.reserve, up = a.bidCount ? Math.round((a.currentHigh / a.reserve - 1) * 100) : 0;
    return '<a class="ac-card" style="--i:' + (i || 0) + '" href="auction.html?id=' + encodeURIComponent(a.id) + '" data-aid="' + esc(a.id) + '">' +
      '<span class="ac-pic"><img src="' + S.img(a) + '" alt="" loading="lazy">' + badge(a) +
      '<span class="ac-bank">' + (b.logo ? '<img src="' + b.logo + '" alt="">' : '') + esc(b.name || '') + '</span></span>' +
      '<span class="ac-body"><h3>' + esc(a.title) + '</h3><span class="ac-loc">' + RavenUI.icon('home', 14) + esc(a.city) + ' · ' + (S.ASSET[a.assetType] || {}).label + '</span>' +
      '<span class="ac-money"><span><small>' + (live ? 'Current bid' : closedSold ? 'Sold at' : 'Reserve price') + '</small><b class="' + (up > 0 ? 'is-up' : '') + '" data-price>' + short(price) + '</b></span>' +
      '<span><small>' + (live || closedSold ? 'Bids' : 'EMD') + '</small><b>' + (live || closedSold ? a.bidCount + (up > 0 ? ' · +' + up + '%' : '') : short(a.emd)) + '</b></span></span>' +
      '<span class="ac-foot"><span class="ac-timer' + (tm.urgent ? ' is-urgent' : '') + '" data-timer="' + esc(a.id) + '">' + RavenUI.icon('clock', 14) + tm.text + '</span><span>' + esc(a.ref) + '</span></span></span></a>';
  }
  function tick(root) {
    (root || document).querySelectorAll('[data-timer]').forEach(function (el) {
      var a = S.get(el.getAttribute('data-timer')); if (!a) return;
      var tm = timer(a);
      el.classList.toggle('is-urgent', tm.urgent);
      el.innerHTML = RavenUI.icon('clock', 14) + tm.text;
    });
  }
  function fld(label, input, err, full) { return '<div class="ap-field' + (full ? ' full' : '') + '"><label>' + label + '</label>' + input + (err ? '<p class="ap-err">' + err + '</p>' : '') + '</div>'; }
  function opts(list, v) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); }
  function money(name, ph, val) { return '<div class="ap-money"><span>₹</span><input class="ap-input" name="' + name + '" inputmode="numeric" placeholder="' + ph + '" value="' + (val ? App.inr(val) : '') + '" data-money></div>'; }
  function wireMoney(root) { root.querySelectorAll('[data-money]').forEach(function (el) { el.addEventListener('input', function () { var d = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11); el.value = d ? App.inr(+d) : ''; }); }); }
  function num(v) { return +String(v || '').replace(/\D/g, '') || 0; }
  function bad(form, name, isBad) { var el = form.querySelector('[name="' + name + '"]'); if (!el) return isBad; el.classList.toggle('is-bad', !!isBad); var e = el.closest('.ap-field') && el.closest('.ap-field').querySelector('.ap-err'); if (e) e.classList.toggle('is-on', !!isBad); return isBad; }
  function kycForm(me, done) {
    var p = S.profile(me.id) || {}, pr = me.profile || {}, ic = RavenUI.icon, UI = RavenUI;
    var body = '<form id="kf" novalidate><div class="ap-fsec"><h3>' + ic('user', 15) + 'Bidder details</h3><div class="ap-fgrid">' +
      fld('Bidder type', '<select class="ap-input" name="type">' + opts([['individual', 'Individual'], ['proprietor', 'Proprietorship'], ['partnership', 'Partnership firm'], ['llp', 'LLP'], ['company', 'Company'], ['huf', 'HUF'], ['trust', 'Trust / Society']], p.type) + '</select>', '', true) +
      fld('Full name (as on PAN)', '<input class="ap-input" name="name" value="' + esc(p.name || pr.fullName || '') + '" autocomplete="name">', 'Enter your name as on PAN.') +
      fld('PAN', '<input class="ap-input" name="pan" value="' + esc(p.pan || '') + '" maxlength="10" placeholder="ABCDE1234F" style="text-transform:uppercase">', 'Enter a valid PAN, e.g. ABCDE1234F.') +
      fld('Aadhaar number (for e-KYC)', '<input class="ap-input" name="aadhaar" inputmode="numeric" maxlength="14" placeholder="' + (p.aadhaar4 ? 'XXXX XXXX ' + p.aadhaar4 : '12-digit Aadhaar') + '">', 'Enter your 12-digit Aadhaar number.') +
      fld('Date of birth', '<input class="ap-input" type="date" name="dob" value="' + esc(p.dob || '') + '">', 'You must be 18 or older.') +
      fld('Mobile', '<input class="ap-input" name="mobile" inputmode="tel" value="' + esc(p.mobile || pr.mobile || '') + '">', 'Enter a valid 10-digit mobile.') +
      fld('Email', '<input class="ap-input" type="email" name="email" value="' + esc(p.email || pr.email || '') + '">', 'Enter a valid email.') +
      fld('Address', '<input class="ap-input" name="address" value="' + esc(p.address || '') + '" placeholder="House, street, area">', 'Enter your address.', true) +
      fld('City', '<input class="ap-input" name="city" value="' + esc(p.city || pr.city || '') + '">', 'Enter your city.') +
      fld('PIN code', '<input class="ap-input" name="pin" inputmode="numeric" maxlength="6" value="' + esc(p.pin || '') + '">', 'Enter a 6-digit PIN code.') +
      '</div></div><div class="ap-fsec" id="kf-org"' + (!p.type || p.type === 'individual' ? ' hidden' : '') + '><h3>' + ic('briefcase', 15) + 'Organisation</h3><div class="ap-fgrid">' +
      fld('Organisation name', '<input class="ap-input" name="org" value="' + esc(p.org || '') + '">') + fld('CIN / LLPIN / registration no.', '<input class="ap-input" name="cin" value="' + esc(p.cin || '') + '">') +
      fld('Authorised signatory', '<input class="ap-input" name="signatory" value="' + esc(p.signatory || '') + '">') + fld('Board resolution / authority letter', '<input class="ap-input" type="file" name="resolution" accept=".pdf,.jpg,.png" style="padding-top:.6rem">') +
      '</div></div><div class="ap-fsec"><h3>' + ic('bank', 15) + 'Bank account for EMD refunds</h3><div class="ap-fgrid">' +
      fld('Account holder name', '<input class="ap-input" name="holder" value="' + esc(p.holder || '') + '">', 'Enter the account holder name.') +
      fld('Account number', '<input class="ap-input" name="acc" inputmode="numeric" value="' + esc(p.acc || '') + '">', 'Enter a valid account number.') +
      fld('IFSC', '<input class="ap-input" name="ifsc" maxlength="11" value="' + esc(p.ifsc || '') + '" placeholder="MAHB0000123" style="text-transform:uppercase">', 'Enter a valid IFSC.') +
      fld('Digital signature (DSC)', '<select class="ap-input" name="dsc">' + opts([['yes', 'I have a Class 3 DSC'], ['no', 'I don’t have a DSC yet']], p.dsc) + '</select>') +
      '</div></div><div class="ap-fsec"><label class="ap-check"><input type="checkbox" name="consent"' + (p.consent ? ' checked' : '') + '><span>I agree to the <a href="terms.html" target="_blank">auction terms</a> and consent to RAVEN verifying my PAN, Aadhaar and bank account for this purpose (DPDP Act, 2023).</span></label><p class="ap-err" data-for="consent">Please give your consent.</p></div></form>';
    var dr = UI.openDrawer({ title: 'Bidder KYC', body: body, foot: '<button type="button" class="ap-btn" data-dclose2>Cancel</button><button type="button" class="ap-btn is-primary" data-go>' + ic('shield', 18) + 'Verify & save</button>' });
    var f = dr.querySelector('#kf');
    dr.querySelector('[data-dclose2]').onclick = UI.closeDrawer;
    f.type.addEventListener('change', function () { dr.querySelector('#kf-org').hidden = f.type.value === 'individual'; });
    dr.querySelector('[data-go]').onclick = function () {
      var v = function (n) { return (f[n].value || '').trim(); }, mob = v('mobile').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''), aad = v('aadhaar').replace(/\D/g, '');
      var age = (Date.now() - new Date(v('dob'))) / 31557600000;
      var errs = [bad(f, 'name', v('name').length < 3), bad(f, 'pan', !/^[A-Z]{5}\d{4}[A-Z]$/.test(v('pan').toUpperCase())), bad(f, 'aadhaar', !(aad.length === 12 || (!aad && p.aadhaar4))),
        bad(f, 'dob', !(age >= 18 && age < 100)), bad(f, 'mobile', !/^[6-9]\d{9}$/.test(mob)), bad(f, 'email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))), bad(f, 'address', v('address').length < 5),
        bad(f, 'city', !v('city')), bad(f, 'pin', !/^\d{6}$/.test(v('pin'))), bad(f, 'holder', v('holder').length < 3), bad(f, 'acc', !/^\d{9,18}$/.test(v('acc'))), bad(f, 'ifsc', !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v('ifsc').toUpperCase()))];
      var cErr = !f.consent.checked; dr.querySelector('[data-for="consent"]').classList.toggle('is-on', cErr);
      if (errs.some(Boolean) || cErr) { var first = f.querySelector('.is-bad'); if (first) first.focus(); return; }
      var res = S.saveProfile(me.id, { type: v('type'), name: v('name'), pan: v('pan').toUpperCase(), aadhaar4: aad ? aad.slice(-4) : p.aadhaar4, dob: v('dob'), mobile: mob, email: v('email'), address: v('address'), city: v('city'), pin: v('pin'),
        org: v('org'), cin: v('cin'), signatory: v('signatory'), resolution: f.resolution.files[0] ? f.resolution.files[0].name : p.resolution, holder: v('holder'), acc: v('acc'), ifsc: v('ifsc').toUpperCase(), dsc: v('dsc'), consent: true });
      UI.closeDrawer();
      UI.toast(res.kyc === 'verified' ? 'KYC verified – PAN, Aadhaar and bank account checked' : 'KYC sent for manual review');
      if (done) done(res);
    };
  }

  function userKey() { var u = App.current(); return u ? u.id : 'guest'; }
  function isPublic(a) { return a.visibility !== 'private' && ['draft', 'pending'].indexOf(a.status) === -1; }
  window.AUI = { inr: inr, short: short, dur: dur, parts: parts, pad: pad, dt: dt, badge: badge, timer: timer, card: card, tick: tick, userKey: userKey, isPublic: isPublic,
    fld: fld, opts: opts, money: money, wireMoney: wireMoney, num: num, bad: bad, kycForm: kycForm };
})();
