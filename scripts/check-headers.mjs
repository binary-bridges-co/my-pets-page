// Checks what a deployed (or locally previewed) site answers (docs/DESIGN.md §8–§10): the headers on
// the page, the home, the assets and the AASA file, the AASA's exact JSON with status 200 and no
// redirect, the 200 rewrite of /p/<id> and the 404 for anything else.
//   node scripts/check-headers.mjs                 # builds nothing; serves dist/ with scripts/preview.mjs
//   node scripts/check-headers.mjs https://my-pets-page.pages.dev   # a preview or production, at go-live
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

function headers(path, res, extra) {
  for (const [name, want] of Object.entries({ ...EVERY, ...extra })) {
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

  const home = await get(base, '/');
  expect(home.res.status === 200, `/: status ${home.res.status}`);
  headers('/', home.res, { 'cache-control': 'no-cache' });

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

async function main() {
  let base = process.argv[2];
  let server;
  if (!base) {
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
