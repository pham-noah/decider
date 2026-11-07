/* High card — one card for each option; the higher rank wins. */
(function () {
  const K = window.DKIT;
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♠', '♥', '♦', '♣'];
  const val = c => c.r === 'A' ? 14 : c.r === 'K' ? 13 : c.r === 'Q' ? 12 : c.r === 'J' ? 11 : +c.r;
  const $ = id => document.getElementById(id);
  let deck = [], hand = [], labels = [], slots = [], state = 'idle', busy = false, gen = 0;
  /* labels are option names, never cut to a character budget: the slot clips with
     CSS ellipsis at its real pixel width and keeps the full text in `title` */
  const fitLabel = (el, text) => {
    el.textContent = text;
    el.title = text;
  };

  function fresh() {
    deck = [];
    SUITS.forEach(s => RANKS.forEach(r => deck.push({ r, s })));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function face(c) {
    const red = c.s === '♥' || c.s === '♦';
    return `<div class="cardface${red ? ' red' : ''}" style="position:absolute;inset:0;width:100%;height:100%;font-size:0;transform:rotateY(180deg);backface-visibility:hidden;-webkit-backface-visibility:hidden">
      <span style="display:grid;justify-items:center;line-height:1"><b style="font-size:32px">${c.r}</b><i style="font-style:normal;font-size:21px;line-height:1.1">${c.s}</i></span></div>`;
  }

  function buildSlots() {
    const host = $('hcHand');
    host.innerHTML = '';
    slots = [0, 1].map(() => {
      const slot = document.createElement('div');
      slot.style.cssText = 'display:grid;justify-items:center;gap:8px;width:96px';
      slot.innerHTML = `<div class="hcFlip" style="position:relative;width:96px;height:138px;transform-style:preserve-3d;transition:transform .72s cubic-bezier(.3,1.35,.4,1)">
          <div class="cardface down" style="position:absolute;inset:0;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden"></div>
        </div>
        <div class="lbl hcLab" style="margin:0;width:100%;max-width:100%;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere">—</div>`;
      host.appendChild(slot);
      return slot;
    });
  }

  function deal() {
    if (busy) return;
    if (deck.length < 4) fresh();
    gen++;
    labels = ['You', 'Dealer'];
    if (labels.length < 2) labels = [labels[0] || 'Yes', 'No'];
    hand = [deck.pop(), deck.pop()];
    slots.forEach((slot, i) => {
      const flip = slot.querySelector('.hcFlip');
      const old = flip.querySelector('.cardface:not(.down)');
      if (old) old.remove();
      flip.insertAdjacentHTML('beforeend', face(hand[i]));
      const front = flip.querySelector('.cardface:not(.down)');
      if (front) { front.style.opacity = '1'; front.classList.remove('win'); }
      flip.style.transition = 'none';
      flip.style.transform = 'rotateY(0deg)';
      void flip.offsetWidth;
      flip.style.transition = 'transform .72s cubic-bezier(.3,1.35,.4,1)';
      fitLabel(slot.querySelector('.lbl'), labels[i]);
    });
    state = 'down'; busy = false;
    $('hcDeck').textContent = deck.length + ' cards left in the deck';
    $('hcRes').innerHTML = '<span class="muted">Tap the cards to flip</span>';
  }

  function flip() {
    if (state !== 'down' || busy) return;
    busy = true; state = 'flip';
    const my = gen;
    slots.forEach(s => { s.querySelector('.hcFlip').style.transform = 'rotateY(180deg)'; });
    try { tone(390, 0.16, 0.06, 'triangle', 720); } catch (e) {}
    setTimeout(() => { if (my === gen) settle(); }, 780);
  }

  function settle() {
    busy = false;
    const a = val(hand[0]), b = val(hand[1]);
    if (a === b) {
      state = 'tie';
      K.setResult($('hcRes'), 'Tie — dealing again');
      try { tone(300, 0.18, 0.05, 'sine', 250); } catch (e) {}
      setTimeout(() => { if (state === 'tie') deal(); }, 1100);
      return;
    }
    const i = a > b ? 0 : 1, j = 1 - i;
    state = 'done';
    slots.forEach((slot, k) => {
      const f = slot.querySelector('.cardface:not(.down)');
      if (!f) return;
      f.classList.toggle('win', k === i);
      f.style.opacity = k === i ? '1' : '.62';
    });
    /* names the winning option in full; this toy never hands out a verdict card */
    K.setResult($('hcRes'), `${labels[i]} — ${hand[i].r}${hand[i].s} beats ${hand[j].r}${hand[j].s}`);
    try { tone(660, 0.28, 0.06, 'sine', 880); } catch (e) {}
  }

  function action() {
    if (state === 'down') flip();
    else if (!busy) deal();
  }

  K && window.DECIDER_GAMES.push({
    id: 'highcard', name: 'High card', short: 'High card', label: 'Deck', noResult: true, button: false,
    body: `<div class="cards3" id="hcHand" style="gap:20px;perspective:900px;min-height:156px;cursor:pointer"></div>
      <div class="lbl" id="hcDeck" style="cursor:pointer">52 cards</div>
      <div class="res" id="hcRes" aria-live="polite" style="font-size:calc(clamp(20px,5.4vw,30px)*var(--fs,1));min-height:48px"><span class="muted">Tap the cards to deal, tap again to flip</span></div>`,
    tune: `<div class="lbl">A full deck, shuffled every few deals. One card per option — high card wins.</div>`,
    init() {
      buildSlots();
      fresh();
      // the cards are the button: tap them to deal, tap them again to flip
      const hand = $('hcHand'), deckLbl = $('hcDeck');
      [hand, deckLbl].forEach(el => {
        if (!el) return;
        el.addEventListener('pointerup', action);
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } });
      });
      deal();
    },
    enter() {},
    leave() {},
    action
  });
})();
