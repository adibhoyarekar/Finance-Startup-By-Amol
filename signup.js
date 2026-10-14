/* RAVEN registration / log in page. Accounts are kept in this browser only (see raven-app.js). */
(function () {
  var App = window.RavenApp;
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.su-tab'));
  var form = document.getElementById('su-form');
  var user = document.getElementById('su-user');
  var pass = document.getElementById('su-pass');
  var pass2 = document.getElementById('su-pass2');
  var terms = document.getElementById('su-terms');
  var msg = document.getElementById('su-msg');
  var submit = document.getElementById('su-submit');
  var roles = document.getElementById('su-roles');
  var confirmWrap = document.getElementById('su-confirm-wrap');
  var termsWrap = document.getElementById('su-terms-wrap');
  var foot = document.getElementById('su-foot');
  var google = document.getElementById('su-google');
  var eye = document.getElementById('su-eye');
  var mode = 'register';

  // only follow ?next= to our own pages
  function next(u) {
    var n = App.param('next');
    return /^[a-z0-9-]+\.html$/i.test(n) && u.onboarded ? n : App.home(u);
  }

  // already logged in: show who and where to go
  var me = App.current();
  if (me) {
    var card = document.querySelector('.su-card');
    card.innerHTML = '<div class="su-in"><p class="hl-kicker">' + (me.role === 'agent' ? 'Agent account' : 'Customer account') + '</p>' +
      '<h2>You are logged in as ' + App.esc(App.displayName(me)) + '</h2>' +
      '<p>Username: ' + App.esc(me.username) + '</p>' +
      '<a class="su-submit" href="' + App.home(me) + '">' + (me.onboarded ? (me.role === 'agent' ? 'Open dashboard' : 'Open my account') : 'Finish setting up') + '</a>' +
      '<button type="button" class="su-out" id="su-out">Log out</button></div>';
    document.getElementById('su-out').addEventListener('click', function () { App.logout(); location.reload(); });
    return;
  }

  function say(text, ok) {
    msg.textContent = text;
    msg.hidden = !text;
    msg.className = 'su-msg' + (ok ? ' is-ok' : '');
  }

  function setMode(m) {
    mode = m;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-mode') === m;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var reg = m === 'register';
    roles.hidden = !reg;
    confirmWrap.hidden = !reg;
    termsWrap.hidden = !reg;
    submit.textContent = reg ? 'Create account' : 'Log in';
    pass.setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
    pass.placeholder = reg ? 'At least 8 characters' : 'Your password';
    foot.innerHTML = reg
      ? 'Already registered? <a href="#" id="su-switch">Log in</a>'
      : 'New to RAVEN? <a href="#" id="su-switch">Create an account</a>';
    say('');
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { setMode(t.getAttribute('data-mode')); });
  });
  foot.addEventListener('click', function (e) {
    if (e.target.id === 'su-switch') {
      e.preventDefault();
      setMode(mode === 'register' ? 'login' : 'register');
    }
  });

  eye.addEventListener('click', function () {
    var show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    pass2.type = show ? 'text' : 'password';
    eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  google.addEventListener('click', function () {
    say('Google sign-in is coming soon. Please use a username and password for now.', true);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var u = user.value.trim();
    if (u.length < 3) return say('Please enter a username with at least 3 characters.');
    if (!/^[A-Za-z0-9._-]+$/.test(u)) return say('Usernames can only use letters, numbers, dots, dashes and underscores.');
    if (pass.value.length < 8) return say('Your password needs at least 8 characters.');
    submit.disabled = true;
    var done;
    if (mode === 'register') {
      if (pass.value !== pass2.value) { submit.disabled = false; return say('The two passwords do not match.'); }
      if (!terms.checked) { submit.disabled = false; return say('Please accept the Terms & Conditions to continue.'); }
      var role = form.querySelector('input[name="role"]:checked').value;
      done = App.register(role, u, pass.value).then(function () { location.href = 'welcome.html'; });
    } else {
      done = App.login(u, pass.value).then(function (acc) { location.href = next(acc); });
    }
    done.catch(function (err) { submit.disabled = false; say(err.message); });
  });

  setMode(App.param('mode') === 'login' ? 'login' : 'register');
})();
