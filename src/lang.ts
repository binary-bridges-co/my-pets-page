// The page's two languages (owner, 5 Nov 2026): English and Spanish, from the browser's language list.
// Nothing is stored or sent: no cookie, and the host never sees the choice.
import en from './strings/en.json';
import es from './strings/es.json';

export type Lang = 'en' | 'es';
export type Strings = Readonly<Record<keyof typeof en, string>>;

export const STRINGS: Readonly<Record<Lang, Strings>> = { en, es };

/** The first entry whose primary subtag is `en` or `es` (so `es-CO` is Spanish); English otherwise. */
export function pickLanguage(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (primary === 'en' || primary === 'es') return primary;
  }
  return 'en';
}
