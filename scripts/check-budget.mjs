// The weight budget of DESIGN §7, gzipped, over the built dist/. Two sections:
// - the card page: every card HTML page, its one stylesheet and its one script, under their old numbers;
// - the homepage: index.html, press.html and the Help, Privacy and Terms pages (English at the root,
//   Spanish under es/), the Astro stylesheets, no script at all, at most two fonts,
//   the known images, and in a fixture build only (--launch=fixture) the fixture media.
// Fails over any of them, on any unexpected file, and prints the sizes.
//   node scripts/check-budget.mjs [--launch=fixture]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = new URL('../dist/', import.meta.url);
const KB = 1024;
const fixture = process.argv.includes('--launch=fixture');

const CARD = { html: 4 * KB, css: 6 * KB, js: 20 * KB };
const HOME = { html: 16 * KB, css: 15 * KB, fonts: 80 * KB, fontFiles: 2 };
// Raw bytes (images and video are already compressed). Real screenshots and the video get their own rows.
const MEDIA = {
  'icon.svg': 2 * KB,
  'icon-dark.svg': 2 * KB,
  'badges/download-on-the-app-store-black.svg': 16 * KB,
  'badges/download-on-the-app-store-white.svg': 16 * KB,
};
const FIXTURE_MEDIA = { 'fixture/screenshot.png': 30 * KB, 'fixture/poster.png': 30 * KB, 'fixture/preview.mp4': 60 * KB };
const LEGAL = ['help.html', 'privacy.html', 'terms.html'];
const ROOT_FILES = ['index.html', 'press.html', ...LEGAL, '404.html', 'sitemap.xml', 'robots.txt', '.nojekyll', '_headers', '_redirects', 'icon.svg', 'icon-dark.svg'];
const ROOT_DIRS = ['p', 'assets', '.well-known', '_astro', 'badges', 'es', ...(fixture ? ['fixture'] : [])];

let failed = false;
const fail = (message) => {
  console.error(`budget: ${message}`);
  failed = true;
};
const gz = (file) => gzipSync(readFileSync(new URL(file, dist)), { level: 9 }).length;
function row(file, size, budget, unit = 'gzipped') {
  const ok = size <= budget;
  if (!ok) failed = true;
  console.log(`budget: ${file} ${size} B ${unit}, budget ${budget} B${ok ? '' : '  OVER'}`);
}

if (!existsSync(dist)) {
  console.error('budget: dist/ is missing: run `npm run build` first');
  process.exit(1);
}
if (existsSync(new URL('fixture/', dist)) !== fixture) {
  console.error(`budget: dist/ is ${fixture ? 'not a fixture build: run node scripts/build.mjs --launch=fixture first' : 'a fixture build: add --launch=fixture'}`);
  process.exit(1);
}

// The card page (unchanged numbers). The CSP is in _headers (Cloudflare, Netlify) or, for GitHub Pages,
// in a meta tag of the page.
const headersFile = new URL('_headers', dist);
const csp = existsSync(headersFile) ? readFileSync(headersFile, 'utf8') : readFileSync(new URL('p/index.html', dist), 'utf8');
if (!/Content-Security-Policy("|: ).*require-trusted-types-for 'script'/.test(csp)) fail('the built page has no CSP with Trusted Types');
const seen = { css: 0, js: 0 };
for (const file of ['p/index.html', '404.html']) row(file, gz(file), CARD.html);
for (const f of readdirSync(new URL('assets/', dist))) {
  const kind = f.endsWith('.js') ? 'js' : f.endsWith('.css') ? 'css' : 'other';
  if (kind === 'other') {
    fail(`unexpected file assets/${f}`);
    continue;
  }
  seen[kind]++;
  row(`assets/${f}`, gz(`assets/${f}`), CARD[kind]);
}
if (seen.js !== 1 || seen.css !== 1) fail(`expected one script and one stylesheet, found ${seen.js} and ${seen.css}`);

// The homepage.
for (const file of ['index.html', 'press.html', ...LEGAL, ...LEGAL.map((f) => `es/${f}`)]) {
  if (!existsSync(new URL(file, dist))) fail(`${file} is missing`);
  else row(file, gz(file), HOME.html);
}
for (const f of readdirSync(new URL('es/', dist))) if (!LEGAL.includes(f)) fail(`unexpected file es/${f}`);
let css = 0;
let fonts = 0;
let fontFiles = 0;
for (const f of readdirSync(new URL('_astro/', dist))) {
  const size = statSync(new URL(`_astro/${f}`, dist)).size;
  if (f.endsWith('.css')) css += gz(`_astro/${f}`);
  else if (f.endsWith('.woff2')) {
    fonts += size;
    fontFiles++;
  } else if (f.endsWith('.js')) fail(`_astro/${f}: the homepage ships no script`);
  else fail(`unexpected file _astro/${f}`);
}
row('_astro/*.css', css, HOME.css);
row('_astro/*.woff2', fonts, HOME.fonts, 'raw');
if (fontFiles > HOME.fontFiles) fail(`${fontFiles} font files, at most ${HOME.fontFiles}`);
for (const [file, budget] of Object.entries({ ...MEDIA, ...(fixture ? FIXTURE_MEDIA : {}) })) {
  if (!existsSync(new URL(file, dist))) fail(`${file} is missing`);
  else row(file, statSync(new URL(file, dist)).size, budget, 'raw');
}
for (const dir of ['badges', ...(fixture ? ['fixture'] : [])]) {
  for (const f of readdirSync(new URL(`${dir}/`, dist))) if (!(`${dir}/${f}` in { ...MEDIA, ...FIXTURE_MEDIA })) fail(`unexpected file ${dir}/${f}`);
}

// Nothing else at the root.
for (const f of readdirSync(dist)) {
  const isDir = statSync(new URL(f, dist)).isDirectory();
  if (isDir ? !ROOT_DIRS.includes(f) : !ROOT_FILES.includes(f)) fail(`unexpected ${isDir ? 'folder' : 'file'} ${f} at the root of dist/`);
}
if (failed) process.exit(1);
