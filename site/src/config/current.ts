// The launch config this build renders: the real one, or the fixture when scripts/build.mjs was run with
// --launch=fixture (it sets PETS_LAUNCH from that flag and from nothing else). Validated at build time.
import { validate } from '../lib/launch';
import { resolveConfig } from './launch';

export const config = resolveConfig(process.env.PETS_LAUNCH);
validate(config);

/** The day the pages are built: the price line is true as of this date (and names both prices). */
export const buildDate = new Date();
