/* Scratch card — rub the foil off; once enough is gone the card decides. */
(function () {
  const K = window.DKIT;
  const $ = (id) => document.getElementById(id);
  const cv = () => $('scCv');
  const TAU = Math.PI * 2;
  let L = null, g = null, base = null, mask = null, pool = [], label = 'Yes',
      down = false, seen = null, revealed = false, done = false, frac = 0,
      checkAt = 0, autoY = -1, fading = 0, sheen = 0, specks = [];

  const box = () => ({ x: 10, y: 10, w: g.w - 20, h: g.h - 20 });

  function font(s) { return `800 ${s}px "Bricolage Grotesque",system-ui,sans-serif`; }

  function build() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const W = Math.round(g.w * g.dpr), H = Math.round(g.h * g.dpr);
    base = document.createElement('canvas'); base.width = W; base.height = H;
    mask = document.createElement('canvas'); mask.width = W; mask.height = H;
    specks = Array.from({ length: 20 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.7, p: Math.random() * TAU }));
    paintBase(); paintFoil();
  }

  function wrap(b, text, maxW) {
    const out = []; let cur = '';
    String(text).split(/\s+/).forEach(w => {
      const t = cur ? cur + ' ' + w : w;
      if (b.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    });
    if (cur) out.push(cur);
    return out;
  }

  function paintBase() {
    const b = base.getContext('2d'), B = box();
    b.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    b.clearRect(0, 0, g.w, g.h);
    K.rr(b, B.x, B.y, B.w, B.h, 22);
    const grd = b.createLinearGradient(B.x, B.y, B.x + B.w, B.y + B.h);
    grd.addColorStop(0, '#fffdf8'); grd.addColorStop(.55, '#f5eeff'); grd.addColorStop(1, '#e9f4ff');
    b.fillStyle = grd; b.fill();
    b.save(); b.clip();
    for (let i = 0; i < 6; i++) {
      b.beginPath();
      b.arc(B.x + 20 + ((i * 97) % (B.w - 30)), B.y + 24 + ((i * 79) % (B.h - 40)), 30 + (i % 3) * 18, 0, TAU);
      b.fillStyle = PAL[(i + 1) % PAL.length] + '22'; b.fill();
    }
    b.restore();

    b.textAlign = 'center'; b.fillStyle = 'rgba(36,26,85,.42)';
    b.font = '700 11px "Bricolage Grotesque",system-ui,sans-serif';
    b.fillText('THE CARD SAYS', g.w / 2, B.y + B.h * 0.30);

    let size = 46, lines = [];
    b.font = font(size);
    while (size > 15) {
      lines = wrap(b, label, B.w - 56);
      if (lines.length * size * 1.14 <= B.h * 0.5) break;
      size -= 3; b.font = font(size);
    }
    b.fillStyle = '#241a55';
    const lh = size * 1.14, y0 = B.y + B.h * 0.47 - (lines.length - 1) * lh / 2;
    lines.forEach((t, i) => b.fillText(t, g.w / 2, y0 + i * lh + size * 0.34));

    for (let i = 0; i < 5; i++) {
      b.beginPath();
      b.arc(g.w / 2 + (i - 2) * 17, B.y + B.h * 0.80, 3, 0, TAU);
      b.fillStyle = PAL[i % PAL.length] + '99'; b.fill();
    }
  }

  function paintFoil() {
    const m = mask.getContext('2d'), B = box();
    m.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    m.clearRect(0, 0, g.w, g.h);
    m.save();
    K.rr(m, B.x, B.y, B.w, B.h, 22);
    m.clip();
    const grd = m.createLinearGradient(B.x, B.y, B.x + B.w, B.y + B.h);
    grd.addColorStop(0, '#6d5bff'); grd.addColorStop(.4, '#a94bff');
    grd.addColorStop(.68, '#ff5ea8'); grd.addColorStop(1, '#57cdfd');
    m.fillStyle = grd; m.fillRect(B.x, B.y, B.w, B.h);
    m.globalAlpha = .15; m.strokeStyle = '#fff'; m.lineWidth = 1;
    for (let i = -B.h; i < B.w + B.h; i += 7) {
      m.beginPath(); m.moveTo(B.x + i, B.y); m.lineTo(B.x + i + B.h, B.y + B.h); m.stroke();
    }
    m.globalAlpha = .5; m.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) {
      m.beginPath(); m.arc(B.x + Math.random() * B.w, B.y + Math.random() * B.h, Math.random() * 1.3, 0, TAU); m.fill();
    }
    m.globalAlpha = .95; m.textAlign = 'center'; m.textBaseline = 'middle';
    m.font = font(13);
    const word = 'SCRATCH';
    for (let i = 0; i < word.length; i++) m.fillText(word[i], g.w / 2 + (i - 3) * 15, B.y + B.h * 0.5);
    m.globalAlpha = .5; m.font = '600 10px system-ui,sans-serif';
    m.fillText('rub here', g.w / 2, B.y + B.h * 0.5 + 26);
    m.globalAlpha = .45; m.lineWidth = 2; m.setLineDash([5, 6]);
    K.rr(m, B.x + 8, B.y + 8, B.w - 16, B.h - 16, 15); m.strokeStyle = '#fff'; m.stroke();
    m.restore();
  }

  function brush() { return Math.max(15, g.w * 0.072); }

  function erase(x0, y0, x1, y1) {
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
    K.decide(label, 'Scratch card', 'Under the foil');
  }

  function paint(dt, now) {
    if (!g) return;
    const x = g.x, B = box();

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
      const m = mask.getContext('2d');
      m.save();
      m.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      m.globalCompositeOperation = 'destination-out'; m.globalAlpha = 0.2;
      m.fillRect(B.x, B.y, B.w, B.h);
      m.restore();
      fading -= dt * 0.055;
      if (fading <= 0) {
        fading = 0; revealed = true; frac = 1; started();
      }
    }

    x.clearRect(0, 0, g.w, g.h);
    x.drawImage(base, 0, 0, g.w, g.h);
    x.drawImage(mask, 0, 0, g.w, g.h);

    if (!revealed) {
      sheen += dt * 0.014;
      const p = Math.sin(sheen) * 0.5 + 0.5;
      x.save();
      K.rr(x, B.x, B.y, B.w, B.h, 22); x.clip();
      const gx = B.x - B.w * 0.5 + p * B.w * 2;
      const lg = x.createLinearGradient(gx - 70, 0, gx + 70, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(.5, 'rgba(255,255,255,.22)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      x.globalCompositeOperation = 'lighter'; x.fillStyle = lg;
      x.fillRect(B.x, B.y, B.w, B.h);
      x.globalCompositeOperation = 'source-over';
      const tt = now / 1000;
      specks.forEach(s => {
        x.globalAlpha = .35 + .35 * Math.sin(tt * 2 + s.p);
        x.fillStyle = '#fff';
        x.beginPath(); x.arc(B.x + s.x * B.w, B.y + s.y * B.h, s.r, 0, TAU); x.fill();
      });
      x.restore();
      x.globalAlpha = 1;
    }

    const barY = B.y + B.h - 18;
    K.rr(x, B.x + 14, barY, B.w - 28, 6, 3); x.fillStyle = 'rgba(255,255,255,.28)'; x.fill();
    K.rr(x, B.x + 14, barY, Math.max(6, (B.w - 28) * frac), 6, 3);
    x.fillStyle = revealed ? '#8fffc9' : '#fff'; x.fill();
    K.tag(x, B.x + 62, barY - 13, revealed ? 'revealed' : Math.round(frac * 100) + '% scratched',
      'rgba(255,255,255,.82)', '#241a55', 10);
  }

  function pos(e) {
    const r = cv().getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function newCard() {
    pool = K.options(5);
    label = pool[Math.floor(Math.random() * pool.length)] || 'Yes';
    revealed = false; done = false; frac = 0; fading = 0; autoY = -1;
    down = false; seen = null; checkAt = 0; sheen = Math.random() * 6;
    if (!cv() || !cv().clientWidth) { return; }
    build();
    const r = $('scRes');
    if (r) r.innerHTML = '<span class="muted">Rub the foil to reveal</span>';
  }

  K && window.DECIDER_GAMES.push({
    id: 'scratch', name: 'Scratch card', short: 'Scratch', label: 'Cards',
    body: `<canvas class="toy" id="scCv"></canvas>
      <div class="res" id="scRes" aria-live="polite"><span class="muted">Rub the foil to reveal</span></div>
      <button class="btn" id="scGo">Scratch it</button>
      <button class="chip" id="scNew" style="margin-top:10px">New card</button>`,
    init(card) {
      L = K.loop((dt, now) => paint(dt, now));
      newCard();
      const c = cv();
      c.addEventListener('pointerdown', e => {
        if (revealed || fading > 0) return;
        c.setPointerCapture(e.pointerId);
        down = true; seen = pos(e); autoY = -1;
        erase(seen.x, seen.y, seen.x, seen.y);
      });
      c.addEventListener('pointermove', e => {
        if (!down || !seen) return;
        const p = pos(e);
        erase(seen.x, seen.y, p.x, p.y);
        seen = p;
        if (performance.now() - checkAt > 140) {
          checkAt = performance.now();
          frac = Math.min(1, percent());
          if (frac > 0.55) finish();
        }
      });
      const up = () => {
        if (!down) return;
        down = false; seen = null;
        frac = Math.min(1, percent());
        if (frac > 0.55) finish();
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      card.querySelector('#scGo').onclick = () => {
        if (!g) newCard();
        if (revealed) newCard();
        else if (autoY < 0 && fading === 0) autoY = box().y + 2;
      };
      card.querySelector('#scNew').onclick = newCard;
    },
    enter() {
      if (!g || Math.abs(g.w - cv().clientWidth) > 1) newCard();
      L.start();
    },
    leave() { L.stop(); },
    action() {
      if (!g) newCard();
      if (revealed) newCard();
      else if (autoY < 0 && fading === 0) autoY = box().y + 2;
    }
  });
})();
