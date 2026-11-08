/* Basketball — three flicks at the hoop. Flick up from anywhere; the release
 * angle and power are the shot. Glass backboard, a rim that rattles, a net
 * that swishes, spin and a trail on the ball, and a scoreboard of makes and
 * attempts. No goal, no labels. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const cv = () => document.getElementById('bbCv');
  const res = () => document.getElementById('bbRes');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  let L = null, geo = null, ball = null, drag = null, trail = [], parts = [], splash = null;
  let score = 0, best = 0, shots = 0, phase = 'aim', pause = 0, frameErr = null;
  let hoopX = 0, hoopA = 0, hoopT = 0;          /* where the rim is now, and how far it swings */
  let netT = 0, netPh = 0, rimE = 0, rimPh = 0, spin = 0, air = 0, restT = 0;
  let bob = 0, power = 0;

  function layout() {
    const c = cv(); if (!c) return;
    const g = K.fit(c);
    const rimW = Math.min(g.w * .135, 50), rimY = g.h * .42;
    const r = Math.max(10, Math.min(15, g.w * .039));
    const bw = rimW * 2 + 40, bh = 72;
    geo = {
      w: g.w, h: g.h, cx: g.w / 2, rimY, rimW, r,
      floorY: g.h * .865,
      board: { x: g.w / 2 - bw / 2, y: Math.max(46, rimY - 18 - bh), w: bw, h: bh }
    };
    resetBall();
  }

  function resetBall() {
    /* the ball never waits in the same spot twice, and the spread widens as
       the score climbs */
    const spread = geo.w * (0.10 + Math.min(0.22, score * 0.012));
    const restX = clamp(geo.cx + (Math.random() * 2 - 1) * spread, geo.r * 2, geo.w - geo.r * 2);
    ball = { x: restX, y: geo.floorY - geo.r, vx: 0, vy: 0, scored: false, r: geo.r };
    trail = []; spin = 0; air = 0; restT = 0; phase = 'aim'; drag = null;
  }

  function startRound() {
    score = 0; shots = 0;
    parts = []; splash = null; hoopT = 0;
    resetBall();
    K.setResult(res(), 'Score 0 · best ' + best);
  }

  function shoot(dx, dy) {
    if (!geo) return;
    if (phase === 'done') startRound();
    if (phase !== 'aim') return;
    /* the flick *is* the shot: direction from the drag, power from its length.
       The upward speed used to be clamped to [-13.8, -6.0], which made every
       drag under 44px the same shot and every drag past 102px the same shot;
       it now runs the whole way from a lazy lob to a hard line. */
    power = clamp(Math.hypot(dx, dy) / 170, 0, 1);
    ball.vx = clamp(dx * .038, -8, 8);
    ball.vy = -5.5 - power * 9.5;
    ball.scored = false;
    phase = 'fly'; trail = []; air = 0; restT = 0;
    spin = ball.vx * .06;
    K.setResult(res(), 'Score ' + score + ' · best ' + best);
    sfx(300 + power * 260, .09, .035, 'sine', 520 + power * 300);
    hap(8);
  }

  function endShot() {
    if (phase !== 'fly') return;
    shots++;
    let line;
    if (ball.scored) {
      score++;
      if (score > best) { best = score; try { store.set('d.bbbest', best); } catch (e) {} }
      line = 'Score ' + score + ' · best ' + best;
    } else if (score > 0) {
      /* a miss ends the run, the best stands, and the next ball comes straight away */
      line = 'Run over — ' + score + ' in a row · best ' + best;
      score = 0;
    } else {
      line = 'Score 0 · best ' + best;
    }
    phase = 'pause'; pause = 9;
    K.setResult(res(), line);
  }

  function finish() {
    /* the line comes from the shot that just ended — a run-over message must
       not be wiped by serving the next ball */
    resetBall();
  }

  function rattle(power) {
    rimE = Math.min(1.4, rimE + .5 + power * .8);
    rimPh = 0;
    /* clang: a metal body plus a short bright partial, not the swish */
    sfx(196 + Math.random() * 30, .19, .05, 'square', 150);
    sfx(520 + Math.random() * 90, .10, .022, 'square', 470);
    hap(10);
  }

  function swish() {
    /* the net: air, not metal */
    sfx(1500, .10, .026, 'sine', 620);
    sfx(2300, .09, .018, 'sine', 1100);
    sfx(150, .12, .03, 'sine', 90);
    hap([12, 20, 12]);
  }

  function splashAt(kind) {
    splash = { x: hoopX, y: geo.rimY, t: 0, kind };
    const n = kind === 'make' ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 2.4;
      const sp = 1.6 + Math.random() * 2.6;
      parts.push({ x: hoopX + (Math.random() - .5) * geo.rimW, y: geo.rimY,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .8,
        life: 1, r: 1.4 + Math.random() * 2.2, c: kind });
    }
  }

  /* ---------- physics ---------- */
  /* the basket starts sliding once you have five, and keeps getting quicker */
  function hoopStep(dt) {
    if (!geo) return;
    if (score < 5) { hoopA += (0 - hoopA) * .06 * dt; hoopX = geo.cx + Math.sin(0) * hoopA; return; }
    const speed = Math.min(2.4, 0.85 + (score - 5) * 0.16);
    /* it starts with a small slide at five and works up to the full sweep */
    const swingMax = Math.min(geo.w * 0.30, geo.rimW * 2.6);
    const swing = swingMax * Math.min(1, 0.35 + (score - 5) * 0.055);
    hoopA += (swing - hoopA) * .04 * dt;
    hoopT = (hoopT || 0) + speed * 0.0125 * dt;
    hoopX = geo.cx + Math.sin(hoopT) * hoopA;
  }

  function physics(dt) {
    const b = ball, h = geo.h;
    const n = Math.max(1, Math.ceil(dt)), step = dt / n;
    let crossed = false;
    for (let k = 0; k < n; k++) {
      const py = b.y;
      b.vy += .34 * step; b.vx *= Math.pow(.999, step);
      b.x += b.vx * step; b.y += b.vy * step; air += step;
      spin += b.vx * .022 * step;
      /* the crossing is tested per sub-step: at a slow frame rate the ball
         can move further than the rim's thickness in one tick */
      if (!b.scored && b.vy > 0 && py < geo.rimY - .5 && b.y >= geo.rimY &&
          Math.abs(b.x - hoopX) < geo.rimW - b.r - 2.5) {
        b.scored = true; crossed = true;
      }
    }
    trail.push({ x: b.x, y: b.y }); if (trail.length > 16) trail.shift();

    /* the rim is two posts, not a funnel: it kicks the ball away. A ball
       still climbing passes the rim mouth cleanly — only a dropping ball
       can catch iron. A ball that is already through does not touch them. */
    [-1, 1].forEach(s => {
      if (b.scored || b.vy < -1.2) return;
      const px = hoopX + s * geo.rimW + Math.sin(rimPh) * rimE * 2.4;
      const dx = b.x - px, dy = b.y - geo.rimY, d = Math.hypot(dx, dy) || .001;
      if (d < b.r + 2.6) {
        const nx = dx / d, ny = dy / d;
        b.x += nx * (b.r + 2.6 - d); b.y += ny * (b.r + 2.6 - d);
        const vn = b.vx * nx + b.vy * ny;
        b.vx -= 2 * vn * nx * .58; b.vy -= 2 * vn * ny * .58;
        b.vx *= .92; b.vy *= .96;
        if (Math.abs(b.vx) < 1.2) b.vx += (b.x < hoopX ? -1 : 1) * 1.3;
        if (Math.abs(b.vy) < 1.2) b.vy -= 1.1;
        rattle(Math.min(1, Math.hypot(b.vx, b.vy) / 9));
        netT = Math.max(netT, .5); netPh = 0;
      }
    });

    if (crossed) {
      /* through the hoop: it slides down the netting instead of carrying on
         across the rim, so it visibly drops out of the bottom */
      b.vx *= .18;
      if (b.vy < 3) b.vy = 3;
      netT = 1.15; netPh = 0;
      splashAt('make'); swish();
      K.setResult(res(), score + 1 >= 5 ? 'Swish · ' + (score + 1) + ' in a row' : 'Swish');
    }

    /* never let it perch on the rim: nudge anything that hangs there */
    const near = Math.abs(b.x - hoopX) < geo.rimW + b.r + 6 && Math.abs(b.y - geo.rimY) < b.r + 12;
    if (near && Math.hypot(b.vx, b.vy) < 1.5) restT += dt; else restT = 0;
    if (restT > 11) {
      b.vx += (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 1.6);
      b.vy -= 1.2 + Math.random();
      restT = 0; rattle(.4);
    }

    /* a make is done the moment it is clear of the net — no waiting for it to
       finish falling so the next ball comes quicker */
    if (b.scored && b.y > geo.rimY + 78) { endShot(); return; }
    if (b.y > h + 44 || air > 190) {
      if (!b.scored) { splashAt('miss'); sfx(150, .12, .03, 'triangle', 110); }
      endShot();
    }
  }

  /* ---------- art ---------- */
  function drawBoard(x, flat) {
    const b = geo.board;
    /* the board, the target square and the rim arms are one assembly: shift it
       with the rim instead of leaving a backboard behind in the middle */
    x.save(); x.translate(hoopX - geo.cx, 0);
    if (!flat) {
      x.save(); x.shadowColor = 'rgba(4,0,18,.5)'; x.shadowBlur = 22; x.shadowOffsetY = 12;
      K.rr(x, b.x, b.y, b.w, b.h, 10); x.fillStyle = '#1a1038'; x.fill(); x.restore();
    } else {
      K.rr(x, b.x + 5, b.y + 6, b.w, b.h, 8); x.fillStyle = 'rgba(36,26,58,.16)'; x.fill();
    }
    K.panel(x, b.x, b.y, b.w, b.h, {
      r: 9,
      face: flat ? '#eef4ff' : 'rgba(198,220,255,.16)',
      face2: flat ? '#e8efff' : 'rgba(150,180,255,.07)',
      rim: flat ? null : 'rgba(255,255,255,.42)'
    });
    if (flat) {
      K.rr(x, b.x, b.y, b.w, b.h, 9);
      x.strokeStyle = '#241a3a'; x.lineWidth = 1.8; x.stroke();
    }
    /* glass: two long reflections, so the board reads as a pane */
    x.save(); K.rr(x, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 8); x.clip();
    x.fillStyle = flat ? 'rgba(255,255,255,.72)' : 'rgba(255,255,255,.10)';
    x.beginPath(); x.moveTo(b.x + b.w * .13, b.y + b.h); x.lineTo(b.x + b.w * .37, b.y);
    x.lineTo(b.x + b.w * .53, b.y); x.lineTo(b.x + b.w * .29, b.y + b.h); x.closePath(); x.fill();
    x.fillStyle = flat ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.06)';
    x.beginPath(); x.moveTo(b.x + b.w * .59, b.y + b.h); x.lineTo(b.x + b.w * .75, b.y);
    x.lineTo(b.x + b.w * .82, b.y); x.lineTo(b.x + b.w * .66, b.y + b.h); x.closePath(); x.fill();
    /* a bright edge along the top of the pane */
    x.strokeStyle = flat ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.2)';
    x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(b.x + 8, b.y + 2.4); x.lineTo(b.x + b.w - 8, b.y + 2.4); x.stroke();
    x.restore();

    /* the target square the shooter aims at */
    const tw = geo.rimW * 1.16, th = 28;
    K.rr(x, geo.cx - tw / 2, geo.rimY - th - 28, tw, th, 3);
    x.strokeStyle = flat ? 'rgba(36,26,58,.7)' : 'rgba(255,255,255,.5)';
    x.lineWidth = flat ? 1.8 : 1.6; x.stroke();
    /* the arms that carry the rim off the board */
    [-1, 1].forEach(s => {
      x.beginPath();
      x.moveTo(geo.cx + s * geo.rimW * .62, geo.rimY - 14);
      x.lineTo(geo.cx + s * geo.rimW * .96, geo.rimY - 2);
      x.strokeStyle = flat ? '#241a3a' : 'rgba(230,235,255,.55)';
      x.lineWidth = 3.4; x.stroke();
    });
    x.restore();
  }

  function drawNet(x, flat) {
    const t = netT, sway = Math.sin(netPh * 1.6) * t * 5;
    const len = geo.rimW * .82 + t * 8, botR = geo.rimW * (.46 + t * .16);
    const bulge = t * 12;
    const N = 9;
    x.save();
    x.lineCap = 'round';
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const topX = hoopX - geo.rimW + 2 * geo.rimW * u;
      const topY = geo.rimY + Math.sin(Math.PI * u) * 6;
      const botX = hoopX + (topX - hoopX) * (botR / geo.rimW);
      const cpX = (topX + botX) / 2 + sway * .4;
      const cpY = geo.rimY + len * .55 + bulge * .35;
      x.beginPath(); x.moveTo(topX, topY);
      x.quadraticCurveTo(cpX, cpY, botX + sway, geo.rimY + len + bulge);
      x.strokeStyle = flat ? 'rgba(36,26,58,' + (.42 + t * .3) + ')' : 'rgba(255,255,255,' + (.5 + t * .3) + ')';
      x.lineWidth = 1.3; x.stroke();
    }
    for (let k = 1; k <= 3; k++) {
      const s = k / 3, wid = geo.rimW + (botR - geo.rimW) * s;
      const yy = geo.rimY + len * s + bulge * s * s;
      x.beginPath(); x.ellipse(hoopX + sway * s, yy, wid * .98, 5 + s * 2, 0, 0, Math.PI);
      x.strokeStyle = flat ? 'rgba(36,26,58,.34)' : 'rgba(255,255,255,.4)';
      x.lineWidth = 1.2; x.stroke();
    }
    x.restore();
  }

  function drawRim(x, flat, front) {
    const wob = Math.sin(rimPh) * rimE * 2.4;
    x.save(); x.lineCap = 'round';
    x.beginPath();
    if (front) x.ellipse(hoopX + wob, geo.rimY, geo.rimW, 7.5, 0, 0, Math.PI);
    else x.ellipse(hoopX + wob, geo.rimY, geo.rimW, 7.5, 0, Math.PI, TAU);
    x.strokeStyle = flat ? '#e2622b' : '#ff6a3d'; x.lineWidth = 5.4; x.stroke();
    x.strokeStyle = flat ? 'rgba(36,26,58,.55)' : 'rgba(90,20,0,.45)'; x.lineWidth = 1.4; x.stroke();
    x.strokeStyle = K.light(flat ? .35 : .45); x.lineWidth = 1.4;
    x.beginPath();
    if (front) x.ellipse(hoopX + wob, geo.rimY - 1.2, geo.rimW, 6.4, 0, .2, Math.PI - .2);
    else x.ellipse(hoopX + wob, geo.rimY - 1.2, geo.rimW, 6.4, 0, Math.PI + .2, TAU - .2);
    x.stroke();
    x.restore();
  }

  function drawBall(x, flat) {
    const b = ball;
    /* shadow on the court, softer the higher the ball is */
    const hgt = clamp((geo.floorY - b.y) / 300, 0, 1);
    x.beginPath(); x.ellipse(b.x + 4, geo.floorY + 2, b.r * (1.15 - hgt * .45), (b.r * .38) * (1 - hgt * .5), 0, 0, TAU);
    x.fillStyle = 'rgba(10,4,26,' + (flat ? .12 : .34) * (1 - hgt * .7) + ')'; x.fill();

    /* the trail it leaves: one tapering streak, brightest at the ball */
    if (trail.length > 1) {
      x.save(); x.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        x.beginPath();
        x.moveTo(trail[i - 1].x, trail[i - 1].y);
        x.lineTo(trail[i].x, trail[i].y);
        x.strokeStyle = 'rgba(255,178,120,' + (a * a * (flat ? .14 : .26)) + ')';
        x.lineWidth = b.r * (.14 + a * .62);
        x.stroke();
      }
      x.restore();
    }

    x.save();
    x.translate(b.x, b.y); x.rotate(spin);
    x.beginPath(); x.arc(0, 0, b.r, 0, TAU);
    const grd = x.createRadialGradient(-b.r * .34, -b.r * .36, 1, 0, 0, b.r * 1.12);
    grd.addColorStop(0, '#ffc38f'); grd.addColorStop(.55, '#f07a35'); grd.addColorStop(1, '#c4471c');
    x.fillStyle = grd; x.fill();
    x.save(); x.beginPath(); x.arc(0, 0, b.r - .4, 0, TAU); x.clip();
    x.strokeStyle = 'rgba(72,24,6,.6)'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(-b.r, 0); x.lineTo(b.r, 0); x.stroke();
    x.beginPath(); x.moveTo(0, -b.r); x.lineTo(0, b.r); x.stroke();
    x.beginPath(); x.arc(-b.r * 1.05, 0, b.r * 1.15, -.95, .95); x.stroke();
    x.beginPath(); x.arc(b.r * 1.05, 0, b.r * 1.15, Math.PI - .95, Math.PI + .95); x.stroke();
    x.restore();
    x.beginPath(); x.arc(0, 0, b.r, 0, TAU);
    x.strokeStyle = flat ? '#241a3a' : 'rgba(255,255,255,.3)'; x.lineWidth = flat ? 1.4 : 1.1; x.stroke();
    x.restore();

    /* the light doesn't spin with the ball */
    x.beginPath(); x.ellipse(b.x - b.r * .34, b.y - b.r * .40, b.r * .30, b.r * .19, -.6, 0, TAU);
    x.fillStyle = K.light(.5); x.fill();
  }

  function drawPill(x, flat) {
    const w = 96, h = 31, X = 12, Y = 9;
    K.rr(x, X, Y, w, h, 9);
    x.fillStyle = flat ? '#fffdf8' : 'rgba(255,253,248,.95)'; x.fill();
    x.strokeStyle = flat ? '#241a3a' : 'rgba(36,26,58,.35)'; x.lineWidth = 1.3; x.stroke();
    x.fillStyle = 'rgba(36,26,58,.62)';
    x.font = '800 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText('SCORE', X + 11, Y + 10);
    x.fillStyle = '#241a55';
    x.font = '800 14px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillText(score + (best > score ? '  ·  best ' + best : ''), X + 11, Y + 22);
  }

  function drawSplash(x) {
    if (!splash) return;
    const s = splash, e = Math.min(1, s.t), col = s.kind === 'make' ? '90,240,150' : '255,150,120';
    x.save();
    x.beginPath(); x.arc(s.x, s.y, 8 + e * 42, 0, TAU);
    x.strokeStyle = 'rgba(' + col + ',' + (1 - e) * .85 + ')'; x.lineWidth = (1 - e) * 5 + 1; x.stroke();
    x.beginPath(); x.arc(s.x, s.y, 4 + e * 26, 0, TAU);
    x.strokeStyle = 'rgba(' + col + ',' + (1 - e) * .5 + ')'; x.lineWidth = 2; x.stroke();
    x.restore();
  }

  function drawParticles(x) {
    parts.forEach(p => {
      x.beginPath(); x.arc(p.x, p.y, p.r * p.life, 0, TAU);
      x.fillStyle = p.c === 'make' ? 'rgba(140,245,175,' + p.life + ')' : 'rgba(255,150,120,' + (p.life * .8) + ')';
      x.fill();
    });
  }

  function drawAim(x, w, h, flat) {
    if (phase !== 'aim' || drag) return;
    const lift = Math.sin(bob) * 5;
    const ang = Math.atan2(geo.rimY - ball.y, hoopX - ball.x);
    const x0 = ball.x + Math.cos(ang) * (ball.r + 7), y0 = ball.y + Math.sin(ang) * (ball.r + 7);
    const len = 26 + lift;
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    x.save();
    x.setLineDash([3, 6]);
    x.strokeStyle = flat ? 'rgba(36,26,58,.35)' : 'rgba(255,255,255,.32)';
    x.lineWidth = 1.6; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.setLineDash([]);
    x.beginPath();
    x.moveTo(x1 + Math.cos(ang) * 9, y1 + Math.sin(ang) * 9);
    x.lineTo(x1 + Math.cos(ang + 2.5) * 9, y1 + Math.sin(ang + 2.5) * 9);
    x.lineTo(x1 + Math.cos(ang - 2.5) * 9, y1 + Math.sin(ang - 2.5) * 9);
    x.closePath();
    x.fillStyle = flat ? 'rgba(36,26,58,.55)' : 'rgba(255,255,255,.55)';
    x.fill();
    x.restore();
  }

  function drawDrag(x, flat) {
    if (!drag) return;
    const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
    if (dy > -12) return;
    const p = clamp(Math.hypot(dx, dy) / 170, 0, 1);
    const len = 26 + p * 44;
    const ang = Math.atan2(dy, dx);
    x.save(); x.translate(ball.x, ball.y); x.rotate(ang);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(len, 0);
    x.strokeStyle = flat ? 'rgba(36,26,58,.7)' : 'rgba(255,255,255,.8)';
    x.lineWidth = 2.4; x.setLineDash([4, 5]); x.stroke(); x.setLineDash([]);
    x.beginPath(); x.moveTo(len, 0); x.lineTo(len - 8, -5); x.lineTo(len - 8, 5); x.closePath();
    x.fillStyle = flat ? '#241a3a' : '#fff'; x.fill();
    x.restore();
    if (p > .93) K.label(x, 'full', ball.x, ball.y + ball.r + 16, 10);
  }

  function frame(dt) {
    try {
      const g = K.fit(cv());
      if (!geo || Math.abs(geo.w - g.w) > .5 || Math.abs(geo.h - g.h) > .5) layout();
      if (!geo) return;
      const x = g.x, w = g.w, h = g.h;
      K.surf(x, w, h);
      const m = K.mat(), flat = m.flat;

      /* the court: a warm floor with a line, so the hoop has a room */
      const fy = geo.floorY;
      const fl = x.createLinearGradient(0, fy - 10, 0, h);
      fl.addColorStop(0, flat ? 'rgba(36,26,58,.06)' : 'rgba(255,160,90,.10)');
      fl.addColorStop(1, flat ? 'rgba(36,26,58,.02)' : 'rgba(255,160,90,.01)');
      x.fillStyle = fl; x.fillRect(0, fy - 10, w, h - fy + 10);
      x.beginPath(); x.moveTo(0, fy - 10); x.lineTo(w, fy - 10);
      x.strokeStyle = flat ? 'rgba(36,26,58,.45)' : 'rgba(255,255,255,.22)';
      x.lineWidth = 1.4; x.stroke();

      bob += dt * .07;
      if (netT > 0) { netT = Math.max(0, netT - dt * .022); netPh += dt * .32; }
      else netPh = 0;
      if (rimE > 0) { rimE = Math.max(0, rimE - dt * .03); rimPh += dt * .55; }
      hoopStep(dt);
      if (phase === 'fly') physics(dt);
      if (phase === 'pause') { pause -= dt; if (pause <= 0) finish(); }

      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .12 * dt; p.life -= .028 * dt; });
      parts = parts.filter(p => p.life > 0);
      if (splash) { splash.t += dt * .035; if (splash.t >= 1) splash = null; }

      drawBoard(x, flat);
      drawRim(x, flat, false);
      drawAim(x, w, h, flat);
      drawPill(x, flat);
      drawBall(x, flat);
      drawNet(x, flat);
      drawRim(x, flat, true);
      drawSplash(x);
      drawParticles(x);
      drawDrag(x, flat);

      
    } catch (e) { if (!frameErr) { frameErr = e; console.error('basketball frame:', e); } }
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  K && window.DECIDER_GAMES.push({
    id: 'basketball', name: 'Basketball', short: 'Hoops', label: 'Shots', noResult: true, button: false,
    body: `<canvas class="toy" id="bbCv"></canvas>
      <div class="res" id="bbRes" aria-live="polite"></div>`,
    init() {
      L = K.loop(frame);
      layout();
      try { best = +store.get('d.bbbest', 0) || 0; } catch (e) {}
      K.setResult(res(), 'Score 0 · best ' + best);
      const c = cv();
      c.addEventListener('pointerdown', (e) => {
        if (!geo || phase === 'fly' || phase === 'pause') return;
        if (phase === 'done') { startRound(); return; }
        const p = at(e);
        drag = { x: p.x, y: p.y, x0: p.x, y0: p.y };
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
      });
      c.addEventListener('pointermove', (e) => { if (!drag) return; const p = at(e); drag.x = p.x; drag.y = p.y; });
      const up = () => {
        if (!drag) return;
        const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
        drag = null;
        if (dy > -14) return;             /* a tap is not a shot */
        shoot(dx, dy);
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', () => { drag = null; });
      if (cv().clientWidth) L.start();
    },
    enter() { layout(); L.start(); },
    leave() { drag = null; L.stop(); },
    status() {
      return { phase, score, best, shots,
        hoopX: +hoopX.toFixed(1), hoopHome: geo ? +geo.cx.toFixed(1) : null,
        hoopSwing: +hoopA.toFixed(1),
        ballX: ball ? +ball.x.toFixed(1) : null,
        ballY: ball ? +ball.y.toFixed(1) : null, floorY: geo ? +geo.floorY.toFixed(1) : null,
        frameErr: frameErr ? String(frameErr && frameErr.message) : null };
    },
    action() { shoot((Math.random() - .5) * 70, -100 - Math.random() * 50); }
  });
})();
