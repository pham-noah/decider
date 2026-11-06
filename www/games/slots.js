/* Slot machine — three reels of labels; pairs and triples decide. */
(function () {
  const K = window.DKIT;
  const cv = () => document.getElementById('slCv');
  const TAU = Math.PI * 2;
  let L = null, g = null, pool = [], reels = [], spinning = false, spinStart = 0, done = false;

  function start() {
    pool = K.options(5);
    if (pool.length < 2) pool = ['Yes', 'No', 'Maybe'];
    spinning = true; done = false; spinStart = performance.now();
    reels = [0, 1, 2].map(() => ({ pos: Math.floor(Math.random() * pool.length), vel: 0.62 + Math.random() * 0.18, target: null, stopAt: 0, settled: false }));
    reels.forEach((r, i) => { r.stopAt = 480 + i * 380; });
    K.setResult(document.getElementById('slRes'), '…');
    try { tone(300, .12, .05, 'square', 700); } catch (e) {}
  }

  function finish() {
    const idx = reels.map(r => ((Math.round(r.pos) % pool.length) + pool.length) % pool.length);
    const count = {};
    idx.forEach(i => { count[i] = (count[i] || 0) + 1; });
    let best = 0, bn = 0;
    Object.keys(count).forEach(k => { if (count[k] > bn) { bn = count[k]; best = +k; } });
    const res = document.getElementById('slRes');
    if (bn === 1) {
      K.setResult(res, 'No match');
      try { tone(220, .22, .07, 'sine', 140); } catch (e) {}
      return;
    }
    const label = pool[best];
    K.setResult(res, bn === 3 ? label + ' ×3' : label + ' ×2');
    K.decide(label, 'Slots', bn === 3 ? 'Three of a kind' : 'Two of a kind');
  }

  function tick(dt, now) {
    if (!g) return;
    if (spinning) {
      reels.forEach((r, i) => {
        if (r.target === null) {
          r.pos += r.vel * dt;
          if (now - spinStart > r.stopAt) {
            r.target = Math.round(r.pos) + 2 + Math.floor(Math.random() * 2);
            r.vel = Math.max(r.vel, 0.3);
          }
        } else if (!r.settled) {
          const d = r.target - r.pos;
          r.vel = (r.vel + d * 0.26 * dt) * Math.pow(0.80, dt);
          r.pos += r.vel * dt;
          if (Math.abs(d) < 0.005 && Math.abs(r.vel) < 0.03) {
            r.pos = r.target; r.settled = true;
            try { tone(620 - i * 90, .10, .05, 'square', 330); } catch (e) {}
          }
        }
      });
      if (reels.length === 3 && reels.every(r => r.settled)) { spinning = false; finish(); }
    } else if (reels.length === 3) {
      // idle: a soft wobble so the reels never sit dead still
      reels.forEach((r, i) => { r.pos += Math.sin(now / 900 + i * 2) * 0.0004 * dt; });
    }
    draw(now);
  }

  function draw(now) {
    const x = g.x, w = g.w, h = g.h;
    x.clearRect(0, 0, w, h);

    K.rr(x, 8, 6, w - 16, h - 14, 26);
    const bg = x.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, 'rgba(64,32,128,.93)');
    bg.addColorStop(.55, 'rgba(38,20,80,.95)');
    bg.addColorStop(1, 'rgba(20,10,46,.96)');
    x.fillStyle = bg; x.fill();
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 1.5; x.stroke();

    // marquee bulbs
    for (let i = 0; i < 9; i++) {
      const lx = 30 + (i * (w - 60)) / 8;
      const on = 0.45 + 0.55 * Math.max(0, Math.sin(now / 240 + i * 0.9));
      x.beginPath(); x.arc(lx, 30, 4, 0, TAU);
      x.fillStyle = `rgba(255,${Math.round(190 + 40 * on)},130,${(0.22 + 0.7 * on).toFixed(2)})`;
      x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('PICK A REEL', w / 2, 48);

    const top = h * 0.20, wh = h * 0.46, m = 18, gap = 10;
    const rw = (w - 2 * m - 2 * gap) / 3;
    const bob = spinning ? 0 : Math.sin(now / 700) * 2;

    reels.forEach((r, i) => {
      const cx = m + i * (rw + gap) + rw / 2;
      K.rr(x, cx - rw / 2, top, rw, wh, 15);
      x.fillStyle = 'rgba(9,4,26,.78)'; x.fill();
      x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 1.4; x.stroke();

      x.save();
      K.rr(x, cx - rw / 2, top, rw, wh, 15); x.clip();
      const cell = wh * 0.94;
      const strip = (off, alpha) => {
        x.save(); x.globalAlpha = alpha; x.translate(0, off + bob);
        const base = Math.floor(r.pos);
        for (let k = base - 2; k <= base + 3; k++) {
          const y = top + wh / 2 + (k - r.pos) * cell;
          if (y < top - cell || y > top + wh + cell) continue;
          const label = pool[((k % pool.length) + pool.length) % pool.length];
          const tw = rw - 13, th = cell * 0.80;
          K.rr(x, cx - tw / 2, y - th / 2, tw, th, 12);
          x.fillStyle = PAL[((k % PAL.length) + PAL.length) % PAL.length];
          x.fill();
          x.save();
          K.rr(x, cx - tw / 2, y - th / 2, tw, th, 12); x.clip();
          const gl = x.createLinearGradient(0, y - th / 2, 0, y + th / 2);
          gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(.55, 'rgba(255,255,255,.02)');
          x.fillStyle = gl; x.fillRect(cx - tw / 2, y - th / 2, tw, th);
          x.restore();

          let fs = Math.round(wh * 0.17);
          x.font = `800 ${fs}px "Bricolage Grotesque",system-ui,sans-serif`;
          const maxW = tw - 12;
          while (fs > 13 && x.measureText(label).width > maxW) {
            fs -= 1; x.font = `800 ${fs}px "Bricolage Grotesque",system-ui,sans-serif`;
          }
          let txt = label;
          if (x.measureText(txt).width > maxW) {
            while (txt.length > 2 && x.measureText(txt).width > maxW - 8) txt = txt.slice(0, -1);
            txt = txt.slice(0, -1) + '…';
          }
          x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.shadowColor = 'rgba(20,8,50,.45)'; x.shadowBlur = 4;
          x.fillText(txt, cx, y + 1);
          x.shadowColor = 'transparent';
        }
        x.restore();
      };
      const blur = Math.min(0.5, Math.abs(r.vel) * 0.45);
      if (blur > 0.05) {
        strip(-r.vel * cell * 0.30, 0.22);
        strip(r.vel * cell * 0.30, 0.22);
      }
      strip(0, 1);
      // glass
      const gg = x.createLinearGradient(0, top, 0, top + wh);
      gg.addColorStop(0, 'rgba(255,255,255,.22)'); gg.addColorStop(.4, 'rgba(255,255,255,0)');
      x.fillStyle = gg; x.fillRect(cx - rw / 2, top, rw, wh);
      x.restore();
    });

    // payline
    const ly = top + wh / 2;
    x.save();
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1; x.setLineDash([4, 6]);
    x.beginPath(); x.moveTo(m - 6, ly); x.lineTo(w - m + 6, ly); x.stroke();
    x.setLineDash([]);
    [-1, 1].forEach(s => {
      const px = s < 0 ? m - 8 : w - m + 8;
      x.beginPath(); x.moveTo(px, ly); x.lineTo(px - s * 8, ly - 6); x.lineTo(px - s * 8, ly + 6);
      x.closePath(); x.fillStyle = 'rgba(255,255,255,.8)'; x.fill();
    });
    x.restore();

    // coin tray
    const trayY = top + wh + 20, trayH = h * 0.14;
    K.rr(x, m, trayY, w - 2 * m, trayH, 14);
    x.fillStyle = 'rgba(0,0,0,.26)'; x.fill();
    x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 1; x.stroke();
    for (let i = 0; i < 3; i++) {
      const cx2 = w / 2 + (i - 1) * 26, cy2 = trayY + trayH * 0.40;
      x.beginPath(); x.ellipse(cx2, cy2, 9, 7.4, 0, 0, TAU);
      const cg = x.createRadialGradient(cx2 - 3, cy2 - 3, 1, cx2, cy2, 10);
      cg.addColorStop(0, '#fff3c4'); cg.addColorStop(1, '#b8861c');
      x.fillStyle = cg; x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,.5)';
    x.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center';
    x.fillText('PAIR ×2 · TRIPLE ×3', w / 2, trayY + trayH * 0.82);
  }

  K && window.DECIDER_GAMES.push({
    id: 'slots', name: 'Slot machine', short: 'Slots', label: 'Reels',
    body: `<canvas class="toy" id="slCv"></canvas>
      <div class="res" id="slRes" aria-live="polite"><span class="muted">Pull to spin</span></div>
      <button class="btn" id="slGo">Spin</button>`,
    init(card) {
      L = K.loop(tick);
      g = K.fit(cv());
      pool = K.options(5);
      if (pool.length < 2) pool = ['Yes', 'No', 'Maybe'];
      reels = [0, 1, 2].map(i => ({ pos: i % pool.length, vel: 0, target: null, stopAt: 0, settled: true }));
      card.querySelector('#slGo').onclick = () => { if (!spinning) start(); };
      cv().addEventListener('pointerdown', () => { if (!spinning) start(); });
    },
    enter() { if (!g || Math.abs(g.w - cv().clientWidth) > 1) g = K.fit(cv()); L.start(); },
    leave() { L.stop(); },
    action() { if (!spinning) start(); }
  });
})();
