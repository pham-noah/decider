/* Blackjack — beat the dealer. Hit or stand; the cards and a short verdict are
 * the whole readout, with no option names and no commentary. */
(function () {
  const K = window.DKIT;
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♠', '♥', '♦', '♣'];
  const $ = id => document.getElementById(id);
  let deck = [], you = [], dealer = [], state = 'idle', gen = 0;

  const val = c => c.r === 'A' ? 11 : ['K', 'Q', 'J'].includes(c.r) ? 10 : +c.r;

  function fresh() {
    deck = [];
    SUITS.forEach(s => RANKS.forEach(r => deck.push({ r, s })));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function total(cs) {
    let t = 0, aces = 0;
    cs.forEach(c => { if (c.r === 'A') { aces++; t += 11; } else t += val(c); });
    while (t > 21 && aces) { t -= 10; aces--; }
    return t;
  }

  function cardHTML(c, hidden) {
    if (hidden) return `<div class="cardface down" style="width:clamp(46px,12.6vw,60px);height:clamp(66px,18vw,86px)"></div>`;
    const red = c.s === '♥' || c.s === '♦';
    return `<div class="cardface${red ? ' red' : ''}" style="width:clamp(46px,12.6vw,60px);height:clamp(66px,18vw,86px);font-size:0;animation:pop .32s cubic-bezier(.2,1.8,.4,1)">
      <span style="display:grid;justify-items:center;line-height:1"><b style="font-size:clamp(17px,4.4vw,22px)">${c.r}</b><i style="font-style:normal;font-size:clamp(13px,3.2vw,16px);line-height:1.1">${c.s}</i></span></div>`;
  }

  /* the totals are the only words on the hands: "You 19" / "Dealer 17" */
  function render(showDealer) {
    $('bjDC').innerHTML = dealer.map((c, i) => cardHTML(c, !showDealer && i === 1)).join('');
    $('bjPC').innerHTML = you.map(c => cardHTML(c, false)).join('');
    $('bjDl').textContent = 'Dealer ' + total(showDealer ? dealer : dealer.slice(0, 1));
    $('bjPl').textContent = 'You ' + total(you);
  }

  function buttons(play) {
    $('bjHit').disabled = !play;
    $('bjStand').disabled = !play;
    $('bjHit').style.display = play ? '' : 'none';
    $('bjStand').style.display = play ? '' : 'none';
    $('bjNew').style.display = play ? 'none' : '';
  }

  function newHand() {
    gen++;
    if (deck.length < 12) fresh();
    you = [deck.pop(), deck.pop()];
    dealer = [deck.pop(), deck.pop()];
    state = 'play';
    render(false);
    buttons(true);
    $('bjRes').textContent = '';
    const my = gen;
    if (total(you) === 21) setTimeout(() => { if (gen === my && state === 'play') stand(); }, 520);
  }

  /* one short phrase, nothing else: You win / Dealer wins / Push / Bust */
  function end(text, mood) {
    gen++; state = 'over';
    render(true); buttons(false);
    K.setResult($('bjRes'), text);
    try {
      tone(mood > 0 ? 720 : mood < 0 ? 170 : 420, 0.3, 0.06,
        mood < 0 ? 'sawtooth' : 'sine', mood > 0 ? 940 : mood < 0 ? 90 : 620);
    } catch (e) {}
  }

  function hit() {
    if (state !== 'play') return;
    you.push(deck.pop());
    render(false);
    try { K.sfx.paper(1.1); } catch (e) {}
    const t = total(you);
    if (t > 21) end('Bust', -1);
    else if (t === 21) setTimeout(() => { if (state === 'play') stand(); }, 460);
  }

  function stand() {
    if (state !== 'play') return;
    state = 'dealer';
    render(true); buttons(false);
    $('bjRes').textContent = '';
    const my = gen;
    (function draw() {
      if (my !== gen) return;
      if (total(dealer) < 17) {
        dealer.push(deck.pop());
        render(true);
        try { K.sfx.paper(.7); } catch (e) {}
        setTimeout(draw, 540);
        return;
      }
      const p = total(you), d = total(dealer);
      if (p === d) {
        state = 'over';
        K.setResult($('bjRes'), 'Push');
        setTimeout(() => { if (my === gen) newHand(); }, 1300);
        return;
      }
      end(p > d ? 'You win' : 'Dealer wins', p > d ? 1 : -1);
    })();
  }

  function action() {
    if (state === 'play') hit();
    else if (state === 'over') newHand();
  }

  K && window.DECIDER_GAMES.push({
    id: 'blackjack', name: 'Blackjack', short: '21', noResult: true,
    body: `<div class="lbl" id="bjDl">Dealer</div>
      <div class="cards3" id="bjDC" style="gap:6px;min-height:86px"></div>
      <div class="lbl" id="bjPl">You</div>
      <div class="cards3" id="bjPC" style="gap:6px;min-height:86px"></div>
      <div class="res" id="bjRes" aria-live="polite" style="font-size:calc(clamp(18px,4.8vw,25px)*var(--fs,1));min-height:44px"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button class="btn" id="bjHit" style="padding:13px 30px">Hit</button>
        <button class="btn" id="bjStand" style="padding:13px 28px;background:linear-gradient(135deg,#2fe0c4,#6f8bff);box-shadow:0 12px 30px rgba(47,224,196,.35)">Stand</button>
        <button class="btn" id="bjNew" style="padding:13px 28px;display:none">Deal again</button>
      </div>`,
    init() {
      $('bjHit').onclick = hit;
      $('bjStand').onclick = stand;
      $('bjNew').onclick = newHand;
      fresh();
      /* dealt on entry, not at registration: a hand resolved at boot could chime and
         write history for a toy nobody had opened */
    },
    enter() { if (!you.length && state === 'idle') newHand(); },
    leave() {},
    action
  });
})();
