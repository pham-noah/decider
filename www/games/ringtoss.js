/* Ring Toss — a lit floor, five posts, and a ring that has to come down on one.
 * One true perspective camera: posts are cylinders on a ground plane, the ring is a
 * circle in the air, so it shrinks as it travels and flattens onto the posts as it
 * lands. Flick up: where you let go is the line, how hard you swipe is the arc. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('rtCv');
  const resEl = () => document.getElementById('rtRes');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* world: X right, Y up from the floor, Z away from the eye */
  const GAP = 1.16, PEG_H = 1.7, PEG_R = 0.13, ROW = GAP * 2;
  const Z_PEG = 10, Z0 = 4.25, Y0 = 0.95, RING_R = 0.32, CATCH = 0.25, G = 10.5;

  let L = null, geo = null, pegs = [], ring = null, drag = null;
  let state = 'ready', wait = 0, rings = 3, thrown = 0, score = 0, streak = 0, best = 0, over = false;
  let pending = null, t0 = 0, resTxt = '', trail = [];
  let sparks = [], floats = [], shake = 0, drift = 0, driftT = 0;

  /* ---------- camera ---------- */
  function makeCam(w, h) {
    const f = h * 1.5, phi = 11 * Math.PI / 180;
    const cs = Math.cos(phi), sn = Math.sin(phi), hc = 3.0;
    const cx = w / 2, cy = h * 0.5;
    return {
      w, h, f, hc, cs, sn, cx, cy,
      p(X, Y, Z) {
        const yc = cs * (Y - hc) + sn * Z, zc = cs * Z - sn * (Y - hc);
        return { x: cx + f * X / zc, y: cy - f * yc / zc, s: f / zc, zc: zc };
      },
      /* how flat a horizontal circle looks at this height and depth */
      sq(Y, Z) {
        const zc = cs * Z - sn * (Y - hc);
        return Math.abs(Y - hc) / Math.max(0.6, zc);
      },
      horizon: cy - f * Math.tan(phi)
    };
  }

  /* ---------- layout ---------- */
  function layout() {
    const c = cv(); if (!c) return;
    const w = c.clientWidth || 300, h = c.clientHeight || 300;
    const cm = makeCam(w, h);
    geo = { w, h, cam: cm };
    pegs = [];
    for (let i = 0; i < 5; i++) {
      const px = (i - 2) * GAP;
      pegs.push({ x: px, bx: px, l: String(i + 1), c: PAL[i % PAL.length], hit: false, flash: 0,
        b: cm.p(px, 0, Z_PEG), t: cm.p(px, PEG_H, Z_PEG) });
    }
    if (!ring || state === 'ready') resetRing();
  }

  function resetRing() {
    ring = { x: 0, y: Y0, z: Z0, x0: 0, y0: Y0, z0: Z0, x1: 0, z1: Z_PEG, t: 0, T: .8,
      apex: 1, tilt: 0, spin: 0, vy: 0, vz: 0, on: null };
  }

  /* A rung hands the ring back, so the run ends when you stop hitting — the
     game is the streak, not three throws. */
  function startGame() {
    rings = 3; thrown = 0; score = 0; streak = 0; over = false;
    drift = 0; driftT = 0; sparks = []; floats = []; shake = 0;
    pegs.forEach((p) => { p.hit = false; p.flash = 0; });
    state = 'ready'; wait = 0; resetRing();
    say('');
  }

  function say(t) {
    if (t === resTxt) return;
    resTxt = t;
    const el = resEl(); if (el) K.setResult(el, t);
  }

  /* ---------- throw ---------- */
  /* where the throw comes down: one screen pixel is one pixel on the post plane, so
     putting your finger on a post aims at that post. A sideways flick bends it. */
  function aimX(px, dx) {
    const cam = geo.cam, s = cam.p(0, PEG_H, Z_PEG).s || 1;
    const x = (px - cam.cx) / s + (dx || 0) * 0.0015;
    return clamp(x, -ROW * 1.5, ROW * 1.5);
  }

  function toss(px, power, dx) {
    if (!geo) return;
    if (over) { startGame(); return; }
    if (state !== 'ready') { pending = { px, power, dx }; return; }
    /* identical flicks must not give identical landings */
    const x1 = clamp(aimX(px, dx) + (rnd() - .5) * .13, -ROW * 1.5, ROW * 1.5);
    const pw = clamp(power, .2, 1);
    ring.x0 = 0; ring.y0 = Y0; ring.z0 = Z0;
    ring.x1 = x1; ring.z1 = Z_PEG; ring.apex = .5 + .5 * pw;
    ring.T = .9 - .22 * pw; ring.t = 0; ring.tilt = 0; ring.on = null;
    trail = [];
    ring.x = 0; ring.y = Y0; ring.z = Z0; ring.vy = 0; ring.vz = 0;
    state = 'fly'; t0 = performance.now(); rings--; thrown++;
    say('');
    try { tone(430, .1, .05, 'sine', 720); } catch (e) {}
    try { buzz(6); } catch (e) {}
  }

  function arrive() {
    ring.x = ring.x1; ring.y = PEG_H; ring.z = Z_PEG; ring.tilt = 0; trail = [];
    let hit = null;
    pegs.forEach((p) => {
      if (p.hit) return;
      if (Math.abs(p.x - ring.x) < CATCH && (!hit || Math.abs(p.x - ring.x) < Math.abs(hit.x - ring.x))) hit = p;
    });
    t0 = performance.now();
    if (hit) {
      /* over the post: the ring drops down the shaft and settles at its foot */
      hit.hit = true; hit.flash = 1;
      streak++;
      score += streak;
      rings = Math.min(3, rings + 1);          /* a rung hands the ring back */
      ring.on = hit; ring.x = hit.x; ring.y = PEG_H + .18; ring.vy = 0; ring.vz = 0;
      ring.slide = 0; state = 'slide';
      if (score > best) { best = score; try { store.set('d.rtbest', best); } catch (e) {} }
      burst(hit.t.x, hit.t.y, 14, '255,226,150');
      float(streak, hit.t.x, hit.t.y - 14, streak > 1 ? '×' + streak : '+1');
      say('');
      try { tone(760 + Math.min(9, streak) * 70, .16, .06, 'sine', 1320 + streak * 60); } catch (e) {}
      try { buzz([10, 38, 12]); } catch (e) {}
    } else {
      /* a clean miss: it keeps falling past the row onto the floor behind it */
      ring.vy = .5; ring.vz = 1.15;
      streak = 0; shake = 7;
      state = 'land';
      say('Missed');
      try { tone(300, .09, .03, 'triangle', 190); } catch (e) {}
    }
  }

  function rest(t) {
    state = 'wait';
    if (rings <= 0) {
      over = true; wait = Math.max(t, 1.5);
      say('tap to replay');
      try { tone(240, .3, .06, 'triangle', 160); } catch (e) {}
    } else wait = t;
  }

  /* ---------- sim, seconds ---------- */
  /* the row starts sliding once the score gets going, and works up to a real
     sway: the ring is in the air about .7s, so a late game toss has to lead it */
  function updatePegs(now) {
    const ramp = clamp((score - 10) / 26, 0, 1);
    const amp = ramp > 0 ? 0.09 + 0.30 * ramp : 0;
    const rate = 0.8 + 1.05 * ramp;
    driftT = now / 1000;
    drift = amp ? Math.sin(driftT * rate) * amp : 0;
    const cam = geo.cam;
    pegs.forEach((p) => {
      p.x = p.bx + drift;
      p.b = cam.p(p.x, 0, Z_PEG);
      p.t = cam.p(p.x, PEG_H, Z_PEG);
    });
  }

  function burst(px, py, n, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 40 + Math.random() * 150;
      sparks.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 1, col });
    }
  }

  function float(_n, px, py, txt) { floats.push({ x: px, y: py, txt, life: 1 }); }

  function step(s) {
    const now = performance.now();
    pegs.forEach((p) => { if (p.flash > 0) p.flash = Math.max(0, p.flash - s * 2.4); });
    updatePegs(now);
    if (shake > 0) shake = Math.max(0, shake - s * 34);
    sparks.forEach((q) => { q.x += q.vx * s; q.y += q.vy * s; q.vy += 380 * s; q.vx *= Math.pow(.4, s); q.life -= s * 1.6; });
    sparks = sparks.filter((q) => q.life > 0);
    floats.forEach((f) => { f.y -= 26 * s; f.life -= s * 1.05; });
    floats = floats.filter((f) => f.life > 0);

    if (state === 'ready') {
      /* a small breath, so the ring in hand does not look pasted on */
      ring.y = Y0 + Math.sin(now / 620) * .022;
    } else if (state === 'fly') {
      ring.t += s / ring.T;
      const t = Math.min(1, ring.t), arc = Math.sin(Math.PI * t);
      ring.x = ring.x0 + (ring.x1 - ring.x0) * (t + arc * .06);
      ring.y = ring.y0 + (PEG_H - ring.y0) * t + arc * ring.apex;
      ring.z = ring.z0 + (ring.z1 - ring.z0) * t;
      /* it rides at an angle, then goes flat exactly as it reaches the posts */
      const flat = clamp((t - .76) / .24, 0, 1);
      ring.tilt = (.52 + .2 * Math.sin(t * 8.4)) * (1 - flat);
      ring.spin += s * 8;
      trail.push({ x: ring.x, y: ring.y, z: ring.z, tilt: ring.tilt });
      if (trail.length > 7) trail.shift();
      if (ring.t >= 1) arrive();
    } else if (state === 'slide') {
      /* down the shaft, easing into its seat on the floor */
      ring.slide = Math.min(1, (ring.slide || 0) + s / .34);
      const e = 1 - Math.pow(1 - ring.slide, 2.4);
      ring.y = (PEG_H + .18) - (PEG_H + .18 - .06) * e;
      ring.tilt = 0; ring.spin += s * 1.2;
      if (ring.on) ring.x = ring.on.x;      /* it rides the post as the row drifts */
      if (ring.slide >= 1) {
        ring.y = .06;
        try { tone(620, .1, .04, 'sine', 520); } catch (e) {}
        rest(.6);
      }
    } else if (state === 'land') {
      /* vy is a downward speed: subtract it from height */
      ring.vy += G * s;
      ring.y -= ring.vy * s;
      if (ring.on) {
        if (ring.y <= PEG_H) {
          ring.y = PEG_H;
          ring.vy = Math.abs(ring.vy) > .8 ? -ring.vy * .16 : 0;
          if (!ring.vy) rest(.75);
        }
      } else {
        ring.z += ring.vz * s; ring.vz *= Math.pow(.3, s);
        if (ring.y <= 0.02) {
          ring.y = 0.02;
          if (Math.abs(ring.vy) > 1.1) {
            ring.vy = -ring.vy * .26;
            try { tone(120, .1, .05, 'triangle', 78); } catch (e) {}
            try { buzz(9); } catch (e) {}
          } else { ring.vy = 0; ring.vz = 0; rest(.5); }
        }
      }
    } else if (state === 'wait') {
      wait -= s;
      if (wait <= 0) {
        if (over) { state = 'over'; }
        else { state = 'ready'; resetRing(); say(''); }
      }
    }

    /* nothing may stall: a throw always resolves inside six seconds */
    if (state !== 'ready' && state !== 'wait' && now - t0 > 6000) { ring.vy = 0; rest(.3); }

    if (pending && state === 'ready') { const p = pending; pending = null; toss(p.px, p.power, p.dx); }
  }

  /* ---------- art ---------- */
  const shadowInk = (m, a) => (m.flat ? 'rgba(36,26,58,' + a + ')' : 'rgba(4,2,16,' + a + ')');

  function floorShadow(x, cam, X, Z, rad, m, k) {
    const p = cam.p(X, 0, Z), rx = Math.max(3, rad * p.s), ry = Math.max(1.2, rx * cam.sq(0, Z));
    x.save(); x.translate(p.x, p.y); x.scale(1, ry / rx);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, shadowInk(m, .5 * k)); g.addColorStop(.6, shadowInk(m, .24 * k)); g.addColorStop(1, shadowInk(m, 0));
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill();
    x.restore();
  }

  function floorCircle(cam, X, Z, rad, n) {
    const out = [], N = n || 44;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU;
      out.push(cam.p(X + Math.cos(a) * rad, 0, Z + Math.sin(a) * rad));
    }
    return out;
  }

  function ground(x, cam, m) {
    const w = cam.w, h = cam.h, hy = clamp(cam.horizon, 10, h * .58);
    if (m.flat) {
      x.fillStyle = m.s2; x.fillRect(0, 0, w, hy);
      x.fillStyle = m.s3; x.fillRect(0, hy, w, h - hy);
    } else {
      const sky = x.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, '#090520'); sky.addColorStop(.55, m.s2); sky.addColorStop(1, '#2f2468');
      x.fillStyle = sky; x.fillRect(0, 0, w, hy);
      /* the light source sits behind the row, so the whole stage falls off from there */
      x.save(); x.translate(w / 2, hy + 4); x.scale(1, .55);
      const halo = x.createRadialGradient(0, 0, 4, 0, 0, w * .52);
      halo.addColorStop(0, 'rgba(255,244,224,.22)'); halo.addColorStop(.5, 'rgba(255,244,224,.07)'); halo.addColorStop(1, 'rgba(255,244,224,0)');
      x.fillStyle = halo; x.beginPath(); x.arc(0, 0, w * .52, 0, TAU); x.fill(); x.restore();
      const fl = x.createLinearGradient(0, hy, 0, h);
      fl.addColorStop(0, '#302469'); fl.addColorStop(.22, m.s3); fl.addColorStop(.62, m.s2); fl.addColorStop(1, '#1d1546');
      x.fillStyle = fl; x.fillRect(0, hy, w, h - hy);
      const gl = x.createLinearGradient(0, hy - 40, 0, hy);
      gl.addColorStop(0, 'rgba(255,244,224,0)'); gl.addColorStop(1, 'rgba(255,244,224,.2)');
      x.fillStyle = gl; x.fillRect(0, hy - 40, w, 40);
    }
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(255,246,226,.35)';
    x.lineWidth = m.flat ? 1.5 : 1;
    x.beginPath(); x.moveTo(0, hy + .5); x.lineTo(w, hy + .5); x.stroke();

    /* the pool of light the row stands in — a broad spill plus a squashed hot spot,
       neither clipped, so it has no hard edge to read as a table top */
    const c = cam.p(0, 0, Z_PEG);
    const prx = ROW * 1.9 * c.s, pry = Math.max(6, prx * cam.sq(0, Z_PEG));
    const sp = x.createRadialGradient(c.x, c.y - 4, 4, c.x, c.y - 4, prx * 1.3);
    if (m.flat) { sp.addColorStop(0, 'rgba(255,253,248,.9)'); sp.addColorStop(.5, 'rgba(255,253,248,.4)'); sp.addColorStop(1, 'rgba(255,253,248,0)'); }
    else { sp.addColorStop(0, 'rgba(255,241,214,.3)'); sp.addColorStop(.42, 'rgba(255,248,232,.13)'); sp.addColorStop(1, 'rgba(255,255,255,0)'); }
    x.fillStyle = sp; x.fillRect(0, 0, w, h);
    x.save(); x.translate(c.x, c.y); x.scale(1, pry / prx);
    const hp = x.createRadialGradient(0, 0, 2, 0, 0, prx * .7);
    if (m.flat) { hp.addColorStop(0, 'rgba(255,253,248,.8)'); hp.addColorStop(1, 'rgba(255,253,248,0)'); }
    else { hp.addColorStop(0, 'rgba(255,246,226,.34)'); hp.addColorStop(.55, 'rgba(255,246,226,.1)'); hp.addColorStop(1, 'rgba(255,246,226,0)'); }
    x.fillStyle = hp; x.fillRect(-prx, -prx, prx * 2, prx * 2);
    x.restore();
  }

  function pill(x, cx, cy, t, size, bg, fg, maxW) {
    x.save();
    x.font = '700 ' + size + 'px "Bricolage Grotesque",system-ui,sans-serif';
    let s = t;
    while (s.length > 1 && x.measureText(s).width > maxW - 12) s = s.slice(0, -1);
    if (s !== t) s += '…';
    const tw = Math.min(maxW, x.measureText(s).width + 13), th = size + 7;
    K.rr(x, cx - tw / 2, cy - th / 2, tw, th, th / 2);
    x.fillStyle = bg; x.fill();
    x.strokeStyle = K.mat().flat ? '#241a3a' : 'rgba(24,12,52,.28)';
    x.lineWidth = K.mat().flat ? 1.3 : 1; x.stroke();
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(s, cx, cy + .5);
    x.restore();
  }

  function bodyPath(x, t, b, rt, rb, ryT, ryB) {
    x.beginPath();
    x.ellipse(t.x, t.y, rt, ryT, 0, Math.PI, TAU);
    x.lineTo(b.x + rb, b.y);
    x.ellipse(b.x, b.y, rb, ryB, 0, 0, Math.PI);
    x.closePath();
  }

  function post(x, cam, p, m, tall, rad) {
    const b = p.b, t = p.t, rb = rad * b.s, rt = rad * t.s;
    const ryB = Math.max(1, rb * cam.sq(0, Z_PEG)), ryT = Math.max(1, rt * cam.sq(tall, Z_PEG));
    floorShadow(x, cam, p.x + .1, Z_PEG + .12, rad * 1.9, m, 1);
    /* a foot, so the post stands on the floor instead of into it */
    const fr = rb * 1.7, fry = Math.max(1, fr * cam.sq(0, Z_PEG) * .85), fh = Math.max(2.6, rb * .5);
    bodyPath(x, { x: b.x, y: b.y + 1 - fh }, { x: b.x, y: b.y + 1 }, fr * .9, fr, fry * .9, fry);
    x.fillStyle = m.flat ? '#fffdf8' : '#e6dcf5';
    x.fill();
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(12,6,30,.45)';
    x.lineWidth = m.flat ? 1.4 : 1; x.stroke();
    bodyPath(x, t, b, rt, rb, ryT, ryB);
    if (m.flat) x.fillStyle = '#fffdf8';
    else {
      const g = x.createLinearGradient(t.x - rt, 0, t.x + rt, 0);
      g.addColorStop(0, 'rgba(255,255,255,.97)'); g.addColorStop(.3, '#f6f0ff');
      g.addColorStop(.72, '#c9bce4'); g.addColorStop(1, '#8e80b6');
      x.fillStyle = g;
    }
    x.fill();
    if (m.flat) { x.strokeStyle = '#241a3a'; x.lineWidth = 1.5; x.stroke(); }
    else {
      /* the lit edge of the cylinder */
      x.beginPath();
      x.moveTo(t.x - rt * .78, t.y - ryT * .15);
      x.lineTo(b.x - rb * .78, b.y - ryB * .15);
      x.strokeStyle = K.light(.5); x.lineWidth = 1.2; x.stroke();
    }
    /* a painted band just under the head, curved by the cylinder's own shading */
    const hgt = b.y - t.y, by = t.y + hgt * .07, bh = Math.max(3, hgt * .2);
    x.save(); bodyPath(x, t, b, rt, rb, ryT, ryB); x.clip();
    x.fillStyle = p.c; x.fillRect(t.x - rt - 2, by, rt * 2 + 4, bh);
    const sh = x.createLinearGradient(t.x - rt, 0, t.x + rt, 0);
    sh.addColorStop(0, 'rgba(255,255,255,' + (m.flat ? .5 : .72) + ')');
    sh.addColorStop(.3, 'rgba(255,255,255,.08)');
    sh.addColorStop(.72, 'rgba(18,8,38,.12)');
    sh.addColorStop(1, 'rgba(18,8,38,.42)');
    x.fillStyle = sh; x.fillRect(t.x - rt - 2, by, rt * 2 + 4, bh);
    x.restore();
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(10,4,24,.4)';
    x.lineWidth = m.flat ? 1.3 : 1;
    x.beginPath(); x.moveTo(t.x - rt, by + .5); x.lineTo(t.x + rt, by + .5); x.stroke();
    x.beginPath(); x.moveTo(t.x - rt, by + bh - .5); x.lineTo(t.x + rt, by + bh - .5); x.stroke();
    /* the head */
    x.beginPath(); x.ellipse(t.x, t.y, rt, ryT, 0, 0, TAU);
    if (m.flat) x.fillStyle = '#fffdf8';
    else {
      const hg = x.createLinearGradient(t.x - rt, t.y - ryT, t.x + rt, t.y + ryT);
      hg.addColorStop(0, '#fffdf8'); hg.addColorStop(.6, '#efe6ff'); hg.addColorStop(1, '#b7a9d4');
      x.fillStyle = hg;
    }
    x.fill();
    x.beginPath(); x.ellipse(t.x - rt * .2, t.y - ryT * .1, rt * .55, ryT * .45, 0, 0, TAU);
    x.fillStyle = K.light(m.flat ? .35 : .6); x.fill();
    x.beginPath(); x.ellipse(t.x, t.y, rt, ryT, 0, 0, TAU);
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(12,6,30,.5)';
    x.lineWidth = m.flat ? 1.4 : 1; x.stroke();
    if (p.flash > 0) {
      x.beginPath(); x.ellipse(t.x, t.y, rt * (1.8 + p.flash), ryT * (1.8 + p.flash), 0, 0, TAU);
      x.strokeStyle = 'rgba(255,226,150,' + p.flash * .85 + ')'; x.lineWidth = 2.2; x.stroke();
    }
  }

  /* ---------- the ring, as a real circle in space ---------- */
  function ringPts(cam, ring, R, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = i / n * TAU, ux = Math.cos(a) * R, uz = Math.sin(a) * R;
      out.push(cam.p(ring.x + ux, ring.y + uz * Math.sin(ring.tilt), ring.z + uz * Math.cos(ring.tilt)));
    }
    return out;
  }

  /* the band between two circles; split at its extremes so a post can pass between */
  function band(x, cam, ring, i0, i1, R) {
    const N = 40, w = 0.062;
    const out = ringPts(cam, ring, R + w, N), inn = ringPts(cam, ring, R - w, N);
    x.beginPath();
    for (let i = i0; i <= i1; i++) i === i0 ? x.moveTo(out[i].x, out[i].y) : x.lineTo(out[i].x, out[i].y);
    for (let i = i1; i >= i0; i--) x.lineTo(inn[i].x, inn[i].y);
    x.closePath();
    return inn;
  }

  function drawRing(x, cam, m, part) {
    if (!ring) return;
    const N = 40, R = RING_R;
    const halves = part === 1 ? [[0, N / 2]] : part === 2 ? [[N / 2, N]] : [[0, N]];
    const l = cam.p(ring.x - R, ring.y, ring.z).x, r = cam.p(ring.x + R, ring.y, ring.z).x;
    const g = x.createLinearGradient(Math.min(l, r) - 4, 0, Math.max(l, r) + 4, 0);
    g.addColorStop(0, '#ff9ecb'); g.addColorStop(.45, '#ff6fae'); g.addColorStop(1, '#c33d78');
    halves.forEach((h) => {
      const inn = band(x, cam, ring, h[0], h[1], R);
      x.fillStyle = g; x.fill();
      x.strokeStyle = m.flat ? '#241a3a' : 'rgba(255,255,255,.38)';
      x.lineWidth = m.flat ? 1.4 : .9; x.stroke();
      /* the inside of the band, so the hole reads as a hole */
      x.beginPath();
      for (let i = h[0]; i <= h[1]; i++) i === h[0] ? x.moveTo(inn[i].x, inn[i].y) : x.lineTo(inn[i].x, inn[i].y);
      x.strokeStyle = 'rgba(74,12,44,.5)'; x.lineWidth = 1.3; x.stroke();
    });
    if (part === 0) {
      /* a bead, so the ring's spin is visible even though a plain ring is symmetric */
      const pts = ringPts(cam, ring, R, 48);
      const bi = Math.floor((((ring.spin % TAU) + TAU) % TAU) / TAU * 48) % 48;
      const bp = pts[bi];
      x.beginPath(); x.arc(bp.x, bp.y, Math.max(1.5, bp.s * .05), 0, TAU);
      x.fillStyle = '#fffdf8'; x.fill();
      x.strokeStyle = m.flat ? '#241a3a' : 'rgba(16,8,36,.5)'; x.lineWidth = 1; x.stroke();
    }
  }

  function draw(g) {
    if (!geo) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), cam = geo.cam;
    x.save(); K.rr(x, 0, 0, w, h, m.radius); x.clip();
    if (shake > 0) x.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    ground(x, cam, m);

    if (ring) {
      const k = clamp(1 - (ring.y - .15) / 2.4, .18, 1);
      floorShadow(x, cam, ring.x + .1, ring.z + .12, RING_R * (1.05 + (1 - k) * .6), m, k);
    }

    const behind = ring && ring.z > Z_PEG + .04;
    /* the arc it just flew: thin ghost rings, so the throw reads as travel */
    trail.forEach((t, i) => {
      const a = (i + 1) / (trail.length + 1) * .3;
      const pts = ringPts(cam, t, RING_R, 16);
      x.beginPath();
      pts.forEach((p, k) => (k ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
      x.strokeStyle = 'rgba(255,111,174,' + a.toFixed(3) + ')';
      x.lineWidth = 1.2; x.stroke();
    });
    if (behind) drawRing(x, cam, m, 0);
    pegs.forEach((p) => {
      if (ring && ring.on === p) { drawRing(x, cam, m, 1); post(x, cam, p, m, PEG_H, PEG_R); drawRing(x, cam, m, 2); }
      else post(x, cam, p, m, PEG_H, PEG_R);
    });
    if (!behind && !(ring && ring.on)) drawRing(x, cam, m, 0);

    /* sparks off a rung, and the score that came with it */
    sparks.forEach((q) => {
      x.beginPath(); x.arc(q.x, q.y, 2.2 * q.life + .7, 0, TAU);
      x.fillStyle = 'rgba(' + q.col + ',' + (q.life * .9).toFixed(3) + ')'; x.fill();
    });
    floats.forEach((f) => {
      x.font = '800 13px "Bricolage Grotesque",system-ui,sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = INK(clamp(f.life, 0, 1));
      x.fillText(f.txt, f.x, f.y);
    });

    /* labels sit on the floor in front of each post */
    pegs.forEach((p) => {
      const l = cam.p(p.x, 0, Z_PEG - 1.6);
      pill(x, l.x, l.y, p.l, Math.max(10, Math.min(12, l.s * .155)), '#fffdf8', '#241a35', GAP * l.s * .85);
    });

    /* aim: where the ring will come down, drawn on the post plane */
    if (drag && state === 'ready') {
      const ax = aimX(drag.x, drag.x - drag.x0);
      const tgt = cam.p(ax, PEG_H, Z_PEG), from = cam.p(ring.x, ring.y, ring.z);
      x.save();
      x.setLineDash([4, 6]); x.strokeStyle = INK(.45); x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(from.x, from.y - 4); x.lineTo(tgt.x, tgt.y); x.stroke();
      x.restore();
      x.save();
      x.strokeStyle = INK(.7); x.lineWidth = 1.6;
      x.beginPath(); x.ellipse(tgt.x, tgt.y, RING_R * tgt.s, RING_R * tgt.s * cam.sq(PEG_H, Z_PEG), 0, 0, TAU); x.stroke();
      x.restore();
    }

    /* HUD: name and rings in hand */
    K.label(x, 'RING TOSS', 16, 16, 10, 'left');
    K.label(x, String(score), 16, 34, 15, 'left');
    if (best > 0 && best >= score) K.label(x, 'best ' + best, 16 + 26, 34, 10, 'left');
    if (streak > 1) K.label(x, '×' + streak + ' streak', 16, 50, 10, 'left');
    for (let i = 0; i < 3; i++) {
      const px = w - 16 - i * 15, py = 18;
      x.beginPath(); x.ellipse(px, py, 5.4, 2.4, 0, 0, TAU);
      x.strokeStyle = i < rings ? '#ff6fae' : INK(.22); x.lineWidth = 2; x.stroke();
    }
    if (drag && state === 'ready') K.label(x, 'let go to throw', w / 2, h - 12, 10);
    if (over) K.label(x, 'tap to play again', w / 2, h - 12, 11);

    x.restore();
  }

  /* ---------- loop ---------- */
  function frame(dt) {
    try {
      const g = K.fit(cv());
      if (!geo || Math.abs(geo.w - g.w) > .5 || Math.abs(geo.h - g.h) > .5) layout();
      step(Math.min(.05, dt / 60));
      draw(g);
    } catch (e) {}
  }

  K && window.DECIDER_GAMES.push({
    id: 'ringtoss', name: 'Ring Toss', short: 'Rings', label: 'Pegs', noResult: true, button: false,
    body: '<canvas class="toy" id="rtCv"></canvas><div class="res" id="rtRes" aria-live="polite"><span class="muted">Flick a ring at a post</span></div>',
    init() {
      try { best = +store.get('d.rtbest', 0) || 0; } catch (e) {}
      layout(); L = K.loop(frame);
      startGame();
      K.gesture(cv(), {
        onStart(p) { drag = { x: p.x, y: p.y, x0: p.x, y0: p.y }; },
        onMove(p) { if (drag) { drag.x = p.x; drag.y = p.y; } },
        onEnd(r) {
          if (!geo) { drag = null; return; }
          const d = drag; drag = null;
          const up = Math.max(d ? d.y0 - r.y : 0, 0);
          const power = clamp(up / (geo.h * .42) + r.speed * .1, .24, 1);
          toss(r.x, power, r.dx);
        }
      });
      cv().addEventListener('pointercancel', () => { drag = null; });
      if (cv().clientWidth) L.start();
    },
    enter() { layout(); L.start(); },
    leave() { drag = null; L.stop(); },
    action() { if (geo) toss(geo.w / 2, .6, 0); },
    status() {
      return { state, rings, score, streak, best, over, threw: thrown, drift: +drift.toFixed(3),
        pegs: pegs.map((p) => ({ l: p.l, hit: p.hit })),
        ring: ring ? { x: +ring.x.toFixed(3), y: +ring.y.toFixed(3), z: +ring.z.toFixed(3), on: ring.on ? ring.on.l : null } : null };
    }
  });
})();
