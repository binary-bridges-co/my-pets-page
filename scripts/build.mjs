// Builds dist/ (DESIGN §2): the page, the home and 404 notices, the hashed script and stylesheet, and
// the host files. Nothing here reaches the network.
//   node scripts/build.mjs [--host=cloudflare|github-pages] [--config=production|development|test]
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const host = arg('host', 'cloudflare');
const configName = arg('config', 'production');
if (!['cloudflare', 'github-pages'].includes(host)) throw new Error(`unknown host ${host}`);

const config = JSON.parse(readFileSync(new URL(`config/${configName}.json`, root), 'utf8'));
for (const key of ['containerId', 'environment', 'apiToken']) {
  if (typeof config[key] !== 'string' || config[key] === '') throw new Error(`config/${configName}.json: ${key} is missing`);
}
if (!/^iCloud\.[A-Za-z0-9.-]+$/.test(config.containerId)) throw new Error('containerId');
if (!['production', 'development'].includes(config.environment)) throw new Error('environment');
if (!/^[A-Za-z0-9]+$/.test(config.apiToken)) throw new Error('apiToken: letters and digits only');

const dist = new URL('dist/', root);
rmSync(dist, { recursive: true, force: true });
mkdirSync(new URL('assets/', dist), { recursive: true });

const common = { bundle: true, minify: true, legalComments: 'none', logLevel: 'warning', write: false };
const js = await build({
  ...common,
  entryPoints: [new URL('src/page.ts', root).pathname],
  format: 'iife',
  // BigInt (Ed25519) needs ES2020: Safari 14, Chrome 67, Firefox 68.
  target: ['es2020'],
  alias: { '@noble/ed25519': new URL('vendor/noble-ed25519/index.js', root).pathname },
  define: { __CLOUDKIT__: JSON.stringify(config) },
});
const css = await build({
  ...common,
  entryPoints: [new URL('src/page.css', root).pathname],
  target: ['safari14', 'chrome90', 'firefox90'],
});

function hashed(name, ext, bytes) {
  const file = `${name}.${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.${ext}`;
  writeFileSync(new URL(`assets/${file}`, dist), bytes);
  return file;
}
const jsFile = hashed('page', 'js', js.outputFiles[0].contents);
const cssFile = hashed('page', 'css', css.outputFiles[0].contents);

const strings = {
  en: JSON.parse(readFileSync(new URL('src/strings/en.json', root), 'utf8')),
  es: JSON.parse(readFileSync(new URL('src/strings/es.json', root), 'utf8')),
};
const escape = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  mkdirSync(new URL('./', file), { recursive: true });
  writeFileSync(file, text);
}

const pageHtml = page('page.html');
write('p/index.html', pageHtml);
write('index.html', page('notice.html', { message: 'home', state: 'home' }));
// GitHub Pages has no rewrites: every unknown path, /p/<id> included, gets 404.html, so there it is the page.
write('404.html', host === 'github-pages' ? pageHtml : page('notice.html', { message: 'notATag', state: 'not-a-tag' }));
write('.nojekyll', '');
for (const file of ['_headers', '_redirects', '.well-known/apple-app-site-association']) {
  try {
    write(file, readFileSync(new URL(`src/host/${file}`, root)));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
console.log(`build: dist/ for ${host} (${configName}): assets/${jsFile}, assets/${cssFile}`);
