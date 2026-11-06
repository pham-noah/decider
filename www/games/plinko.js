/* Plinko — drop a ball through the pegs; whatever slot it lands in decides. */
(function () {
  const K = window.DKIT;
  const cv = () => document.getElementById('pkCv');
  let L = null, rows = 7, pegs = [], slots = [], balls = [], busy = false, landed = null;

  function layout() {
    const c = cv();
    if (!c) return;
    const g = K.fit(c);
    pegs = [];
    const top = g.h * 0.12, bottom = g.h * 0.74;
    const gapY = (bottom - top) / rows;
    const widest = g.w * 0.86;
    for (let r = 0; r < rows; r++) {
      const count = r + 2;
      const gapX = widest / (rows + 2);
      const x0 = g.w / 2 - ((count - 1) * gapX) / 2;
      for (let i = 0; i < count; i++) pegs.push({ x: x0 + i * gapX, y: top + r * gapY, r: Math.max(3, g.w * 0.012) });
    }
    const labels = K.options(rows);
    slots = labels.map((l, i) => ({ l, x: ((i + 0.5) * g.w) / labels.length, w: g.w / labels.length }));
    return g;
  }

  function drop() {
    if (busy) return;
    busy = true; landed = null;
    const c = cv();
    const res = document.getElementById('pkRes');
    K.setResult(res, '…');
    balls.push({ x: c.clientWidth / 2 + (Math.random() - 0.5) * c.clientWidth * 0.1, y: 8, vx: (Math.random() - 0.5) * 1.2, vy: 0, r: Math.max(5, c.clientWidth * 0.018) });
  }

  function step(g) {
    const { x } = g;
    x.clearRect(0, 0, g.w, g.h);

    // board
    x.save();
    K.rr(x, 0, 0, g.w, g.h, 18);
    x.fillStyle = 'rgba(255,255,255,.35)';
    x.fill();
    x.restore();

    // slots
    const slotY = g.h * 0.86;
    slots.forEach((s, i) => {
      x.save();
      K.rr(x, s.x - s.w / 2 + 3, slotY - 2, s.w - 6, g.h - slotY + 2, 10);
      x.fillStyle = landed === i ? 'rgba(255,255,255,.98)' : PAL[i % PAL.length] + 'cc';
      x.fill();
      x.restore();
      x.fillStyle = landed === i ? '#241a55' : '#fff';
      x.font = `700 ${Math.max(9, Math.min(12, s.w / 6))}px "Bricolage Grotesque",system-ui,sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      let t = s.l;
      while (t.length > 1 && x.measureText(t).width > s.w - 8) t = t.slice(0, -1);
      x.fillText(t === s.l ? t : t + '…', s.x, slotY + (g.h - slotY) / 2);
    });

    // pegs
    pegs.forEach(p => {
      x.beginPath();
      x.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      x.fillStyle = 'rgba(255,255,255,.95)';
      x.fill();
      x.strokeStyle = 'rgba(111,139,255,.5)';
      x.lineWidth = 1.5;
      x.stroke();
    });

    // balls
    balls.forEach(b => {
      b.vy += 0.34 * 1;
      b.x += b.vx; b.y += b.vy;
      pegs.forEach(p => {
        const dx = b.x - p.x, dy = b.y - p.y;
        const d = Math.hypot(dx, dy);
        const min = b.r + p.r;
        if (d < min && d > 0.01) {
          const nx = dx / d, ny = dy / d;
          const overlap = min - d;
          b.x += nx * overlap; b.y += ny * overlap;
          const vn = b.vx * nx + b.vy * ny;
          b.vx = (b.vx - 2 * vn * nx) * 0.62 + nx * 0.6;
          b.vy = (b.vy - 2 * vn * ny) * 0.62;
          b.vx += (Math.random() - 0.5) * 0.5;
        }
      });
      if (b.x < b.r + 2) { b.x = b.r + 2; b.vx = Math.abs(b.vx) * 0.6; }
      if (b.x > g.w - b.r - 2) { b.x = g.w - b.r - 2; b.vx = -Math.abs(b.vx) * 0.6; }

      x.beginPath();
      x.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      const grd = x.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 1, b.x, b.y, b.r);
      grd.addColorStop(0, '#fff'); grd.addColorStop(1, '#7b6cff');
      x.fillStyle = grd;
      x.fill();

      if (b.y > slotY + 6 && !b.done) {
        b.done = true;
        const i = Math.max(0, Math.min(slots.length - 1, Math.floor(b.x / (g.w / slots.length))));
        landed = i;
        busy = false;
        const label = slots[i].l;
        K.setResult(document.getElementById('pkRes'), label);
        K.decide(label, 'Plinko', 'Plinko');
      }
    });
    balls = balls.filter(b => !b.done);
  }

  K && window.DECIDER_GAMES.push({
    id: 'plinko', name: 'Plinko', short: 'Plinko', label: 'Pegs',
    body: `<canvas class="toy" id="pkCv"></canvas>
      <div class="res" id="pkRes" aria-live="polite"><span class="muted">Drop a ball and let the pegs decide</span></div>
      <button class="btn" id="pkGo">Drop</button>`,
    tune: `<div class="lbl">Rows of pegs</div><div class="chips" id="pkRows" style="margin:0"></div>`,
    init(card) {
      L = K.loop(() => { const g = K.fit(cv()); step(g); });
      const chips = card.querySelector('#pkRows');
      const render = () => {
        chips.innerHTML = [5, 7, 9].map(n => `<button class="chip${n === rows ? ' on' : ''}" data-n="${n}">${n}</button>`).join('');
        chips.querySelectorAll('.chip').forEach(b => b.onclick = () => { rows = +b.dataset.n; layout(); render(); });
      };
      render();
      card.querySelector('#pkGo').onclick = drop;
      cv().addEventListener('pointerdown', drop);
      layout();
    },
    enter() { layout(); L.start(); },
    leave() { L.stop(); },
    action() { drop(); }
  });
})();
