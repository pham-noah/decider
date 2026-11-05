# Decider

Wheel, coin, dice, finger chooser, spin-the-bottle and an oracle. One web app (`www/index.html`),
shipped three ways:

| Target  | Tool        | Notes                                                                      |
|---------|-------------|----------------------------------------------------------------------------|
| Android | Capacitor 8 | `native-bridge.js` maps share / vibrate / wake-lock / Back / splash / bars |
| Desktop | Tauri 2     | Windows / macOS / Linux installers, a few MB                               |
| Web     | PWA         | `manifest.json` + `sw.js`, host `www/` on any static host                  |

Edit **only `www/`**. The version lives in three places: `package.json`, `src-tauri/tauri.conf.json`
and `APP_VERSION` in `www/index.html`.

## Quick start
```bash
npm install
npm run serve              # http://localhost:3000
npm run desktop:dev        # Tauri window (needs Rust)
```

## Android
Requires Android Studio (SDK + JDK 17+).
```bash
npm run android:add        # generates ./android (once)
npm run android:icons      # launcher icons + splash from ./assets
npm run android:build      # debug APK: android/app/build/outputs/apk/debug/
npm run android:release    # signed .aab (needs signingConfigs, below)
```
After changing `www/`: `npm run android:sync`.

### Signing
```bash
keytool -genkey -v -keystore decider.keystore -alias decider -keyalg RSA -keysize 2048 -validity 10000
```
Add a `signingConfigs` block to `android/app/build.gradle`, then `npm run android:release`. Back the
keystore up; it is git-ignored. `appId` (`app.decider.wheel`) cannot change after the first Play upload.

## Desktop
Requires [Rust](https://rustup.rs) and the Tauri 2 system deps.
```bash
npm run desktop:dev        # live window
npm run desktop:build      # installers in src-tauri/target/release/bundle/
```
Links (GitHub, privacy policy) open in the system browser through `tauri-plugin-opener`. The CSP allows
two origins: the app itself and `https://api.github.com`, which only the update check uses.

## PWA
Deploy `www/` to any HTTPS host. `scripts/bump-cache.mjs` rewrites `CACHE` in `www/sw.js` from a hash of
`www/` and runs before `serve`, `android:sync`, `android:build` and `android:release`; run
`npm run pwa:bump` before deploying by hand.

## What's in it
- **Wheel** - weighted options (1-6x), presets, drag-and-flick or Spin, tap a slice to rename, hold to
  delete (undo), "remove winner after each spin", up to 12 saved wheels, share/import as a `dw1.` code.
- **Coin** - two editable sides, pick the side you hope for, flip by button, tap or swipe up.
- **Dice** - 1-4 dice, d4 to d100; max rolls glow gold.
- **Fingers** - 2+ fingers on the glass (mouse clicks on desktop), four modes: winner, two winners,
  order, teams.
- **Bottle** - 2-10 players, optional truth-or-dare, party mode turns the result to face the winner.
- **Oracle** - yes / no / maybe, colour-coded.
- **More (gear)** - themes, shake and tilt, full-screen results, keep-awake, party mode, player names,
  high contrast, reduce motion, text size, history with per-tool counts, About.

Keyboard (desktop/PWA): `Space` = the current tab's main action, `1`-`7` jump to a tab, arrows move
between tabs, `Esc` closes the top overlay. Ignored while typing; each tab shows its shortcut as a
tooltip. Android Back closes the top overlay first, then returns to Wheel, then exits.

## About, credits and updates
The About card shows the version, credits **Noah Pham** ([github.com/pham-noah](https://github.com/pham-noah)),
links the repo and the issue tracker, and holds the update check:

- **Check for updates** (on by default) - once a day the app asks `api.github.com` for
  `pham-noah/decider`'s latest release and compares it with `APP_VERSION`. A newer version puts a dot on
  the gear icon and adds a "See what's new" link. Switch it off and the app never touches the network.
- **Check for updates now** - the same check on demand, plus a service-worker update in the PWA
  ("Reload now" when a new build is waiting).

That request is the app's only network access and it carries no identifier, so the Play data-safety form
still answers "no data collected".

## Privacy
`www/privacy.html` only needs the contact address filled in (`YOUR-EMAIL@example.com`). Host it (it ships
with the PWA, e.g. `https://you.github.io/decider/privacy.html`) and paste that URL into Play Console.
The About card links to it.

## Accessibility
High contrast, reduce motion (also follows the OS setting), four text sizes, 44 px+ touch targets,
`aria-label` on icon-only controls, `aria-live` result areas, full keyboard operation.

## Icons and fonts
`npm run prepare:icons` regenerates placeholder icons (Python + Pillow); `npm run prepare:fonts` re-copies
Bricolage Grotesque from `@fontsource` into `www/fonts`. Desktop icons come from
`npx tauri icon assets/icon-only.png`.

## Verified
Headless Chromium at 320, 360, 380, 412, 430, 480, 640, 768, 834 and 1440 px, light and dark, plus the
built Tauri window on Windows 11:

- no console errors, no horizontal overflow, every tab's main button above the dock;
- all six tools produce results and history entries; share/import codes round-trip; undo restores;
- wheel labels stay upright and truncate with an ellipsis; canvas and label metrics are cached (no
  per-frame reallocation, no `measureText` per spin);
- dark mode, high contrast, reduce motion and all four text sizes re-render correctly;
- `cargo build` links the desktop app; `tauri-plugin-opener` hands links to the system browser.

## Not done yet
- **Your own icon.** `assets/icon-*.png` and `splash*.png` are generated placeholders. Replace them
  (1024 px; foreground = transparent PNG, logo inside the central ~60 %), then run `npm run android:icons`,
  `npx tauri icon assets/icon-only.png` and copy 192/512 px versions into `www/icons/`.
- **Android device pass.** Share sheet, vibration, keep-awake, splash and the back button are written
  against the plugin APIs but have not run on hardware yet.
- **Desktop auto-update.** The update check points at GitHub releases; the Tauri updater plugin needs
  signing keys and a release host.
- **Store listing:** screenshots, feature graphic, and the contact address in the privacy policy.
