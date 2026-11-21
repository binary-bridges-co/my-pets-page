// The homepage's words (plan § Copy, #261, #266, #273): every visible string sits in
// site/src/content/en.ts or comes from site/src/lib/launch.ts, and both are held to the public rules here,
// and to the owner's decisions of 21 Nov 2026 (my-pets-ios#312) so the wrong claims cannot come back.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureConfig, realConfig } from '../../site/src/config/launch';
import * as copy from '../../site/src/content/en';
import { badge, type LaunchConfig, pressContact, priceLines, sitePrivacyLine } from '../../site/src/lib/launch';
import { WRONG_CLAIMS } from '../support/wrong-claims';

const { ASSISTANT_SHIPS, DISCLAIMER, DOSE_COPY, FAQ, ORIGIN, PRESS, PRICE, PRIVACY, PROMISE, PROOF_POINTS, ROADMAP } = copy;

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

const dated: LaunchConfig = { ...realConfig, launchPrice: { ...realConfig.launchPrice, endsOn: '2027-03-01' } };
const generated = [realConfig, fixtureConfig, dated, { ...realConfig, appStore: { state: 'available' as const, id: '1' } }].flatMap((c) => [
  sitePrivacyLine(c),
  ...strings(badge(c)),
  ...strings(pressContact(c)),
  ...strings(priceLines(c, new Date('2027-01-01T00:00:00Z'))),
  ...strings(priceLines(c, new Date('2027-06-01T00:00:00Z'))),
]);
// DOSE_COPY holds both assistant states, so every rule here checks the copy with the switch on and off.
const all = [...strings(Object.entries(copy).filter(([name]) => name !== 'DISCLAIMER').map(([, v]) => v)), ...generated];

const BANNED_WORDS = ['hash', 'chain', 'signature', 'signed', 'blockchain', 'crypto', 'immutable', 'append-only', 'AI', 'on-device model'];
// Pet-app and pet-device brands named in the decisions or likely in copy, and the roadmap's working name.
const BANNED_NAMES = [
  'PetLibro', 'Petcube', 'Furbo', 'Whistle', 'Tractive', 'Halo', 'PetSafe', 'Sure Petcare', 'Litter-Robot', 'Whisker', '11pets',
  'PetDesk', 'VitusVet', 'Pawprint', 'Garmin', 'Starlink', 'AirTag', 'Open Pet Record',
];
const ALLOWED_NAMES = ['iPhone', 'iPad', 'Mac', 'Apple Watch', 'iCloud', 'App Store', 'Safari', 'Siri', 'Live Activity', 'Android', 'Binary Bridges', 'My Pets'];
const word = (w: string) => new RegExp(`(^|[^\\p{L}\\p{N}-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}-])`, 'iu');

test('the copy module has text to check', () => {
  assert.ok(all.length > 60, `${all.length} strings`);
});

// The one exception (owner, 21 Nov 2026): the PDF is not signed, its QR code is, and the copy says so.
const SIGNED_QR = 'a signed QR code that anyone with My Pets can scan';

test('no technical word from the banned list (#261), but for the signed QR code', () => {
  for (const s of all) for (const w of BANNED_WORDS) assert.ok(!word(w).test(s.replaceAll(SIGNED_QR, '')), `"${w}" in: ${s}`);
});

test('no pet-app or device brand, and not the working name of the format', () => {
  for (const s of all) for (const n of BANNED_NAMES) assert.ok(!word(n).test(s), `"${n}" in: ${s}`);
});

test('the allowed platform names do not trip the rules', () => {
  for (const n of ALLOWED_NAMES) {
    for (const w of [...BANNED_WORDS, ...BANNED_NAMES]) assert.ok(!word(w).test(n), `${n} trips ${w}`);
  }
  assert.ok(word('AI').test('Built with AI.'), 'the rule itself works');
});

test('diagnose and treat appear only in the disclaimer, which is the #266 sentence', () => {
  assert.equal(DISCLAIMER, "My Pets is a record-keeping app. It does not diagnose or treat. Always follow your veterinarian's advice.");
  for (const s of all) assert.ok(!/diagnos|\btreat/i.test(s), s);
});

test('no emoji and no typed arrow', () => {
  for (const s of all) assert.ok(!/\p{Extended_Pictographic}|->|=>|<-|[←-⇿]/u.test(s), s);
});

test('the promise, with its one accent phrase', () => {
  assert.equal(`${PROMISE.headline} ${PROMISE.tail}`, 'Every dose on time, every record yours. One payment. No subscription.');
  assert.ok(PROMISE.headline.includes(PROMISE.accent));
});

test('the four proof points, verbatim and in order (#261, #266, owner 21 Nov 2026)', () => {
  assert.deepEqual(
    PROOF_POINTS.map((p) => p.text),
    [
      ASSISTANT_SHIPS ? DOSE_COPY.on.proof : DOSE_COPY.off.proof,
      'A record you own and anyone with My Pets can verify, on your iPhone and in your iCloud.',
      'No account. One payment. No subscription.',
      'Lost mode shows a finder only what you choose.',
    ],
  );
});

test('the assistant switch: off says "enter the plan", on says "say it" and what it needs; the pages follow it', () => {
  assert.equal(DOSE_COPY.off.proof, "Enter the vet's plan once and My Pets sets the dose alarms. They ring even on silent.");
  for (const s of Object.values(DOSE_COPY.off)) assert.ok(!/say what|dictat|draft|assistant|Apple Intelligence/i.test(s), s);
  for (const s of Object.values(DOSE_COPY.on)) {
    assert.ok(s.startsWith('Say what the vet said.'), s);
    assert.ok(s.endsWith('Requires Apple Intelligence.'), s);
  }
  const state = ASSISTANT_SHIPS ? DOSE_COPY.on : DOSE_COPY.off;
  const other = ASSISTANT_SHIPS ? DOSE_COPY.off : DOSE_COPY.on;
  assert.equal(PROOF_POINTS[0]?.text, state.proof);
  assert.ok(PRESS.about.includes(state.press));
  // Nothing of the other state leaks into what the pages render.
  const rendered = strings(Object.entries(copy).filter(([name]) => name !== 'DOSE_COPY').map(([, v]) => v));
  for (const s of Object.values(other)) assert.ok(!rendered.includes(s), s);
  if (!ASSISTANT_SHIPS) for (const s of rendered) assert.ok(!/say what the vet said|dictate|Apple Intelligence/i.test(s), s);
});

// The rendered strings: everything but the inactive assistant wording, which is source only.
const inactive = new Set<string>(Object.values(ASSISTANT_SHIPS ? DOSE_COPY.off : DOSE_COPY.on));
const shown = all.filter((s) => !inactive.has(s));
const laterGroups = new Set(['Next', 'Later']);
const roadmapLater = new Set(ROADMAP.groups.filter((g) => laterGroups.has(g.name)).flatMap((g) => g.items.flatMap((i) => [i.text, i.note ?? ''])));


test('no wrong claim from the 21 Nov 2026 decisions, anywhere the pages render', () => {
  for (const s of shown) {
    for (const [pattern, why] of WRONG_CLAIMS) {
      if (pattern === WRONG_CLAIMS[0]?.[0] && roadmapLater.has(s)) continue;
      assert.ok(!pattern.test(s), `${why}: ${s}`);
    }
  }
  const now = ROADMAP.groups.find((g) => g.name === 'Now');
  assert.deepEqual(now?.items.map((i) => i.text), ['iPhone', 'English and Spanish']);
});

test('the claim checks catch the old sentences', () => {
  const old = [
    '00 / My Pets for iPhone and iPad',
    'One payment covers My Pets on iPhone, iPad and Mac, with all its updates.',
    'A record you own and your vet can verify, on your iPhone and in your iCloud.',
    'Export the vaccination card or the full history as a PDF your vet can verify.',
    'Lost mode in two taps.',
    'Pre-order on the App Store',
    'No account and no Binary Bridges server.',
    'It never goes to a Binary Bridges server.',
    'My Pets diagnoses problems early.',
    'Send us your pet records to try it.',
  ];
  for (const s of old) assert.ok(WRONG_CLAIMS.some(([p]) => p.test(s)), s);
  assert.ok(!WRONG_CLAIMS.some(([p]) => p.test('No account, and no Binary Bridges server holds your records.')));
});

test('the vet check states its condition: a signed QR code anyone with My Pets can scan', () => {
  const vet = FAQ.items.find((i) => i.q === 'How does my vet check a record?');
  assert.ok(vet?.a.startsWith('Export the vaccination card as a PDF with a signed QR code that anyone with My Pets can scan to check it.'));
  assert.ok(PRESS.about.some((p) => p.includes('Export the vaccination card as a PDF with a signed QR code that anyone with My Pets can scan to check it.')));
});

test('money: "One payment. No subscription." and the owner\'s price only', () => {
  for (const s of shown) {
    assert.ok(!/one payment, no subscription|no subscription, one payment/i.test(s), `the one money line is "One payment. No subscription.": ${s}`);
    for (const amount of s.match(/US\$[\d.,-]+/g) ?? []) assert.ok(['US$9.99', 'US$19.99', 'US$20-50'].includes(amount.replace(/[.,]$/, '')), `${amount} in: ${s}`);
    assert.ok(!/% off|discount|save \d|only \d+ (days|hours) left|countdown|hurry/i.test(s), s);
  }
});

test('the fact sheet: App Store name, Lifestyle, iPhone, English and Spanish', () => {
  assert.deepEqual(PRESS.facts.name, ['Name', 'My Pets']);
  assert.deepEqual(PRESS.facts.storeName, ['App Store name', 'My Pets: Pet Health Records']);
  assert.deepEqual(PRESS.facts.category, ['Category', 'Lifestyle']);
  assert.deepEqual(PRESS.facts.platforms, ['Platform', 'iPhone']);
  assert.deepEqual(PRESS.facts.language, ['Languages', 'English and Spanish']);
});

test('price: what one payment covers (#273) and a sourced comparison', () => {
  assert.equal(
    PRICE.coverage,
    'One payment covers My Pets on iPhone, with all its updates. Android and the clinic app will be separate products, also without subscriptions.',
  );
  assert.equal(PRICE.comparison.text, 'Pet health apps with subscriptions charge about US$20-50 a year.');
  assert.equal(PRICE.comparison.note, 'Typical yearly prices of pet health record apps on the US App Store, checked November 2026.');
});

test('privacy: no Binary Bridges server holds the records, the lost-mode exception, no account; the site keeps nothing', () => {
  assert.equal(
    PRIVACY.body,
    "No account, and no Binary Bridges server holds your records. They stay on your iPhone and in your own iCloud. The one exception is the lost-pet card you choose to publish in lost mode, with only what you choose to show.",
  );
  assert.equal(PRIVACY.site, 'This site sets no cookies and stores nothing.');
});

test('origin: the two problems, signed by the developer (owner decision 3)', () => {
  assert.ok(ORIGIN.story.includes('In her first year as a vet nurse, my wife kept seeing the same two problems: medication given wrong and vaccines forgotten.'));
  assert.equal(ORIGIN.signature, 'The developer of My Pets, Binary Bridges');
});

test('roadmap: four groups and their items as #273 with the 21 Nov 2026 changes, no dates', () => {
  assert.deepEqual(
    ROADMAP.groups.map((g) => [g.name, g.items.map((i) => i.text)]),
    [
      ['Now', ['iPhone', 'English and Spanish']],
      ['Next', ['iPad', 'Mac', 'Sitters can mark doses', 'Apple Watch (mark a dose from the wrist)']],
      [
        'Later',
        ['Android', 'The open record format for apps and devices', 'A page where vets check a record', 'Bring your records in (from other apps or a photo of the paper vaccination card)'],
      ],
      ['Exploring', ['A clinic app with no subscription', 'Open prototype devices that use the format', 'Satellite help for lost pets']],
    ],
  );
  const notes = ROADMAP.groups.flatMap((g) => g.items.map((i) => i.note ?? ''));
  assert.ok(
    notes.includes(
      "Today your pet's feeder, fountain, tracker and vet each keep their own data. We are opening My Pets' record format so any app or device can share information about your pet, only with your permission.",
    ),
  );
  // #273 item 5, in the Exploring group (so its "Exploring:" prefix is the group's name).
  assert.ok(notes.includes('Helping find lost pets where there is no cell signal, with open collar devices.'));
  for (const s of strings(ROADMAP)) assert.ok(!/\b(19|20)\d\d\b|\b(Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(s), s);
});

test('FAQ: the questions of the plan; the vet question answers with the disclaimer', () => {
  assert.deepEqual(
    FAQ.items.map((i) => i.q),
    [
      'Does My Pets replace my vet?',
      "Where is my pet's data?",
      'Do I need an account?',
      'What does the one payment cover?',
      'What happens after the launch price?',
      'How does my vet check a record?',
      'Do the alarms ring on silent?',
      'What is lost mode?',
      'Is My Pets on Android?',
    ],
  );
  assert.equal(FAQ.items[0]?.a, 'DISCLAIMER');
});
