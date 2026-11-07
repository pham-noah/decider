/* Pachinko — charge the spring, fire the ball up the chute, let the pins decide. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  if (!K) return;
  const cv = () => document.getElementById('paCv'), out = () => document.getElementById('paRes');
  let L = null, G = null, pegs = [], slots = [], balls = [], landed = -1, builtW = 0;
  let charging = false, charge = 0, autoT = 0, bounce = 0.6;

  function geom() {
    const c = cv(); if (!c) return null;
    const f = K.fit(c), laneW = Math.max(24, f.w * 0.095), laneX = f.w - laneW - 6;
    return { x: f.x, w: f.w, h: f.h, laneX, laneCx: laneX + laneW / 2, topY: f.h * 0.135,
      shelfY: f.h * 0.845, fL: 10, fR: laneX - 8, ballR: Math.max(5, f.w * 0.016) };
  }

  function build(g) {
    pegs = [];
    const rows = 7, cols = 5, gapY = (g.shelfY - 42 - (g.topY + 22)) / (rows - 1);
    const gapX = (g.fR - g.fL) / cols, pr = Math.max(3, g.w * 0.0125);
    for (let r = 0; r < rows; r++) {
      const odd = r % 2 === 1;
      for (let i = 0; i < cols - (odd ? 1 : 0); i++) {
        const px = g.fL + gapX * (i + 0.5 + (odd ? 0.5 : 0));
        if (px < g.fR - 6) pegs.push({ x: px, y: g.topY + 22 + r * gapY, r: pr });
      }
    }
    const labels = K.options(5), span = (g.laneX - 10) / labels.length;
    slots = labels.map((l, i) => ({ l, x: 6 + i * span, w: span }));
  }

  function startCharge() {
    if (balls.length) return;
    charging = true; charge = 0; autoT = 0;
    try { tone(170, .06, .04, 'square'); } catch (e) {}
  }

  function fire() {
    if (!charging) return;
    const g = geom() || G; if (!g) return;
    G = g; charging = false; landed = -1;
    const p = Math.max(0.14, charge); charge = 0;
    /* the chute is exited only by reaching topY, so the launch speed has to be
       derived from the climb it faces — the old fixed -(15 + p*1.2) apexed under
       the top on a tall canvas and the ball fell back, bricking the toy forever */
    const climb = Math.max(80, (g.shelfY - g.topY) + 24);
    const vmin = Math.sqrt(2 * 0.34 * climb * 1.12);
    balls.push({ x: g.laneCx, y: g.shelfY - 12, vx: 0, vy: -(vmin + p * 70), r: g.ballR, phase: 'chute', power: p, age: 0 });
    K.setResult(out(), '…');
    try { tone(220 + p * 620, .12, .05, 'triangle', 900); } catch (e) {}
  }

  function land(b, g) {
    b.done = true;
    const i = Math.max(0, Math.min(slots.length - 1, Math.floor((b.x - 6) / slots[0].w)));
    landed = i;
    K.setResult(out(), slots[i].l);
    K.decide(slots[i].l, 'Pachinko', 'Power ' + Math.round(b.power * 100) + '%');
  }

  function step(b, dt, g) {
    if (b.phase === 'chute') {
      b.vy += 0.34 * dt; b.y += b.vy * dt;
      b.age = (b.age || 0) + dt;
      /* leave the chute at the top, or the moment the ball stops rising, and never
         let a chute shot hold balls.length hostage */
      if (b.age > 300) { land(b, g); return; }
      if (b.y <= g.topY || b.vy >= 0) {
        b.phase = 'field'; b.y = g.topY; b.x = g.laneX - b.r - 2;
        b.vx = -(1.2 + b.power * 7.4); b.vy = 0.6;
        try { tone(880, .05, .03, 'sine'); } catch (e) {}
      }
      return;
    }
    b.vy += 0.36 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    for (let i = 0; i < pegs.length; i++) {
      const p = pegs[i], dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), min = b.r + p.r;
      if (d < min && d > 0.01) {
        const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
        b.x += nx * (min - d); b.y += ny * (min - d);
        b.vx = (b.vx - 2 * vn * nx) * bounce + nx * 0.4;
        b.vy = (b.vy - 2 * vn * ny) * bounce;
        b.vx += (Math.random() - 0.5) * 0.4;
      }
    }
    if (b.x < g.fL + b.r) { b.x = g.fL + b.r; b.vx = Math.abs(b.vx) * bounce; }
    if (b.x > g.laneX - b.r) { b.x = g.laneX - b.r; b.vx = -Math.abs(b.vx) * bounce; }
    if (b.y < 8 + b.r) { b.y = 8 + b.r; b.vy = Math.abs(b.vy) * 0.4; }
    if (b.y > g.shelfY + 4) land(b, g);
  }

  function paint(g) {
    const x = g.x;
    x.clearRect(0, 0, g.w, g.h);
    x.save(); K.rr(x, 0, 0, g.w, g.h, 18); x.fillStyle = INK(.34); x.fill(); x.restore();

    slots.forEach((s, i) => {
      x.save();
      K.rr(x, s.x + 2, g.shelfY - 2, s.w - 4, g.h - g.shelfY - 2, 9);
      x.fillStyle = landed === i ? '#fffdf8' : PAL[i % PAL.length] + 'cc';
      x.fill(); x.restore();
      x.fillStyle = landed === i ? '#241a55' : INK(1);
      x.font = `700 ${Math.max(9, Math.min(12, s.w / 5.2))}px "Bricolage Grotesque",system-ui,sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      let t = s.l;
      while (t.length > 1 && x.measureText(t).width > s.w - 8) t = t.slice(0, -1);
      x.fillText(t === s.l ? t : t + '…', s.x + s.w / 2, g.shelfY + (g.h - g.shelfY) / 2);
    });

    pegs.forEach(p => {
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      x.fillStyle = INK(.95); x.fill();
      x.strokeStyle = 'rgba(111,139,255,.5)'; x.lineWidth = 1.5; x.stroke();
    });

    x.save();
    K.rr(x, g.laneX, g.topY, g.w - g.laneX - 4, g.shelfY - g.topY, 12);
    x.fillStyle = 'rgba(36,26,85,.10)'; x.fill();
    x.strokeStyle = INK(.6); x.lineWidth = 2; x.stroke();
    x.restore();

    x.save(); x.beginPath();
    x.moveTo(g.laneCx + 9, g.topY + 44);
    x.quadraticCurveTo(g.laneCx + 9, g.topY + 8, g.laneX - 14, g.topY + 6);
    x.strokeStyle = INK(.5); x.lineWidth = 3; x.lineCap = 'round'; x.stroke();
    x.beginPath();
    x.moveTo(g.laneX - 23, g.topY + 1); x.lineTo(g.laneX - 12, g.topY + 6); x.lineTo(g.laneX - 22, g.topY + 14);
    x.fillStyle = INK(.5); x.fill();
    x.restore();

    const barTop = g.topY + 34, barH = g.shelfY - 40 - barTop;
    x.save();
    K.rr(x, g.laneX + 5, barTop, 6, barH, 3); x.fillStyle = 'rgba(36,26,85,.14)'; x.fill();
    if (charge > 0) {
      const hh = Math.max(3, barH * charge);
      K.rr(x, g.laneX + 5, barTop + barH - hh, 6, hh, 3);
      x.fillStyle = charge > 0.94 ? PAL[0] : PAL[1]; x.fill();
    }
    x.restore();

    const sy = g.shelfY - 6, sh = 26 - charge * 16;
    x.beginPath();
    for (let i = 0; i <= 6; i++) {
      const yy = sy - sh + (sh / 6) * i, xx = g.laneCx + (i % 2 ? 8 : -8);
      i ? x.lineTo(xx, yy) : x.moveTo(xx, yy);
    }
    x.strokeStyle = INK(.8); x.lineWidth = 2; x.stroke();

    const ball = (bx, by, r) => {
      x.beginPath(); x.arc(bx, by, r, 0, Math.PI * 2);
      const gr = x.createRadialGradient(bx - r * .3, by - r * .3, 1, bx, by, r);
      gr.addColorStop(0, K.light(1)); gr.addColorStop(1, '#7b6cff');
      x.fillStyle = gr; x.fill();
      x.strokeStyle = INK(.9); x.lineWidth = 1.2; x.stroke();
    };
    if (!balls.length) ball(g.laneCx, sy - sh - g.ballR - 1 - charge * 4, g.ballR);
    balls.forEach(b => ball(b.x, b.y, b.r));

    if (charge > 0.02) {
      x.beginPath(); x.arc(g.laneCx, sy - sh - g.ballR, 16 + charge * 12, 0, Math.PI * 2);
      x.fillStyle = `rgba(255,255,255,${0.05 + charge * 0.12})`; x.fill();
    }
  }

  function frame(dt) {
    const g = geom(); if (!g) return;
    G = g;
    if (Math.abs(g.w - builtW) > 1) { build(g); builtW = g.w; }
    if (charging) {
      charge = Math.min(1, charge + 0.019 * dt);
      if (autoT > 0) { autoT -= dt; if (autoT <= 0) fire(); }
    }
    balls.forEach(b => { if (!b.done) step(b, dt, g); });
    balls = balls.filter(b => !b.done);
    paint(g);
  }

  window.DECIDER_GAMES.push({
    id: 'pachinko', name: 'Pachinko', short: 'Pachinko', label: 'Power', button: false,
    body: `<canvas class="toy" id="paCv"></canvas>
      <div class="res" id="paRes" aria-live="polite"><span class="muted">Hold to charge, release to fire</span></div>
      <button class="btn" id="paGo">Hold to fire</button>`,
    tune: `<div class="lbl">Peg bounce</div><div class="chips" id="paBounce" style="margin:0"></div>`,
    init(card) {
      L = K.loop(frame);
      const c = cv(), chips = card.querySelector('#paBounce');
      card.querySelector('#paGo').addEventListener('pointerdown', e => { e.preventDefault(); startCharge(); });
      c.addEventListener('pointerdown', e => { e.preventDefault(); startCharge(); });
      c.addEventListener('pointerup', () => { if (charging) fire(); });
      document.addEventListener('pointerup', () => { if (charging) fire(); });
      const opts = [['Soft', 0.42], ['Normal', 0.6], ['Bouncy', 0.78]];
      const render = () => {
        chips.innerHTML = opts.map(([n, v]) => `<button class="chip${v === bounce ? ' on' : ''}" data-v="${v}">${n}</button>`).join('');
        chips.querySelectorAll('.chip').forEach(b => b.onclick = () => { bounce = +b.dataset.v; render(); });
      };
      render();
    },
    enter() {
      /* a wedged or lost ball used to survive a view change and stop the plunger for good */
      balls = []; landed = -1; charging = false; charge = 0; autoT = 0;
      try { K.setResult(out(), ''); } catch (e) {}
      L.start();
    },
    leave() { L.stop(); charging = false; autoT = 0; charge = 0; },
    action() {
      if (charging) { fire(); return; }
      startCharge(); autoT = 26 + Math.random() * 34;
    }
  });
})();
