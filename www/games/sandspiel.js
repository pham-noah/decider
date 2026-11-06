/* Sandspiel — a falling-sand sandbox. Pour sand, pool water, set wood alight.
 * Pure toy: every grain comes from your finger, not from a dice roll. */
(function () {
  const K = window.DKIT;
  const cv = () => document.getElementById('ssCv');
  const res = () => document.getElementById('ssRes');

  const CELL = 4;                       // CSS px per grain — integer, so pixels stay crisp
  const EMPTY = 0, SAND = 1, WATER = 2, FIRE = 3, WOOD = 4, STONE = 5, SMOKE = 6;

  /* four shades per material — texture without touching Math.random */
  const COL = [];
  COL[SAND] = [[242, 209, 145], [231, 189, 110], [215, 169, 88], [250, 228, 178]];
  COL[WATER] = [[62, 152, 232], [86, 176, 244], [44, 131, 210], [112, 196, 255]];
  COL[FIRE] = [[255, 157, 61], [255, 107, 42], [255, 209, 102], [255, 128, 54]];
  COL[WOOD] = [[138, 90, 51], [116, 72, 41], [155, 104, 61], [96, 60, 35]];
  COL[STONE] = [[141, 148, 167], [121, 129, 149], [156, 163, 179], [107, 114, 134]];
  COL[SMOKE] = [[150, 156, 173], [168, 174, 189], [137, 143, 161], [181, 186, 198]];

  const MATS = [
    { id: SAND, n: 'Sand', c: '#e8c07a', b: 3 },
    { id: WATER, n: 'Water', c: '#4aa3f0', b: 3 },
    { id: FIRE, n: 'Fire', c: '#ff7a2a', b: 2 },
    { id: WOOD, n: 'Wood', c: '#8a5a33', b: 3 },
    { id: STONE, n: 'Stone', c: '#8c93a6', b: 3 },
    { id: EMPTY, n: 'Erase', c: '#ffffff', b: 4 }
  ];

  let cols = 0, rows = 0, offX = 0, offY = 0;
  let grid = null, heat = null, shade = null, stamp = null, tick = 0;
  let sel = SAND, drawing = false, lastP = null, dirty = true, seeded = false, acc = 0;
  let L = null;
  const off = document.createElement('canvas');
  let octx = off.getContext('2d'), img = null;

  /* ---------- grid ---------- */
  function alloc(c, r) {
    cols = c; rows = r;
    const n = cols * rows;
    grid = new Uint8Array(n); heat = new Uint8Array(n);
    shade = new Uint8Array(n); stamp = new Int32Array(n);
    off.width = cols; off.height = rows;
    octx = off.getContext('2d');
    img = octx.createImageData(cols, rows);
    tick = 0;
    if (!seeded) { seeded = true; seed(); }
    dirty = true;
  }

  function put(x, y, m, h) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    const i = y * cols + x;
    grid[i] = m; heat[i] = h || 0;
    shade[i] = (x * 7 + y * 13 + x * y) & 3;
  }

  function seed() {
    const py = Math.round(rows * 0.66);
    for (let x = Math.round(cols * 0.26); x < Math.round(cols * 0.74); x++) {
      for (let y = py; y < py + 2; y++) put(x, y, WOOD, 0);
    }
    const mid = Math.round(cols / 2);
    for (let y = 0; y < 20; y++) {
      const half = Math.max(2, Math.round((20 - y) * 0.85));
      for (let x = mid - half; x < mid + half; x++) put(x, 7 + y, SAND, 0);
    }
  }

  /* ---------- simulation ---------- */
  function moveCell(i, j) {           // swap two cells; also marks both as done this tick
    const m = grid[i]; grid[i] = grid[j]; grid[j] = m;
    const h = heat[i]; heat[i] = heat[j]; heat[j] = h;
    const s = shade[i]; shade[i] = shade[j]; shade[j] = s;
    stamp[i] = tick; stamp[j] = tick;
  }

  function canFlow(m) { return m === EMPTY || m === SMOKE || m === FIRE; }

  function stepSand(x, y, i) {
    if (y + 1 >= rows) return;
    const j = i + cols, b = grid[j];
    if (canFlow(b) || b === WATER) { moveCell(i, j); return; }
    const d = ((x + y + tick) & 1) ? 1 : -1;
    for (let k = 0; k < 2; k++) {
      const nx = x + (k ? -d : d);
      if (nx < 0 || nx >= cols) continue;
      const t = j + (k ? -d : d);
      if (canFlow(grid[t]) || grid[t] === WATER) { moveCell(i, t); return; }
    }
  }

  function stepWater(x, y, i) {
    if (y + 1 < rows) {
      const j = i + cols, b = grid[j];
      if (canFlow(b)) { moveCell(i, j); return; }
      const d = ((x + tick) & 1) ? 1 : -1;
      for (let k = 0; k < 2; k++) {
        const nx = x + (k ? -d : d);
        if (nx < 0 || nx >= cols) continue;
        const t = j + (k ? -d : d);
        if (canFlow(grid[t])) { moveCell(i, t); return; }
      }
    }
    const d = ((x + y + tick) & 1) ? 1 : -1;
    for (let k = 0; k < 2; k++) {
      const dir = k ? -d : d;
      const nx = x + dir;
      if (nx < 0 || nx >= cols) continue;
      const t = i + dir;
      if (grid[t] === EMPTY) { moveCell(i, t); return; }
    }
  }

  function stepFire(x, y, i) {
    let fuel = false;
    for (let k = 0; k < 4; k++) {
      const nx = x + (k === 2 ? 1 : k === 3 ? -1 : 0);
      const ny = y + (k === 0 ? -1 : k === 1 ? 1 : 0);
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const j = ny * cols + nx;
      if (grid[j] === WATER) { grid[i] = SMOKE; heat[i] = 20; return; }
      if (grid[j] === WOOD) {
        fuel = true;
        if (++heat[j] > 7) { grid[j] = FIRE; heat[j] = 24; shade[j] = (x + y + tick) & 3; }
      }
    }
    if (heat[i] > 0) heat[i]--;
    else { grid[i] = SMOKE; heat[i] = 16; return; }
    if (fuel) return;                       // flame clings to the wood it is eating
    if (y > 0) {
      const up = i - cols;
      if (grid[up] === EMPTY || grid[up] === SMOKE) { moveCell(i, up); return; }
      const d = ((x + tick) & 1) ? 1 : -1;
      const nx = x + d;
      if (nx >= 0 && nx < cols && (grid[up + d] === EMPTY || grid[up + d] === SMOKE)) moveCell(i, up + d);
    }
  }

  function stepSmoke(x, y, i) {
    if (heat[i] > 0) heat[i]--; else { grid[i] = EMPTY; return; }
    if (y > 0) {
      const up = i - cols;
      if (grid[up] === EMPTY) { moveCell(i, up); return; }
      const d = ((x + tick) & 1) ? 1 : -1;
      const nx = x + d;
      if (nx >= 0 && nx < cols && grid[up + d] === EMPTY) moveCell(i, up + d);
    }
  }

  function simStep() {
    tick++;
    for (let y = rows - 1; y >= 0; y--) {
      const ltr = ((y + tick) & 1) === 0;
      for (let k = 0; k < cols; k++) {
        const x = ltr ? k : cols - 1 - k, i = y * cols + x;
        if (stamp[i] === tick) continue;
        const m = grid[i];
        if (m === SAND) stepSand(x, y, i);
        else if (m === WATER) stepWater(x, y, i);
        else if (m === FIRE) stepFire(x, y, i);
        else if (m === SMOKE) stepSmoke(x, y, i);
      }
    }
    dirty = true;
  }

  /* ---------- painting ---------- */
  const at = (e) => {
    const r = cv().getBoundingClientRect();
    return { x: (e.clientX - r.left - offX) / CELL, y: (e.clientY - r.top - offY) / CELL };
  };

  function brush(cx, cy, m, rad) {
    const r2 = rad * rad + 0.4;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = Math.round(cx) + dx, y = Math.round(cy) + dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
        const i = y * cols + x;
        if (m === EMPTY) { grid[i] = EMPTY; heat[i] = 0; stamp[i] = tick; continue; }
        if (m === WOOD && grid[i] === STONE) continue;
        grid[i] = m;
        heat[i] = m === FIRE ? 30 : 0;
        shade[i] = (x * 7 + y * 13 + x * y) & 3;
        stamp[i] = tick;
      }
    }
    dirty = true;
  }

  function line(a, b, m) {
    const spec = MATS.find(s => s.id === m) || MATS[0];
    if (!a) { brush(b.x, b.y, m, spec.b); return; }
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    /* a faster drag lays a fatter, quicker stroke — but still a continuous one */
    const fast = Math.min(2, Math.floor(dist / 5));
    const rad = spec.b + fast;
    const steps = Math.max(1, Math.ceil(dist / 0.6));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      brush(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, m, rad);
    }
  }

  function clearAll() {
    if (!grid) return;
    grid.fill(0); heat.fill(0); stamp.fill(0);
    dirty = true;
    K.setResult(res(), 'Cleared — pick a material and drag');
  }

  /* ---------- render ---------- */
  function render(g) {
    const data = img.data, n = cols * rows;
    for (let i = 0; i < n; i++) {
      const p = i * 4, m = grid[i];
      if (!m) { data[p + 3] = 0; continue; }
      let c, a = 255;
      if (m === FIRE) {
        c = COL[FIRE][(shade[i] + (tick >> 2)) & 3];
        a = 235 + ((shade[i] + tick) & 1) * 20;
      } else if (m === SMOKE) {
        c = COL[SMOKE][shade[i]];
        a = 60 + Math.min(150, heat[i] * 7);
      } else if (m === WOOD && heat[i] > 0) {
        c = [64, 42, 30];
      } else {
        c = COL[m][shade[i]];
      }
      data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2]; data[p + 3] = a;
    }
    octx.putImageData(img, 0, 0);

    const x = g.x;
    x.clearRect(0, 0, g.w, g.h);
    x.save();
    K.rr(x, 0, 0, g.w, g.h, 18);
    const bg = x.createLinearGradient(0, 0, 0, g.h);
    bg.addColorStop(0, '#191233'); bg.addColorStop(.6, '#120d26'); bg.addColorStop(1, '#0b0819');
    x.fillStyle = bg; x.fill();
    x.clip();
    x.imageSmoothingEnabled = false;
    x.drawImage(off, offX, offY, cols * CELL, rows * CELL);
    x.imageSmoothingEnabled = true;
    /* glass sheen + soft corner shade so the sand sits inside the card */
    const vg = x.createRadialGradient(g.w / 2, g.h * .42, g.w * .18, g.w / 2, g.h * .5, g.w * .95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,2,14,.55)');
    x.fillStyle = vg; x.fillRect(0, 0, g.w, g.h);
    x.restore();
    x.save();
    K.rr(x, .75, .75, g.w - 1.5, g.h - 1.5, 18);
    x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 1.5; x.stroke();
    x.restore();
  }

  /* ---------- loop ---------- */
  function frame(dt) {
    const c = cv();
    if (!c || !c.clientWidth) return;
    const g = K.fit(c);
    const wantCols = Math.max(64, Math.min(112, Math.floor(g.w / CELL)));
    const wantRows = Math.max(70, Math.min(140, Math.floor(g.h / CELL)));
    if (!grid || wantCols !== cols || wantRows !== rows) alloc(wantCols, wantRows);
    offX = Math.round((g.w - cols * CELL) / 2);
    offY = Math.round((g.h - rows * CELL) / 2);
    if (document.hidden) return;
    acc += dt * 16.667;
    let guard = 0;
    while (acc >= 33.3 && guard++ < 2) { acc -= 33.3; simStep(); }
    if (dirty) { render(g); dirty = false; }
  }

  /* ---------- ui ---------- */
  function pick(m) {
    sel = m;
    const spec = MATS.find(s => s.id === m);
    document.querySelectorAll('#ssMat .chip[data-m]').forEach(b => b.classList.toggle('on', +b.dataset.m === m));
    K.setResult(res(), spec.n + ' — drag on the pit to pour');
  }

  window.DECIDER_GAMES.push({
    id: 'sandspiel', name: 'Sandspiel', short: 'Sand', label: 'Materials', button: false,
    body: `<div class="chips" id="ssMat" style="margin:0 0 10px;gap:6px"></div>
      <canvas class="toy" id="ssCv"></canvas>
      <div class="res" id="ssRes" aria-live="polite" style="min-height:26px;font-size:calc(clamp(14px,3.3vw,17px)*var(--fs,1))"><span class="muted">Sand — drag to pour</span></div>`,
    init(card) {
      L = K.loop(frame);
      window.__ssDbg = () => ({ cols, rows, offX, offY, floating: (() => {
        let n = 0;
        for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          if (grid[i] !== SAND) continue;
          const b = grid[i + cols];
          if (b === EMPTY && grid[i + cols - 1] !== SAND && grid[i + cols + 1] !== SAND) n++;
        }
        return n;
      })() });
      const chips = card.querySelector('#ssMat');
      chips.innerHTML = MATS.map(m =>
        `<button class="chip${m.id === sel ? ' on' : ''}" data-m="${m.id}" style="flex:0 0 auto;padding:6px 11px;font-size:calc(12.5px*var(--fs,1))">` +
        `<i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${m.c};margin-right:5px;vertical-align:1px;box-shadow:0 0 0 1px rgba(0,0,0,.18)"></i>${m.n}</button>`).join('');
      chips.querySelectorAll('.chip').forEach(b => { b.onclick = () => pick(+b.dataset.m); });
      const clr = document.createElement('button');
      clr.className = 'chip'; clr.id = 'ssClear'; clr.textContent = 'Clear';
      clr.style.cssText = 'flex:0 0 auto;padding:6px 10px;font-size:calc(12.5px*var(--fs,1))';
      clr.onclick = clearAll;
      chips.appendChild(clr);

      const c = cv();
      c.addEventListener('pointerdown', (e) => {
        if (e.button) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        drawing = true; lastP = at(e); line(null, lastP, sel);
      });
      c.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        const p = at(e);
        line(lastP, p, sel);
        lastP = p;
      });
      const up = () => { drawing = false; lastP = null; };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      c.addEventListener('pointerleave', () => { if (!drawing) lastP = null; });
    },
    enter() { L.start(); dirty = true; },
    leave() { L.stop(); drawing = false; },
    action() {   /* fallback: tip a handful of sand into the pit */
      if (!grid) return;
      const cx = Math.round(cols / 2);
      for (let y = 2; y < 12; y++) {
        const half = (12 - y);
        for (let x = cx - half; x < cx + half; x++) put(Math.round(x), y, SAND, 0);
      }
      dirty = true;
      try { tone(300, .06, .03, 'sine', 380); } catch (e) {}
    }
  });
})();
