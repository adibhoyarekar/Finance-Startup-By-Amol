/* Highlights the current section in the "On this page" list of the terms and privacy pages. */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.lg-toc-link'));
  if (!links.length || !('IntersectionObserver' in window)) return;
  var byId = {};
  links.forEach(function (l) { byId[l.getAttribute('data-t')] = l; });
  function mark(id) {
    links.forEach(function (l) { l.classList.toggle('is-on', l === byId[id]); });
    var on = byId[id];
    if (on && on.parentElement.scrollWidth > on.parentElement.clientWidth) {
      on.parentElement.scrollLeft = on.offsetLeft - 16;
    }
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
  }, { rootMargin: '-25% 0px -65% 0px' });
  Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  mark('s1');
})();
