// The homepage and /press keep nothing and load nothing from elsewhere (plan § Tests, AC 5): every
// request stays on the site, no cookie, no storage, no service worker, every resource same-origin, and the
// only links out are the App Store listing and the press address once they exist.
import { expect, STORAGE_WATCH, test } from './support';
import { expected } from './launch-state';

for (const path of ['/', '/press']) {
  test(`${path}: every request stays on the site; nothing is stored`, async ({ page, context, log, baseURL }) => {
    await context.addInitScript(STORAGE_WATCH);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    // Scroll to the end so lazy images would load, then wait for the browser to be idle.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');
    const urls = log.map((r) => r.url).filter((u) => !u.startsWith('about:'));
    expect(urls.length).toBeGreaterThan(1);
    expect(urls.filter((u) => !u.startsWith(`${baseURL}/`)), 'requests that leave the site').toEqual([]);
    expect(await context.cookies(), 'cookies').toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __storage: string[] }).__storage)).toEqual([]);
    expect(await page.evaluate(async () => (await indexedDB.databases?.())?.length ?? 0)).toBe(0);
    expect(await page.evaluate(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0))).toBe(0);
  });

  test(`${path}: every resource is the site's own; the only links out are the listing and the press address`, async ({ page }) => {
    await page.goto(path);
    const resources = await page.evaluate(() =>
      [...document.querySelectorAll('link:not([rel="canonical"]), img, video, source, audio, track, iframe, embed, object, script')].flatMap((el) =>
        ['href', 'src', 'poster', 'srcset', 'data'].map((a) => el.getAttribute(a)).filter((v): v is string => v !== null),
      ),
    );
    expect(resources.length).toBeGreaterThan(2);
    for (const r of resources) expect(r.startsWith('/') && !r.startsWith('//'), r).toBe(true);
    const out = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? '').filter((h) => !h.startsWith('/') && !h.startsWith('#')));
    // The badge sits on both pages; the press address only on /press. Before launch there is no link out.
    const want = [expected.badge.kind === 'apple' ? expected.badge.href : null, path === '/press' ? expected.contact.href : null].filter((h): h is string => h !== null);
    expect([...new Set(out)].sort()).toEqual(want.sort());
  });
}
