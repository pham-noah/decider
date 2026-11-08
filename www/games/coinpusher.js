/* Coin Pusher — feed a coin into the window; the pusher sweeps the pile off the lip and
 * coins drop into the tray. Coins are rigid discs: they never overlap, never sink, and the
 * plate only moves what it is actually touching. Tap the slot to feed, nothing else. */
(function () {
  const K = window.DKIT;
  if (!K) return;
  const cv = () => document.getElementById('cpCv');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- cabinet ---------- */
  let lastDrop = null;
  let G = null, L = null;
  let shelf = [], tray = [], won = 0, phase = 0.5, acc = 0, pulse = 0, fed = 0;
  let labels = [];

  const SPEED = 1.9;           // rad/s of the crank: one shove every ~3.3s
  const FIX = 1 / 240;
  const GRAV = 1500;           // px/s^2 in the tray

  function geom() {
    const c = cv(); if (!c) return null;
    const f = K.fit(c);
    const w = f.w, h = f.h;
    const pad = Math.round(w * 0.035);
    const slotH = Math.max(30, Math.min(38, h * 0.085));
    const slotW = Math.min(150, Math.max(100, w * 0.42), w - 100);  // leaves room for the tray count
    const back = h * 0.30, lip = h * 0.635;
    return {
      x: f.x, w, h, pad,
      l: pad, r: w - pad,
      back,                  // plate at rest
      travel: h * 0.115,
      lip,
      floor: h - Math.round(h * 0.035),
      /* a coin has to fit the depth of the field as well as the width of the cabinet */
      cr: Math.max(6.4, Math.min(w * 0.0285, (lip - back) * 0.105)),
      slot: { x: w / 2, y: slotH * 0.5 + h * 0.055, w: slotW, h: slotH }
    };
  }
  const faceOf = () => G.back + (0.5 - 0.5 * Math.cos(phase)) * G.travel;

  function layout() {
    const n = geom(); if (!n) return;
    if (!G) { G = n; labels = K.options(5); fill(); return; }
    /* a rotation or a resize must carry the pile with it, not strand it off the shelf */
    const sx = n.w / G.w, sy = n.h / G.h;
    G = n;
    if (Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01) {
      for (const c of shelf) { c.x *= sx; c.y *= sy; c.r = n.cr; }
      for (const c of tray) { c.x *= sx; c.y *= sy; c.r = n.cr; }
      G._pf = null;
    }
  }

  /* ---------- coins ---------- */
  function mkCoin(x, y, ci, region) {
    return {
      x, y, vx: 0, vy: 0, r: G.cr,
      ci: ci == null ? (Math.random() * labels.length) | 0 : ci,
      region, pop: 0, tip: 0, rot: Math.random() * 6.283, spin: (Math.random() - .5) * 3
    };
  }

  const lerpY = (a, b, t) => a + (b - a) * t;

  /* the window comes loaded: a carpet of coins, so the stroke has something to shove */
  function fill() {
    shelf = []; tray = []; won = 0; fed = 0;
    const r = G.cr;
    const cols = Math.max(5, Math.floor((G.r - G.l) / (r * 2.12)));
    const step = (G.r - G.l) / cols;
    /* the pile rests against the lip and reaches back to the plate's full stroke, so
       the shove is carried all the way down the chain instead of shunting a loose row */
    const y1 = G.lip - r * 1.7;
    const y0 = G.back + G.travel + r * 0.3;
    const rows = 4;
    for (let row = 0; row < rows; row++) {
      const y = y1 - (rows - 1 - row) * ((y1 - y0) / (rows - 1));
      for (let i = 0; i < cols; i++) {
        if (row > 0 && Math.random() < 0.12) continue;
        shelf.push(mkCoin(G.l + step * (i + .5) + (Math.random() - .5) * r * .22,
                          y + (Math.random() - .5) * r * .22));
      }
    }
  }

  /* the feed picks the roomiest slot in the band right in front of the face, so a
     dropped coin never lands inside another one */
  function freeSpot(targetX) {
    const r = G.cr, f = faceOf();
    let best = null, bestGap = -1e9;
    /* where you pressed in the mouth of the machine is where the coin drops */
    if (targetX != null) {
      const x = clamp(targetX, G.l + r, G.r - r);
      for (const dy of [2.5, 2.5 + r * 1.5, 2.5 + r * 3]) {
        const y = f + r + dy;
        let gap = 1e9;
        for (const c of shelf) {
          if (Math.abs(c.y - y) > c.r + r + 3) continue;
          gap = Math.min(gap, Math.hypot(c.x - x, c.y - y) - c.r - r);
        }
        if (gap > bestGap) { bestGap = gap; best = { x, y }; }
      }
      return best;
    }
    for (let t = 0; t < 10; t++) {
      const x = G.l + r + Math.random() * (G.r - G.l - r * 2);
      for (const dy of [2.5, 2.5 + r * 1.5, 2.5 + r * 3]) {
        const y = f + r + dy;
        let gap = 1e9;
        for (const c of shelf) {
          if (Math.abs(c.y - y) > c.r + r + 3) continue;
          gap = Math.min(gap, Math.hypot(c.x - x, c.y - y) - c.r - r);
        }
        if (gap > bestGap) { bestGap = gap; best = { x, y }; }
      }
    }
    return best;
  }

  function add(quiet, atX) {
    if (!G) return;
    pulse = 1; fed++;
    const r = G.cr;
    if (atX != null) lastDrop = clamp(atX, G.l + r, G.r - r);
    const spot = shelf.length < 90 ? freeSpot(atX) : null;
    if (spot) {
      const c = mkCoin(spot.x, spot.y);
      c.region = 'shelf';
      c.vy = 22;
      c.pop = 1;
      shelf.push(c);
    } else {
      /* the window is packed: the coin skitters over the pile and drops in the tray */
      const x = G.l + r + Math.random() * (G.r - G.l - r * 2);
      const tc = mkCoin(clamp(x, G.l + r, G.r - r), G.lip + r * 1.5, null, 'tray');
      tc.vy = 40;
      tray.push(tc);
      won++;
    }
    if (!quiet) { try { tone(520 + Math.random() * 180, .05, .035, 'triangle'); } catch (e) {} }
  }

  /* ---------- rigid discs ---------- */
  function pairSolve(list, iters, slop, cap) {
    const n = list.length;
    if (n < 2) return;
    /* sweep in y: a disc only ever touches its neighbours, so this stays cheap even
       when the window is carpeted */
    const order = list.slice().sort((a, b) => a.y - b.y);
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < n; i++) {
        const a = order[i];
        for (let j = i + 1; j < n; j++) {
          const b = order[j];
          if (b.y - a.y > a.r + b.r + slop) break;
          let dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          const min = a.r + b.r + slop;
          if (d2 >= min * min) continue;
          let d = Math.sqrt(d2);
          if (d < 0.0001) { dx = 1; dy = 0; d = 0.0001; }
          const nx = dx / d, ny = dy / d;
          /* full separation, split evenly, capped per pass: an uncapped push is what
             used to fling the pile sideways and sink coins through the shelf */
          const push = Math.min(min - d, cap == null ? 6 : cap) * 0.5;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
          const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rvn < 0) {
            const jv = -rvn * 0.5;
            a.vx -= nx * jv; a.vy -= ny * jv;
            b.vx += nx * jv; b.vy += ny * jv;
          }
        }
      }
    }
  }

  function maxOverlap(list) {
    let worst = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const ov = a.r + b.r - d;
        if (ov > worst) worst = ov;
      }
    }
    return worst;
  }

  function walls(c) {
    if (c.region === 'shelf') {
      c.x = clamp(c.x, G.l + c.r, G.r - c.r);
      if (c.y < G.back + c.r) c.y = G.back + c.r;
    } else {
      c.x = clamp(c.x, G.l + c.r, G.r - c.r);
      if (c.y > G.floor - c.r) { c.y = G.floor - c.r; c.vy = -Math.abs(c.vy) * 0.16; }
    }
  }

  function tick(h) {
    phase += SPEED * h;
    const f = faceOf();
    const plateV = G._pf == null ? 0 : (f - G._pf) / h;
    G._pf = f;

    /* shelf coins: no gravity here — the shelf is flat, only the plate drives them */
    for (const c of shelf) {
      c.x += c.vx * h;
      c.y += c.vy * h;
      const damp = Math.exp(-6.5 * h);
      c.vx *= damp; c.vy *= damp;
      if (Math.abs(c.vx) < 1.5) c.vx = 0;
      if (Math.abs(c.vy) < 1.5) c.vy = 0;
      c.rot += c.spin * h;
      c.spin *= Math.exp(-3 * h);
      if (c.pop > 0) c.pop = Math.max(0, c.pop - h * 3.2);
      /* the face of the plate is a wall that walks forward: it displaces exactly the
         coins it is touching, and friction never drags them back with it */
      if (c.y - c.r < f) {
        c.y = f + c.r;
        if (plateV > 0) c.vy = Math.max(c.vy, plateV);
      }
    }
    /* constraints are solved together: coins and the plate face, not coins alone.
       Without the face in the loop the solver absorbs the shove by stacking coins
       behind the plate, and the pile never advances. */
    for (let it = 0; it < 5; it++) {
      pairSolve(shelf, 1, 0.35);
      for (const c of shelf) {
        if (c.y - c.r < f) c.y = f + c.r;
        walls(c);
      }
    }
    /* one last hard separation: nothing may rest overlapping by more than a pixel */
    for (let pass = 0; pass < 4 && maxOverlap(shelf) > 0.9; pass++) {
      pairSolve(shelf, 1, 0.25, 99);
      for (const c of shelf) { if (c.y - c.r < f) c.y = f + c.r; walls(c); }
    }

    /* over the lip: the coin tips, then gravity owns it */
    for (let i = shelf.length - 1; i >= 0; i--) {
      const c = shelf[i];
      if (c.y + c.r * 0.62 <= G.lip) continue;
      shelf.splice(i, 1);
      c.region = 'tray';
      c.y = Math.max(c.y, G.lip + 1);
      c.vx *= 0.4;
      c.vy = Math.max(c.vy * 0.5, 26);
      c.tip = 0;
      tray.push(c);
      won++;
      try { tone(700 + Math.random() * 240, .05, .03, 'sine', 980); } catch (e) {}
    }

    /* the tray: real gravity, and the coins stack on each other */
    const mid = (G.l + G.r) / 2;
    for (const c of tray) {
      if (c.tip < 1) c.tip = Math.min(1, c.tip + h * 5);
      c.vy += GRAV * h;
      /* the tray floor is dished: coins drift to the middle and stack there */
      if (Math.abs(c.x - mid) > 8) c.vx += (mid - c.x) * 0.9 * h;
      c.x += c.vx * h; c.y += c.vy * h;
      c.vx *= Math.exp(-1.8 * h);
      c.rot += c.spin * h;
    }
    pairSolve(tray, 7, 0.3);
    for (const c of tray) walls(c);
    for (let pass = 0; pass < 4 && maxOverlap(tray) > 0.9; pass++) {
      pairSolve(tray, 1, 0.2, 99);
      for (const c of tray) walls(c);
    }
    for (const c of tray) {
      if (Math.abs(c.vx) < 1.2) c.vx = 0;
      if (c.y >= G.floor - c.r - 1.2 && Math.abs(c.vy) < 40) c.vy = 0;
    }
    if (tray.length > 54) tray.splice(0, tray.length - 54);
  }

  function step(dt) {
    acc += clamp(dt, 0, 0.05);
    let n = 0;
    while (acc >= FIX && n < 14) { tick(FIX); acc -= FIX; n++; }
    if (n === 14) acc = 0;
  }

  /* ---------- art ---------- */
  function coinArt(x, cx, cy, r, m, ci, squash, alpha, rot) {
    x.save();
    x.globalAlpha = alpha == null ? 1 : alpha;
    const ry = r * (squash == null ? 0.94 : squash);
    const g = x.createLinearGradient(cx - r, cy - ry, cx + r, cy + ry);
    g.addColorStop(0, '#fff3c4'); g.addColorStop(.35, '#ffd35e');
    g.addColorStop(.72, '#e0a52c'); g.addColorStop(1, '#a8701a');
    x.beginPath(); x.ellipse(cx, cy, r, ry, 0, 0, Math.PI * 2);
    x.fillStyle = g; x.fill();
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(90,52,10,.6)';
    x.lineWidth = m.flat ? 1.4 : 1;
    x.stroke();
    x.beginPath(); x.ellipse(cx, cy, r * .74, ry * .74, 0, 0, Math.PI * 2);
    const g2 = x.createLinearGradient(cx - r * .5, cy - ry * .6, cx + r * .5, cy + ry * .6);
    g2.addColorStop(0, '#ffe89a'); g2.addColorStop(.6, '#f4be45'); g2.addColorStop(1, '#cf8f22');
    x.fillStyle = g2; x.fill();
    x.strokeStyle = m.flat ? 'rgba(36,26,58,.35)' : 'rgba(120,72,14,.45)';
    x.lineWidth = .8; x.stroke();
    const t = labels[ci] || '';
    if (t && r > 5.5) {
      x.save();
      x.translate(cx, cy);
      x.rotate(rot || 0);
      x.fillStyle = m.flat ? 'rgba(36,26,58,.72)' : 'rgba(96,56,8,.62)';
      x.font = '800 ' + Math.max(6, Math.round(r * .78)) + 'px "Bricolage Grotesque",system-ui,sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(t, 0, .5);
      x.restore();
    }
    x.beginPath();
    x.ellipse(cx - r * .3, cy - ry * .34, r * .40, ry * .26, -.6, 0, Math.PI * 2);
    x.fillStyle = K.light(m.flat ? .5 : .55);
    x.fill();
    x.restore();
  }

  function drawPlate(x, m, f) {
    const top = G.back - G.h * 0.085;
    x.save();
    K.rr(x, G.l - 2, top, G.r - G.l + 4, Math.max(12, f - top + 4), 8);
    if (m.flat) x.fillStyle = '#e7dfcb';
    else {
      const g = x.createLinearGradient(0, top, 0, f);
      g.addColorStop(0, '#4a3a86'); g.addColorStop(.55, '#7d6ad6'); g.addColorStop(1, '#b9a8ff');
      x.fillStyle = g;
    }
    x.fill();
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(255,255,255,.35)';
    x.lineWidth = m.flat ? 1.5 : 1.2; x.stroke();
    x.save();
    K.rr(x, G.l - 2, top, G.r - G.l + 4, Math.max(12, f - top + 4), 8); x.clip();
    x.strokeStyle = m.flat ? 'rgba(36,26,58,.16)' : 'rgba(255,255,255,.10)';
    x.lineWidth = 1;
    for (let yy = top + 5; yy < f; yy += 5) {
      x.beginPath(); x.moveTo(G.l, yy); x.lineTo(G.r, yy); x.stroke();
    }
    x.restore();
    /* the bright lip of the face, and the shadow it throws down the field */
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(255,255,255,.85)';
    x.lineWidth = m.flat ? 2 : 2.4;
    x.beginPath(); x.moveTo(G.l + 1, f); x.lineTo(G.r - 1, f); x.stroke();
    const shg = x.createLinearGradient(0, f, 0, f + 16);
    shg.addColorStop(0, m.flat ? 'rgba(36,26,58,.15)' : 'rgba(4,1,14,.55)');
    shg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = shg;
    x.fillRect(G.l, f + 1, G.r - G.l, 16);
    x.restore();
  }

  function drawSlot(x, m) {
    const s = G.slot, left = s.x - s.w / 2, top = s.y - s.h / 2;
    const breathe = 0.5 + 0.5 * Math.sin(performance.now() / 520);
    x.save();
    x.shadowColor = 'rgba(255,215,106,' + (pulse > 0 ? 0.9 : 0.24 + 0.22 * breathe) + ')';
    x.shadowBlur = pulse > 0 ? 24 + pulse * 18 : 9 + breathe * 7;
    K.rr(x, left, top, s.w, s.h, s.h / 2);
    const gg = x.createLinearGradient(0, top, 0, top + s.h);
    if (m.flat) { gg.addColorStop(0, '#fffdf8'); gg.addColorStop(1, '#efe7d4'); }
    else { gg.addColorStop(0, pulse > 0 ? '#5b47c8' : '#3a2b86'); gg.addColorStop(1, '#160d3d'); }
    x.fillStyle = gg; x.fill();
    x.shadowColor = 'transparent';
    x.strokeStyle = pulse > 0 ? 'rgba(255,240,190,.95)' : (m.flat ? '#241a3a' : 'rgba(255,215,106,.75)');
    x.lineWidth = pulse > 0 ? 2.4 : 1.6; x.stroke();

    const cr = s.h * 0.28, ccx = left + s.h * 0.58;
    coinArt(x, ccx, s.y, cr, m, 0, 1, 1, 0);
    x.fillStyle = m.flat ? '#241a3a' : 'rgba(255,246,214,.95)';
    x.font = '800 ' + Math.round(Math.min(11, s.h * 0.30)) + 'px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText('FEED COIN', ccx + cr + 7, s.y + 0.5);
    x.strokeStyle = m.flat ? 'rgba(36,26,58,.45)' : 'rgba(255,215,106,' + (0.45 + 0.35 * breathe) + ')';
    x.lineWidth = 1.5; x.lineCap = 'round';
    x.beginPath(); x.moveTo(s.x - 4, top + s.h + 4); x.lineTo(s.x, top + s.h + 8); x.lineTo(s.x + 4, top + s.h + 4); x.stroke();
    x.restore();
  }

  function paint() {
    if (!G) return;
    const x = G.x, w = G.w, h = G.h;
    const m = K.surf(x, w, h);
    const f = faceOf();
    x.save();
    K.rr(x, 0, 0, w, h, m.radius); x.clip();

    x.fillStyle = m.flat ? '#e9e2cf' : 'rgba(10,5,26,.55)';
    x.fillRect(0, 0, w, h);

    drawPlate(x, m, f);

    /* the shelf the coins ride on */
    const sg = x.createLinearGradient(0, f, 0, G.lip);
    if (m.flat) { sg.addColorStop(0, '#f6f0df'); sg.addColorStop(1, '#e2d9c2'); }
    else { sg.addColorStop(0, 'rgba(90,72,150,.55)'); sg.addColorStop(1, 'rgba(38,26,86,.75)'); }
    x.fillStyle = sg;
    x.fillRect(G.l, f, G.r - G.l, G.lip - f);

    /* the cabinet's side rails: the field is walled in, and so is the pile */
    const railTop = G.back - G.h * 0.085;
    for (const rx of [G.l - 9, G.r]) {
      const rg = x.createLinearGradient(rx, 0, rx + 9, 0);
      if (m.flat) { rg.addColorStop(0, '#d8cfb6'); rg.addColorStop(1, '#c4bba2'); }
      else { rg.addColorStop(0, 'rgba(190,175,255,.30)'); rg.addColorStop(1, 'rgba(120,105,190,.12)'); }
      x.fillStyle = rg;
      x.fillRect(rx, railTop, 9, G.lip - railTop);
      x.strokeStyle = m.flat ? '#241a3a' : 'rgba(255,255,255,.22)';
      x.lineWidth = m.flat ? 1.2 : 1;
      x.strokeRect(rx + .5, railTop + .5, 8, G.lip - railTop - 1);
    }

    const cs = shelf.slice().sort((a, b) => a.y - b.y);
    for (const c of cs) {
      x.beginPath(); x.ellipse(c.x + 1.6, c.y + c.r * .55, c.r * .98, c.r * .42, 0, 0, Math.PI * 2);
      x.fillStyle = m.flat ? 'rgba(36,26,58,.12)' : 'rgba(6,2,20,.4)'; x.fill();
      coinArt(x, c.x, c.y, c.r * (1 + c.pop * .16), m, c.ci, .94, 1, c.rot * .2);
    }

    /* the lip: a chrome edge, then the drop */
    const lp = x.createLinearGradient(0, G.lip - 4, 0, G.lip + 3);
    lp.addColorStop(0, m.flat ? '#241a3a' : 'rgba(255,255,255,.9)');
    lp.addColorStop(1, m.flat ? '#8a8172' : 'rgba(150,140,210,.35)');
    x.fillStyle = lp; x.fillRect(G.l - 6, G.lip - 3, G.r - G.l + 12, 5);

    /* the tray */
    const tg = x.createLinearGradient(0, G.lip + 4, 0, h);
    if (m.flat) { tg.addColorStop(0, '#ded5bd'); tg.addColorStop(1, '#cfc6ad'); }
    else { tg.addColorStop(0, 'rgba(12,6,32,.85)'); tg.addColorStop(1, 'rgba(26,16,62,.95)'); }
    x.fillStyle = tg;
    x.fillRect(G.l - 6, G.lip + 4, G.r - G.l + 12, h - G.lip);
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(255,255,255,.14)';
    x.lineWidth = 1.2;
    x.strokeRect(G.l - 6.5, G.lip + 4.5, G.r - G.l + 13, h - G.lip - 6);

    const ts = tray.slice().sort((a, b) => a.y - b.y);
    for (const c of ts) {
      coinArt(x, c.x, c.y, c.r, m, c.ci, Math.max(0.45, 0.94 - c.tip * 0.4), 1, c.rot * .2);
    }

    /* the tray floor, then its glass */
    const fg = x.createLinearGradient(0, G.floor - 18, 0, G.floor + 6);
    fg.addColorStop(0, 'rgba(0,0,0,0)');
    fg.addColorStop(1, m.flat ? 'rgba(36,26,58,.18)' : 'rgba(255,255,255,.10)');
    x.fillStyle = fg;
    x.fillRect(G.l - 6, G.floor - 18, G.r - G.l + 12, 24);
    x.strokeStyle = m.flat ? 'rgba(36,26,58,.5)' : 'rgba(255,255,255,.22)';
    x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(G.l - 6, G.floor + 5); x.lineTo(G.r + 6, G.floor + 5); x.stroke();

    /* glass reflection over the tray */
    x.beginPath();
    x.moveTo(G.l - 6, G.lip + 6); x.lineTo(G.r + 6, G.lip + 6);
    x.lineTo(G.r + 6, G.lip + 26); x.lineTo(G.l - 6, G.lip + 40); x.closePath();
    x.fillStyle = K.light(m.flat ? .10 : .06); x.fill();

    drawSlot(x, m);

    /* the count sits beside the slot, not in the tray where the coins pile over it */
    const cw = 62, ch = 22, cxp = G.r - cw, cyp = G.slot.y - ch / 2;
    x.fillStyle = m.flat ? 'rgba(255,253,248,.92)' : 'rgba(12,6,32,.55)';
    K.rr(x, cxp, cyp, cw, ch, ch / 2); x.fill();
    x.strokeStyle = m.flat ? 'rgba(36,26,58,.35)' : 'rgba(255,255,255,.16)';
    x.lineWidth = 1; x.stroke();
    K.label(x, 'TRAY ' + won, cxp + cw / 2, cyp + ch / 2, 10);
    x.restore();
  }

  /* ---------- loop ---------- */
  function frame(dt) {
    try {
      const c = cv(); if (!c) return;
      const g = K.fit(c);
      if (!G || Math.abs(G.w - g.w) > .5 || Math.abs(G.h - g.h) > .5) layout();
      if (!G) return;
      step(Math.min(.05, dt / 60));
      if (pulse > 0) pulse = Math.max(0, pulse - dt * .05);
      paint();
    } catch (e) {}
  }

  const at = (e) => {
    const r = cv().getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  /* the whole mouth of the cabinet feeds: press where you want the coin to land */
  const inSlot = (p) => G && p.x > G.l - 12 && p.x < G.r + 12 &&
    p.y < G.lip + (G.floor - G.lip) * 0.20;

  window.DECIDER_GAMES.push({
    id: 'coinpusher', name: 'Coin Pusher', short: 'Pusher', label: 'Shelf', noResult: true, button: false,
    body: '<canvas class="toy" id="cpCv"></canvas>' +
      '<div class="res" id="cpRes" aria-live="polite"><span class="muted">Tap the coin slot to feed the pusher</span></div>',
    init() {
      layout();
      L = K.loop(frame);
      const c = cv();
      c.addEventListener('pointerdown', (e) => {
        const p = at(e);
        if (!inSlot(p)) {
          /* the field still answers: poke the nearest coin */
          if (G && shelf.length) {
            let best = null, bd = 1e9;
            for (const q of shelf) {
              const d = Math.hypot(q.x - p.x, q.y - p.y);
              if (d < bd) { bd = d; best = q; }
            }
            if (best && bd < G.cr * 3.4) {
              best.vx += (best.x - p.x) * 2.2;
              best.vy += 40;
              try { K.press(520); } catch (err) {}
              return;
            }
          }
          try { tone(200, .05, .03, 'sine', 150); } catch (err) {}
          try { buzz(5); } catch (err) {}
          return;
        }
        e.preventDefault();
        add(false, p.x);
      });
      if (c.clientWidth) L.start();
    },
    enter() { layout(); L.start(); },
    leave() { L.stop(); },
    action() { add(); },
    status() {
      return {
        won, fed, lastDrop,
        shelf: shelf.length, tray: tray.length,
        coins: shelf.map((c) => ({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), r: c.r, at: 'shelf' }))
          .concat(tray.map((c) => ({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), r: c.r, at: 'tray' }))),
        bounds: G ? { l: G.l, r: G.r, back: G.back, lip: G.lip, floor: G.floor, h: G.h } : null,
        face: G ? +faceOf().toFixed(1) : null
      };
    }
  });
})();
