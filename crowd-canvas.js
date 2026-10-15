/* crowd-canvas.js — vanilla JS port of CrowdCanvas (originally inspired by https://codepen.io/zadvorsky/pen/xxwbBQV, illustrations by openpeeps.com) */
(function () {
  var canvas = document.getElementById('rv-crowd-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var SRC = 'https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png';
  var ROWS = 15;
  var COLS = 7;

  var randomRange = function (min, max) { return min + Math.random() * (max - min); };
  var randomIndex = function (arr) { return (randomRange(0, arr.length) | 0); };
  var removeFromArray = function (arr, i) { return arr.splice(i, 1)[0]; };
  var removeItemFromArray = function (arr, item) { return removeFromArray(arr, arr.indexOf(item)); };
  var removeRandomFromArray = function (arr) { return removeFromArray(arr, randomIndex(arr)); };
  var getRandomFromArray = function (arr) { return arr[randomIndex(arr) | 0]; };

  var stage = { width: 0, height: 0 };
  var allPeeps = [];
  var availablePeeps = [];
  var crowd = [];

  function createPeep(image, rect) {
    var peep = {
      image: image,
      rect: rect,
      width: rect[2],
      height: rect[3],
      x: 0,
      y: 0,
      anchorY: 0,
      scaleX: 1,
      walk: null
    };
    peep.render = function (ctx) {
      ctx.save();
      ctx.translate(peep.x, peep.y);
      ctx.scale(peep.scaleX, 1);
      ctx.drawImage(peep.image, peep.rect[0], peep.rect[1], peep.rect[2], peep.rect[3], 0, 0, peep.width, peep.height);
      ctx.restore();
    };
    return peep;
  }

  function resetPeep(peep) {
    var direction = Math.random() > 0.5 ? 1 : -1;
    var offsetY = 100 - 250 * gsap.parseEase('power2.in')(Math.random());
    var startY = stage.height - peep.height + offsetY;
    var startX, endX;

    if (direction === 1) {
      startX = -peep.width;
      endX = stage.width;
      peep.scaleX = 1;
    } else {
      startX = stage.width + peep.width;
      endX = 0;
      peep.scaleX = -1;
    }

    peep.x = startX;
    peep.y = startY;
    peep.anchorY = startY;

    return { startX: startX, startY: startY, endX: endX };
  }

  function normalWalk(peep, props) {
    var xDuration = 10;
    var yDuration = 0.25;
    var tl = gsap.timeline();
    tl.timeScale(randomRange(0.5, 1.5));
    tl.to(peep, { duration: xDuration, x: props.endX, ease: 'none' }, 0);
    tl.to(peep, { duration: yDuration, repeat: Math.round(xDuration / yDuration), yoyo: true, y: props.startY - 10 }, 0);
    return tl;
  }

  function addPeepToCrowd() {
    var peep = removeRandomFromArray(availablePeeps);
    var props = resetPeep(peep);
    var walk = normalWalk(peep, props).eventCallback('onComplete', function () {
      removePeepFromCrowd(peep);
      addPeepToCrowd();
    });
    peep.walk = walk;
    crowd.push(peep);
    crowd.sort(function (a, b) { return a.anchorY - b.anchorY; });
    return peep;
  }

  function removePeepFromCrowd(peep) {
    removeItemFromArray(crowd, peep);
    availablePeeps.push(peep);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    crowd.forEach(function (peep) { peep.render(ctx); });
    ctx.restore();
  }

  function resize() {
    stage.width = canvas.clientWidth;
    stage.height = canvas.clientHeight;
    canvas.width = stage.width * devicePixelRatio;
    canvas.height = stage.height * devicePixelRatio;

    crowd.forEach(function (peep) { if (peep.walk) peep.walk.kill(); });
    crowd.length = 0;
    availablePeeps.length = 0;
    availablePeeps.push.apply(availablePeeps, allPeeps);

    while (availablePeeps.length) {
      addPeepToCrowd().walk.progress(Math.random());
    }
  }

  function init() {
    var totalW = img.naturalWidth;
    var totalH = img.naturalHeight;
    var rectW = totalW / ROWS;
    var rectH = totalH / COLS;
    var total = ROWS * COLS;

    for (var i = 0; i < total; i++) {
      allPeeps.push(createPeep(img, [
        (i % ROWS) * rectW,
        ((i / ROWS) | 0) * rectH,
        rectW,
        rectH
      ]));
    }

    resize();
    gsap.ticker.add(render);
  }

  var img = document.createElement('img');
  img.crossOrigin = 'anonymous';
  img.onload = init;
  img.src = SRC;

  window.addEventListener('resize', resize);
})();
