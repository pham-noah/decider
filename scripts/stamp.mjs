/* The content stamp for www/, in one place so `bump-cache.mjs` (writes it) and
 * `ci.mjs` (checks it) can never disagree.
 *
 * Two things are normalised, both for the same reason — the stamp is committed
 * and then recomputed on a Linux runner, so it must not depend on how the tree
 * was checked out:
 *   - paths are hashed with / separators, not Windows backslashes;
 *   - text files are hashed with CRLF -> LF, since .gitattributes hands out LF
 *     on CI and the working copy here is CRLF.
 *
 * index.html is hashed with its own ?v= stamps stripped: it carries the value
 * being computed, and without that the stamp would never settle.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const TEXT = /\.(?:js|mjs|css|html|json|webmanifest|txt|md|svg)$/i;

/** Every file under www/, as POSIX paths relative to it, sorted, minus sw.js. */
export const listFiles = (www) => {
  const walk = (dir, prefix = "") =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p, prefix + n + "/") : [prefix + n];
    });
  return walk(www).filter((rel) => rel !== "sw.js").sort();
};

/** The bytes to hash for one file, line-ending and stamp normalised. */
export const readNormalised = (www, rel) => {
  const buf = readFileSync(join(www, ...rel.split("/")));
  if (!TEXT.test(rel)) return buf;
  let s = buf.toString("utf8").replace(/\r\n/g, "\n");
  if (rel === "index.html") s = s.replace(/\?v=[0-9a-f]*/g, "");
  return s;
};

/** "decider-<first 10 hex>" describing the current contents of www/. */
export const stampOf = (www) => {
  const h = createHash("sha1");
  for (const rel of listFiles(www)) {
    h.update(rel);
    h.update(readNormalised(www, rel));
  }
  return "decider-" + h.digest("hex").slice(0, 10);
};
