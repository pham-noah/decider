/* Fidget spinner — flick it, let friction pick the arm under the pointer. */
(function () {
  const K = window.DKIT;
  const cv = () => document.getElementById('fgCv');
  const TAU = Math.PI * 2;
  let L = null, g = null, a = 0, v = 0, arms = 3, labels = [], drag = null,
      touched = false, settling = null, done = false, pool = [];

  const geo = () => ({ cx: g.w / 2, cy: g.h * 0.46, R: g.w * 0.31, lobe: Math.max(15, g.w * 0.085), tagR: g.w * 0.31 * 1.30 });

  function pick() {
    pool = K.options(Math.max(3, arms));
    labels = [];
    for (let i = 0; i < arms; i++) labels.push(pool[i % pool.length] || 'Yes');
  }

  function wrap(t) { while (t > Math.PI) t -= TAU; while (t < -Math.PI) t += TAU; return t; }

  function nearest() {
    const want = -Math.PI / 2;
    let best = 0, bd = 9;
    for (let i = 0; i < arms; i++) {
      const d = Math.abs(wrap(a + (i * TAU) / arms - want));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function spin(force) {
    if (settling) return;
    v = (force || 1) * (0.42 + Math.random() * 0.35) * (Math.random() < 0.5 ? 1 : -1);
    touched = true; done = false;
    K.setResult(document.getElementById('fgRes'), '');
    try { tone(320, .08, .05, 'triangle', 520); } catch (e) {}
  }

  function draw() {
    if (!g) return;
    const x = g.x, G = geo();
    x.clearRect(0, 0, g.w, g.h);

    // table + soft shadow
    x.save();
    const sh = x.createRadialGradient(G.cx, G.cy + G.lobe * 1.6, 4, G.cx, G.cy + G.lobe * 1.6, G.R * 1.25);
    sh.addColorStop(0, 'rgba(40,20,90,.30)'); sh.addColorStop(1, 'rgba(40,20,90,0)');
    x.fillStyle = sh;
    x.beginPath(); x.ellipse(G.cx, G.cy + G.lobe * 1.6, G.R * 1.25, G.lobe * 1.15, 0, 0, TAU); x.fill();
    x.restore();

    const ghost = Math.min(5, Math.floor(Math.abs(v) / 0.09));
    for (let k = ghost; k >= 0; k--) {
      const ang = a - (k * Math.sign(v) * 0.11);
      x.save(); x.globalAlpha = k === 0 ? 1 : 0.10 + 0.06 * (ghost - k);
      for (let i = 0; i < arms; i++) {
        const th = ang + (i * TAU) / arms;
        x.save(); x.translate(G.cx, G.cy); x.rotate(th);
        const lg = x.createLinearGradient(0, 0, G.R, 0);
        lg.addColorStop(0, PAL[1 % PAL.length]);
        lg.addColorStop(1, PAL[(i + 2) % PAL.length]);
        x.strokeStyle = lg; x.lineCap = 'round'; x.lineWidth = G.R * 0.30;
        x.beginPath(); x.moveTo(G.R * 0.10, 0); x.lineTo(G.R * 0.94, 0); x.stroke();
        x.restore();
        x.beginPath();
        x.arc(G.cx + Math.cos(th) * G.R, G.cy + Math.sin(th) * G.R, G.lobe, 0, TAU);
        const rg = x.createRadialGradient(
          G.cx + Math.cos(th) * G.R - G.lobe * .3, G.cy + Math.sin(th) * G.R - G.lobe * .35, 2,
          G.cx + Math.cos(th) * G.R, G.cy + Math.sin(th) * G.R, G.lobe);
        rg.addColorStop(0, '#ffffff'); rg.addColorStop(.55, PAL[(i + 2) % PAL.length]); rg.addColorStop(1, PAL[(i + 4) % PAL.length]);
        x.fillStyle = rg; x.fill();
        x.beginPath();
        x.arc(G.cx + Math.cos(th) * G.R, G.cy + Math.sin(th) * G.R, G.lobe * 0.42, 0, TAU);
        x.fillStyle = 'rgba(255,255,255,.92)'; x.fill();
        x.strokeStyle = 'rgba(36,26,85,.22)'; x.lineWidth = 1.5; x.stroke();
      }
      x.restore();
    }

    // hub
    x.beginPath(); x.arc(G.cx, G.cy, G.R * 0.30, 0, TAU);
    const hg = x.createRadialGradient(G.cx - 6, G.cy - 8, 2, G.cx, G.cy, G.R * 0.3);
    hg.addColorStop(0, '#fff'); hg.addColorStop(1, 'rgba(255,255,255,.55)');
    x.fillStyle = hg; x.fill();
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 2; x.stroke();
    x.beginPath(); x.arc(G.cx, G.cy, G.R * 0.11, 0, TAU);
    x.fillStyle = 'rgba(36,26,85,.18)'; x.fill();

    // labels on the arms
    for (let i = 0; i < arms; i++) {
      const th = a + (i * TAU) / arms;
      const lx = G.cx + Math.cos(th) * G.tagR, ly = G.cy + Math.sin(th) * G.tagR;
      const fs = g.w < 360 ? 10 : 12;
      let txt = labels[i];
      x.font = `700 ${fs}px "Bricolage Grotesque",system-ui,sans-serif`;
      while (txt.length > 2 && x.measureText(txt).width > 84) txt = txt.slice(0, -1);
      if (txt !== labels[i]) txt = txt.slice(0, -1) + '…';
      K.tag(x, lx, ly, txt, 'rgba(255,255,255,.94)', '#241a55', fs);
    }

    // fixed pointer at the top
    const py = G.cy - G.tagR - 24;
    x.beginPath(); x.moveTo(G.cx, py + 12); x.lineTo(G.cx - 9, py); x.lineTo(G.cx + 9, py);
    x.closePath(); x.fillStyle = '#fff'; x.fill();
    x.strokeStyle = 'rgba(36,26,85,.25)'; x.lineWidth = 1.2; x.stroke();
    x.beginPath(); x.moveTo(G.cx, py + 14); x.lineTo(G.cx, G.cy - G.R - G.lobe - 4);
    x.setLineDash([3, 5]); x.strokeStyle = 'rgba(255,255,255,.4)'; x.stroke(); x.setLineDash([]);

    // rpm readout
    const rpm = Math.round(Math.abs(v) * 573);
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = 'rgba(255,255,255,.92)';
    x.font = '800 30px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillText(String(rpm), G.cx, g.h - 30);
    x.font = '700 11px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillStyle = 'rgba(255,255,255,.5)';
    x.fillText('RPM', G.cx, g.h - 14);
  }

  function tick(dt) {
    if (!g) return;
    if (settling) {
      a += wrap(settling - a) * 0.17 * dt;
      v *= Math.pow(0.80, dt);
      if (Math.abs(wrap(settling - a)) < 0.006) {
        a = settling; settling = null; v = 0;
        if (!done) {
          done = true;
          const label = labels[nearest()];
          K.setResult(document.getElementById('fgRes'), label);
          K.decide(label, 'Fidget', 'The pointer picks');
        }
      }
    } else if (drag) {
      /* angle is driven by the finger */
    } else if (Math.abs(v) > 0.012) {
      a += v * dt;
      v *= Math.pow(0.986, dt);
      if (Math.abs(v) < 0.02 && touched && !done) {
        const k = nearest();
        const base = -Math.PI / 2 - (k * TAU) / arms;
        settling = base + Math.round((a - base) / TAU) * TAU;
        try { tone(720, .1, .05, 'sine', 400); } catch (e) {}
      }
    } else {
      v = 0;
      if (!touched) a += 0.0016 * dt;   // lazy idle drift
    }
    draw();
  }

  function ang(e) {
    const r = cv().getBoundingClientRect();
    return Math.atan2(e.clientY - r.top - geo().cy, e.clientX - r.left - geo().cx);
  }

  K && window.DECIDER_GAMES.push({
    id: 'fidget', name: 'Fidget spinner', short: 'Fidget', label: 'Arms',
    body: `<canvas class="toy" id="fgCv"></canvas>
      <div class="res" id="fgRes" aria-live="polite"><span class="muted">Flick it</span></div>
      <button class="btn" id="fgGo">Flick</button>`,
    tune: `<div class="lbl">Arms</div><div class="chips" id="fgArms" style="margin:0"></div>`,
    init(card) {
      L = K.loop(tick);
      pick();
      g = K.fit(cv());
      const c = cv();
      c.addEventListener('pointerdown', e => {
        if (settling) return;
        c.setPointerCapture(e.pointerId);
        drag = { ang: ang(e), live: false };
        touched = true;
      });
      c.addEventListener('pointermove', e => {
        if (!drag) return;
        const na = ang(e), d = wrap(na - drag.ang);
        drag.ang = na;
        if (Math.abs(d) > 0.0008) { drag.live = true; a += d; v = Math.max(-0.9, Math.min(0.9, d)); }
      });
      const up = () => {
        if (!drag) return;
        if (!drag.live) v = 0;
        drag = null;
        if (Math.abs(v) < 0.03) v = 0.05 * (Math.random() < .5 ? 1 : -1);
        done = false;
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      card.querySelector('#fgGo').onclick = () => spin(1);
      const chips = card.querySelector('#fgArms');
      const render = () => {
        chips.innerHTML = [3, 5].map(n => `<button class="chip${n === arms ? ' on' : ''}" data-n="${n}">${n}</button>`).join('');
        chips.querySelectorAll('.chip').forEach(b => b.onclick = () => {
          if (settling) return;
          arms = +b.dataset.n; pick(); done = false; render();
          K.setResult(document.getElementById('fgRes'), '');
        });
      };
      render();
    },
    enter() { if (!g || Math.abs(g.w - cv().clientWidth) > 1) g = K.fit(cv()); L.start(); },
    leave() { L.stop(); },
    action() { spin(1); }
  });
})();
