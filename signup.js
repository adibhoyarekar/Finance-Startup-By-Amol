/* RAVEN registration / log in page (design only - no accounts are created yet). */
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.su-tab'));
  var form = document.getElementById('su-form');
  var user = document.getElementById('su-user');
  var pass = document.getElementById('su-pass');
  var pass2 = document.getElementById('su-pass2');
  var terms = document.getElementById('su-terms');
  var msg = document.getElementById('su-msg');
  var submit = document.getElementById('su-submit');
  var confirmWrap = document.getElementById('su-confirm-wrap');
  var termsWrap = document.getElementById('su-terms-wrap');
  var foot = document.getElementById('su-foot');
  var google = document.getElementById('su-google');
  var eye = document.getElementById('su-eye');
  var mode = 'register';

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
    say('Google sign-in is coming soon. For now, please contact our team and we will help you get started.', true);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var u = user.value.trim();
    if (u.length < 3) return say('Please enter a username with at least 3 characters.');
    if (!/^[A-Za-z0-9._-]+$/.test(u)) return say('Usernames can only use letters, numbers, dots, dashes and underscores.');
    if (pass.value.length < 8) return say('Your password needs at least 8 characters.');
    if (mode === 'register') {
      if (pass.value !== pass2.value) return say('The two passwords do not match.');
      if (!terms.checked) return say('Please accept the Terms & Conditions to continue.');
      say('Thank you! Online accounts are coming soon. We have not saved anything yet, so please reach our team via the Contact page to get started.', true);
    } else {
      say('Log in is coming soon. We have not signed you in, so please reach our team via the Contact page.', true);
    }
  });

  setMode('register');
})();
