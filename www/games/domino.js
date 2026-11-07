/* Dominoes — a row of tiles; tip them and the last tile to settle names the answer. */
(function () {
  const K = window.DKIT;
  const cv = () => document.getElementById('dmCv');
  const TAU = Math.PI * 2;
  /* One tile per answer. The row used to be a fixed 16 tiles mapped onto the pool with
     floor(win / 16 * pool.length), so answer 0 owned four tiles and the rest three, and
     with fewer than five options some labels could never be reached at all. The row is
     now built from the pool itself: same cascade, same odds for every label. */
  const FALL = 200;                 // ms from upright to the lean
  const TILT = 0.62;                // a domino in a run rests on the next one, it does not lie flat
  let L = null, g = null, pool = [], tiles = [], state = 'arm', done = false, tipX = -1;
  let pending = null, relaunchAt = 0, geo = null;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uniq = (a) => a.filter((v, i) => v && a.indexOf(v) === i);
  const FONT = (x, s) => { x.font = '700 ' + s + 'px "Bricolage Grotesque",system-ui,sans-serif'; };

  function layout() {
    pool = uniq(K.options(5));
    if (pool.length < 2) pool = ['Yes', 'No'];
    const w = g.w, h = g.h;
    const n = pool.length;
    const reach = Math.sin(TILT);                              // how far a fallen tile leans past its base
    let tw = Math.min((w - 20) / (n + 1.15), h * 0.20);
    let th = tw * 1.94;
    if (th > h * 0.36) { th = h * 0.36; tw = th / 1.94; }      // a two-answer row stays in frame
    const left = 12 + tw / 2, right = w - 12 - reach * th;
    const pitch = (right - left) / Math.max(1, n - 1);
    const baseY = Math.round(Math.min(h * 0.72, (h + th) / 2));
    tiles = [];
    for (let i = 0; i < n; i++) {
      tiles.push({
        x: left + i * pitch, y: baseY, tw, th,
        lbl: pool[i], c: i, col: PAL[i % PAL.length],
        ang: 0, start: 0, settle: Infinity, settled: false, hit: false, win: false
      });
    }
    geo = { left, right, baseY, th, tw, pitch, n };
    state = 'arm'; done = false; pending = null; relaunchAt = 0;
  }

  function tip(fromX) {
    /* a tap that lands mid-cascade is queued, not eaten (it used to just return) */
    if (state === 'fall') { pending = fromX == null ? -1 : fromX; return; }
    if (!tiles.length || !geo) return;
    state = 'fall'; done = false; pending = null; relaunchAt = 0;
    const t0 = performance.now();
    const cx = clamp(fromX == null ? rnd() * g.w : fromX, geo.left, geo.right);
    let near = 0, bd = 1e9;
    tiles.forEach((t, i) => { const d = Math.abs(t.x - cx); if (d < bd) { bd = d; near = i; } });

    /* The answer is drawn evenly — every tile has the same chance of settling last —
       then staged so the drawn tile really is the one still rocking at the end. */
    const win = Math.min(tiles.length - 1, Math.floor(rnd() * tiles.length));
    tiles.forEach((t, i) => {
      t.ang = 0; t.settled = false; t.hit = false; t.win = false;
      t.start = t0 + Math.abs(i - near) * (42 + rnd() * 14) + rnd() * 14;
      t.settle = t.start + FALL + 90 + rnd() * 330;
    });
    const last = tiles.reduce((m, t) => Math.max(m, t.settle), 0);
    tiles[win].win = true;
    tiles[win].settle = last + 80 + rnd() * 90;

    K.setResult(document.getElementById('dmRes'), '…');
    try { K.press(430); } catch (e) {}
  }

  function settleNow() {
    state = 'down'; done = true;
    const t = tiles.find(q => q.win) || tiles[tiles.length - 1];
    K.setResult(document.getElementById('dmRes'), t.lbl);
    try { tone(560, .10, .05, 'sine', 840); } catch (e) {}
    relaunchAt = performance.now() + 520;      // consume a queued tap once the row is down
  }

  function drawTile(x, t, m) {
    x.save();
    x.translate(t.x, t.y + (t.c % 2 ? 1.5 : 0));
    /* shadow on the shelf, cast before the tilt so it stays put */
    x.beginPath();
    x.ellipse(0, 2, t.tw * 0.62, 3.2, 0, 0, TAU);
    x.fillStyle = m.flat ? 'rgba(36,26,58,.18)' : 'rgba(10,4,30,.34)';
    x.fill();
    x.rotate(t.ang);
    K.rr(x, -t.tw / 2, -t.th, t.tw, t.th, Math.max(3, t.tw * 0.13));
    if (m.flat) { x.fillStyle = '#fffdf8'; }
    else {
      const grd = x.createLinearGradient(-t.tw / 2, -t.th, t.tw / 2, 0);
      grd.addColorStop(0, '#fffdf6'); grd.addColorStop(1, '#eee6d4');
      x.fillStyle = grd;
    }
    x.fill();
    x.lineWidth = m.flat ? 1.5 : 1;
    x.strokeStyle = m.flat ? (m.outline || '#241a3a') : 'rgba(36,26,85,.22)';
    x.stroke();
    if (t.win && t.settled) { x.lineWidth = 2.6; x.strokeStyle = t.col; x.stroke(); }
    /* a domino: one divider in the answer's colour, three pips */
    const mid = -t.th / 2;
    x.globalAlpha = .9; x.fillStyle = t.col;
    x.fillRect(-t.tw * 0.31, mid - 1, t.tw * 0.62, 2);
    x.globalAlpha = 1;
    x.fillStyle = 'rgba(36,26,85,.5)';
    [[-0.24, -0.20], [0.24, -0.20], [0, 0.20]].forEach((p) => {
      x.beginPath();
      x.arc(p[0] * t.tw, mid + p[1] * t.th * 0.62, Math.max(1.5, t.tw * 0.052), 0, TAU);
      x.fill();
    });
    x.restore();
  }

  function wrap(text, x, maxW) {
    const words = String(text).split(/\s+/), out = [];
    let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (cur && x.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t;
    });
    if (cur) out.push(cur);
    return out.slice(0, 2);
  }

  function captions(x) {
    const max = Math.min(geo.pitch * 0.96, 78);
    x.save();
    FONT(x, 10);
    tiles.forEach((t) => {
      const lines = wrap(t.lbl, x, max);
      const y0 = geo.baseY + 34 + (lines.length === 1 ? 0 : -5);
      lines.forEach((ln, i) => K.label(x, ln, t.x, y0 + i * 12, 10));
      if (t.win && t.settled) {
        /* a colour tick under the answer that came up */
        const wid = Math.min(max, x.measureText(t.lbl).width + 8);
        x.fillStyle = t.col;
        K.rr(x, t.x - wid / 2, y0 + (lines.length - 1) * 12 + 9, wid, 3, 1.5);
        x.fill();
      }
    });
    x.restore();
  }

  /* a fallen tile reaches sin(angle) * height past its base; when the cascade
     would push the last one off the card the whole scene slides with it */
  function panAmount(w) {
    let over = 0;
    tiles.forEach((t) => { over = Math.max(over, t.x + Math.sin(t.ang) * t.th * 0.98); });
    return Math.max(0, over - (w - 8));
  }

  function tick() {
    if (!g) return;
    const now = performance.now();
    const f = K.fit(cv());
    if (f.w !== g.w || f.h !== g.h) { g = f; layout(); }      // relayout on width AND height
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h);
    if (m.flat) {
      K.rr(x, 0.9, 0.9, w - 1.8, h - 1.8, Math.max(2, m.radius - 1));
      x.strokeStyle = m.outline || '#241a3a'; x.lineWidth = 1.5; x.stroke();
    }

    const shift = panAmount(w);
    x.save();
    x.translate(-shift, 0);

    /* the base the row stands on: one panel, ink edge and a hard offset on paper */
    const shelfH = Math.max(11, geo.th * 0.15);
    const sx = geo.left - geo.tw / 2 - 8, sw = (geo.right - geo.left) + geo.tw + 16;
    const sy = geo.baseY + 3;
    if (m.flat) {
      x.fillStyle = '#1d1340';                      // paper: a hard offset, not a blur
      K.rr(x, sx + 3, sy + 3, sw, shelfH, 3); x.fill();
      K.panel(x, sx, sy, sw, shelfH, { r: 3, face: '#e6dfcc' });
    } else {
      x.save();
      x.shadowColor = 'rgba(8,3,26,.45)'; x.shadowBlur = 12; x.shadowOffsetY = 5;
      K.panel(x, sx, sy, sw, shelfH, { r: 3, face: 'rgba(255,255,255,.10)', face2: 'rgba(255,255,255,.04)' });
      x.restore();
    }

    K.label(x, state === 'arm' ? 'tip the row' : state === 'down' ? 'settled' : 'cascade…', w / 2, 24, 10);

    let all = state === 'fall' && tiles.length > 0;
    tiles.forEach((t, i) => {
      if (state === 'fall') {
        if (now < t.start) { t.ang = Math.sin(now / 1150 + i * 0.5) * 0.012; all = false; return; }
        const k = clamp((now - t.start) / FALL, 0, 1);
        t.ang = TILT * (1 - Math.pow(1 - k, 3));
        if (k < 1) all = false;
        else if (now < t.settle) {
          /* still rocking: reads as "not down yet" instead of a tile that has stopped */
          const age = now - t.start - FALL;
          t.ang = TILT - (0.45 + 0.45 * Math.sin(age / 70)) * 0.075;
          all = false;
        } else { t.ang = TILT; t.settled = true; }
        if (!t.hit && t.ang > 0.5) {
          t.hit = true;
          try { tone(660 - i * 22, .05, .045, 'triangle', 340); } catch (e) {}
        }
      } else if (state === 'arm') {
        t.ang = Math.sin(now / 1150 + i * 0.5) * 0.012;
      }
    });

    for (let i = tiles.length - 1; i >= 0; i--) drawTile(x, tiles[i], m);
    captions(x);
    x.restore();

    if (state === 'down') {
      K.label(x, 'tap the row for another run', w / 2, h - 16, 10);
      if (relaunchAt && now > relaunchAt) {
        relaunchAt = 0;
        if (pending != null) { const p = pending; pending = null; tip(p < 0 ? null : p); }
      }
    }

    if (all && !done) settleNow();
  }

  const at = (e) => e.clientX - cv().getBoundingClientRect().left;

  K && window.DECIDER_GAMES.push({
    id: 'domino', name: 'Dominoes', short: 'Domino', label: 'Tiles', noResult: true, button: false,
    body: `<canvas class="toy" id="dmCv"></canvas>
      <div class="res" id="dmRes" aria-live="polite"><span class="muted">Tip the row</span></div>`,
    init() {
      L = K.loop(tick);
      g = K.fit(cv());
      layout();
      cv().addEventListener('pointerdown', (e) => {
        if (e.button) return;
        try { cv().setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e);
        tipX = p;
        tip(p);
      });
    },
    enter() {
      const f = K.fit(cv());
      if (!g || f.w !== g.w || f.h !== g.h) { g = f; layout(); }
      L.start();
    },
    leave() { pending = null; relaunchAt = 0; L.stop(); },
    action() { tip(tipX >= 0 ? tipX : null); }
  });
})();
