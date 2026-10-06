/* RAVEN "Ask a question" floating button - opens the full-page chat (ask.html) */
(function () {
  if (/(^|\/)ask(\.html)?$/.test(location.pathname)) return;
  var DESKTOP = '(min-width:900px)';

  var style = document.createElement('style');
  style.textContent = '\
.rv-chat-btn{position:fixed;right:1.25rem;bottom:1.25rem;z-index:60;display:flex;align-items:center;gap:.6rem;height:52px;padding:0 1.25rem;border-radius:14px;border:1px solid rgba(255,255,255,.22);background:#101828;color:#fff;font:500 .95rem/1 Geist,Inter,system-ui,sans-serif;text-decoration:none;box-shadow:0 14px 34px -12px rgba(16,24,40,.55);transition:transform .3s ease,background .3s ease}\
.rv-chat-btn:hover{transform:translateY(-2px);background:#625fff}\
.rv-chat-btn svg{width:20px;height:20px}\
@media(max-width:639px){.rv-chat-btn{right:1rem;bottom:1rem;height:48px;padding:0 1.1rem}}\
.rv-chat-btn[hidden]{display:none}\
html{--chat-w:50vw}\
html.rv-split{overflow:hidden}\
html.rv-split body{width:calc(100vw - var(--chat-w));height:100vh;overflow-x:hidden;overflow-y:auto}\
body{transition:width .3s ease}\
html.rv-split header.z-50{right:var(--chat-w);width:auto}\
.rv-chat-panel{position:fixed;top:0;right:0;bottom:0;z-index:70;width:var(--chat-w);display:flex;flex-direction:column;background:#fff;border-left:1px solid #e5e7eb;transform:translateX(100%);transition:transform .3s ease;pointer-events:none}\
.rv-chat-panel.is-open{transform:none;pointer-events:auto}\
.rv-chat-top{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.7rem .9rem .7rem 1.1rem;background:#101828;color:#fff;font:500 .95rem/1 Geist,Inter,system-ui,sans-serif}\
.rv-chat-top a,.rv-chat-top button{color:#fff;opacity:.8;font:inherit;font-size:.8rem;background:none;border:0;cursor:pointer;text-decoration:none}\
.rv-chat-top a:hover,.rv-chat-top button:hover{opacity:1}\
.rv-chat-x{width:28px;height:28px;border-radius:8px;font-size:1.1rem!important;line-height:1}\
.rv-chat-x:hover{background:rgba(255,255,255,.15)}\
.rv-chat-panel iframe{flex:1;width:100%;border:0;background:#fff}';
  document.head.appendChild(style);

  var a = document.createElement('a');
  a.className = 'rv-chat-btn';
  a.href = 'ask.html';
  a.setAttribute('aria-label', 'Ask a question');
  a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg><span>Ask a question</span>';
  document.body.appendChild(a);

  /* Desktop: open the chat in a corner panel. Mobile: follow the link to the full page. */
  var panel = null;
  var root = document.documentElement;
  function openPanel() {
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'rv-chat-panel';
      panel.setAttribute('role', 'complementary');
      panel.setAttribute('aria-label', 'Ask a question');
      panel.innerHTML = '<div class="rv-chat-top"><span>RAVEN Assistant</span><span><a href="ask.html">Open full page</a> <button type="button" class="rv-chat-x" aria-label="Close chat">&times;</button></span></div><iframe title="Ask a question" src="ask.html?embed=1"></iframe>';
      document.body.appendChild(panel);
      panel.querySelector('.rv-chat-x').addEventListener('click', closePanel);
    }
    a.hidden = true;
    var y = window.scrollY;
    root.classList.add('rv-split');
    document.body.scrollTop = y;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
  }
  function closePanel() {
    if (!panel || !root.classList.contains('rv-split')) return;
    var y = document.body.scrollTop;
    panel.classList.remove('is-open');
    root.classList.remove('rv-split');
    window.scrollTo(0, y);
    a.hidden = false;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href="ask.html"]');
    if (!link || !window.matchMedia(DESKTOP).matches) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (link.closest('.rv-chat-panel')) return;
    e.preventDefault();
    openPanel();
  });
})();
