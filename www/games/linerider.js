/* Line Rider — draw a track with your finger, then send a sled down it.
 * The line is the whole outcome: gravity is projected onto whatever you drew,
 * so downslopes speed you up, upslopes cost you, and the end of the line is a crash. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const cv = () => document.getElementById('lrCv');
  const res = () => document.getElementById('lrRes');
  const rnd = window.rnd || Math.random;

  const GRAV = 1350;      // px / s²
  const R = 8;            // contact radius of the sled
  const MAXPT = 900;

  let L = null, geo = { w: 0, h: 0 };
  let strokes = [], segs = [], stroke = null, ptCount = 0;
  let rider = null, parts = [], dist = 0, stalled = 0, spray = 0, shown = -1;
  let running = false, paused = false, crashed = false, over = false;

  /* ---------- track ---------- */
  function addSeg(a, b) {
    const ex = b.x - a.x, ey = b.y - a.y;
    segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, ex, ey, l2: Math.max(1, ex * ex + ey * ey) });
  }

  function rebuild() {
    segs = [];
    strokes.forEach(s => { for (let i = 1; i < s.length; i++) addSeg(s[i - 1], s[i]); });
    ptCount = strokes.reduce((n, s) => n + s.length, 0);
  }

  function addPoint(p) {
    if (!stroke || ptCount >= MAXPT) return;
    const last = stroke[stroke.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 3.5) return;
    stroke.push(p);
    ptCount++;
    if (last) addSeg(last, p);
  }

  function rescale(nw) {
    const k = nw / geo.w;
    strokes.forEach(s => s.forEach(p => { p.x *= k; p.y *= k; }));
    rebuild();
    if (rider) { rider.x *= k; rider.y *= k; rider.px = null; }
    parts = [];
  }

  function clearAll() {
    strokes = []; segs = []; stroke = null; ptCount = 0;
    rider = null; parts = []; dist = 0;
    running = false; paused = false; crashed = false; over = false;
    sync();
    K.setResult(res(), 'Drag on the snow to draw a track');
  }

  /* ---------- sled ---------- */
  function spawn() {
    let hp = null, hs = 0, hi = 0;
    strokes.forEach((s, si) => s.forEach((p, i) => {
      if (!hp || p.y < hp.y) { hp = p; hs = si; hi = i; }
    }));
    if (!hp) return false;
    const s = strokes[hs];
    const a = s[Math.max(0, hi - 4)] || hp, b = s[Math.min(s.length - 1, hi + 4)] || hp;
    let tx = b.x - a.x, ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    if (ty < 0) { tx = -tx; ty = -ty; }            // always launch downhill
    if (Math.abs(ty) < 0.05) { tx = 1; ty = 0; }
    rider = {
      x: hp.x - tx * 3, y: hp.y - R - 3,
      vx: tx * 90, vy: ty * 90,
      ang: Math.atan2(ty, tx), px: null, py: null, onGround: false, speed: 0
    };
    dist = 0; stalled = 0; spray = 0; shown = -1;
    return true;
  }

  function contact(r, h) {
    let bd = Infinity, dx0 = 0, dy0 = 0;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      let t = ((r.x - s.x1) * s.ex + (r.y - s.y1) * s.ey) / s.l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = r.x - (s.x1 + s.ex * t), dy = r.y - (s.y1 + s.ey * t);
      const d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; dx0 = dx; dy0 = dy; }
    }
    r.onGround = false;
    if (bd > R * R) return;
    const d = Math.sqrt(bd);
    const nx = d > 0.001 ? dx0 / d : 0, ny = d > 0.001 ? dy0 / d : -1;
    r.x += nx * (R - d);
    r.y += ny * (R - d);
    const vn = r.vx * nx + r.vy * ny;
    if (vn < 0) {                                   // kill the bite into the snow, keep the slide
      r.vx -= vn * nx * 1.06;
      r.vy -= vn * ny * 1.06;
      if (-vn > 320) burst(r.x, r.y, Math.min(9, -vn / 90));
    }
    const fr = Math.max(0, 1 - 0.5 * h);            // a little wax under the runners
    r.vx *= fr; r.vy *= fr;
    r.onGround = true;
  }

  function physics(dt) {
    const r = rider;
    if (!r) return;
    const sp = Math.hypot(r.vx, r.vy);
    const steps = Math.min(12, Math.max(1, Math.ceil((sp * dt) / 3.5)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      r.vy += GRAV * h;
      r.x += r.vx * h;
      r.y += r.vy * h;
      contact(r, h);
    }
    const speed = Math.hypot(r.vx, r.vy);
    if (speed > 1700) { r.vx *= 1700 / speed; r.vy *= 1700 / speed; }
    r.speed = Math.hypot(r.vx, r.vy);
    if (r.px !== null) dist += Math.hypot(r.x - r.px, r.y - r.py) / 10;
    r.px = r.x; r.py = r.y;

    const want = r.speed > 24 ? Math.atan2(r.vy, r.vx) : r.ang;
    let da = want - r.ang;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    r.ang += da * Math.min(1, dt * 12);

    if (r.onGround) { if (r.speed < 30) stalled += dt; else stalled = 0; }

    if (r.onGround && r.speed > 190) {
      spray += dt * 26;
      while (spray > 1) {
        spray--;
        parts.push({
          x: r.x - Math.cos(r.ang) * 6, y: r.y + R - 2,
          vx: -r.vx * .18 + (rnd() - .5) * 60,
          vy: -r.vy * .18 - 30 - rnd() * 60,
          life: .35 + rnd() * .3, max: .65, r: .8 + rnd() * 1.3, c: '#e8f2ff'
        });
      }
    }
  }

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (rnd() - .5) * 2.2;
      parts.push({
        x, y, vx: Math.cos(a) * (40 + rnd() * 150), vy: Math.sin(a) * (40 + rnd() * 120),
        life: .5 + rnd() * .5, max: 1, r: 1 + rnd() * 1.8, c: i % 3 ? '#e8f2ff' : '#9fd0ff'
      });
    }
  }

  function crash() {
    if (rider) burst(Math.max(12, Math.min(geo.w - 12, rider.x)), Math.max(12, Math.min(geo.h - 12, rider.y)), 16);
    running = false; paused = false; crashed = true; over = true;
    try { tone(140, .18, .07, 'sawtooth', 55); } catch (e) {}
    try { buzz(45); } catch (e) {}
    sync();
  }

  /* ---------- ui ---------- */
  function sync() {
    const b = document.getElementById('lrGo');
    if (b) {
      b.textContent = running ? (paused ? '▶ Resume' : '❚❚ Pause') : (over ? '↻ Again' : '▶ Go');
      b.classList.toggle('on', running && !paused);
    }
    if (crashed) K.setResult(res(), 'Crashed · ' + Math.round(dist) + ' m — draw a ramp');
    else if (!strokes.length) K.setResult(res(), 'Drag on the snow to draw a track');
    else if (!running) K.setResult(res(), 'Ready — press Go');
  }

  function tickText() {
    const m = Math.round(dist);
    if (m === shown) return;
    shown = m;
    K.setResult(res(), m + ' m · ' + Math.round(rider ? rider.speed * .06 : 0) + ' km/h');
  }

  /* ---------- drawing ---------- */
  function path(x, pts) {
    x.beginPath();
    x.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      x.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    x.lineTo(last.x, last.y);
  }

  function sled(x, r) {
    const sp = Math.min(1, r.speed / 700);
    x.save();
    x.translate(r.x, r.y);
    x.rotate(r.ang);
    x.scale(1.18, 1.18);
    /* spray glow behind */
    if (sp > .16) {
      const g = x.createLinearGradient(-26, 0, 0, 0);
      g.addColorStop(0, 'rgba(190,225,255,0)');
      g.addColorStop(1, 'rgba(190,225,255,' + (.22 + sp * .3).toFixed(2) + ')');
      x.fillStyle = g;
      x.beginPath(); x.moveTo(-28, -4); x.lineTo(0, -3); x.lineTo(0, 8); x.lineTo(-28, 11); x.closePath(); x.fill();
    }
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = '#0b1224'; x.lineWidth = 2.6;
    x.beginPath(); x.moveTo(-10, 7.6); x.lineTo(5, 7.6); x.quadraticCurveTo(11.5, 7.6, 10, 1.6); x.stroke();
    x.beginPath(); x.moveTo(-10, 7.6); x.lineTo(-12.6, 4.4); x.stroke();
    K.rr(x, -7.5, 2.6, 15, 2.6, 1.3); x.fillStyle = '#dae7ff'; x.fill();
    /* rider */
    x.strokeStyle = PAL[0] || '#8f7dff'; x.lineWidth = 3.8;
    x.beginPath(); x.moveTo(1.8, 2.2); x.lineTo(-1.4, -4.4); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(1.2, 1.4); x.lineTo(-1.2, -3.6); x.stroke();
    x.beginPath(); x.arc(0.4, -7, 3.1, 0, TAU); x.fillStyle = '#ffcf6a'; x.fill();
    x.strokeStyle = 'rgba(40,20,80,.55)'; x.lineWidth = 1; x.stroke();
    x.beginPath(); x.moveTo(-1.4, -8.6); x.lineTo(2.8, -10); x.lineTo(1.2, -7.4); x.closePath();
    x.fillStyle = PAL[2] || '#ff7a3d'; x.fill();
    x.restore();
  }

  function hud(x, w) {
    x.save();
    x.textAlign = 'left'; x.textBaseline = 'top';
    x.fillStyle = 'rgba(255,255,255,.92)';
    x.font = '800 20px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillText(Math.round(dist) + ' m', 14, 12);
    x.fillStyle = 'rgba(190,215,255,.62)';
    x.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillText((rider ? Math.round(rider.speed * .06) : 0) + ' km/h', 14, 36);
    if (!strokes.length) {
      x.textAlign = 'center';
      x.fillStyle = 'rgba(210,228,255,.5)';
      x.font = '700 12px "Bricolage Grotesque",system-ui,sans-serif';
      x.fillText('drag to draw your descent', w / 2, 16);
    }
    x.restore();
  }

  function draw(g) {
    const x = g.x, w = g.w, h = g.h;
    x.clearRect(0, 0, w, h);
    x.save();
    K.rr(x, 0, 0, w, h, 18);
    const bg = x.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#16233d'); bg.addColorStop(.55, '#0e1729'); bg.addColorStop(1, '#070c17');
    x.fillStyle = bg; x.fill();
    x.clip();
    const aur = x.createRadialGradient(w * .5, -h * .12, 8, w * .5, -h * .12, h * .85);
    aur.addColorStop(0, 'rgba(126,168,255,.28)'); aur.addColorStop(.6, 'rgba(88,90,200,.07)'); aur.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = aur; x.fillRect(0, 0, w, h);

    /* the track */
    if (strokes.length) {
      x.save();
      x.lineCap = 'round'; x.lineJoin = 'round';
      strokes.forEach(s => {
        if (s.length < 2) return;
        x.shadowColor = 'rgba(122,170,255,.55)'; x.shadowBlur = 14;
        x.strokeStyle = '#9ec6ff'; x.lineWidth = 6.5; path(x, s); x.stroke();
        x.shadowBlur = 0;
        x.strokeStyle = 'rgba(245,251,255,.96)'; x.lineWidth = 3; path(x, s); x.stroke();
      });
      x.restore();
      /* launch flag at the high point */
      let hp = null;
      strokes.forEach(s => s.forEach(p => { if (!hp || p.y < hp.y) hp = p; }));
      if (hp) {
        x.save();
        x.beginPath(); x.arc(hp.x, hp.y, 4.5, 0, TAU);
        x.fillStyle = '#ffd76a'; x.fill();
        x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.4; x.stroke();
        x.restore();
      }
    }

    parts.forEach(p => {
      x.globalAlpha = Math.max(0, Math.min(1, p.life / p.max)) * .9;
      x.fillStyle = p.c;
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill();
    });
    x.globalAlpha = 1;

    if (rider) sled(x, rider);
    x.restore();

    x.save();
    K.rr(x, .75, .75, w - 1.5, h - 1.5, 18);
    x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1.5; x.stroke();
    x.restore();
    hud(x, w);
  }

  /* ---------- loop ---------- */
  function frame(dt) {
    const c = cv();
    if (!c || !c.clientWidth) return;
    const g = K.fit(c);
    if (geo.w && Math.abs(g.w - geo.w) > 2) rescale(g.w);
    geo = g;
    const st = Math.min(.05, dt / 60);
    if (running && !paused) {
      physics(st);
      if (rider) {
        const off = rider.y > g.h + 26 || rider.x < -34 || rider.x > g.w + 34;
        if (off) crash();
        else if (stalled > 1.1) {
          running = false; over = true;
          sync();
          K.setResult(res(), 'Out of momentum · ' + Math.round(dist) + ' m — draw a steeper start');
        }
      }
    }
    parts.forEach(p => { p.vy += 900 * st; p.x += p.vx * st; p.y += p.vy * st; p.life -= st; });
    parts = parts.filter(p => p.life > 0);
    if (running && !paused) tickText();
    draw(g);
  }

  const at = (e) => {
    const r = cv().getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function toggle() {
    if (!strokes.length && !stroke) { K.setResult(res(), 'Draw a track first — drag on the snow'); return; }
    if (running) { paused = !paused; sync(); return; }
    if (!rider || over) { crashed = false; over = false; parts = []; if (!spawn()) return; }
    running = true; paused = false;
    try { tone(280, .14, .045, 'sawtooth', 540); } catch (e) {}
    sync();
  }

  K && window.DECIDER_GAMES.push({
    id: 'linerider', name: 'Line Rider', short: 'Line Rider', label: 'Track', button: false,
    body: `<div class="chips" id="lrBar" style="margin:0 0 10px;gap:8px">
        <button class="chip" id="lrGo">▶ Go</button>
        <button class="chip" id="lrClear">↺ Clear</button>
      </div>
      <canvas class="toy" id="lrCv"></canvas>
      <div class="res" id="lrRes" aria-live="polite" style="min-height:26px;font-size:calc(clamp(14px,3.3vw,17px)*var(--fs,1))"><span class="muted">Drag on the snow to draw a track</span></div>`,
    init(card) {
      L = K.loop(frame);
      card.querySelector('#lrGo').onclick = toggle;
      card.querySelector('#lrClear').onclick = clearAll;
      const c = cv();
      c.addEventListener('pointerdown', (e) => {
        if (e.button || running) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e);
        stroke = [p]; strokes.push(stroke); ptCount++;
      });
      c.addEventListener('pointermove', (e) => { if (stroke && !running) addPoint(at(e)); });
      const end = () => { stroke = null; sync(); };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      sync();
    },
    enter() { L.start(); },
    leave() { L.stop(); stroke = null; },
    action() { toggle(); }
  });
})();
