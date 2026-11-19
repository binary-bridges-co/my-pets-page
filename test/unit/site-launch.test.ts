// The homepage's launch logic (plan § Launch config): one config, validated, and the pure functions the
// pages render, so launch day is a one-file change proven here and in the fixture build.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIXTURE_DIR, FIXTURE_ID, fixtureConfig, realConfig, resolveConfig } from '../../site/src/config/launch';
import { badge, formatDate, type LaunchConfig, pressContact, priceLines, sitePrivacyLine, smartAppBanner, validate } from '../../site/src/lib/launch';

const NOTHING = 'This page loads nothing from other companies.';
const BANNER = "On iPhone, Safari may show Apple's App Store banner.";

const withStore = (appStore: LaunchConfig['appStore']): LaunchConfig => ({ ...realConfig, appStore });
const states: LaunchConfig[] = [
  withStore({ state: 'coming-soon' }),
  withStore({ state: 'pre-order', id: '123456789' }),
  withStore({ state: 'pre-order', id: '123456789', campaign: 'press' }),
  withStore({ state: 'available', id: '987654321' }),
  realConfig,
  fixtureConfig,
];

test('the real config starts coming soon, with nothing a visitor could follow to a dead end', () => {
  assert.deepEqual(realConfig.appStore, { state: 'coming-soon' });
  assert.equal(realConfig.releaseDate, null);
  assert.equal(realConfig.launchPrice.endsOn, null);
  assert.equal(realConfig.launchPrice.price, 'US$9.99');
  assert.equal(realConfig.launchPrice.regular, 'US$19.99');
  assert.equal(realConfig.pressEmail, null, 'the press mailbox does not exist yet (owner decision 2)');
  assert.equal(realConfig.previewVideo, null);
  assert.deepEqual(realConfig.screenshots, []);
});

test('the fixture config is the pre-order launch state, its media under the fixture folder', () => {
  assert.deepEqual(fixtureConfig.appStore, { state: 'pre-order', id: FIXTURE_ID, campaign: 'fixture' });
  assert.match(FIXTURE_ID, /^\d+$/);
  assert.equal(FIXTURE_DIR, 'fixture');
  assert.equal(fixtureConfig.pressEmail, 'press@binarybridges.co');
  assert.ok(fixtureConfig.previewVideo);
  assert.ok(fixtureConfig.screenshots.length > 0);
  const media = [fixtureConfig.previewVideo.src, fixtureConfig.previewVideo.poster, ...fixtureConfig.screenshots.map((s) => s.src)];
  for (const src of media) assert.ok(src.startsWith(`/${FIXTURE_DIR}/`), src);
  assert.ok(fixtureConfig.launchPrice.endsOn && fixtureConfig.launchPrice.endsOn > '2099-01-01');
});

test('resolveConfig: fixture only when asked; an unknown mode fails the build', () => {
  assert.equal(resolveConfig(undefined), realConfig);
  assert.equal(resolveConfig(''), realConfig);
  assert.equal(resolveConfig('fixture'), fixtureConfig);
  assert.throws(() => resolveConfig('launch'), /PETS_LAUNCH/);
});

test('validate accepts both configs and refuses bad ids, dates, emails and media', () => {
  assert.doesNotThrow(() => validate(realConfig));
  assert.doesNotThrow(() => validate(fixtureConfig));
  const bad: [Partial<LaunchConfig>, RegExp][] = [
    [{ appStore: { state: 'available', id: 'id123' } }, /App Store id/],
    [{ appStore: { state: 'pre-order', id: '' } }, /App Store id/],
    [{ appStore: { state: 'available', id: '123', campaign: 'a b' } }, /campaign/],
    [{ releaseDate: '2026-13-01' }, /releaseDate/],
    [{ releaseDate: 'tomorrow' }, /releaseDate/],
    [{ launchPrice: { price: 'US$9.99', regular: 'US$19.99', endsOn: '2027-02-30' } }, /endsOn/],
    [{ pressEmail: 'press@' }, /pressEmail/],
    [{ pressEmail: 'press @binarybridges.co' }, /pressEmail/],
    [{ pressEmail: 'mailto:press@binarybridges.co' }, /pressEmail/],
    [{ previewVideo: { src: 'https://example.com/v.mp4', poster: '/p.png', width: 10, height: 20 } }, /same-origin/],
    [{ previewVideo: { src: '//example.com/v.mp4', poster: '/p.png', width: 10, height: 20 } }, /same-origin/],
    [{ screenshots: [{ src: '/s.png', alt: '', width: 10, height: 20 }] }, /alt/],
    [{ screenshots: [{ src: '/s.png', alt: 'A', width: 0, height: 20 }] }, /width/],
  ];
  for (const [change, message] of bad) assert.throws(() => validate({ ...realConfig, ...change }), message, JSON.stringify(change));
});

test('badge: a text label before the listing; Apple artwork linking to the listing after', () => {
  assert.deepEqual(badge(withStore({ state: 'coming-soon' })), { kind: 'label', text: 'Coming soon to the App Store' });
  const pre = badge(withStore({ state: 'pre-order', id: '123456789', campaign: 'press' }));
  assert.equal(pre.kind, 'apple');
  if (pre.kind !== 'apple') return;
  assert.equal(pre.href, 'https://apps.apple.com/app/id123456789?ct=press');
  assert.equal(pre.alt, 'Pre-order on the App Store');
  assert.equal(pre.light, '/badges/pre-order-on-the-app-store-black.svg');
  // Apple publishes the pre-order badge in black only; its grey border is made for dark backgrounds.
  assert.equal(pre.dark, null);
  const get = badge(withStore({ state: 'available', id: '987654321' }));
  assert.equal(get.kind, 'apple');
  if (get.kind !== 'apple') return;
  assert.equal(get.href, 'https://apps.apple.com/app/id987654321');
  assert.equal(get.alt, 'Download on the App Store');
  assert.equal(get.light, '/badges/download-on-the-app-store-black.svg');
  assert.equal(get.dark, '/badges/download-on-the-app-store-white.svg');
  assert.ok(get.height >= 44, 'a 44 px target');
});

test('smartAppBanner: the app id once there is one, else nothing', () => {
  assert.equal(smartAppBanner(withStore({ state: 'coming-soon' })), '');
  assert.equal(smartAppBanner(withStore({ state: 'pre-order', id: '123456789' })), 'app-id=123456789');
  assert.equal(smartAppBanner(withStore({ state: 'available', id: '987654321', campaign: 'x' })), 'app-id=987654321');
});

test('sitePrivacyLine names the banner exactly when the page emits it (owner decision 1)', () => {
  for (const config of states) {
    const line = sitePrivacyLine(config);
    const emitsBanner = smartAppBanner(config) !== '';
    assert.ok(line.startsWith(NOTHING), line);
    assert.equal(line.includes(BANNER), emitsBanner, `${config.appStore.state}: ${line}`);
    assert.equal(line, emitsBanner ? `${NOTHING} ${BANNER}` : NOTHING);
  }
});

test('priceLines: the dated sentence names both prices; the day it ends, the regular price', () => {
  const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
  const undated = withStore({ state: 'coming-soon' });
  assert.deepEqual(priceLines(undated, at('2026-11-19')), {
    amount: 'US$9.99',
    line: 'US$9.99 launch price for the first three months, then US$19.99.',
  });
  const dated: LaunchConfig = { ...undated, launchPrice: { ...undated.launchPrice, endsOn: '2027-03-01' } };
  const before = { amount: 'US$9.99', line: 'US$9.99 launch price until March 1, 2027, then US$19.99. One payment, no subscription.' };
  const after = { amount: 'US$19.99', line: 'US$19.99, one payment, no subscription.' };
  assert.deepEqual(priceLines(dated, at('2027-02-28')), before);
  assert.deepEqual(priceLines(dated, new Date('2027-02-28T23:59:59Z')), before);
  assert.deepEqual(priceLines(dated, at('2027-03-01')), after);
  assert.deepEqual(priceLines(dated, at('2027-03-02')), after);
});

test('formatDate writes a date the US way, without a time zone shift', () => {
  assert.equal(formatDate('2027-03-01'), 'March 1, 2027');
  assert.equal(formatDate('2026-12-31'), 'December 31, 2026');
});

test('pressContact: an address only when one is set; never a placeholder', () => {
  assert.deepEqual(pressContact(realConfig), { text: 'Promo codes on request.', email: null, href: null });
  assert.deepEqual(pressContact(fixtureConfig), {
    text: 'Promo codes on request:',
    email: 'press@binarybridges.co',
    href: 'mailto:press@binarybridges.co',
  });
});
