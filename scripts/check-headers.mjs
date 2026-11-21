// Checks what a deployed (or locally previewed) site answers (docs/DESIGN.md §8–§10): the headers on
// the card page, the homepage, /press, their assets and the AASA file, the AASA's exact JSON with status
// 200 and no redirect, the 200 rewrite of /p/<id>, the 404 for anything else, the sitemap and robots.txt,
// and the clean-URL redirects that keep one copy of each page.
//   node scripts/check-headers.mjs                 # builds nothing; serves dist/ with scripts/preview.mjs
//   node scripts/check-headers.mjs https://my-pets-page.pages.dev   # a preview or production, at go-live
//   add --launch=fixture after a `node scripts/build.mjs --launch=fixture` build: also the fixture media
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ID = '7KQ2-MX9F-41RZ-8VT2-NHC9';
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src https://api.apple-cloudkit.com; " +
  "font-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; manifest-src 'none'; " +
  "require-trusted-types-for 'script'; trusted-types 'none'";
const EVERY = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'permissions-policy': 'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  'content-security-policy': CSP,
};
// The homepage and /press (docs/DESIGN.md §8): no script at all, same-origin styles, fonts, images and
// media, and indexable (no X-Robots-Tag). Every other common header is the card's.
const HOME_CSP =
  "default-src 'none'; script-src 'none'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'none'; " +
  "form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; manifest-src 'none'; " +
  "require-trusted-types-for 'script'; trusted-types 'none'";
const HOME = { ...EVERY, 'content-security-policy': HOME_CSP, 'cache-control': 'no-cache' };
delete HOME['x-robots-tag'];
const IMMUTABLE = 'public, max-age=31536000, immutable';
const TYPE = { css: /^text\/css/, woff2: /^font\/woff2/, svg: /^image\/svg\+xml/, png: /^image\/png/, mp4: /^video\/mp4/ };
const FIXTURE_MEDIA = ['/fixture/preview.mp4', '/fixture/poster.png', '/fixture/screenshot.png'];
const AASA = { applinks: { details: [{ appIDs: ['9JB56TN367.co.binarybridges.pets'], components: [{ '/': '/p/*', comment: 'collar tag and lost page' }] }] } };
// Headers no response may carry: nothing sets a cookie or opens the site to other origins.
const NEVER = ['set-cookie', 'access-control-allow-origin'];

const failures = [];
let checks = 0;
function expect(ok, what) {
  checks++;
  if (!ok) failures.push(what);
}

async function get(base, path) {
  const res = await fetch(new URL(path, base), { redirect: 'manual' });
  return { res, body: await res.text() };
}

function headers(path, res, extra, base = EVERY) {
  for (const [name, want] of Object.entries({ ...base, ...extra })) {
    const got = res.headers.get(name);
    expect(got === want, `${path}: ${name} is ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
  for (const name of NEVER) expect(!res.headers.has(name), `${path}: has ${name}`);
}

async function check(base) {
  const page = await get(base, `/p/${ID}`);
  expect(page.res.status === 200, `/p/<id>: status ${page.res.status}, want 200 (a rewrite, not a redirect)`);
  expect(/^text\/html/.test(page.res.headers.get('content-type') ?? ''), '/p/<id>: not text/html');
  expect(page.body.includes('id="card"'), '/p/<id>: not the page');
  headers('/p/<id>', page.res, { 'cache-control': 'no-cache' });

  const lower = await get(base, `/p/${ID.toLowerCase()}`);
  expect(lower.res.status === 200 && lower.body.includes('id="card"'), '/p/<lower-case id>: not the page');

  await checkHome(base);

  const assets = page.body.match(/\/assets\/page\.[0-9a-f]{12}\.(js|css)/g) ?? [];
  expect(assets.length === 2, `/p/<id>: found ${assets.length} hashed assets, want the script and the stylesheet`);
  for (const asset of assets) {
    const a = await get(base, asset);
    expect(a.res.status === 200, `${asset}: status ${a.res.status}`);
    const type = asset.endsWith('.js') ? /javascript/ : /^text\/css/;
    expect(type.test(a.res.headers.get('content-type') ?? ''), `${asset}: content type ${a.res.headers.get('content-type')}`);
    headers(asset, a.res, { 'cache-control': 'public, max-age=31536000, immutable' });
  }
  expect((page.body.match(/\/assets\//g) ?? []).length === 2, '/p/<id>: expected one script and one stylesheet');

  const aasa = await get(base, '/.well-known/apple-app-site-association');
  expect(aasa.res.status === 200, `AASA: status ${aasa.res.status}, want 200 with no redirect`);
  expect(aasa.res.headers.get('content-type') === 'application/json', `AASA: content type ${aasa.res.headers.get('content-type')}`);
  let parsed;
  try {
    parsed = JSON.parse(aasa.body);
  } catch {
    parsed = undefined;
  }
  expect(JSON.stringify(parsed) === JSON.stringify(AASA), `AASA: body ${aasa.body.slice(0, 200)}`);
  headers('AASA', aasa.res, { 'cache-control': 'max-age=3600' });

  const missing = await get(base, '/not-a-page');
  expect(missing.res.status === 404, `/not-a-page: status ${missing.res.status}, want 404`);
  expect(missing.body.includes('This isn&#39;t a My Pets tag link.'), '/not-a-page: not the 404 notice');
  headers('/not-a-page', missing.res, {});
}

const typeOf = (path) => TYPE[path.split('.').pop()] ?? /^$/;

async function checkHome(base) {
  const own = new Set();
  for (const [path, marker] of [['/', 'Every dose on time'], ['/press', 'for the press']]) {
    const page = await get(base, path);
    expect(page.res.status === 200, `${path}: status ${page.res.status}, want 200 with no redirect`);
    expect(/^text\/html/.test(page.res.headers.get('content-type') ?? ''), `${path}: not text/html`);
    expect(page.body.includes(marker), `${path}: not the page (no "${marker}")`);
    headers(path, page.res, {}, HOME);
    expect(!page.res.headers.has('x-robots-tag'), `${path}: has x-robots-tag ${page.res.headers.get('x-robots-tag')}`);
    for (const m of page.body.matchAll(/(?:src|href|poster)="(\/[^"/][^"]*)"/g)) {
      const ref = m[1].split('#')[0];
      if (/\.(css|woff2|svg|png|mp4)$/.test(ref)) own.add(ref);
    }
  }
  const astro = [...own].filter((p) => p.startsWith('/_astro/'));
  expect(astro.some((p) => p.endsWith('.css')), 'homepage: no stylesheet under /_astro/');
  expect(astro.some((p) => p.endsWith('.woff2')), 'homepage: no font under /_astro/');
  for (const path of own) {
    const a = await get(base, path);
    expect(a.res.status === 200, `${path}: status ${a.res.status}`);
    expect(typeOf(path).test(a.res.headers.get('content-type') ?? ''), `${path}: content type ${a.res.headers.get('content-type')}`);
    if (path.startsWith('/_astro/')) headers(path, a.res, { 'cache-control': IMMUTABLE });
    else for (const name of NEVER) expect(!a.res.headers.has(name), `${path}: has ${name}`);
  }
  if (fixture) for (const path of FIXTURE_MEDIA) expect(own.has(path), `fixture build: ${path} is not referenced by / or /press`);
  else expect(![...own].some((p) => p.startsWith('/fixture/')), 'a normal build references fixture media');

  const sitemap = await get(base, '/sitemap.xml');
  expect(sitemap.res.status === 200, `/sitemap.xml: status ${sitemap.res.status}`);
  expect(/xml/.test(sitemap.res.headers.get('content-type') ?? ''), `/sitemap.xml: content type ${sitemap.res.headers.get('content-type')}`);
  expect(sitemap.body.includes('<loc>https://pets.binarybridges.co/</loc>') && sitemap.body.includes('<loc>https://pets.binarybridges.co/press</loc>'), '/sitemap.xml: lists / and /press');
  expect(!sitemap.res.headers.has('x-robots-tag'), '/sitemap.xml: has x-robots-tag');
  const robots = await get(base, '/robots.txt');
  expect(robots.res.status === 200, `/robots.txt: status ${robots.res.status}`);
  expect(/^text\/plain/.test(robots.res.headers.get('content-type') ?? ''), `/robots.txt: content type ${robots.res.headers.get('content-type')}`);
  expect(robots.body.includes('Sitemap: https://pets.binarybridges.co/sitemap.xml') && !/Disallow:\s*\S/.test(robots.body), '/robots.txt: allows all, names the sitemap');
  expect(!robots.res.headers.has('x-robots-tag'), '/robots.txt: has x-robots-tag');

  // One copy of each page: the other spellings redirect to the clean path, as Pages does.
  for (const [path, to] of [['/press/', '/press'], ['/press.html', '/press'], ['/index.html', '/']]) {
    const r = await get(base, path);
    expect([301, 308].includes(r.res.status), `${path}: status ${r.res.status}, want a permanent redirect`);
    const location = r.res.headers.get('location') ?? '';
    expect(new URL(location, base).pathname === to, `${path}: redirects to ${location}, want ${to}`);
  }
}

const fixture = process.argv.includes('--launch=fixture');

async function main() {
  let base = process.argv.slice(2).find((a) => !a.startsWith('--'));
  let server;
  if (!base) {
    const { existsSync } = await import('node:fs');
    const built = existsSync(fileURLToPath(new URL('../dist/fixture/', import.meta.url)));
    if (built !== fixture) {
      console.error(`check-headers: dist/ is ${built ? 'a fixture build: add --launch=fixture' : 'not a fixture build: run node scripts/build.mjs --launch=fixture first'}`);
      process.exit(1);
    }
    const port = 4174;
    server = spawn(process.execPath, [fileURLToPath(new URL('preview.mjs', import.meta.url)), `--port=${port}`], { stdio: ['ignore', 'pipe', 'inherit'] });
    await new Promise((resolve, reject) => {
      server.stdout.once('data', resolve);
      server.once('exit', reject);
    });
    base = `http://127.0.0.1:${port}`;
  }
  try {
    await check(base);
  } finally {
    server?.kill();
  }
  if (failures.length > 0) {
    console.error(`check-headers: ${failures.length} of ${checks} checks failed on ${base}\n${failures.join('\n')}`);
    process.exit(1);
  }
  console.log(`check-headers: ${checks} checks pass on ${base}`);
}

await main();
