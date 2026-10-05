/* RAVEN "Ask a question" floating button - opens the full-page chat (ask.html) */
(function () {
  if (/(^|\/)ask(\.html)?$/.test(location.pathname)) return;

  var style = document.createElement('style');
  style.textContent = '\
.rv-chat-btn{position:fixed;right:1.25rem;bottom:1.25rem;z-index:60;display:flex;align-items:center;gap:.6rem;height:56px;padding:0 1.25rem;border-radius:9999px;background:#000;color:#fff;font:500 .95rem/1 Inter,system-ui,sans-serif;text-decoration:none;box-shadow:0 12px 30px -10px rgba(0,0,0,.5);transition:transform .3s ease,background .3s ease}\
.rv-chat-btn:hover{transform:translateY(-2px);background:#222}\
.rv-chat-btn svg{width:20px;height:20px}\
@media(max-width:639px){.rv-chat-btn{right:1rem;bottom:1rem;height:52px;padding:0 1.1rem}}';
  document.head.appendChild(style);

  var a = document.createElement('a');
  a.className = 'rv-chat-btn';
  a.href = 'ask.html';
  a.setAttribute('aria-label', 'Ask a question');
  a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg><span>Ask a question</span>';
  document.body.appendChild(a);
})();
