/* app-nav.js - navigation helpers layered on the app (loaded after the main script)
 *   window.deciderBack()  closes the top-most overlay, else returns to Wheel. Returns true if it did something.
 *   Keyboard              Space = main action, 1-7 / arrows = switch tab, Esc = close overlay (desktop/PWA)
 */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var tabs = function () { return Array.prototype.slice.call(document.querySelectorAll('.dock button[data-v]')); };
  var activeIdx = function () { return tabs().findIndex(function (b) { return b.classList.contains('on'); }); };
  var go = function (i) {
    var t = tabs(); if (!t.length) return;
    i = (i + t.length) % t.length;
    t[i].click();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  };

  /* Top-most overlay first, wheel last. */
  function closeOverlay() {
    var m = $('.moment');          // full-screen result card
    if (m) { m.click(); return true; }
    var pop = $('#pop');           // rename-option popup
    if (pop) { pop.remove(); return true; }
    var tip = $('#tips');          // first-visit tip
    if (tip) { tip.remove(); return true; }
    var tune = $('.tune.open');     // a game's settings sheet
    if (tune) { tune.classList.remove('open'); return true; }
    var all = $('#all');           // all-games picker
    if (all && all.classList.contains('open')) { all.classList.remove('open'); return true; }
    var sheet = $('#sheet');       // wheel options sheet
    if (sheet && sheet.classList.contains('open')) { sheet.classList.remove('open'); return true; }
    if ($('.flood:not(.out)') && typeof window.freset === 'function') { window.freset(); return true; } // fingers result
    return false;
  }

  window.deciderBack = function () {
    if (closeOverlay()) return true;
    var i = activeIdx();
    if (i > 0) { tabs()[0].click(); return true; }   // any other tab -> Wheel
    return false;                                     // already home: let the OS handle it (exit app)
  };

  /* ---- keyboard ---- */
  var ACTION = { wheel: '#spin', coin: '#flip', dice: '#roll', bottle: '#bspin', oracle: '#oask',
                 deck: '#deckgo', tmer: '#tmergo', face: '#fmatch' };
  var isTyping = function (el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  };

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;

    if (k === 'Escape') { if (closeOverlay()) e.preventDefault(); return; }
    if (isTyping(e.target)) return;

    // A result card is open: Space/Enter dismisses it, nothing else fires underneath
    var m = $('.moment');
    if (m && (k === ' ' || k === 'Enter')) { e.preventDefault(); m.click(); return; }

    if (k === ' ' || k === 'Spacebar') {
      var hit = e.target && e.target.closest && e.target.closest('button, a, [role="button"]');
      if (hit && !hit.closest('.dock')) return;   // let a focused button handle its own Space
      var view = document.querySelector('.view.on'); if (!view) return;
      var sel = ACTION[view.id], btn = sel && $(sel);
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      else if (!sel && window.__gameAction && window.__gameAction()) e.preventDefault();  // plug-in toys
      else if (sel) e.preventDefault();           // keep the page from scrolling
      return;
    }

    if (e.shiftKey) return;
    if (/^[1-7]$/.test(k)) { var t = tabs(), n = +k - 1; if (n < t.length) { e.preventDefault(); go(n); } return; }

    var vertical = matchMedia('(min-width:1000px)').matches;   // side dock on wide screens
    if (k === 'ArrowRight' || (vertical && k === 'ArrowDown')) { e.preventDefault(); go(activeIdx() + 1); }
    else if (k === 'ArrowLeft' || (vertical && k === 'ArrowUp')) { e.preventDefault(); go(activeIdx() - 1); }
  });

  /* Space must not re-trigger a dock tab you just clicked with the mouse */
  var dock = $('.dock');
  if (dock) dock.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'mouse' && e.target.closest) { var b = e.target.closest('button'); if (b) b.blur(); }
  });

  /* Hover hints on desktop: "Coin (2)" */
  tabs().forEach(function (b, i) {
    b.title = (b.dataset.label || b.textContent.trim() || 'More') + ' (' + (i + 1) + ')';
    b.setAttribute('aria-keyshortcuts', String(i + 1));
  });
})();
