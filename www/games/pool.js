/* Pool — a real table: cushions, six pockets, and balls that actually collide.
 * Drag to aim, let go to shoot. The cue ball is the only one you steer; pot a ball
 * and it pays, scratch and it costs, clear the rack for a bonus. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('poCv');
  const res = () => document.getElementById('poRes');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const COLS = ['#f5c542', '#2f6dd0', '#c8323c', '#5a3aa8', '#e07a2f', '#2f8f4e', '#8c2f4e', '#141018'];
  let L = null, geo = null, balls = [], pockets = [], cue = null;
  let aim = null, aiming = false, press = { x: 0, y: 0 }, moving = false;
  let score = 0, best = 0, racked = 0, potted = 0, msg = '', msgT = 0;

  function layout() {
    const c = cv(); if (!c) return;
    const g = K.fit(c);
    /* keep the whole rail on the card: the table used to run off the bottom edge */
    const rail0 = Math.max(7, g.h * .045);
    const fw = Math.min(g.w - rail0 * 3.2, (g.h - rail0 * 3.2) * 1.72);
    const fh = fw * .52;
    const fx = (g.w - fw) / 2, fy = (g.h - fh) / 2 + g.h * .02;
    const BR = Math.max(7, Math.min(13, fh * .040));
    geo = { w: g.w, h: g.h, fx, fy, fw, fh, BR, rail: Math.max(BR * 1.4, rail0) };
    pockets = [
      { x: fx, y: fy }, { x: fx + fw / 2, y: fy }, { x: fx + fw, y: fy },
      { x: fx, y: fy + fh }, { x: fx + fw / 2, y: fy + fh }, { x: fx + fw, y: fy + fh }
    ].map((p) => ({ x: p.x, y: p.y, r: BR * 1.85 }));
    rack();
  }

  function rack() {
    const { fx, fy, fw, fh, BR } = geo;
    balls = [];
    /* cue ball on the head spot */
    cue = { x: fx + fw * .25, y: fy + fh / 2, vx: 0, vy: 0, r: BR, col: '#f7f4ea', num: 0, cue: true };
    balls.push(cue);
    /* a triangle of eight, apex on the foot spot */
    const apex = { x: fx + fw * .70, y: fy + fh / 2 };
    let n = 1;
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i <= row; i++) {
        balls.push({
          x: apex.x + row * BR * 1.76,
          y: apex.y + (i - row / 2) * BR * 2.04,
          vx: 0, vy: 0, r: BR, col: COLS[(n - 1) % COLS.length], num: n, cue: false
        });
        n++;
      }
    }
    moving = false; aim = null;
  }

  function shoot(dirx, diry, power) {
    if (moving) return;
    const d = Math.hypot(dirx, diry) || 1;
    const sp = 3.4 + power * 13;
    cue.vx = dirx / d * sp; cue.vy = diry / d * sp;
    moving = true; potted = 0;
    K.setResult(res(), '');
    try { K.sfx.knock(.6 + power * .8); } catch (e) {}
    try { buzz(6 + power * 10); } catch (e) {}
  }

  function step(dt) {
    const { fx, fy, fw, fh, BR } = geo;
    let speed = 0;
    balls.forEach((b) => { speed = Math.max(speed, Math.hypot(b.vx, b.vy)); });
    const n = clamp(Math.ceil(speed / (BR * .55)), 1, 12), s = dt / n;
    for (let k = 0; k < n; k++) {
      balls.forEach((b) => {
        if (b.potted) return;
        b.x += b.vx * s; b.y += b.vy * s;
        const damp = Math.pow(.986, s);
        b.vx *= damp; b.vy *= damp;
        /* cushions */
        if (b.x - b.r < fx) { b.x = fx + b.r; b.vx = Math.abs(b.vx) * .82; }
        if (b.x + b.r > fx + fw) { b.x = fx + fw - b.r; b.vx = -Math.abs(b.vx) * .82; }
        if (b.y - b.r < fy) { b.y = fy + b.r; b.vy = Math.abs(b.vy) * .82; }
        if (b.y + b.r > fy + fh) { b.y = fy + fh - b.r; b.vy = -Math.abs(b.vy) * .82; }
        /* pockets */
        for (const p of pockets) {
          if (Math.hypot(b.x - p.x, b.y - p.y) < p.r) { pocketBall(b); break; }
        }
      });
      /* ball to ball */
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i]; if (a.potted) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j]; if (b.potted) continue;
          let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .001;
          const min = a.r + b.r;
          if (d < min) {
            const nx = dx / d, ny = dy / d, push = (min - d) / 2;
            a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
            const vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              const jimp = -(1 + .94) * vn / 2;
              a.vx -= jimp * nx; a.vy -= jimp * ny;
              b.vx += jimp * nx; b.vy += jimp * ny;
            }
          }
        }
      }
    }
    /* stop the crawl */
    balls.forEach((b) => {
      if (b.potted) return;
      if (Math.hypot(b.vx, b.vy) < .045) { b.vx = 0; b.vy = 0; }
    });
    const anyLeft = balls.some((b) => !b.potted && !b.cue && (b.vx || b.vy));
    if (moving && !anyLeft) {
      moving = false;
      /* the table is clear: pay a bonus and break again */
      if (balls.every((b) => b.cue || b.potted) ) {
        score += 50; racked++;
        if (score > best) { best = score; try { store.set('d.pobest', best); } catch (e) {} }
        K.setResult(res(), 'table cleared  +50');
        try { chime(); confetti(); } catch (e) {}
        rack();
      }
    }
    if (msgT > 0) msgT = Math.max(0, msgT - dt * .02);
  }

  function pocketBall(b) {
    if (b.cue) {
      /* scratch: the cue comes back, and it costs */
      score = Math.max(0, score - 10);
      b.potted = false; b.vx = 0; b.vy = 0;
      b.x = geo.fx + geo.fw * .25; b.y = geo.fy + geo.fh / 2;
      msg = 'scratch  −10'; msgT = 1;
      K.setResult(res(), 'scratch  −10');
      try { K.sfx.thud(1); } catch (e) {}
      return;
    }
    b.potted = true; b.vx = 0; b.vy = 0; potted++;
    score += 10;
    if (score > best) { best = score; try { store.set('d.pobest', best); } catch (e) {} }
    K.setResult(res(), '+' + (10 * potted));
    try { K.sfx.land(1.1); } catch (e) {}
  }

  function draw() {
    const c = cv(); if (!c) return;
    const g = K.fit(c);
    if (!geo || Math.abs(geo.w - g.w) > .5 || Math.abs(geo.h - g.h) > .5) layout();
    if (!geo) return;
    const x = g.x, w = g.w, h = g.h, { fx, fy, fw, fh, BR, rail } = geo;
    x.clearRect(0, 0, w, h);
    K.surf(x, w, h);

    /* rail */
    x.save(); x.shadowColor = 'rgba(6,3,18,.55)'; x.shadowBlur = 18; x.shadowOffsetY = 8;
    K.rr(x, fx - rail, fy - rail, fw + rail * 2, fh + rail * 2, rail * 1.2);
    x.fillStyle = '#4a2c1a'; x.fill(); x.restore();
    /* felt */
    K.rr(x, fx, fy, fw, fh, 6);
    const fg = x.createLinearGradient(0, fy, 0, fy + fh);
    fg.addColorStop(0, '#1e7a4f'); fg.addColorStop(1, '#15603d');
    x.fillStyle = fg; x.fill();
    /* baulk line and spots */
    x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(fx + fw * .25, fy + 4); x.lineTo(fx + fw * .25, fy + fh - 4); x.stroke();
    /* pockets */
    pockets.forEach((p) => {
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU);
      x.fillStyle = '#0a0614'; x.fill();
      x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 1.4; x.stroke();
    });
    /* balls */
    balls.forEach((b) => {
      if (b.potted) return;
      x.save();
      x.beginPath(); x.arc(b.x + 1.5, b.y + 2.5, b.r, 0, TAU);
      x.fillStyle = 'rgba(4,2,12,.34)'; x.fill();
      const gr = x.createRadialGradient(b.x - b.r * .35, b.y - b.r * .4, b.r * .1, b.x, b.y, b.r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, b.col); gr.addColorStop(1, b.col);
      x.beginPath(); x.arc(b.x, b.y, b.r, 0, TAU); x.fillStyle = gr; x.fill();
      x.strokeStyle = 'rgba(10,6,24,.35)'; x.lineWidth = 1; x.stroke();
      if (!b.cue && b.r > 8) {
        x.beginPath(); x.arc(b.x, b.y, b.r * .46, 0, TAU); x.fillStyle = '#fdfaf2'; x.fill();
        x.fillStyle = '#141018'; x.font = '800 ' + Math.round(b.r * .62) + 'px "Bricolage Grotesque",system-ui,sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(b.num), b.x, b.y + .5);
      }
      x.restore();
    });
    /* cue and aim line */
    if (aim) {
      const dx = aim.x - cue.x, dy = aim.y - cue.y, d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      x.save();
      x.setLineDash([6, 7]); x.strokeStyle = INK(.55); x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(cue.x + ux * BR * 1.2, cue.y + uy * BR * 1.2);
      x.lineTo(cue.x + ux * d, cue.y + uy * d); x.stroke();
      x.setLineDash([]);
      /* the stick, pulled back by the power */
      const back = BR * (2.2 + aim.pw * 5);
      x.beginPath();
      x.moveTo(cue.x - ux * back, cue.y - uy * back);
      x.lineTo(cue.x - ux * (back + fh * .30), cue.y - uy * (back + fh * .30));
      x.strokeStyle = '#c99a5b'; x.lineWidth = 4; x.lineCap = 'round'; x.stroke();
      x.restore();
    }
    /* HUD */
    K.label(x, String(score), 16, 22, 18, 'left');
    if (best > score) K.label(x, 'best ' + best, 16, 42, 10, 'left');
    const left = balls.filter((b) => !b.cue && !b.potted).length;
    K.label(x, left + ' left', w - 16, 22, 11, 'right');
    if (msgT > 0) {
      x.save(); x.globalAlpha = Math.min(1, msgT);
      K.label(x, msg, w / 2, h - 14, 12);
      x.restore();
    }
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  K && window.DECIDER_GAMES.push({
    id: 'pool', name: 'Pool', short: 'Pool', label: 'Balls', noResult: true, button: false,
    body: `<canvas class="toy wide" id="poCv"></canvas><div class="res" id="poRes" aria-live="polite"><span class="muted">Drag to aim</span></div>`,
    init() {
      try { best = +store.get('d.pobest', 0) || 0; } catch (e) {}
      L = K.loop((dt) => { step(Math.min(2.2, dt / 1.2)); draw(); });
      layout();
      const c = cv();
      c.addEventListener('pointerdown', (e) => {
        if (!geo || moving) return;
        aiming = true; press = at(e); aim = { x: press.x, y: press.y, pw: 0 };
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
      });
      c.addEventListener('pointermove', (e) => {
        if (!aiming || !geo) return;
        const p = at(e);
        const dx = p.x - press.x, dy = p.y - press.y, len = Math.hypot(dx, dy);
        const maxd = Math.min(geo.w, geo.h) * .38;
        aim = { x: cue.x + dx / (len || 1) * Math.max(30, len), y: cue.y + dy / (len || 1) * Math.max(30, len), pw: clamp(len / maxd, 0, 1) };
      });
      c.addEventListener('pointerup', (e) => {
        if (!aiming) return;
        aiming = false;
        const p = at(e);
        const dx = p.x - press.x, dy = p.y - press.y, len = Math.hypot(dx, dy);
        const maxd = Math.min(geo.w, geo.h) * .38;
        aim = null;
        if (len < 8) { K.setResult(res(), 'drag to aim'); return; }
        shoot(dx, dy, clamp(len / maxd, .05, 1));
      });
      c.addEventListener('pointercancel', () => { aiming = false; aim = null; });
    },
    enter() { layout(); L.start(); },
    leave() { aiming = false; aim = null; L.stop(); },
    action() {
      if (!geo || moving) return;
      const a = Math.random() * TAU;
      shoot(Math.cos(a), Math.sin(a), .7);
    },
    status() {
      return { score, best, moving, left: balls.filter((b) => !b.cue && !b.potted).length,
        cue: cue ? { x: Math.round(cue.x), y: Math.round(cue.y) } : null };
    }
  });
})();
