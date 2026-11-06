// Injects a <script> tag for every module in www/games/ into index.html, between
// the games:start / games:end markers. _kit.js always loads first.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gdir = join(root, 'www', 'games');
const index = join(root, 'www', 'index.html');

const files = readdirSync(gdir).filter(f => f.endsWith('.js'));
const ordered = ['_kit.js', ...files.filter(f => f !== '_kit.js').sort()];
const tags = ordered.map(f => `<script src="games/${f}"></script>`).join('\n');

let html = readFileSync(index, 'utf8');
const START = '<!-- games:start -->';
const END = '<!-- games:end -->';
if (!html.includes(START)) throw new Error('markers missing from index.html');
html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}\n${tags}\n${END}`);
writeFileSync(index, html);

// and precache them for offline use
const swPath = join(root, 'www', 'sw.js');
let sw = readFileSync(swPath, 'utf8');
const list = ordered.map(f => `"games/${f}"`).join(', ');
sw = sw.replace(/\/\* games:start \*\/[\s\S]*?\/\* games:end \*\//, `/* games:start */
  ${list}
  /* games:end */`);
writeFileSync(swPath, sw);
console.log(ordered.length + ' modules linked: ' + ordered.join(', '));
