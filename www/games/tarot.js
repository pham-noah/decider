/* Tarot — three cards, one message; the card you turn decides. */
(function () {
  const K = window.DKIT;
  const cv = () => document.getElementById('trCv');
  const DECK = [
    ['The Fool', 'leap before you look', '✦'], ['The Magician', 'you already have the tools', '✧'],
    ['The Tower', 'everything changes', '✹'], ['The Star', 'hope, quietly', '✶'],
    ['The Moon', 'trust the fog', '☾'], ['The Sun', 'say yes out loud', '❖'],
    ['Death', 'end it properly', '✕'], ['The Lovers', 'choose with your heart', '✷'],
    ['Wheel of Fortune', 'let it turn', '◈'], ['The Hermit', 'ask yourself first', '✜'],
    ['Strength', 'gentle wins', '✚'], ['Justice', 'fair, not easy', '≡']
  ];
  let L = null, g = null, spots = [], picks = [], stars = [];
  let state = 'idle', pick = -1, t = 0, hov = -1;
  function layout() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const cw = Math.min(104, g.w * 0.33), ch = cw * 1.55;
    spots = [0, 1, 2].map(i => ({
      x: g.w * [0.25, 0.5, 0.75][i], y: g.h * 0.55, rot: [-0.2, 0, 0.2][i], w: cw, h: ch
    }));
    stars = Array.from({ length: 24 }, () => ({ x: rnd(), y: rnd(), r: 0.4 + rnd() * 1.3, a: 0.12 + rnd() * 0.4 }));
  }
  function reset() {
    const d = DECK.slice();
    for (let i = d.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    picks = d.slice(0, 3);
    state = 'idle'; pick = -1; t = 0; hov = -1;
    K.setResult(document.getElementById('trRes'), 'Pick a card');
    document.getElementById('trGo').textContent = 'Draw';
  }
  function choose(i) {
    if (state !== 'idle' || i < 0) return;
    pick = i; state = 'flip'; t = 0;
    try { tone(560, 0.3, 0.05, 'sine', 880); } catch (e) {}
  }
  function update(dt) {
    if (state !== 'flip') return;
    t = Math.min(1, t + dt / 44);
    if (t >= 1) {
      const c = picks[pick];
      state = 'shown'; K.setResult(document.getElementById('trRes'), c[0]);
      document.getElementById('trGo').textContent = 'Draw again';
      try { tone(660, 0.5, 0.05, 'sine', 990); tone(880, 0.45, 0.04, 'triangle', 1320); } catch (e) {}
      K.decide(c[0], 'Tarot', c[1]);
    }
  }
  function wrap(x, s, maxW) {
    const out = []; let line = '';
    s.split(' ').forEach(w => {
      const test = line ? line + ' ' + w : w;
      if (line && x.measureText(test).width > maxW) { out.push(line); line = w; } else line = test;
    });
    if (line) out.push(line);
    return out;
  }
  function card(x, cx, cy, cw, ch, rot, sc, sx, front, data, glow, alpha) {
    x.save(); x.globalAlpha = alpha;
    x.translate(cx, cy); x.rotate(rot); x.scale(sc * Math.max(0.02, sx), sc);
    if (glow) { x.shadowColor = 'rgba(255,215,106,' + glow + ')'; x.shadowBlur = 34; }
    K.rr(x, -cw / 2, -ch / 2, cw, ch, 9); x.fillStyle = front ? '#1d1246' : '#38267c'; x.fill();
    x.shadowColor = 'transparent';
    x.strokeStyle = 'rgba(255,215,106,.8)'; x.lineWidth = 1.6;
    K.rr(x, -cw / 2 + 3, -ch / 2 + 3, cw - 6, ch - 6, 7); x.stroke();
    x.save(); K.rr(x, -cw / 2 + 3, -ch / 2 + 3, cw - 6, ch - 6, 7); x.clip();
    if (front && data) {
      const gg = x.createRadialGradient(0, -ch * 0.22, 2, 0, -ch * 0.22, cw * 0.65);
      gg.addColorStop(0, 'rgba(255,215,106,.3)'); gg.addColorStop(1, 'rgba(255,215,106,0)');
      x.fillStyle = gg; x.fillRect(-cw / 2, -ch / 2, cw, ch);
      x.fillStyle = '#ffd76a'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = Math.round(ch * 0.25) + 'px system-ui,sans-serif'; x.fillText(data[2], 0, -ch * 0.09);
      let ns = Math.round(cw * 0.13);
      x.font = '800 ' + ns + 'px "Bricolage Grotesque",system-ui,sans-serif';
      while (ns > 7 && x.measureText(data[0]).width > cw - 14) { ns--; x.font = '800 ' + ns + 'px "Bricolage Grotesque",system-ui,sans-serif'; }
      x.fillText(data[0], 0, ch * 0.26);
      x.font = '600 ' + Math.round(cw * 0.077) + 'px "Bricolage Grotesque",system-ui,sans-serif';
      x.fillStyle = 'rgba(255,248,230,.78)';
      wrap(x, data[1], cw - 16).slice(0, 2).forEach((ln, k) => x.fillText(ln, 0, ch * 0.355 + k * cw * 0.1));
    } else {
      x.strokeStyle = 'rgba(255,215,106,.22)'; x.lineWidth = 1;
      for (let k = -ch; k < cw + ch; k += 9) {
        x.beginPath(); x.moveTo(-cw / 2 + k, -ch / 2); x.lineTo(-cw / 2 + k + ch, ch / 2); x.stroke();
      }
      x.beginPath(); x.arc(0, 0, cw * 0.23, 0, Math.PI * 2);
      x.fillStyle = 'rgba(255,215,106,.12)'; x.fill();
      x.strokeStyle = 'rgba(255,215,106,.75)'; x.lineWidth = 1.4; x.stroke();
      x.fillStyle = '#ffd76a'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = Math.round(cw * 0.26) + 'px system-ui,sans-serif'; x.fillText('☾', 0, cw * 0.01);
      x.font = '600 ' + Math.round(cw * 0.07) + 'px "Bricolage Grotesque",system-ui,sans-serif';
      x.fillStyle = 'rgba(255,215,106,.6)'; x.fillText('DECIDER', 0, ch * 0.38);
    }
    x.restore();
    x.restore();
  }
  function draw() {
    const c = cv(); if (!c) return; g = K.fit(c);
    const { x, w, h } = g;
    x.clearRect(0, 0, w, h);
    const bg = x.createRadialGradient(w * 0.5, h * 0.34, 8, w * 0.5, h * 0.55, w * 0.85);
    bg.addColorStop(0, 'rgba(96,74,196,.5)'); bg.addColorStop(1, 'rgba(13,8,38,.8)');
    K.rr(x, 2, 2, w - 4, h - 4, 20); x.fillStyle = bg; x.fill();
    x.fillStyle = '#fff';
    stars.forEach(s => { x.globalAlpha = s.a; x.beginPath(); x.arc(s.x * w, s.y * h * 0.72, s.r, 0, Math.PI * 2); x.fill(); });
    x.globalAlpha = 1;
    x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '600 11px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(state === 'idle' ? 'Tap a card' : state === 'shown' ? 'Ask another' : '', w / 2, h * 0.09);
    const order = state === 'idle' ? [0, 2, 1] : [0, 2, 1].filter(i => i !== pick).concat(pick);
    order.forEach(i => {
      const sp = spots[i], chosen = i === pick && state !== 'idle';
      let cx = sp.x, cy = sp.y - (hov === i && state === 'idle' ? 5 : 0), rot = sp.rot, sc = 1, sx = 1, alpha = 1;
      if (chosen) {
        cx = sp.x + (w / 2 - sp.x) * t;
        cy = sp.y + (h * 0.47 - sp.y) * t;
        rot = sp.rot * (1 - t); sc = 1 + t * 0.12;
        sx = Math.abs(Math.cos(Math.PI * t));
      } else if (state !== 'idle') {
        alpha = 1 - 0.72 * t;
        cx += (i - 1) * t * 16;
      }
      if (chosen && t > 0.02) {
        x.save(); x.globalAlpha = Math.sin(t * Math.PI) * 0.55;
        const gl = x.createRadialGradient(cx, cy, 4, cx, cy, sp.w);
        gl.addColorStop(0, 'rgba(255,215,106,.9)'); gl.addColorStop(1, 'rgba(255,215,106,0)');
        x.fillStyle = gl; x.beginPath(); x.arc(cx, cy, sp.w, 0, Math.PI * 2); x.fill();
        x.restore();
      }
      card(x, cx, cy, sp.w, sp.h, rot, sc, sx, chosen && t > 0.5, picks[i], hov === i ? 0.45 : 0, alpha);
    });
  }
  function hit(px, py) {
    for (let i = 0; i < spots.length; i++) {
      const sp = spots[i], dx = px - sp.x, dy = py - sp.y;
      const co = Math.cos(sp.rot), si = Math.sin(sp.rot);
      if (Math.abs(dx * co + dy * si) <= sp.w / 2 && Math.abs(-dx * si + dy * co) <= sp.h / 2) return i;
    }
    return -1;
  }
  function pos(e) {
    const r = cv().getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function act() {
    if (state === 'idle') choose((rnd() * 3) | 0);
    else if (state === 'shown') reset();
  }
  K && window.DECIDER_GAMES.push({
    id: 'tarot', name: 'Tarot', short: 'Tarot', label: 'Deck',
    body: `<canvas class="toy" id="trCv" style="max-height:min(62vh,max(140px,calc(100svh - 530px)))"></canvas>
      <div class="res" id="trRes" aria-live="polite" style="font-size:clamp(22px,5.4vw,30px);min-height:40px"><span class="muted">Tap a card</span></div>
      <button class="btn" id="trGo">Draw</button>`,
    tune: `<div class="lbl">Twelve cards, twelve messages. Turn one and let it answer.</div>`,
    init() {
      L = K.loop(dt => { update(dt); draw(); });
      const c = cv();
      c.addEventListener('pointerdown', e => { const p = pos(e); choose(hit(p[0], p[1])); });
      c.addEventListener('pointermove', e => {
        if (state !== 'idle' || !g) return;
        const p = pos(e); hov = hit(p[0], p[1]);
        c.style.cursor = hov >= 0 ? 'pointer' : 'default';
      });
      c.addEventListener('pointerleave', () => { hov = -1; });
      document.getElementById('trGo').onclick = act;
      layout(); reset();
    },
    enter() { layout(); L.start(); },
    leave() { L.stop(); },
    action: act
  });
})();
