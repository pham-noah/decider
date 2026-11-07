/* Plinko — drop a ball through the pegs; whatever slot it lands in decides.
 * Your input decides: drag sideways to place the ball, flick to give it speed.
 * Nothing is randomised except the pegs' tiny asymmetry. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  const cv = () => document.getElementById('pkCv');
  let L = null, rows = 7, pegs = [], slots = [], balls = [], busy = false, landed = null;
  let aim = 0.5, aimVx = 0, power = 0, boardW = 0;

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
    boardW = g.w;
    return g;
  }

  function drop(forced) {
    if (busy) return;
    busy = true; landed = null;
    const c = cv();
    const w = c.clientWidth;
    K.setResult(document.getElementById('pkRes'), '…');
    if (typeof forced === 'number') power = forced;
    // where you let go is where it starts; how fast you flicked is how far it travels
    const x = Math.max(w * 0.10, Math.min(w * 0.90, aim * w));
    balls.push({
      x, y: 8,
      vx: aimVx * 4 + (aim - 0.5) * power * 1.8 + (rnd() - .5) * 0.9,   // identical aim gave identical bins
      vy: 0,
      r: Math.max(5, w * 0.018)
    });
  }

  function step(g) {
    /* pegs and bins were built once while the landing index used the live width, so a
       resize scored a ball against bins that were drawn somewhere else */
    if (Math.abs(g.w - boardW) > 1) { layout(); }
    const { x } = g;
    x.clearRect(0, 0, g.w, g.h);

    // board
    x.save();
    K.rr(x, 0, 0, g.w, g.h, 18);
    x.fillStyle = K.mat().flat ? '#f1ebda' : 'rgba(255,255,255,.07)';
    x.fill();
    x.restore();

    // slots
    const slotY = g.h * 0.86;
    slots.forEach((s, i) => {
      x.save();
      K.rr(x, s.x - s.w / 2 + 3, slotY - 2, s.w - 6, g.h - slotY + 2, 10);
      x.fillStyle = landed === i ? '#fffdf8' : PAL[i % PAL.length] + 'cc';
      x.fill();
      x.restore();
      x.fillStyle = landed === i ? '#241a55' : INK(1);
      x.font = `700 ${Math.max(9, Math.min(12, s.w / 6))}px "Bricolage Grotesque",system-ui,sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      let t = s.l;
      while (t.length > 1 && x.measureText(t).width > s.w - 8) t = t.slice(0, -1);
      x.fillText(t === s.l ? t : t + '…', s.x, slotY + (g.h - slotY) / 2);
    });

    // pegs — a struck peg flashes, so the cascade is visible as well as audible
    pegs.forEach(p => {
      if (p.flash) p.flash = Math.max(0, p.flash - 0.07);
      x.beginPath();
      x.arc(p.x, p.y, p.r * (1 + (p.flash || 0) * 0.5), 0, Math.PI * 2);
      x.fillStyle = p.flash ? 'rgba(255,215,106,' + (.5 + p.flash * .5) + ')' : INK(.95);
      x.fill();
      x.strokeStyle = p.flash ? 'rgba(255,215,106,.9)' : 'rgba(111,139,255,.5)';
      x.lineWidth = 1.5;
      x.stroke();
    });

    // aim guide — where the ball will start
    if (!busy) {
      const ax = aim * g.w;
      x.save();
      x.setLineDash([5, 7]);
      x.strokeStyle = INK(.5);
      x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(ax, 16); x.lineTo(ax, slotY - 8); x.stroke();
      x.restore();
      x.beginPath(); x.arc(ax, 15, 7, 0, Math.PI * 2);
      x.fillStyle = INK(1); x.fill();
      x.beginPath(); x.arc(ax, 15, 3.4, 0, Math.PI * 2);
      x.fillStyle = '#7b6cff'; x.fill();
    }

    // balls
    balls.forEach(b => {
      b.age = (b.age || 0) + 1;
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
          b.vx = (b.vx - 2 * vn * nx) * 0.66 + nx * 0.4;
          b.vy = (b.vy - 2 * vn * ny) * 0.66;
          // a hair of asymmetry so a dead-centre hit still rolls off a peg
          b.vx += Math.abs(ny) < 0.08 ? Math.sign(dx || 1) * 0.12 : 0;
          /* the cascade is the toy's signature and it was completely silent */
          const nowP = performance.now();
          if (nowP - (b.ping || 0) > 55) {
            b.ping = nowP;
            try { tone(480 + Math.random() * 320, .03, .02, 'triangle'); } catch (e) {}
            if (!b.buzzed) { b.buzzed = true; try { buzz(5); } catch (e) {} }
            p.flash = 1;
          }
        }
      });
      if (b.x < b.r + 2) { b.x = b.r + 2; b.vx = Math.abs(b.vx) * 0.6; }
      if (b.x > g.w - b.r - 2) { b.x = g.w - b.r - 2; b.vx = -Math.abs(b.vx) * 0.6; }
      // never let a ball stall on a peg or against a wall — nudge it, then drop it
      if (!b.bestY || b.y > b.bestY + 1) { b.bestY = b.y; b.stale = 0; } else b.stale = (b.stale || 0) + 1;
      if (b.stale > 90) { b.stale = 0; b.vx *= 0.3; b.vy = 2.2; b.x += (b.x < g.w / 2 ? 1.5 : -1.5); }
      if (b.age > 520) { b.vx *= 0.2; b.vy = Math.max(b.vy, 3); }

      x.beginPath();
      x.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      const grd = x.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 1, b.x, b.y, b.r);
      grd.addColorStop(0, K.light(1)); grd.addColorStop(1, '#7b6cff');
      x.fillStyle = grd;
      x.fill();

      if (b.y > slotY + 6 && !b.done) {
        b.done = true;
        const i = Math.max(0, Math.min(slots.length - 1, Math.floor(b.x / (g.w / slots.length))));
        landed = i;
        busy = false;
        const label = slots[i].l;
        K.setResult(document.getElementById('pkRes'), label);
      }
    });
    balls = balls.filter(b => !b.done);

    K.meter(x, g.w, g.h * 0.78, busy ? power : 0,
      busy ? '' : 'Aim ' + Math.round(aim * 100) + '% — drag to move, flick to drop');
  }

  K && window.DECIDER_GAMES.push({
    id: 'plinko', name: 'Plinko', short: 'Plinko', label: 'Pegs', noResult: true, button: false,
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
      card.querySelector('#pkGo').onclick = () => drop(0.6);
      K.gesture(cv(), {
        onStart(p) { if (!busy) aim = Math.max(0, Math.min(1, p.x / cv().clientWidth)); },
        onMove(p) { if (!busy) aim = Math.max(0, Math.min(1, p.x / cv().clientWidth)); },
        onEnd(r) {
          if (busy) return;
          aim = Math.max(0, Math.min(1, r.x / cv().clientWidth));
          aimVx = r.vx;
          drop(r.power);
        }
      });
      layout();
    },
    enter() { layout(); L.start(); },
    leave() { L.stop(); },
    action() { drop(); },
    shake(info) {
      const d = info.dir || 1, p = Math.max(.25, Math.min(1, info.power || .5));
      try { tone(150, .12, .05, 'triangle', 90); } catch (e) {}
      if (!balls.length) {   // nothing falling: rattle the whole board
        try { shakeEl(document.querySelector('#plinko .glass'), 6, 260); } catch (e) {}
        return;
      }
      balls.forEach(b => { b.vx += d * (1.6 + p * 5); b.vy += .5 * p; });
    }
  });
})();
