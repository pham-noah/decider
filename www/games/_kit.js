/* Toy kit — shared helpers for the plug-in games in www/games/*.js
 * Each game module pushes one object onto window.DECIDER_GAMES:
 *   { id, name, short, label, body, tune, init(card), enter(), leave(), action() }
 * `body` is the inner HTML of the game's .glass card; `tune` (optional) becomes the
 * options dock, whose handle label is `label`. The main app supplies rnd, PAL, tone,
 * buzz, show, moment, confetti, log and store in the global scope.
 */
(function () {
  const kit = {};

  /* device-pixel-ratio aware canvas sizing; returns {x, w, h, dpr} */
  kit.fit = function (cv) {
    const cap = document.documentElement.dataset.perf === 'low' ? 1.5 : 2;
    const dpr = Math.min(cap, devicePixelRatio || 1);
    const w = cv.clientWidth || 300, h = cv.clientHeight || 300;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { x, w, h, dpr };
  };

  /* a rAF loop that only runs while its game is on screen */
  kit.loop = function (fn) {
    let live = false, raf = 0, last = 0;
    const tick = (now) => {
      if (!live) return;
      const dt = Math.min(2.5, (now - last) / 16.667 || 1);
      last = now;
      fn(dt, now);
      raf = requestAnimationFrame(tick);
    };
    return {
      start() { if (live) return; live = true; last = performance.now(); raf = requestAnimationFrame(tick); },
      stop() { live = false; cancelAnimationFrame(raf); },
      get live() { return live; }
    };
  };

  /* round rect path, used by the card and machine toys */
  kit.rr = function (x, X, Y, W, H, R) {
    R = Math.min(R, W / 2, H / 2);
    x.beginPath();
    x.moveTo(X + R, Y);
    x.arcTo(X + W, Y, X + W, Y + H, R);
    x.arcTo(X + W, Y + H, X, Y + H, R);
    x.arcTo(X, Y + H, X, Y, R);
    x.arcTo(X, Y, X + W, Y, R);
    x.closePath();
  };

  /* a playing card: rank + suit glyph, red or black */
  kit.card = function (ctx, cx, cy, w, h, rank, suit, faceDown) {
    const r = Math.round(w * 0.1);
    ctx.save();
    ctx.translate(cx - w / 2, cy - h / 2);
    ctx.shadowColor = 'rgba(20,10,50,.35)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    kit.rr(ctx, 0, 0, w, h, r);
    ctx.fillStyle = faceDown ? '#3b2b7a' : '#fffdf8';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (faceDown) {
      ctx.save();
      kit.rr(ctx, 0, 0, w, h, r);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.lineWidth = 3;
      for (let i = -h; i < w + h; i += 9) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); }
      ctx.restore();
    } else {
      const red = suit === '♥' || suit === '♦';
      ctx.fillStyle = red ? '#d6215b' : '#241a55';
      ctx.font = `800 ${Math.round(h * 0.20)}px "Bricolage Grotesque",system-ui,sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(rank, w * 0.09, h * 0.07);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.round(h * 0.40)}px system-ui,sans-serif`;
      ctx.fillText(suit, w / 2, h * 0.58);
    }
    ctx.restore();
  };

  /* a rounded label pill under a slot / peg */
  kit.tag = function (ctx, cx, cy, text, bg, fg, size) {
    size = size || 11;
    ctx.font = `700 ${size}px "Bricolage Grotesque",system-ui,sans-serif`;
    const w = Math.min(96, ctx.measureText(text).width + 14), h = size + 10;
    ctx.save();
    kit.rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
    ctx.fillStyle = bg || 'rgba(255,255,255,.9)';
    ctx.fill();
    ctx.fillStyle = fg || '#241a55';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 0.5);
    ctx.restore();
    return { w, h };
  };

  /* the app's decision list, trimmed to n readable labels */
  kit.options = function (n) {
    const list = (typeof opts !== 'undefined' ? opts : []).map(o => o.l).filter(Boolean);
    const fallback = ['Yes', 'No', 'Maybe', 'Later', 'Nope', 'Sure', 'Skip', 'Go'];
    const out = (list.length >= 2 ? list : fallback);
    return out.slice(0, n);
  };

  /* finish a game: inline result, sound, log, confetti, full-screen card */
  kit.decide = function (label, game, sub) {
    try { chime(); } catch (e) {}
    try { buzz([20, 30, 20]); } catch (e) {}
    try { confetti(); } catch (e) {}
    try { log(game, label); } catch (e) {}
    try { later(() => moment(label, sub || game)); } catch (e) {}
  };

  kit.setResult = function (el, text) {
    try { show(el, text); } catch (e) { el.textContent = text; }
  };

  window.DKIT = kit;
  window.DECIDER_GAMES = window.DECIDER_GAMES || [];
})();
