/* Spin the coin — flick it, watch it wobble down onto one face. */
(function () {
  const K = window.DKIT;
  const cv = () => document.getElementById('snCv');
  const TAU = Math.PI * 2;
  let L = null, g = null, faces = ['Heads', 'Tails'], face = 0, th = 0, vel = 0,
      state = 'rest', flat = 1, prec = 0, wob = 0, dieT = 0, taps = 0, t = 0,
      done = false, lastTick = 0, startVel = 1, R = 100;

  function star(x, r, n, rot) {
    x.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n;
      const rr = i % 2 ? r * 0.45 : r;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.closePath();
  }

  function pickFaces() {
    const list = (typeof opts !== 'undefined' ? opts : []).filter(o => o && o.l);
    return list.length >= 2 ? [list[0].l, list[1].l] : ['Heads', 'Tails'];
  }

  function flick(power) {
    if (state === 'spin' || state === 'die') return;
    faces = pickFaces();
    face = Math.random() < 0.5 ? 0 : 1;
    vel = 2.5 + Math.random() * 1.7 + (power || 0) * 1.7;
    startVel = vel; th = 0; prec = Math.random() * 6; wob = 0; flat = 0;
    state = 'spin'; done = false; taps = 0; dieT = 0;
    K.setResult(document.getElementById('snRes'), '');
    try { tone(760, .08, .05, 'triangle', 420); } catch (e) {}
  }

  function draw(now) {
    const x = g.x, w = g.w, h = g.h, cx = w / 2, cy = h * 0.50;
    R = Math.min(w * 0.34, h * 0.26);
    x.clearRect(0, 0, w, h);

    // table glow
    const tg = x.createRadialGradient(cx, cy + 18, 6, cx, cy + 18, R * 2.1);
    tg.addColorStop(0, 'rgba(255,255,255,.30)');
    tg.addColorStop(.55, 'rgba(255,255,255,.06)');
    tg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = tg;
    x.beginPath(); x.ellipse(cx, cy + 18, R * 2.1, R * 0.95, 0, 0, TAU); x.fill();

    // shadow tightens as the coin lies down
    const shR = R * (0.55 + 0.5 * flat), shA = 0.12 + 0.18 * flat;
    x.beginPath(); x.ellipse(cx, cy + R * 0.30, shR, shR * 0.24, 0, 0, TAU);
    x.fillStyle = `rgba(30,14,70,${shA.toFixed(2)})`; x.fill();

    const c = Math.abs(Math.cos(th));
    const rx = Math.max(2.4, R * (c + (1 - c) * flat));
    const ry = R * 0.38;
    const roll = Math.sin(prec) * 0.12 + Math.sin(now / 90) * wob * 0.35;
    const lift = Math.abs(Math.sin(now / 110)) * wob * R * 0.16;

    x.save();
    x.translate(cx, cy - lift);
    x.rotate(roll);

    // rim thickness
    const edge = Math.max(2, ry * 0.16);
    x.beginPath(); x.ellipse(0, edge, rx, ry, 0, 0, TAU);
    x.fillStyle = '#7d5310'; x.fill();

    const grd = x.createRadialGradient(-rx * 0.3, -ry * 0.45, 2, 0, 0, Math.max(rx * 1.1, ry * 1.4));
    grd.addColorStop(0, '#fff6d0');
    grd.addColorStop(.42, '#f2c655');
    grd.addColorStop(.86, '#c08f24');
    grd.addColorStop(1, '#8d6414');
    x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, TAU);
    x.fillStyle = grd; x.fill();

    if (rx > R * 0.22) {
      x.save();
      x.beginPath(); x.ellipse(0, 0, rx * 0.97, ry * 0.94, 0, 0, TAU); x.clip();
      x.strokeStyle = 'rgba(120,80,10,.45)'; x.lineWidth = Math.max(1, ry * 0.04);
      x.beginPath(); x.ellipse(0, 0, rx * 0.86, ry * 0.82, 0, 0, TAU); x.stroke();
      x.fillStyle = '#7c5510';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (state === 'rest' || state === 'die') {
        let label = faces[face];
        let fs = Math.round(ry * 0.95);
        x.font = `800 ${fs}px "Bricolage Grotesque",system-ui,sans-serif`;
        while (fs > 11 && x.measureText(label).width > rx * 1.5) {
          fs -= 1; x.font = `800 ${fs}px "Bricolage Grotesque",system-ui,sans-serif`;
        }
        if (x.measureText(label).width > rx * 1.5) {
          while (label.length > 2 && x.measureText(label).width > rx * 1.3) label = label.slice(0, -1);
          label = label.slice(0, -1) + '…';
        }
        x.fillText(label, 0, 1);
      } else {
        star(x, ry * 0.62, 5, -Math.PI / 2);
        x.fill();
      }
      x.restore();
      // glint
      x.save();
      x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, TAU); x.clip();
      const gx = -rx + ((now / 26) % (rx * 2.6));
      const gl = x.createLinearGradient(gx - ry * .5, -ry, gx + ry * .5, ry);
      gl.addColorStop(0, 'rgba(255,255,255,0)');
      gl.addColorStop(.5, 'rgba(255,255,255,.55)');
      gl.addColorStop(1, 'rgba(255,255,255,0)');
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = gl; x.fillRect(-rx, -ry, rx * 2, ry * 2);
      x.restore();
    } else {
      // edge-on: just the milled rim
      x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(0, -ry * 0.85); x.lineTo(0, ry * 0.85); x.stroke();
    }
    x.restore();

    // readout
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const rpm = Math.round(Math.abs(vel) * 573);
    x.fillStyle = 'rgba(255,255,255,.92)';
    x.font = '800 30px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillText(state === 'rest' || state === 'die' ? '0' : String(rpm), cx, h - 30);
    x.font = '700 11px "Bricolage Grotesque",system-ui,sans-serif';
    x.fillStyle = 'rgba(255,255,255,.5)';
    x.fillText('RPM', cx, h - 14);
    if (state === 'rest') {
      x.fillStyle = 'rgba(255,255,255,.85)';
      x.font = '700 12px "Bricolage Grotesque",system-ui,sans-serif';
      x.fillText('flick to spin', cx, h * 0.14);
    }
  }

  function tick(dt, now) {
    if (!g) return;
    if (state === 'spin') {
      th += vel * dt;
      prec += (0.02 + vel * 0.01) * dt;
      wob = Math.max(0, (1 - vel / startVel) * 0.55);
      vel *= Math.pow(0.984, dt);
      if (Math.floor(th / Math.PI) !== Math.floor((th - vel * dt) / Math.PI) && now - lastTick > 55) {
        lastTick = now;
        try { tone(300 + Math.random() * 90, .03, .025, 'square'); } catch (e) {}
      }
      if (vel < 0.24) { state = 'die'; dieT = 0; }
    } else if (state === 'die') {
      dieT += dt;
      flat = Math.min(1, flat + dt * 0.022);
      wob *= Math.pow(0.93, dt);
      if (dieT > 16 && taps < 4) {
        taps++; dieT = 0; wob = 0.62 - taps * 0.12;
        try { tone(250 - taps * 34, .05, .06, 'triangle', 170); } catch (e) {}
      }
      if (taps >= 4 && Math.abs(wob) < 0.03) {
        state = 'rest'; flat = 1; wob = 0;
        K.setResult(document.getElementById('snRes'), faces[face]);
        if (!done) { done = true; K.decide(faces[face], 'Spin coin', 'The coin landed'); }
      }
    } else {
      flat = 1;
      prec += 0.006 * dt;
      wob = Math.max(wob, 0);
    }
    draw(now);
  }

  K && window.DECIDER_GAMES.push({
    id: 'spincoin', name: 'Spin the coin', short: 'Spin coin', label: 'Coins', button: false,
    body: `<canvas class="toy" id="snCv"></canvas>
      <div class="res" id="snRes" aria-live="polite"><span class="muted">Flick the coin</span></div>
      <button class="btn" id="snGo">Flick</button>`,
    init(card) {
      L = K.loop(tick);
      g = K.fit(cv());
      let sx = 0, px = 0, moved = false;
      const c = cv();
      c.addEventListener('pointerdown', e => {
        c.setPointerCapture(e.pointerId);
        px = e.clientX; sx = 0; moved = true;
      });
      c.addEventListener('pointermove', e => {
        if (!moved) return;
        sx += Math.abs(e.clientX - px); px = e.clientX;
      });
      c.addEventListener('pointerup', () => {
        moved = false;
        if (state === 'rest') flick(sx > 4 ? Math.min(1, sx / 150) : 0.35);
      });
      card.querySelector('#snGo').onclick = () => flick(0.4);
    },
    enter() {
      if (!g || Math.abs(g.w - cv().clientWidth) > 1) g = K.fit(cv());
      try { faces = pickFaces(); } catch (e) {}
      L.start();
    },
    leave() { L.stop(); },
    action() { flick(0.4); }
  });
})();
