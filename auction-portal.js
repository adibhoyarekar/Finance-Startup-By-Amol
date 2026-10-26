/* Shared building blocks for the auction portals (bidder, bank, admin):
   shell wiring, page headers, KPI tiles, responsive tables, pills and CSV export. */
(function () {
  var App = window.RavenApp, UI = window.RavenUI, esc = App.esc, ic = UI.icon;
  var $ = function (id) { return document.getElementById(id); };

  // name/role in the sidebar, logout, the phone "More" menu and hash routing
  function init(o) {
    $('me-avatar').innerHTML = UI.avatar(o.initials || o.name, 'is-sm');
    $('me-name').textContent = o.name;
    $('me-role').textContent = o.role;
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-logout]')) { if (o.leave) o.leave(); else location.href = 'auctions.html'; }
      if (e.target.closest('[data-more]')) {
        var links = Array.prototype.map.call(document.querySelectorAll('.ap-side .ap-nav a'), function (a) {
          return '<a class="ap-li is-click" style="text-decoration:none;color:inherit" href="' + a.getAttribute('href') + '">' + a.querySelector('svg').outerHTML + '<span class="tx"><strong>' + esc(a.getAttribute('data-title') || a.textContent.trim()) + '</strong></span></a>';
        }).join('');
        var dr = UI.openDrawer({ title: 'Menu', body: '<div class="ap-list">' + links + '</div>' });
        dr.querySelectorAll('.ap-dbody a').forEach(function (a) { a.addEventListener('click', function () { UI.closeDrawer(); }); });
      }
    });
    UI.router(o.def || 'overview', function (v, h) {
      document.querySelectorAll('.ap-view.is-static').forEach(function (x) { x.classList.remove('is-static'); });
      if (o.onShow) o.onShow(v, h);
    });
  }
  function head(title, sub, acts) {
    return '<div class="ap-h"><div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (acts ? '<div class="acts">' + acts + '</div>' : '') + '</div>';
  }
  function kpis(list) {
    return '<div class="ap-kpis">' + list.map(function (k, i) {
      return '<div class="ap-card ap-kpi" style="--i:' + i + '"><div class="top"><p class="l">' + k[0] + '</p><span class="ic">' + ic(k[3] || 'trend', 16) + '</span></div><p class="v">' + k[1] + '</p>' + (k[2] ? '<p class="s' + (k[4] ? ' ' + k[4] : ' is-mute') + '">' + k[2] + '</p>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function card(title, sub, body, link) {
    return '<div class="ap-card pad"><div class="ap-ch"><div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (link || '') + '</div>' + body + '</div>';
  }
  function empty(icon, title, text, btn) {
    return '<div class="ap-card ap-empty"><span class="art">' + ic(icon, 28) + '</span><h3>' + title + '</h3><p>' + text + '</p>' + (btn || '') + '</div>';
  }
  var TONE = { ok: 'st-disbursed', good: 'st-sanctioned', info: 'st-submitted', warn: 'st-docs', bad: 'st-bad', mute: 'st-closed', ind: 'st-new' };
  function pill(text, tone) { return '<span class="ap-pill ' + (TONE[tone] || 'st-closed') + '">' + esc(text) + '</span>'; }
  var PTONE = { draft: 'mute', pending: 'warn', registration: 'info', upcoming: 'ind', live: 'bad', paused: 'warn', h1: 'warn', confirmed: 'good', paid25: 'good', paid75: 'good', certificate: 'ok', unsold: 'mute', forfeited: 'bad', cancelled: 'mute' };
  function phasePill(a) { var p = window.RavenAuctions.phase(a); return pill(window.RavenAuctions.PHASE[p] || p, PTONE[p]); }

  /* table on wide screens, cards on phones. cols: [label, cls]; rows: {cells: [html], acts: html} */
  function table(cols, rows, emptyHtml) {
    if (!rows.length) return emptyHtml || '<p class="ap-muted">Nothing here yet.</p>';
    var t = '<div class="ap-card ap-tablewrap"><table class="ap-table"><thead><tr>' + cols.map(function (c) { return '<th>' + c[0] + '</th>'; }).join('') + '<th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr style="--i:' + i + ';cursor:default">' + r.cells.map(function (c, j) { return '<td class="' + (cols[j][1] || '') + '">' + c + '</td>'; }).join('') + '<td><div class="acts">' + (r.acts || '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>';
    var c = '<div class="ap-cards">' + rows.map(function (r, i) {
      return '<div class="ap-card ap-ccard" style="--i:' + i + ';cursor:default"><div class="top"><div class="tx">' + r.cells[0] + '</div></div>' +
        '<div class="ap-kv" style="margin-top:.75rem">' + r.cells.slice(1).map(function (x, j) { return '<div><small>' + cols[j + 1][0] + '</small><b>' + x + '</b></div>'; }).join('') + '</div>' +
        (r.acts ? '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.75rem">' + r.acts + '</div>' : '') + '</div>';
    }).join('') + '</div>';
    return t + c;
  }
  function nm(title, sub, avatarName) {
    return '<div class="nm">' + (avatarName ? UI.avatar(avatarName, 'is-sm') : '') + '<div style="min-width:0"><strong>' + title + '</strong>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>';
  }
  // single-series horizontal bars with the value printed on each bar
  function bars(list, fmt) {
    var max = Math.max.apply(null, list.map(function (x) { return x[1]; }).concat([1]));
    return '<div class="ap-hbars">' + list.map(function (x, i) {
      return '<div class="ap-hbar" style="--i:' + i + '"><span class="lb">' + esc(x[0]) + '</span><span class="tr"><i style="width:' + Math.max(2, x[1] / max * 100) + '%;background:' + (x[2] || '#2563eb') + '"></i></span><b>' + (fmt ? fmt(x[1]) : x[1]) + '</b></div>';
    }).join('') + '</div>';
  }
  function count(id, n, alert) { var el = $('n-' + id); if (!el) return; el.hidden = !n; el.textContent = n; el.classList.toggle('is-alert', !!alert); }
  function csv(name, rows) {
    var text = rows.map(function (r) { return r.map(function (c) { c = c == null ? '' : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    UI.toast('Downloaded ' + name);
  }
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  }
  // true when a form in the view has unsaved changes, so a live refresh would lose them
  function dirty(view) {
    if (!view) return false;
    return Array.prototype.some.call(view.querySelectorAll('form input, form textarea, form select'), function (el) {
      if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
      if (el.type === 'file') return el.files.length > 0;
      if (el.tagName === 'SELECT') { var d = Array.prototype.findIndex.call(el.options, function (o) { return o.defaultSelected; }); return el.selectedIndex !== (d < 0 ? 0 : d); }
      return el.value !== el.defaultValue;
    });
  }
  // re-render the current view when data changes in any tab, without stealing focus from a form being typed in
  function live(render) {
    var t;
    window.RavenAuctions.on(function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var a = document.activeElement;
        if (a && a.closest && a.closest('.ap-view form, .ap-drawer.is-on')) return;
        if (dirty(document.querySelector('.ap-view.is-on'))) return;
        // live refreshes should not replay the entrance animations
        var v = document.querySelector('.ap-view.is-on'); if (v) v.classList.add('is-static');
        render();
      }, 150);
    });
  }
  // confirm with an optional reason, in the drawer
  function ask(o, done) {
    var dr = UI.openDrawer({ title: o.title, body: (o.text ? '<p class="ap-muted" style="margin-bottom:1rem">' + o.text + '</p>' : '') + (o.input ? '<div class="ap-field"><label for="ask-in">' + o.input + '</label><textarea class="ap-input" id="ask-in" rows="3"></textarea><p class="ap-err" id="ask-err">' + (o.err || 'Please fill this in.') + '</p></div>' : ''),
      foot: '<button type="button" class="ap-btn" data-x>Cancel</button><button type="button" class="ap-btn ' + (o.danger ? 'is-danger' : 'is-primary') + '" data-ok>' + (o.ok || 'Confirm') + '</button>', focus: o.input ? '#ask-in' : '[data-ok]' });
    dr.querySelector('[data-x]').onclick = UI.closeDrawer;
    dr.querySelector('[data-ok]').onclick = function () {
      var v = o.input ? dr.querySelector('#ask-in').value.trim() : '';
      if (o.input && o.required && v.length < 3) { dr.querySelector('#ask-err').classList.add('is-on'); return; }
      UI.closeDrawer(); done(v);
    };
  }
  window.AP = { init: init, head: head, kpis: kpis, card: card, empty: empty, pill: pill, phasePill: phasePill, table: table, nm: nm, bars: bars, count: count, csv: csv, ago: ago, live: live, ask: ask, $: $ };
})();
