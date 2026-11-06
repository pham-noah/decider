/* Basketball — three flicks at the hoop; two or more makes decides. */
(function () {
  const K = window.DKIT;
  const TAU = Math.PI * 2;
  const cv = () => document.getElementById('bbCv');
  const res = () => document.getElementById('bbRes');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let L = null, geo = null, ball = null, drag = null, trail = [];
  let shots = 0, makes = 0, tally = [], phase = 'aim', pause = 0, netT = 0, bob = 0, air = 0, power = 0;

  function layout() {
    const c = cv(); if (!c) return; const g = K.fit(c); const rimW = Math.min(g.w * .17, 64), rimY = g.h * .32;
    geo = { w: g.w, h: g.h, cx: g.w / 2, rimY, rimW, r: Math.max(11, g.w * .038) };
    resetBall();
  }

  function resetBall() {
    ball = { x: geo.cx, y: geo.h - 46, vx: 0, vy: 0,
      py: geo.h - 46, scored: false, r: geo.r };
    trail = []; phase = 'aim';
  }

  function startRound() {
    shots = 0; makes = 0; tally = [];
    resetBall();
    K.setResult(res(), '3 shots decide');
  }

  function shoot(dx, dy) {
    if (!geo) return;
    if (phase === 'done') startRound();
    if (phase !== 'aim') return;
    // dy is how far you dragged up (negative), dx how far across: that is the throw
    const vy = clamp(dy * .16, -23, -5.5);            // weak flicks fall short, hard ones overshoot
    const vx = clamp(dx * .055, -9.5, 9.5);           // aim, no jitter
    power = clamp(Math.abs(dy) / 150, 0, 1);
    ball.vx = vx; ball.vy = vy; ball.py = ball.y; ball.scored = false;
    phase = 'fly'; trail = []; air = 0;
    K.setResult(res(), 'Shot ' + (shots + 1) + ' of 3');
    try { tone(420, .08, .04, 'sine', 640); } catch (e) {}
  }

  function endShot() {
    if (phase !== 'fly') return;
    shots++; if (ball.scored) makes++;
    tally.push(!!ball.scored);
    phase = 'pause'; pause = 24;
    if (ball.scored) { netT = 1; try { tone(880, .18, .06, 'sine', 1320); } catch (e) {} }
    else { try { tone(180, .1, .04, 'triangle'); } catch (e) {} }
    K.setResult(res(), shots >= 3 ? '…' : 'Shot ' + (shots + 1) + ' of 3');
  }

  function finish() {
    const pair = K.options(2); const yes = pair[0] || 'Yes', no = pair[1] || 'No'; const label = makes >= 2 ? yes : no;
    phase = 'done';
    ball.x = geo.cx; ball.y = geo.h - 46; ball.vx = 0; ball.vy = 0; trail = [];
    K.setResult(res(), label);
    K.decide(label, 'Basketball', makes + ' of 3 makes');
  }

  function physics(dt) {
    const b = ball;
    b.py = b.y;
    b.vy += .40 * dt; b.x += b.vx * dt; b.y += b.vy * dt; air += dt;
    trail.push({ x: b.x, y: b.y }); if (trail.length > 9) trail.shift();
    [-1, 1].forEach((s) => {
      const px = geo.cx + s * geo.rimW; const dx = b.x - px, dy = b.y - geo.rimY, d = Math.hypot(dx, dy) || 1;
      if (d < b.r + 4) {
        b.x += dx / d * (b.r + 4 - d); b.y += dy / d * (b.r + 4 - d); const vn = b.vx * dx / d + b.vy * dy / d;
        b.vx = (b.vx - 2 * vn * dx / d) * .58;
        b.vy = (b.vy - 2 * vn * dy / d) * .58;
        if (b.y < geo.rimY) { b.vy = Math.max(b.vy, 1.2); b.vx += (b.x < geo.cx ? -.7 : .7); }
        try { tone(310, .06, .03, 'square'); } catch (e) {}
      }
    });
    if (!b.scored && b.vy > 0 && b.py < geo.rimY && b.y >= geo.rimY &&
        Math.abs(b.x - geo.cx) < geo.rimW * .72) {
      b.scored = true;
    }
    if (b.y > geo.h + 40 || air > 180) endShot();
  }

  function drawHoop(x) {
    const { cx, rimY, rimW } = geo; x.save(); x.shadowColor = 'rgba(36,26,85,.14)'; x.shadowBlur = 18; x.shadowOffsetY = 8;
    K.rr(x, cx - rimW - 20, 18, (rimW + 20) * 2, rimY - 36, 12); x.fillStyle = 'rgba(255,255,255,.34)'; x.fill(); x.restore();
    K.rr(x, cx - rimW - 20, 18, (rimW + 20) * 2, rimY - 36, 12); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 2; x.stroke();
    K.rr(x, cx - 26, rimY - 58, 52, 34, 4); x.strokeStyle = 'rgba(255,111,174,.55)'; x.lineWidth = 2; x.stroke(); const sway = netT * 5;
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.3;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, nx = cx - rimW + t * rimW * 2; x.beginPath(); x.moveTo(nx, rimY); x.lineTo(cx + (nx - cx) * .45 + Math.sin(t * 7 + netT * 10) * sway, rimY + 34);
      x.stroke();
    }
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      const yy = rimY + i * 11; x.beginPath(); x.moveTo(cx - rimW + (rimW * .5 * i / 2), yy); x.lineTo(cx + rimW - (rimW * .5 * i / 2), yy); x.stroke();
    }
    x.lineCap = 'round'; x.beginPath(); x.ellipse(cx, rimY, rimW, 8, 0, 0, TAU); x.strokeStyle = '#ff6a3d'; x.lineWidth = 5; x.stroke();
    x.beginPath(); x.ellipse(cx, rimY, rimW, 8, 0, Math.PI, TAU); x.strokeStyle = 'rgba(255,255,255,.65)'; x.lineWidth = 1.6; x.stroke();
  }

  function drawPower(x, g) {
    if (phase !== 'aim') return;
    if (drag) {
      const dy = Math.abs(drag.y - drag.y0);
      K.meter(x, g.w, g.h, clamp(dy / 150, 0, 1), Math.round(clamp(dy / 150, 0, 1) * 100) + '% flick');
    } else {
      K.meter(x, g.w, g.h, 0, 'Flick up on the ball — harder goes further');
    }
  }

  function drawTally(x, h) {
    for (let i = 0; i < 3; i++) {
      const px = 18 + i * 17, py = h - 22; x.beginPath(); x.arc(px, py, 5.5, 0, TAU);
      x.fillStyle = i < tally.length ? (tally[i] ? '#4ade80' : 'rgba(36,26,85,.26)') : 'rgba(255,255,255,.85)'; x.fill();
      x.strokeStyle = 'rgba(36,26,85,.28)'; x.lineWidth = 1; x.stroke();
    }
    x.fillStyle = 'rgba(36,26,85,.6)'; x.font = '700 9px "Bricolage Grotesque",system-ui,sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText(makes + '/3 MADE', 76, h - 21);
  }

  function drawBall(x) {
    const b = ball;
    trail.forEach((p, i) => {
      x.beginPath(); x.arc(p.x, p.y, b.r * (.35 + i / trail.length * .5), 0, TAU); x.fillStyle = 'rgba(255,138,76,' + ((i + 1) / trail.length * .22) + ')'; x.fill();
    }); x.save(); x.shadowColor = 'rgba(36,26,85,.3)'; x.shadowBlur = 12; x.shadowOffsetY = 5;
    const grd = x.createRadialGradient(b.x - b.r * .35, b.y - b.r * .4, 1, b.x, b.y, b.r);
    grd.addColorStop(0, '#ffbc85'); grd.addColorStop(1, '#e2622b'); x.beginPath(); x.arc(b.x, b.y, b.r, 0, TAU); x.fillStyle = grd; x.fill(); x.restore();
    x.strokeStyle = 'rgba(70,26,8,.55)'; x.lineWidth = 1.4; x.beginPath(); x.arc(b.x, b.y, b.r, 0, TAU); x.stroke();
    x.beginPath(); x.moveTo(b.x - b.r, b.y); x.lineTo(b.x + b.r, b.y); x.stroke(); x.beginPath(); x.arc(b.x, b.y, b.r * 1.45, Math.PI * .62, Math.PI * .95); x.stroke();
    x.beginPath(); x.arc(b.x, b.y, b.r * 1.45, Math.PI * 1.05, Math.PI * 1.38); x.stroke();
  }

  function frame(dt) {
    const g = K.fit(cv());
    if (!geo || Math.abs(geo.w - g.w) > .5) layout();
    if (!geo) return;
    const x = g.x, w = g.w, h = g.h; x.clearRect(0, 0, w, h);
    K.rr(x, 0, 0, w, h, 18); x.fillStyle = 'rgba(255,255,255,.28)'; x.fill(); const grd = x.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(255,179,71,.16)'); x.fillStyle = grd; x.fillRect(0, 0, w, h);
    if (netT > 0) netT = Math.max(0, netT - dt * .04);
    if (phase === 'fly') physics(dt);
    if (phase === 'pause') { pause -= dt; if (pause <= 0) { if (shots >= 3) finish(); else resetBall(); } }
    drawHoop(x);
    drawTally(x, h);
    drawPower(x, { w, h });
    if (phase === 'aim') {
      bob += dt * .08; const lift = Math.sin(bob) * 6; x.save(); x.setLineDash([5, 7]); x.strokeStyle = 'rgba(111,139,255,.8)'; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(ball.x, ball.y - ball.r - 10); x.lineTo(ball.x, ball.y - ball.r - 34 - lift); x.stroke(); x.setLineDash([]); x.beginPath();
      x.moveTo(ball.x - 7, ball.y - ball.r - 40 - lift); x.lineTo(ball.x, ball.y - ball.r - 52 - lift); x.lineTo(ball.x + 7, ball.y - ball.r - 40 - lift);
      x.strokeStyle = 'rgba(111,139,255,.95)'; x.stroke(); x.restore();
    }
    drawBall(x);
    if (drag) {
      x.save(); x.setLineDash([4, 6]); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(ball.x, ball.y); x.lineTo(drag.x, drag.y); x.stroke();
      x.restore();
    }
  }

  const at = (e) => { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  K && window.DECIDER_GAMES.push({
    id: 'basketball', name: 'Basketball', short: 'Hoops', label: 'Shots',
    body: `<canvas class="toy" id="bbCv"></canvas><div class="res" id="bbRes" aria-live="polite"><span class="muted">Three shots — flick up to sink one</span></div><button class="btn" id="bbGo">Shoot</button>`,
    init(card) {
      L = K.loop(frame);
      layout();
      card.querySelector('#bbGo').onclick = () => shoot(0, -105);
      cv().addEventListener('pointerdown', (e) => {
        if (!geo || phase === 'fly' || phase === 'pause') return;
        const p = at(e); drag = { x: p.x, y: p.y, x0: p.x, y0: p.y };
        try { cv().setPointerCapture(e.pointerId); } catch (err) {}
      });
      cv().addEventListener('pointermove', (e) => { if (!drag) return; const p = at(e); drag.x = p.x; drag.y = p.y; });
      cv().addEventListener('pointerup', () => {
        if (!drag) return;
        const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
        drag = null; shoot(dx, dy);
      });
      cv().addEventListener('pointercancel', () => { drag = null; });
    },
    enter() { layout(); if (phase === 'done') startRound(); L.start(); },
    leave() { drag = null; L.stop(); },
    action() { shoot(0, -105); }
  });
})();