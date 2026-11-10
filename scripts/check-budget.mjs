// The weight budget of DESIGN §7, gzipped, over the built dist/: every HTML page, the stylesheet and
// the script. Fails over any of them and prints the sizes.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = new URL('../dist/', import.meta.url);
const KB = 1024;
const BUDGET = { html: 4 * KB, css: 6 * KB, js: 20 * KB };

const files = [
  ...['p/index.html', 'index.html', '404.html'].map((f) => ['html', f]),
  ...readdirSync(new URL('assets/', dist)).map((f) => [f.endsWith('.js') ? 'js' : f.endsWith('.css') ? 'css' : 'other', `assets/${f}`]),
];
let failed = false;
// The CSP is in _headers (Cloudflare, Netlify) or, for GitHub Pages, in a meta tag of the page.
const headersFile = new URL('_headers', dist);
const csp = existsSync(headersFile) ? readFileSync(headersFile, 'utf8') : readFileSync(new URL('p/index.html', dist), 'utf8');
if (!/Content-Security-Policy("|: ).*require-trusted-types-for 'script'/.test(csp)) {
  console.error('budget: the built page has no CSP with Trusted Types');
  failed = true;
}
const seen = { html: 0, css: 0, js: 0 };
for (const [kind, file] of files) {
  if (kind === 'other') {
    console.error(`budget: unexpected file ${file}`);
    failed = true;
    continue;
  }
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
