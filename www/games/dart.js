/* Dart — a real board, real numbers, and 501 down. Double to finish.
 * Drag from the throw line to aim, release to throw: the throw's power decides how
 * much the hand's tremor moves the dart, so a hard flat throw is the accurate one. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('dtCv');
  const res = () => document.getElementById('dtRes');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* standard order, clockwise from the top */
  const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  /* real board proportions, as a fraction of the outer wire radius */
  const BULL = .037, BULL_OUT = .094, TRIP_IN = .582, TRIP_OUT = .629, DUB_IN = .953;

  let L = null, geo = null, aim = null, aiming = false, drag0 = { x: 0, y: 0 };
  let tAim = 0, wob = { x: 0, y: 0 }, dart = null, stuck = [], busy = false;
  let score = 501, darts = 3, best = 0, turnDarts = 0, flash = '', flashT = 0;

  function layout() {
    const c = cv(); if (!c) return;
    const g = K.fit(c), R = Math.min(g.w * .44, g.h * .40);
    geo = { w: g.w, h: g.h, cx: g.w / 2, cy: g.h * .47, R, st: TAU / 20 };
  }

  /* ---------- board ---------- */
  function drawBoard(x) {
    const { cx, cy, R, st } = geo;
    x.save();
    x.shadowColor = 'rgba(10,4,28,.45)'; x.shadowBlur = 22; x.shadowOffsetY = 10;
    x.beginPath(); x.arc(cx, cy, R * 1.13, 0, TAU); x.fillStyle = '#2a1f14'; x.fill();
    x.restore();
    x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fillStyle = '#f6efdf'; x.fill();

    for (let i = 0; i < 20; i++) {
      const a0 = -Math.PI / 2 - st / 2 + i * st;
      x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0, a0 + st); x.closePath();
      x.fillStyle = i % 2 === 0 ? '#221a12' : '#f3ead6'; x.fill();
    }
    /* triple and double bands: red on the dark wedges, green on the light */
    for (let i = 0; i < 20; i++) {
      const a0 = -Math.PI / 2 - st / 2 + i * st;
      const col = i % 2 === 0 ? '#c8323c' : '#2f8f4e';
      [[TRIP_IN, TRIP_OUT], [DUB_IN, 1]].forEach(([ri, ro]) => {
        x.beginPath(); x.arc(cx, cy, R * ro, a0, a0 + st); x.arc(cx, cy, R * ri, a0 + st, a0, true);
        x.closePath(); x.fillStyle = col; x.fill();
      });
    }
    x.strokeStyle = 'rgba(20,14,8,.45)'; x.lineWidth = 1;
    [BULL, BULL_OUT, TRIP_IN, TRIP_OUT, DUB_IN, 1].forEach((r) => {
      x.beginPath(); x.arc(cx, cy, R * r, 0, TAU); x.stroke();
    });
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI / 2 - st / 2 + i * st;
      x.beginPath(); x.moveTo(cx + Math.cos(a) * R * BULL_OUT, cy + Math.sin(a) * R * BULL_OUT);
      x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.stroke();
    }
    x.beginPath(); x.arc(cx, cy, R * BULL_OUT, 0, TAU); x.fillStyle = '#2f8f4e'; x.fill();
    x.beginPath(); x.arc(cx, cy, R * BULL, 0, TAU); x.fillStyle = '#c8323c'; x.fill();

    x.fillStyle = '#f6efdf'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '800 ' + Math.max(8, R * .085) + 'px "Bricolage Grotesque",system-ui,sans-serif';
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI / 2 + i * st;
      x.fillText(String(ORDER[i]), cx + Math.cos(a) * R * 1.065, cy + Math.sin(a) * R * 1.065);
    }

    if (flashT > 0) {
      x.save(); x.globalAlpha = Math.min(1, flashT);
      x.fillStyle = INK(1); x.font = '800 ' + Math.max(10, R * .1) + 'px "Bricolage Grotesque",system-ui,sans-serif';
      x.textAlign = 'center'; x.fillText(flash, cx, cy + R * 1.26);
      x.restore();
    }
  }

  function drawDart(x, px, py, ang, s) {
    x.save(); x.translate(px, py); x.rotate(ang); x.scale(s, s); x.lineCap = 'round';
    x.beginPath(); x.moveTo(-19, 0); x.lineTo(10, 0);
    x.strokeStyle = '#d9dbe8'; x.lineWidth = 2.2; x.stroke();
    x.beginPath(); x.moveTo(10, 0); x.lineTo(20, 0);
    x.strokeStyle = '#eef2ff'; x.lineWidth = 2.6; x.stroke();
    x.beginPath(); x.moveTo(14, -4); x.lineTo(20, 0); x.lineTo(14, 4); x.closePath();
    x.fillStyle = '#cdd3e6'; x.fill();
    x.beginPath(); x.moveTo(-19, 0); x.lineTo(-26, -7); x.lineTo(-11, -3); x.closePath(); x.fillStyle = '#ff5f7a'; x.fill();
    x.beginPath(); x.moveTo(-19, 0); x.lineTo(-26, 7); x.lineTo(-11, 3); x.closePath(); x.fillStyle = '#ff8fa3'; x.fill();
    x.restore();
  }

  /* ---------- throwing ---------- */
  function fire(power) {
    if (busy || !geo) return;
    const R = geo.R, pw = clamp(power == null ? .55 : power, 0, 1);
    if (!aim) aim = { x: geo.cx, y: geo.cy };
    const slop = 1 - pw * .88;
    let tx = aim.x + wob.x * slop, ty = aim.y + wob.y * slop;
    const dx = tx - geo.cx, dy = ty - geo.cy, d = Math.hypot(dx, dy) || 1;
    if (d > R * 1.3) { tx = geo.cx + dx / d * R * 1.3; ty = geo.cy + dy / d * R * 1.3; }
    busy = true; aim = null;
    dart = { lx: geo.w / 2, ly: geo.h + 14, tx, ty, t: 0, px: geo.w / 2, py: geo.h + 14, a: -Math.PI / 2, pw };
    K.setResult(res(), '…');
    try { K.sfx.swish(.12, .035, 1800, 700); } catch (e) {}
  }

  function scoreAt(px, py) {
    const dx = px - geo.cx, dy = py - geo.cy, d = Math.hypot(dx, dy) / geo.R;
    if (d <= BULL) return { pts: 50, name: 'BULL', dbl: true };
    if (d <= BULL_OUT) return { pts: 25, name: '25', dbl: false };
    if (d > 1.02) return { pts: 0, name: 'MISS', dbl: false };
    const ang = Math.atan2(dy, dx) + Math.PI / 2;
    const rel = ((ang % TAU) + TAU) % TAU;
    const idx = Math.floor(rel / geo.st) % 20;
    const num = ORDER[idx];
    if (d >= TRIP_IN && d <= TRIP_OUT) return { pts: num * 3, name: 'T' + num, dbl: false };
    if (d >= DUB_IN) return { pts: num * 2, name: 'D' + num, dbl: true };
    return { pts: num, name: String(num), dbl: false };
  }

  function land(d) {
    busy = false;
    const hitp = scoreAt(d.tx, d.ty);
    stuck.push({ x: d.tx, y: d.ty, a: d.a });
    if (stuck.length > 3) stuck.shift();
    const before = score;
    let out = hitp.pts, bust = false;
    if (out > 0) {
      const after = score - out;
      /* double out: under zero, left on one, or zero without a double is a bust */
      if (after < 0 || after === 1 || (after === 0 && !hitp.dbl)) bust = true;
      if (bust) out = 0;
    }
    if (!bust) score = Math.max(0, score - out);
    darts--; turnDarts++;
    if (bust) score = before;
    flash = bust ? 'BUST' : hitp.name;
    flashT = 1;
    K.setResult(res(), bust ? 'bust' : hitp.name + '  −' + out);

    if (!bust && score === 0) {
      if (!best || turnDarts < best) { best = turnDarts; try { store.set('d.dtbest', best); } catch (e) {} }
      K.setResult(res(), 'checkout · ' + turnDarts + ' darts');
      try { chime(); confetti(); } catch (e) {}
      score = 501; darts = 3; turnDarts = 0; stuck = [];
      return;
    }
    if (darts <= 0) {
      darts = 3; turnDarts = 0;
      K.sfx.click(.8)
    } else {
      try { bust ? K.sfx.thud(.9) : K.sfx.knock(1.2); } catch (e) {}
    }
  }

  function frame(dt) {
    const g = K.fit(cv());
    if (!geo || Math.abs(geo.w - g.w) > .5 || Math.abs(geo.h - g.h) > .5) layout();
    if (!geo) return;
    const x = g.x, w = g.w, h = g.h, R = geo.R;
    x.clearRect(0, 0, w, h);
    K.surf(x, w, h);
    if (flashT > 0) flashT = Math.max(0, flashT - dt * .02);
    if (aiming) {
      tAim += dt * .5;
      wob = { x: Math.sin(tAim) * R * .04, y: Math.cos(tAim * 1.35) * R * .036 };
    }
    drawBoard(x);
    stuck.forEach((s) => drawDart(x, s.x, s.y, s.a, .92));
    if (aim) {
      const p = { x: aim.x + wob.x, y: aim.y + wob.y };
      x.save(); x.setLineDash([4, 6]); x.strokeStyle = INK(.5); x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(w / 2, h + 4); x.lineTo(p.x, p.y); x.stroke();
      x.setLineDash([]); x.strokeStyle = INK(.92); x.lineWidth = 2;
      x.beginPath(); x.arc(p.x, p.y, R * .07, 0, TAU); x.stroke();
      x.beginPath(); x.moveTo(p.x - 18, p.y); x.lineTo(p.x - 6, p.y); x.moveTo(p.x + 6, p.y); x.lineTo(p.x + 18, p.y);
      x.moveTo(p.x, p.y - 18); x.lineTo(p.x, p.y - 6); x.moveTo(p.x, p.y + 6); x.lineTo(p.x, p.y + 18); x.stroke();
      x.restore();
    }
    if (dart) {
      dart.t += dt / (13 + 26 * (1 - dart.pw));
      const e = Math.min(1, dart.t);
      const px = dart.lx + (dart.tx - dart.lx) * e;
      const py = dart.ly + (dart.ty - dart.ly) * e - Math.sin(Math.PI * e) * R * (.30 + .22 * dart.pw);
      const a = Math.atan2(py - dart.py, px - dart.px) || dart.a;
      dart.a = a; dart.px = px; dart.py = py;
      drawDart(x, px, py, a, 1.15 - .3 * e);
      if (dart.t >= 1) { const d = dart; dart = null; land(d); }
    }
    K.label(x, String(score), 16, 24, 20, 'left');
    if (best) K.label(x, 'best ' + best + ' darts', 16, 45, 10, 'left');
    for (let i = 0; i < 3; i++) {
      x.beginPath(); x.arc(w - 16 - i * 13, 20, 2.8, 0, TAU);
      x.fillStyle = i < darts ? INK(.9) : INK(.2); x.fill();
    }
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function setAim(p) {
    const dx = p.x - geo.cx, dy = p.y - geo.cy, d = Math.hypot(dx, dy), lim = geo.R * 1.05;
    aim = d > lim ? { x: geo.cx + dx / d * lim, y: geo.cy + dy / d * lim } : p;
  }

  K && window.DECIDER_GAMES.push({
    id: 'dart', name: 'Darts', short: 'Darts', label: 'Board', noResult: true, button: false,
    body: `<canvas class="toy" id="dtCv"></canvas><div class="res" id="dtRes" aria-live="polite"><span class="muted">Drag to aim</span></div>`,
    init() {
      try { best = +store.get('d.dtbest', 0) || 0; } catch (e) {}
      L = K.loop(frame);
      layout();
      cv().addEventListener('pointerdown', (e) => {
        if (busy || !geo) return;
        aiming = true; drag0 = at(e); setAim(drag0);
        try { cv().setPointerCapture(e.pointerId); } catch (err) {}
      });
      cv().addEventListener('pointermove', (e) => { if (aiming && geo) setAim(at(e)); });
      cv().addEventListener('pointerup', (e) => {
        if (!aiming) return;
        aiming = false;
        const p = at(e), run = Math.hypot(p.x - drag0.x, p.y - drag0.y);
        fire(clamp(run / (geo ? geo.w * .5 : 200), 0, 1));
      });
      cv().addEventListener('pointercancel', () => { aiming = false; });
    },
    enter() { layout(); L.start(); },
    leave() { aiming = false; L.stop(); },
    action() {
      if (geo) aim = { x: geo.cx + (Math.random() - .5) * geo.R * .9, y: geo.cy + (Math.random() - .5) * geo.R * .9 };
      fire(.7);
    },
    status() { return { score, darts, best, turn: turnDarts, stuck: stuck.length }; }
  });
})();
