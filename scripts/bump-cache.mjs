// Sets CACHE in www/sw.js to a hash of every file in www/, so the PWA updates whenever anything changes.
// Runs automatically before serve / android sync / android builds. Safe to run repeatedly.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

// Paths are hashed with / separators so the same tree yields the same stamp on
// Windows and on the Linux runner that checks it (scripts/ci.mjs).
const walk = (d, prefix = "") =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p, prefix + n + "/") : [prefix + n];
  });
// index.html carries the stamp inside itself, so it is hashed with the ?v= values
// stripped: otherwise every bump would change the hash that produced it and the
// stamp could never settle (scripts/ci.mjs would always be red).
const content = (rel) => {
  const c = readFileSync(join("www", ...rel.split("/")));
  return rel === "index.html" ? c.toString("utf8").replace(/\?v=[0-9a-f]*/g, "") : c;
};
const h = createHash("sha1");
for (const rel of walk("www").filter((f) => !f.endsWith("sw.js")).sort()) {
  h.update(rel);
  h.update(content(rel));
}
const v = "decider-" + h.digest("hex").slice(0, 10);

const sw = readFileSync("www/sw.js", "utf8");
const out = sw.replace(/const CACHE = "[^"]*";/, `const CACHE = "${v}";`);
if (out !== sw) { writeFileSync("www/sw.js", out); console.log("sw.js cache ->", v); }
else console.log("sw.js cache unchanged:", v);

// --- cache-bust the asset tags -------------------------------------------
// The service worker only helps when the app is served. Opened straight off the
// disk in a browser there is no worker at all, and a cached games/*.js is served
// from the browser cache forever. Stamping the tags with the same content hash
// makes a plain file:// reload pick up whatever changed.
const stamp = v.replace("decider-", "");
const html = readFileSync("www/index.html", "utf8");
const outHtml = html.replace(
  /(<(?:script[^>]*?src|link[^>]*?href)=")([^"?]+\.(?:js|css))(?:\?v=[^"]*)?(")/g,
  (m, a, path, b) => `${a}${path}?v=${stamp}${b}`
);
if (outHtml !== html) { writeFileSync("www/index.html", outHtml); console.log("index.html stamped ->", stamp); }
else console.log("index.html stamp unchanged:", stamp);

