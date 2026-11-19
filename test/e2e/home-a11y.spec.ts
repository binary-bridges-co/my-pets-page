// The homepage and /press for everyone (plan § Tests, AC 7): no axe violation at 320, 1024 and 1920 px
// in both themes, one h1 and no skipped heading level, the landmarks, a visible focus, and no motion
// when the visitor asks for less.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './support';

for (const scheme of ['light', 'dark'] as const) {
  test(`no axe violations at 320, 1024 and 1920 px (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [320, 1024, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/press']) {
        await page.goto(path);
        // Open every FAQ row, so the answers are checked too.
        await page.evaluate(() => document.querySelectorAll('details').forEach((d) => d.setAttribute('open', '')));
        const result = await new AxeBuilder({ page }).analyze();
        expect(result.passes.length, `axe ran on ${path}`).toBeGreaterThan(10);
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`), `${path} at ${width} px (${scheme})`).toEqual([]);
      }
    }
  });
}

test('one h1, no skipped heading level, and the landmarks', async ({ page }) => {
  for (const path of ['/', '/press']) {
    await page.goto(path);
    const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((hs) => hs.map((h) => Number(h.tagName[1])));
    expect(levels[0], path).toBe(1);
    expect(levels.filter((l) => l === 1), path).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) expect((levels[i] as number) - (levels[i - 1] as number), `${path}: h${levels[i - 1]} then h${levels[i]}`).toBeLessThanOrEqual(1);
    for (const landmark of ['header', 'main', 'footer', 'nav']) await expect(page.locator(landmark), `${path} ${landmark}`).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }
});

test('the first Tab stop is the skip link, visibly focused, and it leads to main', async ({ page, browserName }) => {
  await page.goto('/');
  // Safari and WebKit reach links with Option+Tab (Tab alone skips them, as in Safari's default settings).
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveAttribute('href', '#main');
  await expect(focused).toBeInViewport();
  const outline = await focused.evaluate((a) => getComputedStyle(a));
  expect(outline.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(outline.outlineWidth)).toBeGreaterThanOrEqual(2);
});

test('reduced motion turns transitions off', async ({ page }) => {
  await page.goto('/');
  const duration = () => page.locator('.btn').first().evaluate((a) => getComputedStyle(a).transitionDuration);
  expect(await duration()).not.toMatch(/^0s$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await duration()).toMatch(/^0s$/);
});
