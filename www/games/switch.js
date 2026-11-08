/* Switch — a bank of five rocker switches set into a milled plate. Tap one and
 * its paddle snaps over on a centre pin; hold and sweep the bank and every
 * switch you pass ticks over, once per lever per gesture. A lamp and an ON/OFF
 * legend carry the state. No goal, no numbers. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2, N = 5;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const EDGE = '#241a3a';                 // machined ink: the same edge on every skin
  const cv = () => document.getElementById('swCv');
  let L = null, g = null, bank = [], drag = null;
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); K.sfx.click(1); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* colour blend for the rocker faces — the two ends trade light as it rocks */
  const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function mix(c1, c2, t) {
    const A = hx(c1), B = hx(c2);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
      Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
      Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }

  function layout() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const top = 40, bot = 28, gap = 6;
    const bh = (g.h - top - bot) / N;
    const bw = Math.min(g.w - 22, 372);
    if (!bank.length) {
      for (let i = 0; i < N; i++) bank.push({ i, on: i % 2 === 1, a: i % 2 === 1 ? 1 : 0, v: 0, flash: 0, ring: 0 });
    }
    const rowH = Math.max(38, bh - gap);
    bank.forEach((s, i) => {
      s.w = bw;
      s.x = (g.w - bw) / 2;
      s.y = top + i * bh + gap / 2;
      s.h = rowH;
      /* one switch unit: lamp — recessed plate + paddle — ON/OFF legend */
      const lampCol = 36, textCol = 52;
      const pH = Math.max(24, s.h - 18);                     // paddle is always wider than tall
      const pW = Math.max(48, Math.min(pH * 3.2, bw - lampCol - textCol - 30));
      const plateW = pW + 22;
      const unitW = lampCol + plateW + textCol;
      const left = (g.w - unitW) / 2;
      s.px = left + lampCol + 11; s.py = s.y + 9; s.pW = pW; s.pH = pH;
      s.cx = s.px + pW / 2;
      s.bx = left + lampCol; s.by = s.y; s.bw = plateW; s.bh = s.h;
      s.lampX = left + 18; s.lampY = s.y + s.h * .5;
      s.labX = left + unitW - 8; s.labY = s.y + s.h * .5;
    });
  }

  function flip(i) {
    const s = bank[i]; if (!s) return;
    s.on = !s.on;
    s.flash = 1; s.ring = 1;
    sfx(118 + i * 17, .06, .085, 'square', 58 + i * 7);       // the clunk
    sfx(880 + i * 60, .02, .04, 'triangle', 260 + i * 20);    // the tick
    hap(9);
  }

  function step(dt) {
    bank.forEach(s => {
      s.v += ((s.on ? 1 : 0) - s.a) * .62 * dt;
      s.v *= Math.pow(.62, dt);
      s.a += s.v * dt;
      if (s.a < -.18) { s.a = -.18; s.v = Math.abs(s.v) * .36; }   // hard stop, small rebound
      if (s.a > 1.18) { s.a = 1.18; s.v = -Math.abs(s.v) * .36; }
      s.flash = Math.max(0, s.flash - .045 * dt);
      s.ring = Math.max(0, s.ring - .055 * dt);
    });
  }

  /* ---------- art ---------- */

  /* the milled plate the switch sits in: a raised bezel ring, a dark well, a
     shadowed top wall and a lit lip — three levels, so it reads as a cut-out. */
  function recess(x, X, Y, W, H, r, m) {
    K.rr(x, X - 2.5, Y - 2.5, W + 5, H + 5, r + 2);
    if (!m.flat) {
      x.strokeStyle = 'rgba(255,255,255,.17)';
      x.lineWidth = 1.6;
      x.stroke();
    }
    K.panel(x, X, Y, W, H, {
      r: r,
      face: m.flat ? '#c9bd9e' : 'rgba(0,0,0,.46)',
      face2: m.flat ? '#c9bd9e' : 'rgba(0,0,0,.58)',
      rim: 'rgba(255,255,255,.22)'
    });
    x.save(); K.rr(x, X, Y, W, H, r); x.clip();
    if (m.flat) {
      x.fillStyle = 'rgba(36,26,58,.16)'; x.fillRect(X, Y, W, 4);
      x.fillStyle = '#fffdf8'; x.fillRect(X, Y + H - 2, W, 2);
    } else {
      const sh = x.createLinearGradient(0, Y, 0, Y + 9);
      sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = sh; x.fillRect(X, Y, W, 9);
      x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(X, Y + H - 1.6, W, 1.6);
    }
    x.restore();
  }

  /* the whole paddle as one outline: top face, kink at the pivot, bottom face.
   * It is stroked once so the seam is a crease, not a stack of borders. */
  function silPath(x, cx, yT, mid, yB, wT, wS, wB, r) {
    const hT = Math.max(.1, mid - yT), hB = Math.max(.1, yB - mid);
    r = Math.min(r, hT * .45, hB * .45, wT * .28, wB * .28);
    const kT = r / hT, kB = r / hB;
    const tL = cx - wT / 2, tR = cx + wT / 2;
    const mL = cx - wS / 2, mR = cx + wS / 2;
    const bL = cx - wB / 2, bR = cx + wB / 2;
    x.beginPath();
    x.moveTo(tL + r, yT);
    x.lineTo(tR - r, yT);
    x.quadraticCurveTo(tR, yT, tR + (mR - tR) * kT, yT + r);
    x.lineTo(mR, mid);
    x.lineTo(bR + (mR - bR) * kB, yB - r);
    x.quadraticCurveTo(bR, yB, bR - r, yB);
    x.lineTo(bL + r, yB);
    x.quadraticCurveTo(bL, yB, bL + (mL - bL) * kB, yB - r);
    x.lineTo(mL, mid);
    x.lineTo(tL + (mL - tL) * kT, yT + r);
    x.quadraticCurveTo(tL, yT, tL + r, yT);
    x.closePath();
  }

  /* one face of the paddle, seam edge square, outer corners rounded */
  function halfPath(x, cx, yEdge, ySeam, wE, wS, r) {
    const h = Math.max(.1, Math.abs(ySeam - yEdge)), down = ySeam > yEdge;
    r = Math.min(r, h * .45, wE * .28);
    const k = r / h;
    const eL = cx - wE / 2, eR = cx + wE / 2, sL = cx - wS / 2, sR = cx + wS / 2;
    if (!down) {
      x.moveTo(eL + r, yEdge);
      x.lineTo(eR - r, yEdge);
      x.quadraticCurveTo(eR, yEdge, eR + (sR - eR) * k, yEdge + r);
      x.lineTo(sR, ySeam);
      x.lineTo(sL, ySeam);
      x.lineTo(eL + (sL - eL) * k, yEdge + r);
      x.quadraticCurveTo(eL, yEdge, eL + r, yEdge);
      x.closePath();
    } else {
      x.moveTo(sR, ySeam);
      x.lineTo(eR + (sR - eR) * k, yEdge - r);
      x.quadraticCurveTo(eR, yEdge, eR - r, yEdge);
      x.lineTo(eL + r, yEdge);
      x.quadraticCurveTo(eL, yEdge, eL + (sL - eL) * k, yEdge - r);
      x.lineTo(sL, ySeam);
      x.closePath();
    }
  }

  function paddle(x, s, m) {
    const flat = m.flat;
    const t = clamp(s.a, -.18, 1.18);
    const k = 1 - t;                     // 1 → top end raised (OFF), 0 → bottom end raised (ON)
    const LIFT = Math.min(5.2, s.pH * .15);   // smaller wells get a shallower throw
    const yT = s.py - k * LIFT, yB = s.py + s.pH + t * LIFT;
    const mid = s.py + s.pH * .5;
    const wT = s.pW - 8 + 16 * k, wB = s.pW - 8 + 16 * (1 - k);
    const cx = s.cx, wS = s.pW;

    /* the cast shadow: the same silhouette, offset, hidden under the paddle itself */
    x.save();
    if (flat) x.translate(3.5, 4);
    else { x.shadowColor = 'rgba(7,2,24,.55)'; x.shadowBlur = 6; x.shadowOffsetY = 3; }
    silPath(x, cx, yT, mid, yB, wT, wS, wB, 4);
    x.fillStyle = flat ? '#1d1340' : 'rgba(7,2,24,.55)';
    x.fill();
    x.restore();

    /* two flat faces — one lit plateau, one grey slab. Never one gradient across
     * both halves: that reads as a rounded tube, which is what this must not be. */
    const faces = [
      { dir: -1, yEdge: yT, wEdge: wT, lit: k },
      { dir: 1, yEdge: yB, wEdge: wB, lit: 1 - k }
    ];
    faces.forEach(f => {
      const lit = f.lit;
      const cOut = mix(flat ? '#d9cba9' : '#a599c3', flat ? '#fdf6e4' : '#fdfaf0', lit);
      const cSea = mix(flat ? '#e6dbc0' : '#bcb0d2', flat ? '#f4ebd4' : '#f2ebdc', lit);
      x.beginPath();
      halfPath(x, cx, f.yEdge, mid, f.wEdge, wS, 6);
      const gd = x.createLinearGradient(0, f.yEdge, 0, mid);
      gd.addColorStop(0, cOut);
      gd.addColorStop(.62, cOut);
      gd.addColorStop(1, cSea);
      x.fillStyle = gd;
      x.fill();

      /* the moulded lip of the raised end, or the shadow that swallows the sunk end */
      x.save(); x.clip();
      const band = flat ? 4 : 6, sgn = f.dir < 0 ? 1 : -1;
      const eg = x.createLinearGradient(0, f.yEdge, 0, f.yEdge + sgn * band);
      if (lit > .5) {
        if (!flat) {
          eg.addColorStop(0, K.light(.38 * lit));
          eg.addColorStop(1, K.light(0));
        } else { eg.addColorStop(0, 'rgba(255,253,248,0)'); eg.addColorStop(1, 'rgba(255,253,248,0)'); }
      } else {
        eg.addColorStop(0, 'rgba(16,8,36,' + ((flat ? .26 : .40) * (1 - lit)) + ')');
        eg.addColorStop(1, 'rgba(16,8,36,0)');
      }
      x.fillStyle = eg;
      x.fillRect(cx - f.wEdge / 2 - 2, Math.min(f.yEdge, f.yEdge + sgn * band) - 1, f.wEdge + 4, band + 2);
      x.restore();
    });

    /* one outline for the whole paddle, then the crease at the pivot */
    silPath(x, cx, yT, mid, yB, wT, wS, wB, 4);
    x.strokeStyle = flat ? EDGE : 'rgba(18,9,40,.68)';
    x.lineWidth = flat ? 1.7 : 1.3;
    x.stroke();

    x.beginPath();
    x.moveTo(cx - wS * .5 + .5, mid); x.lineTo(cx + wS * .5 - .5, mid);
    x.strokeStyle = flat ? EDGE : 'rgba(26,16,48,.62)';
    x.lineWidth = flat ? 1.4 : 1.4;
    x.stroke();

    /* rocker engraving: I up, O down — dropped on wells too shallow to hold it */
    if (s.pH > 26) {
      x.save();
      x.font = '800 11px "Bricolage Grotesque",system-ui,sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = flat ? 'rgba(36,26,58,.68)' : 'rgba(36,26,58,.56)';
      x.fillText('I', cx, (yT + mid) / 2 + .5);
      x.fillText('O', cx, (mid + yB) / 2 + .5);
      x.restore();
    }

    /* hinge nubs where the axle enters the plate, then the pin itself */
    [-1, 1].forEach(sd => {
      const ax = cx + sd * (wS * .5);
      K.rr(x, ax - 2, mid - 3.4, 4, 6.8, 2);
      x.fillStyle = flat ? '#d8ccb2' : 'rgba(9,4,26,.62)';
      x.fill();
      x.strokeStyle = flat ? EDGE : 'rgba(20,10,42,.55)';
      x.lineWidth = 1; x.stroke();
    });
    const pr = Math.min(5, s.pH * .14);
    x.beginPath(); x.arc(cx, mid, pr, 0, TAU);
    if (flat) x.fillStyle = '#fffdf8';
    else {
      const pg = x.createLinearGradient(cx - pr, mid - pr, cx + pr, mid + pr);
      pg.addColorStop(0, '#fffdf8'); pg.addColorStop(.55, '#ddd5c5'); pg.addColorStop(1, '#8d8472');
      x.fillStyle = pg;
    }
    x.fill();
    x.strokeStyle = EDGE; x.lineWidth = 1.4; x.stroke();
    x.beginPath();
    x.moveTo(cx - pr * .5, mid); x.lineTo(cx + pr * .5, mid);
    x.strokeStyle = 'rgba(36,26,58,.62)'; x.lineWidth = 1.2; x.stroke();
    x.beginPath(); x.arc(cx - pr * .33, mid - pr * .44, pr * .22, 0, TAU);
    x.fillStyle = K.light(flat ? .95 : .7); x.fill();

    /* the tick: a ring off the pin on every flip */
    if (s.ring > 0) {
      x.globalAlpha = s.ring * .45;
      x.beginPath(); x.arc(cx, mid, pr + 4 + (1 - s.ring) * 17, 0, TAU);
      x.strokeStyle = flat ? EDGE : INK(.9); x.lineWidth = 1.3; x.stroke();
      x.globalAlpha = 1;
    }
  }

  function lamp(x, s, m) {
    const flat = m.flat, lx = s.lampX, ly = s.lampY, on = s.on;
    if (on || s.flash > 0) {
      const halo = x.createRadialGradient(lx, ly, 1, lx, ly, 22);
      halo.addColorStop(0, K.light(on ? .42 : s.flash * .38));
      halo.addColorStop(1, K.light(0));
      x.beginPath(); x.arc(lx, ly, 22, 0, TAU); x.fillStyle = halo; x.fill();
    }
    /* bezel, well, lens — a pilot light, not a dot */
    x.beginPath(); x.arc(lx, ly, 10.6, 0, TAU);
    x.fillStyle = flat ? '#d2c7ab' : 'rgba(255,255,255,.10)';
    x.fill();
    x.strokeStyle = flat ? EDGE : 'rgba(255,255,255,.26)';
    x.lineWidth = flat ? 1.5 : 1.1; x.stroke();
    x.beginPath(); x.arc(lx, ly, 8, 0, TAU);
    x.fillStyle = flat ? '#c1b596' : 'rgba(0,0,0,.45)';
    x.fill();
    x.beginPath(); x.arc(lx, ly, 6.2, 0, TAU);
    x.fillStyle = on ? '#2fe0c4' : (flat ? '#e9e0c9' : '#3b3566');
    x.fill();
    x.strokeStyle = flat ? EDGE : (on ? 'rgba(170,255,244,.9)' : INK(.20));
    x.lineWidth = 1.2; x.stroke();
    if (on) {
      x.beginPath(); x.arc(lx - 1.9, ly - 2.3, 2.1, 0, TAU);
      x.fillStyle = K.light(.8); x.fill();
    } else if (!flat) {
      x.beginPath(); x.arc(lx - 1.7, ly - 2.1, 1.5, 0, TAU);
      x.fillStyle = K.light(.18); x.fill();
    }
    if (s.flash > 0) {
      x.globalAlpha = s.flash * .5;
      x.beginPath(); x.arc(lx, ly, 10.6 + (1 - s.flash) * 12, 0, TAU);
      x.strokeStyle = flat ? EDGE : K.light(.9); x.lineWidth = 1.4; x.stroke();
      x.globalAlpha = 1;
    }
  }

  function draw() {
    if (!g) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h);
    K.label(x, 'FLIP THE SWITCHES', w / 2, 18, 11);
    bank.forEach(s => {
      recess(x, s.bx, s.by, s.bw, s.bh, 10, m);
      paddle(x, s, m);
      lamp(x, s, m);
      K.label(x, s.on ? 'ON' : 'OFF', s.labX, s.labY, 11, 'right');
    });
    K.label(x, 'tap a switch · sweep the bank', w / 2, h - 14, 10);
  }

  function frame(dt) {
    try {
      const gg = K.fit(cv());
      if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) layout();
      step(dt); draw();
    } catch (e) {}
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function rowAt(p) {
    for (let i = 0; i < bank.length; i++) {
      const s = bank[i];
      if (p.y >= s.y - 3 && p.y <= s.y + s.h + 3) return i;   // rows are contiguous: no dead band
    }
    return -1;
  }

  K && window.DECIDER_GAMES.push({
    id: 'switch', name: 'Switches', short: 'Switch', label: 'Switch', noResult: true, button: false,
    body: `<canvas class="toy" id="swCv"></canvas>
      <div class="res" id="swRes" aria-live="polite"><span class="muted">Tap a switch</span></div>`,
    init() {
      L = K.loop(frame); layout();
      const c = cv();
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const i = rowAt(at(e));
        if (i < 0) { drag = null; return; }
        drag = { last: i, seen: {} };
        drag.seen[i] = 1;
        flip(i);                                     // a tap answers on the way down
      });
      c.addEventListener('pointermove', e => {
        if (!drag) return;
        const i = rowAt(at(e));
        if (i < 0 || i === drag.last) return;
        const dir = i > drag.last ? 1 : -1;
        for (let k = drag.last + dir; k !== i + dir; k += dir) {   // fill the jump: nothing is skipped
          if (k >= 0 && k < bank.length && !drag.seen[k]) { drag.seen[k] = 1; flip(k); }
        }
        drag.last = i;
      });
      const up = () => { drag = null; };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      if (cv().clientWidth) L.start();
    },
    enter() { drag = null; layout(); L.start(); },
    leave() { drag = null; L.stop(); }
  });
})();
