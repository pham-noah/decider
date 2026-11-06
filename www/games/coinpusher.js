/* Coin Pusher — feed coins onto the shelf; whatever the pusher shoves off decides. */
(function () {
  const K = window.DKIT;
  if (!K) return;
  const cv = () => document.getElementById('cpCv'), out = () => document.getElementById('cpRes');
  let L = null, G = null, coins = [], labels = [], phase = 0.6, speed = 0.05;
  let busy = false, cool = 0, builtW = 0, hit = -1, seeded = false, prevFace = 0, slotPulse = 0;

  function geom() {
    const c = cv(); if (!c) return null;
    const f = K.fit(c);
    const slotH = Math.min(42, Math.max(30, f.h * 0.1));
    const slotW = Math.min(150, Math.max(96, f.w * 0.52));
    const slotCy = Math.max(slotH / 2 + 6, (f.h * 0.28 - 40) / 2);
    return { x: f.x, w: f.w, h: f.h, l: 12, r: f.w - 12, back: f.h * 0.28, lip: f.h * 0.80,
      travel: f.h * 0.17, cr: Math.max(6, f.w * 0.028), face: f.h * 0.28,
      slot: { x: f.w / 2, y: slotCy, w: slotW, h: slotH } };
  }
  const inSlot = (g, px, py) =>
    !!g && Math.abs(px - g.slot.x) <= g.slot.w / 2 + 12 && Math.abs(py - g.slot.y) <= g.slot.h / 2 + 12;
  const faceOf = g => g.back + (0.5 - 0.5 * Math.cos(phase)) * g.travel;

  function add() {
    const g = G || geom(); if (!g) return;
    if (!labels.length) labels = K.options(5);
    slotPulse = 1;
    const f = faceOf(g), n = coins.length ? 1 : 6;   // an empty shelf gets a fresh handful
    for (let i = 0; i < n && coins.length <= 70; i++) {
      coins.push({ x: g.l + g.cr + Math.random() * (g.r - g.l - g.cr * 2), y: f + g.cr + 2 + i * 0.5,
        r: g.cr, vx: (Math.random() - 0.5) * 0.5, vy: 0, rot: Math.random() * 6.28,
        ci: Math.floor(Math.random() * labels.length), pop: 1, fall: -1 });
    }
    coins.forEach(c => { if (c.fall < 0) c.y += 0.8; });
    try { tone(480 + Math.random() * 220, .05, .035, 'triangle'); } catch (e) {}
  }

  function win(c) {
    busy = true; cool = 62; hit = c.ci;
    const label = labels[c.ci] || labels[0];
    K.setResult(out(), label);
    K.decide(label, 'Coin Pusher', 'Pushed off the shelf');
  }

  function update(dt) {
    const g = G;
    if (slotPulse > 0) slotPulse = Math.max(0, slotPulse - 0.045 * dt);
    phase = (phase + speed * dt) % (Math.PI * 2);
    const f = (g.face = faceOf(g));
    const df = Math.min(3, Math.max(0, f - prevFace));
    prevFace = f;

    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      if (c.fall >= 0) { c.vy += 0.55 * dt; c.y += c.vy * dt; c.fall += 0.045 * dt; c.rot += 0.03 * dt; continue; }
      // the plate shoves hardest up close; the pile ahead compresses against the lip
      if (df > 0 && c.y > f) c.y += df * 0.7 * Math.max(0.16, 1 - (c.y - f) / (g.lip - g.back));
      if (c.y - c.r < f) c.y = f + c.r;
      c.x += c.vx * dt; c.y += Math.max(0, c.vy) * dt;
      c.vx *= 0.9; c.vy *= 0.6;
      if (c.pop > 0) c.pop = Math.max(0, c.pop - 0.09 * dt);
    }

    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < coins.length; i++) {
        const a = coins[i];
        if (a.fall >= 0) continue;
        for (let j = i + 1; j < coins.length; j++) {
          const b = coins[j];
          if (b.fall >= 0) continue;
          let dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.001, min = (a.r + b.r) * 0.94;
          if (d < min) {
            const push = (min - d) * 0.5; dx /= d; dy /= d;
            a.x -= dx * push; a.y -= dy * push;
            b.x += dx * push; b.y += dy * push;
          }
        }
        a.x = Math.max(g.l + a.r, Math.min(g.r - a.r, a.x));
        a.y = Math.max(f + a.r, a.y);
      }
    }

    let fresh = null;
    coins.forEach(c => {
      if (c.fall < 0 && c.y > g.lip) { c.fall = 0; c.vy = 0.8; if (!fresh) fresh = c; }
    });
    if (fresh && !busy) win(fresh);
    coins = coins.filter(c => c.fall < 0.72 && c.y < g.h + 10);
    if (cool > 0) { cool -= dt; if (cool <= 0) busy = false; }
  }

  function coinArt(x, cx, cy, r, ci, alpha) {
    x.save(); x.globalAlpha = alpha;
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2);
    const gr = x.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.45, PAL[ci % PAL.length]); gr.addColorStop(1, 'rgba(20,10,50,.45)');
    x.fillStyle = gr; x.fill();
    x.lineWidth = Math.max(1, r * .16);
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke();
    x.beginPath(); x.arc(cx, cy, r * .62, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.stroke();
    const t = labels[ci] || '';
    if (t && r > 6) {
      x.font = `800 ${Math.max(6, Math.round(r * 0.66))}px "Bricolage Grotesque",system-ui,sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      let s = t;
      while (s.length > 1 && x.measureText(s).width > r * 1.7) s = s.slice(0, -1);
      x.fillStyle = 'rgba(20,10,50,.72)';
      x.fillText(s === t ? s : s.slice(0, 2), cx, cy + 0.5);
    }
    x.restore();
  }

  /* the coin slot — the only thing on the cabinet you tap */
  function paintSlot(x, g) {
    const s = g.slot, top = s.y - s.h / 2, left = s.x - s.w / 2;
    const breathe = 0.5 + 0.5 * Math.sin(performance.now() / 520);
    x.save();
    // halo: breathes when idle, flashes when a coin is fed
    x.shadowColor = 'rgba(255,215,106,' + (slotPulse > 0 ? 0.85 : 0.28 + 0.24 * breathe) + ')';
    x.shadowBlur = slotPulse > 0 ? 26 + slotPulse * 18 : 10 + breathe * 8;
    K.rr(x, left, top, s.w, s.h, s.h / 2);
    const gg = x.createLinearGradient(0, top, 0, top + s.h);
    gg.addColorStop(0, slotPulse > 0 ? '#5b47c8' : '#3a2b86');
    gg.addColorStop(1, '#160d3d');
    x.fillStyle = gg; x.fill();
    x.shadowColor = 'transparent';
    x.strokeStyle = slotPulse > 0 ? 'rgba(255,240,190,.95)' : 'rgba(255,215,106,.8)';
    x.lineWidth = slotPulse > 0 ? 2.6 : 1.8; x.stroke();

    // coin sitting in the slot mouth
    const cr = s.h * 0.27, ccx = left + s.h * 0.6;
    x.beginPath(); x.arc(ccx, s.y, cr, 0, Math.PI * 2);
    const cg = x.createRadialGradient(ccx - cr * .4, s.y - cr * .4, 1, ccx, s.y, cr);
    cg.addColorStop(0, '#fff2c0'); cg.addColorStop(1, '#e8a92c');
    x.fillStyle = cg; x.fill();
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = 'rgba(120,70,10,.85)'; x.font = '800 ' + Math.round(cr * 1.15) + 'px system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+', ccx, s.y + 0.5);

    // label
    x.fillStyle = 'rgba(255,246,214,.95)';
    x.font = '800 ' + Math.round(Math.min(11, s.h * 0.3)) + 'px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText('FEED COIN', ccx + cr + 8, s.y + 0.5);

    // a little "tap here" pointer under the pill
    x.strokeStyle = 'rgba(255,215,106,' + (0.5 + 0.4 * breathe) + ')';
    x.lineWidth = 1.6; x.lineCap = 'round';
    x.beginPath(); x.moveTo(s.x - 4, top + s.h + 4); x.lineTo(s.x, top + s.h + 8); x.lineTo(s.x + 4, top + s.h + 4); x.stroke();
    x.restore();
  }

  function paint(g) {
    const x = g.x, trayX = g.l - 9, trayY = g.back - 40, trayW = g.r - g.l + 18, trayH = g.h - trayY - 6;
    const topY = g.back - 30, f = g.face;
    x.clearRect(0, 0, g.w, g.h);

    x.save(); K.rr(x, trayX, trayY, trayW, trayH, 20);
    x.fillStyle = 'rgba(255,255,255,.3)'; x.fill();
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1.5; x.stroke();
    x.restore();

    const sg = x.createLinearGradient(0, trayY, 0, g.lip);
    sg.addColorStop(0, 'rgba(36,26,85,.20)'); sg.addColorStop(1, 'rgba(36,26,85,0)');
    x.save(); K.rr(x, trayX, trayY, trayW, trayH, 20); x.fillStyle = sg; x.fill(); x.restore();

    x.fillStyle = 'rgba(255,255,255,.55)';
    x.fillRect(trayX, trayY + 14, 4, g.lip - trayY - 10);
    x.fillRect(trayX + trayW - 4, trayY + 14, 4, g.lip - trayY - 10);

    x.save();
    K.rr(x, g.l - 2, topY, g.r - g.l + 4, Math.max(10, f - topY), 9);
    const pg = x.createLinearGradient(0, topY, 0, f);
    pg.addColorStop(0, '#4b3bb0'); pg.addColorStop(.5, '#8f7dff'); pg.addColorStop(1, '#cfc4ff');
    x.fillStyle = pg; x.fill();
    x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 2; x.stroke();
    x.restore();

    x.save();
    K.rr(x, trayX, g.lip + 2, trayW, g.h - g.lip - 8, 14);
    const lg = x.createLinearGradient(0, g.lip, 0, g.h);
    lg.addColorStop(0, 'rgba(36,26,85,.82)'); lg.addColorStop(1, 'rgba(36,26,85,.55)');
    x.fillStyle = lg; x.fill();
    x.restore();
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.font = '800 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('W I N', g.w / 2, g.lip + (g.h - g.lip) / 2 + 2);

    const sorted = coins.slice().sort((a, b) => a.y - b.y);
    sorted.forEach(c => { if (c.fall < 0) coinArt(x, c.x, c.y, c.r * (1 + c.pop * 0.22), c.ci, 1); });
    sorted.forEach(c => {
      if (c.fall >= 0) coinArt(x, c.x, c.y, c.r * (1 - c.fall * 0.35), c.ci, Math.max(0, 1 - c.fall * 1.8));
    });

    if (hit >= 0 && busy) {
      x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 2;
      x.beginPath(); x.arc(g.w / 2, g.lip + (g.h - g.lip) / 2 + 2, 26 + (1 - cool / 62) * 18, 0, Math.PI * 2);
      x.stroke();
    }

    paintSlot(x, g);
  }

  function frame(dt) {
    const g = geom(); if (!g) return;
    G = g;
    if (Math.abs(g.w - builtW) > 1) { builtW = g.w; labels = K.options(5); }
    if (!seeded && g.w > 120) { seeded = true; for (let i = 0; i < 16; i++) add(); }
    update(dt);
    paint(g);
  }

  window.DECIDER_GAMES.push({
    id: 'coinpusher', name: 'Coin Pusher', short: 'Pusher', label: 'Shelf', noResult: true, button: false,
    body: `<canvas class="toy" id="cpCv"></canvas>
      <div class="res" id="cpRes" aria-live="polite"><span class="muted">Tap the coin slot up top — the pusher does the rest</span></div>`,
    tune: `<div class="lbl">Pusher speed</div><div class="chips" id="cpSpeed" style="margin:0"></div>`,
    init(card) {
      L = K.loop(frame);
      labels = K.options(5);
      cv().addEventListener('pointerdown', e => {
        const g = G || geom(); if (!g) return;
        const r = cv().getBoundingClientRect();
        if (!inSlot(g, e.clientX - r.left, e.clientY - r.top)) return;
        e.preventDefault();
        add();
      });
      const chips = card.querySelector('#cpSpeed');
      const opts = [['Slow', 0.035], ['Normal', 0.05], ['Fast', 0.07]];
      const render = () => {
        chips.innerHTML = opts.map(([n, v]) => `<button class="chip${v === speed ? ' on' : ''}" data-v="${v}">${n}</button>`).join('');
        chips.querySelectorAll('.chip').forEach(b => b.onclick = () => { speed = +b.dataset.v; render(); });
      };
      render();
    },
    enter() { labels = K.options(5); busy = false; cool = 0; L.start(); },
    leave() { L.stop(); },
    action() { add(); }
  });
})();
