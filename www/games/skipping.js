/* Skipping stone — flick a flat pebble across the water and count the skips.
 *
 * The throw is the whole toy: the speed of the flick sets how fast the stone
 * leaves the hand and its direction sets the launch angle, so a hard flat flick
 * skims eight or nine times and a slow or lofted one plops on the first touch.
 * There is no button: the canvas is the throw zone, and a tap (which carries no
 * flick) still throws, harder the further right it lands, so a dead finger is
 * never a dead toy.
 *
 * The run ends when the stone sinks (speed under ~4 m/s, or an impact steeper
 * than ~41°) or when it leaves the far shore. Score is the skip count, best
 * under d.skbest. Nothing here decides anything: noResult, silent.
 */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('skCv');
  const res = () => document.getElementById('skRes');

  /* metres across the canvas, and the water line as a fraction of the height:
     the stone is thrown at 4-16 m/s over ~26 m of water, which is what makes
     the skip count land between a plop and a pond-crossing. */
  const SPAN = 26, WY = 0.62;
  const S0 = 4, S1 = 12;          /* launch speed, m/s, at zero and full flick */
  const MIN_V = 4.0;              /* under this the stone goes in, not on */
  const MAX_INC = 0.72;           /* steeper than ~41° and it is a dive, not a skip */
  const DEC = 0.86, REFL = 0.40, POP = 0.50;

  let L = null, best = 0, frameErr = null;
  let st = null;                  /* the stone */
  let phase = 'ready';            /* ready | fly | sink | settle */
  let skips = 0, ripples = [], trail = [], spark = 0, marks = [], drops = [];
  let pending = false, settleT = 0, hold = null;
  let geo = null;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function geom() {
    const c = cv(); if (!c) return null;
    const g = K.fit(c);
    if (!g.w || !g.h) return null;
    const M = g.w / SPAN;
    return { x: g.x, w: g.w, h: g.h, M, wy: g.h * WY, ox: g.w * 0.06, oy: g.h * WY - 0.6 * M, G: 9.8 * M };
  }

  function say(line) { try { K.setResult(res(), line); } catch (e) {} }

  function reset() {
    geo = geom();
    st = null; phase = 'ready'; skips = 0; ripples = []; trail = []; pending = false;
    settleT = 0; spark = 0; hold = null; marks = []; drops = [];
    say('best ' + best);
  }

  /* ---- the throw ---- */
  function launch(power, ang) {
    const g = geo || geom(); if (!g) return;
    const speed = (S0 + power * S1) * g.M;
    st = {
      x: g.ox, y: g.oy,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      spin: 0, a: 1, gone: false
    };
    phase = 'fly'; skips = 0; hold = null; trail = [];
    say('0 skips · best ' + best);
    try { K.sfx.swish(.20, .06, 1900, 420); } catch (e) {}
    try { buzz(9); } catch (e) {}
  }

  function throwFrom(e) {
    if (phase !== 'ready') { pending = true; return; }   /* a flick mid-flight is queued, not lost */
    const g = geo || geom(); if (!g) return;
    let power, ang;
    if (!e || e.distance < 9) {
      /* a tap has no vector of its own: further right throws harder, and the
         nudge keeps two taps on the same spot from being the same throw */
      const px = e ? e.x : g.w * .5;
      power = clamp(px / g.w * 0.85 + rnd() * 0.30, 0.10, 1);
      ang = -0.16 + rnd() * 0.14;
    } else {
      power = clamp(e.power * 1.15, 0.05, 1);
      const rise = e.speed > 0.02 ? e.vy / e.speed : 0;   /* negative = flicked upward */
      ang = clamp(rise * 0.55, -0.45, 0.07);
    }
    launch(power, ang);
  }

  function skip() {
    skips++;
    const g = geo;
    ripples.push({ x: st.x, y: g.wy, r: 3, a: .8, max: 26 });
    marks.push({ x: st.x, a: .55 });
    for (let i = 0; i < 4; i++) {
      drops.push({ x: st.x, y: g.wy, vx: (rnd() - .35) * 34, vy: -(26 + rnd() * 34), a: .55, r: 1.4 + rnd() });
    }
    trail.length = 0;
    try { K.sfx.land(.55 + Math.min(.4, skips * .05)); } catch (e) {}
    try { K.sfx.rub(.05, .03, 2800, 1100); } catch (e) {}
    try { buzz(6); } catch (e) {}
    if (skips > best) { best = skips; try { store.set('d.skbest', best); } catch (e) {} spark = 1; try { tone(880, .12, .05, 'sine', 1320); } catch (e) {} }
    say(skips + (skips === 1 ? ' skip' : ' skips') + ' · best ' + best);
  }

  function endRun(sank) {
    phase = sank ? 'sink' : 'out';
    settleT = 0;
    for (let i = 0; i < (sank ? 3 : 1); i++) ripples.push({ x: st.x, y: geo.wy, r: 3 + i * 5, a: .7 - i * .18 });
    if (sank) { try { K.sfx.thud(.9); } catch (e) {} try { K.sfx.rub(.16, .04, 900, 300); } catch (e) {} }
    say(skips + (skips === 1 ? ' skip' : ' skips') + ' · best ' + best);
  }

  /* ---- simulation ---- */
  function step(dt) {
    const g = geo; if (!g) return;
    if (phase === 'fly' || phase === 'sink') {
      const dts = Math.max(0.0001, Math.min(0.05, dt / 60));
      st.vy += g.G * dts;
      if (phase === 'sink') { st.vy *= Math.pow(.94, dt); st.vx *= Math.pow(.9, dt); }
      st.x += st.vx * dts;
      st.y += st.vy * dts;
      st.spin += (st.vx / g.M) * 1.15 * dts;

      if (phase === 'fly') {
        trail.push({ x: st.x, y: st.y, a: .5 });
        if (trail.length > 7) trail.shift();
        for (const t of trail) t.a *= Math.pow(.86, dt);

        if (st.y >= g.wy && st.vy > 0) {
          const inc = Math.atan2(st.vy, Math.abs(st.vx));
          const mps = Math.abs(st.vx) / g.M;
          if (mps > MIN_V && inc < MAX_INC) {
            skip();
            st.y = g.wy;
            st.vy = -(Math.abs(st.vy) * REFL + POP * g.M);
            st.vx *= DEC;
          } else {
            st.y = g.wy; st.vy = 0; st.vx *= .35;
            endRun(true);
          }
        } else if (st.x > g.w + 8) {
          endRun(false);
        }
      } else if (phase === 'sink') {
        st.a = Math.max(0, st.a - .9 * dts);
        if (st.y > g.h + 12 || st.a <= 0) { phase = 'settle'; settleT = 0; st.gone = true; }
      }
    } else if (phase === 'settle' || phase === 'out') {
      settleT += dt;
      if (settleT > (phase === 'out' ? 7 : 26)) {
        phase = 'ready';
        if (pending) { pending = false; throwFrom(null); }
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      const cap = r.max || 30;
      r.r += (r.r < cap ? 1.15 : .25) * dt;
      r.a -= .014 * dt;
      if (r.a <= 0) ripples.splice(i, 1);
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      const dts = Math.max(0.0001, Math.min(0.05, dt / 60));
      d.vy += g.G * .55 * dts;
      d.x += d.vx * dts; d.y += d.vy * dts;
      d.a -= .9 * dt / 60;
      if (d.a <= 0 || d.y > g.wy + 26) drops.splice(i, 1);
    }
    if (spark > 0) spark = Math.max(0, spark - .02 * dt);
  }

  /* ---- drawing ---- */
  function water(x, g, m, now) {
    const wy = g.wy;

    /* a low sun over the far water: it is what the glints belong to, and it
       gives the empty half of the canvas a horizon to sit under */
    const sx = g.w * .79, sy = wy - g.h * .13, sr = Math.max(6, g.w * .034);
    if (m.flat) {
      x.save();
      x.beginPath(); x.arc(sx, sy, sr, 0, TAU);
      x.fillStyle = '#fff4d8'; x.fill();
      x.lineWidth = 1.8; x.strokeStyle = m.outline || '#241a3a'; x.stroke();
      x.restore();
    } else {
      x.save();
      const sg = x.createRadialGradient(sx, sy, 0, sx, sy, sr * 5.5);
      sg.addColorStop(0, 'rgba(255,238,196,.34)');
      sg.addColorStop(.35, 'rgba(255,226,170,.16)');
      sg.addColorStop(1, 'rgba(255,226,170,0)');
      x.fillStyle = sg; x.fillRect(sx - sr * 5.5, sy - sr * 5.5, sr * 11, sr * 11);
      x.beginPath(); x.arc(sx, sy, sr, 0, TAU);
      x.fillStyle = 'rgba(255,228,158,.92)'; x.fill();
      x.restore();
    }

    x.save();
    x.beginPath(); x.rect(0, wy, g.w, g.h - wy); x.clip();
    if (m.flat) {
      x.fillStyle = '#cfe8e4';
    } else {
      const wg = x.createLinearGradient(0, wy, 0, g.h);
      wg.addColorStop(0, '#4b9fb2'); wg.addColorStop(.42, '#22657f'); wg.addColorStop(1, '#0c2f4c');
      x.fillStyle = wg;
    }
    x.fillRect(0, wy, g.w, g.h - wy);

    /* the far side of the water carries a few slow glints, so the band between
       the surface and the floor is water and not a flat fill; they thin out and
       sink away from the horizon instead of tiling the whole band */
    x.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const yy = wy + (g.h - wy) * (0.10 + i * 0.105);
      const ww = g.w * (0.06 + ((i * 29) % 13) / 90);
      const off = ((now * (0.005 + (i % 3) * 0.004) + i * 71) % (g.w + ww)) - ww;
      x.beginPath();
      x.lineWidth = Math.max(1.4, 2.6 - i * .18);
      x.strokeStyle = m.flat ? 'rgba(36,26,58,' + (0.09 - i * .008) + ')' : 'rgba(255,255,255,' + (0.16 - i * .019) + ')';
      x.moveTo(off, yy); x.lineTo(off + ww, yy); x.stroke();
    }

    /* the sun's own reflection: a broken column of light coming towards the
       player, so the disc overhead and the water below are the same scene */
    if (!m.flat) {
      for (let i = 0; i < 9; i++) {
        const yy = wy + 3 + i * (g.h - wy) * .085;
        const wob = Math.sin(now / 620 + i * 1.7) * (3 + i * 1.6);
        const ww = g.w * (.10 - i * .006);
        x.beginPath();
        x.lineWidth = Math.max(1.2, 3.2 - i * .26);
        x.strokeStyle = 'rgba(255,240,200,' + (0.30 - i * .028) + ')';
        x.moveTo(sx - ww / 2 + wob, yy); x.lineTo(sx + ww / 2 + wob, yy); x.stroke();
      }
    }
    x.restore();

    /* the surface line itself: a bright lip with a soft shadow under it */
    x.save();
    x.beginPath(); x.moveTo(0, wy); x.lineTo(g.w, wy);
    x.lineWidth = m.flat ? 2 : 2.4;
    x.strokeStyle = m.flat ? (m.outline || '#241a3a') : 'rgba(255,255,255,.55)';
    x.stroke();
    if (!m.flat) {
      x.beginPath(); x.moveTo(0, wy + 3.5); x.lineTo(g.w, wy + 3.5);
      x.lineWidth = 3; x.strokeStyle = 'rgba(6,32,52,.28)'; x.stroke();
    }
    x.restore();
  }

  function ripple(x, r, flat) {
    x.save();
    x.beginPath();
    x.ellipse(r.x, r.y, r.r, Math.max(1, r.r * .26), 0, 0, TAU);
    x.lineWidth = 1.6;
    x.strokeStyle = flat ? 'rgba(36,26,58,' + (r.a * .55) + ')' : 'rgba(255,255,255,' + (r.a * .75) + ')';
    x.stroke();
    x.restore();
  }

  function pebble(x, px, py, spin, a, r) {
    r = r || 7;
    x.save();
    x.translate(px, py);
    x.rotate(spin);
    x.globalAlpha = a;
    const m = K.mat();
    /* a flat stone in the air shows its underside: a dark seam under a lit top */
    x.beginPath(); x.ellipse(0, 0, r, r * .42, 0, 0, TAU);
    x.fillStyle = m.flat ? '#f7f2e6' : '#8f89a6';
    x.fill();
    if (m.flat) { x.lineWidth = 1.6; x.strokeStyle = m.outline || '#241a3a'; x.stroke(); }
    const g = x.createLinearGradient(0, -r * .42, 0, r * .42);
    g.addColorStop(0, '#fdfbff'); g.addColorStop(.5, '#d8d3e4'); g.addColorStop(1, '#8a8399');
    x.beginPath(); x.ellipse(0, -r * .04, r * .92, r * .34, 0, 0, TAU);
    x.fillStyle = g; x.fill();
    x.beginPath(); x.ellipse(-r * .26, -r * .16, r * .30, r * .11, 0, 0, TAU);
    x.fillStyle = 'rgba(255,255,255,.8)'; x.fill();
    x.restore();
  }

  /* While the finger is down the stone is drawn where the finger is: the player
     is winding up, not aiming along a dashed line, and a cue that predicted the
     throw would disagree with the release velocity the moment they flick. */
  function held(x, m) {
    if (!hold || !geo) return;
    x.save();
    x.beginPath();
    x.moveTo(geo.ox, geo.oy);
    x.lineTo(hold.x, hold.y);
    x.lineWidth = 1.2;
    x.setLineDash([2, 5]);
    x.strokeStyle = INK(.28);
    x.stroke();
    x.restore();
    pebble(x, hold.x, hold.y, -.28, .95, 8);
  }

  function draw(dt, now) {
    const c = cv(); if (!c) return;
    const g = K.fit(c);
    if (!g.w || !g.h) return;
    if (!geo || Math.abs(geo.w - g.w) > 1 || Math.abs(geo.h - g.h) > 1) {
      geo = { x: g.x, w: g.w, h: g.h, M: g.w / SPAN, wy: g.h * WY, ox: g.w * 0.06,
              oy: g.h * WY - 0.6 * (g.w / SPAN), G: 9.8 * (g.w / SPAN) };
      if (phase === 'ready') { /* a resize keeps the toy playable, not mid-throw */ }
    }
    const m = K.surf(g.x, g.w, g.h);
    const x = g.x;

    water(x, geo, m, now);

    /* a low sun glint on the horizon, light on every skin */
    if (!m.flat) {
      const sg = x.createRadialGradient(geo.w * .79, geo.wy - 3, 0, geo.w * .79, geo.wy - 3, geo.w * .34);
      sg.addColorStop(0, 'rgba(255,244,210,.26)'); sg.addColorStop(1, 'rgba(255,244,210,0)');
      x.save(); x.beginPath(); x.rect(0, 0, geo.w, geo.wy); x.clip();
      x.fillStyle = sg; x.fillRect(0, 0, geo.w, geo.wy); x.restore();
    }

    ripples.forEach(r => ripple(x, r, m.flat));

    /* every touch leaves a little dash on the surface, so the run reads as a
       line of marks across the water instead of a number */
    if (marks.length) {
      x.save();
      x.lineCap = 'round';
      x.lineWidth = 2;
      marks.forEach((mk, i) => {
        const a = .10 + (i / Math.max(1, marks.length)) * .30;
        x.beginPath();
        x.moveTo(mk.x - 3.5, geo.wy - 1); x.lineTo(mk.x + 3.5, geo.wy - 1);
        x.strokeStyle = m.flat ? 'rgba(36,26,58,' + a + ')' : 'rgba(255,255,255,' + (a + .18) + ')';
        x.stroke();
      });
      x.restore();
    }

    /* spray, thrown up by each touch and falling back into the water */
    if (drops.length) {
      x.save();
      x.fillStyle = m.flat ? 'rgba(36,26,58,.45)' : 'rgba(236,252,255,.85)';
      drops.forEach(d => {
        x.globalAlpha = Math.max(0, d.a);
        x.beginPath(); x.arc(d.x, d.y, d.r, 0, TAU); x.fill();
      });
      x.restore();
    }

    /* the stone, its wake and its shadow on the water */
    if (st && !st.gone) {
      trail.forEach((t, i) => pebble(x, t.x, t.y, 0, t.a * (i / trail.length) * .5, 5));
      if (st.y < geo.wy + 40) {
        const sh = clamp(1 - (geo.wy - st.y) / (geo.h * .5), 0, 1);
        if (sh > 0) {
          x.save(); x.beginPath();
          x.ellipse(st.x, geo.wy + 3, 9 * sh + 3, 2.6 * sh + 1, 0, 0, TAU);
          x.fillStyle = m.flat ? 'rgba(36,26,58,.18)' : 'rgba(4,20,40,.30)'; x.fill(); x.restore();
        }
      }
      pebble(x, st.x, st.y, Math.sin(st.spin) * .26, st.a);
    }

    held(x, m);

    /* the waiting stone sits in the hand at the left edge, breathing */
    if (phase === 'ready') {
      const bob = Math.sin(now / 420) * 1.6;
      const pulse = .35 + .25 * (0.5 + 0.5 * Math.sin(now / 520));
      x.save();
      x.beginPath(); x.arc(geo.ox + 6, geo.oy - 2 + bob, 13, 0, TAU);
      x.fillStyle = m.flat ? 'rgba(36,26,58,.07)' : 'rgba(255,255,255,' + pulse * .16 + ')';
      x.fill(); x.restore();
      pebble(x, geo.ox + 6, geo.oy - 2 + bob, -.28, 1, 7.5);
      K.label(x, 'flick to skip', geo.w / 2, 22, 11);
    }

    /* a new best gets one ring of sparks at the surface; the number lives in
       the .res line, never painted onto the water */
    if (spark > 0 && st) {
      x.save();
      x.beginPath();
      x.arc(st.x, geo.wy, 8 + (1 - spark) * 26, 0, TAU);
      x.lineWidth = 2.4;
      x.strokeStyle = 'rgba(255,226,150,' + spark * .85 + ')';
      x.stroke(); x.restore();
    }
  }

  function frame(dt, now) {
    try { step(dt); draw(dt, now); }
    catch (e) {
      if (!frameErr) { frameErr = e; console.error('skipping frame:', e); }
    }
  }

  K && window.DECIDER_GAMES.push({
    id: 'skipping', name: 'Skipping stone', short: 'Skips', label: 'Throw',
    noResult: true, button: false,
    body: '<canvas class="toy wide" id="skCv" role="img" aria-label="A flat stretch of water. Flick to throw a stone."></canvas>' +
          '<div class="res" id="skRes" aria-live="polite"></div>',
    init() {
      try { best = +store.get('d.skbest', 0) || 0; } catch (e) {}
      L = K.loop(frame);
      geo = geom();
      reset();
      K.gesture(cv(), {
        onStart(p) { hold = { x: p.x, y: p.y }; },
        onMove(p) { hold = { x: p.x, y: p.y }; },
        onEnd(e) { hold = null; throwFrom(e); }
      });
      if (cv().clientWidth) L.start();
    },
    enter() { reset(); geo = geom(); L.start(); },
    leave() { L.stop(); },
    action() { throwFrom(null); },
    status() { return { skips: skips, best: best, phase: phase, err: frameErr ? String(frameErr) : null }; }
  });
})();
