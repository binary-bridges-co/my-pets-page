// The Help, Privacy and Terms pages (issues 9 and 11) and the app-link file: the texts in both languages
// keep the same sections and links, carry only the placeholder the build fills, link only within their
// language, to the support address and to Apple's EULA; the date reads right in each language; and the
// AASA file claims /p/* only, for the app's one ID, served as JSON with no redirect. Runs from the
// repository root (npm test).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fillLegal, LEGAL, LEGAL_PAGES, legalDate, legalPath, PRIVACY_EFFECTIVE_DATE, SWITCH, type Lang } from '../../site/src/content/legal';
import { HOME_CSP } from '../../site/src/lib/csp';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const text = (lang: Lang, page: string) => read(`site/src/content/legal/${lang}/${page}.md`);
const links = (md: string) => [...md.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1] as string);
const SUPPORT = 'mailto:support@binarybridges.co';
const EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

test('legalDate writes the date in each language and refuses anything but a real ISO date', () => {
  assert.equal(legalDate('2026-11-21', 'en'), 'November 21, 2026');
  assert.equal(legalDate('2026-11-21', 'es'), '21 de noviembre de 2026');
  assert.equal(legalDate('2027-01-05', 'es'), '5 de enero de 2027');
  for (const bad of ['2026-02-30', '21/11/2026', '', '2026-11-21T00:00:00Z']) assert.throws(() => legalDate(bad, 'en'), /not an ISO date/, bad);
});

test('the effective date is a real ISO date, the same in both languages', () => {
  assert.doesNotThrow(() => legalDate(PRIVACY_EFFECTIVE_DATE, 'en'));
  assert.ok(PRIVACY_EFFECTIVE_DATE <= new Date().toISOString().slice(0, 10), 'the effective date is not in the future');
  const en = fillLegal(text('en', 'privacy'), 'en');
  const es = fillLegal(text('es', 'privacy'), 'es');
  assert.ok(en.includes(`Effective ${legalDate(PRIVACY_EFFECTIVE_DATE, 'en')}.`));
  assert.ok(es.includes(`Vigente desde el ${legalDate(PRIVACY_EFFECTIVE_DATE, 'es')}.`));
});

test('fillLegal fills {{EFFECTIVE_DATE}} and fails on any other placeholder', () => {
  assert.equal(fillLegal('<p>Effective {{EFFECTIVE_DATE}}.</p>', 'en', '2027-03-01'), '<p>Effective March 1, 2027.</p>');
  assert.throws(() => fillLegal('<p>{{CONTACT_EMAIL}}</p>', 'en'), /CONTACT_EMAIL/);
  for (const lang of ['en', 'es'] as const) for (const page of LEGAL_PAGES) assert.doesNotThrow(() => fillLegal(text(lang, page), lang), `${lang}/${page}`);
});

test('each Spanish page has the same sections, bold questions and links as its English twin', () => {
  for (const page of LEGAL_PAGES) {
    const en = text('en', page);
    const es = text('es', page);
    const count = (md: string, re: RegExp) => (md.match(re) ?? []).length;
    assert.equal(count(es, /^# /gm), 1, `es/${page}: one h1`);
    assert.equal(count(en, /^# /gm), 1, `en/${page}: one h1`);
    assert.equal(count(es, /^## /gm), count(en, /^## /gm), `${page}: sections`);
    assert.equal(count(es, /^\*\*/gm), count(en, /^\*\*/gm), `${page}: bold lead-ins`);
    assert.equal(count(es, /^- /gm), count(en, /^- /gm), `${page}: list items`);
    const toEs = links(en).map((l) => (l.startsWith('/') ? `/es${l}` : l));
    assert.deepEqual(links(es), toEs, `${page}: links`);
  }
});

test('the links: within the page language, the support address, and Apple EULA only', () => {
  for (const lang of ['en', 'es'] as const) {
    const own = LEGAL_PAGES.map((p) => legalPath(p, lang));
    for (const page of LEGAL_PAGES) {
      for (const href of links(text(lang, page))) {
        assert.ok(own.includes(href) || href === SUPPORT || href === EULA, `${lang}/${page}: link ${href}`);
      }
    }
    assert.ok(links(text(lang, 'help')).includes(SUPPORT), `${lang}/help names the support address`);
    assert.ok(links(text(lang, 'privacy')).includes(SUPPORT), `${lang}/privacy names the support address`);
    assert.ok(links(text(lang, 'terms')).includes(EULA), `${lang}/terms links the EULA`);
  }
});

test('the Spanish privacy and terms pages say the English version prevails', () => {
  for (const page of ['privacy', 'terms']) assert.match(text('es', page), /prevalece la versión en inglés/, page);
});

test('the metadata: a title and description per page and language, and a switch to the other language', () => {
  for (const lang of ['en', 'es'] as const) {
    for (const page of LEGAL_PAGES) {
      const meta = LEGAL[lang][page];
      assert.match(meta.title, /: My Pets$/, `${lang}/${page} title`);
      assert.ok(meta.description.length >= 50 && meta.description.length <= 160, `${lang}/${page} description is ${meta.description.length} characters`);
    }
  }
  assert.equal(SWITCH.en.text, 'Español');
  assert.equal(SWITCH.es.text, 'English');
  assert.equal(legalPath('privacy', 'en'), '/privacy');
  assert.equal(legalPath('privacy', 'es'), '/es/privacy');
});

test('_headers gives every Help, Privacy and Terms path the homepage CSP, no noindex, no-cache', () => {
  const rules = read('src/host/_headers').split(/\n(?=\S)/);
  for (const lang of ['en', 'es'] as const) {
    for (const page of LEGAL_PAGES) {
      const path = legalPath(page, lang);
      const rule = rules.find((r) => r.startsWith(`${path}\n`)) ?? '';
      assert.ok(rule.includes('! Content-Security-Policy') && rule.includes('! X-Robots-Tag'), `${path} detaches the card CSP and noindex`);
      assert.ok(rule.includes(`Content-Security-Policy: ${HOME_CSP}\n`), `${path} sets the homepage CSP`);
      assert.ok(rule.includes('Cache-Control: no-cache'), `${path} is revalidated`);
    }
  }
});

test('the AASA file: the app ID 9JB56TN367.co.binarybridges.pets claims /p/* and nothing else', () => {
  const aasa = JSON.parse(read('src/host/.well-known/apple-app-site-association')) as {
    applinks: { details: { appIDs: string[]; components: Record<string, string>[] }[] };
  };
  assert.deepEqual(Object.keys(aasa), ['applinks']);
  assert.equal(aasa.applinks.details.length, 1);
  const [detail] = aasa.applinks.details;
  assert.deepEqual(detail?.appIDs, ['9JB56TN367.co.binarybridges.pets']);
  assert.deepEqual(
    detail?.components.map((c) => c['/']),
    ['/p/*'],
  );
  for (const c of detail?.components ?? []) assert.ok(!('exclude' in c) && !('?' in c) && !('#' in c), 'no other matching rule');
});

test('the AASA file is served as JSON, cached an hour, and never redirected or rewritten', () => {
  const rules = read('src/host/_headers').split(/\n(?=\S)/);
  const rule = rules.find((r) => r.startsWith('/.well-known/apple-app-site-association\n')) ?? '';
  assert.ok(rule.includes('Content-Type: application/json'), 'Content-Type: application/json');
  assert.ok(rule.includes('Cache-Control: max-age=3600'));
  const redirects = read('src/host/_redirects')
    .split('\n')
    .filter((l) => l.trim() !== '' && !l.startsWith('#'));
  for (const line of redirects) assert.ok(!line.startsWith('/.well-known') && !line.startsWith('/*'), `_redirects: ${line}`);
});
