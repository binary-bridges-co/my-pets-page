// axe-core over every state in light and dark (plan § Tests, Accessibility): no violations at all.
import AxeBuilder from '@axe-core/playwright';
import { expect, open, test } from './support';

const STATES: [string, string | undefined][] = [
  ['published', undefined],
  ['hostile', undefined],
  ['lost', undefined],
  ['lostMessage', undefined],
  ['deactivated', undefined],
  ['notFound', undefined],
  ['notFound', 'verified'],
  ['notFound', 'forged'],
  ['throttled', undefined],
  ['not-a-tag-link', undefined],
];

for (const scheme of ['light', 'dark'] as const) {
  test(`every state has no axe violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [name, fragment] of STATES) {
      await open(page, name, fragment);
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.passes.length, `axe ran on ${name}`).toBeGreaterThan(10);
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`), `${name} ${fragment ?? ''}`).toEqual([]);
    }
    for (const path of ['/', '/somewhere']) {
      await page.goto(path);
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations.map((v) => v.id), path).toEqual([]);
    }
  });
}

test('keyboard: in state C the first stop is Call my family, then Send where I am', async ({ page, browserName }) => {
  await open(page, 'lost');
  // Safari and WebKit reach links with Option+Tab (Tab alone skips them, as in Safari's default settings).
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.keyboard.press(tab);
  await expect(page.locator(':focus')).toHaveText('Call my family');
  await page.keyboard.press(tab);
  await expect(page.locator(':focus')).toHaveText('Send where I am');
});

test('reduced motion turns transitions off', async ({ page }) => {
  await open(page, 'lost');
  const duration = () => page.locator('a.button').first().evaluate((a) => getComputedStyle(a).transitionDuration);
  expect(await duration()).not.toMatch(/^0s$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await duration()).toMatch(/^0s$/);
});
