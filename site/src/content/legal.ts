// The Help, Privacy and Terms pages in English and Spanish (my-pets-page issues 9 and 11). Their text is
// the iOS repository's Store/website copy, kept byte for byte in site/src/content/legal/ (LEGAL_SOURCE,
// scripts/check-legal-source.sh); this file holds only what goes around it: titles, descriptions, the
// language switch, the header and footer words of the Spanish pages, and the privacy page's effective date.
// Tested in Node by test/unit/site-legal.test.ts.
import { SITE } from './en';

export type Lang = 'en' | 'es';
export type LegalPage = 'help' | 'privacy' | 'terms';

export const LEGAL_PAGES: readonly LegalPage[] = ['help', 'privacy', 'terms'];

/**
 * The day the privacy page takes effect (ISO date), shown on both languages' pages. It is the day the
 * pages go live: change it here on go-live day if that is later (docs/RUNBOOK.md §2).
 */
export const PRIVACY_EFFECTIVE_DATE = '2026-11-21';

/** The path of a page in a language: /help, /es/help. */
export function legalPath(page: LegalPage, lang: Lang): string {
  return lang === 'en' ? `/${page}` : `/es/${page}`;
}

export const LEGAL: Readonly<Record<Lang, Readonly<Record<LegalPage, { title: string; description: string; nav: string }>>>> = {
  en: {
    help: {
      title: 'Help: My Pets',
      description: 'Answers to common questions about My Pets, the pet health record app for iPhone, and how to contact us.',
      nav: 'Help',
    },
    privacy: {
      title: 'Privacy: My Pets',
      description: 'What My Pets does with your information: records stay on your devices and in your iCloud, with no account, ads, analytics or tracking.',
      nav: 'Privacy',
    },
    terms: {
      title: 'Terms of use: My Pets',
      description: "My Pets is licensed under Apple's standard Licensed Application End User License Agreement.",
      nav: 'Terms',
    },
  },
  es: {
    help: {
      title: 'Ayuda: My Pets',
      description: 'Respuestas a las preguntas frecuentes sobre My Pets, la app de historial de salud de mascotas para iPhone, y cómo contactarnos.',
      nav: 'Ayuda',
    },
    privacy: {
      title: 'Privacidad: My Pets',
      description: 'Qué hace My Pets con tu información: los registros se quedan en tus dispositivos y en tu iCloud, sin cuenta, anuncios, analítica ni rastreo.',
      nav: 'Privacidad',
    },
    terms: {
      title: 'Condiciones de uso: My Pets',
      description: 'My Pets se ofrece bajo el contrato de licencia de usuario final estándar de Apple.',
      nav: 'Condiciones',
    },
  },
};

/** The link to the other language, written in that language. */
export const SWITCH: Readonly<Record<Lang, { label: string; text: string }>> = {
  en: { label: 'Language', text: 'Español' },
  es: { label: 'Idioma', text: 'English' },
};

/** The header and footer words of a page in each language (the English ones are SITE's in content/en.ts). */
export const CHROME: Readonly<Record<Lang, { skip: string; navLabel: string; footerLine: string; footerHome: string }>> = {
  en: { skip: SITE.skip, navLabel: SITE.navLabel, footerLine: SITE.footerLine, footerHome: SITE.footerHome },
  es: {
    skip: 'Saltar al contenido',
    navLabel: 'Principal',
    footerLine: 'My Pets es una app de Binary Bridges.',
    footerHome: 'Inicio de My Pets (en inglés)',
  },
};

const MONTHS: Readonly<Record<Lang, readonly string[]>> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};

/** An ISO date as the page says it: "November 21, 2026" or "21 de noviembre de 2026". */
export function legalDate(iso: string, lang: Lang): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
  if (!m || !date || date.toISOString().slice(0, 10) !== iso) throw new Error(`legalDate: ${iso} is not an ISO date`);
  const month = MONTHS[lang][date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return lang === 'en' ? `${month} ${day}, ${year}` : `${day} de ${month} de ${year}`;
}

/**
 * The page's HTML with its placeholders filled. The only one the texts carry is {{EFFECTIVE_DATE}}; any
 * other, or one left over, fails the build so a placeholder never reaches the site.
 */
export function fillLegal(html: string, lang: Lang, effective: string = PRIVACY_EFFECTIVE_DATE): string {
  const filled = html.replace(/\{\{EFFECTIVE_DATE\}\}/g, legalDate(effective, lang));
  const left = /\{\{[^}]*\}\}/.exec(filled);
  if (left) throw new Error(`legal page: placeholder ${left[0]} has no value`);
  return filled;
}
