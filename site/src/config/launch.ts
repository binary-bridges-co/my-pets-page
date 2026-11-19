// Launch day is a change to this file only (docs/RUNBOOK.md, launch day): the App Store state and id,
// the release date, the launch-price end date and, once the mailbox works, the press address.
// The fixture is the pre-order state, built only by `node scripts/build.mjs --launch=fixture` so CI
// tests the launch markup before launch day; its media are copied into dist/fixture/ by that build only.
import type { LaunchConfig } from '../lib/launch';

export const realConfig: LaunchConfig = {
  appStore: { state: 'coming-soon' },
  releaseDate: null,
  launchPrice: { price: 'US$9.99', regular: 'US$19.99', endsOn: null },
  pressEmail: null,
  previewVideo: null,
  screenshots: [],
};

/** The folder of dist/ that holds the fixture media, in the fixture build only. */
export const FIXTURE_DIR = 'fixture';
/** Digits that are no real listing; check-no-fixture.mjs looks for them in a normal dist/. */
export const FIXTURE_ID = '6799990001';

export const fixtureConfig: LaunchConfig = {
  appStore: { state: 'pre-order', id: FIXTURE_ID, campaign: 'fixture' },
  releaseDate: '2027-02-01',
  launchPrice: { price: 'US$9.99', regular: 'US$19.99', endsOn: '2099-12-31' },
  pressEmail: 'press@binarybridges.co',
  previewVideo: { src: `/${FIXTURE_DIR}/preview.mp4`, poster: `/${FIXTURE_DIR}/poster.png`, width: 222, height: 480 },
  screenshots: [{ src: `/${FIXTURE_DIR}/screenshot.png`, alt: "A pet's record in My Pets (test image)", width: 1206, height: 2622 }],
};

/** PETS_LAUNCH is set by scripts/build.mjs from its --launch flag only; anything else is a mistake. */
export function resolveConfig(mode: string | undefined): LaunchConfig {
  if (mode === undefined || mode === '') return realConfig;
  if (mode === 'fixture') return fixtureConfig;
  throw new Error(`PETS_LAUNCH=${mode}: only "fixture" is known`);
}
