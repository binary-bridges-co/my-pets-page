// The homepage and /press say what the plan says, in order, and the launch state comes from the one
// config (plan § Tests, home.spec.ts). Runs on the normal build and on the launch fixture build.
import { DISCLAIMER, FAQ, ORIGIN, PRESS, PRICE, PRIVACY, PROMISE, PROOF_POINTS, ROADMAP } from '../../site/src/content/en';
import { FIXTURE_ID } from '../../site/src/config/launch';
import { formatDate } from '../../site/src/lib/launch';
import { config, expected, isFixture } from './launch-state';
import { expect, test } from './support';

const squash = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

test('the promise is the one h1, with its accent phrase', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  expect(squash(await page.textContent('h1'))).toBe(PROMISE.headline);
  await expect(page.locator('h1 em')).toHaveText(PROMISE.accent);
  expect(squash(await page.textContent('main'))).toContain(PROMISE.tail);
});

test('the App Store badge and the Smart App Banner follow the config, and the privacy line names the banner exactly then', async ({ page }) => {
  await page.goto('/');
  const banner = page.locator('meta[name="apple-itunes-app"]');
  const store = page.locator('[data-app-store]').first();
  if (expected.badge.kind === 'label') {
    await expect(store).toHaveText(expected.badge.text);
    await expect(store.locator('a, img')).toHaveCount(0);
    await expect(banner).toHaveCount(0);
  } else {
    const link = store.locator('a');
    await expect(link).toHaveAttribute('href', expected.badge.href);
    const img = link.locator('img');
    await expect(img).toHaveAttribute('src', expected.badge.light);
    await expect(img).toHaveAttribute('alt', expected.badge.alt);
    await expect(img).toHaveAttribute('width', String(expected.badge.width));
    await expect(img).toHaveAttribute('height', String(expected.badge.height));
    expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0), 'the badge loads').toBe(true);
    await expect(link.locator('source')).toHaveCount(expected.badge.dark ? 1 : 0);
    await expect(banner).toHaveAttribute('content', expected.banner);
  }
  if (isFixture) expect(expected.badge.kind === 'apple' && expected.badge.href).toBe(`https://apps.apple.com/app/id${FIXTURE_ID}?ct=fixture`);
  await expect(page.locator('#site-privacy')).toHaveText(expected.privacyLine);
});

test('the four proof points, in order', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('#proof ol > li');
  await expect(items).toHaveCount(4);
  for (const [i, point] of PROOF_POINTS.entries()) expect(squash(await items.nth(i).textContent())).toContain(point.text);
});

test('price: the amount and line as of the build, what one payment covers, and the sourced comparison', async ({ page }) => {
  await page.goto('/');
  const price = page.locator('#price');
  await expect(price.locator('[data-amount]')).toHaveText(expected.price.amount);
  const text = squash(await price.textContent());
  for (const t of [expected.price.line, PRICE.coverage, PRICE.comparison.text, PRICE.comparison.note]) expect(text).toContain(t);
  const mark = price.locator(`a[href="#price-source"]`);
  await expect(mark).toHaveText(PRICE.comparison.mark);
  await expect(page.locator('#price-source')).toContainText(PRICE.comparison.note);
});

test('privacy and the origin story', async ({ page }) => {
  await page.goto('/');
  const privacy = squash(await page.locator('#privacy').textContent());
  expect(privacy).toContain(PRIVACY.body);
  expect(privacy).toContain(PRIVACY.site);
  const origin = page.locator('#story');
  expect(squash(await origin.locator('blockquote').textContent())).toBe(ORIGIN.story);
  expect(squash(await origin.locator('figcaption').textContent())).toBe(ORIGIN.signature);
});

test('the roadmap: four groups and their items, the open format and satellite notes', async ({ page }) => {
  await page.goto('/');
  const groups = page.locator('#roadmap [data-group]');
  await expect(groups).toHaveCount(4);
  for (const [i, group] of ROADMAP.groups.entries()) {
    const g = groups.nth(i);
    await expect(g.locator('h3')).toHaveText(group.name);
    const items = g.locator('li');
    await expect(items).toHaveCount(group.items.length);
    for (const [j, item] of group.items.entries()) {
      const text = squash(await items.nth(j).textContent());
      expect(text).toContain(item.text);
      if (item.note) expect(text).toContain(item.note);
    }
  }
});

test('the FAQ answers every question and opens with the keyboard', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('#faq details');
  await expect(rows).toHaveCount(FAQ.items.length);
  for (const [i, item] of FAQ.items.entries()) {
    await expect(rows.nth(i).locator('summary')).toHaveText(item.q);
    expect(squash(await rows.nth(i).textContent())).toContain(item.a === 'DISCLAIMER' ? DISCLAIMER : item.a);
  }
  const first = rows.first();
  await expect(first).not.toHaveAttribute('open');
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('open', '');
  await expect(first.getByText(DISCLAIMER)).toBeVisible();
});

test('the nav reaches /press and back home', async ({ page }) => {
  await page.goto('/');
  await page.locator('header nav a', { hasText: 'Press' }).click();
  await expect(page).toHaveURL(/\/press$/);
  await expect(page.locator('h1')).toHaveText(PRESS.heading);
  await page.locator('header a[href="/"]').first().click();
  await expect(page).toHaveURL(/\/$/);
});

test('/press: description, fact sheet, media, icon, privacy, developer note and promo codes', async ({ page }) => {
  await page.goto('/press');
  await expect(page.locator('h1')).toHaveCount(1);
  const main = squash(await page.textContent('main'));
  for (const t of [...PRESS.about, DISCLAIMER, PRESS.privacy, ORIGIN.story, ORIGIN.signature]) expect(main).toContain(t);
  const fact = (label: string) => page.locator('#facts dt', { hasText: label }).locator('xpath=following-sibling::dd[1]');
  for (const [label, value] of [PRESS.facts.name, PRESS.facts.developer, PRESS.facts.platforms, PRESS.facts.category, PRESS.facts.language]) {
    await expect(fact(label)).toHaveText(value);
  }
  await expect(fact(PRESS.facts.price)).toContainText(expected.price.line);
  await expect(fact(PRESS.facts.release)).toHaveText(config.releaseDate ? formatDate(config.releaseDate) : PRESS.facts.releaseUnknown);
  const icon = page.locator('#icon img');
  await expect(icon).toHaveAttribute('alt', PRESS.icon.alt);
  await expect(page.locator('#icon a[download]')).toHaveCount(2);
  const contact = page.locator('#press-contact');
  if (expected.contact.href) {
    await expect(contact.locator('a')).toHaveAttribute('href', expected.contact.href);
    await expect(contact.locator('a')).toHaveText(expected.contact.email ?? '');
  } else {
    await expect(contact).toHaveText(expected.contact.text);
    await expect(contact.locator('a')).toHaveCount(0);
  }
});

test('launch media: the video and screenshots from the config, or the honest empty line', async ({ page }) => {
  for (const path of ['/', '/press']) {
    await page.goto(path);
    const video = page.locator('video');
    if (config.previewVideo) {
      await expect(video).toHaveCount(1);
      await expect(video).toHaveAttribute('controls', '');
      await expect(video).toHaveAttribute('preload', 'none');
      await expect(video).toHaveAttribute('poster', config.previewVideo.poster);
      await expect(video).toHaveAttribute('width', String(config.previewVideo.width));
      await expect(video).toHaveAttribute('height', String(config.previewVideo.height));
      expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay || v.loop)).toBe(false);
      await expect(video.locator('source')).toHaveAttribute('src', config.previewVideo.src);
    } else await expect(video).toHaveCount(0);
  }
  await page.goto('/press');
  const shots = page.locator('#media img');
  await expect(shots).toHaveCount(config.screenshots.length);
  for (const [i, shot] of config.screenshots.entries()) {
    await expect(shots.nth(i)).toHaveAttribute('src', shot.src);
    await expect(shots.nth(i)).toHaveAttribute('alt', shot.alt);
    await expect(shots.nth(i)).toHaveAttribute('width', String(shot.width));
    await expect(shots.nth(i)).toHaveAttribute('height', String(shot.height));
  }
  if (!config.previewVideo && config.screenshots.length === 0) await expect(page.locator('#media')).toContainText(PRESS.mediaEmpty);
});

test('no script, no style attribute and no inline style in either page', async ({ page }) => {
  for (const path of ['/', '/press']) {
    const response = await page.goto(path);
    const html = (await response?.text()) ?? '';
    expect(html, path).not.toMatch(/<script|\sstyle=|<style|javascript:|\son[a-z]+=/i);
    await expect(page.locator('script')).toHaveCount(0);
  }
});
