/* Bowling — a real lane in perspective: oiled boards, gutters, a ten-pin rack that
 * topples pin-on-pin. Swipe up the lane: how far you swipe is the ball's speed, the bow
 * of your swipe is the hook, and where you start the swipe is your line. Pins are just
 * pins — no labels, no verdict, and the rack resets itself for the next ball. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('bwCv');
  const resEl = () => document.getElementById('bwRes');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- the lane, in metres ---------- */
  const HALF = 0.533;          // lane half-width
  const DECK_Z = 26.0;         // where the deck band starts (visual stretch)
  const PIT_Z = 27.35;         // back of the pin deck
  const HEAD_Z = 26.29;        // head pin
  const GAP = 0.3048;          // pin spacing (12in)
  const ROW = GAP * 0.866;     // row depth
  const BALL_R = 0.108, BALL_M = 6.8;
  const PIN_R = 0.033, PIN_RB = 0.058, PIN_M = 1.55, PIN_H = 0.38, PIN_BELLY = 0.0605;

  let L = null, geo = null, pins = [], ball = null, drag = null, trail = [];
  let phase = 'aim', wait = 0, thrown = 0, since = 0, flashTxt = 0, lastSnd = 0;
  /* ten frames, two balls a frame (three in the tenth), strike and spare
     bonuses, standard scoring */
  let scores = [], fi = 0, bi = 0, best = 0, homeX = 0, dropOff = 0;
  let preStanding = 10, pendingFresh = true, gameOver = false;
  /* two sweeping bars — angle, then power — and they run faster the higher
     the score gets */
  let stage = 'angle', sweep = 0, lockAng = 0, lockPow = .55;
  const sweepSpeed = () => .85 + 1.15 * diff();
  const diff = () => clamp(calcScore() / 180, 0, 1);

  /* a frame is the rolls in it; scoring is the real thing, bonuses included */
  function calcScore() {
    if (!scores.length) return 0;
    const flat = (from) => {
      const out = [];
      for (let i = from; i <= 9; i++) for (const r of (scores[i] || [])) out.push(r);
      return out;
    };
    let total = 0;
    for (let i = 0; i < 9; i++) {
      const fr = scores[i] || [];
      if (!fr.length) break;
      if (fr[0] === 10) {
        const nx = flat(i + 1);
        if (nx.length < 2) return total;
        total += 10 + nx[0] + nx[1];
      } else if (fr.length >= 2) {
        if (fr[0] + fr[1] === 10) {
          const nx = flat(i + 1);
          if (!nx.length) return total;
          total += 10 + nx[0];
        } else total += fr[0] + fr[1];
      } else return total;
    }
    const t = scores[9] || [];
    return total + t.reduce((a, b) => a + b, 0);
  }
  let msg = '';

  /* ---------- camera ----------
     A long lens down the lane: the width converges properly and every object is scaled by
     its depth, while the pin-deck band is stretched on screen so the rack can be read. */
  function makeCam(w, h) {
    /* the lane is measured by the short side of the canvas: a wide, shallow card must
       not blow the pin rack up past the top of the frame */
    const halfNear = Math.min(w * 0.445, h * 0.42);
    const yNear = h * 0.985, yFar = h * 0.185;
    const KV = 0.95, SF = 1 / (1 + KV);
    return {
      w, h, halfNear, yNear, yFar, KV, SF,
      s(u) { return 1 / (1 + KV * u); },
      u(z) {
        /* One smooth depth curve end to end, shaped so the far end keeps enough
           screen to read the rack. It used to be two straight pieces meeting at
           the deck line, where the pixel scale stepped 11× and a ball moving at
           constant speed looked like it bolted for the pins. This curve's slope
           changes continuously, so the change in apparent speed is a ramp. */
        const t = clamp((z + 1.2) / (PIT_Z + 1.2), 0, 1);
        return 1 - Math.pow(1 - t, 0.45);
      },
      p(x, z) {
        const u = this.u(z), s = this.s(u);
        return {
          x: w / 2 + (x / HALF) * halfNear * s,
          y: yFar + (yNear - yFar) * ((s - SF) / (1 - SF)),
          s
        };
      },
      /* screen pixels per metre at this depth */
      k(z) { return halfNear * this.s(this.u(z)) / HALF; }
    };
  }

  /* ---------- rack / ball ---------- */
  function rack() {
    pins = [];
    let n = 1;
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i <= r; i++, n++) {
        pins.push({
          num: n, x: (i - r / 2) * GAP, z: HEAD_Z + r * ROW,
          stand: true, f: 0, ang: 0, vx: 0, vz: 0, flash: 0
        });
      }
    }
  }

  function ballHome() {
    ball = { x: homeX, z: 0.62, vx: 0, vz: 0, hook: 0, rot: 0, spin: 0, live: false, gutter: false, r: BALL_R };
  }

  function layout() {
    const c = cv(); if (!c) return;
    const g = K.fit(c);
    geo = { w: g.w, h: g.h, cam: makeCam(g.w, g.h) };
    if (!pins.length) rack();
    if (!ball) ballHome();
    trail = [];
  }

  /* ---------- the throw ---------- */
  /* signed bow of the swipe: how far the finger's path bulges off its own chord */
  function bowOf(pts) {
    if (!pts || pts.length < 4) return 0;
    const a = pts[0], b = pts[pts.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    let sum = 0, n = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const ox = pts[i].x - a.x, oy = pts[i].y - a.y;
      sum += ox * -uy + oy * ux;
      n++;
    }
    return n ? sum / n : 0;
  }

  function dragParams() {
    const d = drag; if (!d || !geo) return null;
    const up = Math.max(0, d.y0 - d.y);
    const span = Math.hypot(d.x - d.x0, d.y - d.y0);
    const power = clamp(up / (geo.h * 0.52) + span / (geo.h * 1.8), 0.18, 1);
    const startX = clamp((d.x0 - geo.w / 2) / (geo.w * 0.44), -1, 1) * HALF * 0.58;
    /* aim is a nudge, not a slice: a 20px lean moves the ball about four boards */
    const lean = clamp((d.x - d.x0) / (geo.h * 7), -0.055, 0.055) * (1 + 0.45 * diff());
    const bow = bowOf(d.pts);
    const hook = clamp(bow / 52, -1, 1) * (1.2 + power * 1.6) * (1 + 0.5 * diff());
    return { power, startX, lean, hook };
  }

  function throwBall(prm) {
    if (!prm) prm = { power: 0.55, startX: 0, lean: 0, hook: (rnd() - 0.5) * 0.5 };
    ballHome();
    ball.x = clamp(prm.startX, -HALF + BALL_R * 1.15, HALF - BALL_R * 1.15);
    ball.z = 0.55;
    const sp = 6.0 + prm.power * 7.0;
    ball.vz = sp * Math.cos(prm.lean);
    ball.vx = sp * Math.sin(prm.lean) * 0.9;
    ball.hook = prm.hook;
    ball.sp = sp;               /* the speed the throw gave it, held for the lane */
    preStanding = pins.filter((p) => p.stand).length;
    ball.live = true;
    phase = 'roll'; since = 0; thrown++;
    flashTxt = 0;
    trail = [];
    if (resEl()) K.setResult(resEl(), '…');
    try { tone(150, .12, .05, 'triangle', 96); } catch (e) {}
    try { buzz(9); } catch (e) {}
  }

  function bowled() {
    if (phase !== 'aim' || !geo) return;
    const prm = drag ? dragParams() : null;
    drag = null;
    throwBall(prm);
  }

  function resetRack(fresh) {
    if (fresh) rack();
    else pins = pins.filter((p) => p.stand);      /* deadwood stays, fallen stay off */
    /* the ball never waits in the same place twice, and the spread widens as
       the score climbs */
    homeX = (rnd() - .5) * 2 * HALF * (0.30 + 0.58 * diff());
    ballHome();
    phase = 'aim'; wait = 0; since = 0;
    stage = 'angle'; sweep = 0;
    trail = [];
    dropOff = fresh ? 190 : 0;                   /* the basket sets the rack down */
  }

  function newGame() {
    scores = Array.from({ length: 10 }, () => []);
    fi = 0; bi = 0; gameOver = false; pendingFresh = true;
    rack(); resetRack(true);
  }

  function finish() {
    phase = 'done'; wait = 1.6;
    const left = pins.filter((p) => p.stand).length;
    const down = Math.max(0, preStanding - left);
    const fr = scores[fi] || (scores[fi] = []);
    const firstBall = fr.length === 0;
    fr.push(down);

    const frameTotal = fr.reduce((a, b) => a + b, 0);
    const strike = firstBall && down === 10;
    const spare = !strike && fr.length === 2 && frameTotal === 10;
    msg = down === 0 ? 'GUTTER' : strike ? 'STRIKE' : spare ? 'SPARE' : '';
    if (msg) flashTxt = strike ? 2.2 : 1.2;

    /* what comes next: deadwood on the second ball, a fresh rack whenever the
       rack was cleared (a strike, a spare, or the tenth frame's bonus ball) */
    let fresh = false;
    if (fi < 9) {
      if (firstBall && !strike) bi = 1;
      else { fi += 1; bi = 0; fresh = true; }
    } else if (fr.length === 1) {
      bi = 1; fresh = strike;
    } else if (fr.length === 2) {
      const spareNow = fr[0] !== 10 && (fr[0] + fr[1]) === 10;
      const bonus = fr[0] === 10 || spareNow;
      /* a strike or a spare empties the rack, so the bonus ball stands ten up;
         a strike followed by an open ball is played on that deadwood */
      if (bonus) { bi = 2; fresh = fr[1] === 10 || spareNow; }
      else gameOver = true;
    } else gameOver = true;

    if (gameOver) {
      const sc = calcScore();
      if (sc > best) { best = sc; try { store.set('d.bowlgame', best); } catch (e) {} }
      msg = 'GAME ' + sc; flashTxt = 3.2; wait = 3.2;
    }
    pendingFresh = fresh;

    if (resEl()) K.setResult(resEl(), down + ' down · frame ' + (fi + 1) + ' · score ' + calcScore());
    try {
      if (down === 10) tone(660, .22, .07, 'triangle', 990);
      else tone(330 + down * 22, .13, .05, 'triangle', 460);
    } catch (e) {}
    if (down === 10) { try { buzz([14, 34, 20, 34, 26]); } catch (e) {} }
    else if (down >= 7) { try { buzz([10, 50, 10]); } catch (e) {} }
  }

  /* ---------- physics (metres, seconds) ---------- */
  function knock(p, dx, dz, sp) {
    if (!p.stand) return;
    const d = Math.hypot(dx, dz) || 1;
    /* a real rack never falls the same way twice: a little chaos per collision */
    const ang = Math.atan2(dx / d, dz / d) + (rnd() - 0.5) * 0.55;
    p.stand = false; p.f = 0.0001;
    p.ang = ang;
    p.vx = Math.sin(ang) * sp;
    p.vz = Math.cos(ang) * sp;
    p.flash = 1;
    try {
      const now = performance.now();
      if (now - lastSnd > 45) {   // one clack per impact, not ten
        lastSnd = now;
        tone(300 + rnd() * 260, .05, .035, 'triangle', 220);
      }
    } catch (e) {}
  }

  function tick(h) {
    const b = ball;
    /* the ball: it runs down the lane at the speed the throw gave it — the
       hook turns its heading, it never speeds the ball up */
    if (phase === 'roll' && b.live) {
      const bite = clamp((b.z / DECK_Z - 0.40) / 0.50, 0, 1);
      const sp = b.sp || Math.hypot(b.vx, b.vz) || 1;
      const head = Math.atan2(b.vx, b.vz) + (b.hook * bite * bite * h) / sp;
      b.vx = Math.sin(head) * sp;
      b.vz = Math.cos(head) * sp;
      b.x += b.vx * h; b.z += b.vz * h;
      b.rot += b.vz * h * 1.7;
      b.spin += (b.hook * 1.3 + b.vx * 0.45) * h;
      /* the ball drops in the channel once its centre is over the edge */
      if (!b.gutter && Math.abs(b.x) > HALF - BALL_R * 0.78) {
        b.gutter = true;
        b.x = Math.sign(b.x) * (HALF + 0.055);
        b.vx = 0;
        try { tone(110, .16, .05, 'sine', 70); } catch (e) {}
      }
      if (b.gutter) b.x = Math.sign(b.x) * (HALF + 0.055);
      if (b.z > PIT_Z - 0.02) { b.z = PIT_Z - 0.02; b.live = false; }
      if (b.z < 0) b.z = 0;
      trail.push({ x: b.x, z: b.z });
      if (trail.length > 34) trail.shift();
    }

    /* ball against the pins */
    if (b.live && !b.gutter) {
      for (const p of pins) {
        const dx = p.x - b.x, dz = p.z - b.z;
        const rr = BALL_R + PIN_RB, d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-5;
        const nx = dx / d, nz = dz / d;
        const pen = rr - d;
        b.x -= nx * pen * 0.55; b.z -= nz * pen * 0.55;
        const vn = (b.vx - p.vx) * nx + (b.vz - p.vz) * nz;
        if (vn > 0) {
          const j = (1 + 0.30) * vn / (1 / BALL_M + 1 / PIN_M);
          b.vx -= nx * j / BALL_M; b.vz -= nz * j / BALL_M;
          p.vx += nx * j / PIN_M; p.vz += nz * j / PIN_M;
        }
        if (p.stand) knock(p, nx, nz, Math.max(2.4, Math.hypot(p.vx, p.vz)));
        try { buzz(4); } catch (e) {}
      }
    }

    /* pins: slide on the deck, tumble, and stop at its edges */
    for (const p of pins) {
      if (p.stand) continue;
      if (p.f < 1) p.f = Math.min(1, p.f + h / 0.24);
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 0) {
        const k = Math.max(0, sp - 5.6 * h) / sp;
        p.vx *= k; p.vz *= k;
      }
      p.x += p.vx * h; p.z += p.vz * h;
      if (p.z > PIT_Z - 0.12) {
        /* the back cushion throws pins back and sideways: corner pins die that way */
        p.z = PIT_Z - 0.12;
        p.vz = -Math.abs(p.vz) * 0.30;
        p.vx += (p.x < 0 ? -1 : 1) * Math.abs(p.vz) * 0.22 + (rnd() - 0.5) * 0.7;
      }
      if (p.z < DECK_Z - 0.06) { p.z = DECK_Z - 0.06; p.vz = Math.abs(p.vz) * 0.25; }
      if (Math.abs(p.x) > HALF - 0.02) {
        p.x = Math.sign(p.x) * (HALF - 0.02);
        p.vx = -Math.abs(p.vx) * 0.25;
      }
      if (p.flash > 0) p.flash = Math.max(0, p.flash - h * 4.5);
    }

    /* pin on pin: momentum carried, direction kept */
    for (let i = 0; i < pins.length; i++) {
      const a = pins[i];
      for (let j = i + 1; j < pins.length; j++) {
        const c = pins[j];
        if (a.stand && c.stand) continue;
        const dx = c.x - a.x, dz = c.z - a.z;
        const d = Math.hypot(dx, dz) || 1e-5, min = PIN_R * 2.05;
        if (d >= min) continue;
        const nx = dx / d, nz = dz / d, pen = (min - d) / 2;
        a.x -= nx * pen; a.z -= nz * pen;
        c.x += nx * pen; c.z += nz * pen;
        const vn = (c.vx - a.vx) * nx + (c.vz - a.vz) * nz;
        if (vn < 0) {
          const jv = -(1 + 0.34) * vn / 2;
          a.vx -= nx * jv; a.vz -= nz * jv;
          c.vx += nx * jv; c.vz += nz * jv;
        }
        if (a.stand && Math.hypot(c.vx, c.vz) > 0.7) knock(a, -nx, -nz, Math.hypot(c.vx, c.vz) * 0.85);
        if (c.stand && Math.hypot(a.vx, a.vz) > 0.7) knock(c, nx, nz, Math.hypot(a.vx, a.vz) * 0.85);
      }
    }

    /* a toppling pin sweeps its whole body across the deck: that is the cascade */
    for (const p of pins) {
      if (p.stand || p.f <= 0.02 || p.f >= 0.99) continue;
      const e = p.f, sx = Math.sin(p.ang), sz = Math.cos(p.ang);
      for (let t = 0.35; t <= 1.001; t += 0.22) {
        const hx = p.x + sx * PIN_H * e * t;
        const hz = p.z + sz * PIN_H * e * t;
        for (const q of pins) {
          if (q === p || !q.stand) continue;
          if (Math.hypot(q.x - hx, q.z - hz) < 0.155) knock(q, sx, sz, 2.5 + e * 1.8);
        }
      }
    }
  }

  function step(dt) {
    if (dt <= 0) return;
    if (phase === 'roll') {
      since += dt;
      if (since > 6.5) ball.live = false;   // fail-safe: never wedge forever
    }
    const sub = clamp(Math.ceil(dt / 0.0035), 1, 8);
    const h = dt / sub;
    for (let i = 0; i < sub; i++) tick(h);

    if (phase === 'roll' && !ball.live) phase = 'settle';
    if (phase === 'settle') {
      const moving = pins.some((p) => !p.stand && (p.f < 1 || Math.hypot(p.vx, p.vz) > 0.25));
      if (!moving || since > 7.5) finish();
    }
    if (flashTxt > 0) flashTxt = Math.max(0, flashTxt - dt);
  }

  /* ---------- art ---------- */
  function wood(x, m, y0, y1) {
    if (m.flat) return '#f2ecdb';
    const g = x.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#c99a63'); g.addColorStop(.5, '#e0b781'); g.addColorStop(1, '#efd2a8');
    return g;
  }

  function drawBack(x, cam, m) {
    const w = geo.w, yFar = cam.yFar;
    x.save();
    const g = x.createLinearGradient(0, 0, 0, yFar + 6);
    if (m.flat) { g.addColorStop(0, '#e7dfcb'); g.addColorStop(1, '#d8cfb8'); }
    else { g.addColorStop(0, 'rgba(10,5,28,.72)'); g.addColorStop(1, 'rgba(24,14,58,.42)'); }
    x.fillStyle = g; x.fillRect(0, 0, w, yFar + 6);
    /* the cushion the pins come back off */
    x.fillStyle = m.flat ? '#cfc6ad' : 'rgba(255,255,255,.07)';
    x.fillRect(0, yFar - 7, w, 9);
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(255,255,255,.22)';
    x.lineWidth = m.flat ? 1.4 : 1.2;
    x.beginPath(); x.moveTo(0, yFar - 7.5); x.lineTo(w, yFar - 7.5); x.stroke();
    x.restore();
  }

  function drawLane(x, cam, m) {
    const nearL = cam.p(-HALF, -1.2), nearR = cam.p(HALF, -1.2);
    const farL = cam.p(-HALF, PIT_Z), farR = cam.p(HALF, PIT_Z);
    const gutN = cam.p(-HALF - 0.16, -1.2), gutF = cam.p(-HALF - 0.16, PIT_Z);
    const gutR = cam.p(HALF + 0.16, -1.2), gutRF = cam.p(HALF + 0.16, PIT_Z);

    /* gutters, then the lane over their inner edge */
    x.save();
    if (!m.flat) {
      const gg = x.createLinearGradient(0, cam.yFar, 0, cam.yNear);
      gg.addColorStop(0, '#221640'); gg.addColorStop(1, '#3a2565');
      x.fillStyle = gg;
    } else x.fillStyle = '#cfc6ad';
    x.beginPath();
    x.moveTo(gutN.x, gutN.y); x.lineTo(nearL.x, nearL.y);
    x.lineTo(farL.x, farL.y); x.lineTo(gutF.x, gutF.y); x.closePath(); x.fill();
    x.beginPath();
    x.moveTo(gutR.x, gutR.y); x.lineTo(nearR.x, nearR.y);
    x.lineTo(farR.x, farR.y); x.lineTo(gutRF.x, gutRF.y); x.closePath(); x.fill();
    /* the gutter's inner shadow line */
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(0,0,0,.35)';
    x.lineWidth = m.flat ? 1.4 : 2;
    x.beginPath(); x.moveTo(nearL.x, nearL.y); x.lineTo(farL.x, farL.y); x.stroke();
    x.beginPath(); x.moveTo(nearR.x, nearR.y); x.lineTo(farR.x, farR.y); x.stroke();
    x.restore();

    /* the boards */
    x.save();
    x.beginPath();
    x.moveTo(nearL.x, nearL.y); x.lineTo(nearR.x, nearR.y);
    x.lineTo(farR.x, farR.y); x.lineTo(farL.x, farL.y); x.closePath();
    x.fillStyle = wood(x, m, cam.yFar, cam.yNear);
    x.fill();
    x.clip();
    const boards = 39, bw = (HALF * 2) / boards;
    for (let i = 1; i < boards; i++) {
      const bx = -HALF + i * bw;
      const a = cam.p(bx, -1.2), c = cam.p(bx, PIT_Z);
      x.strokeStyle = m.flat ? 'rgba(36,26,58,' + (i % 5 === 0 ? .3 : .16) + ')'
                             : 'rgba(120,74,32,' + (i % 5 === 0 ? .30 : .15) + ')';
      x.lineWidth = i % 5 === 0 ? 1.2 : 0.85;
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(c.x, c.y); x.stroke();
    }
    /* a little grain, a few boards only */
    if (!m.flat) {
      x.strokeStyle = 'rgba(150,96,44,.10)'; x.lineWidth = 0.8;
      for (let i = 0; i < 18; i++) {
        const bx = -HALF + (i * 2.17 % boards) * bw + bw * .4;
        const z0 = (i * 1.7) % 14, z1 = z0 + 2.4 + (i % 3);
        const a = cam.p(bx, z0), c = cam.p(bx + (i % 2 ? .008 : -.008), z1);
        x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(c.x, c.y); x.stroke();
      }
    }
    /* the oil: a long sheen down the middle boards */
    x.save();
    const o0 = cam.p(-HALF * .62, -1.2), o1 = cam.p(HALF * .62, -1.2);
    const o2 = cam.p(HALF * .52, 14.5), o3 = cam.p(-HALF * .52, 14.5);
    const og = x.createLinearGradient(o0.x, 0, o1.x, 0);
    og.addColorStop(0, K.light(0)); og.addColorStop(.32, K.light(m.flat ? .18 : .13));
    og.addColorStop(.55, K.light(m.flat ? .24 : .18)); og.addColorStop(1, K.light(0));
    x.fillStyle = og;
    x.beginPath(); x.moveTo(o0.x, o0.y); x.lineTo(o1.x, o1.y); x.lineTo(o2.x, o2.y); x.lineTo(o3.x, o3.y); x.closePath(); x.fill();
    x.restore();

    /* pin deck: darker stock with the ten spots */
    const dN_L = cam.p(-HALF, DECK_Z), dN_R = cam.p(HALF, DECK_Z);
    x.beginPath();
    x.moveTo(dN_L.x, dN_L.y); x.lineTo(dN_R.x, dN_R.y);
    x.lineTo(farR.x, farR.y); x.lineTo(farL.x, farL.y); x.closePath();
    x.fillStyle = m.flat ? 'rgba(36,26,58,.06)' : 'rgba(90,52,20,.16)';
    x.fill();
    if (m.flat) {
      x.strokeStyle = 'rgba(36,26,58,.30)'; x.lineWidth = 1.2; x.stroke();
    }
    for (const p of pins) {
      const s = cam.p(p.x, p.z), k = cam.k(p.z);
      x.beginPath(); x.ellipse(s.x, s.y, 0.045 * k, 0.045 * k * 0.42, 0, 0, TAU);
      x.fillStyle = m.flat ? 'rgba(36,26,58,.14)' : 'rgba(60,34,12,.22)'; x.fill();
    }

    /* arrows and dots */
    for (let i = 0; i < 7; i++) {
      const bx = (i - 3) * 5 * 0.0273;
      const tip = cam.p(bx, 5.05), back = cam.p(bx, 4.55);
      const wpx = 0.045 * cam.k(4.8);
      x.beginPath();
      x.moveTo(tip.x, tip.y); x.lineTo(back.x - wpx, back.y); x.lineTo(back.x + wpx, back.y);
      x.closePath();
      x.fillStyle = m.flat ? 'rgba(36,26,58,.34)' : 'rgba(96,56,22,.42)';
      x.fill();
    }
    for (let i = 0; i < 7; i++) {
      const bx = (i - 3) * 5 * 0.0273;
      const s = cam.p(bx, 2.1), k = cam.k(2.1);
      x.beginPath(); x.ellipse(s.x, s.y, 0.018 * k, 0.018 * k * 0.6, 0, 0, TAU);
      x.fillStyle = m.flat ? 'rgba(36,26,58,.4)' : 'rgba(96,56,22,.45)'; x.fill();
    }

    /* the foul line */
    const fL = cam.p(-HALF, 0), fR = cam.p(HALF, 0);
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(74,40,14,.55)';
    x.lineWidth = 3; x.beginPath(); x.moveTo(fL.x, fL.y); x.lineTo(fR.x, fR.y); x.stroke();
    x.strokeStyle = m.flat ? 'rgba(36,26,58,.2)' : 'rgba(255,240,214,.35)';
    x.lineWidth = 1.2; x.beginPath(); x.moveTo(fL.x, fL.y + 2.4); x.lineTo(fR.x, fR.y + 2.4); x.stroke();

    x.restore();
  }

  const PROF = [[0, .52], [.08, .78], [.24, 1], [.40, .88], [.56, .58], [.68, .40], [.80, .42], [.90, .62], [1, .56]];
  function profAt(s) {
    for (let i = 1; i < PROF.length; i++) {
      if (s <= PROF[i][0]) {
        const a = PROF[i - 1], b = PROF[i];
        const t = (s - a[0]) / (b[0] - a[0] || 1);
        return lerp(a[1], b[1], t);
      }
    }
    return PROF[PROF.length - 1][1];
  }

  function drawPin(x, cam, m, p) {
    const base = cam.p(p.x, p.z), k = cam.k(p.z);
    if (dropOff) base.y -= dropOff;   /* the basket setting the rack down */
    const e = p.stand ? 0 : (p.f * p.f * (3 - 2 * p.f));
    const H = PIN_H * k;
    const stand = { x: base.x, y: base.y - H };
    const lie = cam.p(p.x + Math.sin(p.ang) * PIN_H, p.z + Math.cos(p.ang) * PIN_H);
    /* the deck band is compressed on screen, so a pin lying away from the camera would
       foreshorten into a blob. Keep its reading length in the direction it fell. */
    const gdx = lie.x - base.x, gdy = lie.y - base.y, gl = Math.hypot(gdx, gdy) || 1;
    const rl = clamp(gl, H * 0.55, H * 0.95);
    const laneL = cam.p(-HALF, p.z).x, laneR = cam.p(HALF, p.z).x;
    const lieV = {
      x: clamp(base.x + (gdx / gl) * rl, laneL + 3, laneR - 3),
      y: Math.max(cam.yFar + 4, base.y + (gdy / gl) * rl)
    };
    const head = {
      x: lerp(stand.x, lieV.x, e),
      y: lerp(stand.y, lieV.y, e) - Math.sin(Math.PI * e) * H * 0.10
    };
    const ax = head.x - base.x, ay = head.y - base.y;
    const len = Math.hypot(ax, ay) || 1;
    const ux = ax / len, uy = ay / len, nx = -uy, ny = ux;
    const wb = PIN_BELLY * k;

    /* shadow on the deck */
    const shx = lerp(base.x, lie.x, e * .5), shy = lerp(base.y, lie.y, e * .5);
    const shl = len * e * .55 + wb * .9;
    x.save();
    x.translate(shx + 1.6, shy + 1.2);
    x.rotate(Math.atan2(uy, ux));
    x.beginPath(); x.ellipse(0, 0, shl, wb * .78, 0, 0, TAU);
    x.fillStyle = m.flat ? 'rgba(36,26,58,.20)' : 'rgba(24,10,2,.38)';
    x.fill();
    x.restore();

    /* body: two profile edges down the axis */
    x.beginPath();
    for (let i = 0; i <= 14; i++) {
      const s = i / 14, w = wb * profAt(s);
      const px = base.x + ux * len * s + nx * w, py = base.y + uy * len * s + ny * w;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    for (let i = 14; i >= 0; i--) {
      const s = i / 14, w = wb * profAt(s);
      x.lineTo(base.x + ux * len * s - nx * w, base.y + uy * len * s - ny * w);
    }
    x.closePath();
    if (m.flat) x.fillStyle = '#fffdf8';
    else {
      const g = x.createLinearGradient(base.x - wb, 0, base.x + wb, 0);
      g.addColorStop(0, '#fffefb'); g.addColorStop(.45, '#f7f2e6');
      g.addColorStop(.82, '#cfc5b4'); g.addColorStop(1, '#a99c8b');
      x.fillStyle = g;
    }
    x.fill();
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(52,32,16,.55)';
    x.lineWidth = m.flat ? 1.3 : 1;
    x.stroke();

    /* the two neck stripes, clipped to the body */
    x.save();
    x.clip();
    x.strokeStyle = '#d8403c';
    for (const s of [0.66, 0.745]) {
      const w = wb * profAt(s) * 1.5;
      const cx = base.x + ux * len * s, cy = base.y + uy * len * s;
      x.lineWidth = Math.max(1.4, wb * 0.20);
      x.beginPath(); x.moveTo(cx - nx * w, cy - ny * w); x.lineTo(cx + nx * w, cy + ny * w); x.stroke();
    }
    x.restore();

    /* the head: a disc looking up at you when it stands, at you when it lies */
    const hr = wb * 0.56;
    x.save();
    x.translate(head.x, head.y);
    x.rotate(Math.atan2(uy, ux) + Math.PI / 2);
    x.beginPath(); x.ellipse(0, 0, hr, hr * lerp(0.34, 0.92, e), 0, 0, TAU);
    const hg = x.createRadialGradient(-hr * .3, -hr * .2, 1, 0, 0, hr);
    if (m.flat) { hg.addColorStop(0, '#fffdf8'); hg.addColorStop(1, '#f0e9d8'); }
    else { hg.addColorStop(0, '#ffffff'); hg.addColorStop(.7, '#f6f0e4'); hg.addColorStop(1, '#c8bda9'); }
    x.fillStyle = hg; x.fill();
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(52,32,16,.5)';
    x.lineWidth = m.flat ? 1.2 : .9; x.stroke();
    x.restore();

    if (p.flash > 0) {
      x.beginPath(); x.arc(head.x, head.y, hr * (1.4 + p.flash), 0, TAU);
      x.strokeStyle = 'rgba(255,226,150,' + (p.flash * .7).toFixed(3) + ')';
      x.lineWidth = 1.6; x.stroke();
    }
  }

  function drawBall(x, cam, m) {
    const b = ball, s = cam.p(b.x, b.z), r = BALL_R * cam.k(b.z);
    /* the sphere sits on the boards, so its centre rides a ball-radius above the contact */
    const cy = s.y - r * .58;
    x.save();
    x.beginPath(); x.ellipse(s.x + r * .10, s.y + r * .10, r * .96, r * .38, 0, 0, TAU);
    x.fillStyle = m.flat ? 'rgba(36,26,58,.2)' : 'rgba(20,8,2,.36)'; x.fill();
    x.restore();

    const g = x.createRadialGradient(s.x - r * .38, cy - r * .44, r * .06, s.x, cy, r * 1.04);
    g.addColorStop(0, '#b8a9ff'); g.addColorStop(.38, '#7053e8'); g.addColorStop(1, '#251a5c');
    x.beginPath(); x.arc(s.x, cy, r, 0, TAU); x.fillStyle = g; x.fill();

    /* finger holes ride the roll */
    const rot = b.rot + b.spin * 0.5;
    for (let i = 0; i < 3; i++) {
      const a = rot + i * TAU / 3;
      const dep = Math.sin(a), hx = Math.cos(a) * r * .44, hy = Math.sin(a) * r * .30;
      const hr = r * .15 * (0.45 + 0.55 * (0.5 + 0.5 * dep));
      x.beginPath(); x.ellipse(s.x + hx, cy + hy, hr, hr * 0.82, a, 0, TAU);
      x.fillStyle = 'rgba(14,8,40,' + (0.5 + 0.35 * (0.5 + 0.5 * dep)).toFixed(2) + ')';
      x.fill();
    }
    /* the sheen stays put: the light does not roll with the ball */
    x.beginPath();
    x.ellipse(s.x - r * .34, cy - r * .42, r * .34, r * .2, -.7, 0, TAU);
    x.fillStyle = K.light(m.flat ? .5 : .62); x.fill();
    x.beginPath(); x.arc(s.x, cy, r, 0, TAU);
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(255,255,255,.24)';
    x.lineWidth = m.flat ? 1.4 : 1.1; x.stroke();
  }

  function drawTrail(x, cam) {
    if (trail.length < 3) return;
    x.save();
    for (let i = 1; i < trail.length; i++) {
      const a = cam.p(trail[i - 1].x, trail[i - 1].z), b = cam.p(trail[i].x, trail[i].z);
      const t = i / trail.length;
      x.strokeStyle = 'rgba(180,160,255,' + (t * .13).toFixed(3) + ')';
      x.lineWidth = 1 + t * 2;
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
    }
    x.restore();
  }

  function miniRack(x, w, m) {
    const rx = w - 30, ry = 22;
    x.save();
    for (const p of pins) {
      const r = p.num <= 1 ? 0 : p.num <= 3 ? 1 : p.num <= 6 ? 2 : 3;
      const i = p.num - (r * (r + 1)) / 2 - 1;
      const gx = rx + (i - r / 2) * 6.4, gy = ry + r * 6.2;
      x.beginPath(); x.arc(gx, gy, 2.1, 0, TAU);
      if (p.stand) { x.fillStyle = m.flat ? '#241a3a' : '#fffdf8'; x.fill(); }
      else { x.strokeStyle = m.flat ? 'rgba(36,26,58,.35)' : 'rgba(255,255,255,.30)'; x.lineWidth = 1; x.stroke(); }
    }
    x.restore();
  }

  function drawHUD(x, m) {
    const down = pins.filter((p) => !p.stand).length;
    K.label(x, 'FR ' + (fi + 1) + '/10 · ' + calcScore() + ' · best ' + best, geo.w - 14, 20, 11, 'right');
    if (phase === 'aim') {
      /* the angle track, across the bottom */
      const w = geo.w, h = geo.h;
      const tw = Math.min(210, w * .54), tx = (w - tw) / 2, ty = h - 26;
      x.save();
      x.fillStyle = m.flat ? 'rgba(36,26,58,.14)' : 'rgba(255,255,255,.16)';
      K.rr(x, tx, ty - 3, tw, 6, 3); x.fill();
      const u = (lockAng / .030 + 1) / 2;
      x.fillStyle = stage === 'angle' ? (m.flat ? '#241a3a' : '#fffdf8') : (m.flat ? 'rgba(36,26,58,.4)' : 'rgba(255,255,255,.45)');
      x.beginPath(); x.arc(tx + tw * u, ty, 6, 0, TAU); x.fill();
      x.restore();
      K.label(x, 'ANGLE', tx, ty - 11, 10, 'left');

      /* the power bar, up the right edge */
      const bw = 10, bh = Math.min(150, h * .40), bx = w - 32, by = h * .46 - bh / 2;
      x.save();
      x.fillStyle = m.flat ? 'rgba(36,26,58,.14)' : 'rgba(255,255,255,.16)';
      K.rr(x, bx, by, bw, bh, bw / 2); x.fill();
      const ph = Math.max(3, bh * clamp((lockPow - .18) / .82, 0, 1));
      const grad = x.createLinearGradient(0, by + bh, 0, by);
      grad.addColorStop(0, '#2fe0c4'); grad.addColorStop(.6, '#ffb347'); grad.addColorStop(1, '#ff5fa2');
      x.fillStyle = grad;
      K.rr(x, bx, by + bh - ph, bw, ph, bw / 2); x.fill();
      x.restore();
      K.label(x, stage === 'power' ? 'POWER' : 'power', bx - 8, by - 9, 10, 'right');
    }
    if (phase === 'roll' || phase === 'settle' || phase === 'done') {
      K.label(x, down + ' DOWN', 14, 20, 11, 'left');
      miniRack(x, geo.w, m);
    }
    if (flashTxt > 0) {
      x.save();
      x.globalAlpha = Math.min(1, flashTxt);
      x.fillStyle = m.flat ? '#241a3a' : '#fffdf8';
      x.font = '800 22px "Bricolage Grotesque",system-ui,sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(msg, geo.w / 2, geo.h * .60);
      x.restore();
    }
  }

  function preview(prm) {
    const cam = geo.cam;
    const out = [];
    if (!prm) return out;
    let px = prm.startX, pz = 0.55;
    const sp = 6.0 + prm.power * 7.0;
    let vx = sp * Math.sin(prm.lean) * 0.9, vz = sp * Math.cos(prm.lean);
    const h = 0.02;
    for (let i = 0; i < 120; i++) {
      const bite = clamp((pz / DECK_Z - 0.40) / 0.50, 0, 1);
      vx += prm.hook * bite * bite * h;
      px += vx * h; pz += vz * h;
      if (i % 2 === 0) out.push(cam.p(px, pz));
      if (pz > DECK_Z + 0.3 || Math.abs(px) > HALF) break;
    }
    return out;
  }

  function draw(g) {
    if (!geo) return;
    const x = g.x, w = g.w, h = g.h;
    const m = K.surf(x, w, h);
    const cam = geo.cam;
    x.save();
    K.rr(x, 0, 0, w, h, m.radius); x.clip();
    drawBack(x, cam, m);
    drawLane(x, cam, m);
    if (phase === 'aim') {
      /* the aim line, drawn live from the bars you are freezing */
      const pts = preview({ power: lockPow, startX: homeX, lean: lockAng, hook: 0 });
      x.save();
      x.setLineDash([3, 6]);
      x.strokeStyle = INK(.55); x.lineWidth = 2;
      x.beginPath();
      pts.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
      x.stroke();
      x.restore();
    }
    drawTrail(x, cam);
    /* depth order: far pins first, then the ball where it actually is */
    const objs = pins.map((p) => ({ z: p.z, p })).concat([{ z: ball.z, b: ball }]);
    objs.sort((a, b) => b.z - a.z);
    for (const o of objs) {
      if (o.p) drawPin(x, cam, m, o.p);
      else drawBall(x, cam, m);
    }
    drawHUD(x, m);
    x.restore();
  }

  /* ---------- loop ---------- */
  function frame(dt) {
    try {
      const c = cv(); if (!c) return;
      const g = K.fit(c);
      if (!geo || Math.abs(geo.w - g.w) > .5 || Math.abs(geo.h - g.h) > .5) layout();
      const sdt = Math.min(.05, dt / 60);
      if (phase === 'done') { wait -= sdt; if (wait <= 0) { if (gameOver) newGame(); else resetRack(pendingFresh); } }
      if (phase === 'aim') {
        /* a bar that sweeps end to end and back: tap to freeze it */
        sweep += sdt * sweepSpeed();
        const u = 1 - Math.abs((sweep % 2) - 1);        /* 0 → 1 → 0 */
        if (stage === 'angle') lockAng = (u * 2 - 1) * .030;
        else lockPow = .20 + .80 * u;
      }
      if (dropOff > 0) dropOff = Math.max(0, dropOff - (540 + 1040 * diff()) * sdt);
      step(sdt);
      draw(g);
    } catch (e) {}
  }

  const at = (e) => {
    const r = cv().getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  K && window.DECIDER_GAMES.push({
    id: 'bowling', name: 'Bowling', short: 'Bowling', label: 'Lane', noResult: true, button: false,
    body: '<canvas class="toy" id="bwCv"></canvas>' +
      '<div class="res" id="bwRes" aria-live="polite"><span class="muted">Tap to set the angle, tap to set the power</span></div>',
    init() {
      layout();
      try { best = +store.get('d.bowlgame', 0) || 0; } catch (e) {}
      newGame();
      L = K.loop(frame);
      const c = cv();
      c.addEventListener('pointerdown', (e) => {
        /* a touch during the wait for the rack re-racks it now — never a dead zone */
        if (phase === 'done') { if (gameOver) newGame(); else resetRack(pendingFresh); return; }
        if (phase !== 'aim' || !geo) { try { K.press(300); } catch (err) {} return; }
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        if (stage === 'angle') {
          /* the angle is chosen: now the power bar starts sweeping */
          stage = 'power'; sweep = 0;
          try { K.press(360); } catch (err) {}
          if (resEl()) K.setResult(resEl(), 'Power — tap again to throw');
        } else {
          const lean = lockAng, power = lockPow;
          stage = 'angle'; sweep = 0;
          throwBall({ power, startX: homeX, lean, hook: 0 });
        }
      });
      if (c.clientWidth) L.start();
    },
    enter() { layout(); L.start(); },
    leave() { drag = null; L.stop(); },
    action() {
      if (phase === 'aim') {
        stage = 'angle'; sweep = 0;
        throwBall({ power: lockPow, startX: homeX, lean: lockAng, hook: 0 });
      }
    },
    status() {
      return {
        phase, thrown, frame: fi + 1, ballInFrame: bi + 1, score: calcScore(),
        pow: +lockPow.toFixed(2), ang: +lockAng.toFixed(3),
        rolls: scores.map((f) => f.slice()), gameOver,
        down: pins.filter((p) => p.stand).length === 0 ? pins.length : pins.filter((p) => !p.stand).length,
        standing: pins.filter((p) => p.stand).map((p) => p.num),
        rack: pins.length,
        ball: ball ? { x: +ball.x.toFixed(3), z: +ball.z.toFixed(3), live: ball.live, gutter: ball.gutter } : null
      };
    }
  });
})();
