/* Bowling — swipe up the lane; the pin left standing decides. */
(function () {
  const K = window.DKIT;
  const TAU = Math.PI * 2;
  const cv = () => document.getElementById('bwCv');
  const res = () => document.getElementById('bwRes');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let L = null, labels = [], geo = null, pins = [], ball = null, drag = null;
  let firstHit = null, rolling = false, done = false;

  const pick = (n) => { const b = K.options(n); return Array.from({ length: n }, (_, i) => b[i % b.length]); };

  function layout() {
    const c = cv(); if (!c) return; const g = K.fit(c); const laneW = Math.min(g.w * .78, 340);
    geo = { w: g.w, h: g.h, laneX: (g.w - laneW) / 2, laneW, cx: g.w / 2,
      top: g.h * .22, gapX: laneW * .20, rowGap: laneW * .17, pinR: Math.max(7, laneW * .038) };
    build();
  }

  function build() {
    pins = [];
    for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) {
      const k = pins.length;
      pins.push({ x: geo.cx + (i - r / 2) * geo.gapX, y: geo.top + r * geo.rowGap,
        l: labels[k % labels.length], c: PAL[k % PAL.length], down: 0, f: 0, dir: 0 });
    }
    ball = { x: geo.cx, y: geo.h - 46, r: geo.laneW * .05, vx: 0, vy: 0 };
    firstHit = null; rolling = false; done = false; drag = null;
  }

  function advance(d) {
    const b = ball;
    b.x += b.vx * d; b.y += b.vy * d;
    b.vy *= Math.pow(.996, d);
    if (b.x < geo.laneX + b.r) { b.x = geo.laneX + b.r; b.vx = Math.abs(b.vx) * .55; }
    if (b.x > geo.laneX + geo.laneW - b.r) { b.x = geo.laneX + geo.laneW - b.r; b.vx = -Math.abs(b.vx) * .55; }
    pins.forEach((p) => {
      if (p.down) return;
      const dx = b.x - p.x, dy = b.y - p.y, dd = Math.hypot(dx, dy) || 1;
      if (dd < b.r + geo.pinR) {
        p.down = 1; p.f = .01; p.dir = Math.atan2(p.y - b.y, p.x - b.x);
        if (!firstHit) firstHit = p;
        b.vx += (dx / dd) * 1.7; b.vy *= .88;
        try { tone(230 + Math.random() * 140, .06, .04, 'triangle'); } catch (e) {}
      }
    });
  }

  function roll() {
    if (!geo || rolling) return;
    if (done) build();
    let p = .35, dx = 0;
    if (drag) { p = clamp((drag.y0 - drag.y) / (geo.h * .40), .35, 1); dx = drag.x - drag.x0; }
    drag = null; const vx = clamp(dx * .018, -3.4, 3.4) * (.7 + p * .6); const vy = -(4.2 + p * 7.4);
    rolling = true; done = false; firstHit = null;
    ball.vx = vx; ball.vy = vy;
    K.setResult(res(), '…');
    try { tone(170, .1, .05, 'triangle', 110); } catch (e) {}
  }

  function finish() {
    const standing = pins.filter((p) => !p.down); let win = firstHit;
    if (standing.length) {
      win = standing.reduce((a, p) => Math.abs(p.x - ball.x) < Math.abs(a.x - ball.x) ? p : a, standing[0]);
    }
    rolling = false; done = true; const label = win ? win.l : labels[0];
    K.setResult(res(), label);
    try { tone(560, .12, .05, 'sine', 840); } catch (e) {}
    K.decide(label, 'Bowling', (10 - standing.length) + ' down · ' + label);
  }

  function drawLane(x, g) {
    const { laneX, laneW } = geo;
    K.rr(x, laneX - 11, 6, laneW + 22, g.h - 12, 20); x.fillStyle = 'rgba(36,26,85,.16)'; x.fill(); const grd = x.createLinearGradient(0, 0, 0, g.h);
    grd.addColorStop(0, '#fdf3e2'); grd.addColorStop(.55, '#f7e7cd'); grd.addColorStop(1, '#efd9b8');
    K.rr(x, laneX, 6, laneW, g.h - 12, 14); x.fillStyle = grd; x.fill(); x.save(); K.rr(x, laneX, 6, laneW, g.h - 12, 14); x.clip();
    x.strokeStyle = 'rgba(160,120,70,.10)'; x.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      x.beginPath(); x.moveTo(laneX + laneW * i / 8, 6); x.lineTo(laneX + laneW * i / 8, g.h - 6); x.stroke();
    }
    x.fillStyle = 'rgba(160,120,70,.22)'; const ay = g.h * .70;
    for (let i = 0; i < 7; i++) {
      const ax = laneX + laneW * (i + 1) / 8; x.beginPath(); x.moveTo(ax, ay - 9); x.lineTo(ax + 5, ay); x.lineTo(ax - 5, ay); x.closePath(); x.fill();
    }
    x.strokeStyle = 'rgba(160,120,70,.30)'; x.lineWidth = 2; x.beginPath(); x.moveTo(laneX, g.h - 58); x.lineTo(laneX + laneW, g.h - 58); x.stroke(); x.restore();
  }

  function pinLabel(x, p) {
    const size = 10, max = geo.gapX * .98; x.font = `700 ${size}px "Bricolage Grotesque",system-ui,sans-serif`; let s = p.l;
    while (s.length > 1 && x.measureText(s).width > max - 10) s = s.slice(0, -1);
    if (s !== p.l) s = s.trim() + '…';
    const w = Math.min(max, x.measureText(s).width + 10), h2 = size + 7;
    K.rr(x, p.x - w / 2, p.y + geo.pinR + 2, w, h2, h2 / 2); x.fillStyle = p.down ? 'rgba(255,255,255,.38)' : 'rgba(255,255,255,.93)'; x.fill();
    x.fillStyle = p.down ? 'rgba(36,26,85,.42)' : '#241a55'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, p.x, p.y + geo.pinR + 2 + h2 / 2 + .5);
  }

  function drawPins(x) {
    pins.forEach((p) => {
      const f = p.f, R = geo.pinR; const lw = R * 2 * (1 + f * .5), lh = R * 2 * (1 - f * .3); x.save(); x.translate(p.x, p.y + f * R * .55); x.rotate(f * p.dir * .9);
      K.rr(x, -lw / 2, -lh / 2, lw, lh, lh / 2); x.fillStyle = '#fffdf8'; x.fill(); x.strokeStyle = p.c; x.lineWidth = 2.2; x.stroke();
      x.beginPath(); x.arc(0, 0, R * .32, 0, TAU); x.fillStyle = p.c; x.fill(); x.restore(); x.globalAlpha = 1 - f * .45;
      pinLabel(x, p); x.globalAlpha = 1;
    });
  }

  function drawBall(x) {
    const b = ball; x.save(); x.shadowColor = 'rgba(36,26,85,.28)'; x.shadowBlur = 10; x.shadowOffsetY = 4; x.beginPath(); x.arc(b.x, b.y, b.r, 0, TAU);
    const grd = x.createRadialGradient(b.x - b.r * .35, b.y - b.r * .4, 1, b.x, b.y, b.r);
    grd.addColorStop(0, '#8f7bff'); grd.addColorStop(1, '#3a2470'); x.fillStyle = grd; x.fill(); x.restore(); x.fillStyle = 'rgba(255,255,255,.55)';
    [[-.32, -.30], [0, -.46], [.34, -.26]].forEach((o) => {
      x.beginPath(); x.arc(b.x + b.r * o[0], b.y + b.r * o[1], b.r * .14, 0, TAU); x.fill();
    });
  }

  function drawAim(x, g) {
    const p = clamp((drag.y0 - drag.y) / (g.h * .40), 0, 1); x.save(); x.setLineDash([6, 7]); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(ball.x, ball.y); x.lineTo(ball.x + (drag.x - drag.x0) * 1.4, ball.y + (drag.y - drag.y0) * 1.4); x.stroke(); x.setLineDash([]);
    const bx = g.w - 16, by = g.h * .42, bh = g.h * .30;
    K.rr(x, bx - 5, by, 10, bh, 5); x.fillStyle = 'rgba(36,26,85,.18)'; x.fill();
    K.rr(x, bx - 5, by + bh * (1 - p), 10, bh * p, 5); x.fillStyle = p > .85 ? PAL[0] : PAL[4]; x.fill(); x.restore();
  }

  function frame(dt) {
    const g = K.fit(cv());
    if (!geo || Math.abs(geo.w - g.w) > .5) layout();
    if (!geo) return;
    const x = g.x, w = g.w, h = g.h; x.clearRect(0, 0, w, h);
    K.rr(x, 0, 0, w, h, 18); x.fillStyle = 'rgba(255,255,255,.28)'; x.fill();
    drawLane(x, g);
    if (rolling) {
      const steps = Math.max(1, Math.ceil(Math.abs(ball.vy) * dt / 6));
      for (let i = 0; i < steps; i++) advance(dt / steps);
      pins.forEach((p) => { if (p.down && p.f < 1) p.f = Math.min(1, p.f + dt * .10); });
      if (ball.y < geo.top - 44 || Math.abs(ball.vy) < .5 || ball.y > h + 30) finish();
    }
    drawPins(x);
    if (ball.y < h + 20) drawBall(x);
    if (drag) drawAim(x, g);
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  K && window.DECIDER_GAMES.push({
    id: 'bowling', name: 'Bowling', short: 'Bowling', label: 'Lane', noResult: true, button: false,
    body: `<canvas class="toy" id="bwCv"></canvas><div class="res" id="bwRes" aria-live="polite"><span class="muted">Swipe up the lane to roll</span></div><button class="btn" id="bwGo">Roll</button>`,
    init(card) {
      labels = pick(5);
      L = K.loop(frame);
      layout();
      card.querySelector('#bwGo').onclick = roll;
      cv().addEventListener('pointerdown', (e) => {
        if (rolling || !geo) return;
        if (done) build();
        const p = at(e);
        drag = { x0: p.x, y0: p.y, x: p.x, y: p.y };
        try { cv().setPointerCapture(e.pointerId); } catch (err) {}
      });
      cv().addEventListener('pointermove', (e) => { if (!drag) return; const p = at(e); drag.x = p.x; drag.y = p.y; });
      cv().addEventListener('pointerup', () => { if (drag) roll(); });
      cv().addEventListener('pointercancel', () => { drag = null; });
    },
    enter() { layout(); L.start(); },
    leave() { drag = null; L.stop(); },
    action() { if (!rolling) roll(); }
  });
})();