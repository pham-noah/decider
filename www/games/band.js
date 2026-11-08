/* Band — a latex band hooked over two solid posts. Take hold of the strand
 * (the middle is where a hand goes) and pull: the band sits exactly under your
 * finger, goes taut and thin, and snaps home with an underdamped quiver when
 * you let go — carrying whatever fling you gave it. A tap plucks a standing
 * wave through it. No goal, no numbers. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2, N = 46;
  const cv = () => document.getElementById('bdCv');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  let L = null, g = null, posts = [], rest = [], home = null;
  let P = null;                       /* the point of the latex under the finger */
  let grab = false, ph = 0, amp = 0, tnow = 0, relT = 0, sGrab = .5, downOk = false;
  let vel = { x: 0, y: 0 }, downAt = 0, downX = 0, downY = 0;

  /* where a released band returns to: the same fraction along the run the
     player took hold of, because a straight band puts that point back there */
  const homeAt = (s) => ({
    x: rest[0].x + (rest[1].x - rest[0].x) * s,
    y: rest[0].y + (rest[1].y - rest[0].y) * s
  });

  function layout() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const cy = g.h * .50, half = Math.max(7, Math.min(9, g.w * .024));
    posts = [{ x: g.w * .155, y: cy, w: half * 2 }, { x: g.w * .845, y: cy, w: half * 2 }];
    rest = [{ x: posts[0].x + half + 3, y: cy }, { x: posts[1].x - half - 3, y: cy }];
    sGrab = .5; home = homeAt(sGrab);
    P = { x: home.x, y: home.y, vx: 0, vy: 0 };
    grab = false; amp = 0; relT = 0; vel = { x: 0, y: 0 }; downOk = false;
  }

  const gap = () => rest[1].x - rest[0].x;
  /* the latex runs post to post THROUGH the pulled point */
  const runLen = () => Math.hypot(P.x - rest[0].x, P.y - rest[0].y) +
                       Math.hypot(rest[1].x - P.x, rest[1].y - P.y);
  /* 0 at rest, 1 when the latex cannot give any more */
  const tension = () => clamp((runLen() / gap() - 1) / .9, 0, 1);
  /* how much spare length hangs between the posts */
  const slackness = () => clamp((1.06 - runLen() / gap()) / .12, 0, 1);

  /* keep the pulled point inside the card and short of the stretch the latex
     could survive */
  function clampP(x, y) {
    x = clamp(x, 13, g.w - 13);
    y = clamp(y, 44, g.h - 30);
    const lim = gap() * 1.9, a = rest[0], b = rest[1];
    if (Math.hypot(x - a.x, y - a.y) + Math.hypot(x - b.x, y - b.y) <= lim) return { x, y };
    /* walk back toward home until both arms fit inside the stretch */
    let lo = 0, hi = 1;
    for (let i = 0; i < 14; i++) {
      const t = (lo + hi) / 2, px = home.x + (x - home.x) * t, py = home.y + (y - home.y) * t;
      const d = Math.hypot(px - a.x, py - a.y) + Math.hypot(px - b.x, py - b.y);
      if (d > lim) hi = t; else lo = t;
    }
    return { x: home.x + (x - home.x) * lo, y: home.y + (y - home.y) * lo };
  }

  /* the finger is the truth: the latex sits under it, never trailing behind */
  function dragTo(p) {
    const t = clampP(p.x, p.y);
    vel.x = vel.x * .45 + (t.x - P.x) * .55;
    vel.y = vel.y * .45 + (t.y - P.y) * .55;
    P.x = t.x; P.y = t.y;
    relT = 0;
  }

  /* take hold of the band at the point nearest the finger */
  function holdAt(p) {
    const a = rest[0], b = rest[1];
    sGrab = clamp((p.x - a.x) / (b.x - a.x), .04, .96);
    home = homeAt(sGrab);
    const t = clampP(p.x, p.y);
    P.x = t.x; P.y = t.y;
    grab = true; relT = 0; vel = { x: 0, y: 0 };
  }

  /* how far the finger landed from the strand, in pixels */
  function offStrand(p) {
    const a = rest[0], b = rest[1];
    const vx = b.x - a.x, vy = b.y - a.y;
    const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy || 1), 0, 1);
    return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
  }

  function twang(t) {
    const p = 168 + t * 760 + (Math.random() - .5) * 26;
    sfx(p, .15 + t * .06, .05 + t * .03, 'triangle', p * .42);
    setTimeout(() => sfx(p * 2.01, .085, .018, 'sine', p * 1.5), 26);
    hap(9 + Math.round(t * 8));
  }

  function release() {
    if (!grab) return;
    const t = tension();
    grab = false; relT = 0;
    /* the snap carries the fling you gave it */
    P.vx = clamp(vel.x, -46, 46) * .72;
    P.vy = clamp(vel.y, -46, 46) * .72;
    twang(t);
    amp = Math.max(amp, 1.6 + t * 5);
  }

  function pluck() {
    amp = Math.max(amp, 20);
    ph = Math.PI / 2;
    const p = 320 + Math.random() * 150 + tension() * 200;
    sfx(p, .26, .05, 'triangle', p * .55);
    setTimeout(() => sfx(p * 1.5, .12, .016, 'sine'), 30);
    hap(7);
  }

  function step(dt) {
    /* sub-step so a long frame cannot throw the spring */
    const n = Math.max(1, Math.ceil(dt)), h = dt / n;
    for (let k = 0; k < n; k++) {
      if (grab) break;                /* held: the finger owns the position */
      const ax = (home.x - P.x) * .055, ay = (home.y - P.y) * .055;
      P.vx = (P.vx + ax * h) * Math.pow(.88, h);
      P.vy = (P.vy + ay * h) * Math.pow(.88, h);
      P.vx = clamp(P.vx, -60, 60); P.vy = clamp(P.vy, -60, 60);
      P.x += P.vx * h; P.y += P.vy * h;
      if (Math.abs(P.x - home.x) < .7 && Math.abs(P.y - home.y) < .7 &&
          Math.hypot(P.vx, P.vy) < .3) {
        P.x = home.x; P.y = home.y; P.vx = 0; P.vy = 0;
      }
    }
    if (!grab) {
      relT += dt;
      /* fail-safe: the band is never left hanging stretched */
      if (relT > 78) { P.x = home.x; P.y = home.y; P.vx = 0; P.vy = 0; }
    }
    if (amp > .02) { ph += .36 * dt; amp *= Math.pow(.955, dt); } else amp = 0;
    tnow += dt;
  }

  /* ---------- band geometry ---------- */
  function bandPts() {
    const a = rest[0], b = rest[1];
    /* a quadratic whose midpoint is exactly the pulled point, so the latex
       bends from post to post through your finger and lies straight at rest */
    const cx = 2 * P.x - (a.x + b.x) / 2, cy2 = 2 * P.y - (a.y + b.y) / 2;
    const sag = grab ? 0 : 3 + slackness() * slackness() * 30;
    const wave = amp * Math.sin(ph);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, u = 1 - s;
      const x = u * u * a.x + 2 * u * s * cx + s * s * b.x;
      const y = u * u * a.y + 2 * u * s * cy2 + s * s * b.y;
      pts.push({ s, x, y: y + sag * Math.sin(Math.PI * s) });
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

  /* the loose latex past each post, sagging when the band is slack */
  function tail(x, i, flat) {
    const e = rest[i], t = tension(), sgn = i === 0 ? -1 : 1;
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

  function grip(x, flat) {
    const away = Math.hypot(P.x - home.x, P.y - home.y);
    if (!grab && away < 1.2) {
      /* nothing held: a soft ring sits on the strand, where the hand goes */
      const pulse = .05 + .05 * (Math.sin(tnow * .09) + 1) / 2;
      x.beginPath(); x.arc(home.x, home.y, 13, 0, TAU);
      x.strokeStyle = flat ? 'rgba(36,26,58,' + pulse + ')' : 'rgba(255,255,255,' + pulse + ')';
      x.lineWidth = 1.2; x.stroke();
      return;
    }
    /* pinched: a bright collar where the fingers are */
    x.beginPath(); x.arc(P.x, P.y, 6.4, 0, TAU);
    x.fillStyle = flat ? '#fffdf8' : 'rgba(255,255,255,.92)'; x.fill();
    x.strokeStyle = flat ? '#241a3a' : 'rgba(255,255,255,.5)'; x.lineWidth = flat ? 1.4 : 1; x.stroke();
    x.beginPath(); x.arc(P.x - 1.4, P.y - 1.6, 1.5, 0, TAU); x.fillStyle = 'rgba(255,255,255,.75)'; x.fill();
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
    rest.forEach((_, i) => tail(x, i, flat));

    /* the band is hooked round each post: the wrap sits under it, so the
       latex reads as lying over the anchor */
    posts.forEach(p => {
      x.beginPath(); x.ellipse(p.x, p.y, posts[0].w * .86, posts[0].w * .66, 0, 0, TAU);
      x.strokeStyle = flat ? '#d63a7c' : '#c62c6c'; x.lineWidth = 4.4; x.stroke();
      x.strokeStyle = flat ? '#f0478f' : '#ef4a91'; x.lineWidth = 2.6; x.stroke();
    });
    drawBand(x, flat);
    grip(x, flat);

    K.label(x, 'PULL THE BAND', w / 2, 20, 11);
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

  K && window.DECIDER_GAMES.push({
    id: 'band', name: 'Rubber band', short: 'Band', label: 'Band', noResult: true, button: false,
    body: `<canvas class="toy" id="bdCv"></canvas>
      <div class="res" id="bdRes" aria-live="polite"><span class="muted">Pull the band, let it snap</span></div>`,
    init() {
      L = K.loop(frame); layout();
      const c = cv();
      c.addEventListener('pointerdown', e => {
        if (!g) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e);
        downAt = performance.now(); downX = p.x; downY = p.y;
        /* pressing on the latex takes hold of it; pressing empty card plucks */
        downOk = offStrand(p) < 46;
        if (downOk) { holdAt(p); K.press(300); }
      });
      c.addEventListener('pointermove', e => { if (grab) dragTo(at(e)); });
      const end = (e) => {
        const p = e && typeof e.clientX === 'number' ? at(e) : null;
        const moved = p ? Math.hypot(p.x - downX, p.y - downY) : 99;
        const tapped = moved < 7 && performance.now() - downAt < 420;
        if (downOk && grab) {
          if (tapped) {
            grab = false; P.x = home.x; P.y = home.y; P.vx = 0; P.vy = 0;
            pluck();
          } else release();
        } else if (!downOk && tapped) pluck();
        downOk = false;
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      if (cv().clientWidth) L.start();
    },
    enter() { layout(); amp = 0; grab = false; L.start(); },
    leave() {
      P.x = home.x; P.y = home.y; P.vx = 0; P.vy = 0;
      grab = false; amp = 0; downOk = false; L.stop();
    }
  });
})();
