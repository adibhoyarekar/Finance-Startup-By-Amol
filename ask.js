/* RAVEN full-page "Ask a question" chat (design only - no backend yet).
   Layout: avatar above each message, assistant messages carry Retry / Like / Dislike / Copy / Share actions. */
(function () {
  var body = document.getElementById('ask-body');
  var chips = document.getElementById('ask-chips');
  var form = document.getElementById('ask-form');
  var input = document.getElementById('ask-input');

  var AVATAR = { user: 'images/avatar-amit.svg', bot: 'images/logo-mark.svg' };
  var NAME = { user: 'You', bot: 'RAVEN Assistant' };
  var REPLY = 'Thanks for your question! Our AI assistant is coming soon. Meanwhile, our team will be happy to help - please reach us via the Contact page.';
  var lastQuestion = '';

  function ico(path) {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }
  var ACTIONS = [
    { id: 'retry', label: 'Retry', svg: ico('<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>') },
    { id: 'like', label: 'Like', svg: ico('<path d="M7 10v11"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.5l-1.7 7A2 2 0 0 1 18.1 21H7V10l4-8a2.4 2.4 0 0 1 4 3.9z"/><path d="M3 10h4v11H3z"/>') },
    { id: 'dislike', label: 'Dislike', svg: ico('<path d="M17 14V3"/><path d="M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.5l1.7-7A2 2 0 0 1 5.9 3H17v11l-4 8a2.4 2.4 0 0 1-4-3.9z"/><path d="M21 14h-4V3h4z"/>') },
    { id: 'copy', label: 'Copy', svg: ico('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>') },
    { id: 'share', label: 'Share', svg: ico('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>') }
  ];

  function flash(btn, text) {
    var old = btn.getAttribute('data-label');
    btn.setAttribute('data-label', text);
    setTimeout(function () { btn.setAttribute('data-label', old); }, 1400);
  }

  function copyText(t, btn) {
    function done() { flash(btn, 'Copied'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove(); done();
    }
  }

  function onAction(id, btn, row, text) {
    if (id === 'like' || id === 'dislike') {
      var on = !btn.classList.contains('is-on');
      Array.prototype.forEach.call(row.querySelectorAll('[data-act=like],[data-act=dislike]'), function (b) { b.classList.remove('is-on'); });
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    } else if (id === 'copy') {
      copyText(text, btn);
    } else if (id === 'share') {
      if (navigator.share) { navigator.share({ title: 'RAVEN', text: text, url: location.href }).catch(function () {}); }
      else { copyText(text, btn); flash(btn, 'Copied'); }
    } else if (id === 'retry') {
      row.remove();
      reply();
    }
  }

  function add(text, who) {
    var row = document.createElement('div');
    row.className = 'ask-row ' + who;
    var img = document.createElement('img');
    img.className = 'ask-ava';
    img.src = AVATAR[who]; img.alt = NAME[who]; img.width = 32; img.height = 32;
    var msg = document.createElement('div');
    msg.className = 'ask-msg ' + who;
    msg.textContent = text;
    row.appendChild(img);
    row.appendChild(msg);
    if (who === 'bot') {
      var bar = document.createElement('div');
      bar.className = 'ask-actions';
      ACTIONS.forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ask-act';
        b.setAttribute('data-act', a.id);
        b.setAttribute('data-label', a.label);
        b.setAttribute('aria-label', a.label);
        b.innerHTML = a.svg;
        b.addEventListener('click', function () { onAction(a.id, b, row, text); });
        bar.appendChild(b);
      });
      row.appendChild(bar);
    }
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  function reply() {
    setTimeout(function () { add(REPLY, 'bot'); }, 600);
  }

  function ask(q) {
    chips.innerHTML = '';
    lastQuestion = q;
    add(q, 'user');
    reply();
  }

  add("Hi! I'm the RAVEN assistant. How can I help you today?", 'bot');
  ['Which loan is right for me?', 'How do I register my business?', 'Tell me about insurance', 'Talk to an expert'].forEach(function (t) {
    var c = document.createElement('button');
    c.type = 'button';
    c.className = 'ask-chip';
    c.textContent = t;
    c.addEventListener('click', function () { ask(t); });
    chips.appendChild(c);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    input.value = '';
    ask(q);
  });
  input.focus();
})();
