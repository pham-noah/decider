/* Balloons — a bobbing grid, each balloon hides a label; pop one to decide. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  const cv = () => document.getElementById('blCv');
  const TAU = Math.PI * 2;
  let L = null, g = null, pool = [], bs = [], parts = [], pending = [], popped = 0, t = 0, done = false;

  function fill() {
    pool = K.options(5);
    if (pool.length < 2) pool = ['Yes', 'No', 'Maybe'];
    const cols = 4, rows = 3, cw = g.w / cols, ch = (g.h - 84) / rows, top = 46;
    const r = Math.min(cw, ch) * 0.37;
    bs = []; parts = []; pending = []; popped = 0; done = false;
    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = ry * cols + cx;
        bs.push({
          x: (cx + 0.5) * cw + (Math.random() - 0.5) * 8,
          y: top + (ry + 0.4) * ch + (Math.random() - 0.5) * 10,
          r: r * (0.92 + Math.random() * 0.14),
          col: PAL[i % PAL.length], ph: Math.random() * TAU, sp: 0.8 + Math.random() * 0.5,
          label: pool[Math.floor(Math.random() * pool.length)], live: true, pop: 0, bx: 0, by: 0
        });
      }
    }
    K.setResult(document.getElementById('blRes'), '');
  }

  function balloon(x, b, now) {
    const bob = Math.sin(now / 620 * b.sp + b.ph) * 5;
    const sway = Math.sin(now / 980 * b.sp + b.ph) * 3;
    const bx = b.x + sway, by = b.y + bob;
    b.bx = bx; b.by = by;
    if (!b.live) return;

    x.beginPath();
    x.moveTo(bx, by + b.r * 1.12);
    x.bezierCurveTo(bx + 9, by + b.r * 1.6, bx - 11, by + b.r * 1.95, bx + 4, by + b.r * 2.35);
    x.strokeStyle = INK(.5); x.lineWidth = 1.2; x.stroke();

    x.save();
    x.beginPath(); x.ellipse(bx, by, b.r, b.r * 1.16, 0, 0, TAU);
    const gr = x.createRadialGradient(bx - b.r * .35, by - b.r * .45, 2, bx, by, b.r * 1.25);
    gr.addColorStop(0, K.light(.95));
    gr.addColorStop(.32, b.col);
    gr.addColorStop(1, b.col);
    x.fillStyle = gr; x.fill();
    x.save(); x.clip();
    const sh = x.createLinearGradient(0, by - b.r, 0, by + b.r * 1.2);
    sh.addColorStop(0, K.light(.25));
    sh.addColorStop(.55, INK(0));
    sh.addColorStop(1, 'rgba(20,8,50,.35)');
    x.fillStyle = sh; x.fillRect(bx - b.r, by - b.r * 1.2, b.r * 2, b.r * 2.4);
    x.beginPath(); x.ellipse(bx - b.r * .34, by - b.r * .5, b.r * .26, b.r * .34, -.5, 0, TAU);
    x.fillStyle = INK(.6); x.fill();
    x.restore();

    x.beginPath(); x.moveTo(bx - 5, by + b.r * 1.06); x.lineTo(bx + 5, by + b.r * 1.06); x.lineTo(bx, by + b.r * 1.22);
    x.closePath(); x.fillStyle = b.col; x.fill();

    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = INK(.45);
    x.font = `800 ${Math.round(b.r * 0.85)}px "Bricolage Grotesque",system-ui,sans-serif`;
    x.fillText('?', bx, by + 1);
    x.restore();
  }

  function burst(b) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU, s = 1 + Math.random() * 3.4;
      parts.push({ x: b.bx, y: b.by, vx: Math.cos(a) * s, vy: Math.sin(a) * s - .8, r: 1 + Math.random() * 2.4, life: 1, col: b.col });
    }
    parts.push({ x: b.bx, y: b.by, ring: 1, r: b.r, life: 1, col: b.col });
  }

  function pop(b) {
    /* a second balloon used to re-roll the verdict while the first was still pending */
    if (done) { if (b.live) { b.live = false; burst(b); try { tone(520, .06, .04, 'sine', 300); } catch (e) {} } return; }
    if (!b.live || pending.length) return;
    done = true;
    b.live = false; b.pop = 0.001;
    popped++;
    burst(b);
    try { tone(560 + Math.random() * 160, .1, .07, 'sine', 260); } catch (e) {}
    pending.push({ b, t: 0 });
  }

  function tick(dt, now) {
    if (!g) return;
    const x = g.x;
    x.clearRect(0, 0, g.w, g.h);

    x.fillStyle = INK(.62);
    x.font = '700 12px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(popped ? 'one popped — reset for a fresh grid' : 'tap a balloon', g.w / 2, 20);

    bs.forEach(b => balloon(x, b, now));

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt * 0.022;
      if (p.ring) {
        p.r += dt * 1.6;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU);
        x.strokeStyle = p.col; x.globalAlpha = Math.max(0, p.life) * .5; x.lineWidth = 2; x.stroke();
        x.globalAlpha = 1;
      } else {
        p.vy += 0.14 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt;
        x.globalAlpha = Math.max(0, p.life);
        x.fillStyle = p.col;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill();
        x.globalAlpha = 1;
      }
      if (p.life <= 0) parts.splice(i, 1);
    }

    for (let i = pending.length - 1; i >= 0; i--) {
      const q = pending[i];
      q.t += dt;
      q.b.pop = Math.min(1, q.t / 20);
      if (q.t > 16) {
        pending.splice(i, 1);
        K.setResult(document.getElementById('blRes'), q.b.label);
        K.decide(q.b.label, 'Balloons', 'The balloon you popped');
      }
    }
  }

  function at(e) {
    const r = cv().getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 1e9;
    bs.forEach(b => {
      if (!b.live) return;
      const d = Math.hypot(x - b.bx, y - b.by);
      if (d < b.r * 1.18 && d < bd) { bd = d; best = b; }
    });
    return best;
  }

  K && window.DECIDER_GAMES.push({
    id: 'balloons', name: 'Balloons', short: 'Balloons', label: 'Grid', noResult: true,
    body: `<canvas class="toy" id="blCv"></canvas>
      <div class="res" id="blRes" aria-live="polite"><span class="muted">Pop one</span></div>
      <button class="btn" id="blGo">Reset</button>`,
    init(card) {
      L = K.loop(tick);
      g = K.fit(cv());
      fill();
      const c = cv();
      c.addEventListener('pointerdown', e => { const b = at(e); if (b) pop(b); });
      card.querySelector('#blGo').onclick = () => { fill(); try { tone(420, .1, .05, 'sine', 660); } catch (e) {} };
    },
    enter() {
      if (!g || Math.abs(g.w - cv().clientWidth) > 1) { g = K.fit(cv()); fill(); }
      L.start();
    },
    leave() { L.stop(); },
    action() { fill(); }
  });
})();
