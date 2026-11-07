/* Vignettes — a ring of fourteen little objects, turned by hand. Drag across the
 * card and the shape turns edge-on, becoming the next thing: key, bottle, boot,
 * teapot, fish, bird, cat, crown, rocket, house, lamp, boat, mushroom, ghost.
 * One full swipe is one full revolution. Tap a dot to jump to that object.
 * Nothing is decided here. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('vgCv');
  const resEl = () => document.getElementById('vgRes');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const SHAPES = [
    { name: 'Key', caption: 'opens exactly one door', col: '#ffd76a', acc: 'hole', lobes: [
      { x: 0, y: -.42, rx: .18, ry: .18, rot: 0, rad: 1 },
      { x: 0, y: .12, rx: .06, ry: .44, rot: 0, rad: .12 },
      { x: .13, y: .44, rx: .10, ry: .055, rot: 0, rad: .2 },
      { x: .10, y: .27, rx: .075, ry: .05, rot: 0, rad: .2 }] },
    { name: 'Bottle', caption: 'still half full, somehow', col: '#5eead4', acc: 'band', lobes: [
      { x: 0, y: .26, rx: .26, ry: .40, rot: 0, rad: .34 },
      { x: 0, y: -.22, rx: .08, ry: .24, rot: 0, rad: .25 },
      { x: 0, y: -.46, rx: .12, ry: .07, rot: 0, rad: .45 },
      { x: 0, y: -.55, rx: .07, ry: .05, rot: 0, rad: .5 }] },
    { name: 'Boot', caption: 'one step from a puddle', col: '#d08a5a', acc: 'sole', lobes: [
      { x: -.06, y: -.16, rx: .19, ry: .44, rot: .05, rad: .3 },
      { x: .16, y: .36, rx: .34, ry: .16, rot: .02, rad: .35 },
      { x: -.02, y: .54, rx: .46, ry: .07, rot: 0, rad: .25 },
      { x: -.06, y: -.52, rx: .21, ry: .06, rot: 0, rad: .4 }] },
    { name: 'Teapot', caption: 'pours for two, always', col: '#ff9fc4', acc: 'handle', lobes: [
      { x: -.05, y: .16, rx: .37, ry: .31, rot: 0, rad: .55 },
      { x: -.44, y: -.02, rx: .16, ry: .07, rot: -.5, rad: .5 },
      { x: -.05, y: -.20, rx: .13, ry: .07, rot: 0, rad: .45 },
      { x: -.05, y: -.30, rx: .05, ry: .05, rot: 0, rad: .9 }] },
    { name: 'Fish', caption: 'holds its breath all day', col: '#69a7ff', acc: 'eye', lobes: [
      { x: -.06, y: .02, rx: .38, ry: .25, rot: 0, rad: .65 },
      { x: .36, y: -.02, rx: .18, ry: .16, rot: .45, rad: .3 },
      { x: 0, y: -.20, rx: .16, ry: .07, rot: -.12, rad: .35 },
      { x: .02, y: .20, rx: .12, ry: .05, rot: .12, rad: .3 }] },
    { name: 'Bird', caption: 'leaves before you notice', col: '#ffb347', acc: 'wing', lobes: [
      { x: -.02, y: .08, rx: .28, ry: .31, rot: -.06, rad: .55 },
      { x: .13, y: -.30, rx: .16, ry: .15, rot: 0, rad: .6 },
      { x: .37, y: -.28, rx: .11, ry: .05, rot: .12, rad: .2 },
      { x: -.28, y: .30, rx: .13, ry: .055, rot: -.5, rad: .2 }] },
    { name: 'Cat', caption: 'pretends not to see you', col: '#c9a7ff', acc: 'face', lobes: [
      { x: 0, y: .06, rx: .30, ry: .29, rot: 0, rad: .5 },
      { x: -.18, y: -.24, rx: .085, ry: .11, rot: .55, rad: .35 },
      { x: .17, y: -.26, rx: .085, ry: .11, rot: -.45, rad: .35 },
      { x: .34, y: .24, rx: .13, ry: .05, rot: -.75, rad: .2 }] },
    { name: 'Crown', caption: 'heavy, even in daylight', col: '#ffcf4d', acc: 'gems', lobes: [
      { x: 0, y: .22, rx: .27, ry: .11, rot: 0, rad: .25 },
      { x: -.19, y: .04, rx: .07, ry: .17, rot: -.12, rad: .2 },
      { x: 0, y: 0, rx: .075, ry: .20, rot: 0, rad: .25 },
      { x: .19, y: .04, rx: .07, ry: .17, rot: .12, rad: .2 }] },
    { name: 'Rocket', caption: 'aimed at next Tuesday', col: '#ff7a5c', acc: 'window', lobes: [
      { x: 0, y: 0, rx: .17, ry: .44, rot: 0, rad: .55 },
      { x: 0, y: -.50, rx: .12, ry: .11, rot: 0, rad: .95 },
      { x: -.20, y: .33, rx: .09, ry: .13, rot: -.35, rad: .25 },
      { x: .20, y: .33, rx: .09, ry: .13, rot: .35, rad: .25 }] },
    { name: 'House', caption: 'somebody left the light on', col: '#f6e7c1', acc: 'door', lobes: [
      { x: 0, y: .18, rx: .30, ry: .27, rot: 0, rad: .12 },
      { x: -.15, y: -.19, rx: .23, ry: .07, rot: -.52, rad: .2 },
      { x: .15, y: -.19, rx: .23, ry: .07, rot: .52, rad: .2 },
      { x: .19, y: -.33, rx: .05, ry: .10, rot: 0, rad: .15 }] },
    { name: 'Lamp', caption: 'reads past your bedtime', col: '#ffe08a', acc: 'glow', lobes: [
      { x: 0, y: -.18, rx: .24, ry: .13, rot: 0, rad: .3 },
      { x: 0, y: .14, rx: .045, ry: .27, rot: 0, rad: .1 },
      { x: 0, y: .42, rx: .20, ry: .06, rot: 0, rad: .3 },
      { x: 0, y: .0, rx: .09, ry: .07, rot: 0, rad: .9 }] },
    { name: 'Boat', caption: 'moored to nothing', col: '#7fd3ff', acc: 'water', lobes: [
      { x: 0, y: .24, rx: .35, ry: .12, rot: 0, rad: .45 },
      { x: -.06, y: -.06, rx: .15, ry: .24, rot: -.05, rad: .2 },
      { x: .15, y: -.02, rx: .028, ry: .28, rot: 0, rad: .1 },
      { x: .23, y: -.28, rx: .075, ry: .05, rot: .15, rad: .2 }] },
    { name: 'Mushroom', caption: 'grows where you look away', col: '#ff6b8a', acc: 'spots', lobes: [
      { x: 0, y: -.08, rx: .32, ry: .20, rot: 0, rad: .55 },
      { x: 0, y: .25, rx: .12, ry: .21, rot: 0, rad: .3 },
      { x: 0, y: .06, rx: .26, ry: .05, rot: 0, rad: .3 },
      { x: -.15, y: -.20, rx: .07, ry: .05, rot: 0, rad: .6 }] },
    { name: 'Ghost', caption: 'haunts only on weekdays', col: '#e8e4ff', acc: 'eyes', lobes: [
      { x: 0, y: .02, rx: .26, ry: .31, rot: 0, rad: .55 },
      { x: -.13, y: .29, rx: .11, ry: .09, rot: 0, rad: .5 },
      { x: .13, y: .29, rx: .11, ry: .09, rot: 0, rad: .5 },
      { x: .30, y: -.02, rx: .06, ry: .11, rot: 0, rad: .4 }] }
  ];
  const N = SHAPES.length, SLOT = TAU / N;   /* one object per 25.7° of ring */
  const NOTE = [392, 440, 493.88, 587.33, 659.25, 783.99, 880, 987.77,
                1046.5, 1174.66, 1318.51, 1396.91, 1567.98, 1760];

  let L = null, g = null, spin = 0, vSp = 0, aim = null, dragging = false, lastX = 0;
  let bounce = 1, bv = 0, rs = { f: 0, ai: 0, bi: 1, si: 0 }, lastShown = 0;
  let sparks = [], flashes = [], allBeaten = false, lastTick = 0;
  const found = SHAPES.map((_, i) => i === 0);

  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };
  const hex = h => {
    if (typeof h !== 'string') return [255, 255, 255];
    if (h[0] !== '#') {
      const m = /rgba?\(([^)]+)\)/.exec(h);
      return m ? m[1].split(',').map(Number).slice(0, 3) : [255, 255, 255];
    }
    const t = h.length === 4 ? h.slice(1).split('').map(c => c + c).join('') : h.slice(1);
    return [parseInt(t.slice(0, 2), 16), parseInt(t.slice(2, 4), 16), parseInt(t.slice(4, 6), 16)];
  };
  const chan = v => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
  function mix(a, b, k) {
    const A = hex(a), B = hex(b);
    return '#' + chan(A[0] + (B[0] - A[0]) * k) + chan(A[1] + (B[1] - A[1]) * k) + chan(A[2] + (B[2] - A[2]) * k);
  }

  function subRR(x, X, Y, W, H, R) {
    R = Math.max(0, Math.min(R, W / 2, H / 2)); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R);
    x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath();
  }
  function path(x, lobes) {
    x.beginPath();
    for (const l of lobes) {
      if (l.rx < .002 || l.ry < .002) continue;
      x.save(); x.translate(l.x, l.y); x.rotate(l.rot);
      subRR(x, -l.rx, -l.ry, l.rx * 2, l.ry * 2, Math.min(l.rx, l.ry) * l.rad * 2); x.restore();
    }
  }
  function star(x, r) {
    x.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, rr = i % 2 ? r * .34 : r;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.closePath();
  }

  function geometry() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    g.cx = g.w * .5;
    g.cy = g.h * .43;
    g.R = Math.min(g.w * .37, g.h * .30);
    /* one full swipe across the toy is one full revolution of the ring */
    g.sens = TAU / Math.max(240, g.w - 8);
    g.stepX = Math.min(24, (g.w - 56) / Math.max(1, N - 1));
    g.x0 = g.cx - g.stepX * (N - 1) / 2;
    g.dotY = g.h - 28;
  }
  const ringOf = (v) => ((v % N) + N) % N;

  function announce(i) {
    const el = resEl(); if (!el) return;
    el.innerHTML = '<span class="muted">' + SHAPES[i].name + ' — ' + SHAPES[i].caption + '</span>';
  }

  function burst(i) {
    if (!g) return;
    const col = SHAPES[i].col, pale = K.mat().flat ? '#f1ebda' : '#ffffff';
    for (let j = 0; j < 10; j++) {
      const a = Math.random() * TAU, sp = .7 + Math.random() * 2.3;
      sparks.push({
        x: g.cx + Math.cos(a) * g.R * .16,
        y: g.cy + Math.sin(a) * g.R * .10,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .55,
        r: 2 + Math.random() * 3.2, rot: Math.random() * TAU, life: 1,
        col: Math.random() < .7 ? col : mix(col, pale, .6)
      });
    }
    if (sparks.length > 110) sparks.splice(0, sparks.length - 110);
  }

  /* the first time a shape resolves it gets a burst, its own note and a bounce;
     passing it again is a soft tick */
  function discover(i) {
    const first = !found[i];
    if (first) {
      found[i] = true;
      burst(i);
      flashes.push({ a: 1, r: .5, col: SHAPES[i].col });
      bounce = 1.14; bv = 0;
      const note = NOTE[i % NOTE.length];
      sfx(note, .16, .05, 'triangle', note * 1.5);
      sfx(note * 2, .10, .016, 'sine', note * 2.02);
      hap(10);
    } else {
      const now = Date.now();
      if (now - lastTick > 55) { lastTick = now; sfx(NOTE[i % NOTE.length], .045, .016, 'sine', NOTE[i % NOTE.length] * 1.06); }
    }
    announce(i);
    const c = cv();
    if (c) { c.dataset.idx = String(i); c.dataset.found = String(found.filter(Boolean).length); }
    if (!allBeaten && found.every(Boolean)) {
      allBeaten = true;
      try { confetti(); } catch (e) {}
      try {
        tone(523, .12, .05, 'triangle', 660); tone(659, .14, .05, 'triangle', 780); tone(784, .20, .05, 'triangle', 980);
      } catch (e) {}
      try { hap([10, 20, 10]); } catch (e) {}
    }
  }

  function jump(i) {
    const k = Math.round(spin / SLOT), cur = ringOf(k);
    let d = i - cur;
    if (d > N / 2) d -= N; else if (d < -N / 2) d += N;
    aim = null; vSp = 0;
    if (!d) {
      bounce = 1.1; bv = 0;
      flashes.push({ a: .9, r: .3, col: SHAPES[i].col });
      try { K.press(520); } catch (e) {}
      return;
    }
    spin = (k + d) * SLOT;          /* a jump lands, it does not sweep the ring */
    bounce = 1.14; bv = 0;
    try { K.press(560 + i * 16); } catch (e) {}
  }

  function advance(dir) { vSp = 0; aim = Math.round(spin / SLOT) * SLOT + dir * SLOT; }

  function step(dt) {
    if (!dragging) {
      if (aim != null) {
        spin += (aim - spin) * Math.min(1, .24 * dt);
        if (Math.abs(aim - spin) < .0015) { spin = aim; aim = null; vSp = 0; }
      } else {
        spin += vSp * dt;
        vSp *= Math.pow(.92, dt);
        if (Math.abs(vSp) < .05) {
          vSp = 0;
          const tgt = Math.round(spin / SLOT) * SLOT;   /* snap to a whole object */
          spin += (tgt - spin) * Math.min(1, .17 * dt);
          if (Math.abs(tgt - spin) < .001) spin = tgt;
        }
      }
    }
    if (Math.abs(spin) > SLOT * N * 500) {
      const w = Math.round(spin / (SLOT * N)) * SLOT * N;
      spin -= w; if (aim != null) aim -= w;
    }

    bounce += bv * dt; bv += (1 - bounce) * .3 * dt; bv *= Math.pow(.82, dt);
    for (const fl of flashes) { fl.a -= .032 * dt; fl.r += .055 * dt; }
    flashes = flashes.filter(fl => fl.a > 0);
    for (const s of sparks) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += .05 * dt;
      s.vx *= Math.pow(.955, dt); s.rot += .1 * dt; s.life -= .016 * dt;
    }
    sparks = sparks.filter(s => s.life > 0);

    const u = spin / SLOT, k = Math.floor(u), f = u - k;
    const ai = ringOf(k), bi = (ai + 1) % N;
    rs = { f, ai, bi, si: f < .5 ? ai : bi };
    if (rs.si !== lastShown) { lastShown = rs.si; discover(rs.si); }
  }

  function accent(x, kind, a, col) {
    if (a < .02) return;
    const dark = 'rgba(22,14,42,.60)';
    x.save(); x.globalAlpha = a;
    if (kind === 'hole') {
      x.fillStyle = dark; x.beginPath(); x.ellipse(0, -.42, .062, .062, 0, 0, TAU); x.fill();
      x.strokeStyle = K.light(.28); x.lineWidth = .014; x.stroke();
    } else if (kind === 'band') {
      x.fillStyle = K.light(.26); x.beginPath(); subRR(x, -.235, .16, .47, .21, .05); x.fill();
      x.strokeStyle = dark; x.lineWidth = .012; x.beginPath(); x.moveTo(-.235, .34); x.lineTo(.235, .34); x.stroke();
    } else if (kind === 'sole') {
      x.fillStyle = 'rgba(28,16,42,.55)'; x.beginPath(); subRR(x, -.47, .49, .94, .10, .05); x.fill();
    } else if (kind === 'handle') {
      x.strokeStyle = dark; x.lineWidth = .055; x.beginPath(); x.arc(.40, .04, .175, -1.15, 1.2); x.stroke();
    } else if (kind === 'eye') {
      x.fillStyle = dark; x.beginPath(); x.ellipse(-.24, -.05, .048, .048, 0, 0, TAU); x.fill();
      x.fillStyle = K.light(.8); x.beginPath(); x.arc(-.255, -.065, .014, 0, TAU); x.fill();
    } else if (kind === 'wing') {
      x.fillStyle = 'rgba(24,14,40,.30)'; x.beginPath(); x.ellipse(-.02, .10, .17, .085, -.22, 0, TAU); x.fill();
    } else if (kind === 'face') {
      x.fillStyle = dark;
      x.beginPath(); x.ellipse(-.10, -.04, .033, .040, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(.10, -.04, .033, .040, 0, 0, TAU); x.fill();
      x.strokeStyle = dark; x.lineWidth = .012; x.lineCap = 'round';
      for (const k of [-1, 1]) for (let j = 0; j < 3; j++) {
        x.beginPath(); x.moveTo(k * .15, .02 + j * .045); x.lineTo(k * .31, .0 + j * .06); x.stroke();
      }
    } else if (kind === 'gems') {
      x.fillStyle = mix(col, '#fffdf8', .72);
      for (const gx of [-.16, 0, .16]) { x.beginPath(); x.arc(gx, .22, .028, 0, TAU); x.fill(); }
    } else if (kind === 'window') {
      x.fillStyle = dark; x.beginPath(); x.arc(0, -.14, .068, 0, TAU); x.fill();
      x.strokeStyle = K.light(.55); x.lineWidth = .016; x.stroke();
    } else if (kind === 'door') {
      x.fillStyle = dark; x.beginPath(); subRR(x, -.075, .17, .15, .21, .03); x.fill();
      x.fillStyle = K.light(.42); x.beginPath(); subRR(x, .09, .05, .09, .09, .02); x.fill();
    } else if (kind === 'glow') {
      const gl = x.createRadialGradient(0, -.02, .02, 0, .0, .62);
      gl.addColorStop(0, K.light(.34)); gl.addColorStop(1, K.light(0));
      x.fillStyle = gl; x.beginPath(); x.arc(0, 0, .62, 0, TAU); x.fill();
    } else if (kind === 'water') {
      x.strokeStyle = dark; x.lineWidth = .016; x.lineCap = 'round';
      for (let j = 0; j < 2; j++) {
        x.beginPath(); x.moveTo(-.42, .40 + j * .07);
        x.quadraticCurveTo(-.14, .34 + j * .07, 0, .40 + j * .07);
        x.quadraticCurveTo(.16, .46 + j * .07, .42, .40 + j * .07); x.stroke();
      }
    } else if (kind === 'spots') {
      x.fillStyle = K.light(.62);
      for (const s of [[-.15, -.13, .05], [.06, -.19, .042], [.18, -.06, .034]]) {
        x.beginPath(); x.ellipse(s[0], s[1], s[2], s[2] * .78, 0, 0, TAU); x.fill();
      }
    } else if (kind === 'eyes') {
      x.fillStyle = dark;
      x.beginPath(); x.ellipse(-.085, -.02, .042, .058, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(.085, -.02, .042, .058, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(0, .15, .045, .035, 0, 0, TAU); x.fill();
    }
    x.restore();
  }

  function paint(dt) {
    const gg = K.fit(cv());
    if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) geometry();
    if (!g) return;
    step(dt);

    const x = gg.x, w = g.w, h = g.h, cx = g.cx, cy = g.cy, R = g.R;
    x.clearRect(0, 0, w, h);
    const mat = K.surf(x, w, h);

    const f = rs.f, A = SHAPES[rs.ai], B = SHAPES[rs.bi], shown = SHAPES[rs.si];

    const lobes = A.lobes.map((l, i) => {
      const q = B.lobes[i];
      return {
        x: l.x + (q.x - l.x) * f, y: l.y + (q.y - l.y) * f,
        rx: l.rx + (q.rx - l.rx) * f, ry: l.ry + (q.ry - l.ry) * f,
        rot: l.rot + (q.rot - l.rot) * f, rad: l.rad + (q.rad - l.rad) * f
      };
    });

    /* the turn: the face narrows, the body squashes a touch and leans */
    const th = f * Math.PI;
    const face = Math.cos(th), turn = Math.sin(th);
    const side = face >= 0 ? 1 : -1;
    const sx = R * bounce * (.30 + .70 * Math.abs(face));
    const sy = R * bounce * (1 - .07 * turn);

    /* floor shadow: soft, narrower when edge-on, sliding with the turn */
    const maxY = lobes.reduce((v, l) => Math.max(v, l.y + l.ry), 0);
    const maxX = lobes.reduce((v, l) => Math.max(v, Math.abs(l.x) + l.rx), 0);
    const fy = cy + maxY * sy + 9;
    const fw = Math.max(26, maxX * sx * 1.16);
    const shx = cx - turn * R * .17;
    const floor = x.createRadialGradient(shx, fy, 2, shx, fy, Math.max(30, fw * 1.45));
    floor.addColorStop(0, mat.flat ? 'rgba(36,26,58,.30)' : 'rgba(6,3,22,.55)');
    floor.addColorStop(1, 'rgba(8,4,24,0)');
    x.fillStyle = floor;
    x.beginPath();
    x.ellipse(shx, fy, fw, Math.max(6, R * .075) * (1 - .22 * turn), 0, 0, TAU);
    x.fill();

    x.save();
    x.translate(cx + turn * side * R * .03, cy + turn * R * .02);
    x.rotate(turn * .05 * side);
    x.transform(1, 0, .11 * turn * side, 1, 0, 0);
    x.scale(sx, sy);

    const col = mix(A.col, B.col, f);
    const dep = .10 + .26 * turn;
    /* stepped side faces: the extrusion flips side exactly at the edge-on frame */
    for (let i = 6; i >= 1; i--) {
      x.save(); x.translate(-dep * side * i / 6, dep * .34 * i / 6);
      path(x, lobes);
      x.fillStyle = mix(col, '#120c26', .30 + .10 * (i / 6)); x.fill(); x.restore();
    }

    path(x, lobes);
    const grd = x.createLinearGradient(0, -1.15, .30, 1.15);
    if (mat.flat) {
      grd.addColorStop(0, mix(col, '#fffdf8', .26));
      grd.addColorStop(.55, col);
      grd.addColorStop(1, mix(col, '#241a3a', .30));
    } else {
      grd.addColorStop(0, mix(col, '#ffffff', .40));
      grd.addColorStop(.52, col);
      grd.addColorStop(1, mix(col, '#2a1b46', .45));
    }
    x.fillStyle = grd; x.fill();
    if (mat.flat) { x.lineWidth = .018; x.strokeStyle = mat.outline || '#241a3a'; x.stroke(); }

    /* the specular follows the turn: it slides across the face as it rotates */
    x.save(); path(x, lobes); x.clip();
    const hx = -.50 + turn * .46;
    const sheen = x.createRadialGradient(hx, -.62, .04, hx + .22, -.28, 1.5);
    sheen.addColorStop(0, K.light(mat.flat ? .30 : .44));
    sheen.addColorStop(.45, K.light(.10));
    sheen.addColorStop(1, K.light(0));
    x.fillStyle = sheen; x.fillRect(-1.4, -1.4, 2.8, 2.8);
    if (turn > .12) {
      const rim = x.createLinearGradient(-1, 0, 1, 0);
      rim.addColorStop(0, K.light(0));
      rim.addColorStop(.72, K.light(.05 * turn));
      rim.addColorStop(1, K.light(.26 * turn));
      x.fillStyle = rim; x.fillRect(-1.4, -1.4, 2.8, 2.8);
    }
    x.restore();
    if (turn > .25) {
      path(x, lobes);
      x.strokeStyle = K.light(.20 * (turn - .25)); x.lineWidth = .015; x.stroke();
    }

    if (f < .55) accent(x, A.acc, (1 - f / .55) * .85, col);
    else accent(x, B.acc, clamp((f - .45) / .40, 0, 1) * .85, col);
    x.restore();

    /* discovery: expanding ring + sparkle burst above the object */
    for (const fl of flashes) {
      x.beginPath(); x.arc(cx, cy, R * (.58 + fl.r * .82), 0, TAU);
      x.strokeStyle = fl.col ? mix(fl.col, '#ffffff', .45) : K.light(.6);
      x.globalAlpha = clamp(fl.a, 0, 1) * .45; x.lineWidth = 2; x.stroke(); x.globalAlpha = 1;
    }
    for (const s of sparks) {
      x.save(); x.globalAlpha = clamp(s.life, 0, 1);
      x.translate(s.x, s.y); x.rotate(s.rot);
      star(x, s.r * (.55 + .45 * s.life));
      x.fillStyle = s.col; x.fill(); x.restore();
    }

    /* caption block: name and one-liner resolve as the shape settles */
    const band = Math.min(96, h * .26);
    const vis = Math.min(1, .42 + Math.abs(f - .5) * 2.4);
    x.save(); x.globalAlpha = vis;
    K.label(x, shown.name, cx, h - band, 15);
    K.label(x, shown.caption, cx, h - band + 20, 10.5);
    x.restore();

    const nf = found.filter(Boolean).length;
    K.label(x, nf + ' / ' + N + ' found', w - 14, 16, 10, 'right');

    /* the dot row is the collection: filled = met, hollow = still out there */
    for (let i = 0; i < N; i++) {
      const dx = g.x0 + i * g.stepX, cur = i === rs.si;
      if (found[i]) {
        x.save();
        x.globalAlpha = cur ? 1 : .78;
        x.beginPath(); x.arc(dx, g.dotY, cur ? 4.6 : 3.3, 0, TAU);
        x.fillStyle = SHAPES[i].col; x.fill();
        x.restore();
      } else {
        x.beginPath(); x.arc(dx, g.dotY, 3.3, 0, TAU);
        x.strokeStyle = INK(.26); x.lineWidth = 1.2; x.stroke();
      }
      if (cur) {
        x.beginPath(); x.arc(dx, g.dotY, 7.8, 0, TAU);
        x.strokeStyle = INK(.42); x.lineWidth = 1.2; x.stroke();
      }
    }
  }

  /* K.loop stops re-arming the moment a frame throws, so a single bad frame
   * would leave the toy permanently blank. A frame must never escape. */
  function frame(dt) {
    try { paint(dt); }
    catch (e) { if (!frame.warned) { frame.warned = true; console.warn('vignettes: frame', e); } }
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  function dotHit(p) {
    if (!g) return -1;
    if (Math.abs(p.y - g.dotY) > 17) return -1;
    for (let i = 0; i < N; i++) {
      if (Math.abs(p.x - (g.x0 + i * g.stepX)) <= Math.max(9, g.stepX * .55)) return i;
    }
    return -1;
  }

  K && window.DECIDER_GAMES.push({
    id: 'vignettes', name: 'Vignettes', short: 'Vignettes', label: 'Object', noResult: true, button: false,
    body: `<canvas class="toy" id="vgCv"></canvas>
      <div class="res" id="vgRes" aria-live="polite"><span class="muted">Drag to turn the ring — tap a dot to jump</span></div>`,
    init() {
      L = K.loop(frame); geometry(); const c = cv();
      if (c && c.clientWidth > 2) { paint(1); L.start(); }
      if (!c) return;
      c.dataset.found = String(found.filter(Boolean).length);
      c.dataset.idx = '0';
      c.addEventListener('pointerdown', e => {
        const p = at(e), hit = dotHit(p);
        if (hit >= 0) { jump(hit); return; }
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        dragging = true; vSp = 0; aim = null; lastX = p.x;
        /* a plain tap still presses the object instead of doing nothing */
        try { sfx(200, .05, .03, 'sine', 280); } catch (err) {}
        try { hap(4); } catch (err) {}
        bounce = Math.min(1.06, bounce + .10);
      });
      c.addEventListener('pointermove', e => {
        if (!dragging) return;
        const px = at(e).x, d = px - lastX; lastX = px;
        const s = d * g.sens;
        spin += s;
        vSp = clamp(vSp * .55 + s * .45, -.30, .30);
      });
      const up = () => { dragging = false; };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
    },
    enter() { geometry(); dragging = false; L.start(); },
    leave() { dragging = false; L.stop(); },
    action() { advance(1); },
    shake(info) {
      vSp += Math.sign(info.dir || 1) * .20 * Math.max(.3, info.power || .5);
      sfx(300, .07, .035, 'sine', 520);
    }
  });
})();
