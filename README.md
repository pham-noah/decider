# Decider

The decision you cannot make, made for you — a wheel, a coin, dice, a finger chooser,
spin-the-bottle and an oracle, plus thirty toys for when the decision was never the
point.

One web app in `www/`, shipped three ways: the browser as an offline PWA, Android
(`android/`, Capacitor 8) and Windows (`src-tauri/`, Tauri 2). No account, no
analytics, no ads, nothing on the network but a daily version check you can turn off.

## What is in it

**39 tiles.** Six deciders (Wheel, Coin, Dice, Fingers, Bottle, Oracle), three quick
calls (Truth or dare, Timed call, Face-off), and thirty toys: Darts, Pool, Blackjack,
Plinko, Pachinko, Slot machine, Gacha, Bubble wrap, Scratch card, Stress ball, Claw,
Coin Pusher, Bowling, Ring Toss, Skipping stone, Basketball, Tarot, Hanoi, Blek, Line
Rider, Sandspiel, Windowsill, Vignettes, Knob, Big button, High card, Switches,
Fidget spinner, Rubber band, Balloons.

The bar at the bottom pins four games; the grid button opens all 39 and a tile's star
moves it onto the bar or off it, as many as you like — the bar scrolls. Twelve games
take setup, and their Options pill opens a sheet you can drag closed, tap away from,
or dismiss with Escape. Changes are remembered. Anything one tap can lose — a cleared
history, a cleared best score, a removed option — offers Undo in the same band as the
message, and holding a cabinet tile clears that game's best.

Every control is reachable by Tab and fires on Space or Enter. Pinch and double-tap
zoom are off and the app owns the viewport.

## Running it

```sh
npm run serve      # http://localhost:3000, after stamping the cache
```

`www/` is the whole app — one `index.html` plus `app-nav.js`, `sw.js` and `games/`
(one module per toy). Edit nothing else by hand.

## Building

```sh
npm run android:build     # debug APK on a connected device
npm run android:release   # signed AAB in android/app/build/outputs/bundle/release
node scripts/gradle.mjs assembleRelease   # the APK, same keystore
npm run desktop:build     # NSIS installer in src-tauri/target/release/bundle/nsis
npm run pwa:bump          # new cache stamp after any www/ change
```

Android signing reads `android/keystore.properties` (`storeFile`, `storePassword`,
`keyAlias`, `keyPassword`); without it the release build comes out unsigned. The
desktop build stops at the MSI step unless the Windows Installer Service is reachable —
`npx tauri build --bundles nsis` is enough. `npm run prepare:icons` regenerates the
Android and PWA icons from `assets/icon.png` (needs Pillow) and `npm run prepare:fonts`
copies the bundled faces.

## Checks

```sh
npm run check      # every file parses, including the inline script in index.html
npm run ci         # the files still agree: version, wiring, stamp, refs, manifest
npm run verify     # both, which is what CI runs on Node 22
```

`verify` is static and dependency-free on purpose, because the mistakes this app
actually makes are visible without a browser: a duplicated declaration that kills the
page at load, a game module that is not linked or precached, the three version strings
drifting apart, a stamp that no longer matches `www/`, a `src` that is not on disk. CI
skips markdown-only changes.

## Version

The version lives in three places: `package.json`, `src-tauri/tauri.conf.json` and
`APP_VERSION` in `www/index.html`. Android's `versionName` and `versionCode` are
derived from `package.json` by `scripts/patch-android.mjs` (code = major·10000 +
minor·100 + patch) whenever `android:sync`, `android:build` or `android:release` run.

## Releasing

1. Bump all three, then `npm run pwa:bump` — the new stamp must be committed, or
   `verify` fails on the runner.
2. `npm run verify`, then build: AAB, APK, and the Windows installer.
3. Copy the three artifacts to `dist/<version>/` and attach them to a tag:

```sh
gh release create v1.3.0 "dist/1.3.0/"* --title "Decider 1.3.0" --notes-file -
```

Assets are named `Decider-<version>-android.apk`, `-android.aab` and
`-windows-x64-setup.exe`. Tag only once the artifacts exist.

## Updates

The About card asks GitHub for the latest release once a day when the app moves to the
foreground (switchable, and "Check for updates now" asks on the spot). It reads one
`releases/latest` response and nothing else; `www/privacy.html` is the Play-ready
policy, reachable from About.

## Notes

- The app is offline-first: the service worker serves `www/` from cache, so a version
  bump is what tells browsers and the installed app to take the new files.
- Add a game by dropping a module in `www/games/`, registering it, and letting
  `verify` complain until the wiring is complete.
- Apache-2.0 — see `LICENSE`.

Questions, bug reports and release news: [Discord](https://discord.gg/tz42eZyNtD).
Downloads: https://github.com/pham-noah/decider/releases
