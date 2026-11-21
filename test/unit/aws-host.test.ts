// The AWS host (docs/DESIGN.md §10): the CloudFront configuration derived from src/host/_headers and
// _redirects, the viewer-request function's routing, the upload plan and the deploy commands. The whole
// contract (scripts/check-headers.mjs) also runs against the generated configuration: npm run check:aws.
// Runs from the repository root (npm test).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import { commands, groups } from '../../scripts/aws/deploy.mjs';
import { bodySha, extract, functionCode, generatedText, render } from '../../scripts/aws/render.mjs';
import { effective, MAX_BEHAVIORS, MAX_POLICIES, model, parseHeaders, parseRewrites, servedAt, uploadPlan } from '../../scripts/aws/rules.mjs';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const rules = parseHeaders(read('src/host/_headers'));
const rewrites = parseRewrites(read('src/host/_redirects'));
const source = read('scripts/aws/viewer-request.js');
const committed = read('aws/cloudfront.generated.yml');
// The HTML pages the committed file routes; npm run build -- --host=aws and npm run check:aws check them against dist/.
const data = /var DATA = (\{.*\});/.exec(committed);
assert.ok(data, 'aws/cloudfront.generated.yml has the function DATA line');
const pages: string[] = JSON.parse(data[1]!).pages;
const m = model(rules, rewrites, pages);

// The scripts are plain JavaScript (allowJs, not type-checked): their results are read loosely here.
type Loose = Record<string, any>;
type Headers = Record<string, string>;
const headersOf = (set: Loose): Headers => Object.fromEntries((set.headers as string[][]).map(([n, v]) => [n!.toLowerCase(), v!]));
/** What the response headers policy of the first matching behaviour sends (Content-Type is the object's). */
const policyFor = (path: string): Headers => {
  const glob = (p: string) => new RegExp(`^${p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
  const slug = (m.behaviors as Loose[]).find((b) => glob(b.pathPattern).test(path))?.policy ?? m.defaultBehavior.policy;
  const policy = (m.policies as Loose[]).find((p) => p.slug === slug)!;
  return headersOf(policy.set);
};
const CARD_CSP = /connect-src https:\/\/api\.apple-cloudkit\.com;/;
const HOME_CSP = /script-src 'none'; .*connect-src 'none';/;

test('the committed CloudFront blocks are current with _headers, _redirects and the function source', () => {
  assert.equal(generatedText(m, functionCode(pages, rewrites, source)), committed, 'run npm run build && npm run gen:aws');
  const blocks: Loose = extract(committed);
  for (const name of ['resources', 'behaviors']) {
    assert.ok(blocks[name], `${name} block`);
    assert.equal(bodySha(blocks[name].body), blocks[name].sha, `${name}: the marker carries its body's SHA-256`);
  }
});

test('every path gets the headers Pages sends it (the policy of the first matching behaviour)', () => {
  const paths = ['/', '/press', '/help', '/es/privacy', '/p/7KQ2-MX9F', '/p/', '/assets/page.abc.js', '/_astro/x.css', '/sitemap.xml', '/robots.txt', '/.well-known/apple-app-site-association', '/not-a-page', '/press/', '/index.html', '/404.html', '/icon.svg'];
  for (const path of paths) {
    const pages = headersOf(effective(rules, path));
    delete pages['content-type'];
    assert.deepEqual(policyFor(path), pages, path);
    assert.equal(policyFor(path)['content-type'], undefined, `${path}: no policy sets Content-Type`);
  }
});

test('the card, the homepage and the 404 get the right CSP, robots and cache rules', () => {
  assert.match(policyFor('/p/abc')['content-security-policy']!, CARD_CSP);
  assert.equal(policyFor('/p/abc')['cache-control'], 'no-cache');
  assert.equal(policyFor('/p/abc')['x-robots-tag'], 'noindex, nofollow, noarchive');
  for (const path of ['/', '/press', '/help', '/privacy', '/terms', '/es/help', '/es/privacy', '/es/terms']) {
    assert.match(policyFor(path)['content-security-policy']!, HOME_CSP, path);
    assert.equal(policyFor(path)['x-robots-tag'], undefined, path);
    assert.equal(policyFor(path)['cache-control'], 'no-cache', path);
  }
  // An unknown path is answered with /404.html and the headers of the behaviour it matched: the `/*` rule's.
  assert.match(policyFor('/not-a-page')['content-security-policy']!, CARD_CSP);
  assert.equal(policyFor('/not-a-page')['strict-transport-security'], 'max-age=31536000; includeSubDomains');
  assert.equal(policyFor('/assets/x.js')['cache-control'], 'public, max-age=31536000, immutable');
  assert.equal(policyFor('/robots.txt')['x-robots-tag'], undefined);
});

test('the distribution fits CloudFront quotas and only file-only behaviours skip the function', () => {
  assert.ok(m.behaviors.length <= MAX_BEHAVIORS);
  assert.ok(m.policies.length <= MAX_POLICIES);
  assert.equal((m.behaviors as Loose[]).at(-1)?.pathPattern, '/?*', 'the catch-all comes last, before the default');
  const skip = (m.behaviors as Loose[]).filter((b) => !b.functions).map((b) => b.pathPattern as string);
  assert.deepEqual(skip.sort(), ['/.well-known/apple-app-site-association', '/_astro/*', '/assets/*', '/robots.txt', '/sitemap.xml']);
});

test('the generator refuses what CloudFront cannot express', () => {
  // Nested splats are fine (the longer one comes first and carries both); crossing ones are not.
  assert.doesNotThrow(() => model(parseHeaders('/*\n  X-A: 1\n/p/*\n  X-B: 2\n/p/x/*\n  X-C: 3\n'), [], []));
  assert.throws(() => model(parseHeaders('/*\n  X-A: 1\n/a/*\n  X-B: 2\n/*/b\n  X-C: 3\n'), [], []), /one behaviour per path/);
  assert.throws(() => model(parseHeaders('/*\n  X-A: 1\n/:id\n  X-B: 2\n'), [], []), /can't express/);
  assert.throws(() => parseRewrites('/a  /b  301\n'), /only 200 rewrites/);
  const bad = model(parseHeaders('/*\n  Strict-Transport-Security: max-age=1;includeSubDomains\n'), [], []);
  assert.throws(() => render(bad, 'var DATA = { pages: [], rewrites: [] };'), /Strict-Transport-Security/);
});

// The function exactly as deployed, run the way CloudFront calls it.
const handler = vm.runInNewContext(`${functionCode(pages, rewrites, source)}\n;handler`, {}) as (event: unknown) => {
  uri?: string;
  statusCode?: number;
  headers?: { location: { value: string } };
};
const call = (uri: string, querystring: Record<string, { value: string }> = {}) => handler({ version: '1.0', context: { eventType: 'viewer-request' }, request: { method: 'GET', uri, querystring, headers: {}, cookies: {} } });

test('the function rewrites every tag link to the card page with status 200', () => {
  for (const uri of ['/p/7KQ2-MX9F-41RZ-8VT2-NHC9', '/p/7kq2-mx9f', '/p/', '/p/a/b', '/p/index.html']) assert.equal(call(uri).uri, '/p/index.html', uri);
});

test('the function serves clean URLs and redirects every other spelling with 308, as Pages does', () => {
  const serves: [string, string][] = [
    ['/', '/index.html'],
    ['/press', '/press.html'],
    ['/help', '/help.html'],
    ['/es/terms', '/es/terms.html'],
  ];
  for (const [uri, file] of serves) assert.equal(call(uri).uri, file, uri);
  const redirects: [string, string][] = [
    ['/press/', '/press'],
    ['/press.html', '/press'],
    ['/index.html', '/'],
    ['/index', '/'],
    ['/help.html', '/help'],
    ['/privacy/', '/privacy'],
    ['/es/terms.html', '/es/terms'],
    ['/es/help/', '/es/help'],
    ['/p', '/p/'],
  ];
  for (const [uri, to] of redirects) {
    const out = call(uri);
    assert.equal(out.statusCode, 308, uri);
    assert.equal(out.headers?.location.value, to, uri);
  }
  assert.equal(call('/press.html', { ref: { value: 'x' } }).headers?.location.value, '/press?ref=x', 'the query string is kept');
});

// Security review of #13 (HIGH): no redirect may leave the site. A Location that starts with `//` or `/\`
// is another host to a browser.
const SAME_SITE = /^\/(?![/\\])/;

test('the function never redirects off the site: hostile spellings end as the 404 page', () => {
  for (const uri of ['//evil.example/index', '//evil.example/index/', '/\\evil.example/index', '/%2f%2fevil.example/x', '/%5Cevil.example/x', '/%2F/evil.example/index', '/p/%5c', '/a\\b']) {
    const out = call(uri);
    assert.equal(out.statusCode, undefined, `${uri}: no redirect`);
    assert.equal(out.uri, uri, `${uri}: passed through unchanged, so S3 misses and the 404 page answers`);
  }
});

test('repeated slashes never reach a Location', () => {
  const out = call('/a//b/');
  assert.ok(out.statusCode === undefined || SAME_SITE.test(out.headers!.location.value), '/a//b/');
  for (const uri of ['/es//help/', '/press//', '/es//terms.html', '/index//']) {
    const o = call(uri);
    if (o.statusCode !== undefined) {
      assert.match(o.headers!.location.value, SAME_SITE, uri);
      assert.ok(!o.headers!.location.value.includes('//'), `${uri}: ${o.headers!.location.value}`);
    }
  }
  const q = call('/press.html', { next: { value: '//evil.example' } });
  assert.equal(q.headers?.location.value, '/press?next=//evil.example', 'a query string stays after a same-site path');
  assert.match(q.headers!.location.value, SAME_SITE);
});

test('every redirect the function can produce stays on the site', () => {
  const words = ['', 'index', 'index.html', 'press', 'press.html', 'p', 'es', 'help', 'help.html', 'evil.example', '\\', '%2f', '%5c', '.', '..'];
  const uris = new Set<string>();
  for (const a of words) for (const b of words) for (const sep of ['/', '//']) {
    uris.add(`/${a}${sep}${b}`);
    uris.add(`/${a}${sep}${b}/`);
    uris.add(`//${a}/${b}`);
  }
  for (const page of pages) for (const form of [page, page.replace(/\.html$/, ''), page.replace(/\.html$/, '/'), page.replace(/index\.html$/, 'index/')]) uris.add(form);
  let redirects = 0;
  for (const uri of uris) {
    const out = call(uri, { q: { value: '1' } });
    if (out.statusCode === undefined) continue;
    redirects++;
    assert.equal(out.statusCode, 308, uri);
    assert.match(out.headers!.location.value, SAME_SITE, `${uri} -> ${out.headers!.location.value}`);
  }
  assert.ok(redirects > 20, `the corpus exercised ${redirects} redirects`);
});

test('the function passes files, unknown paths and the error page through unchanged', () => {
  for (const uri of ['/not-a-page', '/es/', '/icon.svg', '/404.html', '/assets/page.abc.js', '/.well-known/apple-app-site-association']) assert.equal(call(uri).uri, uri, uri);
});

test('the upload plan: content types, the AASA as application/json, Cache-Control from the served address', () => {
  const keys = ['_headers', '_redirects', '.nojekyll', '.well-known/apple-app-site-association', 'index.html', 'p/index.html', '404.html', 'press.html', 'assets/page.abc.js', '_astro/a.css', '_astro/f.woff2', 'sitemap.xml', 'robots.txt', 'icon.svg'];
  const plan = new Map<string, Loose>((uploadPlan(keys, rules) as Loose[]).map((o) => [o.key, o]));
  assert.equal(plan.has('_headers') || plan.has('_redirects') || plan.has('.nojekyll'), false, 'host files are never uploaded');
  assert.deepEqual(plan.get('.well-known/apple-app-site-association'), { key: '.well-known/apple-app-site-association', contentType: 'application/json', cacheControl: 'max-age=3600' });
  assert.deepEqual(plan.get('p/index.html'), { key: 'p/index.html', contentType: 'text/html; charset=utf-8', cacheControl: 'no-cache' });
  assert.deepEqual(plan.get('press.html'), { key: 'press.html', contentType: 'text/html; charset=utf-8', cacheControl: 'no-cache' });
  assert.equal(plan.get('404.html')?.cacheControl, null);
  assert.equal(plan.get('assets/page.abc.js')?.contentType, 'application/javascript');
  assert.equal(plan.get('_astro/f.woff2')?.contentType, 'font/woff2');
  assert.throws(() => uploadPlan(['notes.md'], rules), /no content type/);
  assert.equal(servedAt('es/help.html'), '/es/help');
  assert.equal(servedAt('p/index.html'), '/p/');
});

test('the deploy uploads hashed files first and HTML last, then prunes and invalidates /*', () => {
  const plan = uploadPlan(['index.html', 'assets/page.abc.js', 'icon.svg', '.well-known/apple-app-site-association'], rules);
  const order = groups(plan).map((g: { keys: string[] }) => g.keys.join());
  assert.deepEqual(order, ['assets/page.abc.js', '.well-known/apple-app-site-association', 'icon.svg', 'index.html']);
  const c = commands(plan, { dist: 'dist/', bucket: 'production-mypets-page', distribution: 'E1ABCDEF2GHIJ' });
  const aasa = (c.uploads as string[][]).find((u) => u.includes('.well-known/apple-app-site-association'))!;
  assert.deepEqual(aasa.slice(aasa.indexOf('--content-type')), ['--content-type', 'application/json', '--cache-control', 'max-age=3600']);
  assert.ok((c.uploads as string[][]).every((u) => u.includes('--no-guess-mime-type')));
  assert.deepEqual(c.prune.slice(0, 6), ['s3', 'sync', 'dist/', 's3://production-mypets-page/', '--delete', '--size-only']);
  assert.ok(c.invalidate.includes('/*'));
  assert.throws(() => commands(plan, { dist: 'dist/', bucket: 'Bad_Bucket', distribution: 'E1ABCDEF2GHIJ' }), /bucket/);
  assert.throws(() => commands(plan, { dist: 'dist/', bucket: 'production-mypets-page', distribution: 'x; rm -rf' }), /distribution/);
});
