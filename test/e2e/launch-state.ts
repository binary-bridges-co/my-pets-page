// The launch state the served dist/ was built with: the real config, or the pre-order fixture when
// PETS_LAUNCH=fixture (playwright.config.ts then builds with --launch=fixture). The home specs read their
// expectations from here and branch on it, so both builds run the same tests with nothing skipped.
import { resolveConfig } from '../../site/src/config/launch';
import { badge, pressContact, priceLines, sitePrivacyLine, smartAppBanner } from '../../site/src/lib/launch';

export const config = resolveConfig(process.env.PETS_LAUNCH);
export const isFixture = process.env.PETS_LAUNCH === 'fixture';
export const expected = {
  badge: badge(config),
  banner: smartAppBanner(config),
  privacyLine: sitePrivacyLine(config),
  price: priceLines(config, new Date()),
  contact: pressContact(config),
};
