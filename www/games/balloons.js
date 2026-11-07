/* Balloons — a bobbing grid you pop for the feel of it. Nothing is decided and
 * nothing is printed: a tap is a pop, and the twelfth pop fades a fresh grid
 * back in on its own, so there is no reset button to hunt for. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  const cv = () => document.getElementById('blCv');
  const TAU = Math.PI * 2;
  const COLS = 4, ROWS = 3, TOP = 46, BOT = 84;
  let L = null, g = null, bs = [], parts = [], popped = 0;
  let bw = 0, bh = 0, refillIn = 0, fade = 1;

  /* geometry only: jitter, colour and live flag survive a resize, so a rotation
     never hands the player a fresh grid mid-pop */
  function place() {
    const cw = g.w / COLS, ch = (g.h - BOT) / ROWS;
    const r = Math.min(cw, ch) * 0.37;
    bs.forEach((b, i) => {
      const cx = i % COLS, ry = (i / COLS) | 0;
      b.x = (cx + 0.5) * cw + b.jx;
      b.y = TOP + (ry + 0.4) * ch + b.jy;
      b.r = r * b.rs;
      b.bx = b.x; b.by = b.y;
    });
    bw = g.w; bh = g.h;
  }

  function grid() {
    bs = []; popped = 0; refillIn = 0;
    for (let i = 0; i < COLS * ROWS; i++) {
      bs.push({
        jx: (Math.random() - 0.5) * 8,
        jy: (Math.random() - 0.5) * 10,
        rs: 0.92 + Math.random() * 0.14,
        col: PAL[i % PAL.length],
        ph: Math.random() * TAU,
        sp: 0.8 + Math.random() * 0.5,
        live: true, x: 0, y: 0, r: 0, bx: 0, by: 0
      });
    }
    place();
  }

  function balloon(x, b, now) {
    const bob = Math.sin(now / 620 * b.sp + b.ph) * 5;
    const sway = Math.sin(now / 980 * b.sp + b.ph) * 3;
    const bx = b.x + sway, by = b.y + bob;
    b.bx = bx; b.by = by;
    if (!b.live) return;

    const m = K.mat();

    x.beginPath();
    x.moveTo(bx, by + b.r * 1.12);
    x.bezierCurveTo(bx + 9, by + b.r * 1.6, bx - 11, by + b.r * 1.95, bx + 4, by + b.r * 2.35);
    x.strokeStyle = INK(.5); x.lineWidth = 1.2; x.stroke();

    x.save();
    x.beginPath(); x.ellipse(bx, by, b.r, b.r * 1.16, 0, 0, TAU);
    const gr = x.createRadialGradient(bx - b.r * .35, by - b.r * .45, 2, bx, by, b.r * 1.25);
    gr.addColorStop(0, K.light(.95));
    gr.addColorStop(.32, b.col);
    gr.addColorStop(1, b.col);
    x.fillStyle = gr; x.fill();
    /* paper gets a drawn edge: a riso balloon is a cut-out, not a glow */
    if (m.flat) {
      x.strokeStyle = m.outline || '#241a3a';
      x.lineWidth = 1.5;
      x.stroke();
    }
    x.save(); x.clip();
    const sh = x.createLinearGradient(0, by - b.r, 0, by + b.r * 1.2);
    sh.addColorStop(0, K.light(.25));
    sh.addColorStop(.55, INK(0));
    sh.addColorStop(1, m.flat ? 'rgba(36,26,58,.16)' : 'rgba(20,8,50,.35)');
    x.fillStyle = sh; x.fillRect(bx - b.r, by - b.r * 1.2, b.r * 2, b.r * 2.4);
    x.beginPath(); x.ellipse(bx - b.r * .34, by - b.r * .5, b.r * .26, b.r * .34, -.5, 0, TAU);
    x.fillStyle = K.light(.7); x.fill();
    x.restore();

    x.beginPath(); x.moveTo(bx - 5, by + b.r * 1.06); x.lineTo(bx + 5, by + b.r * 1.06); x.lineTo(bx, by + b.r * 1.22);
    x.closePath(); x.fillStyle = b.col; x.fill();
    if (m.flat) { x.strokeStyle = m.outline || '#241a3a'; x.lineWidth = 1.2; x.stroke(); }

    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = INK(.45);
    x.font = `800 ${Math.round(b.r * 0.85)}px "Bricolage Grotesque",system-ui,sans-serif`;
    x.fillText('?', bx, by + 1);
    x.restore();
  }

  function burst(b) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU, s = 1 + Math.random() * 3.4;
      parts.push({ x: b.bx, y: b.by, vx: Math.cos(a) * s, vy: Math.sin(a) * s - .8, r: 1 + Math.random() * 2.4, life: 1, col: b.col });
    }
    parts.push({ x: b.bx, y: b.by, ring: 1, r: b.r, life: 1, col: b.col });
  }

  /* the chime that says "fresh grid" without a single word */
  function chime() {
    try { tone(784, .18, .045, 'sine', 792); } catch (e) {}
    setTimeout(() => { try { tone(1175, .26, .04, 'sine'); } catch (e) {} }, 90);
    try { buzz([4, 40, 6]); } catch (e) {}
  }

  function pop(b) {
    if (!b.live) return;
    b.live = false;
    popped++;
    burst(b);
    try { tone(520 + Math.random() * 180, .09, .06, 'sine', 250); } catch (e) {}
    try { buzz(7); } catch (e) {}
    if (popped >= bs.length) refillIn = 560;
  }

  function draw(dt, now) {
    const c = cv();
    if (!c) return;
    g = K.fit(c);
    if (Math.abs(g.w - bw) > 1 || Math.abs(g.h - bh) > 1) place();
    const x = g.x;
    x.clearRect(0, 0, g.w, g.h);

    /* one static hint for the whole life of the toy — it never reacts to a pop */
    K.label(x, 'tap a balloon', g.w / 2, 21, 11);

    /* the beat between the last pop and the next grid */
    if (refillIn > 0) {
      refillIn -= dt * 16.667;
      if (refillIn <= 0) { refillIn = 0; grid(); fade = 0; chime(); }
    }
    if (fade < 1) fade = Math.min(1, fade + dt * 0.045);

    x.save();
    x.globalAlpha = fade;
    bs.forEach(b => balloon(x, b, now));
    x.restore();

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt * 0.022;
      if (p.ring) {
        p.r += dt * 1.6;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU);
        x.strokeStyle = p.col; x.globalAlpha = Math.max(0, p.life) * .5; x.lineWidth = 2; x.stroke();
        x.globalAlpha = 1;
      } else {
        p.vy += 0.14 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt;
        x.globalAlpha = Math.max(0, p.life);
        x.fillStyle = p.col;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill();
        x.globalAlpha = 1;
      }
      if (p.life <= 0) parts.splice(i, 1);
    }
  }

  let warned = false;
  function tick(dt, now) {
    try { draw(dt, now); }
    catch (e) { if (!warned) { warned = true; console.warn('balloons frame', e); } }
  }

  function at(e) {
    const r = cv().getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    let best = null, bd = 1e9;
    bs.forEach(b => {
      if (!b.live) return;
      const d = Math.hypot(px - b.bx, py - b.by);
      if (d < b.r * 1.18 && d < bd) { bd = d; best = b; }
    });
    return best;
  }

  K && window.DECIDER_GAMES.push({
    id: 'balloons', name: 'Balloons', short: 'Balloons',
    noResult: true, button: false,
    body: `<canvas class="toy" id="blCv"></canvas>`,
    init() {
      L = K.loop(tick);
      g = K.fit(cv());
      grid();
      cv().addEventListener('pointerdown', e => { const b = at(e); if (b) pop(b); });
      if (cv().clientWidth) L.start();
    },
    enter() {
      g = K.fit(cv());
      if (Math.abs(g.w - bw) > 1 || Math.abs(g.h - bh) > 1) place();
      L.start();
    },
    leave() { L.stop(); },
    action() {
      const live = bs.filter(b => b.live);
      if (live.length) pop(live[(Math.random() * live.length) | 0]);
    }
  });
})();
