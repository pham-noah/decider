/* Scratch card — rub the foil off; a trinket is under it. */
(function () {
  const K = window.DKIT;
  const $ = (id) => document.getElementById(id);
  const cv = () => $('scCv');
  const TAU = Math.PI * 2;
  let L = null, g = null, base = null, mask = null, pool = [], label = 'Yes',
      pts = new Map(), revealed = false, done = false, frac = 0,
      checkAt = 0, autoY = -1, fading = 0, sheen = 0, specks = [], baseSkin = '';

  const box = () => ({ x: 14, y: 40, w: Math.max(40, g.w - 28), h: Math.max(40, g.h - 56) });
  const font = (s) => `800 ${s}px "Bricolage Grotesque",system-ui,sans-serif`;

  function build(keep) {
    const c = cv(); if (!c) return;
    const old = keep ? mask : null;
    g = K.fit(c);
    const W = Math.round(g.w * g.dpr), H = Math.round(g.h * g.dpr);
    base = document.createElement('canvas'); base.width = W; base.height = H;
    mask = document.createElement('canvas'); mask.width = W; mask.height = H;
    if (!specks.length) specks = Array.from({ length: 18 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, p: Math.random() * TAU }));
    paintBase(); paintFoil();
    /* a resize used to throw the scratch away: keep the holes the player made */
    if (old && old.width) {
      const m = mask.getContext('2d');
      m.setTransform(1, 0, 0, 1, 0, 0);
      m.globalCompositeOperation = 'destination-in';
      m.drawImage(old, 0, 0, W, H);
      m.globalCompositeOperation = 'source-over';
    }
  }

  /* the twelve trinkets all rendered as the same 46px word; five primitives cover them */
  function trinket(b, cx, cy, r, name) {
    b.save(); b.translate(cx, cy); b.lineWidth = Math.max(2, r * 0.10);
    b.strokeStyle = '#241a55'; b.fillStyle = '#fffdf8';
    const n = name.toLowerCase();
    if (/star|moon/.test(n)) {
      b.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; b[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
      b.closePath(); b.fill(); b.stroke();
    } else if (/coin|bell|cherry|shell/.test(n)) {
      b.beginPath(); b.arc(0, 0, r * .78, 0, TAU); b.fill(); b.stroke();
      b.beginPath(); b.arc(0, 0, r * .34, 0, TAU); b.fillStyle = PAL[1 % PAL.length]; b.fill();
    } else if (/crown/.test(n)) {
      b.beginPath(); b.moveTo(-r * .8, r * .45); b.lineTo(-r * .8, -r * .35); b.lineTo(-r * .35, r * .05);
      b.lineTo(0, -r * .55); b.lineTo(r * .35, r * .05); b.lineTo(r * .8, -r * .35); b.lineTo(r * .8, r * .45);
      b.closePath(); b.fill(); b.stroke();
    } else if (/fish|dinosaur/.test(n)) {
      b.beginPath(); b.ellipse(-r * .12, 0, r * .65, r * .42, 0, 0, TAU); b.fill(); b.stroke();
      b.beginPath(); b.moveTo(r * .5, 0); b.lineTo(r * .92, -r * .35); b.lineTo(r * .92, r * .35); b.closePath(); b.fill(); b.stroke();
    } else if (/key/.test(n)) {
      b.beginPath(); b.arc(-r * .45, 0, r * .3, 0, TAU); b.fill(); b.stroke();
      b.beginPath(); b.moveTo(-r * .15, 0); b.lineTo(r * .8, 0); b.moveTo(r * .5, 0); b.lineTo(r * .5, r * .28); b.stroke();
    } else {
      b.beginPath(); b.arc(0, 0, r * .7, 0, TAU); b.fill(); b.stroke();
      b.beginPath(); b.moveTo(-r * .2, -r * .35); b.lineTo(r * .2, -r * .35); b.lineTo(r * .2, r * .45);
      b.lineTo(0, r * .2); b.lineTo(-r * .2, r * .45); b.closePath(); b.fill(); b.stroke();
    }
    b.restore();
  }

  function wrap(b, text, maxW) {
    const out = []; let cur = '';
    String(text).split(/\s+/).forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (b.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    });
    if (cur) out.push(cur);
    return out;
  }

  /* the reveal: painted on the card's own stock, in the material's ink */
  function paintBase() {
    const b = base.getContext('2d'), B = box(), m = K.mat();
    b.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    b.clearRect(0, 0, g.w, g.h);
    baseSkin = m.skin;
    const rad = Math.min(20, m.radius + 6);
    K.rr(b, B.x + 1, B.y + 1, B.w - 2, B.h - 2, rad);
    b.lineWidth = 1;
    b.strokeStyle = m.flat ? 'rgba(36,26,58,.18)' : K.light(.12);
    b.stroke();

    K.label(b, 'THE CARD SAYS', g.w / 2, B.y + B.h * 0.20, 10);
    trinket(b, g.w / 2, B.y + B.h * 0.36, Math.min(38, B.w * 0.125), label);

    let size = 44, lines = [];
    b.font = font(size);
    while (size > 16) {
      lines = wrap(b, label, B.w - 54);
      if (lines.length * size * 1.14 <= B.h * 0.30) break;
      size -= 3; b.font = font(size);
    }
    const lh = size * 1.14, y0 = B.y + B.h * 0.64 - (lines.length - 1) * lh / 2;
    lines.forEach((t, i) => K.label(b, t, g.w / 2, y0 + i * lh, size));

    for (let i = 0; i < 5; i++) {
      b.beginPath();
      b.arc(g.w / 2 + (i - 2) * 17, B.y + B.h * 0.86, 3, 0, TAU);
      b.fillStyle = PAL[i % PAL.length] + 'aa'; b.fill();
    }
  }

  function paintFoil() {
    const m = mask.getContext('2d'), B = box(), mat = K.mat();
    m.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    m.clearRect(0, 0, g.w, g.h);
    m.save();
    const rad = Math.min(20, mat.radius + 6);
    K.rr(m, B.x, B.y, B.w, B.h, rad);
    m.clip();
    if (mat.flat) {
      /* paper: flat ink-washed foil, no gradient, no glare */
      m.fillStyle = '#ded3bd'; m.fillRect(B.x, B.y, B.w, B.h);
      m.globalAlpha = .16; m.strokeStyle = '#241a3a'; m.lineWidth = 1;
      for (let i = -B.h; i < B.w + B.h; i += 8) {
        m.beginPath(); m.moveTo(B.x + i, B.y); m.lineTo(B.x + i + B.h, B.y + B.h); m.stroke();
      }
      m.globalAlpha = .3;
      m.fillStyle = '#241a3a';
      for (let i = 0; i < 40; i++) {
        m.beginPath(); m.arc(B.x + Math.random() * B.w, B.y + Math.random() * B.h, Math.random() * 1.2, 0, TAU); m.fill();
      }
      m.globalAlpha = .85; m.fillStyle = '#241a3a';
    } else {
      const grd = m.createLinearGradient(B.x, B.y, B.x + B.w, B.y + B.h);
      grd.addColorStop(0, '#6d5bff'); grd.addColorStop(.4, '#a94bff');
      grd.addColorStop(.68, '#ff5ea8'); grd.addColorStop(1, '#57cdfd');
      m.fillStyle = grd; m.fillRect(B.x, B.y, B.w, B.h);
      m.globalAlpha = .15; m.strokeStyle = K.light(1); m.lineWidth = 1;
      for (let i = -B.h; i < B.w + B.h; i += 7) {
        m.beginPath(); m.moveTo(B.x + i, B.y); m.lineTo(B.x + i + B.h, B.y + B.h); m.stroke();
      }
      m.globalAlpha = .5; m.fillStyle = K.light(1);
      for (let i = 0; i < 60; i++) {
        m.beginPath(); m.arc(B.x + Math.random() * B.w, B.y + Math.random() * B.h, Math.random() * 1.3, 0, TAU); m.fill();
      }
      m.globalAlpha = .95; m.fillStyle = K.light(1);
    }
    m.textAlign = 'center'; m.textBaseline = 'middle';
    m.font = font(13);
    const word = 'SCRATCH';
    for (let i = 0; i < word.length; i++) m.fillText(word[i], g.w / 2 + (i - 3) * 15, B.y + B.h * 0.5);
    m.globalAlpha = .6; m.font = '600 10px system-ui,sans-serif';
    m.fillText('rub here', g.w / 2, B.y + B.h * 0.5 + 26);
    m.globalAlpha = .45; m.lineWidth = 2; m.setLineDash([5, 6]);
    K.rr(m, B.x + 8, B.y + 8, B.w - 16, B.h - 16, rad - 6);
    m.strokeStyle = mat.flat ? '#241a3a' : K.light(1); m.stroke();
    m.restore();
  }

  function brush() { return Math.max(15, g.w * 0.072); }

  function erase(x0, y0, x1, y1) {
    try { const n = performance.now(); if (n - (erase.t || 0) > 70) { erase.t = n; tone(170 + Math.random() * 60, .035, .02, 'sawtooth', 90); buzz(4); } } catch (e) {}
    const m = mask.getContext('2d');
    m.save();
    m.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    m.globalCompositeOperation = 'destination-out';
    m.lineCap = 'round'; m.lineJoin = 'round'; m.lineWidth = brush() * 2;
    m.beginPath(); m.moveTo(x0, y0); m.lineTo(x1, y1); m.stroke();
    m.beginPath(); m.arc(x1, y1, brush(), 0, TAU); m.fill();
    m.restore();
  }

  function percent() {
    const B = box(), d = mask.getContext('2d').getImageData(0, 0, mask.width, mask.height).data;
    let n = 0, c = 0;
    for (let y = B.y + 2; y < B.y + B.h - 2; y += 4) {
      for (let xx = B.x + 2; xx < B.x + B.w - 2; xx += 4) {
        n++;
        if (d[((y * g.dpr | 0) * mask.width + (xx * g.dpr | 0)) * 4 + 3] < 60) c++;
      }
    }
    return n ? c / n : 0;
  }

  function finish() { if (fading === 0 && !revealed) fading = 1; }

  function started() {
    if (done) return;
    done = true;
    K.setResult($('scRes'), label);
    /* noResult:true — a scratch card celebrates locally, it does not hand out a verdict */
    try { tone(660, .1, .06, 'sine', 990); tone(990, .14, .04, 'sine', 1320); } catch (e) {}
    try { buzz([10, 26, 10]); } catch (e) {}
    try { confetti(); } catch (e) {}
  }

  function paint(dt, now) {
    if (!g) return;
    /* a skin switch has to repaint the stock's ink and the foil as well; build(true)
       keeps the holes the player already scratched. A height-only resize (a collapsing
       URL bar, max-height:62vh) changes the canvas too, so watch both. */
    const f = K.fit(cv());
    if (K.mat().skin !== baseSkin || f.w !== g.w || f.h !== g.h) build(true);
    const x = g.x, B = box(), m = K.mat();

    if (autoY >= 0) {
      for (let k = 0; k < 2; k++) {
        const y = autoY + k * 12;
        if (y > B.y + B.h) break;
        const odd = Math.floor((y - B.y) / 12) % 2;
        erase(odd ? B.x + 10 : B.x + B.w - 10, y, odd ? B.x + B.w - 10 : B.x + 10, y);
      }
      autoY += 11;
      if (autoY > B.y + B.h + 6) { autoY = -1; finish(); }
    }

    if (fading > 0) {
      const mk = mask.getContext('2d');
      mk.save();
      mk.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      mk.globalCompositeOperation = 'destination-out'; mk.globalAlpha = 0.2;
      mk.fillRect(B.x, B.y, B.w, B.h);
      mk.restore();
      fading -= dt * 0.055;
      if (fading <= 0) { fading = 0; revealed = true; frac = 1; started(); }
    }

    K.surf(x, g.w, g.h);
    if (m.flat) {
      K.rr(x, 0.9, 0.9, g.w - 1.8, g.h - 1.8, Math.max(2, m.radius - 1));
      x.strokeStyle = m.outline || '#241a3a'; x.lineWidth = 1.5; x.stroke();
    }
    x.drawImage(base, 0, 0, g.w, g.h);
    x.drawImage(mask, 0, 0, g.w, g.h);

    if (!revealed) {
      sheen += dt * 0.014;
      const p = Math.sin(sheen) * 0.5 + 0.5;
      x.save();
      K.rr(x, B.x, B.y, B.w, B.h, Math.min(20, m.radius + 6)); x.clip();
      if (!m.flat) {
        /* a sheen is light, never ink: INK() here bruised the paper card */
        const gx = B.x - B.w * 0.5 + p * B.w * 2;
        const lg = x.createLinearGradient(gx - 70, 0, gx + 70, 0);
        lg.addColorStop(0, K.light(0));
        lg.addColorStop(.5, K.light(.20));
        lg.addColorStop(1, K.light(0));
        x.globalCompositeOperation = 'lighter'; x.fillStyle = lg;
        x.fillRect(B.x, B.y, B.w, B.h);
        x.globalCompositeOperation = 'source-over';
        const tt = now / 1000;
        specks.forEach((s) => {
          x.globalAlpha = .30 + .30 * Math.sin(tt * 2 + s.p);
          x.fillStyle = K.light(1);
          x.beginPath(); x.arc(B.x + s.x * B.w, B.y + s.y * B.h, s.r, 0, TAU); x.fill();
        });
        x.globalAlpha = 1;
      }
      x.restore();
    }

    /* progress chrome lives above the card, never over the trinket */
    K.label(x, revealed ? 'revealed' : Math.round(frac * 100) + '% scratched', 16, 14, 10, 'left');
    const barY = 26;
    K.rr(x, 16, barY, g.w - 32, 6, 3);
    x.fillStyle = m.flat ? 'rgba(36,26,58,.18)' : K.light(.22); x.fill();
    K.rr(x, 16, barY, Math.max(6, (g.w - 32) * frac), 6, 3);
    x.fillStyle = revealed ? '#2f9e6a' : (m.flat ? '#241a3a' : K.light(.9));
    x.fill();
  }

  function pos(e) {
    const r = cv().getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function newCard() {
    // a scratch card reveals a trinket, not a decision
    pool = ['a tiny star', 'a lucky coin', 'a paper crown', 'a fish', 'a rocket', 'a cherry',
            'a key', 'a shell', 'a moon', 'a dinosaur', 'a bell', 'a feather'];
    label = pool[Math.floor(Math.random() * pool.length)];
    revealed = false; done = false; frac = 0; fading = 0; autoY = -1;
    pts.clear(); checkAt = 0; sheen = Math.random() * 6;
    if (!cv() || !cv().clientWidth) return;
    build(false);
    const r = $('scRes');
    if (r) r.innerHTML = '<span class="muted">Rub the foil to reveal</span>';
  }

  K && window.DECIDER_GAMES.push({
    id: 'scratch', name: 'Scratch card', short: 'Scratch', label: 'Cards', noResult: true, button: false,
    body: `<canvas class="toy" id="scCv"></canvas>
      <div class="res" id="scRes" aria-live="polite"><span class="muted">Rub the foil to reveal</span></div>
      <button class="chip" id="scNew" style="margin-top:10px">New card</button>`,
    init(card) {
      L = K.loop((dt, now) => paint(dt, now));
      newCard();
      const c = cv();
      c.addEventListener('pointerdown', (e) => {
        if (e.button || revealed || fading > 0) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = pos(e);
        /* one trail per pointerId: a second thumb used to hijack the first one's
           last point and draw a line straight across the card */
        pts.set(e.pointerId, p);
        autoY = -1;
        erase(p.x, p.y, p.x, p.y);
      });
      c.addEventListener('pointermove', (e) => {
        if (revealed || fading > 0) return;
        const s = pts.get(e.pointerId);
        if (!s) return;
        const p = pos(e);
        erase(s.x, s.y, p.x, p.y);
        pts.set(e.pointerId, p);
        const n = performance.now();
        if (n - checkAt > 160) {
          checkAt = n;
          frac = Math.min(1, percent());
          if (frac > 0.55) finish();
        }
      });
      const up = (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.delete(e.pointerId);
        try { c.releasePointerCapture(e.pointerId); } catch (err) {}
        if (pts.size === 0 && !revealed && fading === 0) {
          frac = Math.min(1, percent());
          if (frac > 0.55) finish();
        }
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      card.querySelector('#scNew').onclick = newCard;
    },
    enter() {
      if (!g) newCard();
      else {
        const f = K.fit(cv());
        if (Math.abs(f.w - g.w) > 1 || Math.abs(f.h - g.h) > 1) build(true);   // width AND height
      }
      L.start();
    },
    leave() { L.stop(); pts.clear(); },
    action() {
      if (!g) newCard();
      if (revealed) newCard();
      else if (autoY < 0 && fading === 0) { autoY = box().y + 2; K.press(380); }
    }
  });
})();
