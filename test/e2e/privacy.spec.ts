// No tracking, no storage, no third party (plan § Acceptance 1–2): every request the page makes is
// recorded; the only one that leaves the site is the lookup to CloudKit.
import { readdirSync, readFileSync } from 'node:fs';
import { expect, open, scenarios, test } from './support';

const CLOUDKIT = 'https://api.apple-cloudkit.com/';

/** Records every storage call before the page's own code runs. */
const STORAGE_WATCH = `
  window.__storage = [];
  for (const m of ['setItem', 'getItem', 'removeItem', 'clear', 'key']) {
    const f = Storage.prototype[m];
    Storage.prototype[m] = function (...a) { window.__storage.push('Storage.' + m); return f.apply(this, a); };
  }
  for (const name of ['localStorage', 'sessionStorage']) {
    const d = Object.getOwnPropertyDescriptor(window, name);
    if (d && d.get) Object.defineProperty(window, name, { get() { window.__storage.push(name); return d.get.call(window); }, configurable: true });
  }
  for (const name of ['caches', 'cookieStore', 'openDatabase']) {
    const d = Object.getOwnPropertyDescriptor(window, name) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), name);
    if (d && d.get) Object.defineProperty(window, name, { get() { window.__storage.push(name); return d.get.call(window); }, configurable: true });
  }
  if (navigator.storage) for (const m of ['persist', 'estimate', 'getDirectory']) if (navigator.storage[m]) { const f = navigator.storage[m].bind(navigator.storage); navigator.storage[m] = (...a) => { window.__storage.push('storage.' + m); return f(...a); }; }
  if (window.indexedDB) { const o = indexedDB.open.bind(indexedDB); indexedDB.open = (...a) => { window.__storage.push('indexedDB.open'); return o(...a); }; }
  const c = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  Object.defineProperty(Document.prototype, 'cookie', { get() { window.__storage.push('cookie.get'); return c.get.call(this); }, set(v) { window.__storage.push('cookie.set'); c.set.call(this, v); } });
`;

for (const [name, fragment] of [
  ['lost', 'verified'],
  ['published', undefined],
  ['notFound', 'verified'],
  ['deactivated', undefined],
  ['throttled', 'verified'],
] as const) {
  test(`${name}${fragment ? ' with a fragment' : ''}: one lookup, nothing else leaves, nothing stored`, async ({ page, context, log, baseURL }) => {
    await context.addInitScript(STORAGE_WATCH);
    // Cookies a browser might already hold for both sites: neither may be sent.
    const seeded = [
      { name: 'seen', value: 'site', url: baseURL as string },
      { name: 'seen', value: 'apple', domain: 'api.apple-cloudkit.com', path: '/', secure: true, sameSite: 'None' as const },
    ];
    await context.addCookies(seeded);
    await open(page, name, fragment);
    await page.waitForLoadState('networkidle');
    // Then wait for the browser to be idle, so a late request would be in the log.
    await page.evaluate(() => new Promise((r) => (window.requestIdleCallback ?? ((f: () => void) => f()))(() => r(undefined))));
    const fromPage = log.filter((r) => !r.url.startsWith('about:'));
    const outside = fromPage.filter((r) => !r.url.startsWith(`${baseURL}/`) && !r.url.startsWith('blob:'));
    // CORS-simple: a POST with no preflight.
    expect(outside.map((r) => `${r.method} ${r.url.split('?')[0]}`)).toEqual([`POST ${CLOUDKIT}database/1/iCloud.co.binarybridges.pets/production/public/records/lookup`]);
    const lookup = outside[0];
    const sent = (await lookup?.headers) ?? {};
    expect(sent.referer, 'no referrer').toBeUndefined();
    expect(sent.cookie, 'no cookie').toBeUndefined();
    expect(JSON.parse(lookup?.body ?? '{}')).toEqual({ records: ['', '.1', '.2', '.3', '.4', '.5', '.6', '.7'].map((s) => ({ recordName: `${scenarios[name].id}${s}` })) });
    // The page's own requests: the HTML, one stylesheet, one script, and the photo's blob: at most.
    // (WebKit reports a navigation with a fragment twice, so the paths are compared as a set. The
    // content hashes are masked before sorting, so their order doesn't depend on the hash values.)
    const own = new Set(fromPage.filter((r) => r.url.startsWith(`${baseURL}/`)).map((r) => new URL(r.url).pathname.replace(/^(\/assets\/page\.)[0-9a-f]{12}\./, '$1<hash>.')));
    expect([...own].sort()).toEqual(['/assets/page.<hash>.css', '/assets/page.<hash>.js', `/p/${scenarios[name].id}`]);
    // The fragment never leaves the page.
    const tag = fragment ? (scenarios[name].fragments as Record<string, string>)[fragment] : undefined;
    if (tag) {
      const pieces = [tag.slice(2, 40), tag.slice(-40), 'Tag Dog'];
      for (const r of fromPage) {
        const all = `${r.url} ${r.body ?? ''} ${JSON.stringify(await r.headers.catch(() => ({})))}`;
        for (const piece of pieces) expect(all).not.toContain(piece);
      }
    }
    // The page set no cookie of its own; only the seeded ones remain.
    expect((await context.cookies()).map((c) => `${c.domain} ${c.name}`).sort()).toEqual(['127.0.0.1 seen', 'api.apple-cloudkit.com seen']);
    expect(await page.evaluate(() => (window as unknown as { __storage: string[] }).__storage)).toEqual([]);
    expect(await page.evaluate(async () => (await indexedDB.databases?.())?.length ?? 0)).toBe(0);
    expect(await page.evaluate(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0))).toBe(0);
  });
}

test('every asset is the site\'s own: no third-party script, style, font or image', async ({ page, log, baseURL }) => {
  await open(page, 'lost');
  const html = await page.content();
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const v = m[1] as string;
    expect(v.startsWith('/') || v.startsWith('blob:') || v.startsWith('tel:') || v.startsWith('sms:'), v).toBe(true);
  }
  expect(log.filter((r) => /\.(js|css|woff2?|png|jpe?g|svg)(\?|$)/.test(r.url)).every((r) => r.url.startsWith(`${baseURL}/`))).toBe(true);
});

test('the built HTML and CSS load nothing from elsewhere', async () => {
  const dist = new URL('../../dist/', import.meta.url);
  const css = readdirSync(new URL('assets/', dist)).filter((f) => f.endsWith('.css')).map((f) => readFileSync(new URL(`assets/${f}`, dist), 'utf8')).join('');
  expect(css).not.toMatch(/url\(|@import/);
  for (const f of ['p/index.html', 'index.html', '404.html']) {
    const html = readFileSync(new URL(f, dist), 'utf8');
    expect(html, f).not.toMatch(/https?:|srcset|<form|<iframe|http-equiv="refresh"|<link rel="(pre|dns-)/);
  }
});

test('the built script calls nothing but the one lookup, and has no storage, timer or HTML sink', async () => {
  const dir = new URL('../../dist/assets/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
  expect(files).toHaveLength(1);
  const js = readFileSync(new URL(files[0] as string, dir), 'utf8');
  for (const banned of ['new Image', 'Worker(', 'new Function', 'window.open', 'import(', 'document.referrer', 'caches', 'cookieStore', 'BroadcastChannel', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'serviceWorker', 'document.cookie', 'setInterval', 'setTimeout', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'http://', 'importScripts', 'prefetch', 'preload']) {
    expect(js, banned).not.toContain(banned);
  }
  expect(js.match(/\bfetch\b/g)?.length ?? 0, 'fetch named once (the lookup)').toBe(1);
  expect([...new Set(js.match(/https:\/\/[a-z0-9.-]+/g) ?? [])]).toEqual(['https://api.apple-cloudkit.com']);
});

test('the CSP watch sees a violation (its own self-test)', async ({ page, csp }) => {
  await open(page, 'published');
  await page.evaluate(() => document.body.setAttribute('style', 'color: red'));
  await expect.poll(() => csp.length).toBeGreaterThan(0);
  expect(csp[0]).toMatch(/^style-src/);
  csp.length = 0;
});
