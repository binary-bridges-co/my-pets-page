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
  await page.evaluate(() => new Promise((r) => (window.requestIdleCallback ?? ((f: () => void) => f()))(() => r(undefined))));
  expect(log.slice(before).map((r) => r.url)).toEqual([]);
});

test('the location is asked for only on the tap; a refusal says so', async ({ page, context }) => {
  await context.addInitScript(() => {
    const w = window as unknown as { __geo: number };
    w.__geo = 0;
    // Counts the calls, and answers as a finder who said no.
    navigator.geolocation.getCurrentPosition = (_ok, fail) => {
      w.__geo++;
      fail?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
    };
  });
  await open(page, 'lost');
  expect(await page.evaluate(() => (window as unknown as { __geo: number }).__geo)).toBe(0);
  await page.click('#where');
  await expect(page.locator('#where-status')).toHaveText("Your location isn't available. You can still call or send a message.");
  await expect(page.locator('#where-send')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as { __geo: number }).__geo)).toBe(1);
});

test.describe('in Spanish', () => {
  test.use({ locale: 'es-CO', geolocation: { latitude: 6.2, longitude: -75.5 } });
  test('the message is in Spanish', async ({ page }) => {
    await open(page, 'lost');
    await page.click('#where');
    await expect(page.locator('#where-status')).toHaveText('Encontré a Test Dog. Estoy aquí: 6.20000,-75.50000');
  });
});
