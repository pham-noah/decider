/* Ring Toss — flick a ring at five pegs; the first one ringed decides. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  const TAU = Math.PI * 2;
  const cv = () => document.getElementById('rtCv');
  const res = () => document.getElementById('rtRes');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HS = [.125, .09, .14, .085, .115];
  let L = null, labels = [], geo = null, pegs = [], drag = null;
  let ring = null, state = 'ready', settle = 0, ringsLeft = 3, lastX = 0, winner = null;

  const pick = (n) => { const b = K.options(n); return Array.from({ length: n }, (_, i) => b[i % b.length]); };

  function layout() {
    const c = cv(); if (!c) return; const g = K.fit(c); const baseY = g.h * .57, stepX = g.w * .175;
    geo = { w: g.w, h: g.h, baseY, stepX, cx: g.w / 2 };
    pegs = HS.map((f, i) => ({ x: geo.cx + (i - 2) * stepX, top: baseY - g.h * f,
      l: labels[i % labels.length], c: PAL[i % PAL.length], hit: false }));
    resetTurn();
  }

  function resetTurn() {
    ringsLeft = 3; winner = null; state = 'ready'; settle = 0; lastX = geo.cx;
    pegs.forEach((p) => { p.hit = false; });
    ring = { x: geo.cx, y: geo.h - 54, vx: 0, vy: 0, rot: 0, on: null };
  }

  function throwRing(dx, dy) {
    if (!geo || state === 'fly' || state === 'settle') return;
    if (state === 'done') resetTurn();
    ringsLeft--;
    ring.vx = clamp(dx * .045, -6, 6);
    ring.vy = dy < -40 ? clamp(dy * .10, -14.8, -13.2) : -13.8;
    ring.rot = 0; state = 'fly';
    K.setResult(res(), 'Ring ' + (3 - ringsLeft) + ' of 3');
    try { tone(380, .08, .04, 'sine', 560); } catch (e) {}
  }

  function capture(p) {
    p.hit = true; winner = p; state = 'settle'; settle = 26;
    ring.on = p; ring.x = p.x; ring.y = p.top + 2; ring.vx = 0; ring.vy = 0;
    try { tone(760, .14, .05, 'sine', 1120); } catch (e) {}
  }

  function miss() {
    state = 'settle'; settle = 16; lastX = ring.x;
    ring.y = geo.baseY - 5; ring.vx = 0; ring.vy = 0; ring.rot = 0;
    try { tone(150, .1, .04, 'triangle', 110); } catch (e) {}
  }

  function decide(p) {
    state = 'done'; const i = pegs.indexOf(p);
    K.setResult(res(), p.l);
    K.decide(p.l, 'Ring Toss', 'Peg ' + (i + 1) + (p.hit ? ' ringed' : ' nearest'));
  }

  function nearest() {
    return pegs.reduce((a, p) => Math.abs(p.x - lastX) < Math.abs(a.x - lastX) ? p : a, pegs[0]);
  }

  function physics(dt) {
    const py = ring.y;
    ring.vy += .42 * dt;
    ring.x += ring.vx * dt; ring.y += ring.vy * dt;
    ring.rot += .24 * dt;
    if (ring.vy > 0) {
      for (let i = 0; i < pegs.length; i++) {
        const p = pegs[i];
        if (!p.hit && py < p.top && ring.y >= p.top && Math.abs(ring.x - p.x) < 14) { capture(p); return; }
      }
    }
    if (ring.vy > 0 && ring.y > geo.baseY - 5) miss();
  }

  function pill(x, px, py, t, max, size, bg, fg) {
    x.font = `700 ${size}px "Bricolage Grotesque",system-ui,sans-serif`; let s = t;
    while (s.length > 1 && x.measureText(s).width > max - 12) s = s.slice(0, -1);
    if (s !== t) s = s.trim() + '…';
    const tw = Math.min(max, x.measureText(s).width + 12), th = size + 8;
    K.rr(x, px - tw / 2, py - th / 2, tw, th, th / 2); x.fillStyle = bg; x.fill();
    if (!fg || fg === '#241a55') { x.strokeStyle = 'rgba(36,26,85,.16)'; x.lineWidth = 1; x.stroke(); }
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, px, py + .5);
  }

  function drawScene(x, g) {
    const { baseY, cx } = geo; x.fillStyle = INK(.55);
    for (let i = 0; i < 9; i++) {
      const bx = 14 + i * (g.w - 22) / 8; x.beginPath(); x.moveTo(bx - 8, 10); x.lineTo(bx + 8, 10); x.lineTo(bx, 26); x.closePath(); x.fillStyle = PAL[i % PAL.length] + 'bb'; x.fill();
    }
    K.rr(x, 8, baseY - 7, g.w - 16, 15, 7); x.fillStyle = 'rgba(36,26,85,.82)'; x.fill();
    K.rr(x, 8, baseY + 5, g.w - 16, 52, 12); x.fillStyle = INK(.42); x.fill();
    K.rr(x, 8, baseY + 5, g.w - 16, 52, 12); x.strokeStyle = INK(.7); x.lineWidth = 1.5; x.stroke();
    pegs.forEach((p) => {
      x.beginPath(); x.moveTo(p.x - 4, baseY - 4); x.lineTo(p.x - 3, p.top + 4); x.lineTo(p.x + 3, p.top + 4); x.lineTo(p.x + 4, baseY - 4); x.closePath(); x.fillStyle = INK(.96); x.fill();
      x.strokeStyle = 'rgba(36,26,85,.16)'; x.lineWidth = 1; x.stroke(); x.beginPath(); x.arc(p.x, p.top, 6.5, 0, TAU); x.fillStyle = p.c; x.fill(); x.strokeStyle = INK(.9); x.lineWidth = 1.5; x.stroke();
      pill(x, p.x, baseY + 31, p.l, geo.stepX * .9, 10, p.hit ? p.c : INK(.95), '#241a55');
    }); x.strokeStyle = INK(.45); x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 60, g.h - 30); x.lineTo(cx + 60, g.h - 30); x.stroke();
  }

  function drawRing(x) {
    const r = Math.min(17, geo.w * .046); const ry = state === 'fly' ? .22 + .6 * Math.abs(Math.cos(ring.rot)) : (ring.on ? .30 : .34); x.save(); x.translate(ring.x, ring.y);
    x.beginPath(); x.ellipse(0, 0, r, r * ry, 0, 0, TAU); x.strokeStyle = 'rgba(36,26,85,.18)'; x.lineWidth = 7; x.stroke(); x.beginPath(); x.ellipse(0, 0, r, r * ry, 0, 0, TAU);
    x.strokeStyle = '#ff6fae'; x.lineWidth = 5; x.stroke(); x.beginPath(); x.ellipse(0, 0, r, r * ry, 0, 0, TAU); x.strokeStyle = INK(.75); x.lineWidth = 1.5; x.stroke(); x.restore();
  }

  function frame(dt) {
    const g = K.fit(cv());
    if (!geo || Math.abs(geo.w - g.w) > .5) layout();
    if (!geo) return;
    const x = g.x, w = g.w, h = g.h; x.clearRect(0, 0, w, h);
    K.rr(x, 0, 0, w, h, 18); x.fillStyle = INK(.28); x.fill();
    if (state === 'fly') physics(dt);
    if (state === 'settle' && (settle -= dt) <= 0) {
      if (winner) decide(winner);
      else if (ringsLeft > 0) {
        state = 'ready';
        ring = { x: geo.cx, y: h - 54, vx: 0, vy: 0, rot: 0, on: null };
        K.setResult(res(), 'Ring ' + (3 - ringsLeft + 1) + ' of 3');
      } else decide(nearest());
    }
    drawScene(x, g);
    drawRing(x);
    [0, 1, 2].forEach((i) => { const px = w - 26 - i * 18, py = h - 22;
      x.beginPath(); x.ellipse(px, py, 7, 3, 0, 0, TAU); x.strokeStyle = i < ringsLeft ? '#ff6fae' : 'rgba(36,26,85,.18)'; x.lineWidth = 2.5; x.stroke(); });
    if (drag && state === 'ready') {
      const dx = drag.x - drag.x0, dy = drag.y - drag.y0; const len = Math.min(96, Math.hypot(dx, dy)), ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
      const ex = ring.x + ux * len, ey = ring.y + uy * len; x.save(); x.setLineDash([5, 6]); x.strokeStyle = INK(.9); x.lineWidth = 3; x.beginPath(); x.moveTo(ring.x, ring.y); x.lineTo(ex, ey); x.stroke();
      x.setLineDash([]); x.beginPath(); x.moveTo(ex + ux * 9, ey + uy * 9); x.lineTo(ex - uy * 6, ey + ux * 6); x.lineTo(ex + uy * 6, ey - ux * 6); x.closePath(); x.fillStyle = INK(.9); x.fill();
      x.restore();
    }
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  K && window.DECIDER_GAMES.push({
    id: 'ringtoss', name: 'Ring Toss', short: 'Rings', label: 'Pegs', noResult: true, button: false,
    body: `<canvas class="toy" id="rtCv"></canvas><div class="res" id="rtRes" aria-live="polite"><span class="muted">Flick a ring at a peg — three rings</span></div><button class="btn" id="rtGo">Toss</button>`,
    init(card) {
      labels = pick(5);
      layout();
      L = K.loop(frame);
      card.querySelector('#rtGo').onclick = () => {
        if (state === 'fly' || state === 'settle' || !geo) return;
        if (state === 'done') resetTurn();
        const p = pegs[Math.floor(pegs.length / 2)];
        throwRing((p.x - ring.x) / 2, -138);
      };
      cv().addEventListener('pointerdown', (e) => {
        if (state === 'fly' || state === 'settle' || !geo) return;
        const p = at(e); drag = { x: p.x, y: p.y, x0: p.x, y0: p.y };
        try { cv().setPointerCapture(e.pointerId); } catch (err) {}
      });
      cv().addEventListener('pointermove', (e) => { if (!drag) return; const p = at(e); drag.x = p.x; drag.y = p.y; });
      cv().addEventListener('pointerup', () => {
        if (!drag) return;
        const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
        drag = null; throwRing(dx, dy);
      });
      cv().addEventListener('pointercancel', () => { drag = null; });
    },
    enter() { layout(); L.start(); },
    leave() { drag = null; L.stop(); },
    action() {
      if (state === 'fly' || state === 'settle' || !geo) return;
      if (state === 'done') resetTurn();
      const p = pegs[Math.floor(pegs.length / 2)];
      throwRing((p.x - ring.x) / 2, -138);
    }
  });
})();