/* RAVEN user consent gate: first-time visitors must accept the Terms & Conditions to view the site.
   Bump CONSENT_VERSION when the terms change to ask everyone again. */
(function () {
  var CONSENT_VERSION = '1';
  var KEY = 'raven_consent_v' + CONSENT_VERSION;

  // The terms page itself stays readable so people can review before agreeing.
  if (/(^|\/)terms(\.html)?$/.test(location.pathname)) return;

  function accepted() {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }
  function remember() {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch (e) {}
  }
  if (accepted()) return;

  var style = document.createElement('style');
  style.textContent = '\
.rv-consent{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);font-family:Inter,system-ui,sans-serif}\
.rv-consent-card{width:100%;max-width:520px;max-height:calc(100vh - 2rem);overflow-y:auto;background:#fff;color:#0B2A5B;border:1px solid #DCE3EF;border-radius:1.75rem;padding:2rem;box-shadow:0 40px 80px -30px rgba(0,0,0,.35)}\
.rv-consent-logo{font-size:1.25rem;font-weight:700;letter-spacing:-.05em;margin-bottom:1.25rem}\
.rv-consent-card h2{margin:0 0 .75rem;font-size:1.75rem;line-height:1.15;font-weight:400;letter-spacing:-.04em}\
.rv-consent-card h2 i{font-style:italic}\
.rv-consent-card p{margin:0 0 1rem;font-size:.95rem;line-height:1.6;color:#33425E}\
.rv-consent-card ul{margin:0 0 1.25rem;padding:0;list-style:none;display:grid;gap:.5rem}\
.rv-consent-card li{position:relative;padding-left:1.4rem;font-size:.9rem;line-height:1.5;color:#33425E}\
.rv-consent-card li::before{content:"";position:absolute;left:0;top:.5rem;width:.5rem;height:.5rem;border-radius:9999px;background:#0B2A5B}\
.rv-consent-check{display:flex;gap:.75rem;align-items:flex-start;padding:1rem;border:1px solid #DCE3EF;border-radius:1rem;background:#F6F9FD;cursor:pointer;margin-bottom:1.25rem}\
.rv-consent-check input{flex:none;width:1.25rem;height:1.25rem;margin-top:.15rem;accent-color:#0B2A5B;cursor:pointer}\
.rv-consent-check span{font-size:.9rem;line-height:1.5;color:#0B2A5B}\
.rv-consent-check a{color:#0B2A5B;text-decoration:underline}\
.rv-consent-actions{display:flex;gap:.75rem;flex-wrap:wrap}\
.rv-consent-yes{flex:1;min-width:10rem;height:52px;border:0;border-radius:9999px;background:#0B2A5B;color:#fff;font:500 .95rem Inter,system-ui,sans-serif;cursor:pointer;transition:background .2s,opacity .2s}\
.rv-consent-yes:disabled{opacity:.35;cursor:not-allowed}\
.rv-consent-yes:not(:disabled):hover{background:#123566}\
.rv-consent-no{height:52px;padding:0 1.25rem;border:1px solid #0B2A5B;border-radius:9999px;background:#fff;color:#0B2A5B;font:500 .95rem Inter,system-ui,sans-serif;cursor:pointer}\
.rv-consent-no:hover{background:#EEF3FA}\
.rv-consent-msg{display:none;margin:1rem 0 0;font-size:.85rem;color:#b91c1c}\
@media(max-width:639px){.rv-consent-card{padding:1.5rem;border-radius:1.5rem}.rv-consent-card h2{font-size:1.5rem}.rv-consent-yes,.rv-consent-no{flex:1 1 100%}}';
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'rv-consent';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-labelledby', 'rv-consent-title');
  wrap.innerHTML =
    '<div class="rv-consent-card">' +
      '<div class="rv-consent-logo">RAVEN</div>' +
      '<h2 id="rv-consent-title">Before you <i>continue</i></h2>' +
      '<p>Please review and accept our terms to use the RAVEN website.</p>' +
      '<ul>' +
        '<li>RAVEN provides guidance on loans, insurance, real estate and business registration.</li>' +
        '<li>Information on this site is general and not a guarantee of approval by any lender, insurer or authority.</li>' +
        '<li>We use the details you share only to respond to your enquiries and provide our services.</li>' +
      '</ul>' +
      '<label class="rv-consent-check"><input type="checkbox" id="rv-consent-box">' +
        '<span>I have read and agree to the <a href="terms.html" target="_blank" rel="noopener">Terms &amp; Conditions</a> and consent to my information being used as described.</span></label>' +
      '<div class="rv-consent-actions">' +
        '<button type="button" class="rv-consent-yes" id="rv-consent-yes" disabled>Agree &amp; Continue</button>' +
        '<button type="button" class="rv-consent-no" id="rv-consent-no">I do not agree</button>' +
      '</div>' +
      '<p class="rv-consent-msg" id="rv-consent-msg">You need to accept the Terms &amp; Conditions to view the website.</p>' +
    '</div>';
  document.body.appendChild(wrap);

  var prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  var box = document.getElementById('rv-consent-box');
  var yes = document.getElementById('rv-consent-yes');
  var no = document.getElementById('rv-consent-no');
  var msg = document.getElementById('rv-consent-msg');

  box.addEventListener('change', function () {
    yes.disabled = !box.checked;
    if (box.checked) msg.style.display = 'none';
  });
  yes.addEventListener('click', function () {
    if (!box.checked) return;
    remember();
    document.documentElement.style.overflow = prevOverflow;
    wrap.remove();
    style.remove();
  });
  no.addEventListener('click', function () { msg.style.display = 'block'; });
  box.focus();
})();
