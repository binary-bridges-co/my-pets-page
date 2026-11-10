// Without JavaScript the page is state A in both languages: true, and all a visitor needs (plan §
// Acceptance 7). Published cards need the script; the bare text says how to reach the family.
import { expect, scenarios, test } from './support';

test.use({ javaScriptEnabled: false });

test('a tag link shows the bare text in English and Spanish, with the privacy line', async ({ page, log }) => {
  const response = await page.goto(`/p/${scenarios.lost.id}#${scenarios.lost.fragments.verified}`);
  expect(response?.status()).toBe(200);
  const text = (await page.textContent('main')) ?? '';
  expect(text).toContain("This tag's details are on its NFC chip. Hold your phone to the tag, or call the number engraved on its back.");
  expect(text).toContain('Los datos de esta placa están en su chip NFC.');
  expect(text).toContain("My Pets doesn't know when the tag is scanned.");
  await expect(page.locator('p[lang="es"]').first()).toBeVisible();
  expect(log.some((r) => r.url.startsWith('https://'))).toBe(false);
});

test('another path is the 404 notice; the home says what the site is', async ({ page }) => {
  const missing = await page.goto('/somewhere');
  expect(missing?.status()).toBe(404);
  expect(await page.textContent('main')).toContain("This isn't a My Pets tag link.");
  const home = await page.goto('/');
  expect(home?.status()).toBe(200);
  expect(await page.textContent('main')).toContain('My Pets helps lost pets get home.');
});
