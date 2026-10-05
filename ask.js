/* RAVEN full-page "Ask a question" chat (design only - no backend yet) */
(function () {
  var body = document.getElementById('ask-body');
  var chips = document.getElementById('ask-chips');
  var form = document.getElementById('ask-form');
  var input = document.getElementById('ask-input');

  function add(text, who) {
    var m = document.createElement('div');
    m.className = 'ask-msg ' + who;
    m.textContent = text;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
  }

  function ask(q) {
    chips.innerHTML = '';
    add(q, 'user');
    setTimeout(function () {
      add('Thanks for your question! Our AI assistant is coming soon. Meanwhile, our team will be happy to help - please reach us via the Contact page.', 'bot');
    }, 600);
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
