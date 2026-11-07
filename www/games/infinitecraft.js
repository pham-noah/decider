/* Infinite Craft — drag two chips together and they make a third. Everything is
 * local: a curated table of pairs plus a deterministic word-rule fallback, so a
 * combination never fails. Hold a chip to make it the decision. */
(function () {
  /* white ink flips to ink-black on the paper skin */
  const INK = (a) => K.inkColor(a == null ? 1 : a);
  const K = window.DKIT, TAU = Math.PI * 2; const cv = () => document.getElementById('icCv');
  const resEl = () => document.getElementById('icRes');

  const PAD = 10, CW = 106, CHH = 34, GX = 9, GY = 10;
  let L = null, g = null, chips = [], COLS = 3, boardH = 0, pan = 0, t = 0;
  let dragChip = null, dragOff = { x: 0, y: 0 }, press = null, panDrag = null, hover = null;

  const sfx = (f, d, v, ty, sl) => { try { tone(f, d, v, ty, sl); } catch (e) {} };
  const hap = (n) => { try { buzz(n); } catch (e) {} };
  const say = (s) => { const el = resEl(); if (el) el.innerHTML = '<span class="muted">' + s + '</span>'; };

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const title = (s) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const RAW =
    'water+fire=steam,earth+water=mud,earth+steam=rain,fire+sand=glass,glass+sand=hourglass,' +
    'air+fire=smoke,earth+fire=lava,air+water=mist,air+earth=dust,water+water=lake,' +
    'fire+fire=inferno,earth+earth=mountain,air+air=wind,steam+steam=cloud,cloud+cloud=storm,' +
    'cloud+water=rain,lava+water=stone,lava+air=obsidian,stone+water=sand,stone+fire=metal,' +
    'metal+fire=blade,metal+water=rust,mud+fire=brick,brick+brick=wall,wall+wall=house,' +
    'house+house=city,city+city=metropolis,glass+water=lens,lens+fire=light,light+water=rainbow,' +
    'rain+earth=plant,plant+water=tree,tree+fire=charcoal,tree+metal=axe,axe+tree=wood,' +
    'wood+fire=campfire,wood+water=paper,paper+fire=ash,charcoal+water=ink,ink+paper=book,' +
    'book+book=library,storm+fire=lightning,lightning+water=life,life+earth=human,human+human=family,' +
    'human+house=home,human+metal=tool,human+book=student,student+student=school,school+city=university,' +
    'human+fire=cooking,cooking+water=soup,plant+fire=herb,herb+water=tea,tea+human=calm,' +
    'soup+fire=stew,mud+plant=reed,reed+wood=flute,flute+human=music,music+human=dance,' +
    'dance+human=party,party+fire=bonfire,bonfire+water=steam,sand+water=beach,beach+water=ocean,' +
    'ocean+fire=salt,salt+water=sea,sea+life=fish,fish+fire=grill,grill+human=picnic,' +
    'picnic+rain=disaster,brick+fire=kiln,kiln+sand=glass,glass+metal=mirror,mirror+light=reflection,' +
    'reflection+human=self,self+human=friend,friend+friend=team,metal+earth=iron,iron+fire=steel,' +
    'steel+steel=bridge,bridge+city=traffic,traffic+human=commute,plant+sand=seed,seed+water=sprout,' +
    'sprout+light=flower,flower+water=lily,lily+water=pond,pond+life=frog,frog+human=prince,' +
    'prince+city=king,king+king=empire,empire+fire=war,war+human=soldier,soldier+metal=sword,' +
    'sword+stone=legend,legend+human=story,story+paper=book,story+fire=dragon,dragon+water=serpent,' +
    'serpent+air=sky,sky+fire=sun,sun+earth=drought,drought+plant=desert,desert+sand=dune,' +
    'dune+wind=storm,storm+air=tornado,tornado+house=ruin,ruin+plant=moss,stone+stone=pebble,' +
    'pebble+pebble=gravel,gravel+water=river,river+city=port,port+water=harbor,harbor+metal=ship,' +
    'ship+ocean=voyage,voyage+human=explorer,explorer+earth=map,map+paper=atlas,atlas+city=world,' +
    'world+life=ecosystem,ecosystem+fire=wildfire,wildfire+rain=regrowth,regrowth+human=farm,' +
    'farm+plant=crop,crop+fire=bread,bread+human=sandwich,sandwich+human=lunch,metal+light=laser,' +
    'glass+light=fiber,fiber+metal=cable,lightning+metal=electricity,electricity+metal=magnet,' +
    'magnet+metal=motor,motor+metal=engine,wood+tool=wheel,wheel+engine=car,sand+electricity=silicon,' +
    'silicon+electricity=chip,chip+human=computer,computer+computer=internet,internet+human=social,' +
    'social+human=drama,computer+light=screen,screen+human=game,game+human=fun,fun+water=bubble,' +
    'engine+sky=rocket,rocket+sky=orbit,stone+light=moon,moon+sky=night,night+light=star,' +
    'star+star=galaxy,galaxy+star=universe,universe+human=meaning,rain+air=snow,snow+water=ice,' +
    'ice+fire=water,ice+human=brain freeze,snow+human=snowman,snowman+fire=puddle,air+plant=pollen,' +
    'pollen+life=bee,bee+flower=honey,honey+bread=toast,toast+human=breakfast,plant+seed=bean,' +
    'bean+water=coffee,coffee+human=idea,idea+paper=plan,plan+human=project';

  const pairKey = (a, b) => {
    const A = a.toLowerCase(), B = b.toLowerCase(); return A < B ? A + '+' + B : B + '+' + A;
  };
  const TABLE = Object.create(null);
  RAW.split(',').forEach(line => {
    const p = line.split('=');
    if (p.length === 2) { const ab = p[0].split('+'); TABLE[pairKey(ab[0], ab[1])] = p[1]; }
  });
  const ADJ = ['Molten', 'Frozen', 'Wild', 'Tiny', 'Ancient', 'Lunar', 'Sunken', 'Gilded',
    'Hollow', 'Velvet', 'Electric', 'Feral', 'Quiet', 'Bitter'];
  const TAIL = ['Storm', 'Engine', 'Bloom', 'Song', 'Machine', 'Garden', 'Ghost', 'River',
    'Signal', 'Crown', 'Static', 'Halo'];

  function fallback(a, b) {
    const h = hash(pairKey(a, b)), A = title(a), B = title(b), r = h % 10; let out; if (r < 4) out = A + ' ' + B;
    else if (r < 6) out = B + ' ' + A; else if (r < 8) out = ADJ[(h >>> 3) % ADJ.length] + ' ' + (h & 1 ? A : B);
    else out = (h & 1 ? A : B) + ' ' + TAIL[(h >>> 5) % TAIL.length];
    return out.length > 22 ? out.slice(0, 22).trim() : out;
  }
  function recipe(a, b) {
    const hit = TABLE[pairKey(a, b)]; return hit ? title(hit) : fallback(a, b);
  }

  function mkChip(name, src) {
    const h = hash(name.toLowerCase());
    return { name, src: src || null, col: PAL[h % PAL.length], x: 0, y: 0, hx: 0, hy: 0, scale: .2, flash: 1 };
  }
  const maxPan = () => Math.max(0, boardH - (g ? g.h : 0) + 28);

  function layout() {
    const c = cv(); if (!c) return; g = K.fit(c); COLS = Math.max(2, Math.floor((g.w - PAD * 2 + GX) / (CW + GX)));
    const rows = Math.ceil(chips.length / COLS), contentH = rows * (CHH + GY) - GY;
    const top = Math.max(PAD, (g.h - contentH) / 2);
    chips.forEach((ch, i) => {
      ch.hx = PAD + (i % COLS) * (CW + GX); ch.hy = top + Math.floor(i / COLS) * (CHH + GY);
    });
    boardH = contentH + PAD * 2; pan = Math.max(0, Math.min(maxPan(), pan));
  }

  function addChip(name, src) {
    const c = mkChip(name, src); chips.push(c); layout(); c.x = c.hx; c.y = c.hy; if (boardH > g.h) pan = maxPan();
    return c;
  }

  function combine(a, b) {
    if (!a || !b || a === b) return; const name = recipe(a.name, b.name); const lower = name.toLowerCase();
    const dup = chips.find(c => c.name.toLowerCase() === lower);
    if (dup) {
      dup.flash = 1; dup.scale = 1.16; say(name + ' — already on the board'); sfx(640, .1, .04, 'sine', 520); hap(8);
      return;
    }
    const c = addChip(name, [a.name, b.name]); c.scale = .2; c.flash = 1;
    say(name + ' — ' + a.name + ' + ' + b.name + '  ·  ' + chips.length + ' elements');
    sfx(440 + (hash(lower) % 5) * 70, .12, .05, 'triangle', 760); hap(12);
  }

  function useChip(c) {
    const sub = c.src ? 'Forged from ' + c.src[0] + ' + ' + c.src[1] : 'One of the first four';
    say(c.name + ' — that is the call');
    try { K.decide(c.name, 'Infinite Craft', sub); } catch (e) {}
  }

  function at(e) { const r = cv().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function hitChip(bx, by, skip) {
    for (let i = chips.length - 1; i >= 0; i--) {
      const c = chips[i]; if (c === skip) continue;
      if (bx > c.x - 5 && bx < c.x + CW + 5 && by > c.y - 5 && by < c.y + CHH + 5) return c;
    }
    return null;
  }

  function drawChip(x, c, dragging) {
    const s = Math.max(.02, c.scale) * (dragging ? 1.06 : 1); x.save(); x.translate(c.x + CW / 2, c.y + CHH / 2);
    x.scale(s, s);
    if (dragging) { x.shadowColor = 'rgba(4,2,14,.5)'; x.shadowBlur = 16; x.shadowOffsetY = 8; }
    K.rr(x, -CW / 2, -CHH / 2, CW, CHH, 11); x.fillStyle = 'rgba(26,18,54,.94)'; x.fill();
    x.shadowColor = 'transparent'; x.globalAlpha = .18 + .32 * c.flash; x.fillStyle = c.col; x.fill();
    x.globalAlpha = dragging || c === hover ? 1 : .55; x.strokeStyle = c.col; x.lineWidth = c === hover ? 2.6 : 1.3; x.stroke(); x.globalAlpha = 1;
    x.beginPath(); x.arc(-CW / 2 + 11, 0, 3.4, 0, TAU); x.fillStyle = c.col; x.fill(); x.fillStyle = '#f5f1ff';
    x.font = '700 11.5px "Bricolage Grotesque",system-ui,sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
    let label = c.name; const maxw = CW - 30;
    while (label.length > 2 && x.measureText(label).width > maxw) label = label.slice(0, -1);
    if (label !== c.name) label = label.slice(0, -1) + '…'; x.fillText(label, -CW / 2 + 20, .5); x.restore();
    if (press && press.chip === c && !press.moved && !press.done) {
      const p = Math.min(1, (performance.now() - press.t0) / 520); x.beginPath();
      x.arc(c.x + CW / 2, c.y + CHH / 2, 24, -Math.PI / 2, -Math.PI / 2 + TAU * p);
      x.strokeStyle = INK(.9); x.lineWidth = 2.2; x.lineCap = 'round'; x.stroke();
    }
  }

  function draw() {
    const x = g.x, w = g.w, h = g.h; K.surf(x, w, h);
    const step = 26, off = ((-pan % step) + step) % step; x.fillStyle = K.inkColor(.05);
    for (let yy = off; yy < h; yy += step) {
      for (let xx = 13; xx < w; xx += step) { x.beginPath(); x.arc(xx, yy, 1.1, 0, TAU); x.fill(); }
    }
    x.save(); x.translate(0, -pan); chips.forEach(c => { if (c !== dragChip) drawChip(x, c); });
    if (dragChip) drawChip(x, dragChip, true); x.restore();
    if (maxPan() > 0 && pan < maxPan() - 2) {
      const fg = x.createLinearGradient(0, h - 46, 0, h);
      fg.addColorStop(0, 'rgba(20,14,52,0)'); fg.addColorStop(1, 'rgba(20,14,52,.9)');
      x.fillStyle = fg; x.fillRect(0, h - 46, w, 46); x.fillStyle = INK(.45);
      x.font = '700 10px "Bricolage Grotesque",system-ui,sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText('drag the board to scroll', w / 2, h - 10);
    }
  }

  function tick(dt) {
    const gg = K.fit(cv()); if (!g || Math.abs(g.w - gg.w) > .5) layout(); t += dt;
    chips.forEach(c => {
      const k = 1 - Math.pow(.78, dt);
      if (c !== dragChip) { c.x += (c.hx - c.x) * k; c.y += (c.hy - c.y) * k; }
      c.scale += (1 - c.scale) * (1 - Math.pow(.8, dt)); c.flash = Math.max(0, c.flash - .02 * dt);
    });
    if (press && !press.moved && !press.done && performance.now() - press.t0 > 520) {
      const c = press.chip; press.done = true; press = null; dragChip = null; useChip(c);
    }
    pan = Math.max(0, Math.min(maxPan(), pan)); draw();
  }

  K && window.DECIDER_GAMES.push({
    id: 'infinitecraft', name: 'Infinite Craft', short: 'Craft', label: 'Elements', button: false,
    body: `<canvas class="toy" id="icCv"></canvas>
      <div class="res" id="icRes" aria-live="polite"><span class="muted">Drag two chips together — hold one to decide</span></div>`,
    init(card) {
      L = K.loop(tick); ['Water', 'Fire', 'Earth', 'Air'].forEach(n => addChip(n)); const c = cv();
      c.addEventListener('pointerdown', e => {
        if (!g) return;
        try { c.setPointerCapture(e.pointerId); } catch (err) {}
        const p = at(e), bx = p.x, by = p.y + pan, ch = hitChip(bx, by);
        if (ch) {
          dragChip = ch; hover = null; dragOff = { x: bx - ch.x, y: by - ch.y };
          press = { chip: ch, t0: performance.now(), bx, by, moved: false, done: false };
          sfx(560, .05, .03, 'sine', 700);
        } else {
          panDrag = { y0: p.y, pan0: pan }; press = null;
        }
      });
      c.addEventListener('pointermove', e => {
        if (!g) return; const p = at(e);
        if (dragChip) {
          const bx = p.x, by = p.y + pan;
          if (press && Math.hypot(bx - press.bx, by - press.by) > 8) press.moved = true; dragChip.x = bx - dragOff.x;
          dragChip.y = by - dragOff.y;
          hover = press && press.moved ? hitChip(dragChip.x + CW / 2, dragChip.y + CHH / 2, dragChip) : null;
        } else if (panDrag) {
          pan = Math.max(0, Math.min(maxPan(), panDrag.pan0 - (p.y - panDrag.y0)));
        }
      });
      const up = e => {
        if (dragChip) {
          const p = at(e);
          const target = hover || hitChip(p.x, p.y + pan, dragChip);
          if (press && press.moved && target) combine(dragChip, target);
          dragChip = null; hover = null;
        }
        press = null; panDrag = null; layout();
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', () => { dragChip = null; press = null; panDrag = null; hover = null; });
      c.addEventListener('wheel', e => {
        e.preventDefault(); pan = Math.max(0, Math.min(maxPan(), pan + e.deltaY * .8));
      }, { passive: false });
      layout();
    },
    enter() { layout(); L.start(); },
    leave() { dragChip = null; press = null; panDrag = null; hover = null; L.stop(); },
    action() {
      if (chips.length > 1) combine(chips[0], chips[1]);
    },
    shake(info) {
      pan = Math.max(0, Math.min(maxPan(), pan + Math.sign(info.dir || 1) * 26)); sfx(240, .1, .05, 'triangle', 180);
    }
  });
})();
