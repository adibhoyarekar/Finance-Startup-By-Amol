/* RAVEN register / log in page. Accounts are kept in this browser only (see raven-app.js). */
(function () {
  var App = window.RavenApp;
  var $ = function (id) { return document.getElementById(id); };
  var card = $('au-card'), form = $('su-form'), user = $('su-user'), pass = $('su-pass'), pass2 = $('su-pass2');
  var terms = $('su-terms'), msg = $('su-msg'), submit = $('su-submit'), label = submit.querySelector('.lbl');
  var tabsBox = document.querySelector('.au-tabs'), tabs = Array.prototype.slice.call(document.querySelectorAll('.au-tab'));
  var mode = 'register';

  // only follow ?next= to our own pages
  function next(u) {
    var n = App.param('next');
    return /^[a-z0-9-]+\.html$/i.test(n) && u.onboarded ? n : App.home(u);
  }
  function pitch(role) {
    $('au-pitch-customer').hidden = role !== 'customer';
    $('au-pitch-agent').hidden = role !== 'agent';
  }

  // already logged in: show who and where to go
  var me = App.current();
  if (me) {
    pitch(me.role);
    card.innerHTML = '<div class="au-done"><span class="ring"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span>' +
      '<h2>Hi ' + App.esc(App.displayName(me).split(' ')[0]) + ', you’re logged in</h2><p>' + (me.role === 'agent' ? 'Agent account' : 'Customer account') + ' · ' + App.esc(me.username) + '</p>' +
      '<a class="au-submit" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="' + App.home(me) + '">' + (me.onboarded ? (me.role === 'agent' ? 'Open dashboard' : 'Open my account') : 'Finish setting up') + '</a>' +
      '<button type="button" class="ap-btn is-ghost" id="su-out" style="width:100%;margin-top:.5rem">Log out</button></div>';
    $('su-out').addEventListener('click', function () { App.logout(); location.reload(); });
    return;
  }

  function say(text, ok) {
    msg.textContent = text;
    msg.hidden = !text;
    msg.className = 'au-msg' + (ok ? ' is-ok' : '');
    if (text && !ok) { card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake'); }
  }
  function busy(on) { submit.classList.toggle('is-busy', on); submit.disabled = on; }

  function setMode(m) {
    mode = m;
    var reg = m === 'register';
    tabsBox.setAttribute('data-on', m);
    tabs.forEach(function (t) { var on = t.getAttribute('data-mode') === m; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
    $('su-roles').hidden = !reg;
    $('su-confirm-wrap').hidden = !reg;
    $('su-terms-wrap').hidden = !reg;
    $('su-strength').hidden = !reg;
    $('au-h').textContent = reg ? 'Create your account' : 'Welcome back';
    $('au-sub').textContent = reg ? 'Join as a customer or an agent – it takes under a minute.' : 'Log in to continue to your dashboard.';
    label.textContent = reg ? 'Create account' : 'Log in';
    pass.setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
    pass.placeholder = reg ? 'At least 8 characters' : 'Your password';
    $('su-foot').innerHTML = reg ? 'Already registered? <a href="#" id="su-switch">Log in</a>' : 'New to RAVEN? <a href="#" id="su-switch">Create an account</a>';
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
  $('su-google').addEventListener('click', function () { say('Google sign-in is coming soon. Please use a username and password for now.', true); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var u = user.value.trim();
    if (u.length < 3) { user.focus(); return say('Please enter a username with at least 3 characters.'); }
    if (!/^[A-Za-z0-9._-]+$/.test(u)) { user.focus(); return say('Usernames can only use letters, numbers, dots, dashes and underscores.'); }
    if (pass.value.length < 8) { pass.focus(); return say('Your password needs at least 8 characters.'); }
    var done;
    if (mode === 'register') {
      if (pass.value !== pass2.value) { pass2.focus(); return say('The two passwords do not match.'); }
      if (!terms.checked) return say('Please accept the Terms & Conditions to continue.');
      var role = form.querySelector('input[name="role"]:checked').value;
      busy(true);
      done = App.register(role, u, pass.value).then(function () { success('Account created', 'Let’s set up your profile…', 'welcome.html'); });
    } else {
      busy(true);
      done = App.login(u, pass.value).then(function (acc) { success('Welcome back, ' + App.displayName(acc).split(' ')[0], 'Taking you to your ' + (acc.role === 'agent' ? 'dashboard' : 'account') + '…', next(acc)); });
    }
    done.catch(function (err) { busy(false); say(err.message); });
  });

  function success(title, text, href) {
    card.innerHTML = '<div class="au-done"><span class="ring"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span><h2>' + App.esc(title) + '</h2><p>' + App.esc(text) + '</p></div>';
    setTimeout(function () { location.href = href; }, 900);
  }

  setMode(App.param('mode') === 'login' ? 'login' : 'register');
})();
