/* Blek — draw one continuous line. Let go and it becomes a traveller:
 * the shape you drew slides across the pit, bouncing off the walls forever,
 * lighting the dots it touches. Nothing is random — the line is yours. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const cv = () => document.getElementById('bkCv');
  const res = () => document.getElementById('bkRes');

  const DOTC = ['#ffd76a', '#7bdcff', '#ff8ad1', '#9dffb0', '#c0a6ff'];
  const SPOTS = [[.24, .18], [.77, .24], [.16, .56], [.83, .60], [.50, .80]];
  const MAXPT = 420;

  let L = null, geo = { w: 0, h: 0 };
  let pts = [], drawing = false, body = null, targets = [], flashes = [], lit = 0, celebrated = false;
  let t0 = 0, travelled = 0, pulse = 0;

  /* ---------- layout ---------- */
  function layout(g) {
    if (Math.abs(g.w - geo.w) > 2 && geo.w) {
      const k = g.w / geo.w;
      pts.forEach(p => { p.x *= k; p.y *= k; });
      if (body) {
        body.x *= k; body.y *= k;
        body.rel.forEach(r => { r.x *= k; r.y *= k; });
        [body.minX, body.maxX, body.minY, body.maxY] = [body.minX * k, body.maxX * k, body.minY * k, body.maxY * k];
      }
      flashes = [];
    }
    geo = g;
    targets.forEach((t, i) => {
      t.x = g.w * SPOTS[i][0];
      t.y = g.h * SPOTS[i][1];
      t.r = Math.max(11, Math.min(15, g.w * .032));
    });
  }

  function resetTargets() {
    targets = SPOTS.map((s, i) => ({
      x: geo.w * s[0], y: geo.h * s[1], r: Math.max(11, Math.min(15, geo.w * .032)),
      c: DOTC[i % DOTC.length], lit: false, pulse: 0
    }));
    lit = 0; celebrated = false;
  }

  function reset() {
    pts = []; drawing = false; body = null; flashes = [];
    resetTargets();
    K.setResult(res(), 'Draw one line, then watch it loop');
  }

  /* ---------- stroke ---------- */
  function addPoint(p) {
    const last = pts[pts.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 3.5) return;
    if (pts.length >= MAXPT) return;
    if (last) travelled += Math.hypot(p.x - last.x, p.y - last.y);
    pts.push(p);
  }

  function makeBody() {
    if (pts.length < 4) { pts = []; return; }
    let cx = 0, cy = 0;
    pts.forEach(p => { cx += p.x; cy += p.y; });
    cx /= pts.length; cy /= pts.length;
    const rel = pts.map(p => ({ x: p.x - cx, y: p.y - cy }));
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    rel.forEach(r => {
      minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x);
      minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y);
    });
    const k = Math.min(8, pts.length - 1);
    let dx = pts[pts.length - 1].x - pts[pts.length - 1 - k].x;
    let dy = pts[pts.length - 1].y - pts[pts.length - 1 - k].y;
    const dl = Math.hypot(dx, dy);
    if (dl < 1) { dx = 1; dy = 0; } else { dx /= dl; dy /= dl; }
    /* how fast you drew is how fast it travels */
    const dur = Math.max(1, performance.now() - t0);
    const rate = Math.max(0, Math.min(1.4, travelled / dur));
    const speed = 80 + rate * 130;
    body = {
      x: cx, y: cy, vx: dx * speed, vy: dy * speed, speed,
      rel, minX, maxX, minY, maxY, age: 0
    };
    pts = pts.slice();       // keep for the "ghost" of where you drew it
    K.setResult(res(), '0 / ' + targets.length + ' dots — draw again to change the line');
  }

  /* ---------- motion ---------- */
  function bounce(x, y, vertical) {
    flashes.push({ x, y, life: 1, vertical });
    try { tone(vertical ? 200 : 240, .05, .022, 'sine', 160); } catch (e) {}
  }

  function update(dt) {
    if (!body) return;
    const b = body;
    b.age += dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const pad = 7;
    let bounced = false;
    if (b.maxX - b.minX < geo.w - pad * 2) {
      if (b.x + b.minX < pad) { b.x = pad - b.minX; b.vx = Math.abs(b.vx); bounce(pad, b.y, true); bounced = true; }
      else if (b.x + b.maxX > geo.w - pad) { b.x = geo.w - pad - b.maxX; b.vx = -Math.abs(b.vx); bounce(geo.w - pad, b.y, true); bounced = true; }
    }
    if (b.maxY - b.minY < geo.h - pad * 2) {
      if (b.y + b.minY < pad) { b.y = pad - b.minY; b.vy = Math.abs(b.vy); bounce(b.x, pad, false); bounced = true; }
      else if (b.y + b.maxY > geo.h - pad) { b.y = geo.h - pad - b.maxY; b.vy = -Math.abs(b.vy); bounce(b.x, geo.h - pad, false); bounced = true; }
    }
    if (bounced) {
      const s = Math.hypot(b.vx, b.vy) || 1;
      b.vx = b.vx / s * b.speed;
      b.vy = b.vy / s * b.speed;
    }

    /* touch the dots */
    for (let ti = 0; ti < targets.length; ti++) {
      const t = targets[ti];
      if (t.lit) continue;
      let hit = false;
      for (let i = 0; i < b.rel.length; i++) {
        const dx = b.x + b.rel[i].x - t.x, dy = b.y + b.rel[i].y - t.y;
        if (dx * dx + dy * dy < (t.r + 2) * (t.r + 2)) { hit = true; break; }
      }
      if (hit) {
        t.lit = true; t.pulse = 1; lit++;
        try { tone(520 + ti * 90, .12, .05, 'sine', 900 + ti * 90); } catch (e) {}
        try { buzz(12); } catch (e) {}
        if (lit === targets.length && !celebrated) {
          celebrated = true;
          try { confetti(); } catch (e) {}
          try { tone(660, .16, .05, 'sine', 990); } catch (e) {}
          try { tone(990, .22, .04, 'sine', 1320); } catch (e) {}
          K.setResult(res(), 'All ' + targets.length + ' dots lit — now draw a wilder line');
        } else {
          K.setResult(res(), lit + ' / ' + targets.length + ' dots — draw again to change the line');
        }
      }
    }
    flashes.forEach(f => { f.life -= dt * 2.4; });
    flashes = flashes.filter(f => f.life > 0);
    targets.forEach(t => { if (t.pulse > 0) t.pulse = Math.max(0, t.pulse - dt * 2.2); });
    pulse += dt;
  }

  /* ---------- draw ---------- */
  function strokePath(x, arr, ox, oy) {
    x.beginPath();
    x.moveTo(arr[0].x + ox, arr[0].y + oy);
    for (let i = 1; i < arr.length - 1; i++) {
      const mx = (arr[i].x + arr[i + 1].x) / 2 + ox, my = (arr[i].y + arr[i + 1].y) / 2 + oy;
      x.quadraticCurveTo(arr[i].x + ox, arr[i].y + oy, mx, my);
    }
    const l = arr[arr.length - 1];
    x.lineTo(l.x + ox, l.y + oy);
  }

  function draw(g) {
    const x = g.x, w = g.w, h = g.h;
    x.clearRect(0, 0, w, h);
    x.save();
    K.rr(x, 0, 0, w, h, 18);
    const bg = x.createLinearGradient(0, 0, w * .3, h);
    bg.addColorStop(0, '#1b1440'); bg.addColorStop(.55, '#120e2c'); bg.addColorStop(1, '#0a0718');
    x.fillStyle = bg; x.fill();
    x.clip();
    const glow = x.createRadialGradient(w * .5, h * .42, 10, w * .5, h * .5, Math.max(w, h) * .7);
    glow.addColorStop(0, 'rgba(120,96,255,.20)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = glow; x.fillRect(0, 0, w, h);
    /* faint dot grid, so the pit feels like a place */
    x.fillStyle = 'rgba(255,255,255,.055)';
    for (let gx = 22; gx < w; gx += 44) for (let gy = 22; gy < h; gy += 44) {
      x.beginPath(); x.arc(gx, gy, 1.1, 0, TAU); x.fill();
    }

    /* targets */
    targets.forEach(t => {
      const pr = t.r * (1 + (t.lit ? 0 : Math.sin(pulse * 1.6 + t.x) * .04));
      x.save();
      if (t.lit) {
        x.shadowColor = t.c; x.shadowBlur = 18;
        x.beginPath(); x.arc(t.x, t.y, pr * .74, 0, TAU);
        x.fillStyle = t.c; x.fill();
        x.shadowBlur = 0;
        x.beginPath(); x.arc(t.x, t.y, pr * (1.25 + t.pulse * .9), 0, TAU);
        x.strokeStyle = t.c; x.globalAlpha = .25 + t.pulse * .6; x.lineWidth = 2; x.stroke();
        x.globalAlpha = 1;
        x.beginPath(); x.arc(t.x, t.y, pr * .34, 0, TAU);
        x.fillStyle = 'rgba(255,255,255,.92)'; x.fill();
      } else {
        x.beginPath(); x.arc(t.x, t.y, pr, 0, TAU);
        x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 1.6; x.stroke();
        x.beginPath(); x.arc(t.x, t.y, pr * .30, 0, TAU);
        x.fillStyle = t.c; x.globalAlpha = .75; x.fill();
        x.globalAlpha = 1;
      }
      x.restore();
    });

    /* the line you drew stays as a ghost where you left it */
    if (body && pts.length > 3) {
      x.save();
      x.globalAlpha = .13;
      x.strokeStyle = '#dfe6ff'; x.lineWidth = 3; x.lineCap = 'round'; x.lineJoin = 'round';
      strokePath(x, pts, 0, 0); x.stroke();
      x.restore();
    } else if (drawing && pts.length > 1) {
      x.save();
      x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3.2;
      x.lineCap = 'round'; x.lineJoin = 'round';
      x.shadowColor = 'rgba(160,190,255,.7)'; x.shadowBlur = 12;
      strokePath(x, pts, 0, 0); x.stroke();
      x.restore();
    }

    /* the traveller */
    if (body && body.rel.length > 1) {
      const b = body;
      x.save();
      x.translate(b.x, b.y);
      x.lineCap = 'round'; x.lineJoin = 'round';
      const lg = x.createLinearGradient(b.minX, b.minY, b.maxX, b.maxY);
      lg.addColorStop(0, PAL[0] || '#8f7dff');
      lg.addColorStop(.5, PAL[2] || '#ff7a3d');
      lg.addColorStop(1, PAL[4] || '#4ad6ff');
      x.shadowColor = 'rgba(150,170,255,.75)'; x.shadowBlur = 16;
      x.strokeStyle = lg; x.lineWidth = 6; strokePath(x, b.rel, 0, 0); x.stroke();
      x.shadowBlur = 0;
      x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 2.1; strokePath(x, b.rel, 0, 0); x.stroke();
      /* head and tail */
      const head = b.rel[b.rel.length - 1], tail = b.rel[0];
      x.beginPath(); x.arc(head.x, head.y, 5, 0, TAU);
      x.fillStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 12; x.fill();
      x.shadowBlur = 0;
      x.beginPath(); x.arc(tail.x, tail.y, 3, 0, TAU);
      x.fillStyle = 'rgba(255,255,255,.8)'; x.fill();
      x.restore();
    }

    /* wall hits */
    flashes.forEach(f => {
      const a = Math.max(0, f.life);
      x.save();
      x.globalAlpha = a * .8;
      x.strokeStyle = '#cfe0ff'; x.lineWidth = 2;
      x.beginPath();
      if (f.vertical) x.ellipse(f.x, f.y, 5 + (1 - a) * 22, 16 + (1 - a) * 30, 0, 0, TAU);
      else x.ellipse(f.x, f.y, 16 + (1 - a) * 30, 5 + (1 - a) * 22, 0, 0, TAU);
      x.stroke();
      x.restore();
    });

    if (!body && !drawing) {
      x.save();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(226,235,255,.5)';
      x.font = '700 12px "Bricolage Grotesque",system-ui,sans-serif';
      x.fillText('one stroke — it repeats forever', w / 2, h - 26);
      x.restore();
    }
    x.restore();

    x.save();
    K.rr(x, .75, .75, w - 1.5, h - 1.5, 18);
    x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1.5; x.stroke();
    x.restore();
  }

  /* ---------- loop ---------- */
  function frame(dt) {
    const c = cv();
    if (!c || !c.clientWidth) return;
    const g = K.fit(c);
    layout(g);
    const st = Math.min(.05, dt / 60);
    update(st);
    draw(g);
  }

  const at = (e) => {
    const r = cv().getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  K && window.DECIDER_GAMES.push({
    id: 'blek', name: 'Blek', short: 'Blek', label: 'Line', button: false,
    body: `<div class="chips" id="bkBar" style="margin:0 0 10px;gap:8px">
        <button class="chip" id="bkReset">↺ Reset</button>
        <span class="muted" style="font-size:calc(12.5px*var(--fs,1));align-self:center">draw once — it loops</span>
      </div>
      <canvas class="toy" id="bkCv"></canvas>
      <div class="res" id="bkRes" aria-live="polite" style="min-height:26px;font-size:calc(clamp(14px,3.3vw,17px)*var(--fs,1))"><span class="muted">Draw one line, then watch it loop</span></div>`,
    init(card) {
      L = K.loop(frame);
      card.querySelector('#bkReset').onclick = reset;
      reset();
      const c = cv();
      c.addEventListener('pointerdown', (e) => {
        if (e.button) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        resetTargets();
        body = null; flashes = []; pts = []; travelled = 0;
        t0 = performance.now();
        drawing = true;
        pts.push(at(e));
        K.setResult(res(), '0 / ' + targets.length + ' dots — keep drawing');
      });
      c.addEventListener('pointermove', (e) => { if (drawing) addPoint(at(e)); });
      const end = () => {
        if (!drawing) return;
        drawing = false;
        makeBody();
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
    },
    enter() { L.start(); },
    leave() { L.stop(); drawing = false; },
    action() {                       // fallback: give the traveller a new heading
      if (!body) { K.setResult(res(), 'Draw a line first — one continuous stroke'); return; }
      body.vx = -body.vx; body.vy = -body.vy;
      flashes.push({ x: body.x, y: body.y, life: 1, vertical: true });
      try { tone(300, .08, .04, 'triangle', 420); } catch (e) {}
    }
  });
})();
