/* FinMatrix register / log in page. Accounts run on Supabase Auth (see raven-app.js):
   email + password, Google sign-in, email confirmation and password reset. */
(function () {
  var App = window.RavenApp;
  var $ = function (id) { return document.getElementById(id); };
  var card = $('au-card'), form = $('su-form'), user = $('su-user'), pass = $('su-pass'), pass2 = $('su-pass2');
  var terms = $('su-terms'), msg = $('su-msg'), submit = $('su-submit'), label = submit.querySelector('.lbl'), google = $('su-google');
  var tabsBox = document.querySelector('.au-tabs'), tabs = Array.prototype.slice.call(document.querySelectorAll('.au-tab'));
  var orLine = document.querySelector('.au-or'), userWrap = user.closest('.ap-field'), forgotWrap = $('su-forgot-wrap');
  var mode = 'register';
  var fromLink = /[?&](code|error|error_description)=/.test(location.search);
  var resetLink = App.param('mode') === 'reset';
  var DONE_ICON = '<span class="ring"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span>';
  var MAIL_ICON = '<span class="ring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></span>';

  // only follow ?next= to our own pages
  function safeNext() { var n = App.param('next'); return /^[a-z0-9-]+\.html(\?id=[a-z0-9_-]+)?$/i.test(n) ? n : ''; }
  function next(u) { return safeNext() && u.onboarded ? safeNext() : App.home(u); }
  function welcomeHref() { return 'welcome.html' + (safeNext() ? '?next=' + encodeURIComponent(safeNext()) : ''); }
  function pitch(role) {
    $('au-pitch-customer').hidden = role !== 'customer';
    $('au-pitch-agent').hidden = role !== 'agent';
  }
  function cleanUrl(keepReset) {
    var q = [];
    if (keepReset) q.push('mode=reset');
    if (safeNext()) q.push('next=' + encodeURIComponent(safeNext()));
    try { history.replaceState(null, '', 'signup.html' + (q.length ? '?' + q.join('&') : '')); } catch (e) {}
  }
  function validEmail(v) { return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function say(text, ok) {
    msg.textContent = text;
    msg.hidden = !text;
    msg.className = 'au-msg' + (ok ? ' is-ok' : '');
    if (text && !ok) { card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake'); }
  }
  function busy(on) { submit.classList.toggle('is-busy', on); submit.disabled = on; google.disabled = on; }

  function loggedIn(me) {
    pitch(me.role);
    card.innerHTML = '<div class="au-done">' + DONE_ICON +
      '<h2>Hi ' + App.esc(App.displayName(me).split(' ')[0]) + ', you’re logged in</h2><p>' + (me.role === 'agent' ? 'Agent account' : 'Customer account') + ' · ' + App.esc(me.username) + '</p>' +
      '<a class="au-submit" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="' + App.home(me) + '">' + (me.onboarded ? (me.role === 'agent' ? 'Open dashboard' : 'Open my account') : 'Finish setting up') + '</a>' +
      '<button type="button" class="ap-btn is-ghost" id="su-out" style="width:100%;margin-top:.5rem">Log out</button></div>';
    $('su-out').addEventListener('click', function () { this.disabled = true; App.logout().then(function () { location.reload(); }); });
  }
  function success(title, text, href) {
    card.innerHTML = '<div class="au-done">' + DONE_ICON + '<h2>' + App.esc(title) + '</h2><p>' + App.esc(text) + '</p></div>';
    setTimeout(function () { location.href = href; }, 900);
  }
  function checkInbox(email) {
    card.innerHTML = '<div class="au-done">' + MAIL_ICON + '<h2>Check your email</h2><p>We sent a confirmation link to <strong>' + App.esc(email) +
      '</strong>. Open it on this device to finish creating your account.</p>' +
      '<a class="ap-btn is-ghost" style="width:100%;margin-top:.5rem" href="signup.html?mode=login' + (safeNext() ? '&next=' + encodeURIComponent(safeNext()) : '') + '">Back to log in</a></div>';
  }
  // signed in (Google, confirmed email): new Google accounts get the role they picked
  function arrived(u) {
    var role = App.pendingRole();
    if (!u.hasRole) { u.role = role || 'customer'; u.hasRole = true; App.saveUser(u); }
    if (!u.onboarded) return success('You’re signed in', 'Let’s set up your profile…', welcomeHref());
    success('Welcome back, ' + App.displayName(u).split(' ')[0], 'Taking you to your ' + (u.role === 'agent' ? 'dashboard' : 'account') + '…', next(u));
  }

  function setMode(m) {
    mode = m;
    var reg = m === 'register', reset = m === 'reset';
    tabsBox.setAttribute('data-on', reset ? 'login' : m);
    tabsBox.hidden = reset;
    tabs.forEach(function (t) { var on = t.getAttribute('data-mode') === m; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
    card.classList.toggle('is-register', reg);
    $('su-roles').hidden = !reg;
    google.hidden = reset;
    orLine.hidden = reset;
    userWrap.hidden = reset;
    forgotWrap.hidden = m !== 'login';
    $('su-confirm-wrap').hidden = !(reg || reset);
    $('su-terms-wrap').hidden = !reg;
    $('su-strength').hidden = !(reg || reset);
    $('au-h').textContent = reset ? 'Set a new password' : reg ? 'Create your account' : 'Welcome back';
    $('au-sub').textContent = reset ? 'Choose a new password for your account.' : reg ? 'Join as a customer or an agent.' : 'Log in to continue to your dashboard.';
    label.textContent = reset ? 'Save new password' : reg ? 'Create account' : 'Log in';
    pass.setAttribute('autocomplete', reg || reset ? 'new-password' : 'current-password');
    pass.placeholder = reg || reset ? 'At least 8 characters' : 'Your password';
    $('su-foot').innerHTML = reset ? '<a href="signup.html?mode=login" id="su-back">Back to log in</a>' : reg ? 'Already registered? <a href="#" id="su-switch">Log in</a>' : 'New to FinMatrix? <a href="#" id="su-switch">Create an account</a>';
    say('');
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { setMode(t.getAttribute('data-mode')); }); });
  $('su-foot').addEventListener('click', function (e) {
    if (e.target.id === 'su-switch') { e.preventDefault(); setMode(mode === 'register' ? 'login' : 'register'); user.focus(); }
  });
  form.addEventListener('change', function (e) { if (e.target.name === 'role') pitch(e.target.value); });
  form.addEventListener('input', function () { if (!msg.hidden && !msg.classList.contains('is-ok')) say(''); });

  $('su-eye').addEventListener('click', function () {
    var show = pass.type === 'password';
    pass.type = pass2.type = show ? 'text' : 'password';
    this.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  pass.addEventListener('input', function () {
    var v = pass.value, s = 0;
    if (v.length >= 8) s++;
    if (v.length >= 12) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
    if (v.length < 8) s = v ? 1 : 0;
    $('su-meter').setAttribute('data-s', s);
    $('su-mtxt').textContent = !v ? '' : ['', 'Too short – use at least 8 characters', 'Okay – add numbers or symbols', 'Good password', 'Strong password'][s];
  });

  google.addEventListener('click', function () {
    var role = mode === 'register' ? form.querySelector('input[name="role"]:checked').value : '';
    busy(true);
    say('Opening Google…', true);
    App.google(role, safeNext()).catch(function (err) { busy(false); say(err.message); });
  });

  $('su-forgot').addEventListener('click', function (e) {
    e.preventDefault();
    var email = user.value.trim().toLowerCase();
    if (!validEmail(email)) { user.focus(); return say('Type your email above, then tap “Forgot password?” again.'); }
    busy(true);
    App.resetPassword(email).then(function () {
      busy(false);
      say('If an account exists for ' + email + ', we have sent a password reset link. Open it on this device.', true);
    }).catch(function (err) { busy(false); say(err.message); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (mode === 'reset') {
      if (pass.value.length < 8) { pass.focus(); return say('Your password needs at least 8 characters.'); }
      if (pass.value !== pass2.value) { pass2.focus(); return say('The two passwords do not match.'); }
      busy(true);
      return App.updatePassword(pass.value).then(function () {
        var u = App.current();
        success('Password updated', 'Taking you to your account…', u ? next(u) : 'signup.html?mode=login');
      }).catch(function (err) { busy(false); say(err.message); });
    }
    var email = user.value.trim().toLowerCase();
    if (!validEmail(email)) { user.focus(); return say('Please enter a valid email address.'); }
    if (pass.value.length < 8) { pass.focus(); return say('Your password needs at least 8 characters.'); }
    var done;
    if (mode === 'register') {
      if (pass.value !== pass2.value) { pass2.focus(); return say('The two passwords do not match.'); }
      if (!terms.checked) return say('Please accept the Terms & Conditions to continue.');
      var role = form.querySelector('input[name="role"]:checked').value;
      busy(true);
      done = App.register(role, email, pass.value, safeNext()).then(function (r) {
        if (r.confirm) return checkInbox(email);
        success('Account created', 'Let’s set up your profile…', welcomeHref());
      });
    } else {
      busy(true);
      done = App.login(email, pass.value).then(function (acc) {
        if (!acc) throw new Error('Something went wrong. Please try again.');
        success('Welcome back, ' + App.displayName(acc).split(' ')[0], 'Taking you to your ' + (acc.role === 'agent' ? 'dashboard' : 'account') + '…', next(acc));
      });
    }
    done.catch(function (err) { busy(false); say(err.message); });
  });

  // coming back from Google, an email confirmation link or a password reset link
  if (fromLink || resetLink) {
    setMode(resetLink ? 'reset' : 'login');
    busy(true);
    say(resetLink ? 'Checking your reset link…' : 'Signing you in…', true);
    App.authReady().then(function (u) {
      cleanUrl(resetLink && !!u);
      busy(false);
      if (resetLink) {
        if (u) return say('');
        setMode('login');
        return say('This reset link has expired or was opened in a different browser. Type your email and tap “Forgot password?” to get a new one.');
      }
      if (u) return arrived(u);
      say('Please log in to continue. If you just confirmed your email, that is done.', true);
    }).catch(function (err) {
      cleanUrl(false);
      busy(false);
      if (resetLink) setMode('login');
      say(!resetLink && /different browser/.test(err.message) ? 'If you just confirmed your email, that is done – please log in below.' : err.message, !resetLink && /different browser/.test(err.message));
    });
    return;
  }

  // already logged in: show who and where to go
  var me = App.current();
  if (me) { loggedIn(me); return; }

  setMode(App.param('mode') === 'register' ? 'register' : 'login');
})();
