/* Vignettes — one extruded shape, turned by hand. Every half-turn it becomes a
 * different thing: key, bottle, boot, teapot, fish, bird. Drag left or right. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2, HALF = Math.PI / 2; const cv = () => document.getElementById('vgCv');
  const resEl = () => document.getElementById('vgRes');

  const SHAPES = [
    { name: 'Key', col: '#ffd76a', acc: 'hole', lobes: [
      { x: 0, y: -.55, rx: .19, ry: .19, rot: 0, rad: 1 },
      { x: 0, y: .06, rx: .055, ry: .56, rot: 0, rad: .08 },
      { x: .15, y: .5, rx: .1, ry: .06, rot: 0, rad: .25 }] },
    { name: 'Bottle', col: '#5eead4', acc: 'band', lobes: [
      { x: 0, y: .28, rx: .3, ry: .42, rot: 0, rad: .32 },
      { x: 0, y: -.28, rx: .1, ry: .3, rot: 0, rad: .3 },
      { x: 0, y: -.6, rx: .13, ry: .08, rot: 0, rad: .4 }] },
    { name: 'Boot', col: '#d08a5a', acc: 'sole', lobes: [
      { x: -.06, y: -.2, rx: .2, ry: .46, rot: .04, rad: .3 },
      { x: .16, y: .4, rx: .36, ry: .17, rot: .02, rad: .35 },
      { x: .02, y: .57, rx: .44, ry: .08, rot: 0, rad: .3 }] },
    { name: 'Teapot', col: '#ff9fc4', acc: 'handle', lobes: [
      { x: -.06, y: .18, rx: .4, ry: .33, rot: 0, rad: .55 },
      { x: -.43, y: -.02, rx: .17, ry: .08, rot: -.5, rad: .5 },
      { x: -.02, y: -.2, rx: .1, ry: .07, rot: 0, rad: .4 }] },
    { name: 'Fish', col: '#69a7ff', acc: 'eye', lobes: [
      { x: -.06, y: .02, rx: .4, ry: .26, rot: 0, rad: .65 },
      { x: .35, y: -.05, rx: .18, ry: .17, rot: .5, rad: .3 },
      { x: .02, y: -.2, rx: .17, ry: .07, rot: -.15, rad: .4 }] },
    { name: 'Bird', col: '#ffb347', acc: 'wing', lobes: [
      { x: -.02, y: .1, rx: .3, ry: .36, rot: -.1, rad: .55 },
      { x: .15, y: -.33, rx: .19, ry: .17, rot: 0, rad: .6 },
      { x: .4, y: -.32, rx: .12, ry: .055, rot: .1, rad: .2 }] }
  ]; const N = SHAPES.length;

  let L = null, g = null, idx = 0, prev = 0, m = 1, ang = 0, vAng = 0;
  let dragging = false, lastX = 0, bounce = 1, bv = 0, flashes = [], t = 0; let found = SHAPES.map((_, i) => i === 0);

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
      x.save(); x.translate(l.x, l.y); x.rotate(l.rot);
      subRR(x, -l.rx, -l.ry, l.rx * 2, l.ry * 2, Math.min(l.rx, l.ry) * l.rad * 2); x.restore();
    }
  }

  function geometry() {
    const c = cv(); if (!c) return; g = K.fit(c); g.cx = g.w * .5; g.cy = g.h * .42;
    g.R = Math.min(g.w * .40, g.h * .33);
  }

  function flip(dir) {
    if (m < .35 && prev !== idx) return; prev = idx; idx = (idx + dir + N) % N; m = 0; found[idx] = true;
    bounce = 1.18; bv = 0; sfx(392 * Math.pow(2, idx / 6), .13, .05, 'triangle', 660); hap(9);
    flashes.push({ a: 1, r: 1 }); const el = resEl();
    if (el) el.innerHTML = '<span class="muted">' + SHAPES[idx].name + ' — keep turning</span>';
  }

  function accent(x, kind, a, col) {
    if (a < .02) return; x.save(); x.globalAlpha = a; x.fillStyle = 'rgba(26,18,50,.55)'; x.strokeStyle = col;
    if (kind === 'hole') { x.beginPath(); x.ellipse(0, -.55, .07, .07, 0, 0, TAU); x.fill(); }
    else if (kind === 'band') {
      x.globalAlpha = a * .35; x.fillStyle = '#ffffff'; x.beginPath(); subRR(x, -.26, .24, .52, .16, .06); x.fill();
    } else if (kind === 'sole') {
      x.globalAlpha = a * .45; x.fillStyle = '#2a1c3c'; x.beginPath(); subRR(x, -.44, .53, .88, .09, .045); x.fill();
    } else if (kind === 'handle') {
      x.globalAlpha = a; x.lineWidth = .055; x.beginPath(); x.arc(.4, .06, .17, -1.3, 1.35); x.stroke();
    } else if (kind === 'eye') {
      x.globalAlpha = a; x.beginPath(); x.arc(-.26, -.06, .045, 0, TAU); x.fill();
    } else if (kind === 'wing') {
      x.globalAlpha = a * .55; x.beginPath(); x.ellipse(-.02, .12, .18, .1, -.2, 0, TAU);
      x.fillStyle = '#a35f16'; x.fill();
    }
    x.restore();
  }

  function paint(dt) {
    const gg = K.fit(cv()); if (!g || Math.abs(g.w - gg.w) > .5) geometry(); if (!g) return; t += dt;

    if (!dragging) {
      ang += vAng * dt; vAng *= Math.pow(.93, dt); if (Math.abs(vAng) < .03) ang += -ang * .17 * dt;
      if (Math.abs(ang) < .003) ang = 0;
    }
    if (ang > HALF) { ang -= HALF; flip(1); }
    else if (ang < -HALF) { ang += HALF; flip(-1); }
    if (m < 1) m = Math.min(1, m + dt * .1);

    bounce += bv * dt; bv += (1 - bounce) * .3 * dt; bv *= Math.pow(.82, dt);
    flashes.forEach(f => { f.a -= .035 * dt; f.r += .06 * dt; }); flashes = flashes.filter(f => f.a > 0);

    const A = SHAPES[prev], B = SHAPES[idx];
    const lobes = A.lobes.map((l, i) => {
      const q = B.lobes[i];
      return {
        x: l.x + (q.x - l.x) * m, y: l.y + (q.y - l.y) * m,
        rx: l.rx + (q.rx - l.rx) * m, ry: l.ry + (q.ry - l.ry) * m,
        rot: l.rot + (q.rot - l.rot) * m, rad: l.rad + (q.rad - l.rad) * m
      };
    });

    const x = gg.x, w = g.w, h = g.h, cx = g.cx, cy = g.cy, R = g.R; x.clearRect(0, 0, w, h);
    const baseY = lobes.reduce((v, l) => Math.max(v, l.y + l.ry), .2) * R * bounce;
    const baseW = lobes.reduce((v, l) => Math.max(v, l.rx), .2) * R * bounce;
    const fy = cy + baseY + 10, fw = Math.min(w * .46, baseW * 1.25);
    const floor = x.createRadialGradient(cx, fy, 4, cx, fy, Math.max(30, fw * 1.5));
    floor.addColorStop(0, 'rgba(8,4,26,.5)'); floor.addColorStop(1, 'rgba(8,4,26,0)'); x.fillStyle = floor;
    x.beginPath(); x.ellipse(cx, fy, fw, Math.max(7, R * .075), 0, 0, TAU); x.fill();

    x.save(); x.translate(cx, cy); x.rotate(ang * .07);
    x.scale(R * bounce * Math.max(.07, Math.cos(ang)), R * bounce);

    const col = mix(A.col, B.col, m), dep = .09 + Math.sin(ang) * .34;
    const dark = mix(col, '#150f2e', .42 + .1 * m);
    for (let i = 6; i >= 1; i--) {
      x.save(); x.translate(-dep * i / 6, dep * .34 * i / 6);
      path(x, lobes); x.fillStyle = dark; x.fill(); x.restore();
    }

    path(x, lobes); const grd = x.createLinearGradient(0, -1.1, 0, 1.1);
    grd.addColorStop(0, mix(col, '#ffffff', .38)); grd.addColorStop(.5, col);
    grd.addColorStop(1, mix(col, '#2a1b46', .45)); x.fillStyle = grd; x.fill();

    x.save(); path(x, lobes); x.clip(); const sheen = x.createRadialGradient(-.45, -.75, .05, -.2, -.4, 1.8);
    sheen.addColorStop(0, 'rgba(255,255,255,.4)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = sheen; x.fillRect(-1.3, -1.3, 2.6, 2.6); x.restore();

    const side = 'rgba(26,18,50,.42)'; if (m < .55) accent(x, A.acc, (1 - m / .55) * .85, side);
    else accent(x, B.acc, Math.min(1, (m - .45) / .4) * .85, side); x.restore();

    flashes.forEach(f => {
      x.beginPath(); x.arc(cx, cy, R * (.7 + f.r), 0, TAU);
      x.strokeStyle = 'rgba(255,255,255,' + (f.a * .5) + ')'; x.lineWidth = 2; x.stroke();
    });

    x.save(); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(255,255,255,' + (.35 + .5 * m) + ')';
    x.font = '800 12px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillText(SHAPES[idx].name.toUpperCase(), cx, h - 52); const step = 20, x0 = cx - (N - 1) * step / 2;
    for (let i = 0; i < N; i++) {
      const dx = x0 + i * step; x.beginPath(); x.arc(dx, h - 26, i === idx ? 4.6 : 3.2, 0, TAU);
      x.fillStyle = found[i] ? (i === idx ? '#ffffff' : 'rgba(255,255,255,.62)') : 'rgba(255,255,255,.16)'; x.fill();
      if (i === idx) {
        x.beginPath(); x.arc(dx, h - 26, 7.6, 0, TAU);
        x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 1.2; x.stroke();
      }
    }
    x.fillStyle = 'rgba(255,255,255,.4)'; x.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'right'; x.textBaseline = 'bottom';
    x.fillText(found.filter(Boolean).length + ' / ' + N + ' found', w - 14, h - 14); x.restore();
  }

  /* K.loop stops re-arming the moment a frame throws, so a single bad frame
   * would leave the toy permanently blank. A frame must never escape. */
  function frame(dt) {
    try { paint(dt); }
    catch (e) { if (!frame.warned) { frame.warned = true; console.warn('vignettes: frame', e); } }
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  K && window.DECIDER_GAMES.push({
    id: 'vignettes', name: 'Vignettes', short: 'Vignettes', label: 'Object', button: false,
    body: `<canvas class="toy" id="vgCv"></canvas>
      <div class="res" id="vgRes" aria-live="polite"><span class="muted">Drag left or right — the shape becomes something else</span></div>`,
    init(card) {
      L = K.loop(frame); geometry(); const c = cv();
      // a mount that is already on screen paints straight away and keeps
      // animating — the draw path must not depend on enter() being called
      if (c.clientWidth > 2) { paint(1); L.start(); }
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        dragging = true; vAng = 0; lastX = at(e).x;
      });
      c.addEventListener('pointermove', e => {
        if (!dragging) return; const px = at(e).x; ang += (px - lastX) * .014; lastX = px;
      });
      const up = () => { dragging = false; }; c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
    },
    enter() { geometry(); L.start(); },
    leave() { dragging = false; L.stop(); },
    action() { flip(1); },
    shake(info) {
      vAng += Math.sign(info.dir || 1) * .12 * Math.max(.3, info.power || .5); sfx(300, .08, .04, 'sine', 520);
    }
  });
})();
