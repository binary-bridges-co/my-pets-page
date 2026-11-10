// Send where I am (DESIGN §6 item 4) with a mocked location: a message the finder opens and sends;
// nothing is sent by the page.
import { expect, open, test } from './support';

test.use({ geolocation: { latitude: 6.209012345, longitude: -75.567123456 }, permissions: ['geolocation'] });

test('one fix, five decimals, an sms: link and no request after the tap', async ({ page, log }) => {
  await open(page, 'lost');
  await page.waitForLoadState('networkidle');
  const before = log.length;
  await page.click('#where');
  await expect(page.locator('#where-send')).toBeVisible();
  await expect(page.locator('#where-send')).toHaveAttribute('href', "sms:+15550100?&body=I%20found%20Test%20Dog.%20I'm%20here%3A%206.20901%2C-75.56712");
  await expect(page.locator('#where-status')).toHaveText("I found Test Dog. I'm here: 6.20901,-75.56712");
  await expect(page.locator('#where-send')).toBeFocused();
  expect(log.slice(before).map((r) => r.url)).toEqual([]);
});

test('Spanish message for a Spanish browser', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-CO', geolocation: { latitude: 6.2, longitude: -75.5 }, permissions: ['geolocation'] });
  const page = await context.newPage();
  const { fakeNetwork, NOW } = await import('./support');
  await fakeNetwork(context, 'http://127.0.0.1:4173', []);
  await page.clock.setFixedTime(new Date(NOW));
  await open(page, 'lost');
  await page.click('#where');
  await expect(page.locator('#where-status')).toHaveText('Encontré a Test Dog. Estoy aquí: 6.20000,-75.50000');
  await context.close();
});
