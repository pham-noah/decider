/* Switch — a bank of five chunky toggle levers. Tap a plate or drag the lever
 * and it clunks over with its own pitch; the lamp beside it lights while it is
 * on. No goal, no numbers. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2, N = 5;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('swCv');
  let L = null, g = null, bank = [], drag = null;
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  function layout() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const top = 48, bot = 26, bh = (g.h - top - bot) / N;
    const bw = Math.min(g.w - 28, 330);
    if (!bank.length) {
      bank = [];
      for (let i = 0; i < N; i++) bank.push({ on: i % 2 === 1, a: i % 2 === 1 ? 1 : 0, v: 0, flash: 0, i });
    }
    bank.forEach((s, i) => {
      s.x = (g.w - bw) / 2; s.w = bw; s.y = top + i * bh; s.h = bh - 9;
    });
  }

  function flip(i, silent) {
    const s = bank[i]; if (!s) return;
    s.on = !s.on;
    s.v += s.on ? 2.2 : -2.2;                       // a kick so the lever overshoots
    s.flash = 1;
    if (silent) return;
    sfx(168 + i * 36, .055, .08, 'square', 70 + i * 12);   // own clunk per switch
    sfx(1150 + i * 95, .022, .045, 'square', 480 + i * 55);
    hap(12);
  }

  function step(dt) {
    bank.forEach(s => {
      s.v += ((s.on ? 1 : 0) - s.a) * .30 * dt;
      s.v *= Math.pow(.80, dt);
      s.a += s.v * dt;
      if (s.a < -.13) { s.a = -.13; s.v = 0; }
      if (s.a > 1.13) { s.a = 1.13; s.v = 0; }
      s.flash = Math.max(0, s.flash - .05 * dt);
    });
  }

  function draw() {
    if (!g) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), flat = m.flat;
    K.label(x, 'FLIP THE SWITCHES', w / 2, 20, 11);

    bank.forEach(s => {
      K.panel(x, s.x, s.y, s.w, s.h, { r: 12, face: 'rgba(255,255,255,.055)', face2: 'rgba(0,0,0,.10)' });

      const piv = { x: s.x + s.w * .36, y: s.y + s.h * .68 };
      const len = Math.min(36, s.h * .60);
      const ang = (s.a - .5) * 2.1;              // ~60° either side: the flip reads at a glance

      // the lever: a fat chrome stick with a ball on top, tilting with the flip
      x.save(); x.translate(piv.x, piv.y); x.rotate(ang);
      // rubber gaiter under the stick
      x.beginPath(); x.ellipse(0, 2, 17, 8, 0, 0, TAU);
      x.fillStyle = flat ? '#e6dfcc' : 'rgba(0,0,0,.34)'; x.fill();
      x.strokeStyle = flat ? '#241a3a' : INK(.20); x.lineWidth = 1; x.stroke();
      x.beginPath(); x.moveTo(4, 4); x.lineTo(6, -len + 4);
      x.strokeStyle = flat ? 'rgba(36,26,58,.16)' : 'rgba(0,0,0,.38)';
      x.lineWidth = 12; x.lineCap = 'round'; x.stroke();
      K.rr(x, -7, -len, 14, len + 6, 7);
      if (flat) {
        x.fillStyle = '#fffdf8'; x.fill();
        x.strokeStyle = '#241a3a'; x.lineWidth = 1.8; x.stroke();
      } else {
        const lg = x.createLinearGradient(-7, 0, 7, 0);
        lg.addColorStop(0, '#f8f4ff'); lg.addColorStop(.5, '#b6aade'); lg.addColorStop(1, '#65589e');
        x.fillStyle = lg; x.fill();
        x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 1.2; x.stroke();
      }
      x.beginPath(); x.arc(0, -len, 10, 0, TAU);
      x.fillStyle = flat ? '#f1ebda' : '#ece6ff'; x.fill();
      x.strokeStyle = flat ? '#241a3a' : 'rgba(28,18,58,.7)'; x.lineWidth = 1.6; x.stroke();
      x.beginPath(); x.arc(-2.8, -len - 3, 3, 0, TAU);
      x.fillStyle = K.light(.85); x.fill();
      x.restore();

      // lamp: light when on, so the state reads without a word
      const lx = s.x + s.w - 32, ly = s.y + s.h * .5;
      if (s.on || s.flash > 0) {
        const halo = x.createRadialGradient(lx, ly, 1, lx, ly, 20);
        const al = s.on ? .5 : s.flash * .45;
        halo.addColorStop(0, K.light(al)); halo.addColorStop(1, K.light(0));
        x.beginPath(); x.arc(lx, ly, 20, 0, TAU); x.fillStyle = halo; x.fill();
      }
      x.beginPath(); x.arc(lx, ly, 6.5, 0, TAU);
      x.fillStyle = s.on ? '#2fe0c4' : (flat ? 'rgba(36,26,58,.14)' : 'rgba(255,255,255,.10)');
      x.fill();
      x.strokeStyle = flat ? '#241a3a' : (s.on ? 'rgba(150,255,235,.9)' : INK(.28));
      x.lineWidth = 1.3; x.stroke();
      if (s.on && !flat) {
        x.beginPath(); x.arc(lx - 1.8, ly - 2.2, 2.2, 0, TAU);
        x.fillStyle = K.light(.85); x.fill();
      }
    });
    K.label(x, 'every lever has its own clunk', w / 2, h - 14, 10);
  }

  function frame(dt) {
    try {
      const gg = K.fit(cv());
      if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) layout();
      step(dt); draw();
    } catch (e) {}
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function plateAt(p) {
    for (let i = 0; i < bank.length; i++) {
      const s = bank[i];
      if (p.x > s.x - 4 && p.x < s.x + s.w + 4 && p.y > s.y - 4 && p.y < s.y + s.h + 4) return i;
    }
    return -1;
  }

  K && window.DECIDER_GAMES.push({
    id: 'switch', name: 'Switches', short: 'Switch', label: 'Switch', noResult: true, button: false,
    body: `<canvas class="toy" id="swCv"></canvas>
      <div class="res" id="swRes" aria-live="polite"><span class="muted">Flip them all on</span></div>`,
    init() {
      L = K.loop(frame); layout();
      const c = cv();
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e), i = plateAt(p);
        if (i < 0) return;
        flip(i);
        drag = { i, y0: p.y, done: false };
      });
      c.addEventListener('pointermove', e => {
        if (!drag || drag.done) return;
        const p = at(e);
        if (Math.abs(p.y - drag.y0) > 18) { flip(drag.i); drag.done = true; }
      });
      const up = () => { drag = null; };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      if (cv().clientWidth) L.start();
    },
    enter() { layout(); L.start(); },
    leave() { drag = null; L.stop(); }
  });
})();
