/* Ball — a stress ball you squeeze. The finger squashes it flat along its
 * press, the sides bulge, and it wobbles back with a rubbery squeak. Drag while
 * squeezing and the squash follows the finger round the ball. No goal. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('sbCv');
  let L = null, g = null, held = false, sq = 0, sqv = 0, dir = -Math.PI / 2, ax = 0, ay = 0, squeaked = false;
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  const geo = () => ({ cx: g.w / 2, cy: g.h * .50, r: Math.min(g.w * .33, g.h * .285) });

  function press() {
    held = true; squeaked = false;
    sfx(740, .10, .045, 'sine', 1240);                 // rubbery squeak up
    setTimeout(() => sfx(1240, .09, .028, 'sine', 880), 55);
    hap(10);
  }
  function letGo() {
    held = false; sqv -= .55;
    sfx(520, .15, .05, 'sine', 900);
    hap(8);
  }

  function step(dt) {
    sqv += ((held ? 1 : 0) - sq) * .34 * dt;
    sqv *= Math.pow(.88, dt);
    sq += sqv * dt;
    if (sq > 1.06) { sq = 1.06; sqv *= -.3; }
    if (sq < -.34) { sq = -.34; sqv = 0; }
    if (held && sq > .72 && !squeaked) { squeaked = true; sfx(1560, .05, .02, 'sine', 1980); }
  }

  function draw() {
    if (!g) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), flat = m.flat, q = geo();
    const s = Math.max(-.34, Math.min(1.06, sq));
    const along = 1 - Math.max(0, s) * .26;            // squashed on the press axis
    const across = 1 + Math.max(0, s) * .40 + Math.max(0, -s) * .12;
    K.label(x, 'SQUEEZE THE BALL', w / 2, 20, 11);

    // contact shadow, wider as it flattens
    x.save();
    x.beginPath(); x.ellipse(q.cx, q.cy + q.r * 1.02, q.r * (.72 + Math.max(0, s) * .30), q.r * .13, 0, 0, TAU);
    x.fillStyle = flat ? 'rgba(36,26,58,.16)' : 'rgba(0,0,0,.32)'; x.fill();
    x.restore();

    x.save();
    x.translate(q.cx + Math.cos(dir) * s * q.r * .12, q.cy + Math.sin(dir) * s * q.r * .12);
    x.rotate(dir);
    x.scale(along, across);
    x.rotate(-dir);

    const bg = x.createRadialGradient(-q.r * .30, -q.r * .34, 2, 0, 0, q.r);
    if (flat) { bg.addColorStop(0, '#ffb9a6'); bg.addColorStop(.62, '#ff7a5c'); bg.addColorStop(1, '#e0563c'); }
    else { bg.addColorStop(0, '#ffc0ad'); bg.addColorStop(.48, '#ff7a5c'); bg.addColorStop(1, '#a6351f'); }
    x.beginPath(); x.arc(0, 0, q.r, 0, TAU); x.fillStyle = bg; x.fill();
    x.strokeStyle = flat ? '#241a3a' : 'rgba(70,20,10,.55)'; x.lineWidth = flat ? 1.8 : 1.4; x.stroke();

    // seam and specular
    x.beginPath(); x.arc(0, 0, q.r * .985, .55, 1.25);
    x.strokeStyle = flat ? 'rgba(36,26,58,.28)' : 'rgba(255,255,255,.16)'; x.lineWidth = 1.4; x.stroke();
    if (!flat) {
      x.beginPath(); x.ellipse(-q.r * .34, -q.r * .40, q.r * .26, q.r * .14, -.7, 0, TAU);
      x.fillStyle = K.light(.42); x.fill();
    }

    // the press edge goes dark and the skin just inside it catches the light
    if (s > .10) {
      const k = Math.min(1, s);
      x.save();
      x.beginPath(); x.arc(0, 0, q.r, 0, TAU); x.clip();
      const lg = x.createLinearGradient(q.r * .99, 0, q.r * .08, 0);
      lg.addColorStop(0, 'rgba(58,10,4,' + (.52 * k) + ')');
      lg.addColorStop(.55, 'rgba(58,10,4,0)');
      x.fillStyle = lg; x.fillRect(-q.r, -q.r, q.r * 2, q.r * 2);
      x.beginPath(); x.ellipse(q.r * .86, 0, q.r * .22, q.r * .40, 0, -1.35, 1.35);
      x.strokeStyle = 'rgba(255,216,194,' + (.30 * k) + ')'; x.lineWidth = 2; x.stroke();
      x.beginPath(); x.ellipse(q.r * .70, 0, q.r * .26, q.r * .30, 0, -1.2, 1.2);
      x.strokeStyle = 'rgba(70,16,8,' + (.18 * k) + ')'; x.lineWidth = 1.6; x.stroke();
      x.restore();
    }

    // face: squints under a squeeze, content otherwise
    x.fillStyle = '#3a1a16'; x.strokeStyle = '#3a1a16';
    if (s > .35) {
      [-1, 1].forEach(k => {
        x.beginPath(); x.moveTo(k * q.r * .20 - 5, -q.r * .10); x.lineTo(k * q.r * .20 + 5, -q.r * .10);
        x.lineWidth = 2.4; x.lineCap = 'round'; x.stroke();
      });
      x.beginPath(); x.ellipse(0, q.r * .20, q.r * .09, q.r * .06, 0, 0, TAU); x.fill();
    } else {
      [-1, 1].forEach(k => { x.beginPath(); x.arc(k * q.r * .22, -q.r * .12, q.r * .065, 0, TAU); x.fill(); });
      x.beginPath(); x.arc(0, q.r * .10, q.r * .13, .25, Math.PI - .25);
      x.lineWidth = 2.2; x.lineCap = 'round'; x.stroke();
    }
    x.restore();

    K.label(x, held ? 'squish' : 'it wobbles back', w / 2, h - 16, 10);
  }

  function frame(dt) {
    try {
      const gg = K.fit(cv());
      if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) g = gg;
      step(dt); draw();
    } catch (e) {}
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function aim(p) {
    const q = geo(), dx = p.x - q.cx, dy = p.y - q.cy;
    if (Math.hypot(dx, dy) > 6) dir = Math.atan2(dy, dx);
    ax = p.x; ay = p.y;
  }

  K && window.DECIDER_GAMES.push({
    id: 'ball', name: 'Stress ball', short: 'Ball', label: 'Ball', noResult: true, button: false,
    body: `<canvas class="toy" id="sbCv"></canvas>
      <div class="res" id="sbRes" aria-live="polite"><span class="muted">Squeeze it, let it jiggle</span></div>`,
    init() {
      L = K.loop(frame); g = K.fit(cv());
      const c = cv();
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e), q = geo();
        aim(p);
        if (Math.hypot(p.x - q.cx, p.y - q.cy) > q.r * 1.35) {   // a miss still wobbles it
          sqv += .35; sfx(300, .09, .04, 'sine', 520); hap(5);
          return;
        }
        press();
      });
      c.addEventListener('pointermove', e => { if (held) aim(at(e)); });
      const end = () => { if (held) letGo(); };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      if (cv().clientWidth) L.start();
    },
    enter() { g = K.fit(cv()); L.start(); },
    leave() { held = false; L.stop(); }
  });
})();
