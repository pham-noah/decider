/* Bubble wrap — one full sheet of bubbles. Drag a finger across it and every
 * bubble under the path pops with a puff, a pop tone and a tick; the sheet
 * creeps back full a few seconds later. No goal, no numbers, no helper button. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('bw2Cv');
  let L = null, g = null, cells = [], sheet = null, puffs = [], held = false, last = null;
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  function layout() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const old = cells, m = 13, top = 42, bot = 30;
    const cols = Math.max(4, Math.min(6, Math.round((g.w - m * 2) / 54)));
    const cell = (g.w - m * 2) / cols;
    const rows = Math.max(3, Math.floor((g.h - top - bot) / cell));
    const oy = top + Math.max(0, (g.h - top - bot - rows * cell) / 2);
    cells = [];
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < cols; i++) {
        const p = old[r * cols + i];
        cells.push({
          cx: m + cell * (i + .5), cy: oy + cell * (r + .5), r: cell * .40,
          s: p ? p.s : 1, cool: p ? p.cool : 0, flash: p ? p.flash : 0
        });
      }
    }
    sheet = { x: m - 6, y: oy - 6, w: g.w - m * 2 + 12, h: rows * cell + 12 };
  }

  function hit(p) {
    for (let i = 0; i < cells.length; i++) {
      const b = cells[i];
      if (Math.hypot(p.x - b.cx, p.y - b.cy) < b.r + 9) return b;
    }
    return null;
  }

  function pop(b) {
    if (!b || b.cool > 0 || b.s < .8) return;
    b.s = 0; b.cool = 2.6 + Math.random() * 2.4; b.flash = 1;
    for (let k = 0; k < 5; k++) {
      const a = Math.random() * TAU, sp = .45 + Math.random() * 1.1;
      puffs.push({ x: b.cx, y: b.cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .3, r: 1.4 + Math.random() * 2.2, a: 1 });
    }
    K.press(560 + Math.random() * 320);          // pop tone + haptic in one chain
    sfx(150, .07, .035, 'triangle', 70);         // the puff of air under it
  }

  /* a fast swipe skips cells, so walk the segment and pop everything on it */
  function sweep(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 9));
    for (let i = 0; i <= n; i++) pop(hit({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }));
  }

  function step(dt) {
    const s = dt * .0167;
    cells.forEach(b => {
      if (b.cool > 0) b.cool -= s;
      else if (b.s < 1) b.s = Math.min(1, b.s + (1 - b.s) * .07 * dt + .005 * dt);
      b.flash = Math.max(0, b.flash - .028 * dt);
    });
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= .012 * dt; p.r += .3 * dt; p.a -= .035 * dt;
      if (p.a <= 0) puffs.splice(i, 1);
    }
  }

  function draw() {
    if (!g) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), flat = m.flat;
    if (sheet) K.panel(x, sheet.x, sheet.y, sheet.w, sheet.h, { r: 14, face: 'rgba(255,255,255,.07)', face2: 'rgba(255,255,255,.02)' });
    K.label(x, 'BUBBLE WRAP', w / 2, 20, 11);

    cells.forEach(b => {
      const r = b.r;
      if (b.s <= .04) {                              // popped: a dent in the sheet
        x.beginPath(); x.ellipse(b.cx, b.cy, r * .74, r * .54, 0, 0, TAU);
        x.fillStyle = flat ? '#e6dfcc' : 'rgba(0,0,0,.22)'; x.fill();
        x.beginPath(); x.ellipse(b.cx, b.cy, r * .74, r * .54, 0, 0, TAU);
        x.setLineDash([2.5, 3]); x.strokeStyle = INK(.26); x.lineWidth = 1; x.stroke(); x.setLineDash([]);
        x.beginPath(); x.arc(b.cx, b.cy, r * .26, 0, TAU);
        x.fillStyle = flat ? 'rgba(36,26,58,.22)' : 'rgba(0,0,0,.18)'; x.fill();
        return;
      }
      const rr = r * (.45 + .55 * Math.min(1, b.s));
      const rg = x.createRadialGradient(b.cx - rr * .32, b.cy - rr * .38, rr * .08, b.cx, b.cy, rr);
      if (flat) { rg.addColorStop(0, '#fffdf8'); rg.addColorStop(.72, '#f2ecdc'); rg.addColorStop(1, '#ddd5c0'); }
      else { rg.addColorStop(0, K.light(.55)); rg.addColorStop(.55, 'rgba(168,203,255,.20)'); rg.addColorStop(1, 'rgba(84,124,205,.09)'); }
      x.beginPath(); x.arc(b.cx, b.cy, rr, 0, TAU); x.fillStyle = rg; x.fill();
      x.strokeStyle = flat ? 'rgba(36,26,58,.42)' : K.light(.36 + b.flash * .5);
      x.lineWidth = 1.2; x.stroke();
      if (flat) {
        x.beginPath(); x.arc(b.cx, b.cy, rr * .96, 0, TAU);
        x.strokeStyle = 'rgba(36,26,58,.10)'; x.lineWidth = 1; x.stroke();
      } else {
        x.beginPath(); x.arc(b.cx - rr * .30, b.cy - rr * .34, rr * .17, 0, TAU);
        x.fillStyle = K.light(.85); x.fill();
      }
      if (b.flash > 0) {
        x.beginPath(); x.arc(b.cx, b.cy, rr + (1 - b.flash) * 11, 0, TAU);
        x.strokeStyle = K.light(b.flash * .8); x.lineWidth = 1.5; x.stroke();
      }
    });

    puffs.forEach(p => {
      x.globalAlpha = Math.max(0, p.a) * .9;
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU);
      x.strokeStyle = flat ? 'rgba(36,26,58,.7)' : 'rgba(255,255,255,.85)';
      x.lineWidth = 1.1; x.stroke();
    });
    x.globalAlpha = 1;
    K.label(x, 'drag across the bubbles', w / 2, h - 16, 10);
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
    id: 'bubblewrap', name: 'Bubble wrap', short: 'Wrap', label: 'Wrap', noResult: true, button: false,
    body: `<canvas class="toy" id="bw2Cv"></canvas>
      <div class="res" id="bw2Res" aria-live="polite"><span class="muted">Pop a sheet</span></div>`,
    init() {
      L = K.loop(frame); layout();
      const c = cv();
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        held = true; last = at(e); pop(hit(last));
      });
      c.addEventListener('pointermove', e => { if (!held) return; const p = at(e); sweep(last, p); last = p; });
      const up = () => { held = false; last = null; };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      if (cv().clientWidth) L.start();
    },
    enter() { layout(); L.start(); },
    leave() { held = false; L.stop(); }
  });
})();
