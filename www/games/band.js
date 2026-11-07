/* Band — a rubber band strung between two posts. Grab either end and stretch
 * it: the latex goes taut, thins and pulls back; let go and it snaps home with
 * a twang. Tap the band itself to pluck it. No goal, no numbers. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('bdCv');
  let L = null, g = null, rest = [], ends = [], grab = -1, pluck = 0, ph = 0, last = null;
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  function layout() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const off = (i) => (ends.length && rest.length)
      ? { x: ends[i].x - rest[i].x, y: ends[i].y - rest[i].y }
      : { x: 0, y: 0 };
    const o0 = off(0), o1 = off(1), h0 = ends[0] ? ends[0].held : false, h1 = ends[1] ? ends[1].held : false;
    rest = [{ x: g.w * .16, y: g.h * .50 }, { x: g.w * .84, y: g.h * .50 }];
    ends = [0, 1].map(i => ({
      x: rest[i].x + (i ? o1.x : o0.x), y: rest[i].y + (i ? o1.y : o0.y),
      vx: 0, vy: 0, held: i ? h1 : h0
    }));
  }

  const dist = () => Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y);
  const restLen = () => Math.abs(rest[1].x - rest[0].x);
  const tension = () => Math.max(0, Math.min(1.5, (dist() - restLen() * .70) / (restLen() * .55)));

  function twang(power) {
    const t = Math.max(.05, tension()), p = 240 + t * 520 * (power || 1);
    sfx(p, .20, .07, 'triangle', p * .42);
    setTimeout(() => sfx(p * 1.52, .12, .03, 'sine', p * .95), 32);
    hap(10);
    pluck = Math.max(pluck, .5 + t * .5); ph = 0;
  }

  function release(i) {
    const e = ends[i];
    e.held = false;
    e.vx = Math.max(-9, Math.min(9, e.vx * 1.6));
    e.vy = Math.max(-9, Math.min(9, e.vy * 1.6));
    twang(1);
  }

  function step(dt) {
    ends.forEach((e, i) => {
      if (e.held) return;
      e.vx += (rest[i].x - e.x) * .30 * dt;     // spring home, underdamped so it wobbles
      e.vy += (rest[i].y - e.y) * .30 * dt;
      e.vx *= Math.pow(.90, dt); e.vy *= Math.pow(.90, dt);
      e.x += e.vx * dt; e.y += e.vy * dt;
    });
    if (pluck > .01) { ph += .9 * dt; pluck *= Math.pow(.945, dt); } else pluck = 0;
  }

  function drawBand(x, flat) {
    const a = ends[0], b = ends[1];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const t = tension();
    const slack = Math.max(0, 1 - t * 1.7);
    const sag = slack * 26 + Math.sin(ph) * pluck * 16;
    const wdt = Math.max(2.6, 6.4 - t * 3.2) * (1 + pluck * .35);

    x.save(); x.lineCap = 'round';
    x.beginPath(); x.moveTo(a.x, a.y); x.quadraticCurveTo(mx, my + sag, b.x, b.y);
    if (flat) { x.strokeStyle = '#241a3a'; x.lineWidth = wdt + 3.4; x.stroke(); }
    else { x.strokeStyle = 'rgba(0,0,0,.30)'; x.lineWidth = wdt + 4; x.stroke(); }
    x.strokeStyle = '#ff5fa2'; x.lineWidth = wdt; x.stroke();
    x.strokeStyle = flat ? 'rgba(255,255,255,.0)' : 'rgba(255,255,255,.55)';
    x.lineWidth = Math.max(1, wdt * .3); x.stroke();
    x.restore();

    // the posts it is looped over
    [0, 1].forEach(i => {
      const p = rest[i];
      K.rr(x, p.x - 5, p.y - 24, 10, 48, 5);
      x.fillStyle = flat ? '#f1ebda' : '#cbbfe8'; x.fill();
      x.strokeStyle = flat ? '#241a3a' : 'rgba(255,255,255,.45)'; x.lineWidth = flat ? 1.5 : 1; x.stroke();
      x.beginPath(); x.arc(p.x, p.y - 26, 4.5, 0, TAU);
      x.fillStyle = flat ? '#f1ebda' : '#e7e0ff'; x.fill();
      x.strokeStyle = flat ? '#241a3a' : 'rgba(28,18,58,.5)'; x.lineWidth = 1.2; x.stroke();
    });

    // finger grips at the ends
    ends.forEach(e => {
      x.beginPath(); x.arc(e.x, e.y, 10, 0, TAU);
      x.fillStyle = flat ? '#fffdf8' : 'rgba(255,255,255,.14)'; x.fill();
      x.strokeStyle = flat ? '#241a3a' : INK(.55); x.lineWidth = flat ? 1.6 : 1.3; x.stroke();
      x.beginPath(); x.arc(e.x - 2.6, e.y - 3, 3, 0, TAU);
      x.fillStyle = K.light(flat ? .5 : .7); x.fill();
    });
  }

  function draw() {
    if (!g) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), flat = m.flat;
    K.label(x, 'STRETCH THE BAND', w / 2, 20, 11);
    drawBand(x, flat);
    const t = tension();
    K.label(x, t < .12 ? 'slack' : t < .55 ? 'pulling' : 'taut as a wire', w / 2, h - 16, 10);
  }

  function frame(dt) {
    try {
      const gg = K.fit(cv());
      if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) layout();
      step(dt); draw();
    } catch (e) {}
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const nearEnd = (p) => {
    const d0 = Math.hypot(p.x - ends[0].x, p.y - ends[0].y);
    const d1 = Math.hypot(p.x - ends[1].x, p.y - ends[1].y);
    if (d0 < 46 && d0 <= d1) return 0;
    if (d1 < 46) return 1;
    return -1;
  };
  function pull(i, p) {
    const e = ends[i];
    const nx = Math.max(12, Math.min(g.w - 12, p.x)), ny = Math.max(50, Math.min(g.h - 34, p.y));
    e.vx = (nx - e.x) * .55; e.vy = (ny - e.y) * .55;
    e.x += (nx - e.x) * .55; e.y += (ny - e.y) * .55;
  }

  K && window.DECIDER_GAMES.push({
    id: 'band', name: 'Rubber band', short: 'Band', label: 'Band', noResult: true, button: false,
    body: `<canvas class="toy" id="bdCv"></canvas>
      <div class="res" id="bdRes" aria-live="polite"><span class="muted">Pull an end, let it snap</span></div>`,
    init() {
      L = K.loop(frame); layout();
      const c = cv();
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e);
        last = p;
        grab = nearEnd(p);
        if (grab >= 0) { ends[grab].held = true; pull(grab, p); }
        else { twang(.55); }                     // a tap on the band plucks it
      });
      c.addEventListener('pointermove', e => {
        if (grab < 0) return;
        const p = at(e);
        pull(grab, p);
        last = p;
      });
      const end = () => {
        if (grab >= 0 && ends[grab].held) release(grab);
        grab = -1; last = null;
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      if (cv().clientWidth) L.start();
    },
    enter() { g = K.fit(cv()); L.start(); },
    leave() { ends.forEach(e => e.held = false); grab = -1; L.stop(); }
  });
})();
