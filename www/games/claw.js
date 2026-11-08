/* Claw — drop the claw on a capsule; whatever it grabs decides. */
(function () {
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT;
  const cv = () => document.getElementById('clCv');
  let L = null, g = null, caps = [], falls = [], pending = null, held = null;
  let state = 'aim', timer = 0, drag = false, lw = 0, lh = 0;
  /* a grab is only as good as your aim: tap near the middle of a capsule and it
     holds, catch it by the edge and the claw lets go on the way up */
  let score = 0, best = 0, slip = false, grabOff = 0;
  const claw = { x: 0, y: 0, open: 1 };
  const hangY = () => g.h * 0.2, floorY = () => g.h * 0.845, chuteX = () => g.w * 0.855;
  function build() {
    const c = cv(); if (!c) return;
    g = K.fit(c);
    const labels = K.prizes.slice(0, 5);
    const r = Math.max(15, Math.min(25, g.w * 0.068));
    /* one capsule per option: six capsules for five options double-weighted the first */
    const count = Math.max(2, Math.min(9, labels.length));
    /* fill the cabinet instead of leaving it half empty: front row widest */
    const rows = count <= 3 ? [count] : count <= 5 ? [3, count - 3] : [4, 3, count - 7];
    const slots = [];
    rows.forEach((n, row) => {
      if (n <= 0) return;
      const gap = r * 2.06, x0 = g.w * 0.44 - ((n - 1) * gap) / 2;
      for (let i = 0; i < n; i++) slots.push({ x: x0 + i * gap, y: floorY() - r * 0.8 - row * r * 1.6 });
    });
    caps = slots.slice(0, count).map((s, i) => ({ x: s.x, y: s.y, r, label: labels[i], col: PAL[i % PAL.length], got: false,
      /* 4 in the front row, 3 behind, 2 at the back: 10, 20, 30 */
      val: s.y < floorY() - r * 3 ? 30 : s.y < floorY() - r * 1.6 ? 20 : 10 }));
    state = 'aim'; timer = 0; pending = held = null; falls = []; claw.x = g.w * 0.44; claw.y = hangY(); claw.open = 1;
  }
  function under(px, py) {
    /* the tap used to mean 'the topmost capsule in this column', so touching one
       capsule could answer with the one above it */
    const live = caps.filter(c => !c.got && c.y > g.h * 0.45);
    if (!live.length) return null;
    if (px != null) {
      const d = live.map(c => ({ c, d: Math.hypot(c.x - px, c.y - py) })).sort((a, b) => a.d - b.d)[0];
      if (d && d.d < d.c.r * 2.6) return d.c;
    }
    let best = null;
    live.forEach(c => { if (Math.abs(c.x - claw.x) < c.r * 1.3 && (!best || Math.abs(c.x - claw.x) < Math.abs(best.x - claw.x))) best = c; });
    return best;
  }
  function grab(px, py) {
    if (!g || state !== 'aim') return;
    /* the claw travels to where you tapped, so the grab is decided by the claw's
       line — not by which capsule your finger happened to be nearest */
    if (px != null) claw.x = Math.max(g.w * 0.13, Math.min(g.w * 0.80, px));
    pending = under(null, null); held = null; slip = false;
    grabOff = pending ? Math.abs(pending.x - claw.x) / pending.r : 9;
    state = 'down'; timer = 0;
    K.setResult(document.getElementById('clRes'), '…'); try { K.sfx.click(1.1); } catch (e) {}
  }
  function slipOut() {
    const cap = pending;
    if (cap) falls.push({ x: cap.x, y: claw.y + cap.r * 1.4, vy: 1.2, r: cap.r, col: cap.col });
    slip = false; pending = null; state = 'aim';
    K.setResult(document.getElementById('clRes'), 'Slipped');
    try { tone(200, 0.2, 0.06, 'sawtooth', 120); } catch (e) {}
    try { buzz(14); } catch (e) {}
  }

  function miss() {
    state = 'aim'; pending = null;
    K.setResult(document.getElementById('clRes'), 'Nothing');
    try { K.sfx.thud(1); } catch (e) {}
  }
  function win(cap) {
    score += cap.val || 10;
    if (score > best) { best = score; try { store.set('d.clbest', best); } catch (e) {} }
    state = 'refill'; K.setResult(document.getElementById('clRes'), cap.label + '  +' + (cap.val || 10));
    setTimeout(refill, 700);
  }
  function refill() {
    if (state !== 'refill') { setTimeout(refill, 500); return; }
    build();
  }
  function step(dt) {
    if (!g) return;
    if (state === 'aim') claw.y += (hangY() - claw.y) * 0.16 * dt;
    if (state === 'down') {
      const low = pending ? pending.y - pending.r * 0.2 : floorY() - 8;
      claw.y += 4.8 * dt;
      if (claw.y >= low) {
        claw.y = low; state = 'clamp'; timer = 0;
        try { K.sfx.snap(); } catch (e) {}
      }
    }
    if (state === 'clamp') {
      timer += dt; claw.open = Math.max(0.08, 1 - timer / 12);
      if (timer > 18) {
        if (pending) {
          if (grabOff < 0.42) { held = pending; held.got = true; }
          else { slip = true; held = null; }
        }
        state = 'up';
        try { K.sfx.coin(2); } catch (e) {}
      }
    }
    if (state === 'up') {
      claw.y -= 3.8 * dt;
      if (claw.y <= hangY()) {
        claw.y = hangY();
        if (held) state = 'move';
        else if (slip) slipOut();
        else miss();
      }
    }
    if (state === 'move') {
      claw.x += (chuteX() - claw.x) * 0.1 * dt;
      if (Math.abs(claw.x - chuteX()) < 1.4) { claw.x = chuteX(); state = 'release'; timer = 0; }
    }
    if (state === 'release') {
      timer += dt; claw.open = Math.min(1, 0.1 + timer / 9);
      if (timer > 13 && held) {
        const cap = held; held = null; cap.got = false;
        falls.push({ x: cap.x, y: claw.y + cap.r * 0.6, vy: 1.2, r: cap.r, col: cap.col });
        win(cap);
      }
    }
    falls.forEach(f => { f.vy += 0.5 * dt; f.y += f.vy * dt; }); falls = falls.filter(f => f.y < g.h * 0.78);
  }
  function capsule(x, cx, cy, r, col, label, alpha) {
    x.save(); x.globalAlpha = alpha;
    const gr = x.createLinearGradient(0, cy - r, 0, cy + r);
    gr.addColorStop(0, K.light(1)); gr.addColorStop(0.42, col); gr.addColorStop(1, col);
    K.rr(x, cx - r, cy - r * 0.82, r * 2, r * 1.64, r * 0.8); x.fillStyle = gr; x.fill();
    K.rr(x, cx - r * 0.66, cy - r * 0.62, r * 1.3, r * 0.36, r * 0.18); x.fillStyle = INK(.4); x.fill();
    if (label) {
      x.font = '700 9px "Bricolage Grotesque",system-ui,sans-serif'; let t = label;
      while (t.length > 2 && x.measureText(t).width > r * 1.9) t = t.slice(0, -1);
      x.fillStyle = INK(1); x.shadowColor = 'rgba(20,8,50,.65)'; x.shadowBlur = 3;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(t === label ? t : t + '…', cx, cy + 0.5);
    }
    x.restore();
  }
  function draw() {
    const c = cv(); if (!c) return; g = K.fit(c); const { x, w, h } = g;
    if (Math.abs(w - lw) > 2 || Math.abs(h - lh) > 2) {
      lw = w; lh = h; if (state === 'aim' && !held) { build(); return; }
    }
    x.clearRect(0, 0, w, h);
    K.rr(x, 4, 4, w - 8, h - 8, 22);
    x.fillStyle = K.mat().flat ? '#f1ebda' : 'rgba(12,7,34,.68)'; x.fill();   // bone stock on paper, not a black slab
    x.strokeStyle = INK(.45); x.lineWidth = 2; x.stroke();
    // floor + prize chute
    x.fillStyle = INK(.1); x.fillRect(10, floorY(), w - 20, 2);
    K.rr(x, w * 0.75, h * 0.625, w * 0.19, floorY() - h * 0.625, 10);
    x.fillStyle = K.mat().flat ? '#dcd2b8' : 'rgba(6,3,20,.85)'; x.fill();   // the chute was a black slab on paper
    x.strokeStyle = 'rgba(255,215,106,.75)'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = K.mat().flat ? '#241a3a' : 'rgba(255,215,106,.85)'; x.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('PRIZE', w * 0.845, h * 0.595);
    /* the cabinet was a bare slab with a hole in it: add the glass edge, a brand
       plate and a chute mouth so it reads as a machine rather than a box */
    const glassTop = h * 0.17;
    x.save(); x.globalAlpha = .5;
    x.strokeStyle = INK(.35); x.lineWidth = 1.5;
    K.rr(x, w * 0.06, glassTop, w * 0.88, floorY() - glassTop - 6, 14); x.stroke();
    x.restore();
    const plateW = Math.min(120, w * 0.38);
    K.rr(x, w / 2 - plateW / 2, h * 0.045, plateW, h * 0.058, 8);
    x.fillStyle = K.mat().flat ? '#e6dfcc' : 'rgba(255,255,255,.10)'; x.fill();
    x.strokeStyle = INK(.4); x.lineWidth = 1.2; x.stroke();
    K.label(x, 'GRAB', w / 2, h * 0.074, Math.max(10, h * 0.032));
    K.label(x, String(score), 16, 22, 15, 'left');
    if (best > score) K.label(x, 'best ' + best, 16, 40, 9, 'left');

    // rail
    const railY = h * 0.13;
    x.lineWidth = 3; x.strokeStyle = INK(.35);
    x.beginPath(); x.moveTo(w * 0.1, railY); x.lineTo(w * 0.92, railY); x.stroke();
    x.lineWidth = 1; x.strokeStyle = INK(.16);
    x.beginPath(); x.moveTo(w * 0.1, railY + 5); x.lineTo(w * 0.92, railY + 5); x.stroke();
    caps.forEach(cp => { if (!cp.got) capsule(x, cp.x, cp.y, cp.r, cp.col, cp.label, 1); });
    falls.forEach(f => capsule(x, f.x, f.y, f.r, f.col, '', 0.85));
    x.strokeStyle = INK(.5); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(claw.x, railY); x.lineTo(claw.x, claw.y - 8); x.stroke();
    x.fillStyle = K.mat().flat ? '#fffdf8' : '#e9e6ff'; K.rr(x, claw.x - 9, railY - 6, 18, 12, 4); x.fill();
    x.strokeStyle = K.mat().flat ? '#241a3a' : 'rgba(255,255,255,.5)'; x.lineWidth = 1.4; x.stroke();
    x.save(); x.translate(claw.x, claw.y);
    x.strokeStyle = K.mat().flat ? '#241a3a' : '#f4f2ff'; x.lineWidth = 4.5; x.lineCap = 'round';
    const spread = 5 + claw.open * 13;
    [-1, 1].forEach(s => {
      x.beginPath(); x.moveTo(s * 3, 0); x.quadraticCurveTo(s * spread, 10, s * (spread - 3), 24); x.stroke();
    });
    x.fillStyle = K.mat().flat ? '#fffdf8' : '#cfc9ff'; K.rr(x, -8, -6, 16, 12, 5); x.fill();
    x.strokeStyle = K.mat().flat ? '#241a3a' : 'rgba(255,255,255,.45)'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#8f80ff'; x.beginPath(); x.arc(0, 0, 2.4, 0, Math.PI * 2); x.fill();
    if (held) capsule(x, Math.sin(performance.now() / 110) * 1.6, 32, held.r * 0.92, held.col, held.label, 1);
    x.restore();
    // glass streak
    x.save(); K.rr(x, 6, 6, w - 12, h - 12, 21); x.clip();
    x.fillStyle = INK(.055);
    x.beginPath(); x.moveTo(w * 0.05, 0); x.lineTo(w * 0.34, 0); x.lineTo(w * 0.02, h); x.lineTo(-w * 0.2, h); x.fill();
    x.restore();
  }
  function at(e) {
    const r = cv().getBoundingClientRect();
    return Math.max(g.w * 0.13, Math.min(g.w * 0.88, e.clientX - r.left));
  }
  K && window.DECIDER_GAMES.push({
    id: 'claw', name: 'Claw', short: 'Claw', label: 'Prizes', noResult: true, button: false,
    body: `<canvas class="toy" id="clCv" style="max-height:min(62vh,max(240px,calc(100svh - 530px)))"></canvas>
      <div class="res" id="clRes" aria-live="polite" style="min-height:40px;font-size:calc(clamp(22px,5.2vw,30px)*var(--fs,1))"><span class="muted">Tap a capsule</span></div>`,
    tune: `<div class="lbl">Front row 10, middle 20, back 30. Grab it clean or it slips.</div>`,
    init() {
      try { best = +store.get('d.clbest', 0) || 0; } catch (e) {}
      L = K.loop(dt => { step(dt); draw(); });
      const c = cv();
      let downX = 0, downY = 0, moved = 0;
      c.addEventListener('pointerdown', e => {
        if (state !== 'aim' || !g) return;
        drag = true; moved = 0; downX = e.clientX; downY = e.clientY;
        claw.x = at(e); try { c.setPointerCapture(e.pointerId); } catch (err) {}
      });
      c.addEventListener('pointermove', e => {
        if (!drag || !g) return;
        claw.x = at(e);
        moved = Math.max(moved, Math.hypot(e.clientX - downX, e.clientY - downY));
      });
      c.addEventListener('pointerup', e => {
        if (!drag) return;
        drag = false;
        /* a drag that ends in a release is a drop: it used to only re-aim, so the
           hint's "drag to aim, then let go" did nothing */
        if (state !== 'aim') return;
        claw.x = at(e);
        const rr = c.getBoundingClientRect();
        grab(at(e), e.clientY - rr.top);
        try { buzz(8); } catch (err) {}
      });
      c.addEventListener('pointercancel', () => { drag = false; });
      build();
    },
    enter() { if (!g) build(); L.start(); },
    leave() { L.stop(); },
    action() { grab(); }
  });
})();
