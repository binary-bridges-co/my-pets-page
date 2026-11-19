// The homepage and /press from 320 to 1920 px, light and dark (plan § Tests, AC 7): nothing scrolls
// sideways, the App Store badge or label is in the first screen of a phone, standalone controls are at
// least 44 px tall on narrow screens and inline links at least 24 px. Assertions only, no screenshots.
import { expect, test } from './support';

const WIDTHS = [320, 375, 768, 1024, 1440, 1920];
const NARROW = 414;
const STANDALONE = '[data-app-store] a, [data-app-store] p, .btn, header nav a, header a.brand, summary';

for (const scheme of ['light', 'dark'] as const) {
  test(`no sideways scroll, and targets big enough, from 320 to 1920 px (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ['/', '/press']) {
        await page.goto(path);
        const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
        expect(overflow, `${path} at ${width} px`).toBe(0);
        const minimum = width <= NARROW ? 44 : 24;
        for (const box of await page.locator(STANDALONE).evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => [e.outerHTML.slice(0, 60), e.getBoundingClientRect().height] as const))) {
          expect(box[1], `${box[0]} at ${width} px on ${path}`).toBeGreaterThanOrEqual(minimum);
        }
        for (const box of await page.locator('main p a, main li a, main dd a, footer a').evaluateAll((els) => els.map((e) => [e.outerHTML.slice(0, 60), e.getBoundingClientRect().height] as const))) {
          expect(box[1], `${box[0]} at ${width} px on ${path}`).toBeGreaterThanOrEqual(24);
        }
      }
    }
  });
}

test('the App Store badge or label is in the first screen of a 375 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  const store = page.locator('[data-app-store]').first();
  await expect(store).toBeInViewport({ ratio: 1 });
});
