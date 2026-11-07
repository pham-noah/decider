/* Slot machine — three reels of labels and a lever on the right.
 * Pull the lever down and let go: how far you pull sets how long the reels run
 * and how hard they stop — the last reel overshoots its mark and rolls back.
 * A tap anywhere on the machine spins with an average pull. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  const cv = () => document.getElementById('slCv');
  const TAU = Math.PI * 2;
  let L = null, g = null, pool = [], reels = [], spinning = false, spinStart = 0, power = 0.5;
  let LM = null;                       // lever metrics, refreshed every frame
  let pull = 0, pulling = false, armed = false, startX = 0, startY = 0, winFlash = null;

  const PULL_PX = 92;                  // finger travel for a full pull

  function layout() {
    const w = g.w, h = g.h;
    const leverW = Math.max(38, Math.min(54, w * 0.135));
    const right = w - 10;
    const leverX = right - leverW / 2;
    const m = 14, gap = 9;
    const reelRight = right - leverW - 4;
    const rw = Math.max(28, (reelRight - m - 2 * gap) / 3);
    const top = h * 0.19, wh = h * 0.50;
    const restY = top + 32, travel = wh * 0.56;
    return { leverW, leverX, right, m, gap, reelRight, rw, top, wh, restY, travel, pivotY: top - 8, maxY: restY + travel };
  }

  const easeOutBack = (u, s) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);

  function start(p) {
    if (spinning || !reels.length) return;
    power = Math.max(0, Math.min(1, p == null ? 0.5 : p));
    spinning = true; winFlash = null;
    spinStart = performance.now();
    const base = 520 + power * 1050;                        // harder pull = longer run
    reels.forEach((r, i) => {
      r.vel = 0.60 + power * 1.05 + i * 0.05;
      r.phase = 'spin'; r.settled = false; r.target = null;
      r.stopAt = base + i * (280 + 90 * power);
      r.back = i === 2 ? 2.0 + 1.2 * power : 1.0 + 0.5 * power;   // how far it overshoots
      r.dur = i === 2 ? 660 - 210 * power : 420;                  // harder pull = harder stop
      r.t0 = 0; r.p0 = r.pos;
    });
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
    winFlash = { label: best, t: 0, bn };
    try { buzz(bn === 3 ? [12, 40, 12] : [8, 24]); } catch (e) {}
    K.setResult(res, bn === 3 ? label + ' ×3' : label + ' ×2');
    K.decide(label, 'Slots', bn === 3 ? 'Three of a kind' : 'Two of a kind');
  }

  function tick(dt, now) {
    if (!g && cv()) g = K.fit(cv());
    if (!g) return;

    if (spinning) {
      reels.forEach((r, i) => {
        const prev = r.pos;
        if (r.phase === 'spin') {
          r.pos += r.vel * dt;
          if (now - spinStart > r.stopAt) {
            r.phase = 'ease'; r.t0 = now; r.p0 = r.pos;
            r.target = Math.ceil(r.pos) + 2 + (i === 2 && power > 0.6 ? 1 : 0);
            try { tone(520 - i * 70, .06, .04, 'square', 300); } catch (e) {}
          }
        } else if (r.phase === 'ease') {
          const u = Math.min(1, (now - r.t0) / r.dur);
          r.pos = r.p0 + (r.target - r.p0) * easeOutBack(u, r.back);
          if (u >= 1) {
            r.pos = r.target; r.phase = 'done'; r.settled = true;
            try { tone(620 - i * 90, .10, .05, 'square', 330); } catch (e) {}
          }
        }
        r.spd = (r.pos - prev) / Math.max(.001, dt);
      });
      if (reels.every(r => r.settled)) { spinning = false; finish(); }
    } else if (reels.length === 3) {
      // idle: a soft wobble so the reels never sit dead still
      reels.forEach((r, i) => { r.spd = 0; r.pos += Math.sin(now / 900 + i * 2) * 0.0004 * dt; });
    }

    // a released lever springs back up
    if (!pulling && pull !== 0) {
      pull += (0 - pull) * 0.24 * dt;
      if (Math.abs(pull) < 0.004) pull = 0;
    }

    draw(now);
  }

  function draw(now) {
    const x = g.x, w = g.w, h = g.h;
    x.clearRect(0, 0, w, h);
    const M = LM = layout();
    const { m, gap, rw, top, wh, reelRight } = M;

    K.rr(x, 6, 4, w - 12, h - 10, 26);
    const bg = x.createLinearGradient(0, 0, w, h);
    const flatCab = K.mat().flat;
    bg.addColorStop(0, flatCab ? '#f1ebda' : 'rgba(64,32,128,.93)');
    bg.addColorStop(.55, 'rgba(38,20,80,.95)');
    bg.addColorStop(1, flatCab ? '#e6dfcc' : 'rgba(20,10,46,.96)');
    x.fillStyle = bg; x.fill();
    x.strokeStyle = INK(.4); x.lineWidth = 1.5; x.stroke();

    // marquee bulbs
    for (let i = 0; i < 9; i++) {
      const lx = 30 + (i * (w - 60)) / 8;
      const on = 0.45 + 0.55 * Math.max(0, Math.sin(now / 240 + i * 0.9));
      x.beginPath(); x.arc(lx, 30, 4, 0, TAU);
      x.fillStyle = `rgba(255,${Math.round(190 + 40 * on)},130,${(0.22 + 0.7 * on).toFixed(2)})`;
      x.fill();
    }
    x.fillStyle = INK(.55);
    x.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('PULL THE LEVER', (m + reelRight) / 2, 48);

    const bob = spinning ? 0 : Math.sin(now / 700) * 2;

    const wf = winFlash && !spinning ? winFlash : null;
    if (wf) { wf.t += 1; }
    reels.forEach((r, i) => {
      const cx = m + i * (rw + gap) + rw / 2;
      const won = wf && (((Math.round(r.pos) % pool.length) + pool.length) % pool.length) === wf.label;
      K.rr(x, cx - rw / 2, top, rw, wh, 15);
      x.fillStyle = 'rgba(9,4,26,.78)'; x.fill();
      if (won) {
        /* the reels that matched used to look exactly like the ones that did not */
        const pulse = 0.55 + 0.45 * Math.sin(wf.t / 6);
        x.save(); x.shadowColor = 'rgba(255,215,106,' + (.5 + .5 * pulse) + ')'; x.shadowBlur = 18;
        x.strokeStyle = 'rgba(255,215,106,' + (.6 + .35 * pulse) + ')'; x.lineWidth = 3; x.stroke();
        x.restore();
      } else {
        x.strokeStyle = INK(.22); x.lineWidth = 1.4; x.stroke();
      }

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
          /* colour by identity: bound to the strip index, the same label turned pink
             in one spin and blue in the next, and two labels could read as a pair */
          const li = pool.indexOf(label);
          x.fillStyle = PAL[(((li < 0 ? k : li) % PAL.length) + PAL.length) % PAL.length];
          x.fill();
          x.save();
          K.rr(x, cx - tw / 2, y - th / 2, tw, th, 12); x.clip();
          const gl = x.createLinearGradient(0, y - th / 2, 0, y + th / 2);
          gl.addColorStop(0, INK(.35)); gl.addColorStop(.55, INK(.02));
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
          x.fillStyle = INK(1); x.textAlign = 'center'; x.textBaseline = 'middle';
          x.shadowColor = 'rgba(20,8,50,.45)'; x.shadowBlur = 4;
          x.fillText(txt, cx, y + 1);
          x.shadowColor = 'transparent';
        }
        x.restore();
      };
      const blur = Math.min(0.5, Math.abs(r.spd || 0) * 0.30);
      if (blur > 0.05) {
        strip(-(r.spd || 0) * cell * 0.30, 0.22);
        strip((r.spd || 0) * cell * 0.30, 0.22);
      }
      strip(0, 1);
      // glass
      const gg = x.createLinearGradient(0, top, 0, top + wh);
      gg.addColorStop(0, INK(.22)); gg.addColorStop(.4, INK(0));
      x.fillStyle = gg; x.fillRect(cx - rw / 2, top, rw, wh);
      x.restore();
    });

    // payline
    const ly = top + wh / 2;
    x.save();
    x.strokeStyle = INK(.5); x.lineWidth = 1; x.setLineDash([4, 6]);
    x.beginPath(); x.moveTo(m - 6, ly); x.lineTo(reelRight + 4, ly); x.stroke();
    x.setLineDash([]);
    [-1, 1].forEach(s => {
      const px = s < 0 ? m - 8 : reelRight + 6;
      x.beginPath(); x.moveTo(px, ly); x.lineTo(px - s * 8, ly - 6); x.lineTo(px - s * 8, ly + 6);
      x.closePath(); x.fillStyle = INK(.8); x.fill();
    });
    x.restore();

    // coin tray
    const trayY = top + wh + 16, trayH = h * 0.14;
    K.rr(x, m, trayY, reelRight - m, trayH, 14);
    x.fillStyle = 'rgba(0,0,0,.26)'; x.fill();
    x.strokeStyle = INK(.16); x.lineWidth = 1; x.stroke();
    for (let i = 0; i < 3; i++) {
      const cx2 = (m + reelRight) / 2 + (i - 1) * 26, cy2 = trayY + trayH * 0.40;
      x.beginPath(); x.ellipse(cx2, cy2, 9, 7.4, 0, 0, TAU);
      const cg = x.createRadialGradient(cx2 - 3, cy2 - 3, 1, cx2, cy2, 10);
      cg.addColorStop(0, '#fff3c4'); cg.addColorStop(1, '#b8861c');
      x.fillStyle = cg; x.fill();
    }
    x.fillStyle = INK(.5);
    x.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center';
    x.fillText('PAIR ×2 · TRIPLE ×3', (m + reelRight) / 2, trayY + trayH * 0.82);

    drawLever(x, now, M);
  }

  function drawLever(x, now, M) {
    const { leverX: lx, leverW, pivotY, restY, travel, maxY } = M;
    const p = Math.max(0, Math.min(1, pull));
    const ky = restY + travel * p;
    const kr = Math.max(10, leverW * 0.36);
    const live = spinning ? 0.55 : 1;

    // the slot it runs in
    K.rr(x, lx - 5.5, pivotY + 6, 11, maxY - pivotY + 4, 5.5);
    x.fillStyle = 'rgba(4,2,14,.62)'; x.fill();
    x.strokeStyle = INK(.16); x.lineWidth = 1; x.stroke();

    // depth ticks beside the slot
    x.save();
    x.strokeStyle = INK(.20); x.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const ty = restY + travel * i / 4;
      x.beginPath(); x.moveTo(lx - 13, ty); x.lineTo(lx - 8, ty); x.stroke();
    }
    x.restore();

    // rod
    x.save();
    x.globalAlpha = live;
    x.lineCap = 'round';
    x.lineWidth = Math.max(6, leverW * 0.17);
    const rod = x.createLinearGradient(lx - 6, 0, lx + 6, 0);
    rod.addColorStop(0, '#6f779b'); rod.addColorStop(.42, INK(1));
    rod.addColorStop(.62, '#cfd6ea'); rod.addColorStop(1, '#6a7295');
    x.strokeStyle = rod;
    x.beginPath(); x.moveTo(lx, pivotY + 6); x.lineTo(lx, ky); x.stroke();
    // collar where it leaves the case
    x.fillStyle = '#4a3a78';
    K.rr(x, lx - 7, pivotY + 2, 14, 7, 3.5); x.fill();
    x.restore();

    // shadow the knob drops into the case
    x.save();
    x.globalAlpha = .3 * live;
    x.beginPath(); x.ellipse(lx + 3, ky + 9, kr * .9, kr * .42, 0, 0, TAU);
    x.fillStyle = '#07031a'; x.fill();
    x.restore();

    // knob
    x.save();
    x.globalAlpha = live;
    if (!spinning) {
      const glow = 0.16 + 0.10 * Math.sin(now / 380);
      x.beginPath(); x.arc(lx, ky, kr * 1.5, 0, TAU);
      x.fillStyle = 'rgba(255,120,90,' + glow.toFixed(3) + ')'; x.fill();   // "pull me" halo
    }
    x.beginPath(); x.arc(lx, ky, kr, 0, TAU);
    const kg = x.createRadialGradient(lx - kr * .35, ky - kr * .40, kr * .12, lx, ky, kr * 1.05);
    kg.addColorStop(0, '#ffe2d6'); kg.addColorStop(.42, '#ff6b57'); kg.addColorStop(1, '#a2153c');
    x.fillStyle = kg; x.fill();
    x.strokeStyle = INK(.55); x.lineWidth = 1.2; x.stroke();
    x.beginPath(); x.arc(lx - kr * .28, ky - kr * .34, kr * .26, 0, TAU);
    x.fillStyle = INK(.72); x.fill();
    x.restore();

    // chevrons under the knob: pull down
    x.save();
    x.globalAlpha = (spinning ? .12 : .34) * (1 - p * .8);
    x.strokeStyle = INK(1); x.lineWidth = 1.6; x.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const cy = Math.min(maxY + 12, ky + kr + 8) + i * 6;
      x.beginPath(); x.moveTo(lx - 4, cy); x.lineTo(lx, cy + 4); x.lineTo(lx + 4, cy); x.stroke();
    }
    x.restore();
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  K && window.DECIDER_GAMES.push({
    id: 'slots', name: 'Slot machine', short: 'Slots', label: 'Reels', button: false,
    body: `<canvas class="toy" id="slCv"></canvas>
      <div class="res" id="slRes" aria-live="polite"><span class="muted">Pull the lever</span></div>`,
    init() {
      L = K.loop(tick);
      g = K.fit(cv());
      pool = [...new Set(K.options(5))];   // two identical options could show 'No match'
      if (pool.length < 2) pool = ['Yes', 'No', 'Maybe'];
      reels = [0, 1, 2].map(i => ({ pos: i % pool.length, vel: 0, phase: 'done', target: null, stopAt: 0, settled: true, spd: 0 }));
      const c = cv();

      c.addEventListener('pointerdown', e => {
        if (e.button) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e);
        armed = true; pulling = false; startX = p.x; startY = p.y;
        /* a touch during a spin used to be swallowed in silence */
        if (spinning) { try { tone(150, .05, .03, 'square', 90); } catch (err) {} try { buzz(6); } catch (err) {} return; }
        try { buzz(8); } catch (err) {}
      });
      c.addEventListener('pointermove', e => {
        if (!armed) return;
        const p = at(e);
        const dy = p.y - startY;
        if (spinning || dy < 5) return;
        const onLever = LM ? p.x > LM.leverX - LM.leverW * 1.1 : false;
        if (onLever || pulling || dy > 16) {
          pulling = true;
          pull = Math.min(1, (dy - 5) / PULL_PX);
        }
      });
      const release = () => {
        if (!armed) return;
        armed = false;
        const p = pull; pulling = false;
        if (spinning) { pull = 0; return; }
        // a real pull keeps its strength; a tap or a nudge is an average pull
        start(p > 0.08 ? p : 0.5);
        if (p > 0.08) { try { tone(180, .06, .05, 'square', 120); } catch (e) {} }
      };
      c.addEventListener('pointerup', release);
      c.addEventListener('pointercancel', () => { armed = false; pulling = false; if (!spinning) pull = 0; });

      // a mount that is already on screen paints at once, even before enter()
      if (c.clientWidth > 2) { g = K.fit(c); LM = layout(); tick(1, performance.now()); L.start(); }
    },
    enter() {
      if (!g || Math.abs(g.w - cv().clientWidth) > 1) g = K.fit(cv());
      L.start();
    },
    leave() { armed = false; pulling = false; L.stop(); },
    action() { if (!spinning) start(0.5); }
  });
})();
