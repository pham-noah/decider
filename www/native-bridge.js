/* native-bridge.js - Android only (Capacitor). Maps browser APIs the WebView lacks onto native plugins:
 *   navigator.share / canShare -> @capacitor/share (+ filesystem for images)
 *   navigator.vibrate          -> @capacitor/haptics
 *   navigator.wakeLock         -> @capacitor-community/keep-awake
 *   hardware Back button       -> @capacitor/app + window.deciderBack() (app-nav.js)
 *   splash screen              -> hidden once fonts and the first frame are ready
 *   status/nav bar icons       -> follow the light/dark theme (Capacitor 8 SystemBars)
 * Does nothing in a browser, a PWA or the Tauri desktop app.
 */
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {};

  function def(obj, name, val) {
    try { Object.defineProperty(obj, name, { value: val, configurable: true, writable: true }); }
    catch (e) { try { obj[name] = val; } catch (_) {} }
  }

  /* ---------- Share ---------- */
  var Share = P.Share, FS = P.Filesystem;

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(",")[1]); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  if (Share) {
    def(navigator, "canShare", function (d) {
      if (d && d.files && d.files.length) return !!FS;
      return true;
    });
    def(navigator, "share", async function (d) {
      d = d || {};
      var opts = { title: d.title, text: d.text, url: d.url, dialogTitle: d.title || "Share" };
      try {
        if (d.files && d.files.length && FS) {
          var uris = [];
          for (var i = 0; i < d.files.length; i++) {
            var f = d.files[i];
            var res = await FS.writeFile({
              path: "share/" + (f.name || "file-" + i),
              data: await blobToBase64(f),
              directory: "CACHE",
              recursive: true
            });
            uris.push(res.uri);
          }
          opts.files = uris;
        }
        await Share.share(opts);
      } catch (e) {
        if (/cancel/i.test(String(e && e.message))) {
          var a = new Error("Share cancelled");
          a.name = "AbortError";
          throw a; // AbortError = the user dismissed the sheet
        }
        throw e;
      }
    });
  }

  /* ---------- Vibrate ---------- */
  var H = P.Haptics;
  if (H && H.vibrate) {
    def(navigator, "vibrate", function (pattern) {
      try {
        var p = Array.isArray(pattern) ? pattern : [pattern];
        var t = 0;
        p.forEach(function (ms, i) {
          ms = Math.max(0, Math.min(2000, Number(ms) || 0));
          if (i % 2 === 0 && ms > 0) setTimeout(function () { H.vibrate({ duration: ms }); }, t); // even = buzz, odd = pause
          t += ms;
        });
        return true;
      } catch (e) { return false; }
    });
  }

  /* ---------- Screen wake lock ---------- */
  var KA = P.KeepAwake;
  if (KA && KA.keepAwake) {
    def(navigator, "wakeLock", {
      request: async function () {
        await KA.keepAwake();
        var handlers = [], released = false;
        return {
          type: "screen",
          get released() { return released; },
          addEventListener: function (t, f) { if (t === "release") handlers.push(f); },
          removeEventListener: function (t, f) { handlers = handlers.filter(function (h) { return h !== f; }); },
          release: async function () {
            if (released) return;
            released = true;
            try { await KA.allowSleep(); } catch (e) {}
            handlers.forEach(function (h) { try { h(); } catch (e) {} });
          }
        };
      }
    });
  }
  /* ---------- Hardware Back button ---------- */
  var App = P.App;
  if (App && App.addListener) {
    App.addListener("backButton", function () {
      // Close the top overlay, else return to Wheel; exit when already home.
      if (typeof window.deciderBack === "function" && window.deciderBack()) return;
      App.exitApp();
    });
  }

  /* ---------- Splash screen ---------- */
  var SS = P.SplashScreen;
  if (SS && SS.hide) {
    var hidden = false;
    var hideSplash = function () {
      if (hidden) return;
      hidden = true;
      try { SS.hide({ fadeOutDuration: 250 }); } catch (e) {}
    };
    var afterFonts = function () {
      var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      ready.then(function () { requestAnimationFrame(function () { requestAnimationFrame(hideSplash); }); }, hideSplash);
    };
    if (document.readyState === "complete") afterFonts(); else addEventListener("load", afterFonts);
    setTimeout(hideSplash, 3000); // failsafe
  }

  /* ---------- Status / navigation bar icon colour ---------- */
  var SB = P.SystemBars;
  /* the app has its own header, so the Android status bar stays hidden: a real
   * full screen, and no dark strip over the light theme */
  var hideStatusBar = function () {
    if (!SB || !SB.hide) return;
    try { SB.hide({ bar: "StatusBar" }); } catch (e) {}
  };
  if (SB && SB.setStyle) {
    var root = document.documentElement, mq = matchMedia("(prefers-color-scheme: dark)");
    var syncBars = function () {
      hideStatusBar();
      var t = root.getAttribute("data-theme");
      var dark = t === "dark" || (t !== "light" && mq.matches);
      try { SB.setStyle({ style: dark ? "DARK" : "LIGHT" }); } catch (e) {} // DARK = light icons
    };
    syncBars();
    new MutationObserver(syncBars).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    if (mq.addEventListener) mq.addEventListener("change", syncBars);
  }
  /* keep it hidden when the app comes back from the background */
  hideStatusBar();
  document.addEventListener("visibilitychange", function () { if (!document.hidden) hideStatusBar(); });
})();
