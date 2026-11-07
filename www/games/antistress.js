/* Antistress — six little tactile toys in a grid: bubble wrap that pops and
 * refills, a knob with detents, a switch, a springy button, a rubber band and a
 * stress ball. Touch only, no score. */
(function () {
  /* white ink flips to ink-black on the paper skin */
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT, TAU = Math.PI * 2; const cv = () => document.getElementById('antsCv'); const resEl = () => document.getElementById('antsRes');
  let L = null, g = null, zones = [], t = 0, active = null; const bub = Array.from({ length: 12 }, () => ({ s: 1, cool: 0, grew: false, flash: 0 })); const puffs = [];
  const knob = { v: 2, target: 2, dragging: false, last: 2 }; const sw = { on: false, a: 0 };
  const btn = { p: 0, v: 0, held: false }; const band = { x: 0, y: 0, vx: 0, vy: 0, held: false, ox: 0, oy: 0 }; const ball = { sq: 0, wob: 0, vs: 0, held: false, px: 0, py: 0 };
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} }; const hap = (n) => { try { buzz(n); } catch (e) {} };
  const say = (s) => { const el = resEl(); if (el) el.innerHTML = '<span class="muted">' + s + '</span>'; };
  function layout() {
    const c = cv(); if (!c) return; g = K.fit(c); const m = 10, gap = 9, w = (g.w - m * 2 - gap) / 2, h = (g.h - m * 2 - gap * 2) / 3; zones = [];
    for (let i = 0; i < 6; i++) zones.push({ x: m + (i % 2) * (w + gap), y: m + Math.floor(i / 2) * (h + gap), w, h });
  }
  function zoneAt(p) {
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i]; if (p.x > z.x && p.x < z.x + z.w && p.y > z.y && p.y < z.y + z.h) return i;
    }
    return -1;
  }
  function knobGeo(z) { return { x0: z.x + 20, x1: z.x + z.w - 20, y: z.y + z.h * .63 }; }
  function bandGeo(z) {
    const ax = z.x + 22, bx = z.x + z.w - 22, y = z.y + z.h * .53; return { ax, bx, y, mx: (ax + bx) / 2, my: y };
  }
  function ballGeo(z) { return { cx: z.x + z.w / 2, cy: z.y + z.h * .57, r: Math.min(z.w, z.h) * .27 }; }
  function bubbleAt(z, p) {
    const cols = 4, rows = 3, pad = 13, top = 22; const bw = (z.w - pad * 2) / cols, bh = (z.h - top - 10) / rows; const r = Math.min(bw, bh) * .40;
    for (let i = 0; i < 12; i++) {
      const cx = z.x + pad + bw * (i % cols) + bw / 2; const cy = z.y + top + bh * Math.floor(i / cols) + bh / 2; if (Math.hypot(p.x - cx, p.y - cy) < r + 9) return i;
    }
    return -1;
  }
  function popBubble(b, cx, cy) {
    if (b.s < .5) return; b.s = 0; b.cool = 3.4 + Math.random() * 2.2; b.grew = false; b.flash = 1;
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * TAU, sp = .6 + Math.random() * 1.4; puffs.push({ a: 1, x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .4, r: 2 + Math.random() * 2 });
    }
    sfx(520 + Math.random() * 260, .05, .06, 'square', 1150); hap(6); say('pop — the square puffs back up in a moment');
  }
  function knobValue(p) {
    const z = zones[1], q = knobGeo(z); const f = (p.x - q.x0) / (q.x1 - q.x0); return Math.max(0, Math.min(6, f * 6));
  }
  function toggleSwitch() {
    sw.on = !sw.on; sfx(sw.on ? 300 : 210, .07, .06, 'square', sw.on ? 420 : 130); hap(12); say(sw.on ? 'click — the little light is on' : 'click — off again');
  }
  function squeezeBall(v) {
    ball.held = v;
    if (v) { sfx(170, .18, .05, 'sine', 110); hap(10); }
    else {
      ball.vs = 1.3; sfx(680, .14, .04, 'sine', 1080); hap(8); say('squish. it jiggles back');
    }
  }
  function down(p) {
    const i = zoneAt(p); if (i < 0) return; active = { zone: i }; const z = zones[i];
    if (i === 0) {
      const bi = bubbleAt(z, p);
      if (bi >= 0) {
        const cols = 4, rows = 3, pad = 13, top = 22; const bw = (z.w - pad * 2) / cols, bh = (z.h - top - 10) / rows;
        const cx = z.x + pad + bw * (bi % cols) + bw / 2; const cy = z.y + top + bh * Math.floor(bi / cols) + bh / 2; popBubble(bub[bi], cx, cy);
      }
    } else if (i === 1) {
      if (p.y > z.y + z.h * .3) { knob.dragging = true; knob.v = knobValue(p); knob.target = knob.v; }
    } else if (i === 2) {
      toggleSwitch();
    } else if (i === 3) {
      const bx = z.x + z.w / 2, by = z.y + z.h * .58, r = Math.min(z.w, z.h) * .26;
      if (Math.hypot(p.x - bx, p.y - by) < r + 9) {
        btn.held = true; sfx(190, .05, .05, 'sine', 120); hap(8);
      }
    } else if (i === 4) {
      const q = bandGeo(z), mx = q.mx + band.x, my = q.my + band.y;
      if (Math.hypot(p.x - mx, p.y - my) < 40) {
        band.held = true; band.ox = mx - p.x; band.oy = my - p.y;
      }
    } else if (i === 5) {
      const q = ballGeo(z);
      if (Math.hypot(p.x - q.cx, p.y - q.cy) < q.r + 10) {
        ball.px = p.x - q.cx; ball.py = p.y - q.cy; squeezeBall(true);
      }
    }
  }
  function move(p) {
    if (!active) return; const i = active.zone, z = zones[i];
    if (i === 1 && knob.dragging) {
      knob.v = knobValue(p); knob.target = knob.v;
    } else if (i === 4 && band.held) {
      const q = bandGeo(z); band.x = Math.max(-(z.w / 2 - 34), Math.min(z.w / 2 - 34, p.x + band.ox - q.mx)); band.y = Math.max(-34, Math.min(34, p.y + band.oy - q.my));
    } else if (i === 5 && ball.held) {
      const q = ballGeo(z); ball.px = p.x - q.cx; ball.py = p.y - q.cy;
    }
  }
  function up(p) {
    if (!active) return; const i = active.zone, z = zones[i];
    if (i === 1 && knob.dragging) {
      knob.dragging = false; knob.target = Math.round(knob.v); sfx(900, .05, .04, 'sine', 1200); hap(5); say('it settles on ' + (Math.round(knob.v) + 1) + ' of 7');
    } else if (i === 3 && btn.held) {
      btn.held = false; btn.v = -.3; sfx(300, .24, .07, 'sine', 780); setTimeout(() => sfx(520, .12, .03, 'sine', 900), 60); hap(10); say('boing');
    } else if (i === 4 && band.held) {
      band.held = false; band.vx = -band.x * .3; band.vy = -band.y * .3; sfx(430, .24, .06, 'triangle', 150); setTimeout(() => sfx(700, .14, .03, 'sine', 300), 40); hap(10); say('twang');
    } else if (i === 5 && ball.held) {
      squeezeBall(false);
    }
    active = null;
  }
  function step(dt) {
    bub.forEach(b => {
      if (b.cool > 0) { b.cool -= dt * .016; if (b.cool <= 0) b.grew = true; }
      else if (b.grew) { b.s = Math.min(1, b.s + .05 * dt); if (b.s >= 1) b.grew = false; }
      b.flash = Math.max(0, b.flash - .03 * dt);
    });
    puffs.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.r += .35 * dt; p.a -= .04 * dt; }); while (puffs.length && puffs[0].a <= 0) puffs.shift();
    if (!knob.dragging) knob.target = Math.round(knob.v); knob.v += (knob.target - knob.v) * (knob.dragging ? .6 : .22) * dt; const rk = Math.round(knob.v);
    if (rk !== knob.last) {
      knob.last = rk; sfx(1150 + rk * 45, .03, .05, 'triangle', 880); hap(4);
    }
    sw.a += ((sw.on ? 1 : 0) - sw.a) * .3 * dt; btn.v += ((btn.held ? 1 : 0) - btn.p) * .4 * dt; btn.v *= Math.pow(.84, dt); btn.p = Math.max(-.3, Math.min(1.2, btn.p + btn.v * dt));
    if (!band.held) {
      band.vx += -band.x * .3 * dt; band.vy += -band.y * .3 * dt; band.vx *= Math.pow(.9, dt); band.vy *= Math.pow(.9, dt); band.x += band.vx * dt; band.y += band.vy * dt;
    }
    ball.sq += ((ball.held ? 1 : 0) - ball.sq) * .2 * dt; ball.wob += ball.vs * dt; ball.vs += -ball.wob * .35 * dt; ball.vs *= Math.pow(.9, dt);
  }
  function panel(x, z, label) {
    K.rr(x, z.x, z.y, z.w, z.h, 16); x.fillStyle = INK(.05); x.fill(); x.strokeStyle = INK(.1); x.lineWidth = 1; x.stroke(); x.fillStyle = INK(.42);
    x.font = '700 9px "Bricolage Grotesque",system-ui,sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(label, z.x + 12, z.y + 13);
  }
  function drawBubbles(x, z) {
    const cols = 4, rows = 3, pad = 13, top = 22; const bw = (z.w - pad * 2) / cols, bh = (z.h - top - 10) / rows; const r = Math.min(bw, bh) * .4;
    for (let i = 0; i < 12; i++) {
      const cx = z.x + pad + bw * (i % cols) + bw / 2; const cy = z.y + top + bh * Math.floor(i / cols) + bh / 2;
      const b = bub[i]; x.beginPath(); x.arc(cx, cy, r * .92, 0, TAU); x.fillStyle = b.s < .3 ? INK(.07) : INK(.03); x.fill();
      if (b.s < .04) {
        x.beginPath(); x.arc(cx, cy, r * .34, 0, TAU); x.fillStyle = 'rgba(0,0,0,.18)'; x.fill(); continue;
      }
      const s = .4 + .6 * b.s; x.beginPath(); x.arc(cx, cy, r * s, 0, TAU); const bg = x.createRadialGradient(cx - r * .3, cy - r * .35, 1, cx, cy, r);
      bg.addColorStop(0, K.light(.96)); bg.addColorStop(.5, 'rgba(196,226,255,.55)'); bg.addColorStop(1, 'rgba(120,160,230,.3)'); x.fillStyle = bg; x.fill();
      x.strokeStyle = 'rgba(255,255,255,' + (.45 + .45 * b.flash) + ')'; x.lineWidth = 1.2; x.stroke();
      x.beginPath(); x.arc(cx - r * .3, cy - r * .35, r * .2, 0, TAU); x.fillStyle = K.light(.9); x.fill();
    }
  }
  function drawKnob(x, z) {
    const q = knobGeo(z), f = knob.v / 6; x.lineCap = 'round'; x.strokeStyle = INK(.13); x.lineWidth = 6;
    x.beginPath(); x.moveTo(q.x0, q.y); x.lineTo(q.x1, q.y); x.stroke(); x.strokeStyle = 'rgba(105,167,255,.85)';
    x.beginPath(); x.moveTo(q.x0, q.y); x.lineTo(q.x0 + (q.x1 - q.x0) * f, q.y); x.stroke();
    for (let i = 0; i < 7; i++) {
      const dx = q.x0 + (q.x1 - q.x0) * i / 6; x.beginPath(); x.arc(dx, q.y + 13, 1.8, 0, TAU); x.fillStyle = i <= Math.round(knob.v) ? 'rgba(190,215,255,.9)' : INK(.22); x.fill();
    }
    const kx = q.x0 + (q.x1 - q.x0) * f; x.beginPath(); x.arc(kx, q.y, 14, 0, TAU); const kg = x.createRadialGradient(kx - 5, q.y - 6, 1, kx, q.y, 14);
    kg.addColorStop(0, K.light(1)); kg.addColorStop(.55, '#9fc4ff'); kg.addColorStop(1, '#5b7fd6');
    x.fillStyle = kg; x.fill(); x.strokeStyle = INK(.7); x.lineWidth = 1.4; x.stroke(); x.beginPath(); x.moveTo(kx, q.y - 7); x.lineTo(kx, q.y + 7);
    x.strokeStyle = 'rgba(40,30,80,.45)'; x.lineWidth = 2; x.stroke();
  }
  function drawSwitch(x, z) {
    const cw = 66, chh = 30, cx = z.x + z.w / 2, cy = z.y + z.h * .62, a = sw.a; K.rr(x, cx - cw / 2, cy - chh / 2, cw, chh, chh / 2);
    x.fillStyle = a > .5 ? 'rgba(94,234,212,.28)' : INK(.09); x.fill(); x.strokeStyle = a > .5 ? 'rgba(94,234,212,.8)' : INK(.24); x.lineWidth = 1.4; x.stroke();
    const tx = cx - cw / 2 + chh / 2 + a * (cw - chh); x.beginPath(); x.arc(tx, cy, chh / 2 - 4, 0, TAU); const tg = x.createRadialGradient(tx - 4, cy - 4, 1, tx, cy, chh / 2);
    tg.addColorStop(0, K.light(1)); tg.addColorStop(1, a > .5 ? '#3ecdb6' : '#cfc6e6'); x.fillStyle = tg; x.fill();
    /* the thumb parks over one end, so only the word on the far side ever reads */
    x.fillStyle = a > .5 ? INK(.72) : INK(.5); x.font = '700 8px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(a > .5 ? 'on' : 'off', a > .5 ? cx - 20 : cx + 20, cy);
  }
  function drawButton(x, z) {
    const cx = z.x + z.w / 2, cy = z.y + z.h * .58, r = Math.min(z.w, z.h) * .26; x.beginPath(); x.arc(cx, cy + 3, r + 8, 0, TAU); x.fillStyle = 'rgba(0,0,0,.24)'; x.fill();
    x.beginPath(); x.arc(cx, cy, r + 8, 0, TAU); x.fillStyle = INK(.07); x.fill(); x.strokeStyle = INK(.18); x.lineWidth = 1.2; x.stroke();
    const p = Math.max(0, btn.p), rr = r * (1 - p * .13), yy = cy + p * 8; x.beginPath(); x.arc(cx, yy, rr, 0, TAU); const bg = x.createRadialGradient(cx - rr * .3, yy - rr * .38, 2, cx, yy, rr);
    bg.addColorStop(0, '#ffc2d5'); bg.addColorStop(.5, '#ff6fae'); bg.addColorStop(1, '#bc3a72'); x.fillStyle = bg; x.fill(); x.beginPath(); x.arc(cx, yy, rr, 0, TAU);
    x.strokeStyle = INK(.55); x.lineWidth = 1.4; x.stroke(); x.beginPath(); x.ellipse(cx - rr * .3, yy - rr * .35, rr * .26, rr * .16, -.6, 0, TAU);
    x.fillStyle = INK(.55); x.fill();
  }
  function drawBand(x, z) {
    const q = bandGeo(z); const mx = q.mx + band.x, my = q.my + band.y; const st = Math.min(1, Math.hypot(band.x, band.y) / 50); x.fillStyle = '#7f6da8';
    K.rr(x, q.ax - 4, q.my - 18, 8, 36, 4); x.fill(); K.rr(x, q.bx - 4, q.my - 18, 8, 36, 4); x.fill(); x.fillStyle = INK(.35); K.rr(x, q.ax - 4, q.my - 18, 8, 4, 2); x.fill();
    K.rr(x, q.bx - 4, q.my - 18, 8, 4, 2); x.fill(); x.strokeStyle = 'rgba(255,111,174,' + (.7 + .25 * st) + ')'; x.lineWidth = Math.max(2.2, 5 - st * 2.4); x.beginPath(); x.moveTo(q.ax, q.my - 7);
    x.quadraticCurveTo(mx, my - 7, q.bx, q.my - 7); x.stroke(); x.beginPath(); x.moveTo(q.ax, q.my + 7);
    x.quadraticCurveTo(mx, my + 7, q.bx, q.my + 7); x.stroke(); x.beginPath(); x.arc(mx, my, 7, 0, TAU); x.fillStyle = INK(.14); x.fill();
    x.strokeStyle = INK(.45); x.lineWidth = 1.3; x.stroke();
  }
  function drawBall(x, z) {
    const q = ballGeo(z); const sq = ball.sq, wob = Math.sin(ball.wob * 7) * ball.vs * .06; x.save(); x.translate(q.cx, q.cy); x.scale(1 + .14 * sq + wob, 1 - .16 * sq - wob);
    x.beginPath(); x.arc(0, 0, q.r, 0, TAU); const bg = x.createRadialGradient(-q.r * .32, -q.r * .36, 2, 0, 0, q.r);
    bg.addColorStop(0, '#ffb3a3'); bg.addColorStop(.55, '#ff7a5c'); bg.addColorStop(1, '#b93c2c'); x.fillStyle = bg; x.fill(); x.strokeStyle = INK(.45); x.lineWidth = 1.4; x.stroke();
    if (sq > .15) {
      x.strokeStyle = 'rgba(120,30,20,.35)'; x.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        x.beginPath(); x.arc(i * q.r * .3, q.r * .95, q.r * .34, -1.9, -1.2); x.stroke();
      }
    }
    x.fillStyle = '#3a1a16';
    if (sq > .35) {
      [-1, 1].forEach(s => {
        x.beginPath(); x.moveTo(s * q.r * .16 - 3, -q.r * .1); x.lineTo(s * q.r * .16 + 3, -q.r * .1); x.lineWidth = 2; x.strokeStyle = '#3a1a16'; x.stroke();
      });
      x.beginPath(); x.ellipse(0, q.r * .18, q.r * .1, q.r * .07, 0, 0, TAU); x.fill();
    } else {
      [-1, 1].forEach(s => {
        x.beginPath(); x.arc(s * q.r * .22, -q.r * .1, q.r * .07, 0, TAU); x.fill();
      });
      x.beginPath(); x.arc(0, q.r * .14, q.r * .14, .2, Math.PI - .2); x.strokeStyle = '#3a1a16'; x.lineWidth = 2; x.lineCap = 'round'; x.stroke();
    }
    x.restore();
  }
  function draw() {
    const x = g.x, w = g.w, h = g.h; K.surf(x, w, h);
    const labels = ['BUBBLE WRAP', 'KNOB', 'SWITCH', 'BUTTON', 'RUBBER BAND', 'STRESS BALL']; zones.forEach((z, i) => panel(x, z, labels[i])); drawBubbles(x, zones[0]); drawKnob(x, zones[1]);
    drawSwitch(x, zones[2]); drawButton(x, zones[3]); drawBand(x, zones[4]); drawBall(x, zones[5]);
    puffs.forEach(p => {
      x.globalAlpha = Math.max(0, p.a); x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.strokeStyle = INK(.8); x.lineWidth = 1.2; x.stroke();
    });
    x.globalAlpha = 1;
  }
  function frame(dt) {
    const gg = K.fit(cv()); if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) layout(); t += dt;
    if (g) { step(dt); draw(); }
  }
  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  K && window.DECIDER_GAMES.push({
    id: 'antistress', name: 'Antistress', short: 'Antistress', label: 'Fidgets', button: false,
    body: `<canvas class="toy" id="antsCv"></canvas>
      <div class="res" id="antsRes" aria-live="polite"><span class="muted">Pop, turn, flip, press, stretch, squeeze</span></div>`,
    init(card) {
      L = K.loop(frame); layout(); const c = cv();
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        down(at(e));
      });
      c.addEventListener('pointermove', e => { if (active) move(at(e)); }); c.addEventListener('pointerup', e => up(at(e)));
      c.addEventListener('pointercancel', () => {
        if (active && active.zone === 3) { btn.held = false; btn.v = -.3; }
        if (active && active.zone === 4) band.held = false; if (active && active.zone === 5) ball.held = false; active = null;
      });
    },
    enter() { layout(); L.start(); },
    leave() { active = null; btn.held = false; band.held = false; ball.held = false; L.stop(); },
    action() { toggleSwitch(); },
    shake(info) {
      band.vx += Math.sign(info.dir || 1) * 2.4; ball.vs = 1.1; sfx(200, .12, .05, 'triangle', 120);
    }
  });
})();