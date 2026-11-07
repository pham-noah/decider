/* Windowsill — a small room you can poke at. Seven objects, seven reactions:
 * lamp, plant, cup, radio, drawer, clock, cat. No score, no goal, no ending. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT, TAU = Math.PI * 2; const cv = () => document.getElementById('wsCv'), resEl = () => document.getElementById('wsRes');
  let L = null, g = null, hits = [], drag = null, t = 0, ripples = []; const stars = [], lamp = { on: false, glow: 0 }, plant = { bend: 0, v: 0 };
  const cup = { rock: 0, v: 0, drops: [], wait: 0, puddle: 0 }; const radio = { until: 0, notes: [], spawn: 0 }, drawer = { open: 0, v: 0, want: 0 };
  const clock = { a: -.7, v: 0 }, cat = { swat: 0, v: 0, blink: 0, next: 2.5, tx: 0, ty: 0 };
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} }; const hap = (n) => { try { buzz(n); } catch (e) {} };
  const say = (s) => { const el = resEl(); if (el) el.innerHTML = '<span class="muted">' + s + '</span>'; };
  function layout() {
    const c = cv(); if (!c) return; g = K.fit(c); const w = g.w, h = g.h, sy = h * .44;
    g.G = {
      w, h, sy, win: { x: w * .05, y: h * .055, w: w * .57, h: h * .33 },
      clk: { x: w * .8, y: h * .185, r: Math.min(w * .095, h * .085) },
      cab: { x: w * .12, y: h * .525, w: w * .76, h: h * .35 },
      pl: { x: w * .17, y: sy }, cu: { x: w * .395, y: sy }, la: { x: w * .565, y: sy },
      ra: { x: w * .75, y: sy }, ca: { x: w * .90, y: sy }
    };
    const G = g.G; G.drawer = { x: G.cab.x + 10, y: G.cab.y + h * .07, w: G.cab.w - 20, h: G.cab.h * .7 };
    hits = [{ id: 'clock', x: G.clk.x, y: G.clk.y, r: G.clk.r + 16 },
      { id: 'plant', x: G.pl.x, y: sy - 52, r: w * .1 }, { id: 'cup', x: G.cu.x, y: sy - 22, r: w * .065 },
      { id: 'lamp', x: G.la.x, y: sy - 50, r: w * .095 }, { id: 'radio', x: G.ra.x, y: sy - 26, r: w * .085 },
      { id: 'cat', x: G.ca.x, y: sy - 36, r: w * .09 }];
  }
  function pick(p) {
    if (!g) return null; const d = g.G.drawer; if (p.x > d.x && p.x < d.x + d.w && p.y > d.y - 6 && p.y < d.y + d.h + drawer.open * g.G.cab.h * .34) return 'drawer'; let best = null, bd = 1.35;
    for (const o of hits) { const r = Math.hypot(p.x - o.x, p.y - o.y) / o.r; if (r < bd) { bd = r; best = o.id; } }
    return best;
  }
  function poke(id, p) {
    ripples.push({ x: p.x, y: p.y, a: 1, r: 7 });
    if (id === 'lamp') {
      lamp.on = !lamp.on; sfx(lamp.on ? 540 : 360, .08, .05, 'triangle', lamp.on ? 820 : 240); hap(8); say(lamp.on ? 'the bulb warms up and the wall goes amber' : 'the room falls back into blue');
    } else if (id === 'plant') {
      plant.v += (p.x < g.G.pl.x ? -1 : 1) * .19; sfx(330, .12, .05, 'sine', 200); hap(10); say('the leaves nod, then think better of it');
    } else if (id === 'cup') {
      cup.v += (p.x < g.G.cu.x ? -1 : 1) * .22; cup.wait = .18; sfx(880, .06, .04, 'sine', 1240); hap(12); say('the cup rocks — a drop goes over the edge');
    } else if (id === 'radio') {
      radio.until = t + 150; radio.spawn = 0; [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => { if (t < radio.until + 6) sfx(f, .16, .035, 'square', f * 1.02); }, i * 190));
      hap(8); say('a four-note loop and a very small light show');
    } else if (id === 'drawer') {
      drawer.want = drawer.want > .5 ? 0 : 1; sfx(170, .2, .06, 'sawtooth', drawer.want ? 240 : 110); hap(16);
      say(drawer.want ? 'the drawer rolls out — a marble, and a folded note' : 'the drawer slides shut');
    } else if (id === 'clock') {
      clock.v += .55; sfx(1240, .04, .035, 'square'); hap(6); say('the hands spin; the afternoon gets away from you');
    } else if (id === 'cat') {
      cat.tx = p.x; cat.ty = p.y; cat.v = 9; sfx(780, .07, .05, 'triangle', 1180); hap(8); say('the cat bats at your finger, missing on purpose');
    }
  }
  function step(dt) {
    if (!g) return; const G = g.G; lamp.glow += ((lamp.on ? 1 : 0) - lamp.glow) * .09 * dt;
    plant.v += -plant.bend * .09 * dt; plant.v *= Math.pow(.9, dt); plant.bend += plant.v * dt; plant.bend = Math.max(-.5, Math.min(.5, plant.bend));
    cup.v += -cup.rock * .1 * dt; cup.v *= Math.pow(.9, dt); cup.rock += cup.v * dt; cup.rock = Math.max(-.4, Math.min(.4, cup.rock)); cup.wait -= dt * .016;
    if (cup.wait <= 0 && Math.abs(cup.rock) > .15 && cup.drops.length < 7) {
      cup.wait = 1.4; cup.drops.push({ x: G.cu.x + 17, y: G.sy - 34, vy: -1.1, r: 2.6 + Math.random() * 1.2 }); sfx(210, .1, .04, 'sine', 120);
    }
    cup.drops.forEach(d => { d.vy += .55 * dt; d.y += d.vy * dt; d.x += .22 * dt; });
    cup.drops = cup.drops.filter(d => { if (d.y > G.sy - 1) { cup.puddle = Math.min(1, cup.puddle + .3); return false; } return true; });
    cup.puddle *= Math.pow(.996, dt); drawer.v += (drawer.want - drawer.open) * .035 * dt; drawer.v *= Math.pow(.8, dt);
    drawer.open = Math.max(0, Math.min(1, drawer.open + drawer.v * dt)); clock.a += clock.v * dt * .04; clock.v *= Math.pow(.975, dt);
    cat.v += -cat.swat * .12 * dt; cat.v *= Math.pow(.88, dt); cat.swat = Math.max(0, Math.min(1, cat.swat + cat.v * dt)); cat.next -= dt * .016;
    if (cat.next <= 0) { cat.next = 2.4 + Math.random() * 3; cat.blink = 1; }
    cat.blink = Math.max(0, cat.blink - dt * .14); ripples.forEach(r => { r.r += 42 * dt; r.a -= .028 * dt; }); ripples = ripples.filter(r => r.a > 0);
    if (t < radio.until) {
      radio.spawn -= dt;
      if (radio.spawn <= 0) { radio.spawn = 9; radio.notes.push({ x: G.ra.x + (Math.random() - .5) * 26, y: G.sy - 58, a: 1, s: 1 + Math.random() * .5 }); }
    }
    radio.notes.forEach(n => { n.y -= .5 * dt; n.a -= .009 * dt; }); radio.notes = radio.notes.filter(n => n.a > 0);
  }
  function drawWindow(x, G) {
    const W = G.win; x.save(); x.shadowColor = 'rgba(8,3,26,.45)'; x.shadowBlur = 20; x.shadowOffsetY = 9;
    K.rr(x, W.x - 7, W.y - 7, W.w + 14, W.h + 14, 15); x.fillStyle = '#efe7ff'; x.fill(); x.restore(); const sg = x.createLinearGradient(0, W.y, 0, W.y + W.h);
    sg.addColorStop(0, '#101a44'); sg.addColorStop(.5, '#1e2a5c'); sg.addColorStop(1, '#3b3a70'); x.save(); K.rr(x, W.x, W.y, W.w, W.h, 9); x.fillStyle = sg; x.fill(); x.clip();
    for (const s of stars) {
      x.globalAlpha = .22 + .55 * (.5 + .5 * Math.sin(t * .03 + s.p)); x.fillStyle = INK(1); x.fillRect(W.x + s.x * W.w, W.y + s.y * W.h * .7, s.r, s.r);
    }
    x.globalAlpha = 1; const mx = W.x + W.w * .7, my = W.y + W.h * .27, mr = W.w * .072; const glow = x.createRadialGradient(mx, my, mr * .4, mx, my, mr * 4);
    glow.addColorStop(0, 'rgba(255,250,230,.3)'); glow.addColorStop(1, 'rgba(255,250,230,0)'); x.fillStyle = glow; x.beginPath(); x.arc(mx, my, mr * 4, 0, TAU); x.fill();
    x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fillStyle = '#fbf7ea'; x.fill();
    x.beginPath(); x.arc(mx - mr * .3, my - mr * .2, mr * .2, 0, TAU); x.fillStyle = 'rgba(205,195,172,.45)'; x.fill(); x.fillStyle = '#0e1130';
    [[0, .22, .3], [.19, .3, .21], [.37, .19, .36], [.55, .32, .19], [.72, .27, .27], [.9, .34, .15]].forEach(b => {
      x.fillRect(W.x + b[0] * W.w, W.y + W.h - b[2] * W.h, b[1] * W.w, b[2] * W.h);
    });
    x.fillStyle = 'rgba(255,214,120,.75)'; [[.26, .16], [.46, .1], [.62, .2], [.8, .12]].forEach(b => { x.fillRect(W.x + b[0] * W.w, W.y + W.h - b[1] * W.h, 2.5, 3); });
    x.restore(); x.fillStyle = '#efe7ff'; x.fillRect(W.x + W.w / 2 - 2.5, W.y, 5, W.h); x.fillRect(W.x, W.y + W.h * .5 - 2.5, W.w, 5);
    x.save(); K.rr(x, W.x, W.y, W.w, W.h, 9); x.clip(); const sh = x.createLinearGradient(W.x, W.y, W.x + W.w * .8, W.y + W.h);
    sh.addColorStop(0, K.light(.12)); sh.addColorStop(.55, INK(0)); x.fillStyle = sh; x.fillRect(W.x, W.y, W.w, W.h); x.restore();
    x.strokeStyle = INK(.2); x.lineWidth = 1; K.rr(x, W.x, W.y, W.w, W.h, 9); x.stroke();
  }
  function drawClock(x, G) {
    const c = G.clk, r = c.r; x.save(); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 14; x.shadowOffsetY = 6;
    x.beginPath(); x.arc(c.x, c.y, r, 0, TAU); x.fillStyle = '#c9a06a'; x.fill(); x.restore(); x.beginPath(); x.arc(c.x, c.y, r - 4, 0, TAU); x.fillStyle = '#f7f1e4'; x.fill();
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, big = i % 3 === 0, r1 = r - 8, r2 = r - (big ? 15 : 12);
      x.beginPath(); x.moveTo(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1); x.lineTo(c.x + Math.cos(a) * r2, c.y + Math.sin(a) * r2);
      x.strokeStyle = big ? '#3a2b60' : 'rgba(58,43,96,.45)'; x.lineWidth = big ? 2 : 1.2; x.stroke();
    }
    const hand = (a, len, wd, col) => {
      x.beginPath(); x.moveTo(c.x, c.y); x.lineTo(c.x + Math.cos(a - Math.PI / 2) * len, c.y + Math.sin(a - Math.PI / 2) * len); x.strokeStyle = col; x.lineWidth = wd; x.lineCap = 'round'; x.stroke();
    };
    hand(clock.a * 1.4 + 1.1, r * .68, 2.6, '#3a2b60'); hand(clock.a, r * .44, 3.6, '#241a55');
    x.beginPath(); x.arc(c.x, c.y, 3.2, 0, TAU); x.fillStyle = '#d6215b'; x.fill(); const gl = x.createLinearGradient(c.x - r, c.y - r, c.x + r, c.y + r);
    gl.addColorStop(0, K.light(.26)); gl.addColorStop(.45, INK(0)); x.beginPath(); x.arc(c.x, c.y, r - 4, 0, TAU); x.fillStyle = gl; x.fill();
    x.beginPath(); x.arc(c.x, c.y, r - 2, 0, TAU); x.strokeStyle = INK(.3); x.lineWidth = 1.4; x.stroke();
  }
  function drawCabinet(x, G) {
    const C = G.cab, d = G.drawer; x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 18; x.shadowOffsetY = 8; K.rr(x, C.x, C.y, C.w, C.h, 16); x.fillStyle = '#372a5e'; x.fill(); x.restore();
    K.rr(x, C.x + 5, C.y + 5, C.w - 10, 8, 4); x.fillStyle = INK(.08); x.fill(); const off = drawer.open * C.h * .34;
    x.save(); K.rr(x, d.x, d.y, d.w, d.h, 10); x.clip(); x.fillStyle = '#150f30'; x.fillRect(d.x, d.y, d.w, d.h);
    if (off > 2) {
      x.save(); x.beginPath(); x.rect(d.x, d.y, d.w, off + 2); x.clip(); const bx = d.x + d.w * .24, by = d.y + d.h * .26, mg = x.createRadialGradient(bx - 3, by - 4, 1, bx, by, 10);
      mg.addColorStop(0, '#ff9fc4'); mg.addColorStop(1, '#b52457'); x.beginPath(); x.arc(bx, by, 10, 0, TAU); x.fillStyle = mg; x.fill();
      x.beginPath(); x.arc(bx - 3.5, by - 4, 2.4, 0, TAU); x.fillStyle = INK(.85); x.fill(); x.save(); x.translate(d.x + d.w * .64, by); x.rotate(-.16);
      K.rr(x, -22, -13, 44, 26, 3); x.fillStyle = '#f4ecff'; x.fill(); x.strokeStyle = 'rgba(60,40,100,.32)'; x.lineWidth = 1.3;
      for (let i = -1; i < 2; i++) { x.beginPath(); x.moveTo(-15, i * 7); x.lineTo(13, i * 7); x.stroke(); }
      x.restore(); x.restore();
    }
    x.restore(); x.save(); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 16; x.shadowOffsetY = 8; const dg = x.createLinearGradient(0, d.y + off, 0, d.y + off + d.h);
    dg.addColorStop(0, '#5c4589'); dg.addColorStop(1, '#3c2b64'); K.rr(x, d.x, d.y + off, d.w, d.h, 10); x.fillStyle = dg; x.fill(); x.restore();
    x.strokeStyle = INK(.15); x.lineWidth = 1.2; K.rr(x, d.x, d.y + off, d.w, d.h, 10); x.stroke();
    K.rr(x, d.x + d.w / 2 - 24, d.y + off + 16, 48, 8, 4); x.fillStyle = '#d9b26a'; x.fill();
  }
  function drawSill(x, G) {
    const sy = G.sy, w = G.w; x.save(); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 14; x.shadowOffsetY = 9;
    const wd = x.createLinearGradient(0, sy, 0, sy + G.h * .05); wd.addColorStop(0, '#ecd9c2'); wd.addColorStop(.35, '#d8bb9c'); wd.addColorStop(1, '#a98a70');
    K.rr(x, -12, sy, w + 24, G.h * .05, 8); x.fillStyle = wd; x.fill(); x.restore(); x.fillStyle = INK(.4); x.fillRect(-12, sy + 1.5, w + 24, 2);
  }
  function drawPlant(x, G) {
    const px = G.pl.x, sy = G.sy, pg = x.createLinearGradient(px - 22, 0, px + 22, 0); pg.addColorStop(0, '#9d4b2b'); pg.addColorStop(.4, '#d9825b'); pg.addColorStop(1, '#9d4b2b');
    x.beginPath(); x.moveTo(px - 19, sy - 30); x.lineTo(px + 19, sy - 30); x.lineTo(px + 14, sy - 2); x.lineTo(px - 14, sy - 2);
    x.closePath(); x.fillStyle = pg; x.fill(); K.rr(x, px - 22, sy - 34, 44, 9, 4); x.fillStyle = '#e39a70'; x.fill();
    x.beginPath(); x.ellipse(px, sy - 31, 16, 4.5, 0, 0, TAU); x.fillStyle = '#3a2418'; x.fill(); x.save(); x.translate(px, sy - 33); x.rotate(plant.bend + Math.sin(t * .022) * .03);
    const leaf = (len, ang, col) => {
      x.save(); x.rotate(ang); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * .42, -len * .3, len * .62, -len * .06);
      x.quadraticCurveTo(len * .78, len * .18, 0, 0); x.fillStyle = col; x.fill(); x.restore();
    };
    leaf(46, -1.62, '#2f9e6a'); leaf(42, -1.28, '#4ade80'); leaf(52, -1.94, '#4ade80'); leaf(36, -2.3, '#37b07a'); leaf(44, -.98, '#2f9e6a'); leaf(30, -2.62, '#4ade80'); x.restore();
  }
  function drawCup(x, G) {
    const cx = G.cu.x, sy = G.sy;
    if (cup.puddle > .01) {
      x.beginPath(); x.ellipse(cx + 25, sy + 4, 9 + 13 * cup.puddle, 3.4, 0, 0, TAU); x.fillStyle = 'rgba(140,200,255,' + (.3 * cup.puddle) + ')'; x.fill();
    }
    x.save(); x.translate(cx, sy - 2); x.rotate(cup.rock); const cg = x.createLinearGradient(-18, 0, 18, 0);
    cg.addColorStop(0, '#93b8de'); cg.addColorStop(.38, '#eaf4ff'); cg.addColorStop(1, '#86abd4'); x.beginPath(); x.moveTo(-17, -40); x.lineTo(17, -40); x.quadraticCurveTo(15, -7, 8, -2);
    x.quadraticCurveTo(0, 0, -8, -2); x.quadraticCurveTo(-15, -7, -17, -40); x.closePath(); x.fillStyle = cg; x.fill();
    x.beginPath(); x.ellipse(18, -26, 6, 9, 0, 0, TAU); x.strokeStyle = '#cfe2f7'; x.lineWidth = 3.6; x.stroke(); x.beginPath(); x.ellipse(0, -39, 15, 4.6, 0, 0, TAU); x.fillStyle = '#4a2c1a'; x.fill();
    x.beginPath(); x.ellipse(1, -38.4, 10, 2.4, 0, 0, TAU); x.fillStyle = '#6b4128'; x.fill(); x.restore();
    cup.drops.forEach(d => {
      x.beginPath(); x.ellipse(d.x, d.y, d.r, d.r * 1.35, 0, 0, TAU); x.fillStyle = 'rgba(160,210,255,.92)'; x.fill();
    });
  }
  function drawLamp(x, G) {
    const lx = G.la.x, sy = G.sy; x.beginPath(); x.ellipse(lx, sy - 4, 25, 6.5, 0, 0, TAU); x.fillStyle = '#7d6ba8'; x.fill();
    x.beginPath(); x.ellipse(lx, sy - 7, 21, 5.5, 0, 0, TAU); x.fillStyle = '#cbb6f0'; x.fill(); x.fillStyle = '#b9a4e6'; x.fillRect(lx - 2.5, sy - 63, 5, 56);
    x.beginPath(); x.moveTo(lx - 25, sy - 62); x.lineTo(lx + 25, sy - 62); x.lineTo(lx + 14, sy - 90); x.lineTo(lx - 14, sy - 90); x.closePath();
    const lg = x.createLinearGradient(0, sy - 92, 0, sy - 60);
    if (lamp.on) { lg.addColorStop(0, '#ffe8ae'); lg.addColorStop(1, '#ffbb50'); }
    else { lg.addColorStop(0, '#6d5f96'); lg.addColorStop(1, '#4c3f73'); }
    x.fillStyle = lg; x.fill(); x.beginPath(); x.ellipse(lx, sy - 62, 25, 7, 0, 0, TAU); x.fillStyle = lamp.on ? '#ffd98a' : '#3c3160'; x.fill();
    if (lamp.glow > .02) {
      const bg = x.createRadialGradient(lx, sy - 56, 2, lx, sy - 56, 34); bg.addColorStop(0, 'rgba(255,238,186,' + (.7 * lamp.glow) + ')'); bg.addColorStop(1, 'rgba(255,190,90,0)');
      x.fillStyle = bg; x.beginPath(); x.arc(lx, sy - 56, 34, 0, TAU); x.fill();
    }
    x.beginPath(); x.moveTo(lx + 16, sy - 68); x.quadraticCurveTo(lx + 21, sy - 56, lx + 17, sy - 50);
    x.strokeStyle = INK(.35); x.lineWidth = 1.5; x.stroke(); x.beginPath(); x.arc(lx + 17, sy - 49, 2.4, 0, TAU); x.fillStyle = '#ffd76a'; x.fill();
  }
  function drawRadio(x, G) {
    const rx = G.ra.x, sy = G.sy, rw = 60, rh = 42;
    if (t < radio.until) {
      for (let i = 0; i < 5; i++) {
        const bh = 4 + Math.abs(Math.sin(t * .2 + i * .95)) * 15; x.fillStyle = 'rgba(255,214,110,' + (.45 + .4 * Math.abs(Math.sin(t * .12 + i))) + ')';
        x.fillRect(rx - 20 + i * 9, sy - 50 - bh, 5, bh);
      }
    }
    x.beginPath(); x.moveTo(rx - 12, sy - 42); x.lineTo(rx - 24, sy - 66); x.strokeStyle = INK(.5); x.lineWidth = 2; x.lineCap = 'round'; x.stroke();
    x.beginPath(); x.arc(rx - 24, sy - 66, 2.4, 0, TAU); x.fillStyle = '#ffd76a'; x.fill(); const bg = x.createLinearGradient(0, sy - rh, 0, sy);
    bg.addColorStop(0, '#f0c368'); bg.addColorStop(1, '#c58f34'); K.rr(x, rx - rw / 2, sy - rh, rw, rh, 9); x.fillStyle = bg; x.fill();
    x.strokeStyle = 'rgba(70,40,10,.35)'; x.lineWidth = 1.2; x.stroke(); x.beginPath(); x.arc(rx - 15, sy - 21, 12, 0, TAU); x.fillStyle = '#4b3a22'; x.fill();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      x.beginPath(); x.arc(rx - 21 + i * 6, sy - 27 + j * 6, 1.1, 0, TAU); x.fillStyle = '#d8b26a'; x.fill();
    }
    x.beginPath(); x.arc(rx + 14, sy - 27, 6.5, 0, TAU); x.fillStyle = '#4b3a22'; x.fill();
    x.beginPath(); x.arc(rx + 14, sy - 27, 2, 0, TAU); x.fillStyle = '#ffd76a'; x.fill(); x.fillStyle = 'rgba(75,58,34,.55)'; x.fillRect(rx + 4, sy - 15, 20, 4);
    x.font = '700 11px "Bricolage Grotesque",system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffe29a';
    radio.notes.forEach(n => { x.globalAlpha = Math.max(0, n.a); x.fillText('♪', n.x, n.y); }); x.globalAlpha = 1;
  }
  function drawCat(x, G) {
    const cx = G.ca.x, sy = G.sy, sw = cat.swat; x.beginPath(); x.ellipse(cx + 4, sy - 2, 26, 6, 0, 0, TAU); x.fillStyle = 'rgba(8,3,26,.4)'; x.fill();
    x.beginPath(); x.moveTo(cx + 12, sy - 14); x.quadraticCurveTo(cx + 34 + Math.sin(t * .03) * 4, sy - 22, cx + 26, sy - 44);
    x.strokeStyle = '#cfc6e6'; x.lineWidth = 7; x.lineCap = 'round'; x.stroke();
    x.beginPath(); x.ellipse(cx, sy - 26, 18, 22, 0, 0, TAU); x.fillStyle = '#ded6ef'; x.fill(); const hx = cx - 1, hy = sy - 54;
    x.beginPath(); x.arc(hx, hy, 15, 0, TAU); x.fillStyle = '#e8e2f6'; x.fill();
    [[-11, -10], [10, -10]].forEach(e => {
      x.beginPath(); x.moveTo(hx + e[0], hy + e[1] + 7); x.lineTo(hx + e[0] - 1, hy + e[1] - 9); x.lineTo(hx + e[0] + 9, hy + e[1] - 1); x.closePath(); x.fillStyle = '#e8e2f6'; x.fill();
      x.beginPath(); x.moveTo(hx + e[0] + 2, hy + e[1] + 2); x.lineTo(hx + e[0] + 2, hy + e[1] - 5); x.lineTo(hx + e[0] + 6, hy + e[1] - 1); x.closePath(); x.fillStyle = '#ff9fc4'; x.fill();
    });
    const bl = cat.blink > .4 ? .15 : 1;
    [-5.5, 5.5].forEach(ex => {
      x.beginPath(); x.ellipse(hx + ex, hy - 1, 2.6, 3.5 * bl, 0, 0, TAU); x.fillStyle = '#2a2148'; x.fill();
    });
    x.beginPath(); x.moveTo(hx, hy + 6); x.lineTo(hx - 2.4, hy + 4); x.lineTo(hx + 2.4, hy + 4); x.closePath(); x.fillStyle = '#ff9fc4'; x.fill();
    x.strokeStyle = INK(.45); x.lineWidth = 1;
    [-1, 1].forEach(s => { for (let i = 0; i < 2; i++) {
      x.beginPath(); x.moveTo(hx + s * 4, hy + 6 + i * 3); x.lineTo(hx + s * (17 + i * 2), hy + 3 + i * 7); x.stroke();
    } });
    const dir = cat.tx ? ((cat.tx - cx) >= 0 ? 1 : -1) : 1; const px = cx + 5 + dir * (7 + sw * 17), py = sy - 34 - sw * 8;
    x.beginPath(); x.moveTo(cx + 3, sy - 34); x.lineTo(px, py); x.strokeStyle = '#ded6ef'; x.lineWidth = 7; x.stroke(); x.beginPath(); x.arc(px, py, 5, 0, TAU); x.fillStyle = '#f2edfc'; x.fill();
  }
  function draw() {
    const x = g.x, w = g.w, h = g.h, G = g.G; const wg = x.createLinearGradient(0, 0, 0, h);
    wg.addColorStop(0, '#2c2268'); wg.addColorStop(.55, '#241a55'); wg.addColorStop(1, '#150e36'); x.fillStyle = wg; x.fillRect(0, 0, w, h);
    const moon = x.createRadialGradient(G.win.x + G.win.w / 2, G.win.y + G.win.h / 2, 10,
      G.win.x + G.win.w / 2, G.win.y + G.win.h / 2, G.win.w * 1.15);
    moon.addColorStop(0, 'rgba(120,150,255,.14)'); moon.addColorStop(1, 'rgba(120,150,255,0)'); x.fillStyle = moon; x.fillRect(0, 0, w, h);
    drawWindow(x, G); drawClock(x, G); drawCabinet(x, G); drawSill(x, G); drawPlant(x, G); drawCup(x, G); drawLamp(x, G); drawRadio(x, G); drawCat(x, G);
    if (lamp.glow > .02) {
      const lx = G.la.x, top = G.sy - 62; x.save(); x.globalCompositeOperation = 'screen'; const cone = x.createLinearGradient(0, top, 0, h);
      cone.addColorStop(0, 'rgba(255,198,104,' + (.22 * lamp.glow) + ')'); cone.addColorStop(1, 'rgba(255,170,80,0)');
      x.beginPath(); x.moveTo(lx - 24, top); x.lineTo(lx + 24, top); x.lineTo(lx + 108, h); x.lineTo(lx - 108, h); x.closePath(); x.fillStyle = cone; x.fill();
      const rg = x.createRadialGradient(lx, top, 4, lx, top, w * 1.2);
      rg.addColorStop(0, 'rgba(255,196,110,' + (.2 * lamp.glow) + ')'); rg.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = rg; x.fillRect(0, 0, w, h); x.restore();
    }
    ripples.forEach(r => {
      x.beginPath(); x.arc(r.x, r.y, r.r, 0, TAU); x.strokeStyle = 'rgba(255,255,255,' + (r.a * .5) + ')'; x.lineWidth = 1.6; x.stroke();
    });
  }
  function frame(dt) {
    const gg = K.fit(cv()); if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) layout(); t += dt; step(dt); if (g) draw();
  }
  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  K && window.DECIDER_GAMES.push({
    id: 'windowsill', name: 'Windowsill', short: 'Windowsill', label: 'Sill', button: false,
    body: `<canvas class="toy" id="wsCv"></canvas>
      <div class="res" id="wsRes" aria-live="polite"><span class="muted">Poke anything on the sill — nothing to win</span></div>`,
    init(card) {
      for (let i = 0; i < 34; i++) stars.push({ x: rnd(), y: rnd(), r: .5 + rnd() * 1.1, p: rnd() * TAU }); L = K.loop(frame); const c = cv();
      c.addEventListener('pointerdown', e => {
        if (!g) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e), id = pick(p); drag = { id, lx: p.x }; if (id) poke(id, p);
      });
      c.addEventListener('pointermove', e => {
        if (!drag || !g) return; const p = at(e);
        if (drag.id === 'cat') { cat.tx = p.x; cat.ty = p.y; cat.v = Math.max(cat.v, 5); }
        else if (drag.id === 'cup') cup.v += (p.x - drag.lx) * .014; else if (drag.id === 'plant') plant.v += (p.x - drag.lx) * .009; drag.lx = p.x;
      });
      const up = () => { drag = null; }; c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up); layout();
    },
    enter() { layout(); L.start(); },
    leave() { drag = null; L.stop(); },
    action() { if (g) poke('lamp', { x: g.G.la.x, y: g.G.sy - 50 }); },
    shake(info) {
      const d = Math.sign(info.dir || 1), p = Math.max(.2, Math.min(1, info.power || .5)); plant.v += d * .12 * p; cup.v += d * .12 * p; cat.v += d * 3 * p; sfx(120, .1, .05, 'triangle', 70);
    }
  });
})();