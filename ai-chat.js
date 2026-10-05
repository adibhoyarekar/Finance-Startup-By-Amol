/* RAVEN "Ask a question" AI chat widget (design only - no backend yet) */
(function () {
  var css = '\
.rv-chat-btn{position:fixed;right:1.25rem;bottom:1.25rem;z-index:60;display:flex;align-items:center;gap:.6rem;height:56px;padding:0 1.25rem;border:0;border-radius:9999px;background:#000;color:#fff;font:500 .95rem/1 Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 12px 30px -10px rgba(0,0,0,.5);transition:transform .3s ease,background .3s ease}\
.rv-chat-btn:hover{transform:translateY(-2px);background:#222}\
.rv-chat-btn svg{width:20px;height:20px}\
.rv-chat-panel{position:fixed;right:1.25rem;bottom:5.5rem;z-index:61;width:min(380px,calc(100vw - 2rem));height:min(560px,calc(100vh - 7.5rem));display:flex;flex-direction:column;background:#fff;color:#000;border:1px solid #e5e5e5;border-radius:1.5rem;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);font-family:Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .25s ease,transform .25s ease}\
.rv-chat-panel.open{opacity:1;transform:none;pointer-events:auto}\
.rv-chat-head{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;background:#000;color:#fff}\
.rv-chat-head b{display:block;font-weight:500;font-size:1rem}\
.rv-chat-head span{font-size:.75rem;color:#a3a3a3}\
.rv-chat-x{background:none;border:0;color:#fff;font-size:1.5rem;line-height:1;cursor:pointer}\
.rv-chat-body{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.75rem;background:#fafafa}\
.rv-msg{max-width:85%;padding:.7rem .95rem;border-radius:1.1rem;font-size:.9rem;line-height:1.5}\
.rv-msg.bot{align-self:flex-start;background:#fff;border:1px solid #e5e5e5;border-bottom-left-radius:.3rem}\
.rv-msg.user{align-self:flex-end;background:#000;color:#fff;border-bottom-right-radius:.3rem}\
.rv-chips{display:flex;flex-wrap:wrap;gap:.5rem}\
.rv-chip{border:1px solid #000;background:#fff;color:#000;border-radius:9999px;padding:.4rem .8rem;font-size:.8rem;cursor:pointer;transition:background .2s,color .2s}\
.rv-chip:hover{background:#000;color:#fff}\
.rv-chat-form{display:flex;gap:.5rem;padding:.75rem;border-top:1px solid #e5e5e5;background:#fff}\
.rv-chat-form input{flex:1;min-width:0;height:44px;padding:0 1rem;border:1px solid #d4d4d4;border-radius:9999px;font:inherit;font-size:.9rem;outline:none}\
.rv-chat-form input:focus{border-color:#000}\
.rv-chat-form button{width:44px;height:44px;border:0;border-radius:9999px;background:#000;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}\
@media(max-width:639px){.rv-chat-btn{right:1rem;bottom:1rem;height:52px;padding:0 1.1rem}.rv-chat-panel{right:1rem;bottom:4.75rem}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>';
  var send = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  var btn = document.createElement('button');
  btn.className = 'rv-chat-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Ask a question');
  btn.innerHTML = icon + '<span>Ask a question</span>';

  var panel = document.createElement('div');
  panel.className = 'rv-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'RAVEN AI assistant');
  panel.innerHTML =
    '<div class="rv-chat-head"><div><b>RAVEN Assistant</b><span>Ask about loans, registration &amp; more</span></div>' +
    '<button class="rv-chat-x" type="button" aria-label="Close chat">&times;</button></div>' +
    '<div class="rv-chat-body"></div>' +
    '<form class="rv-chat-form"><input type="text" placeholder="Type your question..." aria-label="Your question" autocomplete="off">' +
    '<button type="submit" aria-label="Send">' + send + '</button></form>';

  document.body.appendChild(panel);
  document.body.appendChild(btn);

  var body = panel.querySelector('.rv-chat-body');
  var form = panel.querySelector('form');
  var input = form.querySelector('input');

  function add(text, who) {
    var m = document.createElement('div');
    m.className = 'rv-msg ' + who;
    m.textContent = text;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
  }

  function ask(q) {
    add(q, 'user');
    setTimeout(function () {
      add('Thanks for your question! Our AI assistant is coming soon. Meanwhile, our team will be happy to help - please reach us via the Contact page.', 'bot');
    }, 600);
  }

  add('Hi! I\'m the RAVEN assistant. How can I help you today?', 'bot');
  var chips = document.createElement('div');
  chips.className = 'rv-chips';
  ['Which loan is right for me?', 'How do I register my business?', 'Talk to an expert'].forEach(function (t) {
    var c = document.createElement('button');
    c.type = 'button';
    c.className = 'rv-chip';
    c.textContent = t;
    c.addEventListener('click', function () { chips.remove(); ask(t); });
    chips.appendChild(c);
  });
  body.appendChild(chips);

  function toggle(open) {
    panel.classList.toggle('open', open);
    if (open) setTimeout(function () { input.focus(); }, 250);
  }
  btn.addEventListener('click', function () { toggle(!panel.classList.contains('open')); });
  panel.querySelector('.rv-chat-x').addEventListener('click', function () { toggle(false); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    input.value = '';
    if (chips.parentNode) chips.remove();
    ask(q);
  });
})();
