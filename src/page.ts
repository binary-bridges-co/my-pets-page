// The page's only script (DESIGN §6). The static HTML is state A in both languages; this picks the
// visitor's language, checks the path's link id, sends the one lookup to CloudKit, runs the reader
// (§15.8 r2) and shows the result, or falls back to the tag's fragment. No storage, no retry; the
// fragment never leaves the page.
import { type CloudKitConfig, lookup } from './cloudkit';
import { type FragmentResult, pathLinkId, readFragment } from './fragment';
import { pickLanguage, STRINGS, type Strings } from './lang';
import { type Outcome, readRecords, recordNames } from './reader';
import { type PhotoView, showCopy, showNotice, showPublished, showRefusal } from './render';
import { wireSendWhere } from './where';

const CONFIG: CloudKitConfig = __CLOUDKIT__;

function photoView(o: Extract<Outcome, { state: 'published' }>): PhotoView | undefined {
  if (!o.photo || !o.card.photo) return undefined;
  const url = URL.createObjectURL(new Blob([Uint8Array.from(o.photo)], { type: 'image/jpeg' }));
  return { url, width: o.card.photo.w, height: o.card.photo.h };
}

async function fromFragment(id: string): Promise<FragmentResult | undefined> {
  if (location.hash.length <= 1) return undefined;
  try {
    return await readFragment(location.hash.slice(1), id);
  } catch {
    // Fails closed: no WebCrypto outside a secure context, or anything unexpected.
    return { kind: 'refused', code: 'error' };
  }
}

/** E or F from the fragment; else [fallback] (A when nothing is published, H when CloudKit failed). */
function showFragment(main: HTMLElement, result: FragmentResult | undefined, s: Strings, fallback: 'bare' | 'unavailable'): void {
  if (result) document.body.dataset.fragment = result.kind === 'refused' ? `refused ${result.code}` : result.kind;
  if (result?.kind === 'copy') showCopy(main, result.card, Date.parse(result.card.published), Date.now(), s);
  else if (result?.kind === 'refused') showRefusal(main, s);
  else if (fallback === 'unavailable') showNotice(main, 'unavailable', s.unavailable, s, true);
  // Not published, link only (NTAG213) or a future fragment version: state A stays.
}

async function start(): Promise<void> {
  const main = document.getElementById('card');
  if (!main) return;
  const lang = pickLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
  const s = STRINGS[lang];
  document.documentElement.lang = lang;
  const id = pathLinkId(location.pathname);
  if (!id) {
    showNotice(main, 'not-a-tag', s.notATag, s);
    return;
  }
  showNotice(main, 'bare', s.bare, s);
  const names = recordNames(id);
  // The lookup and the fragment check run together; a published card always wins.
  const [found, fragment] = await Promise.all([lookup(names, CONFIG), fromFragment(id)]);
  if (!found.ok) {
    document.body.dataset.lookup = 'failed';
    showFragment(main, fragment, s, 'unavailable');
    return;
  }
  const outcome = await readRecords(id, found.records, Date.now());
  // The reader's outcome, for tests and for anyone reading the page; never sent anywhere.
  document.body.dataset.lookup = outcome.state;
  if (outcome.state === 'deactivated') showNotice(main, 'deactivated', s.deactivated, s, true);
  else if (outcome.state === 'published') {
    const photo = photoView(outcome);
    showPublished(main, outcome.card, Date.parse(outcome.published), Date.now(), s, photo);
    if (photo) {
      const img = main.querySelector('img.photo');
      const revoke = (): void => URL.revokeObjectURL(photo.url);
      img?.addEventListener('load', revoke, { once: true });
      img?.addEventListener('error', revoke, { once: true });
    }
    wireSendWhere();
  } else if (outcome.state === 'unpublished') {
    // §15.8 r2: an unpublish shows nothing; only "not published" falls back to the fragment.
    showNotice(main, 'bare', s.bare, s);
  } else showFragment(main, fragment, s, 'bare');
}

start().catch(() => {
  // Something unexpected after the page started: say we can't show the card, never leave A's text.
  document.body.dataset.lookup = 'error';
  const main = document.getElementById('card');
  const s = STRINGS[pickLanguage(navigator.languages?.length ? navigator.languages : [navigator.language])];
  if (main) showNotice(main, 'unavailable', s.unavailable, s, true);
});
