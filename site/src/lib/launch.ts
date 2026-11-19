// The launch state, as pure functions the pages render (plan § Launch config). Tested in Node by
// test/unit/site-launch.test.ts; the pages hold no logic of their own about the App Store or the price.

export type AppStore = { state: 'coming-soon' } | { state: 'pre-order' | 'available'; id: string; campaign?: string };

export interface Video {
  src: string;
  poster: string;
  width: number;
  height: number;
}

export interface Screenshot {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface LaunchConfig {
  appStore: AppStore;
  /** ISO date (YYYY-MM-DD) for the fact sheet; null until the launch date is set. */
  releaseDate: string | null;
  /** endsOn: the ISO date the launch price ends; null until launch day (my-pets-ios issue 263: three months from launch). */
  launchPrice: { price: 'US$9.99'; regular: 'US$19.99'; endsOn: string | null };
  /** null until the mailbox exists (owner decision 2). */
  pressEmail: string | null;
  previewVideo: Video | null;
  screenshots: Screenshot[];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function isIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return date.toISOString().slice(0, 10) === value;
}

const sameOrigin = (src: string) => src.startsWith('/') && !src.startsWith('//');
const positive = (n: number) => Number.isInteger(n) && n > 0;

/** Fails the build on a config that would render something false or broken. */
export function validate(config: LaunchConfig): void {
  const fail = (message: string): never => {
    throw new Error(`site/src/config/launch.ts: ${message}`);
  };
  const store = config.appStore;
  if (store.state !== 'coming-soon') {
    if (!/^\d+$/.test(store.id)) fail(`App Store id must be digits, got ${JSON.stringify(store.id)}`);
    if (store.campaign !== undefined && !/^[A-Za-z0-9_-]{1,40}$/.test(store.campaign)) fail('campaign: letters, digits, - and _ only, at most 40');
  }
  if (config.releaseDate !== null && !isIsoDate(config.releaseDate)) fail(`releaseDate is not a date: ${config.releaseDate}`);
  if (config.launchPrice.endsOn !== null && !isIsoDate(config.launchPrice.endsOn)) fail(`launchPrice.endsOn is not a date: ${config.launchPrice.endsOn}`);
  if (config.pressEmail !== null && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(config.pressEmail)) fail(`pressEmail is not an address: ${config.pressEmail}`);
  const video = config.previewVideo;
  if (video) {
    if (!sameOrigin(video.src) || !sameOrigin(video.poster)) fail('previewVideo must be same-origin paths');
    if (!positive(video.width) || !positive(video.height)) fail('previewVideo width and height');
  }
  for (const shot of config.screenshots) {
    if (!sameOrigin(shot.src)) fail(`screenshot ${shot.src} must be a same-origin path`);
    if (shot.alt.trim() === '') fail(`screenshot ${shot.src} needs alt text`);
    if (!positive(shot.width) || !positive(shot.height)) fail(`screenshot ${shot.src}: width and height`);
  }
}

/** "March 1, 2027", read as a calendar date (no time zone shift). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}

export type Badge =
  | { kind: 'label'; text: string }
  | { kind: 'apple'; href: string; alt: string; light: string; dark: string | null; width: number; height: number };

/**
 * Apple's official artwork, unaltered, once the app has a listing; before that a plain text label, since
 * Apple has no "coming soon" badge. Shown 48 px tall (Apple's minimum is 40; 44 is the touch target).
 * Apple publishes the pre-order badge in black only (its grey border is made for dark backgrounds).
 */
export function badge(config: LaunchConfig): Badge {
  const store = config.appStore;
  if (store.state === 'coming-soon') return { kind: 'label', text: 'Coming soon to the App Store' };
  const href = `https://apps.apple.com/app/id${store.id}${store.campaign ? `?ct=${store.campaign}` : ''}`;
  if (store.state === 'pre-order') {
    return { kind: 'apple', href, alt: 'Pre-order on the App Store', light: '/badges/pre-order-on-the-app-store-black.svg', dark: null, width: 141, height: 48 };
  }
  return {
    kind: 'apple',
    href,
    alt: 'Download on the App Store',
    light: '/badges/download-on-the-app-store-black.svg',
    dark: '/badges/download-on-the-app-store-white.svg',
    width: 144,
    height: 48,
  };
}

/** The content of <meta name="apple-itunes-app">, or '' for no meta at all. */
export function smartAppBanner(config: LaunchConfig): string {
  return config.appStore.state === 'coming-soon' ? '' : `app-id=${config.appStore.id}`;
}

/** The only source of the site's privacy line: it names Apple's banner exactly when the page emits it. */
export function sitePrivacyLine(config: LaunchConfig): string {
  const nothing = 'This page loads nothing from other companies.';
  return smartAppBanner(config) === '' ? nothing : `${nothing} On iPhone, Safari may show Apple's App Store banner.`;
}

/** The price as of the build. The dated sentence names both prices, so a page not rebuilt stays true. */
export function priceLines(config: LaunchConfig, buildDate: Date): { amount: string; line: string } {
  const { price, regular, endsOn } = config.launchPrice;
  if (endsOn === null) return { amount: price, line: `${price} launch price for the first three months, then ${regular}.` };
  const today = buildDate.toISOString().slice(0, 10);
  if (today < endsOn) return { amount: price, line: `${price} launch price until ${formatDate(endsOn)}, then ${regular}. One payment, no subscription.` };
  return { amount: regular, line: `${regular}, one payment, no subscription.` };
}

/** The promo-code line: an address and a mailto: link only once one is set. */
export function pressContact(config: LaunchConfig): { text: string; email: string | null; href: string | null } {
  if (config.pressEmail === null) return { text: 'Promo codes on request.', email: null, href: null };
  return { text: 'Promo codes on request:', email: config.pressEmail, href: `mailto:${config.pressEmail}` };
}
