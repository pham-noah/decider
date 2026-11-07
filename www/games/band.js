/* Band — a latex band hooked over two solid posts. Grab either end: the band
 * follows your finger with a little lag, goes taut and thin, and snaps home
 * with an underdamped quiver when you let go. Tapping the band plucks a
 * standing wave through it. No goal, no numbers. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2, N = 46;
  const cv = () => document.getElementById('bdCv');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  let L = null, g = null, posts = [], rest = [], ends = [];
  let grab = -1, ph = 0, amp = 0, tnow = 0, relT = 0;

  function layout() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const cy = g.h * .50, half = Math.max(7, Math.min(9, g.w * .024));
    posts = [{ x: g.w * .155, y: cy, w: half * 2 }, { x: g.w * .845, y: cy, w: half * 2 }];
    rest = [{ x: posts[0].x + half + 3, y: cy }, { x: posts[1].x - half - 3, y: cy }];
    ends = rest.map(p => ({ x: p.x, y: p.y, vx: 0, vy: 0, held: false }));
    grab = -1; amp = 0; relT = 0;
  }

  const gap = () => rest[1].x - rest[0].x;
  const dist = () => Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y);
  /* 0 at rest, 1 when the latex cannot give any more */
  const tension = () => clamp((dist() / gap() - 1) / .34, 0, 1);
  /* how much spare length hangs between the posts */
  const slackness = () => clamp((1.11 - dist() / gap()) / .17, 0, 1);

  /* keep an end on its own side of the other post, inside the card, and
     short of the stretch the latex could survive */
  function clampEnd(i, x, y) {
    const o = ends[1 - i];
    if (i === 0) x = Math.min(x, o.x - 28); else x = Math.max(x, o.x + 28);
    x = clamp(x, 13, g.w - 13);
    y = clamp(y, 44, g.h - 30);
    const lim = gap() * 1.95, dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy);
    if (d > lim) { x = o.x + dx / d * lim; y = o.y + dy / d * lim; }
    return { x, y };
  }

  function pull(i, p, dt) {
    const e = ends[i];
    const t = clampEnd(i, p.x, p.y);
    /* a little lag, so the band loads up behind the finger instead of
       teleporting onto it */
    const k = Math.min(1, .34 * dt);
    e.x += (t.x - e.x) * k;
    e.y += (t.y - e.y) * k;
    e.held = true;
  }

  function twang(t) {
    const p = 168 + t * 760 + (Math.random() - .5) * 26;
    sfx(p, .15 + t * .06, .05 + t * .03, 'triangle', p * .42);
    setTimeout(() => sfx(p * 2.01, .085, .018, 'sine', p * 1.5), 26);
    hap(9 + Math.round(t * 8));
  }

  function release(i) {
    const e = ends[i];
    if (!e.held) return;
    const t = tension();
    e.held = false; e.vx = 0; e.vy = 0; relT = 0;
    twang(t);
    /* the band keeps the shock as a ripple that dies out */
    amp = Math.max(amp, 1.6 + t * 5);
  }

  function step(dt) {
    /* sub-step so a long frame cannot throw the spring */
    const n = Math.max(1, Math.ceil(dt)), h = dt / n;
    for (let k = 0; k < n; k++) {
      ends.forEach((e, i) => {
        if (e.held) return;
        const ax = (rest[i].x - e.x) * .030, ay = (rest[i].y - e.y) * .030;
        e.vx = (e.vx + ax * h) * Math.pow(.90, h);
        e.vy = (e.vy + ay * h) * Math.pow(.90, h);
        e.vx = clamp(e.vx, -34, 34); e.vy = clamp(e.vy, -34, 34);
        e.x += e.vx * h; e.y += e.vy * h;
        if (Math.abs(e.x - rest[i].x) < .35 && Math.abs(e.y - rest[i].y) < .35 &&
            Math.hypot(e.vx, e.vy) < .12) {
          e.x = rest[i].x; e.y = rest[i].y; e.vx = 0; e.vy = 0;
        }
      });
    }
    if (grab < 0 && !ends[0].held && !ends[1].held) {
      relT += dt;
      /* fail-safe: the band is never left hanging stretched */
      if (relT > 78) ends.forEach((e, i) => { e.x = rest[i].x; e.y = rest[i].y; e.vx = 0; e.vy = 0; });
    } else relT = 0;
    if (amp > .02) { ph += .36 * dt; amp *= Math.pow(.955, dt); } else amp = 0;
    tnow += dt;
  }

  /* ---------- band geometry ---------- */
  function bandPts() {
    const a = ends[0], b = ends[1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const sag = 3 + slackness() * slackness() * 30;
    const wave = amp * Math.sin(ph);
    const c1 = { x: a.x + dx * .30, y: a.y + dy * .30 + sag };
    const c2 = { x: a.x + dx * .70, y: a.y + dy * .70 + sag };
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, u = 1 - s;
      pts.push({
        s,
        x: u * u * u * a.x + 3 * u * u * s * c1.x + 3 * u * s * s * c2.x + s * s * s * b.x,
        y: u * u * u * a.y + 3 * u * u * s * c1.y + 3 * u * s * s * c2.y + s * s * s * b.y
      });
    }
    /* standing wave: one belly, pinned at both ends */
    for (let i = 0; i <= N; i++) {
      const p = pts[i], q = pts[Math.min(N, i + 1)], r = pts[Math.max(0, i - 1)];
      const tx = q.x - r.x, ty = q.y - r.y, l = Math.hypot(tx, ty) || 1;
      const shape = Math.sin(Math.PI * p.s) * .88 + Math.sin(TAU * p.s) * .30;
      const wob = wave * shape;
      p.nx = -ty / l; p.ny = tx / l;
      p.x += p.nx * wob; p.y += p.ny * wob;
    }
    return pts;
  }

  function ribbon(pts, hwFn, off) {
    const Lp = [], Rp = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], hw = hwFn(p.s), o = off || 0;
      Lp.push({ x: p.x + p.nx * (hw + o), y: p.y + p.ny * (hw + o) });
      Rp.push({ x: p.x - p.nx * (hw - o), y: p.y - p.ny * (hw - o) });
    }
    return { Lp, Rp };
  }
  function trace(x, rb) {
    x.beginPath(); x.moveTo(rb.Lp[0].x, rb.Lp[0].y);
    for (let i = 1; i < rb.Lp.length; i++) x.lineTo(rb.Lp[i].x, rb.Lp[i].y);
    for (let i = rb.Rp.length - 1; i >= 0; i--) x.lineTo(rb.Rp[i].x, rb.Rp[i].y);
    x.closePath();
  }

  /* the loose end past each finger, sagging when the latex is slack */
  function tail(x, i, flat) {
    const e = ends[i], t = tension(), sgn = i === 0 ? -1 : 1;
    const len = 12 + (1 - t) * 22;
    const droop = 6 + (1 - t) * 28;
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      pts.push({ s: u, x: e.x + sgn * len * u, y: e.y + droop * u * u });
    }
    for (let k = 0; k <= 8; k++) {
      const p = pts[k], q = pts[Math.min(8, k + 1)], r = pts[Math.max(0, k - 1)];
      const tx = q.x - r.x, ty = q.y - r.y, l = Math.hypot(tx, ty) || 1;
      p.nx = -ty / l; p.ny = tx / l;
    }
    const base = 3.9 - t * 1.9;
    const rb = ribbon(pts, s => base * (1 - s * .72), 0);
    trace(x, rb);
    x.fillStyle = flat ? '#e8407f' : '#d93a7a'; x.fill();
    if (flat) { x.strokeStyle = '#241a3a'; x.lineWidth = 1.1; x.stroke(); }
    else {
      trace(x, ribbon(pts, s => base * (1 - s * .72) * .3, base * .28));
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fill();
    }
  }

  function post(x, px, py, flat) {
    const w = posts[0].w, top = py - 80, bot = py + 74;
    /* the shadow it throws on the card */
    x.beginPath(); x.ellipse(px + 6, bot + 6, w * 1.9, 8, 0, 0, TAU);
    x.fillStyle = flat ? 'rgba(36,26,58,.16)' : 'rgba(6,2,20,.45)'; x.fill();
    /* a wide clamp foot, so the post is planted, not floating */
    K.panel(x, px - w * 1.6, bot - 7, w * 3.2, 18, { r: 5, face: '#efe9ff', face2: '#9f90cf' });
    /* the shaft */
    K.panel(x, px - w / 2, top, w, bot - top, { r: 5, face: '#f4efff', face2: '#ac9ede' });
    const grd = x.createLinearGradient(px - w / 2, 0, px + w / 2, 0);
    if (flat) {
      grd.addColorStop(0, 'rgba(255,255,255,.6)'); grd.addColorStop(.42, 'rgba(255,255,255,0)');
      grd.addColorStop(1, 'rgba(36,26,58,.12)');
    } else {
      grd.addColorStop(0, 'rgba(255,255,255,.7)'); grd.addColorStop(.38, 'rgba(255,255,255,.05)');
      grd.addColorStop(1, 'rgba(14,6,40,.42)');
    }
    x.save(); K.rr(x, px - w / 2, top, w, bot - top, 5); x.clip();
    x.fillStyle = grd; x.fillRect(px - w / 2, top, w, bot - top); x.restore();
    /* flat bevel on top and a bolt in the clamp */
    x.save(); K.rr(x, px - w / 2, top, w, 5, 2.5); x.fillStyle = K.light(flat ? .5 : .55); x.fill(); x.restore();
    x.beginPath(); x.arc(px, bot + 2, 2.1, 0, TAU);
    x.fillStyle = flat ? 'rgba(36,26,58,.35)' : 'rgba(30,16,60,.35)'; x.fill();
  }

  function drawBand(x, flat) {
    const t = tension(), pts = bandPts();
    const hwFn = s => (3.9 - t * 2.05) * (.82 + .18 * Math.sin(Math.PI * s));
    const rb = ribbon(pts, hwFn, 0);

    if (flat) {
      const sh = pts.map(p => ({ s: p.s, nx: p.nx, ny: p.ny, x: p.x + 3, y: p.y + 5 }));
      trace(x, ribbon(sh, hwFn, 0));
      x.fillStyle = 'rgba(36,26,58,.17)'; x.fill();
    } else {
      x.save(); x.shadowColor = 'rgba(4,0,16,.55)'; x.shadowBlur = 14; x.shadowOffsetY = 9;
      trace(x, rb); x.fillStyle = '#2a1140'; x.fill(); x.restore();
    }

    /* the latex: dark rim, body, hot core, then a specular along its length */
    trace(x, rb);
    x.fillStyle = flat ? '#d63a7c' : '#c62c6c'; x.fill();
    if (flat) { x.strokeStyle = '#241a3a'; x.lineWidth = 1.3; x.stroke(); }

    trace(x, ribbon(pts, s => hwFn(s) * .72, 0));
    x.fillStyle = flat ? '#f0478f' : '#ef4a91'; x.fill();

    trace(x, ribbon(pts, s => hwFn(s) * .36, -hwFn(.5) * .06));
    x.fillStyle = flat ? '#ff7fb1' : '#ff86b8'; x.fill();

    trace(x, ribbon(pts, s => hwFn(s) * .19, hwFn(.5) * .30));
    x.fillStyle = 'rgba(255,255,255,' + (flat ? .5 : .34 + t * .3) + ')'; x.fill();

    /* taut: a thin shimmer on each edge, the latex about to sing */
    if (t > .55) {
      x.save(); x.globalAlpha = (t - .55) * .9;
      trace(x, ribbon(pts, s => hwFn(s) * .06, hwFn(.5) * .92));
      x.fillStyle = 'rgba(255,255,255,.8)'; x.fill();
      trace(x, ribbon(pts, s => hwFn(s) * .06, -hwFn(.5) * .92));
      x.fillStyle = 'rgba(255,255,255,.8)'; x.fill();
      x.restore();
    }
  }

  function grip(x, i, flat) {
    const e = ends[i];
    if (!e.held) {
      const pulse = .05 + .05 * (Math.sin(tnow * .09 + i * 2) + 1) / 2;
      x.beginPath(); x.arc(e.x, e.y, 12, 0, TAU);
      x.strokeStyle = flat ? 'rgba(36,26,58,' + pulse + ')' : 'rgba(255,255,255,' + pulse + ')';
      x.lineWidth = 1.2; x.stroke();
      return;
    }
    /* pinched: a bright collar where the fingers are */
    x.beginPath(); x.arc(e.x, e.y, 6.4, 0, TAU);
    x.fillStyle = flat ? '#fffdf8' : 'rgba(255,255,255,.92)'; x.fill();
    x.strokeStyle = flat ? '#241a3a' : 'rgba(255,255,255,.5)'; x.lineWidth = flat ? 1.4 : 1; x.stroke();
    x.beginPath(); x.arc(e.x - 1.4, e.y - 1.6, 1.5, 0, TAU); x.fillStyle = 'rgba(255,255,255,.75)'; x.fill();
  }

  function draw() {
    if (!g) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), flat = m.flat;

    /* a pool of light so the band sits in a room, not on a flat rectangle */
    if (!flat) {
      const gl = x.createRadialGradient(w * .5, h * .44, 8, w * .5, h * .44, w * .62);
      gl.addColorStop(0, 'rgba(255,120,180,.10)'); gl.addColorStop(1, 'rgba(255,120,180,0)');
      x.fillStyle = gl; x.fillRect(0, 0, w, h);
    }

    posts.forEach(p => post(x, p.x, p.y, flat));
    ends.forEach((e, i) => tail(x, i, flat));

    /* the band is hooked round each post: the wrap sits under it while the
       end is still home, so the latex reads as lying over the anchor */
    posts.forEach((p, i) => {
      if (Math.hypot(ends[i].x - rest[i].x, ends[i].y - rest[i].y) > 14) return;
      x.beginPath(); x.ellipse(p.x, p.y, posts[0].w * .86, posts[0].w * .66, 0, 0, TAU);
      x.strokeStyle = flat ? '#d63a7c' : '#c62c6c'; x.lineWidth = 4.4; x.stroke();
      x.strokeStyle = flat ? '#f0478f' : '#ef4a91'; x.lineWidth = 2.6; x.stroke();
    });
    drawBand(x, flat);
    ends.forEach((e, i) => grip(x, i, flat));

    K.label(x, 'STRETCH THE BAND', w / 2, 20, 11);
    const t = tension();
    K.label(x, t < .10 ? 'slack' : t < .55 ? 'pulling' : t < .92 ? 'taut' : 'about to ping', w / 2, h - 20, 10);
  }

  function frame(dt) {
    try {
      const gg = K.fit(cv());
      if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) layout();
      step(dt); draw();
    } catch (e) {}
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function nearEnd(p) {
    const d0 = Math.hypot(p.x - ends[0].x, p.y - ends[0].y);
    const d1 = Math.hypot(p.x - ends[1].x, p.y - ends[1].y);
    if (d0 < 42 && d0 <= d1) return 0;
    if (d1 < 46) return 1;
    return -1;
  }

  function pluck() {
    amp = Math.max(amp, 20);
    ph = Math.PI / 2;
    const p = 320 + Math.random() * 150 + tension() * 200;
    sfx(p, .26, .05, 'triangle', p * .55);
    setTimeout(() => sfx(p * 1.5, .12, .016, 'sine'), 30);
    hap(7);
  }

  K && window.DECIDER_GAMES.push({
    id: 'band', name: 'Rubber band', short: 'Band', label: 'Band', noResult: true, button: false,
    body: `<canvas class="toy" id="bdCv"></canvas>
      <div class="res" id="bdRes" aria-live="polite"><span class="muted">Pull an end, let it snap</span></div>`,
    init() {
      L = K.loop(frame); layout();
      const c = cv();
      c.addEventListener('pointerdown', e => {
        if (!g) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e), i = nearEnd(p);
        if (i >= 0) { grab = i; ends[i].held = true; K.press(300); pull(i, p, 1); }
        else pluck();
      });
      c.addEventListener('pointermove', e => {
        if (grab < 0) return;
        pull(grab, at(e), 1);
      });
      const end = () => {
        if (grab >= 0) { const i = grab; grab = -1; release(i); }
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      if (cv().clientWidth) L.start();
    },
    enter() { layout(); amp = 0; grab = -1; L.start(); },
    leave() {
      ends.forEach((e, i) => { e.held = false; e.x = rest[i].x; e.y = rest[i].y; e.vx = 0; e.vy = 0; });
      grab = -1; amp = 0; L.stop();
    }
  });
})();
