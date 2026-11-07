/* Knob — a rotary knob with twelve detents. Drag anywhere: it follows your
 * finger round, clicks through each notch with a tick of its own pitch, carries
 * a little inertia, and the dial below reads out where it sits. No goal. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2, N = 12;
  const MIN = -Math.PI * .75, MAX = Math.PI * .75;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('knCv');
  let L = null, g = null, a = MIN + (MAX - MIN) * .58, va = 0, drag = null, lastK = -99;
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  const geo = () => ({ cx: g.w / 2, cy: g.h * .46, R: Math.min(g.w * .28, g.h * .255) });
  const tOf = (v) => (v - MIN) / (MAX - MIN);
  const kOf = (v) => Math.round(tOf(v) * (N - 1));
  const aOfK = (k) => MIN + (k / (N - 1)) * (MAX - MIN);

  function tickSound(k) { sfx(720 + k * 34, .025, .06, 'triangle', 600 + k * 26); hap(4); }

  function step(dt) {
    if (!drag) {
      a += va * dt; va *= Math.pow(.90, dt);
      if (Math.abs(va) < .014) {                    // magnet to the nearest notch
        const t = aOfK(kOf(a));
        a += (t - a) * Math.min(1, .20 * dt);
        va *= Math.pow(.78, dt);
        if (Math.abs(t - a) < .0015) { a = t; va = 0; }
      }
    }
    if (a < MIN) { a = MIN; va = -va * .35; }
    if (a > MAX) { a = MAX; va = -va * .35; }
    const k = kOf(a);
    if (k !== lastK) { lastK = k; tickSound(k); }
  }

  function draw() {
    if (!g) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), flat = m.flat, q = geo();
    const k = kOf(a);
    K.label(x, 'TURN THE KNOB', w / 2, 20, 11);

    // dial plate
    x.beginPath(); x.arc(q.cx, q.cy, q.R * 1.44, 0, TAU);
    x.fillStyle = flat ? '#f1ebda' : INK(.05); x.fill();
    x.strokeStyle = flat ? 'rgba(36,26,58,.35)' : INK(.10); x.lineWidth = 1.2; x.stroke();

    // detent ticks, lit up to where the knob sits
    for (let i = 0; i < N; i++) {
      const th = aOfK(i) - Math.PI / 2, on = i <= k;
      const r0 = q.R * 1.15, r1 = q.R * (on ? 1.30 : 1.25);
      x.beginPath();
      x.moveTo(q.cx + Math.cos(th) * r0, q.cy + Math.sin(th) * r0);
      x.lineTo(q.cx + Math.cos(th) * r1, q.cy + Math.sin(th) * r1);
      x.strokeStyle = on ? 'rgba(105,167,255,' + (flat ? .85 : .95) + ')' : INK(.22);
      x.lineWidth = on ? 2.6 : 1.8; x.lineCap = 'round'; x.stroke();
    }

    // skirt + dome
    x.beginPath(); x.arc(q.cx, q.cy + 6, q.R * 1.04, 0, TAU);
    x.fillStyle = flat ? 'rgba(36,26,58,.10)' : 'rgba(0,0,0,.30)'; x.fill();
    const kg = x.createRadialGradient(q.cx - q.R * .34, q.cy - q.R * .42, q.R * .08, q.cx, q.cy, q.R);
    if (flat) { kg.addColorStop(0, '#fffdf8'); kg.addColorStop(.72, '#f1ebda'); kg.addColorStop(1, '#ddd5c0'); }
    else { kg.addColorStop(0, '#f4efff'); kg.addColorStop(.42, '#b3a5f0'); kg.addColorStop(.82, '#6a56c2'); kg.addColorStop(1, '#42308a'); }
    x.beginPath(); x.arc(q.cx, q.cy, q.R, 0, TAU); x.fillStyle = kg; x.fill();
    x.strokeStyle = flat ? '#241a3a' : INK(.55); x.lineWidth = flat ? 1.6 : 1.4; x.stroke();

    // knurling: a ring of short spokes that turn with the knob
    for (let i = 0; i < 24; i++) {
      const th = a + i * TAU / 24;
      x.beginPath();
      x.moveTo(q.cx + Math.cos(th) * q.R * .86, q.cy + Math.sin(th) * q.R * .86);
      x.lineTo(q.cx + Math.cos(th) * q.R * .96, q.cy + Math.sin(th) * q.R * .96);
      x.strokeStyle = flat ? 'rgba(36,26,58,.18)' : 'rgba(30,20,70,.20)';
      x.lineWidth = 1.4; x.stroke();
    }

    // the needle
    x.save(); x.translate(q.cx, q.cy); x.rotate(a);
    K.rr(x, -2.6, -q.R * .92, 5.2, q.R * .60, 2.6);
    x.fillStyle = flat ? '#241a3a' : '#fffdf8'; x.fill();
    x.strokeStyle = 'rgba(36,26,58,.5)'; x.lineWidth = 1; x.stroke();
    x.restore();

    // centre cap
    x.beginPath(); x.arc(q.cx, q.cy, q.R * .19, 0, TAU);
    x.fillStyle = flat ? '#fffdf8' : 'rgba(255,255,255,.22)'; x.fill();
    x.strokeStyle = flat ? '#241a3a' : INK(.5); x.lineWidth = 1.2; x.stroke();

    // readout pill: cream on every skin, dark text (a mark, never INK under it)
    const bw = 98, bh = 34, by = Math.min(h - 22, q.cy + q.R * 1.60);
    K.rr(x, q.cx - bw / 2, by - bh / 2, bw, bh, bh / 2);
    x.fillStyle = '#fffdf8'; x.fill();
    x.strokeStyle = 'rgba(36,26,58,.28)'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#241a55'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '800 17px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillText(String(k + 1), q.cx - 12, by + 1);
    x.fillStyle = 'rgba(36,26,58,.55)';
    x.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillText('OF 12', q.cx + 24, by + 1);
  }

  function frame(dt) {
    try {
      const gg = K.fit(cv());
      if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) g = gg;
      step(dt); draw();
    } catch (e) {}
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const angTo = (p, q) => Math.atan2(p.y - q.cy, p.x - q.cx);

  function down(p) {
    const q = geo();
    drag = { q, last: angTo(p, q), moved: 0, side: p.x < q.cx ? -1 : 1 };
  }
  function move(p) {
    if (!drag) return;
    const na = angTo(p, drag.q);
    let d = na - drag.last;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    drag.last = na; drag.moved += Math.abs(d);
    a += d;
    va = Math.max(-.13, Math.min(.13, d * .7));
  }
  function up() {
    if (!drag) return;
    if (drag.moved < .03) {                         // a tap knocks the dial a notch-wards
      va += drag.side * .035;
      sfx(420, .05, .05, 'sine', 700); hap(6);
    }
    drag = null;
  }

  K && window.DECIDER_GAMES.push({
    id: 'knob', name: 'Knob', short: 'Knob', label: 'Knob', noResult: true, button: false,
    body: `<canvas class="toy" id="knCv"></canvas>
      <div class="res" id="knRes" aria-live="polite"><span class="muted">Turn it, let it click</span></div>`,
    init() {
      L = K.loop(frame); g = K.fit(cv());
      const c = cv();
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        down(at(e));
      });
      c.addEventListener('pointermove', e => move(at(e)));
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      if (cv().clientWidth) L.start();
    },
    enter() { g = K.fit(cv()); L.start(); },
    leave() { drag = null; L.stop(); }
  });
})();
