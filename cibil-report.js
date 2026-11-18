/* CredMates credit report: on-screen view, PDF download and share links (used by cibil-score.html and the Quick Tools modal) */
(function () {
  'use strict';

  var SAMPLE = true; // demo data until the bureau API is connected; set to false to drop the "sample" labels

  var BUREAUS = {
    crif: { name: 'CRIF High Mark', label: 'CRIF CIBIL' },
    transunion: { name: 'TransUnion CIBIL', label: 'TransUnion CIBIL' }
  };
  var BANDS = [
    { min: 750, label: 'Excellent', color: '#16a34a', bg: '#e6f7ec' },
    { min: 650, label: 'Good', color: '#65a30d', bg: '#f0f9e0' },
    { min: 550, label: 'Fair', color: '#ea580c', bg: '#fff0e6' },
    { min: 0, label: 'Poor', color: '#dc2626', bg: '#fee2e2' }
  ];
  var LENDERS = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Bajaj Finance', 'Kotak Mahindra Bank'];
  var TYPES = [
    { t: 'Credit card', card: true }, { t: 'Personal loan' }, { t: 'Home loan', big: true },
    { t: 'Auto loan' }, { t: 'Consumer durable loan' }
  ];

  function bandOf(score) { for (var i = 0; i < BANDS.length; i++) if (score >= BANDS[i].min) return BANDS[i]; return BANDS[3]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inr(n) { return 'Rs. ' + Number(n).toLocaleString('en-IN'); }
  function rupee(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function fmtDate(d) { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function fmtDateTime(d) { return fmtDate(d) + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); }
  function maskPan(p) { p = String(p || ''); return p.length === 10 ? p.slice(0, 5) + '****' + p.slice(9) : p; }
  function maskPhone(p) { p = String(p || ''); return p.length === 10 ? '+91 ' + p.slice(0, 2) + '••••••' + p.slice(8) : p; }

  function seeded(str) {
    var h = 1779033703 ^ str.length, i;
    for (i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    var a = h >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function build(o) {
    var keys = o.bureau === 'both' ? ['crif', 'transunion'] : [o.bureau === 'transunion' ? 'transunion' : 'crif'];
    var r = seeded(o.refId + '|' + o.pan);
    var base = 660 + Math.floor(r() * 170);
    var reports = keys.map(function (k, i) {
      var score = Math.max(300, Math.min(900, base + (i ? Math.round((r() - 0.5) * 24) : 0)));
      var onTime = 90 + Math.floor(r() * 10), util = 8 + Math.floor(r() * 55), age = 2 + Math.floor(r() * 9), enq = Math.floor(r() * 5);
      var pool = TYPES.slice(), accounts = [];
      for (var n = 0; n < 3; n++) {
        var ty = pool.splice(Math.floor(r() * pool.length), 1)[0];
        var sanction = ty.card ? (50 + Math.floor(r() * 450)) * 1000 : ty.big ? (15 + Math.floor(r() * 35)) * 100000 : (1 + Math.floor(r() * 12)) * 100000;
        var out = Math.round(sanction * (ty.card ? util / 100 : 0.2 + r() * 0.6) / 1000) * 1000;
        accounts.push({ type: ty.t, lender: LENDERS[Math.floor(r() * LENDERS.length)], opened: 2016 + Math.floor(r() * 9), sanction: sanction, outstanding: out, status: n === 2 && r() > 0.6 ? 'Closed' : 'Active' });
      }
      return {
        key: k, name: BUREAUS[k].name, label: BUREAUS[k].label, score: score, band: bandOf(score), enquiries: enq, accounts: accounts,
        factors: [
          { label: 'Payment history', value: onTime + '% on time', ok: onTime >= 95 },
          { label: 'Credit utilisation', value: util + '%', ok: util <= 30 },
          { label: 'Credit age', value: age + ' years', ok: age >= 5 },
          { label: 'Enquiries (12 months)', value: String(enq), ok: enq <= 2 }
        ]
      };
    });
    return {
      sample: SAMPLE, reportId: 'CMR-' + String(o.refId).replace(/\D/g, ''), refId: o.refId, name: o.name, pan: o.pan, phone: o.phone,
      amount: o.amount, method: o.method, paidAt: o.paidAt, bureau: o.bureau, reports: reports
    };
  }

  /* ---------- on-screen report ---------- */
  function sectionHtml(rep) {
    var pct = Math.max(0, Math.min(100, (rep.score - 300) / 6));
    return '<section class="cmr-sec">' +
      '<header><h4>' + esc(rep.label) + '</h4><span class="cmr-band" style="color:' + rep.band.color + ';background:' + rep.band.bg + '">' + rep.band.label + '</span></header>' +
      '<div class="cmr-score"><b style="color:' + rep.band.color + '">' + rep.score + '</b><span>out of 900</span></div>' +
      '<div class="cmr-bar"><i style="left:' + pct.toFixed(1) + '%"></i></div>' +
      '<div class="cmr-scale"><span style="width:41.5%">Poor</span><span style="width:16.8%">Fair</span><span style="width:16.7%">Good</span><span style="width:25%">Excellent</span></div>' +
      '<h5>Score factors</h5><ul class="cmr-fac">' + rep.factors.map(function (f) {
        return '<li><span>' + esc(f.label) + '</span><b>' + esc(f.value) + '</b><em class="' + (f.ok ? 'ok' : 'warn') + '">' + (f.ok ? 'Good' : 'Needs care') + '</em></li>';
      }).join('') + '</ul>' +
      '<h5>Accounts</h5><div class="cmr-acc">' + rep.accounts.map(function (a) {
        return '<div><div class="cmr-acc-h"><b>' + esc(a.type) + '</b><em class="' + (a.status === 'Active' ? 'ok' : 'off') + '">' + a.status + '</em></div>' +
          '<span>' + esc(a.lender) + ' · Opened ' + a.opened + '</span>' +
          '<div class="cmr-acc-n"><span>Limit / loan <b>' + rupee(a.sanction) + '</b></span><span>Outstanding <b>' + rupee(a.outstanding) + '</b></span></div></div>';
      }).join('') + '</div>' +
      '<p class="cmr-enq">Credit enquiries in the last 12 months: <b>' + rep.enquiries + '</b></p></section>';
  }

  function renderHTML(d) {
    return '<div class="cmr">' +
      (d.sample ? '<div class="cmr-sample"><b>Sample report</b><span>Demo data for preview. This is not your real credit report.</span></div>' : '') +
      '<div class="cmr-top"><h3>Credit Report</h3><span>Report ID ' + esc(d.reportId) + ' · ' + fmtDate(d.paidAt) + '</span></div>' +
      '<dl class="cmr-id"><div><dt>Name</dt><dd>' + esc(d.name) + '</dd></div><div><dt>PAN</dt><dd>' + esc(maskPan(d.pan)) + '</dd></div>' +
      '<div><dt>Mobile</dt><dd>' + esc(maskPhone(d.phone)) + '</dd></div><div><dt>Payment ID</dt><dd>' + esc(d.refId) + '</dd></div></dl>' +
      d.reports.map(sectionHtml).join('') +
      '<p class="cmr-note">Scores range from 300 to 900. A higher score means a stronger credit profile. Check-ups like this one are soft enquiries and do not affect your score.</p></div>';
  }

  /* ---------- PDF (built by hand, no libraries) ---------- */
  function pdfBytes(d) {
    var W = 595, H = 842, M = 40, ops, pages = [];
    function ascii(s) { return String(s).replace(/₹/g, 'Rs.').replace(/[–—]/g, '-').replace(/[•·]/g, '-').replace(/[^\x20-\x7e]/g, '?'); }
    function pesc(s) { return ascii(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
    function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return (v / 255).toFixed(3); }).join(' '); }
    function T(x, y, s, size, bold, color) { ops.push('BT /F' + (bold ? 2 : 1) + ' ' + size + ' Tf ' + rgb(color || '#0f172a') + ' rg ' + x + ' ' + (H - y) + ' Td (' + pesc(s) + ') Tj ET'); }
    function R(x, y, w, h, fill) { ops.push(rgb(fill) + ' rg ' + x + ' ' + (H - y - h) + ' ' + w + ' ' + h + ' re f'); }
    function L(x1, y1, x2, y2, color) { ops.push(rgb(color) + ' RG 0.6 w ' + x1 + ' ' + (H - y1) + ' m ' + x2 + ' ' + (H - y2) + ' l S'); }

    d.reports.forEach(function (rep, pi) {
      ops = [];
      R(0, 0, W, 66, '#0b2b5e');
      T(M, 32, 'CredMates', 20, true, '#ffffff'); T(M, 50, 'Credit Report', 10, false, '#bfdbfe');
      T(380, 32, 'Report ID: ' + d.reportId, 9, true, '#ffffff'); T(380, 48, 'Generated: ' + fmtDate(d.paidAt), 9, false, '#bfdbfe');
      var y = 84;
      if (d.sample) { R(M, y, W - 2 * M, 24, '#fef3c7'); T(M + 10, y + 16, 'SAMPLE REPORT - demo data for preview. This is not your real credit report.', 9, true, '#92400e'); y += 40; }

      var id = [['Name', d.name], ['PAN', maskPan(d.pan)], ['Mobile', d.phone ? '+91 ' + String(d.phone).slice(0, 2) + '******' + String(d.phone).slice(8) : ''],
        ['Payment ID', d.refId], ['Payment status', 'Paid'], ['Amount paid', 'Rs.' + d.amount + ' via ' + d.method]];
      id.forEach(function (f, i) {
        var cx = M + (i % 3) * 175, cy = y + Math.floor(i / 3) * 40;
        T(cx, cy + 8, f[0].toUpperCase(), 7.5, true, '#64748b'); T(cx, cy + 24, f[1] || '-', 10.5, true, f[0] === 'Payment status' ? '#16a34a' : '#0f172a');
      });
      y += 90; L(M, y, W - M, y, '#e2e8f0'); y += 26;

      T(M, y, rep.label, 15, true, '#0b2b5e');
      R(M + 150, y - 12, 62, 17, rep.band.bg); T(M + 158, y + 0.5, rep.band.label.toUpperCase(), 8.5, true, rep.band.color);
      T(M, y + 56, String(rep.score), 44, true, rep.band.color); T(M + 108, y + 56, 'out of 900', 10, false, '#64748b');
      var bx = M, bw = W - 2 * M, by = y + 76, segs = [['#dc2626', 0.415, 'Poor'], ['#ea580c', 0.168, 'Fair'], ['#65a30d', 0.167, 'Good'], ['#16a34a', 0.25, 'Excellent']], sx = bx;
      segs.forEach(function (s) { R(sx, by, bw * s[1] - 1.5, 9, s[0]); T(sx, by + 22, s[2], 8, false, '#64748b'); sx += bw * s[1]; });
      var mx = bx + bw * Math.max(0, Math.min(1, (rep.score - 300) / 600));
      R(mx - 2, by - 5, 4, 19, '#0f172a');
      y = by + 52;

      T(M, y, 'Score factors', 11.5, true, '#0b2b5e'); y += 10; L(M, y, W - M, y, '#e2e8f0');
      rep.factors.forEach(function (f) {
        y += 21; T(M + 4, y, f.label, 10, false, '#334155'); T(M + 250, y, f.value, 10, true); T(M + 400, y, f.ok ? 'Good' : 'Needs care', 10, true, f.ok ? '#16a34a' : '#ea580c');
      });
      y += 34; T(M, y, 'Accounts', 11.5, true, '#0b2b5e'); y += 10;
      R(M, y, W - 2 * M, 20, '#f1f5f9');
      [['Type', 6], ['Lender', 120], ['Opened', 250], ['Limit / loan', 300], ['Outstanding', 395], ['Status', 480]].forEach(function (c) { T(M + c[1], y + 14, c[0], 8.5, true, '#475569'); });
      rep.accounts.forEach(function (a) {
        y += 24;
        T(M + 6, y + 10, a.type, 9, false); T(M + 120, y + 10, a.lender, 9, false); T(M + 250, y + 10, String(a.opened), 9, false);
        T(M + 300, y + 10, inr(a.sanction), 9, false); T(M + 395, y + 10, inr(a.outstanding), 9, false); T(M + 480, y + 10, a.status, 9, true, a.status === 'Active' ? '#16a34a' : '#64748b');
        L(M, y + 18, W - M, y + 18, '#eef2f7');
      });
      y += 42; T(M, y, 'Credit enquiries in the last 12 months: ' + rep.enquiries, 10, false, '#334155');

      L(M, 790, W - M, 790, '#e2e8f0');
      T(M, 805, 'Scores range from 300 to 900. This check is a soft enquiry and does not affect your score.' + (d.sample ? ' Sample data.' : ''), 7.5, false, '#64748b');
      T(W - M - 40, 805, 'Page ' + (pi + 1) + ' of ' + d.reports.length, 7.5, false, '#64748b');
      pages.push(ops.join('\n'));
    });

    var out = '%PDF-1.4\n', offs = [], n = 4 + pages.length * 2;
    function obj(id, body) { offs[id] = out.length; out += id + ' 0 obj\n' + body + '\nendobj\n'; }
    var kids = pages.map(function (_, i) { return (5 + i * 2) + ' 0 R'; }).join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>');
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    pages.forEach(function (c, i) {
      obj(5 + i * 2, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (6 + i * 2) + ' 0 R >>');
      obj(6 + i * 2, '<< /Length ' + c.length + ' >>\nstream\n' + c + '\nendstream');
    });
    var xref = out.length;
    out += 'xref\n0 ' + (n + 1) + '\n0000000000 65535 f \n';
    for (var i = 1; i <= n; i++) out += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<< /Size ' + (n + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    return out;
  }

  function download(d) {
    var url = URL.createObjectURL(new Blob([pdfBytes(d)], { type: 'application/pdf' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'CredMates-Credit-Report-' + d.refId + '.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- share ---------- */
  function summary(d) {
    var lines = ['CredMates credit report' + (d.sample ? ' (sample)' : ''), 'Report ID: ' + d.reportId];
    d.reports.forEach(function (r) { lines.push(r.label + ' score: ' + r.score + ' (' + r.band.label + ')'); });
    lines.push('Payment ID: ' + d.refId + ' - Paid Rs.' + d.amount);
    return lines.join('\n');
  }

  /* ---------- wiring ---------- */
  function mount(root, d) {
    function q(k) { return root.querySelector('[data-cmr="' + k + '"]'); }
    var view = q('view'), dl = q('download'), wa = q('wa'), mail = q('mail'), panel = q('panel');
    if (!view || !panel) return;
    var label = view.querySelector('[data-cmr-label]');
    function setOpen(open) {
      panel.hidden = !open;
      panel.innerHTML = open ? renderHTML(d) : '';
      view.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) label.textContent = open ? 'Hide report' : 'View report';
    }
    setOpen(false);
    view.onclick = function () {
      var open = panel.hidden; setOpen(open);
      if (open) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (dl) dl.onclick = function () { download(d); };
    var text = summary(d);
    if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(text);
    if (mail) mail.href = 'mailto:?subject=' + encodeURIComponent('My credit report - ' + d.reportId) + '&body=' + encodeURIComponent(text + '\n\n(Attach the PDF you downloaded for the full report.)');
  }

  var css = '' +
    '.cmr-actions{display:flex;flex-direction:column;gap:12px;margin:0 0 16px;text-align:left}' +
    '.cmr-act-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.cmr-btn{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 12px;border-radius:12px;border:1.5px solid #cfdcf2;background:#fff;color:#0b2b5e;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;transition:all .18s ease}' +
    '.cmr-btn:hover{border-color:#93c5fd;background:#f8fbff;transform:translateY(-1px)}' +
    '.cmr-btn.is-primary{background:linear-gradient(135deg,#0b2b5e,#1d4ed8);border-color:transparent;color:#fff;box-shadow:0 10px 22px -10px rgba(29,78,216,.6)}' +
    '.cmr-btn.is-primary:hover{filter:brightness(1.08)}' +
    '.cmr-share{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}' +
    '.cmr-share>span{font-size:12.5px;font-weight:600;color:#64748b}' +
    '.cmr-link{display:inline-flex;align-items:center;gap:7px;min-height:42px;padding:0 16px;border-radius:999px;font-size:13.5px;font-weight:700;text-decoration:none;border:1.5px solid transparent;transition:filter .18s}' +
    '.cmr-link:hover{filter:brightness(.96)}' +
    '.cmr-link.is-wa{background:#e8f9ee;color:#15803d;border-color:#bbf0cd}' +
    '.cmr-link.is-mail{background:#e8efff;color:#1d4ed8;border-color:#c9d9fb}' +
    '.cmr-panel{border:1.5px solid #e2e8f0;border-radius:14px;background:#fff;overflow:hidden}' +
    '.cmr-panel[hidden]{display:none}' +
    '.cmr{padding:16px;font-size:13px;color:#0f172a}' +
    '.cmr-sample{display:flex;flex-direction:column;gap:2px;padding:10px 12px;margin-bottom:14px;border-radius:10px;background:#fef3c7;color:#92400e;font-size:12.5px;line-height:1.4}' +
    '.cmr-top{display:flex;flex-direction:column;gap:2px;margin-bottom:12px}' +
    '.cmr-top h3{margin:0;font-size:18px;font-weight:800;color:#0b2b5e}' +
    '.cmr-top span{font-size:12px;color:#64748b}' +
    '.cmr-id{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;margin:0 0 16px;padding:12px;border-radius:12px;background:#f8fafc;border:1px solid #e8eef6}' +
    '.cmr-id dt{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#64748b}' +
    '.cmr-id dd{margin:2px 0 0;font-size:13.5px;font-weight:700;word-break:break-word}' +
    '.cmr-sec{padding:14px 0;border-top:1px solid #e8eef6}' +
    '.cmr-sec header{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '.cmr-sec h4{margin:0;font-size:16px;font-weight:800;color:#0b2b5e}' +
    '.cmr-band{padding:3px 12px;border-radius:999px;font-size:12px;font-weight:800}' +
    '.cmr-score{display:flex;align-items:baseline;gap:8px;margin:6px 0 10px}' +
    '.cmr-score b{font-size:46px;font-weight:800;line-height:1;letter-spacing:-.03em}' +
    '.cmr-score span{font-size:12.5px;color:#64748b}' +
    '.cmr-bar{position:relative;height:10px;border-radius:99px;background:linear-gradient(90deg,#dc2626 0 41.5%,#ea580c 41.5% 58.3%,#65a30d 58.3% 75%,#16a34a 75% 100%)}' +
    '.cmr-bar i{position:absolute;top:-5px;width:4px;height:20px;margin-left:-2px;border-radius:3px;background:#0f172a;box-shadow:0 0 0 2px #fff}' +
    '.cmr-scale{display:flex;margin:6px 0 14px;font-size:10.5px;color:#64748b}' +
    '.cmr-sec h5{margin:14px 0 6px;font-size:13px;font-weight:800;color:#0b2b5e}' +
    '.cmr-fac{list-style:none;margin:0;padding:0}' +
    '.cmr-fac li{display:grid;grid-template-columns:1fr auto 84px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #eef2f7}' +
    '.cmr-fac li span{color:#475569}' +
    '.cmr-fac em,.cmr-acc em{font-style:normal;font-size:11.5px;font-weight:700;text-align:right}' +
    '.cmr-fac em.ok,.cmr-acc em.ok{color:#16a34a}.cmr-fac em.warn{color:#ea580c}.cmr-acc em.off{color:#64748b}' +
    '.cmr-acc{display:grid;gap:8px}' +
    '.cmr-acc>div{padding:10px 12px;border:1px solid #e8eef6;border-radius:10px;background:#fbfdff}' +
    '.cmr-acc-h{display:flex;justify-content:space-between;align-items:center}' +
    '.cmr-acc>div>span{display:block;margin:1px 0 6px;font-size:12px;color:#64748b}' +
    '.cmr-acc-n{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#64748b}' +
    '.cmr-acc-n b{color:#0f172a}' +
    '.cmr-enq{margin:12px 0 0;font-size:12.5px;color:#475569}' +
    '.cmr-note{margin:6px 0 0;padding-top:12px;border-top:1px solid #e8eef6;font-size:11.5px;line-height:1.5;color:#64748b}' +
    '@media(min-width:560px){.cmr-id{grid-template-columns:repeat(4,1fr)}}';
  var st = document.createElement('style'); st.id = 'cmr-styles'; st.textContent = css; document.head.appendChild(st);

  window.CMReport = { build: build, mount: mount, fmtDateTime: fmtDateTime, pdf: pdfBytes, render: renderHTML };
})();
