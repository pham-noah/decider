// Sets CACHE in www/sw.js to a hash of every file in www/, so the PWA updates whenever anything changes.
// Runs automatically before serve / android sync / android builds. Safe to run repeatedly.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const walk = d => readdirSync(d).flatMap(n => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const h = createHash("sha1");
for (const f of walk("www").filter(f => !f.endsWith("sw.js")).sort()) { h.update(f); h.update(readFileSync(f)); }
const v = "decider-" + h.digest("hex").slice(0, 10);

const sw = readFileSync("www/sw.js", "utf8");
const out = sw.replace(/const CACHE = "[^"]*";/, `const CACHE = "${v}";`);
if (out !== sw) { writeFileSync("www/sw.js", out); console.log("sw.js cache ->", v); }
else console.log("sw.js cache unchanged:", v);
