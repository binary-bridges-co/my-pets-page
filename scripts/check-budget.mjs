// The weight budget of DESIGN §7, gzipped, over the built dist/: every HTML page, the stylesheet and
// the script. Fails over any of them and prints the sizes.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = new URL('../dist/', import.meta.url);
const KB = 1024;
const BUDGET = { html: 4 * KB, css: 6 * KB, js: 20 * KB };

const files = [
  ...['p/index.html', 'index.html', '404.html'].map((f) => ['html', f]),
  ...readdirSync(new URL('assets/', dist)).map((f) => [f.endsWith('.js') ? 'js' : 'css', `assets/${f}`]),
];
let failed = false;
const seen = { html: 0, css: 0, js: 0 };
for (const [kind, file] of files) {
  const raw = readFileSync(new URL(file, dist));
  const size = gzipSync(raw, { level: 9 }).length;
  seen[kind]++;
  const ok = size <= BUDGET[kind];
  if (!ok) failed = true;
  console.log(`budget: ${file} ${size} B gzipped (${raw.length} B raw), budget ${BUDGET[kind]} B${ok ? '' : '  OVER'}`);
}
if (seen.js !== 1 || seen.css !== 1) {
  console.error(`budget: expected one script and one stylesheet, found ${seen.js} and ${seen.css}`);
  failed = true;
}
if (failed) process.exit(1);
