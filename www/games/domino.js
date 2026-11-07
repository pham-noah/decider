/* Dominoes — a curved row; tip them and the last tile to settle decides. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  const cv = () => document.getElementById('dmCv');
  const TAU = Math.PI * 2;
  let L = null, g = null, pool = [], tiles = [], state = 'arm', tipT = 0, done = false, tipX = -1;

  function layout() {
    const n = 16;
    const tw = 16, th = 54;
    const left = 26, right = g.w - 66, baseY = g.h * 0.64, amp = g.h * 0.11;
    pool = K.options(5);
    if (pool.length < 2) pool = ['Yes', 'No'];
    tiles = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      tiles.push({
        x: left + u * (right - left),
        y: baseY - Math.sin(u * Math.PI) * amp,
        tw, th, col: PAL[i % PAL.length],
        ang: 0, jit: 0, hold: 0, settleAt: 0, clicked: false
      });
    }
    state = 'arm'; done = false; tipT = 0;
  }

  function tip() {
    if (state === 'fall') return;
    if (!tiles.length) layout();
    pool = K.options(5);
    if (pool.length < 2) pool = ['Yes', 'No'];
    state = 'fall';
    tipT = performance.now();
    done = false;
    const fromX = tipX >= 0 ? tipX : 0;
    tiles.forEach((t, i) => {
      t.ang = 0; t.clicked = false;
      t.jit = rnd() * 18;                                   // wobble is chance, not index
      // the further a tile is from where you tipped, the later it settles
      t.hold = 70 + Math.abs(t.x - fromX) * 1.1 + rnd() * 210;
      t.settleAt = 0;
    });
    K.setResult(document.getElementById('dmRes'), '…');
    try { tone(480, .09, .05, 'triangle', 300); } catch (e) {}
  }

  function tick(dt, now) {
    if (!g) return;
    const x = g.x;
    x.clearRect(0, 0, g.w, g.h);

    const gl = x.createRadialGradient(g.w / 2, g.h * 0.52, 10, g.w / 2, g.h * 0.52, g.w * 0.62);
    gl.addColorStop(0, INK(.08));
    gl.addColorStop(1, INK(0));
    x.fillStyle = gl; x.fillRect(0, 0, g.w, g.h);

    if (tiles.length) {
      x.save();
      x.lineCap = 'round'; x.lineJoin = 'round';
      x.strokeStyle = 'rgba(18,8,42,.20)'; x.lineWidth = 16;
      x.beginPath();
      tiles.forEach((t, i) => { i ? x.lineTo(t.x, t.y + 11) : x.moveTo(t.x, t.y + 11); });
      x.stroke();
      x.restore();
    }

    x.fillStyle = INK(.5);
    x.font = '700 11px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(state === 'arm' ? 'tip the row' : state === 'down' ? 'all down' : 'cascade…', g.w / 2, 18);

    let allSettled = state === 'fall' && tiles.length > 0;

    if (state === 'fall') {
      tiles.forEach((t, i) => {
        /* the index stagger outran every hold, so only the end tiles could settle last */
        const st = tipT + t.jit;
        const k = Math.max(0, Math.min(1, (now - st) / 230));
        const e = 1 - Math.pow(1 - k, 3);
        t.ang = 1.47 * e;
        if (k >= 1) {
          const age = now - st - 230;
          t.ang += Math.sin(age / 70) * 0.05 * Math.exp(-age / 300);
          if (!t.settleAt && age > t.hold) t.settleAt = st + 230 + t.hold;
        }
        if (!t.clicked && t.ang > 0.5) {
          t.clicked = true;
          try { tone(660 - i * 9, .05, .045, 'triangle', 340); } catch (e2) {}
        }
        if (!t.settleAt) allSettled = false;
      });
      if (allSettled) {
        state = 'down';
        tiles.forEach(t => { t.ang = 1.47; });
        let win = 0, best = -1;
        tiles.forEach((t, i) => { if (t.settleAt > best) { best = t.settleAt; win = i; } });
        if (!done) {
          done = true;
          const label = pool[Math.min(pool.length - 1, Math.floor(win / tiles.length * pool.length))];
          K.setResult(document.getElementById('dmRes'), label);
          K.decide(label, 'Dominoes', 'Tile ' + (win + 1) + ' fell last');
        }
      }
    } else if (state === 'arm') {
      tiles.forEach((t, i) => { t.ang = Math.sin(now / 1150 + i * 0.5) * 0.012; });
    }

    // tiles drawn back to front so the cascade overlaps toward the right
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i];
      x.save();
      x.translate(t.x, t.y);
      x.beginPath();
      x.ellipse(0, 1, t.tw * 1.1, 3, 0, 0, TAU);
      x.fillStyle = 'rgba(30,16,70,.22)'; x.fill();
      x.rotate(t.ang);
      const grd = x.createLinearGradient(-t.tw / 2, -t.th, t.tw / 2, 0);
      grd.addColorStop(0, '#fffdf6'); grd.addColorStop(1, '#e6dcff');
      K.rr(x, -t.tw / 2, -t.th, t.tw, t.th, 3);
      x.fillStyle = grd; x.fill();
      x.strokeStyle = 'rgba(36,26,85,.25)'; x.lineWidth = 1; x.stroke();
      x.fillStyle = t.col; x.globalAlpha = .85;
      x.fillRect(-t.tw / 2 + 1.5, -t.th * 0.52 - 0.8, t.tw - 3, 1.6);
      x.globalAlpha = 1;
      x.fillStyle = 'rgba(36,26,85,.55)';
      [-0.72, -0.24].forEach(f => {
        x.beginPath(); x.arc(0, t.th * f, 1.9, 0, TAU); x.fill();
      });
      x.restore();
    }

    if (state === 'down') {
      x.fillStyle = INK(.5);
      x.font = '700 11px "Bricolage Grotesque",system-ui,sans-serif';
      x.textAlign = 'center';
      x.fillText('tap Tip for another run', g.w / 2, g.h - 16);
    }
  }

  K && window.DECIDER_GAMES.push({
    id: 'domino', name: 'Dominoes', short: 'Domino', label: 'Tiles', noResult: true, button: false,
    body: `<canvas class="toy" id="dmCv"></canvas>
      <div class="res" id="dmRes" aria-live="polite"><span class="muted">Tip the row</span></div>
      <button class="btn" id="dmGo">Tip</button>`,
    init(card) {
      L = K.loop(tick);
      g = K.fit(cv());
      layout();
      card.querySelector('#dmGo').onclick = () => { tipX = -1; tip(); };
      cv().addEventListener('pointerdown', (e) => {
        if (state === 'fall') return;
        const r = cv().getBoundingClientRect();
        tipX = e.clientX - r.left;
        tip();
      });
    },
    enter() {
      if (!g || Math.abs(g.w - cv().clientWidth) > 1) { g = K.fit(cv()); layout(); }
      L.start();
    },
    leave() { L.stop(); },
    action() { tip(); }
  });
})();
