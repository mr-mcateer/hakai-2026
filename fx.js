/* HakaiDither — ordered-dither staccato loop over the hero photo.
   Real <img> stays underneath (no-JS / reduced-motion / LCP fallback). */
(function () {
  'use strict';

  function cssColor(varName, el) {
    return getComputedStyle(el || document.documentElement).getPropertyValue(varName).trim();
  }

  // Parse a CSS color to [r,g,b] via a scratch canvas (handles hex/rgb/names).
  var scratch = null;
  function toRGB(c) {
    if (!scratch) scratch = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    scratch.canvas.width = 1; scratch.canvas.height = 1;
    scratch.fillStyle = '#000'; scratch.fillStyle = c;
    scratch.fillRect(0, 0, 1, 1);
    var d = scratch.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  function mix(a, b, t) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
                    Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
                    Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  function mount(heroEl, opts) {
    if (!heroEl) return;
    var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (rm.matches) return; // real photo stays

    opts = opts || {};
    var FPS = opts.fps || 11;
    var N = opts.frames || 9;
    var BASE = opts.base || 'assets/dither/f';

    var img = heroEl.querySelector('img');
    if (!img) return;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    // first child after the <img>: below scrim (::after) and z-indexed text layers
    img.insertAdjacentElement('afterend', canvas);
    var ctx = canvas.getContext('2d');

    var paper = '#fff', ink = '#000';
    function readColors() {
      paper = cssColor('--bg') || '#F2F4F1';
      var teal = toRGB(cssColor('--teal') || '#0E5B50');
      var inkC = toRGB(cssColor('--ink') || '#16241F');
      ink = mix(teal, inkC, 0.45); // teal mixed toward ink
    }
    readColors();
    var themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.addEventListener('click', function () { setTimeout(function(){ readColors(); draw(); }, 0); });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { readColors(); draw(); });

    // Preload frames
    var frames = [], loaded = 0, ready = false;
    for (var i = 0; i < N; i++) (function (i) {
      var f = new Image();
      f.onload = function () { if (++loaded === N) { ready = true; resize(); draw(); } };
      f.src = BASE + i + '.png';
      frames[i] = f;
    })(i);

    // Backing store: dpr capped at 1, max 960 wide
    function resize() {
      var r = heroEl.getBoundingClientRect();
      var w = Math.min(960, Math.max(1, Math.round(r.width)));
      var h = Math.max(1, Math.round(w * (r.height / Math.max(1, r.width))));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    window.addEventListener('resize', function () { resize(); draw(); });

    var idx = 0, bias = 0, px = 0, py = 0;
    var hasPointer = window.matchMedia('(pointer: fine)').matches;
    if (hasPointer) {
      heroEl.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = heroEl.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;  // -0.5..0.5
        var ny = (e.clientY - r.top) / r.height - 0.5;
        bias = nx > 0.17 ? 1 : nx < -0.17 ? -1 : 0;     // ±1 frame bias
        px = Math.round(nx * 6); py = Math.round(ny * 6); // up to ±3px parallax
      });
      heroEl.addEventListener('pointerleave', function () { bias = 0; px = 0; py = 0; });
    }

    function draw() {
      if (!ready) return;
      var f = frames[((idx + bias) % N + N) % N];
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // draw frame emulating the img's object-fit:cover / object-position 50% 26%
      var fr = f.width / f.height, cr = w / h, dw, dh, dx, dy;
      if (cr > fr) { dw = w; dh = w / fr; dx = 0; dy = -(dh - h) * 0.26; }
      else { dh = h; dw = h * fr; dx = -(dw - w) * 0.5; dy = 0; }
      // mask trick: draw ink rectangle only where frame pixels are opaque
      ctx.save();
      ctx.translate(px, py);
      ctx.drawImage(f, dx, dy, dw, dh);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = ink;
      ctx.fillRect(-px, -py, w, h);
      ctx.restore();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Stepped playback — no interpolation, the staccato IS the effect
    var visible = true, last = 0, step = 1000 / FPS;
    function tick(t) {
      if (visible && !document.hidden && ready && t - last >= step) {
        last = t; idx = (idx + 1) % N; draw();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }).observe(heroEl);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = 0; } });

    resize();
  }

  window.HakaiDither = { mount: mount };
})();
