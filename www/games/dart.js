/* Dart — drag to aim, release to throw; the sector the dart sticks in decides. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT, TAU = Math.PI * 2;
  const cv = () => document.getElementById('dtCv');
  const res = () => document.getElementById('dtRes');
  let L = null, labels = [], geo = null, aim = null, aiming = false, drag0 = { x: 0, y: 0 };
  let tAim = 0, wob = { x: 0, y: 0 }, dart = null, stuck = null, hit = -1, busy = false;

  const pick = (n) => { const b = K.options(n); return Array.from({ length: n }, (_, i) => b[i % b.length]); };

  function layout() {
    const c = cv(); if (!c) return;
    const g = K.fit(c), R = Math.min(g.w * .44, g.h * .40);
    geo = { w: g.w, h: g.h, cx: g.w / 2, cy: g.h * .47, R, n: labels.length, st: TAU / labels.length };
  }
  /* small text pill, shrunk to fit the sector */
  function pill(x, px, py, t, max, size, bg, fg) {
    x.font = `700 ${size}px "Bricolage Grotesque",system-ui,sans-serif`;
    let s = t;
    while (s.length > 1 && x.measureText(s).width > max - 12) s = s.slice(0, -1);
    if (s !== t) s = s.trim() + '…';
    const tw = Math.min(max, x.measureText(s).width + 12), th = size + 8;
    K.rr(x, px - tw / 2, py - th / 2, tw, th, th / 2);
    x.fillStyle = bg; x.fill(); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, px, py + .5);
  }

  function drawBoard(x) {
    const { cx, cy, R, n, st } = geo;
    x.save(); x.shadowColor = 'rgba(36,26,85,.22)'; x.shadowBlur = 26; x.shadowOffsetY = 12;
    x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fillStyle = '#fffdf8'; x.fill(); x.restore();
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * st;
      x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R * .865, a0, a0 + st); x.closePath();
      x.fillStyle = i % 2 ? PAL[i % PAL.length] : 'rgba(38,28,86,.9)'; x.fill();
    }
    if (hit >= 0) {
      const a0 = -Math.PI / 2 + hit * st;
      x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R * .865, a0, a0 + st); x.closePath();      x.fillStyle = K.mat().flat ? '#f1ebda' : 'rgba(255,255,255,.14)'; x.fill();
      x.strokeStyle = INK(.95); x.lineWidth = 3; x.stroke();
    }
    /* score ring with sector numbers */
    x.beginPath(); x.arc(cx, cy, R * .865, 0, TAU); x.arc(cx, cy, R, 0, TAU, true); x.fillStyle = 'rgba(38,28,86,.94)'; x.fill();
    x.fillStyle = INK(1); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 ${Math.max(7, R * .058)}px "Bricolage Grotesque",system-ui,sans-serif`;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i + .5) * st;
      x.fillText(String(i + 1), cx + Math.cos(a) * R * .932, cy + Math.sin(a) * R * .932);
    }
    const chord = 2 * R * .60 * Math.sin(st / 2);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i + .5) * st;
      pill(x, cx + Math.cos(a) * R * .60, cy + Math.sin(a) * R * .60, labels[i],
        Math.min(86, chord * .92), Math.max(8, Math.min(11, R * .075)), '#fffdf8', '#241a55');
    }
    x.beginPath(); x.arc(cx, cy, R * .10, 0, TAU); x.fillStyle = '#fffdf8'; x.fill();
    x.strokeStyle = 'rgba(38,28,86,.65)'; x.lineWidth = 2; x.stroke();
    x.beginPath(); x.arc(cx, cy, R * .034, 0, TAU); x.fillStyle = 'rgba(38,28,86,.85)'; x.fill();
  }

  function drawDart(x, px, py, ang, s) {
    x.save(); x.translate(px, py); x.rotate(ang); x.scale(s, s); x.lineCap = 'round'; x.beginPath(); x.moveTo(-17, 0); x.lineTo(9, 0);
    x.strokeStyle = '#2b1b5e'; x.lineWidth = 2.4; x.stroke(); x.beginPath(); x.moveTo(19, 0); x.lineTo(8, -4.5); x.lineTo(8, 4.5); x.closePath();
    x.fillStyle = '#eef2ff'; x.fill(); x.strokeStyle = '#2b1b5e'; x.lineWidth = 1; x.stroke();
    x.beginPath(); x.moveTo(-17, 0); x.lineTo(-23, -7); x.lineTo(-10, -3); x.closePath(); x.fillStyle = PAL[0]; x.fill();
    x.beginPath(); x.moveTo(-17, 0); x.lineTo(-23, 7); x.lineTo(-10, 3); x.closePath(); x.fill(); x.restore();
  }

  function fire(power) {
    if (busy || !geo) return;
    const R = geo.R;
    if (!aim) aim = { x: geo.cx, y: geo.cy };
    // a hard throw flies straight; a soft one wanders with the hand's tremor
    const slop = 1 - Math.min(1, Math.max(0, power == null ? .55 : power)) * .85;
    /* wob is already in px: multiplying it by R made the error scale with R², so at
       tablet size the board landed 200px from the crosshair the player was watching */
    let tx = aim.x + wob.x * slop;
    let ty = aim.y + wob.y * slop;
    const dx = tx - geo.cx, dy = ty - geo.cy, d = Math.hypot(dx, dy) || 1;
    if (d > R * .92) {
      /* a wild throw should be a miss, not a clamped hit on the rim */
      const dd = Math.min(d, R * 1.18);
      tx = geo.cx + dx / d * dd; ty = geo.cy + dy / d * dd;
    }
    stuck = null; hit = -1; busy = true;
    dart = { lx: geo.w / 2, ly: geo.h + 12, tx, ty, t: 0, px: geo.w / 2, py: geo.h + 12, a: -Math.PI / 2 };
    K.setResult(res(), '…');
    try { tone(320, .08, .04, 'sawtooth', 640); } catch (e) {}
  }

  function land(d) {
    const { cx, cy, n, st, R } = geo;
    /* every dart won a label, even one stuck in the score ring */
    if (Math.hypot(d.tx - cx, d.ty - cy) > R * 0.94) {
      stuck = null; aim = null; busy = false; hit = -1;
      K.setResult(res(), 'Off the board — throw again');
      try { tone(150, .16, .05, 'triangle', 100); } catch (e) {}
      return;
    }
    const ang = Math.atan2(d.ty - cy, d.tx - cx);
    const rel = ((ang + Math.PI / 2) % TAU + TAU) % TAU;
    hit = Math.min(n - 1, Math.floor(rel / st));
    stuck = { x: d.tx, y: d.ty, a: d.a };
    aim = null; busy = false;
    K.setResult(res(), labels[hit]);
    try { tone(680, .13, .05, 'sine', 1020); } catch (e) {}
  }

  function frame(dt) {
    const g = K.fit(cv());
    if (!geo || Math.abs(geo.w - g.w) > .5) layout();
    if (!geo) return;
    const x = g.x, w = g.w, h = g.h, R = geo.R;
    x.clearRect(0, 0, w, h);
    K.surf(x, w, h);
    if (aiming) {
      tAim += dt * .55;
      wob = { x: Math.sin(tAim) * R * .035, y: Math.cos(tAim * 1.4) * R * .032 };
    }
    drawBoard(x);
    if (aim) {
      const p = { x: aim.x + wob.x, y: aim.y + wob.y };
      x.save(); x.setLineDash([4, 6]); x.strokeStyle = INK(.55); x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(w / 2, h + 4); x.lineTo(p.x, p.y); x.stroke();
      x.setLineDash([]); x.strokeStyle = INK(.95); x.lineWidth = 2; x.beginPath(); x.arc(p.x, p.y, R * .115, 0, TAU); x.stroke();
      x.beginPath(); x.moveTo(p.x - 24, p.y); x.lineTo(p.x - 8, p.y); x.moveTo(p.x + 8, p.y); x.lineTo(p.x + 24, p.y);
      x.moveTo(p.x, p.y - 24); x.lineTo(p.x, p.y - 8); x.moveTo(p.x, p.y + 8); x.lineTo(p.x, p.y + 24); x.stroke();
      x.beginPath(); x.arc(p.x, p.y, 2.5, 0, TAU); x.fillStyle = INK(1); x.fill(); x.restore();
    }
    if (stuck) drawDart(x, stuck.x, stuck.y, stuck.a, .9);
    if (dart) {
      dart.t += dt / 30;
      const e = Math.min(1, dart.t);
      const px = dart.lx + (dart.tx - dart.lx) * e;
      const py = dart.ly + (dart.ty - dart.ly) * e - Math.sin(Math.PI * e) * R * .5;
      const a = Math.atan2(py - dart.py, px - dart.px) || dart.a;
      dart.a = a; dart.px = px; dart.py = py;
      drawDart(x, px, py, a, 1.15 - .3 * e);
      if (dart.t >= 1) { const d = dart; dart = null; land(d); }
    }
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function setAim(p) {
    const dx = p.x - geo.cx, dy = p.y - geo.cy, d = Math.hypot(dx, dy), lim = geo.R * .94;
    aim = d > lim ? { x: geo.cx + dx / d * lim, y: geo.cy + dy / d * lim } : p;
  }

  K && window.DECIDER_GAMES.push({
    id: 'dart', name: 'Dart', short: 'Dart', label: 'Board', noResult: true, button: false,
    body: `<canvas class="toy" id="dtCv"></canvas><div class="res" id="dtRes" aria-live="polite"><span class="muted">Drag to aim, let go to throw</span></div><button class="btn" id="dtGo">Throw</button>`,
    init(card) {
      /* one label per sector, and as many sectors as divide evenly: 6 stays a
         dartboard, 4/5 options get their own sectors instead of a 1.2x bias */
      const opts = K.options(6);
      const sectors = opts.length && 6 % opts.length === 0 ? 6 : opts.length;
      labels = Array.from({ length: sectors }, (_, i) => opts[i % opts.length]);
      L = K.loop(frame);
      layout();
      card.querySelector('#dtGo').onclick = () => fire(0.55);
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
        fire(Math.max(0, Math.min(1, run / (geo ? geo.w * 0.55 : 200))));
      });
      cv().addEventListener('pointercancel', () => { aiming = false; });
    },
    enter() { layout(); L.start(); },
    leave() { aiming = false; L.stop(); },
    action() {
      /* aiming at dead centre made Space throw the same sector every time */
      if (geo) aim = { x: geo.cx + (Math.random() - .5) * geo.R * 1.1, y: geo.cy + (Math.random() - .5) * geo.R * 1.1 };
      fire();
    }
  });
})();