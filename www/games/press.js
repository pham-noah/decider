/* Press — one big springy button. It sinks under the finger, springs back
 * with overshoot, and clicks. No goal, no numbers. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('prCv');
  let L = null, g = null, big = null, rings = [], active = null;
  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); K.sfx.thud(.55); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };

  function layout() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const top = 52, bot = 54;
    const room = g.h - top - bot;
    if (!big) big = { q: 0, v: 0, held: false, flash: 0, i: 0, label: 'PRESS' };
    big.cx = g.w / 2;
    big.cy = top + room * .54;
    big.r = Math.min(g.w * .30, room * .34);
  }

  function spring(b, dt) {
    b.v += ((b.held ? 1 : 0) - b.q) * .30 * dt;
    b.v *= Math.pow(.80, dt);
    b.q += b.v * dt;
    if (b.q < -.24) { b.q = -.24; b.v = 0; }
    if (b.q > 1.05) { b.q = 1.05; b.v *= -.35; }
    b.flash = Math.max(0, b.flash - .045 * dt);
  }

  function step(dt) {
    spring(big, dt);
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += 3.4 * dt; r.a -= .035 * dt; if (r.a <= 0) rings.splice(i, 1);
    }
  }

  function down(b) {
    b.held = true; b.flash = 1;
    K.press(300);
    sfx(140, .07, .06, 'triangle', 78);            // the body under it
  }
  function up(b) {
    b.held = false; b.flash = .7;
    sfx(500, .18, .05, 'sine', 1000);
    hap(7);
    rings.push({ x: b.cx, y: b.cy, r: b.r * .82, a: .55 });
  }

  /* the cap: a shallow dome with its own thickness, lit from the top left */
  function drawCap(x, b, flat) {
    const q = Math.max(-.22, Math.min(1.04, b.q));
    const press = Math.max(0, q);
    const rx = b.r * (1 + q * .09);
    const ry = b.r * .90 * (1 - q * .14);
    const yy = b.cy + press * b.r * .20;
    const thick = b.r * .24 * (1 - press * .6);     /* the skirt under the face */

    /* skirt first, so the face sits on top of it */
    const gSide = x.createLinearGradient(0, yy, 0, yy + thick * 1.8);
    gSide.addColorStop(0, flat ? '#c8487d' : '#8a2456');
    gSide.addColorStop(1, flat ? '#8e2d58' : '#3f0d28');
    x.beginPath(); x.ellipse(b.cx, yy + thick, rx * .97, ry * .97, 0, 0, TAU);
    x.fillStyle = gSide; x.fill();
    x.strokeStyle = flat ? '#241a3a' : 'rgba(10,2,26,.55)';
    x.lineWidth = flat ? 1.4 : 1.2; x.stroke();

    /* the glow it throws when it is hit */
    if (b.flash > 0) {
      x.beginPath(); x.arc(b.cx, b.cy, b.r * 1.34, 0, TAU);
      x.fillStyle = K.light(b.flash * .11); x.fill();
    }

    /* the face */
    const g0 = x.createRadialGradient(b.cx - rx * .34, yy - ry * .46, 2, b.cx, yy, Math.max(rx, ry) * 1.05);
    if (flat) { g0.addColorStop(0, '#ffd2e2'); g0.addColorStop(.62, '#ff6fae'); g0.addColorStop(1, '#e94f92'); }
    else {
      g0.addColorStop(0, '#ffe0ea'); g0.addColorStop(.34, '#ff87bd');
      g0.addColorStop(.78, '#e04f8e'); g0.addColorStop(1, '#98205c');
    }
    x.beginPath(); x.ellipse(b.cx, yy, rx, ry, 0, 0, TAU); x.fillStyle = g0; x.fill();
    x.strokeStyle = flat ? '#241a3a' : INK(.42); x.lineWidth = flat ? 1.6 : 1.3; x.stroke();

    /* rim light across the top lip, and a specular on the dome */
    if (!flat) {
      x.save();
      x.beginPath(); x.ellipse(b.cx, yy, rx * .99, ry * .99, 0, Math.PI * 1.06, Math.PI * 1.94);
      x.strokeStyle = K.light(.55); x.lineWidth = Math.max(1.4, rx * .045); x.stroke();
      x.restore();
      x.beginPath(); x.ellipse(b.cx - rx * .30, yy - ry * .40, rx * .30, ry * .17, -.5, 0, TAU);
      x.fillStyle = K.light(.60); x.fill();
      x.beginPath(); x.ellipse(b.cx + rx * .34, yy + ry * .46, rx * .18, ry * .08, .4, 0, TAU);
      x.fillStyle = K.light(.16); x.fill();
    }

    x.fillStyle = flat ? 'rgba(36,26,58,.72)' : 'rgba(58,10,38,.78)';
    x.font = '800 ' + Math.max(13, Math.round(b.r * .30)) + 'px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(b.label, b.cx, yy + 1);
  }

  /* the housing: a solid cylinder standing out of the card, with a recess for
     the cap and a shadow it casts to the lower right */
  function housing(x, b, flat) {
    const R = b.r + 9, RY = R * .90;

    x.beginPath(); x.ellipse(b.cx + 4, b.cy + RY * .72, R * 1.04, RY * .32, 0, 0, TAU);
    x.fillStyle = flat ? 'rgba(36,26,58,.13)' : 'rgba(5,1,18,.52)'; x.fill();

    const gBody = x.createLinearGradient(0, b.cy - RY, 0, b.cy + RY);
    if (flat) { gBody.addColorStop(0, '#f6f0e2'); gBody.addColorStop(.55, '#e8e0cc'); gBody.addColorStop(1, '#d2c9b3'); }
    else { gBody.addColorStop(0, INK(.22)); gBody.addColorStop(.5, INK(.12)); gBody.addColorStop(1, INK(.05)); }
    x.beginPath(); x.ellipse(b.cx, b.cy + RY * .10, R, RY, 0, 0, TAU);
    x.fillStyle = gBody; x.fill();
    x.strokeStyle = flat ? '#241a3a' : INK(.18);
    x.lineWidth = flat ? 1.5 : 1.2; x.stroke();

    /* the recess */
    x.beginPath(); x.ellipse(b.cx, b.cy - RY * .04, R * .90, RY * .88, 0, 0, TAU);
    x.fillStyle = flat ? 'rgba(36,26,58,.10)' : 'rgba(0,0,0,.32)'; x.fill();

    drawCap(x, b, flat);
  }

  function draw() {
    if (!g) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), flat = m.flat;
    K.label(x, 'PRESS IT', w / 2, 20, 11);

    housing(x, big, flat);

    rings.forEach(r => {
      x.beginPath(); x.arc(r.x, r.y, r.r, 0, TAU);
      x.globalAlpha = Math.max(0, r.a);
      x.strokeStyle = flat ? 'rgba(36,26,58,.7)' : 'rgba(255,255,255,.9)';
      x.lineWidth = 1.6; x.stroke();
    });
    x.globalAlpha = 1;
    K.label(x, 'hold it down, let it pop', w / 2, h - 16, 10);
  }

  function frame(dt) {
    try {
      const gg = K.fit(cv());
      if (!g || Math.abs(g.w - gg.w) > .5 || Math.abs(g.h - gg.h) > .5) layout();
      step(dt); draw();
    } catch (e) {}
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const under = (p) => (Math.hypot(p.x - big.cx, p.y - big.cy) < big.r + 12 ? big : null);

  K && window.DECIDER_GAMES.push({
    id: 'press', name: 'Big button', short: 'Press', label: 'Press', noResult: true, button: false,
    body: `<canvas class="toy" id="prCv"></canvas>
      <div class="res" id="prRes" aria-live="polite"><span class="muted">Squash it</span></div>`,
    init() {
      L = K.loop(frame); layout();
      const c = cv();
      c.addEventListener('pointerdown', e => {
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const b = under(at(e));
        if (!b) return;
        active = b; down(b);
      });
      const end = () => { if (active) up(active); active = null; };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      if (cv().clientWidth) L.start();
    },
    enter() { layout(); L.start(); },
    leave() { if (active) active.held = false; active = null; L.stop(); }
  });
})();
