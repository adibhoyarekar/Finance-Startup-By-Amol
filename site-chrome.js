/* RAVEN site chrome: contact strip above the header and a full navigation bar on desktop.
   (The hamburger menu from mobile-nav.js still handles phones and tablets.) */
(function () {
  var header = document.querySelector('header');
  if (!header) return;

  var bar = document.createElement('div');
  bar.className = 'topbar';
  bar.innerHTML =
    '<div class="topbar-in">' +
      '<a href="mailto:hello@raven.business">hello@raven.business</a>' +
      '<span class="topbar-mid">Chhatrapati Sambhajinagar &amp; Pune, India</span>' +
      '<span class="topbar-end">Build. Fund. Brand. Grow.</span>' +
    '</div>';
  header.parentNode.insertBefore(bar, header);

  var path = location.pathname.split('/').pop() || 'index.html';
  if (path.indexOf('.') === -1) path += '.html';
  var items = [
    ['Home', 'index.html', ['index.html']],
    ['Funding & Loans', 'funding-loans.html', ['funding-loans.html', 'home-loans.html']],
    ['Registration', 'registration.html', ['registration.html']],
    ['Contact', 'contact.html', ['contact.html']]
  ];
  var nav = document.createElement('nav');
  nav.className = 'dnav';
  nav.setAttribute('aria-label', 'Main');
  nav.innerHTML = items.map(function (it) {
    var on = it[2].indexOf(path) !== -1;
    return '<a href="' + it[1] + '"' + (on ? ' class="on" aria-current="page"' : '') + '>' + it[0].replace('&', '&amp;') + '</a>';
  }).join('') + '<a class="dcta" href="contact.html">Contact Us</a>';

  var root = document.getElementById('mobile-nav-root');
  if (root && root.parentNode) root.parentNode.insertBefore(nav, root);
})();
