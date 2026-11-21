// The Help, Privacy and Terms pages in English and Spanish (issues 9 and 11): no axe violation at 320 and
// 1024 px in both themes, one h1 and no skipped heading level, the page's language and its hreflang
// twins, a language link that leads to the twin, links between the three pages and from the footer,
// nothing sideways at 320 px, and nothing loaded or kept from anywhere else. Assertions only.
import AxeBuilder from '@axe-core/playwright';
import { expect, STORAGE_WATCH, test } from './support';

const PAGES = [
  { path: '/help', lang: 'en', twin: '/es/help' },
  { path: '/privacy', lang: 'en', twin: '/es/privacy' },
  { path: '/terms', lang: 'en', twin: '/es/terms' },
  { path: '/es/help', lang: 'es', twin: '/help' },
  { path: '/es/privacy', lang: 'es', twin: '/privacy' },
  { path: '/es/terms', lang: 'es', twin: '/terms' },
] as const;
const SITE = 'https://pets.binarybridges.co';

for (const scheme of ['light', 'dark'] as const) {
  test(`no axe violations at 320 and 1024 px (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [320, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      for (const { path } of PAGES) {
        await page.goto(path);
        const result = await new AxeBuilder({ page }).analyze();
        expect(result.passes.length, `axe ran on ${path}`).toBeGreaterThan(10);
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`), `${path} at ${width} px (${scheme})`).toEqual([]);
        const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
        expect(overflow, `${path} at ${width} px scrolls sideways`).toBe(0);
      }
    }
  });
}

test('each page: its language, one h1, no skipped level, landmarks, hreflang twins and the language link', async ({ page }) => {
  for (const { path, lang, twin } of PAGES) {
    await page.goto(path);
    await expect(page.locator('html'), path).toHaveAttribute('lang', lang);
    const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((hs) => hs.map((h) => Number(h.tagName[1])));
    expect(levels[0], path).toBe(1);
    expect(levels.filter((l) => l === 1), path).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) expect((levels[i] as number) - (levels[i - 1] as number), `${path}: h${levels[i - 1]} then h${levels[i]}`).toBeLessThanOrEqual(1);
    for (const landmark of ['header', 'main', 'footer']) await expect(page.locator(landmark), `${path} ${landmark}`).toHaveCount(1);
    await expect(page.locator('title'), path).not.toBeEmpty();
    expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length ?? 0, path).toBeGreaterThan(40);

    const en = lang === 'en' ? path : twin;
    const es = lang === 'es' ? path : twin;
    await expect(page.locator('link[rel="canonical"]'), path).toHaveAttribute('href', `${SITE}${path}`);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]'), path).toHaveAttribute('href', `${SITE}${en}`);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]'), path).toHaveAttribute('href', `${SITE}${es}`);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]'), path).toHaveAttribute('href', `${SITE}${en}`);

    const other = lang === 'en' ? 'es' : 'en';
    const switcher = page.locator(`main a[hreflang="${other}"][lang="${other}"]`);
    await expect(switcher, path).toHaveCount(1);
    await expect(switcher, path).toHaveText(other === 'es' ? 'Español' : 'English');
    await switcher.click();
    await expect(page, path).toHaveURL(new RegExp(`${twin}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', other);
  }
});

test('the footer of every site page links Help, Privacy and Terms in its language', async ({ page }) => {
  for (const [path, lang] of [['/', 'en'], ['/press', 'en'], ...PAGES.map((p) => [p.path, p.lang])] as const) {
    await page.goto(path);
    const hrefs = await page.locator('footer a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    const prefix = lang === 'es' ? '/es' : '';
    for (const name of ['help', 'privacy', 'terms']) expect(hrefs, `${path} footer`).toContain(`${prefix}/${name}`);
    for (const box of await page.locator('footer a').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(24);
  }
});

test('the privacy page shows its effective date and the support address; no placeholder anywhere', async ({ page }) => {
  for (const { path } of PAGES) {
    await page.goto(path);
    expect(await page.locator('main').innerText(), path).not.toContain('{{');
  }
  await page.goto('/privacy');
  await expect(page.locator('main')).toContainText(/Effective [A-Z][a-z]+ \d{1,2}, \d{4}\./);
  await expect(page.locator('main a[href="mailto:support@binarybridges.co"]').first()).toBeVisible();
  await page.goto('/es/privacy');
  await expect(page.locator('main')).toContainText(/Vigente desde el \d{1,2} de [a-z]+ de \d{4}\./);
});

for (const { path } of PAGES) {
  test(`${path}: every request stays on the site; nothing is stored; no script`, async ({ page, context, log, baseURL }) => {
    await context.addInitScript(STORAGE_WATCH);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const urls = log.map((r) => r.url).filter((u) => !u.startsWith('about:'));
    expect(urls.length).toBeGreaterThan(1);
    expect(urls.filter((u) => !u.startsWith(`${baseURL}/`)), 'requests that leave the site').toEqual([]);
    expect(await context.cookies(), 'cookies').toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __storage: string[] }).__storage)).toEqual([]);
    await expect(page.locator('script')).toHaveCount(0);
    const resources = await page.evaluate(() =>
      [...document.querySelectorAll('link:not([rel="canonical"]):not([rel="alternate"]), img, source, script, iframe')].flatMap((el) =>
        ['href', 'src', 'srcset'].map((a) => el.getAttribute(a)).filter((v): v is string => v !== null),
      ),
    );
    for (const r of resources) expect(r.startsWith('/') && !r.startsWith('//'), r).toBe(true);
  });
}
