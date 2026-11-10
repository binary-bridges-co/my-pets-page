// 320 to 1920 px wide, light and dark: nothing scrolls sideways and the Call button is on screen
// (plan § Tests). Assertions only, no screenshots.
import { expect, open, test } from './support';

const WIDTHS = [320, 375, 768, 1024, 1440, 1920];
const PAGES: [string, string | undefined][] = [
  ['lostLongName', undefined],
  ['published', undefined],
  ['notFound', 'verified'],
  ['notFound', 'forged'],
  ['deactivated', undefined],
  ['throttled', undefined],
];

for (const scheme of ['light', 'dark'] as const) {
  test(`no sideways scroll from 320 to 1920 px (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      for (const [name, fragment] of PAGES) {
        await open(page, name, fragment);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${name} at ${width} px`).toBe(0);
        const call = page.locator('a.button.primary').first();
        if ((await call.count()) > 0) {
          const box = await call.boundingBox();
          expect(box && box.x >= 0 && box.x + box.width <= width, `Call inside the viewport, ${name} at ${width}`).toBe(true);
          expect(box && box.height >= 44, 'a tap target of at least 44 px').toBe(true);
        }
      }
    }
  });
}
