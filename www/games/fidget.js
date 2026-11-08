/* Fidget spinner — flick it, let friction pick the arm under the pointer. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  const cv = () => document.getElementById('fgCv');
  const TAU = Math.PI * 2;
  let L = null, g = null, a = 0, v = 0, arms = 3, labels = [], drag = null,
      touched = false, settling = null, done = false, pool = [];

  const geo = () => {
    const s = Math.min(g.w * .86, g.h * .84);
    const R = s * .30;
    return { cx: g.w / 2, cy: g.h * .48, R, lobe: Math.max(12, s * .088), tagR: R * 1.40, s };
  };

  function pick() {
    /* labels[i % pool.length] repeated the pool over the arms: 5 options on 3 arms
       dropped two answers, and 2 options on 3 arms was a 2:1 bias */
    pool = K.options(arms);
    while (pool.length < arms) pool.push('…');
    labels = [];
    /* one distinct option per arm — no repeat, no bias; a spare arm reads '…' */
    for (let i = 0; i < arms; i++) labels.push(pool[i] || '…');
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

  /* a real spinner is a machined plate with three bearings in it, not three
     sticks: a tri-lobe body, steel bearing caps set into each lobe, a chrome
     centre race, and no readout carved into it — the pointer says where it
     stopped and the line under the toy says what that was. */
  function bodyPath(x, G) { bodyShape(x, G, false); }

  /* the plate: three lobes joined by fat rounded arms, so the silhouette is a
     spinner and not a triangle */
  function bodyShape(x, G, fill, fat) {
    const { cx, cy, R, lobe } = G;
    const wdt = lobe * 1.32 * (fat || 1);
    x.beginPath();
    for (let i = 0; i < arms; i++) {
      const th = a + (i * TAU) / arms;
      const px = cx + Math.cos(th) * R, py = cy + Math.sin(th) * R;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
    if (fill) x.fill();
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.lineWidth = wdt; x.stroke();
    for (let i = 0; i < arms; i++) {
      const th = a + (i * TAU) / arms;
      const px = cx + Math.cos(th) * R, py = cy + Math.sin(th) * R;
      x.lineWidth = wdt;
      x.beginPath(); x.arc(px, py, lobe * 1.12, 0, TAU); if (fill) x.fill(); else x.stroke();
    }
  }

  function lobeCap(x, px, py, r, i) {
    /* a bearing pressed into the lobe: outer race, bore, and a specular */
    const og = x.createRadialGradient(px - r * .35, py - r * .4, r * .1, px, py, r);
    og.addColorStop(0, '#f7f9ff'); og.addColorStop(.55, '#b9c0d4'); og.addColorStop(1, '#6d7590');
    x.beginPath(); x.arc(px, py, r, 0, TAU); x.fillStyle = og; x.fill();
    x.beginPath(); x.arc(px, py, r * .72, 0, TAU);
    x.fillStyle = i % 2 ? 'rgba(28,20,52,.55)' : 'rgba(20,14,40,.62)'; x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.stroke();
    x.beginPath(); x.arc(px - r * .30, py - r * .34, r * .18, 0, TAU);
    x.fillStyle = 'rgba(255,255,255,.75)'; x.fill();
  }

  function draw() {
    if (!g) return;
    const x = g.x, G = geo();
    const { cx, cy, R, lobe, tagR } = G;
    x.clearRect(0, 0, g.w, g.h);

    /* the shadow it casts on the table */
    x.save();
    const sh = x.createRadialGradient(cx, cy + lobe * 1.5, 3, cx, cy + lobe * 1.5, R * 1.15);
    sh.addColorStop(0, 'rgba(18,10,44,.16)'); sh.addColorStop(1, 'rgba(18,10,44,0)');
    x.fillStyle = sh;
    x.beginPath(); x.ellipse(cx, cy + lobe * 1.5, R * 1.15, lobe * .95, 0, 0, TAU); x.fill();
    x.restore();

    /* motion blur: the plate itself smears, not the arms */
    const blur = Math.min(3, Math.floor(Math.abs(v) / 0.16));
    for (let k = blur; k >= 1; k--) {
      const saveA = a;
      a = saveA - k * Math.sign(v) * 0.085;
      x.save(); x.globalAlpha = 0.035 + 0.03 * (blur - k);
      x.fillStyle = '#d6dcea'; x.strokeStyle = '#d6dcea';
      bodyShape(x, G, true);
      x.restore();
      a = saveA;
    }

    /* the plate: brushed steel, lit from the top left */
    const pg = x.createLinearGradient(cx - R, cy - R * 1.2, cx + R * .9, cy + R);
    pg.addColorStop(0, '#ffffff'); pg.addColorStop(.22, '#e9eefa');
    pg.addColorStop(.55, '#c8d0e2'); pg.addColorStop(.82, '#a2aabf');
    pg.addColorStop(1, '#868ea4');
    /* an edge a shade wider in dark first, then the steel on top: the plate reads
       as a machined part with thickness instead of a sticker */
    x.strokeStyle = 'rgba(26,18,50,.5)';
    bodyShape(x, G, false, 1.05);
    x.fillStyle = pg; x.strokeStyle = pg;
    bodyShape(x, G, true);

    /* machined highlights along the top of each arm */
    x.save(); bodyPath(x, G); x.clip();
    const hl = x.createLinearGradient(0, cy - R - lobe, 0, cy + R);
    hl.addColorStop(0, 'rgba(255,255,255,.55)'); hl.addColorStop(.45, 'rgba(255,255,255,0)');
    x.fillStyle = hl; x.fillRect(cx - R * 1.5, cy - R * 1.6, R * 3, R * 3.2);
    x.restore();

    /* bearings in the lobes */
    for (let i = 0; i < arms; i++) {
      const th = a + (i * TAU) / arms;
      lobeCap(x, cx + Math.cos(th) * R, cy + Math.sin(th) * R, lobe * .78, i);
    }

    /* the centre race: chrome ring round a dark bore, with a notch that turns */
    const hubR = R * .34;
    const hg = x.createRadialGradient(cx - hubR * .4, cy - hubR * .45, hubR * .12, cx, cy, hubR);
    hg.addColorStop(0, '#ffffff'); hg.addColorStop(.5, '#cfd6e8');
    hg.addColorStop(.82, '#8c94ad'); hg.addColorStop(1, '#5f677d');
    x.beginPath(); x.arc(cx, cy, hubR, 0, TAU); x.fillStyle = hg; x.fill();
    x.strokeStyle = 'rgba(24,16,46,.5)'; x.lineWidth = 1.4; x.stroke();
    x.beginPath(); x.arc(cx, cy, hubR * .62, 0, TAU);
    x.fillStyle = 'rgba(16,10,34,.72)'; x.fill();
    x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 1; x.stroke();
    /* the notch: it is the only way to see the bore spin */
    x.save(); x.translate(cx, cy); x.rotate(a);
    x.beginPath(); x.moveTo(hubR * .20, 0); x.lineTo(hubR * .55, -hubR * .12); x.lineTo(hubR * .55, hubR * .12);
    x.closePath(); x.fillStyle = 'rgba(255,255,255,.6)'; x.fill();
    x.restore();
    x.beginPath(); x.arc(cx - hubR * .34, cy - hubR * .40, hubR * .18, 0, TAU);
    x.fillStyle = 'rgba(255,255,255,.85)'; x.fill();

    /* option tags, riding the arms */
    for (let i = 0; i < arms; i++) {
      const th = a + (i * TAU) / arms;
      const lx = cx + Math.cos(th) * tagR, ly = cy + Math.sin(th) * tagR;
      const fs = g.w < 360 ? 10 : 12;
      let txt = labels[i];
      x.font = `700 ${fs}px "Bricolage Grotesque",system-ui,sans-serif`;
      while (txt.length > 2 && x.measureText(txt).width > 84) txt = txt.slice(0, -1);
      if (txt !== labels[i]) txt = txt.slice(0, -1) + '…';
      K.tag(x, lx, ly, txt, '#fffdf8', '#241a55', fs);
    }

    /* fixed pointer at the top */
    const py = cy - tagR - 24;
    x.beginPath(); x.moveTo(cx, py + 12); x.lineTo(cx - 9, py); x.lineTo(cx + 9, py);
    x.closePath(); x.fillStyle = INK(1); x.fill();
    x.strokeStyle = 'rgba(36,26,85,.25)'; x.lineWidth = 1.2; x.stroke();
    x.beginPath(); x.moveTo(cx, py + 14); x.lineTo(cx, cy - R - lobe - 4);
    x.setLineDash([3, 5]); x.strokeStyle = INK(.4); x.stroke(); x.setLineDash([]);
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
        }
      }
    } else if (drag) {
      /* angle is driven by the finger */
    } else if (Math.abs(v) > 0.012) {
      a += v * dt;
      v *= Math.pow(0.955, dt);   // ~1.2s to settle instead of 4-5
      if (Math.abs(v) < 0.02 && touched && !done) {
        const k = nearest();
        const base = -Math.PI / 2 - (k * TAU) / arms;
        settling = base + Math.round((a - base) / TAU) * TAU;
        try { tone(720, .1, .05, 'sine', 400); } catch (e) {}
      }
    } else {
      v = 0;
      if (!touched || done) a += 0.0016 * dt;   // breathe before the first touch and after every answer
    }
    draw();
  }

  function ang(e) {
    const r = cv().getBoundingClientRect();
    return Math.atan2(e.clientY - r.top - geo().cy, e.clientX - r.left - geo().cx);
  }

  K && window.DECIDER_GAMES.push({
    id: 'fidget', name: 'Fidget spinner', short: 'Fidget', label: 'Arms', noResult: true, button: false,
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
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
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
        /* a light touch used to get a coin-flip direction; now the disc simply
           stays where you put it, so placement is still the answer */
        if (!drag.live) v = 0;
        drag = null;
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
