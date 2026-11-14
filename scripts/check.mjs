/* The gate that has to pass before a Decider change is worth opening a browser for.
 *
 * `index.html` is one large inline <script>, so `node --check` cannot read it directly: its
 * blocks are extracted and checked as one file, which is also the check that catches a
 * duplicated declaration the app would otherwise die on at load (`goTo is not defined`).
 * Every plug-in module and app-nav.js are checked too, so a syntax error in any of the
 * thirty-odd files fails here and not on a phone.
 *
 *   node scripts/check.mjs      (npm run check)
 */
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '_chk_inline.js');
let fails = 0;

const check = (label, file) => {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status === 0) { console.log('ok   ' + label); return true; }
  fails++;
  console.log('FAIL ' + label + '\n' + (r.stderr || '').trim().split('\n').slice(0, 6).join('\n'));
  return false;
};

const html = readFileSync(join(root, 'www', 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
writeFileSync(tmp, blocks.join('\n;\n'));
try { check('www/index.html (inline, ' + blocks.length + ' blocks)', tmp); }
finally { try { unlinkSync(tmp); } catch (e) {} }

check('www/app-nav.js', join(root, 'www', 'app-nav.js'));
const gdir = join(root, 'www', 'games');
readdirSync(gdir).filter((f) => f.endsWith('.js')).forEach((f) => check('www/games/' + f, join(gdir, f)));

console.log(fails ? fails + ' file(s) failed' : 'all files parse');
process.exit(fails ? 1 : 0);
