/* Press — one big springy button and a row of four little ones. They squash
 * under the finger, spring back with overshoot, and click; slide across the
 * small row for a run of clicks. No goal, no numbers. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('prCv');
  const PITCH = [0, 46, 92, 138, 184];
  let L = null, g = null, big = null, small = [], rings = [], active = null;
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  function layout() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const top = 52, bot = 54;
    const room = g.h - top - bot;
    if (!big) {
      big = { q: 0, v: 0, held: false, flash: 0, i: 0, label: 'PRESS' };
      for (let i = 0; i < 4; i++) small.push({ q: 0, v: 0, held: false, flash: 0, i: i + 1 });
    }
    big.cx = g.w / 2; big.cy = top + room * .42; big.r = Math.min(g.w * .30, room * .30);
    const sr = Math.min(g.w * .085, 26), span = Math.min(g.w - 40, 300), y = g.h - bot + 6;
    small.forEach((b, i) => {
      b.r = sr;
      b.cx = g.w / 2 + (i - 1.5) * (span / 4);
      b.cy = y - sr;
    });
  }

  function spring(b, dt) {
    b.v += ((b.held ? 1 : 0) - b.q) * .30 * dt;
    b.v *= Math.pow(.80, dt);
    b.q += b.v * dt;
    if (b.q < -.24) { b.q = -.24; b.v = 0; }
    if (b.q > 1.05) { b.q = 1.05; b.v *= -.35; }
    b.flash = Math.max(0, b.flash - .045 * dt);
  }

  function step(dt) {
    spring(big, dt);
    small.forEach(b => spring(b, dt));
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += 3.4 * dt; r.a -= .035 * dt; if (r.a <= 0) rings.splice(i, 1);
    }
  }

  function down(b) {
    b.held = true; b.flash = 1;
    K.press(300 + PITCH[b.i]);                 // click tone + haptic
    sfx(140 + PITCH[b.i] * .4, .07, .06, 'triangle', 78);   // the body under it
  }
  function up(b) {
    b.held = false; b.flash = .7;
    sfx(500 + PITCH[b.i], .18, .05, 'sine', 1000 + PITCH[b.i] * .6);
    hap(7);
    rings.push({ x: b.cx, y: b.cy, r: b.r * .8, a: .55, w: b.r });
  }

  function drawCap(x, b, flat, big) {
    const q = Math.max(-.22, Math.min(1.04, b.q));
    const rx = b.r * (1 + q * .13), ry = b.r * (1 - q * .27);
    const yy = b.cy + q * b.r * .18;
    if (b.flash > 0) { x.beginPath(); x.arc(b.cx, b.cy, b.r * 1.28, 0, TAU); x.fillStyle = K.light(b.flash * .12); x.fill(); }
    const g0 = x.createRadialGradient(b.cx - rx * .32, yy - ry * .40, 2, b.cx, yy, Math.max(rx, ry));
    if (flat) { g0.addColorStop(0, '#ffd2e2'); g0.addColorStop(.65, '#ff6fae'); g0.addColorStop(1, '#e94f92'); }
    else { g0.addColorStop(0, '#ffd0e0'); g0.addColorStop(.45, '#ff6fae'); g0.addColorStop(1, '#b23469'); }
    x.beginPath(); x.ellipse(b.cx, yy, rx, ry, 0, 0, TAU); x.fillStyle = g0; x.fill();
    x.strokeStyle = flat ? '#241a3a' : INK(.42); x.lineWidth = flat ? 1.6 : 1.3; x.stroke();
    if (!flat) {
      x.beginPath(); x.ellipse(b.cx - rx * .28, yy - ry * .34, rx * .28, ry * .16, -.55, 0, TAU);
      x.fillStyle = K.light(.55); x.fill();
    }
    if (big) {
      x.fillStyle = 'rgba(52,12,36,.66)'; x.font = '800 16px "Bricolage Grotesque",system-ui,sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(b.label, b.cx, yy + 1);
    }
  }

  /* one housing per button: a raised collar, then the cap on top */
  function housing(x, b, flat) {
    x.beginPath(); x.arc(b.cx, b.cy + 4, b.r + 9, 0, TAU);
    x.fillStyle = flat ? 'rgba(36,26,58,.08)' : 'rgba(0,0,0,.26)'; x.fill();
    x.beginPath(); x.arc(b.cx, b.cy, b.r + 9, 0, TAU);
    x.fillStyle = flat ? '#f1ebda' : INK(.06); x.fill();
    x.strokeStyle = flat ? '#241a3a' : INK(.15);
    x.lineWidth = flat ? 1.5 : 1.2; x.stroke();
    drawCap(x, b, flat, b === big);
  }

  function draw() {
    if (!g) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), flat = m.flat;
    K.label(x, 'PRESS IT', w / 2, 20, 11);

    // housing for the big button, then the row of four little ones
    housing(x, big, flat);
    small.forEach(b => housing(x, b, flat));

    rings.forEach(r => {
      x.beginPath(); x.arc(r.x, r.y, r.r, 0, TAU);
      x.globalAlpha = Math.max(0, r.a);
      x.strokeStyle = flat ? 'rgba(36,26,58,.7)' : 'rgba(255,255,255,.9)';
      x.lineWidth = 1.6; x.stroke();
    });
    x.globalAlpha = 1;
    K.label(x, 'hold, slide, let go', w / 2, h - 16, 10);
  }

  function frame(dt) {
    try {
      const gg = K.fit(cv());
      if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) layout();
      step(dt); draw();
    } catch (e) {}
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function under(p) {
    if (Math.hypot(p.x - big.cx, p.y - big.cy) < big.r + 12) return big;
    for (let i = 0; i < small.length; i++) {
      const b = small[i];
      if (Math.hypot(p.x - b.cx, p.y - b.cy) < b.r + 8) return b;
    }
    return null;
  }

  K && window.DECIDER_GAMES.push({
    id: 'press', name: 'Big button', short: 'Press', label: 'Press', noResult: true, button: false,
    body: `<canvas class="toy" id="prCv"></canvas>
      <div class="res" id="prRes" aria-live="polite"><span class="muted">Squash them, feel the spring</span></div>`,
    init() {
      L = K.loop(frame); layout();
      const c = cv();
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const b = under(at(e));
        if (!b) return;
        active = b; down(b);
      });
      c.addEventListener('pointermove', e => {
        if (!active) return;
        const b = under(at(e));
        if (b === active) return;
        up(active);
        active = b;
        if (b) down(b);
      });
      const end = () => { if (active) up(active); active = null; };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      if (cv().clientWidth) L.start();
    },
    enter() { layout(); L.start(); },
    leave() { if (active) active.held = false; active = null; L.stop(); }
  });
})();
