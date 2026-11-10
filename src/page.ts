// The page's only script (DESIGN §6). The static HTML is state A in both languages; this picks the
// visitor's language, checks the path's link id and reads a tag's fragment. No storage, no timers;
// the fragment never leaves the page.
import { pathLinkId, readFragment } from './fragment';
import { pickLanguage, STRINGS, type Strings } from './lang';
import { showCopy, showNotice, showRefusal } from './render';
import { wireSendWhere } from './where';

async function readTag(main: HTMLElement, id: string, s: Strings): Promise<void> {
  if (location.hash.length <= 1) return;
  const result = await readFragment(location.hash.slice(1), id);
  // The outcome, for tests and for anyone reading the page; never sent anywhere.
  document.body.dataset.fragment = result.kind === 'refused' ? `refused ${result.code}` : result.kind;
  if (result.kind === 'copy') showCopy(main, result.card, Date.parse(result.card.published), Date.now(), s);
  else if (result.kind === 'refused') showRefusal(main, s);
  // Link only (NTAG213) and a future version keep state A.
}

function start(): void {
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
  // Fails closed: anything unexpected (no WebCrypto outside a secure context) keeps state A.
  readTag(main, id, s)
    .catch(() => {
      document.body.dataset.fragment = 'error';
    })
    .finally(wireSendWhere);
}

start();
