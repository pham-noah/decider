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
  /* Toy labels. The wheel's options belong to the wheel: a toy numbers its own
   * slots, capsules or pins, so "trash / dish / laundry" can never appear on a
   * plinko bin or a gacha capsule. */
  kit.options = function (n) {
    const count = Math.max(1, n | 0);
    return Array.from({ length: count }, (_, i) => String(i + 1));
  };
  kit.prizes = ['a star', 'a coin', 'a crown', 'a fish', 'a rocket', 'a cherry',
                'a key', 'a shell', 'a moon', 'a dino', 'a bell', 'a feather'];

  /* finish a game: inline result, sound, log, confetti, full-screen card */
  kit.decide = function (label, game, sub) {
    // a toy can opt out of the whole decision ritual: no card, no history, no fanfare
    if (kit.silent) return;
    try { chime(); } catch (e) {}
    try { buzz([20, 30, 20]); } catch (e) {}
    try { confetti(); } catch (e) {}
    try { log(game, label); } catch (e) {}
    try { later(() => moment(label, sub || game)); } catch (e) {}
  };

  kit.setResult = function (el, text) {
    try { show(el, text); } catch (e) { el.textContent = text; }
  };

  /* Gesture tracking: drag/flick on a canvas. onEnd gets the release vector,
   * normalised so power is 0..1 whatever the screen size. */
  kit.gesture = function (cv, opts) {
    opts = opts || {};
    let on = false, sx = 0, sy = 0, x = 0, y = 0, samples = [];
    const point = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
    };
    cv.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      const p = point(e);
      on = true; sx = x = p.x; sy = y = p.y; samples = [p];
      opts.onStart && opts.onStart(p);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!on) return;
      const p = point(e);
      x = p.x; y = p.y;
      samples.push(p);
      if (samples.length > 8) samples.shift();
      opts.onMove && opts.onMove(p, { sx, sy, dx: x - sx, dy: y - sy });
    });
    const finish = (e) => {
      if (!on) return;
      on = false;
      const p = point(e);
      x = p.x; y = p.y;
      const now = p.t;
      // velocity over the last ~120ms of travel
      let ref = samples[0];
      for (let i = samples.length - 1; i >= 0; i--) { ref = samples[i]; if (now - samples[i].t > 120) break; }
      const span = Math.max(1, now - ref.t);
      const vx = (x - ref.x) / span, vy = (y - ref.y) / span;   // px per ms
      const speed = Math.hypot(vx, vy);
      const res = {
        sx, sy, x, y, dx: x - sx, dy: y - sy, vx, vy,
        speed,
        power: Math.max(0, Math.min(1, speed / 2.2)),
        distance: Math.hypot(x - sx, y - sy)
      };
      samples = [];
      opts.onEnd && opts.onEnd(res);
    };
    cv.addEventListener('pointerup', finish);
    cv.addEventListener('pointercancel', finish);
  };

  /* a small power/aim readout drawn on the toy screen */
  kit.meter = function (ctx, w, h, power, text) {
    const bw = Math.min(180, w * 0.5), bh = 7;
    const bx = (w - bw) / 2, by = h - 26;
    ctx.save();
    kit.rr(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fill();
    if (power > 0) {
      kit.rr(ctx, bx, by, Math.max(bh, bw * power), bh, bh / 2);
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#8f7dff'); g.addColorStop(.55, '#ffd76a'); g.addColorStop(1, '#ff6a3d');
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(text || (Math.round(power * 100) + '%'), w / 2, by - 4);
    ctx.restore();
  };


  /* ---------- material layer ----------
     Canvas cannot read CSS variables, so every toy used to invent its own palette.
     mat() resolves the active skin's tokens once and caches them; the observer drops
     the cache when :root changes skin, theme, contrast or an inline var. K.surf() paints
     the card's own surface so a toy stops repainting over .toy with a different purple. */
  let MATC = null;
  function readMat() {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const v = (n) => (cs.getPropertyValue(n) || '').trim();
    const num = (n, d) => { const t = parseFloat(v(n)); return Number.isFinite(t) ? t : d; };
    return {
      skin: root.dataset.skin || 'classic',
      s1: v('--toy-s1') || '#2a2064',
      s2: v('--toy-s2') || '#1b1443',
      s3: v('--toy-s3') || '#241a55',
      ink: v('--toy-ink') || '#f6f2ff',
      muted: v('--toy-muted') || 'rgba(246,242,255,.62)',
      line: v('--toy-line') || 'rgba(255,255,255,.16)',
      radius: num('--toy-radius', 20),
      flat: v('--toy-flat') === '1',
      outline: v('--toy-outline') || '',
      b: [1, 2, 3, 4].map((i) => v('--b' + i)),
      pal: (window.PAL || []).slice(0)
    };
  }
  kit.mat = function (force) { if (!MATC || force) MATC = readMat(); return MATC; };
  kit.invalidate = function () { MATC = null; };
  if (document.documentElement.dataset) {
    new MutationObserver(() => { MATC = null; })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin', 'data-theme', 'data-contrast', 'style'] });
  }
  /* paint the card surface into the canvas: gradient for classic/soft, flat ink for paper */
  kit.surf = function (x, w, h) {
    const m = kit.mat();
    x.save();
    kit.rr(x, 0, 0, w, h, m.radius);
    if (m.flat) { x.fillStyle = m.s1; }
    else {
      const g = x.createLinearGradient(0, 0, w * .35, h);
      g.addColorStop(0, m.s1); g.addColorStop(.6, m.s2); g.addColorStop(1, m.s3);
      x.fillStyle = g;
    }
    x.fill(); x.restore();
    return m;
  };
  /* a material-aware ink that also works on paper (dark) and on the violet skins (light) */
  kit.inkColor = function (alpha) {
    const m = kit.mat();
    if (m.flat) return 'rgba(36,26,58,' + (alpha == null ? 1 : alpha) + ')';
    return 'rgba(255,255,255,' + (alpha == null ? 1 : alpha) + ')';
  };


  /* ---------- shared toy furniture ----------
     The machines (slots, claw, gacha, coin pusher, plinko, pachinko, ring toss, dart,
     bowling) each drew their own body with their own gradient and rim. One panel()
     keeps them identical across skins: fill, rim, and a soft-skin bevel. label() keeps
     every caption on the same legibility floor instead of 8–9px whispers. */
  kit.panel = function (x, X, Y, W, H, o) {
    o = o || {};
    const m = kit.mat();
    const r = o.r == null ? Math.min(16, Math.min(W, H) * .18) : o.r;
    x.save(); kit.rr(x, X, Y, W, H, r);
    if (m.flat) x.fillStyle = o.face || '#f1ebda';
    else { const g = x.createLinearGradient(0, Y, 0, Y + H); g.addColorStop(0, o.face || m.s2); g.addColorStop(1, o.face2 || m.s3); x.fillStyle = g; }
    x.fill();
    if (o.rim !== false) {
      x.lineWidth = m.flat ? 1.6 : 1.2;
      x.strokeStyle = m.flat ? (m.outline || '#241a3a') : (o.rim || 'rgba(255,255,255,.18)');
      x.stroke();
    }
    if (m.skin === 'soft' && !m.flat) {
      x.save(); x.clip();
      x.strokeStyle = 'rgba(255,255,255,.42)'; x.lineWidth = 2; x.beginPath();
      x.moveTo(X + r * .6, Y + 1); x.lineTo(X + W - r * .6, Y + 1); x.stroke(); x.restore();
    }
    x.restore();
  };
  /* a specular / gloss / glow is light on every skin — inkColor() is for marks and type */
  kit.light = function (a) { return 'rgba(255,255,255,' + (a == null ? 1 : a) + ')'; };
  /* a caption that is legible on both materials and never drops under 10px */
  kit.label = function (x, text, X, Y, size, align) {
    const m = kit.mat();
    x.save();
    x.fillStyle = m.flat ? 'rgba(36,26,58,.82)' : 'rgba(255,255,255,.82)';
    x.font = '700 ' + Math.max(10, size || 10) + 'px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = align || 'center'; x.textBaseline = 'middle';
    x.fillText(text, X, Y);
    x.restore();
  };
  /* the press chain every toy should speak: squash, tone, haptic — one call */
  kit.press = function (freq) {
    try { tone(freq || 420, .05, .02, 'sine', (freq || 420) * 1.3); } catch (e) {}
    try { buzz(8); } catch (e) {}
  };

  window.DKIT = kit;
  window.DECIDER_GAMES = window.DECIDER_GAMES || [];
})();
