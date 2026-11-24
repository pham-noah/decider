/* The cross-file gate: the things `node --check` cannot see.
 *
 * `scripts/check.mjs` proves every file parses. This proves the files still
 * agree with each other — which is what actually breaks a Decider release:
 *
 *   1. version    package.json == src-tauri/tauri.conf.json == APP_VERSION
 *   2. wiring     every www/games/*.js is linked in index.html AND precached in
 *                 sw.js, _kit.js first, and no tag/precache entry is a ghost
 *   3. stamp      CACHE in sw.js and every ?v= in index.html match the content
 *                 hash, so a shipped change cannot sit behind a stale PWA cache
 *   4. refs       every local src/href in index.html resolves on disk
 *   5. manifest   manifest.json parses and its icons exist
 *
 *   node scripts/ci.mjs      (npm run ci)
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const www = join(root, "www");
let fails = 0;
const ok = (m) => console.log("ok    " + m);
const bad = (m, detail) => {
  fails++;
  console.log("FAIL  " + m + (detail ? "\n" + detail : ""));
};

const read = (p) => readFileSync(p, "utf8");
const html = read(join(www, "index.html"));
const sw = read(join(www, "sw.js"));

// --- 1. version, in the three places that must match ----------------------
const pkgVersion = JSON.parse(read(join(root, "package.json"))).version;
const tauriVersion = JSON.parse(read(join(root, "src-tauri", "tauri.conf.json"))).version;
const appVersion = (html.match(/const APP_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1];
if (pkgVersion && pkgVersion === tauriVersion && pkgVersion === appVersion) {
  ok(`version ${pkgVersion} agrees in package.json, tauri.conf.json and index.html`);
} else {
  bad(
    "version mismatch",
    `  package.json  ${pkgVersion}\n  tauri.conf.json ${tauriVersion}\n  index.html    ${appVersion}`
  );
}

// --- 2. every game module is linked and precached, and nothing else is ----
const modules = readdirSync(join(www, "games"))
  .filter((f) => f.endsWith(".js"))
  .sort();
const ordered = ["_kit.js", ...modules.filter((f) => f !== "_kit.js")];

const tagBlock = (html.match(/<!-- games:start -->([\s\S]*?)<!-- games:end -->/) || [])[1] || "";
const linked = [...tagBlock.matchAll(/src="games\/([^"?]+)/g)].map((m) => m[1]);
const cacheBlock = (sw.match(/\/\* games:start \*\/([\s\S]*?)\/\* games:end \*\//) || [])[1] || "";
const precached = [...cacheBlock.matchAll(/"games\/([^"]+)"/g)].map((m) => m[1]);

const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
if (sameList(linked, ordered)) ok(`${ordered.length} game modules linked in index.html, _kit.js first`);
else {
  const extra = linked.filter((f) => !ordered.includes(f));
  const gone = ordered.filter((f) => !linked.includes(f));
  bad(
    "index.html game tags out of sync with www/games/",
    (extra.length ? `  tag with no file   ${extra.join(", ")}\n` : "") +
      (gone.length ? `  file with no tag   ${gone.join(", ")}\n` : "") +
      "  (run: node scripts/plug-games.mjs)"
  );
}
if (new Set(precached).size === precached.length && sameList([...precached].sort(), [...ordered].sort()))
  ok(`${precached.length} game modules precached in sw.js`);
else {
  const extra = precached.filter((f) => !ordered.includes(f));
  const gone = ordered.filter((f) => !precached.includes(f));
  bad(
    "sw.js games:start list out of sync with www/games/",
    (gone.length ? `  missing   ${gone.join(", ")}\n` : "") +
      (extra.length ? `  ghost     ${extra.join(", ")}\n` : "") +
      "  (run: node scripts/plug-games.mjs)"
  );
}

// --- 3. the content stamp: CACHE and ?v= must describe www/ right now ------
// Same hash as scripts/bump-cache.mjs, but with POSIX separators so the value is
// identical on Windows and on the Linux runner, and with the ?v= stamps stripped
// out of index.html so the stamp does not depend on itself.
const walk = (d, prefix = "") =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p, prefix + n + "/") : [prefix + n];
  });
const content = (rel) => {
  const c = readFileSync(join(www, ...rel.split("/")));
  return rel === "index.html" ? c.toString("utf8").replace(/\?v=[0-9a-f]*/g, "") : c;
};
const hash = createHash("sha1");
for (const rel of walk(www).filter((f) => !f.endsWith("sw.js")).sort()) {
  hash.update(rel);
  hash.update(content(rel));
}
const expected = "decider-" + hash.digest("hex").slice(0, 10);

const cache = (sw.match(/const CACHE = "([^"]*)"/) || [])[1];
if (cache === expected) ok(`sw.js CACHE ${cache} matches www/`);
else bad(`sw.js CACHE is stale (${cache}, www/ hashes to ${expected})`, "  (run: npm run pwa:bump)");

const stamps = [...new Set([...html.matchAll(/\?v=([0-9a-f]+)/g)].map((m) => m[1]))];
if (stamps.length === 1 && "decider-" + stamps[0] === expected) ok(`index.html ?v=${stamps[0]} matches www/`);
else
  bad(
    "index.html asset stamp is stale",
    `  found     ${stamps.join(", ") || "none"}\n  expected  ${expected.replace("decider-", "")}\n  (run: npm run pwa:bump)`
  );

// --- 4. every local reference resolves -------------------------------
// index.html's tags, the url()s in fonts.css, and — most important — the sw.js
// precache list: one missing file there makes addAll() reject, the service
// worker never installs, and the PWA silently loses offline mode entirely.
const onDisk = (rel) => existsSync(join(www, ...posix.normalize(rel).split("/")));
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !/^(?:[a-z]+:|\/\/|#|data:)/i.test(u))
  .map((u) => u.split(/[?#]/)[0])
  .filter((u) => u && !u.startsWith("/"));
let missing = [...new Set(refs)].filter((u) => !onDisk(u));
if (!missing.length) ok(`${new Set(refs).size} local references in index.html resolve`);
else bad("index.html points at files that are not in www/", "  " + missing.join("\n  "));

const css = existsSync(join(www, "fonts.css")) ? read(join(www, "fonts.css")) : "";
const cssRefs = [...css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)]
  .map((m) => m[2])
  .filter((u) => !/^(?:[a-z]+:|\/\/|data:)/i.test(u))
  .map((u) => u.split(/[?#]/)[0]);
missing = [...new Set(cssRefs)].filter((u) => !onDisk(u.startsWith("/") ? u.slice(1) : u));
if (!missing.length) ok(`${new Set(cssRefs).size} font url()s in fonts.css resolve`);
else bad("fonts.css points at files that are not in www/", "  " + missing.join("\n  "));

const filesBlock = (sw.match(/const FILES = \[([\s\S]*?)\];/) || [])[1] || "";
const cached = [...filesBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== "./");
missing = cached.filter((f) => !onDisk(f));
if (!missing.length) ok(`${cached.length} sw.js precache entries exist`);
else bad("sw.js precaches files that are not in www/ (breaks offline install)", "  " + missing.join("\n  "));

// --- 5. the manifest parses and its icons are on disk ---------------------
try {
  const mf = JSON.parse(read(join(www, "manifest.json")));
  const absent = (mf.icons || []).map((i) => i.src).filter((s) => !existsSync(join(www, ...s.split("/"))));
  if (!mf.name || !mf.start_url) throw new Error("name/start_url missing");
  if (absent.length) bad("manifest.json icons missing from www/", "  " + absent.join("\n  "));
  else ok(`manifest.json parses (${(mf.icons || []).length} icons present)`);
} catch (e) {
  bad("manifest.json is not usable: " + e.message);
}

console.log(fails ? `\n${fails} check(s) failed` : "\nconsistency checks passed");
process.exit(fails ? 1 : 0);
