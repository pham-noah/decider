/* Hanoi — three posts on a lit floor, a stack of discs, and one rule.
 * Same perspective camera as Ring Toss: posts are cylinders, discs are cylinders,
 * so a disc carries its own shadow and the tower reads as a stack of real objects.
 * Tap a post to lift its top disc, tap another to set it down. Illegal moves are
 * refused with a shake and a buzz; nothing is scored, nothing is decided. */
(function () {
  const K = window.DKIT, TAU = Math.PI * 2;
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const cv = () => document.getElementById('hnCv');
  const movesEl = () => document.getElementById('hnMoves');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* world: X right, Y up from the floor, Z away from the eye */
  const GAP = 1.85, PEG_H = 1.62, PEG_R = 0.1, Z_PEG = 9.2;
  const TH = 0.2, R_MAX = 0.58, R_MIN = 0.24;

  let L = null, geo = null, n = 5, towers, moves = 0, solved = false;
  let held = null, fly = null, parts = [], flash = [0, 0, 0], shake = [0, 0, 0];
  let solveAt = -1, hint = 'tap a post to lift a disc', resTxt = '', queued = null;

  /* ---------- camera ---------- */
  function makeCam(w, h) {
    const f = h * 1.55, phi = 12 * Math.PI / 180;
    const cs = Math.cos(phi), sn = Math.sin(phi), hc = 2.8;
    const cx = w / 2, cy = h * 0.53;
    return {
      w, h, f, hc, cs, sn, cx, cy,
      p(X, Y, Z) {
        const yc = cs * (Y - hc) + sn * Z, zc = cs * Z - sn * (Y - hc);
        return { x: cx + f * X / zc, y: cy - f * yc / zc, s: f / zc, zc: zc };
      },
      sq(Y, Z) {
        const zc = cs * Z - sn * (Y - hc);
        return Math.abs(Y - hc) / Math.max(0.6, zc);
      },
      horizon: cy - f * Math.tan(phi)
    };
  }

  /* ---------- model ---------- */
  const pegX = (i) => (i - 1) * GAP;
  const discR = (d) => (n > 1 ? R_MIN + (R_MAX - R_MIN) * (d - 1) / (n - 1) : R_MAX);

  const count = () => n + ' discs · ' + moves + (moves === 1 ? ' move' : ' moves');

  function resetGame(keepParts) {
    n = n | 0;
    towers = [[], [], []];
    for (let d = n; d >= 1; d--) towers[0].push(d);
    moves = 0; solved = false; solveAt = -1;
    held = null; fly = null; flash = [0, 0, 0]; shake = [0, 0, 0];
    if (!keepParts) parts = [];
    hint = 'tap a post to lift a disc';
    say(count());
  }

  function say(t) {
    if (t === resTxt) return;
    resTxt = t;
    const el = movesEl(); if (el) el.textContent = t;
  }

  /* ---------- interaction ---------- */
  function refuse(i, why) {
    shake[i] = 1;
    try { K.sfx.knock(1.1); } catch (e) {}
    try { buzz([18, 40, 18]); } catch (e) {}
    hint = why;
  }

  function pick(i) {
    const d = towers[i].pop();
    const y0 = towers[i].length * TH;
    held = { d, peg: i, y0: y0 + TH, rise: 0 };
    try { K.sfx.click(.7); } catch (e) {}
    try { buzz(7); } catch (e) {}
    hint = 'tap a post to drop it';
  }

  function dropOn(j) {
    const d = held.d, y0 = heldY();
    const y1 = towers[j].length * TH;
    towers[j].push(d);
    fly = { d, x0: pegX(held.peg), y0: y0, x1: pegX(j), y1: y1, t: 0, dur: .3, to: j };
    held = null;
    moves++; flash[j] = 1;
    say(count());
    try { K.sfx.knock(.5); } catch (e) {}
    if (!solved && towers[j].length === n && j !== 0) solve(j);
  }

  function solve(peg) {
    solved = true; solveAt = peg;
    hint = '';
    try { K.sfx.clink(1.2); } catch (e) {}
    try { K.sfx.clink(.9); } catch (e) {}
    try { buzz([12, 40, 12, 40, 20]); } catch (e) {}
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * TAU, sp = 0.6 + Math.random() * 1.5;
      parts.push({ x: pegX(peg) + Math.cos(a) * .3, y: PEG_H + .1 + Math.random() * .3, z: Z_PEG + Math.sin(a) * .3,
        vx: Math.cos(a) * sp * .5, vy: 1.6 + Math.random() * 1.8, vz: Math.sin(a) * sp * .5,
        r: .02 + Math.random() * .035, life: 1, c: PAL[Math.floor(Math.random() * PAL.length)] });
    }
  }

  function heldY() {
    if (!held) return 0;
    const up = PEG_H + .22 + Math.sin(performance.now() / 300) * .03;
    return held.y0 + (up - held.y0) * Math.min(1, held.rise);
  }

  function tap(px) {
    if (!geo) return;
    const i = clamp(Math.floor(px / (geo.w / 3)), 0, 2);
    if (fly) { queued = i; return; }          /* don't drop the second tap */
    if (!held) {
      if (solved) { resetGame(); return; }
      if (!towers[i].length) { refuse(i, 'that post is empty'); return; }
      pick(i);
      return;
    }
    if (held.peg === i) {                     /* same post: put it back */
      const y1 = towers[i].length * TH;
      towers[i].push(held.d);
      fly = { d: held.d, x0: pegX(i), y0: heldY(), x1: pegX(i), y1: y1, t: 0, dur: .22, to: i };
      held = null;
      try { tone(260, .06, .03, 'sine', 220); } catch (e) {}
      return;
    }
    const top = towers[i][towers[i].length - 1];
    if (top != null && top < held.d) { refuse(i, 'a smaller disc is already there'); return; }
    dropOn(i);
  }

  /* ---------- sim ---------- */
  function step(s) {
    if (held) held.rise = Math.min(1, held.rise + s / .18);
    if (fly) {
      fly.t += s / fly.dur;
      if (fly.t >= 1) {
        try { tone(240, .06, .03, 'triangle', 200); } catch (e) {}
        const q = queued; queued = null;
        fly = null;
        if (!solved) hint = 'tap a post to lift a disc';
        if (q != null && geo) tap((q + .5) * geo.w / 3);
      }
    }
    for (let i = 0; i < 3; i++) {
      if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - s * 2.2);
      if (shake[i] > 0) shake[i] = Math.max(0, shake[i] - s * 3.2);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy -= 4.6 * s; p.x += p.vx * s; p.y += p.vy * s; p.z += p.vz * s;
      p.life -= s * .55;
      if (p.life <= 0 || p.y < -0.2) parts.splice(i, 1);
    }
  }

  /* ---------- art ---------- */
  const shadowInk = (m, a) => (m.flat ? 'rgba(36,26,58,' + a + ')' : 'rgba(4,2,16,' + a + ')');
  const hx = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  function mix(a, b, k) {
    const A = hx(a), B = hx(b);
    return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')';
  }

  function floorShadow(x, cam, X, Z, rad, m, k) {
    const p = cam.p(X, 0, Z), rx = Math.max(3, rad * p.s), ry = Math.max(1.2, rx * cam.sq(0, Z));
    x.save(); x.translate(p.x, p.y); x.scale(1, ry / rx);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, shadowInk(m, .52 * k)); g.addColorStop(.6, shadowInk(m, .24 * k)); g.addColorStop(1, shadowInk(m, 0));
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill();
    x.restore();
  }

  function ground(x, cam, m) {
    const w = cam.w, h = cam.h, hy = clamp(cam.horizon, 10, h * .58);
    if (m.flat) {
      x.fillStyle = m.s2; x.fillRect(0, 0, w, hy);
      x.fillStyle = m.s3; x.fillRect(0, hy, w, h - hy);
    } else {
      const sky = x.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, '#090520'); sky.addColorStop(.55, m.s2); sky.addColorStop(1, '#2f2468');
      x.fillStyle = sky; x.fillRect(0, 0, w, hy);
      x.save(); x.translate(w / 2, hy + 4); x.scale(1, .55);
      const halo = x.createRadialGradient(0, 0, 4, 0, 0, w * .55);
      halo.addColorStop(0, 'rgba(255,244,224,.22)'); halo.addColorStop(.5, 'rgba(255,244,224,.07)'); halo.addColorStop(1, 'rgba(255,244,224,0)');
      x.fillStyle = halo; x.beginPath(); x.arc(0, 0, w * .55, 0, TAU); x.fill(); x.restore();
      const fl = x.createLinearGradient(0, hy, 0, h);
      fl.addColorStop(0, '#302469'); fl.addColorStop(.22, m.s3); fl.addColorStop(.62, m.s2); fl.addColorStop(1, '#1d1546');
      x.fillStyle = fl; x.fillRect(0, hy, w, h - hy);
      const gl = x.createLinearGradient(0, hy - 40, 0, hy);
      gl.addColorStop(0, 'rgba(255,244,224,0)'); gl.addColorStop(1, 'rgba(255,244,224,.2)');
      x.fillStyle = gl; x.fillRect(0, hy - 40, w, 40);
    }
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(255,246,226,.35)';
    x.lineWidth = m.flat ? 1.5 : 1;
    x.beginPath(); x.moveTo(0, hy + .5); x.lineTo(w, hy + .5); x.stroke();

    const c = cam.p(0, 0, Z_PEG);
    const prx = GAP * 2.1 * c.s, pry = Math.max(6, prx * cam.sq(0, Z_PEG));
    const sp = x.createRadialGradient(c.x, c.y - 4, 4, c.x, c.y - 4, prx * 1.25);
    if (m.flat) { sp.addColorStop(0, 'rgba(255,253,248,.9)'); sp.addColorStop(.5, 'rgba(255,253,248,.4)'); sp.addColorStop(1, 'rgba(255,253,248,0)'); }
    else { sp.addColorStop(0, 'rgba(255,241,214,.3)'); sp.addColorStop(.42, 'rgba(255,248,232,.13)'); sp.addColorStop(1, 'rgba(255,255,255,0)'); }
    x.fillStyle = sp; x.fillRect(0, 0, w, h);
    x.save(); x.translate(c.x, c.y); x.scale(1, pry / prx);
    const hp = x.createRadialGradient(0, 0, 2, 0, 0, prx * .62);
    if (m.flat) { hp.addColorStop(0, 'rgba(255,253,248,.8)'); hp.addColorStop(1, 'rgba(255,253,248,0)'); }
    else { hp.addColorStop(0, 'rgba(255,246,226,.34)'); hp.addColorStop(.55, 'rgba(255,246,226,.1)'); hp.addColorStop(1, 'rgba(255,246,226,0)'); }
    x.fillStyle = hp; x.fillRect(-prx, -prx, prx * 2, prx * 2);
    x.restore();
  }

  function bodyPath(x, t, b, rt, rb, ryT, ryB) {
    x.beginPath();
    x.ellipse(t.x, t.y, rt, ryT, 0, Math.PI, TAU);
    x.lineTo(b.x + rb, b.y);
    x.ellipse(b.x, b.y, rb, ryB, 0, 0, Math.PI);
    x.closePath();
  }

  const shakeX = (i) => (shake[i] > 0 ? Math.sin(performance.now() / 26) * shake[i] * 3.5 / (geo ? geo.cam.p(0, 0, Z_PEG).s : 60) : 0);

  function post(x, cam, i, m) {
    const px = pegX(i) + shakeX(i);
    const b = cam.p(px, 0, Z_PEG), t = cam.p(px, PEG_H, Z_PEG);
    const rb = PEG_R * b.s, rt = PEG_R * t.s;
    const ryB = Math.max(1, rb * cam.sq(0, Z_PEG)), ryT = Math.max(1, rt * cam.sq(PEG_H, Z_PEG));
    floorShadow(x, cam, px + .1, Z_PEG + .12, .2, m, 1);
    /* foot */
    const fr = rb * 2.1, fry = Math.max(1, fr * cam.sq(0, Z_PEG) * .85), fh = Math.max(2.6, rb * .55);
    bodyPath(x, { x: b.x, y: b.y + 1 - fh }, { x: b.x, y: b.y + 1 }, fr * .92, fr, fry * .92, fry);
    x.fillStyle = m.flat ? '#fffdf8' : '#e6dcf5'; x.fill();
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(12,6,30,.45)';
    x.lineWidth = m.flat ? 1.4 : 1; x.stroke();
    /* shaft */
    bodyPath(x, t, b, rt, rb, ryT, ryB);
    if (m.flat) x.fillStyle = '#fffdf8';
    else {
      const g = x.createLinearGradient(t.x - rt, 0, t.x + rt, 0);
      g.addColorStop(0, 'rgba(255,255,255,.97)'); g.addColorStop(.3, '#f6f0ff');
      g.addColorStop(.72, '#c9bce4'); g.addColorStop(1, '#8e80b6');
      x.fillStyle = g;
    }
    x.fill();
    if (m.flat) { x.strokeStyle = '#241a3a'; x.lineWidth = 1.5; x.stroke(); }
    else {
      x.beginPath();
      x.moveTo(t.x - rt * .7, t.y - ryT * .1);
      x.lineTo(b.x - rb * .7, b.y - ryB * .1);
      x.strokeStyle = K.light(.55); x.lineWidth = 1.1; x.stroke();
    }
    /* head */
    x.beginPath(); x.ellipse(t.x, t.y, rt, ryT, 0, 0, TAU);
    if (m.flat) x.fillStyle = '#fffdf8';
    else {
      const hg = x.createLinearGradient(t.x - rt, t.y - ryT, t.x + rt, t.y + ryT);
      hg.addColorStop(0, '#fffdf8'); hg.addColorStop(.6, '#efe6ff'); hg.addColorStop(1, '#b7a9d4');
      x.fillStyle = hg;
    }
    x.fill();
    x.beginPath(); x.ellipse(t.x, t.y, rt, ryT, 0, 0, TAU);
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(12,6,30,.5)';
    x.lineWidth = m.flat ? 1.4 : 1; x.stroke();
    if (flash[i] > 0) {
      x.beginPath(); x.ellipse(t.x, t.y, rt * (1.6 + flash[i] * 1.6), ryT * (1.6 + flash[i] * 1.6), 0, 0, TAU);
      x.strokeStyle = 'rgba(255,232,168,' + flash[i] * .8 + ')'; x.lineWidth = 2; x.stroke();
    }
  }

  function disc(x, cam, m, cxw, yBase, d) {
    const r = discR(d), c = PAL[(d - 1) % PAL.length];
    const b = cam.p(cxw, yBase, Z_PEG), t = cam.p(cxw, yBase + TH, Z_PEG);
    const rb = r * b.s, rt = r * t.s;
    const ryB = Math.max(1, rb * cam.sq(yBase, Z_PEG)), ryT = Math.max(1, rt * cam.sq(yBase + TH, Z_PEG));
    /* contact shadow on whatever is underneath */
    x.save(); x.beginPath(); x.ellipse(b.x + rb * .14, b.y + 1, rb * 1.02, ryB * 1.02, 0, 0, TAU);
    x.fillStyle = shadowInk(m, .38); x.fill(); x.restore();
    /* wall */
    bodyPath(x, t, b, rt, rb, ryT, ryB);
    if (m.flat) x.fillStyle = c;
    else {
      const g = x.createLinearGradient(t.x - rt, 0, t.x + rt, 0);
      g.addColorStop(0, mix(c, '#ffffff', .55)); g.addColorStop(.4, c);
      g.addColorStop(.78, mix(c, '#2a1038', .28)); g.addColorStop(1, mix(c, '#2a1038', .5));
      x.fillStyle = g;
    }
    x.fill();
    if (m.flat) { x.strokeStyle = '#241a3a'; x.lineWidth = 1.4; x.stroke(); }
    /* face */
    x.beginPath(); x.ellipse(t.x, t.y, rt, ryT, 0, 0, TAU);
    if (m.flat) x.fillStyle = mix(c, '#ffffff', .3);
    else {
      const tg = x.createLinearGradient(t.x - rt, t.y - ryT, t.x + rt, t.y + ryT);
      tg.addColorStop(0, mix(c, '#ffffff', .55)); tg.addColorStop(.7, mix(c, '#ffffff', .2)); tg.addColorStop(1, mix(c, '#2a1038', .1));
      x.fillStyle = tg;
    }
    x.fill();
    x.strokeStyle = m.flat ? '#241a3a' : 'rgba(20,8,40,.4)';
    x.lineWidth = m.flat ? 1.3 : 1; x.stroke();
    /* the peg's hole */
    x.beginPath(); x.ellipse(t.x, t.y, Math.max(1.2, PEG_R * .92 * t.s), Math.max(.8, PEG_R * .92 * t.s * ryT / Math.max(1, rt) * .9), 0, 0, TAU);
    x.fillStyle = shadowInk(m, .55); x.fill();
    /* a specular down the near edge */
    if (!m.flat) {
      x.beginPath(); x.ellipse(t.x - rt * .3, t.y, rt * .5, ryT * .55, 0, Math.PI * .9, Math.PI * 1.6);
      x.strokeStyle = K.light(.35); x.lineWidth = 1.4; x.stroke();
    }
  }

  function draw(g) {
    if (!geo) return;
    const x = g.x, w = g.w, h = g.h, m = K.surf(x, w, h), cam = geo.cam;
    x.save(); K.rr(x, 0, 0, w, h, m.radius); x.clip();
    ground(x, cam, m);

    for (let i = 0; i < 3; i++) post(x, cam, i, m);

    /* every disc, bottom of each stack first */
    for (let i = 0; i < 3; i++) {
      const skip = fly && fly.to === i ? towers[i].length - 1 : -1;
      const sx = pegX(i) + shakeX(i);
      for (let k = 0; k < towers[i].length; k++) if (k !== skip) disc(x, cam, m, sx, k * TH, towers[i][k]);
    }

    /* the one in hand, bobbing above its post */
    if (held) {
      const yy = heldY(), hx = pegX(held.peg) + shakeX(held.peg);
      const sh = cam.p(hx, Math.max(0, towers[held.peg].length * TH), Z_PEG);
      x.save(); x.globalAlpha = .35;
      x.beginPath(); x.ellipse(sh.x + 4, sh.y, discR(held.d) * sh.s, discR(held.d) * sh.s * cam.sq(0, Z_PEG), 0, 0, TAU);
      x.fillStyle = shadowInk(m, .6); x.fill(); x.restore();
      disc(x, cam, m, hx, yy, held.d);
    }
    /* the one moving to another post */
    if (fly) {
      const t = Math.min(1, fly.t), e = t * t * (3 - 2 * t);
      const X = fly.x0 + (fly.x1 - fly.x0) * e;
      const Y = fly.y0 + (fly.y1 - fly.y0) * e + Math.sin(Math.PI * t) * .34;
      disc(x, cam, m, X, Y, fly.d);
    }

    /* sparks */
    parts.forEach((p) => {
      const s = cam.p(p.x, p.y, p.z);
      x.beginPath(); x.arc(s.x, s.y, Math.max(1.2, p.r * s.s), 0, TAU);
      x.globalAlpha = Math.max(0, Math.min(1, p.life));
      x.fillStyle = p.c; x.fill();
    });
    x.globalAlpha = 1;

    /* HUD */
    K.label(x, 'TOWERS', 16, 18, 10, 'left');
    if (solved) K.label(x, 'Solved in ' + moves + ' moves', w / 2, 44, 13);
    else if (hint) K.label(x, hint, w / 2, h - 14, 10);
    x.restore();
  }

  /* ---------- loop ---------- */
  function frame(dt) {
    try {
      const g = K.fit(cv());
      if (!geo || Math.abs(geo.w - g.w) > .5 || Math.abs(geo.h - g.h) > .5) layout();
      step(Math.min(.05, dt / 60));
      draw(g);
    } catch (e) {}
  }

  function layout() {
    const c = cv(); if (!c) return;
    const w = c.clientWidth || 300, h = c.clientHeight || 300;
    geo = { w, h, cam: makeCam(w, h) };
  }

  K && window.DECIDER_GAMES.push({
    id: 'hanoi', name: 'Hanoi', short: 'Hanoi', label: 'Towers', noResult: true, button: false,
    body: '<canvas class="toy" id="hnCv"></canvas>' +
      '<div class="chips" style="margin:2px 0 0;align-items:center;justify-content:center;gap:10px">' +
      '<span class="lbl" id="hnMoves" style="margin:0">5 discs · 0 moves</span>' +
      '<button class="chip" id="hnReset" type="button">Reset</button></div>',
    tune: '<div class="lbl">Discs</div><div class="chips" id="hnDiscs" style="margin:0"></div>',
    init(card) {
      towers = [[], [], []];
      resetGame();
      layout(); L = K.loop(frame);
      const c = cv();
      c.addEventListener('pointerdown', (e) => {
        const r = c.getBoundingClientRect();
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        tap(e.clientX - r.left);
      });
      const chip = card.querySelector('#hnReset');
      if (chip) chip.onclick = () => { resetGame(); try { tone(360, .08, .04, 'sine', 520); } catch (e) {} };
      const chips = card.querySelector('#hnDiscs');
      if (chips) {
        const render = () => {
          chips.innerHTML = [4, 5, 6].map((k) => '<button class="chip' + (k === n ? ' on' : '') + '" data-n="' + k + '">' + k + '</button>').join('');
          chips.querySelectorAll('.chip').forEach((b) => {
            b.onclick = () => { n = +b.dataset.n; resetGame(); render(); };
          });
        };
        render();
      }
      if (c.clientWidth) L.start();
    },
    enter() { layout(); L.start(); },
    leave() { L.stop(); },
    status() {
      return { n, moves, solved, held: held ? held.d : null, flying: !!fly,
        towers: towers.map((t) => t.slice()), parts: parts.length };
    }
  });
})();
