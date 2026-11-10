// Every state of docs/DESIGN.md §5 from the recorded CloudKit answers, in Chromium, Firefox and WebKit.
import { expect, mainText, NOW, open, state, test } from './support';

test('B: a published card, with its photo from the record\'s bytes', async ({ page }) => {
  await open(page, 'published');
  expect(await state(page)).toBe('published');
  const text = await mainText(page);
  for (const t of ["Hi, I'm Test Dog", 'Mixed · I have a family waiting for me', 'Published by my family · updated 2 min ago.', "The family's address isn't shown.", 'Chicken', 'Ear drops', 'Can skip a day', '000 000 000 000 001 · any vet can read it', 'Test Clinic']) {
    expect(text).toContain(t);
  }
  expect(text).toContain("My Pets doesn't know when the tag is scanned.");
  expect(text).not.toContain('I got lost');
  const img = page.locator('img.photo');
  await expect(img).toHaveAttribute('src', /^blob:/);
  await expect(img).toHaveAttribute('alt', 'Photo of Test Dog');
  expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(64);
  await expect(page.locator('a.button.primary')).toHaveAttribute('href', 'tel:+15550100');
  await expect(page.locator('a[href="sms:+15550100"]')).toHaveCount(1);
  await expect(page.locator('a[href="tel:+15550101"]')).toHaveText('Call Alex (Sister)');
  await expect(page).toHaveTitle('Test Dog · My Pets');
  await expect(page.locator('#where')).toHaveCount(0);
});

test('C: a lost card shows the band, Last seen and Send where I am', async ({ page }) => {
  await open(page, 'lost');
  expect(await state(page)).toBe('lost');
  const text = await mainText(page);
  expect(text).toContain("I got lost and they're looking for me");
  expect(text).toContain('Since today, 4 Nov, near Test Park. Please let my family know.');
  expect(text).toContain('Red collar');
  expect(text).toContain('Last seen');
  expect(text).toContain('near the gate · today, 6:40 AM');
  await expect(page.locator('#where')).toBeVisible();
});

test('D: deactivated under a successor name wins over a newer card, and ignores the fragment', async ({ page }) => {
  await open(page, 'deactivated', 'verified');
  expect(await state(page)).toBe('deactivated');
  expect(await mainText(page)).toContain('This tag is no longer active.');
  expect(await page.content()).not.toContain('Tag Dog');
});

test('A: not published, unpublished and forged-only records all show the bare text', async ({ page }) => {
  for (const name of ['notFound', 'unpublished', 'forgedOnly'] as const) {
    await open(page, name);
    expect(await state(page), name).toBe('bare');
    expect(await mainText(page)).toContain("This tag's details are on its NFC chip.");
    expect(await page.content()).not.toContain('Forged Dog');
  }
});

test('A: an unpublished link ignores the fragment (§15.8 r2: only "not published" falls back)', async ({ page }) => {
  await open(page, 'unpublished', 'verified');
  expect(await state(page)).toBe('bare');
  expect(await page.content()).not.toContain('Tag Dog');
});

test('E: a fragment that verifies shows the tag\'s copy, never as published', async ({ page }) => {
  await open(page, 'notFound', 'verified');
  expect(await state(page)).toBe('copy');
  const text = await mainText(page);
  expect(text).toContain("Hi, I'm Tag Dog");
  expect(text).toContain('Details on the tag · written 2 Oct.');
  expect(text).toContain("My Pets hasn't checked who wrote them.");
  expect(text).not.toContain('Published by');
  expect(text).not.toContain('I got lost');
});

test('E also when CloudKit can\'t be reached; H without a fragment', async ({ page }) => {
  for (const name of ['throttled', 'malformed'] as const) {
    await open(page, name, 'verified');
    expect(await state(page), name).toBe('copy');
    await open(page, name);
    expect(await state(page), name).toBe('unavailable');
    expect(await mainText(page)).toContain("We can't show this card right now. Call the number engraved on the tag.");
  }
});

test('F: a forged, borrowed or altered fragment is refused with nothing from it shown', async ({ page }) => {
  const codes: Record<string, string> = {
    otherLink: 'key.mismatch',
    forged: 'sig.invalid',
    altered: 'sig.invalid',
    wrongTag: 'sig.invalid',
    withLost: 'card.invalid',
    malformed: 'fragment.malformed',
  };
  for (const [fragment, code] of Object.entries(codes)) {
    await open(page, 'notFound', fragment);
    expect(await state(page), fragment).toBe('refused');
    await expect(page.locator('body')).toHaveAttribute('data-fragment', `refused ${code}`);
    const text = await mainText(page);
    expect(text).toContain("These details don't match this tag's link");
    expect(text).toContain("This tag's details are on its NFC chip.");
    expect(text).not.toContain('Tag D');
  }
});

test('a published card wins over the fragment; a link-only fragment keeps A', async ({ page }) => {
  await open(page, 'published', 'verified');
  expect(await state(page)).toBe('published');
  expect(await mainText(page)).not.toContain('Tag Dog');
  await open(page, 'notFound', 'linkOnly');
  expect(await state(page)).toBe('bare');
  await expect(page.locator('body')).toHaveAttribute('data-fragment', 'linkOnly');
});

test('G: a path that isn\'t a link id', async ({ page }) => {
  await open(page, 'not-a-tag-link');
  expect(await state(page)).toBe('not-a-tag');
  expect(await mainText(page)).toContain("This isn't a My Pets tag link.");
});

test('the newest signed state wins across names; a photo that fails is left out', async ({ page }) => {
  await open(page, 'newerSuccessor');
  expect(await mainText(page)).toContain("Hi, I'm New Dog");
  await open(page, 'photoMismatch');
  expect(await state(page)).toBe('published');
  await expect(page.locator('img')).toHaveCount(0);
});

test('hostile card and fragment text stays text; a phone that fails the check gets no link', async ({ page }) => {
  const hostile = '<img src=x onerror=alert(1)>';
  await open(page, 'hostile');
  await expect(page.locator('h1')).toHaveText(`Hi, I'm ${hostile}`);
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(2); // the alternate and the vet, not "1+2+3"
  expect(await mainText(page)).toContain('1+2+3');
  await open(page, 'notFound', 'hostile');
  await expect(page.locator('h1')).toHaveText(`Hi, I'm ${hostile}`);
  await expect(page.locator('main img')).toHaveCount(0);
});

test('Spanish for a Spanish browser', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-CO' });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  // This context has no fake network: every CloudKit call fails, so the fragment shows (E).
  await context.route('**/*', (r) => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  await open(page, 'notFound', 'verified');
  expect(await page.getAttribute('html', 'lang')).toBe('es');
  const text = await mainText(page);
  expect(text).toContain('Hola, soy Tag Dog');
  expect(text).toContain('Datos de la placa · escritos el 2 de octubre');
  expect(text).toContain('Llama a mi familia');
  expect(text).toContain('My Pets no sabe cuándo se escanea la placa.');
  await context.close();
});
