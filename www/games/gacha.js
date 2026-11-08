/* Gacha — turn the knob, one capsule drops into the tray, its colour decides. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  if (!K) return;
  const cv = () => document.getElementById('gaCv'), out = () => document.getElementById('gaRes');
  let L = null, G = null, caps = [], labels = [], n = 26, lastR = 0;
  let knob = { x: 0, y: 0, r: 22 }, angle = 0, st = 'idle', spin = 0, spinGoal = 0;
  let settleT = 0, drag = null, one = null, prize = 0, pending = 0.6, domeTurn = 0, refill = 0;

  function geom() {
    const c = cv(); if (!c) return null;
    const f = K.fit(c), domeR = Math.min(f.w * 0.32, f.h * 0.235), domeCy = f.h * 0.09 + domeR;
    const bodyTop = domeCy + domeR * 0.72, bodyBot = f.h * 0.805;
    return { x: f.x, w: f.w, h: f.h, cx: f.w / 2, domeR, domeCy, bodyTop, bodyBot,
      knob: { x: f.w * 0.28, y: (bodyTop + bodyBot) / 2 + 10, r: Math.min(24, f.w * 0.062) },
      flap: { x: f.w * 0.68, y: bodyBot - 10 },
      tray: { x: f.w * 0.68, y: f.h * 0.845, w: f.w * 0.38, h: f.h * 0.105 } };
  }

  function pack(g) {
    labels = K.prizes.slice(0, 5);
    const cr = Math.max(5, g.domeR * 0.115 * Math.sqrt(26 / Math.max(18, n)));   // 36 capsules used to overlap into one blob
    caps = [];
    for (let i = 0; i < n; i++) {
      let px = g.cx, py = g.domeCy, ok = false;
      for (let t = 0; t < 70 && !ok; t++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * (g.domeR - cr * 1.9);
        px = g.cx + Math.cos(a) * d;
        py = g.domeCy + Math.sin(a) * d + g.domeR * 0.08;
        ok = caps.every(c => Math.hypot(c.x - px, c.y - py) > cr * 1.5);
      }
      caps.push({ x: px, y: py, r: cr * (0.84 + Math.random() * 0.28), rot: Math.random() * 6.28,
        ci: Math.floor(Math.random() * labels.length), ph: Math.random() * 6.28,
        vx: (Math.random() - .5) * .6, vy: (Math.random() - .5) * .6 });
    }
    /* let the pile fall into the bottom of the dome before anyone sees it */
    if (g.capsR == null) g.capsR = cr;
    for (let k = 0; k < 90; k++) capsStep(1, g);
  }

  function spinNow(power) {
    if (st !== 'idle') return;
    pending = Math.max(0, Math.min(1, typeof power === 'number' ? power : 0.6));
    one = null; st = 'spin'; spin = 0; spinGoal = Math.PI * 2 * (0.6 + pending * 2.4);
    try { K.setResult(out(), '…'); } catch (e) {}
    try { K.sfx.ratchet(.8); } catch (e) {}
  }

  function release() {
    const g = G || geom(); if (!g) return;
    // the drum turns with the knob: a hard turn carries the next capsules past the flap
    domeTurn = (domeTurn + 1 + Math.round(pending * 5)) % Math.max(1, caps.length);
    prize = caps.length ? caps[domeTurn].ci : 0;
    let sx = g.flap.x, sy = g.flap.y;
    if (caps.length > 1) {
      /* the capsule that leaves is the one that was in the dome, from the spot
         it had turned to — and the pile closes over the hole it left */
      const c = caps[domeTurn];
      const a = spin * 0.9, dx = c.x - g.cx, dy = c.y - g.domeCy;
      sx = g.cx + dx * Math.cos(a) - dy * Math.sin(a);
      sy = g.domeCy + dx * Math.sin(a) + dy * Math.cos(a);
      caps.splice(domeTurn, 1);
    }
    one = { x: sx, y: sy, r: Math.max(8, g.domeR * 0.13), ci: prize, vy: 1.1, bounces: 0, rot: 0, settled: false };
    /* the rest of the pile shifts into the gap */
    caps.forEach(c => { c.vy += 0.4; c.vx += (Math.random() - .5) * 0.5; });
    st = 'drop';
    try { K.sfx.clink(.6); } catch (e) {}
    try { buzz(16); } catch (e) {}
  }

  function decide() {
    const label = labels[prize] || labels[0];
    K.setResult(out(), label);
  }

  /* the capsules are a real pile inside the dome: they fall, they roll against
     the glass, they shove each other, and the drum carries them round while it
     turns. This is what the dome was missing — before it was a still field with
     a sine wobble. */
  function capsStep(dt, g) {
    if (!g) g = G;
    if (!g) return;
    const R = g.domeR, cx = g.cx, cy = g.domeCy;
    const spinning = st === 'spin';
    const stirring = !!drag;                                 /* the knob is being turned */
    for (const c of caps) {
      c.vy += 0.045 * dt;                                  /* they fall to the bottom */
      if (spinning || stirring) {
        /* carried by the drum, and shoved outward a little as it turns */
        const dx = c.x - cx, dy = c.y - cy;
        const w = 0.055 * dt * Math.min(1, 0.4 + c.r / R) * (spinning ? 1 : 0.55);
        c.vx += -dy * w * 0.35; c.vy += dx * w * 0.35;
        c.rot += 0.10 * dt + Math.abs(c.vx) * 0.02 * dt;
        if (stirring) { c.vx += (Math.random() - .5) * 0.06 * dt; c.vy += (Math.random() - .5) * 0.06 * dt; }
      }
      c.vx *= Math.pow(.955, dt); c.vy *= Math.pow(.955, dt);
      c.x += c.vx * dt; c.y += c.vy * dt;
      /* the glass */
      const dx = c.x - cx, dy = c.y - cy, d = Math.hypot(dx, dy) || 1;
      const lim = R - c.r - 1.5;
      if (d > lim) {
        const nx = dx / d, ny = dy / d;
        c.x = cx + nx * lim; c.y = cy + ny * lim;
        const vn = c.vx * nx + c.vy * ny;
        if (vn > 0) { c.vx -= nx * vn * 1.45; c.vy -= ny * vn * 1.45; }
        c.rot += (c.vx * nx + c.vy * ny) * 0.01 * dt;
      }
    }
    /* capsules are solid to each other, so the pile actually packs */
    for (let i = 0; i < caps.length; i++) {
      for (let j = i + 1; j < caps.length; j++) {
        const a = caps[i], b = caps[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        const mn = (a.r + b.r) * 0.94;
        if (d >= mn || d < 0.0001) continue;
        const nx = dx / d, ny = dy / d, push = (mn - d) * 0.5;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          const imp = vn * 0.55;
          a.vx += nx * imp; a.vy += ny * imp;
          b.vx -= nx * imp; b.vy -= ny * imp;
        }
      }
    }
  }

  function update(dt) {
    const g = G;
    if (st === 'spin') {
      angle += 0.23 * dt; spin += 0.23 * dt;
      if (spin >= spinGoal) release();
    }
    capsStep(dt, g);
    /* the machine gets restocked once the dome runs low */
    if (g && st === 'idle' && caps.length < 9) { refill = (refill || 0) + dt; if (refill > 60) { refill = 0; n = 26; pack(g); } }
    else refill = 0;
    if (st === 'drop' && one) {
      one.vy += 0.52 * dt; one.y += one.vy * dt; one.rot += 0.05 * dt;
      one.x += (g.tray.x - one.x) * 0.1 * dt;
      const floor = g.tray.y + g.tray.h * 0.5 - one.r;
      if (one.y > floor) {
        one.y = floor;
        if (one.bounces < 1 && one.vy > 2) {
          one.vy = -one.vy * 0.42; one.bounces++;
          try { K.sfx.ratchet(1.1); } catch (e) {}
        } else {
          one.vy = 0; one.settled = true; st = 'settle'; settleT = 0;
          try { K.sfx.clink(1.3); } catch (e) {}
        }
      }
    }
    if (st === 'settle') {
      settleT += dt;
      if (settleT > 22) { st = 'idle'; decide(); }
    }
  }

  /* a capsule is a ball: lit from the top left, darker at the bottom rim, with
     the seam of the two halves running across it */
  function cap(x, cx, cy, r, rot, ci) {
    const col = PAL[ci % PAL.length];
    x.save(); x.translate(cx, cy);
    const ball = x.createRadialGradient(-r * .36, -r * .42, r * .10, 0, -r * .05, r * 1.08);
    ball.addColorStop(0, '#ffffff');
    ball.addColorStop(.22, col);
    ball.addColorStop(.72, col);
    ball.addColorStop(1, 'rgba(26,12,58,.62)');
    x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fillStyle = ball; x.fill();
    x.beginPath(); x.arc(0, 0, r - .4, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(24,12,56,.30)'; x.lineWidth = Math.max(.7, r * .08); x.stroke();
    /* the seam, turned with the capsule */
    x.save(); x.rotate(rot);
    x.beginPath(); x.ellipse(0, 0, r * .94, r * .26, 0, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(255,255,255,.30)'; x.lineWidth = Math.max(.6, r * .06); x.stroke();
    x.restore();
    /* the specular and its hot spot */
    x.beginPath(); x.ellipse(-r * .34, -r * .40, r * .30, r * .19, -.6, 0, Math.PI * 2);
    x.fillStyle = 'rgba(255,255,255,.70)'; x.fill();
    x.beginPath(); x.ellipse(-r * .12, -r * .54, r * .10, r * .07, -.6, 0, Math.PI * 2);
    x.fillStyle = 'rgba(255,255,255,.95)'; x.fill();
    x.restore();
  }

  function paint(g, now) {
    const x = g.x, tr = g.tray, kn = g.knob;
    x.clearRect(0, 0, g.w, g.h);

    x.save(); x.beginPath(); x.ellipse(g.cx, g.bodyBot + 12, g.w * 0.36, 10, 0, 0, Math.PI * 2);
    x.fillStyle = 'rgba(36,26,85,.14)'; x.fill();
    x.restore();

    x.save();
    K.rr(x, 10, g.bodyTop, g.w - 20, g.bodyBot - g.bodyTop + 10, 26);
    const bg = x.createLinearGradient(0, g.bodyTop, 0, g.bodyBot);
    bg.addColorStop(0, '#9481ff'); bg.addColorStop(.55, '#6d5bd8'); bg.addColorStop(1, '#46359f');
    /* on paper the cabinet is printed stock with an ink edge, not a glossy violet slab */
    x.fillStyle = K.mat().flat ? '#ece2ca' : bg; x.fill();
    x.strokeStyle = K.mat().flat ? '#241a3a' : INK(.55); x.lineWidth = K.mat().flat ? 1.8 : 2; x.stroke();
    x.restore();

    x.save();
    K.rr(x, tr.x - tr.w / 2, tr.y - tr.h * 0.3, tr.w, tr.h * 1.2, 16);
    x.fillStyle = K.mat().flat ? '#e6dfcc' : INK(.45); x.fill();
    if (K.mat().flat) { x.strokeStyle = '#241a3a'; x.lineWidth = 1.5; x.stroke(); }
    x.strokeStyle = 'rgba(36,26,85,.25)'; x.lineWidth = 2; x.stroke();
    x.restore();

    x.save();
    K.rr(x, g.flap.x - 26, g.flap.y - 6, 52, 28, 13);
    x.fillStyle = 'rgba(24,16,52,.62)'; x.fill();
    x.strokeStyle = INK(.3); x.lineWidth = 1.5; x.stroke();
    x.restore();

    x.save(); x.beginPath(); x.arc(kn.x, kn.y, kn.r, 0, Math.PI * 2);
    x.fillStyle = K.light(.9); x.fill();
    x.strokeStyle = 'rgba(36,26,85,.35)'; x.lineWidth = 2; x.stroke();
    x.translate(kn.x, kn.y); x.rotate(angle);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(kn.r * 0.8, 0);
    x.strokeStyle = '#46359f'; x.lineWidth = 4; x.lineCap = 'round'; x.stroke();
    x.beginPath(); x.arc(0, 0, kn.r * 0.34, 0, Math.PI * 2);
    x.fillStyle = '#46359f'; x.fill();
    x.restore();

    x.save(); x.beginPath(); x.arc(g.cx, g.domeCy, g.domeR, 0, Math.PI * 2);
    x.fillStyle = INK(.26); x.fill();
    x.clip();
    const amp = st === 'spin' ? 1.1 : 0.45;
    /* turn the field with the knob, so the capsule that drops is visibly carried
       to the flap instead of appearing out of an idle dome */
    if (st === 'spin') { x.translate(g.cx, g.domeCy); x.rotate(spin * 0.9); x.translate(-g.cx, -g.domeCy); }
    caps.forEach(c => {
      const bx = c.x + (c.jx || 0) + Math.sin(now * 0.0012 + c.ph) * amp;
      const by = c.y + (c.jy || 0) + Math.cos(now * 0.0016 + c.ph) * amp;
      cap(x, bx, by, c.r, c.rot, c.ci);
    });
    x.restore();

    x.save(); x.beginPath(); x.arc(g.cx, g.domeCy, g.domeR, 0, Math.PI * 2);
    x.strokeStyle = INK(.8); x.lineWidth = 3; x.stroke();
    x.beginPath();
    x.arc(g.cx - g.domeR * 0.28, g.domeCy - g.domeR * 0.3, g.domeR * 0.55, Math.PI * 1.05, Math.PI * 1.52);
    x.strokeStyle = INK(.55); x.lineWidth = 5; x.lineCap = 'round'; x.stroke();
    /* collar where the dome meets the body, and the mechanism that connects the knob
       to the flap — the body was 118px of flat panel with a small dial on it */
    x.beginPath(); x.ellipse(g.cx, g.bodyTop + 2, g.domeR * 0.86, 12, 0, 0, Math.PI * 2);
    x.fillStyle = K.mat().flat ? '#e6dfcc' : 'rgba(0,0,0,.22)'; x.fill();
    x.strokeStyle = INK(.5); x.lineWidth = 1.6; x.stroke();
    x.save(); x.strokeStyle = INK(.3); x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(g.knob.x, g.knob.y - g.knob.r - 4); x.lineTo(g.knob.x, g.bodyTop + 16);
    x.lineTo(g.flap.x, g.bodyTop + 16); x.lineTo(g.flap.x, g.flap.y - 12); x.stroke();
    x.beginPath(); x.arc(g.knob.x, g.bodyTop + 16, 2.2, 0, Math.PI * 2); x.fillStyle = INK(.45); x.fill(); x.restore();
    x.restore();

    if (one) {
      if (one.settled) {
        x.save(); x.beginPath(); x.arc(one.x, one.y, one.r * 1.9, 0, Math.PI * 2);
        x.fillStyle = INK(.22); x.fill();
        x.restore();
      }
      cap(x, one.x, one.y, one.r, one.rot, one.ci);
    }
  }

  function frame(dt, now) {
    const g = geom(); if (!g) return;
    G = g; knob = g.knob;
    if (Math.abs(g.domeR - lastR) > 1) { lastR = g.domeR; pack(g); }
    update(dt);
    paint(g, now);
  }

  window.DECIDER_GAMES.push({
    id: 'gacha', name: 'Gacha', short: 'Gacha', label: 'Capsules', noResult: true, button: false,
    body: `<canvas class="toy" id="gaCv"></canvas>
      <div class="res" id="gaRes" aria-live="polite"><span class="muted">Turn the knob</span></div>
      <button class="btn" id="gaGo">Turn</button>`,
    tune: `<div class="lbl">Capsules in the dome</div><div class="chips" id="gaCount" style="margin:0"></div>`,
    init(card) {
      L = K.loop(frame);
      labels = K.prizes.slice(0, 5);
      const c = cv();
      card.querySelector('#gaGo').onclick = () => spinNow(0.6);
      c.addEventListener('pointerdown', e => {
        const r = c.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        if (st === 'idle' && Math.hypot(px - knob.x, py - knob.y) < knob.r * 1.9) {
          drag = { a: Math.atan2(py - knob.y, px - knob.x), turned: 0 };
          try { c.setPointerCapture(e.pointerId); } catch (err) {}
          e.preventDefault();
        } else spinNow(0.6);
      });
      c.addEventListener('pointermove', e => {
        if (!drag) return;
        const r = c.getBoundingClientRect();
        const a = Math.atan2(e.clientY - r.top - knob.y, e.clientX - r.left - knob.x);
        let d = a - drag.a;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        drag.a = a; drag.turned += Math.abs(d); angle += d;
        /* the knob just turns with the hand; the spin is fired on release, so a
           third of a turn and three full turns are not the same draw */
      });
      c.addEventListener('pointerup', () => {
        if (!drag) return;
        const turned = drag.turned;
        angle = 0; drag = null;
        if (turned < 0.25) { spinNow(0.18); }
        else {
          pending = Math.min(1, turned / (Math.PI * 2.5));
          one = null; st = 'spin'; spin = 0; spinGoal = Math.PI * 2 * (0.6 + pending * 2.4);
        }
      });
      c.addEventListener('pointercancel', () => { drag = null; });
      const chips = card.querySelector('#gaCount');
      const render = () => {
        chips.innerHTML = [18, 26, 36].map(v => `<button class="chip${v === n ? ' on' : ''}" data-v="${v}">${v}</button>`).join('');
        chips.querySelectorAll('.chip').forEach(b => b.onclick = () => { n = +b.dataset.v; render(); if (G) pack(G); });
      };
      render();
    },
    enter() { labels = K.prizes.slice(0, 5); if (G) pack(G); L.start(); },
    leave() { L.stop(); drag = null; },
    action() { spinNow(0.6); },
    status() {
      return { st, spin: +spin.toFixed(2), capsules: caps.length,
        first: caps[0] ? { x: +caps[0].x.toFixed(1), y: +caps[0].y.toFixed(1) } : null,
        prize, pending: +pending.toFixed(2) };
    },
    shake(info) {
      if (st !== 'idle') return;
      const p = Math.max(.35, Math.min(1, info.power || .6));
      // the dome takes a beating; the harder the shake, the further the drum turns
      caps.forEach(c => {
        /* jitter decays and is clamped inside the dome; the old write to c.x/c.y was
           a random walk that pushed the contents into the rim over a dozen shakes */
        c.jx = (c.jx || 0) + (Math.random() - .5) * 9;
        c.jy = (c.jy || 0) - Math.random() * 5;
        const d = Math.hypot(c.x + c.jx - g.cx, c.y + c.jy - g.domeCy);
        const lim = g.domeR - c.r - 2;
        if (d > lim) { c.jx *= .4; c.jy *= .4; }
      });
      pending = p; one = null; st = 'spin'; spin = 0;
      spinGoal = Math.PI * 2 * (0.8 + p * 2.6);
      try { K.sfx.thud(1.1); } catch (e) {}
      try { buzz([18, 26, 18]); } catch (e) {}
    }
  });
})();
