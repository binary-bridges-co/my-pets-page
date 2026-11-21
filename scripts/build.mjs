// Builds dist/ (DESIGN §2): first the homepage and /press with Astro (site/), then the card page, the
// 404 notice, the hashed script and stylesheet, and the host files. Nothing here reaches the network:
// Astro's telemetry is off before Astro is loaded.
//   node scripts/build.mjs [--host=cloudflare|github-pages] [--config=production|development|test] [--launch=fixture]
// --launch=fixture builds the homepage in its released launch state with the test media in dist/fixture/,
// for CI only (site/src/config/launch.ts). PETS_LAUNCH comes from this flag alone.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.env.ASTRO_TELEMETRY_DISABLED = '1';

const root = new URL('../', import.meta.url);
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const host = arg('host', 'cloudflare');
const configName = arg('config', 'production');
const launch = arg('launch', '');
if (!['cloudflare', 'github-pages'].includes(host)) throw new Error(`unknown host ${host}`);
if (!['', 'fixture'].includes(launch)) throw new Error(`unknown launch ${launch}: only --launch=fixture`);
if (launch === 'fixture') process.env.PETS_LAUNCH = 'fixture';
else delete process.env.PETS_LAUNCH;
// The homepage layout emits its CSP as a meta tag on GitHub Pages, as the card page does.
process.env.PETS_HOST = host;

const config = JSON.parse(readFileSync(new URL(`config/${configName}.json`, root), 'utf8'));
for (const key of ['containerId', 'environment', 'apiToken']) {
  if (typeof config[key] !== 'string' || config[key] === '') throw new Error(`config/${configName}.json: ${key} is missing`);
}
if (!/^iCloud\.[A-Za-z0-9.-]+$/.test(config.containerId)) throw new Error('containerId');
if (!['production', 'development'].includes(config.environment)) throw new Error('environment');
if (!/^[A-Za-z0-9]+$/.test(config.apiToken)) throw new Error('apiToken: letters and digits only');

const dist = new URL('dist/', root);
rmSync(dist, { recursive: true, force: true });

// The homepage first: Astro owns and empties its outDir. It writes index.html, press.html, sitemap.xml,
// robots.txt, _astro/ and site/public/; everything below is the card build's, guarded against collisions.
const astro = await import('astro');
await astro.build({ root: fileURLToPath(new URL('site/', root)), outDir: fileURLToPath(dist), logLevel: 'warn' });

/** Fails the build if Astro already wrote a path the card build owns. */
function guard(file) {
  if (existsSync(file)) throw new Error(`build: Astro wrote ${fileURLToPath(file)}, which the card build owns`);
}
guard(new URL('assets/', dist));
mkdirSync(new URL('assets/', dist), { recursive: true });

const common = { bundle: true, minify: true, legalComments: 'none', logLevel: 'warning', write: false };
const js = await build({
  ...common,
  entryPoints: [fileURLToPath(new URL('src/page.ts', root))],
  format: 'iife',
  // BigInt (Ed25519) needs ES2020: Safari 14, Chrome 67, Firefox 68.
  target: ['es2020'],
  alias: { '@noble/ed25519': fileURLToPath(new URL('vendor/noble-ed25519/index.js', root)) },
  define: { __CLOUDKIT__: JSON.stringify(config) },
});
const css = await build({
  ...common,
  entryPoints: [fileURLToPath(new URL('src/page.css', root))],
  target: ['safari14', 'chrome90', 'firefox90'],
});

function hashed(name, ext, bytes) {
  const file = `${name}.${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.${ext}`;
  guard(new URL(`assets/${file}`, dist));
  writeFileSync(new URL(`assets/${file}`, dist), bytes);
  return file;
}
const jsFile = hashed('page', 'js', js.outputFiles[0].contents);
const cssFile = hashed('page', 'css', css.outputFiles[0].contents);

const strings = {
  en: JSON.parse(readFileSync(new URL('src/strings/en.json', root), 'utf8')),
  es: JSON.parse(readFileSync(new URL('src/strings/es.json', root), 'utf8')),
};
const escape = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; " +
  'connect-src https://api.apple-cloudkit.com; font-src \'none\'; form-action \'none\'; frame-ancestors \'none\'; ' +
  "base-uri 'none'; object-src 'none'; manifest-src 'none'; require-trusted-types-for 'script'; trusted-types 'none'";

// GitHub Pages sets no headers, so the CSP goes in a meta tag, which can't carry frame-ancestors.
const metaCsp =
  host === 'github-pages'
    ? `<meta http-equiv="Content-Security-Policy" content="${CSP.replace("frame-ancestors 'none'; ", '')}">\n`
    : '';

function page(template, vars = {}) {
  const text = readFileSync(new URL(`src/html/${template}`, root), 'utf8');
  return text.replace(/\{\{(?:(en|es):)?([a-zA-Z.]+)\}\}/g, (whole, lang, key) => {
    if (lang) {
      const value = key === 'message' ? strings[lang][vars.message] : strings[lang][key];
      if (value === undefined) throw new Error(`${template}: no string ${lang}:${key}`);
      return escape(value);
    }
    if (key === 'css') return cssFile;
    if (key === 'js') return jsFile;
    if (key === 'csp') return metaCsp;
    if (key === 'state') return vars.state;
    throw new Error(`${template}: unknown ${whole}`);
  });
}

function write(path, text) {
  const file = new URL(path, dist);
  guard(file);
  mkdirSync(new URL('./', file), { recursive: true });
  writeFileSync(file, text);
}

const pageHtml = page('page.html');
write('p/index.html', pageHtml);
// GitHub Pages has no rewrites: every unknown path, /p/<id> included, gets 404.html, so there it is the page.
write('404.html', host === 'github-pages' ? pageHtml : page('notice.html', { message: 'notATag', state: 'not-a-tag' }));
write('.nojekyll', '');
// The host files. Cloudflare Pages and Netlify need _headers (the CSP lives there) and _redirects.
for (const file of ['_headers', '_redirects', '.well-known/apple-app-site-association']) {
  const source = new URL(`src/host/${file}`, root);
  if (existsSync(source)) write(file, readFileSync(source));
  else if (host === 'cloudflare' && file === '_headers') throw new Error(`src/host/${file} is missing`);
}
// The launch fixture's media, in the fixture build only (site/src/config/launch.ts FIXTURE_DIR).
if (launch === 'fixture') {
  const target = new URL('fixture/', dist);
  guard(target);
  mkdirSync(target);
  for (const f of ['screenshot.png', 'poster.png', 'preview.mp4']) cpSync(new URL(`test/fixtures/site/${f}`, root), new URL(f, target));
}
console.log(`build: dist/ for ${host} (${configName}${launch ? `, launch ${launch}` : ''}): assets/${jsFile}, assets/${cssFile}`);
